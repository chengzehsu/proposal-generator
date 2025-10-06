/**
 * 標書相關型別定義
 */

import { BaseEntity } from './common';

export enum ProposalStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled'
}

export interface Proposal extends BaseEntity {
  proposal_name: string;
  template_id: string;
  company_id: string;
  status: ProposalStatus;
  created_by: string; // User ID
  last_edited_by: string; // User ID
  word_count: number;
  generated_with_ai: boolean;
  ai_generation_prompt?: string;
}

export interface ProposalSection extends BaseEntity {
  proposal_id: string;
  section_id: string; // TemplateSection ID
  content: string; // Rich text content
  word_count: number;
  is_ai_generated: boolean;
  ai_confidence_score?: number; // 0-1
  section_order: number;
}

export interface ProposalHistory extends BaseEntity {
  proposal_id: string;
  version_number: number;
  content: Record<string, any>; // Complete proposal snapshot
  created_by: string; // User ID
}

export interface ProposalSubmission extends BaseEntity {
  proposal_id: string;
  proposal_name: string;
  submission_date?: Date;
  result?: 'pending' | 'won' | 'lost';
  award_amount?: number;
  feedback?: string;
  is_success?: boolean;
  created_project_id?: string; // Link to Project if won
  created_award_id?: string; // Link to Award if received
}

// AI Generation related types
export interface AIGenerationRequest {
  template_id: string;
  section_id: string;
  custom_prompt?: string;
  company_data?: Record<string, any>;
}

export interface AIGenerationResponse {
  content: string;
  word_count: number;
  confidence_score: number;
  source_data: string[];
  generation_time_ms: number;
}

// Export types (re-exported from export.ts)
import type { ExportFormat } from './export';

export interface ExportOptions {
  format: ExportFormat;
  include_toc?: boolean;
  include_page_numbers?: boolean;
  watermark?: string;
  sections?: string[]; // Section IDs to include
}

// Create/Update DTOs
export type ProposalCreateRequest = {
  proposal_name: string;
  template_id: string;
};

export type ProposalGenerateRequest = {
  proposal_name: string;
  template_id: string;
  custom_instructions?: string;
};

export type ProposalUpdateRequest = Partial<Pick<Proposal, 'proposal_name' | 'status'>>;

export type ProposalSectionUpdateRequest = {
  content: string;
};

export type ProposalSubmissionCreateRequest = Omit<ProposalSubmission, 'id' | 'created_at' | 'updated_at' | 'proposal_id'>;
export type ProposalSubmissionUpdateRequest = Partial<ProposalSubmissionCreateRequest>;

// Status Management types
export interface ProposalStatusUpdateRequest {
  status: ProposalStatus;
  note?: string;
}

export interface ProposalStatusHistory {
  id: string;
  proposal_id: string;
  from_status: ProposalStatus | null;
  to_status: ProposalStatus;
  changed_at: Date;
  changed_by: string;
  note?: string;
}

export interface ProposalStatusHistoryResponse {
  proposal_id: string;
  current_status: ProposalStatus;
  history: ProposalStatusHistory[];
}