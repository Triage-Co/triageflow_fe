import fs from 'node:fs';

const input = process.env.TEMP
  ? `${process.env.TEMP}/eslint.json`
  : './eslint.json';
const data = JSON.parse(fs.readFileSync(input, 'utf8'));

const errors = [];
const warnings = [];

for (const f of data) {
  const file = f.filePath.replace(/\\/g, '/');
  for (const m of f.messages) {
    const row = {
      file,
      line: m.line ?? 0,
      col: m.column ?? 0,
      rule: m.ruleId || '(parse)',
      sev: m.severity === 2 ? 'error' : 'warning',
      msg: String(m.message).split('\n')[0],
    };
    if (m.severity === 2) errors.push(row);
    else warnings.push(row);
  }
}

console.log(`ERRORS ${errors.length}`);
errors.forEach((e, i) => {
  console.log(
    `${i + 1}. [${e.rule}] ${e.file}:${e.line}:${e.col}\n   ${e.msg}`,
  );
});

const byRule = {};
for (const w of warnings) byRule[w.rule] = (byRule[w.rule] || 0) + 1;
console.log(`\nWARNINGS ${warnings.length}`);
for (const [rule, count] of Object.entries(byRule).sort(
  (a, b) => b[1] - a[1],
)) {
  console.log(`  ${count}\t${rule}`);
}

const short = (p) => p.replace(/^.*\/triage\//, '');
let md = `# ESLint report (pre-commit)\n\nTotal: **${errors.length} errors**, **${warnings.length} warnings**\n\n## Errors (${errors.length})\n\n`;
errors.forEach((e, i) => {
  md += `${i + 1}. **\`${e.rule}\`** — \`${short(e.file)}:${e.line}:${e.col}\`\n`;
  md += `   - ${e.msg}\n\n`;
});

md += `## Warnings by rule (${warnings.length})\n\n`;
for (const [rule, count] of Object.entries(byRule).sort(
  (a, b) => b[1] - a[1],
)) {
  md += `- ${count} × \`${rule}\`\n`;
}

md += `\n## All warnings\n\n| # | Rule | File | Line | Message |\n|---|------|------|------|--------|\n`;
warnings.forEach((w, i) => {
  const msg = w.msg.replace(/\|/g, '\\|').slice(0, 200);
  md += `| ${i + 1} | \`${w.rule}\` | \`${short(w.file)}\` | ${w.line} | ${msg} |\n`;
});

const out = new URL('./eslint-commit-report.md', import.meta.url);
fs.writeFileSync(out, md);
console.log(`\nWrote ${out.pathname}`);
