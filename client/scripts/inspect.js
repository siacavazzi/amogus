const puppeteer = require('puppeteer');
(async () => {
    const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    const data = await p.evaluate(() => {
        const pick = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return { sel, missing: true };
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return {
                sel,
                w: Math.round(r.width),
                h: Math.round(r.height),
                top: Math.round(r.top + window.scrollY),
                position: cs.position,
                display: cs.display,
                overflow: cs.overflow,
                overflowY: cs.overflowY,
                alignSelf: cs.alignSelf,
                topVal: cs.top,
            };
        };
        return [
            pick('.lp-shell'),
            pick('.lp-story'),
            pick('.lp-story__inner'),
            pick('.lp-story__text'),
            pick('.lp-story__phone-col'),
            pick('.lp-story__phone-sticky'),
            pick('.lp-story__panels'),
            pick('.lp-page'),
        ];
    });
    console.log(JSON.stringify(data, null, 2));

    // Walk up from sticky checking ancestors with bad overflow
    const ancestors = await p.evaluate(() => {
        let el = document.querySelector('.lp-story__phone-sticky');
        const chain = [];
        while (el && el !== document.documentElement) {
            const cs = getComputedStyle(el);
            chain.push({
                tag: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
                overflow: cs.overflow,
                overflowX: cs.overflowX,
                overflowY: cs.overflowY,
                transform: cs.transform,
                filter: cs.filter,
                contain: cs.contain,
            });
            el = el.parentElement;
        }
        return chain;
    });
    console.log('--- ANCESTORS ---');
    console.log(JSON.stringify(ancestors, null, 2));

    await b.close();
})();
