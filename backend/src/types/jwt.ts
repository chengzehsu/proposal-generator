/**
 * JWT 相關型別定義
 */

export type TokenType = 'access' | 'refresh' | 'password_reset' | 'invite';

/**
 * JWT Payload 基礎介面
 */
export interface BaseJwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * Access Token Payload
 */
export interface AccessTokenPayload extends BaseJwtPayload {
  type?: 'access';
  email?: string;
}

/**
 * Refresh Token Payload
 */
export interface RefreshTokenPayload extends BaseJwtPayload {
  type: 'refresh';
}

/**
 * Password Reset Token Payload
 */
export interface PasswordResetTokenPayload extends BaseJwtPayload {
  type: 'password_reset';
  email: string;
}

/**
 * Invite Token Payload
 */
export interface InviteTokenPayload extends BaseJwtPayload {
  type: 'invite';
  email: string;
  name: string;
  role: string;
  companyId: string;
  invitedBy: string;
}

/**
 * 聯合型別：所有 JWT Payload
 */
export type JwtPayload =
  | AccessTokenPayload
  | RefreshTokenPayload
  | PasswordResetTokenPayload
  | InviteTokenPayload;

/**
 * Token 生成選項
 */
export interface TokenGenerationOptions {
  expiresIn?: string | number;
  algorithm?: string;
}

/**
 * Token 驗證結果
 */
export interface TokenVerificationResult<T = JwtPayload> {
  valid: boolean;
  payload?: T;
  error?: string;
}
