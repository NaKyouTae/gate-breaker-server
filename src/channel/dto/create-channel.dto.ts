import { IsString, IsOptional, IsInt, MaxLength, Min, Max } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @MaxLength(30)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  maxMembers?: number;
}
