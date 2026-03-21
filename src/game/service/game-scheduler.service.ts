import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { Game } from '../entities/game.entity.js';

@Injectable()
export class GameSchedulerService {
  constructor(private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async endAbandonedLocalGames(): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(Game)
      .set({ endedAt: () => 'NOW()' })
      .where('game.isLocal = true')
      .andWhere('game.endedAt IS NULL')
      .andWhere("game.startedAt < NOW() - INTERVAL '6 hours'")
      .execute();
  }
}
