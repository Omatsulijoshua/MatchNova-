import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @InjectQueue('chat_notifications')
    private readonly notificationsQueue?: Queue,
  ) {}

  async validateParticipant(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException('Match conversation not found.');
    }
    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new BadRequestException(
        'You are not a participant in this conversation.',
      );
    }
    return match;
  }

  async saveMessage(senderId: string, matchId: string, content: string) {
    const match = await this.validateParticipant(senderId, matchId);

    const message = await this.prisma.message.create({
      data: {
        matchId,
        senderId,
        content,
      },
    });

    // Queue push notification asynchronously using BullMQ if queue is available
    if (this.notificationsQueue) {
      const recipientId =
        match.user1Id === senderId ? match.user2Id : match.user1Id;
      await this.notificationsQueue
        .add('send_notification', {
          recipientId,
          senderId,
          messageId: message.id,
          contentExcerpt: content.substring(0, 50),
        })
        .catch((err) => {
          // Prevent throwing error to the client if background queue is unreachable
          console.error(`BullMQ enqueue failed: ${String(err)}`);
        });
    }

    return message;
  }

  async markAsRead(userId: string, matchId: string, messageId: string) {
    await this.validateParticipant(userId, matchId);

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.matchId !== matchId) {
      throw new NotFoundException('Message not found in this match.');
    }

    if (message.senderId === userId) {
      // Cannot read-receipt own message
      return message;
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  async getHistory(userId: string, matchId: string) {
    await this.validateParticipant(userId, matchId);

    return this.prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
