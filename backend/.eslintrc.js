module.exports = {
  extends: ['../.eslintrc.js'],
  env: {
    node: true,
    jest: true,
  },
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    // Allow console in backend
    'no-console': 'off',
    
    // Stricter backend rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // Security rules for backend
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
  },
};