import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 成功率分析演算法
async function calculateSuccessRate(proposalId: string, companyId: string) {
  try {
    // 1. 取得當前標案資訊
    const currentProposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        client_name: true,
        estimated_amount: true,
        title: true,
      }
    });

    if (!currentProposal) {
      return {
        success_rate: 0,
        confidence_level: 'low',
        factors: []
      };
    }

    // 2. 計算公司整體歷史得標率
    const allProposals = await prisma.proposal.findMany({
      where: { company_id: companyId },
      select: { status: true }
    });

    const wonProposals = allProposals.filter((p: { status: string }) => p.status === 'won').length;
    const submittedProposals = allProposals.filter((p: { status: string }) =>
      ['submitted', 'won', 'lost'].includes(p.status)
    ).length;

    const baseSuccessRate = submittedProposals > 0
      ? (wonProposals / submittedProposals) * 100
      : 0;

    // 3. 相似案件分析（同客戶）
    let similarClientSuccessRate = 0;
    if (currentProposal.client_name) {
      const similarClientProposals = await prisma.proposal.findMany({
        where: {
          company_id: companyId,
          client_name: currentProposal.client_name,
          status: { in: ['submitted', 'won', 'lost'] }
        },
        select: { status: true }
      });

      if (similarClientProposals.length > 0) {
        const clientWonCount = similarClientProposals.filter((p: { status: string }) => p.status === 'won').length;
        similarClientSuccessRate = (clientWonCount / similarClientProposals.length) * 100;
      }
    }

    // 4. 公司資料完整度影響
    const companyData = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            team_members: true,
            projects: true,
            awards: true,
          }
        }
      }
    });

    const hasBasicInfo = companyData?.company_name && companyData?.tax_id && companyData?.address;
    const hasTeamMembers = (companyData?._count.team_members ?? 0) > 0;
    const hasProjects = (companyData?._count.projects ?? 0) > 0;
    const hasAwards = (companyData?._count.awards ?? 0) > 0;

    const completenessScore = [
      hasBasicInfo ? 25 : 0,
      hasTeamMembers ? 25 : 0,
      hasProjects ? 25 : 0,
      hasAwards ? 25 : 0
    ].reduce((a, b) => a + b, 0);

    const completenessBonus = (completenessScore / 100) * 10; // 最多加 10%

    // 5. 近期表現權重（最近 3 個月的案件權重較高）
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentProposals = await prisma.proposal.findMany({
      where: {
        company_id: companyId,
        status: { in: ['submitted', 'won', 'lost'] },
        updated_at: { gte: threeMonthsAgo }
      },
      select: { status: true }
    });

    let recentSuccessRate = 0;
    if (recentProposals.length > 0) {
      const recentWonCount = recentProposals.filter((p: { status: string }) => p.status === 'won').length;
      recentSuccessRate = (recentWonCount / recentProposals.length) * 100;
    }

    // 6. 綜合計算成功率
    let finalSuccessRate = 0;
    const weights: Array<{ value: number; weight: number }> = [];

    if (baseSuccessRate > 0) {
      weights.push({ value: baseSuccessRate, weight: 0.3 });
    }
    if (similarClientSuccessRate > 0) {
      weights.push({ value: similarClientSuccessRate, weight: 0.3 });
    }
    if (recentSuccessRate > 0) {
      weights.push({ value: recentSuccessRate, weight: 0.2 });
    }

    if (weights.length > 0) {
      const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
      finalSuccessRate = weights.reduce((sum, w) => sum + (w.value * w.weight), 0) / totalWeight;
      finalSuccessRate += completenessBonus;
      finalSuccessRate = Math.min(Math.max(finalSuccessRate, 0), 100); // 限制在 0-100%
    } else {
      // 沒有歷史數據時，僅依據資料完整度
      finalSuccessRate = 20 + completenessBonus; // 基礎 20% + 完整度加成
    }

    // 7. 信心水平
    const totalHistoricalData = allProposals.length;
    let confidenceLevel = 'low';
    if (totalHistoricalData >= 20) {
      confidenceLevel = 'high';
    } else if (totalHistoricalData >= 10) {
      confidenceLevel = 'medium';
    }

    // 8. 影響因素分析
    const factors = [];

    if (baseSuccessRate > 0) {
      factors.push({
        factor: '整體歷史得標率',
        value: `${baseSuccessRate.toFixed(1)}%`,
        impact: baseSuccessRate > 40 ? 'positive' : baseSuccessRate < 20 ? 'negative' : 'neutral'
      });
    }

    if (similarClientSuccessRate > 0) {
      factors.push({
        factor: '同客戶歷史表現',
        value: `${similarClientSuccessRate.toFixed(1)}%`,
        impact: similarClientSuccessRate > 50 ? 'positive' : similarClientSuccessRate < 30 ? 'negative' : 'neutral'
      });
    }

    factors.push({
      factor: '公司資料完整度',
      value: `${completenessScore}%`,
      impact: completenessScore >= 75 ? 'positive' : completenessScore < 50 ? 'negative' : 'neutral'
    });

    if (recentProposals.length > 0) {
      factors.push({
        factor: '近期表現趨勢',
        value: `${recentSuccessRate.toFixed(1)}%`,
        impact: recentSuccessRate > 40 ? 'positive' : recentSuccessRate < 20 ? 'negative' : 'neutral'
      });
    }

    return {
      success_rate: Math.round(finalSuccessRate),
      confidence_level: confidenceLevel,
      factors,
      data_points: {
        total_proposals: allProposals.length,
        won_proposals: wonProposals,
        submitted_proposals: submittedProposals,
        recent_proposals: recentProposals.length
      }
    };

  } catch (error) {
    console.error('成功率計算錯誤:', error);
    return {
      success_rate: 0,
      confidence_level: 'low',
      factors: [],
      error: '計算失敗'
    };
  }
}

