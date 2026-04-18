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
import { CustomQuestionDto } from '../../common/dto/custom-question.dto.js';

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

export class CreatePartyOnlineTenButDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Validate(ModeExistsConstraint, { each: true })
  modes: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomQuestionDto)
  customQuestions?: CustomQuestionDto[];
}

export class CreatePartyTenButDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserSoloItemDto)
  users: UserSoloItemDto[];

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Validate(ModeExistsConstraint, { each: true })
  modes: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomQuestionDto)
  customQuestions?: CustomQuestionDto[];
}
