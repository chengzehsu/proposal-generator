/**
 * API 相關型別定義
 */

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface APIConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version?: string;
  database?: 'connected' | 'disconnected';
  ai_service?: 'available' | 'unavailable';
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retry_after?: number; // Seconds to wait
}

// Audit log
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update', 
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  GENERATE = 'generate'
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_by: string; // User ID
  changed_at: Date;
  ip_address?: string;
  user_agent?: string;
}