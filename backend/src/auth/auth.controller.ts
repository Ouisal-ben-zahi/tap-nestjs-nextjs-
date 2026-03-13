import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  AuthService,
  type RegisterDto,
  type SendVerificationDto,
  type VerifyAndRegisterDto,
  type LoginDto,
  type RequestPasswordResetDto,
  type ResetPasswordDto,
  type RefreshDto,
} from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-verification')
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.authService.sendVerificationEmail(dto);
  }

  @Post('verify-and-register')
  async verifyAndRegister(@Body() dto: VerifyAndRegisterDto) {
    return this.authService.verifyAndRegister(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: { refreshToken: string }) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    const user = req.user as JwtPayload;
    return {
      user: {
        id: user.sub,
        email: user.email,
        role: user.role,
      },
    };
  }
}
