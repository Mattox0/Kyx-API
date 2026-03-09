import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';
import { ChallengeType } from '../../../types/enums/TruthDareChallengeType.js';

export class ImportTruthDareItemDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @IsEnum(ChallengeType)
  @IsNotEmpty()
  type: ChallengeType;

  @IsString()
  @IsNotEmpty()
  modeId: string;

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
