import express from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';
import {
  PROPOSAL_STATUS,
  getStatusTransitionError,
  isValidStatusTransition
} from '../middleware/validateStatusTransition';
import { validateConversion } from '../middleware/validateConversion';

const router = express.Router();

// Validation schemas
const createProposalSchema = z.object({
  proposal_title: z.string().min(2, '標書名稱至少需要2個字元').max(200, '標書名稱長度不能超過200字元'),
  client_name: z.string().min(1, '請輸入客戶名稱').max(200, '客戶名稱長度不能超過200字元'),
  template_id: z.string().min(1, '請選擇範本'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '截止日期格式應為 YYYY-MM-DD').optional(),
  estimated_amount: z.number().min(0, '預估金額必須為非負數').optional(),
  status: z.enum(['草稿', '進行中', '已完成', '已提交', '得標', '未得標'], {
    errorMap: () => ({ message: '請選擇正確的狀態' })
  }).optional().default('草稿'),
  description: z.string().optional(),
  tags: z.array(z.string().max(50, '標籤長度不能超過50字元')).optional().default([])
});

const updateProposalSchema = createProposalSchema.partial().omit({ template_id: true });

const updateContentSchema = z.object({
  content: z.record(z.string(), z.any()),
  version: z.number().int().min(1, '版本號必須為正整數')
});

// GET /api/v1/proposals - 獲取標書列表（優化版）
router.get('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { 
      status, 
      client_name, 
      tags, 
      deadline_from, 
      deadline_to, 
      page = '1', 
      limit = '50',
      cursor // 支持游標分頁
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // 限制最大每頁數量

    // 使用優化的查詢函數
    const { optimizedQueries } = await import('../utils/queryOptimizer');
    
    const filters = {
      status,
      client_name,
      tags,
      deadline_from,
      deadline_to
    };

    const paginationOptions = {
      page: pageNum,
      limit: limitNum,
      cursor: cursor as string,
      orderBy: { deadline: 'asc' as const, created_at: 'desc' as const }
    };

    const result = await optimizedQueries.getProposalsOptimized(
      (req as any).user.company_id,
      filters,
      paginationOptions,
      req
    );

    // 格式化回應
    const formattedProposals = result.data.map((proposal: any) => ({
      ...proposal,
      estimated_amount: proposal.estimated_amount?.toString(),
      deadline: proposal.deadline?.toISOString().split('T')[0]
    }));

    return res.json({
      data: formattedProposals,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Get proposals failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取標書列表失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/proposals - 新增標書
router.post('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = createProposalSchema.parse(req.body);

    // 檢查範本是否屬於當前公司
    const template = await prisma.proposalTemplate.findFirst({
      where: {
        id: validatedData.template_id,
        company_id: (req as any).user.company_id
      }
    });

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: '範本不存在',
        statusCode: 404
      });
    }

    const newProposal = await prisma.proposal.create({
      data: {
        title: validatedData.proposal_title,
        proposal_title: validatedData.proposal_title,
        client_name: validatedData.client_name,
        template_id: validatedData.template_id,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : undefined,
        status: validatedData.status || '草稿',
        user_id: (req as any).user.id,
        company_id: (req as any).user.company_id
      },
      select: {
        id: true,
        proposal_title: true,
        client_name: true,
        deadline: true,
        estimated_amount: true,
        status: true,
        version: true,
        created_at: true,
        updated_at: true,
        template: {
          select: {
            id: true,
            template_name: true,
            category: true
          }
        }
      }
    });

    logger.info('Proposal created', { 
      proposalId: newProposal.id, 
      userId: req.userId 
    });

    // 格式化回應
    const response = {
      ...newProposal,
      estimated_amount: newProposal.estimated_amount?.toString(),
      deadline: newProposal.deadline?.toISOString().split('T')[0]
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

    logger.error('Create proposal failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '新增標書失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/proposals/:id - 獲取標書詳情
router.get('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const proposalId = req.params.id;

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        company_id: (req as any).user.company_id
      },
      select: {
        id: true,
        proposal_title: true,
        client_name: true,
        deadline: true,
        estimated_amount: true,
        status: true,
        content: true,
        version: true,
        created_at: true,
        updated_at: true,
        template: {
          select: {
            id: true,
            template_name: true,
            category: true,
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
        }
      }
    });

    if (!proposal) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書不存在',
        statusCode: 404
      });
    }

    // 格式化回應
    const response = {
      ...proposal,
      estimated_amount: proposal.estimated_amount?.toString(),
      deadline: proposal.deadline?.toISOString().split('T')[0]
    };

    return res.json(response);
  } catch (error) {
    logger.error('Get proposal failed', { error, userId: req.userId, proposalId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取標書詳情失敗',
      statusCode: 500
    });
  }
});

