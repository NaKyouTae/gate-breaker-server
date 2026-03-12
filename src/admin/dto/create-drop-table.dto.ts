import { IsUUID, IsNumber, Min, Max } from 'class-validator';

export class CreateDropTableDto {
  @IsUUID()
  monsterId: string;

  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  dropRate: number;
}
