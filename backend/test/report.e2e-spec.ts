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
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { Role, UserStatus } from '@prisma/client';

describe('Admin & Moderation (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let suspendedToken: string;

  const adminId = 'de305d54-75b4-431b-adb2-eb6b9e546011';
  const userId = 'de305d54-75b4-431b-adb2-eb6b9e546012';
  const reportedId = 'de305d54-75b4-431b-adb2-eb6b9e546013';
  const suspendedId = 'de305d54-75b4-431b-adb2-eb6b9e546014';

  const mockPrismaService = {
    user: {
      findUnique: ({ where }: { where: { id: string } }) => {
        if (where.id === suspendedId) {
          return Promise.resolve({
            id: suspendedId,
            role: Role.USER,
            status: UserStatus.SUSPENDED,
          });
        }
        if (where.id === adminId) {
          return Promise.resolve({
            id: adminId,
            role: Role.ADMIN,
            status: UserStatus.ACTIVE,
          });
        }
        if (where.id === reportedId) {
          return Promise.resolve({
            id: reportedId,
            role: Role.USER,
            status: UserStatus.ACTIVE,
          });
        }
        return Promise.resolve({
          id: where.id,
          role: Role.USER,
          status: UserStatus.ACTIVE,
        });
      },
      update: jest
        .fn()
        .mockResolvedValue({ id: reportedId, status: UserStatus.SUSPENDED }),
    },
    report: {
      create: jest.fn().mockResolvedValue({ id: 'report_123' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job_123' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(getQueueToken('chat_notifications'))
      .useValue(mockQueue)
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

    const jwtService = moduleFixture.get<JwtService>(JwtService);
    adminToken = await jwtService.signAsync(
      { sub: adminId, role: Role.ADMIN },
      {
        secret: 'test_access_secret_long_enough_to_be_secure_32_bytes_min',
        expiresIn: '15m',
      },
    );
    userToken = await jwtService.signAsync(
      { sub: userId, role: Role.USER },
      {
        secret: 'test_access_secret_long_enough_to_be_secure_32_bytes_min',
        expiresIn: '15m',
      },
    );
    suspendedToken = await jwtService.signAsync(
      { sub: suspendedId, role: Role.USER },
      {
        secret: 'test_access_secret_long_enough_to_be_secure_32_bytes_min',
        expiresIn: '15m',
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('UserStatusGuard checks', () => {
    it('should block suspended user from filing a report with 401 Unauthorized', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${suspendedToken}`)
        .send({
          reportedId,
          reason: 'Harassment',
        })
        .expect(401);
    });

    it('should allow active user to file a report', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedId,
          reason: 'Harassment',
        })
        .expect(201);
    });
  });

  describe('RolesGuard checks', () => {
    it('should block normal user from listing reports', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow admin user to list reports', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('User status moderation', () => {
    it('should allow admin to suspend user', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post(`/api/v1/reports/moderate/${reportedId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: UserStatus.SUSPENDED,
        })
        .expect(201);
    });
  });
});
