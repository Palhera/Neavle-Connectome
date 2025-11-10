const baseConfig = require('../../.eslintrc.cjs');

module.exports = {
  ...baseConfig,
  parserOptions: {
    ...baseConfig.parserOptions,
    project: ['tsconfig.lib.json'],
    tsconfigRootDir: __dirname,
  },
};
