import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateConfigDto {
  @IsNotEmpty()
  value: any;

  @IsOptional()
  @IsString()
  description?: string;
}
