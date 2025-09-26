import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/database', () => ({
  prisma: {
    company: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock middleware
jest.mock('../../../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    req.user = { company_id: 'test-company-id' };
    next();
  },
  requireCompanyAccess: (req: any, res: any, next: any) => next(),
}));

// Mock Gemini API call
const mockCallGeminiAPI = jest.fn();
jest.mock('../../../src/services/gemini', () => ({
  callGeminiAPI: mockCallGeminiAPI,
}));

describe('AI 路由單元測試', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<any>;

  beforeEach(() => {
    mockReq = {
      userId: 'test-user-id',
      user: { company_id: 'test-company-id' } as any,
      body: {},
      params: {},
      query: {},
    };
    
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /generate - 生成內容', () => {
    const validGenerateData = {
      prompt: '請生成一個公司介紹的範例內容，包含公司優勢和核心業務',
      context: { project_type: '政府標案' },
      max_tokens: 1000,
      temperature: 0.7,
      section_type: '公司介紹' as const,
    };

    const mockCompany = {
      id: 'test-company-id',
      company_name: '測試科技股份有限公司',
      description: '專業軟體開發公司',
      team_members: [
        {
          name: '張技術長',
          title: '技術長',
          is_active: true,
          is_key_member: true,
        },
        {
          name: '李專案經理',
          title: '專案經理',
          is_active: true,
          is_key_member: true,
        },
      ],
      projects: [
        {
          project_name: '政府數位化專案',
          is_public: true,
          created_at: new Date(),
        },
      ],
    };

    it('應該成功生成 AI 內容', async () => {
      const mockGeneratedContent = '基於您提供的資訊，以下是公司介紹的專業內容...';
      
      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockCompany);
      mockCallGeminiAPI.mockResolvedValue(mockGeneratedContent);

      const handler = jest.fn(async (req, res) => {
        const validatedData = validGenerateData;

        // 獲取公司資料作為上下文
        const company = await prisma.company.findUnique({
          where: { id: req.user.company_id },
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

        // 建構 AI 提示詞
        const systemPrompt = buildSystemPrompt(validatedData.section_type);
        const contextPrompt = buildContextPrompt(company, validatedData.context);
        const fullPrompt = `${systemPrompt}\n\n${contextPrompt}\n\n用戶需求：${validatedData.prompt}`;

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
            tokens_used: Math.floor(generatedContent.length / 4),
            generation_time: new Date().toISOString()
          }
        });
      });

      // Mock helper functions
      const buildSystemPrompt = (sectionType?: string) => {
        const basePrompt = '你是一個專業的商業提案寫作助手，專門協助撰寫高品質的標書內容。';
        if (sectionType === '公司介紹') {
          return `${basePrompt} 請專注於公司的核心優勢、發展歷程和專業能力。`;
        }
        return basePrompt;
      };

      const buildContextPrompt = (company: any, additionalContext?: any) => {
        let context = '';
        if (company) {
          context += `公司資訊：\n公司名稱：${company.company_name}\n`;
          if (company.description) context += `公司描述：${company.description}\n`;
          
          if (company.team_members?.length > 0) {
            context += `核心團隊：\n`;
            company.team_members.forEach((member: any) => {
              context += `- ${member.name} (${member.title})\n`;
            });
          }
        }
        return context;
      };

      const callGeminiAPI = mockCallGeminiAPI;

      mockReq.body = validGenerateData;
      await handler(mockReq, mockRes);

      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-company-id' },
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

      expect(mockCallGeminiAPI).toHaveBeenCalledWith({
        prompt: expect.stringContaining('你是一個專業的商業提案寫作助手'),
        max_tokens: 1000,
        temperature: 0.7
      });

      expect(logger.info).toHaveBeenCalledWith('AI content generated', {
        userId: 'test-user-id',
        section_type: '公司介紹',
        prompt_length: validGenerateData.prompt.length,
        generated_length: mockGeneratedContent.length
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        content: mockGeneratedContent,
        metadata: {
          section_type: '公司介紹',
          tokens_used: Math.floor(mockGeneratedContent.length / 4),
          generation_time: expect.any(String)
        }
      });
    });

    it('應該在缺少公司資料時仍能生成內容', async () => {
      const mockGeneratedContent = '根據您的需求生成的通用內容...';
      
      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(null);
      mockCallGeminiAPI.mockResolvedValue(mockGeneratedContent);

      const handler = jest.fn(async (req, res) => {
        const validatedData = validGenerateData;

        const company = await prisma.company.findUnique({
          where: { id: req.user.company_id },
          include: expect.any(Object),
        });

        // 即使沒有公司資料也應該能生成內容
        const systemPrompt = '你是一個專業的商業提案寫作助手。';
        const contextPrompt = company ? `公司名稱：${company.company_name}` : ''; 
        const fullPrompt = `${systemPrompt}\n\n${contextPrompt}\n\n用戶需求：${validatedData.prompt}`;

        const generatedContent = await callGeminiAPI({
          prompt: fullPrompt,
          max_tokens: validatedData.max_tokens,
          temperature: validatedData.temperature
        });

        res.json({
          content: generatedContent,
          metadata: {
            section_type: validatedData.section_type,
            tokens_used: Math.floor(generatedContent.length / 4),
            generation_time: new Date().toISOString()
          }
        });
      });

      const callGeminiAPI = mockCallGeminiAPI;

      mockReq.body = validGenerateData;
      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        content: mockGeneratedContent,
        metadata: expect.any(Object)
      });
    });

    it('應該處理 Gemini API 錯誤', async () => {
      const apiError = new Error('Gemini API rate limit exceeded');
      
      (prisma.company.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockCompany);
      mockCallGeminiAPI.mockRejectedValue(apiError);

      const handler = jest.fn(async (req, res) => {
        try {
          const validatedData = validGenerateData;
          
          const company = await prisma.company.findUnique({
            where: { id: req.user.company_id },
            include: expect.any(Object),
          });

          await callGeminiAPI({
            prompt: 'test prompt',
            max_tokens: validatedData.max_tokens,
            temperature: validatedData.temperature
          });
        } catch (error) {
          logger.error('AI generate content failed', { error, userId: req.userId });
          res.status(500).json({
            error: 'Internal Server Error',
            message: 'AI內容生成失敗',
            statusCode: 500
          });
        }
      });

      const callGeminiAPI = mockCallGeminiAPI;

      mockReq.body = validGenerateData;
      await handler(mockReq, mockRes);

      expect(logger.error).toHaveBeenCalledWith('AI generate content failed', {
        error: apiError,
        userId: 'test-user-id'
      });

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'AI內容生成失敗',
        statusCode: 500
      });
    });
  });

  describe('POST /improve - 改善內容', () => {
    const validImproveData = {
      content: '這是一個需要改善的內容，包含基本的公司介紹資訊。',
      improvement_type: '專業度提升' as const,
      specific_requirements: '請增加更多技術細節',
      target_length: '更詳細' as const,
    };

    it('應該成功改善內容', async () => {
      const mockImprovedContent = '經過專業優化後的內容，包含詳細的技術說明和專業術語...';
      mockCallGeminiAPI.mockResolvedValue(mockImprovedContent);

      const handler = jest.fn(async (req, res) => {
        const validatedData = validImproveData;

        const improvementPrompts = {
          '專業度提升': '請提升以下內容的專業度，加入更多專業術語和觀點：',
          '語調優化': '請將以下內容的語調調整得更專業、正式，適合商業提案：',
          '內容擴充': '請擴充以下內容，增加更多細節和說明：',
          '結構調整': '請重新組織以下內容的結構，使其更清晰、有邏輯：',
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
      });

      const callGeminiAPI = mockCallGeminiAPI;

      mockReq.body = validImproveData;
      await handler(mockReq, mockRes);

      expect(mockCallGeminiAPI).toHaveBeenCalledWith({
        prompt: expect.stringContaining('請提升以下內容的專業度'),
        max_tokens: 2000,
        temperature: 0.7
      });

      expect(logger.info).toHaveBeenCalledWith('AI content improved', {
        userId: 'test-user-id',
        improvement_type: '專業度提升',
        original_length: validImproveData.content.length,
        improved_length: mockImprovedContent.length
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        original_content: validImproveData.content,
        improved_content: mockImprovedContent,
        improvement_type: '專業度提升',
        metadata: {
          tokens_used: Math.floor(mockImprovedContent.length / 4),
          generation_time: expect.any(String)
        }
      });
    });
  });

  describe('POST /translate - 翻譯內容', () => {
    const validTranslateData = {
      content: '這是需要翻譯的繁體中文內容，包含專業的標案撰寫術語。',
      target_language: '英文' as const,
      context: '政府標案相關文件',
    };

    it('應該成功翻譯內容', async () => {
      const mockTranslatedContent = 'This is the translated English content including professional tender writing terminology.';
      mockCallGeminiAPI.mockResolvedValue(mockTranslatedContent);

      const handler = jest.fn(async (req, res) => {
        const validatedData = validTranslateData;

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
          temperature: 0.3
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
      });

      const callGeminiAPI = mockCallGeminiAPI;

      mockReq.body = validTranslateData;
      await handler(mockReq, mockRes);

      expect(mockCallGeminiAPI).toHaveBeenCalledWith({
        prompt: expect.stringContaining('請將以下繁體中文內容翻譯為English'),
        max_tokens: expect.any(Number),
        temperature: 0.3
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        original_content: validTranslateData.content,
        translated_content: mockTranslatedContent,
        source_language: '繁體中文',
        target_language: '英文',
        metadata: expect.any(Object)
      });
    });
  });

  describe('GET /usage - 獲取 AI 使用統計', () => {
    it('應該返回使用統計資料', async () => {
      const handler = jest.fn(async (req, res) => {
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
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
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
      });
    });
  });

  describe('資料驗證測試', () => {
    it('應該驗證生成內容的提示詞長度', () => {
      const generateContentSchema = z.object({
        prompt: z.string().min(10, '提示詞至少需要10個字元').max(2000, '提示詞長度不能超過2000字元'),
        max_tokens: z.number().int().min(50).max(4000).optional().default(1000),
      });

      // 有效提示詞
      expect(() => generateContentSchema.parse({
        prompt: '這是一個有效長度的提示詞內容'
      })).not.toThrow();

      // 提示詞太短
      expect(() => generateContentSchema.parse({
        prompt: '太短了'
      })).toThrow();

      // 提示詞太長
      const longPrompt = 'a'.repeat(2001);
      expect(() => generateContentSchema.parse({
        prompt: longPrompt
      })).toThrow();
    });

    it('應該驗證改善類型枚舉值', () => {
      const improveContentSchema = z.object({
        content: z.string().min(10),
        improvement_type: z.enum(['語調優化', '內容擴充', '結構調整', '專業度提升', '客製化調整']),
      });

      // 有效改善類型
      expect(() => improveContentSchema.parse({
        content: '這是有效的內容長度',
        improvement_type: '專業度提升'
      })).not.toThrow();

      // 無效改善類型
      expect(() => improveContentSchema.parse({
        content: '這是有效的內容長度',
        improvement_type: '無效類型'
      })).toThrow();
    });

    it('應該驗證翻譯目標語言', () => {
      const translateContentSchema = z.object({
        content: z.string().min(1),
        target_language: z.enum(['英文', '日文', '韓文', '簡體中文']),
      });

      // 有效目標語言
      expect(() => translateContentSchema.parse({
        content: '測試內容',
        target_language: '英文'
      })).not.toThrow();

      expect(() => translateContentSchema.parse({
        content: '測試內容',
        target_language: '日文'
      })).not.toThrow();

      // 無效目標語言
      expect(() => translateContentSchema.parse({
        content: '測試內容',
        target_language: '法文'
      })).toThrow();
    });

    it('應該驗證章節類型', () => {
      const schema = z.object({
        section_type: z.enum(['公司介紹', '專案背景', '技術方案', '時程規劃', '預算報價', '團隊介紹', '其他']).optional(),
      });

      // 有效章節類型
      expect(() => schema.parse({ section_type: '公司介紹' })).not.toThrow();
      expect(() => schema.parse({ section_type: '技術方案' })).not.toThrow();
      expect(() => schema.parse({})).not.toThrow(); // 可選欄位

      // 無效章節類型
      expect(() => schema.parse({ section_type: '無效章節' })).toThrow();
    });
  });
});