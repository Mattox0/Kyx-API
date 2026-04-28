import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../redis/redis.service.js';
import { PlayerSession } from '../../../types/ws/PlayerSession.js';
import { GameStatus } from '../../../types/ws/GameStatus.js';
import {
  GameSession,
  Question,
  CustomQuestionEntry,
} from '../../../types/ws/GameSession.js';
import { shuffle } from '../../common/utils/shuffle.js';
import { GameType } from '../../../types/enums/GameType.js';
import { Gender } from '../../../types/enums/Gender.js';
import { NeverHave } from '../../never-have/entities/never-have.entity.js';
import { Prefer } from '../../prefer/entities/prefer.entity.js';
import { TruthDare } from '../../truth-dare/entities/truth-dare.entity.js';
import { MostLikelyTo } from '../../most-likely-to/entities/most-likely-to.entity.js';
import { TenBut } from '../../ten-but/entities/ten-but.entity.js';
import { QuizzQuestion } from '../../quizz/entities/quizz-question.entity.js';
import { Game } from '../entities/game.entity.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';
import {
  FlatMode,
  FlatMostLikelyTo,
  FlatNeverHave,
  FlatPrefer,
  FlatQuizz,
  FlatTenBut,
  FlatTruthDare,
} from '../../../types/ws/FlatQuestion.js';
import { ModeTranslation } from '../../mode/entities/mode-translation.entity.js';

const TTL = 86400;

function flattenMode(mode: any, locale: string): FlatMode | null {
  if (!mode) return null;
  const translations: ModeTranslation[] = mode.translations ?? [];
  const t = translations.find((tr) => tr.locale === locale) ?? translations.find((tr) => tr.locale === DEFAULT_LOCALE);
  if (!t) return null;
  return { id: mode.id, icon: mode.icon ?? null, gameType: mode.gameType, name: t.name, description: t.description };
}

@Injectable()
export class GameSessionService {
  private readonly locks = new Map<string, Promise<void>>();

  constructor(
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((r) => { release = r; });
    this.locks.set(key, next);
    try {
      await existing;
      return await fn();
    } finally {
      release();
      if (this.locks.get(key) === next) this.locks.delete(key);
    }
  }

  async getGame(code: string): Promise<GameSession | null> {
    const data = await this.redisService.get(`game:${code}`);
    return data ? JSON.parse(data) : null;
  }

  async getPlayers(code: string): Promise<PlayerSession[]> {
    const data = await this.redisService.get(`game:${code}:players`);
    return data ? JSON.parse(data) : [];
  }

