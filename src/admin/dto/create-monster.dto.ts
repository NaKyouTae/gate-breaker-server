import { IsString, IsInt, IsBoolean, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateMonsterDto {
  @IsString()
  name: string;

  @IsUUID()
  dungeonId: string;

  @IsInt()
  @Min(1)
  hp: number;

  @IsInt()
  @Min(0)
  attack: number;

  @IsInt()
  @Min(0)
  defense: number;

  @IsInt()
  @Min(0)
  expReward: number;

  @IsInt()
  @Min(0)
  goldReward: number;

  @IsBoolean()
  @IsOptional()
  isBoss?: boolean;
}
