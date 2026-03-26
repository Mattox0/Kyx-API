import { IsArray, IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { GameType } from '../../../types/enums/GameType.js';
import { CustomQuestionDto } from '../../common/dto/custom-question.dto.js';

export class CreateGameDto {
  @IsEnum(GameType)
  gameType: GameType;

  @IsArray()
  @IsUUID('4', { each: true })
  modeIds: string[];

  @IsBoolean()
  @IsOptional()
  isLocal?: boolean;

  customQuestions?: CustomQuestionDto[];
}
