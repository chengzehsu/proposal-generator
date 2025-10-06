import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createTemplateSchema = z.object({
  template_name: z.string().min(2, '範本名稱至少需要2個字元').max(200, '範本名稱長度不能超過200字元'),
  description: z.string().optional(),
  category: z.enum(['政府標案', '企業採購', '工程建設', '服務提案', '研發專案', '其他'], {
    errorMap: () => ({ message: '請選擇正確的範本類別' })
  }),
  is_public: z.boolean().optional().default(false),
  is_default: z.boolean().optional().default(false)
});

const updateTemplateSchema = createTemplateSchema.partial();

// GET /api/v1/templates - 獲取標書範本列表
router.get('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { category, is_public, is_default, page = '1', limit = '50' } = req.query;

    // 建立查詢條件
    const where: any = {
      company_id: (req as any).user.company_id
    };

    // 按類別篩選
    if (category) {
      where.category = category;
    }

    // 按公開狀態篩選
    if (is_public !== undefined) {
      where.is_public = is_public === 'true';
    }

    // 按預設範本篩選
    if (is_default !== undefined) {
      where.is_default = is_default === 'true';
    }

    // 分頁參數
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const templates = await prisma.proposalTemplate.findMany({
      where,
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' }
      ],
      skip,
      take: limitNum,
      select: {
        id: true,
        template_name: true,
        description: true,
        category: true,
        is_public: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            sections: true
          }
        }
      }
    });

    return res.json(templates);
  } catch (error) {
    logger.error('Get templates failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取標書範本列表失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/templates - 新增標書範本
router.post('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = createTemplateSchema.parse(req.body);

    // 如果設為預設範本，需要先取消其他預設範本
    if (validatedData.is_default) {
      await prisma.proposalTemplate.updateMany({
        where: {
          company_id: (req as any).user.company_id,
          is_default: true
        },
        data: {
          is_default: false
        }
      });
    }

    const newTemplate = await prisma.proposalTemplate.create({
      data: {
        name: validatedData.template_name,
        template_name: validatedData.template_name,
        description: validatedData.description,
        category: validatedData.category,
        is_public: validatedData.is_public,
        is_default: validatedData.is_default,
        company_id: (req as any).user.company_id
      },
      select: {
        id: true,
        template_name: true,
        description: true,
        category: true,
        is_public: true,
        is_default: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Template created', { 
      templateId: newTemplate.id, 
      userId: req.userId 
    });

    return res.status(201).json(newTemplate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Create template failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '新增標書範本失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/templates/:id - 獲取標書範本詳情
router.get('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const templateId = req.params.id;

    const template = await prisma.proposalTemplate.findFirst({
      where: {
        id: templateId,
        company_id: (req as any).user.company_id
      },
      select: {
        id: true,
        template_name: true,
        description: true,
        category: true,
        is_public: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        sections: {
          orderBy: { section_order: 'asc' },
          select: {
            id: true,
            section_name: true,
            section_order: true,
            is_required: true,
            content_template: true
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書範本不存在',
        statusCode: 404
      });
    }

    return res.json(template);
  } catch (error) {
    logger.error('Get template failed', { error, userId: req.userId, templateId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取標書範本詳情失敗',
      statusCode: 500
    });
  }
});

// PUT /api/v1/templates/:id - 更新標書範本
router.put('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const templateId = req.params.id;
    const validatedData = updateTemplateSchema.parse(req.body);

    // 檢查範本是否存在且屬於當前公司
    const existingTemplate = await prisma.proposalTemplate.findFirst({
      where: {
        id: templateId,
        company_id: (req as any).user.company_id
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書範本不存在',
        statusCode: 404
      });
    }

    // 如果設為預設範本，需要先取消其他預設範本
    if (validatedData.is_default && !existingTemplate.is_default) {
      await prisma.proposalTemplate.updateMany({
        where: {
          company_id: (req as any).user.company_id,
          is_default: true,
          id: { not: templateId }
        },
        data: {
          is_default: false
        }
      });
    }

    // 移除undefined值
    const updateData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined)
    );

    const updatedTemplate = await prisma.proposalTemplate.update({
      where: { id: templateId },
      data: updateData,
      select: {
        id: true,
        template_name: true,
        description: true,
        category: true,
        is_public: true,
        is_default: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Template updated', { 
      templateId: updatedTemplate.id, 
      userId: req.userId 
    });

    return res.json(updatedTemplate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Update template failed', { error, userId: req.userId, templateId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '更新標書範本失敗',
      statusCode: 500
    });
  }
});

// DELETE /api/v1/templates/:id - 刪除標書範本
router.delete('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const templateId = req.params.id;

    // 檢查範本是否存在且屬於當前公司
    const existingTemplate = await prisma.proposalTemplate.findFirst({
      where: {
        id: templateId,
        company_id: (req as any).user.company_id
      },
      include: {
        _count: {
          select: {
            proposals: true
          }
        }
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書範本不存在',
        statusCode: 404
      });
    }

    // 檢查是否有相關的標書使用此範本
    if (existingTemplate._count.proposals > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: '此範本正被標書使用中，無法刪除',
        statusCode: 409
      });
    }

    // 使用事務刪除範本及其章節
    await prisma.$transaction(async (tx: any) => {
      // 先刪除所有章節
      await tx.templateSection.deleteMany({
        where: { template_id: templateId }
      });
      
      // 再刪除範本
      await tx.proposalTemplate.delete({
        where: { id: templateId }
      });
    });

    logger.info('Template deleted', { 
      templateId, 
      userId: req.userId 
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete template failed', { error, userId: req.userId, templateId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '刪除標書範本失敗',
      statusCode: 500
    });
  }
});

export default router;