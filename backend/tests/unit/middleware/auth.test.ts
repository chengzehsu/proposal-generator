import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticateToken,
  requireRole,
  requireCompanyAccess,
  checkResourceCompany,
  userRateLimit,
  authenticateApiKey
} from '../../../src/middleware/auth';
import { prisma } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('Auth Middleware 單元測試', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      headers: {},
      params: {},
      user: undefined,
      userId: undefined,
    };

    mockRes = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
      send: jest.fn().mockReturnThis() as any,
    } as any;

    mockNext = jest.fn() as any;

    // Clear all mocks
    jest.clearAllMocks();

    // Set test environment - 使用與 .env.test 一致的值
    process.env.JWT_SECRET = 'test_secret_key_for_testing_only_do_not_use_in_production';
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authenticateToken', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      name: '測試用戶',
      role: 'ADMIN',
      company_id: 'company-id',
      is_active: true,
    };

    it('應該成功驗證有效的 token', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (jwt.verify as jest.MockedFunction<any>).mockReturnValue({ userId: 'user-id' });
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockUser);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test_secret_key_for_testing_only_do_not_use_in_production');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          company_id: true,
          is_active: true
        }
      });
      expect(mockReq.userId).toBe('user-id');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('應該在缺少 Authorization header 時返回 401', async () => {
      mockReq.headers = {};

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '請提供認證token',
        statusCode: 401
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('應該在無效 Authorization header 格式時返回 401', async () => {
      mockReq.headers = { authorization: 'invalid-format' };

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '請提供認證token',
        statusCode: 401
      });
    });

    it('應該在無效 token 時返回 401', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      (jwt.verify as jest.MockedFunction<any>).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Invalid token', {
        token: 'invalid-token...',
        error: expect.any(Error)
      });
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '無效的認證token',
        statusCode: 401
      });
    });

    it('應該在用戶不存在時返回 401', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (jwt.verify as jest.MockedFunction<any>).mockReturnValue({ userId: 'user-id' });
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(null);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '用戶不存在或已停用',
        statusCode: 401
      });
    });

    it('應該在用戶被停用時返回 401', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (jwt.verify as jest.MockedFunction<any>).mockReturnValue({ userId: 'user-id' });
      (prisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue({
        ...mockUser,
        is_active: false
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '用戶不存在或已停用',
        statusCode: 401
      });
    });

    it('應該在資料庫錯誤時返回 500', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (jwt.verify as jest.MockedFunction<any>).mockReturnValue({ userId: 'user-id' });
      (prisma.user.findUnique as jest.MockedFunction<any>).mockRejectedValue(new Error('Database error'));

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Authentication middleware error', {
        error: expect.any(Error)
      });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: '認證檢查失敗',
        statusCode: 500
      });
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-id',
        email: 'test@example.com',
        name: '測試用戶',
        role: 'EDITOR',
        company_id: 'company-id',
        is_active: true,
      };
    });

    it('應該允許符合單一角色要求的用戶', () => {
      const middleware = requireRole('EDITOR');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('應該允許符合多個角色要求之一的用戶', () => {
      const middleware = requireRole(['ADMIN', 'EDITOR']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('應該拒絕不符合角色要求的用戶', () => {
      const middleware = requireRole('ADMIN');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: '權限不足',
        statusCode: 403
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('應該在沒有用戶資訊時返回 401', () => {
      mockReq.user = undefined;
      const middleware = requireRole('ADMIN');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '請先登入',
        statusCode: 401
      });
    });
  });

  describe('requireCompanyAccess', () => {
    it('應該允許有公司ID的用戶', async () => {
      mockReq.user = {
        id: 'user-id',
        email: 'test@example.com',
        name: '測試用戶',
        role: 'ADMIN',
        company_id: 'company-id',
        is_active: true,
      };

      await requireCompanyAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('應該拒絕沒有用戶資訊的請求', async () => {
      mockReq.user = undefined;

      await requireCompanyAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '請先登入',
        statusCode: 401
      });
    });

    it('應該拒絕沒有公司ID的用戶', async () => {
      mockReq.user = {
        id: 'user-id',
        email: 'test@example.com',
        name: '測試用戶',
        role: 'ADMIN',
        company_id: '',
        is_active: true,
      };

      await requireCompanyAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: '用戶未關聯任何公司',
        statusCode: 403
      });
    });
  });

  describe('checkResourceCompany', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-id',
        email: 'test@example.com',
        name: '測試用戶',
        role: 'ADMIN',
        company_id: 'company-id',
        is_active: true,
      };
    });

    it('應該在有資源ID時通過檢查', async () => {
      mockReq.params = { id: 'resource-id' };
      const middleware = checkResourceCompany();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('應該在沒有資源ID時跳過檢查', async () => {
      mockReq.params = {};
      const middleware = checkResourceCompany();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('應該使用自定義參數名稱', async () => {
      mockReq.params = { customId: 'resource-id' };
      const middleware = checkResourceCompany('customId');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('應該拒絕沒有用戶資訊的請求', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'resource-id' };
      const middleware = checkResourceCompany();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: '無權限訪問此資源',
        statusCode: 403
      });
    });
  });

  describe('userRateLimit', () => {
    it('應該允許在限制內的請求', () => {
      mockReq.user = {
        id: 'user-id',
        email: 'test@example.com',
        name: '測試用戶',
        role: 'ADMIN',
        company_id: 'company-id',
        is_active: true,
      };

      const middleware = userRateLimit(5, 60000); // 5 requests per minute
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('應該在沒有用戶時跳過限制', () => {
      mockReq.user = undefined;
      const middleware = userRateLimit(5, 60000);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('應該阻止超過限制的請求', () => {
      mockReq.user = {
        id: 'user-id',
        email: 'test@example.com',
        name: '測試用戶',
        role: 'ADMIN',
        company_id: 'company-id',
        is_active: true,
      };

      const middleware = userRateLimit(2, 60000); // 2 requests per minute

      // 第一次請求
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // 第二次請求
      jest.clearAllMocks();
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // 第三次請求應該被阻止
      jest.clearAllMocks();
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: '請求過於頻繁，請稍後再試',
        statusCode: 429,
        retryAfter: expect.any(Number)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authenticateApiKey', () => {
    it('應該允許有效的 API Key', () => {
      mockReq.headers = { 'x-api-key': 'test-api-key' };

      authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('應該拒絕無效的 API Key', () => {
      mockReq.headers = { 'x-api-key': 'invalid-api-key' };

      authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '無效的API Key',
        statusCode: 401
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('應該拒絕缺少 API Key 的請求', () => {
      mockReq.headers = {};

      authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: '無效的API Key',
        statusCode: 401
      });
    });

    it('應該在沒有設定環境變數時跳過檢查', () => {
      delete process.env.API_KEY;
      mockReq.headers = {};

      authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('應該處理非常長的 token', async () => {
      const longToken = 'a'.repeat(1000);
      mockReq.headers = { authorization: `Bearer ${longToken}` };
      (jwt.verify as jest.MockedFunction<any>).mockImplementation(() => {
        throw new Error('Token too long');
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Invalid token', {
        token: 'a'.repeat(20) + '...',
        error: expect.any(Error)
      });
    });

    it('應該處理同一用戶的並發速率限制', () => {
      mockReq.user = {
        id: 'user-id',
        email: 'test@example.com',
        name: '測試用戶',
        role: 'ADMIN',
        company_id: 'company-id',
        is_active: true,
      };

      const middleware = userRateLimit(1, 60000);

      // 並發請求
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });
});