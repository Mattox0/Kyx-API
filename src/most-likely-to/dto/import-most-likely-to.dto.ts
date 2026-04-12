import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';
import { MostLikelyToTranslationsDto } from './create-most-likely-to.dto.js';

export class ImportMostLikelyToItemDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => MostLikelyToTranslationsDto)
  translations: MostLikelyToTranslationsDto;

  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender;
}

export class ImportMostLikelyToDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMostLikelyToItemDto)
  questions: ImportMostLikelyToItemDto[];
}
