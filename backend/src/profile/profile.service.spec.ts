import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Profile } from '@prisma/client';

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      profile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const mockQdrantService = {
      upsertProfileVector: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QdrantService, useValue: mockQdrantService },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProfile', () => {
    it('should throw BadRequestException if profile already exists', async () => {
      jest
        .spyOn(prismaService.profile, 'findUnique')
        .mockResolvedValue({ id: 'prof_123' } as unknown as Profile);
      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1995-01-01T00:00:00.000Z',
        gender: 'male',
        sexualOrientation: 'straight',
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
        interests: ['climbing'],
        locationLat: 45.1234,
        locationLng: -122.5678,
      };

      await expect(service.createProfile('user_123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create and mask fuzzy coordinates', async () => {
      jest.spyOn(prismaService.profile, 'findUnique').mockResolvedValue(null);
      jest
        .spyOn(prismaService.profile, 'create')
        .mockImplementation(({ data }: any) =>
          Promise.resolve(data as unknown as Profile),
        );

      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1995-01-01T00:00:00.000Z',
        gender: 'male',
        sexualOrientation: 'straight',
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
        interests: ['climbing'],
        locationLat: 45.1234,
        locationLng: -122.5678,
      };

      const result = await service.createProfile('user_123', dto);
      expect(result.locationLat).toEqual(45.1234);
      expect(result.locationFuzzyLat).toEqual(45.12); // rounded
      expect(result.locationFuzzyLng).toEqual(-122.57); // rounded
    });
  });

  describe('getProfile', () => {
    it('should throw NotFoundException if profile does not exist', async () => {
      jest.spyOn(prismaService.profile, 'findUnique').mockResolvedValue(null);
      await expect(service.getProfile('user_123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
