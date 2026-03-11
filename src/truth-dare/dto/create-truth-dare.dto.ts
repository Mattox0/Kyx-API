import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';
import { ChallengeType } from '../../../types/enums/TruthDareChallengeType.js';

export class CreateTruthDareDto {
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

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
