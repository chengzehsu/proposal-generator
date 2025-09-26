/**
 * 共用基礎型別定義
 */

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: ValidationError[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export type SortOrder = 'asc' | 'desc';

export interface FilterOptions {
  search?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  status?: string;
}

export interface Attachment {
  filename: string;
  url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}