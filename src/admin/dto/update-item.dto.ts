import { IsString, IsEnum, IsInt, IsOptional, Min, Allow } from 'class-validator';
import { ItemType, Rarity } from '@prisma/client';

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(ItemType)
  @IsOptional()
  type?: ItemType;

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

  @IsString()
  @IsOptional()
  description?: string;

  @Allow()
  @IsOptional()
  imageUrl?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  sellPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  buyPrice?: number;
}
