import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class SellDto {
  @IsString()
  inventoryId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
