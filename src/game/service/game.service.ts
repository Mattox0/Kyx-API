import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Game } from '../entities/game.entity.js';
import { Mode } from '../../mode/entities/mode.entity.js';
import { CreateGameDto } from '../dto/create-game.dto.js';

@Injectable()
export class GameService {
  constructor(private readonly dataSource: DataSource) {}

  async create(dto: CreateGameDto, userId?: string): Promise<Game> {
    const modes = await this.dataSource
      .createQueryBuilder()
      .select('mode')
      .from(Mode, 'mode')
      .where('mode.id IN (:...ids)', { ids: dto.modeIds })
      .getMany();

    if (modes.length !== dto.modeIds.length) {
      throw new NotFoundException('One or more modes not found');
    }

    const game = this.dataSource.manager.create(Game, {
      gameType: dto.gameType,
      modes,
      isLocal: dto.isLocal ?? true,
      creator: userId ? { id: userId } : null,
    });

    return this.dataSource.manager.save(game);
  }

  async end(id: string): Promise<Game> {
    const game = await this.dataSource
      .createQueryBuilder()
      .select('game')
      .from(Game, 'game')
      .where('game.id = :id', { id })
      .getOne();

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    game.endedAt = new Date();

    await this.dataSource
      .createQueryBuilder()
      .update(Game)
      .set({ endedAt: game.endedAt })
      .where('id = :id', { id })
      .execute();

    return game;
  }
}
