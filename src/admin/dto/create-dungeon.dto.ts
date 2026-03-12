import { IsString, IsInt, Min } from 'class-validator';

export class CreateDungeonDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  minLevel: number;

  @IsInt()
  @Min(1)
  maxLevel: number;

  @IsInt()
  @Min(0)
  rewardGoldMin: number;

  @IsInt()
  @Min(0)
  rewardGoldMax: number;

  @IsInt()
  @Min(0)
  rewardExp: number;
}
