// 設定測試環境變數
process.env.NODE_ENV = 'test';
// 使用測試資料庫檔案（會在 tests 目錄中創建）
process.env.DATABASE_URL = 'file:./tests/test.db';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only_do_not_use_in_production';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing_only_do_not_use_in_production';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.GEMINI_API_KEY = 'test_key';
process.env.GOOGLE_AI_API_KEY = 'test_key';
process.env.LOG_LEVEL = 'error';