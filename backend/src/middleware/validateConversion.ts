import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * 驗證標案轉換為實績的中間件
 *
 * 功能：
 * 1. 驗證標案是否存在
 * 2. 驗證標案狀態必須為 WON (得標)
 * 3. 檢查是否已轉換 (防止重複轉換)
 * 4. 如已轉換且 force=true，允許重複轉換但警告
 */
export const validateConversion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { force } = req.body;

    // 1. 查詢標案並包含已轉換的實績資訊
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        convertedProject: {
          select: {
            id: true,
            project_name: true,
            created_at: true
          }
        }
      }
    });

    // 2. 驗證標案是否存在
    if (!proposal) {
      res.status(404).json({
        error: 'Not Found',
        message: '標案不存在',
        statusCode: 404
      });
      return;
    }

    // 3. 驗證標案是否屬於當前公司
    if (proposal.company_id !== req.user?.company_id) {
      res.status(403).json({
        error: 'Forbidden',
        message: '無權限操作此標案',
        statusCode: 403
      });
      return;
    }

    // 4. 驗證標案狀態必須為 WON (得標)
    if (proposal.status !== 'WON') {
      res.status(400).json({
        error: 'INVALID_STATUS',
        message: '只有得標標案才能轉換為實績',
        current_status: proposal.status,
        statusCode: 400
      });
      return;
    }

    // 5. 檢查是否已轉換
    if (proposal.converted_to_project_id && !force) {
      logger.warn('Attempt to convert already converted proposal', {
        proposalId: id,
        existingProjectId: proposal.converted_to_project_id,
        userId: req.user?.id
      });

      res.status(409).json({
        error: 'ALREADY_CONVERTED',
        message: '此標案已轉換為實績案例',
        existing_project: proposal.convertedProject,
        statusCode: 409
      });
      return;
    }

    // 6. 如果是強制重複轉換，記錄警告
    if (proposal.converted_to_project_id && force) {
      logger.warn('Force conversion of already converted proposal', {
        proposalId: id,
        existingProjectId: proposal.converted_to_project_id,
        userId: req.user?.id
      });

      // 將警告資訊附加到 request
      req.conversionWarning = {
        type: 'DUPLICATE_CONVERSION',
        message: '警告：此標案已轉換過實績，強制重複轉換將產生新的實績記錄',
        existing_project: proposal.convertedProject
      };
    }

    // 7. 將標案資訊附加到 request，供後續處理使用
    req.proposal = proposal;

    next();
  } catch (error) {
    logger.error('Conversion validation failed', {
      error,
      proposalId: req.params.id,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: '驗證標案轉換失敗',
      statusCode: 500
    });
    return;
  }
};

// TypeScript 型別擴充
interface ProposalWithProject {
  id: string;
  title: string;
  status: string;
  company_id: string;
  convertedProject?: {
    id: string;
    project_name: string;
    created_at: Date;
  } | null;
}

interface ConversionWarning {
  type: string;
  message: string;
  existing_project?: {
    id: string;
    project_name: string;
    created_at: Date;
  };
}

declare module 'express-serve-static-core' {
  interface Request {
    proposal?: ProposalWithProject;
    conversionWarning?: ConversionWarning;
  }
}
