import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';
import { PreferTranslationsDto } from './create-prefer.dto.js';

export class ImportPreferItemDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PreferTranslationsDto)
  translations: PreferTranslationsDto;

  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender;
}

export class ImportPreferDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPreferItemDto)
  questions: ImportPreferItemDto[];
}
