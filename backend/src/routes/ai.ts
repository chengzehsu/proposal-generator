import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { authenticateToken, requireCompanyAccess } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const generateContentSchema = z.object({
  prompt: z.string().min(10, '提示詞至少需要10個字元').max(2000, '提示詞長度不能超過2000字元'),
  context: z.record(z.string(), z.any()).optional(),
  max_tokens: z.number().int().min(50).max(4000).optional().default(1000),
  temperature: z.number().min(0).max(1).optional().default(0.7),
  section_type: z.enum(['公司介紹', '專案背景', '技術方案', '時程規劃', '預算報價', '團隊介紹', '其他']).optional()
});

const improveContentSchema = z.object({
  content: z.string().min(10, '原始內容至少需要10個字元'),
  improvement_type: z.enum(['語調優化', '內容擴充', '結構調整', '專業度提升', '客製化調整'], {
    errorMap: () => ({ message: '請選擇正確的改善類型' })
  }),
  specific_requirements: z.string().optional(),
  target_length: z.enum(['更簡潔', '保持原樣', '更詳細']).optional().default('保持原樣')
});

const translateContentSchema = z.object({
  content: z.string().min(1, '請輸入要翻譯的內容'),
  target_language: z.enum(['英文', '日文', '韓文', '簡體中文'], {
    errorMap: () => ({ message: '請選擇支援的目標語言' })
  }),
  context: z.string().optional()
});

const extractRequirementsSchema = z.object({
  rfp_content: z.string().min(50, 'RFP內容至少需要50個字元'),
  extract_sections: z.array(z.enum(['基本需求', '技術規格', '時程要求', '預算限制', '評選標準', '其他條件'])).min(1, '至少選擇一個提取區段')
});

