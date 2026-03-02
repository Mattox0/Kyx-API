import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity.js';
import { Mode } from '../mode/entities/mode.entity.js';
import { GameService } from './service/game.service.js';
import { GameController } from './controllers/game.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Mode])],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
