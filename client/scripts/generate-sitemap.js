#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generates client/public/sitemap.xml from client/src/seo/routes.json.
 * Run before react-scripts build so the generated file is copied to build/.
 */

const fs = require('fs');
const path = require('path');

const routes = require('../src/seo/routes.json');
const publicDir = path.resolve(__dirname, '..', 'public');

const entries = routes
    .filter((r) => r.prerender !== false)
    .map(
        (r) =>
            `  <url>\n    <loc>${r.canonical}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    )
    .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

const outPath = path.join(publicDir, 'sitemap.xml');
fs.writeFileSync(outPath, sitemap, 'utf8');
console.log(`[generate-sitemap] wrote ${routes.length} URLs to ${outPath}`);
