import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('團隊成員 API 合約測試', () => {
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;
  let testMemberId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.teamMember.deleteMany({
      where: { name: { startsWith: '測試成員' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'teamtest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '77777' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: '團隊測試公司',
        tax_id: '77777777',
        address: '台北市團隊區測試路456號',
        phone: '02-7777-7777',
        email: 'team@company.com'
      }
    });

    testCompanyId = testCompany.id;

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'teamtest@example.com',
        password: hashedPassword,
        name: '團隊測試用戶',
        role: 'ADMIN',
        company_id: testCompanyId,
      },
    });

    testUserId = testUser.id;

    // 創建測試團隊成員
    const testMember = await prisma.teamMember.create({
      data: {
        company_id: testCompanyId,
        name: '測試成員A',
        title: '軟體工程師',
        department: '技術部',
        education: '資工系學士',
        experience: '3年軟體開發經驗',
        expertise: 'JavaScript, TypeScript, React',
        is_key_member: true,
        display_order: 1
      }
    });

    testMemberId = testMember.id;

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'teamtest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料
    await prisma.teamMember.deleteMany({
      where: { company_id: testCompanyId }
    });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
  });

  describe('GET /api/v1/team-members', () => {
    it('應該返回公司的團隊成員列表', async () => {
      const response = await request(app)
        .get('/api/v1/team-members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const member = response.body[0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('name', '測試成員A');
      expect(member).toHaveProperty('title', '軟體工程師');
      expect(member).toHaveProperty('department', '技術部');
      expect(member).toHaveProperty('education', '資工系學士');
      expect(member).toHaveProperty('experience', '3年軟體開發經驗');
      expect(member).toHaveProperty('expertise', 'JavaScript, TypeScript, React');
      expect(member).toHaveProperty('is_key_member', true);
      expect(member).toHaveProperty('display_order', 1);
      expect(member).toHaveProperty('is_active', true);
      expect(member).toHaveProperty('created_at');
      expect(member).toHaveProperty('updated_at');
    });

    it('應該支援關鍵人員篩選', async () => {
      // 創建非關鍵成員
      await prisma.teamMember.create({
        data: {
          company_id: testCompanyId,
          name: '測試成員B',
          title: '實習生',
          is_key_member: false,
          display_order: 2
        }
      });

      const response = await request(app)
        .get('/api/v1/team-members?is_key_member=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((member: any) => {
        expect(member.is_key_member).toBe(true);
      });
    });

    it('應該按 display_order 排序', async () => {
      // 創建額外成員
      await prisma.teamMember.create({
        data: {
          company_id: testCompanyId,
          name: '測試成員C',
          title: '產品經理',
          display_order: 0 // 應該排在前面
        }
      });

      const response = await request(app)
        .get('/api/v1/team-members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body[0].display_order).toBeLessThanOrEqual(response.body[1].display_order);
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get('/api/v1/team-members')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/team-members', () => {
    it('應該成功新增團隊成員', async () => {
      const newMemberData = {
        name: '新成員',
        title: '資深工程師',
        department: '研發部',
        education: '資工系碩士',
        experience: '5年開發經驗',
        expertise: 'Python, AI, Machine Learning',
        is_key_member: true
      };

      const response = await request(app)
        .post('/api/v1/team-members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newMemberData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', '新成員');
      expect(response.body).toHaveProperty('title', '資深工程師');
      expect(response.body).toHaveProperty('department', '研發部');
      expect(response.body).toHaveProperty('education', '資工系碩士');
      expect(response.body).toHaveProperty('experience', '5年開發經驗');
      expect(response.body).toHaveProperty('expertise', 'Python, AI, Machine Learning');
      expect(response.body).toHaveProperty('is_key_member', true);
      expect(response.body).toHaveProperty('is_active', true);
      expect(response.body).toHaveProperty('display_order');
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 name 和 title
        department: '測試部門'
      };

      const response = await request(app)
        .post('/api/v1/team-members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證姓名長度', async () => {
      const invalidNameData = {
        name: 'A', // 太短
        title: '測試職位'
      };

      const response = await request(app)
        .post('/api/v1/team-members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidNameData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該自動設定 display_order', async () => {
      const memberData = {
        name: '順序測試成員',
        title: '測試職位'
      };

      const response = await request(app)
        .post('/api/v1/team-members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(memberData)
        .expect(201);

      expect(response.body).toHaveProperty('display_order');
      expect(typeof response.body.display_order).toBe('number');
    });

    it('應該拒絕未認證的請求', async () => {
      const memberData = {
        name: '未認證成員',
        title: '測試職位'
      };

      const response = await request(app)
        .post('/api/v1/team-members')
        .send(memberData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/team-members/:id', () => {
    it('應該成功更新團隊成員', async () => {
      const updateData = {
        name: '更新後的成員名稱',
        title: '資深軟體工程師',
        department: '產品開發部',
        education: '資工系碩士',
        experience: '5年開發經驗',
        expertise: 'TypeScript, Node.js, React, AWS',
        is_key_member: false,
        display_order: 5
      };

      const response = await request(app)
        .put(`/api/v1/team-members/${testMemberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('name', '更新後的成員名稱');
      expect(response.body).toHaveProperty('title', '資深軟體工程師');
      expect(response.body).toHaveProperty('department', '產品開發部');
      expect(response.body).toHaveProperty('education', '資工系碩士');
      expect(response.body).toHaveProperty('experience', '5年開發經驗');
      expect(response.body).toHaveProperty('expertise', 'TypeScript, Node.js, React, AWS');
      expect(response.body).toHaveProperty('is_key_member', false);
      expect(response.body).toHaveProperty('display_order', 5);
    });

    it('應該支援部分更新', async () => {
      const partialUpdateData = {
        title: '僅更新職位'
      };

      const response = await request(app)
        .put(`/api/v1/team-members/${testMemberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdateData)
        .expect(200);

      expect(response.body).toHaveProperty('title', '僅更新職位');
      expect(response.body).toHaveProperty('name', '測試成員A'); // 其他欄位保持不變
    });

    it('應該驗證成員是否存在', async () => {
      const updateData = {
        name: '更新不存在的成員'
      };

      const response = await request(app)
        .put('/api/v1/team-members/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該驗證成員屬於當前公司', async () => {
      // 創建另一家公司的成員
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '另一家公司',
          tax_id: '66666666',
          address: '其他地址',
          phone: '02-6666-6666',
          email: 'other@company.com'
        }
      });

      const otherMember = await prisma.teamMember.create({
        data: {
          company_id: anotherCompany.id,
          name: '其他公司成員',
          title: '其他職位'
        }
      });

      const updateData = {
        name: '嘗試更新其他公司成員'
      };

      const response = await request(app)
        .put(`/api/v1/team-members/${otherMember.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.teamMember.delete({ where: { id: otherMember.id } });
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const updateData = {
        name: '未認證更新'
      };

      const response = await request(app)
        .put(`/api/v1/team-members/${testMemberId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/team-members/:id', () => {
    it('應該成功刪除團隊成員（軟刪除）', async () => {
      const response = await request(app)
        .delete(`/api/v1/team-members/${testMemberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 驗證軟刪除
      const deletedMember = await prisma.teamMember.findUnique({
        where: { id: testMemberId }
      });
      
      expect(deletedMember).not.toBeNull();
      expect(deletedMember?.is_active).toBe(false);
    });

    it('應該驗證成員是否存在', async () => {
      const response = await request(app)
        .delete('/api/v1/team-members/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證成員屬於當前公司', async () => {
      // 創建另一家公司的成員
      const anotherCompany = await prisma.company.create({
        data: {
          company_name: '刪除測試公司',
          tax_id: '55555555',
          address: '刪除測試地址',
          phone: '02-5555-5555',
          email: 'delete@company.com'
        }
      });

      const otherMember = await prisma.teamMember.create({
        data: {
          company_id: anotherCompany.id,
          name: '其他公司成員',
          title: '其他職位'
        }
      });

      const response = await request(app)
        .delete(`/api/v1/team-members/${otherMember.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 403);

      // 清理
      await prisma.teamMember.delete({ where: { id: otherMember.id } });
      await prisma.company.delete({ where: { id: anotherCompany.id } });
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .delete(`/api/v1/team-members/${testMemberId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});