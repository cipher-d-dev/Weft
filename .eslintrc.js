module.exports = {
  root: true,
  extends: [
    '@react-native',
  ],
  rules: {
    // Enforce consistent imports
    'import/order': 'off', // handled by IDE
    // Allow JSX without importing React (RN 0.71+ new JSX transform)
    'react/react-in-jsx-scope': 'off',
    // Prefer const
    'prefer-const': 'error',
    // No unused vars (TS handles this but belt-and-suspenders)
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Consistent type imports
    '@typescript-eslint/consistent-type-imports': 'warn',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-shadow': 'error',
        'no-shadow': 'off',
      },
    },
  ],
};
