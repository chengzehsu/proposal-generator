import express from 'express';
import { checkDatabaseConnection, prisma } from '../utils/database';
import { enhancedLogger, logStats, logger } from '../utils/logger';
import { performDatabaseHealthCheck } from '../utils/queryOptimizer';

const router = express.Router();

// 基本健康檢查
router.get('/', async (req, res) => {
  try {
    const startTime = performance.now();
    
    // 檢查數據庫連接
    const dbConnected = await checkDatabaseConnection();
    
    const responseTime = Math.round((performance.now() - startTime) * 100) / 100;
    
    const healthStatus = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime,
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    const statusCode = dbConnected ? 200 : 503;
    
    enhancedLogger.api(req.method, req.originalUrl, statusCode, responseTime, undefined, req.ip);
    
    return res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    logger.error('Health check failed', { error });
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 詳細健康檢查
router.get('/detailed', async (req, res) => {
  try {
    const startTime = performance.now();
    
    // 並行執行多項檢查
    const [dbHealth, memoryUsage, systemInfo] = await Promise.all([
      performDatabaseHealthCheck(),
      getMemoryHealthInfo(),
      getSystemHealthInfo()
    ]);

    // 檢查數據庫表計數
    const tableStats = await getDatabaseStats();
    
    const responseTime = Math.round((performance.now() - startTime) * 100) / 100;
    
    // 綜合健康狀態
    const overallStatus = determineOverallHealth(dbHealth, memoryUsage, responseTime);
    
    const detailedHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      checks: {
        database: dbHealth,
        memory: memoryUsage,
        system: systemInfo,
        tables: tableStats
      },
      performance: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'warning' ? 200 : 503;
    
    enhancedLogger.api(req.method, req.originalUrl, statusCode, responseTime, undefined, req.ip);
    
    return res.status(statusCode).json(detailedHealth);
    
  } catch (error) {
    logger.error('Detailed health check failed', { error });
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 數據庫性能檢查
router.get('/database', async (req, res) => {
  try {
    const startTime = performance.now();
    
    // 執行基本查詢測試
    const queryTests = await Promise.all([
      // 測試簡單查詢
      measureQuery('simple-select', () => prisma.$queryRaw`SELECT 1 as test`),
      
      // 測試計數查詢
      measureQuery('count-users', () => prisma.user.count()),
      measureQuery('count-companies', () => prisma.company.count()),
      measureQuery('count-proposals', () => prisma.proposal.count()),
      
      // 測試關聯查詢
      measureQuery('user-with-company', () => 
        prisma.user.findFirst({
          include: { company: true },
          take: 1
        })
      )
    ]);

    const totalTime = Math.round((performance.now() - startTime) * 100) / 100;
    
    // 分析查詢性能
    const slowQueries = queryTests.filter(test => test.duration > 1000);
    const avgQueryTime = queryTests.reduce((sum, test) => sum + test.duration, 0) / queryTests.length;
    
    const dbPerformance = {
      status: slowQueries.length === 0 ? 'good' : 'warning',
      totalTime,
      averageQueryTime: Math.round(avgQueryTime * 100) / 100,
      slowQueriesCount: slowQueries.length,
      tests: queryTests,
      recommendations: generateDbRecommendations(queryTests)
    };

    enhancedLogger.performance('Database performance check', totalTime, { 
      avgQueryTime, 
      slowQueries: slowQueries.length 
    });
    
    return res.json(dbPerformance);
    
  } catch (error) {
    logger.error('Database performance check failed', { error });
    return res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 內存和性能監控
router.get('/performance', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 獲取最近的性能指標
    const recentMetrics = await logStats.getPerformanceMetrics(1); // 最近1小時
    
    const performanceData = {
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100,
        status: memoryUsage.heapUsed / 1024 / 1024 > 512 ? 'warning' : 'good'
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
      recentMetrics,
      recommendations: generatePerformanceRecommendations(memoryUsage, recentMetrics)
    };

    return res.json(performanceData);
    
  } catch (error) {
    logger.error('Performance check failed', { error });
    return res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 日誌統計
router.get('/logs', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    
    const [recentErrors, performanceMetrics] = await Promise.all([
      logStats.getRecentErrors(hours),
      logStats.getPerformanceMetrics(hours)
    ]);

    const logSummary = {
      timeRange: `${hours} hours`,
      errors: {
        count: recentErrors.length,
        recent: recentErrors.slice(0, 10) // 最近10個錯誤
      },
      performance: performanceMetrics,
      recommendations: generateLogRecommendations(recentErrors, performanceMetrics)
    };

    return res.json(logSummary);
    
  } catch (error) {
    logger.error('Log analysis failed', { error });
    return res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 輔助函數
async function getMemoryHealthInfo() {
  const memory = process.memoryUsage();
  const heapUsedMB = memory.heapUsed / 1024 / 1024;
  
  return {
    status: heapUsedMB > 512 ? 'warning' : heapUsedMB > 1024 ? 'critical' : 'good',
    heapUsedMB: Math.round(heapUsedMB * 100) / 100,
    heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100,
    rssMB: Math.round(memory.rss / 1024 / 1024 * 100) / 100,
    externalMB: Math.round(memory.external / 1024 / 1024 * 100) / 100
  };
}

async function getSystemHealthInfo() {
  return {
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    environment: process.env.NODE_ENV || 'development'
  };
}

async function getDatabaseStats() {
  try {
    const [userCount, companyCount, proposalCount, projectCount] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.proposal.count(),
      prisma.project.count()
    ]);

    return {
      users: userCount,
      companies: companyCount,
      proposals: proposalCount,
      projects: projectCount,
      total: userCount + companyCount + proposalCount + projectCount
    };
  } catch (error) {
    logger.error('Failed to get database stats', { error });
    return { error: 'Failed to retrieve stats' };
  }
}

async function measureQuery(name: string, queryFn: () => Promise<any>) {
  const startTime = performance.now();
  try {
    const result = await queryFn();
    const duration = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      name,
      status: 'success',
      duration,
      recordCount: Array.isArray(result) ? result.length : result ? 1 : 0
    };
  } catch (error) {
    const duration = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      name,
      status: 'error',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function determineOverallHealth(dbHealth: any, memoryHealth: any, responseTime: number) {
  if (dbHealth.status === 'critical' || memoryHealth.status === 'critical' || responseTime > 5000) {
    return 'critical';
  }
  if (dbHealth.status === 'warning' || memoryHealth.status === 'warning' || responseTime > 2000) {
    return 'warning';
  }
  return 'healthy';
}

function generateDbRecommendations(queryTests: any[]) {
  const recommendations: string[] = [];
  const slowQueries = queryTests.filter(test => test.duration > 1000);
  
  if (slowQueries.length > 0) {
    recommendations.push('檢查慢查詢並考慮添加適當的數據庫索引');
  }
  
  const avgTime = queryTests.reduce((sum, test) => sum + test.duration, 0) / queryTests.length;
  if (avgTime > 500) {
    recommendations.push('考慮優化數據庫查詢或升級硬件配置');
  }
  
  return recommendations;
}

function generatePerformanceRecommendations(memory: any, metrics: any) {
  const recommendations: string[] = [];
  const heapUsedMB = memory.heapUsed / 1024 / 1024;
  
  if (heapUsedMB > 512) {
    recommendations.push('記憶體使用量較高，考慮優化記憶體使用或增加服務器記憶體');
  }
  
  if (metrics.errorRate > 0.05) {
    recommendations.push('錯誤率較高，建議檢查錯誤日誌並修復相關問題');
  }
  
  if (metrics.averageResponseTime > 2000) {
    recommendations.push('響應時間較長，建議優化API性能');
  }
  
  return recommendations;
}

function generateLogRecommendations(errors: any[], metrics: any) {
  const recommendations: string[] = [];
  
  if (errors.length > 100) {
    recommendations.push('錯誤數量較多，建議檢查並修復常見錯誤');
  }
  
  if (metrics.slowQueries > 50) {
    recommendations.push('存在較多慢查詢，建議優化數據庫查詢效能');
  }
  
  return recommendations;
}

export default router;