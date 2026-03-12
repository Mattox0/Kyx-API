import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';

export class ImportNeverHaveItemDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender;
}

export class ImportNeverHaveDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportNeverHaveItemDto)
  questions: ImportNeverHaveItemDto[];
}
