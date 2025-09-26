import { PrismaClient, UserRole, TemplateType, AwardType, DataSourceType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始資料庫種子資料初始化...');

  // 創建系統管理員
  const adminPassword = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@proposal-generator.com' },
    update: {},
    create: {
      email: 'admin@proposal-generator.com',
      password: adminPassword,
      name: '系統管理員',
      role: UserRole.SUPER_ADMIN,
    },
  });

  console.log('✅ 系統管理員創建完成');

  // 創建測試公司
  const testCompany = await prisma.company.upsert({
    where: { tax_id: '12345678' },
    update: {},
    create: {
      company_name: '測試科技股份有限公司',
      tax_id: '12345678',
      capital: 50000000,
      established_date: new Date('2020-01-01'),
      address: '台北市信義區信義路五段7號',
      phone: '02-8101-8888',
      email: 'info@test-tech.com',
      website: 'https://www.test-tech.com',
    },
  });

  console.log('✅ 測試公司創建完成');

  // 創建測試用戶
  const userPassword = await bcrypt.hash('user123456', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@test-tech.com' },
    update: {},
    create: {
      email: 'user@test-tech.com',
      password: userPassword,
      name: '王小明',
      role: UserRole.ADMIN,
      company_id: testCompany.id,
    },
  });

  console.log('✅ 測試用戶創建完成');

  // 創建公司簡介
  await prisma.companyProfile.upsert({
    where: { 
      company_id_version_name: {
        company_id: testCompany.id,
        version_name: '標準版'
      }
    },
    update: {},
    create: {
      company_id: testCompany.id,
      version_name: '標準版',
      vision: '成為台灣領先的智能科技解決方案提供商',
      mission: '運用創新科技，為客戶創造價值，推動產業數位轉型',
      core_values: '創新、品質、服務、誠信',
      business_scope: 'AI人工智能、大數據分析、雲端運算、物聯網應用',
      description_full: '測試科技成立於2020年，專注於提供企業級AI解決方案。我們擁有經驗豐富的技術團隊，致力於運用最新的人工智能技術，幫助企業提升效率、降低成本並創造新的商業價值。公司主要業務包括AI模型開發、數據分析平台建置、智能化流程優化等服務。',
      description_medium: '測試科技專注於企業級AI解決方案，提供AI模型開發、數據分析和智能化服務，幫助企業數位轉型。',
      description_short: '專業AI解決方案提供商，助力企業智能化轉型。',
      is_active: true,
    },
  });

  // 創建團隊成員
  await prisma.teamMember.createMany({
    data: [
      {
        company_id: testCompany.id,
        name: '張執行長',
        title: '執行長',
        department: '經營管理',
        education: '台大電機碩士',
        experience: '15年科技業經驗，曾任職於知名科技公司',
        expertise: '策略規劃、技術管理、團隊領導',
        is_key_member: true,
        display_order: 1,
      },
      {
        company_id: testCompany.id,
        name: '李技術長',
        title: '技術長',
        department: '技術研發',
        education: '清大資工博士',
        experience: '12年AI研發經驗',
        expertise: '機器學習、深度學習、自然語言處理',
        is_key_member: true,
        display_order: 2,
      },
      {
        company_id: testCompany.id,
        name: '陳專案經理',
        title: '專案經理',
        department: '專案管理',
        education: '政大企管碩士',
        experience: '8年專案管理經驗',
        expertise: '專案規劃、風險管控、客戶溝通',
        is_key_member: false,
        display_order: 3,
      },
    ],
  });

  // 創建實績案例
  await prisma.project.createMany({
    data: [
      {
        company_id: testCompany.id,
        project_name: '金融業智能客服系統',
        client_name: '某大型銀行',
        start_date: new Date('2023-03-01'),
        end_date: new Date('2023-12-31'),
        amount: 8000000,
        scale: '大型專案',
        description: '建置具備自然語言理解能力的智能客服系統，提供24小時客戶服務',
        achievements: '提升客服效率300%，降低人力成本50%，客戶滿意度達95%',
        tags: ['AI', '客服', '金融', 'NLP'],
        is_public: true,
      },
      {
        company_id: testCompany.id,
        project_name: '製造業預測維護平台',
        client_name: '某製造集團',
        start_date: new Date('2023-06-01'),
        end_date: new Date('2024-02-29'),
        amount: 12000000,
        scale: '大型專案',
        description: '開發基於機器學習的設備預測維護平台，預防設備故障',
        achievements: '降低設備故障率80%，節省維護成本40%，提升產能15%',
        tags: ['AI', '製造業', '預測維護', 'IoT'],
        is_public: true,
      },
    ],
  });

  // 創建獲獎紀錄
  await prisma.award.createMany({
    data: [
      {
        company_id: testCompany.id,
        award_name: '經濟部中小企業創新研發計畫',
        issuer: '經濟部中小企業處',
        award_date: new Date('2023-01-15'),
        description: 'AI智能分析平台創新研發',
        award_type: AwardType.GOVERNMENT_GRANT,
        amount: 2000000,
      },
      {
        company_id: testCompany.id,
        award_name: '台灣AI產業創新獎',
        issuer: '台灣人工智慧學校',
        award_date: new Date('2023-08-20'),
        description: '在AI產業應用創新方面的卓越表現',
        award_type: AwardType.RECOGNITION,
      },
    ],
  });

  // 創建系統預設範本
  const govGrantTemplate = await prisma.proposalTemplate.create({
    data: {
      template_name: '政府補助申請範本',
      template_type: TemplateType.GOVERNMENT_GRANT,
      description: '適用於各類政府補助計畫申請',
      is_system_template: true,
      created_by: admin.id,
    },
  });

  // 創建範本章節
  await prisma.templateSection.createMany({
    data: [
      {
        template_id: govGrantTemplate.id,
        section_name: '公司基本資料',
        section_order: 1,
        is_required: true,
        min_words: 100,
        max_words: 500,
        content_hint: '請填寫公司名稱、統編、地址、聯絡方式等基本資訊',
        data_types: [DataSourceType.COMPANY_BASIC],
      },
      {
        template_id: govGrantTemplate.id,
        section_name: '公司簡介',
        section_order: 2,
        is_required: true,
        min_words: 300,
        max_words: 800,
        content_hint: '請描述公司願景、使命、核心價值和主要業務',
        data_types: [DataSourceType.COMPANY_PROFILE],
      },
      {
        template_id: govGrantTemplate.id,
        section_name: '團隊介紹',
        section_order: 3,
        is_required: true,
        min_words: 200,
        max_words: 600,
        content_hint: '請介紹主要團隊成員的背景和專長',
        data_types: [DataSourceType.TEAM_MEMBERS],
      },
      {
        template_id: govGrantTemplate.id,
        section_name: '過往實績',
        section_order: 4,
        is_required: true,
        min_words: 300,
        max_words: 1000,
        content_hint: '請列舉相關的專案經驗和成果',
        data_types: [DataSourceType.PROJECTS],
      },
      {
        template_id: govGrantTemplate.id,
        section_name: '計畫內容',
        section_order: 5,
        is_required: true,
        min_words: 500,
        max_words: 2000,
        content_hint: '請詳述申請計畫的目標、方法和預期成果',
        data_types: [DataSourceType.CUSTOM_INPUT],
      },
    ],
  });

  // 創建格式規範
  await prisma.formatSpec.create({
    data: {
      template_id: govGrantTemplate.id,
      page_size: 'A4',
      margins: {
        top: 25,
        right: 20,
        bottom: 25,
        left: 20,
      },
      font_family: '標楷體',
      font_size: 12,
      line_height: 1.5,
      max_pages: 20,
    },
  });

  console.log('✅ 範本和格式規範創建完成');

  // 創建企業標案範本
  const enterpriseBidTemplate = await prisma.proposalTemplate.create({
    data: {
      template_name: '企業標案投標範本',
      template_type: TemplateType.ENTERPRISE_BID,
      description: '適用於企業對企業的標案投標',
      is_system_template: true,
      created_by: admin.id,
    },
  });

  await prisma.templateSection.createMany({
    data: [
      {
        template_id: enterpriseBidTemplate.id,
        section_name: '公司概況',
        section_order: 1,
        is_required: true,
        min_words: 200,
        max_words: 600,
        content_hint: '公司基本資料和營運概況',
        data_types: [DataSourceType.COMPANY_BASIC, DataSourceType.COMPANY_PROFILE],
      },
      {
        template_id: enterpriseBidTemplate.id,
        section_name: '技術能力',
        section_order: 2,
        is_required: true,
        min_words: 400,
        max_words: 1200,
        content_hint: '技術團隊和核心技術能力說明',
        data_types: [DataSourceType.TEAM_MEMBERS, DataSourceType.CAPABILITIES],
      },
      {
        template_id: enterpriseBidTemplate.id,
        section_name: '成功案例',
        section_order: 3,
        is_required: true,
        min_words: 300,
        max_words: 1000,
        content_hint: '相關領域的成功專案案例',
        data_types: [DataSourceType.PROJECTS, DataSourceType.AWARDS],
      },
      {
        template_id: enterpriseBidTemplate.id,
        section_name: '提案內容',
        section_order: 4,
        is_required: true,
        min_words: 800,
        max_words: 3000,
        content_hint: '針對標案需求的具體提案和解決方案',
        data_types: [DataSourceType.CUSTOM_INPUT],
      },
    ],
  });

  console.log('✅ 所有種子資料創建完成！');

  // 顯示登入資訊
  console.log('\n🔐 測試帳戶資訊：');
  console.log('管理員帳戶: admin@proposal-generator.com / admin123456');
  console.log('一般用戶: user@test-tech.com / user123456');
  console.log('\n🏢 測試公司: 測試科技股份有限公司');
  console.log('📋 範本數量: 2 個');
  console.log('👥 團隊成員: 3 人');
  console.log('🏆 實績案例: 2 個');
  console.log('🥇 獲獎紀錄: 2 個');
}

main()
  .catch((e) => {
    console.error('❌ 種子資料創建失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });