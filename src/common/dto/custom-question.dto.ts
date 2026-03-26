import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class CustomQuestionDto {
  @IsIn(['never-have', 'truth-dare', 'prefer'])
  type: 'never-have' | 'truth-dare' | 'prefer';

  @ValidateIf((o) => o.type === 'never-have' || o.type === 'truth-dare')
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
