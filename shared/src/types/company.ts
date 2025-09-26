/**
 * 公司資料相關型別定義
 */

import { BaseEntity, Attachment } from './common';

export interface Company extends BaseEntity {
  company_name: string;
  tax_id: string;
  capital?: number;
  established_date?: Date;
  address: string;
  phone: string;
  email: string;
  website?: string;
  version: number; // 樂觀鎖版本控制
}

export interface CompanyProfile extends BaseEntity {
  company_id: string;
  version_name: string;
  vision?: string;
  mission?: string;
  core_values?: string;
  business_scope: string;
  description_full: string;
  description_medium?: string;
  description_short?: string;
  is_active: boolean;
}

export interface TeamMember extends BaseEntity {
  company_id: string;
  name: string;
  title: string;
  department?: string;
  education?: string;
  experience?: string;
  expertise?: string;
  photo_url?: string;
  is_key_member: boolean;
  display_order: number;
  is_active: boolean;
}

export interface Project extends BaseEntity {
  company_id: string;
  project_name: string;
  client_name?: string;
  start_date?: Date;
  end_date?: Date;
  amount?: number;
  scale?: string;
  description: string;
  achievements?: string;
  tags: string[];
  is_public: boolean;
  attachments?: Attachment[];
}

export enum AwardType {
  GOVERNMENT_GRANT = 'government_grant',
  COMPETITION = 'competition',
  CERTIFICATION = 'certification',
  RECOGNITION = 'recognition'
}

export interface Award extends BaseEntity {
  company_id: string;
  award_name: string;
  issuer: string;
  award_date?: Date;
  description?: string;
  award_type: AwardType;
  amount?: number;
  certificate_url?: string;
}

export interface Milestone extends BaseEntity {
  company_id: string;
  milestone_date: Date;
  title: string;
  description?: string;
  milestone_type?: string;
  importance: number; // 1-5
}

export interface Capability extends BaseEntity {
  company_id: string;
  tech_name: string;
  category?: string;
  proficiency?: string;
  related_projects?: number[];
  certifications?: string;
}

export interface FuturePlan extends BaseEntity {
  company_id: string;
  title: string;
  content: string;
  timeframe?: string;
  related_fields?: string[];
}

// Create/Update DTOs
export type CompanyCreateRequest = Omit<Company, 'id' | 'created_at' | 'updated_at' | 'version'>;
export type CompanyUpdateRequest = Partial<CompanyCreateRequest> & { version: number };

export type CompanyProfileCreateRequest = Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>;
export type CompanyProfileUpdateRequest = Partial<CompanyProfileCreateRequest>;

export type TeamMemberCreateRequest = Omit<TeamMember, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type TeamMemberUpdateRequest = Partial<TeamMemberCreateRequest>;

export type ProjectCreateRequest = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type ProjectUpdateRequest = Partial<ProjectCreateRequest>;

export type AwardCreateRequest = Omit<Award, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type AwardUpdateRequest = Partial<AwardCreateRequest>;