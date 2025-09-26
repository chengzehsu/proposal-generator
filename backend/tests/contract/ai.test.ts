import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('AI 生成 API 合約測試', () => {
  let authToken: string;
  let testUserId: string;
  let testCompanyId: string;
  let testProjectId: string;
  let testAwardId: string;
  let testTeamMemberId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.project.deleteMany({
      where: { project_name: { startsWith: 'AI測試專案' } }
    });
    await prisma.award.deleteMany({
      where: { award_name: { startsWith: 'AI測試獎項' } }
    });
    await prisma.teamMember.deleteMany({
      where: { name: { startsWith: 'AI測試成員' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'aitest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '99999' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: 'AI測試公司股份有限公司',
        tax_id: '99999999',
        address: '台北市AI區測試路404號',
        phone: '02-9999-9999',
        email: 'ai@company.com',
        capital: 50000000,
        established_date: new Date('2020-01-01'),
        website: 'https://ai-company.com'
      }
    });

    testCompanyId = testCompany.id;

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'aitest@example.com',
        password: hashedPassword,
        name: 'AI測試用戶',
        role: 'ADMIN',
        company_id: testCompanyId,
      },
    });

    testUserId = testUser.id;

    // 創建測試資料用於 AI 生成
    const testProject = await prisma.project.create({
      data: {
        company_id: testCompanyId,
        project_name: 'AI測試專案',
        client_name: 'AI測試客戶',
        description: '這是一個人工智慧相關的測試專案',
        achievements: '成功開發AI解決方案',
        tags: ['AI', '機器學習', '深度學習']
      }
    });
    testProjectId = testProject.id;

    const testAward = await prisma.award.create({
      data: {
        company_id: testCompanyId,
        award_name: 'AI測試獎項',
        issuer: 'AI創新委員會',
        award_type: 'GOVERNMENT_GRANT',
        description: '在AI領域的卓越表現'
      }
    });
    testAwardId = testAward.id;

    const testMember = await prisma.teamMember.create({
      data: {
        company_id: testCompanyId,
        name: 'AI測試成員',
        title: 'AI工程師',
        expertise: 'Python, TensorFlow, PyTorch',
        is_key_member: true
      }
    });
    testTeamMemberId = testMember.id;

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'aitest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料
    await prisma.project.deleteMany({
      where: { company_id: testCompanyId }
    });
    await prisma.award.deleteMany({
      where: { company_id: testCompanyId }
    });
    await prisma.teamMember.deleteMany({
      where: { company_id: testCompanyId }
    });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
  });

  describe('POST /api/v1/ai/generate', () => {
    it('應該成功生成基於公司基本資料的內容', async () => {
      const generateData = {
        content_type: 'company_introduction',
        data_sources: ['COMPANY_BASIC'],
        tone: 'professional',
        length: 'medium',
        additional_context: '重點強調公司的技術實力和創新能力'
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('generated_content');
      expect(typeof response.body.generated_content).toBe('string');
      expect(response.body.generated_content.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('content_type', 'company_introduction');
      expect(response.body).toHaveProperty('data_sources');
      expect(Array.isArray(response.body.data_sources)).toBe(true);
      expect(response.body.data_sources).toContain('COMPANY_BASIC');
      expect(response.body).toHaveProperty('word_count');
      expect(typeof response.body.word_count).toBe('number');
      expect(response.body).toHaveProperty('generated_at');
    });

    it('應該成功生成基於團隊成員的內容', async () => {
      const generateData = {
        content_type: 'team_introduction',
        data_sources: ['TEAM_MEMBERS'],
        tone: 'confident',
        length: 'long',
        additional_context: '突出團隊的專業能力和經驗'
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('generated_content');
      expect(response.body.generated_content).toContain('AI測試成員'); // 應該包含團隊成員資訊
      expect(response.body).toHaveProperty('content_type', 'team_introduction');
      expect(response.body.data_sources).toContain('TEAM_MEMBERS');
    });

    it('應該成功生成基於實績案例的內容', async () => {
      const generateData = {
        content_type: 'project_showcase',
        data_sources: ['PROJECTS'],
        tone: 'achievement_focused',
        length: 'medium',
        additional_context: '展現過往專案的成功經驗'
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect(200);

      expect(response.body).toHaveProperty('generated_content');
      expect(response.body.generated_content).toContain('AI測試專案'); // 應該包含專案資訊
      expect(response.body).toHaveProperty('content_type', 'project_showcase');
      expect(response.body.data_sources).toContain('PROJECTS');
    });

    it('應該成功生成基於獲獎紀錄的內容', async () => {
      const generateData = {
        content_type: 'award_highlights',
        data_sources: ['AWARDS'],
        tone: 'proud',
        length: 'short',
        additional_context: '強調獲獎的重要性和意義'
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect(200);

      expect(response.body).toHaveProperty('generated_content');
      expect(response.body.generated_content).toContain('AI測試獎項'); // 應該包含獎項資訊
      expect(response.body).toHaveProperty('content_type', 'award_highlights');
      expect(response.body.data_sources).toContain('AWARDS');
    });

    it('應該成功生成基於多種資料來源的內容', async () => {
      const generateData = {
        content_type: 'comprehensive_overview',
        data_sources: ['COMPANY_BASIC', 'TEAM_MEMBERS', 'PROJECTS', 'AWARDS'],
        tone: 'professional',
        length: 'long',
        additional_context: '綜合介紹公司各方面的實力'
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect(200);

      expect(response.body).toHaveProperty('generated_content');
      expect(response.body).toHaveProperty('content_type', 'comprehensive_overview');
      expect(response.body.data_sources).toEqual(['COMPANY_BASIC', 'TEAM_MEMBERS', 'PROJECTS', 'AWARDS']);
      expect(response.body.word_count).toBeGreaterThan(100); // 長文應該有足夠字數
    });

    it('應該支援自訂輸入內容生成', async () => {
      const generateData = {
        content_type: 'custom_content',
        data_sources: ['CUSTOM_INPUT'],
        tone: 'persuasive',
        length: 'medium',
        custom_input: '我們公司專精於開發創新的AI解決方案，已為超過100家企業提供服務。',
        additional_context: '基於提供的資訊撰寫標書內容'
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect(200);

      expect(response.body).toHaveProperty('generated_content');
      expect(response.body.generated_content).toContain('AI解決方案'); // 應該包含自訂輸入的內容
      expect(response.body).toHaveProperty('content_type', 'custom_content');
      expect(response.body.data_sources).toContain('CUSTOM_INPUT');
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 content_type 和 data_sources
        tone: 'professional'
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證內容類型', async () => {
      const invalidContentTypeData = {
        content_type: 'invalid_type',
        data_sources: ['COMPANY_BASIC']
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidContentTypeData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證資料來源類型', async () => {
      const invalidDataSourcesData = {
        content_type: 'company_introduction',
        data_sources: ['INVALID_SOURCE']
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDataSourcesData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證語調選項', async () => {
      const invalidToneData = {
        content_type: 'company_introduction',
        data_sources: ['COMPANY_BASIC'],
        tone: 'invalid_tone'
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidToneData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證長度選項', async () => {
      const invalidLengthData = {
        content_type: 'company_introduction',
        data_sources: ['COMPANY_BASIC'],
        length: 'invalid_length'
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidLengthData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該要求自訂輸入使用 CUSTOM_INPUT 資料來源', async () => {
      const missingCustomInputData = {
        content_type: 'custom_content',
        data_sources: ['CUSTOM_INPUT'],
        // 缺少 custom_input 欄位
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(missingCustomInputData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('custom_input');
    });

    it('應該處理 AI 服務暫時無法使用的情況', async () => {
      // 模擬 AI 服務不可用的情況（可能需要 mock）
      const generateData = {
        content_type: 'company_introduction',
        data_sources: ['COMPANY_BASIC'],
        force_ai_error: true // 測試用標記
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect('Content-Type', /json/)
        .expect(503);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 503);
      expect(response.body.message).toContain('AI服務暫時無法使用');
    });

    it('應該拒絕未認證的請求', async () => {
      const generateData = {
        content_type: 'company_introduction',
        data_sources: ['COMPANY_BASIC']
      };

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .send(generateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/ai/improve', () => {
    it('應該成功改進現有內容', async () => {
      const improveData = {
        original_content: '我們是一家科技公司。我們做軟體開發。',
        improvement_type: 'enhance_detail',
        tone: 'professional',
        additional_context: '增加更多技術細節和專業描述'
      };

      const response = await request(app)
        .post('/api/v1/ai/improve')
        .set('Authorization', `Bearer ${authToken}`)
        .send(improveData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('improved_content');
      expect(typeof response.body.improved_content).toBe('string');
      expect(response.body.improved_content.length).toBeGreaterThan(improveData.original_content.length);
      expect(response.body).toHaveProperty('improvement_type', 'enhance_detail');
      expect(response.body).toHaveProperty('original_word_count');
      expect(response.body).toHaveProperty('improved_word_count');
      expect(response.body).toHaveProperty('improvement_ratio');
    });

    it('應該成功調整內容語調', async () => {
      const improveData = {
        original_content: '我們公司很厲害，做了很多專案。',
        improvement_type: 'adjust_tone',
        tone: 'formal'
      };

      const response = await request(app)
        .post('/api/v1/ai/improve')
        .set('Authorization', `Bearer ${authToken}`)
        .send(improveData)
        .expect(200);

      expect(response.body).toHaveProperty('improved_content');
      expect(response.body).toHaveProperty('improvement_type', 'adjust_tone');
      // 改進後的內容應該更正式
      expect(response.body.improved_content).not.toContain('很厲害');
    });

    it('應該成功修正語法錯誤', async () => {
      const improveData = {
        original_content: '我們公司在去年的時候成立了，然後開始做軟體的開發工作。',
        improvement_type: 'fix_grammar',
        tone: 'professional'
      };

      const response = await request(app)
        .post('/api/v1/ai/improve')
        .set('Authorization', `Bearer ${authToken}`)
        .send(improveData)
        .expect(200);

      expect(response.body).toHaveProperty('improved_content');
      expect(response.body).toHaveProperty('improvement_type', 'fix_grammar');
      // 改進後的內容應該語法更正確
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 original_content 和 improvement_type
        tone: 'professional'
      };

      const response = await request(app)
        .post('/api/v1/ai/improve')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證原始內容不能為空', async () => {
      const emptyContentData = {
        original_content: '',
        improvement_type: 'enhance_detail'
      };

      const response = await request(app)
        .post('/api/v1/ai/improve')
        .set('Authorization', `Bearer ${authToken}`)
        .send(emptyContentData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const improveData = {
        original_content: '測試內容',
        improvement_type: 'enhance_detail'
      };

      const response = await request(app)
        .post('/api/v1/ai/improve')
        .send(improveData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/ai/usage', () => {
    it('應該返回用戶的 AI 使用統計', async () => {
      const response = await request(app)
        .get('/api/v1/ai/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user_id', testUserId);
      expect(response.body).toHaveProperty('total_requests');
      expect(response.body).toHaveProperty('current_month_requests');
      expect(response.body).toHaveProperty('total_tokens_used');
      expect(response.body).toHaveProperty('monthly_limit');
      expect(response.body).toHaveProperty('remaining_quota');
      expect(response.body).toHaveProperty('usage_history');
      expect(Array.isArray(response.body.usage_history)).toBe(true);
      expect(typeof response.body.total_requests).toBe('number');
      expect(typeof response.body.current_month_requests).toBe('number');
      expect(typeof response.body.total_tokens_used).toBe('number');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get('/api/v1/ai/usage')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});