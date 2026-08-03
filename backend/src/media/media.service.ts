import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3Client?: S3Client;
  private bucketName?: string;

  constructor(private readonly configService: ConfigService) {
    const bucketName = this.configService.get<string>('S3_BUCKET_NAME');
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );
    const endpoint = this.configService.get<string>('S3_ENDPOINT');

    if (bucketName && accessKeyId && secretAccessKey) {
      this.bucketName = bucketName;
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint: endpoint || undefined,
        forcePathStyle: endpoint ? true : false, // Required for LocalStack / R2
      });
      this.logger.log('S3 Storage Client initialized successfully.');
    } else {
      this.logger.warn(
        'S3 credentials not found. MediaService running in MOCK mode.',
      );
    }
  }

  async getPresignedUploadUrl(
    userId: string,
    filename: string,
    fileType: string,
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    // Basic file extension checking
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
      );
    }

    const uniqueKey = `profiles/${userId}/${Date.now()}-${filename}`;

    if (this.s3Client && this.bucketName) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: uniqueKey,
          ContentType: fileType,
        });

        // Generate signed URL with 15-minute expiration (900 seconds)
        const uploadUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: 900,
        });

        // Construct the public asset file URL
        const endpoint = this.configService.get<string>('S3_ENDPOINT');
        const fileUrl = endpoint
          ? `${endpoint}/${this.bucketName}/${uniqueKey}`
          : `https://${this.bucketName}.s3.${this.configService.get<string>('S3_REGION')}.amazonaws.com/${uniqueKey}`;

        return { uploadUrl, fileUrl };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to generate S3 presigned URL: ${message}`);
        throw new BadRequestException(
          `Failed to generate upload URL: ${message}`,
        );
      }
    }

    // Mock response for testing/local development
    const mockUploadUrl = `https://mock-s3-upload-gateway.com/upload/${uniqueKey}?signature=mock_sig_12345`;
    const mockFileUrl = `https://mock-s3-cdn.com/${uniqueKey}`;
    this.logger.log(`[MOCK S3] Generated upload url for key: ${uniqueKey}`);

    return { uploadUrl: mockUploadUrl, fileUrl: mockFileUrl };
  }
}
