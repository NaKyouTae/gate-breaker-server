import { IsString, IsOptional } from 'class-validator';

export class EnhanceDto {
  @IsString()
  inventoryId!: string;

  @IsOptional()
  @IsString()
  enhanceStoneId?: string;
}
