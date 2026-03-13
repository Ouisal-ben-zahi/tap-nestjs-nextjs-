export type ProfileRole = 'candidat' | 'recruteur';

export interface User {
  id: number;
  email: string;
  role: ProfileRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  role: ProfileRole;
}

export interface SendVerificationDto {
  email: string;
  password: string;
  role: ProfileRole;
}

export interface VerifyAndRegisterDto {
  email: string;
  code: string;
}

export interface RequestPasswordResetDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

export interface RefreshDto {
  refreshToken: string;
}
