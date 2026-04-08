import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';

class UpdateNeverHaveTranslationItemDto {
  @IsString()
  @IsOptional()
  question?: string;
}

class UpdateNeverHaveTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNeverHaveTranslationItemDto)
  fr?: UpdateNeverHaveTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNeverHaveTranslationItemDto)
  en?: UpdateNeverHaveTranslationItemDto | null;
}

export class UpdateNeverHaveDto {
  @IsString()
  @IsOptional()
  modeId?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNeverHaveTranslationsDto)
  translations?: UpdateNeverHaveTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
