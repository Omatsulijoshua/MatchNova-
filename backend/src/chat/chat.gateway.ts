import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto, TypingDto, ReadReceiptDto } from './dto/chat.dto';
import { UsePipes, ValidationPipe, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  // Track online user connections: userId -> socketId
  private activeClients = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth as Record<string, unknown> | undefined;
      const query = client.handshake.query as
        Record<string, unknown> | undefined;
      let token = (auth?.token || query?.token) as string | undefined;

      if (!token && client.handshake.headers.authorization) {
        const parts = client.handshake.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        }
      }

      if (!token) {
        this.logger.warn(
          `WS connection rejected: No token provided. ClientId: ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      const rawPayload = (await this.jwtService.verifyAsync(token)) as unknown;
      const payload = rawPayload as { sub: string };
      const clientData = client.data as { userId?: string };
      clientData.userId = payload.sub;
      this.activeClients.set(payload.sub, client.id);
      this.logger.log(
        `WS Client authenticated: userId=${payload.sub}, clientId=${client.id}`,
      );
    } catch (err: unknown) {
      this.logger.error(`WS authentication failed: ${String(err)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const clientData = client.data as { userId?: string };
    const userId = clientData.userId;
    if (userId) {
      this.activeClients.delete(userId);
      this.logger.log(
        `WS Client disconnected: userId=${userId}, clientId=${client.id}`,
      );
    }
  }

  @SubscribeMessage('join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const clientData = client.data as { userId?: string };
    const userId = clientData.userId;
    if (!userId || !data.matchId) return;

    // Validate participant before letting them join the room
    try {
      await this.chatService.validateParticipant(userId, data.matchId);
      await client.join(data.matchId);
      this.logger.log(`WS User ${userId} joined room ${data.matchId}`);
      client.emit('joined', { matchId: data.matchId });
    } catch (err: unknown) {
      this.logger.error(`Failed to join conversation room: ${String(err)}`);
      client.emit('error', { message: 'Failed to join conversation room.' });
    }
  }

  @SubscribeMessage('send_msg')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const clientData = client.data as { userId?: string };
    const userId = clientData.userId;
    if (!userId) return;

    try {
      const message = await this.chatService.saveMessage(
        userId,
        dto.matchId,
        dto.content,
      );

      // Broadcast saved message back to all users in the match room
      this.server.to(dto.matchId).emit('msg_receive', message);
    } catch (err: unknown) {
      client.emit('error', {
        message: err instanceof Error ? err.message : 'Failed to send message.',
      });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: TypingDto,
  ) {
    const clientData = client.data as { userId?: string };
    const userId = clientData.userId;
    if (!userId) return;

    // Notify other users in the match room
    client.to(dto.matchId).emit('typing', {
      userId,
      isTyping: dto.isTyping,
    });
  }

  @SubscribeMessage('read_receipt')
  async handleReadReceipt(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReadReceiptDto,
  ) {
    const clientData = client.data as { userId?: string };
    const userId = clientData.userId;
    if (!userId) return;

    try {
      const updatedMessage = await this.chatService.markAsRead(
        userId,
        dto.matchId,
        dto.messageId,
      );

      // Notify match room of read receipt status
      this.server.to(dto.matchId).emit('read_receipt_ack', {
        messageId: updatedMessage.id,
        readAt: updatedMessage.readAt,
      });
    } catch {
      // Fail silently for read receipts, do not interrupt WebSocket connection
    }
  }
}
