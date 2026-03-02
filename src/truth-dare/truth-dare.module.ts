import { Module } from '@nestjs/common';
import { TruthDareController } from './controllers/truth-dare.controller.js';
import { TruthDare } from './entities/truth-dare.entity.js';
import { TruthDareService } from './service/truth-dare.service.js';
import { GameService } from '../game/service/game.service.js';

@Module({
  imports: [TruthDare],
  controllers: [TruthDareController],
  providers: [TruthDareService, GameService],
  exports: [TruthDareService]
})
export class TruthDareModule {}