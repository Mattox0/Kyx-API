import { IsArray, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurityAnswerSelectionDto {
  @IsString()
  questionId: string;

  @IsString()
  answerId: string;
}

export class CalculatePurityScoreDto {
  @IsArray()
  @IsUUID('4', { each: true })
  modeIds: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurityAnswerSelectionDto)
  answers: PurityAnswerSelectionDto[];
}
