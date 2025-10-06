import { Page } from '@playwright/test';

/**
 * 測試資料工廠 - 為 E2E 測試提供可重複使用的測試資料建立功能
 */

export interface TestUser {
  name: string;
  email: string;
  password: string;
  companyName: string;
  taxId: string;
  address: string;
  phone: string;
  companyEmail: string;
}

export interface TestTeamMember {
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  expertise?: string;
}

export interface TestProject {
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  budget: string;
  description: string;
  category?: string;
  outcomes?: string;
}

export interface TestProposal {
  title: string;
  client: string;
  dueDate: string;
  description?: string;
}

/**
 * 生成唯一的測試用戶資料
 */
export function createTestUser(prefix = 'test'): TestUser {
  const timestamp = Date.now();
  const uniqueTaxId = String(timestamp).slice(-8);

  return {
    name: `${prefix}-用戶-${timestamp}`,
    email: `${prefix}-${timestamp}@example.com`,
    password: 'TestPassword123!@',
    companyName: `${prefix}測試公司-${timestamp}`,
    taxId: uniqueTaxId,
    address: '台北市信義區信義路五段7號',
    phone: '02-1234-5678',
    companyEmail: `company-${prefix}-${timestamp}@example.com`,
  };
}

/**
 * 生成測試團隊成員資料
 */
export function createTestTeamMember(index = 1): TestTeamMember {
  const timestamp = Date.now();
  const positions = ['技術總監', '專案經理', '資深工程師', '系統架構師', '產品經理'];
  const departments = ['AI研發部', '系統開發部', '專案管理部', '技術支援部', '產品設計部'];

  return {
    name: `張技術${index}-${timestamp}`,
    position: positions[index % positions.length],
    department: departments[index % departments.length],
    email: `member${index}-${timestamp}@smarttech.com.tw`,
    phone: `02-1234-567${index}`,
    expertise: 'AI技術、系統整合、專案管理',
  };
}

/**
 * 生成測試專案實績資料
 */
export function createTestProject(index = 1): TestProject {
  const timestamp = Date.now();
  const projects = [
    {
      name: '智慧交通管理系統',
      client: '台北市政府',
      description: '建置智慧交通號誌控制系統，提升道路使用效率',
      category: '智慧城市',
    },
    {
      name: '智慧路燈管理平台',
      client: '新北市政府',
      description: '建置智慧路燈監控與管理系統，節能減碳',
      category: '智慧能源',
    },
    {
      name: 'AI影像辨識系統',
      client: '桃園市政府',
      description: '建置AI影像辨識系統用於交通違規偵測',
      category: 'AI應用',
    },
  ];

  const project = projects[index % projects.length];

  return {
    name: `${project.name}-${timestamp}`,
    client: project.client,
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    budget: '5000000',
    description: project.description,
    category: project.category,
    outcomes: '成功提升系統效率30%，獲得客戶高度肯定',
  };
}

/**
 * 生成測試標案資料
 */
export function createTestProposal(index = 1): TestProposal {
  const timestamp = Date.now();
  const proposals = [
    {
      title: '新北市智慧路燈管理系統建置案',
      client: '新北市政府',
      description: '建置智慧路燈管理系統，包含遠端監控、故障檢測、節能管理等功能',
    },
    {
      title: '台北市AI交通號誌優化專案',
      client: '台北市政府',
      description: '使用AI技術優化交通號誌控制，減少壅塞時間',
    },
    {
      title: '桃園市智慧停車管理系統',
      client: '桃園市政府',
      description: '建置智慧停車導引與繳費系統，提升停車便利性',
    },
  ];

  const proposal = proposals[index % proposals.length];

  return {
    title: `${proposal.title}-${timestamp}`,
    client: proposal.client,
    dueDate: '2024-12-31',
    description: proposal.description,
  };
}

/**
 * 註冊並登入測試用戶
 */
export async function registerAndLogin(page: Page, user?: TestUser): Promise<TestUser> {
  const testUser = user || createTestUser();

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  // 點擊註冊分頁
  await page.click('button:has-text("註冊")');
  await page.waitForSelector('input[name="name"]');

  // 填寫註冊表單
  await page.fill('input[name="name"]', testUser.name);
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.fill('input[name="company_name"]', testUser.companyName);
  await page.fill('input[name="tax_id"]', testUser.taxId);
  await page.fill('input[name="address"]', testUser.address);
  await page.fill('input[name="phone"]', testUser.phone);
  await page.fill('input[name="company_email"]', testUser.companyEmail);

  // 提交註冊
  const registerButton = page.locator('button:has-text("建立帳戶")');
  await registerButton.waitFor({ state: 'visible' });
  await registerButton.click();

  // 等待導航到 dashboard
  await page.waitForFunction(() => {
    const url = window.location.pathname;
    return url === '/' || url === '/dashboard';
  }, { timeout: 15000 });

  // 驗證登入成功
  await page.waitForSelector('text=歡迎回來', { timeout: 5000 });

  return testUser;
}

