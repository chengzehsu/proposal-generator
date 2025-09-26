import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('實績案例 API 合約測試', () => {
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.project.deleteMany({
      where: { project_name: { startsWith: '測試專案' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'projecttest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '44444' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: '實績測試公司',
        tax_id: '44444444',
        address: '台北市實績區測試路789號',
        phone: '02-4444-4444',
        email: 'project@company.com'
      }
    });

    testCompanyId = testCompany.id;

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'projecttest@example.com',
        password: hashedPassword,
        name: '實績測試用戶',
        role: 'ADMIN',
        company_id: testCompanyId,
      },
    });

    testUserId = testUser.id;

    // 創建測試專案
    const testProject = await prisma.project.create({
      data: {
        company_id: testCompanyId,
        project_name: '測試專案A',
        client_name: '測試客戶',
        start_date: new Date('2023-01-01'),
        end_date: new Date('2023-06-30'),
        amount: 5000000,
        scale: '大型專案',
        description: '這是一個測試專案的詳細描述',
        achievements: '成功完成所有里程碑',
        tags: ['網站開發', '後端API', 'React'],
        is_public: true,
        attachments: [
          {
            name: 'project-document.pdf',
            url: 'https://example.com/doc.pdf',
            size: 1024000
          }
        ]
      }
    });

    testProjectId = testProject.id;

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'projecttest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料
    await prisma.project.deleteMany({
      where: { company_id: testCompanyId }
    });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
  });

  describe('GET /api/v1/projects', () => {
    it('應該返回公司的專案列表', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const project = response.body[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('project_name', '測試專案A');
      expect(project).toHaveProperty('client_name', '測試客戶');
      expect(project).toHaveProperty('start_date', '2023-01-01');
      expect(project).toHaveProperty('end_date', '2023-06-30');
      expect(project).toHaveProperty('amount', '5000000');
      expect(project).toHaveProperty('scale', '大型專案');
      expect(project).toHaveProperty('description', '這是一個測試專案的詳細描述');
      expect(project).toHaveProperty('achievements', '成功完成所有里程碑');
      expect(project).toHaveProperty('tags');
      expect(Array.isArray(project.tags)).toBe(true);
      expect(project.tags).toEqual(['網站開發', '後端API', 'React']);
      expect(project).toHaveProperty('is_public', true);
      expect(project).toHaveProperty('attachments');
      expect(project).toHaveProperty('created_at');
      expect(project).toHaveProperty('updated_at');
    });

    it('應該支援按標籤篩選', async () => {
      // 創建額外專案用於測試篩選
      await prisma.project.create({
        data: {
          company_id: testCompanyId,
          project_name: '測試專案B',
          description: '另一個測試專案',
          tags: ['移動應用', 'iOS', 'Android']
        }
      });

      const response = await request(app)
        .get('/api/v1/projects?tags=React')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((project: any) => {
        expect(project.tags).toContain('React');
      });
    });

    it('應該支援按日期範圍篩選', async () => {
      const response = await request(app)
        .get('/api/v1/projects?start_date_from=2023-01-01&start_date_to=2023-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((project: any) => {
        const startDate = new Date(project.start_date);
        expect(startDate.getFullYear()).toBe(2023);
      });
    });

    it('應該支援按公開狀態篩選', async () => {
      // 創建私有專案
      await prisma.project.create({
        data: {
          company_id: testCompanyId,
          project_name: '測試專案C',
          description: '私有專案',
          is_public: false
        }
      });

      const response = await request(app)
        .get('/api/v1/projects?is_public=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.forEach((project: any) => {
        expect(project.is_public).toBe(true);
      });
    });

    it('應該支援分頁', async () => {
      const response = await request(app)
        .get('/api/v1/projects?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('應該按建立時間降序排列', async () => {
      // 創建額外專案
      await prisma.project.create({
        data: {
          company_id: testCompanyId,
          project_name: '測試專案D',
          description: '最新專案'
        }
      });

      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.length > 1) {
        const firstDate = new Date(response.body[0].created_at);
        const secondDate = new Date(response.body[1].created_at);
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
      }
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/projects', () => {
    it('應該成功新增專案', async () => {
      const newProjectData = {
        project_name: '新測試專案',
        client_name: '新客戶',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        amount: 8000000,
        scale: '超大型專案',
        description: '這是一個新的測試專案',
        achievements: '預期達成重大突破',
        tags: ['AI', '機器學習', 'Python'],
        is_public: true,
        attachments: [
          {
            name: 'proposal.pdf',
            url: 'https://example.com/proposal.pdf',
            size: 2048000
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProjectData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('project_name', '新測試專案');
      expect(response.body).toHaveProperty('client_name', '新客戶');
      expect(response.body).toHaveProperty('start_date', '2024-01-01');
      expect(response.body).toHaveProperty('end_date', '2024-12-31');
      expect(response.body).toHaveProperty('amount', '8000000');
      expect(response.body).toHaveProperty('scale', '超大型專案');
      expect(response.body).toHaveProperty('description', '這是一個新的測試專案');
      expect(response.body).toHaveProperty('achievements', '預期達成重大突破');
      expect(response.body).toHaveProperty('tags');
      expect(response.body.tags).toEqual(['AI', '機器學習', 'Python']);
      expect(response.body).toHaveProperty('is_public', true);
      expect(response.body).toHaveProperty('attachments');
      expect(response.body.attachments[0]).toHaveProperty('name', 'proposal.pdf');
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 project_name 和 description
        client_name: '測試客戶'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證專案名稱長度', async () => {
      const invalidNameData = {
        project_name: 'A', // 太短
        description: '測試描述'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidNameData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證日期格式和邏輯', async () => {
      const invalidDateData = {
        project_name: '日期測試專案',
        description: '測試描述',
        start_date: '2024-12-31',
        end_date: '2024-01-01' // 結束日期早於開始日期
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證金額為非負數', async () => {
      const negativeAmountData = {
        project_name: '金額測試專案',
        description: '測試描述',
        amount: -1000000
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(negativeAmountData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證標籤格式', async () => {
      const invalidTagsData = {
        project_name: '標籤測試專案',
        description: '測試描述',
        tags: 'not-an-array' // 應該是陣列
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTagsData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const projectData = {
        project_name: '未認證專案',
        description: '測試描述'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .send(projectData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('應該成功更新專案', async () => {
      const updateData = {
        project_name: '更新後的專案名稱',
        client_name: '更新後的客戶',
        start_date: '2023-02-01',
        end_date: '2023-08-31',
        amount: 7000000,
        scale: '中型專案',
        description: '更新後的專案描述',
        achievements: '更新後的成就',
        tags: ['Vue.js', '前端開發', 'TypeScript'],
        is_public: false
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('project_name', '更新後的專案名稱');
      expect(response.body).toHaveProperty('client_name', '更新後的客戶');
      expect(response.body).toHaveProperty('start_date', '2023-02-01');
      expect(response.body).toHaveProperty('end_date', '2023-08-31');
      expect(response.body).toHaveProperty('amount', '7000000');
      expect(response.body).toHaveProperty('scale', '中型專案');
      expect(response.body).toHaveProperty('description', '更新後的專案描述');
      expect(response.body).toHaveProperty('achievements', '更新後的成就');
      expect(response.body.tags).toEqual(['Vue.js', '前端開發', 'TypeScript']);
      expect(response.body).toHaveProperty('is_public', false);
    });

    it('應該支援部分更新', async () => {
      const partialUpdateData = {
        project_name: '僅更新名稱'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdateData)
        .expect(200);

      expect(response.body).toHaveProperty('project_name', '僅更新名稱');
      expect(response.body).toHaveProperty('client_name', '測試客戶'); // 其他欄位保持不變
    });

    it('應該驗證專案是否存在', async () => {
      const updateData = {
        project_name: '更新不存在的專案'
      };

      const response = await request(app)
        .put('/api/v1/projects/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該驗證專案屬於當前公司', async () => {
      // 創建另一家公司的專案
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '另一家公司',
          tax_id: '33333333',
          address: '其他地址',
          phone: '02-3333-3333',
          email: 'other@company.com'
        }
      });

      const otherProject = await prisma.project.create({
        data: {
          company_id: anotherCompany.id,
          project_name: '其他公司專案',
          description: '其他公司的專案'
        }
      });

      const updateData = {
        project_name: '嘗試更新其他公司專案'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.project.delete({ where: { id: otherProject.id } });
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const updateData = {
        project_name: '未認證更新'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('應該成功刪除專案', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 驗證專案已刪除
      const deletedProject = await prisma.project.findUnique({
        where: { id: testProjectId }
      });
      
      expect(deletedProject).toBeNull();
    });

    it('應該驗證專案是否存在', async () => {
      const response = await request(app)
        .delete('/api/v1/projects/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證專案屬於當前公司', async () => {
      // 創建另一家公司的專案
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '刪除測試公司',
          tax_id: '22222222',
          address: '刪除測試地址',
          phone: '02-2222-2222',
          email: 'delete@company.com'
        }
      });

      const otherProject = await prisma.project.create({
        data: {
          company_id: anotherCompany.id,
          project_name: '其他公司專案',
          description: '其他公司的專案'
        }
      });

      const response = await request(app)
        .delete(`/api/v1/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.project.delete({ where: { id: otherProject.id } });
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('應該返回指定專案詳情', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testProjectId);
      expect(response.body).toHaveProperty('project_name', '測試專案A');
      expect(response.body).toHaveProperty('client_name', '測試客戶');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('tags');
      expect(response.body).toHaveProperty('attachments');
    });

    it('應該驗證專案是否存在', async () => {
      const response = await request(app)
        .get('/api/v1/projects/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證專案屬於當前公司', async () => {
      // 創建另一家公司的專案
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '查看測試公司',
          tax_id: '11111111',
          address: '查看測試地址',
          phone: '02-1111-1111',
          email: 'view@company.com'
        }
      });

      const otherProject = await prisma.project.create({
        data: {
          company_id: anotherCompany.id,
          project_name: '其他公司專案',
          description: '其他公司的專案'
        }
      });

      const response = await request(app)
        .get(`/api/v1/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.project.delete({ where: { id: otherProject.id } });
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});