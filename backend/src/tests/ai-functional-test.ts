/**
 * AI功能綜合測試工具
 * 用於深度測試AI功能的品質、性能和一致性
 */

import { callGeminiAPI, getGeminiModelInfo, testGeminiConnection } from '../services/gemini';
import { _buildContextPrompt, buildImprovementPrompt, buildSystemPrompt, evaluatePromptQuality } from '../services/prompts';
import { logger } from '../utils/logger';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  result?: any;
  error?: string;
  metrics?: {
    promptLength: number;
    responseLength: number;
    tokensEstimated: number;
    qualityScore: number;
  };
}

interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorCount: number;
  totalTests: number;
  tokenUsage: number;
}

/**
 * AI功能深度測試套件
 */
export class AIFunctionalTester {
  private testResults: TestResult[] = [];
  private performanceMetrics: PerformanceMetrics = {
    averageResponseTime: 0,
    successRate: 0,
    errorCount: 0,
    totalTests: 0,
    tokenUsage: 0
  };

  /**
   * 執行完整的AI功能測試
   */
  async runComprehensiveTest(): Promise<{
    summary: PerformanceMetrics;
    results: TestResult[];
    recommendations: string[];
  }> {
    console.log('🤖 開始執行AI功能深度測試...\n');

    // 1. 連線測試
    await this.testConnection();

    // 2. 基本功能測試
    await this.testBasicGeneration();
    await this.testContentImprovement();
    await this.testTranslation();
    await this.testRequirementExtraction();

    // 3. 提示工程測試
    await this.testPromptEngineering();

    // 4. 性能測試
    await this.testPerformance();

    // 5. 一致性測試
    await this.testConsistency();

    // 6. 錯誤處理測試
    await this.testErrorHandling();

    // 計算最終指標
    this.calculateMetrics();

    // 生成建議
    const recommendations = this.generateRecommendations();

    return {
      summary: this.performanceMetrics,
      results: this.testResults,
      recommendations
    };
  }

