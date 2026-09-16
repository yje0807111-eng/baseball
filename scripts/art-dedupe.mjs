// 같은 선수·같은 시즌·같은 팀 카드가 이미 그려져 있으면 그림을 복사해 재사용한다 (생성 건너뛰기)
// 사용법: node scripts/art-dedupe.mjs  → art-src/<id>.png 복사, card-jobs.json 에 원본 job id 기록
import { readdirSync, readFileSync, existsSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const art = join(root, 'art-src');
const safeId = (s) => s.replace(/[^\p{L}\p{N}-]/gu, '');
const jobsPath = join(art, 'card-jobs.json');
const jobs = existsSync(jobsPath) ? JSON.parse(readFileSync(jobsPath, 'utf8')) : {};
const entries = [];
for (const f of readdirSync(join(root, 'src/data/series')).filter((f) => f.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(join(root, 'src/data/series', f), 'utf8'));
  for (const p of s.players) entries.push({ id: `${s.id}_${safeId(p.personId)}`, key: `${p.personId}|${p.year}|${s.kind === 'national' ? s.id : p.team}` });
}
const have = new Map();
for (const e of entries) if (existsSync(join(art, `${e.id}.png`)) && !have.has(e.key)) have.set(e.key, e.id);
let copied = 0;
for (const e of entries) {
  if (existsSync(join(art, `${e.id}.png`)) || existsSync(join(root, 'public/cards', `${e.id}.webp`))) continue;
  const src = have.get(e.key);
  if (!src) continue;
  copyFileSync(join(art, `${src}.png`), join(art, `${e.id}.png`));
  if (jobs[src]) jobs[e.id] = jobs[src];
  copied++;
}
writeFileSync(jobsPath, JSON.stringify(jobs, null, 1));
console.log(`재사용 복사 ${copied}장`);