// AI 最佳實踐建議生成
async function generateBestPractices(proposalId: string, companyId: string, successRate: number) {
  try {
    const practices = [];

    // 1. 基於成功率給建議
    if (successRate < 30) {
      practices.push({
        category: '資料強化',
        suggestion: '建議補充更多實績案例，增加標書說服力',
        priority: 'high'
      });
    }

    // 2. 檢查資料完整度
    const companyData = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            team_members: true,
            projects: true,
            awards: true,
          }
        }
      }
    });

    if (!companyData?._count.team_members || companyData._count.team_members < 3) {
      practices.push({
        category: '團隊展示',
        suggestion: '增加關鍵團隊成員資料，突出專業能力',
        priority: 'medium'
      });
    }

    if (!companyData?._count.projects || companyData._count.projects < 3) {
      practices.push({
        category: '實績補強',
        suggestion: '新增至少 3 個相關實績案例，建立信任基礎',
        priority: 'high'
      });
    }

    if (!companyData?._count.awards || companyData._count.awards === 0) {
      practices.push({
        category: '差異化優勢',
        suggestion: '補充獲獎記錄或認證資訊，建立專業形象',
        priority: 'low'
      });
    }

    // 3. 標案相關建議
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { client_name: true, estimated_amount: true }
    });

    if (proposal?.client_name) {
      const previousWithClient = await prisma.proposal.findMany({
        where: {
          company_id: companyId,
          client_name: proposal.client_name,
          status: 'won'
        },
        take: 1
      });

      if (previousWithClient.length > 0) {
        practices.push({
          category: '客戶關係',
          suggestion: '善用與該客戶的合作經驗，強調延續性與信任',
          priority: 'high'
        });
      } else {
        practices.push({
          category: '首次合作',
          suggestion: '針對新客戶，強調創新方案與快速交付能力',
          priority: 'medium'
        });
      }
    }

    // 4. 通用最佳實踐
    if (practices.length === 0) {
      practices.push(
        {
          category: '內容優化',
          suggestion: '使用 AI 內容改善功能，提升標書文字品質',
          priority: 'medium'
        },
        {
          category: '格式規範',
          suggestion: '確保標書符合範本格式要求，避免因格式問題失分',
          priority: 'medium'
        },
        {
          category: '價格策略',
          suggestion: '參考歷史得標案件定價，制定有競爭力的報價',
          priority: 'medium'
        }
      );
    }

    return practices;

  } catch (error) {
    console.error('最佳實踐生成錯誤:', error);
    return [];
  }
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    company_id: string;
    is_active: boolean;
  };
}

// GET /api/analytics/:proposalId - 獲取標案分析報告
router.get('/:proposalId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { proposalId } = req.params;
    const companyId = (req as AuthenticatedRequest).user?.company_id;

    if (!companyId) {
      res.status(403).json({ error: '用戶未關聯公司' });
      return;
    }

    // 驗證標案是否屬於該公司
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        company_id: companyId
      }
    });

    if (!proposal) {
      res.status(404).json({ error: '標案不存在或無權限訪問' });
      return;
    }

    // 計算成功率
    const successAnalysis = await calculateSuccessRate(proposalId, companyId);

    // 生成最佳實踐建議
    const bestPractices = await generateBestPractices(
      proposalId,
      companyId,
      successAnalysis.success_rate
    );

    res.json({
      success_rate: successAnalysis.success_rate,
      confidence_level: successAnalysis.confidence_level,
      factors: successAnalysis.factors,
      data_points: successAnalysis.data_points,
      best_practices: bestPractices,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('分析報告生成錯誤:', error);
    res.status(500).json({ error: '分析報告生成失敗' });
  }
});

export default router;
