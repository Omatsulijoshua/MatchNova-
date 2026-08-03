import { Test, TestingModule } from '@nestjs/testing';
import { QdrantService } from './qdrant.service';
import { ConfigService } from '@nestjs/config';

describe('QdrantService', () => {
  let service: QdrantService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'QDRANT_URL') return ''; // trigger mock mode
        return '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QdrantService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<QdrantService>(QdrantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInterestsVector', () => {
    it('should generate a 1536-dimensional unit vector', () => {
      const vector = service.generateInterestsVector(['coffee', 'reading']);
      expect(vector.length).toBe(1536);

      // Verify magnitude is approx 1.0
      let sumSq = 0;
      for (const val of vector) {
        sumSq += val * val;
      }
      const magnitude = Math.sqrt(sumSq);
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should handle empty interests array', () => {
      const vector = service.generateInterestsVector([]);
      expect(vector.length).toBe(1536);
      expect(vector[0]).toBe(1.0);
    });
  });

  describe('upsertProfileVector', () => {
    it('should execute successfully in mock mode', async () => {
      await expect(
        service.upsertProfileVector('user_123', ['coffee']),
      ).resolves.not.toThrow();
    });
  });
});
