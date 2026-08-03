import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g. +15550199)',
  })
  phone!: string;
}

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g. +15550199)',
  })
  phone!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP code must be a 6-digit number' })
  code!: string;
}

export enum SocialProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

export class SocialLoginDto {
  @IsNotEmpty()
  @IsString()
  token!: string;

  @IsNotEmpty()
  @IsEnum(SocialProvider)
  provider!: SocialProvider;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
