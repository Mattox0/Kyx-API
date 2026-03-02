import { Controller, Param, Post } from '@nestjs/common';
import { GameService } from '../service/game.service.js';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post(':id/ended')
  async end(@Param('id') id: string) {
    return this.gameService.end(id);
  }
}
