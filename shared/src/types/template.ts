/**
 * 標書範本相關型別定義
 */

import { BaseEntity } from './common';

export enum TemplateType {
  GOVERNMENT_GRANT = 'government_grant',
  ENTERPRISE_BID = 'enterprise_bid', 
  AWARD_APPLICATION = 'award_application',
  CUSTOM = 'custom'
}

export enum DataSourceType {
  COMPANY_BASIC = 'company_basic',
  COMPANY_PROFILE = 'company_profile',
  TEAM_MEMBERS = 'team_members',
  PROJECTS = 'projects',
  AWARDS = 'awards',
  CAPABILITIES = 'capabilities',
  MILESTONES = 'milestones',
  FUTURE_PLANS = 'future_plans',
  CUSTOM_INPUT = 'custom_input'
}

export interface ProposalTemplate extends BaseEntity {
  template_name: string;
  template_type: TemplateType;
  description?: string;
  is_system_template: boolean;
  created_by?: string; // User ID
}

export interface TemplateSection extends BaseEntity {
  template_id: string;
  section_name: string;
  section_order: number;
  is_required: boolean;
  min_words?: number;
  max_words?: number;
  content_hint?: string;
  data_types: DataSourceType[];
  score_weight?: number; // 0-100
}

export interface FormatSpec extends BaseEntity {
  template_id: string;
  page_size?: string;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  font_family?: string;
  font_size?: number;
  line_height?: number;
  max_pages?: number;
  other_requirements?: Record<string, any>;
}

export interface AttachmentRequirement extends BaseEntity {
  template_id: string;
  attachment_name: string;
  description?: string;
  is_required: boolean;
  file_format?: string;
}

// Create/Update DTOs
export type ProposalTemplateCreateRequest = Omit<ProposalTemplate, 'id' | 'created_at' | 'updated_at' | 'is_system_template' | 'created_by'>;
export type ProposalTemplateUpdateRequest = Partial<ProposalTemplateCreateRequest>;

export type TemplateSectionCreateRequest = Omit<TemplateSection, 'id' | 'created_at' | 'updated_at'>;
export type TemplateSectionUpdateRequest = Partial<TemplateSectionCreateRequest>;

export type FormatSpecCreateRequest = Omit<FormatSpec, 'id' | 'created_at' | 'updated_at'>;
export type FormatSpecUpdateRequest = Partial<FormatSpecCreateRequest>;

export type AttachmentRequirementCreateRequest = Omit<AttachmentRequirement, 'id' | 'created_at' | 'updated_at'>;
export type AttachmentRequirementUpdateRequest = Partial<AttachmentRequirementCreateRequest>;