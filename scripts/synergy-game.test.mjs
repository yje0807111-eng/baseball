/* 시너지를 실제 경기로 확인. 기본 테스트에서는 건너뛰고, 필요할 때만:
   SYN_GAME=1 npx vitest run scripts/synergy-game.test.mjs
   실제 드래프트 흐름(draft-sim)으로 시너지를 노려 뽑은 엔트리를 만들고, 시너지를 켰을 때와 껐을 때 경기 득실차를 견준다.
   전력 점수(synergy-balance 의 잣대)도 같이 적어, 정적 잣대가 실제 경기와 맞는지 본다.
   맨 아래 줄은 눈금 맞추기 — 같은 엔트리에 증강 '근력 운동'(전력 4점)을 들었을 때의 득실차. */
import { test } from 'vitest';
import fs from 'node:fs';
import {
  DRAFT_MODES, SYNERGIES, AUGMENTS, aiDraft, fillRoster, buildTeam, teamEnv, runSimulation,
} from '../src/KboAugmentDraft.jsx';
import { draft, hitterFor, mulberry32 } from './draft-sim.mjs';

const R = Number(process.env.R || 6); // 전략마다 뽑는 엔트리 수
const G = Number(process.env.G || 30); // 엔트리마다 치르는 경기 수
const SEED = Number(process.env.SEED || 1234);
const ALL = [...SYNERGIES];
const useSyn = (list) => { SYNERGIES.splice(0, SYNERGIES.length, ...list); };
const mode = (id) => DRAFT_MODES.find((m) => m.id === id);

const PLAN = [
  [null, 'mix'], ['power', 'mix'], ['contactLine', 'mix'], ['speedLine', 'mix'], ['leftLine', 'mix'],
  ['fireball', 'mix'], ['finesse', 'mix'], ['battery', 'mix'], ['infieldNet', 'mix'],
  ['franchise', 'legend'], ['franchise', 'champ'], ['mercenary', 'recent'], ['beijing', 'national'], [null, 'legend'], [null, 'y2014'],
];

function power(t) {
  const [sp] = t.sps;
  return t.offense + (sp ? t.pitchValue(sp) * 0.6 : 0) + t.pen.reduce((a, p) => a + t.pitchValue(p) * 0.1, 0) + t.defense * 0.25;
}

/** 한 엔트리로 G 경기 — 시너지 켬 · 끔 (증강을 주면 둘 다 시너지 켬, 증강만 다르게) */
async function versus(m, roster, seed0, aug = null) {
  let dOn = 0; let dOff = 0;
  for (let i = 0; i < G; i++) {
    const seed = seed0 + i * 7919;
    useSyn(ALL);
    const opp = buildTeam('AI', fillRoster(aiDraft({ players: m.players, cap: m.cap, rng: mulberry32(seed + 13) })), 0);
    const env = teamEnv(opp, { w: 2, l: 1, d: 0 });
    const play = async (augs) => {
      const make = () => buildTeam('나', fillRoster(roster), 0, augs, env);
      const res = await runSimulation({ my: make(), opp, augments: augs, rng: mulberry32(seed), fast: true, rebuildMy: make });
      return res.score.my - res.score.opp;
    };
    if (aug) { useSyn(ALL); dOn += await play([aug]); dOff += await play([]); } else { useSyn(ALL); dOn += await play([]); useSyn([]); dOff += await play([]); }
  }
  useSyn(ALL);
  return (dOn - dOff) / G;
}

const lines = [];
const out = (t) => { lines.push(t); process.stdout.write(`${t}\n`); };
const sign = (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`;

test.skipIf(!process.env.SYN_GAME)('시너지 — 실제 경기', async () => {
  out(`R=${R} G=${G} SEED=${SEED}`);
  out('전략|모드|목표단계(평균)|전력점수|득실차');
  const muscle = AUGMENTS.find((a) => a.id === 'muscle');
  let calPts = 0; let calRuns = 0;
  for (const [id, modeId] of PLAN) {
    const m = mode(modeId); const s = id && ALL.find((x) => x.id === id);
    let pts = 0; let gd = 0; let lv = 0;
    for (let r = 0; r < R; r++) {
      const roster = draft(m, mulberry32(SEED + r * 104729), s ? hitterFor(s) : null);
      useSyn([]); const off = power(buildTeam('x', fillRoster(roster)));
      useSyn(ALL); const t = buildTeam('x', fillRoster(roster)); const on = power(t);
      pts += on - off;
      if (s) lv += t.synergies.find((x) => x.id === s.id).level;
      gd += await versus(m, roster, SEED + r * 31);
      if (!id) { calPts += await versus(m, roster, SEED + r * 31, muscle); calRuns++; }
    }
    out(`${s ? s.name : '안 노림(가성비)'}|${modeId}|${s ? `${(lv / R).toFixed(1)}/${s.tiers.length}` : '-'}|${sign(pts / R)}|${sign(gd / R)}`);
  }
  out(`근력 운동(전력 4점)|mix|-|+4.00|${sign(calPts / calRuns)}`);
  fs.writeFileSync(process.env.OUT || 'synergy-game.txt', lines.join('\n'));
}, 3600000);
