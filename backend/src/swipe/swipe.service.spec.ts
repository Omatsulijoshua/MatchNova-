import { Test, TestingModule } from '@nestjs/testing';
import { SwipeService } from './swipe.service';
import { PrismaService } from '../prisma/prisma.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { ProfileService } from '../profile/profile.service';
import { SwipeType } from './dto/swipe.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { User, Swipe, Match } from '@prisma/client';

describe('SwipeService', () => {
  let service: SwipeService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      swipe: {
        count: jest.fn(),
        upsert: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      match: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      profile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const mockQdrantService = {
      generateInterestsVector: jest
        .fn()
        .mockReturnValue(new Array(1536).fill(0.1)),
    };

    const mockProfileService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwipeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QdrantService, useValue: mockQdrantService },
        { provide: ProfileService, useValue: mockProfileService },
      ],
    }).compile();

    service = module.get<SwipeService>(SwipeService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordSwipe', () => {
    it('should throw BadRequestException if swiping on self', async () => {
      await expect(
        service.recordSwipe('user_123', {
          targetUserId: 'user_123',
          type: SwipeType.LIKE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      await expect(
        service.recordSwipe('user_123', {
          targetUserId: 'user_456',
          type: SwipeType.LIKE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if daily superlike limit exceeded', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ id: 'user_456' } as unknown as User);
      jest.spyOn(prismaService.swipe, 'count').mockResolvedValue(1);

      await expect(
        service.recordSwipe('user_123', {
          targetUserId: 'user_456',
          type: SwipeType.SUPERLIKE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully record swipe and return matched: false if no reciprocal swipe exists', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ id: 'user_456' } as unknown as User);
      jest.spyOn(prismaService.swipe, 'count').mockResolvedValue(0);
      jest
        .spyOn(prismaService.swipe, 'upsert')
        .mockResolvedValue({ id: 'swipe_123' } as unknown as Swipe);
      jest.spyOn(prismaService.swipe, 'findFirst').mockResolvedValue(null);

      const result = await service.recordSwipe('user_123', {
        targetUserId: 'user_456',
        type: SwipeType.LIKE,
      });
      expect(result.matched).toBe(false);
    });

    it('should create mutual Match and return matched: true if reciprocal swipe exists', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ id: 'user_456' } as unknown as User);
      jest.spyOn(prismaService.swipe, 'count').mockResolvedValue(0);
      jest
        .spyOn(prismaService.swipe, 'upsert')
        .mockResolvedValue({ id: 'swipe_123' } as unknown as Swipe);
      jest
        .spyOn(prismaService.swipe, 'findFirst')
        .mockResolvedValue({ id: 'recip_swipe' } as unknown as Swipe);
      jest
        .spyOn(prismaService.match, 'upsert')
        .mockResolvedValue({ id: 'match_123' } as unknown as Match);

      const result = await service.recordSwipe('user_123', {
        targetUserId: 'user_456',
        type: SwipeType.LIKE,
      });
      expect(result.matched).toBe(true);
      expect(result.matchId).toBe('match_123');
      /* eslint-disable-next-line @typescript-eslint/unbound-method */
      expect(prismaService.match.upsert).toHaveBeenCalled();
    });
  });

  describe('getMatches', () => {
    it('should query active matches from the database', async () => {
      jest.spyOn(prismaService.match, 'findMany').mockResolvedValue([{ id: 'match_123' } as any]);
      const result = await service.getMatches('user_123');
      expect(result).toEqual([{ id: 'match_123' }]);
      /* eslint-disable-next-line @typescript-eslint/unbound-method */
      expect(prismaService.match.findMany).toHaveBeenCalled();
    });
  });
});