  /**
   * 測試API連線
   */
  private async testConnection(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const connectionResult = await testGeminiConnection();
      const modelInfo = getGeminiModelInfo();
      
      this.testResults.push({
        testName: 'API連線測試',
        success: connectionResult.success,
        duration: Date.now() - startTime,
        result: { connection: connectionResult, model: modelInfo },
        error: connectionResult.success ? undefined : connectionResult.message
      });

      console.log(`✅ API連線測試: ${connectionResult.success ? '成功' : '失敗'}`);
      if (connectionResult.success) {
        console.log(`   模型: ${modelInfo.model}`);
        console.log(`   API配置: ${modelInfo.apiConfigured ? '已配置' : '未配置'}`);
      }
    } catch (error: any) {
      this.testResults.push({
        testName: 'API連線測試',
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
      console.log(`❌ API連線測試失敗: ${error.message}`);
    }
  }

  /**
   * 測試基本內容生成
   */
  private async testBasicGeneration(): Promise<void> {
    const testCases = [
      {
        name: '公司介紹生成',
        prompt: '請為一家專業的軟體開發公司撰寫公司介紹，強調技術實力和創新能力。',
        sectionType: '公司介紹'
      },
      {
        name: '技術方案生成',
        prompt: '請撰寫一個AI系統開發的技術方案，包含架構設計和實施計劃。',
        sectionType: '技術方案'
      },
      {
        name: '團隊介紹生成',
        prompt: '請介紹一個具有豐富經驗的軟體開發團隊，突出團隊成員的專業能力。',
        sectionType: '團隊介紹'
      }
    ];

    for (const testCase of testCases) {
      await this.runSingleTest(testCase.name, async () => {
        const systemPrompt = buildSystemPrompt({
          sectionType: testCase.sectionType,
          tone: 'professional',
          length: 'medium'
        });

        const fullPrompt = `${systemPrompt}\n\n用戶需求：${testCase.prompt}`;
        
        const response = await callGeminiAPI({
          prompt: fullPrompt,
          max_tokens: 1000,
          temperature: 0.7
        });

        return {
          prompt: fullPrompt,
          response,
          promptLength: fullPrompt.length,
          responseLength: response.length
        };
      });
    }
  }

  /**
   * 測試內容改善功能
   */
  private async testContentImprovement(): Promise<void> {
    const originalContent = '我們公司很厲害，做了很多專案，客戶都很滿意。';
    
    const improvementTypes = ['語調優化', '內容擴充', '專業度提升'] as const;

    for (const improvementType of improvementTypes) {
      await this.runSingleTest(`內容改善-${improvementType}`, async () => {
        const prompt = buildImprovementPrompt(
          originalContent,
          improvementType,
          '針對政府標案需求進行調整'
        );

        const response = await callGeminiAPI({
          prompt,
          max_tokens: 1000,
          temperature: 0.7
        });

        return {
          original: originalContent,
          improved: response,
          improvementType,
          improvementRatio: response.length / originalContent.length
        };
      });
    }
  }

  /**
   * 測試翻譯功能
   */
  private async testTranslation(): Promise<void> {
    const testContent = '我們是一家專業的資訊科技公司，致力於提供創新的軟體解決方案。';
    const targetLanguages = ['English', 'Japanese'];

    for (const language of targetLanguages) {
      await this.runSingleTest(`翻譯測試-${language}`, async () => {
        const prompt = `請將以下繁體中文內容翻譯為${language}，保持專業性和準確性：\n\n原文：\n${testContent}`;

        const response = await callGeminiAPI({
          prompt,
          max_tokens: 500,
          temperature: 0.3
        });

        return {
          original: testContent,
          translated: response,
          targetLanguage: language
        };
      });
    }
  }

  /**
   * 測試需求提取功能
   */
  private async testRequirementExtraction(): Promise<void> {
    const mockRFP = `
    標案名稱：政府數位服務平台開發案
    
    一、專案概述
    本專案旨在建立一個整合性的數位服務平台，提供民眾便民服務。
    
    二、技術需求
    - 使用雲端架構
    - 支援行動裝置
    - 資料安全性要求極高
    - 需符合政府資安規範
    
    三、時程要求
    專案期程：12個月
    系統上線：2024年6月30日前
    
    四、預算限制
    總預算：新台幣500萬元整
    `;

    await this.runSingleTest('RFP需求提取', async () => {
      const prompt = `請從以下RFP中提取基本需求、技術規格、時程要求和預算限制：\n\n${mockRFP}`;

      const response = await callGeminiAPI({
        prompt,
        max_tokens: 1000,
        temperature: 0.5
      });

      return {
        rfp: mockRFP,
        extracted: response,
        rfpLength: mockRFP.length
      };
    });
  }

  /**
   * 測試提示工程品質
   */
  private async testPromptEngineering(): Promise<void> {
    const testPrompts = [
      '簡單提示：請寫公司介紹',
      `${buildSystemPrompt({
        sectionType: '公司介紹',
        tone: 'professional',
        length: 'medium'
      })  }\n\n請為一家AI科技公司撰寫專業的公司介紹`
    ];

    for (let i = 0; i < testPrompts.length; i++) {
      const promptName = i === 0 ? '簡單提示' : '工程化提示';
      
      await this.runSingleTest(`提示工程-${promptName}`, async () => {
        const prompt = testPrompts[i]!;
        const quality = evaluatePromptQuality(prompt);

        const response = await callGeminiAPI({
          prompt,
          max_tokens: 800,
          temperature: 0.7
        });

        return {
          prompt,
          response,
          qualityScore: quality.score,
          suggestions: quality.suggestions,
          promptType: promptName
        };
      });
    }
  }

  /**
   * 測試性能表現
   */
  private async testPerformance(): Promise<void> {
    const testCount = 3;
    const responseTimes: number[] = [];

    for (let i = 0; i < testCount; i++) {
      await this.runSingleTest(`性能測試-${i + 1}`, async () => {
        const startTime = Date.now();
        
        const response = await callGeminiAPI({
          prompt: '請簡要介紹人工智慧在企業應用的三個主要領域。',
          max_tokens: 500,
          temperature: 0.7
        });

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        return {
          response,
          responseTime,
          iteration: i + 1
        };
      });
    }

    // 計算平均響應時間
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    console.log(`📊 性能統計: 平均響應時間 ${avgResponseTime.toFixed(0)}ms`);
  }

  /**
   * 測試一致性
   */
  private async testConsistency(): Promise<void> {
    const samePrompt = '請列出軟體開發專案管理的五個關鍵要素。';
    const responses: string[] = [];

    for (let i = 0; i < 3; i++) {
      await this.runSingleTest(`一致性測試-${i + 1}`, async () => {
        const response = await callGeminiAPI({
          prompt: samePrompt,
          max_tokens: 300,
          temperature: 0.7
        });

        responses.push(response);

        return {
          prompt: samePrompt,
          response,
          iteration: i + 1
        };
      });
    }

    // 分析一致性（簡化版）
    const avgLength = responses.reduce((sum, resp) => sum + resp.length, 0) / responses.length;
    const lengthVariance = responses.reduce((sum, resp) => sum + Math.pow(resp.length - avgLength, 2), 0) / responses.length;
    
    console.log(`📊 一致性分析: 平均長度 ${avgLength.toFixed(0)}字，變異數 ${lengthVariance.toFixed(0)}`);
  }

  /**
   * 測試錯誤處理
   */
  private async testErrorHandling(): Promise<void> {
    const errorTestCases = [
      {
        name: '空提示詞',
        prompt: '',
        expectError: true
      },
      {
        name: '超長提示詞',
        prompt: 'A'.repeat(10000),
        expectError: false // 應該被截斷處理
      }
    ];

    for (const testCase of errorTestCases) {
      await this.runSingleTest(`錯誤處理-${testCase.name}`, async () => {
        try {
          const response = await callGeminiAPI({
            prompt: testCase.prompt,
            max_tokens: 100,
            temperature: 0.7
          });

          return {
            prompt: testCase.prompt,
            response,
            expectedError: testCase.expectError,
            actualError: false
          };
        } catch (error: any) {
          if (testCase.expectError) {
            return {
              prompt: testCase.prompt,
              expectedError: testCase.expectError,
              actualError: true,
              errorMessage: error.message
            };
          } else {
            throw error;
          }
        }
      });
    }
  }

  /**
   * 執行單一測試
   */
  private async runSingleTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      const metrics = {
        promptLength: result.prompt?.length || 0,
        responseLength: result.response?.length || 0,
        tokensEstimated: Math.floor((result.prompt?.length || 0 + result.response?.length || 0) / 4),
        qualityScore: result.qualityScore || 0
      };

      this.testResults.push({
        testName,
        success: true,
        duration,
        result,
        metrics
      });

      console.log(`✅ ${testName}: 成功 (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        success: false,
        duration,
        error: error.message
      });

      console.log(`❌ ${testName}: 失敗 - ${error.message}`);
    }
  }

  /**
   * 計算性能指標
   */
  private calculateMetrics(): void {
    const successfulTests = this.testResults.filter(t => t.success);
    
    this.performanceMetrics = {
      totalTests: this.testResults.length,
      successRate: (successfulTests.length / this.testResults.length) * 100,
      errorCount: this.testResults.length - successfulTests.length,
      averageResponseTime: successfulTests.reduce((sum, t) => sum + t.duration, 0) / successfulTests.length || 0,
      tokenUsage: successfulTests.reduce((sum, t) => sum + (t.metrics?.tokensEstimated || 0), 0)
    };
  }

  /**
   * 生成優化建議
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.performanceMetrics.successRate < 90) {
      recommendations.push('⚠️ 成功率低於90%，建議檢查API配置和錯誤處理機制');
    }
    
    if (this.performanceMetrics.averageResponseTime > 5000) {
      recommendations.push('⚠️ 平均響應時間超過5秒，建議優化提示詞長度或考慮快取機制');
    }
    
    const connectionTest = this.testResults.find(t => t.testName === 'API連線測試');
    if (!connectionTest?.success) {
      recommendations.push('🔴 API連線失敗，請檢查GOOGLE_AI_API_KEY環境變數配置');
    }
    
    const promptTests = this.testResults.filter(t => t.testName.includes('提示工程'));
    const avgQualityScore = promptTests.reduce((sum, t) => sum + (t.metrics?.qualityScore || 0), 0) / promptTests.length;
    
    if (avgQualityScore < 80) {
      recommendations.push('📝 提示詞品質可提升，建議增加更多結構化資訊和上下文');
    }
    
    if (this.performanceMetrics.tokenUsage > 50000) {
      recommendations.push('💰 Token使用量較高，建議優化提示詞效率以控制成本');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ 所有測試項目表現良好，AI功能運作正常');
    }
    
    return recommendations;
  }

  /**
   * 生成詳細報告
   */
  generateDetailedReport(): string {
    let report = '\n🤖 AI功能深度測試報告\n';
    report += `${'='.repeat(50)  }\n\n`;
    
    // 總體統計
    report += '📊 總體統計\n';
    report += `${`-`.repeat(20)  }\n`;
    report += `總測試數: ${this.performanceMetrics.totalTests}\n`;
    report += `成功率: ${this.performanceMetrics.successRate.toFixed(1)}%\n`;
    report += `平均響應時間: ${this.performanceMetrics.averageResponseTime.toFixed(0)}ms\n`;
    report += `Token使用量: ${this.performanceMetrics.tokenUsage.toLocaleString()}\n`;
    report += `錯誤數: ${this.performanceMetrics.errorCount}\n\n`;
    
    // 測試結果詳情
    report += '📋 測試結果詳情\n';
    report += `${`-`.repeat(20)  }\n`;
    
    this.testResults.forEach(test => {
      const status = test.success ? '✅' : '❌';
      report += `${status} ${test.testName} (${test.duration}ms)\n`;
      
      if (test.error) {
        report += `   錯誤: ${test.error}\n`;
      }
      
      if (test.metrics) {
        report += `   提示詞長度: ${test.metrics.promptLength}, 回應長度: ${test.metrics.responseLength}\n`;
      }
      
      report += '\n';
    });
    
    return report;
  }
}

// 執行測試的主函數
export async function runAIFunctionalTest(): Promise<void> {
  const tester = new AIFunctionalTester();
  
  try {
    const results = await tester.runComprehensiveTest();
    
    console.log(`\n${  tester.generateDetailedReport()}`);
    
    console.log('🎯 優化建議:');
    results.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
    
    logger.info('AI功能測試完成', {
      summary: results.summary,
      recommendationCount: results.recommendations.length
    });
    
  } catch (error: any) {
    console.error('❌ AI功能測試執行失敗:', error.message);
    logger.error('AI功能測試失敗', { error: error.message });
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  runAIFunctionalTest().catch(console.error);
}