import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friend } from './entities/friend.entity.js';
import { FriendRequest } from './entities/friend-request.entity.js';
import { FriendController } from './controllers/friend.controller.js';
import { FriendService } from './service/friend.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Friend, FriendRequest])],
  controllers: [FriendController],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
