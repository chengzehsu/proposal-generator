import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createAwardSchema = z.object({
  award_name: z.string().min(2, '獎項名稱至少需要2個字元').max(200, '獎項名稱長度不能超過200字元'),
  awarding_organization: z.string().min(1, '請輸入頒獎機構').max(200, '頒獎機構名稱長度不能超過200字元'),
  award_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '獲獎日期格式應為 YYYY-MM-DD'),
  project_name: z.string().max(200, '專案名稱長度不能超過200字元').optional(),
  description: z.string().optional(),
  award_level: z.enum(['國際級', '國家級', '地方級', '產業級', '其他'], {
    errorMap: () => ({ message: '請選擇正確的獎項等級' })
  }).optional(),
  certificate_url: z.string().url('請輸入有效的證書URL').optional(),
  is_public: z.boolean().optional().default(true),
  display_order: z.number().int().min(0, '顯示順序必須為非負整數').optional()
});

const updateAwardSchema = createAwardSchema.partial();

// GET /api/v1/awards - 獲取獲獎紀錄列表
router.get('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { 
      award_level, 
      year, 
      is_public, 
      page = '1', 
      limit = '50' 
    } = req.query;

    // 建立查詢條件
    const where: any = {
      company_id: req.user!.company_id
    };

    // 按獎項等級篩選
    if (award_level) {
      where.award_level = award_level;
    }

    // 按年份篩選
    if (year) {
      const yearNum = parseInt(year as string);
      where.award_date = {
        gte: new Date(`${yearNum}-01-01`),
        lt: new Date(`${yearNum + 1}-01-01`)
      };
    }

    // 按公開狀態篩選
    if (is_public !== undefined) {
      where.is_public = is_public === 'true';
    }

    // 分頁參數
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const awards = await prisma.award.findMany({
      where,
      orderBy: [
        { display_order: 'asc' },
        { award_date: 'desc' }
      ],
      skip,
      take: limitNum,
      select: {
        id: true,
        award_name: true,
        awarding_organization: true,
        award_date: true,
        project_name: true,
        description: true,
        award_level: true,
        certificate_url: true,
        is_public: true,
        display_order: true,
        created_at: true,
        updated_at: true
      }
    });

    // 格式化回應
    const formattedAwards = awards.map(award => ({
      ...award,
      award_date: award.award_date.toISOString().split('T')[0]
    }));

    res.json(formattedAwards);
  } catch (error) {
    logger.error('Get awards failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取獲獎紀錄列表失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/awards - 新增獲獎紀錄
router.post('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = createAwardSchema.parse(req.body);

    // 如果沒有指定顯示順序，自動設定為最後
    let displayOrder = validatedData.display_order;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.award.findFirst({
        where: { company_id: req.user!.company_id },
        orderBy: { display_order: 'desc' },
        select: { display_order: true }
      });
      displayOrder = (maxOrder?.display_order || 0) + 1;
    } else {
      // 檢查display_order是否已存在
      const existingAward = await prisma.award.findFirst({
        where: {
          company_id: req.user!.company_id,
          display_order: displayOrder
        }
      });

      if (existingAward) {
        return res.status(409).json({
          error: 'Conflict',
          message: '顯示順序已被使用',
          statusCode: 409
        });
      }
    }

    const newAward = await prisma.award.create({
      data: {
        ...validatedData,
        award_date: new Date(validatedData.award_date),
        display_order: displayOrder,
        company_id: req.user!.company_id
      },
      select: {
        id: true,
        award_name: true,
        awarding_organization: true,
        award_date: true,
        project_name: true,
        description: true,
        award_level: true,
        certificate_url: true,
        is_public: true,
        display_order: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Award created', { 
      awardId: newAward.id, 
      userId: req.userId 
    });

    // 格式化回應
    const response = {
      ...newAward,
      award_date: newAward.award_date.toISOString().split('T')[0]
    };

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Create award failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '新增獲獎紀錄失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/awards/:id - 獲取獲獎紀錄詳情
router.get('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const awardId = req.params.id;

    const award = await prisma.award.findFirst({
      where: {
        id: awardId,
        company_id: req.user!.company_id
      },
      select: {
        id: true,
        award_name: true,
        awarding_organization: true,
        award_date: true,
        project_name: true,
        description: true,
        award_level: true,
        certificate_url: true,
        is_public: true,
        display_order: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!award) {
      return res.status(404).json({
        error: 'Not Found',
        message: '獲獎紀錄不存在',
        statusCode: 404
      });
    }

    // 格式化回應
    const response = {
      ...award,
      award_date: award.award_date.toISOString().split('T')[0]
    };

    res.json(response);
  } catch (error) {
    logger.error('Get award failed', { error, userId: req.userId, awardId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取獲獎紀錄詳情失敗',
      statusCode: 500
    });
  }
});

// PUT /api/v1/awards/:id - 更新獲獎紀錄
router.put('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const awardId = req.params.id;
    const validatedData = updateAwardSchema.parse(req.body);

    // 檢查獲獎紀錄是否存在且屬於當前公司
    const existingAward = await prisma.award.findFirst({
      where: {
        id: awardId,
        company_id: req.user!.company_id
      }
    });

    if (!existingAward) {
      return res.status(404).json({
        error: 'Not Found',
        message: '獲獎紀錄不存在',
        statusCode: 404
      });
    }

    // 檢查display_order衝突（如果有更新的話）
    if (validatedData.display_order !== undefined && validatedData.display_order !== existingAward.display_order) {
      const conflictingAward = await prisma.award.findFirst({
        where: {
          company_id: req.user!.company_id,
          display_order: validatedData.display_order,
          id: { not: awardId }
        }
      });

      if (conflictingAward) {
        return res.status(409).json({
          error: 'Conflict',
          message: '顯示順序已被其他獲獎紀錄使用',
          statusCode: 409
        });
      }
    }

    // 移除undefined值並處理日期格式
    const updateData = Object.fromEntries(
      Object.entries({
        ...validatedData,
        award_date: validatedData.award_date ? new Date(validatedData.award_date) : undefined
      }).filter(([_, value]) => value !== undefined)
    );

    const updatedAward = await prisma.award.update({
      where: { id: awardId },
      data: updateData,
      select: {
        id: true,
        award_name: true,
        awarding_organization: true,
        award_date: true,
        project_name: true,
        description: true,
        award_level: true,
        certificate_url: true,
        is_public: true,
        display_order: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Award updated', { 
      awardId: updatedAward.id, 
      userId: req.userId 
    });

    // 格式化回應
    const response = {
      ...updatedAward,
      award_date: updatedAward.award_date.toISOString().split('T')[0]
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Update award failed', { error, userId: req.userId, awardId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '更新獲獎紀錄失敗',
      statusCode: 500
    });
  }
});

// DELETE /api/v1/awards/:id - 刪除獲獎紀錄
router.delete('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const awardId = req.params.id;

    // 檢查獲獎紀錄是否存在且屬於當前公司
    const existingAward = await prisma.award.findFirst({
      where: {
        id: awardId,
        company_id: req.user!.company_id
      }
    });

    if (!existingAward) {
      return res.status(404).json({
        error: 'Not Found',
        message: '獲獎紀錄不存在',
        statusCode: 404
      });
    }

    // 硬刪除獲獎紀錄
    await prisma.award.delete({
      where: { id: awardId }
    });

    logger.info('Award deleted', { 
      awardId, 
      userId: req.userId 
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete award failed', { error, userId: req.userId, awardId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '刪除獲獎紀錄失敗',
      statusCode: 500
    });
  }
});

export default router;