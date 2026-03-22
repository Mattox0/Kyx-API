import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GameService } from '../service/game.service.js';
import { GameType } from '../../../types/enums/GameType.js';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('stats/active')
  async getActiveGamesCount() {
    return this.gameService.getActiveGamesCount();
  }

  @Get('stats/state')
  async getStats() {
    return this.gameService.getStats();
  }

  @Get('stats/type')
  async getStatsByType() {
    return this.gameService.getStatsByType();
  }

  @Get('stats/history')
  async getStatsHistory(@Query('period') period: 'weekly' | 'monthly' | 'yearly') {
    return this.gameService.getStatsHistory(period ?? 'weekly');
  }

  @Get('stats/mode')
  async getStatsByMode(@Query('gameType') gameType: GameType) {
    return this.gameService.getStatsByMode(gameType);
  }

  @Get('stats/creators')
  async getStatsByCreator(
    @Query('days') days: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const d = parseInt(days, 10);
    const validDays = ([1, 3, 7, 30] as const).includes(d as 1 | 3 | 7 | 30) ? (d as 1 | 3 | 7 | 30) : null;
    return this.gameService.getStatsByCreator(validDays, +(page ?? 1), +(limit ?? 20), search);
  }

  @Get('')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.gameService.findAll(+(page ?? 1), +(limit ?? 50), search);
  }

  @Post(':id/ended')
  async end(@Param('id') id: string) {
    return this.gameService.end(id);
  }
}
