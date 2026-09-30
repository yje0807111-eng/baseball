// 감독 · 코치 값 표: npx vite-node scripts/staff-table.mjs
import { STAFF, staffValue, styleOf, staffRules, ruleText } from '../src/myteam/staff.js';
for (const role of ['manager', 'head', 'batting', 'pitching']) {
  console.log(`\n## ${role}`);
  for (const s of STAFF.filter((x) => x.role === role).sort((a, b) => b.cost - a.cost)) {
    console.log(String(s.cost).padStart(3), 'CP', `+${staffValue(s).toFixed(1)}%p`.padStart(7), s.name.padEnd(8), styleOf(s)?.ko || '', staffRules(s).map((x) => { const t = ruleText(x); return `${t.label} ${t.n}`; }).join(' · '));
  }
}
