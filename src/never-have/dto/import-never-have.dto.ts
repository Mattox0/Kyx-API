import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';
import { NeverHaveTranslationItemDto, NeverHaveTranslationsDto } from './create-never-have.dto.js';

export class ImportNeverHaveItemDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => NeverHaveTranslationsDto)
  translations: NeverHaveTranslationsDto;

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
