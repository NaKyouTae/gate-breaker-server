import { IsInt, Min } from 'class-validator';

export class UpdateShopDto {
  @IsInt()
  @Min(0)
  buyPrice: number;
}
