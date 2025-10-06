/**
 * API 相關型別定義
 */

import { Request as ExpressRequest } from 'express';

/**
 * 統一的 API 回應格式
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

/**
 * API 錯誤格式
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * 分頁請求參數
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分頁回應格式
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Express Request 泛型擴展
 * P = Params, ResBody = Response Body, ReqBody = Request Body, ReqQuery = Query
 */
export interface TypedRequest<
  ReqBody = unknown,
  ReqQuery = unknown,
  Params = unknown
> extends ExpressRequest {
  body: ReqBody;
  query: ReqQuery & { [key: string]: string | undefined };
  params: Params & { [key: string]: string };
}

/**
 * Auth API 請求型別
 */
export interface RegisterRequestBody {
  email: string;
  password: string;
  name: string;
  company: {
    company_name: string;
    tax_id: string;
    address: string;
    phone: string;
    email: string;
    capital?: number;
    established_date?: string;
    website?: string;
  };
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RefreshTokenRequestBody {
  refresh_token: string;
}

export interface ForgotPasswordRequestBody {
  email: string;
}

export interface ResetPasswordRequestBody {
  token: string;
  new_password: string;
  confirm_password: string;
}

export interface InviteUserRequestBody {
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR';
}

export interface AcceptInviteRequestBody {
  token: string;
  password: string;
  confirm_password: string;
}

/**
 * Company API 請求型別
 */
export interface CreateCompanyRequestBody {
  company_name: string;
  tax_id: string;
  address: string;
  phone: string;
  email: string;
  capital?: number;
  established_date?: string;
  website?: string;
  employees_count?: number;
  industry?: string;
  description?: string;
}

export interface UpdateCompanyRequestBody {
  company_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  capital?: number;
  established_date?: string;
  website?: string;
  employees_count?: number;
  industry?: string;
  description?: string;
}

/**
 * Proposal API 請求型別
 */
export interface CreateProposalRequestBody {
  title: string;
  template_id?: string;
  tender_number?: string;
  deadline?: string;
}

export interface UpdateProposalRequestBody {
  title?: string;
  status?: 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  content?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Template API 請求型別
 */
export interface CreateTemplateRequestBody {
  name: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}

export interface UpdateTemplateRequestBody {
  name?: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}

/**
 * Section API 請求型別
 */
export interface CreateSectionRequestBody {
  template_id?: string;
  proposal_id?: string;
  title: string;
  content?: string;
  order: number;
}

export interface UpdateSectionRequestBody {
  title?: string;
  content?: string;
  order?: number;
}

/**
 * TeamMember API 請求型別
 */
export interface CreateTeamMemberRequestBody {
  company_info_id: string;
  name: string;
  position: string;
  department?: string;
  email?: string;
  phone?: string;
  experience_years?: number;
  education?: string;
  specialties?: string[];
}

export interface UpdateTeamMemberRequestBody {
  name?: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  experience_years?: number;
  education?: string;
  specialties?: string[];
}

/**
 * Project API 請求型別
 */
export interface CreateProjectRequestBody {
  company_info_id: string;
  project_name: string;
  client: string;
  start_date: string;
  end_date?: string;
  budget?: number;
  description?: string;
  technologies?: string[];
  team_size?: number;
  achievements?: string;
}

export interface UpdateProjectRequestBody {
  project_name?: string;
  client?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  description?: string;
  technologies?: string[];
  team_size?: number;
  achievements?: string;
}

/**
 * Award API 請求型別
 */
export interface CreateAwardRequestBody {
  company_info_id: string;
  award_name: string;
  issuer: string;
  awarded_date: string;
  description?: string;
  category?: string;
}

export interface UpdateAwardRequestBody {
  award_name?: string;
  issuer?: string;
  awarded_date?: string;
  description?: string;
  category?: string;
}
