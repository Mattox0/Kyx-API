import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { NotificationService } from './notification.service.js';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard.js';
import { auth } from '../auth.js';

class RegisterTokenDto {
  token: string;
}

class SendNotificationDto {
  title: string;
  body: string;
}

class SendToUsersDto {
  userIds: string[];
  title: string;
  body: string;
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('device-token')
  async registerToken(@Body() dto: RegisterTokenDto, @Req() req: Request): Promise<void> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    await this.notificationService.registerToken(dto.token, session?.user?.id);
  }

  @Post('send')
  @UseGuards(AdminAuthGuard)
  async sendToAll(@Body() dto: SendNotificationDto) {
    return this.notificationService.sendToAll(dto.title, dto.body);
  }

  @Post('send-to-users')
  @UseGuards(AdminAuthGuard)
  async sendToUsers(@Body() dto: SendToUsersDto) {
    return this.notificationService.sendToUsers(dto.userIds, dto.title, dto.body);
  }
}
