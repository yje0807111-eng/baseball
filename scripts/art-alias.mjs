/*
 * 그림이 없는 선수 시즌에 같은 선수의 다른 시즌 그림을 빌려 준다 → src/data/artAlias.js
 *
 * 빌려 오는 조건
 *  - 같은 사람(personId) · 같은 구단 이름(시리즈 id 의 구단 부분). 이름이 바뀐 구단(OB→두산,
 *    해태→KIA, SK→SSG …)은 옷도 바뀌었으니 서로 빌리지 않는다. 국가대표 · 레전드 시리즈도 빼 둔다.
 *  - 그 구단에서 이어서 뛴 시즌끼리만 — 다음 시즌이 2 년 넘게 벌어지면 끊는다.
 *  - 아래 UNIFORM_BREAKS 에 적은 해에 옷이 바뀌었으면 그 해를 넘어 빌리지 않는다.
 *  - 가장 가까운 시즌의 그림을 쓴다(같으면 앞 시즌). MAX_REACH 시즌보다 멀면 빌리지 않는다.
 *
 * 옷이 바뀐 해를 알게 되면 UNIFORM_BREAKS 에 적고 다시 돌린다:  node scripts/art-alias.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

/** 구단 → 새 유니폼을 입기 시작한 해. 이 해를 사이에 두고는 그림을 빌리지 않는다 */
const UNIFORM_BREAKS = {
  // samsung: [2016],
};
const MAX_GAP = 2; // 이어서 뛴 것으로 보는 시즌 사이 간격
const MAX_REACH = 3; // 그림을 빌려 올 수 있는 가장 먼 시즌 — 옷이 바뀐 해를 모르는 동안은 짧게 잡는다

const safeId = (s) => s.replace(/[^\p{L}\p{N}-]/gu, '');
const has = (id) => existsSync(`public/cards/${id}.webp`) && existsSync(`public/profiles/${id}.webp`);

const tenure = new Map(); // "사람|구단" → [{ id, year }]
for (const f of readdirSync('src/data/series').filter((n) => n.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(`src/data/series/${f}`, 'utf8'));
  const m = /^(\d{4})-(.+)$/.exec(s.id);
  if (!m || s.kind === 'national' || m[2].startsWith('legend')) continue;
  const club = m[2];
  for (const p of s.players) {
    const k = `${p.personId}|${club}`;
    if (!tenure.has(k)) tenure.set(k, []);
    tenure.get(k).push({ id: `${s.id}_${safeId(p.personId)}`, year: +m[1], club });
  }
}

const alias = {};
const gaps = {};
for (const seasons of tenure.values()) {
  seasons.sort((a, b) => a.year - b.year);
  /* 이어서 뛴 구간으로 자른다 — 간격이 벌어지거나 옷이 바뀐 해를 지나면 새 구간 */
  const runs = [];
  for (const x of seasons) {
    const last = runs.at(-1)?.at(-1);
    const breaks = UNIFORM_BREAKS[x.club] || [];
    const cut = !last || x.year - last.year > MAX_GAP || breaks.some((y) => last.year < y && y <= x.year);
    if (cut) runs.push([x]); else runs.at(-1).push(x);
  }
  for (const run of runs) {
    const drawn = run.filter((x) => has(x.id));
    if (!drawn.length) continue;
    for (const x of run) {
      if (has(x.id)) continue;
      const src = [...drawn].sort((a, b) => Math.abs(a.year - x.year) - Math.abs(b.year - x.year) || a.year - b.year)[0];
      if (Math.abs(src.year - x.year) > MAX_REACH) continue;
      alias[x.id] = src.id;
      const d = Math.abs(src.year - x.year);
      gaps[d] = (gaps[d] || 0) + 1;
    }
  }
}

const keys = Object.keys(alias).sort();
writeFileSync('src/data/artAlias.js', `/*
 * 그림이 없는 선수 시즌 → 같은 선수가 같은 구단에서 뛴 다른 시즌의 그림.
 * scripts/art-alias.mjs 가 만든다 — 손으로 고치지 말고 스크립트의 UNIFORM_BREAKS 를 고쳐 다시 돌린다.
 */
export const ART_ALIAS = {
${keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(alias[k])},`).join('\n')}
};

/** 그림 파일을 찾을 선수 id — 빌려 온 그림이 있으면 그쪽 */
export const artId = (id) => ART_ALIAS[id] || id;
`);
console.log(`빌려 준 그림 ${keys.length}장 · 몇 시즌 떨어진 그림인가 ${JSON.stringify(gaps)}`);
