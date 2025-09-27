import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

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

// GET /api/v1/proposals - 獲取標書列表
router.get('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { 
      status, 
      client_name, 
      tags, 
      deadline_from, 
      deadline_to, 
      page = '1', 
      limit = '50' 
    } = req.query;

    // 建立查詢條件
    const where: any = {
      company_id: req.user!.company_id
    };

    // 按狀態篩選
    if (status) {
      where.status = status;
    }

    // 按客戶名稱篩選
    if (client_name) {
      where.client_name = {
        contains: client_name as string,
        mode: 'insensitive'
      };
    }

    // 按標籤篩選
    if (tags) {
      where.tags = {
        hasSome: Array.isArray(tags) ? tags : [tags]
      };
    }

    // 按截止日期範圍篩選
    if (deadline_from || deadline_to) {
      where.deadline = {};
      if (deadline_from) {
        where.deadline.gte = new Date(deadline_from as string);
      }
      if (deadline_to) {
        where.deadline.lte = new Date(deadline_to as string);
      }
    }

    // 分頁參數
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const proposals = await prisma.proposal.findMany({
      where,
      orderBy: [
        { deadline: 'asc' },
        { created_at: 'desc' }
      ],
      skip,
      take: limitNum,
      select: {
        id: true,
        proposal_title: true,
        client_name: true,
        deadline: true,
        estimated_amount: true,
        status: true,
        description: true,
        tags: true,
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

    // 格式化回應
    const formattedProposals = proposals.map((proposal: any) => ({
      ...proposal,
      estimated_amount: proposal.estimated_amount?.toString(),
      deadline: proposal.deadline?.toISOString().split('T')[0]
    }));

    return res.json(formattedProposals);
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

    const newProposal = await prisma.proposal.create({
      data: {
        ...validatedData,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : undefined,
        company_id: req.user!.company_id
      },
      select: {
        id: true,
        proposal_title: true,
        client_name: true,
        deadline: true,
        estimated_amount: true,
        status: true,
        description: true,
        tags: true,
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
        company_id: req.user!.company_id
      },
      select: {
        id: true,
        proposal_title: true,
        client_name: true,
        deadline: true,
        estimated_amount: true,
        status: true,
        description: true,
        tags: true,
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
        company_id: req.user!.company_id
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
        description: true,
        tags: true,
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
        company_id: req.user!.company_id
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
        company_id: req.user!.company_id
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

export default router;