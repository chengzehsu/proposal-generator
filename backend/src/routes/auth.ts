import express from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';
import { RefreshTokenPayload, PasswordResetTokenPayload, InviteTokenPayload } from '../types/jwt';
import { PrismaTransaction } from '../types/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('請輸入有效的電子信箱'),
  password: z.string()
    .min(8, '密碼至少需要8個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           '密碼必須包含大小寫字母、數字和特殊字元'),
  name: z.string().min(1, '請輸入姓名').max(100, '姓名長度不能超過100字元'),
  company: z.object({
    company_name: z.string().min(1, '請輸入公司名稱').max(200, '公司名稱長度不能超過200字元'),
    tax_id: z.string().regex(/^\d{8}$/, '統一編號必須為8位數字'),
    address: z.string().min(1, '請輸入公司地址'),
    phone: z.string().min(1, '請輸入聯絡電話'),
    email: z.string().email('請輸入有效的公司電子信箱'),
    capital: z.number().int().min(0, '資本額必須為非負整數').optional(),
    established_date: z.string().optional(),
    website: z.string().url('請輸入有效的網站URL').optional().or(z.literal('')),
  })
});

const loginSchema = z.object({
  email: z.string().email('請輸入有效的電子信箱'),
  password: z.string().min(1, '請輸入密碼')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('請輸入有效的電子信箱')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, '重設token不能為空'),
  new_password: z.string()
    .min(8, '密碼至少需要8個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           '密碼必須包含大小寫字母、數字和特殊字元'),
  confirm_password: z.string()
});

const inviteUserSchema = z.object({
  email: z.string().email('請輸入有效的電子信箱'),
  name: z.string().min(1, '請輸入姓名').max(100, '姓名長度不能超過100字元'),
  role: z.enum(['ADMIN', 'EDITOR'], { message: '角色必須為ADMIN或EDITOR' })
});

const acceptInviteSchema = z.object({
  token: z.string().min(1, '邀請token不能為空'),
  password: z.string()
    .min(8, '密碼至少需要8個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           '密碼必須包含大小寫字母、數字和特殊字元'),
  confirm_password: z.string()
});

// JWT utility functions
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || 'default-secret-key';
  
  return jwt.sign(
    { userId },
    secret,
    { expiresIn: '7d' }
  );
};

