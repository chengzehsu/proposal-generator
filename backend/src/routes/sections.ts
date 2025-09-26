import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createSectionSchema = z.object({
  template_id: z.string().min(1, '請指定範本ID'),
  section_name: z.string().min(2, '章節名稱至少需要2個字元').max(200, '章節名稱長度不能超過200字元'),
  section_order: z.number().int().min(1, '章節順序必須為正整數'),
  is_required: z.boolean().optional().default(true),
  content_template: z.string().optional(),
  ai_prompt: z.string().optional()
});

const updateSectionSchema = createSectionSchema.partial().omit({ template_id: true });

// GET /api/v1/sections - 獲取範本章節列表
router.get('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { template_id, is_required, page = '1', limit = '50' } = req.query;

    if (!template_id) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '請指定範本ID',
        statusCode: 400
      });
    }

    // 檢查範本是否屬於當前公司
    const template = await prisma.template.findFirst({
      where: {
        id: template_id as string,
        company_id: req.user!.company_id
      }
    });

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: '範本不存在',
        statusCode: 404
      });
    }

    // 建立查詢條件
    const where: any = {
      template_id: template_id as string
    };

    // 按必填狀態篩選
    if (is_required !== undefined) {
      where.is_required = is_required === 'true';
    }

    // 分頁參數
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const sections = await prisma.templateSection.findMany({
      where,
      orderBy: { section_order: 'asc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        section_name: true,
        section_order: true,
        is_required: true,
        content_template: true,
        ai_prompt: true,
        created_at: true,
        updated_at: true
      }
    });

    res.json(sections);
  } catch (error) {
    logger.error('Get sections failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取範本章節列表失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/sections - 新增範本章節
router.post('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = createSectionSchema.parse(req.body);

    // 檢查範本是否屬於當前公司
    const template = await prisma.template.findFirst({
      where: {
        id: validatedData.template_id,
        company_id: req.user!.company_id
      }
    });

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: '範本不存在',
        statusCode: 404
      });
    }

    // 檢查章節順序是否已存在
    const existingSection = await prisma.templateSection.findFirst({
      where: {
        template_id: validatedData.template_id,
        section_order: validatedData.section_order
      }
    });

    if (existingSection) {
      return res.status(409).json({
        error: 'Conflict',
        message: '章節順序已被使用',
        statusCode: 409
      });
    }

    const newSection = await prisma.templateSection.create({
      data: validatedData,
      select: {
        id: true,
        section_name: true,
        section_order: true,
        is_required: true,
        content_template: true,
        ai_prompt: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Template section created', { 
      sectionId: newSection.id, 
      templateId: validatedData.template_id,
      userId: req.userId 
    });

    res.status(201).json(newSection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Create section failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '新增範本章節失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/sections/:id - 獲取範本章節詳情
router.get('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const sectionId = req.params.id;

    const section = await prisma.templateSection.findFirst({
      where: {
        id: sectionId,
        template: {
          company_id: req.user!.company_id
        }
      },
      select: {
        id: true,
        template_id: true,
        section_name: true,
        section_order: true,
        is_required: true,
        content_template: true,
        ai_prompt: true,
        created_at: true,
        updated_at: true,
        template: {
          select: {
            template_name: true,
            category: true
          }
        }
      }
    });

    if (!section) {
      return res.status(404).json({
        error: 'Not Found',
        message: '範本章節不存在',
        statusCode: 404
      });
    }

    res.json(section);
  } catch (error) {
    logger.error('Get section failed', { error, userId: req.userId, sectionId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取範本章節詳情失敗',
      statusCode: 500
    });
  }
});

// PUT /api/v1/sections/:id - 更新範本章節
router.put('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const sectionId = req.params.id;
    const validatedData = updateSectionSchema.parse(req.body);

    // 檢查章節是否存在且屬於當前公司
    const existingSection = await prisma.templateSection.findFirst({
      where: {
        id: sectionId,
        template: {
          company_id: req.user!.company_id
        }
      },
      include: {
        template: true
      }
    });

    if (!existingSection) {
      return res.status(404).json({
        error: 'Not Found',
        message: '範本章節不存在',
        statusCode: 404
      });
    }

    // 檢查章節順序衝突（如果有更新的話）
    if (validatedData.section_order !== undefined && validatedData.section_order !== existingSection.section_order) {
      const conflictingSection = await prisma.templateSection.findFirst({
        where: {
          template_id: existingSection.template_id,
          section_order: validatedData.section_order,
          id: { not: sectionId }
        }
      });

      if (conflictingSection) {
        return res.status(409).json({
          error: 'Conflict',
          message: '章節順序已被其他章節使用',
          statusCode: 409
        });
      }
    }

    // 移除undefined值
    const updateData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined)
    );

    const updatedSection = await prisma.templateSection.update({
      where: { id: sectionId },
      data: updateData,
      select: {
        id: true,
        section_name: true,
        section_order: true,
        is_required: true,
        content_template: true,
        ai_prompt: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Template section updated', { 
      sectionId: updatedSection.id, 
      userId: req.userId 
    });

    res.json(updatedSection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Update section failed', { error, userId: req.userId, sectionId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '更新範本章節失敗',
      statusCode: 500
    });
  }
});

// DELETE /api/v1/sections/:id - 刪除範本章節
router.delete('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const sectionId = req.params.id;

    // 檢查章節是否存在且屬於當前公司
    const existingSection = await prisma.templateSection.findFirst({
      where: {
        id: sectionId,
        template: {
          company_id: req.user!.company_id
        }
      }
    });

    if (!existingSection) {
      return res.status(404).json({
        error: 'Not Found',
        message: '範本章節不存在',
        statusCode: 404
      });
    }

    // 刪除章節
    await prisma.templateSection.delete({
      where: { id: sectionId }
    });

    logger.info('Template section deleted', { 
      sectionId, 
      userId: req.userId 
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete section failed', { error, userId: req.userId, sectionId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '刪除範本章節失敗',
      statusCode: 500
    });
  }
});

export default router;