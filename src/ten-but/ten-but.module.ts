import { Module } from '@nestjs/common';
import { TenButController } from './controllers/ten-but.controller.js';
import { TenBut } from './entities/ten-but.entity.js';
import { TenButService } from './service/ten-but.service.js';
import { GameService } from '../game/service/game.service.js';

@Module({
  imports: [TenBut],
  controllers: [TenButController],
  providers: [TenButService, GameService],
  exports: [TenButService],
})
export class TenButModule {}
