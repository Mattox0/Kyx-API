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
import { PreferTranslationItemDto } from './create-prefer.dto.js';

class UpdatePreferTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferTranslationItemDto)
  fr?: PreferTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferTranslationItemDto)
  en?: PreferTranslationItemDto | null;
}

export class UpdatePreferDto {
  @IsString()
  @IsOptional()
  modeId?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePreferTranslationsDto)
  translations?: UpdatePreferTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
