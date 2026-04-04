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

export class NeverHaveTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  question: string;
}

export class NeverHaveTranslationsDto {
  @ValidateNested()
  @Type(() => NeverHaveTranslationItemDto)
  @IsNotEmpty()
  fr: NeverHaveTranslationItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NeverHaveTranslationItemDto)
  en?: NeverHaveTranslationItemDto;
}

export class CreateNeverHaveDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => NeverHaveTranslationsDto)
  translations: NeverHaveTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
