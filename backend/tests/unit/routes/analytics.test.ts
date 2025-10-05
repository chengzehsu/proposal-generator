import request from 'supertest';
import app from '../../../src/index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Analytics API', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;
  let proposalId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.proposal.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.award.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});

    // 建立測試公司
    const company = await prisma.company.create({
      data: {
        name: 'Analytics Test Company',
        tax_id: '12345678',
        address: 'Test Address',
        phone: '02-12345678',
        email: 'analytics@test.com',
      },
    });
    companyId = company.id;

    // 建立測試用戶
    const user = await prisma.user.create({
      data: {
        email: 'analytics@test.com',
        password_hash: 'hashed_password',
        name: 'Analytics Tester',
        company_id: companyId,
      },
    });
    userId = user.id;

    // 生成 JWT token
    authToken = jwt.sign(
      { userId: user.id, companyId: company.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // 建立歷史標案數據
    await prisma.proposal.createMany({
      data: [
        {
          title: '歷史案件 1',
          company_id: companyId,
          status: 'won',
          client_name: 'Client A',
        },
        {
          title: '歷史案件 2',
          company_id: companyId,
          status: 'won',
          client_name: 'Client A',
        },
        {
          title: '歷史案件 3',
          company_id: companyId,
          status: 'lost',
          client_name: 'Client B',
        },
        {
          title: '歷史案件 4',
          company_id: companyId,
          status: 'submitted',
          client_name: 'Client C',
        },
      ],
    });

    // 建立測試標案
    const testProposal = await prisma.proposal.create({
      data: {
        title: '測試標案',
        company_id: companyId,
        client_name: 'Client A',
        status: 'draft',
      },
    });
    proposalId = testProposal.id;

    // 建立公司資料
    await prisma.teamMember.create({
      data: {
        company_id: companyId,
        name: 'Test Member',
        position: 'Engineer',
      },
    });

    await prisma.project.create({
      data: {
        company_id: companyId,
        name: 'Test Project',
        client: 'Test Client',
        start_date: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.proposal.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.award.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /api/v1/analytics/:proposalId', () => {
    it('應該返回標案分析報告', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success_rate');
      expect(response.body).toHaveProperty('confidence_level');
      expect(response.body).toHaveProperty('factors');
      expect(response.body).toHaveProperty('best_practices');
      expect(response.body).toHaveProperty('data_points');
    });

    it('應該計算正確的成功率（基於歷史數據）', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // 歷史數據: 4 個標案中 2 個得標 = 50% 基礎成功率
      // 同客戶 (Client A): 2 個全得標 = 100%
      // 綜合計算應該 > 50%
      expect(response.body.success_rate).toBeGreaterThan(50);
    });

    it('應該返回影響因素分析', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.factors)).toBe(true);
      expect(response.body.factors.length).toBeGreaterThan(0);

      const factor = response.body.factors[0];
      expect(factor).toHaveProperty('factor');
      expect(factor).toHaveProperty('value');
      expect(factor).toHaveProperty('impact');
      expect(['positive', 'neutral', 'negative']).toContain(factor.impact);
    });

    it('應該返回最佳實踐建議', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.best_practices)).toBe(true);

      if (response.body.best_practices.length > 0) {
        const practice = response.body.best_practices[0];
        expect(practice).toHaveProperty('category');
        expect(practice).toHaveProperty('suggestion');
        expect(practice).toHaveProperty('priority');
        expect(['high', 'medium', 'low']).toContain(practice.priority);
      }
    });

    it('應該包含數據點統計', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data_points).toBeDefined();
      expect(response.body.data_points.total_proposals).toBe(5); // 4 歷史 + 1 當前
      expect(response.body.data_points.won_proposals).toBe(2);
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${proposalId}`);

      expect(response.status).toBe(401);
    });

    it('應該拒絕訪問其他公司的標案', async () => {
      // 建立另一個公司的標案
      const otherCompany = await prisma.company.create({
        data: {
          name: 'Other Company',
          tax_id: '87654321',
        },
      });

      const otherProposal = await prisma.proposal.create({
        data: {
          title: '其他公司標案',
          company_id: otherCompany.id,
          status: 'draft',
        },
      });

      const response = await request(app)
        .get(`/api/v1/analytics/${otherProposal.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);

      // 清理
      await prisma.proposal.delete({ where: { id: otherProposal.id } });
      await prisma.company.delete({ where: { id: otherCompany.id } });
    });

    it('應該在沒有歷史數據時返回基礎分析', async () => {
      // 建立新公司和標案（無歷史數據）
      const newCompany = await prisma.company.create({
        data: {
          name: 'New Company',
          tax_id: '11111111',
        },
      });

      const newUser = await prisma.user.create({
        data: {
          email: 'new@test.com',
          password_hash: 'hashed',
          name: 'New User',
          company_id: newCompany.id,
        },
      });

      const newToken = jwt.sign(
        { userId: newUser.id, companyId: newCompany.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const newProposal = await prisma.proposal.create({
        data: {
          title: '新公司首個標案',
          company_id: newCompany.id,
          status: 'draft',
        },
      });

      const response = await request(app)
        .get(`/api/v1/analytics/${newProposal.id}`)
        .set('Authorization', `Bearer ${newToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success_rate).toBeGreaterThanOrEqual(0);
      expect(response.body.confidence_level).toBe('low');

      // 清理
      await prisma.proposal.delete({ where: { id: newProposal.id } });
      await prisma.user.delete({ where: { id: newUser.id } });
      await prisma.company.delete({ where: { id: newCompany.id } });
    });

    it('應該考慮資料完整度對成功率的影響', async () => {
      // 當前公司有團隊成員和專案 -> 資料完整度加成
      const response = await request(app)
        .get(`/api/v1/analytics/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // 找到資料完整度因素
      const completenessFactor = response.body.factors.find(
        (f: any) => f.factor === '公司資料完整度'
      );

      expect(completenessFactor).toBeDefined();
      expect(completenessFactor.value).toContain('%');
    });
  });
});
