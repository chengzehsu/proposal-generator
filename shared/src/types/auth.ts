/**
 * 認證相關型別定義
 */

import { BaseEntity } from './common';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin', 
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  company_id?: string;
  is_active: boolean;
  last_login?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_at: Date;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  company_name?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  company_id?: string;
  iat: number;
  exp: number;
}