import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { Gender } from '../../../types/enums/Gender.js';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsObject()
  avatarOptions?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  locale?: string;
}
