import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { QuizzDifficulty } from '../../../types/enums/QuizzDifficulty.js';

class UpdateQuizzTranslationItemDto {
  @IsString()
  @IsOptional()
  text?: string;
}

class UpdateQuizzTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateQuizzTranslationItemDto)
  fr?: UpdateQuizzTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateQuizzTranslationItemDto)
  en?: UpdateQuizzTranslationItemDto | null;
}

class UpdateQuizzAnswerTranslationItemDto {
  @IsString()
  @IsOptional()
  text?: string;
}

class UpdateQuizzAnswerTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateQuizzAnswerTranslationItemDto)
  fr?: UpdateQuizzAnswerTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateQuizzAnswerTranslationItemDto)
  en?: UpdateQuizzAnswerTranslationItemDto | null;
}

export class UpdateQuizzAnswerDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsBoolean()
  @IsOptional()
  isCorrect?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateQuizzAnswerTranslationsDto)
  translations?: UpdateQuizzAnswerTranslationsDto;
}

export class UpdateQuizzDto {
  @IsString()
  @IsOptional()
  modeId?: string;

  @IsEnum(QuizzDifficulty)
  @IsOptional()
  difficulty?: QuizzDifficulty;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateQuizzTranslationsDto)
  translations?: UpdateQuizzTranslationsDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuizzAnswerDto)
  answers?: UpdateQuizzAnswerDto[];
}
