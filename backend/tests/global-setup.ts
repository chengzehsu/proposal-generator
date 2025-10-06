export default async (): Promise<void> => {
  console.log('🧪 開始執行測試套件...');

  // 設定測試環境變數（.env.test 會覆蓋這些值）
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./tests/test.db';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';

  console.log('✅ 測試環境設定完成');
};