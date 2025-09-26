import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/database', () => ({
  prisma: {
    template: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    templateSection: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
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

describe('Templates 路由單元測試', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<any>;

  beforeEach(() => {
    mockReq = {
      userId: 'test-user-id',
      user: { company_id: 'test-company-id' } as any,
      body: {},
      params: {},
      query: {},
    };
    
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET / - 獲取標書範本列表', () => {
    it('應該成功返回範本列表', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          template_name: '政府標案範本',
          description: '政府標案專用範本',
          category: '政府標案',
          is_public: false,
          is_default: true,
          created_at: new Date(),
          updated_at: new Date(),
          _count: { sections: 5 },
        },
        {
          id: 'template-2',
          template_name: '企業採購範本',
          description: '企業採購專用範本',
          category: '企業採購',
          is_public: true,
          is_default: false,
          created_at: new Date(),
          updated_at: new Date(),
          _count: { sections: 3 },
        },
      ];

      (prisma.template.findMany as jest.MockedFunction<any>).mockResolvedValue(mockTemplates);

      const handler = jest.fn(async (req, res) => {
        const { category, is_public, is_default, page = '1', limit = '50' } = req.query;

        const where: any = {
          company_id: req.user.company_id
        };

        if (category) where.category = category;
        if (is_public !== undefined) where.is_public = is_public === 'true';
        if (is_default !== undefined) where.is_default = is_default === 'true';

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const templates = await prisma.template.findMany({
          where,
          orderBy: [
            { is_default: 'desc' },
            { created_at: 'desc' }
          ],
          skip,
          take: limitNum,
          select: {
            id: true,
            template_name: true,
            description: true,
            category: true,
            is_public: true,
            is_default: true,
            created_at: true,
            updated_at: true,
            _count: {
              select: {
                sections: true
              }
            }
          }
        });

        res.json(templates);
      });

      await handler(mockReq, mockRes);

      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { company_id: 'test-company-id' },
        orderBy: [
          { is_default: 'desc' },
          { created_at: 'desc' }
        ],
        skip: 0,
        take: 50,
        select: expect.any(Object),
      });

      expect(mockRes.json).toHaveBeenCalledWith(mockTemplates);
    });

    it('應該支援分類篩選', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          template_name: '政府標案範本',
          category: '政府標案',
          _count: { sections: 5 },
        },
      ];

      (prisma.template.findMany as jest.MockedFunction<any>).mockResolvedValue(mockTemplates);

      const handler = jest.fn(async (req, res) => {
        const { category } = req.query;
        const where: any = {
          company_id: req.user.company_id
        };

        if (category) where.category = category;

        await prisma.template.findMany({
          where,
          orderBy: [
            { is_default: 'desc' },
            { created_at: 'desc' }
          ],
          skip: 0,
          take: 50,
          select: expect.any(Object),
        });

        res.json(mockTemplates);
      });

      mockReq.query = { category: '政府標案' };
      await handler(mockReq, mockRes);

      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: {
          company_id: 'test-company-id',
          category: '政府標案',
        },
        orderBy: expect.any(Array),
        skip: 0,
        take: 50,
        select: expect.any(Object),
      });
    });

    it('應該支援分頁參數', async () => {
      (prisma.template.findMany as jest.MockedFunction<any>).mockResolvedValue([]);

      const handler = jest.fn(async (req, res) => {
        const { page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        await prisma.template.findMany({
          where: { company_id: req.user.company_id },
          orderBy: expect.any(Array),
          skip,
          take: limitNum,
          select: expect.any(Object),
        });

        res.json([]);
      });

      mockReq.query = { page: '2', limit: '10' };
      await handler(mockReq, mockRes);

      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { company_id: 'test-company-id' },
        orderBy: expect.any(Array),
        skip: 10, // (2-1) * 10
        take: 10,
        select: expect.any(Object),
      });
    });
  });

  describe('POST / - 新增標書範本', () => {
    const validTemplateData = {
      template_name: '新範本',
      description: '範本描述',
      category: '政府標案' as const,
      is_public: false,
      is_default: true,
    };

    it('應該成功創建新範本', async () => {
      const mockNewTemplate = {
        id: 'new-template-id',
        ...validTemplateData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.template.updateMany as jest.MockedFunction<any>).mockResolvedValue({ count: 0 });
      (prisma.template.create as jest.MockedFunction<any>).mockResolvedValue(mockNewTemplate);

      const handler = jest.fn(async (req, res) => {
        const validatedData = validTemplateData;

        // 如果設為預設範本，先取消其他預設範本
        if (validatedData.is_default) {
          await prisma.template.updateMany({
            where: {
              company_id: req.user.company_id,
              is_default: true
            },
            data: {
              is_default: false
            }
          });
        }

        const newTemplate = await prisma.template.create({
          data: {
            ...validatedData,
            company_id: req.user.company_id
          },
          select: {
            id: true,
            template_name: true,
            description: true,
            category: true,
            is_public: true,
            is_default: true,
            created_at: true,
            updated_at: true
          }
        });

        logger.info('Template created', {
          templateId: newTemplate.id,
          userId: req.userId
        });

        res.status(201).json(newTemplate);
      });

      mockReq.body = validTemplateData;
      await handler(mockReq, mockRes);

      expect(prisma.template.updateMany).toHaveBeenCalledWith({
        where: {
          company_id: 'test-company-id',
          is_default: true
        },
        data: {
          is_default: false
        }
      });

      expect(prisma.template.create).toHaveBeenCalledWith({
        data: {
          ...validTemplateData,
          company_id: 'test-company-id'
        },
        select: expect.any(Object),
      });

      expect(logger.info).toHaveBeenCalledWith('Template created', {
        templateId: 'new-template-id',
        userId: 'test-user-id'
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockNewTemplate);
    });

    it('應該在非預設範本時跳過更新其他範本', async () => {
      const nonDefaultTemplate = { ...validTemplateData, is_default: false };
      const mockTemplate = { id: 'template-id', ...nonDefaultTemplate };

      (prisma.template.create as jest.MockedFunction<any>).mockResolvedValue(mockTemplate);

      const handler = jest.fn(async (req, res) => {
        const validatedData = nonDefaultTemplate;

        if (validatedData.is_default) {
          await prisma.template.updateMany({
            where: {
              company_id: req.user.company_id,
              is_default: true
            },
            data: {
              is_default: false
            }
          });
        }

        await prisma.template.create({
          data: {
            ...validatedData,
            company_id: req.user.company_id
          },
          select: expect.any(Object),
        });

        res.status(201).json(mockTemplate);
      });

      mockReq.body = nonDefaultTemplate;
      await handler(mockReq, mockRes);

      expect(prisma.template.updateMany).not.toHaveBeenCalled();
      expect(prisma.template.create).toHaveBeenCalled();
    });
  });

  describe('GET /:id - 獲取標書範本詳情', () => {
    it('應該成功返回範本詳情', async () => {
      const mockTemplate = {
        id: 'template-id',
        template_name: '詳細範本',
        description: '範本描述',
        category: '政府標案',
        is_public: false,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
        sections: [
          {
            id: 'section-1',
            section_name: '公司介紹',
            section_order: 1,
            is_required: true,
            content_template: '範本內容',
          },
          {
            id: 'section-2',
            section_name: '專案規劃',
            section_order: 2,
            is_required: false,
            content_template: '規劃範本',
          },
        ],
      };

      (prisma.template.findFirst as jest.MockedFunction<any>).mockResolvedValue(mockTemplate);

      const handler = jest.fn(async (req, res) => {
        const templateId = req.params.id;

        const template = await prisma.template.findFirst({
          where: {
            id: templateId,
            company_id: req.user.company_id
          },
          select: {
            id: true,
            template_name: true,
            description: true,
            category: true,
            is_public: true,
            is_default: true,
            created_at: true,
            updated_at: true,
            sections: {
              orderBy: { section_order: 'asc' },
              select: {
                id: true,
                section_name: true,
                section_order: true,
                is_required: true,
                content_template: true
              }
            }
          }
        });

        if (!template) {
          return res.status(404).json({
            error: 'Not Found',
            message: '標書範本不存在',
            statusCode: 404
          });
        }

        res.json(template);
      });

      mockReq.params = { id: 'template-id' };
      await handler(mockReq, mockRes);

      expect(prisma.template.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'template-id',
          company_id: 'test-company-id'
        },
        select: {
          id: true,
          template_name: true,
          description: true,
          category: true,
          is_public: true,
          is_default: true,
          created_at: true,
          updated_at: true,
          sections: {
            orderBy: { section_order: 'asc' },
            select: {
              id: true,
              section_name: true,
              section_order: true,
              is_required: true,
              content_template: true
            }
          }
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith(mockTemplate);
    });

    it('應該在範本不存在時返回 404', async () => {
      (prisma.template.findFirst as jest.MockedFunction<any>).mockResolvedValue(null);

      const handler = jest.fn(async (req, res) => {
        const template = await prisma.template.findFirst({
          where: {
            id: req.params.id,
            company_id: req.user.company_id
          },
          select: expect.any(Object),
        });

        if (!template) {
          return res.status(404).json({
            error: 'Not Found',
            message: '標書範本不存在',
            statusCode: 404
          });
        }

        res.json(template);
      });

      mockReq.params = { id: 'non-existent-id' };
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: '標書範本不存在',
        statusCode: 404
      });
    });
  });

  describe('PUT /:id - 更新標書範本', () => {
    const updateData = {
      template_name: '更新後的範本名稱',
      description: '更新後的描述',
      is_default: true,
    };

    const mockExistingTemplate = {
      id: 'template-id',
      template_name: '原始範本',
      is_default: false,
    };

    it('應該成功更新範本', async () => {
      const mockUpdatedTemplate = {
        id: 'template-id',
        template_name: '更新後的範本名稱',
        description: '更新後的描述',
        category: '政府標案',
        is_public: false,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.template.findFirst as jest.MockedFunction<any>).mockResolvedValue(mockExistingTemplate);
      (prisma.template.updateMany as jest.MockedFunction<any>).mockResolvedValue({ count: 1 });
      (prisma.template.update as jest.MockedFunction<any>).mockResolvedValue(mockUpdatedTemplate);

      const handler = jest.fn(async (req, res) => {
        const templateId = req.params.id;
        const validatedData = updateData;

        const existingTemplate = await prisma.template.findFirst({
          where: {
            id: templateId,
            company_id: req.user.company_id
          }
        });

        if (!existingTemplate) {
          return res.status(404).json({
            error: 'Not Found',
            message: '標書範本不存在',
            statusCode: 404
          });
        }

        // 如果設為預設範本，取消其他預設範本
        if (validatedData.is_default && !existingTemplate.is_default) {
          await prisma.template.updateMany({
            where: {
              company_id: req.user.company_id,
              is_default: true,
              id: { not: templateId }
            },
            data: {
              is_default: false
            }
          });
        }

        const updateDataFiltered = Object.fromEntries(
          Object.entries(validatedData).filter(([_, value]) => value !== undefined)
        );

        const updatedTemplate = await prisma.template.update({
          where: { id: templateId },
          data: updateDataFiltered,
          select: {
            id: true,
            template_name: true,
            description: true,
            category: true,
            is_public: true,
            is_default: true,
            created_at: true,
            updated_at: true
          }
        });

        logger.info('Template updated', {
          templateId: updatedTemplate.id,
          userId: req.userId
        });

        res.json(updatedTemplate);
      });

      mockReq.params = { id: 'template-id' };
      mockReq.body = updateData;
      await handler(mockReq, mockRes);

      expect(prisma.template.updateMany).toHaveBeenCalledWith({
        where: {
          company_id: 'test-company-id',
          is_default: true,
          id: { not: 'template-id' }
        },
        data: {
          is_default: false
        }
      });

      expect(prisma.template.update).toHaveBeenCalledWith({
        where: { id: 'template-id' },
        data: updateData,
        select: expect.any(Object),
      });

      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedTemplate);
    });
  });

  describe('DELETE /:id - 刪除標書範本', () => {
    it('應該成功刪除範本', async () => {
      const mockExistingTemplate = {
        id: 'template-id',
        _count: { proposals: 0 },
      };

      const mockTransaction = jest.fn().mockResolvedValue(undefined);
      
      (prisma.template.findFirst as jest.MockedFunction<any>).mockResolvedValue(mockExistingTemplate);
      (prisma.$transaction as jest.MockedFunction<any>).mockImplementation(mockTransaction);

      const handler = jest.fn(async (req, res) => {
        const templateId = req.params.id;

        const existingTemplate = await prisma.template.findFirst({
          where: {
            id: templateId,
            company_id: req.user.company_id
          },
          include: {
            _count: {
              select: {
                proposals: true
              }
            }
          }
        });

        if (!existingTemplate) {
          return res.status(404).json({
            error: 'Not Found',
            message: '標書範本不存在',
            statusCode: 404
          });
        }

        if (existingTemplate._count.proposals > 0) {
          return res.status(409).json({
            error: 'Conflict',
            message: '此範本正被標書使用中，無法刪除',
            statusCode: 409
          });
        }

        await prisma.$transaction(async (tx) => {
          await tx.templateSection.deleteMany({
            where: { template_id: templateId }
          });
          
          await tx.template.delete({
            where: { id: templateId }
          });
        });

        logger.info('Template deleted', {
          templateId,
          userId: req.userId
        });

        res.status(204).send();
      });

      mockReq.params = { id: 'template-id' };
      await handler(mockReq, mockRes);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Template deleted', {
        templateId: 'template-id',
        userId: 'test-user-id'
      });
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('應該在範本被使用時返回 409', async () => {
      const mockExistingTemplate = {
        id: 'template-id',
        _count: { proposals: 2 }, // 有標書使用此範本
      };

      (prisma.template.findFirst as jest.MockedFunction<any>).mockResolvedValue(mockExistingTemplate);

      const handler = jest.fn(async (req, res) => {
        const existingTemplate = await prisma.template.findFirst({
          where: {
            id: req.params.id,
            company_id: req.user.company_id
          },
          include: {
            _count: {
              select: {
                proposals: true
              }
            }
          }
        });

        if (existingTemplate._count.proposals > 0) {
          return res.status(409).json({
            error: 'Conflict',
            message: '此範本正被標書使用中，無法刪除',
            statusCode: 409
          });
        }
      });

      mockReq.params = { id: 'template-id' };
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Conflict',
        message: '此範本正被標書使用中，無法刪除',
        statusCode: 409
      });
    });
  });

  describe('資料驗證測試', () => {
    it('應該驗證範本名稱長度', () => {
      const createTemplateSchema = z.object({
        template_name: z.string().min(2, '範本名稱至少需要2個字元').max(200, '範本名稱長度不能超過200字元'),
        category: z.enum(['政府標案', '企業採購', '工程建設', '服務提案', '研發專案', '其他']),
      });

      // 有效名稱
      expect(() => createTemplateSchema.parse({
        template_name: '有效範本名稱',
        category: '政府標案'
      })).not.toThrow();

      // 名稱太短
      expect(() => createTemplateSchema.parse({
        template_name: '短',
        category: '政府標案'
      })).toThrow();

      // 名稱太長
      const longName = 'a'.repeat(201);
      expect(() => createTemplateSchema.parse({
        template_name: longName,
        category: '政府標案'
      })).toThrow();
    });

    it('應該驗證範本類別', () => {
      const schema = z.object({
        category: z.enum(['政府標案', '企業採購', '工程建設', '服務提案', '研發專案', '其他']),
      });

      // 有效類別
      expect(() => schema.parse({ category: '政府標案' })).not.toThrow();
      expect(() => schema.parse({ category: '企業採購' })).not.toThrow();
      expect(() => schema.parse({ category: '其他' })).not.toThrow();

      // 無效類別
      expect(() => schema.parse({ category: '無效類別' })).toThrow();
      expect(() => schema.parse({ category: '' })).toThrow();
    });

    it('應該驗證布林值選項', () => {
      const schema = z.object({
        is_public: z.boolean().optional().default(false),
        is_default: z.boolean().optional().default(false),
      });

      // 有效布林值
      expect(() => schema.parse({ is_public: true, is_default: false })).not.toThrow();
      expect(() => schema.parse({})).not.toThrow(); // 使用預設值

      // 無效布林值
      expect(() => schema.parse({ is_public: 'true' })).toThrow();
      expect(() => schema.parse({ is_default: 1 })).toThrow();
    });
  });
});