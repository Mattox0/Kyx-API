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

class UpdatePreferTranslationItemDto {
  @IsString()
  @IsOptional()
  choiceOne?: string;

  @IsString()
  @IsOptional()
  choiceTwo?: string;
}

class UpdatePreferTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePreferTranslationItemDto)
  fr?: UpdatePreferTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePreferTranslationItemDto)
  en?: UpdatePreferTranslationItemDto | null;
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
