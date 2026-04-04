import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';
import { ChallengeType } from '../../../types/enums/TruthDareChallengeType.js';
import { TruthDareTranslationsDto } from './create-truth-dare.dto.js';

export class ImportTruthDareItemDto {
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

  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender;
}

export class ImportTruthDareDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTruthDareItemDto)
  questions: ImportTruthDareItemDto[];
}
