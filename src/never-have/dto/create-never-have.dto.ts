import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';

export class CreateNeverHaveDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  modeId: string;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
