import winston from 'winston';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables if not already loaded
if (!process.env.LOG_DIR) {
  dotenv.config();
}

// Create logs directory if it doesn't exist
const logsDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 自定義格式化函數
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry: any = {
      timestamp,
      level,
      message,
      ...meta
    };

    // 添加堆疊信息（僅在錯誤級別）
    if (stack && level === 'error') {
      logEntry.stack = stack;
    }

    // 添加性能指標
    if (meta.duration && typeof meta.duration === 'number') {
      logEntry.performance = {
        duration: meta.duration,
        category: meta.duration > 2000 ? 'slow' : meta.duration > 1000 ? 'medium' : 'fast'
      };
    }

    return JSON.stringify(logEntry);
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { 
    service: 'proposal-generator-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // 錯誤日誌
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    // 警告日誌
    new winston.transports.File({ 
      filename: path.join(logsDir, 'warn.log'), 
      level: 'warn',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // 性能日誌
    new winston.transports.File({ 
      filename: path.join(logsDir, 'performance.log'),
      level: 'info',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 7,
      tailable: true,
      format: winston.format.combine(
        customFormat,
        winston.format((info) => {
          // 只記錄包含性能數據的日誌
          return info.duration || info.queryTime || info.memoryDelta ? info : false;
        })()
      )
    }),
    // 應用程式日誌
    new winston.transports.File({ 
      filename: path.join(logsDir, 'app.log'),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 7,
      tailable: true
    }),
    // 審計日誌
    new winston.transports.File({ 
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 30,
      tailable: true,
      format: winston.format.combine(
        customFormat,
        winston.format((info) => {
          // 只記錄包含審計數據的日誌
          return info.audit || info.action ? info : false;
        })()
      )
    })
  ],
});

// 開發環境控制台輸出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss.SSS'
      }),
      winston.format.printf(({ level, message, timestamp, duration, queryTime, ...meta }) => {
        let perfInfo = '';
        if (duration) perfInfo += ` [${duration}ms]`;
        if (queryTime) perfInfo += ` [DB: ${queryTime}ms]`;
        
        let metaStr = '';
        const filteredMeta = { ...meta };
        delete filteredMeta.service;
        delete filteredMeta.version;
        delete filteredMeta.environment;
        delete filteredMeta.performance;
        
        if (Object.keys(filteredMeta).length > 0) {
          metaStr = ` ${JSON.stringify(filteredMeta)}`;
        }
        
        return `${timestamp} ${level}: ${message}${perfInfo}${metaStr}`;
      })
    ),
  }));
}

// 擴展的日誌函數
export const enhancedLogger = {
  // 基本日誌函數
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  error: (message: string, meta?: any) => logger.error(message, meta),

  // 性能日誌
  performance: (message: string, duration: number, meta?: any) => {
    logger.info(message, { ...meta, duration, category: 'performance' });
  },

  // 審計日誌
  audit: (action: string, details: any, userId?: string) => {
    logger.info(`Audit: ${action}`, { 
      audit: true,
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // 安全日誌
  security: (event: string, details: any, level: 'info' | 'warn' | 'error' = 'warn') => {
    logger[level](`Security: ${event}`, {
      security: true,
      event,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // API 訪問日誌
  api: (method: string, url: string, statusCode: number, duration: number, userId?: string, ip?: string) => {
    logger.info('API Access', {
      api: true,
      method,
      url,
      statusCode,
      duration,
      userId,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  // 資料庫操作日誌
  database: (operation: string, table: string, duration: number, recordId?: string, userId?: string) => {
    logger.info('Database Operation', {
      database: true,
      operation,
      table,
      duration,
      recordId,
      userId,
      timestamp: new Date().toISOString()
    });
  },

  // 錯誤上下文日誌
  errorWithContext: (error: Error, context: any) => {
    logger.error('Error with context', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// 日誌統計
export const logStats = {
  async getRecentErrors(hours: number = 24): Promise<any[]> {
    // 實際實現需要讀取日誌文件或使用日誌聚合服務
    // 這裡提供一個模擬實現
    return [];
  },

  async getPerformanceMetrics(hours: number = 24): Promise<any> {
    // 實際實現需要分析性能日誌
    return {
      averageResponseTime: 0,
      slowQueries: 0,
      errorRate: 0
    };
  }
};

export { logger };