/**
 * 登出用戶
 */
export async function logout(page: Page): Promise<void> {
  const userMenuButton = page.locator('button:has(svg[data-testid="AccountCircleIcon"])');
  await userMenuButton.click();

  const logoutButton = page.locator('li:has-text("登出")');
  await logoutButton.click();

  await page.waitForURL('/', { timeout: 5000 });
}

/**
 * 登入已存在的用戶
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]:has-text("登入")');

  await page.waitForFunction(() => {
    const url = window.location.pathname;
    return url === '/' || url === '/dashboard';
  }, { timeout: 15000 });

  await page.waitForSelector('text=歡迎回來', { timeout: 5000 });
}

/**
 * 新增團隊成員
 */
export async function addTeamMember(page: Page, member: TestTeamMember): Promise<void> {
  // 導航到團隊成員頁面
  await page.goto('/database/team');
  await page.waitForSelector('text=團隊成員管理', { timeout: 5000 });

  // 點擊新增成員按鈕
  const addButton = page.locator('button:has-text("新增成員")').first();
  await addButton.click();

  // 等待表單出現
  await page.waitForSelector('input[name="name"]', { timeout: 5000 });

  // 填寫表單
  await page.fill('input[name="name"]', member.name);
  await page.fill('input[name="position"]', member.position);
  await page.fill('input[name="department"]', member.department);
  await page.fill('input[name="email"]', member.email);
  await page.fill('input[name="phone"]', member.phone);

  if (member.expertise) {
    const expertiseField = page.locator('input[name="expertise"], textarea[name="expertise"]');
    if (await expertiseField.count() > 0) {
      await expertiseField.fill(member.expertise);
    }
  }

  // 提交表單
  await page.click('button:has-text("儲存"), button:has-text("新增")');

  // 等待成功訊息或返回列表
  await page.waitForTimeout(1000);
}

/**
 * 新增專案實績
 */
export async function addProject(page: Page, project: TestProject): Promise<void> {
  // 導航到專案實績頁面
  await page.goto('/database/projects');
  await page.waitForSelector('text=專案實績管理', { timeout: 5000 });

  // 點擊新增專案按鈕
  const addButton = page.locator('button:has-text("新增專案")').first();
  await addButton.click();

  // 等待表單出現
  await page.waitForSelector('input[name="name"], input[name="title"]', { timeout: 5000 });

  // 填寫表單 (處理可能的不同欄位名稱)
  const nameField = page.locator('input[name="name"], input[name="title"]');
  await nameField.fill(project.name);

  await page.fill('input[name="client"]', project.client);
  await page.fill('input[name="startDate"], input[name="start_date"]', project.startDate);
  await page.fill('input[name="endDate"], input[name="end_date"]', project.endDate);
  await page.fill('input[name="budget"]', project.budget);

  const descriptionField = page.locator('textarea[name="description"]');
  if (await descriptionField.count() > 0) {
    await descriptionField.fill(project.description);
  }

  // 提交表單
  await page.click('button:has-text("儲存"), button:has-text("新增")');

  // 等待成功訊息或返回列表
  await page.waitForTimeout(1000);
}

/**
 * 更新公司資料
 */
export async function updateCompanyInfo(page: Page, companyData: Partial<TestUser>): Promise<void> {
  await page.goto('/database/company');
  await page.waitForSelector('text=公司資料管理', { timeout: 5000 });

  if (companyData.companyName) {
    const nameField = page.locator('input[name="name"], input[name="company_name"]');
    await nameField.clear();
    await nameField.fill(companyData.companyName);
  }

  if (companyData.address) {
    await page.fill('input[name="address"]', companyData.address);
  }

  if (companyData.phone) {
    await page.fill('input[name="phone"]', companyData.phone);
  }

  // 儲存變更
  await page.click('button:has-text("儲存"), button:has-text("更新")');
  await page.waitForTimeout(1000);
}

/**
 * 測量函數執行時間
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`⏱️ ${label}: ${(duration / 1000).toFixed(2)}s`);

  return { result, duration };
}

/**
 * 等待並驗證導航
 */
export async function waitForNavigation(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForURL(urlPattern, { timeout: 10000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}
