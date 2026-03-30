import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard.js';

class RegisterTokenDto {
  token: string;
}

class SendNotificationDto {
  title: string;
  body: string;
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('device-token')
  async registerToken(@Body() dto: RegisterTokenDto): Promise<void> {
    await this.notificationService.registerToken(dto.token);
  }

  @Post('send')
  @UseGuards(AdminAuthGuard)
  async sendToAll(@Body() dto: SendNotificationDto) {
    return this.notificationService.sendToAll(dto.title, dto.body);
  }
}
