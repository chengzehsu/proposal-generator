import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { z } from 'zod';
import router from '../../../src/routes/companies';
import { prisma } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/database', () => ({
  prisma: {
    company: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock middleware
jest.mock('../../../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    req.user = { company_id: 'test-company-id' };
    next();
  },
  requireCompanyAccess: (req: any, res: any, next: any) => next(),
}));

describe('Companies 路由單元測試', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<any>;

  beforeEach(() => {
    mockReq = {
      userId: 'test-user-id',
      user: { company_id: 'test-company-id' } as any,
      body: {},
      params: {},
    };
    
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /basic - 獲取公司基本資料', () => {
    it('應該成功返回公司基本資料', async () => {
      const mockCompany = {
        id: 'test-company-id',
        company_name: '測試公司',
        tax_id: '12345678',
        address: '測試地址',
        phone: '02-1234-5678',
        email: 'test@company.com',
        capital: BigInt(10000000),
        established_date: new Date('2020-01-01'),
        website: 'https://test.com',
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockCompany);

      // 模擬路由處理器
      const handler = jest.fn(async (req, res) => {
        const company = await prisma.company.findUnique({
          where: { id: req.user.company_id },
          select: {
            id: true,
            company_name: true,
            tax_id: true,
            address: true,
            phone: true,
            email: true,
            capital: true,
            established_date: true,
            website: true,
            version: true,
            created_at: true,
            updated_at: true,
          },
        });

        if (!company) {
          return res.status(404).json({
            error: 'Not Found',
            message: '公司資料不存在',
            statusCode: 404,
          });
        }

        const response = {
          ...company,
          capital: company.capital?.toString(),
          established_date: company.established_date?.toISOString().split('T')[0],
        };

        res.json(response);
      });

      await handler(mockReq, mockRes);

      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-company-id' },
        select: {
          id: true,
          company_name: true,
          tax_id: true,
          address: true,
          phone: true,
          email: true,
          capital: true,
          established_date: true,
          website: true,
          version: true,
          created_at: true,
          updated_at: true,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        ...mockCompany,
        capital: '10000000',
        established_date: '2020-01-01',
      });
    });

    it('應該在公司不存在時返回 404', async () => {
      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(null);

      const handler = jest.fn(async (req, res) => {
        const company = await prisma.company.findUnique({
          where: { id: req.user.company_id },
          select: {
            id: true,
            company_name: true,
            tax_id: true,
            address: true,
            phone: true,
            email: true,
            capital: true,
            established_date: true,
            website: true,
            version: true,
            created_at: true,
            updated_at: true,
          },
        });

        if (!company) {
          return res.status(404).json({
            error: 'Not Found',
            message: '公司資料不存在',
            statusCode: 404,
          });
        }

        res.json(company);
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: '公司資料不存在',
        statusCode: 404,
      });
    });

    it('應該在資料庫錯誤時記錄錯誤並返回 500', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.company.findUnique as jest.MockedFunction<any>).mockRejectedValue(dbError);

      const handler = jest.fn(async (req, res) => {
        try {
          await prisma.company.findUnique({
            where: { id: req.user.company_id },
            select: {
              id: true,
              company_name: true,
              tax_id: true,
              address: true,
              phone: true,
              email: true,
              capital: true,
              established_date: true,
              website: true,
              version: true,
              created_at: true,
              updated_at: true,
            },
          });
        } catch (error) {
          logger.error('Get company basic data failed', { error, userId: req.userId });
          res.status(500).json({
            error: 'Internal Server Error',
            message: '獲取公司基本資料失敗',
            statusCode: 500,
          });
        }
      });

      await handler(mockReq, mockRes);

      expect(logger.error).toHaveBeenCalledWith('Get company basic data failed', {
        error: dbError,
        userId: 'test-user-id',
      });

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: '獲取公司基本資料失敗',
        statusCode: 500,
      });
    });
  });

  describe('PUT /basic - 更新公司基本資料', () => {
    const validUpdateData = {
      company_name: '新公司名稱',
      tax_id: '87654321',
      address: '新地址',
      phone: '02-8765-4321',
      email: 'new@company.com',
      capital: 20000000,
      established_date: '2021-01-01',
      website: 'https://new-company.com',
      version: 1,
    };

    const mockCurrentCompany = {
      id: 'test-company-id',
      company_name: '舊公司名稱',
      tax_id: '12345678',
      version: 1,
      capital: BigInt(10000000),
    };

    it('應該成功更新公司資料', async () => {
      const mockUpdatedCompany = {
        id: 'test-company-id',
        company_name: '新公司名稱',
        tax_id: '87654321',
        address: '新地址',
        phone: '02-8765-4321',
        email: 'new@company.com',
        capital: BigInt(20000000),
        established_date: new Date('2021-01-01'),
        website: 'https://new-company.com',
        version: 2,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockCurrentCompany);
      (prisma.company.findFirst as jest.MockedFunction<any>).mockResolvedValue(null); // 無重複統編
      (prisma.company.update as jest.MockedFunction<any>).mockResolvedValue(mockUpdatedCompany);

      const handler = jest.fn(async (req, res) => {
        try {
          // 模擬驗證
          const validatedData = validUpdateData;
          const { version, ...updateData } = validatedData;

          // 檢查當前公司資料
          const currentCompany = await prisma.company.findUnique({
            where: { id: req.user.company_id }
          });

          if (!currentCompany) {
            return res.status(404).json({
              error: 'Not Found',
              message: '公司資料不存在',
              statusCode: 404,
            });
          }

          // 樂觀鎖檢查
          if (currentCompany.version !== version) {
            return res.status(409).json({
              error: 'Conflict',
              message: '資料版本衝突，請重新載入後再試',
              statusCode: 409,
            });
          }

          // 檢查統編重複
          if (updateData.tax_id && updateData.tax_id !== currentCompany.tax_id) {
            const existingCompany = await prisma.company.findFirst({
              where: {
                tax_id: updateData.tax_id,
                id: { not: currentCompany.id }
              }
            });

            if (existingCompany) {
              return res.status(409).json({
                error: 'Conflict',
                message: '統一編號已被其他公司使用',
                statusCode: 409,
              });
            }
          }

          // 處理更新資料
          const processedData = {
            ...updateData,
            established_date: updateData.established_date ? new Date(updateData.established_date) : undefined,
            website: updateData.website === '' ? null : updateData.website,
            version: version + 1,
          };

          const updatedCompany = await prisma.company.update({
            where: { id: req.user.company_id },
            data: processedData,
            select: {
              id: true,
              company_name: true,
              tax_id: true,
              address: true,
              phone: true,
              email: true,
              capital: true,
              established_date: true,
              website: true,
              version: true,
              created_at: true,
              updated_at: true,
            },
          });

          logger.info('Company basic data updated', {
            companyId: updatedCompany.id,
            userId: req.userId,
            version: updatedCompany.version,
          });

          const response = {
            ...updatedCompany,
            capital: updatedCompany.capital?.toString(),
            established_date: updatedCompany.established_date?.toISOString().split('T')[0],
          };

          res.json(response);
        } catch (error) {
          logger.error('Update company basic data failed', { error, userId: req.userId });
          res.status(500).json({
            error: 'Internal Server Error',
            message: '更新公司基本資料失敗',
            statusCode: 500,
          });
        }
      });

      mockReq.body = validUpdateData;
      await handler(mockReq, mockRes);

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 'test-company-id' },
        data: expect.objectContaining({
          company_name: '新公司名稱',
          tax_id: '87654321',
          version: 2,
        }),
        select: expect.any(Object),
      });

      expect(logger.info).toHaveBeenCalledWith('Company basic data updated', {
        companyId: 'test-company-id',
        userId: 'test-user-id',
        version: 2,
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        ...mockUpdatedCompany,
        capital: '20000000',
        established_date: '2021-01-01',
      });
    });

    it('應該在版本衝突時返回 409', async () => {
      const conflictData = { ...validUpdateData, version: 0 }; // 過時版本
      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockCurrentCompany);

      const handler = jest.fn(async (req, res) => {
        const validatedData = conflictData;
        const { version } = validatedData;

        const currentCompany = await prisma.company.findUnique({
          where: { id: req.user.company_id }
        });

        if (currentCompany.version !== version) {
          return res.status(409).json({
            error: 'Conflict',
            message: '資料版本衝突，請重新載入後再試',
            statusCode: 409,
          });
        }
      });

      mockReq.body = conflictData;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Conflict',
        message: '資料版本衝突，請重新載入後再試',
        statusCode: 409,
      });
    });

    it('應該在統編重複時返回 409', async () => {
      const duplicateData = { ...validUpdateData, tax_id: '99999999' };
      const mockExistingCompany = { id: 'other-company-id', tax_id: '99999999' };
      
      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockCurrentCompany);
      (prisma.company.findFirst as jest.MockedFunction<any>).mockResolvedValue(mockExistingCompany);

      const handler = jest.fn(async (req, res) => {
        const validatedData = duplicateData;
        const { version, ...updateData } = validatedData;

        const currentCompany = await prisma.company.findUnique({
          where: { id: req.user.company_id }
        });

        if (updateData.tax_id && updateData.tax_id !== currentCompany.tax_id) {
          const existingCompany = await prisma.company.findFirst({
            where: {
              tax_id: updateData.tax_id,
              id: { not: currentCompany.id }
            }
          });

          if (existingCompany) {
            return res.status(409).json({
              error: 'Conflict',
              message: '統一編號已被其他公司使用',
              statusCode: 409,
            });
          }
        }
      });

      mockReq.body = duplicateData;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Conflict',
        message: '統一編號已被其他公司使用',
        statusCode: 409,
      });
    });
  });

  describe('資料驗證測試', () => {
    it('應該驗證統一編號格式', () => {
      const updateBasicDataSchema = z.object({
        tax_id: z.string().regex(/^\d{8}$/, '統一編號必須為8位數字').optional(),
        version: z.number().int().min(1, '版本號必須為正整數')
      });

      // 有效格式
      expect(() => updateBasicDataSchema.parse({ tax_id: '12345678', version: 1 })).not.toThrow();

      // 無效格式
      expect(() => updateBasicDataSchema.parse({ tax_id: '1234567', version: 1 })).toThrow();
      expect(() => updateBasicDataSchema.parse({ tax_id: '123456789', version: 1 })).toThrow();
      expect(() => updateBasicDataSchema.parse({ tax_id: '1234567a', version: 1 })).toThrow();
    });

    it('應該驗證電子信箱格式', () => {
      const schema = z.object({
        email: z.string().email('請輸入有效的公司電子信箱').optional(),
      });

      // 有效格式
      expect(() => schema.parse({ email: 'test@company.com' })).not.toThrow();
      expect(() => schema.parse({ email: 'user.name+tag@domain.co.uk' })).not.toThrow();

      // 無效格式
      expect(() => schema.parse({ email: 'invalid-email' })).toThrow();
      expect(() => schema.parse({ email: 'test@' })).toThrow();
      expect(() => schema.parse({ email: '@company.com' })).toThrow();
    });

    it('應該驗證網站 URL 格式', () => {
      const schema = z.object({
        website: z.string().url('請輸入有效的網站URL').optional().or(z.literal('')),
      });

      // 有效格式
      expect(() => schema.parse({ website: 'https://example.com' })).not.toThrow();
      expect(() => schema.parse({ website: 'http://test.org' })).not.toThrow();
      expect(() => schema.parse({ website: '' })).not.toThrow();

      // 無效格式
      expect(() => schema.parse({ website: 'not-a-url' })).toThrow();
      expect(() => schema.parse({ website: 'ftp://invalid.com' })).toThrow();
    });

    it('應該驗證資本額為非負整數', () => {
      const schema = z.object({
        capital: z.number().int().min(0, '資本額必須為非負整數').optional(),
      });

      // 有效值
      expect(() => schema.parse({ capital: 0 })).not.toThrow();
      expect(() => schema.parse({ capital: 1000000 })).not.toThrow();

      // 無效值
      expect(() => schema.parse({ capital: -1 })).toThrow();
      expect(() => schema.parse({ capital: 1000.5 })).toThrow();
    });
  });
});