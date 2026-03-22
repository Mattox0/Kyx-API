import { PartialType } from '@nestjs/mapped-types';
import { CreateSuggestionDto } from './create-suggestion.dto.js';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSuggestionDto extends PartialType(CreateSuggestionDto) {
  @IsOptional()
  @IsIn(['pending', 'accepted', 'refused'])
  status: 'pending' | 'accepted' | 'refused';

  @IsOptional()
  @IsString()
  adminComment: string | null;
}
