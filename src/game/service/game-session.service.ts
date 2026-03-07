import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../redis/redis.service.js';
import { PlayerSession } from '../../../types/ws/PlayerSession.js';
import { GameStatus } from '../../../types/ws/GameStatus.js';
import { GameSession, Question } from '../../../types/ws/GameSession.js';
import { GameType } from '../../../types/enums/GameType.js';
import { Gender } from '../../../types/enums/Gender.js';
import { NeverHave } from '../../never-have/entities/never-have.entity.js';
import { Prefer } from '../../prefer/entities/prefer.entity.js';
import { TruthDare } from '../../truth-dare/entities/truth-dare.entity.js';
import { Game } from '../entities/game.entity.js';

const TTL = 86400;

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

  async addPlayer(code: string, player: PlayerSession): Promise<PlayerSession[]> {
    const players = await this.getPlayers(code);

    const newPlayer: PlayerSession = { ...player, hasAnswered: false, answer: null };

    const existingIndex = players.findIndex((p) => p.id === player.id);
    if (existingIndex >= 0) {
      players[existingIndex] = newPlayer;
    } else {
      players.push(newPlayer);
    }

    await this.redisService.setex(`game:${code}:players`, TTL, JSON.stringify(players));
    return players;
  }

  async submitAnswer(
    code: string,
    socketId: string,
    answer: string,
  ): Promise<{ players: PlayerSession[]; allAnswered: boolean; results: Record<string, number> | null }> {
    const players = await this.getPlayers(code);

    const index = players.findIndex((p) => p.socketId === socketId);
    if (index >= 0) {
      players[index].hasAnswered = true;
      players[index].answer = answer;
    }

    await this.redisService.setex(`game:${code}:players`, TTL, JSON.stringify(players));

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
    const reset = players.map((p) => ({ ...p, hasAnswered: false, answer: null }));
    await this.redisService.setex(`game:${code}:players`, TTL, JSON.stringify(reset));
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
    await this.redisService.setex(`game:${code}:players`, TTL, JSON.stringify(players));
    return players;
  }

  async transferHost(code: string, newHostId: string): Promise<PlayerSession[]> {
    const game = await this.getGame(code);
    if (!game) return [];

    game.hostId = newHostId;
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));

    const players = await this.getPlayers(code);
    const updated = players.map((p) => ({ ...p, isHost: p.id === newHostId }));
    await this.redisService.setex(`game:${code}:players`, TTL, JSON.stringify(updated));
    return updated;
  }

  async findPlayer(code: string, userId: string): Promise<PlayerSession | null> {
    const players = await this.getPlayers(code);
    return players.find((p) => p.id === userId) ?? null;
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

    const resetSession: GameSession = {
      gameId: saved.id,
      gameType: game.gameType,
      status: GameStatus.WAITING,
      hostId: game.hostId,
      modeIds: game.modeIds,
      previousQuestionsIds: [],
      currentQuestion: null,
      currentUserTargetId: null,
    };
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(resetSession));
    await this.resetAnswers(code);
  }

  async startGame(code: string): Promise<GameSession | undefined> {
    const game = await this.getGame(code);
    if (!game) return;
    game.status = GameStatus.IN_PROGRESS;
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));
    return game;
  }

  async getNextQuestion(code: string): Promise<{ question: Question; questionType: string; userTarget: PlayerSession | null; questionNumber: number } | null> {
    const game = await this.getGame(code);
    if (!game) return null;

    const { gameType, modeIds, previousQuestionsIds } = game;

    if (previousQuestionsIds.length >= 100) return null;

    const question = await this.fetchQuestion(gameType, modeIds, previousQuestionsIds);
    if (!question) return null;

    game.previousQuestionsIds = [...previousQuestionsIds, question.entity.id];
    game.currentQuestion = question.entity;
    await this.resetAnswers(code);

    let userTarget: PlayerSession | null = null;
    if (gameType === GameType.TRUTH_DARE) {
      const players = await this.getPlayers(code);
      const truthDare = question.entity as TruthDare;
      const eligible = players.filter((player) => truthDare.gender === Gender.ALL || player.gender === truthDare.gender);
      const pool = eligible.length > 0 ? eligible : players;
      userTarget = pool[Math.floor(Math.random() * pool.length)] ?? null;
    }

    game.currentUserTargetId = userTarget?.id ?? null;
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));

    return { question: question.entity, questionType: question.questionType, userTarget, questionNumber: game.previousQuestionsIds.length };
  }

  private async fetchQuestion(
    gameType: GameType,
    modeIds: string[],
    previousIds: string[],
  ): Promise<{ entity: Question; questionType: string } | null> {
    const configs: Record<GameType, { entity: any; alias: string; questionType: string }> = {
      [GameType.NEVER_HAVE]: { entity: NeverHave, alias: 'neverHave', questionType: 'never-have' },
      [GameType.PREFER]:     { entity: Prefer,    alias: 'prefer',    questionType: 'prefer'     },
      [GameType.TRUTH_DARE]: { entity: TruthDare,  alias: 'truthDare', questionType: 'truth-dare' },
    };

    const config = configs[gameType];
    if (!config) return null;

    const qb = this.dataSource
      .createQueryBuilder()
      .select(config.alias)
      .from(config.entity, config.alias)
      .leftJoinAndSelect(`${config.alias}.mode`, 'mode')
      .where(`${config.alias}.modeId IN (:...modeIds)`, { modeIds })
      .orderBy('RANDOM()')
      .limit(1);

    if (previousIds.length > 0) {
      qb.andWhere(`${config.alias}.id NOT IN (:...previousIds)`, { previousIds });
    }

    const entity = (await qb.getOne()) as Question | null;
    if (!entity) return null;

    return { entity, questionType: config.questionType };
  }
}
