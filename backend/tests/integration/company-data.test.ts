import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('公司資料管理完整流程整合測試', () => {
  let authToken: string;
  let testUserId: string;
  let testCompanyId: string;

  const testUserData = {
    email: 'company-data-test@example.com',
    password: 'TestPassword123!',
    name: '公司資料測試用戶'
  };

  const initialCompanyData = {
    company_name: '資料測試科技有限公司',
    tax_id: '13579246',
    address: '台北市大安區復興南路一段390號',
    phone: '02-2701-5500',
    email: 'contact@data-test.com',
    capital: 10000000,
    established_date: '2020-05-20',
    website: 'https://data-test.com'
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
    await prisma.teamMember.deleteMany({
      where: { company: { tax_id: { startsWith: '13579' } } }
    });
    await prisma.project.deleteMany({
      where: { company: { tax_id: { startsWith: '13579' } } }
    });
    await prisma.award.deleteMany({
      where: { company: { tax_id: { startsWith: '13579' } } }
    });
    await prisma.milestone.deleteMany({
      where: { company: { tax_id: { startsWith: '13579' } } }
    });
    await prisma.capability.deleteMany({
      where: { company: { tax_id: { startsWith: '13579' } } }
    });
    await prisma.futurePlan.deleteMany({
      where: { company: { tax_id: { startsWith: '13579' } } }
    });
    await prisma.companyProfile.deleteMany({
      where: { company: { tax_id: { startsWith: '13579' } } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'company-data-test' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '13579' } }
    });
  }

  async function setupTestEnvironment() {
    // 註冊用戶和公司
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...testUserData,
        company: initialCompanyData
      });

    testUserId = registerResponse.body.user.id;
    testCompanyId = registerResponse.body.user.company_id;
    authToken = registerResponse.body.token;
  }

  describe('完整的公司資料建置流程', () => {
    it('應該完成從基本資料到完整檔案的建置', async () => {
      // 步驟1: 確認初始公司基本資料
      const initialResponse = await request(app)
        .get('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(initialResponse.body).toHaveProperty('company_name', initialCompanyData.company_name);
      expect(initialResponse.body).toHaveProperty('tax_id', initialCompanyData.tax_id);

      // 步驟2: 更新公司基本資料
      const updatedBasicData = {
        company_name: '資料測試科技股份有限公司', // 從有限公司變為股份有限公司
        address: '台北市信義區市府路1號',
        phone: '02-2720-8889',
        email: 'info@data-test.com.tw',
        capital: 50000000, // 增資
        website: 'https://www.data-test.com.tw',
        version: initialResponse.body.version
      };

      const updateBasicResponse = await request(app)
        .put('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedBasicData)
        .expect(200);

      expect(updateBasicResponse.body.company_name).toBe(updatedBasicData.company_name);
      expect(updateBasicResponse.body.capital).toBe(updatedBasicData.capital.toString());
      expect(updateBasicResponse.body.version).toBe(2); // 版本遞增

      // 步驟3: 創建公司檔案（多版本）
      const companyProfileData = {
        version_name: 'v1.0-標準版',
        vision: '成為台灣領先的數位轉型解決方案提供者',
        mission: '透過創新技術協助企業實現數位轉型，提升營運效率與競爭力',
        core_values: '創新、品質、服務、誠信',
        business_scope: '軟體開發、系統整合、雲端服務、數據分析、技術諮詢',
        description_full: `
資料測試科技股份有限公司成立於2020年，是一家專精於數位轉型解決方案的科技公司。
我們擁有一支經驗豐富的技術團隊，致力於為客戶提供最佳的數位化服務。

公司主要業務包括：
- 企業軟體開發
- 系統整合與現代化
- 雲端架構設計與部署
- 大數據分析與商業智能
- AI/ML 解決方案
- 技術諮詢服務

我們已成功為超過100家企業提供服務，涵蓋金融、製造、零售、政府等多個領域。
        `,
        description_medium: '專精於數位轉型的科技公司，提供軟體開發、系統整合、雲端服務等解決方案。已服務超過100家企業，在業界享有良好聲譽。',
        description_short: '數位轉型解決方案提供者，專精於軟體開發與系統整合'
      };

      const createProfileResponse = await request(app)
        .post('/api/v1/companies/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(companyProfileData)
        .expect(201);

      expect(createProfileResponse.body).toHaveProperty('version_name', 'v1.0-標準版');
      expect(createProfileResponse.body).toHaveProperty('vision', companyProfileData.vision);

      // 步驟4: 建置團隊成員資料
      const teamMembers = [
        {
          name: '陳技術長',
          title: '技術長',
          department: '技術部',
          education: '台大資工博士',
          experience: '15年軟體架構設計經驗，曾任職於Google、Microsoft等國際企業',
          expertise: 'Cloud Architecture, Microservices, AI/ML, DevOps',
          is_key_member: true,
          display_order: 1
        },
        {
          name: '林產品總監',
          title: '產品總監',
          department: '產品部',
          education: '交大管科碩士',
          experience: '12年產品管理經驗，專精於B2B SaaS產品策略',
          expertise: 'Product Strategy, User Experience, Agile Development',
          is_key_member: true,
          display_order: 2
        },
        {
          name: '王資深工程師',
          title: '資深全端工程師',
          department: '開發部',
          education: '成大資工系',
          experience: '8年全端開發經驗，擅長React、Node.js、Python',
          expertise: 'React, Node.js, Python, PostgreSQL, AWS',
          is_key_member: true,
          display_order: 3
        }
      ];

      const teamPromises = teamMembers.map(member =>
        request(app)
          .post('/api/v1/team-members')
          .set('Authorization', `Bearer ${authToken}`)
          .send(member)
      );

      const teamResponses = await Promise.all(teamPromises);
      teamResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.name).toBe(teamMembers[index].name);
      });

      // 步驟5: 建置專案實績
      const projects = [
        {
          project_name: '金融核心系統現代化專案',
          client_name: '第一銀行',
          start_date: '2023-01-01',
          end_date: '2023-10-31',
          amount: 80000000,
          scale: '超大型專案',
          description: '協助第一銀行進行核心銀行系統現代化，包含帳務系統、風控系統、客戶關係管理系統的重構與雲端化',
          achievements: '成功將處理效能提升300%，系統可用性達到99.99%，獲得客戶高度評價',
          tags: ['金融科技', '雲端架構', '微服務', '大型專案'],
          is_public: true
        },
        {
          project_name: '智慧製造管理平台',
          client_name: '台積電供應鏈廠商',
          start_date: '2023-03-01',
          end_date: '2023-12-31',
          amount: 45000000,
          scale: '大型專案',
          description: '開發智慧製造管理平台，整合IoT設備數據、生產排程、品質管控、設備維護等功能',
          achievements: '提升生產效率25%，降低設備停機時間40%，節省人力成本30%',
          tags: ['智慧製造', '物聯網', '數據分析', '製造業'],
          is_public: true
        }
      ];

      const projectPromises = projects.map(project =>
        request(app)
          .post('/api/v1/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(project)
      );

      const projectResponses = await Promise.all(projectPromises);
      projectResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.project_name).toBe(projects[index].project_name);
      });

      // 步驟6: 建置獲獎紀錄
      const awards = [
        {
          award_name: '數位轉型卓越獎',
          issuer: '經濟部數位發展部',
          award_date: '2023-12-15',
          description: '在協助企業數位轉型方面的傑出貢獻獲得政府肯定',
          award_type: 'GOVERNMENT_GRANT',
          amount: 5000000
        },
        {
          award_name: '最佳技術創新團隊',
          issuer: '台灣軟體產業協會',
          award_date: '2024-02-20',
          description: '在軟體技術創新領域的優異表現',
          award_type: 'RECOGNITION'
        }
      ];

      const awardPromises = awards.map(award =>
        request(app)
          .post('/api/v1/awards')
          .set('Authorization', `Bearer ${authToken}`)
          .send(award)
      );

      const awardResponses = await Promise.all(awardPromises);
      awardResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.award_name).toBe(awards[index].award_name);
      });

      // 步驟7: 建置公司重要里程碑
      const milestones = [
        {
          milestone_date: '2020-05-20',
          title: '公司正式成立',
          description: '資料測試科技股份有限公司正式成立，開始營運',
          milestone_type: 'COMPANY_FOUNDED',
          importance: 5
        },
        {
          milestone_date: '2021-03-01',
          title: '獲得第一個大型客戶',
          description: '成功簽約第一銀行核心系統現代化專案',
          milestone_type: 'MAJOR_CONTRACT',
          importance: 4
        },
        {
          milestone_date: '2022-08-15',
          title: '團隊擴編至50人',
          description: '隨著業務成長，技術團隊擴編至50人規模',
          milestone_type: 'TEAM_EXPANSION',
          importance: 3
        }
      ];

      const milestonePromises = milestones.map(milestone =>
        request(app)
          .post('/api/v1/companies/milestones')
          .set('Authorization', `Bearer ${authToken}`)
          .send(milestone)
      );

      const milestoneResponses = await Promise.all(milestonePromises);
      milestoneResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.title).toBe(milestones[index].title);
      });

      // 步驟8: 建置技術能力清單
      const capabilities = [
        {
          tech_name: 'Cloud Native Architecture',
          category: '雲端技術',
          proficiency: '專家級',
          related_projects: [], // 稍後關聯專案
          certifications: 'AWS Solutions Architect Professional, Google Cloud Professional Cloud Architect'
        },
        {
          tech_name: 'Microservices Development',
          category: '軟體架構',
          proficiency: '專家級',
          related_projects: [],
          certifications: 'Docker Certified Associate, Kubernetes Administrator'
        },
        {
          tech_name: 'AI/Machine Learning',
          category: '人工智慧',
          proficiency: '高級',
          related_projects: [],
          certifications: 'TensorFlow Developer Certificate, AWS Machine Learning Specialty'
        }
      ];

      const capabilityPromises = capabilities.map(capability =>
        request(app)
          .post('/api/v1/companies/capabilities')
          .set('Authorization', `Bearer ${authToken}`)
          .send(capability)
      );

      const capabilityResponses = await Promise.all(capabilityPromises);
      capabilityResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.tech_name).toBe(capabilities[index].tech_name);
      });

      // 步驟9: 建置未來發展計畫
      const futurePlans = [
        {
          title: '海外市場擴展計畫',
          content: `
預計在2024-2025年間擴展至東南亞市場，特別是新加坡和馬來西亞。
計畫內容包括：
1. 在新加坡設立分公司
2. 招聘當地技術人才
3. 建立區域客戶服務中心
4. 與當地系統整合商建立合作關係
          `,
          timeframe: '2024-2025',
          related_fields: ['國際化', '市場拓展', '人才招聘']
        },
        {
          title: 'AI產品線發展',
          content: `
基於現有的AI/ML能力，計畫開發自有的AI產品線：
1. 智慧文件處理平台
2. 企業知識管理系統
3. 客戶服務聊天機器人
4. 預測性維護解決方案
          `,
          timeframe: '2024-2026',
          related_fields: ['產品開發', '人工智慧', '創新技術']
        }
      ];

      const planPromises = futurePlans.map(plan =>
        request(app)
          .post('/api/v1/companies/future-plans')
          .set('Authorization', `Bearer ${authToken}`)
          .send(plan)
      );

      const planResponses = await Promise.all(planPromises);
      planResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.title).toBe(futurePlans[index].title);
      });

      // 步驟10: 驗證完整公司資料檢視
      const completeDataResponse = await request(app)
        .get('/api/v1/companies/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 驗證所有資料都正確載入
      expect(completeDataResponse.body).toHaveProperty('basic_info');
      expect(completeDataResponse.body).toHaveProperty('profile');
      expect(completeDataResponse.body).toHaveProperty('team_members');
      expect(completeDataResponse.body).toHaveProperty('projects');
      expect(completeDataResponse.body).toHaveProperty('awards');
      expect(completeDataResponse.body).toHaveProperty('milestones');
      expect(completeDataResponse.body).toHaveProperty('capabilities');
      expect(completeDataResponse.body).toHaveProperty('future_plans');

      expect(completeDataResponse.body.team_members).toHaveLength(3);
      expect(completeDataResponse.body.projects).toHaveLength(2);
      expect(completeDataResponse.body.awards).toHaveLength(2);
      expect(completeDataResponse.body.milestones).toHaveLength(3);
      expect(completeDataResponse.body.capabilities).toHaveLength(3);
      expect(completeDataResponse.body.future_plans).toHaveLength(2);

      // 步驟11: 生成公司簡介文件
      const companyIntroResponse = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content_type: 'company_comprehensive_profile',
          data_sources: ['COMPANY_BASIC', 'COMPANY_PROFILE', 'TEAM_MEMBERS', 'PROJECTS', 'AWARDS'],
          tone: 'professional',
          length: 'long',
          additional_context: '生成完整的公司簡介，用於商業提案和官方文件'
        })
        .expect(200);

      expect(companyIntroResponse.body).toHaveProperty('generated_content');
      expect(companyIntroResponse.body.generated_content).toContain('資料測試科技股份有限公司');
      expect(companyIntroResponse.body.word_count).toBeGreaterThan(500);
    });
  });

  describe('公司資料版本管理', () => {
    it('應該支援公司檔案的版本管理', async () => {
      // 創建第一個版本的公司檔案
      const v1ProfileData = {
        version_name: 'v1.0-基礎版',
        vision: '成為優秀的軟體公司',
        description_short: '軟體開發公司'
      };

      const v1Response = await request(app)
        .post('/api/v1/companies/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(v1ProfileData)
        .expect(201);

      // 創建第二個版本（詳細版）
      const v2ProfileData = {
        version_name: 'v2.0-詳細版',
        vision: '成為台灣領先的數位轉型解決方案提供者',
        mission: '透過創新技術協助企業實現數位轉型',
        core_values: '創新、品質、服務、誠信',
        description_short: '數位轉型解決方案提供者'
      };

      const v2Response = await request(app)
        .post('/api/v1/companies/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(v2ProfileData)
        .expect(201);

      // 創建第三個版本（投標專用版）
      const v3ProfileData = {
        version_name: 'v3.0-投標專用版',
        vision: '成為政府數位轉型的最佳合作夥伴',
        mission: '為政府機關提供專業的數位化解決方案',
        description_short: '政府數位化專業服務商'
      };

      const v3Response = await request(app)
        .post('/api/v1/companies/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(v3ProfileData)
        .expect(201);

      // 獲取所有版本列表
      const allVersionsResponse = await request(app)
        .get('/api/v1/companies/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(allVersionsResponse.body).toHaveLength(3);
      expect(allVersionsResponse.body.map((p: any) => p.version_name)).toEqual([
        'v3.0-投標專用版', // 最新的排在前面
        'v2.0-詳細版',
        'v1.0-基礎版'
      ]);

      // 指定使用特定版本
      const specificVersionResponse = await request(app)
        .get(`/api/v1/companies/profiles/${v2Response.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(specificVersionResponse.body.version_name).toBe('v2.0-詳細版');
      expect(specificVersionResponse.body.mission).toBe(v2ProfileData.mission);

      // 更新特定版本
      const updatedV1Data = {
        version_name: 'v1.1-基礎版更新',
        vision: v1ProfileData.vision,
        description_short: '專業軟體開發公司'
      };

      await request(app)
        .put(`/api/v1/companies/profiles/${v1Response.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedV1Data)
        .expect(200);

      // 驗證更新成功
      const updatedV1Response = await request(app)
        .get(`/api/v1/companies/profiles/${v1Response.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedV1Response.body.version_name).toBe('v1.1-基礎版更新');
      expect(updatedV1Response.body.description_short).toBe('專業軟體開發公司');
    });
  });

  describe('公司資料統計和分析', () => {
    beforeEach(async () => {
      // 建立完整的測試資料
      await createCompleteTestData();
    });

    async function createCompleteTestData() {
      // 建立團隊成員
      await request(app)
        .post('/api/v1/team-members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '統計測試成員',
          title: '工程師',
          is_key_member: true
        });

      // 建立專案
      const projectsData = [
        { project_name: '專案A', amount: 1000000, start_date: '2023-01-01', end_date: '2023-06-30' },
        { project_name: '專案B', amount: 2000000, start_date: '2023-07-01', end_date: '2023-12-31' },
        { project_name: '專案C', amount: 3000000, start_date: '2024-01-01', end_date: '2024-06-30' }
      ];

      for (const project of projectsData) {
        await request(app)
          .post('/api/v1/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(project);
      }

      // 建立獲獎紀錄
      const awardsData = [
        { award_name: '獎項A', award_type: 'GOVERNMENT_GRANT', amount: 500000 },
        { award_name: '獎項B', award_type: 'RECOGNITION' }
      ];

      for (const award of awardsData) {
        await request(app)
          .post('/api/v1/awards')
          .set('Authorization', `Bearer ${authToken}`)
          .send(award);
      }
    }

    it('應該提供公司資料統計摘要', async () => {
      const statsResponse = await request(app)
        .get('/api/v1/companies/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body).toHaveProperty('team_summary');
      expect(statsResponse.body.team_summary).toHaveProperty('total_members', 1);
      expect(statsResponse.body.team_summary).toHaveProperty('key_members', 1);

      expect(statsResponse.body).toHaveProperty('project_summary');
      expect(statsResponse.body.project_summary).toHaveProperty('total_projects', 3);
      expect(statsResponse.body.project_summary).toHaveProperty('total_amount', '6000000');

      expect(statsResponse.body).toHaveProperty('award_summary');
      expect(statsResponse.body.award_summary).toHaveProperty('total_awards', 2);
      expect(statsResponse.body.award_summary).toHaveProperty('total_amount', '500000');

      expect(statsResponse.body).toHaveProperty('data_completeness');
      expect(statsResponse.body.data_completeness).toHaveProperty('overall_score');
      expect(typeof statsResponse.body.data_completeness.overall_score).toBe('number');
    });
  });

  describe('資料導出和備份', () => {
    beforeEach(async () => {
      // 建立基本測試資料
      await request(app)
        .post('/api/v1/team-members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '導出測試成員',
          title: '測試工程師'
        });
    });

    it('應該支援完整公司資料導出', async () => {
      const exportResponse = await request(app)
        .post('/api/v1/companies/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'json',
          include_sections: [
            'basic_info',
            'profile',
            'team_members',
            'projects',
            'awards',
            'milestones',
            'capabilities',
            'future_plans'
          ]
        })
        .expect(200);

      expect(exportResponse.body).toHaveProperty('export_id');
      expect(exportResponse.body).toHaveProperty('format', 'json');
      expect(exportResponse.body).toHaveProperty('download_url');
      expect(exportResponse.body).toHaveProperty('file_size');
      expect(exportResponse.body).toHaveProperty('sections_included');
      expect(exportResponse.body.sections_included).toContain('basic_info');
      expect(exportResponse.body.sections_included).toContain('team_members');
    });

    it('應該支援Excel格式導出', async () => {
      const exportResponse = await request(app)
        .post('/api/v1/companies/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'xlsx',
          include_sections: ['team_members', 'projects', 'awards']
        })
        .expect(200);

      expect(exportResponse.body).toHaveProperty('format', 'xlsx');
      expect(exportResponse.body.file_name).toMatch(/\.xlsx$/);
    });
  });

  describe('資料導入和同步', () => {
    it('應該支援從外部系統導入資料', async () => {
      const importData = {
        data_source: 'external_hr_system',
        team_members: [
          {
            external_id: 'EMP001',
            name: '導入測試員工1',
            title: '資深工程師',
            department: '技術部',
            email: 'emp001@data-test.com'
          },
          {
            external_id: 'EMP002',
            name: '導入測試員工2',
            title: '產品經理',
            department: '產品部',
            email: 'emp002@data-test.com'
          }
        ],
        import_options: {
          update_existing: true,
          skip_duplicates: false,
          validate_emails: true
        }
      };

      const importResponse = await request(app)
        .post('/api/v1/companies/import')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importData)
        .expect(200);

      expect(importResponse.body).toHaveProperty('import_id');
      expect(importResponse.body).toHaveProperty('status', 'completed');
      expect(importResponse.body).toHaveProperty('summary');
      expect(importResponse.body.summary).toHaveProperty('total_records', 2);
      expect(importResponse.body.summary).toHaveProperty('successful_imports', 2);
      expect(importResponse.body.summary).toHaveProperty('failed_imports', 0);

      // 驗證導入的資料
      const membersResponse = await request(app)
        .get('/api/v1/team-members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(membersResponse.body.length).toBeGreaterThanOrEqual(2);
      const importedMembers = membersResponse.body.filter((m: any) => 
        m.name.includes('導入測試員工')
      );
      expect(importedMembers).toHaveLength(2);
    });

    it('應該處理資料導入錯誤', async () => {
      const invalidImportData = {
        data_source: 'external_system',
        team_members: [
          {
            // 缺少必填欄位 name
            title: '無名工程師'
          },
          {
            name: '正常員工',
            title: '工程師',
            email: 'invalid-email-format' // 無效的email格式
          }
        ],
        import_options: {
          validate_emails: true
        }
      };

      const importResponse = await request(app)
        .post('/api/v1/companies/import')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidImportData)
        .expect(200); // 部分成功

      expect(importResponse.body.summary.failed_imports).toBeGreaterThan(0);
      expect(importResponse.body).toHaveProperty('errors');
      expect(Array.isArray(importResponse.body.errors)).toBe(true);
    });
  });
});