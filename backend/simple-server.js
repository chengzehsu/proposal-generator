const express = require('express');
const cors = require('cors');

// 簡單的測試伺服器，用於驗證前後端整合
const app = express();
const PORT = 3001;

// 基本中間件
app.use(cors());
app.use(express.json());

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: '後端服務正常運行'
  });
});

// API 根端點
app.get('/api/v1', (req, res) => {
  res.json({
    message: '智能標書產生器 API v1.0.0 - 簡化版',
    status: 'ready',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      companies: '/api/v1/companies',
      templates: '/api/v1/templates',
      proposals: '/api/v1/proposals',
      ai: '/api/v1/ai',
      exports: '/api/v1/exports',
    },
  });
});

// 模擬認證端點
app.post('/api/v1/auth/login', (req, res) => {
  res.json({
    data: {
      user: { id: '1', name: '測試用戶', email: 'test@example.com' },
      token: 'test-jwt-token',
      refreshToken: 'test-refresh-token'
    },
    message: '登入成功'
  });
});

// 模擬獲取公司資料
app.get('/api/v1/companies/basic', (req, res) => {
  res.json({
    data: {
      id: '1',
      company_name: '測試公司',
      tax_id: '12345678',
      address: '台灣台北市',
      phone: '02-12345678',
      email: 'contact@testcompany.com'
    }
  });
});

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `無法找到路徑: ${req.originalUrl}`,
    statusCode: 404
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('伺服器錯誤:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: '伺服器內部錯誤',
    statusCode: 500
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 簡化後端伺服器啟動成功 - http://localhost:${PORT}`);
  console.log(`🩺 健康檢查: http://localhost:${PORT}/health`);
  console.log(`📡 API 根端點: http://localhost:${PORT}/api/v1`);
});

module.exports = app;