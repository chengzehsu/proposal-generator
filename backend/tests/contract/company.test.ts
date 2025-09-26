import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('公司資料 API 合約測試', () => {
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'companytest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '99999' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: '測試公司股份有限公司',
        tax_id: '99999999',
        address: '台北市測試區測試路123號',
        phone: '02-1234-5678',
        email: 'test@company.com',
        capital: 10000000,
        established_date: new Date('2020-01-01'),
        website: 'https://test-company.com'
      }
    });

    testCompanyId = testCompany.id;

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'companytest@example.com',
        password: hashedPassword,
        name: '公司測試用戶',
        role: 'ADMIN',
        company_id: testCompanyId,
      },
    });

    testUserId = testUser.id;

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'companytest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
  });

  describe('GET /api/v1/companies/basic', () => {
    it('應該返回當前用戶的公司基本資料', async () => {
      const response = await request(app)
        .get('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testCompanyId);
      expect(response.body).toHaveProperty('company_name', '測試公司股份有限公司');
      expect(response.body).toHaveProperty('tax_id', '99999999');
      expect(response.body).toHaveProperty('address', '台北市測試區測試路123號');
      expect(response.body).toHaveProperty('phone', '02-1234-5678');
      expect(response.body).toHaveProperty('email', 'test@company.com');
      expect(response.body).toHaveProperty('capital', '10000000');
      expect(response.body).toHaveProperty('website', 'https://test-company.com');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      expect(response.body).toHaveProperty('version');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get('/api/v1/companies/basic')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('應該拒絕無效的 token', async () => {
      const response = await request(app)
        .get('/api/v1/companies/basic')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('應該為沒有公司的用戶返回 404', async () => {
      // 創建沒有公司的用戶
      const hashedPassword = await bcrypt.hash('testPassword123', 12);
      const userWithoutCompany = await prisma.user.create({
        data: {
          email: 'nocompany@example.com',
          password: hashedPassword,
          name: '無公司用戶',
          role: 'ADMIN',
        },
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nocompany@example.com',
          password: 'testPassword123'
        });

      const response = await request(app)
        .get('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);

      // 清理
      await prisma.user.delete({ where: { id: userWithoutCompany.id } });
    });
  });

  describe('PUT /api/v1/companies/basic', () => {
    it('應該成功更新公司基本資料', async () => {
      const updateData = {
        company_name: '更新後的公司名稱',
        address: '台北市信義區信義路一段1號',
        phone: '02-9876-5432',
        email: 'updated@company.com',
        website: 'https://updated-company.com',
        capital: 20000000,
        version: 1 // 樂觀鎖版本
      };

      const response = await request(app)
        .put('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('company_name', '更新後的公司名稱');
      expect(response.body).toHaveProperty('address', '台北市信義區信義路一段1號');
      expect(response.body).toHaveProperty('phone', '02-9876-5432');
      expect(response.body).toHaveProperty('email', 'updated@company.com');
      expect(response.body).toHaveProperty('website', 'https://updated-company.com');
      expect(response.body).toHaveProperty('capital', '20000000');
      expect(response.body).toHaveProperty('version', 2); // 版本應該遞增
    });

    it('應該驗證統一編號格式', async () => {
      const invalidTaxIdData = {
        tax_id: '1234567', // 無效格式
        version: 1
      };

      const response = await request(app)
        .put('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTaxIdData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證電子信箱格式', async () => {
      const invalidEmailData = {
        email: 'invalid-email-format',
        version: 1
      };

      const response = await request(app)
        .put('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEmailData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證網站 URL 格式', async () => {
      const invalidWebsiteData = {
        website: 'not-a-valid-url',
        version: 1
      };

      const response = await request(app)
        .put('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidWebsiteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證資本額為非負數', async () => {
      const negativeCapitalData = {
        capital: -1000000,
        version: 1
      };

      const response = await request(app)
        .put('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(negativeCapitalData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該檢查樂觀鎖版本衝突', async () => {
      const outdatedVersionData = {
        company_name: '過時版本更新',
        version: 0 // 過時的版本號
      };

      const response = await request(app)
        .put('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(outdatedVersionData)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body.message).toContain('版本衝突');
    });

    it('應該拒絕重複的統一編號', async () => {
      // 創建另一家公司
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '另一家公司',
          tax_id: '88888888',
          address: '台中市測試區',
          phone: '04-1234-5678',
          email: 'another@company.com'
        }
      });

      const duplicateTaxIdData = {
        tax_id: '88888888', // 已存在的統編
        version: 1
      };

      const response = await request(app)
        .put('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateTaxIdData)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 409);

      // 清理
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該要求必要欄位', async () => {
      const incompleteData = {
        version: 1
        // 缺少必要欄位
      };

      const response = await request(app)
        .put('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該拒絕未認證的請求', async () => {
      const updateData = {
        company_name: '未認證更新',
        version: 1
      };

      const response = await request(app)
        .put('/api/v1/companies/basic')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});