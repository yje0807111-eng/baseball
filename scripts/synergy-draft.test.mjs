/* 실제 드래프트 흐름으로 시너지가 얼마나 모이는지. 기본 테스트에서는 건너뛰고, 필요할 때만:
   SYN_DRAFT=1 npx vitest run scripts/synergy-draft.test.mjs
   드래프트는 20 라운드, 라운드마다 시리즈 하나(대개 한 팀의 한 시즌)를 열어 선반 17명 가운데 한 명을 고른다.
   아직 안 나온 시리즈가 먼저 나오고, 시리즈 새로고침은 3번.
   시너지마다 두 사람을 둔다 — '노림'은 조건 선수를 먼저 고르고 선반에 없으면 새로고침한다, '안 노림'은 가성비만 본다.
   결과: 모드별로 시너지가 1단계 이상 · 최종 단계까지 켜진 판의 비율. */
import { test } from 'vitest';
import fs from 'node:fs';
import {
  DRAFT_MODES, SYNERGIES, fillRoster, buildTeam,
} from '../src/KboAugmentDraft.jsx';
import { draft, hitterFor, mulberry32 } from './draft-sim.mjs';

const N = Number(process.env.N || 40);
const SEED = Number(process.env.SEED || 1234);
const MODES = (process.env.MODES || 'mix,champ,legend,y2014').split(',');

const lines = [];
const out = (t) => { lines.push(t); process.stdout.write(`${t}\n`); };
const pct = (n) => `${Math.round((n / N) * 100)}`.padStart(3);

test.skipIf(!process.env.SYN_DRAFT)('시너지 — 실제 드래프트로 모이는 정도', () => {
  const modes = MODES.map((id) => DRAFT_MODES.find((m) => m.id === id)).filter(Boolean);
  out(`N=${N} SEED=${SEED}  칸: 노림 1단계%/최종% · 안 노림 1단계%/최종%`);
  out(`id|이름|${modes.map((m) => m.id).join('|')}`);
  for (const s of SYNERGIES) {
    const cells = modes.map((mode) => {
      const tally = { a1: 0, aF: 0, b1: 0, bF: 0 };
      for (let i = 0; i < N; i++) {
        const seed = SEED + i * 7919;
        const chase = buildTeam('x', fillRoster(draft(mode, mulberry32(seed), hitterFor(s)))).synergies.find((x) => x.id === s.id);
        const plain = buildTeam('x', fillRoster(draft(mode, mulberry32(seed), null))).synergies.find((x) => x.id === s.id);
        if (chase.level > 0) tally.a1++; if (chase.level === s.tiers.length) tally.aF++;
        if (plain.level > 0) tally.b1++; if (plain.level === s.tiers.length) tally.bF++;
      }
      return `${pct(tally.a1)}/${pct(tally.aF)} · ${pct(tally.b1)}/${pct(tally.bF)}`;
    });
    out(`${s.id}|${s.name}|${cells.join('|')}`);
  }
  fs.writeFileSync(process.env.OUT || 'synergy-draft.txt', lines.join('\n'));
}, 3600000);
