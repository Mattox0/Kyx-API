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

class UpdateTruthDareTranslationItemDto {
  @IsString()
  @IsOptional()
  question?: string;
}

class UpdateTruthDareTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTruthDareTranslationItemDto)
  fr?: UpdateTruthDareTranslationItemDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTruthDareTranslationItemDto)
  en?: UpdateTruthDareTranslationItemDto | null;
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
