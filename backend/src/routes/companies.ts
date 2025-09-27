import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const updateBasicDataSchema = z.object({
  company_name: z.string().min(1, '請輸入公司名稱').max(200, '公司名稱長度不能超過200字元').optional(),
  tax_id: z.string().regex(/^\d{8}$/, '統一編號必須為8位數字').optional(),
  address: z.string().min(1, '請輸入公司地址').optional(),
  phone: z.string().min(1, '請輸入聯絡電話').optional(),
  email: z.string().email('請輸入有效的公司電子信箱').optional(),
  capital: z.number().int().min(0, '資本額必須為非負整數').optional(),
  established_date: z.string().optional(),
  website: z.string().url('請輸入有效的網站URL').optional().or(z.literal('')),
  version: z.number().int().min(1, '版本號必須為正整數')
});

// GET /api/v1/companies/basic - 獲取公司基本資料
router.get('/basic', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.company_id },
      select: {
        id: true,
        company_name: true,
        tax_id: true,
        address: true,
        phone: true,
        email: true,
        capital: true,
        established_date: true,
        website: true,
        version: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!company) {
      return res.status(404).json({
        error: 'Not Found',
        message: '公司資料不存在',
        statusCode: 404
      });
    }

    // 格式化回應
    const response = {
      ...company,
      capital: company.capital?.toString(),
      established_date: company.established_date?.toISOString().split('T')[0]
    };

    return res.json(response);
  } catch (error) {
    logger.error('Get company basic data failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取公司基本資料失敗',
      statusCode: 500
    });
  }
});

// PUT /api/v1/companies/basic - 更新公司基本資料
router.put('/basic', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = updateBasicDataSchema.parse(req.body);
    const { version, ...updateData } = validatedData;

    // 檢查當前公司資料和版本
    const currentCompany = await prisma.company.findUnique({
      where: { id: req.user!.company_id }
    });

    if (!currentCompany) {
      return res.status(404).json({
        error: 'Not Found',
        message: '公司資料不存在',
        statusCode: 404
      });
    }

    // 樂觀鎖檢查
    if (currentCompany.version !== version) {
      return res.status(409).json({
        error: 'Conflict',
        message: '資料版本衝突，請重新載入後再試',
        statusCode: 409
      });
    }

    // 如果要更新統一編號，檢查是否重複
    if (updateData.tax_id && updateData.tax_id !== currentCompany.tax_id) {
      const existingCompany = await prisma.company.findFirst({
        where: {
          tax_id: updateData.tax_id,
          id: { not: currentCompany.id }
        }
      });

      if (existingCompany) {
        return res.status(409).json({
          error: 'Conflict',
          message: '統一編號已被其他公司使用',
          statusCode: 409
        });
      }
    }

    // 處理日期格式
    const processedData = {
      ...updateData,
      established_date: updateData.established_date ? new Date(updateData.established_date) : undefined,
      website: updateData.website === '' ? null : updateData.website,
      version: version + 1 // 版本遞增
    };

    // 移除undefined值
    Object.keys(processedData).forEach(key => {
      if (processedData[key as keyof typeof processedData] === undefined) {
        delete processedData[key as keyof typeof processedData];
      }
    });

    const updatedCompany = await prisma.company.update({
      where: { id: req.user!.company_id },
      data: processedData,
      select: {
        id: true,
        company_name: true,
        tax_id: true,
        address: true,
        phone: true,
        email: true,
        capital: true,
        established_date: true,
        website: true,
        version: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Company basic data updated', { 
      companyId: updatedCompany.id, 
      userId: req.userId,
      version: updatedCompany.version 
    });

    // 格式化回應
    const response = {
      ...updatedCompany,
      capital: updatedCompany.capital?.toString(),
      established_date: updatedCompany.established_date?.toISOString().split('T')[0]
    };

    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Update company basic data failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '更新公司基本資料失敗',
      statusCode: 500
    });
  }
});

export default router;