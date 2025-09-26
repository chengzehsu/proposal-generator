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
    // Stricter rules for shared utilities
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // Require JSDoc for public functions
    'require-jsdoc': [
      'error',
      {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
      },
    ],
    
    'no-console': 'error', // No console in shared utilities
  },
};