import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

const router = express.Router();

// Simple export endpoints for testing (without authentication)
// POST /api/v1/exports/pdf - PDF匯出測試端點
router.post('/pdf', async (req, res) => {
  try {
    const { content, title } = req.body;
    
    if (!content) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '請提供要匯出的內容',
        statusCode: 400
      });
    }

    // 模擬PDF生成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return res.json({
      message: 'PDF匯出成功',
      download_url: `/api/v1/exports/download/test_${Date.now()}.pdf`,
      filename: `${title ?? 'document'}.pdf`,
      file_size: Math.floor(Math.random() * 1000000) + 100000,
      format: 'pdf'
    });
  } catch (error) {
    logger.error('PDF export failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'PDF匯出失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/exports/docx - DOCX匯出測試端點
router.post('/docx', async (req, res) => {
  try {
    const { content, title } = req.body;
    
    if (!content) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '請提供要匯出的內容',
        statusCode: 400
      });
    }

    // 模擬DOCX生成
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return res.json({
      message: 'DOCX匯出成功',
      download_url: `/api/v1/exports/download/test_${Date.now()}.docx`,
      filename: `${title ?? 'document'}.docx`,
      file_size: Math.floor(Math.random() * 800000) + 80000,
      format: 'docx'
    });
  } catch (error) {
    logger.error('DOCX export failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'DOCX匯出失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/exports/odt - ODT匯出測試端點
router.post('/odt', async (req, res) => {
  try {
    const { content, title } = req.body;
    
    if (!content) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '請提供要匯出的內容',
        statusCode: 400
      });
    }

    // 模擬ODT生成
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    return res.json({
      message: 'ODT匯出成功',
      download_url: `/api/v1/exports/download/test_${Date.now()}.odt`,
      filename: `${title ?? 'document'}.odt`,
      file_size: Math.floor(Math.random() * 900000) + 90000,
      format: 'odt'
    });
  } catch (error) {
    logger.error('ODT export failed', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'ODT匯出失敗',
      statusCode: 500
    });
  }
});

// Validation schemas
const exportProposalSchema = z.object({
  proposal_id: z.string().min(1, '請指定標書ID'),
  format: z.enum(['pdf', 'docx', 'odt'], {
    errorMap: () => ({ message: '請選擇支援的匯出格式' })
  }),
  options: z.object({
    include_cover: z.boolean().optional().default(true),
    include_toc: z.boolean().optional().default(true),
    include_appendix: z.boolean().optional().default(true),
    watermark: z.string().optional(),
    page_numbers: z.boolean().optional().default(true),
    font_size: z.enum(['small', 'medium', 'large']).optional().default('medium')
  }).optional().default({})
});

const exportTemplateSchema = z.object({
  template_id: z.string().min(1, '請指定範本ID'),
  format: z.enum(['pdf', 'docx', 'odt'], {
    errorMap: () => ({ message: '請選擇支援的匯出格式' })
  }),
  include_sample_content: z.boolean().optional().default(false)
});

const batchExportSchema = z.object({
  proposal_ids: z.array(z.string()).min(1, '至少選擇一個標書').max(10, '一次最多匯出10個標書'),
  format: z.enum(['pdf', 'docx', 'odt'], {
    errorMap: () => ({ message: '請選擇支援的匯出格式' })
  }),
  merge_into_single: z.boolean().optional().default(false)
});

