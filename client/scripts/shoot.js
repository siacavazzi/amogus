// Quick puppeteer helper to take landing-page screenshots at multiple
// scroll positions so the agent can iterate on layout.
//
// Usage:  node scripts/shoot.js [url] [outDir]

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const URL = process.argv[2] || 'http://localhost:3000/';
const OUT = path.resolve(process.argv[3] || '/tmp/lp-shots');

(async () => {
    fs.mkdirSync(OUT, { recursive: true });

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for layout to settle (animations etc.)
    await new Promise((r) => setTimeout(r, 800));

    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = 900;
    const stops = [
        { name: '01-top',      y: 0 },
        { name: '02-task',     y: Math.round(vh * 0.7) },
        { name: '03-vote',     y: Math.round(vh * 1.55) },
        { name: '04-intruder', y: Math.round(vh * 2.4) },
        { name: '05-reactor',  y: Math.round(vh * 3.25) },
        { name: '06-bottom',   y: Math.max(0, docHeight - vh) },
    ];

    console.log(`docHeight=${docHeight}, vh=${vh}`);
    for (const s of stops) {
        await page.evaluate((y) => window.scrollTo(0, y), s.y);
        await new Promise((r) => setTimeout(r, 700));
        const file = path.join(OUT, `${s.name}.png`);
        await page.screenshot({ path: file, fullPage: false });
        console.log(`shot ${s.name} @ y=${s.y} -> ${file}`);
    }

    // Also one mobile shot
    await page.setViewport({ width: 390, height: 800, deviceScaleFactor: 2 });
    await page.goto(URL, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT, '08-mobile-top.png') });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, '09-mobile-mid.png') });

    await browser.close();
    console.log('done');
})();
