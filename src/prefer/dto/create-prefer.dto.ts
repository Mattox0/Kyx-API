import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';

export class CreatePreferDto {
  @IsString()
  @IsNotEmpty()
  choiceOne: string;

  @IsString()
  @IsNotEmpty()
  choiceTwo: string;

  @IsString()
  @IsNotEmpty()
  modeId: string;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}
