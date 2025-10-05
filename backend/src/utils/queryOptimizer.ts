import { prisma } from './database';
import { logger } from './logger';
import { Request } from 'express';
import { trackDatabaseQuery } from '../middleware/performance';

// 優化的分頁查詢類型
interface PaginationOptions {
  page: number;
  limit: number;
  cursor?: string; // 游標分頁
  orderBy?: Record<string, 'asc' | 'desc'>;
}

interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

// 優化的分頁查詢函數
export async function optimizedPagination<T>(
  model: any,
  options: PaginationOptions,
  where: any = {},
  select?: any,
  include?: any,
  req?: Request
): Promise<PaginationResult<T>> {
  const startTime = performance.now();
  const queryName = `optimizedPagination-${model.name || 'unknown'}`;

  try {
    const { page, limit, cursor, orderBy } = options;

    // 優先使用游標分頁（適合大數據集）
    if (cursor && orderBy) {
      const cursorField = Object.keys(orderBy)[0];
      if (!cursorField) {
        throw new Error('Invalid orderBy field');
      }
      const cursorDirection = orderBy[cursorField];

      const cursorWhere = {
        ...where,
        [cursorField]: cursorDirection === 'asc'
          ? { gt: cursor }
          : { lt: cursor }
      };

      const data = await model.findMany({
        where: cursorWhere,
        orderBy,
        take: limit + 1, // 多取一個來判斷是否有下一頁
        select,
        include
      });

      const hasNext = data.length > limit;
      if (hasNext) data.pop(); // 移除多取的那一個

      const nextCursor = hasNext && data.length > 0
        ? (data[data.length - 1] as any)[cursorField]
        : undefined;

      if (req) trackDatabaseQuery(queryName, startTime, req);

      return {
        data,
        pagination: {
          page,
          limit,
          total: -1, // 游標分頁不需要總數
          totalPages: -1,
          hasNext,
          hasPrev: !!cursor,
          nextCursor,
          prevCursor: cursor
        }
      };
    }

    // 傳統分頁（適合小數據集）
    const skip = (page - 1) * limit;
    
    // 並行執行查詢和計數
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy: orderBy || { created_at: 'desc' },
        skip,
        take: limit,
        select,
        include
      }),
      model.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    if (req) trackDatabaseQuery(queryName, startTime, req);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

  } catch (error) {
    if (req) trackDatabaseQuery(queryName, startTime, req);
    logger.error('Optimized pagination error', { error, queryName });
    throw error;
  }
}

// 批量查詢優化
export async function batchFindByIds<T>(
  model: any,
  ids: string[],
  select?: any,
  include?: any,
  req?: Request
): Promise<T[]> {
  const startTime = performance.now();
  const queryName = `batchFindByIds-${model.name || 'unknown'}`;

  try {
    if (ids.length === 0) return [];

    // 批量查詢而不是循環查詢
    const results = await model.findMany({
      where: {
        id: { in: ids }
      },
      select,
      include
    });

    if (req) trackDatabaseQuery(queryName, startTime, req);
    return results;

  } catch (error) {
    if (req) trackDatabaseQuery(queryName, startTime, req);
    logger.error('Batch find by IDs error', { error, queryName, idsCount: ids.length });
    throw error;
  }
}

// 條件查詢構建器
export class QueryBuilder {
  private where: any = {};
  private orderBy: any = {};
  private selectFields?: any;
  private includeRelations?: any;

  constructor(private model: any) {}

  // 添加過濾條件
  filter(field: string, operator: string, value: any): QueryBuilder {
    if (value === undefined || value === null) return this;

    switch (operator) {
      case 'equals':
        this.where[field] = value;
        break;
      case 'contains':
        this.where[field] = { contains: value, mode: 'insensitive' };
        break;
      case 'in':
        if (Array.isArray(value) && value.length > 0) {
          this.where[field] = { in: value };
        }
        break;
      case 'gte':
        this.where[field] = { ...this.where[field], gte: value };
        break;
      case 'lte':
        this.where[field] = { ...this.where[field], lte: value };
        break;
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          this.where[field] = { gte: value[0], lte: value[1] };
        }
        break;
    }
    return this;
  }

  // 添加排序
  sort(field: string, direction: 'asc' | 'desc' = 'desc'): QueryBuilder {
    this.orderBy[field] = direction;
    return this;
  }

  // 選擇字段
  select(fields: any): QueryBuilder {
    this.selectFields = fields;
    return this;
  }

  // 包含關聯
  include(relations: any): QueryBuilder {
    this.includeRelations = relations;
    return this;
  }

  // 執行查詢
  async execute(options?: PaginationOptions, req?: Request): Promise<any> {
    if (options) {
      return optimizedPagination(
        this.model,
        { ...options, orderBy: this.orderBy },
        this.where,
        this.selectFields,
        this.includeRelations,
        req
      );
    }

    const startTime = performance.now();
    const queryName = `queryBuilder-${this.model.name || 'unknown'}`;

    try {
      const result = await this.model.findMany({
        where: this.where,
        orderBy: this.orderBy,
        select: this.selectFields,
        include: this.includeRelations
      });

      if (req) trackDatabaseQuery(queryName, startTime, req);
      return result;

    } catch (error) {
      if (req) trackDatabaseQuery(queryName, startTime, req);
      logger.error('Query builder execution error', { error, queryName });
      throw error;
    }
  }
}