const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
  const options: SignOptions = {
    expiresIn: '30d'
  };
  
  return jwt.sign(
    { userId, type: 'refresh' },
    secret,
    options
  );
};

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: 用戶註冊
 *     description: 創建新的用戶帳戶，包括個人和公司資訊
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - company
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 用戶電子信箱
 *               password:
 *                 type: string
 *                 description: 密碼，須包含大小寫字母、數字和特殊字元
 *                 minLength: 8
 *               name:
 *                 type: string
 *                 description: 用戶姓名
 *               company:
 *                 type: object
 *                 required:
 *                   - company_name
 *                   - tax_id
 *                   - address
 *                   - phone
 *                   - email
 *                 properties:
 *                   company_name:
 *                     type: string
 *                     description: 公司名稱
 *                   tax_id:
 *                     type: string
 *                     description: 8位數統一編號
 *                   address:
 *                     type: string
 *                     description: 公司地址
 *                   phone:
 *                     type: string
 *                     description: 公司聯絡電話
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: 公司電子信箱
 *     responses:
 *       201:
 *         description: 用戶成功註冊
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: 用戶基本資訊
 *                 company:
 *                   type: object
 *                   description: 公司基本資訊
 *                 token:
 *                   type: string
 *                   description: JWT存取令牌
 *                 refresh_token:
 *                   type: string
 *                   description: JWT刷新令牌
 *       400:
 *         description: 輸入資料格式錯誤
 *       409:
 *         description: 電子信箱或統一編號已被使用
 *       500:
 *         description: 伺服器內部錯誤
 */
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { email, password, name, company } = validatedData;

    // 檢查email是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: '電子信箱已被使用',
        statusCode: 409
      });
    }

    // 檢查統一編號是否已存在
    const existingCompany = await prisma.company.findUnique({
      where: { tax_id: company.tax_id }
    });

    if (existingCompany) {
      return res.status(409).json({
        error: 'Conflict',
        message: '統一編號已被使用',
        statusCode: 409
      });
    }

    // 使用交易創建用戶和公司
    const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
      // 先創建用戶
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'ADMIN' // 第一個用戶自動成為管理員
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          is_active: true,
          created_at: true
        }
      });

      // 然後創建公司
      const newCompany = await tx.company.create({
        data: {
          user_id: newUser.id,
          company_name: company.company_name,
          tax_id: company.tax_id,
          address: company.address,
          phone: company.phone,
          email: company.email,
          capital: company.capital ? company.capital.toString() : undefined,
          established_date: company.established_date ? new Date(company.established_date) : undefined,
          website: company.website || undefined
        }
      });

      // 更新用戶的 company_id
      const updatedUser = await tx.user.update({
        where: { id: newUser.id },
        data: { company_id: newCompany.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          company_id: true,
          is_active: true,
          created_at: true
        }
      });

      return { user: updatedUser, company: newCompany };
    });

    // 生成JWT token
    const token = generateToken(result.user.id);
    const refreshToken = generateRefreshToken(result.user.id);

    logger.info('User registered successfully', { 
      userId: result.user.id, 
      email: result.user.email,
      companyId: result.company.id 
    });

    return res.status(201).json({
      user: result.user,
      company: result.company,
      token,
      refresh_token: refreshToken
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Registration failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '註冊失敗，請稍後再試',
      statusCode: 500
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: 用戶登入
 *     description: 使用電子信箱和密碼進行用戶驗證
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 用戶電子信箱
 *               password:
 *                 type: string
 *                 description: 使用者密碼
 *     responses:
 *       200:
 *         description: 登入成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: 用戶基本資訊
 *                 token:
 *                   type: string
 *                   description: JWT存取令牌
 *                 refresh_token:
 *                   type: string
 *                   description: JWT刷新令牌
 *       400:
 *         description: 輸入資料格式錯誤
 *       401:
 *         description: 帳號或密碼錯誤
 *       500:
 *         description: 伺服器內部錯誤
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: {
          select: {
            id: true,
            company_name: true,
            tax_id: true
          }
        }
      }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '電子信箱或密碼錯誤',
        statusCode: 401
      });
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '電子信箱或密碼錯誤',
        statusCode: 401
      });
    }

    // 生成token
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // 更新最後登入時間
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    });

    logger.info('User logged in successfully', { userId: user.id, email });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
        company: user.company
      },
      token,
      refresh_token: refreshToken
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Login failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '登入失敗，請稍後再試',
      statusCode: 500
    });
  }
});

// POST /api/v1/auth/logout - 用戶登出
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  try {
    // TODO: 在實際應用中，應該將token加入黑名單或在Redis中管理token狀態
    logger.info('User logged out', { userId: req.userId });
    
    return res.status(204).send();
  } catch (error) {
    logger.error('Logout failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '登出失敗',
      statusCode: 500
    });
  }
}));

// GET /api/v1/auth/profile - 獲取用戶資料
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        company: {
          select: {
            id: true,
            company_name: true,
            tax_id: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: '用戶不存在',
        statusCode: 404
      });
    }

    return res.json(user);
  } catch (error) {
    logger.error('Get profile failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取用戶資料失敗',
      statusCode: 500
    });
  }
}));