// PUT /api/v1/proposals/:id - 更新標書基本資訊
router.put('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const proposalId = req.params.id;
    const validatedData = updateProposalSchema.parse(req.body);

    // 檢查標書是否存在且屬於當前公司
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        company_id: (req as any).user.company_id
      }
    });

    if (!existingProposal) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書不存在',
        statusCode: 404
      });
    }

    // 移除undefined值並處理日期格式
    const updateData = Object.fromEntries(
      Object.entries({
        ...validatedData,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : undefined
      }).filter(([_, value]) => value !== undefined)
    );

    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: updateData,
      select: {
        id: true,
        proposal_title: true,
        client_name: true,
        deadline: true,
        estimated_amount: true,
        status: true,
        version: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Proposal updated', { 
      proposalId: updatedProposal.id, 
      userId: req.userId 
    });

    // 格式化回應
    const response = {
      ...updatedProposal,
      estimated_amount: updatedProposal.estimated_amount?.toString(),
      deadline: updatedProposal.deadline?.toISOString().split('T')[0]
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

    logger.error('Update proposal failed', { error, userId: req.userId, proposalId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '更新標書失敗',
      statusCode: 500
    });
  }
});

// PUT /api/v1/proposals/:id/content - 更新標書內容
router.put('/:id/content', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const proposalId = req.params.id;
    const validatedData = updateContentSchema.parse(req.body);

    // 檢查標書是否存在且屬於當前公司
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        company_id: (req as any).user.company_id
      }
    });

    if (!existingProposal) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書不存在',
        statusCode: 404
      });
    }

    // 樂觀鎖檢查
    if (existingProposal.version !== validatedData.version) {
      return res.status(409).json({
        error: 'Conflict',
        message: '標書版本衝突，請重新載入後再試',
        statusCode: 409
      });
    }

    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        content: validatedData.content,
        version: validatedData.version + 1
      },
      select: {
        id: true,
        content: true,
        version: true,
        updated_at: true
      }
    });

    logger.info('Proposal content updated', { 
      proposalId: updatedProposal.id, 
      version: updatedProposal.version,
      userId: req.userId 
    });

    return res.json(updatedProposal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Update proposal content failed', { error, userId: req.userId, proposalId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '更新標書內容失敗',
      statusCode: 500
    });
  }
});

// DELETE /api/v1/proposals/:id - 刪除標書
router.delete('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const proposalId = req.params.id;

    // 檢查標書是否存在且屬於當前公司
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        company_id: (req as any).user.company_id
      }
    });

    if (!existingProposal) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書不存在',
        statusCode: 404
      });
    }

    // 硬刪除標書
    await prisma.proposal.delete({
      where: { id: proposalId }
    });

    logger.info('Proposal deleted', {
      proposalId,
      userId: req.userId
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete proposal failed', { error, userId: req.userId, proposalId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '刪除標書失敗',
      statusCode: 500
    });
  }
});

// PATCH /api/v1/proposals/:id/status - 更新標案狀態 (FR-026)
const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'SUBMITTED', 'WON', 'LOST', 'CANCELLED'], {
    errorMap: () => ({ message: '請選擇正確的狀態' })
  }),
  note: z.string().max(500, '備註長度不能超過500字元').optional()
});

router.patch('/:id/status', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const proposalId = req.params.id;
    const validatedData = updateStatusSchema.parse(req.body);

    // 檢查標書是否存在且屬於當前公司
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        company_id: (req as any).user.company_id
      }
    });

    if (!existingProposal) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書不存在',
        statusCode: 404
      });
    }

    // 驗證狀態轉換
    const isValid = isValidStatusTransition(
      existingProposal.status,
      validatedData.status
    );

    if (!isValid) {
      const errorMessage = getStatusTransitionError(
        existingProposal.status,
        validatedData.status
      );
      return res.status(400).json({
        error: 'Invalid Status Transition',
        message: errorMessage,
        statusCode: 400
      });
    }

    // 使用事務更新狀態並記錄歷史
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 更新標書狀態
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: { status: validatedData.status },
        select: {
          id: true,
          proposal_title: true,
          status: true,
          updated_at: true
        }
      });

      // 記錄狀態變更歷史
      await tx.proposalStatusHistory.create({
        data: {
          proposal_id: proposalId!,
          from_status: existingProposal.status,
          to_status: validatedData.status,
          changed_by: (req as any).user.id,
          note: validatedData.note || null
        }
      });

      return updatedProposal;
    });

    logger.info('Proposal status updated', {
      proposalId: result.id,
      fromStatus: existingProposal.status,
      toStatus: validatedData.status,
      userId: req.userId
    });

    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Update proposal status failed', { error, userId: req.userId, proposalId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '更新標案狀態失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/proposals/:id/status-history - 獲取狀態變更歷史 (FR-026)
