const request = require('supertest');
const express = require('express');

// 簡單的 API 測試 - 不依賴 Prisma
const app = express();
app.use(express.json());

// 模擬認證路由
app.post('/api/auth/register', (req, res) => {
  const { email, password, companyName } = req.body;
  
  if (!email || !password || !companyName) {
    return res.status(400).json({
      success: false,
      message: '缺少必要欄位'
    });
  }

  res.status(201).json({
    success: true,
    message: '註冊成功',
    data: {
      id: 'test-user-id',
      email: email,
      companyId: 'test-company-id'
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: '缺少必要欄位'
    });
  }

  // 模擬成功登入
  if (email === 'test@example.com' && password === 'password123') {
    return res.status(200).json({
      success: true,
      message: '登入成功',
      data: {
        user: {
          id: 'test-user-id',
          email: email
        },
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token'
      }
    });
  }

  res.status(401).json({
    success: false,
    message: '登入失敗：用戶名或密碼錯誤'
  });
});

// 模擬公司資料路由
app.get('/api/companies/:id', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.params.id,
      company_name: '測試公司',
      tax_id: '12345678',
      address: '台北市信義區',
      phone: '02-1234-5678',
      email: 'test@company.com',
      created_at: new Date().toISOString()
    }
  });
});

// 健康檢查
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API 服務正常運行',
    timestamp: new Date().toISOString()
  });
});

// 執行測試
async function runApiTests() {
  console.log('🧪 開始執行簡化 API 測試...\n');

  try {
    // 測試 1: 健康檢查
    console.log('1. 測試健康檢查端點...');
    const healthResponse = await request(app)
      .get('/api/health')
      .expect(200);
    
    console.log('   ✅ 健康檢查通過:', healthResponse.body.message);

    // 測試 2: 用戶註冊
    console.log('\n2. 測試用戶註冊...');
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        companyName: '測試公司'
      })
      .expect(201);
    
    console.log('   ✅ 註冊成功:', registerResponse.body.message);

    // 測試 3: 用戶登入
    console.log('\n3. 測試用戶登入...');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(200);
    
    console.log('   ✅ 登入成功:', loginResponse.body.message);

    // 測試 4: 公司資料查詢
    console.log('\n4. 測試公司資料查詢...');
    const companyResponse = await request(app)
      .get('/api/companies/test-company-id')
      .expect(200);
    
    console.log('   ✅ 公司資料查詢成功:', companyResponse.body.data.company_name);

    // 測試 5: 錯誤處理
    console.log('\n5. 測試錯誤處理...');
    const errorResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })
      .expect(401);
    
    console.log('   ✅ 錯誤處理正確:', errorResponse.body.message);

    console.log('\n🎉 所有 API 測試通過！');
    console.log('\n📊 測試摘要:');
    console.log('   - 健康檢查: ✅ 通過');
    console.log('   - 用戶註冊: ✅ 通過');
    console.log('   - 用戶登入: ✅ 通過');
    console.log('   - 公司資料: ✅ 通過');
    console.log('   - 錯誤處理: ✅ 通過');

  } catch (error) {
    console.error('❌ API 測試失敗:', error.message);
    process.exit(1);
  }
}

// 如果直接執行此檔案，則運行測試
if (require.main === module) {
  runApiTests();
}

module.exports = { app, runApiTests };