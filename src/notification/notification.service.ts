import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { DeviceToken } from './entities/device-token.entity.js';

@Injectable()
export class NotificationService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly dataSource: DataSource) {}

  async registerToken(token: string, userId?: string): Promise<void> {
    if (!Expo.isExpoPushToken(token)) {
      return;
    }

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(DeviceToken)
      .values({ token, userId: userId ?? null })
      .orUpdate(['userId'], ['token'])
      .execute();
  }

  async sendToUsers(userIds: string[], title: string, body: string): Promise<{ sent: number; failed: number }> {
    const tokens = await this.dataSource
      .createQueryBuilder()
      .select('dt.token', 'token')
      .from(DeviceToken, 'dt')
      .where('dt.userId IN (:...userIds)', { userIds })
      .getRawMany<{ token: string }>();

    return this.sendChunks(tokens.map((t) => t.token), title, body);
  }

  async sendToAll(title: string, body: string): Promise<{ sent: number; failed: number }> {
    const tokens = await this.dataSource
      .createQueryBuilder()
      .select('dt.token', 'token')
      .from(DeviceToken, 'dt')
      .getRawMany<{ token: string }>();

    return this.sendChunks(tokens.map((t) => t.token), title, body);
  }

  private async sendChunks(tokens: string[], title: string, body: string): Promise<{ sent: number; failed: number }> {
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));

    if (validTokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const messages: ExpoPushMessage[] = validTokens.map((to) => ({
      to,
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
