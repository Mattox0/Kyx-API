import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { NotificationService } from './notification.service.js';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard.js';
import { auth } from '../auth.js';

class RegisterTokenDto {
  token: string;
}

class SendNotificationDto {
  titleFr: string;
  bodyFr: string;
  titleEn: string;
  bodyEn: string;
}

class SendToUsersDto {
  userIds: string[];
  titleFr: string;
  bodyFr: string;
  titleEn: string;
  bodyEn: string;
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('device-token')
  async registerToken(
    @Body() dto: RegisterTokenDto,
    @Req() req: Request,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<void> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    const language = acceptLanguage?.split(',')[0]?.trim().toLowerCase().startsWith('en') ? 'en' : 'fr';
    await this.notificationService.registerToken(dto.token, session?.user?.id, language);
  }

  @Post('send')
  @UseGuards(AdminAuthGuard)
  async sendToAll(@Body() dto: SendNotificationDto) {
    return this.notificationService.sendToAll(dto.titleFr, dto.bodyFr, dto.titleEn, dto.bodyEn);
  }

  @Post('send-to-users')
  @UseGuards(AdminAuthGuard)
  async sendToUsers(@Body() dto: SendToUsersDto) {
    return this.notificationService.sendToUsers(dto.userIds, dto.titleFr, dto.bodyFr, dto.titleEn, dto.bodyEn);
  }
}