// POST /api/v1/auth/refresh - 刷新token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '請提供refresh token',
        statusCode: 401
      });
    }

    try {
      const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || 'default-refresh-secret') as RefreshTokenPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // 檢查用戶是否存在且活躍
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.is_active) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: '用戶不存在或已停用',
          statusCode: 401
        });
      }

      // 生成新的token
      const newToken = generateToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      return res.json({
        token: newToken,
        refresh_token: newRefreshToken
      });

    } catch (jwtError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '無效的 refresh token',
        statusCode: 401
      });
    }

  } catch (error) {
    logger.error('Token refresh failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token刷新失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/auth/forgot-password - 忘記密碼
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: '用戶不存在',
        statusCode: 404
      });
    }

    // 生成重設token（在實際應用中應該存儲到資料庫並設定過期時間）
    const resetOptions: SignOptions = { expiresIn: '1h' };
    const resetToken = jwt.sign(
      { userId: user.id, email, type: 'password_reset' },
      process.env.JWT_SECRET || 'default-secret-key',
      resetOptions
    );

    // TODO: 在實際應用中，應該發送郵件而不是直接返回token
    logger.info('Password reset requested', { userId: user.id, email });

    return res.json({
      message: '密碼重設郵件已發送',
      reset_token: process.env.NODE_ENV === 'test' ? resetToken : undefined // 只在測試環境返回token
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Forgot password failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '密碼重設請求失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/auth/verify-reset-token - 驗證重設token
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '請提供重設token',
        statusCode: 400
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key') as PasswordResetTokenPayload;

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      return res.json({
        valid: true,
        email: decoded.email
      });

    } catch (jwtError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '重設連結已過期或無效',
        statusCode: 400
      });
    }

  } catch (error) {
    logger.error('Verify reset token failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '驗證重設token失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/auth/reset-password - 重設密碼
router.post('/reset-password', async (req, res) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const { token, new_password, confirm_password } = data;

    if (new_password !== confirm_password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '密碼確認不符',
        statusCode: 400
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key') as PasswordResetTokenPayload;

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      // 更新密碼
      const hashedPassword = await bcrypt.hash(new_password, 12);
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword }
      });

      logger.info('Password reset successful', { userId: decoded.userId });

      return res.json({
        message: '密碼重設成功'
      });

    } catch (jwtError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Token已使用或已過期',
        statusCode: 400
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Reset password failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '密碼重設失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/auth/invite-user - 邀請用戶（需要管理員權限）
router.post('/invite-user', authenticateToken, asyncHandler(async (req, res) => {
  try {
    // 檢查當前用戶是否為管理員
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '只有管理員可以邀請用戶',
        statusCode: 403
      });
    }

    const { email, name, role } = inviteUserSchema.parse(req.body);

    // 檢查email是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: '該電子信箱已被使用',
        statusCode: 409
      });
    }

    // 生成邀請token
    const inviteOptions: SignOptions = { expiresIn: '7d' };
    const inviteToken = jwt.sign(
      { 
        email, 
        name, 
        role, 
        companyId: currentUser.company_id,
        invitedBy: currentUser.id,
        type: 'invite'
      },
      process.env.JWT_SECRET || 'default-secret-key',
      inviteOptions
    );

    // TODO: 在實際應用中，應該發送邀請郵件
    logger.info('User invited', { email, role, invitedBy: currentUser.id });

    return res.json({
      message: '邀請已發送',
      invite_token: process.env.NODE_ENV === 'test' ? inviteToken : undefined
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Invite user failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '邀請用戶失敗',
      statusCode: 500
    });
  }
}));

// POST /api/v1/auth/accept-invite - 接受邀請
router.post('/accept-invite', async (req, res) => {
  try {
    const data = acceptInviteSchema.parse(req.body);
    const { token, password, confirm_password } = data;

    if (password !== confirm_password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '密碼確認不符',
        statusCode: 400
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key') as InviteTokenPayload;

      if (decoded.type !== 'invite') {
        throw new Error('Invalid token type');
      }

      // 檢查email是否已被使用
      const existingUser = await prisma.user.findUnique({
        where: { email: decoded.email }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: '該電子信箱已被使用',
          statusCode: 409
        });
      }

      // 創建用戶
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await prisma.user.create({
        data: {
          email: decoded.email,
          password: hashedPassword,
          name: decoded.name,
          role: decoded.role,
          company_id: decoded.companyId
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          company_id: true,
          is_active: true,
          created_at: true
        }
      });

      // 生成登入token
      const loginToken = generateToken(newUser.id);
      const refreshToken = generateRefreshToken(newUser.id);

      logger.info('User accepted invite', { userId: newUser.id, email: decoded.email });

      return res.status(201).json({
        user: newUser,
        token: loginToken,
        refresh_token: refreshToken
      });

    } catch (jwtError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '無效的邀請連結',
        statusCode: 400
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Accept invite failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '接受邀請失敗',
      statusCode: 500
    });
  }
});

export default router;