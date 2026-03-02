import { Module } from '@nestjs/common';
import { PreferController } from './controllers/prefer.controller.js';
import { Prefer } from './entities/prefer.entity.js';
import { PreferService } from './service/prefer.service.js';
import { GameService } from '../game/service/game.service.js';

@Module({
  imports: [Prefer],
  controllers: [PreferController],
  providers: [PreferService, GameService],
  exports: [PreferService]
})
export class PreferModule {}