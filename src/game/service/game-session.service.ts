import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../redis/redis.service.js';
import { PlayerSession } from '../../../types/ws/PlayerSession.js';
import { GameStatus } from '../../../types/ws/GameStatus.js';
import { GameSession, Question } from '../../../types/ws/GameSession.js';
import { GameType } from '../../../types/enums/GameType.js';
import { NeverHave } from '../../never-have/entities/never-have.entity.js';
import { Prefer } from '../../prefer/entities/prefer.entity.js';
import { TruthDare } from '../../truth-dare/entities/truth-dare.entity.js';

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

  async addPlayer(code: string, player: PlayerSession): Promise<{ player: PlayerSession; players: PlayerSession[] }> {
    const players = await this.getPlayers(code);

    const newPlayer: PlayerSession = { ...player, hasAnswered: false, answer: null };

    const existingIndex = players.findIndex((p) => p.id === player.id);
    if (existingIndex >= 0) {
      players[existingIndex] = newPlayer;
    } else {
      players.push(newPlayer);
    }

    await this.redisService.setex(`game:${code}:players`, TTL, JSON.stringify(players));
    return { player: newPlayer, players };
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

  private computeResults(players: PlayerSession[]): Record<string, number> {
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

  async removePlayer(code: string, socketId: string): Promise<PlayerSession[]> {
    const players = (await this.getPlayers(code)).filter((p) => p.socketId !== socketId);
    await this.redisService.setex(`game:${code}:players`, TTL, JSON.stringify(players));
    return players;
  }

  async findPlayer(code: string, userId: string): Promise<PlayerSession | null> {
    const players = await this.getPlayers(code);
    return players.find((p) => p.id === userId) ?? null;
  }

  async startGame(code: string): Promise<GameSession | undefined> {
    const game = await this.getGame(code);
    if (!game) return;
    game.status = GameStatus.IN_PROGRESS;
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));
    return game;
  }

  async getNextQuestion(code: string): Promise<{ question: Question; questionType: string; userTarget: null } | null> {
    const game = await this.getGame(code);
    if (!game) return null;

    const { gameType, modeIds, previousQuestionsIds } = game;

    const question = await this.fetchQuestion(gameType, modeIds, previousQuestionsIds);
    if (!question) return null;

    game.previousQuestionsIds = [...previousQuestionsIds, question.entity.id];
    game.currentQuestion = question.entity;
    await this.redisService.setex(`game:${code}`, TTL, JSON.stringify(game));
    await this.resetAnswers(code);

    return { question: question.entity, questionType: question.questionType, userTarget: null };
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
