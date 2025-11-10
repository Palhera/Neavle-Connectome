const path = require('path');

module.exports = {
  root: true,
  ignorePatterns: ['dist/**/*', 'out-tsc/**/*', 'coverage/**/*', '**/*.spec.ts'],
  parserOptions: {
    project: [path.resolve(__dirname, 'tsconfig.eslint.json')],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    createDefaultProgram: true,
  },
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:@angular-eslint/recommended',
        'plugin:@angular-eslint/template/process-inline-templates',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        eqeqeq: ['error', 'smart'],
      },
    },
    {
      files: ['*.html'],
      extends: ['plugin:@angular-eslint/template/recommended'],
    },
  ],
};
