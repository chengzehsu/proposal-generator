import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('範本章節 API 合約測試', () => {
  let authToken: string;
  let testUserId: string;
  let testTemplateId: string;
  let testSectionId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.templateSection.deleteMany({
      where: { section_name: { startsWith: '測試章節' } }
    });
    await prisma.proposalTemplate.deleteMany({
      where: { template_name: { startsWith: '章節測試範本' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'sectiontest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '77777' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: '章節測試公司',
        tax_id: '77777777',
        address: '台北市章節區測試路303號',
        phone: '02-7777-7777',
        email: 'section@company.com'
      }
    });

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'sectiontest@example.com',
        password: hashedPassword,
        name: '章節測試用戶',
        role: 'ADMIN',
        company_id: testCompany.id,
      },
    });

    testUserId = testUser.id;

    // 創建測試範本
    const testTemplate = await prisma.proposalTemplate.create({
      data: {
        template_name: '章節測試範本',
        template_type: 'GOVERNMENT_GRANT',
        description: '用於章節測試的範本',
        created_by: testUserId
      }
    });

    testTemplateId = testTemplate.id;

    // 創建測試章節
    const testSection = await prisma.templateSection.create({
      data: {
        template_id: testTemplateId,
        section_name: '測試章節A',
        section_order: 1,
        is_required: true,
        min_words: 100,
        max_words: 500,
        content_hint: '這是一個測試章節',
        data_types: ['COMPANY_BASIC', 'COMPANY_PROFILE'],
        score_weight: 25.00
      }
    });

    testSectionId = testSection.id;

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'sectiontest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料
    await prisma.templateSection.deleteMany({
      where: { template_id: testTemplateId }
    });
    await prisma.proposalTemplate.delete({
      where: { id: testTemplateId }
    });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '77777' } }
    });
  });

  describe('GET /api/v1/templates/:id/sections', () => {
    it('應該返回指定範本的章節列表', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const section = response.body[0];
      expect(section).toHaveProperty('id');
      expect(section).toHaveProperty('template_id', testTemplateId);
      expect(section).toHaveProperty('section_name', '測試章節A');
      expect(section).toHaveProperty('section_order', 1);
      expect(section).toHaveProperty('is_required', true);
      expect(section).toHaveProperty('min_words', 100);
      expect(section).toHaveProperty('max_words', 500);
      expect(section).toHaveProperty('content_hint', '這是一個測試章節');
      expect(section).toHaveProperty('data_types');
      expect(Array.isArray(section.data_types)).toBe(true);
      expect(section.data_types).toEqual(['COMPANY_BASIC', 'COMPANY_PROFILE']);
      expect(section).toHaveProperty('score_weight', '25.00');
      expect(section).toHaveProperty('created_at');
      expect(section).toHaveProperty('updated_at');
    });

    it('應該按章節順序排列', async () => {
      // 創建額外章節
      await prisma.templateSection.create({
        data: {
          template_id: testTemplateId,
          section_name: '測試章節B',
          section_order: 2,
          is_required: false
        }
      });

      await prisma.templateSection.create({
        data: {
          template_id: testTemplateId,
          section_name: '測試章節C',
          section_order: 0 // 應該排在最前面
        }
      });

      const response = await request(app)
        .get(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBe(3);
      expect(response.body[0].section_order).toBe(0);
      expect(response.body[1].section_order).toBe(1);
      expect(response.body[2].section_order).toBe(2);
    });

    it('應該驗證範本是否存在', async () => {
      const response = await request(app)
        .get('/api/v1/templates/nonexistent-id/sections')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該驗證用戶權限（僅能查看自己的範本章節）', async () => {
      // 創建另一個用戶的範本
      const anotherUser = await prisma.user.create({
        data: {
          email: 'anothersection@example.com',
          password: await bcrypt.hash('password', 12),
          name: '另一個用戶',
          role: 'ADMIN'
        }
      });

      const otherTemplate = await prisma.proposalTemplate.create({
        data: {
          template_name: '其他用戶範本',
          template_type: 'CUSTOM',
          created_by: anotherUser.id
        }
      });

      const response = await request(app)
        .get(`/api/v1/templates/${otherTemplate.id}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.proposalTemplate.delete({ where: { id: otherTemplate.id } });
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${testTemplateId}/sections`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/templates/:id/sections', () => {
    it('應該成功新增章節', async () => {
      const newSectionData = {
        section_name: '新測試章節',
        section_order: 2,
        is_required: false,
        min_words: 200,
        max_words: 800,
        content_hint: '這是新增的測試章節',
        data_types: ['TEAM_MEMBERS', 'PROJECTS'],
        score_weight: 30.00
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newSectionData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('template_id', testTemplateId);
      expect(response.body).toHaveProperty('section_name', '新測試章節');
      expect(response.body).toHaveProperty('section_order', 2);
      expect(response.body).toHaveProperty('is_required', false);
      expect(response.body).toHaveProperty('min_words', 200);
      expect(response.body).toHaveProperty('max_words', 800);
      expect(response.body).toHaveProperty('content_hint', '這是新增的測試章節');
      expect(response.body).toHaveProperty('data_types');
      expect(response.body.data_types).toEqual(['TEAM_MEMBERS', 'PROJECTS']);
      expect(response.body).toHaveProperty('score_weight', '30.00');
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 section_name 和 section_order
        is_required: true
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證章節名稱長度', async () => {
      const invalidNameData = {
        section_name: 'A', // 太短
        section_order: 3
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidNameData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證章節順序為非負整數', async () => {
      const invalidOrderData = {
        section_name: '順序測試章節',
        section_order: -1 // 負數
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOrderData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證字數限制邏輯', async () => {
      const invalidWordsData = {
        section_name: '字數測試章節',
        section_order: 4,
        min_words: 1000,
        max_words: 500 // max_words 小於 min_words
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidWordsData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證評分權重範圍', async () => {
      const invalidWeightData = {
        section_name: '權重測試章節',
        section_order: 5,
        score_weight: 150.00 // 超過 100
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidWeightData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證資料來源類型', async () => {
      const invalidDataTypesData = {
        section_name: '資料類型測試章節',
        section_order: 6,
        data_types: ['INVALID_TYPE']
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDataTypesData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕重複的章節順序', async () => {
      const duplicateOrderData = {
        section_name: '重複順序章節',
        section_order: 1 // 已存在的順序
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateOrderData)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 409);
    });

    it('應該拒絕未認證的請求', async () => {
      const sectionData = {
        section_name: '未認證章節',
        section_order: 7
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections`)
        .send(sectionData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/templates/:templateId/sections/:sectionId', () => {
    it('應該成功更新章節', async () => {
      const updateData = {
        section_name: '更新後的章節名稱',
        section_order: 3,
        is_required: false,
        min_words: 150,
        max_words: 600,
        content_hint: '更新後的章節提示',
        data_types: ['AWARDS', 'CAPABILITIES'],
        score_weight: 35.00
      };

      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}/sections/${testSectionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('section_name', '更新後的章節名稱');
      expect(response.body).toHaveProperty('section_order', 3);
      expect(response.body).toHaveProperty('is_required', false);
      expect(response.body).toHaveProperty('min_words', 150);
      expect(response.body).toHaveProperty('max_words', 600);
      expect(response.body).toHaveProperty('content_hint', '更新後的章節提示');
      expect(response.body.data_types).toEqual(['AWARDS', 'CAPABILITIES']);
      expect(response.body).toHaveProperty('score_weight', '35.00');
    });

    it('應該支援部分更新', async () => {
      const partialUpdateData = {
        section_name: '僅更新名稱'
      };

      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}/sections/${testSectionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdateData)
        .expect(200);

      expect(response.body).toHaveProperty('section_name', '僅更新名稱');
      expect(response.body).toHaveProperty('section_order', 1); // 其他欄位保持不變
    });

    it('應該驗證章節是否存在', async () => {
      const updateData = {
        section_name: '更新不存在的章節'
      };

      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}/sections/nonexistent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該拒絕未認證的請求', async () => {
      const updateData = {
        section_name: '未認證更新'
      };

      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}/sections/${testSectionId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/templates/:templateId/sections/:sectionId', () => {
    it('應該成功刪除章節', async () => {
      const response = await request(app)
        .delete(`/api/v1/templates/${testTemplateId}/sections/${testSectionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 驗證章節已刪除
      const deletedSection = await prisma.templateSection.findUnique({
        where: { id: testSectionId }
      });
      
      expect(deletedSection).toBeNull();
    });

    it('應該驗證章節是否存在', async () => {
      const response = await request(app)
        .delete(`/api/v1/templates/${testTemplateId}/sections/nonexistent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .delete(`/api/v1/templates/${testTemplateId}/sections/${testSectionId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/templates/:templateId/sections/:sectionId', () => {
    it('應該返回指定章節詳情', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${testTemplateId}/sections/${testSectionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testSectionId);
      expect(response.body).toHaveProperty('template_id', testTemplateId);
      expect(response.body).toHaveProperty('section_name', '測試章節A');
      expect(response.body).toHaveProperty('section_order', 1);
      expect(response.body).toHaveProperty('is_required', true);
      expect(response.body).toHaveProperty('data_types');
      expect(Array.isArray(response.body.data_types)).toBe(true);
    });

    it('應該驗證章節是否存在', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${testTemplateId}/sections/nonexistent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${testTemplateId}/sections/${testSectionId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/templates/:templateId/sections/reorder', () => {
    beforeEach(async () => {
      // 創建額外章節用於排序測試
      await prisma.templateSection.createMany({
        data: [
          {
            template_id: testTemplateId,
            section_name: '測試章節B',
            section_order: 2
          },
          {
            template_id: testTemplateId,
            section_name: '測試章節C',
            section_order: 3
          }
        ]
      });
    });

    it('應該成功重新排序章節', async () => {
      // 獲取所有章節 ID
      const sections = await prisma.templateSection.findMany({
        where: { template_id: testTemplateId },
        orderBy: { section_order: 'asc' }
      });

      const reorderData = {
        section_orders: [
          { id: sections[2].id, section_order: 1 }, // 第3個章節移到第1位
          { id: sections[0].id, section_order: 2 }, // 第1個章節移到第2位
          { id: sections[1].id, section_order: 3 }  // 第2個章節移到第3位
        ]
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reorderData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', '章節順序更新成功');
      
      // 驗證排序結果
      const reorderedSections = await prisma.templateSection.findMany({
        where: { template_id: testTemplateId },
        orderBy: { section_order: 'asc' }
      });

      expect(reorderedSections[0].id).toBe(sections[2].id);
      expect(reorderedSections[1].id).toBe(sections[0].id);
      expect(reorderedSections[2].id).toBe(sections[1].id);
    });

    it('應該驗證章節 ID 存在', async () => {
      const invalidReorderData = {
        section_orders: [
          { id: 'nonexistent-id', section_order: 1 }
        ]
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidReorderData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const reorderData = {
        section_orders: []
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/sections/reorder`)
        .send(reorderData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});