import { Module } from '@nestjs/common';
import { NeverHaveController } from './controllers/never-have.controller.js';
import { NeverHaveService } from './service/never-have.service.js';
import { NeverHave } from './entities/never-have.entity.js';
import { GameService } from '../game/service/game.service.js';
@Module({
  imports: [NeverHave],
  controllers: [NeverHaveController],
  providers: [NeverHaveService, GameService],
  exports: [NeverHaveService]
})
export class NeverHaveModule {}