router.get('/:id/status-history', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const proposalId = req.params.id;

    // 檢查標書是否存在且屬於當前公司
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        company_id: (req as any).user.company_id
      }
    });

    if (!existingProposal) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書不存在',
        statusCode: 404
      });
    }

    // 獲取狀態歷史
    const history = await prisma.proposalStatusHistory.findMany({
      where: { proposal_id: proposalId },
      orderBy: { changed_at: 'desc' },
      select: {
        id: true,
        from_status: true,
        to_status: true,
        changed_at: true,
        changed_by: true,
        note: true
      }
    });

    return res.json({
      proposal_id: proposalId,
      current_status: existingProposal.status,
      history
    });
  } catch (error) {
    logger.error('Get proposal status history failed', { error, userId: req.userId, proposalId: req.params.id });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取狀態歷史失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/proposals/:id/convert-to-project - 將得標標案轉換為實績案例
const convertToProjectSchema = z.object({
  project_name: z.string().min(2, '專案名稱至少需要2個字元').max(200, '專案名稱長度不能超過200字元'),
  client_name: z.string().max(200, '客戶名稱長度不能超過200字元').optional(),
  amount: z.number().min(0, '專案金額必須為非負數').optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '開始日期格式應為 YYYY-MM-DD').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '結束日期格式應為 YYYY-MM-DD').optional(),
  description: z.string().min(1, '請輸入專案描述'),
  achievements: z.string().optional(),
  scale: z.string().max(50, '專案規模描述長度不能超過50字元').optional(),
  tags: z.array(z.string().max(50, '標籤長度不能超過50字元')).optional().default([]),
  is_public: z.boolean().optional().default(true),
  force: z.boolean().optional().default(false) // 是否強制重複轉換
});

router.post('/:id/convert-to-project', authenticateToken, requireCompanyAccess, validateConversion, async (req, res) => {
  try {
    const proposalId = req.params.id;
    const validatedData = convertToProjectSchema.parse(req.body);

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

    // 使用事務確保原子性：建立 Project 並更新 Proposal
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. 建立 Project 記錄
      const newProject = await tx.project.create({
        data: {
          name: validatedData.project_name,
          project_name: validatedData.project_name,
          description: validatedData.description,
          client_name: validatedData.client_name || req.proposal.client_name,
          start_date: validatedData.start_date ? new Date(validatedData.start_date) : undefined,
          end_date: validatedData.end_date ? new Date(validatedData.end_date) : undefined,
          amount: validatedData.amount?.toString() || req.proposal.estimated_amount,
          scale: validatedData.scale,
          achievements: validatedData.achievements,
          tags: JSON.stringify(validatedData.tags || []),
          is_public: validatedData.is_public ?? true,
          company_id: (req as any).user.company_id,
          source_proposal_id: proposalId // 記錄來源標案
        },
        select: {
          id: true,
          project_name: true,
          client_name: true,
          start_date: true,
          end_date: true,
          amount: true,
          description: true,
          achievements: true,
          created_at: true
        }
      });

      // 2. 更新 Proposal 的轉換狀態
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          converted_to_project_id: newProject.id,
          converted_at: new Date(),
          converted_by: (req as any).user.id
        },
        select: {
          id: true,
          proposal_title: true,
          converted_to_project_id: true,
          converted_at: true,
          converted_by: true
        }
      });

      return { project: newProject, proposal: updatedProposal };
    });

    logger.info('Proposal converted to project', {
      proposalId,
      projectId: result.project.id,
      userId: (req as any).user.id,
      isForceConversion: validatedData.force
    });

    // 格式化回應
    const response = {
      success: true,
      project: {
        ...result.project,
        amount: result.project.amount?.toString(),
        start_date: result.project.start_date?.toISOString().split('T')[0],
        end_date: result.project.end_date?.toISOString().split('T')[0]
      },
      proposal: {
        ...result.proposal,
        converted_at: result.proposal.converted_at?.toISOString()
      },
      warning: req.conversionWarning // 包含警告訊息（如果有）
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

    logger.error('Convert proposal to project failed', {
      error,
      proposalId: req.params.id,
      userId: req.user?.id
    });

    return res.status(500).json({
      error: 'Internal Server Error',
      message: '轉換標案為實績失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/proposals/:id/conversion-status - 檢查標案轉換狀態
router.get('/:id/conversion-status', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const proposalId = req.params.id;

    // 查詢標案轉換狀態
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        company_id: (req as any).user.company_id
      },
      select: {
        id: true,
        proposal_title: true,
        status: true,
        converted_to_project_id: true,
        converted_at: true,
        converted_by: true,
        convertedProject: {
          select: {
            id: true,
            project_name: true,
            client_name: true,
            amount: true,
            created_at: true
          }
        }
      }
    });

    if (!proposal) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標案不存在',
        statusCode: 404
      });
    }

    // 格式化回應
    const response = {
      proposal_id: proposalId,
      proposal_title: proposal.proposal_title,
      status: proposal.status,
      is_converted: !!proposal.converted_to_project_id,
      converted_at: proposal.converted_at?.toISOString(),
      converted_by: proposal.converted_by,
      project: proposal.convertedProject ? {
        ...proposal.convertedProject,
        amount: proposal.convertedProject.amount?.toString(),
        created_at: proposal.convertedProject.created_at?.toISOString()
      } : null
    };

    return res.json(response);
  } catch (error) {
    logger.error('Get conversion status failed', {
      error,
      proposalId: req.params.id,
      userId: req.user?.id
    });

    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取轉換狀態失敗',
      statusCode: 500
    });
  }
});

export default router;