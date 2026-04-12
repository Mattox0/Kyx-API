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

class UpdateMostLikelyToTranslationItemDto {
  @IsString()
  @IsOptional()
  question?: string;
}

class UpdateMostLikelyToTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMostLikelyToTranslationItemDto)
  fr?: UpdateMostLikelyToTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMostLikelyToTranslationItemDto)
  en?: UpdateMostLikelyToTranslationItemDto | null;
}

export class UpdateMostLikelyToDto {
  @IsString()
  @IsOptional()
  modeId?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMostLikelyToTranslationsDto)
  translations?: UpdateMostLikelyToTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
