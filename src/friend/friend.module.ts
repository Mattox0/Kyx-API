import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friend } from './entities/friend.entity.js';
import { FriendRequest } from './entities/friend-request.entity.js';
import { FriendController } from './controllers/friend.controller.js';
import { FriendService } from './service/friend.service.js';
import { GameModule } from '../game/game.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Friend, FriendRequest]), GameModule],
  controllers: [FriendController],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
