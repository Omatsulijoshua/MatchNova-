import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateCheckoutDto } from './dto/payment.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  async createCheckout(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateCheckoutDto,
  ) {
    return await this.paymentService.createCheckoutSession(req.user.id, dto);
  }

  @Post('webhook/:gateway')
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Request() req: ExpressRequest & { rawBody?: Buffer },
    @Headers('stripe-signature') stripeSignature?: string,
  ) {
    if (gateway === 'stripe') {
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new BadRequestException('Stripe webhook raw body is missing.');
      }
      return await this.paymentService.handleStripeWebhook(
        rawBody,
        stripeSignature || '',
      );
    }

    if (gateway === 'paystack') {
      const body = req.body as Record<string, unknown>;
      return await this.paymentService.handlePaystackWebhook(body);
    }

    if (gateway === 'flutterwave') {
      const body = req.body as Record<string, unknown>;
      return await this.paymentService.handleFlutterwaveWebhook(body);
    }

    throw new BadRequestException('Invalid webhook gateway target.');
  }
}
