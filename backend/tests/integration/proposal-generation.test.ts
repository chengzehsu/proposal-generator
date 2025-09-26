import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('完整標書生成流程整合測試', () => {
  let authToken: string;
  let testUserId: string;
  let testCompanyId: string;

  const testUserData = {
    email: 'proposal-integration@example.com',
    password: 'TestPassword123!',
    name: '標書整合測試用戶'
  };

  const testCompanyData = {
    company_name: '標書測試科技股份有限公司',
    tax_id: '98765432',
    address: '台北市信義區信義路五段7號',
    phone: '02-2725-5200',
    email: 'proposal@tech-company.com',
    capital: 500000000,
    established_date: '2015-03-15',
    website: 'https://tech-company.com'
  };

  beforeAll(async () => {
    // 清理測試資料
    await cleanupTestData();
  });

  beforeEach(async () => {
    // 設置測試環境
    await setupTestEnvironment();
  });

  afterEach(async () => {
    // 清理測試資料
    await cleanupTestData();
  });

  async function cleanupTestData() {
    await prisma.proposalSection.deleteMany({
      where: { proposal: { company: { tax_id: { startsWith: '98765' } } } }
    });
    await prisma.proposal.deleteMany({
      where: { company: { tax_id: { startsWith: '98765' } } }
    });
    await prisma.templateSection.deleteMany({
      where: { template: { template_name: { startsWith: '整合測試範本' } } }
    });
    await prisma.proposalTemplate.deleteMany({
      where: { template_name: { startsWith: '整合測試範本' } }
    });
    await prisma.project.deleteMany({
      where: { company: { tax_id: { startsWith: '98765' } } }
    });
    await prisma.award.deleteMany({
      where: { company: { tax_id: { startsWith: '98765' } } }
    });
    await prisma.teamMember.deleteMany({
      where: { company: { tax_id: { startsWith: '98765' } } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'proposal-integration' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '98765' } }
    });
  }

  async function setupTestEnvironment() {
    // 註冊用戶和公司
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...testUserData,
        company: testCompanyData
      });

    testUserId = registerResponse.body.user.id;
    testCompanyId = registerResponse.body.user.company_id;
    authToken = registerResponse.body.token;

    // 創建測試資料
    await createTestData();
  }

  async function createTestData() {
    // 創建團隊成員資料
    await request(app)
      .post('/api/v1/team-members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '張資深工程師',
        title: '技術總監',
        department: '研發部',
        education: '台大資工系碩士',
        experience: '10年軟體開發經驗，專精於系統架構設計',
        expertise: 'Node.js, React, Python, AWS, Docker',
        is_key_member: true
      });

    await request(app)
      .post('/api/v1/team-members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '李專案經理',
        title: '資深專案經理',
        department: '專案管理部',
        education: '政大企管系學士',
        experience: '8年專案管理經驗，擅長敏捷開發方法',
        expertise: 'Scrum, Kanban, Risk Management, Stakeholder Communication',
        is_key_member: true
      });

    // 創建專案實績
    await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        project_name: '智慧城市管理平台',
        client_name: '台北市政府',
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        amount: 15000000,
        scale: '大型專案',
        description: '為台北市政府開發智慧城市綜合管理平台，整合交通、環境、安全等多項城市數據',
        achievements: '成功提升城市管理效率30%，獲得政府高度評價',
        tags: ['智慧城市', '大數據', '物聯網', '政府專案'],
        is_public: true
      });

    await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        project_name: '企業數位轉型解決方案',
        client_name: '富邦金控',
        start_date: '2023-06-01',
        end_date: '2024-02-28',
        amount: 25000000,
        scale: '超大型專案',
        description: '協助富邦金控進行全面數位轉型，包含核心系統現代化、數據分析平台建置',
        achievements: '大幅提升業務處理效率，降低營運成本20%',
        tags: ['數位轉型', '金融科技', '雲端架構'],
        is_public: true
      });

    // 創建獲獎紀錄
    await request(app)
      .post('/api/v1/awards')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        award_name: '數位創新獎',
        issuer: '經濟部',
        award_date: '2023-11-15',
        description: '在數位轉型領域的創新應用獲得政府肯定',
        award_type: 'GOVERNMENT_GRANT',
        amount: 2000000
      });

    await request(app)
      .post('/api/v1/awards')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        award_name: '最佳技術團隊獎',
        issuer: '台灣軟體產業協會',
        award_date: '2024-01-20',
        description: '技術團隊在軟體開發領域的卓越表現',
        award_type: 'RECOGNITION'
      });
  }

  describe('從零開始的完整標書生成流程', () => {
    it('應該完成從範本創建到標書生成的完整流程', async () => {
      // 步驟1: 創建標書範本
      const templateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          template_name: '整合測試範本 - 政府補助申請',
          template_type: 'GOVERNMENT_GRANT',
          description: '專門用於政府數位轉型補助申請的標書範本',
          sections: [
            {
              section_name: '申請單位基本資料',
              section_order: 1,
              is_required: true,
              min_words: 200,
              max_words: 500,
              content_hint: '請詳細介紹申請單位的基本資訊、成立背景、主要業務等',
              data_types: ['COMPANY_BASIC', 'COMPANY_PROFILE'],
              score_weight: 15.00
            },
            {
              section_name: '執行團隊介紹',
              section_order: 2,
              is_required: true,
              min_words: 300,
              max_words: 800,
              content_hint: '請介紹執行本專案的核心團隊成員及其專業背景',
              data_types: ['TEAM_MEMBERS'],
              score_weight: 20.00
            },
            {
              section_name: '過往執行實績',
              section_order: 3,
              is_required: true,
              min_words: 400,
              max_words: 1000,
              content_hint: '請展示與本專案相關的成功執行實績',
              data_types: ['PROJECTS', 'AWARDS'],
              score_weight: 25.00
            },
            {
              section_name: '專案執行計畫',
              section_order: 4,
              is_required: true,
              min_words: 500,
              max_words: 1500,
              content_hint: '請詳述專案執行方法、時程規劃、品質控管等',
              data_types: ['CUSTOM_INPUT'],
              score_weight: 30.00
            },
            {
              section_name: '預期效益與影響',
              section_order: 5,
              is_required: false,
              min_words: 200,
              max_words: 600,
              content_hint: '請說明專案完成後的預期效益和社會影響',
              data_types: ['CUSTOM_INPUT'],
              score_weight: 10.00
            }
          ],
          format_spec: {
            page_size: 'A4',
            margins: { top: 25, right: 20, bottom: 25, left: 20 },
            font_family: 'Times New Roman',
            font_size: 12,
            line_height: 1.5,
            max_pages: 25
          }
        })
        .expect(201);

      const templateId = templateResponse.body.id;

      // 驗證範本創建成功
      expect(templateResponse.body).toHaveProperty('template_name', '整合測試範本 - 政府補助申請');
      expect(templateResponse.body.sections).toHaveLength(5);
      expect(templateResponse.body).toHaveProperty('format_spec');

      // 步驟2: 使用 AI 生成完整標書
      const generateResponse = await request(app)
        .post('/api/v1/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          proposal_name: '數位政府服務優化專案申請書',
          template_id: templateId,
          generation_settings: {
            tone: 'professional',
            length_preference: 'detailed',
            include_examples: true,
            focus_areas: ['技術創新', '團隊優勢', '社會效益']
          },
          custom_sections: [
            {
              section_name: '專案執行計畫',
              custom_content: `
本專案將採用敏捷開發方法論，分為四個主要階段執行：

**第一階段：需求分析與系統設計（1-3個月）**
- 深入訪談政府相關單位，了解現有服務痛點
- 分析現有系統架構，制定數位化轉型策略
- 設計用戶友善的服務介面和流程

**第二階段：核心系統開發（4-8個月）**
- 建置雲端服務平台基礎架構
- 開發民眾服務入口網站
- 實作後台管理系統

**第三階段：整合測試與試運行（9-10個月）**
- 系統整合測試與效能調校
- 安全性測試與資料保護驗證
- 小範圍試運行並收集回饋

**第四階段：正式上線與維護（11-12個月）**
- 全面部署與監控系統建置
- 用戶培訓與技術文件交付
- 建立長期維護機制
              `
            }
          ]
        })
        .expect(201);

      const proposalId = generateResponse.body.id;

      // 驗證標書生成成功
      expect(generateResponse.body).toHaveProperty('proposal_name', '數位政府服務優化專案申請書');
      expect(generateResponse.body).toHaveProperty('generated_with_ai', true);
      expect(generateResponse.body).toHaveProperty('sections');
      expect(generateResponse.body.sections).toHaveLength(5);
      expect(generateResponse.body).toHaveProperty('generation_summary');

      // 步驟3: 檢視生成的標書內容
      const proposalResponse = await request(app)
        .get(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 驗證各章節內容
      const sections = proposalResponse.body.sections;
      expect(sections).toHaveLength(5);

      // 驗證第一章節（公司基本資料）包含公司資訊
      const companySection = sections.find((s: any) => s.section_name === '申請單位基本資料');
      expect(companySection.content).toContain('標書測試科技股份有限公司');
      expect(companySection.is_ai_generated).toBe(true);

      // 驗證第二章節（執行團隊）包含團隊成員資訊
      const teamSection = sections.find((s: any) => s.section_name === '執行團隊介紹');
      expect(teamSection.content).toContain('張資深工程師');
      expect(teamSection.content).toContain('李專案經理');
      expect(teamSection.is_ai_generated).toBe(true);

      // 驗證第三章節（過往實績）包含專案和獲獎資訊
      const achievementSection = sections.find((s: any) => s.section_name === '過往執行實績');
      expect(achievementSection.content).toContain('智慧城市管理平台');
      expect(achievementSection.content).toContain('數位創新獎');
      expect(achievementSection.is_ai_generated).toBe(true);

      // 驗證第四章節（執行計畫）使用自訂內容
      const planSection = sections.find((s: any) => s.section_name === '專案執行計畫');
      expect(planSection.content).toContain('敏捷開發方法論');
      expect(planSection.content).toContain('第一階段：需求分析與系統設計');
      expect(planSection.is_ai_generated).toBe(false); // 自訂內容

      // 步驟4: 重新生成某個章節
      const regenerateResponse = await request(app)
        .post(`/api/v1/proposals/${proposalId}/regenerate-section`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section_id: companySection.id,
          generation_settings: {
            tone: 'confident',
            length_preference: 'detailed',
            focus_keywords: ['創新技術', '數位轉型', '專業團隊']
          },
          additional_context: '強調公司在政府專案方面的豐富經驗'
        })
        .expect(200);

      // 驗證重新生成成功
      expect(regenerateResponse.body.content).not.toBe(companySection.content);
      expect(regenerateResponse.body.is_ai_generated).toBe(true);

      // 步驟5: 查看生成狀態統計
      const statusResponse = await request(app)
        .get(`/api/v1/proposals/${proposalId}/generation-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body).toHaveProperty('generated_with_ai', true);
      expect(statusResponse.body).toHaveProperty('ai_generated_sections', 4); // 除了自訂章節
      expect(statusResponse.body).toHaveProperty('manual_sections', 1);
      expect(statusResponse.body).toHaveProperty('total_word_count');
      expect(statusResponse.body.total_word_count).toBeGreaterThan(1000);

      // 步驟6: 將標書狀態更新為完成
      const updateResponse = await request(app)
        .put(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'COMPLETED'
        })
        .expect(200);

      expect(updateResponse.body.status).toBe('COMPLETED');

      // 步驟7: 匯出為 PDF
      const exportResponse = await request(app)
        .post(`/api/v1/proposals/${proposalId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'pdf',
          export_options: {
            include_cover_page: true,
            include_table_of_contents: true,
            include_page_numbers: true
          }
        })
        .expect(200);

      expect(exportResponse.body).toHaveProperty('format', 'pdf');
      expect(exportResponse.body).toHaveProperty('file_name');
      expect(exportResponse.body).toHaveProperty('download_url');
      expect(exportResponse.body).toHaveProperty('export_status', 'completed');

      // 步驟8: 複製標書
      const duplicateResponse = await request(app)
        .post(`/api/v1/proposals/${proposalId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          proposal_name: '數位政府服務優化專案申請書 - 副本'
        })
        .expect(201);

      expect(duplicateResponse.body).toHaveProperty('proposal_name', '數位政府服務優化專案申請書 - 副本');
      expect(duplicateResponse.body.status).toBe('DRAFT');
      expect(duplicateResponse.body.id).not.toBe(proposalId);
    });
  });

  describe('多人協作標書編輯流程', () => {
    let editorToken: string;
    let templateId: string;
    let proposalId: string;

    beforeEach(async () => {
      // 邀請編輯者
      const inviteResponse = await request(app)
        .post('/api/v1/auth/invite-user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'proposal-editor@example.com',
          name: '標書編輯者',
          role: 'EDITOR'
        });

      const acceptResponse = await request(app)
        .post('/api/v1/auth/accept-invite')
        .send({
          token: inviteResponse.body.invite_token,
          password: 'EditorPassword123!',
          confirm_password: 'EditorPassword123!'
        });

      editorToken = acceptResponse.body.token;

      // 創建範本和標書
      const templateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          template_name: '整合測試範本 - 協作版',
          template_type: 'ENTERPRISE_BID',
          sections: [
            {
              section_name: '公司簡介',
              section_order: 1,
              is_required: true,
              data_types: ['COMPANY_BASIC']
            },
            {
              section_name: '技術方案',
              section_order: 2,
              is_required: true,
              data_types: ['CUSTOM_INPUT']
            }
          ]
        });

      templateId = templateResponse.body.id;

      const proposalResponse = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          proposal_name: '協作測試標書',
          template_id: templateId
        });

      proposalId = proposalResponse.body.id;
    });

    it('應該支援多人協作編輯標書', async () => {
      // 管理員編輯第一章節
      const adminSectionResponse = await request(app)
        .get(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const companySectionId = adminSectionResponse.body.sections.find(
        (s: any) => s.section_name === '公司簡介'
      ).id;

      await request(app)
        .put(`/api/v1/proposals/${proposalId}/sections/${companySectionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '我們是一家專業的科技公司，由管理員編輯'
        })
        .expect(200);

      // 編輯者編輯第二章節
      const techSectionId = adminSectionResponse.body.sections.find(
        (s: any) => s.section_name === '技術方案'
      ).id;

      await request(app)
        .put(`/api/v1/proposals/${proposalId}/sections/${techSectionId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          content: '我們採用最新的技術架構，由編輯者編輯'
        })
        .expect(200);

      // 驗證兩人的編輯都成功保存
      const finalResponse = await request(app)
        .get(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const companySection = finalResponse.body.sections.find(
        (s: any) => s.section_name === '公司簡介'
      );
      const techSection = finalResponse.body.sections.find(
        (s: any) => s.section_name === '技術方案'
      );

      expect(companySection.content).toContain('由管理員編輯');
      expect(techSection.content).toContain('由編輯者編輯');
      expect(finalResponse.body.last_edited_by).toBeTruthy(); // 有最後編輯者記錄
    });
  });

  describe('錯誤處理和資料一致性', () => {
    it('應該在生成失敗時保持資料一致性', async () => {
      // 創建範本
      const templateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          template_name: '整合測試範本 - 錯誤處理',
          template_type: 'CUSTOM',
          sections: [
            {
              section_name: '測試章節',
              section_order: 1,
              is_required: true,
              data_types: ['COMPANY_BASIC']
            }
          ]
        });

      // 嘗試生成標書但故意觸發錯誤
      const failedGenerateResponse = await request(app)
        .post('/api/v1/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          proposal_name: '錯誤處理測試標書',
          template_id: templateResponse.body.id,
          force_ai_error: true // 強制 AI 錯誤
        })
        .expect(503);

      expect(failedGenerateResponse.body).toHaveProperty('error');

      // 驗證沒有創建不完整的標書
      const proposalsResponse = await request(app)
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const errorProposal = proposalsResponse.body.find(
        (p: any) => p.proposal_name === '錯誤處理測試標書'
      );

      expect(errorProposal).toBeUndefined(); // 不應該存在
    });

    it('應該處理並發編輯衝突', async () => {
      // 創建範本和標書
      const templateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          template_name: '整合測試範本 - 並發測試',
          template_type: 'CUSTOM',
          sections: [
            {
              section_name: '並發測試章節',
              section_order: 1,
              is_required: true,
              data_types: ['CUSTOM_INPUT']
            }
          ]
        });

      const proposalResponse = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          proposal_name: '並發編輯測試標書',
          template_id: templateResponse.body.id
        });

      const proposalId = proposalResponse.body.id;

      // 模擬兩個用戶同時編輯同一個標書
      const updatePromises = [
        request(app)
          .put(`/api/v1/proposals/${proposalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            proposal_name: '並發編輯測試標書 - 版本1'
          }),
        request(app)
          .put(`/api/v1/proposals/${proposalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            proposal_name: '並發編輯測試標書 - 版本2'
          })
      ];

      // 兩個請求應該都能成功（最後的勝出）
      const results = await Promise.allSettled(updatePromises);
      const successful = results.filter(r => r.status === 'fulfilled');

      expect(successful.length).toBeGreaterThan(0);

      // 驗證最終狀態一致
      const finalResponse = await request(app)
        .get(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalResponse.body.proposal_name).toMatch(/並發編輯測試標書 - 版本[12]/);
    });
  });
});