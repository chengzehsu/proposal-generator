/**
 * 標案轉換為實績功能測試
 * 測試重複轉換防護機制
 */

import request from 'supertest';
import app from '../../../src/index';
import { prisma } from '../../../src/utils/database';
import jwt from 'jsonwebtoken';

describe('Proposal Conversion API', () => {
  let authToken: string;
  let userId: string;
  let companyId: string;
  let wonProposalId: string;
  let draftProposalId: string;
  let convertedProposalId: string;
  let existingProjectId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.project.deleteMany({});
    await prisma.proposalStatusHistory.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.proposalTemplate.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.user.deleteMany({});

    // 建立測試用戶
    const user = await prisma.user.create({
      data: {
        email: 'convert-test@example.com',
        password: 'hashed_password',
        name: '轉換測試用戶',
        role: 'USER'
      }
    });
    userId = user.id;

    // 建立測試公司
    const company = await prisma.company.create({
      data: {
        user_id: userId,
        company_name: '轉換測試公司',
        tax_id: '12345678-convert'
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

    // 建立得標標案
    const wonProposal = await prisma.proposal.create({
      data: {
        title: '得標標案',
        proposal_title: '得標標案',
        client_name: '測試客戶A',
        estimated_amount: '1000000',
        template_id: template.id,
        status: 'WON',
        user_id: userId,
        company_id: companyId
      }
    });
    wonProposalId = wonProposal.id;

    // 建立草稿標案
    const draftProposal = await prisma.proposal.create({
      data: {
        title: '草稿標案',
        proposal_title: '草稿標案',
        client_name: '測試客戶B',
        template_id: template.id,
        status: 'DRAFT',
        user_id: userId,
        company_id: companyId
      }
    });
    draftProposalId = draftProposal.id;

    // 建立已轉換的標案和實績
    const existingProject = await prisma.project.create({
      data: {
        name: '已存在的專案',
        project_name: '已存在的專案',
        description: '測試描述',
        client_name: '測試客戶C',
        amount: '2000000',
        company_id: companyId,
        source_proposal_id: null
      }
    });
    existingProjectId = existingProject.id;

    const convertedProposal = await prisma.proposal.create({
      data: {
        title: '已轉換標案',
        proposal_title: '已轉換標案',
        client_name: '測試客戶C',
        estimated_amount: '2000000',
        template_id: template.id,
        status: 'WON',
        user_id: userId,
        company_id: companyId,
        converted_to_project_id: existingProjectId,
        converted_at: new Date(),
        converted_by: userId
      }
    });
    convertedProposalId = convertedProposal.id;

    // 更新專案的來源標案
    await prisma.project.update({
      where: { id: existingProjectId },
      data: { source_proposal_id: convertedProposalId }
    });

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
    await prisma.project.deleteMany({});
    await prisma.proposalStatusHistory.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.proposalTemplate.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/v1/proposals/:id/convert-to-project', () => {
    it('應該成功轉換得標標案為實績', async () => {
      const response = await request(app)
        .post(`/api/v1/proposals/${wonProposalId}/convert-to-project`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_name: '新專案',
          description: '測試專案描述',
          client_name: '測試客戶A',
          amount: 1000000,
          start_date: '2025-01-01',
          end_date: '2025-12-31'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.project_name).toBe('新專案');
      expect(response.body.proposal).toBeDefined();
      expect(response.body.proposal.converted_to_project_id).toBeDefined();
    });

    it('應該拒絕轉換不存在的標案', async () => {
      const response = await request(app)
        .post('/api/v1/proposals/non-existent-id/convert-to-project')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_name: '測試專案',
          description: '測試描述'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toBe('標案不存在');
    });

    it('應該拒絕轉換非得標標案', async () => {
      const response = await request(app)
        .post(`/api/v1/proposals/${draftProposalId}/convert-to-project`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_name: '測試專案',
          description: '測試描述'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_STATUS');
      expect(response.body.message).toBe('只有得標標案才能轉換為實績');
    });

    it('應該拒絕重複轉換 (force=false)', async () => {
      const response = await request(app)
        .post(`/api/v1/proposals/${convertedProposalId}/convert-to-project`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_name: '新專案',
          description: '測試描述',
          force: false
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ALREADY_CONVERTED');
      expect(response.body.message).toBe('此標案已轉換為實績案例');
      expect(response.body.existing_project).toBeDefined();
    });

    it('應該允許強制重複轉換 (force=true)', async () => {
      const response = await request(app)
        .post(`/api/v1/proposals/${convertedProposalId}/convert-to-project`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_name: '強制轉換的新專案',
          description: '測試強制轉換',
          force: true
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.warning).toBeDefined();
      expect(response.body.warning.type).toBe('DUPLICATE_CONVERSION');
    });

    it('應該驗證結束日期不能早於開始日期', async () => {
      // 建立新的得標標案
      const newProposal = await prisma.proposal.create({
        data: {
          title: '測試日期標案',
          proposal_title: '測試日期標案',
          client_name: '測試客戶',
          estimated_amount: '500000',
          template_id: (await prisma.proposalTemplate.findFirst({ where: { company_id: companyId } }))!.id,
          status: 'WON',
          user_id: userId,
          company_id: companyId
        }
      });

      const response = await request(app)
        .post(`/api/v1/proposals/${newProposal.id}/convert-to-project`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_name: '測試專案',
          description: '測試描述',
          start_date: '2025-12-31',
          end_date: '2025-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('結束日期不能早於開始日期');

      // 清理
      await prisma.proposal.delete({ where: { id: newProposal.id } });
    });

    it('應該驗證必填欄位', async () => {
      const response = await request(app)
        .post(`/api/v1/proposals/${wonProposalId}/convert-to-project`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_name: '測試專案'
          // 缺少 description 必填欄位
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/v1/proposals/:id/conversion-status', () => {
    it('應該返回未轉換標案的狀態', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${draftProposalId}/conversion-status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.proposal_id).toBe(draftProposalId);
      expect(response.body.is_converted).toBe(false);
      expect(response.body.project).toBeNull();
    });

    it('應該返回已轉換標案的狀態', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${convertedProposalId}/conversion-status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.proposal_id).toBe(convertedProposalId);
      expect(response.body.is_converted).toBe(true);
      expect(response.body.converted_at).toBeDefined();
      expect(response.body.converted_by).toBe(userId);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.id).toBe(existingProjectId);
    });

    it('應該返回 404 當標案不存在', async () => {
      const response = await request(app)
        .get('/api/v1/proposals/non-existent-id/conversion-status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toBe('標案不存在');
    });
  });
});
