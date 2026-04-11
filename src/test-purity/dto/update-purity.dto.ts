import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdatePurityTranslationItemDto {
  @IsString()
  @IsOptional()
  question?: string | null;
}

export class UpdatePurityAnswerTranslationItemDto {
  @IsString()
  @IsOptional()
  text?: string | null;
}

export class UpdatePurityAnswerDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  weight?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  skipCount?: number;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsObject()
  @IsOptional()
  translations?: Record<string, UpdatePurityAnswerTranslationItemDto | null>;
}

export class UpdatePurityDto {
  @IsString()
  @IsOptional()
  modeId?: string;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsObject()
  @IsOptional()
  translations?: Record<string, UpdatePurityTranslationItemDto | null>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePurityAnswerDto)
  @IsOptional()
  answers?: UpdatePurityAnswerDto[];
}
