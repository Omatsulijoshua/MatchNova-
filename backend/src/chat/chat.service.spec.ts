import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Match, Message } from '@prisma/client';

describe('ChatService', () => {
  let service: ChatService;
  let prismaService: PrismaService;

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job_123' }),
  };

  const mockMatch = {
    id: 'match_uuid_123',
    user1Id: 'user_123',
    user2Id: 'user_456',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      match: {
        findUnique: jest.fn(),
      },
      message: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken('chat_notifications'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateParticipant', () => {
    it('should throw NotFoundException if match does not exist', async () => {
      jest.spyOn(prismaService.match, 'findUnique').mockResolvedValue(null);
      await expect(
        service.validateParticipant('user_123', 'match_999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not participant in the match', async () => {
      jest
        .spyOn(prismaService.match, 'findUnique')
        .mockResolvedValue(mockMatch as unknown as Match);
      await expect(
        service.validateParticipant('user_999', 'match_uuid_123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return match details on validation success', async () => {
      jest
        .spyOn(prismaService.match, 'findUnique')
        .mockResolvedValue(mockMatch as unknown as Match);
      const result = await service.validateParticipant(
        'user_123',
        'match_uuid_123',
      );
      expect(result).toEqual(mockMatch);
    });
  });

  describe('saveMessage', () => {
    it('should successfully save message and enqueue background push job', async () => {
      jest
        .spyOn(prismaService.match, 'findUnique')
        .mockResolvedValue(mockMatch as unknown as Match);
      jest.spyOn(prismaService.message, 'create').mockResolvedValue({
        id: 'msg_123',
        matchId: 'match_uuid_123',
        senderId: 'user_123',
        content: 'hello',
        createdAt: new Date(),
        readAt: null,
      } as unknown as Message);

      const result = await service.saveMessage(
        'user_123',
        'match_uuid_123',
        'hello',
      );
      expect(result.id).toBe('msg_123');
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });
});
