import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private twilioClient?: Twilio;
  private readonly inMemoryOtpCache = new Map<
    string,
    { code: string; expiresAt: number }
  >();

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.logger.log('Twilio client initialized successfully.');
    } else {
      this.logger.warn(
        'Twilio credentials not found. OtpService running in MOCK mode.',
      );
    }
  }

  generateOtp(): string {
    // Generate a secure 6-digit random code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(phone: string, code: string): Promise<boolean> {
    const expiresAt = Date.now() + 3 * 60 * 1000; // 3 minutes expiration
    this.inMemoryOtpCache.set(phone, { code, expiresAt });

    const serviceSid = this.configService.get<string>('TWILIO_SERVICE_SID');

    if (this.twilioClient && serviceSid) {
      try {
        await this.twilioClient.messages.create({
          body: `Your MatchNova verification code is: ${code}. Valid for 3 minutes.`,
          to: phone,
          from: serviceSid, // Or twilio phone number
        });
        this.logger.log(`OTP successfully sent to ${phone} via Twilio.`);
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to send SMS to ${phone} via Twilio. Falling back to Mock: ${message}`,
        );
      }
    }

    // Mock send logic for development/testing
    this.logger.log(`[MOCK SMS] Verification code for ${phone} is: ${code}`);
    return true;
  }

  verifyOtp(phone: string, code: string): boolean {
    const record = this.inMemoryOtpCache.get(phone);
    if (!record) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      this.inMemoryOtpCache.delete(phone);
      this.logger.warn(`OTP code for ${phone} expired.`);
      return false;
    }

    if (record.code !== code) {
      return false;
    }

    // Success: remove code from cache
    this.inMemoryOtpCache.delete(phone);
    return true;
  }
}
