import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('標書範本 API 合約測試', () => {
  let authToken: string;
  let testUserId: string;
  let testTemplateId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.proposalTemplate.deleteMany({
      where: { template_name: { startsWith: '測試範本' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'templatetest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '88888' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: '範本測試公司',
        tax_id: '88888888',
        address: '台北市範本區測試路202號',
        phone: '02-8888-8888',
        email: 'template@company.com'
      }
    });

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'templatetest@example.com',
        password: hashedPassword,
        name: '範本測試用戶',
        role: 'ADMIN',
        company_id: testCompany.id,
      },
    });

    testUserId = testUser.id;

    // 創建測試範本
    const testTemplate = await prisma.proposalTemplate.create({
      data: {
        template_name: '測試範本A',
        template_type: 'GOVERNMENT_GRANT',
        description: '這是一個政府補助標書範本',
        is_system_template: false,
        created_by: testUserId
      }
    });

    testTemplateId = testTemplate.id;

    // 創建測試範本區段
    await prisma.templateSection.createMany({
      data: [
        {
          template_id: testTemplateId,
          section_name: '公司基本資料',
          section_order: 1,
          is_required: true,
          min_words: 100,
          max_words: 500,
          content_hint: '請填寫公司基本資訊',
          data_types: ['COMPANY_BASIC'],
          score_weight: 20.00
        },
        {
          template_id: testTemplateId,
          section_name: '執行團隊',
          section_order: 2,
          is_required: true,
          min_words: 200,
          max_words: 1000,
          content_hint: '請介紹執行團隊成員',
          data_types: ['TEAM_MEMBERS'],
          score_weight: 30.00
        }
      ]
    });

    // 創建格式規格
    await prisma.formatSpec.create({
      data: {
        template_id: testTemplateId,
        page_size: 'A4',
        margins: { top: 25, right: 20, bottom: 25, left: 20 },
        font_family: 'Times New Roman',
        font_size: 12,
        line_height: 1.5,
        max_pages: 20
      }
    });

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'templatetest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料（按依賴順序）
    await prisma.templateSection.deleteMany({
      where: { template_id: testTemplateId }
    });
    await prisma.formatSpec.deleteMany({
      where: { template_id: testTemplateId }
    });
    await prisma.proposalTemplate.deleteMany({
      where: { created_by: testUserId }
    });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '88888' } }
    });
  });

  describe('GET /api/v1/templates', () => {
    it('應該返回範本列表', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const template = response.body.find((t: any) => t.id === testTemplateId);
      expect(template).toBeDefined();
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('template_name', '測試範本A');
      expect(template).toHaveProperty('template_type', 'GOVERNMENT_GRANT');
      expect(template).toHaveProperty('description', '這是一個政府補助標書範本');
      expect(template).toHaveProperty('is_system_template', false);
      expect(template).toHaveProperty('created_by', testUserId);
      expect(template).toHaveProperty('created_at');
      expect(template).toHaveProperty('updated_at');
    });

    it('應該支援按範本類型篩選', async () => {
      // 創建不同類型的範本
      await prisma.proposalTemplate.create({
        data: {
          template_name: '測試範本B',
          template_type: 'ENTERPRISE_BID',
          description: '企業標案範本',
          created_by: testUserId
        }
      });

      const response = await request(app)
        .get('/api/v1/templates?template_type=GOVERNMENT_GRANT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((template: any) => {
        expect(template.template_type).toBe('GOVERNMENT_GRANT');
      });
    });

    it('應該支援系統範本篩選', async () => {
      // 創建系統範本
      await prisma.proposalTemplate.create({
        data: {
          template_name: '系統範本',
          template_type: 'CUSTOM',
          is_system_template: true
        }
      });

      const response = await request(app)
        .get('/api/v1/templates?is_system_template=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.forEach((template: any) => {
        expect(template.is_system_template).toBe(true);
      });
    });

    it('應該支援分頁', async () => {
      const response = await request(app)
        .get('/api/v1/templates?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/templates', () => {
    it('應該成功新增範本', async () => {
      const newTemplateData = {
        template_name: '新測試範本',
        template_type: 'AWARD_APPLICATION',
        description: '這是一個獎項申請範本',
        sections: [
          {
            section_name: '申請基本資料',
            section_order: 1,
            is_required: true,
            min_words: 50,
            max_words: 300,
            content_hint: '請填寫申請基本資訊',
            data_types: ['COMPANY_BASIC', 'COMPANY_PROFILE'],
            score_weight: 25.00
          },
          {
            section_name: '過往成就',
            section_order: 2,
            is_required: true,
            min_words: 200,
            max_words: 800,
            content_hint: '請描述相關成就',
            data_types: ['PROJECTS', 'AWARDS'],
            score_weight: 40.00
          }
        ],
        format_spec: {
          page_size: 'A4',
          margins: { top: 30, right: 25, bottom: 30, left: 25 },
          font_family: 'Arial',
          font_size: 11,
          line_height: 1.6,
          max_pages: 15
        }
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTemplateData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('template_name', '新測試範本');
      expect(response.body).toHaveProperty('template_type', 'AWARD_APPLICATION');
      expect(response.body).toHaveProperty('description', '這是一個獎項申請範本');
      expect(response.body).toHaveProperty('is_system_template', false);
      expect(response.body).toHaveProperty('created_by', testUserId);
      expect(response.body).toHaveProperty('sections');
      expect(Array.isArray(response.body.sections)).toBe(true);
      expect(response.body.sections.length).toBe(2);
      expect(response.body).toHaveProperty('format_spec');
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 template_name 和 template_type
        description: '測試描述'
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證範本名稱長度', async () => {
      const invalidNameData = {
        template_name: 'A', // 太短
        template_type: 'CUSTOM'
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidNameData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證範本類型', async () => {
      const invalidTypeData = {
        template_name: '類型測試範本',
        template_type: 'INVALID_TYPE'
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTypeData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證區段資料格式', async () => {
      const invalidSectionData = {
        template_name: '區段測試範本',
        template_type: 'CUSTOM',
        sections: [
          {
            // 缺少必填的 section_name 和 section_order
            is_required: true
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSectionData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const templateData = {
        template_name: '未認證範本',
        template_type: 'CUSTOM'
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .send(templateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/templates/:id', () => {
    it('應該成功更新範本', async () => {
      const updateData = {
        template_name: '更新後的範本名稱',
        template_type: 'ENTERPRISE_BID',
        description: '更新後的範本描述',
        sections: [
          {
            section_name: '更新後的區段',
            section_order: 1,
            is_required: false,
            min_words: 150,
            max_words: 600,
            content_hint: '更新後的提示',
            data_types: ['COMPANY_PROFILE', 'CAPABILITIES'],
            score_weight: 35.00
          }
        ]
      };

      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('template_name', '更新後的範本名稱');
      expect(response.body).toHaveProperty('template_type', 'ENTERPRISE_BID');
      expect(response.body).toHaveProperty('description', '更新後的範本描述');
      expect(response.body).toHaveProperty('sections');
      expect(Array.isArray(response.body.sections)).toBe(true);
    });

    it('應該支援部分更新', async () => {
      const partialUpdateData = {
        template_name: '僅更新名稱'
      };

      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdateData)
        .expect(200);

      expect(response.body).toHaveProperty('template_name', '僅更新名稱');
      expect(response.body).toHaveProperty('template_type', 'GOVERNMENT_GRANT'); // 其他欄位保持不變
    });

    it('應該驗證範本是否存在', async () => {
      const updateData = {
        template_name: '更新不存在的範本'
      };

      const response = await request(app)
        .put('/api/v1/templates/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該驗證用戶權限（僅能更新自己創建的範本）', async () => {
      // 創建另一個用戶的範本
      const anotherUser = await prisma.user.create({
        data: {
          email: 'another@example.com',
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

      const updateData = {
        template_name: '嘗試更新其他用戶範本'
      };

      const response = await request(app)
        .put(`/api/v1/templates/${otherTemplate.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.proposalTemplate.delete({ where: { id: otherTemplate.id } });
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    it('應該拒絕更新系統範本', async () => {
      const systemTemplate = await prisma.proposalTemplate.create({
        data: {
          template_name: '系統範本',
          template_type: 'CUSTOM',
          is_system_template: true
        }
      });

      const updateData = {
        template_name: '嘗試更新系統範本'
      };

      const response = await request(app)
        .put(`/api/v1/templates/${systemTemplate.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('系統範本不可修改');

      // 清理
      await prisma.proposalTemplate.delete({ where: { id: systemTemplate.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const updateData = {
        template_name: '未認證更新'
      };

      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/templates/:id', () => {
    it('應該成功刪除範本', async () => {
      const response = await request(app)
        .delete(`/api/v1/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 驗證範本已刪除
      const deletedTemplate = await prisma.proposalTemplate.findUnique({
        where: { id: testTemplateId }
      });
      
      expect(deletedTemplate).toBeNull();
    });

    it('應該驗證範本是否存在', async () => {
      const response = await request(app)
        .delete('/api/v1/templates/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕刪除系統範本', async () => {
      const systemTemplate = await prisma.proposalTemplate.create({
        data: {
          template_name: '系統範本',
          template_type: 'CUSTOM',
          is_system_template: true
        }
      });

      const response = await request(app)
        .delete(`/api/v1/templates/${systemTemplate.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('系統範本不可刪除');

      // 清理
      await prisma.proposalTemplate.delete({ where: { id: systemTemplate.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .delete(`/api/v1/templates/${testTemplateId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/templates/:id', () => {
    it('應該返回指定範本詳情', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testTemplateId);
      expect(response.body).toHaveProperty('template_name', '測試範本A');
      expect(response.body).toHaveProperty('template_type', 'GOVERNMENT_GRANT');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('sections');
      expect(Array.isArray(response.body.sections)).toBe(true);
      expect(response.body.sections.length).toBe(2);
      expect(response.body).toHaveProperty('format_spec');

      // 驗證區段內容
      const section = response.body.sections[0];
      expect(section).toHaveProperty('section_name', '公司基本資料');
      expect(section).toHaveProperty('section_order', 1);
      expect(section).toHaveProperty('is_required', true);
      expect(section).toHaveProperty('data_types');
      expect(Array.isArray(section.data_types)).toBe(true);
    });

    it('應該驗證範本是否存在', async () => {
      const response = await request(app)
        .get('/api/v1/templates/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${testTemplateId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/templates/:id/clone', () => {
    it('應該成功複製範本', async () => {
      const cloneData = {
        template_name: '複製的測試範本'
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/clone`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(cloneData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).not.toBe(testTemplateId); // 新的 ID
      expect(response.body).toHaveProperty('template_name', '複製的測試範本');
      expect(response.body).toHaveProperty('template_type', 'GOVERNMENT_GRANT'); // 繼承原範本類型
      expect(response.body).toHaveProperty('is_system_template', false);
      expect(response.body).toHaveProperty('created_by', testUserId);
      expect(response.body).toHaveProperty('sections');
      expect(Array.isArray(response.body.sections)).toBe(true);
      expect(response.body.sections.length).toBe(2); // 繼承原範本區段
    });

    it('應該驗證範本是否存在', async () => {
      const cloneData = {
        template_name: '複製不存在的範本'
      };

      const response = await request(app)
        .post('/api/v1/templates/nonexistent-id/clone')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cloneData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const cloneData = {
        template_name: '未認證複製'
      };

      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/clone`)
        .send(cloneData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});