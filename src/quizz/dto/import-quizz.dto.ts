import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { QuizzDifficulty } from '../../../types/enums/QuizzDifficulty.js';
import { QuizzTranslationsDto, QuizzAnswerTranslationsDto } from './create-quizz.dto.js';

export class ImportQuizzAnswerItemDto {
  @IsBoolean()
  isCorrect: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => QuizzAnswerTranslationsDto)
  translations: QuizzAnswerTranslationsDto;
}

export class ImportQuizzItemDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsEnum(QuizzDifficulty)
  @IsOptional()
  difficulty?: QuizzDifficulty;

  @IsObject()
  @ValidateNested()
  @Type(() => QuizzTranslationsDto)
  translations: QuizzTranslationsDto;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ImportQuizzAnswerItemDto)
  answers: ImportQuizzAnswerItemDto[];
}

export class ImportQuizzDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportQuizzItemDto)
  questions: ImportQuizzItemDto[];
}
