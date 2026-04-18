import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  Max,
  Min,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';

class UpdateTenButTranslationItemDto {
  @IsString()
  @IsOptional()
  question?: string;
}

class UpdateTenButTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTenButTranslationItemDto)
  fr?: UpdateTenButTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTenButTranslationItemDto)
  en?: UpdateTenButTranslationItemDto | null;
}

export class UpdateTenButDto {
  @IsString()
  @IsOptional()
  modeId?: string;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  score?: number;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTenButTranslationsDto)
  translations?: UpdateTenButTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
