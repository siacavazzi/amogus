// Browser end-to-end tests: real Chromium pages for the reactor and every phone, tapping
// through the game the way a room of people would.
//   npx playwright test -c e2e                                  against a local dev server (localhost:3000)
//   E2E_BASE_URL=https://susparty.com E2E_BETA=1 npx playwright test -c e2e   against beta
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: '.',
    // Each test is a whole game with several pages, so they run one at a time.
    workers: 1,
    fullyParallel: false,
    timeout: 4 * 60 * 1000,
    expect: { timeout: 15 * 1000 },
    retries: 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'report' }]] : 'list',
    outputDir: 'results',
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
        actionTimeout: 15 * 1000,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
    },
});
