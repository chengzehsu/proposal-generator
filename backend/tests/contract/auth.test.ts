import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../src/index';
import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

describe('認證 API 合約測試', () => {
  let server: any;

  beforeAll(async () => {
    // 測試前清理資料庫
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test'
        }
      }
    });
  });

  afterAll(async () => {
    // 測試後清理
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test'
        }
      }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // 每個測試前創建測試用戶
    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: hashedPassword,
        name: '測試用戶',
        role: 'ADMIN',
      },
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('應該成功登入並返回正確格式的回應', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testPassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(200);

      // 驗證回應結構
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expires_at');

      // 驗證用戶資料結構
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('name', '測試用戶');
      expect(response.body.user).toHaveProperty('role', 'ADMIN');
      expect(response.body.user).not.toHaveProperty('password');

      // 驗證 token 格式
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);

      // 驗證過期時間格式
      expect(new Date(response.body.expires_at)).toBeInstanceOf(Date);
    });

    it('應該拒絕無效的憑證並返回 401', async () => {
      const invalidLoginData = {
        email: 'test@example.com',
        password: 'wrongPassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidLoginData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).not.toHaveProperty('token');
    });

    it('應該拒絕不存在的用戶並返回 401', async () => {
      const nonExistentUser = {
        email: 'nonexistent@example.com',
        password: 'anyPassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(nonExistentUser)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('應該驗證必填欄位並返回 400', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // missing password
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(incompleteData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('details');
    });

    it('應該驗證電子信箱格式並返回 400', async () => {
      const invalidEmailData = {
        email: 'invalid-email-format',
        password: 'testPassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidEmailData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('應該拒絕停用的帳戶並返回 401', async () => {
      // 創建停用帳戶
      const hashedPassword = await bcrypt.hash('testPassword123', 12);
      await prisma.user.create({
        data: {
          email: 'deactivated@example.com',
          password: hashedPassword,
          name: '停用用戶',
          role: 'VIEWER',
          is_active: false,
        },
      });

      const deactivatedUserData = {
        email: 'deactivated@example.com',
        password: 'testPassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(deactivatedUserData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('帳戶已停用');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('應該成功註冊新用戶並返回正確格式的回應', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'newPassword123',
        name: '新用戶',
        company_name: '新公司'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('應該拒絕重複的電子信箱並返回 409', async () => {
      const duplicateEmailData = {
        email: 'test@example.com', // 已存在的信箱
        password: 'newPassword123',
        name: '重複用戶'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicateEmailData)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 409);
    });

    it('應該驗證密碼強度並返回 400', async () => {
      const weakPasswordData = {
        email: 'weakpass@example.com',
        password: '123', // 太弱的密碼
        name: '弱密碼用戶'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(weakPasswordData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('應該成功登出並返回確認訊息', async () => {
      // 先登入取得 token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('登出成功');
    });

    it('應該拒絕無效的 token 並返回 401', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('應該拒絕缺少 token 的請求並返回 401', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('應該返回當前用戶資訊', async () => {
      // 先登入取得 token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('name', '測試用戶');
      expect(response.body).toHaveProperty('role', 'ADMIN');
      expect(response.body).not.toHaveProperty('password');
    });

    it('應該拒絕無效的 token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});