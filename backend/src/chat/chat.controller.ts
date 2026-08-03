import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history/:matchId')
  async getChatHistory(
    @Request() req: { user: { id: string } },
    @Param('matchId') matchId: string,
  ) {
    return this.chatService.getHistory(req.user.id, matchId);
  }
}
