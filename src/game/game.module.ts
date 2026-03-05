import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity.js';
import { Mode } from '../mode/entities/mode.entity.js';
import { GameService } from './service/game.service.js';
import { GameSessionService } from './service/game-session.service.js';
import { GameController } from './controllers/game.controller.js';
import { RoomWebsocketGateway } from './gateway/game.gateway.js';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Mode])],
  controllers: [GameController],
  providers: [GameService, GameSessionService, RoomWebsocketGateway],
  exports: [GameService, GameSessionService],
})
export class GameModule {}
