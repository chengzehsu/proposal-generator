import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  errorHandler
} from '../../../src/middleware/error';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Error Middleware 單元測試', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      url: '/api/v1/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Test User Agent'),
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Classes', () => {
    describe('ValidationError', () => {
      it('應該正確設置錯誤屬性', () => {
        const error = new ValidationError('Invalid input data');

        expect(error.name).toBe('ValidationError');
        expect(error.message).toBe('Invalid input data');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error).toBeInstanceOf(Error);
      });
    });

    describe('AuthenticationError', () => {
      it('應該使用預設訊息', () => {
        const error = new AuthenticationError();

        expect(error.name).toBe('AuthenticationError');
        expect(error.message).toBe('Authentication failed');
        expect(error.statusCode).toBe(401);
        expect(error.isOperational).toBe(true);
      });

      it('應該使用自定義訊息', () => {
        const error = new AuthenticationError('Token expired');

        expect(error.name).toBe('AuthenticationError');
        expect(error.message).toBe('Token expired');
        expect(error.statusCode).toBe(401);
        expect(error.isOperational).toBe(true);
      });
    });

    describe('AuthorizationError', () => {
      it('應該使用預設訊息', () => {
        const error = new AuthorizationError();

        expect(error.name).toBe('AuthorizationError');
        expect(error.message).toBe('Insufficient permissions');
        expect(error.statusCode).toBe(403);
        expect(error.isOperational).toBe(true);
      });

      it('應該使用自定義訊息', () => {
        const error = new AuthorizationError('Admin access required');

        expect(error.name).toBe('AuthorizationError');
        expect(error.message).toBe('Admin access required');
        expect(error.statusCode).toBe(403);
        expect(error.isOperational).toBe(true);
      });
    });

    describe('NotFoundError', () => {
      it('應該使用預設訊息', () => {
        const error = new NotFoundError();

        expect(error.name).toBe('NotFoundError');
        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.isOperational).toBe(true);
      });

      it('應該使用自定義訊息', () => {
        const error = new NotFoundError('User not found');

        expect(error.name).toBe('NotFoundError');
        expect(error.message).toBe('User not found');
        expect(error.statusCode).toBe(404);
        expect(error.isOperational).toBe(true);
      });
    });

    describe('ConflictError', () => {
      it('應該使用預設訊息', () => {
        const error = new ConflictError();

        expect(error.name).toBe('ConflictError');
        expect(error.message).toBe('Resource already exists');
        expect(error.statusCode).toBe(409);
        expect(error.isOperational).toBe(true);
      });

      it('應該使用自定義訊息', () => {
        const error = new ConflictError('Email already exists');

        expect(error.name).toBe('ConflictError');
        expect(error.message).toBe('Email already exists');
        expect(error.statusCode).toBe(409);
        expect(error.isOperational).toBe(true);
      });
    });
  });

  describe('errorHandler Middleware', () => {
    it('應該處理 ValidationError', () => {
      const error = new ValidationError('Invalid input');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Request error', {
        error: {
          name: 'ValidationError',
          message: 'Invalid input',
          stack: expect.any(String),
        },
        request: {
          method: 'POST',
          url: '/api/v1/test',
          ip: '127.0.0.1',
          userAgent: 'Test User Agent',
        },
        statusCode: 400,
      });

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'ValidationError',
        message: 'Invalid input',
        statusCode: 400,
      });
    });

    it('應該處理 AuthenticationError', () => {
      const error = new AuthenticationError('Token expired');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: 'Token expired',
        statusCode: 401,
      });
    });

    it('應該處理 AuthorizationError', () => {
      const error = new AuthorizationError('Admin required');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthorizationError',
        message: 'Admin required',
        statusCode: 403,
      });
    });

    it('應該處理 NotFoundError', () => {
      const error = new NotFoundError('Resource not found');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'NotFoundError',
        message: 'Resource not found',
        statusCode: 404,
      });
    });

    it('應該處理 ConflictError', () => {
      const error = new ConflictError('Resource exists');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'ConflictError',
        message: 'Resource exists',
        statusCode: 409,
      });
    });

    it('應該處理一般錯誤（無 statusCode）', () => {
      const error = new Error('Unexpected error') as AppError;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Request error', expect.objectContaining({
        statusCode: 500,
      }));

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error',
        message: 'Unexpected error',
        statusCode: 500,
      });
    });

    it('應該處理沒有訊息的錯誤', () => {
      const error = new Error() as AppError;
      error.statusCode = 500;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });

    it('應該在開發環境中包含 stack trace', () => {
      process.env.NODE_ENV = 'development';
      const error = new ValidationError('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'ValidationError',
        message: 'Test error',
        statusCode: 400,
        stack: expect.any(String),
      });
    });

    it('應該在生產環境中隱藏內部錯誤詳情', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal database error') as AppError;
      error.statusCode = 500;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error',
        message: 'Something went wrong',
        statusCode: 500,
      });
    });

    it('應該在生產環境中顯示非 500 錯誤訊息', () => {
      process.env.NODE_ENV = 'production';
      const error = new ValidationError('Invalid email format');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'ValidationError',
        message: 'Invalid email format',
        statusCode: 400,
      });
    });

    it('應該記錄完整的請求資訊', () => {
      const error = new NotFoundError('Test error');
      mockReq.method = 'GET';
      mockReq.url = '/api/v1/users/123';
      mockReq.ip = '192.168.1.100';
      (mockReq.get as jest.MockedFunction<any>).mockReturnValue('Mozilla/5.0');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Request error', {
        error: {
          name: 'NotFoundError',
          message: 'Test error',
          stack: expect.any(String),
        },
        request: {
          method: 'GET',
          url: '/api/v1/users/123',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        },
        statusCode: 404,
      });
    });

    it('應該處理沒有 name 的錯誤', () => {
      const error = new Error('Test error') as AppError;
      error.name = '';
      error.statusCode = 400;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error',
        message: 'Test error',
        statusCode: 400,
      });
    });

    it('應該處理缺少 User-Agent 的請求', () => {
      const error = new ValidationError('Test error');
      (mockReq.get as jest.MockedFunction<any>).mockReturnValue(undefined);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Request error', {
        error: expect.any(Object),
        request: {
          method: 'POST',
          url: '/api/v1/test',
          ip: '127.0.0.1',
          userAgent: undefined,
        },
        statusCode: 400,
      });
    });
  });

  describe('Error Inheritance', () => {
    it('所有自定義錯誤都應該繼承自 Error', () => {
      expect(new ValidationError('test')).toBeInstanceOf(Error);
      expect(new AuthenticationError('test')).toBeInstanceOf(Error);
      expect(new AuthorizationError('test')).toBeInstanceOf(Error);
      expect(new NotFoundError('test')).toBeInstanceOf(Error);
      expect(new ConflictError('test')).toBeInstanceOf(Error);
    });

    it('所有自定義錯誤都應該是 operational', () => {
      expect(new ValidationError('test').isOperational).toBe(true);
      expect(new AuthenticationError('test').isOperational).toBe(true);
      expect(new AuthorizationError('test').isOperational).toBe(true);
      expect(new NotFoundError('test').isOperational).toBe(true);
      expect(new ConflictError('test').isOperational).toBe(true);
    });

    it('所有自定義錯誤都應該有正確的狀態碼', () => {
      expect(new ValidationError('test').statusCode).toBe(400);
      expect(new AuthenticationError('test').statusCode).toBe(401);
      expect(new AuthorizationError('test').statusCode).toBe(403);
      expect(new NotFoundError('test').statusCode).toBe(404);
      expect(new ConflictError('test').statusCode).toBe(409);
    });
  });
});