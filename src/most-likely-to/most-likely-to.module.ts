import { Module } from '@nestjs/common';
import { MostLikelyToController } from './controllers/most-likely-to.controller.js';
import { MostLikelyToService } from './service/most-likely-to.service.js';
import { GameService } from '../game/service/game.service.js';

@Module({
  controllers: [MostLikelyToController],
  providers: [MostLikelyToService, GameService],
  exports: [MostLikelyToService],
})
export class MostLikelyToModule {}
