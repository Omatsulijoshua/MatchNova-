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

describe('Profile & Media (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let jwtTokenNoProfile: string;

  const mockProfile = {
    userId: 'user_uuid_123',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: new Date('1995-01-01T00:00:00.000Z'),
    gender: 'male',
    sexualOrientation: 'straight',
    photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
    interests: ['climbing'],
    locationLat: 45.1234,
    locationLng: -122.5678,
    locationFuzzyLat: 45.12,
    locationFuzzyLng: -122.57,
  };

  const mockPrismaService = {
    user: {
      findUnique: ({ where }: { where: { id: string } }) => {
        if (where.id === 'user_uuid_123' || where.id === 'user_uuid_999') {
          return Promise.resolve({
            id: where.id,
            role: 'USER',
            status: 'ACTIVE',
          });
        }
        return Promise.resolve(null);
      },
    },
    profile: {
      findUnique: ({ where }: { where: { userId: string } }) => {
        if (where.userId === 'user_uuid_123') {
          return Promise.resolve(mockProfile);
        }
        return Promise.resolve(null);
      },
      create: ({ data }: any) => {
        return Promise.resolve({ ...mockProfile, ...data });
      },
      update: ({ data }: any) => {
        return Promise.resolve({ ...mockProfile, ...data });
      },
    },
    $queryRaw: () => {
      // Mock radius search raw sql results
      return Promise.resolve([
        { ...mockProfile, userId: 'user_uuid_456', distance: 1.2 },
      ]);
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

    // Sign a valid test JWT token
    const jwtService = moduleFixture.get<JwtService>(JwtService);
    jwtToken = await jwtService.signAsync(
      { sub: 'user_uuid_123', role: 'USER' },
      {
        secret: 'test_access_secret_long_enough_to_be_secure_32_bytes_min',
        expiresIn: '15m',
      },
    );
    jwtTokenNoProfile = await jwtService.signAsync(
      { sub: 'user_uuid_999', role: 'USER' },
      {
        secret: 'test_access_secret_long_enough_to_be_secure_32_bytes_min',
        expiresIn: '15m',
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/profiles/me (GET)', () => {
    it('should retrieve the user profile when authenticated', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .get('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('userId', 'user_uuid_123');
          expect(response.body).toHaveProperty('firstName', 'John');
        });
    });

    it('should return 401 when no token is provided', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .get('/api/v1/profiles/me')
        .expect(401);
    });
  });

  describe('/profiles/me (POST)', () => {
    it('should successfully create a new profile', () => {
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

      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtTokenNoProfile}`)
        .send(dto)
        .expect(201);
    });

    it('should fail validation if there are less than 3 photos', () => {
      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1995-01-01T00:00:00.000Z',
        gender: 'male',
        sexualOrientation: 'straight',
        photos: ['photo1.jpg'],
        interests: ['climbing'],
        locationLat: 45.1234,
        locationLng: -122.5678,
      };

      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('/profiles/search (GET)', () => {
    it('should return a list of profiles sorted by distance', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .get('/api/v1/profiles/search?radius=15&ageMin=18&ageMax=35')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          const body = response.body as Record<string, unknown>[];
          expect(body[0]).toHaveProperty('distance');
        });
    });
  });

  describe('/media/upload-url (POST)', () => {
    it('should generate mock signed upload URLs for valid fileType', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/media/upload-url')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ filename: 'test.jpg', fileType: 'image/jpeg' })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('uploadUrl');
          expect(response.body).toHaveProperty('fileUrl');
        });
    });

    it('should fail validation for unsupported fileType', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/media/upload-url')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ filename: 'test.pdf', fileType: 'application/pdf' })
        .expect(400);
    });
  });
});
