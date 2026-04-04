import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';

export class PreferTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  choiceOne: string;

  @IsString()
  @IsNotEmpty()
  choiceTwo: string;
}

export class PreferTranslationsDto {
  @ValidateNested()
  @Type(() => PreferTranslationItemDto)
  @IsNotEmpty()
  fr: PreferTranslationItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferTranslationItemDto)
  en?: PreferTranslationItemDto;
}

export class CreatePreferDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PreferTranslationsDto)
  translations: PreferTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
