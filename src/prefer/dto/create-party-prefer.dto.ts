import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '../../../types/enums/Gender.js';
import { ModeExistsConstraint } from '../../common/validators/mode-exists.validator.js';

export class UserSoloItemDto {
  @IsString()
  @IsOptional()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;
}

export class CreatePartyOnlinePreferDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Validate(ModeExistsConstraint, { each: true })
  modes: string[];
}

export class CreatePartyPreferDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserSoloItemDto)
  users: UserSoloItemDto[];

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Validate(ModeExistsConstraint, { each: true })
  modes: string[];
}
