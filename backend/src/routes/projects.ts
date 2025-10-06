import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createProjectSchema = z.object({
  project_name: z.string().min(2, '專案名稱至少需要2個字元').max(200, '專案名稱長度不能超過200字元'),
  client_name: z.string().max(200, '客戶名稱長度不能超過200字元').optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '開始日期格式應為 YYYY-MM-DD').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '結束日期格式應為 YYYY-MM-DD').optional(),
  amount: z.number().min(0, '專案金額必須為非負數').optional(),
  scale: z.string().max(50, '專案規模描述長度不能超過50字元').optional(),
  description: z.string().min(1, '請輸入專案描述'),
  achievements: z.string().optional(),
  tags: z.array(z.string().max(50, '標籤長度不能超過50字元')).optional().default([]),
  is_public: z.boolean().optional().default(true),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().optional()
  })).optional().default([])
});

const updateProjectSchema = createProjectSchema.partial();

// GET /api/v1/projects - 獲取專案列表（優化版）
router.get('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { 
      tags, 
      start_date_from, 
      start_date_to, 
      is_public, 
      page = '1', 
      limit = '50',
      cursor
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // 限制最大每頁數量

    // 使用優化的查詢函數
    const { optimizedQueries } = await import('../utils/queryOptimizer');
    
    const filters = {
      tags,
      start_date_from,
      start_date_to,
      is_public
    };

    const paginationOptions = {
      page: pageNum,
      limit: limitNum,
      cursor: cursor as string,
      orderBy: { created_at: 'desc' as const }
    };

    const result = await optimizedQueries.getProjectsOptimized(
      (req as any).user.company_id,
      filters,
      paginationOptions,
      req
    );

    // 格式化回應
    const formattedProjects = result.data.map((project: any) => ({
      ...project,
      amount: project.amount?.toString(),
      start_date: project.start_date?.toISOString().split('T')[0],
      end_date: project.end_date?.toISOString().split('T')[0]
    }));

    return res.json({
      data: formattedProjects,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Get projects failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取專案列表失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/projects - 新增專案
router.post('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = createProjectSchema.parse(req.body);

    // 驗證日期邏輯
    if (validatedData.start_date && validatedData.end_date) {
      const startDate = new Date(validatedData.start_date);
      const endDate = new Date(validatedData.end_date);
      
      if (startDate > endDate) {
        return res.status(400).json({
          error: 'Validation Error',
          message: '結束日期不能早於開始日期',
          statusCode: 400
        });
      }
    }

    const newProject = await prisma.project.create({
      data: {
        name: validatedData.project_name,
        project_name: validatedData.project_name,
        description: validatedData.description,
        client_name: validatedData.client_name,
        start_date: validatedData.start_date ? new Date(validatedData.start_date) : undefined,
        end_date: validatedData.end_date ? new Date(validatedData.end_date) : undefined,
        amount: validatedData.amount?.toString(),
        scale: validatedData.scale,
        achievements: validatedData.achievements,
        tags: JSON.stringify(validatedData.tags || []),
        is_public: validatedData.is_public ?? true,
        attachments: JSON.stringify(validatedData.attachments || []),
        company_id: (req as any).user.company_id
      },
      select: {
        id: true,
        project_name: true,
        client_name: true,
        start_date: true,
        end_date: true,
        amount: true,
        scale: true,
        description: true,
        achievements: true,
        tags: true,
        is_public: true,
        attachments: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Project created', { 
      projectId: newProject.id, 
      userId: req.userId 
    });

    // 格式化回應
    const response = {
      ...newProject,
      amount: newProject.amount?.toString(),
      start_date: newProject.start_date?.toISOString().split('T')[0],
      end_date: newProject.end_date?.toISOString().split('T')[0]
    };

    return res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Create project failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '新增專案失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/projects/:id - 獲取專案詳情
router.get('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const projectId = req.params.id;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        company_id: (req as any).user.company_id
      },
      select: {
        id: true,
        project_name: true,
        client_name: true,
        start_date: true,
        end_date: true,
        amount: true,
        scale: true,
        description: true,
        achievements: true,
        tags: true,
        is_public: true,
        attachments: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: '專案不存在',
        statusCode: 404
      });
    }

    // 格式化回應
    const response = {
      ...project,
      amount: project.amount?.toString(),
      start_date: project.start_date?.toISOString().split('T')[0],
      end_date: project.end_date?.toISOString().split('T')[0]
    };

    return res.json(response);
  } catch (error) {
    logger.error('Get project failed', { error, userId: req.userId, projectId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取專案詳情失敗',
      statusCode: 500
    });
  }
});

// PUT /api/v1/projects/:id - 更新專案
router.put('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const projectId = req.params.id;
    const validatedData = updateProjectSchema.parse(req.body);

    // 檢查專案是否存在且屬於當前公司
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        company_id: (req as any).user.company_id
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        error: 'Not Found',
        message: '專案不存在',
        statusCode: 404
      });
    }

    // 驗證日期邏輯
    if (validatedData.start_date && validatedData.end_date) {
      const startDate = new Date(validatedData.start_date);
      const endDate = new Date(validatedData.end_date);
      
      if (startDate > endDate) {
        return res.status(400).json({
          error: 'Validation Error',
          message: '結束日期不能早於開始日期',
          statusCode: 400
        });
      }
    }

    // 移除undefined值並處理日期格式
    const updateData = Object.fromEntries(
      Object.entries({
        ...validatedData,
        start_date: validatedData.start_date ? new Date(validatedData.start_date) : undefined,
        end_date: validatedData.end_date ? new Date(validatedData.end_date) : undefined
      }).filter(([_, value]) => value !== undefined)
    );

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      select: {
        id: true,
        project_name: true,
        client_name: true,
        start_date: true,
        end_date: true,
        amount: true,
        scale: true,
        description: true,
        achievements: true,
        tags: true,
        is_public: true,
        attachments: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Project updated', { 
      projectId: updatedProject.id, 
      userId: req.userId 
    });

    // 格式化回應
    const response = {
      ...updatedProject,
      amount: updatedProject.amount?.toString(),
      start_date: updatedProject.start_date?.toISOString().split('T')[0],
      end_date: updatedProject.end_date?.toISOString().split('T')[0]
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

    logger.error('Update project failed', { error, userId: req.userId, projectId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '更新專案失敗',
      statusCode: 500
    });
  }
});

// DELETE /api/v1/projects/:id - 刪除專案
router.delete('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const projectId = req.params.id;

    // 檢查專案是否存在且屬於當前公司
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        company_id: (req as any).user.company_id
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        error: 'Not Found',
        message: '專案不存在',
        statusCode: 404
      });
    }

    // 硬刪除專案
    await prisma.project.delete({
      where: { id: projectId }
    });

    logger.info('Project deleted', { 
      projectId, 
      userId: req.userId 
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete project failed', { error, userId: req.userId, projectId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '刪除專案失敗',
      statusCode: 500
    });
  }
});

export default router;