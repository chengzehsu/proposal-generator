import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('獲獎紀錄 API 合約測試', () => {
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;
  let testAwardId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.award.deleteMany({
      where: { award_name: { startsWith: '測試獎項' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'awardtest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '66666' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: '獲獎測試公司',
        tax_id: '66666666',
        address: '台北市獲獎區測試路101號',
        phone: '02-6666-6666',
        email: 'award@company.com'
      }
    });

    testCompanyId = testCompany.id;

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'awardtest@example.com',
        password: hashedPassword,
        name: '獲獎測試用戶',
        role: 'ADMIN',
        company_id: testCompanyId,
      },
    });

    testUserId = testUser.id;

    // 創建測試獎項
    const testAward = await prisma.award.create({
      data: {
        company_id: testCompanyId,
        award_name: '測試獎項A',
        issuer: '測試頒發機構',
        award_date: new Date('2023-05-15'),
        description: '這是一個測試獎項的詳細描述',
        award_type: 'GOVERNMENT_GRANT',
        amount: 1000000,
        certificate_url: 'https://example.com/certificate.pdf'
      }
    });

    testAwardId = testAward.id;

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'awardtest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料
    await prisma.award.deleteMany({
      where: { company_id: testCompanyId }
    });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
  });

  describe('GET /api/v1/awards', () => {
    it('應該返回公司的獲獎紀錄列表', async () => {
      const response = await request(app)
        .get('/api/v1/awards')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const award = response.body[0];
      expect(award).toHaveProperty('id');
      expect(award).toHaveProperty('award_name', '測試獎項A');
      expect(award).toHaveProperty('issuer', '測試頒發機構');
      expect(award).toHaveProperty('award_date', '2023-05-15');
      expect(award).toHaveProperty('description', '這是一個測試獎項的詳細描述');
      expect(award).toHaveProperty('award_type', 'GOVERNMENT_GRANT');
      expect(award).toHaveProperty('amount', '1000000');
      expect(award).toHaveProperty('certificate_url', 'https://example.com/certificate.pdf');
      expect(award).toHaveProperty('created_at');
      expect(award).toHaveProperty('updated_at');
    });

    it('應該支援按獎項類型篩選', async () => {
      // 創建不同類型的獎項
      await prisma.award.create({
        data: {
          company_id: testCompanyId,
          award_name: '測試獎項B',
          issuer: '競賽主辦單位',
          award_type: 'COMPETITION',
          description: '競賽獎項'
        }
      });

      const response = await request(app)
        .get('/api/v1/awards?award_type=GOVERNMENT_GRANT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((award: any) => {
        expect(award.award_type).toBe('GOVERNMENT_GRANT');
      });
    });

    it('應該支援按日期範圍篩選', async () => {
      const response = await request(app)
        .get('/api/v1/awards?award_date_from=2023-01-01&award_date_to=2023-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((award: any) => {
        if (award.award_date) {
          const awardDate = new Date(award.award_date);
          expect(awardDate.getFullYear()).toBe(2023);
        }
      });
    });

    it('應該支援按頒發機構篩選', async () => {
      const response = await request(app)
        .get('/api/v1/awards?issuer=測試頒發機構')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.forEach((award: any) => {
        expect(award.issuer).toContain('測試頒發機構');
      });
    });

    it('應該支援分頁', async () => {
      const response = await request(app)
        .get('/api/v1/awards?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('應該按獲獎日期降序排列', async () => {
      // 創建額外獎項
      await prisma.award.create({
        data: {
          company_id: testCompanyId,
          award_name: '測試獎項C',
          issuer: '最新頒發機構',
          award_date: new Date('2024-01-01'),
          award_type: 'RECOGNITION'
        }
      });

      const response = await request(app)
        .get('/api/v1/awards')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.length > 1) {
        const firstDate = response.body[0].award_date ? new Date(response.body[0].award_date) : new Date(0);
        const secondDate = response.body[1].award_date ? new Date(response.body[1].award_date) : new Date(0);
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
      }
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get('/api/v1/awards')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/awards', () => {
    it('應該成功新增獲獎紀錄', async () => {
      const newAwardData = {
        award_name: '新測試獎項',
        issuer: '新頒發機構',
        award_date: '2024-03-20',
        description: '這是一個新的測試獎項',
        award_type: 'CERTIFICATION',
        amount: 500000,
        certificate_url: 'https://example.com/new-certificate.pdf'
      };

      const response = await request(app)
        .post('/api/v1/awards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newAwardData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('award_name', '新測試獎項');
      expect(response.body).toHaveProperty('issuer', '新頒發機構');
      expect(response.body).toHaveProperty('award_date', '2024-03-20');
      expect(response.body).toHaveProperty('description', '這是一個新的測試獎項');
      expect(response.body).toHaveProperty('award_type', 'CERTIFICATION');
      expect(response.body).toHaveProperty('amount', '500000');
      expect(response.body).toHaveProperty('certificate_url', 'https://example.com/new-certificate.pdf');
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 award_name, issuer 和 award_type
        description: '測試描述'
      };

      const response = await request(app)
        .post('/api/v1/awards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證獎項名稱長度', async () => {
      const invalidNameData = {
        award_name: 'A', // 太短
        issuer: '測試機構',
        award_type: 'RECOGNITION'
      };

      const response = await request(app)
        .post('/api/v1/awards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidNameData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證獎項類型', async () => {
      const invalidTypeData = {
        award_name: '類型測試獎項',
        issuer: '測試機構',
        award_type: 'INVALID_TYPE'
      };

      const response = await request(app)
        .post('/api/v1/awards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTypeData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證獎金為非負數', async () => {
      const negativeAmountData = {
        award_name: '金額測試獎項',
        issuer: '測試機構',
        award_type: 'GOVERNMENT_GRANT',
        amount: -100000
      };

      const response = await request(app)
        .post('/api/v1/awards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(negativeAmountData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證證書 URL 格式', async () => {
      const invalidUrlData = {
        award_name: 'URL測試獎項',
        issuer: '測試機構',
        award_type: 'CERTIFICATION',
        certificate_url: 'not-a-valid-url'
      };

      const response = await request(app)
        .post('/api/v1/awards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUrlData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證日期格式', async () => {
      const invalidDateData = {
        award_name: '日期測試獎項',
        issuer: '測試機構',
        award_type: 'RECOGNITION',
        award_date: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/v1/awards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const awardData = {
        award_name: '未認證獎項',
        issuer: '測試機構',
        award_type: 'RECOGNITION'
      };

      const response = await request(app)
        .post('/api/v1/awards')
        .send(awardData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/awards/:id', () => {
    it('應該成功更新獲獎紀錄', async () => {
      const updateData = {
        award_name: '更新後的獎項名稱',
        issuer: '更新後的頒發機構',
        award_date: '2023-08-15',
        description: '更新後的獎項描述',
        award_type: 'COMPETITION',
        amount: 2000000,
        certificate_url: 'https://example.com/updated-certificate.pdf'
      };

      const response = await request(app)
        .put(`/api/v1/awards/${testAwardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('award_name', '更新後的獎項名稱');
      expect(response.body).toHaveProperty('issuer', '更新後的頒發機構');
      expect(response.body).toHaveProperty('award_date', '2023-08-15');
      expect(response.body).toHaveProperty('description', '更新後的獎項描述');
      expect(response.body).toHaveProperty('award_type', 'COMPETITION');
      expect(response.body).toHaveProperty('amount', '2000000');
      expect(response.body).toHaveProperty('certificate_url', 'https://example.com/updated-certificate.pdf');
    });

    it('應該支援部分更新', async () => {
      const partialUpdateData = {
        award_name: '僅更新名稱'
      };

      const response = await request(app)
        .put(`/api/v1/awards/${testAwardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdateData)
        .expect(200);

      expect(response.body).toHaveProperty('award_name', '僅更新名稱');
      expect(response.body).toHaveProperty('issuer', '測試頒發機構'); // 其他欄位保持不變
    });

    it('應該驗證獎項是否存在', async () => {
      const updateData = {
        award_name: '更新不存在的獎項'
      };

      const response = await request(app)
        .put('/api/v1/awards/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該驗證獎項屬於當前公司', async () => {
      // 創建另一家公司的獎項
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '另一家公司',
          tax_id: '55555555',
          address: '其他地址',
          phone: '02-5555-5555',
          email: 'other@company.com'
        }
      });

      const otherAward = await prisma.award.create({
        data: {
          company_id: anotherCompany.id,
          award_name: '其他公司獎項',
          issuer: '其他機構',
          award_type: 'RECOGNITION'
        }
      });

      const updateData = {
        award_name: '嘗試更新其他公司獎項'
      };

      const response = await request(app)
        .put(`/api/v1/awards/${otherAward.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.award.delete({ where: { id: otherAward.id } });
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const updateData = {
        award_name: '未認證更新'
      };

      const response = await request(app)
        .put(`/api/v1/awards/${testAwardId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/awards/:id', () => {
    it('應該成功刪除獲獎紀錄', async () => {
      const response = await request(app)
        .delete(`/api/v1/awards/${testAwardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 驗證獎項已刪除
      const deletedAward = await prisma.award.findUnique({
        where: { id: testAwardId }
      });
      
      expect(deletedAward).toBeNull();
    });

    it('應該驗證獎項是否存在', async () => {
      const response = await request(app)
        .delete('/api/v1/awards/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證獎項屬於當前公司', async () => {
      // 創建另一家公司的獎項
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '刪除測試公司',
          tax_id: '44444444',
          address: '刪除測試地址',
          phone: '02-4444-4444',
          email: 'delete@company.com'
        }
      });

      const otherAward = await prisma.award.create({
        data: {
          company_id: anotherCompany.id,
          award_name: '其他公司獎項',
          issuer: '其他機構',
          award_type: 'RECOGNITION'
        }
      });

      const response = await request(app)
        .delete(`/api/v1/awards/${otherAward.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.award.delete({ where: { id: otherAward.id } });
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .delete(`/api/v1/awards/${testAwardId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/awards/:id', () => {
    it('應該返回指定獲獎紀錄詳情', async () => {
      const response = await request(app)
        .get(`/api/v1/awards/${testAwardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testAwardId);
      expect(response.body).toHaveProperty('award_name', '測試獎項A');
      expect(response.body).toHaveProperty('issuer', '測試頒發機構');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('award_type');
      expect(response.body).toHaveProperty('certificate_url');
    });

    it('應該驗證獎項是否存在', async () => {
      const response = await request(app)
        .get('/api/v1/awards/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證獎項屬於當前公司', async () => {
      // 創建另一家公司的獎項
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '查看測試公司',
          tax_id: '33333333',
          address: '查看測試地址',
          phone: '02-3333-3333',
          email: 'view@company.com'
        }
      });

      const otherAward = await prisma.award.create({
        data: {
          company_id: anotherCompany.id,
          award_name: '其他公司獎項',
          issuer: '其他機構',
          award_type: 'RECOGNITION'
        }
      });

      const response = await request(app)
        .get(`/api/v1/awards/${otherAward.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.award.delete({ where: { id: otherAward.id } });
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/awards/${testAwardId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/awards/statistics', () => {
    beforeEach(async () => {
      // 創建額外的獎項數據用於統計測試
      await prisma.award.createMany({
        data: [
          {
            company_id: testCompanyId,
            award_name: '政府補助獎項',
            issuer: '經濟部',
            award_type: 'GOVERNMENT_GRANT',
            amount: 3000000,
            award_date: new Date('2023-01-15')
          },
          {
            company_id: testCompanyId,
            award_name: '競賽獎項',
            issuer: '創新競賽委員會',
            award_type: 'COMPETITION',
            amount: 500000,
            award_date: new Date('2023-03-20')
          }
        ]
      });
    });

    it('應該返回獲獎統計數據', async () => {
      const response = await request(app)
        .get('/api/v1/awards/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('total_awards');
      expect(response.body).toHaveProperty('total_amount');
      expect(response.body).toHaveProperty('by_type');
      expect(response.body).toHaveProperty('by_year');
      expect(typeof response.body.total_awards).toBe('number');
      expect(typeof response.body.total_amount).toBe('string'); // Decimal 轉為字串
      expect(typeof response.body.by_type).toBe('object');
      expect(typeof response.body.by_year).toBe('object');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get('/api/v1/awards/statistics')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});