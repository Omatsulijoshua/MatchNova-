/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionTier } from '@prisma/client';
import Stripe from 'stripe';

describe('PaymentService', () => {
  let service: PaymentService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user_123' }),
      },
      subscription: {
        upsert: jest.fn().mockResolvedValue({ id: 'sub_123' }),
      },
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
        if (key === 'STRIPE_WEBHOOK_SECRET') return null; // Bypass signature verification in tests
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock stripe checkout creation endpoint
    if (service['stripe']) {
      jest
        .spyOn(service['stripe'].checkout.sessions, 'create')
        .mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/mock_real_session',
        } as unknown as Stripe.Response<Stripe.Checkout.Session>);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should generate Stripe mock checkout link', async () => {
      const result = await service.createCheckoutSession('user_123', {
        tier: SubscriptionTier.PREMIUM,
        gateway: 'stripe',
      });
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('checkout.stripe.com');
    });

    it('should generate Paystack mock checkout link', async () => {
      const result = await service.createCheckoutSession('user_123', {
        tier: SubscriptionTier.ELITE,
        gateway: 'paystack',
      });
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('paystack.com');
    });
  });

  describe('handleStripeWebhook', () => {
    it('should successfully elevate user subscription on session completion', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            subscription: 'sub_stripe_123',
            metadata: {
              userId: 'user_123',
              tier: SubscriptionTier.PREMIUM,
            },
          },
        },
      };

      const result = await service.handleStripeWebhook(
        Buffer.from(JSON.stringify(mockEvent)),
        'mock_signature',
      );

      expect(result).toEqual({ processed: true });
      expect(prismaService.subscription.upsert).toHaveBeenCalled();
    });
  });
});
