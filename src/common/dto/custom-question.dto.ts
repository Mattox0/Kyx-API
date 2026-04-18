import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CustomQuestionDto {
  @IsIn(['never-have', 'truth-dare', 'prefer', 'most-likely-to', 'ten-but'])
  type: 'never-have' | 'truth-dare' | 'prefer' | 'most-likely-to' | 'ten-but';

  @ValidateIf((o) => o.type === 'never-have' || o.type === 'truth-dare' || o.type === 'most-likely-to' || o.type === 'ten-but')
  @IsString()
  @IsNotEmpty()
  question?: string;

  @ValidateIf((o) => o.type === 'truth-dare')
  @IsIn(['TRUTH', 'DARE'])
  challengeType?: 'TRUTH' | 'DARE';

  @ValidateIf((o) => o.type === 'prefer')
  @IsString()
  @IsNotEmpty()
  choiceOne?: string;

  @ValidateIf((o) => o.type === 'prefer')
  @IsString()
  @IsNotEmpty()
  choiceTwo?: string;

  @ValidateIf((o) => o.type === 'ten-but')
  @IsInt()
  @IsOptional()
  score?: number;
}
