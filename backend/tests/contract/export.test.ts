import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('文件匯出 API 合約測試', () => {
  let authToken: string;
  let testUserId: string;
  let testCompanyId: string;
  let testTemplateId: string;
  let testProposalId: string;
  let testSectionIds: string[];

  beforeAll(async () => {
    // 清理測試資料
    await prisma.proposalSection.deleteMany({
      where: { proposal: { proposal_name: { startsWith: '匯出測試標書' } } }
    });
    await prisma.proposal.deleteMany({
      where: { proposal_name: { startsWith: '匯出測試標書' } }
    });
    await prisma.formatSpec.deleteMany({
      where: { template: { template_name: { startsWith: '匯出測試範本' } } }
    });
    await prisma.templateSection.deleteMany({
      where: { template: { template_name: { startsWith: '匯出測試範本' } } }
    });
    await prisma.proposalTemplate.deleteMany({
      where: { template_name: { startsWith: '匯出測試範本' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'exporttest' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '55555' } }
    });
  });

  beforeEach(async () => {
    // 創建測試公司和用戶
    const testCompany = await prisma.company.create({
      data: {
        company_name: '匯出測試公司股份有限公司',
        tax_id: '55555555',
        address: '台北市匯出區測試路707號',
        phone: '02-5555-5555',
        email: 'export@company.com',
        capital: 200000000,
        established_date: new Date('2018-03-10'),
        website: 'https://export-company.com'
      }
    });

    testCompanyId = testCompany.id;

    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'exporttest@example.com',
        password: hashedPassword,
        name: '匯出測試用戶',
        role: 'ADMIN',
        company_id: testCompanyId,
      },
    });

    testUserId = testUser.id;

    // 創建測試範本
    const testTemplate = await prisma.proposalTemplate.create({
      data: {
        template_name: '匯出測試範本',
        template_type: 'GOVERNMENT_GRANT',
        description: '用於匯出測試的標書範本',
        created_by: testUserId
      }
    });

    testTemplateId = testTemplate.id;

    // 創建格式規格
    await prisma.formatSpec.create({
      data: {
        template_id: testTemplateId,
        page_size: 'A4',
        margins: { top: 25, right: 20, bottom: 25, left: 20 },
        font_family: 'Times New Roman',
        font_size: 12,
        line_height: 1.5,
        max_pages: 30,
        other_requirements: {
          include_page_numbers: true,
          include_table_of_contents: true,
          include_header_footer: true
        }
      }
    });

    // 創建範本章節
    const templateSections = await prisma.templateSection.createMany({
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
        },
        {
          template_id: testTemplateId,
          section_name: '預期效益',
          section_order: 3,
          is_required: false,
          data_types: ['CUSTOM_INPUT']
        }
      ]
    });

    // 獲取章節 IDs
    const sections = await prisma.templateSection.findMany({
      where: { template_id: testTemplateId },
      orderBy: { section_order: 'asc' }
    });
    testSectionIds = sections.map(s => s.id);

    // 創建測試標書
    const testProposal = await prisma.proposal.create({
      data: {
        proposal_name: '匯出測試標書',
        template_id: testTemplateId,
        company_id: testCompanyId,
        status: 'COMPLETED',
        created_by: testUserId,
        last_edited_by: testUserId,
        word_count: 1500,
        generated_with_ai: true
      }
    });

    testProposalId = testProposal.id;

    // 創建標書章節內容
    await prisma.proposalSection.createMany({
      data: [
        {
          proposal_id: testProposalId,
          section_id: testSectionIds[0],
          content: '匯出測試公司股份有限公司成立於2018年，是一家專精於軟體開發的科技公司。公司資本額為新台幣兩億元，主要業務涵蓋系統整合、應用程式開發及技術諮詢服務。我們致力於提供創新的解決方案，協助客戶提升營運效率。',
          word_count: 80,
          is_ai_generated: true,
          ai_confidence_score: 0.95,
          section_order: 1
        },
        {
          proposal_id: testProposalId,
          section_id: testSectionIds[1],
          content: '本專案執行計畫分為四個階段：需求分析、系統設計、開發實作、測試部署。第一階段將進行詳細的需求收集與分析，預計耗時2週；第二階段進行系統架構設計與技術選型，預計耗時3週；第三階段進行系統開發與整合，預計耗時8週；第四階段進行測試與上線部署，預計耗時2週。整體專案預計耗時15週完成。',
          word_count: 120,
          is_ai_generated: false,
          section_order: 2
        },
        {
          proposal_id: testProposalId,
          section_id: testSectionIds[2],
          content: '本專案完成後，預期將帶來以下效益：1. 提升作業效率30%以上；2. 減少人工錯誤率50%；3. 節省人力成本每年約100萬元；4. 提升客戶滿意度至95%以上；5. 增加系統穩定性與可維護性。這些效益將有助於提升公司整體競爭力。',
          word_count: 85,
          is_ai_generated: true,
          ai_confidence_score: 0.88,
          section_order: 3
        }
      ]
    });

    // 獲取認證 token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'exporttest@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // 清理測試資料
    await prisma.proposalSection.deleteMany({
      where: { proposal_id: testProposalId }
    });
    await prisma.proposal.delete({
      where: { id: testProposalId }
    });
    await prisma.formatSpec.deleteMany({
      where: { template_id: testTemplateId }
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

  describe('POST /api/v1/proposals/:id/export', () => {
    it('應該成功匯出 PDF 格式', async () => {
      const exportData = {
        format: 'pdf',
        export_options: {
          include_cover_page: true,
          include_table_of_contents: true,
          include_page_numbers: true,
          watermark: false
        }
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('export_id');
      expect(response.body).toHaveProperty('format', 'pdf');
      expect(response.body).toHaveProperty('file_name');
      expect(response.body.file_name).toMatch(/\.pdf$/);
      expect(response.body).toHaveProperty('file_size');
      expect(typeof response.body.file_size).toBe('number');
      expect(response.body).toHaveProperty('download_url');
      expect(response.body).toHaveProperty('expires_at');
      expect(response.body).toHaveProperty('export_status', 'completed');
      expect(response.body).toHaveProperty('created_at');

      // 驗證匯出統計
      expect(response.body).toHaveProperty('export_stats');
      expect(response.body.export_stats).toHaveProperty('total_pages');
      expect(response.body.export_stats).toHaveProperty('total_words', 1500);
      expect(response.body.export_stats).toHaveProperty('sections_included', 3);
    });

    it('應該成功匯出 DOCX 格式', async () => {
      const exportData = {
        format: 'docx',
        export_options: {
          include_comments: false,
          track_changes: false,
          template_style: 'professional'
        }
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('format', 'docx');
      expect(response.body.file_name).toMatch(/\.docx$/);
      expect(response.body).toHaveProperty('download_url');
      expect(response.body).toHaveProperty('export_status', 'completed');
    });

    it('應該成功匯出 ODT 格式', async () => {
      const exportData = {
        format: 'odt',
        export_options: {
          include_metadata: true
        }
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('format', 'odt');
      expect(response.body.file_name).toMatch(/\.odt$/);
      expect(response.body).toHaveProperty('download_url');
      expect(response.body).toHaveProperty('export_status', 'completed');
    });

    it('應該成功匯出選定章節', async () => {
      const exportData = {
        format: 'pdf',
        selected_sections: [testSectionIds[0], testSectionIds[2]], // 只匯出第1和第3章節
        export_options: {
          include_cover_page: false,
          include_table_of_contents: false
        }
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect(200);

      expect(response.body).toHaveProperty('export_stats');
      expect(response.body.export_stats.sections_included).toBe(2);
      // 字數應該是選定章節的總和
      expect(response.body.export_stats.total_words).toBe(165); // 80 + 85
    });

    it('應該支援自訂格式設定', async () => {
      const exportData = {
        format: 'pdf',
        custom_format: {
          page_size: 'A4',
          margins: { top: 30, right: 25, bottom: 30, left: 25 },
          font_family: 'Arial',
          font_size: 11,
          line_height: 1.6,
          header: '匯出測試公司 - 政府補助申請書',
          footer: '第 {page} 頁 / 共 {total_pages} 頁'
        },
        export_options: {
          include_cover_page: true,
          cover_page_template: 'formal',
          watermark: true,
          watermark_text: '機密文件'
        }
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect(200);

      expect(response.body).toHaveProperty('format', 'pdf');
      expect(response.body).toHaveProperty('export_status', 'completed');
    });

    it('應該驗證必填欄位', async () => {
      const incompleteData = {
        // 缺少必填的 format
        export_options: {
          include_cover_page: true
        }
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證匯出格式', async () => {
      const invalidFormatData = {
        format: 'invalid_format'
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidFormatData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該驗證標書是否存在', async () => {
      const exportData = {
        format: 'pdf'
      };

      const response = await request(app)
        .post('/api/v1/proposals/nonexistent-id/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該驗證選定章節是否存在', async () => {
      const invalidSectionData = {
        format: 'pdf',
        selected_sections: ['nonexistent-section-id']
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSectionData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕匯出草稿狀態的標書', async () => {
      // 將標書狀態改為草稿
      await prisma.proposal.update({
        where: { id: testProposalId },
        data: { status: 'DRAFT' }
      });

      const exportData = {
        format: 'pdf'
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body.message).toContain('只能匯出已完成或已提交的標書');
    });

    it('應該處理文件生成失敗的情況', async () => {
      const exportData = {
        format: 'pdf',
        force_export_error: true // 測試用標記
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 500);
      expect(response.body.message).toContain('文件生成失敗');
    });

    it('應該拒絕未認證的請求', async () => {
      const exportData = {
        format: 'pdf'
      };

      const response = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .send(exportData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/proposals/:id/exports', () => {
    it('應該返回標書的匯出歷史', async () => {
      // 先進行一次匯出以創建歷史記錄
      await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'pdf' });

      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}/exports`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const exportRecord = response.body[0];
      expect(exportRecord).toHaveProperty('export_id');
      expect(exportRecord).toHaveProperty('format', 'pdf');
      expect(exportRecord).toHaveProperty('file_name');
      expect(exportRecord).toHaveProperty('file_size');
      expect(exportRecord).toHaveProperty('export_status');
      expect(exportRecord).toHaveProperty('download_url');
      expect(exportRecord).toHaveProperty('expires_at');
      expect(exportRecord).toHaveProperty('created_at');
      expect(exportRecord).toHaveProperty('export_stats');
    });

    it('應該按建立時間降序排列', async () => {
      // 進行多次匯出
      await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'pdf' });

      await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'docx' });

      const response = await request(app)
        .get(`/api/v1/proposals/${testProposalId}/exports`)
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
        .get(`/api/v1/proposals/${testProposalId}/exports`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/exports/:exportId/download', () => {
    let exportId: string;

    beforeEach(async () => {
      // 創建匯出記錄
      const exportResponse = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'pdf' });

      exportId = exportResponse.body.export_id;
    });

    it('應該成功下載匯出的檔案', async () => {
      const response = await request(app)
        .get(`/api/v1/exports/${exportId}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 驗證回應標頭
      expect(response.headers['content-type']).toMatch(/application\/pdf/);
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');

      // 驗證檔案內容存在
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('應該驗證匯出 ID 是否存在', async () => {
      const response = await request(app)
        .get('/api/v1/exports/nonexistent-export-id/download')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('應該檢查檔案是否已過期', async () => {
      // 模擬過期的匯出檔案
      const response = await request(app)
        .get(`/api/v1/exports/${exportId}/download?force_expired=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(410);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 410);
      expect(response.body.message).toContain('檔案已過期');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .get(`/api/v1/exports/${exportId}/download`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/exports/:exportId', () => {
    let exportId: string;

    beforeEach(async () => {
      // 創建匯出記錄
      const exportResponse = await request(app)
        .post(`/api/v1/proposals/${testProposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'pdf' });

      exportId = exportResponse.body.export_id;
    });

    it('應該成功刪除匯出檔案', async () => {
      const response = await request(app)
        .delete(`/api/v1/exports/${exportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 驗證檔案已無法下載
      await request(app)
        .get(`/api/v1/exports/${exportId}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('應該驗證匯出 ID 是否存在', async () => {
      const response = await request(app)
        .delete('/api/v1/exports/nonexistent-export-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('應該拒絕未認證的請求', async () => {
      const response = await request(app)
        .delete(`/api/v1/exports/${exportId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});