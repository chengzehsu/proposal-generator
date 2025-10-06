/**
 * 標案狀態管理 API 測試 (FR-026)
 * 測試狀態更新、歷史記錄和狀態轉換驗證
 */

import request from 'supertest';
import app from '../../../src/index';
import { prisma } from '../../../src/utils/database';
import jwt from 'jsonwebtoken';

describe('Proposal Status Management API (FR-026)', () => {
  let authToken: string;
  let userId: string;
  let companyId: string;
  let proposalId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.proposalStatusHistory.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.proposalTemplate.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.user.deleteMany({});

    // 建立測試用戶
    const user = await prisma.user.create({
      data: {
        email: 'status-test@example.com',
        password: 'hashed_password',
        name: '狀態測試用戶',
        role: 'USER'
      }
    });
    userId = user.id;

    // 建立測試公司
    const company = await prisma.company.create({
      data: {
        user_id: userId,
        company_name: '狀態測試公司',
        tax_id: '12345678-status'
      }
    });
    companyId = company.id;

    // 更新用戶的公司關聯
    await prisma.user.update({
      where: { id: userId },
      data: { company_id: companyId }
    });

    // 建立測試範本
    const template = await prisma.proposalTemplate.create({
      data: {
        name: '測試範本',
        template_name: '測試範本',
        category: 'general',
        company_id: companyId
      }
    });

    // 建立測試標案
    const proposal = await prisma.proposal.create({
      data: {
        title: '測試標案',
        proposal_title: '測試標案',
        client_name: '測試客戶',
        template_id: template.id,
        status: 'DRAFT',
        user_id: userId,
        company_id: companyId
      }
    });
    proposalId = proposal.id;

    // 生成認證 token
    authToken = jwt.sign(
      {
        id: userId,
        email: user.email,
        company_id: companyId
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // 清理測試資料
    await prisma.proposalStatusHistory.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.proposalTemplate.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('PATCH /api/v1/proposals/:id/status', () => {
    it('應該成功更新狀態從 DRAFT 到 PENDING', async () => {
      const response = await request(app)
        .patch(`/api/v1/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'PENDING',
          note: '準備提交'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PENDING');
      expect(response.body.id).toBe(proposalId);
    });

    it('應該在狀態更新後記錄歷史', async () => {
      const history = await prisma.proposalStatusHistory.findMany({
        where: { proposal_id: proposalId },
        orderBy: { changed_at: 'desc' }
      });

      expect(history.length).toBeGreaterThan(0);
      const latestHistory = history[0];
      expect(latestHistory).toBeDefined();
      expect(latestHistory!.from_status).toBe('DRAFT');
      expect(latestHistory!.to_status).toBe('PENDING');
      expect(latestHistory!.changed_by).toBe(userId);
      expect(latestHistory!.note).toBe('準備提交');
    });

    it('應該成功更新狀態從 PENDING 到 SUBMITTED', async () => {
      const response = await request(app)
        .patch(`/api/v1/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'SUBMITTED',
          note: '已提交標案'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('SUBMITTED');
    });

    it('應該拒絕無效的狀態轉換 (SUBMITTED -> DRAFT)', async () => {
      const response = await request(app)
        .patch(`/api/v1/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'DRAFT'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid Status Transition');
      expect(response.body.message).toContain('不允許');
    });

    it('應該成功更新狀態從 SUBMITTED 到 WON', async () => {
      const response = await request(app)
        .patch(`/api/v1/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'WON',
          note: '恭喜得標'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('WON');
    });

    it('應該允許從任何狀態轉換到 CANCELLED', async () => {
      const response = await request(app)
        .patch(`/api/v1/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CANCELLED',
          note: '標案取消'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CANCELLED');
    });

    it('應該拒絕從 CANCELLED 轉換到其他狀態', async () => {
      const response = await request(app)
        .patch(`/api/v1/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'DRAFT'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid Status Transition');
    });

    it('應該拒絕相同狀態的轉換', async () => {
      const response = await request(app)
        .patch(`/api/v1/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CANCELLED'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('狀態未變更');
    });

    it('應該拒絕無效的狀態值', async () => {
      const response = await request(app)
        .patch(`/api/v1/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'INVALID_STATUS'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('應該拒絕不存在的標案', async () => {
      const response = await request(app)
        .patch('/api/v1/proposals/non-existent-id/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'PENDING'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('標書不存在');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .patch(`/api/v1/proposals/${proposalId}/status`)
        .send({
          status: 'PENDING'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/proposals/:id/status-history', () => {
    let testProposalId: string;

    beforeAll(async () => {
      // 建立新的測試標案用於歷史查詢
      const template = await prisma.proposalTemplate.findFirst({
        where: { company_id: companyId }
      });

      const proposal = await prisma.proposal.create({
        data: {
          title: '歷史測試標案',
          proposal_title: '歷史測試標案',
          client_name: '歷史測試客戶',
          template_id: template!.id,
          status: 'DRAFT',
          user_id: userId,
          company_id: companyId
        }
      });
      testProposalId = proposal.id;

      // 建立一系列狀態變更
      await request(app)
        .patch(`/api/v1/proposals/${testProposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'PENDING', note: '第一次變更' });

      await request(app)
        .patch(`/api/v1/proposals/${testProposalId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'SUBMITTED', note: '第二次變更' });
    });

    it('應該成功獲取狀態歷史', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}/status-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.proposal_id).toBe(testProposalId);
      expect(response.body.current_status).toBe('SUBMITTED');
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body.history.length).toBeGreaterThanOrEqual(2);
    });

    it('歷史記錄應該按時間倒序排列', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}/status-history`)
        .set('Authorization', `Bearer ${authToken}`);

      const history = response.body.history;
      expect(history[0].to_status).toBe('SUBMITTED');
      expect(history[1].to_status).toBe('PENDING');
    });

    it('歷史記錄應該包含完整資訊', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}/status-history`)
        .set('Authorization', `Bearer ${authToken}`);

      const firstHistory = response.body.history[0];
      expect(firstHistory).toHaveProperty('id');
      expect(firstHistory).toHaveProperty('from_status');
      expect(firstHistory).toHaveProperty('to_status');
      expect(firstHistory).toHaveProperty('changed_at');
      expect(firstHistory).toHaveProperty('changed_by');
      expect(firstHistory).toHaveProperty('note');
    });

    it('應該拒絕不存在的標案', async () => {
      const response = await request(app)
        .get('/api/v1/proposals/non-existent-id/status-history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('標書不存在');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}/status-history`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/proposals (狀態篩選)', () => {
    beforeAll(async () => {
      // 建立不同狀態的標案用於篩選測試
      const template = await prisma.proposalTemplate.findFirst({
        where: { company_id: companyId }
      });

      await prisma.proposal.create({
        data: {
          title: '草稿標案',
          proposal_title: '草稿標案',
          client_name: '客戶A',
          template_id: template!.id,
          status: 'DRAFT',
          user_id: userId,
          company_id: companyId
        }
      });

      await prisma.proposal.create({
        data: {
          title: '已提交標案',
          proposal_title: '已提交標案',
          client_name: '客戶B',
          template_id: template!.id,
          status: 'SUBMITTED',
          user_id: userId,
          company_id: companyId
        }
      });
    });

    it('應該能夠按狀態篩選標案', async () => {
      const response = await request(app)
        .get('/api/v1/proposals?status=DRAFT')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      // 至少應該有一個草稿狀態的標案
      const draftProposals = response.body.data.filter(
        (p: any) => p.status === 'DRAFT'
      );
      expect(draftProposals.length).toBeGreaterThan(0);
    });
  });

  describe('狀態轉換驗證邏輯', () => {
    it('應該支援完整的狀態轉換流程', async () => {
      // 建立新標案
      const template = await prisma.proposalTemplate.findFirst({
        where: { company_id: companyId }
      });

      const proposal = await prisma.proposal.create({
        data: {
          title: '完整流程測試',
          proposal_title: '完整流程測試',
          client_name: '流程測試客戶',
          template_id: template!.id,
          status: 'DRAFT',
          user_id: userId,
          company_id: companyId
        }
      });

      // DRAFT -> PENDING
      let response = await request(app)
        .patch(`/api/v1/proposals/${proposal.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'PENDING' });
      expect(response.status).toBe(200);

      // PENDING -> SUBMITTED
      response = await request(app)
        .patch(`/api/v1/proposals/${proposal.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'SUBMITTED' });
      expect(response.status).toBe(200);

      // SUBMITTED -> LOST
      response = await request(app)
        .patch(`/api/v1/proposals/${proposal.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'LOST' });
      expect(response.status).toBe(200);

      // LOST -> CANCELLED
      response = await request(app)
        .patch(`/api/v1/proposals/${proposal.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'CANCELLED' });
      expect(response.status).toBe(200);

      // 驗證歷史記錄
      const historyResponse = await request(app)
        .get(`/api/v1/proposals/${proposal.id}/status-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyResponse.body.history.length).toBe(4);
    });
  });
});
