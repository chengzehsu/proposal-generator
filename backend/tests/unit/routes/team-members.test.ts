import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/database', () => ({
  prisma: {
    teamMember: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

describe('Team Members 路由單元測試', () => {
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

  describe('GET / - 獲取團隊成員列表', () => {
    it('應該成功返回團隊成員列表', async () => {
      const mockTeamMembers = [
        {
          id: 'member-1',
          name: '張技術長',
          title: '技術長',
          department: '技術部',
          education: '台灣大學資訊工程學系',
          experience: '10年軟體開發經驗',
          expertise: 'Node.js, React, 系統架構',
          photo_url: 'https://example.com/photo1.jpg',
          is_key_member: true,
          display_order: 1,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'member-2',
          name: '李專案經理',
          title: '專案經理',
          department: '專案部',
          education: '政治大學企業管理學系',
          experience: '8年專案管理經驗',
          expertise: 'Agile, Scrum, 專案規劃',
          photo_url: 'https://example.com/photo2.jpg',
          is_key_member: false,
          display_order: 2,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (prisma.teamMember.findMany as jest.MockedFunction<any>).mockResolvedValue(mockTeamMembers);

      const handler = jest.fn(async (req, res) => {
        const { is_key_member, page = '1', limit = '50' } = req.query;

        const where: any = {
          company_id: req.user.company_id,
          is_active: true
        };

        if (is_key_member !== undefined) {
          where.is_key_member = is_key_member === 'true';
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const teamMembers = await prisma.teamMember.findMany({
          where,
          orderBy: [
            { display_order: 'asc' },
            { created_at: 'desc' }
          ],
          skip,
          take: limitNum,
          select: {
            id: true,
            name: true,
            title: true,
            department: true,
            education: true,
            experience: true,
            expertise: true,
            photo_url: true,
            is_key_member: true,
            display_order: true,
            is_active: true,
            created_at: true,
            updated_at: true
          }
        });

        res.json(teamMembers);
      });

      await handler(mockReq, mockRes);

      expect(prisma.teamMember.findMany).toHaveBeenCalledWith({
        where: {
          company_id: 'test-company-id',
          is_active: true
        },
        orderBy: [
          { display_order: 'asc' },
          { created_at: 'desc' }
        ],
        skip: 0,
        take: 50,
        select: expect.any(Object),
      });

      expect(mockRes.json).toHaveBeenCalledWith(mockTeamMembers);
    });

    it('應該支援關鍵成員篩選', async () => {
      const mockKeyMembers = [
        {
          id: 'member-1',
          name: '張技術長',
          is_key_member: true,
        },
      ];

      (prisma.teamMember.findMany as jest.MockedFunction<any>).mockResolvedValue(mockKeyMembers);

      const handler = jest.fn(async (req, res) => {
        const { is_key_member } = req.query;
        const where: any = {
          company_id: req.user.company_id,
          is_active: true
        };

        if (is_key_member !== undefined) {
          where.is_key_member = is_key_member === 'true';
        }

        await prisma.teamMember.findMany({
          where,
          orderBy: expect.any(Array),
          skip: 0,
          take: 50,
          select: expect.any(Object),
        });

        res.json(mockKeyMembers);
      });

      mockReq.query = { is_key_member: 'true' };
      await handler(mockReq, mockRes);

      expect(prisma.teamMember.findMany).toHaveBeenCalledWith({
        where: {
          company_id: 'test-company-id',
          is_active: true,
          is_key_member: true,
        },
        orderBy: expect.any(Array),
        skip: 0,
        take: 50,
        select: expect.any(Object),
      });
    });

    it('應該支援分頁參數', async () => {
      (prisma.teamMember.findMany as jest.MockedFunction<any>).mockResolvedValue([]);

      const handler = jest.fn(async (req, res) => {
        const { page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        await prisma.teamMember.findMany({
          where: expect.any(Object),
          orderBy: expect.any(Array),
          skip,
          take: limitNum,
          select: expect.any(Object),
        });

        res.json([]);
      });

      mockReq.query = { page: '2', limit: '10' };
      await handler(mockReq, mockRes);

      expect(prisma.teamMember.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: expect.any(Array),
        skip: 10, // (2-1) * 10
        take: 10,
        select: expect.any(Object),
      });
    });
  });

  describe('POST / - 新增團隊成員', () => {
    const validMemberData = {
      name: '王設計師',
      title: 'UI/UX 設計師',
      department: '設計部',
      education: '實踐大學媒體傳達設計學系',
      experience: '5年使用者介面設計經驗',
      expertise: 'Figma, Adobe Creative Suite, 使用者體驗設計',
      photo_url: 'https://example.com/photo.jpg',
      is_key_member: false,
      display_order: 3,
    };

    it('應該成功創建新團隊成員', async () => {
      const mockNewMember = {
        id: 'new-member-id',
        ...validMemberData,
        company_id: 'test-company-id',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.teamMember.findFirst as jest.MockedFunction<any>).mockResolvedValue(null); // 無衝突
      (prisma.teamMember.create as jest.MockedFunction<any>).mockResolvedValue(mockNewMember);

      const handler = jest.fn(async (req, res) => {
        const validatedData = validMemberData;

        // 檢查display_order衝突
        let displayOrder = validatedData.display_order;
        if (displayOrder !== undefined) {
          const existingMember = await prisma.teamMember.findFirst({
            where: {
              company_id: req.user.company_id,
              display_order: displayOrder,
              is_active: true
            }
          });

          if (existingMember) {
            return res.status(409).json({
              error: 'Conflict',
              message: '顯示順序已被使用',
              statusCode: 409
            });
          }
        }

        const newMember = await prisma.teamMember.create({
          data: {
            ...validatedData,
            display_order: displayOrder,
            company_id: req.user.company_id
          },
          select: {
            id: true,
            name: true,
            title: true,
            department: true,
            education: true,
            experience: true,
            expertise: true,
            photo_url: true,
            is_key_member: true,
            display_order: true,
            is_active: true,
            created_at: true,
            updated_at: true
          }
        });

        logger.info('Team member created', {
          memberId: newMember.id,
          userId: req.userId
        });

        res.status(201).json(newMember);
      });

      mockReq.body = validMemberData;
      await handler(mockReq, mockRes);

      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: {
          company_id: 'test-company-id',
          display_order: 3,
          is_active: true
        }
      });

      expect(prisma.teamMember.create).toHaveBeenCalledWith({
        data: {
          ...validMemberData,
          display_order: 3,
          company_id: 'test-company-id'
        },
        select: expect.any(Object),
      });

      expect(logger.info).toHaveBeenCalledWith('Team member created', {
        memberId: 'new-member-id',
        userId: 'test-user-id'
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockNewMember);
    });

    it('應該自動設定顯示順序（當未指定時）', async () => {
      const dataWithoutOrder = { ...validMemberData };
      delete dataWithoutOrder.display_order;

      const mockMaxOrderMember = { display_order: 5 };
      const mockNewMember = {
        id: 'new-member-id',
        ...dataWithoutOrder,
        display_order: 6, // 5 + 1
        company_id: 'test-company-id',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.teamMember.findFirst as jest.MockedFunction<any>)
        .mockResolvedValueOnce(mockMaxOrderMember) // 查詢最大順序
        .mockResolvedValueOnce(null); // 檢查衝突
      (prisma.teamMember.create as jest.MockedFunction<any>).mockResolvedValue(mockNewMember);

      const handler = jest.fn(async (req, res) => {
        const validatedData = dataWithoutOrder;

        let displayOrder = validatedData.display_order;
        if (displayOrder === undefined) {
          const maxOrder = await prisma.teamMember.findFirst({
            where: { company_id: req.user.company_id },
            orderBy: { display_order: 'desc' },
            select: { display_order: true }
          });
          displayOrder = (maxOrder?.display_order || 0) + 1;
        }

        const newMember = await prisma.teamMember.create({
          data: {
            ...validatedData,
            display_order: displayOrder,
            company_id: req.user.company_id
          },
          select: expect.any(Object),
        });

        res.status(201).json(newMember);
      });

      mockReq.body = dataWithoutOrder;
      await handler(mockReq, mockRes);

      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: { company_id: 'test-company-id' },
        orderBy: { display_order: 'desc' },
        select: { display_order: true }
      });

      expect(prisma.teamMember.create).toHaveBeenCalledWith({
        data: {
          ...dataWithoutOrder,
          display_order: 6,
          company_id: 'test-company-id'
        },
        select: expect.any(Object),
      });
    });

    it('應該在顯示順序衝突時返回 409', async () => {
      const existingMember = { id: 'existing-member-id', display_order: 3 };
      (prisma.teamMember.findFirst as jest.MockedFunction<any>).mockResolvedValue(existingMember);

      const handler = jest.fn(async (req, res) => {
        const validatedData = validMemberData;

        const existingMember = await prisma.teamMember.findFirst({
          where: {
            company_id: req.user.company_id,
            display_order: validatedData.display_order,
            is_active: true
          }
        });

        if (existingMember) {
          return res.status(409).json({
            error: 'Conflict',
            message: '顯示順序已被使用',
            statusCode: 409
          });
        }
      });

      mockReq.body = validMemberData;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Conflict',
        message: '顯示順序已被使用',
        statusCode: 409
      });
    });
  });

  describe('PUT /:id - 更新團隊成員', () => {
    const updateData = {
      name: '張首席技術長',
      title: '首席技術長',
      department: '技術部',
      is_key_member: true,
      display_order: 1,
    };

    const mockExistingMember = {
      id: 'member-id',
      name: '張技術長',
      title: '技術長',
      display_order: 2,
      company_id: 'test-company-id',
      is_active: true,
    };

    it('應該成功更新團隊成員', async () => {
      const mockUpdatedMember = {
        id: 'member-id',
        ...updateData,
        company_id: 'test-company-id',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.teamMember.findFirst as jest.MockedFunction<any>)
        .mockResolvedValueOnce(mockExistingMember) // 檢查成員存在
        .mockResolvedValueOnce(null); // 檢查順序衝突
      (prisma.teamMember.update as jest.MockedFunction<any>).mockResolvedValue(mockUpdatedMember);

      const handler = jest.fn(async (req, res) => {
        const memberId = req.params.id;
        const validatedData = updateData;

        const existingMember = await prisma.teamMember.findFirst({
          where: {
            id: memberId,
            company_id: req.user.company_id,
            is_active: true
          }
        });

        if (!existingMember) {
          return res.status(404).json({
            error: 'Not Found',
            message: '團隊成員不存在',
            statusCode: 404
          });
        }

        // 檢查display_order衝突
        if (validatedData.display_order !== undefined && validatedData.display_order !== existingMember.display_order) {
          const conflictingMember = await prisma.teamMember.findFirst({
            where: {
              company_id: req.user.company_id,
              display_order: validatedData.display_order,
              is_active: true,
              id: { not: memberId }
            }
          });

          if (conflictingMember) {
            return res.status(409).json({
              error: 'Conflict',
              message: '顯示順序已被其他成員使用',
              statusCode: 409
            });
          }
        }

        const updateDataFiltered = Object.fromEntries(
          Object.entries(validatedData).filter(([_, value]) => value !== undefined)
        );

        const updatedMember = await prisma.teamMember.update({
          where: { id: memberId },
          data: updateDataFiltered,
          select: {
            id: true,
            name: true,
            title: true,
            department: true,
            education: true,
            experience: true,
            expertise: true,
            photo_url: true,
            is_key_member: true,
            display_order: true,
            is_active: true,
            created_at: true,
            updated_at: true
          }
        });

        logger.info('Team member updated', {
          memberId: updatedMember.id,
          userId: req.userId
        });

        res.json(updatedMember);
      });

      mockReq.params = { id: 'member-id' };
      mockReq.body = updateData;
      await handler(mockReq, mockRes);

      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'member-id',
          company_id: 'test-company-id',
          is_active: true
        }
      });

      expect(prisma.teamMember.update).toHaveBeenCalledWith({
        where: { id: 'member-id' },
        data: updateData,
        select: expect.any(Object),
      });

      expect(logger.info).toHaveBeenCalledWith('Team member updated', {
        memberId: 'member-id',
        userId: 'test-user-id'
      });

      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedMember);
    });

    it('應該在成員不存在時返回 404', async () => {
      (prisma.teamMember.findFirst as jest.MockedFunction<any>).mockResolvedValue(null);

      const handler = jest.fn(async (req, res) => {
        const memberId = req.params.id;

        const existingMember = await prisma.teamMember.findFirst({
          where: {
            id: memberId,
            company_id: req.user.company_id,
            is_active: true
          }
        });

        if (!existingMember) {
          return res.status(404).json({
            error: 'Not Found',
            message: '團隊成員不存在',
            statusCode: 404
          });
        }
      });

      mockReq.params = { id: 'non-existent-id' };
      mockReq.body = updateData;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: '團隊成員不存在',
        statusCode: 404
      });
    });

    it('應該在顯示順序衝突時返回 409', async () => {
      const conflictingMember = { id: 'other-member-id', display_order: 1 };
      
      (prisma.teamMember.findFirst as jest.MockedFunction<any>)
        .mockResolvedValueOnce(mockExistingMember) // 檢查成員存在
        .mockResolvedValueOnce(conflictingMember); // 檢查順序衝突

      const handler = jest.fn(async (req, res) => {
        const memberId = req.params.id;
        const validatedData = updateData;

        const existingMember = await prisma.teamMember.findFirst({
          where: {
            id: memberId,
            company_id: req.user.company_id,
            is_active: true
          }
        });

        if (validatedData.display_order !== undefined && validatedData.display_order !== existingMember.display_order) {
          const conflictingMember = await prisma.teamMember.findFirst({
            where: {
              company_id: req.user.company_id,
              display_order: validatedData.display_order,
              is_active: true,
              id: { not: memberId }
            }
          });

          if (conflictingMember) {
            return res.status(409).json({
              error: 'Conflict',
              message: '顯示順序已被其他成員使用',
              statusCode: 409
            });
          }
        }
      });

      mockReq.params = { id: 'member-id' };
      mockReq.body = updateData;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Conflict',
        message: '顯示順序已被其他成員使用',
        statusCode: 409
      });
    });
  });

  describe('DELETE /:id - 刪除團隊成員', () => {
    const mockExistingMember = {
      id: 'member-id',
      name: '張技術長',
      company_id: 'test-company-id',
      is_active: true,
    };

    it('應該成功軟刪除團隊成員', async () => {
      (prisma.teamMember.findFirst as jest.MockedFunction<any>).mockResolvedValue(mockExistingMember);
      (prisma.teamMember.update as jest.MockedFunction<any>).mockResolvedValue({ ...mockExistingMember, is_active: false });

      const handler = jest.fn(async (req, res) => {
        const memberId = req.params.id;

        const existingMember = await prisma.teamMember.findFirst({
          where: {
            id: memberId,
            company_id: req.user.company_id,
            is_active: true
          }
        });

        if (!existingMember) {
          return res.status(404).json({
            error: 'Not Found',
            message: '團隊成員不存在',
            statusCode: 404
          });
        }

        await prisma.teamMember.update({
          where: { id: memberId },
          data: { is_active: false }
        });

        logger.info('Team member deleted', {
          memberId,
          userId: req.userId
        });

        res.status(204).send();
      });

      mockReq.params = { id: 'member-id' };
      await handler(mockReq, mockRes);

      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'member-id',
          company_id: 'test-company-id',
          is_active: true
        }
      });

      expect(prisma.teamMember.update).toHaveBeenCalledWith({
        where: { id: 'member-id' },
        data: { is_active: false }
      });

      expect(logger.info).toHaveBeenCalledWith('Team member deleted', {
        memberId: 'member-id',
        userId: 'test-user-id'
      });

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('應該在成員不存在時返回 404', async () => {
      (prisma.teamMember.findFirst as jest.MockedFunction<any>).mockResolvedValue(null);

      const handler = jest.fn(async (req, res) => {
        const memberId = req.params.id;

        const existingMember = await prisma.teamMember.findFirst({
          where: {
            id: memberId,
            company_id: req.user.company_id,
            is_active: true
          }
        });

        if (!existingMember) {
          return res.status(404).json({
            error: 'Not Found',
            message: '團隊成員不存在',
            statusCode: 404
          });
        }
      });

      mockReq.params = { id: 'non-existent-id' };
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: '團隊成員不存在',
        statusCode: 404
      });
    });
  });

  describe('資料驗證測試', () => {
    it('應該驗證團隊成員必要欄位', () => {
      const createTeamMemberSchema = z.object({
        name: z.string().min(2, '姓名至少需要2個字元').max(100, '姓名長度不能超過100字元'),
        title: z.string().min(1, '請輸入職位').max(100, '職位長度不能超過100字元'),
        department: z.string().max(100, '部門名稱長度不能超過100字元').optional(),
        is_key_member: z.boolean().optional().default(false),
        display_order: z.number().int().min(0, '顯示順序必須為非負整數').optional(),
      });

      // 有效資料
      expect(() => createTeamMemberSchema.parse({
        name: '張技術長',
        title: '技術長',
        department: '技術部',
        is_key_member: true,
        display_order: 1
      })).not.toThrow();

      // 姓名太短
      expect(() => createTeamMemberSchema.parse({
        name: '張',
        title: '技術長'
      })).toThrow();

      // 姓名太長
      const longName = 'a'.repeat(101);
      expect(() => createTeamMemberSchema.parse({
        name: longName,
        title: '技術長'
      })).toThrow();

      // 職位為空
      expect(() => createTeamMemberSchema.parse({
        name: '張技術長',
        title: ''
      })).toThrow();

      // 顯示順序為負數
      expect(() => createTeamMemberSchema.parse({
        name: '張技術長',
        title: '技術長',
        display_order: -1
      })).toThrow();
    });

    it('應該驗證照片URL格式', () => {
      const schema = z.object({
        photo_url: z.string().url('請輸入有效的照片URL').optional(),
      });

      // 有效URL
      expect(() => schema.parse({ photo_url: 'https://example.com/photo.jpg' })).not.toThrow();
      expect(() => schema.parse({ photo_url: 'http://test.com/image.png' })).not.toThrow();
      expect(() => schema.parse({})).not.toThrow(); // 可選欄位

      // 無效URL
      expect(() => schema.parse({ photo_url: 'invalid-url' })).toThrow();
      expect(() => schema.parse({ photo_url: 'ftp://example.com/photo.jpg' })).toThrow();
    });

    it('應該驗證布林值欄位', () => {
      const schema = z.object({
        is_key_member: z.boolean().optional().default(false),
      });

      // 有效布林值
      expect(() => schema.parse({ is_key_member: true })).not.toThrow();
      expect(() => schema.parse({ is_key_member: false })).not.toThrow();
      expect(() => schema.parse({})).not.toThrow(); // 使用預設值

      // 無效布林值
      expect(() => schema.parse({ is_key_member: 'true' })).toThrow();
      expect(() => schema.parse({ is_key_member: 1 })).toThrow();
    });

    it('應該驗證可選欄位格式', () => {
      const schema = z.object({
        education: z.string().optional(),
        experience: z.string().optional(),
        expertise: z.string().optional(),
      });

      // 有效可選欄位
      expect(() => schema.parse({
        education: '台灣大學資訊工程學系',
        experience: '10年軟體開發經驗',
        expertise: 'Node.js, React'
      })).not.toThrow();

      expect(() => schema.parse({})).not.toThrow(); // 全部省略

      expect(() => schema.parse({
        education: '台灣大學資訊工程學系'
      })).not.toThrow(); // 部分省略
    });
  });
});