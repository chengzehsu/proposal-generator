/**
 * Prisma 相關型別定義
 */

import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Prisma 交易客戶端型別
 */
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * 通用查詢選項
 */
export interface QueryOptions {
  skip?: number;
  take?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * 分頁結果
 */
export interface PaginatedResult<T> {
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
 * User 查詢選項型別
 * Note: These types are directly available from @prisma/client, commenting out to avoid errors
 */
// export type UserSelect = Prisma.UserSelect;
// export type UserInclude = Prisma.UserInclude;
// export type UserWhereInput = Prisma.UserWhereInput;
// export type UserCreateInput = Prisma.UserCreateInput;
// export type UserUpdateInput = Prisma.UserUpdateInput;

/**
 * Company 查詢選項型別
 * Note: These types are directly available from @prisma/client, commenting out to avoid errors
 */
// export type CompanySelect = Prisma.CompanySelect;
// export type CompanyInclude = Prisma.CompanyInclude;
// export type CompanyWhereInput = Prisma.CompanyWhereInput;
// export type CompanyCreateInput = Prisma.CompanyCreateInput;
// export type CompanyUpdateInput = Prisma.CompanyUpdateInput;

/**
 * Proposal 查詢選項型別
 * Note: These types are directly available from @prisma/client, commenting out to avoid errors
 */
// export type ProposalSelect = Prisma.ProposalSelect;
// export type ProposalInclude = Prisma.ProposalInclude;
// export type ProposalWhereInput = Prisma.ProposalWhereInput;
// export type ProposalCreateInput = Prisma.ProposalCreateInput;
// export type ProposalUpdateInput = Prisma.ProposalUpdateInput;

/**
 * Template 查詢選項型別
 * Note: Template and Section models don't exist in schema, commented out
 */
// export type TemplateSelect = Prisma.TemplateSelect;
// export type TemplateInclude = Prisma.TemplateInclude;
// export type TemplateWhereInput = Prisma.TemplateWhereInput;
// export type TemplateCreateInput = Prisma.TemplateCreateInput;
// export type TemplateUpdateInput = Prisma.TemplateUpdateInput;

/**
 * Section 查詢選項型別
 * Note: Template and Section models don't exist in schema, commented out
 */
// export type SectionSelect = Prisma.SectionSelect;
// export type SectionInclude = Prisma.SectionInclude;
// export type SectionWhereInput = Prisma.SectionWhereInput;
// export type SectionCreateInput = Prisma.SectionCreateInput;
// export type SectionUpdateInput = Prisma.SectionUpdateInput;

/**
 * TeamMember 查詢選項型別
 * Note: These types are directly available from @prisma/client, commenting out to avoid errors
 */
// export type TeamMemberSelect = Prisma.TeamMemberSelect;
// export type TeamMemberInclude = Prisma.TeamMemberInclude;
// export type TeamMemberWhereInput = Prisma.TeamMemberWhereInput;
// export type TeamMemberCreateInput = Prisma.TeamMemberCreateInput;
// export type TeamMemberUpdateInput = Prisma.TeamMemberUpdateInput;

/**
 * Project 查詢選項型別
 * Note: These types are directly available from @prisma/client, commenting out to avoid errors
 */
// export type ProjectSelect = Prisma.ProjectSelect;
// export type ProjectInclude = Prisma.ProjectInclude;
// export type ProjectWhereInput = Prisma.ProjectWhereInput;
// export type ProjectCreateInput = Prisma.ProjectCreateInput;
// export type ProjectUpdateInput = Prisma.ProjectUpdateInput;

/**
 * Award 查詢選項型別
 * Note: These types are directly available from @prisma/client, commenting out to avoid errors
 */
// export type AwardSelect = Prisma.AwardSelect;
// export type AwardInclude = Prisma.AwardInclude;
// export type AwardWhereInput = Prisma.AwardWhereInput;
// export type AwardCreateInput = Prisma.AwardCreateInput;
// export type AwardUpdateInput = Prisma.AwardUpdateInput;
