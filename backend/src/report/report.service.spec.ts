/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('ReportService', () => {
  let service: ReportService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'reported_123' }),
        update: jest.fn().mockResolvedValue({
          id: 'reported_123',
          status: UserStatus.SUSPENDED,
        }),
      },
      report: {
        create: jest.fn().mockResolvedValue({ id: 'report_123' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    it('should throw BadRequestException if reporter tries to report themselves', async () => {
      await expect(
        service.createReport('user_123', {
          reportedId: 'user_123',
          reason: 'Spam',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully file a report ticket', async () => {
      const result = await service.createReport('user_123', {
        reportedId: 'reported_123',
        reason: 'Harassment',
      });
      expect(result).toHaveProperty('id', 'report_123');
      expect(prismaService.report.create).toHaveBeenCalled();
    });
  });

  describe('moderateUser', () => {
    it('should successfully toggle user status to SUSPENDED', async () => {
      const result = await service.moderateUser('admin_123', 'reported_123', {
        status: UserStatus.SUSPENDED,
      });
      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if admin tries to moderate themselves', async () => {
      await expect(
        service.moderateUser('admin_123', 'admin_123', {
          status: UserStatus.SUSPENDED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
