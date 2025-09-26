import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

// 擴展Request interface以包含user資訊
declare global {
  namespace Express {
    interface Request {
      userId: string;
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        company_id: string;
        is_active: boolean;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: '請提供認證token',
        statusCode: 401
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key') as any;
      
      // 檢查用戶是否存在且活躍
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          company_id: true,
          is_active: true
        }
      });

      if (!user || !user.is_active) {
        res.status(401).json({
          error: 'Unauthorized',
          message: '用戶不存在或已停用',
          statusCode: 401
        });
        return;
      }

      req.userId = user.id;
      req.user = user;
      next();
    } catch (jwtError) {
      logger.warn('Invalid token', { token: token.substring(0, 20) + '...', error: jwtError });
      res.status(401).json({
        error: 'Unauthorized',
        message: '無效的認證token',
        statusCode: 401
      });
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '認證檢查失敗',
      statusCode: 500
    });
  }
};

export const requireRole = (requiredRole: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: '請先登入',
        statusCode: 401
      });
      return;
    }

    const userRole = req.user.role;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    if (!roles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: '權限不足',
        statusCode: 403
      });
      return;
    }

    next();
  };
};

export const requireCompanyAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: '請先登入',
        statusCode: 401
      });
      return;
    }

    // 檢查用戶是否有公司ID
    if (!req.user.company_id) {
      res.status(403).json({
        error: 'Forbidden',
        message: '用戶未關聯任何公司',
        statusCode: 403
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Company access check error', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '公司權限檢查失敗',
      statusCode: 500
    });
  }
};

// 檢查資源是否屬於用戶的公司
export const checkResourceCompany = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.company_id) {
        res.status(403).json({
          error: 'Forbidden',
          message: '無權限訪問此資源',
          statusCode: 403
        });
        return;
      }

      const resourceId = req.params[resourceIdParam];
      
      // 如果沒有提供資源ID，跳過檢查（可能是創建新資源）
      if (!resourceId) {
        next();
        return;
      }

      // TODO: 實際實現中需要根據不同資源類型進行檢查
      // 這裡提供一個通用的檢查機制，可以在具體的路由中覆蓋

      next();
    } catch (error) {
      logger.error('Resource company check error', { error });
      res.status(500).json({
        error: 'Internal Server Error',
        message: '資源權限檢查失敗',
        statusCode: 500
      });
    }
  };
};

// 速率限制中間件（針對特定用戶）
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next();
      return;
    }

    const userId = req.user.id;
    const now = Date.now();
    const userRecord = requestCounts.get(userId);

    if (!userRecord || now > userRecord.resetTime) {
      requestCounts.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }

    if (userRecord.count >= maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: '請求過於頻繁，請稍後再試',
        statusCode: 429,
        retryAfter: Math.ceil((userRecord.resetTime - now) / 1000)
      });
      return;
    }

    userRecord.count++;
    next();
  };
};

// API Key認證中間件（用於系統間調用）
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    // 如果環境變數中沒有設定API Key，跳過檢查
    next();
    return;
  }

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: '無效的API Key',
      statusCode: 401
    });
    return;
  }

  next();
};