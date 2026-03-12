import { IsString } from 'class-validator';

export class EquipDto {
  @IsString()
  inventoryId!: string;
}
