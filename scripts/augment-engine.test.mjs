/* 팀 보너스형 증강(bonus · weights · defCoef · usage)이 공 단위 엔진 승률을 얼마나 바꾸는지. 기본 테스트에서는 건너뛰고, 필요할 때만:
   BALANCE=1 npx vitest run scripts/augment-engine.test.mjs   (N=경기 수, EDGE=엔진 배율)
   같은 로스터 · 같은 상대 · 같은 시드로 증강 없이 / 있이 N경기씩 치러 승률(%p) · 득실차 변화를 본다. */
import { test } from 'vitest';
import {
  DRAFT_MODES, POS_ORDER, SLOT_LIMITS, AUGMENTS, ENGINE_EDGE,
  aiDraft, fillRoster, buildTeam, teamEnv, getLockReason,
} from '../src/KboAugmentDraft.jsx';
import { engineTeam } from '../src/BroadcastGame.jsx';
import { simulateGame } from '../src/engine/pitchSim.js';

const N = Number(process.env.N || 400);
const CAP = 800;
const POOL = DRAFT_MODES.find((m) => m.id === 'mix').players;
if (process.env.EDGE) ENGINE_EDGE.bat = ENGINE_EDGE.pit = Number(process.env.EDGE);

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const isBat = (p) => p.type === 'batter';
const pit = (p) => p.stats.stuff * 0.4 + p.stats.control * 0.3 + p.stats.stability * 0.3;
const bat = (p) => p.stats.contact * 0.4 + p.stats.power * 0.4 + p.stats.speed * 0.2;

const MIN_COST = Math.min(...POOL.map((p) => p.cost));
/** 점수가 높은 선수부터 자리를 채운다 (남은 자리마다 가장 싼 선수 값은 남겨 둔다) */
function draftBy(score) {
  const slots = POS_ORDER.flatMap((p) => Array(SLOT_LIMITS[p]).fill(p));
  let roster = []; let cp = CAP;
  for (const [i, pos] of slots.entries()) {
    const after = slots.length - i - 1;
    const ok = POOL.filter((p) => p.position === pos && !getLockReason(p, roster, cp) && cp - p.cost >= after * MIN_COST);
    const best = ok.sort((a, b) => score(b) - score(a))[0];
    if (best) { roster = [...roster, best]; cp -= best.cost; }
  }
  return roster;
}
/** 로스터: 성향별 고정 드래프트 또는 경기마다 AI 드래프트(무작위) */
const ARCHETYPES = [
  ['AI 드래프트', null],
  ['균형', draftBy((p) => (isBat(p) ? bat(p) : pit(p)))],
  ['거포', draftBy((p) => (isBat(p) ? p.stats.power * 2 : -p.cost))],
  ['투수왕국', draftBy((p) => (isBat(p) ? -p.cost : pit(p) * 3))],
];
const IDS = (process.env.IDS || 'extremeLeft,synBoom,glassCannon,oneMan,mirrorMatch,oneWell,speedRevolution,flyballRevolution,contactRevolution,defenseRevolution,trainerOn,bullpenGame,doubleSwitch,workhorse,bullpenFortress,ironMan,captain,sluggerArmy,legendsWeight,synCopy,underdog,regress').split(',');
// 기준: 팀 보너스를 직접 +5 준 가짜 증강 (엔진 배율 감 잡기)
const PROBES = [
  { id: 'probeBat', name: '[타격 +5]', passive: true, team: (t) => { t.bonus.bat += 5; } },
  { id: 'probePit', name: '[투구 +5]', passive: true, team: (t) => { t.bonus.pit += 5; } },
  { id: 'probeBatR', name: '[타자 컨·파+5]', passive: true, roster: (r) => r.map((p) => (isBat(p) ? { ...p, stats: { ...p.stats, contact: p.stats.contact + 5, power: p.stats.power + 5 } } : p)) },
  { id: 'probePitR', name: '[투수 구·제+5]', passive: true, roster: (r) => r.map((p) => (isBat(p) ? p : { ...p, stats: { ...p.stats, stuff: p.stats.stuff + 5, control: p.stats.control + 5 } })) },
];

function play(roster, augments, oppBuff, n = N) {
  let w = 0; let diff = 0; const edge = { bat: 0, pit: 0 };
  for (let i = 0; i < n; i++) {
    const seed = 1 + i * 7919;
    const opp = buildTeam('AI 올스타', fillRoster(aiDraft({ players: POOL, cap: CAP, rng: mulberry32(seed + 13) })), oppBuff);
    const mine = roster || aiDraft({ players: POOL, cap: CAP, rng: mulberry32(seed + 99) });
    const my = buildTeam('나', fillRoster(mine), 0, augments, teamEnv(opp, { w: 2, l: 1, d: 0 }));
    edge.bat += my.edge.bat / n; edge.pit += my.edge.pit / n;
    const g = simulateGame({ home: engineTeam(my), away: engineTeam(opp), rng: mulberry32(seed), maxInnings: 9 });
    if (g.home.runs > g.away.runs) w += 1; else if (g.home.runs === g.away.runs) w += 0.5;
    diff += g.home.runs - g.away.runs;
  }
  return { win: (w / n) * 100, diff: diff / n, edge };
}

/** 기본 승률이 50%에 가깝도록 상대 buff 를 고른다 (강한 성향 로스터가 천장에 붙지 않게) */
const calibrate = (roster) => [0, 4, 8, 12, 16, 20, 24, 28, 32].map((b) => [b, Math.abs(play(roster, [], b, Math.min(N, 150)).win - 50)]).sort((x, y) => x[1] - y[1])[0][0];

test.skipIf(!process.env.BALANCE)('팀 보너스형 증강 엔진 승률', () => {
  const f = (v) => (v >= 0 ? '+' : '') + v.toFixed(1);
  const rows = [];
  for (const [name, roster] of ARCHETYPES) {
    const oppBuff = roster ? calibrate(roster) : 0;
    const base = play(roster, [], oppBuff);
    rows.push(`\n[${name}] 상대 buff ${oppBuff} · 기본 승률 ${base.win.toFixed(1)}% 득실 ${f(base.diff)}`);
    for (const a of [...PROBES, ...IDS.map((id) => AUGMENTS.find((x) => x.id === id))]) {
      const r = play(roster, [a], oppBuff);
      rows.push(`  ${a.name.padEnd(10)} ${f(r.win - base.win).padStart(6)}%p  득실 ${f(r.diff - base.diff).padStart(5)}  edge ${r.edge.bat.toFixed(1)}/${r.edge.pit.toFixed(1)}`);
    }
  }
  console.log(`N=${N} EDGE=${ENGINE_EDGE.bat}` + rows.join('\n'));
}, 3_600_000);
