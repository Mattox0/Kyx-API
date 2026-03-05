import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Game } from '../entities/game.entity.js';
import { Mode } from '../../mode/entities/mode.entity.js';
import { CreateGameDto } from '../dto/create-game.dto.js';
import { GameType } from '../../../types/enums/GameType.js';
import { RedisService } from '../../redis/redis.service.js';

@Injectable()
export class GameService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    do {
      code = this.generateCode();
      if (++attempts > 10) throw new Error('Failed to generate unique game code');
    } while ((await this.redisService.exists(`game:${code}`)) > 0);
    return code;
  }

  async getStats() {
    const [local, online] = await Promise.all([
      this.dataSource.createQueryBuilder().from(Game, 'game').where('game.isLocal = true').getCount(),
      this.dataSource.createQueryBuilder().from(Game, 'game').where('game.isLocal = false').getCount(),
    ]);

    return [
      { name: 'local', amount: local },
      { name: 'online', amount: online },
    ];
  }

  async getStatsHistory(period: 'weekly' | 'monthly' | 'yearly') {
    const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    if (period === 'weekly') {
      const rows: { day: string; count: string }[] = await this.dataSource
        .createQueryBuilder()
        .select("DATE_TRUNC('day', game.startedAt)", 'day')
        .addSelect('COUNT(*)', 'count')
        .from(Game, 'game')
        .where("game.startedAt >= DATE_TRUNC('day', NOW()) - INTERVAL '6 days'")
        .groupBy("DATE_TRUNC('day', game.startedAt)")
        .orderBy("DATE_TRUNC('day', game.startedAt)", 'ASC')
        .getRawMany();

      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const key = date.toISOString().split('T')[0];
        const row = rows.find((r) => new Date(r.day).toISOString().split('T')[0] === key);
        return { x: DAY_NAMES[date.getDay()], y: row ? parseInt(row.count, 10) : 0 };
      });
    }

    if (period === 'monthly') {
      const rows: { month: string; count: string }[] = await this.dataSource
        .createQueryBuilder()
        .select("EXTRACT(MONTH FROM game.startedAt)", 'month')
        .addSelect('COUNT(*)', 'count')
        .from(Game, 'game')
        .where("EXTRACT(YEAR FROM game.startedAt) = EXTRACT(YEAR FROM NOW())")
        .groupBy("EXTRACT(MONTH FROM game.startedAt)")
        .orderBy('month', 'ASC')
        .getRawMany();

      return Array.from({ length: 12 }, (_, i) => {
        const row = rows.find((r) => parseInt(r.month, 10) === i + 1);
        return { x: MONTH_NAMES[i], y: row ? parseInt(row.count, 10) : 0 };
      });
    }

    // yearly
    const rows: { year: string; count: string }[] = await this.dataSource
      .createQueryBuilder()
      .select("EXTRACT(YEAR FROM game.startedAt)", 'year')
      .addSelect('COUNT(*)', 'count')
      .from(Game, 'game')
      .groupBy("EXTRACT(YEAR FROM game.startedAt)")
      .orderBy('year', 'ASC')
      .getRawMany();

    return rows.map((r) => ({ x: String(parseInt(r.year, 10)), y: parseInt(r.count, 10) }));
  }

  async getStatsByMode(gameType: GameType) {
    const rows: { name: string; count: string }[] = await this.dataSource
      .createQueryBuilder()
      .select('mode.name', 'name')
      .addSelect('COUNT(game.id)', 'count')
      .from(Game, 'game')
      .innerJoin('game.modes', 'mode')
      .where('game.gameType = :gameType', { gameType })
      .groupBy('mode.id')
      .getRawMany();

    return rows.map((r) => ({ name: r.name, amount: parseInt(r.count, 10) }));
  }

  async getStatsByType() {
    const rows: { gameType: string; count: string }[] = await this.dataSource
      .createQueryBuilder()
      .select('game.gameType', 'gameType')
      .addSelect('COUNT(*)', 'count')
      .from(Game, 'game')
      .groupBy('game.gameType')
      .getRawMany();

    return rows.map((r) => ({ name: r.gameType, amount: parseInt(r.count, 10) }));
  }

  async findAll(page: number, limit: number, search?: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('game')
      .from(Game, 'game')
      .leftJoinAndSelect('game.creator', 'creator')
      .leftJoinAndSelect('game.modes', 'modes');

    if (search) {
      qb.where(
        '(CAST(game.gameType AS TEXT) ILIKE :search OR creator.name ILIKE :search OR creator.email ILIKE :search OR CAST(game.id AS TEXT) ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('game.startedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };
  }

  async create(dto: CreateGameDto, userId?: string): Promise<Game> {
    const modes = await this.dataSource
      .createQueryBuilder()
      .select('mode')
      .from(Mode, 'mode')
      .where('mode.id IN (:...ids)', { ids: dto.modeIds })
      .getMany();

    if (modes.length !== dto.modeIds.length) {
      throw new NotFoundException('One or more modes not found');
    }

    const isLocal = dto.isLocal ?? true;
    const code = isLocal ? null : await this.generateUniqueCode();

    const game = this.dataSource.manager.create(Game, {
      gameType: dto.gameType,
      modes,
      isLocal,
      creator: userId ? { id: userId } : null,
      code,
    });

    const saved = await this.dataSource.manager.save(game);

    if (code) {
      await this.redisService.setex(
        `game:${code}`,
        86400,
        JSON.stringify({
          gameId: saved.id,
          gameType: saved.gameType,
          status: 'waiting',
          hostId: userId ?? null,
          modeIds: dto.modeIds,
          previousQuestionsIds: [],
          currentQuestion: null
        }),
      );
    }

    return saved;
  }

  async end(id: string): Promise<Game> {
    const game = await this.dataSource
      .createQueryBuilder()
      .select('game')
      .from(Game, 'game')
      .where('game.id = :id', { id })
      .getOne();

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    game.endedAt = new Date();

    await this.dataSource
      .createQueryBuilder()
      .update(Game)
      .set({ endedAt: game.endedAt })
      .where('id = :id', { id })
      .execute();

    return game;
  }
}
