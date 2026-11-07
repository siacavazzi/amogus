#!/usr/bin/env node
// Lists every string the game passes to t() / tn(), and which ones a language is missing.
//   node scripts/i18n-keys.js            -> summary per language
//   node scripts/i18n-keys.js missing fr -> JSON of English keys French lacks (plurals as {one, other})
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const LOCALES = path.join(SRC, 'i18n', 'locales');
const STR = String.raw`(['"])((?:\\.|(?!\1)[^\\\n])*)\1`;
const SINGLE = new RegExp(String.raw`(?<![\w.$])tk?\(\s*` + STR, 'g');
const PLURAL = new RegExp(String.raw`(?<![\w.$])tn\(\s*[^,()]+(?:\([^()]*\))?[^,()]*,\s*` + STR + String.raw`\s*,\s*(['"])((?:\\.|(?!\3)[^\\\n])*)\3`, 'g');

function unquote(quote, body) {
    // eslint-disable-next-line no-new-func
    return new Function(`return ${quote}${body}${quote}`)();
}

function sourceFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'locales' ? [] : sourceFiles(full);
        return /\.(js|jsx)$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [full] : [];
    });
}

function collectKeys() {
    const singles = new Map();
    const plurals = new Map();
    for (const file of sourceFiles(SRC)) {
        const text = fs.readFileSync(file, 'utf8');
        for (const m of text.matchAll(SINGLE)) singles.set(unquote(m[1], m[2]), path.relative(SRC, file));
        for (const m of text.matchAll(PLURAL)) plurals.set(unquote(m[1], m[2]), { other: unquote(m[3], m[4]), file: path.relative(SRC, file) });
    }
    return { singles, plurals };
}

function placeholders(text) {
    return [...String(text).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
}

function audit(lang) {
    const { singles, plurals } = collectKeys();
    const catalog = JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), 'utf8'));
    const missing = [];
    const broken = [];
    for (const key of singles.keys()) {
        if (plurals.has(key)) continue;
        if (typeof catalog[key] !== 'string' || !catalog[key]) missing.push(key);
        else if (placeholders(catalog[key]) !== placeholders(key)) broken.push(key);
    }
    for (const [key, { other }] of plurals) {
        const entry = catalog[key];
        if (!entry || typeof entry !== 'object' || !entry.other) { missing.push(key); continue; }
        const expected = placeholders(`${key} ${other}`.replace(/\{count\}/g, ''));
        for (const form of Object.values(entry)) {
            if (placeholders(String(form).replace(/\{count\}/g, '')) !== expected && expected) broken.push(key);
        }
    }
    const used = new Set([...singles.keys(), ...plurals.keys()]);
    const unused = Object.keys(catalog).filter(key => !used.has(key));
    return { missing, broken: [...new Set(broken)], unused };
}

module.exports = { collectKeys, audit, LANGS: ['fr', 'es', 'de', 'ro', 'pt', 'no', 'sv'] };

if (require.main === module) {
    const [cmd, lang] = process.argv.slice(2);
    if (cmd === 'missing') {
        const { plurals } = collectKeys();
        const out = {};
        for (const key of audit(lang).missing) out[key] = plurals.has(key) ? { one: key, other: plurals.get(key).other } : key;
        process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    } else {
        const { singles, plurals } = collectKeys();
        console.log(`${singles.size} strings (${plurals.size} plural)`);
        for (const l of module.exports.LANGS) {
            const r = audit(l);
            console.log(`${l}: ${r.missing.length} missing, ${r.broken.length} placeholder mismatches, ${r.unused.length} unused`);
        }
    }
}
