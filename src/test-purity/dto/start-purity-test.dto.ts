import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class StartPurityTestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  modeIds: string[];
}
