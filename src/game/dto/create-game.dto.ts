import { IsArray, IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { GameType } from '../../../types/enums/GameType.js';

export class CreateGameDto {
  @IsEnum(GameType)
  gameType: GameType;

  @IsArray()
  @IsUUID('4', { each: true })
  modeIds: string[];

  @IsBoolean()
  @IsOptional()
  isLocal?: boolean;
}
