#!/usr/bin/env node
// Lists string and template literals that look like visible English and are not inside t()/tn().
const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const IGNORE_KEYS = new Set(['className', 'style', 'type', 'kind', 'action', 'id', 'key', 'data-testid', 'href', 'src', 'role', 'variant', 'name', 'htmlFor', 'autoComplete', 'inputMode', 'target', 'rel', 'code', 'scope', 'step', 'event']);
for (const file of process.argv.slice(2)) {
    const code = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
    const hits = [];
    const visible = s => /[A-Za-z]{2,}/.test(s) && (/[A-Z][a-z]|\s[a-z]{2,}\s|[.!?…]$/.test(s)) && !/^[\w-]+(\s[\w-]+)*$/.test(s) || /^[A-Z][a-z]+(\s[A-Za-z]+)*[.!?…]?$/.test(s);
    traverse(ast, {
        'StringLiteral|TemplateLiteral'(p) {
            const text = p.node.type === 'StringLiteral' ? p.node.value : p.node.quasis.map(q => q.value.cooked).join('${}');
            if (!visible(text) || /^(https?:|\/|\.|#|rgba?\(|var\()/.test(text) || /^[a-z_]+$/.test(text)) return;
            if (p.findParent(x => x.isCallExpression() && ['t', 'tn', 'tk'].includes(x.node.callee.name))) return;
            if (p.findParent(x => x.isImportDeclaration() || x.isExportAllDeclaration())) return;
            const call = p.findParent(x => x.isCallExpression());
            if (call && /console|localStorage|sessionStorage|emit|on|querySelector|getItem|setItem|removeItem|includes|startsWith|setAttribute|addEventListener|matchMedia|Error/.test(code.slice(call.node.callee.start, call.node.callee.end))) return;
            const parent = p.parentPath;
            if (parent.isJSXAttribute() && IGNORE_KEYS.has(parent.node.name.name)) return;
            if (parent.isObjectProperty() && p.key === 'value' && IGNORE_KEYS.has(parent.node.key.name || parent.node.key.value)) return;
            if (parent.isObjectProperty() && p.key === 'key') return;
            if (parent.isBinaryExpression() && ['===', '!=='].includes(parent.node.operator)) return;
            if (p.findParent(x => x.isJSXAttribute() && IGNORE_KEYS.has(x.node.name.name))) return;
            hits.push(`${p.node.loc.start.line}: ${text.slice(0, 110)}`);
        },
    });
    if (hits.length) console.log(`\n## ${file}\n${hits.join('\n')}`);
}