// POST /api/v1/ai/generate - 生成內容
router.post('/generate', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = generateContentSchema.parse(req.body);

    // 獲取公司資料作為上下文
    const company = await prisma.company.findUnique({
      where: { id: req.user!.company_id },
      include: {
        team_members: {
          where: { is_active: true, is_key_member: true },
          take: 5
        },
        projects: {
          where: { is_public: true },
          orderBy: { created_at: 'desc' },
          take: 3
        }
      }
    });

    // 建構AI提示詞
    const systemPrompt = buildSystemPrompt(validatedData.section_type);
    const contextPrompt = buildContextPrompt(company, validatedData.context);
    const fullPrompt = `${systemPrompt}\n\n${contextPrompt}\n\n用戶需求：${validatedData.prompt}`;

    // 模擬AI生成（實際應呼叫Gemini API）
    const generatedContent = await callGeminiAPI({
      prompt: fullPrompt,
      max_tokens: validatedData.max_tokens,
      temperature: validatedData.temperature
    });

    logger.info('AI content generated', { 
      userId: req.userId,
      section_type: validatedData.section_type,
      prompt_length: validatedData.prompt.length,
      generated_length: generatedContent.length
    });

    res.json({
      content: generatedContent,
      metadata: {
        section_type: validatedData.section_type,
        tokens_used: Math.floor(generatedContent.length / 4), // 粗略估算
        generation_time: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('AI generate content failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'AI內容生成失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/ai/improve - 改善內容
router.post('/improve', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = improveContentSchema.parse(req.body);

    const improvementPrompts = {
      '語調優化': '請將以下內容的語調調整得更專業、正式，適合商業提案：',
      '內容擴充': '請擴充以下內容，增加更多細節和說明：',
      '結構調整': '請重新組織以下內容的結構，使其更清晰、有邏輯：',
      '專業度提升': '請提升以下內容的專業度，加入更多專業術語和觀點：',
      '客製化調整': '請根據特定需求調整以下內容：'
    };

    const basePrompt = improvementPrompts[validatedData.improvement_type];
    const specificReq = validatedData.specific_requirements ? `\n特殊要求：${validatedData.specific_requirements}` : '';
    const lengthReq = validatedData.target_length !== '保持原樣' ? `\n長度要求：${validatedData.target_length}` : '';
    
    const fullPrompt = `${basePrompt}${specificReq}${lengthReq}\n\n原始內容：\n${validatedData.content}`;

    const improvedContent = await callGeminiAPI({
      prompt: fullPrompt,
      max_tokens: 2000,
      temperature: 0.7
    });

    logger.info('AI content improved', { 
      userId: req.userId,
      improvement_type: validatedData.improvement_type,
      original_length: validatedData.content.length,
      improved_length: improvedContent.length
    });

    res.json({
      original_content: validatedData.content,
      improved_content: improvedContent,
      improvement_type: validatedData.improvement_type,
      metadata: {
        tokens_used: Math.floor(improvedContent.length / 4),
        generation_time: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('AI improve content failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'AI內容改善失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/ai/translate - 翻譯內容
router.post('/translate', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = translateContentSchema.parse(req.body);

    const languageCodes = {
      '英文': 'English',
      '日文': 'Japanese',
      '韓文': 'Korean',
      '簡體中文': 'Simplified Chinese'
    };

    const contextInfo = validatedData.context ? `\n背景資訊：${validatedData.context}` : '';
    const prompt = `請將以下繁體中文內容翻譯為${languageCodes[validatedData.target_language]}，保持專業性和準確性：${contextInfo}\n\n原文：\n${validatedData.content}`;

    const translatedContent = await callGeminiAPI({
      prompt,
      max_tokens: Math.min(validatedData.content.length * 2, 4000),
      temperature: 0.3 // 翻譯使用較低溫度
    });

    logger.info('AI content translated', { 
      userId: req.userId,
      target_language: validatedData.target_language,
      original_length: validatedData.content.length,
      translated_length: translatedContent.length
    });

    res.json({
      original_content: validatedData.content,
      translated_content: translatedContent,
      source_language: '繁體中文',
      target_language: validatedData.target_language,
      metadata: {
        tokens_used: Math.floor(translatedContent.length / 4),
        generation_time: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('AI translate content failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'AI翻譯失敗',
      statusCode: 500
    });
  }
});

// POST /api/v1/ai/extract-requirements - 從RFP提取需求
router.post('/extract-requirements', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const validatedData = extractRequirementsSchema.parse(req.body);

    const sectionPrompts = validatedData.extract_sections.map(section => {
      const prompts = {
        '基本需求': '提取基本功能和服務需求',
        '技術規格': '提取技術規格和標準要求',
        '時程要求': '提取專案時程和里程碑要求',
        '預算限制': '提取預算範圍和成本限制',
        '評選標準': '提取評選條件和加分項目',
        '其他條件': '提取其他特殊條件和限制'
      };
      return `${section}：${prompts[section]}`;
    }).join('\n');

    const prompt = `請從以下RFP（需求徵詢書）中提取並整理以下資訊：\n${sectionPrompts}\n\n請以結構化的方式整理，每個項目都要清楚標示。\n\nRFP內容：\n${validatedData.rfp_content}`;

    const extractedRequirements = await callGeminiAPI({
      prompt,
      max_tokens: 2000,
      temperature: 0.5
    });

    logger.info('AI requirements extracted', { 
      userId: req.userId,
      sections: validatedData.extract_sections,
      rfp_length: validatedData.rfp_content.length
    });

    res.json({
      extracted_requirements: extractedRequirements,
      sections_extracted: validatedData.extract_sections,
      metadata: {
        tokens_used: Math.floor(extractedRequirements.length / 4),
        generation_time: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '輸入資料格式錯誤',
        details: error.errors,
        statusCode: 400
      });
    }

    logger.error('AI extract requirements failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'AI需求提取失敗',
      statusCode: 500
    });
  }
});

// GET /api/v1/ai/usage - 獲取AI使用統計
router.get('/usage', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    // 實際應用中應從使用記錄表獲取統計資料
    const mockUsageStats = {
      current_month: {
        total_requests: 45,
        total_tokens: 125000,
        breakdown: {
          generate: 20,
          improve: 15,
          translate: 8,
          extract: 2
        }
      },
      limits: {
        monthly_requests: 1000,
        monthly_tokens: 1000000
      },
      remaining: {
        requests: 955,
        tokens: 875000
      }
    };

    res.json(mockUsageStats);

  } catch (error: unknown) {
    logger.error('Get AI usage failed', { error, userId: req.userId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取AI使用統計失敗',
      statusCode: 500
    });
  }
});

// 輔助函數
function buildSystemPrompt(sectionType?: string): string {
  const basePrompt = '你是一個專業的商業提案寫作助手，專門協助撰寫高品質的標書內容。';
  
  if (!sectionType) return basePrompt;

  const sectionPrompts = {
    '公司介紹': '請專注於公司的核心優勢、發展歷程和專業能力。',
    '專案背景': '請清楚描述專案的背景、目標和重要性。',
    '技術方案': '請提供詳細的技術解決方案和實施方法。',
    '時程規劃': '請制定合理的專案時程和里程碑規劃。',
    '預算報價': '請提供詳細的成本分析和報價說明。',
    '團隊介紹': '請突出團隊成員的專業能力和相關經驗。',
    '其他': '請根據具體需求提供專業的內容建議。'
  };

  return `${basePrompt} ${sectionPrompts[sectionType]}`;
}

function buildContextPrompt(company: any, additionalContext?: any): string {
  let context = '';
  
  if (company) {
    context += `公司資訊：\n`;
    context += `公司名稱：${company.company_name}\n`;
    if (company.description) context += `公司描述：${company.description}\n`;
    
    if (company.team_members?.length > 0) {
      context += `核心團隊：\n`;
      company.team_members.forEach((member: any) => {
        context += `- ${member.name} (${member.title})\n`;
      });
    }
    
    if (company.projects?.length > 0) {
      context += `近期專案：\n`;
      company.projects.forEach((project: any) => {
        context += `- ${project.project_name}\n`;
      });
    }
  }
  
  if (additionalContext) {
    context += `\n額外資訊：${JSON.stringify(additionalContext, null, 2)}\n`;
  }
  
  return context;
}

// 模擬Gemini API呼叫（實際應整合真實API）
async function callGeminiAPI(params: { prompt: string; max_tokens: number; temperature: number }): Promise<string> {
  // 模擬API延遲
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // 模擬生成回應
  const responses = [
    '根據您的需求，我建議採用以下方案...',
    '基於提供的資訊，我們可以從以下幾個面向來規劃...',
    '為了達成您的目標，建議考慮以下要素...',
    '綜合分析相關條件，提出以下建議...'
  ];
  
  const baseResponse = responses[Math.floor(Math.random() * responses.length)];
  const mockContent = `${baseResponse}\n\n[這是模擬的AI生成內容，實際應用中會呼叫Gemini API生成真實內容]\n\n生成參數：\n- Max Tokens: ${params.max_tokens}\n- Temperature: ${params.temperature}\n- 生成時間: ${new Date().toISOString()}`;
  
  return mockContent;
}

export default router;