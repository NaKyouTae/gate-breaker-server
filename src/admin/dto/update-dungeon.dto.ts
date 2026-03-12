import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateDungeonDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  minLevel?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxLevel?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  rewardGoldMin?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  rewardGoldMax?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  rewardExp?: number;
}
