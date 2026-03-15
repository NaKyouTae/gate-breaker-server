import { IsString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ItemType, Rarity } from '@prisma/client';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(ItemType)
  type: ItemType;

  @IsEnum(Rarity)
  @IsOptional()
  rarity?: Rarity;

  @IsInt()
  @Min(0)
  @IsOptional()
  baseAttack?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  baseDefense?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  baseHp?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  healHp?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sellPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  buyPrice?: number;
}
