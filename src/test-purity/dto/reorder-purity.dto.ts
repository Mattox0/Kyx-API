import { IsArray, IsUUID } from 'class-validator';

export class ReorderPurityDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
