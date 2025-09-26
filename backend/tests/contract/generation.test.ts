import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('標書生成 API 合約測試', () => {
  let authToken: string;
  let testUserId: string;
  let testCompanyId: string;
  let testTemplateId: string;
  let testSectionIds: string[];
  let testProjectId: string;
  let testAwardId: string;
  let testTeamMemberId: string;

  beforeAll(async () => {
    // 清理測試資料
    await prisma.proposalSection.deleteMany({
      where: { proposal: { proposal_name: { startsWith: '生成測試標書' } } }
    });
    await prisma.proposal.deleteMany({
      where: { proposal_name: { startsWith: '生成測試標書' } }
    });
    await prisma.templateSection.deleteMany({
      where: { template: { template_name: { startsWith: '生成測試範本' } } }
    });
    await prisma.proposalTemplate.deleteMany({
      where: { template_name: { startsWith: '生成測試範本' } }
    });
    await prisma.project.deleteMany({
      where: { project_name: { startsWith: '生成測試專案' } }
    });
    await prisma.award.deleteMany({
      where: { award_name: { startsWith: '生成測試獎項' } }
    });
    await prisma.teamMember.deleteMany({
      where: { name: { startsWith: '生成測試成員' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'generationtest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '33333' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: '生成測試公司股份有限公司',
        tax_id: '33333333',
        address: '台北市生成區測試路606號',
        phone: '02-3333-3333',
        email: 'generation@company.com',
        capital: 100000000,
        established_date: new Date('2019-06-15'),
        website: 'https://generation-company.com'
      }
    });

    testCompanyId = testCompany.id;

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'generationtest@example.com',
        password: hashedPassword,
        name: '生成測試用戶',
        role: 'ADMIN',
        company_id: testCompanyId,
      },
    });

    testUserId = testUser.id;

    // 創建測試資料
    const testProject = await prisma.project.create({
      data: {
        company_id: testCompanyId,
        project_name: '生成測試專案',
        client_name: '生成測試客戶',
        description: '這是一個用於測試生成功能的專案',
        achievements: '成功實現所有功能需求',
        tags: ['Web開發', 'API設計', '資料庫設計']
      }
    });
    testProjectId = testProject.id;

    const testAward = await prisma.award.create({
      data: {
        company_id: testCompanyId,
        award_name: '生成測試獎項',
        issuer: '技術創新獎委員會',
        award_type: 'GOVERNMENT_GRANT',
        description: '在技術創新方面的傑出表現'
      }
    });
    testAwardId = testAward.id;

    const testMember = await prisma.teamMember.create({
      data: {
        company_id: testCompanyId,
        name: '生成測試成員',
        title: '資深軟體工程師',
        expertise: 'JavaScript, Python, React, Node.js',
        is_key_member: true
      }
    });
    testTeamMemberId = testMember.id;

    // 創建測試範本和章節
    const testTemplate = await prisma.proposalTemplate.create({
      data: {
        template_name: '生成測試範本',
        template_type: 'GOVERNMENT_GRANT',
        description: '用於生成測試的標書範本',
        created_by: testUserId
      }
    });

    testTemplateId = testTemplate.id;

    const templateSections = await prisma.templateSection.createMany({
      data: [
        {
          template_id: testTemplateId,
          section_name: '公司基本資料',
          section_order: 1,
          is_required: true,
          min_words: 100,
          max_words: 300,
          content_hint: '請介紹公司基本資訊',
          data_types: ['COMPANY_BASIC'],
          score_weight: 20.00
        },
        {
          template_id: testTemplateId,
          section_name: '執行團隊',
          section_order: 2,
          is_required: true,
          min_words: 150,
          max_words: 400,
          content_hint: '請介紹執行此專案的團隊成員',
          data_types: ['TEAM_MEMBERS'],
          score_weight: 25.00
        },
        {
          template_id: testTemplateId,
          section_name: '過往實績',
          section_order: 3,
          is_required: false,
          min_words: 200,
          max_words: 500,
          content_hint: '請展示相關的成功案例',
          data_types: ['PROJECTS', 'AWARDS'],
          score_weight: 30.00
        }
      ]
    });

    // 獲取章節 IDs
    const sections = await prisma.templateSection.findMany({
      where: { template_id: testTemplateId },
      orderBy: { section_order: 'asc' }
    });
    testSectionIds = sections.map(s => s.id);

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'generationtest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料
    await prisma.proposalSection.deleteMany({
      where: { proposal: { company_id: testCompanyId } }
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

  describe('POST /api/v1/proposals/generate', () => {
    it('應該成功生成完整標書', async () => {
      const generateData = {
        proposal_name: '生成測試標書A',
        template_id: testTemplateId,
        generation_settings: {
          tone: 'professional',
          length_preference: 'detailed',
          include_examples: true,
          focus_areas: ['技術能力', '團隊優勢']
        },
        custom_sections: [
          {
            section_name: '過往實績',
            custom_content: '我們在過去三年中完成了多項重要專案'
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('proposal_name', '生成測試標書A');
      expect(response.body).toHaveProperty('template_id', testTemplateId);
      expect(response.body).toHaveProperty('company_id', testCompanyId);
      expect(response.body).toHaveProperty('status', 'DRAFT');
      expect(response.body).toHaveProperty('generated_with_ai', true);
      expect(response.body).toHaveProperty('ai_generation_prompt');
      expect(response.body).toHaveProperty('sections');
      expect(Array.isArray(response.body.sections)).toBe(true);
      expect(response.body.sections.length).toBeGreaterThan(0);

      // 驗證章節內容
      const sections = response.body.sections;
      expect(sections.some((s: any) => s.section_name === '公司基本資料')).toBe(true);
      expect(sections.some((s: any) => s.section_name === '執行團隊')).toBe(true);

      // 驗證 AI 生成標記
      sections.forEach((section: any) => {
        if (section.section_name !== '過往實績') { // 自訂內容除外
          expect(section).toHaveProperty('is_ai_generated', true);
          expect(section).toHaveProperty('ai_confidence_score');
        }
      });

      expect(response.body).toHaveProperty('generation_summary');
      expect(response.body.generation_summary).toHaveProperty('total_sections_generated');
      expect(response.body.generation_summary).toHaveProperty('total_word_count');
      expect(response.body.generation_summary).toHaveProperty('average_confidence_score');
    });

    it('應該成功生成部分章節', async () => {
      const generateData = {
        proposal_name: '部分生成測試標書',
        template_id: testTemplateId,
        selected_sections: [testSectionIds[0], testSectionIds[1]], // 只生成前兩個章節
        generation_settings: {
          tone: 'confident',
          length_preference: 'concise'
        }
      };

      const response = await request(app)
        .post('/api/v1/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('sections');
      expect(response.body.sections.length).toBe(2); // 只有兩個章節
      expect(response.body).toHaveProperty('generation_summary');
      expect(response.body.generation_summary.total_sections_generated).toBe(2);
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 proposal_name 和 template_id
        generation_settings: {
          tone: 'professional'
        }
      };

      const response = await request(app)
        .post('/api/v1/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證範本是否存在', async () => {
      const invalidTemplateData = {
        proposal_name: '無效範本測試',
        template_id: 'nonexistent-template-id'
      };

      const response = await request(app)
        .post('/api/v1/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTemplateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該驗證選定章節存在於範本中', async () => {
      const invalidSectionData = {
        proposal_name: '無效章節測試',
        template_id: testTemplateId,
        selected_sections: ['nonexistent-section-id']
      };

      const response = await request(app)
        .post('/api/v1/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSectionData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證生成設定參數', async () => {
      const invalidSettingsData = {
        proposal_name: '無效設定測試',
        template_id: testTemplateId,
        generation_settings: {
          tone: 'invalid_tone',
          length_preference: 'invalid_length'
        }
      };

      const response = await request(app)
        .post('/api/v1/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSettingsData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該處理 AI 服務不可用的情況', async () => {
      const generateData = {
        proposal_name: 'AI錯誤測試標書',
        template_id: testTemplateId,
        force_ai_error: true // 測試用標記
      };

      const response = await request(app)
        .post('/api/v1/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateData)
        .expect('Content-Type', /json/)
        .expect(503);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 503);
      expect(response.body.message).toContain('AI生成服務暫時無法使用');
    });

    it('應該拒絕未認證的請求', async () => {
      const generateData = {
        proposal_name: '未認證生成測試',
        template_id: testTemplateId
      };

      const response = await request(app)
        .post('/api/v1/proposals/generate')
        .send(generateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/proposals/:id/regenerate-section', () => {
    let testProposalId: string;

    beforeEach(async () => {
      // 創建測試標書
      const testProposal = await prisma.proposal.create({
        data: {
          proposal_name: '重新生成測試標書',
          template_id: testTemplateId,
          company_id: testCompanyId,
          created_by: testUserId,
          last_edited_by: testUserId,
          generated_with_ai: true
        }
      });
      testProposalId = testProposal.id;

      // 創建測試章節
      await prisma.proposalSection.create({
        data: {
          proposal_id: testProposalId,
          section_id: testSectionIds[0],
          content: '原始的公司介紹內容',
          word_count: 50,
          is_ai_generated: true,
          ai_confidence_score: 0.85,
          section_order: 1
        }
      });
    });

    it('應該成功重新生成指定章節', async () => {
      const regenerateData = {
        section_id: testSectionIds[0],
        generation_settings: {
          tone: 'formal',
          length_preference: 'detailed',
          focus_keywords: ['創新', '技術領先', '專業團隊']
        },
        additional_context: '強調公司在技術創新方面的優勢'
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/regenerate-section`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(regenerateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('section_id', testSectionIds[0]);
      expect(response.body).toHaveProperty('content');
      expect(typeof response.body.content).toBe('string');
      expect(response.body.content.length).toBeGreaterThan(0);
      expect(response.body.content).not.toBe('原始的公司介紹內容'); // 內容應該改變
      expect(response.body).toHaveProperty('word_count');
      expect(response.body).toHaveProperty('is_ai_generated', true);
      expect(response.body).toHaveProperty('ai_confidence_score');
      expect(typeof response.body.ai_confidence_score).toBe('string'); // Decimal 轉為字串
      expect(response.body).toHaveProperty('updated_at');
    });

    it('應該驗證標書是否存在', async () => {
      const regenerateData = {
        section_id: testSectionIds[0]
      };

      const response = await request(app)
        .post('/api/v1/proposals/nonexistent-id/regenerate-section')
        .set('Authorization', `Bearer ${authToken}`)
        .send(regenerateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該驗證章節是否存在於標書中', async () => {
      const regenerateData = {
        section_id: 'nonexistent-section-id'
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/regenerate-section`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(regenerateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕重新生成已提交標書的章節', async () => {
      // 將標書狀態設為已提交
      await prisma.proposal.update({
        where: { id: testProposalId },
        data: { status: 'SUBMITTED' }
      });

      const regenerateData = {
        section_id: testSectionIds[0]
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/regenerate-section`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(regenerateData)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body.message).toContain('已提交的標書不可修改');
    });

    it('應該拒絕未認證的請求', async () => {
      const regenerateData = {
        section_id: testSectionIds[0]
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/regenerate-section`)
        .send(regenerateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/proposals/:id/generation-status', () => {
    let testProposalId: string;

    beforeEach(async () => {
      // 創建測試標書
      const testProposal = await prisma.proposal.create({
        data: {
          proposal_name: '生成狀態測試標書',
          template_id: testTemplateId,
          company_id: testCompanyId,
          created_by: testUserId,
          last_edited_by: testUserId,
          generated_with_ai: true,
          ai_generation_prompt: '生成一份專業的政府補助申請標書'
        }
      });
      testProposalId = testProposal.id;

      // 創建測試章節
      await prisma.proposalSection.createMany({
        data: [
          {
            proposal_id: testProposalId,
            section_id: testSectionIds[0],
            content: 'AI生成的公司介紹',
            word_count: 120,
            is_ai_generated: true,
            ai_confidence_score: 0.92,
            section_order: 1
          },
          {
            proposal_id: testProposalId,
            section_id: testSectionIds[1],
            content: 'AI生成的團隊介紹',
            word_count: 180,
            is_ai_generated: true,
            ai_confidence_score: 0.88,
            section_order: 2
          }
        ]
      });
    });

    it('應該返回標書的生成狀態統計', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}/generation-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('proposal_id', testProposalId);
      expect(response.body).toHaveProperty('generated_with_ai', true);
      expect(response.body).toHaveProperty('ai_generation_prompt', '生成一份專業的政府補助申請標書');
      expect(response.body).toHaveProperty('total_sections');
      expect(response.body).toHaveProperty('ai_generated_sections');
      expect(response.body).toHaveProperty('manual_sections');
      expect(response.body).toHaveProperty('total_word_count');
      expect(response.body).toHaveProperty('ai_word_count');
      expect(response.body).toHaveProperty('average_confidence_score');
      expect(response.body).toHaveProperty('section_details');

      expect(Array.isArray(response.body.section_details)).toBe(true);
      expect(response.body.section_details.length).toBe(2);

      // 驗證章節詳情
      const sectionDetail = response.body.section_details[0];
      expect(sectionDetail).toHaveProperty('section_name');
      expect(sectionDetail).toHaveProperty('word_count');
      expect(sectionDetail).toHaveProperty('is_ai_generated');
      expect(sectionDetail).toHaveProperty('ai_confidence_score');
    });

    it('應該驗證標書是否存在', async () => {
      const response = await request(app)
        .get('/api/v1/proposals/nonexistent-id/generation-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}/generation-status`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});