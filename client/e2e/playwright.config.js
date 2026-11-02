// Browser end-to-end tests: real Chromium pages for the reactor and every phone, tapping
// through the game the way a room of people would.
//   npx playwright test -c e2e                                  locally (starts the Flask and React dev servers if they aren't up)
//   E2E_BASE_URL=https://susparty.com E2E_BETA=1 npx playwright test -c e2e   against beta
//   E2E_WEBKIT=1 adds a Safari (WebKit) run of the main games, since most players are on iPhones
const path = require('node:path');
const { defineConfig } = require('@playwright/test');

const local = !process.env.E2E_BASE_URL;

module.exports = defineConfig({
    testDir: '.',
    // Each test is a whole game with several pages, so they run one at a time.
    workers: 1,
    fullyParallel: false,
    timeout: 4 * 60 * 1000,
    expect: { timeout: 15 * 1000 },
    retries: 0,
    reporter: process.env.CI
        ? [['list'], ['html', { open: 'never', outputFolder: 'report' }], ['json', { outputFile: 'results.json' }]]
        : 'list',
    outputDir: 'results',
    webServer: local ? [
        {
            command: 'python3 app.py',
            cwd: path.join(__dirname, '../../server'),
            url: 'http://localhost:5001/health',
            reuseExistingServer: true,
            timeout: 60 * 1000,
        },
        {
            command: 'npx react-scripts start',
            cwd: path.join(__dirname, '..'),
            env: { BROWSER: 'none', PORT: '3000' },
            url: 'http://localhost:3000/play',
            reuseExistingServer: true,
            timeout: 3 * 60 * 1000,
        },
    ] : undefined,
    projects: [
        {
            name: 'chromium',
            use: {
                browserName: 'chromium',
                launchOptions: {
                    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
                    // A pretend camera that needs no permission prompt, for the selfie screen.
                    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
                },
            },
        },
        ...(process.env.E2E_WEBKIT === '1' ? [{
            name: 'webkit',
            use: { browserName: 'webkit' },
            // Most players are on iPhones, so Safari plays the games, the meetings and the reconnects too.
            testMatch: ['full-game.spec.js', 'game-endings.spec.js', 'cards.spec.js', 'site.spec.js', 'meetings-and-connections.spec.js',
                'meeting-edge-cases.spec.js', 'reconnects.spec.js', 'lobby.spec.js', 'onboarding.spec.js', 'other-modes.spec.js', 'hosting.spec.js', 'qr-join.spec.js', 'late-join.spec.js', 'live-join.spec.js'],
        }] : []),
    ],
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
        actionTimeout: 15 * 1000,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
});
