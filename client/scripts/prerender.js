#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Static prerender step.
 *
 * Spins up a tiny static server in front of build/, drives a headless
 * Chromium through each marketing route, and writes the rendered HTML
 * back into build/<route>/index.html so crawlers and link-preview
 * scrapers see real content (not an empty <div id="root" />).
 *
 * Runs after `react-scripts build`.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const handler = require('serve-handler');
const puppeteer = require('puppeteer');

const ROUTES = ['/', '/how-to-play', '/faq', '/about'];
const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const TIMEOUT_MS = 30000;

if (!fs.existsSync(BUILD_DIR)) {
    console.error(`[prerender] build directory not found: ${BUILD_DIR}`);
    process.exit(1);
}

(async () => {
    // 1. Static file server pointed at build/, with SPA fallback to /index.html
    //    so client-side routes resolve to the React shell.
    const server = http.createServer((req, res) =>
        handler(req, res, {
            public: BUILD_DIR,
            rewrites: [{ source: '**', destination: '/index.html' }],
        })
    );

    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[prerender] serving ${BUILD_DIR} on ${baseUrl}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        for (const route of ROUTES) {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });

            // Block analytics/3rd-party requests so prerender is deterministic.
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const url = req.url();
                if (url.startsWith(baseUrl) || url.startsWith('data:')) {
                    req.continue();
                } else {
                    req.abort();
                }
            });

            const url = `${baseUrl}${route}`;
            try {
                await page.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: TIMEOUT_MS,
                });
            } catch (err) {
                console.error(`[prerender] failed to load ${route}: ${err.message}`);
                await page.close();
                process.exitCode = 1;
                continue;
            }

            // Give the document.title / theme-color useEffects a tick to flush.
            await page.evaluate(
                () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
            );

            const html = await page.content();
            await page.close();

            const outDir =
                route === '/' ? BUILD_DIR : path.join(BUILD_DIR, route.replace(/^\//, ''));
            fs.mkdirSync(outDir, { recursive: true });
            const outFile = path.join(outDir, 'index.html');
            fs.writeFileSync(outFile, html, 'utf8');

            const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
            console.log(`[prerender] ✓ ${route.padEnd(16)} -> ${path.relative(BUILD_DIR, outFile)} (${sizeKb} KB)`);
        }
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }

    console.log('[prerender] done');
})().catch((err) => {
    console.error('[prerender] fatal:', err);
    process.exit(1);
});
