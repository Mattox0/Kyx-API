import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';

export class ImportPreferItemDto {
  @IsString()
  @IsNotEmpty()
  choiceOne: string;

  @IsString()
  @IsNotEmpty()
  choiceTwo: string;

  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsEnum(Gender)
  @IsOptional()
  mentionedUserOneGender?: Gender;

  @IsEnum(Gender)
  @IsOptional()
  mentionedUserTwoGender?: Gender;
}

export class ImportPreferDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPreferItemDto)
  questions: ImportPreferItemDto[];
}
