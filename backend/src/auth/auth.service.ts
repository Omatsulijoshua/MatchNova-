import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

@Injectable()
export class AuthService {
  private googleClient?: OAuth2Client;
  private appleJwksClient?: jwksClient.JwksClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }

    this.appleJwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      rateLimit: true,
    });
  }

  // --- Password Auth ---
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // --- Token Generation ---
  async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>('JWT_ACCESS_SECRET') || 'access_secret',
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRATION') ||
        '15m') as JwtSignOptions['expiresIn'],
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'refresh_secret',
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
        '7d') as JwtSignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  // --- OTP Verification Login ---
  async requestOtp(phone: string): Promise<boolean> {
    const code = this.otpService.generateOtp();
    return this.otpService.sendOtp(phone, code);
  }

  async verifyOtpLogin(phone: string, code: string) {
    const isValid = this.otpService.verifyOtp(phone, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // Check if user exists, otherwise create
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          verified: true, // Phone OTP verifies the identity immediately
        },
      });
    }

    return this.generateTokens(user.id, user.role);
  }

  // --- Google OAuth Verification ---
  async verifyGoogleToken(token: string) {
    if (!this.googleClient) {
      throw new BadRequestException(
        'Google login is not configured on this server.',
      );
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new BadRequestException('Invalid Google token payload');
      }

      let user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: payload.email,
            verified: payload.email_verified || false,
          },
        });
      }

      return this.generateTokens(user.id, user.role);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new UnauthorizedException(`Google login failed: ${message}`);
    }
  }

  // --- Apple OAuth Verification ---
  async verifyAppleToken(token: string) {
    try {
      const decodedToken = jwt.decode(token, { complete: true }) as {
        header: { kid?: string };
      } | null;
      if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
        throw new BadRequestException('Invalid Apple token format');
      }

      const kid = decodedToken.header.kid;
      const key = await this.appleJwksClient?.getSigningKey(kid);
      const publicKey = key?.getPublicKey();

      const appleClientId = this.configService.get<string>('APPLE_CLIENT_ID');
      const payload = jwt.verify(token, publicKey!, {
        audience: appleClientId,
        issuer: 'https://appleid.apple.com',
      }) as { email?: string };

      if (!payload || !payload.email) {
        throw new BadRequestException('Invalid Apple identity payload');
      }

      let user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: payload.email,
            verified: true,
          },
        });
      }

      return this.generateTokens(user.id, user.role);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new UnauthorizedException(`Apple login failed: ${message}`);
    }
  }

  // --- Token Refresh ---
  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || user.status === 'SUSPENDED') {
        throw new UnauthorizedException('User is not active or suspended.');
      }

      return this.generateTokens(user.id, user.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
