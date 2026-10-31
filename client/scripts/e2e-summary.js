// Turn the browser suite's JSON report into a short Markdown summary for the CI job page:
// what passed, what failed, and which tests are known bugs (test.fail) that only pass because
// the bug is still there. A green run then says "green, with N known bugs" instead of hiding them.
//   node scripts/e2e-summary.js [path to results.json]   (default e2e/results.json)
const fs = require('node:fs');
const path = require('node:path');

const file = process.argv[2] || path.join(__dirname, '../e2e/results.json');
if (!fs.existsSync(file)) {
    console.log('No browser test report was written.');
    process.exit(0);
}
const report = JSON.parse(fs.readFileSync(file, 'utf8'));

const tests = [];
const walk = (suite, trail) => {
    for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) tests.push({ title: [...trail, spec.title].join(' › '), file: spec.file, line: spec.line, test });
    }
    for (const child of suite.suites || []) walk(child, child.title && !child.title.endsWith('.js') ? [...trail, child.title] : trail);
};
for (const suite of report.suites || []) walk(suite, []);

const known = tests.filter(({ test }) => test.expectedStatus === 'failed');
const failed = tests.filter(({ test }) => test.status === 'unexpected');
const flaky = tests.filter(({ test }) => test.status === 'flaky');
const project = [...new Set(tests.map(({ test }) => test.projectName))].join(', ');
const where = ({ file: f, line }) => `\`${f}:${line}\``;

console.log(`### Browser games (${project || 'no tests'})`);
console.log(`${tests.length - failed.length} of ${tests.length} as expected, ${failed.length} failed, ${flaky.length} flaky, ${known.length} known bugs.`);
if (failed.length) {
    console.log('\n**Failed**');
    for (const t of failed) console.log(`- ${t.title} (${where(t)})`);
}
if (known.length) {
    console.log('\n**Known bugs (marked test.fail, so they pass while the bug is there)**');
    for (const t of known) {
        const note = (t.test.annotations || []).find(a => a.type === 'fail')?.description;
        console.log(`- ${t.title}${note ? `: ${note}` : ''} (${where(t)})`);
    }
}
