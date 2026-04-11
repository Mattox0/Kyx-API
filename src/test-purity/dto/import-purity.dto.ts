import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class ImportPurityAnswerTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

class ImportPurityAnswerDto {
  @IsInt()
  @Min(0)
  weight: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  skipCount?: number;

  @IsObject()
  translations: Record<string, ImportPurityAnswerTranslationItemDto>;
}

class ImportPurityQuestionDto {
  @IsObject()
  translations: Record<string, { question: string }>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPurityAnswerDto)
  @IsOptional()
  answers?: ImportPurityAnswerDto[];
}

export class ImportPurityDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPurityQuestionDto)
  questions: ImportPurityQuestionDto[];
}
