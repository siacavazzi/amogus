// Run after the build, or pass a site origin to check deployed pages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const routes = require('../src/seo/routes.json').filter(route => route.prerender !== false);

async function main() {
    const origin = process.argv[2];
    const read = async pathname => {
        if (!origin) return fs.readFileSync(path.resolve(__dirname, '../build', pathname.slice(1)), 'utf8');
        const response = await fetch(new URL(pathname, origin), { redirect: 'manual' });
        assert.equal(response.status, 200, `${pathname}: expected HTTP 200, received ${response.status}`);
        assert.ok(!/noindex|none/i.test(response.headers.get('x-robots-tag') || ''), `${pathname}: index blocked by response header`);
        return response.text();
    };
    const robots = await read('/robots.txt');
    const exclusions = [...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gim)].map(match => match[1]);
    assert.deepEqual(exclusions.sort(), ['/dashboard', '/dashboard/'], 'Only the dashboard paths must be excluded');
    assert.match(robots, /^Sitemap:\s*https:\/\/susparty\.com\/sitemap\.xml\s*$/im);
    const sitemap = new JSDOM(await read('/sitemap.xml'), { contentType: 'text/xml' });
    const urls = [...sitemap.window.document.querySelectorAll('loc')].map(node => node.textContent);
    assert.deepEqual(urls.sort(), routes.map(route => route.canonical).sort(), 'Sitemap URLs must match the public routes');
    assert.ok(routes.some(route => route.path === '/play'), 'The public game entry must appear in the sitemap');
    const titles = new Set();
    const linkedPaths = new Set();
    for (const route of routes) {
        const html = await read(origin ? route.path : `${route.path === '/' ? '' : route.path}/index.html`);
        const dom = new JSDOM(html);
        const document = dom.window.document;
        const canonicals = document.querySelectorAll('link[rel="canonical"]');
        assert.equal(canonicals.length, 1, `${route.path}: expected one canonical tag`);
        assert.equal(canonicals[0].href, route.canonical, `${route.path}: incorrect canonical URL`);
        assert.ok(document.title && !titles.has(document.title), `${route.path}: missing or duplicate title`);
        titles.add(document.title);
        assert.ok(document.querySelector('meta[name="description"]')?.content, `${route.path}: missing description`);
        for (const meta of document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]')) {
            assert.ok(!/noindex|none/i.test(meta.content), `${route.path}: index blocked by meta tag`);
        }
        assert.ok(document.querySelector('#root')?.textContent.trim().length > 40, `${route.path}: missing rendered content`);
        for (const link of document.querySelectorAll('a[href]')) {
            const url = new URL(link.getAttribute('href'), route.canonical);
            if (url.origin === 'https://susparty.com') linkedPaths.add(url.pathname);
        }
        dom.window.close();
    }
    for (const route of routes) assert.ok(route.path === '/' || linkedPaths.has(route.path), `${route.path}: no internal links`);
    sitemap.window.close();
    console.log(`PASS ${routes.length} public pages: canonical URLs, unique metadata, rendered content, internal links, sitemap, and crawl access${origin ? ', HTTP 200 without redirects' : ''}.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
