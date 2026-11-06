// Captures the gameplay screenshots used on the site's SEO pages (public/images/gameplay).
// Needs the Flask server on :5001 and the React dev server on :3000 (the e2e config starts both).
//   npx playwright test -c scripts/screenshots        then   python3 scripts/screenshots/to-webp.py
const base = require('../../e2e/playwright.config');

module.exports = {
    ...base,
    testDir: '.',
    testMatch: 'capture.spec.js',
    timeout: 12 * 60 * 1000,
    outputDir: '/tmp/sus-screens-results',
    reporter: 'list',
    projects: [base.projects[0]],
};
