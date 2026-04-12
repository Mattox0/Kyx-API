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

export class MostLikelyToTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  question: string;
}

export class MostLikelyToTranslationsDto {
  @ValidateNested()
  @Type(() => MostLikelyToTranslationItemDto)
  @IsNotEmpty()
  fr: MostLikelyToTranslationItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MostLikelyToTranslationItemDto)
  en?: MostLikelyToTranslationItemDto;
}

export class CreateMostLikelyToDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => MostLikelyToTranslationsDto)
  translations: MostLikelyToTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
