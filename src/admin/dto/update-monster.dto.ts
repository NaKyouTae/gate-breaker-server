import { IsString, IsInt, IsBoolean, IsOptional, IsUUID, Min } from 'class-validator';

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

  @IsBoolean()
  @IsOptional()
  isBoss?: boolean;
}