  private async saveGame(code: string, game: GameSession): Promise<void> {
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));
  }

  private async savePlayers(code: string, players: PlayerSession[]): Promise<void> {
    await this.redisService.setex(`game:${code}:players`, TTL, JSON.stringify(players));
  }

  private async finalizeGameInDb(gameId: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(Game)
      .set({ endedAt: new Date(), code: null })
      .where('id = :id', { id: gameId })
      .execute();
  }

  async addPlayer(
    code: string,
    player: PlayerSession,
  ): Promise<PlayerSession[]> {
    const players = await this.getPlayers(code);

    const newPlayer: PlayerSession = {
      ...player,
      hasAnswered: false,
      answer: null,
      score: player.score ?? 0,
      answeredAt: null,
    };

    const existingIndex = players.findIndex((p) => p.id === player.id);
    if (existingIndex >= 0) {
      players[existingIndex] = newPlayer;
    } else {
      players.push(newPlayer);
    }

    await this.savePlayers(code, players);
    return players;
  }

  async submitAnswer(
    code: string,
    socketId: string,
    answer: string,
  ): Promise<{
    players: PlayerSession[];
    allAnswered: boolean;
    results: { percentages: Record<string, number>; scores: Record<string, number> } | null;
  }> {
    return this.withLock(`submitAnswer:${code}`, async () => {
      const game = await this.getGame(code);
      const players = await this.getPlayers(code);
      const now = Date.now();

      const index = players.findIndex((p) => p.socketId === socketId);
      if (index >= 0) {
        players[index].hasAnswered = true;
        players[index].answer = answer;
        players[index].answeredAt = now;

        if (game?.gameType === GameType.QUIZZ && game.questionStartedAt && answer) {
          const quizzQuestion = game.currentQuestion as FlatQuizz | null;
          const isCorrect = quizzQuestion?.answers?.find((a) => a.id === answer)?.isCorrect ?? false;
          if (isCorrect) {
            const responseTime = now - game.questionStartedAt;
            players[index].score = (players[index].score ?? 0) + this.computeQuizzScore(responseTime);
          }
        }
      }

      await this.savePlayers(code, players);

      const allAnswered = players.every((p) => p.hasAnswered);
      const results = allAnswered ? this.computeResults(players) : null;

      return { players, allAnswered, results };
    });
  }

  computeResults(players: PlayerSession[]): { percentages: Record<string, number>; scores: Record<string, number> } {
    const counts: Record<string, number> = {};
    for (const { answer } of players) {
      if (answer !== null) counts[answer] = (counts[answer] ?? 0) + 1;
    }

    const total = players.length;
    const percentages: Record<string, number> = {};
    for (const [answer, count] of Object.entries(counts)) {
      percentages[answer] = Math.round((count / total) * 100);
    }

    const scores: Record<string, number> = {};
    for (const { id, score } of players) {
      scores[id] = score ?? 0;
    }

    return { percentages, scores };
  }

  private computeQuizzScore(responseTime: number): number {
    const clampedTime = Math.min(responseTime, 30_000);
    return Math.round(100 * (1 - clampedTime / 30_000) * 0.5 + 50);
  }

  async forceExpireQuizz(code: string): Promise<{ percentages: Record<string, number>; scores: Record<string, number> }> {
    return this.withLock(`submitAnswer:${code}`, async () => {
      const players = await this.getPlayers(code);
      const updated = players.map((p) =>
        p.hasAnswered ? p : { ...p, hasAnswered: true, answer: null, answeredAt: Date.now() },
      );
      await this.savePlayers(code, updated);
      return this.computeResults(updated);
    });
  }

  private async resetAnswers(code: string): Promise<void> {
    const players = await this.getPlayers(code);
    const reset = players.map((p) => ({ ...p, hasAnswered: false, answer: null, answeredAt: null }));
    await this.savePlayers(code, reset);
  }

  async setUserCurrentGame(userId: string, code: string): Promise<void> {
    await this.redisService.setex(`user:${userId}:game`, TTL, code);
  }

  async clearUserCurrentGame(userId: string): Promise<void> {
    await this.redisService.del(`user:${userId}:game`);
  }

  async getUserGameCode(userId: string): Promise<string | null> {
    return this.redisService.get(`user:${userId}:game`);
  }

  async removePlayer(code: string, socketId: string): Promise<PlayerSession[]> {
    const players = (await this.getPlayers(code)).filter((p) => p.socketId !== socketId);
    await this.savePlayers(code, players);
    return players;
  }

  async transferHost(code: string, newHostId: string): Promise<PlayerSession[]> {
    const game = await this.getGame(code);
    if (!game) return [];

    game.hostId = newHostId;
    await this.saveGame(code, game);

    const players = await this.getPlayers(code);
    const updated = players.map((p) => ({ ...p, isHost: p.id === newHostId }));
    await this.savePlayers(code, updated);
    return updated;
  }

  async findPlayer(
    code: string,
    userId: string,
  ): Promise<PlayerSession | null> {
    const players = await this.getPlayers(code);
    return players.find((p) => p.id === userId) ?? null;
  }

  async getActiveQuizzGames(): Promise<Array<{ code: string; questionStartedAt: number }>> {
    const keys = await this.redisService.keys('game:*');
    const codes = keys
      .filter((k) => !k.endsWith(':players'))
      .map((k) => k.replace(/^game:/, ''));

    const result: Array<{ code: string; questionStartedAt: number }> = [];

    for (const code of codes) {
      const game = await this.getGame(code);
      if (
        game?.gameType !== GameType.QUIZZ ||
        game.status !== GameStatus.IN_PROGRESS ||
        game.questionStartedAt === null
      ) continue;

      const players = await this.getPlayers(code);
      if (players.length === 0 || players.every((p) => p.hasAnswered)) continue;

      result.push({ code, questionStartedAt: game.questionStartedAt });
    }

    return result;
  }

  async cleanupGame(code: string): Promise<void> {
    const game = await this.getGame(code);
    if (game) {
      await this.finalizeGameInDb(game.gameId);
    }

    await this.redisService.del(`game:${code}`);
    await this.redisService.del(`game:${code}:players`);
  }

  async endGame(code: string): Promise<void> {
    const game = await this.getGame(code);
    if (!game) return;

    await this.finalizeGameInDb(game.gameId);

    game.status = GameStatus.FINISHED;
    await this.saveGame(code, game);
  }

  async restartGame(code: string): Promise<void> {
    const game = await this.getGame(code);
    if (!game) return;

    const newGame = this.dataSource.manager.create(Game, {
      gameType: game.gameType,
      modes: game.modeIds.map((id) => ({ id })),
      isLocal: false,
      creator: game.hostId ? { id: game.hostId } : null,
      code: null,
    });
    const saved = await this.dataSource.manager.save(newGame);

    const customQuestionsPool = game.customQuestionsPool ?? [];
    const resetSession: GameSession = {
      gameId: saved.id,
      gameType: game.gameType,
      status: GameStatus.WAITING,
      hostId: game.hostId,
      modeIds: game.modeIds,
      locale: game.locale,
      previousQuestionsIds: [],
      currentQuestion: null,
      currentUserTargetId: null,
      currentUserMentionedId: null,
      customQuestionsPool,
      remainingCustomQuestions: shuffle([...customQuestionsPool]),
      questionStartedAt: null,
    };
    await this.saveGame(code, resetSession);
    await this.resetAnswers(code);
  }

  async startGame(code: string): Promise<GameSession | undefined> {
    const game = await this.getGame(code);
    if (!game) return;
    game.status = GameStatus.IN_PROGRESS;
    await this.saveGame(code, game);
    return game;
  }

  async getNextQuestion(code: string): Promise<{
    question: Question;
    questionType: string;
    userTarget: PlayerSession | null;
    userMentioned: PlayerSession | null;
    questionNumber: number;
    questionStartedAt: number | null;
  } | null> {
    const game = await this.getGame(code);
    if (!game || game.previousQuestionsIds.length >= 50) return null;

    const players = await this.getPlayers(code);
    const allowedMentionedGenders = this.computeAllowedGenders(players);
    const genderCounts = this.computeGenderCounts(players);

    const question = await this.pickQuestion(game, allowedMentionedGenders, genderCounts);
    if (!question) return null;

    game.previousQuestionsIds = [...game.previousQuestionsIds, question.entity.id];
    game.currentQuestion = question.entity;
    game.questionStartedAt = Date.now();
    await this.resetAnswers(code);

    const { userTarget, userMentioned } = this.resolveTargets(game.gameType, question.entity, players);

    game.currentUserTargetId = userTarget?.id ?? null;
    game.currentUserMentionedId = userMentioned?.id ?? null;
    await this.saveGame(code, game);

    return {
      question: question.entity,
      questionType: question.questionType,
      userTarget,
      userMentioned,
      questionNumber: game.previousQuestionsIds.length,
      questionStartedAt: game.questionStartedAt,
    };
  }

  private computeAllowedGenders(players: PlayerSession[]): Gender[] {
    const allowed: Gender[] = [Gender.ALL];
    if (players.some((p) => p.gender === Gender.MAN)) allowed.push(Gender.MAN);
    if (players.some((p) => p.gender === Gender.FEMALE)) allowed.push(Gender.FEMALE);
    return allowed;
  }

  private computeGenderCounts(players: PlayerSession[]): Record<Gender, number> {
    return {
      [Gender.MAN]: players.filter((p) => p.gender === Gender.MAN).length,
      [Gender.FEMALE]: players.filter((p) => p.gender === Gender.FEMALE).length,
      [Gender.ALL]: players.length,
    };
  }

  private async pickQuestion(
    game: GameSession,
    allowedMentionedGenders: Gender[],
    genderCounts: Record<Gender, number>,
  ): Promise<CustomQuestionEntry | null> {
    const { gameType, modeIds, previousQuestionsIds, locale } = game;
    const remaining = game.remainingCustomQuestions ?? [];
    const slotsLeft = 50 - previousQuestionsIds.length;
    const mustServeCustom = remaining.length >= slotsLeft;
    const serveCustom = remaining.length > 0 && (mustServeCustom || Math.random() < remaining.length / slotsLeft);

    if (serveCustom) {
      game.remainingCustomQuestions = remaining.slice(1);
      return remaining[0];
    }

    return this.fetchQuestion(gameType, modeIds, previousQuestionsIds, locale ?? DEFAULT_LOCALE, { allowedMentionedGenders, genderCounts, quizzDifficulties: game.quizzDifficulties });
  }

  private pickPlayer(players: PlayerSession[], gender: Gender | null, exclude?: string): PlayerSession | null {
    if (gender === null) return null;
    const eligible = players.filter((p) => p.id !== exclude && (gender === Gender.ALL || p.gender === gender));
    return eligible[Math.floor(Math.random() * eligible.length)] ?? null;
  }

  private resolveTargets(
    gameType: GameType,
    entity: Question,
    players: PlayerSession[],
  ): { userTarget: PlayerSession | null; userMentioned: PlayerSession | null } {
    if (gameType === GameType.TRUTH_DARE) {
      const { gender, mentionedUserGender } = entity as FlatTruthDare;
      let eligible = players.filter((p) => gender === Gender.ALL || p.gender === gender);

      // When gender=ALL and mentionedUserGender is specific, prefer a target of a different
      // gender to preserve the mention pool (avoids sole-female/male being both target and mention)
      if (mentionedUserGender && mentionedUserGender !== Gender.ALL) {
        const nonConflicting = eligible.filter((p) => p.gender !== mentionedUserGender);
        if (nonConflicting.length > 0) eligible = nonConflicting;
        // If all eligible are the same gender as mentionedUserGender, the DB already
        // guaranteed count >= 2 for that gender, so pickPlayer will still find a valid mention
      }

      const userTarget = eligible[Math.floor(Math.random() * eligible.length)] ?? null;
      return { userTarget, userMentioned: this.pickPlayer(players, mentionedUserGender, userTarget?.id) };
    }

    if (gameType === GameType.PREFER) {
      const { choiceOne, choiceTwo, mentionedUserGender } = entity as FlatPrefer;
      const hasUserPlaceholder = choiceOne.includes('{user}') || choiceTwo.includes('{user}');
      const genderToUse = mentionedUserGender ?? (hasUserPlaceholder ? Gender.ALL : null);
      return { userTarget: null, userMentioned: this.pickPlayer(players, genderToUse) };
    }

    if (gameType === GameType.MOST_LIKELY_TO) {
      const { question, mentionedUserGender } = entity as FlatMostLikelyTo;
      const genderToUse = mentionedUserGender ?? (question.includes('{user}') ? Gender.ALL : null);
      return { userTarget: null, userMentioned: this.pickPlayer(players, genderToUse) };
    }

    if (gameType === GameType.TEN_BUT) {
      const { question, mentionedUserGender } = entity as FlatTenBut;
      const genderToUse = mentionedUserGender ?? (question.includes('{user}') ? Gender.ALL : null);
      return { userTarget: null, userMentioned: this.pickPlayer(players, genderToUse) };
    }

    if (gameType === GameType.QUIZZ) {
      return { userTarget: null, userMentioned: null };
    }

    const { mentionedUserGender } = entity as FlatNeverHave;
    return { userTarget: null, userMentioned: this.pickPlayer(players, mentionedUserGender) };
  }

  private async fetchQuestion(
    gameType: GameType,
    modeIds: string[],
    previousIds: string[],
    locale: string,
    filters?: { allowedMentionedGenders?: Gender[]; genderCounts?: Record<Gender, number>; quizzDifficulties?: string[] },
  ): Promise<{ entity: Question; questionType: string } | null> {
    const configs: Partial<Record<
      GameType,
      {
        entity: any;
        alias: string;
        questionType: string;
        flatten: (raw: any, t: any) => Question;
        additionalJoins?: Array<{ relation: string; alias: string }>;
      }
    >> = {
      [GameType.NEVER_HAVE]: {
        entity: NeverHave,
        alias: 'neverHave',
        questionType: 'never-have',
        flatten: (raw, t): FlatNeverHave => ({
          id: raw.id,
          mode: flattenMode(raw.mode, locale),
          createdDate: raw.createdDate,
          updatedDate: raw.updatedDate,
          mentionedUserGender: raw.mentionedUserGender,
          question: t.question,
        }),
      },
      [GameType.PREFER]: {
        entity: Prefer,
        alias: 'prefer',
        questionType: 'prefer',
        flatten: (raw, t): FlatPrefer => ({
          id: raw.id,
          mode: flattenMode(raw.mode, locale),
          createdDate: raw.createdDate,
          updatedDate: raw.updatedDate,
          mentionedUserGender: raw.mentionedUserGender,
          choiceOne: t.choiceOne,
          choiceTwo: t.choiceTwo,
        }),
      },
      [GameType.TRUTH_DARE]: {
        entity: TruthDare,
        alias: 'truthDare',
        questionType: 'truth-dare',
        flatten: (raw, t): FlatTruthDare => ({
          id: raw.id,
          mode: flattenMode(raw.mode, locale),
          createdDate: raw.createdDate,
          updatedDate: raw.updatedDate,
          mentionedUserGender: raw.mentionedUserGender,
          gender: raw.gender,
          type: raw.type,
          question: t.question,
        }),
      },
      [GameType.MOST_LIKELY_TO]: {
        entity: MostLikelyTo,
        alias: 'mostLikelyTo',
        questionType: 'most-likely-to',
        flatten: (raw, t): FlatMostLikelyTo => ({
          id: raw.id,
          mode: flattenMode(raw.mode, locale),
          createdDate: raw.createdDate,
          updatedDate: raw.updatedDate,
          mentionedUserGender: raw.mentionedUserGender,
          question: t.question,
        }),
      },
      [GameType.TEN_BUT]: {
        entity: TenBut,
        alias: 'tenBut',
        questionType: 'ten-but',
        flatten: (raw, t): FlatTenBut => ({
          id: raw.id,
          mode: flattenMode(raw.mode, locale),
          createdDate: raw.createdDate,
          updatedDate: raw.updatedDate,
          mentionedUserGender: raw.mentionedUserGender ?? null,
          score: raw.score,
          question: t.question,
        }),
      },
      [GameType.QUIZZ]: {
        entity: QuizzQuestion,
        alias: 'quizz',
        questionType: 'quizz',
        additionalJoins: [
          { relation: 'quizz.answers', alias: 'answer' },
          { relation: 'answer.translations', alias: 'answerTranslation' },
        ],
        flatten: (raw, t): FlatQuizz => {
          const answers = (raw.answers ?? []).map((a: any) => {
            const answerTranslations: any[] = a.translations ?? [];
            const answerTranslation =
              answerTranslations.find((at: any) => at.locale === locale) ??
              answerTranslations.find((at: any) => at.locale === DEFAULT_LOCALE);
            return { id: a.id, text: answerTranslation?.text ?? '', isCorrect: a.isCorrect };
          });
          return {
            id: raw.id,
            mode: flattenMode(raw.mode, locale),
            createdDate: raw.createdDate,
            updatedDate: raw.updatedDate,
            mentionedUserGender: null,
            question: t.text,
            difficulty: raw.difficulty,
            answers,
          };
        },
      },
    };

    const config = configs[gameType];
    if (!config) return null;

    const idQb = this.dataSource
      .createQueryBuilder()
      .select(`${config.alias}.id`, 'id')
      .from(config.entity, config.alias)
      .where(`${config.alias}.modeId IN (:...modeIds)`, { modeIds })
      .orderBy('RANDOM()')
      .limit(1);

    if (previousIds.length > 0) {
      idQb.andWhere(`${config.alias}.id NOT IN (:...previousIds)`, { previousIds });
    }

    if (filters?.allowedMentionedGenders && gameType !== GameType.QUIZZ) {
      idQb.andWhere(
        `(${config.alias}.mentionedUserGender IS NULL OR ${config.alias}.mentionedUserGender IN (:...allowedMentionedGenders))`,
        { allowedMentionedGenders: filters.allowedMentionedGenders },
      );
    }

    // TruthDare: also filter on the `gender` field (determines userTarget gender)
    if (filters?.allowedMentionedGenders && gameType === GameType.TRUTH_DARE) {
      idQb.andWhere(
        `(${config.alias}.gender IS NULL OR ${config.alias}.gender IN (:...allowedTargetGenders))`,
        { allowedTargetGenders: filters.allowedMentionedGenders },
      );
    }

    // TruthDare: exclude questions where gender = mentionedUserGender (same specific gender)
    // but fewer than 2 players of that gender exist — target and mention would conflict
    if (gameType === GameType.TRUTH_DARE && filters?.genderCounts) {
      const { genderCounts } = filters;
      idQb.andWhere(
        `NOT (
          ${config.alias}.gender != 'ALL'
          AND ${config.alias}.mentionedUserGender IS NOT NULL
          AND ${config.alias}.mentionedUserGender != 'ALL'
          AND "${config.alias}"."gender"::text = "${config.alias}"."mentionedUserGender"::text
          AND (
            (${config.alias}.gender = 'FEMALE' AND :femaleCount < 2)
            OR (${config.alias}.gender = 'MAN' AND :manCount < 2)
          )
        )`,
        { femaleCount: genderCounts[Gender.FEMALE], manCount: genderCounts[Gender.MAN] },
      );
    }

    if (gameType === GameType.QUIZZ && filters?.quizzDifficulties && filters.quizzDifficulties.length > 0) {
      idQb.andWhere(`${config.alias}.difficulty IN (:...quizzDifficulties)`, { quizzDifficulties: filters.quizzDifficulties });
    }

    const idResult = await idQb.getRawOne<{ id: string }>();
    if (!idResult) return null;

    const rawQb = this.dataSource
      .createQueryBuilder()
      .select(config.alias)
      .from(config.entity, config.alias)
      .leftJoinAndSelect(`${config.alias}.mode`, 'mode')
      .leftJoinAndSelect('mode.translations', 'modeTranslation')
      .leftJoinAndSelect(`${config.alias}.translations`, 'translation')
      .where(`${config.alias}.id = :id`, { id: idResult.id });

    for (const join of config.additionalJoins ?? []) {
      rawQb.leftJoinAndSelect(join.relation, join.alias);
    }

    const raw = await rawQb.getOne();
    if (!raw) return null;

    const translations: { locale: string }[] = (raw as any).translations ?? [];
    const translation =
      translations.find((t) => t.locale === locale)
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE)
    if (!translation) return null;

    return {
      entity: config.flatten(raw, translation),
      questionType: config.questionType,
    };
  }
}
