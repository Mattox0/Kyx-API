import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { GameType } from '../../../types/enums/GameType.js';
import { ModeTranslationItemDto } from './create-mode.dto.js';

class UpdateModeTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ModeTranslationItemDto)
  fr?: ModeTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ModeTranslationItemDto)
  en?: ModeTranslationItemDto | null;
}

export class UpdateModeDto {
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateModeTranslationsDto)
  translations?: UpdateModeTranslationsDto;

  @IsEnum(GameType)
  @IsOptional()
  gameType?: GameType;

  @IsString()
  @IsOptional()
  icon?: string;
}
