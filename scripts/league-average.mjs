/*
 * 로비에 띄우는 '리그 평균' 다섯 값을 미리 세어 둔다.
 *   node scripts/league-average.mjs
 * 화면에서 셀 수도 있지만, 그러면 로비를 열자고 시즌 로스터 412개를 다 받아야 한다.
 * 데이터가 바뀌면 다시 돌려 src/data/leagueAverage.json 을 갱신한다.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SD = join('src', 'data', 'series');
const overallOf = (pos, s) => (pos === 'SP' ? Math.round(s.stuff * 0.35 + s.control * 0.25 + s.stamina * 0.15 + s.stability * 0.25)
  : pos === 'RP' ? Math.round(s.stuff * 0.4 + s.control * 0.2 + s.stability * 0.4)
    : Math.round(s.power * 0.3 + s.contact * 0.35 + s.speed * 0.15 + s.defense * 0.2));

/** 화면의 teamStats 와 같은 셈 — 주전만이 아니라 시리즈 전원을 본다 */
function teamStats(players) {
  const has = (f) => players.filter(f);
  const mean = (list, f) => (list.length ? list.reduce((t, x) => t + f(x), 0) / list.length : 0);
  const bats = has((p) => !['SP', 'RP'].includes(p.position));
  const sps = has((p) => p.position === 'SP');
  const rps = has((p) => p.position === 'RP');
  return {
    ovr: mean(players, (p) => overallOf(p.position, p.stats)),
    bat: mean(bats, (p) => overallOf(p.position, p.stats)),
    sp: mean(sps, (p) => overallOf('SP', p.stats)),
    rp: mean(rps, (p) => overallOf('RP', p.stats)),
    def: mean(bats, (p) => p.stats.defense),
  };
}

const rows = [];
for (const f of readdirSync(SD).filter((x) => x.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(join(SD, f), 'utf8'));
  /* 적으로 나올 수 있는 시리즈만 — aiTeam.js 의 AI_SERIES 와 같은 조건 */
  const sp = s.players.filter((p) => p.position === 'SP').length;
  const rp = s.players.filter((p) => p.position === 'RP').length;
  const bat = s.players.filter((p) => !['SP', 'RP'].includes(p.position)).length;
  if (sp < 1 || rp < 1 || bat < 9) continue;
  rows.push(teamStats(s.players));
}
const mean = (k) => Math.round(rows.reduce((t, r) => t + r[k], 0) / Math.max(1, rows.length));
const out = { ovr: mean('ovr'), bat: mean('bat'), sp: mean('sp'), rp: mean('rp'), def: mean('def') };
writeFileSync(join('src', 'data', 'leagueAverage.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`leagueAverage.json — 시리즈 ${rows.length}개 기준`, out);
