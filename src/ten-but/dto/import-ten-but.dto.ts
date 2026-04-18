import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, Max, Min, IsNotEmpty, IsObject, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { TenButTranslationsDto } from './create-ten-but.dto.js';
import { Gender } from '../../../types/enums/Gender.js';

export class ImportTenButItemDto {
  @IsString()
  @IsNotEmpty()
  modeId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  score: number;

  @IsObject()
  @ValidateNested()
  @Type(() => TenButTranslationsDto)
  translations: TenButTranslationsDto;

  @ValidateIf((o) => o.mentionedUserGender != null)
  @IsEnum(Gender)
  @IsOptional()
  mentionedUserGender?: Gender | null;
}

export class ImportTenButDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTenButItemDto)
  questions: ImportTenButItemDto[];
}