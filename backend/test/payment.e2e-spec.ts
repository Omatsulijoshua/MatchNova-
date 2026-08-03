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
import * as express from 'express';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { SubscriptionTier } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from '../src/payment/payment.service';

describe('Payments & Subscriptions (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

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
    subscription: {
      upsert: jest.fn().mockResolvedValue({ id: 'sub_123' }),
    },
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job_123' }),
  };

  beforeAll(async () => {
    const mockConfigService = {
      get: (key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
        if (key === 'STRIPE_WEBHOOK_SECRET') return null;
        return process.env[key];
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider(getQueueToken('chat_notifications'))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });

    const expressApp = app.getHttpAdapter().getInstance() as {
      use: (middleware: any) => void;
    };
    expressApp.use(
      express.json({
        verify: (req, res, buf: Buffer) => {
          if (req.url && req.url.includes('/webhook')) {
            const reqWithRaw = req as unknown as Record<string, unknown> & {
              rawBody?: Buffer;
            };
            reqWithRaw.rawBody = buf;
          }
        },
      }),
    );
    expressApp.use(express.urlencoded({ extended: true }));

    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    // Mock stripe checkout creation endpoint in E2E
    const paymentService = moduleFixture.get<PaymentService>(PaymentService);
    if (paymentService['stripe']) {
      jest
        .spyOn(paymentService['stripe'].checkout.sessions, 'create')
        .mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/mock_real_session',
        } as any);
    }

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

  describe('/payments/checkout (POST)', () => {
    it('should generate Stripe checkout URL', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          tier: SubscriptionTier.PREMIUM,
          gateway: 'stripe',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('url');
          const body = response.body as Record<string, unknown>;
          expect(String(body.url)).toContain('stripe.com');
        });
    });

    it('should reject checkout request with invalid inputs', () => {
      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          tier: 'INVALID_TIER',
          gateway: 'stripe',
        })
        .expect(400);
    });
  });

  describe('/payments/webhook/:gateway (POST)', () => {
    it('should trigger subscription upsert when stripe webhook notifies transaction success', () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            subscription: 'sub_stripe_123',
            metadata: {
              userId: 'de305d54-75b4-431b-adb2-eb6b9e546014',
              tier: SubscriptionTier.PREMIUM,
            },
          },
        },
      };

      return supertest(app.getHttpServer() as supertest.App)
        .post('/api/v1/payments/webhook/stripe')
        .send(mockEvent)
        .expect(201)
        .then(() => {
          expect(mockPrismaService.subscription.upsert).toHaveBeenCalled();
        });
    });
  });
});
