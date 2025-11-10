const { join } = require('path');

const isCI =
  process.env.CI === 'true' ||
  process.env.CI === true ||
  process.env.GITHUB_ACTIONS === 'true' ||
  process.env.GITHUB_ACTIONS === true;

module.exports = function karmaConfig(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: !isCI,
    browsers: isCI ? ['ChromeHeadlessCI'] : ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    singleRun: isCI,
    restartOnFileChange: true,
    coverageReporter: {
      type: 'lcov',
      dir: join(__dirname, './coverage'),
      subdir: '.',
      fixWebpackSourcePaths: true,
    },
  });
};

