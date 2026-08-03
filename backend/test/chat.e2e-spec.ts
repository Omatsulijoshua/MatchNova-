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

describe('Chat History (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  const mockMatch = {
    id: 'match_uuid_123',
    user1Id: 'de305d54-75b4-431b-adb2-eb6b9e546014',
    user2Id: 'de305d54-75b4-431b-adb2-eb6b9e546015',
    status: 'ACTIVE',
  };

  const mockMessage = {
    id: 'message_uuid_999',
    matchId: 'match_uuid_123',
    senderId: 'de305d54-75b4-431b-adb2-eb6b9e546014',
    content: 'Hello World',
    createdAt: new Date(),
    readAt: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: ({ where }: { where: { id: string } }) => {
        return Promise.resolve({
          id: where.id,
          role: 'USER',
          status: 'ACTIVE',
        });
      },
    },
    match: {
      findUnique: ({ where }: { where: { id: string } }) => {
        if (where.id === 'match_uuid_123') {
          return Promise.resolve(mockMatch);
        }
        return Promise.resolve(null);
      },
    },
    message: {
      findMany: ({ where }: { where: { matchId: string } }) => {
        if (where.matchId === 'match_uuid_123') {
          return Promise.resolve([mockMessage]);
        }
        return Promise.resolve([]);
      },
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
    jwtToken = await jwtService.signAsync(
      { sub: 'de305d54-75b4-431b-adb2-eb6b9e546014', role: 'USER' },
      {
        secret: 'test_access_secret_long_enough_to_be_secure_32_bytes_min',
        expiresIn: '15m',
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/chat/history/:matchId (GET)', () => {
    it('should retrieve conversation history for matching participant', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .get('/api/v1/chat/history/match_uuid_123')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          const body = response.body as Record<string, unknown>[];
          expect(body[0]).toHaveProperty('content', 'Hello World');
        });
    });

    it('should reject history request if user is not participant in the match', async () => {
      const jwtTokenStranger = await app.get(JwtService).signAsync(
        { sub: 'de305d54-75b4-431b-adb2-eb6b9e546099', role: 'USER' },
        {
          secret: 'test_access_secret_long_enough_to_be_secure_32_bytes_min',
          expiresIn: '15m',
        },
      );

      return supertest(app.getHttpServer() as supertest.App)
        .get('/api/v1/chat/history/match_uuid_123')
        .set('Authorization', `Bearer ${jwtTokenStranger}`)
        .expect(400);
    });

    it('should return 404 if match conversation does not exist', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .get('/api/v1/chat/history/match_uuid_not_exists')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });
  });
});
