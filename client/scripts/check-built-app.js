// Run after npm run build. Check snapshots with real browser JavaScript.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const handler = require('serve-handler');
const puppeteer = require('puppeteer');

(async () => {
    const server = http.createServer((req, res) => handler(req, res, {
        public: path.resolve(__dirname, '../build'),
        rewrites: [{ source: '**', destination: '/index.html' }],
    }));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        for (const width of [1280, 390]) {
            const page = await browser.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.setViewport({ width, height: 800 });
            await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle0' });
            assert.deepEqual(errors, [], 'Landing startup errors');
            const screens = ['lp-task', 'lp-meet', 'lp-card', 'lp-reactor'];
            for (let i = 0; i < screens.length; i++) {
                await page.$$eval('.lp-story__panel', (panels, index) => {
                    panels[index].scrollIntoView({ block: 'center', behavior: 'instant' });
                }, i);
                const selector = width > 600
                    ? `.lp-story__phone-col .${screens[i]}`
                    : `.lp-story__panel.is-active .${screens[i]}`;
                await page.waitForSelector(selector, { visible: true, timeout: 5000 });
            }
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                page.click('a[href="/play"]'),
            ]);
            await page.waitForFunction(() => !document.querySelector('.lp-shell') &&
                document.querySelector('#root').textContent.trim().length > 0);
            assert.equal(new URL(page.url()).pathname, '/play');
            assert.deepEqual(errors, [], 'Game startup errors');
            console.log(`PASS ${width}px: all phone screens, Play navigation, no startup errors`);
            await page.close();
        }
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
