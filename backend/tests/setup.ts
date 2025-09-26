import dotenv from 'dotenv';

// Load environment variables before importing anything else
dotenv.config();

import { prisma } from '../src/utils/database';

// 設定測試環境
beforeAll(async () => {
  // 確保測試資料庫連接
  try {
    await prisma.$connect();
    console.log('✅ 測試資料庫連接成功');
  } catch (error) {
    console.error('❌ 測試資料庫連接失敗:', error);
    throw error;
  }
});

afterAll(async () => {
  // 清理測試資料庫連接
  await prisma.$disconnect();
  console.log('✅ 測試資料庫已斷線');
});