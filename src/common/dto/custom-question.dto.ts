import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class CustomQuestionDto {
  @IsIn(['never-have', 'truth-dare', 'prefer', 'most-likely-to'])
  type: 'never-have' | 'truth-dare' | 'prefer' | 'most-likely-to';

  @ValidateIf((o) => o.type === 'never-have' || o.type === 'truth-dare' || o.type === 'most-likely-to')
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
}
