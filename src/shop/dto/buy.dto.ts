import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class BuyDto {
  @IsString()
  itemId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
