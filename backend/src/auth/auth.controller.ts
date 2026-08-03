import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SendOtpDto,
  VerifyOtpDto,
  SocialLoginDto,
  RefreshTokenDto,
  SocialProvider,
} from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.authService.requestOtp(dto.phone);
    return { message: 'Verification OTP sent successfully' };
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtpLogin(dto.phone, dto.code);
  }

  @Post('social')
  @HttpCode(HttpStatus.OK)
  async socialLogin(@Body() dto: SocialLoginDto) {
    if (dto.provider === SocialProvider.GOOGLE) {
      return this.authService.verifyGoogleToken(dto.token);
    } else {
      return this.authService.verifyAppleToken(dto.token);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Request() req: { user: unknown }) {
    return req.user;
  }
}
