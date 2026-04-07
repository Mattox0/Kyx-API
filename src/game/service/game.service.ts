import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Game } from '../entities/game.entity.js';
import { Mode } from '../../mode/entities/mode.entity.js';
import { CreateGameDto } from '../dto/create-game.dto.js';
import { GameType } from '../../../types/enums/GameType.js';
import { RedisService } from '../../redis/redis.service.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';
import { CustomQuestionDto } from '../../common/dto/custom-question.dto.js';
import { CustomQuestionEntry } from '../../../types/ws/GameSession.js';
import { Gender } from '../../../types/enums/Gender.js';
import { shuffle } from '../../common/utils/shuffle.js';

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

  async getActiveGamesCount(): Promise<{ amount: number }> {
    const amount = await this.dataSource
      .createQueryBuilder()
      .from(Game, 'game')
      .where('game.endedAt IS NULL AND game.code IS NOT NULL')
      .getCount();

    return { amount };
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
      .select('mt.name', 'name')
      .addSelect('COUNT(DISTINCT game.id)', 'count')
      .from(Game, 'game')
      .innerJoin('game.modes', 'mode')
      .innerJoin('mode.translations', 'mt', 'mt.locale = :locale', { locale: DEFAULT_LOCALE })
      .where('game.gameType = :gameType', { gameType })
      .groupBy('mode.id')
      .addGroupBy('mt.name')
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

  async getStatsByCreator(
    days: 1 | 3 | 7 | 30 | null,
    page: number,
    limit: number,
    search?: string,
  ) {
    const dataQb = this.dataSource
      .createQueryBuilder()
      .select('creator.id', 'creatorId')
      .addSelect('creator.name', 'name')
      .addSelect('creator.email', 'email')
      .addSelect('COUNT(game.id)', 'count')
      .from(Game, 'game')
      .leftJoin('game.creator', 'creator');

    if (days !== null) {
      dataQb.where(`game.startedAt >= NOW() - INTERVAL '${days} days'`);
    }
    if (search) {
      const cond = '(creator.name ILIKE :search OR creator.email ILIKE :search)';
      days !== null ? dataQb.andWhere(cond, { search: `%${search}%` }) : dataQb.where(cond, { search: `%${search}%` });
    }

    dataQb
      .groupBy('creator.id')
      .addGroupBy('creator.name')
      .addGroupBy('creator.email')
      .orderBy('count', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit);

    const countQb = this.dataSource
      .createQueryBuilder()
      .select('creator.id')
      .from(Game, 'game')
      .leftJoin('game.creator', 'creator');

    if (days !== null) {
      countQb.where(`game.startedAt >= NOW() - INTERVAL '${days} days'`);
    }
    if (search) {
      const cond = '(creator.name ILIKE :search OR creator.email ILIKE :search)';
      days !== null ? countQb.andWhere(cond, { search: `%${search}%` }) : countQb.where(cond, { search: `%${search}%` });
    }
    countQb.groupBy('creator.id').addGroupBy('creator.name').addGroupBy('creator.email');

    const [rows, countResult]: [
      { creatorId: string | null; name: string | null; email: string | null; count: string }[],
      { total: string },
    ] = await Promise.all([
      dataQb.getRawMany(),
      this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'total')
        .from(`(${countQb.getQuery()})`, 'sub')
        .setParameters(countQb.getParameters())
        .getRawOne(),
    ]);

    const total = parseInt(countResult?.total ?? '0', 10);
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows.map((r) => ({
        count: parseInt(r.count, 10),
        creator: r.creatorId ? { id: r.creatorId, name: r.name, email: r.email } : null,
      })),
      total,
      page,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };
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

  async create(dto: CreateGameDto, userId?: string, locale: string = DEFAULT_LOCALE): Promise<Game> {
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
      const customQuestionsPool = buildCustomQuestionPool(dto.customQuestions ?? []);
      await this.redisService.setex(
        `game:${code}`,
        86400,
        JSON.stringify({
          gameId: saved.id,
          gameType: saved.gameType,
          status: 'waiting',
          hostId: userId ?? null,
          modeIds: dto.modeIds,
          locale,
          previousQuestionsIds: [],
          currentQuestion: null,
          customQuestionsPool,
          remainingCustomQuestions: [...customQuestionsPool],
        }),
      );
    }

    return saved;
  }

  async findByCode(code: string): Promise<Game | null> {
    return this.dataSource
      .createQueryBuilder()
      .select('game')
      .from(Game, 'game')
      .leftJoinAndSelect('game.creator', 'creator')
      .leftJoinAndSelect('game.modes', 'modes')
      .where('game.code = :code', { code })
      .getOne();
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

function buildCustomQuestionPool(customQuestions: CustomQuestionDto[]): CustomQuestionEntry[] {
  const entries: CustomQuestionEntry[] = customQuestions.map((cq) => {
    const now = new Date();
    const id = crypto.randomUUID();

    if (cq.type === 'truth-dare') {
      return {
        entity: { id, question: cq.question!, type: cq.challengeType, gender: Gender.ALL, mentionedUserGender: null, mode: null, createdDate: now, updatedDate: now } as any,
        questionType: 'truth-dare',
      };
    }
    if (cq.type === 'never-have') {
      return {
        entity: { id, question: cq.question!, mentionedUserGender: null, mode: null, createdDate: now, updatedDate: now } as any,
        questionType: 'never-have',
      };
    }
    return {
      entity: { id, choiceOne: cq.choiceOne!, choiceTwo: cq.choiceTwo!, mentionedUserGender: null, mode: null, createdDate: now, updatedDate: now } as any,
      questionType: 'prefer',
    };
  });

  return shuffle(entries);
}
