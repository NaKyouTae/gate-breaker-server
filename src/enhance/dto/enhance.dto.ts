import { IsString } from 'class-validator';

export class EnhanceDto {
  @IsString()
  inventoryId!: string;
}
