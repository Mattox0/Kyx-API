import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { GameType } from '../../../types/enums/GameType.js';

export class ModeTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class ModeTranslationsDto {
  @ValidateNested()
  @Type(() => ModeTranslationItemDto)
  @IsNotEmpty()
  fr: ModeTranslationItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ModeTranslationItemDto)
  en?: ModeTranslationItemDto;
}

export class CreateModeDto {
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @IsObject()
  @ValidateNested()
  @Type(() => ModeTranslationsDto)
  translations: ModeTranslationsDto;

  @IsEnum(GameType)
  @IsNotEmpty()
  gameType: GameType;
}
