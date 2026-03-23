import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  constructor(private readonly dataSource: DataSource) {}

  async setPremium(userId: string, isPremium: boolean): Promise<void> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(User)
      .set({ isPremium })
      .where('id = :id', { id: userId })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`User ${userId} isPremium → ${isPremium}`);
    } else {
      this.logger.warn(`User ${userId} not found for isPremium update`);
    }
  }
}
