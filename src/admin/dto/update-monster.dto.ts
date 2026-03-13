import { IsString, IsInt, IsOptional, IsUUID, Min, Allow } from 'class-validator';

export class UpdateMonsterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  dungeonId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  hp?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  attack?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  defense?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  expReward?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  goldReward?: number;

  @Allow()
  @IsOptional()
  imageUrl?: string | null;
}
