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
import { NeverHaveTranslationItemDto } from './create-never-have.dto.js';

class UpdateNeverHaveTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NeverHaveTranslationItemDto)
  fr?: NeverHaveTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => NeverHaveTranslationItemDto)
  en?: NeverHaveTranslationItemDto | null;
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
