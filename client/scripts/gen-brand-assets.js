#!/usr/bin/env node
// Regenerate every logo file in client/public from public/logo.svg:
// favicon.ico (16-64), logo192.png, logo512.png, apple-touch-icon.png (square, iOS rounds it)
// and og-image.jpg (1200x630 link preview: logo + "Sus Party").
//
// Usage: node scripts/gen-brand-assets.js   (needs Playwright + Chromium; fetches Archivo from Google Fonts)

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PUBLIC = path.join(__dirname, '..', 'public');
const logo = fs.readFileSync(path.join(PUBLIC, 'logo.svg'), 'utf8');
const square = logo.replace(/rx="23"/, 'rx="0"');

const OG_HTML = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;900&display=block">
<style>
html,body{margin:0}
.og{width:1200px;height:630px;background:#ffc21a;color:#1a1400;font-family:Archivo,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 96px;box-sizing:border-box;gap:56px}
.lock{display:flex;align-items:center;gap:40px}
.lock svg{width:210px;height:210px;flex:none}
.word{font-weight:900;font-size:164px;letter-spacing:-.045em;line-height:.9;white-space:nowrap}
.sub{display:flex;align-items:center;justify-content:space-between;gap:24px}
.sub p{margin:0;font-weight:700;font-size:44px;letter-spacing:-.02em}
.url{background:#1a1400;color:#ffc21a;font-weight:900;font-size:36px;padding:16px 30px;border-radius:99px;letter-spacing:-.01em}
</style></head><body>
<div class="og" id="og"><div class="lock">${logo}<div class="word">Sus Party</div></div>
<div class="sub"><p>Among Us IRL. Free, no app.</p><span class="url">susparty.com</span></div></div>
</body></html>`;

// Minimal ICO writer: each entry is a PNG, which every current browser accepts.
function ico(pngs) {
    const head = Buffer.alloc(6 + 16 * pngs.length);
    head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
    let offset = head.length;
    pngs.forEach(({ size, data }, i) => {
        const e = 6 + 16 * i;
        head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
        head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
        head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
        offset += data.length;
    });
    return Buffer.concat([head, ...pngs.map(p => p.data)]);
}

(async () => {
    const browser = await chromium.launch();
    const render = async (svg, size, opts = {}) => {
        const page = await browser.newPage({ viewport: { width: size, height: size } });
        await page.setContent(`<html><body style="margin:0;background:${opts.bg || 'transparent'}">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
        const data = await page.screenshot({ omitBackground: !opts.bg, clip: { x: 0, y: 0, width: size, height: size } });
        await page.close();
        return data;
    };
    fs.writeFileSync(path.join(PUBLIC, 'logo192.png'), await render(logo, 192));
    fs.writeFileSync(path.join(PUBLIC, 'logo512.png'), await render(logo, 512));
    fs.writeFileSync(path.join(PUBLIC, 'apple-touch-icon.png'), await render(square, 180, { bg: '#1b4fd8' }));
    const icoSizes = [16, 32, 48, 64];
    fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico(await Promise.all(icoSizes.map(async size => ({ size, data: await render(logo, size) })))));

    const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await og.setContent(OG_HTML, { waitUntil: 'networkidle' });
    await og.evaluate(() => document.fonts.ready);
    if (!(await og.evaluate(() => document.fonts.check('900 40px Archivo')))) throw new Error('Archivo did not load; og-image would use a fallback font');
    await og.screenshot({ path: path.join(PUBLIC, 'og-image.jpg'), type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    await browser.close();
    console.log('Wrote favicon.ico, logo192.png, logo512.png, apple-touch-icon.png, og-image.jpg');
})();
