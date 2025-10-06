import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const generateProposalSchema = z.object({
  template_id: z.string().min(1, '請選擇範本'),
  client_name: z.string().min(1, '請輸入客戶名稱').max(200, '客戶名稱長度不能超過200字元'),
  project_context: z.string().min(10, '專案背景描述至少需要10個字元'),
  requirements: z.array(z.string()).min(1, '至少需要一個需求項目'),
  company_advantages: z.array(z.string()).optional().default([]),
  budget_range: z.object({
    min: z.number().min(0, '預算最小值必須為非負數').optional(),
    max: z.number().min(0, '預算最大值必須為非負數').optional()
  }).optional(),
  timeline: z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '開始日期格式應為 YYYY-MM-DD').optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '結束日期格式應為 YYYY-MM-DD').optional(),
    duration_months: z.number().int().min(1, '專案期程必須至少1個月').optional()
  }).optional(),
  additional_info: z.string().optional()
});

const generateSectionSchema = z.object({
  proposal_id: z.string().min(1, '請指定標書ID'),
  section_id: z.string().min(1, '請指定章節ID'),
  custom_prompt: z.string().optional(),
  context: z.record(z.string(), z.any()).optional()
});

// POST /api/v1/generation/proposal - 生成完整標書
router.post('/proposal', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = generateProposalSchema.parse(req.body);

    // 檢查範本是否屬於當前公司
    const template = await prisma.proposalTemplate.findFirst({
      where: {
        id: validatedData.template_id,
        company_id: (req as any).user.company_id
      },
      include: {
        sections: {
          orderBy: { section_order: 'asc' }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: '範本不存在',
        statusCode: 404
      });
    }

    // 獲取公司資料作為生成內容的參考
    const company = await prisma.company.findUnique({
      where: { id: (req as any).user.company_id },
      include: {
        team_members: {
          where: { is_active: true },
          orderBy: { display_order: 'asc' }
        },
        projects: {
          where: { is_public: true },
          orderBy: { created_at: 'desc' },
          take: 10
        },
        awards: {
          where: { is_public: true },
          orderBy: { award_date: 'desc' },
          take: 10
        }
      }
    });

    // 建立標書草稿
    const proposalTitle = `${validatedData.client_name} - ${template.template_name}標書`;
    
    const newProposal = await prisma.proposal.create({
      data: {
        title: proposalTitle,
        proposal_title: proposalTitle,
        user_id: req.userId!,
        client_name: validatedData.client_name,
        template_id: validatedData.template_id,
        status: '草稿',
        company_id: (req as any).user.company_id,
        content: '{}' // 初始空內容，將由AI逐步填充
      }
    });

    // 準備生成上下文
    const generationContext = {
      company: {
        name: company?.company_name,
        business_scope: 'Company business scope', // TODO: Add company_profile relation
        established_date: company?.established_date,
        capital: company?.capital,
        team_members: company?.team_members.map((member: any) => ({
          name: member.name,
          title: member.title,
          department: member.department,
          expertise: member.expertise
        })),
        recent_projects: company?.projects.map((project: any) => ({
          name: project.project_name,
          client: project.client_name,
          description: project.description,
          achievements: project.achievements
        })),
        awards: company?.awards.map((award: any) => ({
          name: award.award_name,
          organization: award.awarding_organization,
          date: award.award_date,
          level: award.award_level
        }))
      },
      client: {
        name: validatedData.client_name,
        project_context: validatedData.project_context,
        requirements: validatedData.requirements,
        budget_range: validatedData.budget_range,
        timeline: validatedData.timeline
      },
      advantages: validatedData.company_advantages,
      additional_info: validatedData.additional_info
    };

    logger.info('Proposal generation started', { 
      proposalId: newProposal.id,
      templateId: validatedData.template_id,
      userId: req.userId 
    });

    // 返回生成任務信息
    return res.status(202).json({
      message: '標書生成任務已啟動',
      proposal_id: newProposal.id,
      status: '生成中',
      sections_total: template.sections.length,
      estimated_time: template.sections.length * 30 // 估計每章節30秒
    });

    // 異步生成內容（實際應用中應使用隊列系統）
    setImmediate(() => {
      generateProposalContent(newProposal.id, template!.sections, generationContext);
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

    logger.error('Generate proposal failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '標書生成失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/generation/section - 生成單一章節
router.post('/section', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = generateSectionSchema.parse(req.body);

    // 檢查標書是否屬於當前公司
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: validatedData.proposal_id,
        company_id: (req as any).user.company_id
      },
      include: {
        template: {
          include: {
            sections: {
              where: { id: validatedData.section_id }
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

    const section = proposal.template!.sections[0];
    if (!section) {
      return res.status(404).json({
        error: 'Not Found',
        message: '章節不存在',
        statusCode: 404
      });
    }

    // 模擬AI生成（實際應呼叫Gemini API）
    const generatedContent = await simulateAIGeneration(section, validatedData.context);

    // 更新標書內容
    const currentContent = proposal.content 
      ? JSON.parse(proposal.content as string) as Record<string, any>
      : {};
    currentContent[section.id] = generatedContent;

    await prisma.proposal.update({
      where: { id: validatedData.proposal_id },
      data: {
        content: JSON.stringify(currentContent),
        version: proposal.version + 1
      }
    });

    logger.info('Section generated', { 
      proposalId: validatedData.proposal_id,
      sectionId: validatedData.section_id,
      userId: req.userId 
    });

    return res.json({
      section_id: section.id,
      section_name: section.section_name,
      content: generatedContent,
      status: 'completed'
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

    logger.error('Generate section failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '章節生成失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/generation/status/:proposalId - 獲取生成狀態
router.get('/status/:proposalId', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const proposalId = req.params.proposalId;

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        company_id: (req as any).user.company_id
      },
      include: {
        template: {
          include: {
            sections: {
              orderBy: { section_order: 'asc' }
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

    const content = proposal.content 
      ? JSON.parse(proposal.content as string) as Record<string, any>
      : {};
    const totalSections = proposal.template!.sections.length;
    const completedSections = Object.keys(content).length;
    
    const sectionsStatus = proposal.template!.sections.map((section: any) => ({
      id: section.id,
      name: section.section_name,
      order: section.section_order,
      status: content[section.id] ? 'completed' : 'pending',
      has_content: !!content[section.id]
    }));

    return res.json({
      proposal_id: proposalId,
      total_sections: totalSections,
      completed_sections: completedSections,
      progress_percentage: Math.round((completedSections / totalSections) * 100),
      overall_status: completedSections === totalSections ? 'completed' : 'in_progress',
      sections: sectionsStatus
    });

  } catch (error) {
    logger.error('Get generation status failed', { error, userId: req.userId, proposalId: req.params.proposalId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取生成狀態失敗',
      statusCode: 500
    });
  }
});

// 模擬AI生成函數（實際應整合Gemini API）
async function simulateAIGeneration(section: any, context?: Record<string, any>): Promise<string> {
  // 模擬生成延遲
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return `[AI生成內容] ${section.section_name}\n\n這是由AI自動生成的${section.section_name}內容。實際應用中，這裡會呼叫Gemini API根據提供的上下文和提示詞生成相應的內容。\n\n生成時間: ${new Date().toISOString()}`;
}

// 異步生成完整標書內容
async function generateProposalContent(proposalId: string, sections: any[], context: Record<string, any>): Promise<void> {
  try {
    const content: Record<string, any> = {};
    
    for (const section of sections) {
      const generatedContent = await simulateAIGeneration(section, _context);
      content[section.id] = generatedContent;
      
      // 更新進度
      await prisma.proposal.update({
        where: { id: proposalId },
        data: {
          content
        }
      });
      
      logger.info('Section generated in background', { 
        proposalId,
        sectionId: section.id,
        progress: `${Object.keys(content).length}/${sections.length}`
      });
    }

    // 標記為完成
    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: '已完成'
      }
    });

    logger.info('Proposal generation completed', { proposalId });

  } catch (error) {
    logger.error('Background proposal generation failed', { error, proposalId });
    
    // 標記為失敗
    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: '草稿' // 回到草稿狀態
      }
    });
  }
}

export default router;