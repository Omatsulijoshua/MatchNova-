import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'S3_BUCKET_NAME') return 'test-bucket';
        if (key === 'S3_REGION') return 'us-east-1';
        if (key === 'S3_ACCESS_KEY_ID') return 'key_id';
        if (key === 'S3_SECRET_ACCESS_KEY') return 'secret';
        return '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPresignedUploadUrl', () => {
    it('should generate an upload URL and file URL for valid types', async () => {
      const result = await service.getPresignedUploadUrl(
        'user_123',
        'avatar.png',
        'image/png',
      );
      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('fileUrl');
      expect(result.fileUrl).toContain('profiles/user_123/');
    });

    it('should throw BadRequestException for disallowed file types', async () => {
      await expect(
        service.getPresignedUploadUrl('user_123', 'doc.pdf', 'application/pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
