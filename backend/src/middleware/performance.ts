import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface PerformanceMetrics {
  startTime: number;
  queryCount: number;
  queryTime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

// 性能監控中間件
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  
  // 添加性能指標到請求對象
  (req as any).performance = {
    startTime,
    queryCount: 0,
    queryTime: 0,
    memoryUsage: startMemory
  } as PerformanceMetrics;

  // 攔截響應結束事件
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;
    
    const metrics = (req as any).performance as PerformanceMetrics;
    
    // 記錄性能指標
    const performanceData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: Math.round(duration * 100) / 100, // 保留2位小數
      queryCount: metrics.queryCount,
      queryTime: Math.round(metrics.queryTime * 100) / 100,
      memoryDelta: {
        heapUsed: Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024 * 100) / 100, // MB
        rss: Math.round((endMemory.rss - startMemory.rss) / 1024 / 1024 * 100) / 100 // MB
      },
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };

    // 根據性能閾值記錄不同級別的日誌
    if (duration > 5000) { // 超過5秒
      logger.error('Slow request detected', performanceData);
    } else if (duration > 2000) { // 超過2秒
      logger.warn('Performance warning', performanceData);
    } else if (duration > 1000) { // 超過1秒
      logger.info('Performance info', performanceData);
    } else {
      logger.debug('Request completed', performanceData);
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// 數據庫查詢性能監控
export const trackDatabaseQuery = (queryName: string, startTime: number, req: Request) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  if ((req as any).performance) {
    (req as any).performance.queryCount += 1;
    (req as any).performance.queryTime += duration;
  }

  // 記錄慢查詢
  if (duration > 1000) { // 超過1秒的查詢
    logger.warn('Slow database query', {
      queryName,
      duration: Math.round(duration * 100) / 100,
      url: req.originalUrl,
      method: req.method,
      userId: (req as any).userId
    });
  }
};

// 內存使用監控中間件
export const memoryMonitor = (req: Request, res: Response, next: NextFunction) => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  
  // 內存使用超過閾值時記錄警告
  if (heapUsedMB > 512) { // 超過512MB
    logger.warn('High memory usage detected', {
      heapUsed: heapUsedMB + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
      url: req.originalUrl,
      method: req.method
    });
  }

  next();
};

// API 限流監控
export const rateLimitMonitor = (req: Request, res: Response, next: NextFunction) => {
  const rateLimit = res.getHeader('X-RateLimit-Remaining') as string;
  const rateLimitReset = res.getHeader('X-RateLimit-Reset') as string;
  
  if (rateLimit && parseInt(rateLimit) < 10) { // 剩餘請求次數少於10次
    logger.warn('Rate limit approaching', {
      remaining: rateLimit,
      reset: rateLimitReset,
      ip: req.ip,
      url: req.originalUrl,
      userId: (req as any).userId
    });
  }

  next();
};

// 錯誤響應時間監控
export const errorResponseMonitor = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const startTime = (req as any).performance?.startTime;
  
  if (startTime) {
    const duration = performance.now() - startTime;
    
    logger.error('Error response', {
      error: error.message,
      stack: error.stack,
      duration: Math.round(duration * 100) / 100,
      url: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      userId: (req as any).userId
    });
  }

  next(error);
};