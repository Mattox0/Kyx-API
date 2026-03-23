import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
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
        if (event.transferred_to?.[0]) {
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
