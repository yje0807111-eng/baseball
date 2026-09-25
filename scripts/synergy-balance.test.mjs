/* 시너지 밸런스. 기본 테스트에서는 건너뛰고, 필요할 때만:
   SYN_BALANCE=1 npx vitest run scripts/synergy-balance.test.mjs
   시너지 보너스(+1~+8)는 경기 시뮬로 재기엔 잡음보다 작아서, 엔진이 쓰는 팀 전력값으로 직접 잰다.
   전력 점수 = 공격값 + 투구값(선발 0.6 · 불펜 0.1씩) + 수비 × 0.25 — 경기 엔진에서 공격·투구 1점은 기대 실점 0.04, 수비 1점은 0.01
   시너지마다 그 조건을 노려 뽑은 엔트리로
   · 가치: 그 시너지를 켰을 때와 껐을 때의 전력 점수 차이
   · 노릴 값: 노린 엔트리(켬) 와 가성비만 보고 뽑은 엔트리(끔) 의 차이 — 조건 선수를 뽑느라 치른 값까지 뺀 순이득
   참고로 증강 '근력 운동'(타자 파워 +10)이 전력 4점, 경기 득실차 약 +0.35 다. */
import { test } from 'vitest';
import fs from 'node:fs';
import {
  DRAFT_MODES, POS_ORDER, SLOT_LIMITS, ROSTER_SIZE, BENCH_SIZE, SALARY_CAP, SYNERGIES,
  fillRoster, buildTeam, getLockReason,
} from '../src/KboAugmentDraft.jsx';

const POOL = DRAFT_MODES.find((m) => m.id === 'mix').players;
const ALL = [...SYNERGIES];
const useSyn = (list) => { SYNERGIES.splice(0, SYNERGIES.length, ...list); };

/** 점수가 높은 선수부터 자리를 채운다. hit 가 있으면 조건 선수가 들어갈 포지션부터 채운다 — 앞자리가 CP 를 먼저 써 버리지 않게 */
function draftBy(score, hit = null) {
  let roster = []; let cp = SALARY_CAP;
  const field = POS_ORDER.flatMap((p) => Array(SLOT_LIMITS[p]).fill(p));
  const wanted = (pos) => (hit && POOL.some((p) => p.position === pos && hit(p)) ? 0 : 1);
  const order = [...field.sort((a, b) => wanted(a) - wanted(b)), ...Array(BENCH_SIZE).fill(null)];
  for (const pos of order) {
    const after = ROSTER_SIZE - roster.length - 1;
    const ok = POOL.filter((p) => (pos === null || p.position === pos) && !getLockReason(p, roster, cp) && cp - p.cost >= after * 55);
    const best = ok.sort((a, b) => score(b) - score(a))[0];
    if (best) { roster = [...roster, best]; cp -= best.cost; }
  }
  return roster;
}

/** 이 선수가 시너지 조건에 드는가 — 조합형은 따로 본다 */
const HIT = {
  battery: (p) => (p.position === 'C' && p.stats.defense >= 90) || (p.type === 'pitcher' && p.stats.control >= p.stats.stuff + 5),
  era: (p) => Math.floor(p.year / 10) * 10 === 2010,
  franchise: (p) => p.team === '삼성',
  teamYear: (p) => p.team === '삼성' && p.year === 2014,
};
const hits = (s) => HIT[s.id] || ((p) => s.members([p]).length > 0);
/** 가성비 — 종합에서 평균(78 CP)보다 비싼 만큼을 뺀다. 종합만 보면 앞자리 투수가 CP 를 다 써 버린다 */
const value = (p) => p.overall - (p.cost - 78) * 0.5;

/** 경기 엔진이 보는 팀 전력 */
function power(roster) {
  const t = buildTeam('x', fillRoster(roster));
  const [sp] = t.sps; const pen = t.pen;
  const pitch = (sp ? t.pitchValue(sp) * 0.6 : 0) + pen.reduce((s, p) => s + t.pitchValue(p) * 0.1, 0);
  return { score: t.offense + pitch + t.defense * 0.25, t };
}

const lines = [];
const out = (t) => { lines.push(t); process.stdout.write(`${t}\n`); };
const sign = (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`;

test.skipIf(!process.env.SYN_BALANCE)('시너지 밸런스', () => {
  useSyn([]);
  const base = power(draftBy(value)).score;
  out('id|이름|종류|단계|인원|1단계가치|가치|노릴값');
  for (const s of ALL) {
    const hit = hits(s);
    const roster = draftBy((p) => value(p) + (hit(p) ? 40 : 0), hit);
    useSyn([]);
    const off = power(roster).score;
    useSyn([s]);
    const { score: on, t } = power(roster);
    const st = t.synergies.find((x) => x.id === s.id);
    // 1단계만 켰을 때의 가치 — 첫 단계 보너스를 최종 단계 자리에 넣어 본다
    const first = { ...s, tiers: [s.tiers[0]] };
    useSyn([first]);
    const one = power(roster).score - off;
    out(`${s.id}|${s.name}|${s.kind}|${st.level}/${s.tiers.length}|${st.count}|${sign(one)}|${sign(on - off)}|${sign(on - base)}`);
  }
  useSyn(ALL);
  fs.writeFileSync(process.env.OUT || 'synergy-report.txt', lines.join('\n'));
}, 600000);
