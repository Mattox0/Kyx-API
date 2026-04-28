import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { QuizzDifficulty } from '../../../types/enums/QuizzDifficulty.js';

export class QuizzTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class QuizzTranslationsDto {
  @ValidateNested()
  @Type(() => QuizzTranslationItemDto)
  @IsNotEmpty()
  fr: QuizzTranslationItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuizzTranslationItemDto)
  en?: QuizzTranslationItemDto;
}

export class QuizzAnswerTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class QuizzAnswerTranslationsDto {
  @ValidateNested()
  @Type(() => QuizzAnswerTranslationItemDto)
  @IsNotEmpty()
  fr: QuizzAnswerTranslationItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuizzAnswerTranslationItemDto)
  en?: QuizzAnswerTranslationItemDto;
}

export class CreateQuizzAnswerDto {
  @IsBoolean()
  isCorrect: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => QuizzAnswerTranslationsDto)
  translations: QuizzAnswerTranslationsDto;
}

export class CreateQuizzDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsEnum(QuizzDifficulty)
  difficulty: QuizzDifficulty;

  @IsObject()
  @ValidateNested()
  @Type(() => QuizzTranslationsDto)
  translations: QuizzTranslationsDto;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CreateQuizzAnswerDto)
  answers: CreateQuizzAnswerDto[];
}
