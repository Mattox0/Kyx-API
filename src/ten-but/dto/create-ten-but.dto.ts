import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  Max,
  Min,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';

export class TenButTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  question: string;
}

export class TenButTranslationsDto {
  @ValidateNested()
  @Type(() => TenButTranslationItemDto)
  @IsNotEmpty()
  fr: TenButTranslationItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenButTranslationItemDto)
  en?: TenButTranslationItemDto;
}

export class CreateTenButDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  score: number;

  @IsObject()
  @ValidateNested()
  @Type(() => TenButTranslationsDto)
  translations: TenButTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
