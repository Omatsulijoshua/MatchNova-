/* eslint-disable @typescript-eslint/no-unsafe-argument */
// Set up mock environment variables before imports compile
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/matchnova?schema=public';
process.env.JWT_ACCESS_SECRET =
  'test_access_secret_long_enough_to_be_secure_32_bytes_min';
process.env.JWT_REFRESH_SECRET =
  'test_refresh_secret_long_enough_to_be_secure_32_bytes_min';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { OtpService } from '../src/auth/otp.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  const mockOtpService = {
    generateOtp: () => '123456',
    sendOtp: () => Promise.resolve(true),
    verifyOtp: (phone: string, code: string) => {
      return phone === '+15550199' && code === '123456';
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: ({ where }: { where: { phone?: string } }) => {
        if (where.phone === '+15550199') {
          return Promise.resolve({
            id: 'user_uuid_123',
            phone: '+15550199',
            role: 'USER',
            status: 'ACTIVE',
          });
        }
        return Promise.resolve(null);
      },
      create: ({ data }: { data: { phone: string } }) => {
        return Promise.resolve({
          id: 'new_user_uuid',
          phone: data.phone,
          role: 'USER',
          status: 'ACTIVE',
        });
      },
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OtpService)
      .useValue(mockOtpService)
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/otp/send (POST)', () => {
    it('should successfully request an OTP SMS', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/auth/otp/send')
        .send({ phone: '+15550199' })
        .expect(200)
        .expect({ message: 'Verification OTP sent successfully' });
    });

    it('should fail validation if phone number is not E.164 formatted', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/auth/otp/send')
        .send({ phone: '15550199' })
        .expect(400);
    });
  });

  describe('/auth/otp/verify (POST)', () => {
    it('should login and return tokens on valid OTP', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/auth/otp/verify')
        .send({ phone: '+15550199', code: '123456' })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail validation with invalid code length', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/auth/otp/verify')
        .send({ phone: '+15550199', code: '1234' })
        .expect(400);
    });

    it('should return 401 on incorrect OTP code', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/auth/otp/verify')
        .send({ phone: '+15550199', code: '999999' })
        .expect(401);
    });
  });
});
