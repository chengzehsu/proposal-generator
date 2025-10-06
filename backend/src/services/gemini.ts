import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { logger } from '../utils/logger';

// 環境變數檢查
const API_KEY = process.env.GOOGLE_AI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

if (!API_KEY) {
  logger.error('GOOGLE_AI_API_KEY environment variable is not set');
}

// 初始化 Gemini AI
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// 安全設定
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// 預設生成配置
const generationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 4000,
};

export interface GeminiAPIParams {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  systemInstruction?: string;
}

export interface GeminiResponse {
  content: string;
  tokensUsed: {
    promptTokens: number;
    candidateTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  safetyRatings?: any[];
}

/**
 * 呼叫 Gemini API 生成內容
 */
export async function callGeminiAPI(params: GeminiAPIParams): Promise<string> {
  if (!genAI) {
    // 開發模式下的模擬實現
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Using mock Gemini API - GOOGLE_AI_API_KEY not configured');
      return await mockGeminiResponse(params);
    }
    throw new Error('Gemini API not configured - missing GOOGLE_AI_API_KEY');
  }

  try {
    const startTime = Date.now();
    
    // 建立模型實例
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings,
      generationConfig: {
        ...generationConfig,
        temperature: params.temperature ?? generationConfig.temperature,
        maxOutputTokens: params.max_tokens ?? generationConfig.maxOutputTokens,
        topK: params.topK ?? generationConfig.topK,
        topP: params.topP ?? generationConfig.topP,
      },
      systemInstruction: params.systemInstruction,
    });

    // 生成內容
    const result = await model.generateContent(params.prompt);
    const response = await result.response;
    
    const duration = Date.now() - startTime;
    
    // 檢查回應
    if (!response) {
      throw new Error('Empty response from Gemini API');
    }

    const text = response.text();
    if (!text) {
      throw new Error('No text content in Gemini response');
    }

    // 記錄成功的API呼叫
    logger.info('Gemini API call successful', {
      model: MODEL_NAME,
      promptLength: params.prompt.length,
      responseLength: text.length,
      duration,
      tokensUsed: response.usageMetadata || null,
      finishReason: response.candidates?.[0]?.finishReason || 'unknown'
    });

    return text;

  } catch (error: any) {
    const duration = Date.now() - Date.now();
    
    // 詳細錯誤記錄
    logger.error('Gemini API call failed', {
      error: error.message,
      stack: error.stack,
      model: MODEL_NAME,
      promptLength: params.prompt.length,
      duration,
      apiKey: API_KEY ? 'configured' : 'missing'
    });

    // 重新拋出錯誤以便上層處理
    if (error.message?.includes('API_KEY')) {
      throw new Error('AI服務配置錯誤');
    } else if (error.message?.includes('quota')) {
      throw new Error('AI服務使用量已達上限');
    } else if (error.message?.includes('safety')) {
      throw new Error('內容不符合AI安全政策');
    } else {
      throw new Error('AI服務暫時無法使用，請稍後再試');
    }
  }
}

/**
 * 呼叫 Gemini API 並返回詳細回應資訊
 */
export async function callGeminiAPIWithDetails(params: GeminiAPIParams): Promise<GeminiResponse> {
  if (!genAI) {
    if (process.env.NODE_ENV === 'development') {
      const mockContent = await mockGeminiResponse(params);
      return {
        content: mockContent,
        tokensUsed: {
          promptTokens: Math.floor(params.prompt.length / 4),
          candidateTokens: Math.floor(mockContent.length / 4),
          totalTokens: Math.floor((params.prompt.length + mockContent.length) / 4)
        },
        finishReason: 'STOP'
      };
    }
    throw new Error('Gemini API not configured');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings,
      generationConfig: {
        ...generationConfig,
        temperature: params.temperature ?? generationConfig.temperature,
        maxOutputTokens: params.max_tokens ?? generationConfig.maxOutputTokens,
      },
      systemInstruction: params.systemInstruction,
    });

    const result = await model.generateContent(params.prompt);
    const response = await result.response;
    
    const text = response.text();
    const usage = response.usageMetadata;
    const candidate = response.candidates?.[0];

    return {
      content: text,
      tokensUsed: {
        promptTokens: usage?.promptTokenCount || 0,
        candidateTokens: usage?.candidatesTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0
      },
      finishReason: candidate?.finishReason || 'UNKNOWN',
      safetyRatings: candidate?.safetyRatings
    };

  } catch (error: any) {
    logger.error('Gemini API detailed call failed', { error: error.message });
    throw error;
  }
}

/**
 * 模擬回應 (開發模式使用)
 */
async function mockGeminiResponse(params: GeminiAPIParams): Promise<string> {
  // 模擬API延遲
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  const responses = [
    '根據您提供的需求，我建議採用以下專業方案來滿足您的業務目標...',
    '基於深入分析您的條件和背景資訊，我們可以從以下幾個關鍵面向來制定策略...',
    '為了達成您所描述的目標，建議考慮以下核心要素和實施步驟...',
    '綜合評估相關技術條件和市場環境，提出以下具體建議和解決方案...',
    '針對您的具體需求，我們提出以下創新且實用的專業建議...'
  ];
  
  const baseResponse = responses[Math.floor(Math.random() * responses.length)];
  const mockContent = `${baseResponse}\n\n[開發模式 - 模擬AI回應]\n\n生成參數：\n- Max Tokens: ${params.max_tokens || 1000}\n- Temperature: ${params.temperature || 0.7}\n- 模型: ${MODEL_NAME}\n- 生成時間: ${new Date().toISOString()}\n\n這是一個模擬的AI生成內容。在生產環境中，請確保正確配置 GOOGLE_AI_API_KEY 環境變數以使用真實的 Gemini API。`;
  
  return mockContent;
}

/**
 * 測試 API 連線
 */
export async function testGeminiConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  if (!genAI) {
    return {
      success: false,
      message: 'API金鑰未配置 - 請設定 GOOGLE_AI_API_KEY 環境變數'
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent('測試連線：請回覆"連線成功"');
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      message: 'Gemini API連線成功',
      details: {
        model: MODEL_NAME,
        response: text,
        usage: response.usageMetadata
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `API連線失敗: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * 獲取API使用統計
 */
export function getGeminiModelInfo() {
  return {
    model: MODEL_NAME,
    apiConfigured: !!API_KEY,
    safetySettings: safetySettings.length,
    defaultConfig: generationConfig
  };
}