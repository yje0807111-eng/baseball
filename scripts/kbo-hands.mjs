/*
 * 시리즈에 좌우를 모르는 채로 들어간 선수를 위키백과에서 찾아 hands.json 에 채운다.
 *   node scripts/kbo-hands.mjs <자료폴더> <연도...> [--no-search]
 * hands.json 은 { 이름: 'RL' } — 앞이 투구, 뒤가 타석이다. 채운 뒤 시리즈를 다시 만들면 반영된다.
 * 정확한 제목으로 한 번 훑고, 못 찾은 선수만 검색으로 한 번 더 본다(--no-search 로 건너뛴다).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nap, pages, search, bestOf } from './kbo-wiki.mjs';

const SD = join('src', 'data', 'series');
const dir = process.argv[2];
const years = new Set(process.argv.slice(3).filter((x) => /^\d+$/.test(x)).map(Number));
if (!dir || !years.size) {
  console.error('쓰는 법: node scripts/kbo-hands.mjs <자료폴더> <연도...> [--no-search]');
  process.exit(1);
}
const file = join(dir, 'hands.json');
const hands = JSON.parse(readFileSync(file, 'utf8'));

/* 그 해 시리즈에서 좌우를 모르는 선수 모으기 — 어느 팀이었는지도 같이 (동명이인을 가를 때 쓴다) */
const need = new Map();
for (const f of readdirSync(SD).filter((x) => x.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(join(SD, f), 'utf8'));
  if (s.kind !== 'team' || !years.has(s.year)) continue;
  for (const p of s.players) {
    if (hands[p.personId] || hands[p.name]) continue;
    if (!need.has(p.name)) need.set(p.name, new Set());
    need.get(p.name).add(p.team);
  }
}

const list = [...need.keys()];
const found = {}, missing = [], hard = [];
const save = () => writeFileSync(file, `${JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), ...found })}\n`);

for (let i = 0; i < list.length; i += 40) {
  const batch = list.slice(i, i + 40);
  const out = await pages(batch);
  for (const name of batch) {
    const hit = bestOf(out, name, [...need.get(name)]);
    if (hit?.hand) found[name] = hit.hand; else missing.push(name);
  }
  save();
}
if (!process.argv.includes('--no-search')) {
  for (const name of missing) {
    await nap(700);
    const titles = await search(name);
    if (!titles.length) { hard.push(name); continue; }
    const hit = bestOf(await pages(titles.slice(0, 4)), name, [...need.get(name)]);
    if (hit?.hand) { found[name] = hit.hand; save(); } else hard.push(name);
  }
} else hard.push(...missing);
save();
console.log(`좌우 모르던 ${list.length}명 중 ${Object.keys(found).length}명 채움`);
console.log(`아직 모름 ${hard.length}: ${hard.join(' ')}`);
