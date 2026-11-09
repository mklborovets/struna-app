module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx'], location: 'anywhere' }],
    'no-inline-comments': 'error',
    'multiline-comment-style': ['error', 'starred-block'],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/entities/*/model/*', '@/entities/*/ui/*', '@/entities/*/lib/*', '@/entities/*/api/*'],
            message: 'Import from slice public API index.ts instead of internal segments.',
          },
          {
            group: ['@/features/*/model/*', '@/features/*/ui/*', '@/features/*/lib/*'],
            message: 'Import from slice public API index.ts instead of internal segments.',
          },
          {
            group: ['@/widgets/*/model/*', '@/widgets/*/ui/*', '@/widgets/*/lib/*'],
            message: 'Import from slice public API index.ts instead of internal segments.',
          },
          {
            group: ['@/pages/*/ui/*', '@/pages/*/model/*'],
            message: 'Import from slice public API index.ts instead of internal segments.',
          },
        ],
      },
    ],
  },
};
