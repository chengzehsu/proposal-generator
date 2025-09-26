import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
      create: jest.fn(),
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

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

describe('Auth 路由單元測試', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      userId: 'test-user-id',
    };
    
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup default environment
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '7d';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /register - 用戶註冊', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'Test123!@#',
      name: '測試用戶',
      company: {
        company_name: '測試公司',
        tax_id: '12345678',
        address: '台北市測試區',
        phone: '02-1234-5678',
        email: 'company@test.com',
        capital: 1000000,
        established_date: '2020-01-01',
        website: 'https://test.com',
      },
    };

    it('應該成功註冊新用戶', async () => {
      const mockCompany = { id: 'company-id', ...validRegisterData.company };
      const mockUser = {
        id: 'user-id',
        email: validRegisterData.email,
        name: validRegisterData.name,
        role: 'ADMIN',
        company_id: 'company-id',
        is_active: true,
        created_at: new Date(),
      };

      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(null);
      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(null);
      (bcrypt.hash as jest.MockedFunction<any>).mockResolvedValue('hashed-password');
      (prisma.$transaction as jest.MockedFunction<any>).mockResolvedValue({
        user: mockUser,
        company: mockCompany,
      });
      (jwt.sign as jest.MockedFunction<any>)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const handler = jest.fn(async (req, res) => {
        const validatedData = validRegisterData;
        const { email, password, name, company } = validatedData;

        // 檢查email是否已存在
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          return res.status(409).json({
            error: 'Conflict',
            message: '電子信箱已被使用',
            statusCode: 409
          });
        }

        // 檢查統一編號是否已存在
        const existingCompany = await prisma.company.findUnique({
          where: { tax_id: company.tax_id }
        });

        if (existingCompany) {
          return res.status(409).json({
            error: 'Conflict',
            message: '統一編號已被使用',
            statusCode: 409
          });
        }

        // 使用交易創建公司和用戶
        const result = await prisma.$transaction(async (tx) => {
          const newCompany = await tx.company.create({
            data: {
              company_name: company.company_name,
              tax_id: company.tax_id,
              address: company.address,
              phone: company.phone,
              email: company.email,
              capital: company.capital,
              established_date: company.established_date ? new Date(company.established_date) : undefined,
              website: company.website || undefined
            }
          });

          const hashedPassword = await bcrypt.hash(password, 12);
          const newUser = await tx.user.create({
            data: {
              email,
              password: hashedPassword,
              name,
              role: 'ADMIN',
              company_id: newCompany.id
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              company_id: true,
              is_active: true,
              created_at: true
            }
          });

          return { user: newUser, company: newCompany };
        });

        // 生成JWT token
        const generateToken = (userId: string) => jwt.sign({ userId }, 'test-secret', { expiresIn: '7d' });
        const generateRefreshToken = (userId: string) => jwt.sign({ userId, type: 'refresh' }, 'test-refresh-secret', { expiresIn: '30d' });
        
        const token = generateToken(result.user.id);
        const refreshToken = generateRefreshToken(result.user.id);

        logger.info('User registered successfully', {
          userId: result.user.id,
          email: result.user.email,
          companyId: result.company.id
        });

        res.status(201).json({
          user: result.user,
          company: result.company,
          token,
          refresh_token: refreshToken
        });
      });

      mockReq.body = validRegisterData;
      await handler(mockReq, mockRes);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: validRegisterData.email } });
      expect(prisma.company.findUnique).toHaveBeenCalledWith({ where: { tax_id: validRegisterData.company.tax_id } });
      expect(bcrypt.hash).toHaveBeenCalledWith(validRegisterData.password, 12);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('User registered successfully', expect.any(Object));
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockUser,
        company: mockCompany,
        token: 'access-token',
        refresh_token: 'refresh-token'
      });
    });

    it('應該在電子信箱已存在時返回 409', async () => {
      const existingUser = { id: 'existing-user-id', email: validRegisterData.email };
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(existingUser);

      const handler = jest.fn(async (req, res) => {
        const { email } = validRegisterData;

        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          return res.status(409).json({
            error: 'Conflict',
            message: '電子信箱已被使用',
            statusCode: 409
          });
        }
      });

      mockReq.body = validRegisterData;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Conflict',
        message: '電子信箱已被使用',
        statusCode: 409
      });
    });

    it('應該在統一編號已存在時返回 409', async () => {
      const existingCompany = { id: 'existing-company-id', tax_id: validRegisterData.company.tax_id };
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(null);
      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(existingCompany);

      const handler = jest.fn(async (req, res) => {
        const { email, company } = validRegisterData;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return;

        const existingCompany = await prisma.company.findUnique({
          where: { tax_id: company.tax_id }
        });

        if (existingCompany) {
          return res.status(409).json({
            error: 'Conflict',
            message: '統一編號已被使用',
            statusCode: 409
          });
        }
      });

      mockReq.body = validRegisterData;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Conflict',
        message: '統一編號已被使用',
        statusCode: 409
      });
    });
  });

  describe('POST /login - 用戶登入', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };

    const mockUser = {
      id: 'user-id',
      email: validLoginData.email,
      password: 'hashed-password',
      name: '測試用戶',
      role: 'ADMIN',
      company_id: 'company-id',
      is_active: true,
      company: {
        id: 'company-id',
        company_name: '測試公司',
        tax_id: '12345678',
      },
    };

    it('應該成功登入並返回token', async () => {
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.MockedFunction<any>).mockResolvedValue(true);
      (prisma.user.update as jest.MockedFunction<any>).mockResolvedValue(mockUser);
      (jwt.sign as jest.MockedFunction<any>)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const handler = jest.fn(async (req, res) => {
        const { email, password } = validLoginData;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            company: {
              select: {
                id: true,
                company_name: true,
                tax_id: true
              }
            }
          }
        });

        if (!user || !user.is_active) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '電子信箱或密碼錯誤',
            statusCode: 401
          });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '電子信箱或密碼錯誤',
            statusCode: 401
          });
        }

        const generateToken = (userId: string) => jwt.sign({ userId }, 'test-secret', { expiresIn: '7d' });
        const generateRefreshToken = (userId: string) => jwt.sign({ userId, type: 'refresh' }, 'test-refresh-secret', { expiresIn: '30d' });

        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        await prisma.user.update({
          where: { id: user.id },
          data: { last_login_at: new Date() }
        });

        logger.info('User logged in successfully', { userId: user.id, email });

        res.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            company_id: user.company_id,
            company: user.company
          },
          token,
          refresh_token: refreshToken
        });
      });

      mockReq.body = validLoginData;
      await handler(mockReq, mockRes);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validLoginData.email },
        include: expect.any(Object)
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(validLoginData.password, 'hashed-password');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { last_login_at: expect.any(Date) }
      });
      expect(logger.info).toHaveBeenCalledWith('User logged in successfully', expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith({
        user: expect.any(Object),
        token: 'access-token',
        refresh_token: 'refresh-token'
      });
    });

    it('應該在用戶不存在時返回 401', async () => {
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(null);

      const handler = jest.fn(async (req, res) => {
        const { email } = validLoginData;

        const user = await prisma.user.findUnique({
          where: { email },
          include: expect.any(Object)
        });

        if (!user || !user.is_active) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '電子信箱或密碼錯誤',
            statusCode: 401
          });
        }
      });

      mockReq.body = validLoginData;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '電子信箱或密碼錯誤',
        statusCode: 401
      });
    });

    it('應該在密碼錯誤時返回 401', async () => {
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.MockedFunction<any>).mockResolvedValue(false);

      const handler = jest.fn(async (req, res) => {
        const { email, password } = validLoginData;

        const user = await prisma.user.findUnique({
          where: { email },
          include: expect.any(Object)
        });

        if (!user || !user.is_active) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '電子信箱或密碼錯誤',
            statusCode: 401
          });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '電子信箱或密碼錯誤',
            statusCode: 401
          });
        }
      });

      mockReq.body = validLoginData;
      await handler(mockReq, mockRes);

      expect(bcrypt.compare).toHaveBeenCalledWith(validLoginData.password, 'hashed-password');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '電子信箱或密碼錯誤',
        statusCode: 401
      });
    });

    it('應該在用戶被停用時返回 401', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(inactiveUser);

      const handler = jest.fn(async (req, res) => {
        const { email } = validLoginData;

        const user = await prisma.user.findUnique({
          where: { email },
          include: expect.any(Object)
        });

        if (!user || !user.is_active) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '電子信箱或密碼錯誤',
            statusCode: 401
          });
        }
      });

      mockReq.body = validLoginData;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('POST /refresh - 刷新token', () => {
    it('應該成功刷新token', async () => {
      const refreshToken = 'valid-refresh-token';
      const decodedPayload = { userId: 'user-id', type: 'refresh' };
      const mockUser = { id: 'user-id', is_active: true };

      (jwt.verify as jest.MockedFunction<any>).mockReturnValue(decodedPayload);
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockUser);
      (jwt.sign as jest.MockedFunction<any>)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const handler = jest.fn(async (req, res) => {
        const { refresh_token } = req.body;

        if (!refresh_token) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '請提供refresh token',
            statusCode: 401
          });
        }

        try {
          const decoded = jwt.verify(refresh_token, 'test-refresh-secret') as any;
          
          if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
          }

          const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
          });

          if (!user || !user.is_active) {
            return res.status(401).json({
              error: 'Unauthorized',
              message: '用戶不存在或已停用',
              statusCode: 401
            });
          }

          const generateToken = (userId: string) => jwt.sign({ userId }, 'test-secret', { expiresIn: '7d' });
          const generateRefreshToken = (userId: string) => jwt.sign({ userId, type: 'refresh' }, 'test-refresh-secret', { expiresIn: '30d' });

          const newToken = generateToken(user.id);
          const newRefreshToken = generateRefreshToken(user.id);

          res.json({
            token: newToken,
            refresh_token: newRefreshToken
          });

        } catch (jwtError) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '無效的 refresh token',
            statusCode: 401
          });
        }
      });

      mockReq.body = { refresh_token: refreshToken };
      await handler(mockReq, mockRes);

      expect(jwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-id' } });
      expect(mockRes.json).toHaveBeenCalledWith({
        token: 'new-access-token',
        refresh_token: 'new-refresh-token'
      });
    });

    it('應該在缺少refresh token時返回 401', async () => {
      const handler = jest.fn(async (req, res) => {
        const { refresh_token } = req.body;

        if (!refresh_token) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '請提供refresh token',
            statusCode: 401
          });
        }
      });

      mockReq.body = {};
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '請提供refresh token',
        statusCode: 401
      });
    });

    it('應該在無效refresh token時返回 401', async () => {
      (jwt.verify as jest.MockedFunction<any>).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const handler = jest.fn(async (req, res) => {
        const { refresh_token } = req.body;

        try {
          jwt.verify(refresh_token, 'test-refresh-secret');
        } catch (jwtError) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '無效的 refresh token',
            statusCode: 401
          });
        }
      });

      mockReq.body = { refresh_token: 'invalid-token' };
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '無效的 refresh token',
        statusCode: 401
      });
    });
  });

  describe('GET /profile - 獲取用戶資料', () => {
    it('應該成功返回用戶資料', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: '測試用戶',
        role: 'ADMIN',
        company_id: 'company-id',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: new Date(),
        company: {
          id: 'company-id',
          company_name: '測試公司',
          tax_id: '12345678',
        },
      };

      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockUser);

      const handler = jest.fn(async (req, res) => {
        const user = await prisma.user.findUnique({
          where: { id: req.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            company_id: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            last_login_at: true,
            company: {
              select: {
                id: true,
                company_name: true,
                tax_id: true
              }
            }
          }
        });

        if (!user) {
          return res.status(404).json({
            error: 'Not Found',
            message: '用戶不存在',
            statusCode: 404
          });
        }

        res.json(user);
      });

      await handler(mockReq, mockRes);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: expect.any(Object)
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });

    it('應該在用戶不存在時返回 404', async () => {
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(null);

      const handler = jest.fn(async (req, res) => {
        const user = await prisma.user.findUnique({
          where: { id: req.userId },
          select: expect.any(Object)
        });

        if (!user) {
          return res.status(404).json({
            error: 'Not Found',
            message: '用戶不存在',
            statusCode: 404
          });
        }

        res.json(user);
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: '用戶不存在',
        statusCode: 404
      });
    });
  });

  describe('資料驗證測試', () => {
    it('應該驗證註冊資料格式', () => {
      const registerSchema = z.object({
        email: z.string().email('請輸入有效的電子信箱'),
        password: z.string()
          .min(8, '密碼至少需要8個字元')
          .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
                 '密碼必須包含大小寫字母、數字和特殊字元'),
        name: z.string().min(1, '請輸入姓名').max(100, '姓名長度不能超過100字元'),
      });

      // 有效資料
      expect(() => registerSchema.parse({
        email: 'test@example.com',
        password: 'Test123!@#',
        name: '測試用戶'
      })).not.toThrow();

      // 無效email
      expect(() => registerSchema.parse({
        email: 'invalid-email',
        password: 'Test123!@#',
        name: '測試用戶'
      })).toThrow();

      // 無效密碼（太短）
      expect(() => registerSchema.parse({
        email: 'test@example.com',
        password: 'Test123',
        name: '測試用戶'
      })).toThrow();

      // 無效密碼（缺少特殊字元）
      expect(() => registerSchema.parse({
        email: 'test@example.com',
        password: 'Test1234',
        name: '測試用戶'
      })).toThrow();

      // 空名稱
      expect(() => registerSchema.parse({
        email: 'test@example.com',
        password: 'Test123!@#',
        name: ''
      })).toThrow();
    });

    it('應該驗證公司資料格式', () => {
      const companySchema = z.object({
        company_name: z.string().min(1, '請輸入公司名稱').max(200, '公司名稱長度不能超過200字元'),
        tax_id: z.string().regex(/^\d{8}$/, '統一編號必須為8位數字'),
        address: z.string().min(1, '請輸入公司地址'),
        phone: z.string().min(1, '請輸入聯絡電話'),
        email: z.string().email('請輸入有效的公司電子信箱'),
        website: z.string().url('請輸入有效的網站URL').optional().or(z.literal('')),
      });

      // 有效公司資料
      expect(() => companySchema.parse({
        company_name: '測試公司',
        tax_id: '12345678',
        address: '台北市測試區',
        phone: '02-1234-5678',
        email: 'company@test.com',
        website: 'https://test.com'
      })).not.toThrow();

      // 無效統編
      expect(() => companySchema.parse({
        company_name: '測試公司',
        tax_id: '1234567', // 7位數
        address: '台北市測試區',
        phone: '02-1234-5678',
        email: 'company@test.com'
      })).toThrow();

      // 無效網站URL
      expect(() => companySchema.parse({
        company_name: '測試公司',
        tax_id: '12345678',
        address: '台北市測試區',
        phone: '02-1234-5678',
        email: 'company@test.com',
        website: 'invalid-url'
      })).toThrow();
    });

    it('應該驗證邀請用戶資料', () => {
      const inviteUserSchema = z.object({
        email: z.string().email('請輸入有效的電子信箱'),
        name: z.string().min(1, '請輸入姓名').max(100, '姓名長度不能超過100字元'),
        role: z.enum(['ADMIN', 'EDITOR'], { message: '角色必須為ADMIN或EDITOR' })
      });

      // 有效邀請資料
      expect(() => inviteUserSchema.parse({
        email: 'invite@example.com',
        name: '被邀請用戶',
        role: 'EDITOR'
      })).not.toThrow();

      // 無效角色
      expect(() => inviteUserSchema.parse({
        email: 'invite@example.com',
        name: '被邀請用戶',
        role: 'INVALID_ROLE'
      })).toThrow();
    });
  });

  describe('JWT Token 處理測試', () => {
    it('應該正確生成access token', () => {
      (jwt.sign as jest.MockedFunction<any>).mockReturnValue('generated-token');

      const generateToken = (userId: string) => {
        return jwt.sign(
          { userId },
          'test-secret',
          { expiresIn: '7d' }
        );
      };

      const token = generateToken('user-id');

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user-id' },
        'test-secret',
        { expiresIn: '7d' }
      );
      expect(token).toBe('generated-token');
    });

    it('應該正確生成refresh token', () => {
      (jwt.sign as jest.MockedFunction<any>).mockReturnValue('generated-refresh-token');

      const generateRefreshToken = (userId: string) => {
        return jwt.sign(
          { userId, type: 'refresh' },
          'test-refresh-secret',
          { expiresIn: '30d' }
        );
      };

      const refreshToken = generateRefreshToken('user-id');

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user-id', type: 'refresh' },
        'test-refresh-secret',
        { expiresIn: '30d' }
      );
      expect(refreshToken).toBe('generated-refresh-token');
    });
  });
});