// POST /api/v1/exports/proposal - 匯出標書
router.post('/proposal', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = exportProposalSchema.parse(req.body);

    // 檢查標書是否存在且屬於當前公司
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: validatedData.proposal_id,
        company_id: (req as any).user.company_id
      },
      include: {
        template: {
          include: {
            sections: {
              orderBy: { section_order: 'asc' }
            }
          }
        },
        company: true
      }
    });

    if (!proposal) {
      return res.status(404).json({
        error: 'Not Found',
        message: '標書不存在',
        statusCode: 404
      });
    }

    // 檢查標書是否有內容
    const content = proposal.content 
      ? JSON.parse(proposal.content as string) as Record<string, any>
      : {};
    if (Object.keys(content).length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '標書內容為空，無法匯出',
        statusCode: 400
      });
    }

    // 生成匯出檔案
    const exportResult = await generateExportFile({
      proposal,
      format: validatedData.format,
      options: validatedData.options
    });

    logger.info('Proposal exported', { 
      proposalId: validatedData.proposal_id,
      format: validatedData.format,
      userId: req.userId,
      fileSize: exportResult.fileSize
    });

    return res.json({
      download_url: exportResult.downloadUrl,
      filename: exportResult.filename,
      format: validatedData.format,
      file_size: exportResult.fileSize,
      expires_at: exportResult.expiresAt,
      metadata: {
        proposal_title: proposal.proposal_title,
        client_name: proposal.client_name,
        export_time: new Date().toISOString(),
        page_count: exportResult.pageCount
      }
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

    logger.error('Export proposal failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '標書匯出失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/exports/template - 匯出範本
router.post('/template', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = exportTemplateSchema.parse(req.body);

    // 檢查範本是否存在且屬於當前公司
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

    // 生成範本匯出檔案
    const exportResult = await generateTemplateExportFile({
      template,
      format: validatedData.format,
      includeSampleContent: validatedData.include_sample_content
    });

    logger.info('Template exported', { 
      templateId: validatedData.template_id,
      format: validatedData.format,
      userId: req.userId
    });

    return res.json({
      download_url: exportResult.downloadUrl,
      filename: exportResult.filename,
      format: validatedData.format,
      file_size: exportResult.fileSize,
      expires_at: exportResult.expiresAt,
      metadata: {
        template_name: template.template_name,
        category: template.category,
        sections_count: template.sections.length,
        export_time: new Date().toISOString()
      }
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

    logger.error('Export template failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '範本匯出失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/exports/batch - 批次匯出標書
router.post('/batch', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = batchExportSchema.parse(req.body);

    // 檢查所有標書是否存在且屬於當前公司
    const proposals = await prisma.proposal.findMany({
      where: {
        id: { in: validatedData.proposal_ids },
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

    if (proposals.length !== validatedData.proposal_ids.length) {
      return res.status(404).json({
        error: 'Not Found',
        message: '部分標書不存在或無權限存取',
        statusCode: 404
      });
    }

    // 檢查標書是否有內容
    const proposalsWithContent = proposals.filter((proposal: any) => {
      const content = proposal.content as Record<string, any> || {};
      return Object.keys(content).length > 0;
    });

    if (proposalsWithContent.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '所選標書均無內容，無法匯出',
        statusCode: 400
      });
    }

    // 生成批次匯出
    const exportResult = await generateBatchExportFiles({
      proposals: proposalsWithContent,
      format: validatedData.format,
      mergeIntoSingle: validatedData.merge_into_single
    });

    logger.info('Batch export completed', { 
      proposalCount: proposalsWithContent.length,
      format: validatedData.format,
      mergeIntoSingle: validatedData.merge_into_single,
      userId: req.userId
    });

    return res.json({
      download_urls: exportResult.downloadUrls,
      filenames: exportResult.filenames,
      format: validatedData.format,
      total_files: exportResult.totalFiles,
      total_size: exportResult.totalSize,
      expires_at: exportResult.expiresAt,
      metadata: {
        proposals_exported: proposalsWithContent.length,
        merged_into_single: validatedData.merge_into_single,
        export_time: new Date().toISOString()
      }
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

    logger.error('Batch export failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '批次匯出失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/exports/history - 獲取匯出歷史
router.get('/history', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // 實際應從匯出記錄表獲取資料
    const mockHistory = Array.from({ length: limitNum }, (_, i) => ({
      id: `export_${Date.now()}_${i}`,
      type: ['proposal', 'template', 'batch'][i % 3],
      format: ['pdf', 'docx', 'odt'][i % 3],
      filename: `document_${i + 1}.pdf`,
      file_size: Math.floor(Math.random() * 5000000) + 100000,
      status: ['completed', 'processing', 'failed'][i % 3 === 2 ? 2 : 0],
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString()
    }));

    return res.json({
      exports: mockHistory,
      pagination: {
        current_page: pageNum,
        total_pages: Math.ceil(50 / limitNum),
        total_items: 50,
        items_per_page: limitNum
      }
    });

  } catch (error) {
    logger.error('Get export history failed', { error, userId: req.userId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取匯出歷史失敗',
      statusCode: 500
    });
  }
});

// DELETE /api/v1/exports/:exportId - 刪除匯出檔案
router.delete('/:exportId', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const exportId = req.params.exportId;

    // 實際應檢查匯出記錄並刪除檔案
    logger.info('Export file deleted', { 
      exportId,
      userId: req.userId 
    });

    return res.status(204).send();

  } catch (error) {
    logger.error('Delete export failed', { error, userId: req.userId, exportId: req.params.exportId });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '刪除匯出檔案失敗',
      statusCode: 500
    });
  }
});

// 輔助函數：生成標書匯出檔案
async function generateExportFile(params: {
  proposal: any;
  format: string;
  options: Record<string, any>;
}): Promise<{
  downloadUrl: string;
  filename: string;
  fileSize: number;
  pageCount: number;
  expiresAt: string;
}> {
  // 模擬檔案生成
  await new Promise(resolve => setTimeout(resolve, 2000));

  const fileExtensions = { pdf: 'pdf', docx: 'docx', odt: 'odt' };
  const filename = `${params.proposal.proposal_title.replace(/[^\w\s-]/g, '')}.${fileExtensions[params.format as keyof typeof fileExtensions]}`;
  
  return {
    downloadUrl: `/api/v1/exports/download/${Date.now()}_${filename}`,
    filename,
    fileSize: Math.floor(Math.random() * 2000000) + 500000,
    pageCount: Math.floor(Math.random() * 50) + 10,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
}

// 輔助函數：生成範本匯出檔案
async function generateTemplateExportFile(params: {
  template: any;
  format: string;
  includeSampleContent: boolean;
}): Promise<{
  downloadUrl: string;
  filename: string;
  fileSize: number;
  expiresAt: string;
}> {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const fileExtensions = { pdf: 'pdf', docx: 'docx', odt: 'odt' };
  const filename = `範本_${params.template.template_name}.${fileExtensions[params.format as keyof typeof fileExtensions]}`;
  
  return {
    downloadUrl: `/api/v1/exports/download/${Date.now()}_${filename}`,
    filename,
    fileSize: Math.floor(Math.random() * 1000000) + 200000,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
}

// 輔助函數：生成批次匯出檔案
async function generateBatchExportFiles(params: {
  proposals: any[];
  format: string;
  mergeIntoSingle: boolean;
}): Promise<{
  downloadUrls: string[];
  filenames: string[];
  totalFiles: number;
  totalSize: number;
  expiresAt: string;
}> {
  await new Promise(resolve => setTimeout(resolve, 3000));

  const fileExtensions = { pdf: 'pdf', docx: 'docx', odt: 'odt' };

  if (params.mergeIntoSingle) {
    const filename = `批次匯出_${new Date().toISOString().split('T')[0]}.${fileExtensions[params.format as keyof typeof fileExtensions]}`;
    return {
      downloadUrls: [`/api/v1/exports/download/${Date.now()}_${filename}`],
      filenames: [filename],
      totalFiles: 1,
      totalSize: Math.floor(Math.random() * 10000000) + 2000000,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  } else {
    const downloadUrls: string[] = [];
    const filenames: string[] = [];
    let totalSize = 0;

    for (const proposal of params.proposals) {
      const filename = `${proposal.proposal_title}.${fileExtensions[params.format as keyof typeof fileExtensions]}`;
      const fileSize = Math.floor(Math.random() * 2000000) + 500000;
      
      downloadUrls.push(`/api/v1/exports/download/${Date.now()}_${filename}`);
      filenames.push(filename);
      totalSize += fileSize;
    }

    return {
      downloadUrls,
      filenames,
      totalFiles: params.proposals.length,
      totalSize,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
}

export default router;