/*
 * 2000년까지의 시즌은 기록실에 수비 기록이 없어 내야수가 '내야수'로만 온다.
 * 그 선수들의 자리를 위키백과에서 찾아 positions.json 에 채운다.
 *   node scripts/kbo-positions.mjs <자료폴더> <연도...> [--no-search]
 * positions.json 은 { '1999-OB': { 김민호: 'SS' } } — series-from-records.mjs 가 이 값을 먼저 쓴다.
 * 위키에도 없는 선수는 끝에 이름이 남는다. 그건 손으로 채워야 한다.
 * 좌우를 알아낸 김에 hands.json 도 같이 채운다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nap, pages, search, bestOf } from './kbo-wiki.mjs';
import { teamOf } from './series-from-records.mjs';

const dir = process.argv[2];
const years = process.argv.slice(3).filter((x) => /^\d+$/.test(x)).map(Number);
if (!dir || !years.length) {
  console.error('쓰는 법: node scripts/kbo-positions.mjs <자료폴더> <연도...> [--no-search]');
  process.exit(1);
}

/* 기록에서 후보 뽑기 — 타석 많은 타자 열여섯, 등판 많은 투수 열둘이면 열여덟 명을 고르기에 넉넉하다.
   자리를 알아야 하는 건 내야수뿐이다. 포수·외야수는 기록실 필터가 이미 갈라 줬다. */
const want = new Map();   // 이름 → { teams, keys, bat }
for (const year of years) {
  const text = readFileSync(join(dir, `${year}.txt`), 'utf8');
  const teams = {};
  let code = null, mode = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) { code = line.slice(1); teams[code] = { bat: [], pit: [] }; mode = null; continue; }
    let body = line;
    if (line.startsWith('B:')) { mode = 'bat'; body = line.slice(2); }
    else if (line.startsWith('P:')) { mode = 'pit'; body = line.slice(2); }
    const f = body.split('|');
    teams[code][mode].push(mode === 'bat' ? { name: f[0], pos: f[1], pa: Number(f[3]) } : { name: f[0], g: Number(f[2]) });
  }
  for (const [team, t] of Object.entries(teams)) {
    const bat = t.bat.slice().sort((a, b) => b.pa - a.pa).slice(0, 16).filter((x) => x.pos === '내야수' || x.pos === '?');
    const pit = t.pit.slice().sort((a, b) => b.g - a.g).slice(0, 12);
    for (const x of [...bat, ...pit]) {
      const isBat = bat.includes(x);
      if (!want.has(x.name)) want.set(x.name, { teams: new Set(), keys: new Set(), bat: isBat });
      const w = want.get(x.name);
      w.teams.add(teamOf(team, year).ko);
      w.keys.add(`${year}-${team}`);
      if (isBat) w.bat = true;
    }
  }
}

const handFile = join(dir, 'hands.json');
const posFile = join(dir, 'positions.json');
const hands = JSON.parse(readFileSync(handFile, 'utf8'));
const positions = JSON.parse(readFileSync(posFile, 'utf8'));
const names = [...want.keys()];
const done = [], rest = [];
let gotHand = 0;
const save = () => {
  writeFileSync(handFile, `${JSON.stringify(hands)}\n`);
  writeFileSync(posFile, `${JSON.stringify(positions, null, 1)}\n`);
};
/* 이미 적힌 자리는 손으로 정한 값일 수 있다 — 덮지 않는다 (--overwrite 를 주면 덮는다) */
const overwrite = process.argv.includes('--overwrite');
/** 찾은 값을 넣는다 — 타자인데 자리를 못 알아냈으면 실패로 본다 */
const apply = (name, v) => {
  const w = want.get(name);
  if (v.hand && !hands[name]) { hands[name] = v.hand; gotHand += 1; }
  if (!w.bat) return true;
  const kept = [...w.keys].filter((key) => positions[key]?.[name]);
  if (kept.length === w.keys.size) return true;
  if (!v.pos) return false;
  for (const key of w.keys) {
    positions[key] ??= {};
    if (overwrite || !positions[key][name]) positions[key][name] = v.pos;
  }
  return true;
};

for (let i = 0; i < names.length; i += 40) {
  const batch = names.slice(i, i + 40);
  const out = await pages(batch);
  for (const name of batch) {
    const hit = bestOf(out, name, [...want.get(name).teams]);
    if (hit && apply(name, hit)) done.push(name); else rest.push(name);
  }
  save();
}
if (!process.argv.includes('--no-search')) {
  for (const name of rest.splice(0, rest.length)) {
    await nap(600);
    const titles = await search(name);
    if (!titles.length) { rest.push(name); continue; }
    const hit = bestOf(await pages(titles.slice(0, 4)), name, [...want.get(name).teams]);
    if (hit && apply(name, hit)) { done.push(name); save(); } else rest.push(name);
  }
}
save();
console.log(`후보 ${names.length}명 · 자리까지 채움 ${done.length} · 좌우 새로 ${gotHand}`);
console.log(`아직 모름 ${rest.length}: ${rest.join(' ')}`);
