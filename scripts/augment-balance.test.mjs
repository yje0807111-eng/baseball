/* 증강 밸런스 시뮬레이션. 기본 테스트에서는 건너뛰고, 필요할 때만:
   BALANCE=1 npx vitest run scripts/augment-balance.test.mjs
   팀 성향(아키타입)별로 증강 하나씩만 들고 AI 올스타와 N경기 치러, 증강 없을 때와의
   승률 차이(%p)와 득실차 변화를 본다. 승률은 강팀에서 천장에 걸리므로 득실차를 같이 본다. */
import { test } from 'vitest';
import fs from 'node:fs';
import {
  DRAFT_MODES, POS_ORDER, SLOT_LIMITS, ROSTER_SIZE, BENCH_SIZE, SALARY_CAP, AUGMENTS,
  aiDraft, fillRoster, buildTeam, teamEnv, runSimulation, getLockReason, TIER_LABEL,
} from '../src/KboAugmentDraft.jsx';

const N = Number(process.env.N || 60); // 아키타입 × 증강마다 치를 경기 수
const SEED = Number(process.env.SEED || 1234); // 판을 바꿔 여러 번 돌려 볼 때
const CAP = SALARY_CAP;
const POOL = DRAFT_MODES.find((m) => m.id === 'mix').players;

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const isBat = (p) => p.type === 'batter';
const bat = (p) => p.stats.contact * 0.4 + p.stats.power * 0.4 + p.stats.speed * 0.2;
const pit = (p) => p.stats.stuff * 0.4 + p.stats.control * 0.3 + p.stats.stability * 0.3;

/** 점수가 높은 선수부터 자리를 채운다. 주전 14자리를 먼저, 그다음 예비 6자리 (남은 자리마다 55 CP 는 남겨 둔다) */
function draftBy(score, players = POOL) {
  let roster = []; let cp = CAP;
  const order = [...POS_ORDER.flatMap((p) => Array(SLOT_LIMITS[p]).fill(p)), ...Array(BENCH_SIZE).fill(null)];
  for (const pos of order) {
    const after = ROSTER_SIZE - roster.length - 1;
    const ok = players.filter((p) => (pos === null || p.position === pos) && !getLockReason(p, roster, cp) && cp - p.cost >= after * 55);
    const best = ok.sort((a, b) => score(b) - score(a))[0];
    if (best) { roster = [...roster, best]; cp -= best.cost; }
  }
  return roster;
}
const LEGEND = POOL.filter((p) => p.seriesId === 'legend-allstar');
const ARCHETYPES = [
  ['거포', draftBy((p) => (isBat(p) ? p.stats.power * 2 : -p.cost))],
  ['발야구', draftBy((p) => (isBat(p) ? p.stats.speed * 2 + p.stats.contact : -p.cost))],
  ['투수왕국', draftBy((p) => (isBat(p) ? -p.cost : pit(p) * 3))],
  ['스타군단', draftBy((p) => p.overall ** 2)],
  ['레전드', draftBy((p) => p.overall, LEGEND)],
  ['균형', draftBy((p) => (isBat(p) ? bat(p) : pit(p)))],
];

async function play(roster, augments, seed0) {
  let w = 0; let diff = 0;
  for (let i = 0; i < N; i++) {
    const seed = seed0 + i * 7919;
    const oppRoster = aiDraft({ players: POOL, cap: CAP, rng: mulberry32(seed + 13) });
    const opp = buildTeam('AI 올스타', fillRoster(oppRoster), 0);
    const env = teamEnv(opp, { w: 2, l: 1, d: 0 });
    const make = (augs) => buildTeam('나의 드림팀', fillRoster(roster), 0, augs, env);
    const res = await runSimulation({ my: make(augments), opp, augments, rng: mulberry32(seed), fast: true, rebuildMy: make });
    if (res.winner === 'my') w += 1;
    diff += res.score.my - res.score.opp;
  }
  return { win: (w / N) * 100, diff: diff / N };
}

const lines = [];
const out = (t) => { lines.push(t); process.stdout.write(`${t}\n`); };
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
const sign = (v, d = 0) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

test.skipIf(!process.env.BALANCE)('증강 밸런스', async () => {
  const base = {};
  for (const [name, roster] of ARCHETYPES) base[name] = await play(roster, [], SEED);
  const head = ARCHETYPES.map(([n]) => n.padStart(8)).join('');
  out(`\nN=${N}  기준 (증강 없음)${head}`);
  out(`${pad('  승률', 20)}${ARCHETYPES.map(([n]) => `${base[n].win.toFixed(0)}%`.padStart(8)).join('')}`);
  out(`${pad('  득실차', 19)}${ARCHETYPES.map(([n]) => sign(base[n].diff, 1).padStart(8)).join('')}`);

  const rows = [];
  for (const a of AUGMENTS) {
    const d = {}; const g = {};
    for (const [name, roster] of ARCHETYPES) {
      const r = await play(roster, [a], SEED);
      d[name] = r.win - base[name].win;
      g[name] = r.diff - base[name].diff;
    }
    const gv = Object.values(g);
    rows.push({ a, d, g, avg: gv.reduce((s, x) => s + x, 0) / gv.length, hi: Math.max(...gv), lo: Math.min(...gv) });
  }
  for (const tier of ['silver']) {
    out(`\n── ${TIER_LABEL[tier]} ─ 득실차 변화 (괄호는 승률 %p) ${head}     평균    최고    최저`);
    rows.filter((r) => r.a.tier === tier).sort((x, y) => y.avg - x.avg).forEach((r) => {
      const cols = ARCHETYPES.map(([n]) => `${sign(r.g[n], 1)}(${sign(r.d[n])})`.padStart(8)).join('');
      out(`${pad(r.a.name, 15)}${pad(r.a.id, 17)}${cols}${sign(r.avg, 2).padStart(8)}${sign(r.hi, 1).padStart(8)}${sign(r.lo, 1).padStart(8)}`);
    });
  }
  fs.writeFileSync(process.env.OUT || 'balance-report.txt', lines.join('\n'));
}, 1800000);
