import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';

const ENTITLEMENT_ID = 'Kyx Unlimited';

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async syncPremium(userId: string): Promise<void> {
    const secretKey = this.configService.get<string>('REVENUECAT_SECRET_KEY');
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );

    if (!response.ok) {
      this.logger.warn(`RevenueCat API error for user ${userId}: ${response.status}`);
      return;
    }

    const data = await response.json() as { subscriber: { entitlements: Record<string, { expires_date: string | null }> } };
    const entitlement = data.subscriber?.entitlements?.[ENTITLEMENT_ID];
    const isActive = !!entitlement && (entitlement.expires_date === null || new Date(entitlement.expires_date) > new Date());

    await this.setPremium(userId, isActive);
  }

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
