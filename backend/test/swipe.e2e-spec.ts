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
import { SwipeType as PrismaSwipeType } from '@prisma/client';
import { SwipeType } from '../src/swipe/dto/swipe.dto';

describe('Swipe & Recommendations (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  const mockProfile = {
    userId: 'de305d54-75b4-431b-adb2-eb6b9e546014',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: new Date('1995-01-01T00:00:00.000Z'),
    gender: 'male',
    sexualOrientation: 'straight',
    photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
    interests: ['climbing', 'coffee'],
    locationLat: 45.1234,
    locationLng: -122.5678,
    locationFuzzyLat: 45.12,
    locationFuzzyLng: -122.57,
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
    profile: {
      findUnique: ({ where }: { where: { userId: string } }) => {
        if (where.userId === 'de305d54-75b4-431b-adb2-eb6b9e546014') {
          return Promise.resolve(mockProfile);
        }
        return Promise.resolve(null);
      },
      findMany: () => {
        return Promise.resolve([
          {
            ...mockProfile,
            userId: 'de305d54-75b4-431b-adb2-eb6b9e546015',
            firstName: 'Jane',
            interests: ['coffee'],
          },
        ]);
      },
    },
    swipe: {
      count: () => Promise.resolve(0),
      upsert: ({
        create,
      }: {
        create: { senderId: string; receiverId: string; type: PrismaSwipeType };
      }) => Promise.resolve({ id: 'swipe_123', ...create }),
      findFirst: ({
        where,
      }: {
        where: { senderId?: string; receiverId?: string };
      }) => {
        // Return a reciprocal swipe if target user swipes back
        if (
          where.senderId === 'de305d54-75b4-431b-adb2-eb6b9e546015' &&
          where.receiverId === 'de305d54-75b4-431b-adb2-eb6b9e546014'
        ) {
          return Promise.resolve({
            id: 'swipe_recip',
            senderId: 'de305d54-75b4-431b-adb2-eb6b9e546015',
            receiverId: 'de305d54-75b4-431b-adb2-eb6b9e546014',
            type: PrismaSwipeType.LIKE,
          });
        }
        return Promise.resolve(null);
      },
      findMany: () => Promise.resolve([]),
    },
    match: {
      upsert: ({ create }: { create: { user1Id: string; user2Id: string } }) =>
        Promise.resolve({ id: 'match_999', ...create }),
    },
    subscription: {
      findFirst: () => Promise.resolve(null),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
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

  describe('/swipes (POST)', () => {
    it('should successfully record swipe and detect match if reciprocal swipe exists', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/swipes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          targetUserId: 'de305d54-75b4-431b-adb2-eb6b9e546015',
          type: SwipeType.LIKE,
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('matched', true);
          expect(response.body).toHaveProperty('matchId', 'match_999');
        });
    });

    it('should fail swipe validation with invalid targetUserId format', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/swipes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ targetUserId: 'invalid-id', type: SwipeType.LIKE })
        .expect(400);
    });

    it('should fail swipe validation with invalid type value', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/swipes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          targetUserId: 'de305d54-75b4-431b-adb2-eb6b9e546015',
          type: 'LOVE',
        })
        .expect(400);
    });
  });

  describe('/swipes/recommendations (GET)', () => {
    it('should return recommendation deck ranked by matchScore percentage', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .get('/api/v1/swipes/recommendations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          const body = response.body as Record<string, unknown>[];
          expect(body[0]).toHaveProperty('matchScore');
          expect(typeof body[0].matchScore).toBe('number');
        });
    });
  });
});
