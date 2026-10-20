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
            await page.waitForSelector('.sl-phone--hero .sl-phone__shot.is-on', { visible: true, timeout: 5000 });
            const shots = await page.$$eval('.sl-split .sl-phone img', imgs => imgs.length);
            assert.ok(shots >= 3, `Expected the game screenshots on the home page, found ${shots}`);
            for (let i = 0; i < shots; i++) {
                await page.$$eval('.sl-split .sl-phone img', (imgs, index) => {
                    imgs[index].scrollIntoView({ block: 'center', behavior: 'instant' });
                }, i);
                await page.waitForFunction(index => {
                    const img = document.querySelectorAll('.sl-split .sl-phone img')[index];
                    return img.complete && img.naturalWidth > 0;
                }, { timeout: 5000 }, i);
            }
            await page.type('#sl-code', 'ab12');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                page.click('.sl-join button[type="submit"]'),
            ]);
            assert.equal(new URL(page.url()).pathname, '/play');
            assert.match(new URL(page.url()).search, /AB12/);
            await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle0' });
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                page.click('a.sl-join__host[href="/play"]'),
            ]);
            await page.waitForFunction(() => !document.querySelector('.sl-hero') &&
                document.querySelector('#root').textContent.trim().length > 0);
            assert.equal(new URL(page.url()).pathname, '/play');
            assert.deepEqual(errors, [], 'Game startup errors');
            console.log(`PASS ${width}px: game screenshots, room code box, Host navigation, no startup errors`);
            await page.close();
        }
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
