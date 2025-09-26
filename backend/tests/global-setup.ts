export default async (): Promise<void> => {
  console.log('🧪 開始執行測試套件...');
  
  // 設定測試環境變數
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/proposal_generator_test?schema=public';
  process.env.JWT_SECRET = 'test-jwt-secret';
  
  console.log('✅ 測試環境設定完成');
};