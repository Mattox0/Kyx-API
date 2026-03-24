import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.js';
import { ConfigService } from '@nestjs/config';
import { RevenueCatService } from './revenuecat.service.js';

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  transferred_to?: string[];
}

interface RevenueCatWebhookBody {
  event: RevenueCatEvent;
}

@Controller('revenuecat')
export class RevenueCatController {
  private readonly logger = new Logger(RevenueCatController.name);

  constructor(
    private readonly revenueCatService: RevenueCatService,
    private readonly configService: ConfigService,
  ) {}

  @Post('sync-premium')
  @HttpCode(200)
  async syncPremium(@Req() req: Request): Promise<void> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) throw new UnauthorizedException();
    await this.revenueCatService.syncPremium(session.user.id);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers('authorization') authorization: string,
    @Body() body: RevenueCatWebhookBody,
  ): Promise<void> {
    const secret = this.configService.get<string>('REVENUECAT_WEBHOOK_SECRET');
    if (secret && authorization !== secret) {
      throw new UnauthorizedException();
    }

    const { event } = body;
    this.logger.log(`RevenueCat event: ${event.type} for ${event.app_user_id}`);

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        if (!event.app_user_id.startsWith('$RCAnonymousID')) {
          await this.revenueCatService.setPremium(event.app_user_id, true);
        }
        break;

      case 'TRANSFER':
        if (event.transferred_to?.[0] && !event.transferred_to[0].startsWith('$RCAnonymousID')) {
          await this.revenueCatService.setPremium(event.transferred_to[0], true);
        }
        break;

      case 'EXPIRATION':
      case 'CANCELLATION':
        if (!event.app_user_id.startsWith('$RCAnonymousID')) {
          await this.revenueCatService.setPremium(event.app_user_id, false);
        }
        break;

      default:
        break;
    }
  }
}
