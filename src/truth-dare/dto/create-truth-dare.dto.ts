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
import { ChallengeType } from '../../../types/enums/TruthDareChallengeType.js';

export class TruthDareTranslationItemDto {
  @IsString()
  @IsNotEmpty()
  question: string;
}

export class TruthDareTranslationsDto {
  @ValidateNested()
  @Type(() => TruthDareTranslationItemDto)
  @IsNotEmpty()
  fr: TruthDareTranslationItemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TruthDareTranslationItemDto)
  en?: TruthDareTranslationItemDto;
}

export class CreateTruthDareDto {
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @IsEnum(ChallengeType)
  @IsNotEmpty()
  type: ChallengeType;

  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => TruthDareTranslationsDto)
  translations: TruthDareTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
