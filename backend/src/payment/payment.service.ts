import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/payment.dto';
import { SubscriptionTier } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe | null = null;
  private stripeWebhookSecret: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripeWebhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || null;

    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2025-01-27' as Stripe.StripeConfig['apiVersion'],
      });
    } else {
      this.logger.warn(
        'Stripe API Key is not set. Operating in Stripe Mock Mode.',
      );
    }
  }

  private getTierPrice(tier: SubscriptionTier): {
    amount: number;
    name: string;
  } {
    if (tier === SubscriptionTier.PREMIUM) {
      return { amount: 999, name: 'MatchNova Premium Subscription' }; // $9.99 in cents
    }
    return { amount: 1999, name: 'MatchNova Elite Subscription' }; // $19.99 in cents
  }

  async createCheckoutSession(userId: string, dto: CreateCheckoutDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const priceInfo = this.getTierPrice(dto.tier);
    const currency = (dto.currency || 'usd').toLowerCase();

    if (dto.gateway === 'stripe') {
      if (this.stripe) {
        try {
          const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency,
                  product_data: {
                    name: priceInfo.name,
                  },
                  unit_amount: priceInfo.amount,
                  recurring: {
                    interval: 'month',
                  },
                },
                quantity: 1,
              },
            ],
            mode: 'subscription',
            success_url:
              'https://matchnova.com/payment/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://matchnova.com/payment/cancel',
            metadata: {
              userId,
              tier: dto.tier,
            },
          });
          return { url: session.url };
        } catch (err: unknown) {
          throw new BadRequestException(
            `Stripe session creation failed: ${String(err)}`,
          );
        }
      } else {
        // Stripe Mock Mode fallback
        const mockSessionId = `mock_stripe_${Math.random().toString(36).substring(7)}`;
        return {
          url: `https://checkout.stripe.com/pay/${mockSessionId}`,
          mock: true,
        };
      }
    }

    if (dto.gateway === 'paystack') {
      // Paystack Mock/REST fallback
      const mockAccessCode = `mock_paystack_${Math.random().toString(36).substring(7)}`;
      return {
        url: `https://checkout.paystack.com/${mockAccessCode}`,
        mock: true,
      };
    }

    if (dto.gateway === 'flutterwave') {
      // Flutterwave Mock/REST fallback
      const mockTxRef = `mock_flw_${Math.random().toString(36).substring(7)}`;
      return {
        url: `https://checkout.flutterwave.com/pay/${mockTxRef}`,
        mock: true,
      };
    }

    throw new BadRequestException('Unsupported checkout gateway.');
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not initialized.');
    }

    let event: Stripe.Event;

    try {
      if (this.stripeWebhookSecret && signature) {
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          this.stripeWebhookSecret,
        );
      } else {
        // Fallback for mock environments/testing without verification
        const rawString = rawBody.toString('utf8');
        const parsed = JSON.parse(rawString) as Record<string, unknown>;
        event = parsed as unknown as Stripe.Event;
      }
    } catch (err: unknown) {
      this.logger.error(`Webhook signature check failed: ${String(err)}`);
      throw new BadRequestException('Invalid webhook signature.');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await this.activateSubscription(
        session.metadata?.userId || null,
        session.metadata?.tier as SubscriptionTier | undefined,
        session.subscription as string | null,
      );
    }

    return { processed: true };
  }

  async handlePaystackWebhook(body: Record<string, unknown>) {
    // Process Paystack charge events
    if (body.event === 'charge.success') {
      const data = body.data as Record<string, unknown> | undefined;
      const metadata = data?.metadata as Record<string, unknown> | undefined;
      const userId = metadata?.userId as string | undefined;
      const tier = metadata?.tier as SubscriptionTier | undefined;
      const transactionId = data?.reference as string | undefined;

      await this.activateSubscription(
        userId || null,
        tier,
        transactionId || null,
        'paystack',
      );
    }
    return { processed: true };
  }

  async handleFlutterwaveWebhook(body: Record<string, unknown>) {
    // Process Flutterwave payment completed events
    if (body.event === 'charge.completed') {
      const data = body.data as Record<string, unknown> | undefined;
      if (data?.status === 'successful') {
        const meta = data.meta as Record<string, unknown> | undefined;
        const userId = meta?.userId as string | undefined;
        const tier = meta?.tier as SubscriptionTier | undefined;
        const transactionId =
          typeof data.id === 'string' || typeof data.id === 'number'
            ? String(data.id)
            : '';

        await this.activateSubscription(
          userId || null,
          tier,
          transactionId,
          'flutterwave',
        );
      }
    }
    return { processed: true };
  }

  private async activateSubscription(
    userId: string | null,
    tier: SubscriptionTier | undefined,
    gatewayId: string | null,
    gateway: 'stripe' | 'paystack' | 'flutterwave' = 'stripe',
  ) {
    if (!userId || !tier) {
      this.logger.warn(
        'Skipping subscription activation: missing userId or tier in metadata.',
      );
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days duration

    await this.prisma.subscription.upsert({
      where:
        gateway === 'stripe' && gatewayId
          ? { stripeId: gatewayId }
          : { id: `sub_${userId}` }, // Use composite fallback for custom gateway types
      update: {
        tier,
        status: 'active',
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId,
        tier,
        status: 'active',
        expiresAt,
        stripeId: gateway === 'stripe' ? gatewayId : null,
        paystackId: gateway === 'paystack' ? gatewayId : null,
        flutterwaveId: gateway === 'flutterwave' ? gatewayId : null,
      },
    });

    this.logger.log(
      `Subscription activated successfully: userId=${userId}, tier=${tier}`,
    );
  }
}
