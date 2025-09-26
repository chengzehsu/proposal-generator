import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createTeamMemberSchema = z.object({
  name: z.string().min(2, '姓名至少需要2個字元').max(100, '姓名長度不能超過100字元'),
  title: z.string().min(1, '請輸入職位').max(100, '職位長度不能超過100字元'),
  department: z.string().max(100, '部門名稱長度不能超過100字元').optional(),
  education: z.string().optional(),
  experience: z.string().optional(),
  expertise: z.string().optional(),
  photo_url: z.string().url('請輸入有效的照片URL').optional(),
  is_key_member: z.boolean().optional().default(false),
  display_order: z.number().int().min(0, '顯示順序必須為非負整數').optional()
});

const updateTeamMemberSchema = createTeamMemberSchema.partial();

// GET /api/v1/team-members - 獲取團隊成員列表
router.get('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { is_key_member, page = '1', limit = '50' } = req.query;

    // 建立查詢條件
    const where: any = {
      company_id: req.user!.company_id,
      is_active: true
    };

    // 篩選關鍵成員
    if (is_key_member !== undefined) {
      where.is_key_member = is_key_member === 'true';
    }

    // 分頁參數
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const teamMembers = await prisma.teamMember.findMany({
      where,
      orderBy: [
        { display_order: 'asc' },
        { created_at: 'desc' }
      ],
      skip,
      take: limitNum,
      select: {
        id: true,
        name: true,
        title: true,
        department: true,
        education: true,
        experience: true,
        expertise: true,
        photo_url: true,
        is_key_member: true,
        display_order: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    res.json(teamMembers);
  } catch (error) {
    logger.error('Get team members failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取團隊成員列表失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/team-members - 新增團隊成員
router.post('/', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = createTeamMemberSchema.parse(req.body);

    // 如果沒有指定顯示順序，自動設定為最後
    let displayOrder = validatedData.display_order;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.teamMember.findFirst({
        where: { company_id: req.user!.company_id },
        orderBy: { display_order: 'desc' },
        select: { display_order: true }
      });
      displayOrder = (maxOrder?.display_order || 0) + 1;
    } else {
      // 檢查display_order是否已存在
      const existingMember = await prisma.teamMember.findFirst({
        where: {
          company_id: req.user!.company_id,
          display_order: displayOrder,
          is_active: true
        }
      });

      if (existingMember) {
        return res.status(409).json({
          error: 'Conflict',
          message: '顯示順序已被使用',
          statusCode: 409
        });
      }
    }

    const newMember = await prisma.teamMember.create({
      data: {
        ...validatedData,
        display_order: displayOrder,
        company_id: req.user!.company_id
      },
      select: {
        id: true,
        name: true,
        title: true,
        department: true,
        education: true,
        experience: true,
        expertise: true,
        photo_url: true,
        is_key_member: true,
        display_order: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Team member created', { 
      memberId: newMember.id, 
      userId: req.userId 
    });

    res.status(201).json(newMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Create team member failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '新增團隊成員失敗',
      statusCode: 500
    });
  }
});

// PUT /api/v1/team-members/:id - 更新團隊成員
router.put('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const memberId = req.params.id;
    const validatedData = updateTeamMemberSchema.parse(req.body);

    // 檢查成員是否存在且屬於當前公司
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        company_id: req.user!.company_id,
        is_active: true
      }
    });

    if (!existingMember) {
      return res.status(404).json({
        error: 'Not Found',
        message: '團隊成員不存在',
        statusCode: 404
      });
    }

    // 檢查display_order衝突（如果有更新的話）
    if (validatedData.display_order !== undefined && validatedData.display_order !== existingMember.display_order) {
      const conflictingMember = await prisma.teamMember.findFirst({
        where: {
          company_id: req.user!.company_id,
          display_order: validatedData.display_order,
          is_active: true,
          id: { not: memberId }
        }
      });

      if (conflictingMember) {
        return res.status(409).json({
          error: 'Conflict',
          message: '顯示順序已被其他成員使用',
          statusCode: 409
        });
      }
    }

    // 移除undefined值
    const updateData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined)
    );

    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: updateData,
      select: {
        id: true,
        name: true,
        title: true,
        department: true,
        education: true,
        experience: true,
        expertise: true,
        photo_url: true,
        is_key_member: true,
        display_order: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    logger.info('Team member updated', { 
      memberId: updatedMember.id, 
      userId: req.userId 
    });

    res.json(updatedMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('Update team member failed', { error, userId: req.userId, memberId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '更新團隊成員失敗',
      statusCode: 500
    });
  }
});

// DELETE /api/v1/team-members/:id - 刪除團隊成員（軟刪除）
router.delete('/:id', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const memberId = req.params.id;

    // 檢查成員是否存在且屬於當前公司
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        company_id: req.user!.company_id,
        is_active: true
      }
    });

    if (!existingMember) {
      return res.status(404).json({
        error: 'Not Found',
        message: '團隊成員不存在',
        statusCode: 404
      });
    }

    // 軟刪除
    await prisma.teamMember.update({
      where: { id: memberId },
      data: { is_active: false }
    });

    logger.info('Team member deleted', { 
      memberId, 
      userId: req.userId 
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete team member failed', { error, userId: req.userId, memberId: req.params.id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '刪除團隊成員失敗',
      statusCode: 500
    });
  }
});

export default router;