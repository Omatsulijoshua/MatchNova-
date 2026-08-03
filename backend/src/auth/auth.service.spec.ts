import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let otpService: OtpService;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('token_val'),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access_sec';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh_sec';
        if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
        return '';
      }),
    };

    const mockOtpService = {
      generateOtp: jest.fn().mockReturnValue('123456'),
      sendOtp: jest.fn().mockResolvedValue(true),
      verifyOtp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OtpService, useValue: mockOtpService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    otpService = module.get<OtpService>(OtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword';
      const hash = await service.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);
    });

    it('should verify password hash matches', async () => {
      const password = 'testpassword';
      const hash = await service.hashPassword(password);
      const isMatch = await service.comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });
  });

  describe('verifyOtpLogin', () => {
    it('should throw UnauthorizedException if OTP is invalid', async () => {
      jest.spyOn(otpService, 'verifyOtp').mockReturnValue(false);
      await expect(
        service.verifyOtpLogin('+15550199', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens if OTP is valid and user exists', async () => {
      jest.spyOn(otpService, 'verifyOtp').mockReturnValue(true);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        id: 'user_uuid',
        role: 'USER',
        phone: '+15550199',
      } as unknown as User);

      const tokens = await service.verifyOtpLogin('+15550199', '123456');
      expect(tokens).toEqual({
        accessToken: 'token_val',
        refreshToken: 'token_val',
      });
    });

    it('should create a new user if one does not exist', async () => {
      jest.spyOn(otpService, 'verifyOtp').mockReturnValue(true);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'create').mockResolvedValue({
        id: 'new_user_uuid',
        role: 'USER',
        phone: '+15550199',
      } as unknown as User);

      const tokens = await service.verifyOtpLogin('+15550199', '123456');
      /* eslint-disable-next-line @typescript-eslint/unbound-method */
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(tokens).toEqual({
        accessToken: 'token_val',
        refreshToken: 'token_val',
      });
    });
  });
});
