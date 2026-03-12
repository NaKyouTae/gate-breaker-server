import { IsString, MaxLength } from 'class-validator';

export class SendChatDto {
  @IsString()
  @MaxLength(200)
  message!: string;
}
