import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  exp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxHp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  mp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  attack?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defense?: number;
}
