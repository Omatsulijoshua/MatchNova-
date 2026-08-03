import { IsNotEmpty, IsUUID, IsString, IsBoolean } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsUUID()
  matchId!: string;

  @IsNotEmpty()
  @IsString()
  content!: string;
}

export class TypingDto {
  @IsNotEmpty()
  @IsUUID()
  matchId!: string;

  @IsNotEmpty()
  @IsBoolean()
  isTyping!: boolean;
}

export class ReadReceiptDto {
  @IsNotEmpty()
  @IsUUID()
  matchId!: string;

  @IsNotEmpty()
  @IsUUID()
  messageId!: string;
}