// 常用查詢優化函數
export const optimizedQueries = {
  // 獲取用戶的公司信息（含快取）
  async getUserCompanyWithCache(userId: string, req?: Request) {
    const startTime = performance.now();
    const queryName = 'getUserCompanyWithCache';

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          company_id: true,
          company: {
            select: {
              id: true,
              company_name: true,
              version: true
            }
          }
        }
      });

      if (req) trackDatabaseQuery(queryName, startTime, req);
      return user;

    } catch (error) {
      if (req) trackDatabaseQuery(queryName, startTime, req);
      logger.error('Get user company error', { error, userId });
      throw error;
    }
  },

  // 獲取提案列表（優化版）
  async getProposalsOptimized(companyId: string, filters: any = {}, options: PaginationOptions, req?: Request) {
    const builder = new QueryBuilder(prisma.proposal)
      .filter('company_id', 'equals', companyId)
      .sort('deadline', 'asc')
      .sort('created_at', 'desc')
      .select({
        id: true,
        proposal_title: true,
        client_name: true,
        deadline: true,
        estimated_amount: true,
        status: true,
        version: true,
        created_at: true,
        updated_at: true,
        template: {
          select: {
            id: true,
            template_name: true,
            category: true
          }
        }
      });

    // 應用過濾器
    if (filters.status) builder.filter('status', 'equals', filters.status);
    if (filters.client_name) builder.filter('client_name', 'contains', filters.client_name);
    if (filters.deadline_from || filters.deadline_to) {
      const dateRange = [filters.deadline_from, filters.deadline_to].filter(Boolean);
      if (dateRange.length === 2) {
        builder.filter('deadline', 'between', dateRange.map(d => new Date(d)));
      } else if (filters.deadline_from) {
        builder.filter('deadline', 'gte', new Date(filters.deadline_from));
      } else if (filters.deadline_to) {
        builder.filter('deadline', 'lte', new Date(filters.deadline_to));
      }
    }

    return builder.execute(options, req);
  },

  // 獲取專案列表（優化版）
  async getProjectsOptimized(companyId: string, filters: any = {}, options: PaginationOptions, req?: Request) {
    const builder = new QueryBuilder(prisma.project)
      .filter('company_id', 'equals', companyId)
      .sort('created_at', 'desc')
      .select({
        id: true,
        project_name: true,
        client_name: true,
        start_date: true,
        end_date: true,
        amount: true,
        scale: true,
        description: true,
        achievements: true,
        tags: true,
        is_public: true,
        attachments: true,
        created_at: true,
        updated_at: true
      });

    // 應用過濾器
    if (filters.is_public !== undefined) {
      builder.filter('is_public', 'equals', filters.is_public === 'true');
    }
    if (filters.start_date_from || filters.start_date_to) {
      const dateRange = [filters.start_date_from, filters.start_date_to].filter(Boolean);
      if (dateRange.length === 2) {
        builder.filter('start_date', 'between', dateRange.map(d => new Date(d)));
      } else if (filters.start_date_from) {
        builder.filter('start_date', 'gte', new Date(filters.start_date_from));
      } else if (filters.start_date_to) {
        builder.filter('start_date', 'lte', new Date(filters.start_date_to));
      }
    }

    return builder.execute(options, req);
  }
};

// 資料庫健康檢查
export async function performDatabaseHealthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  metrics: any;
}> {
  const startTime = performance.now();
  
  try {
    // 執行簡單查詢測試連接
    await prisma.$queryRaw`SELECT 1`;
    
    // 獲取資料庫統計信息（SQLite 特定）
    const tableStats = await prisma.$queryRaw`
      SELECT name, 
        (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as table_exists
      FROM sqlite_master m WHERE type='table'
    `;

    const queryTime = performance.now() - startTime;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (queryTime > 1000) status = 'warning';
    if (queryTime > 5000) status = 'critical';

    return {
      status,
      metrics: {
        connectionTime: Math.round(queryTime * 100) / 100,
        tableCount: Array.isArray(tableStats) ? tableStats.length : 0,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      status: 'critical',
      metrics: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
}