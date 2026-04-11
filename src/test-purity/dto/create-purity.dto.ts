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

export class PurityTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  question: string;
}

export class PurityAnswerTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class CreatePurityAnswerDto {
  @IsInt()
  @Min(0)
  weight: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  skipCount?: number;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsObject()
  translations: Record<string, PurityAnswerTranslationItemDto>;
}

export class CreatePurityDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsObject()
  translations: Record<string, PurityTranslationItemDto>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurityAnswerDto)
  @IsOptional()
  answers?: CreatePurityAnswerDto[];
}
