import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsIn,
  IsOptional,
} from 'class-validator';
import { SubscriptionTier } from '@prisma/client';

export class CreateCheckoutDto {
  @IsNotEmpty()
  @IsEnum(SubscriptionTier)
  tier!: SubscriptionTier;

  @IsNotEmpty()
  @IsString()
  @IsIn(['stripe', 'paystack', 'flutterwave'])
  gateway!: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
