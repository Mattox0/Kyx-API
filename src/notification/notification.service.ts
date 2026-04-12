import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { DeviceToken } from './entities/device-token.entity.js';

@Injectable()
export class NotificationService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly dataSource: DataSource) {}

  async registerToken(token: string, userId?: string, language?: string): Promise<void> {
    if (!Expo.isExpoPushToken(token)) {
      return;
    }

    const lang = language === 'en' ? 'en' : 'fr';

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(DeviceToken)
      .values({ token, userId: userId ?? null, language: lang })
      .orUpdate(['userId', 'language'], ['token'])
      .execute();
  }

  async sendToUsers(
    userIds: string[],
    titleFr: string,
    bodyFr: string,
    titleEn: string,
    bodyEn: string,
  ): Promise<{ sent: number; failed: number }> {
    const tokens = await this.dataSource
      .createQueryBuilder()
      .select('dt.token', 'token')
      .addSelect('dt.language', 'language')
      .from(DeviceToken, 'dt')
      .where('dt.userId IN (:...userIds)', { userIds })
      .getRawMany<{ token: string; language: string }>();

    return this.sendChunksLocalized(tokens, titleFr, bodyFr, titleEn, bodyEn);
  }

  async sendToAll(
    titleFr: string,
    bodyFr: string,
    titleEn: string,
    bodyEn: string,
  ): Promise<{ sent: number; failed: number }> {
    const tokens = await this.dataSource
      .createQueryBuilder()
      .select('dt.token', 'token')
      .addSelect('dt.language', 'language')
      .from(DeviceToken, 'dt')
      .getRawMany<{ token: string; language: string }>();

    return this.sendChunksLocalized(tokens, titleFr, bodyFr, titleEn, bodyEn);
  }

  private sendChunksLocalized(
    tokens: { token: string; language: string }[],
    titleFr: string,
    bodyFr: string,
    titleEn: string,
    bodyEn: string,
  ): Promise<{ sent: number; failed: number }> {
    const withText = tokens.map(({ token, language }) => ({
      token,
      title: language === 'en' ? titleEn : titleFr,
      body: language === 'en' ? bodyEn : bodyFr,
    }));
    return this.sendChunks(withText);
  }

  private async sendChunks(tokens: { token: string; title: string; body: string }[]): Promise<{ sent: number; failed: number }> {
    const valid = tokens.filter((t) => Expo.isExpoPushToken(t.token));

    if (valid.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const messages: ExpoPushMessage[] = valid.map(({ token, title, body }) => ({
      to: token,
      title,
      body,
      sound: 'default',
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    let sent = 0;
    let failed = 0;

    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] = await this.expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          if (ticket.status === 'ok') {
            sent++;
          } else {
            failed++;
            this.logger.warn(`Push notification error: ${ticket.message}`);
          }
        }
      } catch (error) {
        failed += chunk.length;
        this.logger.error('Failed to send push chunk', error);
      }
    }

    this.logger.log(`Push sent: ${sent}, failed: ${failed}`);
    return { sent, failed };
  }
}
