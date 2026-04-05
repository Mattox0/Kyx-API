import { IsArray, IsUUID } from 'class-validator';

export class ReorderModesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
