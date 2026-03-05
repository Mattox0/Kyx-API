import { Module } from '@nestjs/common';
import { NeverHaveController } from './controllers/never-have.controller.js';
import { NeverHaveService } from './service/never-have.service.js';
import { GameModule } from '../game/game.module.js';

@Module({
  imports: [GameModule],
  controllers: [NeverHaveController],
  providers: [NeverHaveService],
  exports: [NeverHaveService],
})
export class NeverHaveModule {}
