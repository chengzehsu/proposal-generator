import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';

describe('用戶註冊登入流程整合測試', () => {
  const testUserData = {
    email: 'integration-test@example.com',
    password: 'TestPassword123!',
    name: '整合測試用戶'
  };

  const testCompanyData = {
    company_name: '整合測試公司',
    tax_id: '12345678',
    address: '台北市整合區測試路123號',
    phone: '02-1234-5678',
    email: 'integration@company.com'
  };

  beforeAll(async () => {
    // 清理測試資料
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'integration-test' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '12345' } }
    });
  });

  afterEach(async () => {
    // 每個測試後清理資料
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'integration-test' } }
    });
    await prisma.company.deleteMany({
      where: { tax_id: { startsWith: '12345' } }
    });
  });

  describe('完整的用戶註冊和登入流程', () => {
    it('應該完成從註冊到登入的完整流程', async () => {
      // 步驟1: 用戶註冊
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUserData,
          company: testCompanyData
        })
        .expect('Content-Type', /json/)
        .expect(201);

      // 驗證註冊回應
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body).toHaveProperty('token');
      expect(registerResponse.body.user).toHaveProperty('id');
      expect(registerResponse.body.user).toHaveProperty('email', testUserData.email);
      expect(registerResponse.body.user).toHaveProperty('name', testUserData.name);
      expect(registerResponse.body.user).toHaveProperty('role', 'ADMIN'); // 首位用戶應為管理員
      expect(registerResponse.body.user).toHaveProperty('company_id');
      expect(registerResponse.body.user).not.toHaveProperty('password'); // 密碼不應返回

      // 驗證公司資訊
      expect(registerResponse.body).toHaveProperty('company');
      expect(registerResponse.body.company).toHaveProperty('company_name', testCompanyData.company_name);
      expect(registerResponse.body.company).toHaveProperty('tax_id', testCompanyData.tax_id);

      const registrationToken = registerResponse.body.token;
      const userId = registerResponse.body.user.id;
      const companyId = registerResponse.body.user.company_id;

      // 步驟2: 驗證註冊後的 token 可以使用
      const profileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${registrationToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('id', userId);
      expect(profileResponse.body).toHaveProperty('email', testUserData.email);
      expect(profileResponse.body).toHaveProperty('company_id', companyId);

      // 步驟3: 登出
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${registrationToken}`)
        .expect(204);

      // 步驟4: 驗證登出後 token 無效
      await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${registrationToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      // 步驟5: 使用相同憑證重新登入
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserData.email,
          password: testUserData.password
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // 驗證登入回應
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.user).toHaveProperty('id', userId);
      expect(loginResponse.body.user).toHaveProperty('email', testUserData.email);
      expect(loginResponse.body.user).not.toHaveProperty('password');

      const newToken = loginResponse.body.token;

      // 步驟6: 驗證新 token 可以正常使用
      const newProfileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${newToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(newProfileResponse.body).toHaveProperty('id', userId);
      expect(newProfileResponse.body).toHaveProperty('email', testUserData.email);

      // 步驟7: 驗證可以訪問需要認證的 API
      const companyResponse = await request(app)
        .get('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${newToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(companyResponse.body).toHaveProperty('id', companyId);
      expect(companyResponse.body).toHaveProperty('company_name', testCompanyData.company_name);
    });

    it('應該處理重複註冊的情況', async () => {
      // 第一次註冊
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUserData,
          company: testCompanyData
        })
        .expect(201);

      // 第二次使用相同 email 註冊應該失敗
      const duplicateResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUserData,
          email: testUserData.email, // 相同的 email
          company: {
            ...testCompanyData,
            tax_id: '87654321' // 不同的統編
          }
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(duplicateResponse.body).toHaveProperty('error');
      expect(duplicateResponse.body).toHaveProperty('statusCode', 409);
      expect(duplicateResponse.body.message).toContain('電子信箱已被使用');
    });

    it('應該處理重複公司統編註冊的情況', async () => {
      // 第一次註冊
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUserData,
          company: testCompanyData
        })
        .expect(201);

      // 使用不同 email 但相同統編註冊應該失敗
      const duplicateCompanyResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'integration-test-2@example.com',
          password: 'AnotherPassword123!',
          name: '另一個測試用戶',
          company: {
            ...testCompanyData,
            tax_id: testCompanyData.tax_id // 相同的統編
          }
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(duplicateCompanyResponse.body).toHaveProperty('error');
      expect(duplicateCompanyResponse.body).toHaveProperty('statusCode', 409);
      expect(duplicateCompanyResponse.body.message).toContain('統一編號已被使用');
    });
  });

  describe('密碼重設流程', () => {
    let userId: string;
    let resetToken: string;

    beforeEach(async () => {
      // 先註冊用戶
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUserData,
          company: testCompanyData
        });

      userId = registerResponse.body.user.id;
    });

    it('應該完成密碼重設流程', async () => {
      // 步驟1: 請求密碼重設
      const resetRequestResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: testUserData.email
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(resetRequestResponse.body).toHaveProperty('message', '密碼重設郵件已發送');
      expect(resetRequestResponse.body).toHaveProperty('reset_token'); // 測試環境返回 token

      resetToken = resetRequestResponse.body.reset_token;

      // 步驟2: 驗證重設 token
      const verifyTokenResponse = await request(app)
        .post('/api/v1/auth/verify-reset-token')
        .send({
          token: resetToken
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(verifyTokenResponse.body).toHaveProperty('valid', true);
      expect(verifyTokenResponse.body).toHaveProperty('email', testUserData.email);

      // 步驟3: 重設密碼
      const newPassword = 'NewTestPassword123!';
      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          new_password: newPassword,
          confirm_password: newPassword
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // 步驟4: 驗證舊密碼不能登入
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserData.email,
          password: testUserData.password // 舊密碼
        })
        .expect('Content-Type', /json/)
        .expect(401);

      // 步驟5: 驗證新密碼可以登入
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserData.email,
          password: newPassword // 新密碼
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.user.id).toBe(userId);

      // 步驟6: 驗證重設 token 只能使用一次
      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          new_password: 'AnotherPassword123!',
          confirm_password: 'AnotherPassword123!'
        })
        .expect('Content-Type', /json/)
        .expect(400); // Token 已使用
    });

    it('應該處理無效的重設請求', async () => {
      // 使用不存在的 email
      const invalidEmailResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(invalidEmailResponse.body).toHaveProperty('error');
      expect(invalidEmailResponse.body.message).toContain('用戶不存在');
    });

    it('應該處理過期的重設 token', async () => {
      // 請求密碼重設
      const resetRequestResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: testUserData.email
        });

      const expiredToken = resetRequestResponse.body.reset_token;

      // 模擬過期的 token
      const expiredTokenResponse = await request(app)
        .post('/api/v1/auth/verify-reset-token')
        .send({
          token: expiredToken + '_expired' // 模擬過期
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(expiredTokenResponse.body).toHaveProperty('error');
      expect(expiredTokenResponse.body.message).toContain('重設連結已過期');
    });
  });

  describe('多用戶公司註冊流程', () => {
    let firstUserId: string;
    let companyId: string;
    let adminToken: string;

    beforeEach(async () => {
      // 註冊第一位用戶（將成為管理員）
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUserData,
          company: testCompanyData
        });

      firstUserId = registerResponse.body.user.id;
      companyId = registerResponse.body.user.company_id;
      adminToken = registerResponse.body.token;
    });

    it('應該完成管理員邀請新用戶的流程', async () => {
      const secondUserData = {
        email: 'integration-test-2@example.com',
        name: '第二位測試用戶',
        role: 'EDITOR'
      };

      // 步驟1: 管理員發送邀請
      const inviteResponse = await request(app)
        .post('/api/v1/auth/invite-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(secondUserData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(inviteResponse.body).toHaveProperty('message', '邀請已發送');
      expect(inviteResponse.body).toHaveProperty('invite_token');

      const inviteToken = inviteResponse.body.invite_token;

      // 步驟2: 受邀用戶接受邀請並設定密碼
      const acceptInviteResponse = await request(app)
        .post('/api/v1/auth/accept-invite')
        .send({
          token: inviteToken,
          password: 'SecondUserPassword123!',
          confirm_password: 'SecondUserPassword123!'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(acceptInviteResponse.body).toHaveProperty('user');
      expect(acceptInviteResponse.body).toHaveProperty('token');
      expect(acceptInviteResponse.body.user).toHaveProperty('email', secondUserData.email);
      expect(acceptInviteResponse.body.user).toHaveProperty('name', secondUserData.name);
      expect(acceptInviteResponse.body.user).toHaveProperty('role', secondUserData.role);
      expect(acceptInviteResponse.body.user).toHaveProperty('company_id', companyId);

      const secondUserToken = acceptInviteResponse.body.token;

      // 步驟3: 驗證第二位用戶可以登入
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: secondUserData.email,
          password: 'SecondUserPassword123!'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(loginResponse.body.user).toHaveProperty('company_id', companyId);

      // 步驟4: 驗證兩位用戶都可以訪問相同公司資料
      const adminCompanyResponse = await request(app)
        .get('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const userCompanyResponse = await request(app)
        .get('/api/v1/companies/basic')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(200);

      expect(adminCompanyResponse.body.id).toBe(userCompanyResponse.body.id);
      expect(adminCompanyResponse.body.company_name).toBe(testCompanyData.company_name);

      // 步驟5: 驗證權限差異（只有管理員可以邀請用戶）
      await request(app)
        .post('/api/v1/auth/invite-user')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          email: 'integration-test-3@example.com',
          name: '第三位測試用戶',
          role: 'EDITOR'
        })
        .expect('Content-Type', /json/)
        .expect(403); // EDITOR 角色無權邀請用戶
    });

    it('應該處理無效的邀請 token', async () => {
      const invalidInviteResponse = await request(app)
        .post('/api/v1/auth/accept-invite')
        .send({
          token: 'invalid-invite-token',
          password: 'TestPassword123!',
          confirm_password: 'TestPassword123!'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(invalidInviteResponse.body).toHaveProperty('error');
      expect(invalidInviteResponse.body.message).toContain('無效的邀請連結');
    });
  });

  describe('Token 生命週期管理', () => {
    let userToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // 註冊並登入用戶
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUserData,
          company: testCompanyData
        });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserData.email,
          password: testUserData.password
        });

      userToken = loginResponse.body.token;
      refreshToken = loginResponse.body.refresh_token;
    });

    it('應該完成 token 刷新流程', async () => {
      // 步驟1: 使用 refresh token 獲取新的 access token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: refreshToken
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('token');
      expect(refreshResponse.body).toHaveProperty('refresh_token');

      const newToken = refreshResponse.body.token;
      const newRefreshToken = refreshResponse.body.refresh_token;

      // 步驟2: 驗證新 token 可以使用
      await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      // 步驟3: 驗證舊 token 仍然可用（在有效期內）
      await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // 步驟4: 驗證舊 refresh token 已失效
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: refreshToken // 舊的 refresh token
        })
        .expect('Content-Type', /json/)
        .expect(401);
    });

    it('應該處理無效的 refresh token', async () => {
      const invalidRefreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: 'invalid-refresh-token'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(invalidRefreshResponse.body).toHaveProperty('error');
      expect(invalidRefreshResponse.body.message).toContain('無效的 refresh token');
    });
  });
});