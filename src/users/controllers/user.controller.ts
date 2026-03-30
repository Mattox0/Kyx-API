import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { UserService } from '../service/user.service.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { User } from '../entities/user.entity.js';
import { auth } from '../../auth.js';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async me(@Req() req: Request) {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return session?.user ?? null;
  }

  @Post('me/coins/add')
  async addCoins(@Req() req: Request, @Body() body: { amount: number }): Promise<void> {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user) throw new UnauthorizedException();
    await this.userService.addCoins(session.user.id, body.amount);
  }

  @Get('')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('hasDeviceToken') hasDeviceToken?: string,
  ) {
    return this.userService.findAll(+(page ?? 1), +(limit ?? 50), search, hasDeviceToken === 'true');
  }

  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    const available = await this.userService.checkEmailAvailable(email);
    return { available };
  }

  @Get('check-name')
  async checkName(
    @Query('name') name: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const available = await this.userService.checkNameAvailable(name, excludeId);
    return { available };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User | null> {
    return this.userService.findOne(id);
  }

  @Post(':id')

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User | null> {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
