import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('標書管理 API 合約測試', () => {
  let authToken: string;
  let testUserId: string;
  let testCompanyId: string;
  let testTemplateId: string;
  let testProposalId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.proposalSection.deleteMany({
      where: { proposal: { proposal_name: { startsWith: '測試標書' } } }
    });
    await prisma.proposal.deleteMany({
      where: { proposal_name: { startsWith: '測試標書' } }
    });
    await prisma.templateSection.deleteMany({
      where: { template: { template_name: { startsWith: '標書測試範本' } } }
    });
    await prisma.proposalTemplate.deleteMany({
      where: { template_name: { startsWith: '標書測試範本' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'proposaltest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '11111' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: '標書測試公司',
        tax_id: '11111111',
        address: '台北市標書區測試路505號',
        phone: '02-1111-1111',
        email: 'proposal@company.com'
      }
    });

    testCompanyId = testCompany.id;

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'proposaltest@example.com',
        password: hashedPassword,
        name: '標書測試用戶',
        role: 'ADMIN',
        company_id: testCompanyId,
      },
    });

    testUserId = testUser.id;

    // 創建測試範本
    const testTemplate = await prisma.proposalTemplate.create({
      data: {
        template_name: '標書測試範本',
        template_type: 'GOVERNMENT_GRANT',
        description: '用於標書測試的範本',
        created_by: testUserId
      }
    });

    testTemplateId = testTemplate.id;

    // 創建測試範本章節
    await prisma.templateSection.createMany({
      data: [
        {
          template_id: testTemplateId,
          section_name: '公司基本資料',
          section_order: 1,
          is_required: true,
          data_types: ['COMPANY_BASIC']
        },
        {
          template_id: testTemplateId,
          section_name: '執行計畫',
          section_order: 2,
          is_required: true,
          data_types: ['CUSTOM_INPUT']
        }
      ]
    });

    // 創建測試標書
    const testProposal = await prisma.proposal.create({
      data: {
        proposal_name: '測試標書A',
        template_id: testTemplateId,
        company_id: testCompanyId,
        status: 'DRAFT',
        created_by: testUserId,
        last_edited_by: testUserId,
        word_count: 150,
        generated_with_ai: false
      }
    });

    testProposalId = testProposal.id;

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'proposaltest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料
    await prisma.proposalSection.deleteMany({
      where: { proposal_id: testProposalId }
    });
    await prisma.proposal.deleteMany({
      where: { company_id: testCompanyId }
    });
    await prisma.templateSection.deleteMany({
      where: { template_id: testTemplateId }
    });
    await prisma.proposalTemplate.delete({
      where: { id: testTemplateId }
    });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
  });

  describe('GET /api/v1/proposals', () => {
    it('應該返回公司的標書列表', async () => {
      const response = await request(app)
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const proposal = response.body[0];
      expect(proposal).toHaveProperty('id');
      expect(proposal).toHaveProperty('proposal_name', '測試標書A');
      expect(proposal).toHaveProperty('template_id', testTemplateId);
      expect(proposal).toHaveProperty('company_id', testCompanyId);
      expect(proposal).toHaveProperty('status', 'DRAFT');
      expect(proposal).toHaveProperty('created_by', testUserId);
      expect(proposal).toHaveProperty('last_edited_by', testUserId);
      expect(proposal).toHaveProperty('word_count', 150);
      expect(proposal).toHaveProperty('generated_with_ai', false);
      expect(proposal).toHaveProperty('created_at');
      expect(proposal).toHaveProperty('updated_at');
    });

    it('應該支援按狀態篩選', async () => {
      // 創建不同狀態的標書
      await prisma.proposal.create({
        data: {
          proposal_name: '測試標書B',
          template_id: testTemplateId,
          company_id: testCompanyId,
          status: 'COMPLETED',
          created_by: testUserId,
          last_edited_by: testUserId
        }
      });

      const response = await request(app)
        .get('/api/v1/proposals?status=DRAFT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((proposal: any) => {
        expect(proposal.status).toBe('DRAFT');
      });
    });

    it('應該支援按範本篩選', async () => {
      // 創建另一個範本和標書
      const anotherTemplate = await prisma.proposalTemplate.create({
        data: {
          template_name: '另一個測試範本',
          template_type: 'ENTERPRISE_BID',
          created_by: testUserId
        }
      });

      await prisma.proposal.create({
        data: {
          proposal_name: '測試標書C',
          template_id: anotherTemplate.id,
          company_id: testCompanyId,
          created_by: testUserId,
          last_edited_by: testUserId
        }
      });

      const response = await request(app)
        .get(`/api/v1/proposals?template_id=${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.forEach((proposal: any) => {
        expect(proposal.template_id).toBe(testTemplateId);
      });

      // 清理
      await prisma.proposal.deleteMany({ where: { template_id: anotherTemplate.id } });
      await prisma.proposalTemplate.delete({ where: { id: anotherTemplate.id } });
    });

    it('應該支援分頁', async () => {
      const response = await request(app)
        .get('/api/v1/proposals?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('應該按更新時間降序排列', async () => {
      // 創建額外標書
      await prisma.proposal.create({
        data: {
          proposal_name: '測試標書D',
          template_id: testTemplateId,
          company_id: testCompanyId,
          created_by: testUserId,
          last_edited_by: testUserId
        }
      });

      const response = await request(app)
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.length > 1) {
        const firstDate = new Date(response.body[0].updated_at);
        const secondDate = new Date(response.body[1].updated_at);
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
      }
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get('/api/v1/proposals')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/proposals', () => {
    it('應該成功新增標書', async () => {
      const newProposalData = {
        proposal_name: '新測試標書',
        template_id: testTemplateId,
        initial_sections: [
          {
            section_name: '公司基本資料',
            content: '我們是一家專業的科技公司',
            section_order: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProposalData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('proposal_name', '新測試標書');
      expect(response.body).toHaveProperty('template_id', testTemplateId);
      expect(response.body).toHaveProperty('company_id', testCompanyId);
      expect(response.body).toHaveProperty('status', 'DRAFT');
      expect(response.body).toHaveProperty('created_by', testUserId);
      expect(response.body).toHaveProperty('last_edited_by', testUserId);
      expect(response.body).toHaveProperty('word_count');
      expect(response.body).toHaveProperty('generated_with_ai', false);
      expect(response.body).toHaveProperty('sections');
      expect(Array.isArray(response.body.sections)).toBe(true);
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 proposal_name 和 template_id
        status: 'DRAFT'
      };

      const response = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證標書名稱長度', async () => {
      const invalidNameData = {
        proposal_name: 'A', // 太短
        template_id: testTemplateId
      };

      const response = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidNameData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證範本是否存在', async () => {
      const invalidTemplateData = {
        proposal_name: '範本測試標書',
        template_id: 'nonexistent-template-id'
      };

      const response = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTemplateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該拒絕未認證的請求', async () => {
      const proposalData = {
        proposal_name: '未認證標書',
        template_id: testTemplateId
      };

      const response = await request(app)
        .post('/api/v1/proposals')
        .send(proposalData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/proposals/:id', () => {
    it('應該成功更新標書', async () => {
      const updateData = {
        proposal_name: '更新後的標書名稱',
        status: 'IN_REVIEW'
      };

      const response = await request(app)
        .put(`/api/v1/proposals/${testProposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('proposal_name', '更新後的標書名稱');
      expect(response.body).toHaveProperty('status', 'IN_REVIEW');
      expect(response.body).toHaveProperty('last_edited_by', testUserId);
      // updated_at 應該被更新
      expect(new Date(response.body.updated_at).getTime()).toBeGreaterThan(new Date(response.body.created_at).getTime());
    });

    it('應該支援部分更新', async () => {
      const partialUpdateData = {
        proposal_name: '僅更新名稱'
      };

      const response = await request(app)
        .put(`/api/v1/proposals/${testProposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdateData)
        .expect(200);

      expect(response.body).toHaveProperty('proposal_name', '僅更新名稱');
      expect(response.body).toHaveProperty('status', 'DRAFT'); // 其他欄位保持不變
    });

    it('應該驗證標書是否存在', async () => {
      const updateData = {
        proposal_name: '更新不存在的標書'
      };

      const response = await request(app)
        .put('/api/v1/proposals/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該驗證標書屬於當前公司', async () => {
      // 創建另一家公司的標書
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '另一家公司',
          tax_id: '22222222',
          address: '其他地址',
          phone: '02-2222-2222',
          email: 'other@company.com'
        }
      });

      const anotherUser = await prisma.user.create({
        data: {
          email: 'another@example.com',
          password: await bcrypt.hash('password', 12),
          name: '另一個用戶',
          role: 'ADMIN',
          company_id: anotherCompany.id
        }
      });

      const otherProposal = await prisma.proposal.create({
        data: {
          proposal_name: '其他公司標書',
          template_id: testTemplateId,
          company_id: anotherCompany.id,
          created_by: anotherUser.id,
          last_edited_by: anotherUser.id
        }
      });

      const updateData = {
        proposal_name: '嘗試更新其他公司標書'
      };

      const response = await request(app)
        .put(`/api/v1/proposals/${otherProposal.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.proposal.delete({ where: { id: otherProposal.id } });
      await prisma.user.delete({ where: { id: anotherUser.id } });
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該拒絕更新已提交的標書', async () => {
      // 將標書狀態設為已提交
      await prisma.proposal.update({
        where: { id: testProposalId },
        data: { status: 'SUBMITTED' }
      });

      const updateData = {
        proposal_name: '嘗試更新已提交標書'
      };

      const response = await request(app)
        .put(`/api/v1/proposals/${testProposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body.message).toContain('已提交的標書不可修改');
    });

    it('應該拒絕未認證的請求', async () => {
      const updateData = {
        proposal_name: '未認證更新'
      };

      const response = await request(app)
        .put(`/api/v1/proposals/${testProposalId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/proposals/:id', () => {
    it('應該成功刪除標書', async () => {
      const response = await request(app)
        .delete(`/api/v1/proposals/${testProposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 驗證標書已刪除
      const deletedProposal = await prisma.proposal.findUnique({
        where: { id: testProposalId }
      });
      
      expect(deletedProposal).toBeNull();
    });

    it('應該驗證標書是否存在', async () => {
      const response = await request(app)
        .delete('/api/v1/proposals/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕刪除已提交的標書', async () => {
      // 將標書狀態設為已提交
      await prisma.proposal.update({
        where: { id: testProposalId },
        data: { status: 'SUBMITTED' }
      });

      const response = await request(app)
        .delete(`/api/v1/proposals/${testProposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body.message).toContain('已提交的標書不可刪除');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .delete(`/api/v1/proposals/${testProposalId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/proposals/:id', () => {
    it('應該返回指定標書詳情', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testProposalId);
      expect(response.body).toHaveProperty('proposal_name', '測試標書A');
      expect(response.body).toHaveProperty('template_id', testTemplateId);
      expect(response.body).toHaveProperty('status', 'DRAFT');
      expect(response.body).toHaveProperty('template');
      expect(response.body.template).toHaveProperty('template_name');
      expect(response.body).toHaveProperty('sections');
      expect(Array.isArray(response.body.sections)).toBe(true);
    });

    it('應該驗證標書是否存在', async () => {
      const response = await request(app)
        .get('/api/v1/proposals/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/proposals/:id/duplicate', () => {
    it('應該成功複製標書', async () => {
      const duplicateData = {
        proposal_name: '複製的測試標書'
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).not.toBe(testProposalId); // 新的 ID
      expect(response.body).toHaveProperty('proposal_name', '複製的測試標書');
      expect(response.body).toHaveProperty('template_id', testTemplateId); // 繼承原標書範本
      expect(response.body).toHaveProperty('status', 'DRAFT'); // 重設為草稿狀態
      expect(response.body).toHaveProperty('created_by', testUserId);
      expect(response.body).toHaveProperty('last_edited_by', testUserId);
    });

    it('應該驗證標書是否存在', async () => {
      const duplicateData = {
        proposal_name: '複製不存在的標書'
      };

      const response = await request(app)
        .post('/api/v1/proposals/nonexistent-id/duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const duplicateData = {
        proposal_name: '未認證複製'
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/duplicate`)
        .send(duplicateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});