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
import { ChallengeType } from '../../../types/enums/TruthDareChallengeType.js';
import { TruthDareTranslationItemDto } from './create-truth-dare.dto.js';

class UpdateTruthDareTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TruthDareTranslationItemDto)
  fr?: TruthDareTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => TruthDareTranslationItemDto)
  en?: TruthDareTranslationItemDto | null;
}

export class UpdateTruthDareDto {
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsEnum(ChallengeType)
  @IsOptional()
  type?: ChallengeType;

  @IsString()
  @IsOptional()
  modeId?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTruthDareTranslationsDto)
  translations?: UpdateTruthDareTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
