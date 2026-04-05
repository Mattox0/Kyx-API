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
import { Game } from '../entities/game.entity.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';
import {
  FlatMode,
  FlatNeverHave,
  FlatPrefer,
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
  constructor(
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  async getGame(code: string): Promise<GameSession | null> {
    const data = await this.redisService.get(`game:${code}`);
    return data ? JSON.parse(data) : null;
  }

  async getPlayers(code: string): Promise<PlayerSession[]> {
    const data = await this.redisService.get(`game:${code}:players`);
    return data ? JSON.parse(data) : [];
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
    };

    const existingIndex = players.findIndex((p) => p.id === player.id);
    if (existingIndex >= 0) {
      players[existingIndex] = newPlayer;
    } else {
      players.push(newPlayer);
    }

    await this.redisService.setex(
      `game:${code}:players`,
      TTL,
      JSON.stringify(players),
    );
    return players;
  }

  async submitAnswer(
    code: string,
    socketId: string,
    answer: string,
  ): Promise<{
    players: PlayerSession[];
    allAnswered: boolean;
    results: Record<string, number> | null;
  }> {
    const players = await this.getPlayers(code);

    const index = players.findIndex((p) => p.socketId === socketId);
    if (index >= 0) {
      players[index].hasAnswered = true;
      players[index].answer = answer;
    }

    await this.redisService.setex(
      `game:${code}:players`,
      TTL,
      JSON.stringify(players),
    );

    const allAnswered = players.every((p) => p.hasAnswered);
    const results = allAnswered ? this.computeResults(players) : null;

    return { players, allAnswered, results };
  }

  computeResults(players: PlayerSession[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const { answer } of players) {
      if (answer !== null) counts[answer] = (counts[answer] ?? 0) + 1;
    }

    const total = players.length;
    const percentages: Record<string, number> = {};
    for (const [answer, count] of Object.entries(counts)) {
      percentages[answer] = Math.round((count / total) * 100);
    }

    return percentages;
  }

  private async resetAnswers(code: string): Promise<void> {
    const players = await this.getPlayers(code);
    const reset = players.map((p) => ({
      ...p,
      hasAnswered: false,
      answer: null,
    }));
    await this.redisService.setex(
      `game:${code}:players`,
      TTL,
      JSON.stringify(reset),
    );
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
    const players = (await this.getPlayers(code)).filter(
      (p) => p.socketId !== socketId,
    );
    await this.redisService.setex(
      `game:${code}:players`,
      TTL,
      JSON.stringify(players),
    );
    return players;
  }

  async transferHost(
    code: string,
    newHostId: string,
  ): Promise<PlayerSession[]> {
    const game = await this.getGame(code);
    if (!game) return [];

    game.hostId = newHostId;
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));

    const players = await this.getPlayers(code);
    const updated = players.map((p) => ({ ...p, isHost: p.id === newHostId }));
    await this.redisService.setex(
      `game:${code}:players`,
      TTL,
      JSON.stringify(updated),
    );
    return updated;
  }

  async findPlayer(
    code: string,
    userId: string,
  ): Promise<PlayerSession | null> {
    const players = await this.getPlayers(code);
    return players.find((p) => p.id === userId) ?? null;
  }

  async cleanupGame(code: string): Promise<void> {
    const game = await this.getGame(code);
    if (game) {
      await this.dataSource
        .createQueryBuilder()
        .update(Game)
        .set({ endedAt: new Date(), code: null })
        .where('id = :id', { id: game.gameId })
        .execute();
    }

    await this.redisService.del(`game:${code}`);
    await this.redisService.del(`game:${code}:players`);
  }

  async endGame(code: string): Promise<void> {
    const game = await this.getGame(code);
    if (!game) return;

    await this.dataSource
      .createQueryBuilder()
      .update(Game)
      .set({ endedAt: new Date(), code: null })
      .where('id = :id', { id: game.gameId })
      .execute();

    game.status = GameStatus.FINISHED;
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));
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
    };
    await this.redisService.setex(
      `game:${code}`,
      TTL,
      JSON.stringify(resetSession),
    );
    await this.resetAnswers(code);
  }

  async startGame(code: string): Promise<GameSession | undefined> {
    const game = await this.getGame(code);
    if (!game) return;
    game.status = GameStatus.IN_PROGRESS;
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));
    return game;
  }

  async getNextQuestion(
    code: string,
  ): Promise<{
    question: Question;
    questionType: string;
    userTarget: PlayerSession | null;
    userMentioned: PlayerSession | null;
    questionNumber: number;
  } | null> {
    const game = await this.getGame(code);
    if (!game) return null;

    const { gameType, modeIds, previousQuestionsIds, locale } = game;

    if (previousQuestionsIds.length >= 50) return null;

    const players = await this.getPlayers(code);
    const hasMen = players.some((p) => p.gender === Gender.MAN);
    const hasWomen = players.some((p) => p.gender === Gender.FEMALE);
    const allowedMentionedGenders: Gender[] = [Gender.ALL];
    if (hasMen) allowedMentionedGenders.push(Gender.MAN);
    if (hasWomen) allowedMentionedGenders.push(Gender.FEMALE);

    const remaining = game.remainingCustomQuestions ?? [];
    const slotsLeft = 50 - previousQuestionsIds.length;
    const mustServeCustom = remaining.length >= slotsLeft;
    const serveCustom =
      remaining.length > 0 && (mustServeCustom || Math.random() < 0.5);

    let question: CustomQuestionEntry;
    if (serveCustom) {
      question = remaining[0];
      game.remainingCustomQuestions = remaining.slice(1);
    } else {
      const fetched = await this.fetchQuestion(
        gameType,
        modeIds,
        previousQuestionsIds,
        locale ?? DEFAULT_LOCALE,
        { allowedMentionedGenders },
      );
      if (!fetched) return null;
      question = fetched;
    }

    game.previousQuestionsIds = [...previousQuestionsIds, question.entity.id];
    game.currentQuestion = question.entity;
    await this.resetAnswers(code);

    let userTarget: PlayerSession | null = null;
    let userMentioned: PlayerSession | null = null;

    const pickPlayer = (
      gender: Gender | null,
      exclude?: string,
    ): PlayerSession | null => {
      if (gender === null) return null;
      const eligible = players.filter(
        (p) =>
          p.id !== exclude && (gender === Gender.ALL || p.gender === gender),
      );
      const pool =
        eligible.length > 0
          ? eligible
          : players.filter((p) => p.id !== exclude);
      return pool[Math.floor(Math.random() * pool.length)] ?? null;
    };

    if (gameType === GameType.TRUTH_DARE) {
      const truthDare = question.entity as FlatTruthDare;
      const eligible = players.filter(
        (player) =>
          truthDare.gender === Gender.ALL || player.gender === truthDare.gender,
      );
      const targetPool = eligible.length > 0 ? eligible : players;
      userTarget =
        targetPool[Math.floor(Math.random() * targetPool.length)] ?? null;
      userMentioned = pickPlayer(truthDare.mentionedUserGender, userTarget?.id);
    } else if (gameType === GameType.PREFER) {
      const prefer = question.entity as FlatPrefer;
      const hasUserPlaceholder =
        prefer.choiceOne.includes('{user}') ||
        prefer.choiceTwo.includes('{user}');
      const genderToUse =
        prefer.mentionedUserGender ?? (hasUserPlaceholder ? Gender.ALL : null);
      userMentioned = pickPlayer(genderToUse);
    } else {
      const neverHave = question.entity as FlatNeverHave;
      userMentioned = pickPlayer(neverHave.mentionedUserGender);
    }

    game.currentUserTargetId = userTarget?.id ?? null;
    game.currentUserMentionedId = userMentioned?.id ?? null;
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));

    return {
      question: question.entity,
      questionType: question.questionType,
      userTarget,
      userMentioned,
      questionNumber: game.previousQuestionsIds.length,
    };
  }

  private async fetchQuestion(
    gameType: GameType,
    modeIds: string[],
    previousIds: string[],
    locale: string,
    filters?: { allowedMentionedGenders?: Gender[] },
  ): Promise<{ entity: Question; questionType: string } | null> {
    const configs: Record<
      GameType,
      {
        entity: any;
        alias: string;
        questionType: string;
        flatten: (raw: any, t: any) => Question;
      }
    > = {
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

    if (filters?.allowedMentionedGenders) {
      idQb.andWhere(
        `(${config.alias}.mentionedUserGender IS NULL OR ${config.alias}.mentionedUserGender IN (:...allowedMentionedGenders))`,
        { allowedMentionedGenders: filters.allowedMentionedGenders },
      );
    }

    const idResult = await idQb.getRawOne<{ id: string }>();
    if (!idResult) return null;

    const raw = await this.dataSource
      .createQueryBuilder()
      .select(config.alias)
      .from(config.entity, config.alias)
      .leftJoinAndSelect(`${config.alias}.mode`, 'mode')
      .leftJoinAndSelect('mode.translations', 'modeTranslation')
      .leftJoinAndSelect(`${config.alias}.translations`, 'translation')
      .where(`${config.alias}.id = :id`, { id: idResult.id })
      .getOne();
    if (!raw) return null;

    const translations: { locale: string }[] = (raw as any).translations ?? [];
    const translation =
      translations.find((t) => t.locale === locale)
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE)
      ?? translations[0];
    if (!translation) return null;

    return {
      entity: config.flatten(raw, translation),
      questionType: config.questionType,
    };
  }
}
