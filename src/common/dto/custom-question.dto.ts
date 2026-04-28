import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CustomQuestionDto {
  @IsIn(['never-have', 'truth-dare', 'prefer', 'most-likely-to', 'ten-but', 'quizz'])
  type: 'never-have' | 'truth-dare' | 'prefer' | 'most-likely-to' | 'ten-but' | 'quizz';

  @ValidateIf((o) => o.type === 'never-have' || o.type === 'truth-dare' || o.type === 'most-likely-to' || o.type === 'ten-but' || o.type === 'quizz')
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

  @ValidateIf((o) => o.type === 'quizz')
  @IsString()
  @IsNotEmpty()
  correctAnswer?: string;

  @ValidateIf((o) => o.type === 'quizz')
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  wrongAnswers?: string[];
}
