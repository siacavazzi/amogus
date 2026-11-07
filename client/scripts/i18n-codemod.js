#!/usr/bin/env node
// One-off helper: wraps visible JSX text, a few text attributes and string branches of JSX
// expressions in t(). Edits the source in place by splicing, so formatting is kept.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ATTRS = new Set(['placeholder', 'aria-label', 'title', 'alt', 'label', 'text', 'message', 'body', 'subtitle', 'description', 'hint']);
const SKIP_TAGS = new Set(['code', 'style', 'script', 'pre']);
const hasWords = s => /[A-Za-z]{2,}/.test(s);

function normalizeJsxText(raw) {
    const lines = raw.split(/\r\n|\n|\r/);
    let out = '';
    lines.forEach((line, i) => {
        let l = line.replace(/\t/g, ' ');
        if (i !== 0) l = l.replace(/^[ ]+/, '');
        if (i !== lines.length - 1) l = l.replace(/[ ]+$/, '');
        if (l) out += (out && i !== 0 ? ' ' : '') + l;
    });
    return out;
}

function q(s) {
    return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function exprName(node, code) {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') return node.property.name;
    if (node.type === 'OptionalMemberExpression' && !node.computed) return node.property.name;
    return null;
}

function processFile(file, importPath) {
    let code = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'classProperties', 'optionalChaining'] });
    const edits = [];
    let conflict = false;
    traverse(ast, {
        Scope(p) {
            const b = p.scope.getOwnBinding('t');
            if (b && b.kind !== 'module') conflict = true;
        },
        JSXAttribute(p) {
            const { node } = p;
            const name = node.name.name;
            if (!ATTRS.has(name) || !node.value || node.value.type !== 'StringLiteral') return;
            if (!hasWords(node.value.value)) return;
            edits.push([node.value.start, node.value.end, `{t(${q(node.value.value)})}`]);
        },
        StringLiteral(p) {
            // "a" in {cond ? "a" : "b"} or {cond && "a"} directly as a JSX child.
            let cur = p;
            while (cur.parentPath && ['ConditionalExpression', 'LogicalExpression'].includes(cur.parentPath.node.type)) {
                if (cur.parentPath.node.type === 'ConditionalExpression' && cur.key === 'test') return;
                if (cur.parentPath.node.type === 'LogicalExpression' && cur.key === 'left') return;
                cur = cur.parentPath;
            }
            if (cur === p || !cur.parentPath || cur.parentPath.node.type !== 'JSXExpressionContainer') return;
            if (cur.parentPath.parentPath.node.type === 'JSXAttribute') {
                const attr = cur.parentPath.parentPath.node.name.name;
                if (!ATTRS.has(attr)) return;
            }
            if (!hasWords(p.node.value)) return;
            edits.push([p.node.start, p.node.end, `t(${q(p.node.value)})`]);
        },
        'JSXElement|JSXFragment'(p) {
            const opening = p.node.openingElement?.name;
            if (opening && opening.type === 'JSXIdentifier' && SKIP_TAGS.has(opening.name)) return;
            const children = p.node.children;
            let run = [];
            const flush = () => {
                const textPieces = run.filter(c => c.kind === 'text');
                const text = textPieces.map(c => c.text).join('');
                if (run.length && hasWords(text)) {
                    const vars = [];
                    const used = new Set();
                    let key = '';
                    for (const piece of run) {
                        if (piece.kind === 'text') key += piece.text;
                        else {
                            let name = piece.name;
                            while (used.has(name)) name += '2';
                            used.add(name);
                            vars.push([name, code.slice(piece.node.start, piece.node.end)]);
                            key += `{${name}}`;
                        }
                    }
                    key = key.trim().replace(/ {2,}/g, ' ');
                    const args = vars.length ? `, { ${vars.map(([n, src]) => (n === src ? n : `${n}: ${src}`)).join(', ')} }` : '';
                    // Keep the source's own whitespace around the run; replace only the visible part.
                    const first = run[0];
                    const last = run[run.length - 1];
                    const start = first.kind === 'text' && first.raw ? first.start + first.raw.match(/^\s*/)[0].length : first.start;
                    const end = last.kind === 'text' && last.raw ? last.end - last.raw.match(/\s*$/)[0].length : last.end;
                    edits.push([start, end, `{t(${q(key)}${args})}`]);
                }
                run = [];
            };
            for (const child of children) {
                if (child.type === 'JSXText') {
                    const text = normalizeJsxText(child.value);
                    if (!text && run.length === 0) continue;
                    run.push({ kind: 'text', text, raw: child.value, start: child.start, end: child.end });
                } else if (child.type === 'JSXExpressionContainer' && child.expression.type === 'StringLiteral' && !hasWords(child.expression.value)) {
                    run.push({ kind: 'text', text: child.expression.value, start: child.start, end: child.end });
                } else if (child.type === 'JSXExpressionContainer' && exprName(child.expression, code) && run.some(r => r.kind === 'text' && hasWords(r.text)) || (child.type === 'JSXExpressionContainer' && exprName(child.expression, code) && run.length === 0 && nextHasWords(children, child))) {
                    run.push({ kind: 'expr', name: exprName(child.expression, code), node: child.expression, start: child.start, end: child.end });
                } else {
                    flush();
                }
            }
            flush();
        },
    });
    if (conflict) return { file, conflict: true, edits: edits.length };
    if (!edits.length) return { file, edits: 0 };
    // Drop edits nested inside other edits (keep the outer).
    edits.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const kept = [];
    for (const e of edits) {
        const last = kept[kept.length - 1];
        if (last && e[0] < last[1]) continue;
        kept.push(e);
    }
    for (const [s, e, text] of kept.reverse()) code = code.slice(0, s) + text + code.slice(e);
    if (!/from ['"][./]*i18n['"]/.test(code)) {
        const imports = [...code.matchAll(/^import [\s\S]*?;[ \t]*$/gm)];
        const lastImport = imports[imports.length - 1];
        const line = `\nimport { t } from '${importPath}';`;
        if (lastImport) {
            const at = lastImport.index + lastImport[0].length;
            code = code.slice(0, at) + line + code.slice(at);
        } else code = line.trim() + '\n' + code;
    }
    fs.writeFileSync(file, code);
    return { file, edits: kept.length };
}

function nextHasWords(children, child) {
    const i = children.indexOf(child);
    for (let j = i + 1; j < children.length; j++) {
        const c = children[j];
        if (c.type === 'JSXText') {
            const text = normalizeJsxText(c.value);
            if (hasWords(text)) return true;
            if (text) continue;
            continue;
        }
        if (c.type === 'JSXExpressionContainer' && (c.expression.type === 'Identifier' || c.expression.type === 'MemberExpression')) continue;
        return false;
    }
    return false;
}

const src = path.join(__dirname, '..', 'src');
for (const rel of process.argv.slice(2)) {
    const file = path.resolve(rel);
    let importPath = path.relative(path.dirname(file), path.join(src, 'i18n')).replace(/\\/g, '/');
    if (!importPath.startsWith('.')) importPath = `./${importPath}`;
    console.log(JSON.stringify(processFile(file, importPath)));
}
