import type { BatterCard, PitcherCard } from '../data/types';
import type { SlotId } from './roster';

export interface TeamSetup {
  name: string;
  /** 타순대로 9명 */
  lineup: { card: BatterCard; slot: SlotId }[];
  /** [선발, 셋업, 마무리] */
  pitchers: { card: PitcherCard; slot: SlotId }[];
}

export interface BatLine { name: string; slot: SlotId; pa: number; ab: number; h: number; hr: number; rbi: number; r: number; bb: number; k: number; sb: number }
export interface PitchLine { name: string; slot: SlotId; outs: number; bf: number; h: number; r: number; bb: number; k: number; hr: number }
export interface TeamBox { name: string; line: (number | null)[]; runs: number; hits: number; bb: number; bat: BatLine[]; pitch: PitchLine[] }
export type EventKind = 'out' | 'k' | 'bb' | 'hbp' | 'hit' | 'hr' | 'sf' | 'dp' | 'sb' | 'cs' | 'change' | 'walkoff';
export interface GameEvent {
  kind: EventKind;
  /** 타자·주자 이름 (투수 교체 등은 없음) */
  who?: string;
  text: string;
  runs: number;
}
export interface HalfLog { inning: number; top: boolean; runs: number; events: GameEvent[] }
export interface GameResult {
  seed: number;
  away: TeamBox;
  home: TeamBox;
  halves: HalfLog[];
  winner: 'away' | 'home' | 'tie';
}

/** KBO 규정처럼 12회까지 동점이면 무승부 */
export const MAX_INNINGS = 12;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 능력치 70을 리그 평균(0)으로 보는 정규화 */
const norm = (v: number) => (v - 70) / 25;
const choose = <T>(rng: () => number, arr: T[]) => arr[Math.floor(rng() * arr.length)];

const HIT_DIR = ['좌익수 앞', '중견수 앞', '우익수 앞', '유격수 옆 빠지는', '1·2루간 빠지는', '3루선상'];
const GAP_DIR = ['좌중간', '우중간', '좌익선상', '우익선상'];
const HR_DIR = ['좌측 담장 넘기는', '좌중간 담장 넘기는', '가운데 담장 넘기는', '우중간 담장 넘기는', '우측 담장 넘기는'];
const GROUND = ['유격수 땅볼', '2루수 땅볼', '3루수 땅볼', '1루수 땅볼', '투수 땅볼'];
const FLY = ['좌익수 뜬공', '중견수 뜬공', '우익수 뜬공', '내야 뜬공'];
const LINE = ['유격수 직선타', '2루수 직선타', '중견수 직선타', '3루수 직선타'];

type Outcome = 'K' | 'BB' | 'HBP' | 'HR' | '3B' | '2B' | '1B' | 'GO' | 'FO' | 'LO';

function resolvePA(b: BatterCard, stu: number, ctl: number, defense: number, rng: () => number): Outcome {
  const con = norm(b.con), pow = norm(b.pow), eye = norm(b.eye), spd = norm(b.spd);
  const ps = norm(stu), pc = norm(ctl), d = norm(defense);
  const atLeast = (x: number, lo = 0.002) => Math.max(lo, x);
  const table: [Outcome, number][] = [
    ['K', atLeast(0.17 * (1 + 0.55 * ps - 0.45 * con - 0.1 * eye))],
    ['BB', atLeast(0.085 * (1 - 0.5 * pc + 0.5 * eye))],
    ['HBP', 0.008],
    ['HR', atLeast(0.026 * (1 + 1.1 * pow - 0.45 * ps - 0.15 * pc), 0.003)],
    ['3B', atLeast(0.004 * (1 + 1.5 * spd), 0.001)],
    ['2B', atLeast(0.045 * (1 + 0.35 * pow + 0.15 * spd - 0.2 * ps - 0.1 * d))],
    ['1B', atLeast(0.15 * (1 + 0.4 * con + 0.1 * spd - 0.25 * ps - 0.12 * d))],
  ];
  let r = rng();
  for (const [o, prob] of table) {
    if (r < prob) return o;
    r -= prob;
  }
  const t = rng();
  return t < 0.45 ? 'GO' : t < 0.8 ? 'FO' : 'LO';
}

interface TeamState {
  setup: TeamSetup;
  box: TeamBox;
  order: number;
  pitcherIdx: number;
  used: boolean[];
  defense: number;
  catcherDef: number;
}

function initTeam(setup: TeamSetup): TeamState {
  const fielders = setup.lineup.filter((l) => l.slot !== 'DH');
  return {
    setup,
    order: 0,
    pitcherIdx: 0,
    used: setup.pitchers.map((_, i) => i === 0),
    defense: fielders.reduce((s, l) => s + l.card.def, 0) / fielders.length,
    catcherDef: setup.lineup.find((l) => l.slot === 'C')?.card.def ?? 70,
    box: {
      name: setup.name, line: [], runs: 0, hits: 0, bb: 0,
      bat: setup.lineup.map((l) => ({ name: l.card.name, slot: l.slot, pa: 0, ab: 0, h: 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, sb: 0 })),
      pitch: setup.pitchers.map((p) => ({ name: p.card.name, slot: p.slot, outs: 0, bf: 0, h: 0, r: 0, bb: 0, k: 0, hr: 0 })),
    },
  };
}

/** 상대한 타자 수 기준 체력 한계 */
const staminaLimit = (slot: SlotId, sta: number) => (slot === 'SP' ? 14 + sta * 0.16 : 3 + sta * 0.06);

function currentPitcher(def: TeamState) {
  const { card, slot } = def.setup.pitchers[def.pitcherIdx];
  const over = Math.max(0, def.box.pitch[def.pitcherIdx].bf - staminaLimit(slot, card.sta));
  return { card, stu: card.stu - over * 1.5, ctl: card.ctl - over * 1.2 };
}

function managePitcher(def: TeamState, inning: number, inningStart: boolean, events: GameEvent[]) {
  const i = def.pitcherIdx;
  const { card, slot } = def.setup.pitchers[i];
  const line = def.box.pitch[i];
  const limit = staminaLimit(slot, card.sta);
  const free = (k: number) => k < def.used.length && !def.used[k];
  let next: number | null = null;

  if (inningStart && inning >= 9 && i !== 2 && free(2)) next = 2;
  else if (i === 0 && (line.bf >= limit + (inningStart ? -2 : 3) || line.r >= 6)) next = free(1) ? 1 : free(2) ? 2 : null;
  else if (i === 1 && line.bf >= limit + (inningStart ? 0 : 3)) next = free(2) ? 2 : null;

  if (next !== null) {
    def.pitcherIdx = next;
    def.used[next] = true;
    events.push({ kind: 'change', text: `투수 교체 ${card.name} → ${def.setup.pitchers[next].card.name}`, runs: 0 });
  }
}

function playHalf(off: TeamState, def: TeamState, inning: number, top: boolean, rng: () => number, isWalkoff: () => boolean): HalfLog {
  const events: GameEvent[] = [];
  const log: HalfLog = { inning, top, runs: 0, events };
  off.box.line.push(0);
  const li = off.box.line.length - 1;
  managePitcher(def, inning, true, events);

  let outs = 0;
  let bases: (number | null)[] = [null, null, null];
  const spdOf = (idx: number) => norm(off.setup.lineup[idx].card.spd);
  const score = (runner: number, rbiBatter: number | null) => {
    off.box.bat[runner].r++;
    off.box.runs++;
    off.box.line[li] = (off.box.line[li] ?? 0) + 1;
    log.runs++;
    def.box.pitch[def.pitcherIdx].r++;
    if (rbiBatter !== null) off.box.bat[rbiBatter].rbi++;
  };

  while (outs < 3) {
    // 도루 시도: 1루 주자, 2루 비었을 때
    const r1 = bases[0];
    if (r1 !== null && bases[1] === null && outs < 2) {
      const runner = off.setup.lineup[r1].card;
      if (rng() < Math.max(0, (runner.spd - 72) / 120)) {
        const success = Math.min(0.92, Math.max(0.4, 0.62 + 0.3 * norm(runner.spd) - 0.12 * norm(def.catcherDef)));
        bases[0] = null;
        if (rng() < success) {
          bases[1] = r1;
          off.box.bat[r1].sb++;
          events.push({ kind: 'sb', who: runner.name, text: '2루 도루 성공', runs: 0 });
        } else {
          outs++;
          def.box.pitch[def.pitcherIdx].outs++;
          events.push({ kind: 'cs', who: runner.name, text: '2루 도루 실패', runs: 0 });
          if (outs >= 3) break;
        }
      }
    }

    const bi = off.order;
    off.order = (off.order + 1) % off.setup.lineup.length;
    const batter = off.setup.lineup[bi].card;
    const pitcher = currentPitcher(def);
    const pl = def.box.pitch[def.pitcherIdx];
    const bl = off.box.bat[bi];
    pl.bf++;
    bl.pa++;

    const before = off.box.runs;
    const outcome = resolvePA(batter, pitcher.stu, pitcher.ctl, def.defense, rng);
    const hit = () => { bl.ab++; bl.h++; pl.h++; off.box.hits++; kind = 'hit'; };
    let text = '';
    let kind: EventKind = 'out';

    switch (outcome) {
      case 'K':
        outs++; pl.outs++; bl.ab++; bl.k++; pl.k++;
        text = '삼진';
        kind = 'k';
        break;
      case 'BB':
      case 'HBP': {
        if (outcome === 'BB') { bl.bb++; pl.bb++; off.box.bb++; }
        if (bases[0] !== null) {
          if (bases[1] !== null) {
            if (bases[2] !== null) score(bases[2], bi);
            bases[2] = bases[1];
          }
          bases[1] = bases[0];
        }
        bases[0] = bi;
        text = outcome === 'BB' ? '볼넷' : '몸에 맞는 공';
        kind = outcome === 'BB' ? 'bb' : 'hbp';
        break;
      }
      case 'HR':
        hit(); bl.hr++; pl.hr++;
        kind = 'hr';
        bases.forEach((r) => { if (r !== null) score(r, bi); });
        score(bi, bi);
        bases = [null, null, null];
        text = `${choose(rng, HR_DIR)} 홈런!`;
        break;
      case '3B':
        hit();
        bases.forEach((r) => { if (r !== null) score(r, bi); });
        bases = [null, null, bi];
        text = `${choose(rng, GAP_DIR)} 3루타`;
        break;
      case '2B': {
        hit();
        const [a, b2, c] = bases;
        if (c !== null) score(c, bi);
        if (b2 !== null) score(b2, bi);
        let third: number | null = null;
        if (a !== null) {
          if (rng() < 0.4 + 0.3 * spdOf(a) + (outs === 2 ? 0.2 : 0)) score(a, bi);
          else third = a;
        }
        bases = [null, bi, third];
        text = `${choose(rng, GAP_DIR)} 2루타`;
        break;
      }
      case '1B': {
        hit();
        const [a, b2, c] = bases;
        const nb: (number | null)[] = [bi, null, null];
        if (c !== null) score(c, bi);
        if (b2 !== null) {
          if (rng() < 0.55 + 0.25 * spdOf(b2) + (outs === 2 ? 0.25 : 0)) score(b2, bi);
          else nb[2] = b2;
        }
        if (a !== null) {
          if (nb[2] === null && rng() < 0.25 + 0.2 * spdOf(a)) nb[2] = a;
          else nb[1] = a;
        }
        bases = nb;
        text = `${choose(rng, HIT_DIR)} 안타`;
        break;
      }
      case 'GO':
        bl.ab++;
        if (bases[0] !== null && outs < 2 && rng() < 0.45 * (1 - 0.3 * norm(batter.spd))) {
          outs += 2; pl.outs += 2;
          bases[0] = null;
          text = '병살타';
          kind = 'dp';
          if (outs < 3 && bases[2] !== null && rng() < 0.5) { score(bases[2], null); bases[2] = null; }
        } else {
          outs++; pl.outs++;
          text = choose(rng, GROUND);
          if (outs < 3) {
            if (bases[2] !== null && rng() < 0.45) { score(bases[2], bi); bases[2] = null; }
            if (bases[1] !== null && bases[2] === null && rng() < 0.5) { bases[2] = bases[1]; bases[1] = null; }
            if (bases[0] !== null && bases[1] === null) { bases[1] = bases[0]; bases[0] = null; }
          }
        }
        break;
      case 'FO':
        outs++; pl.outs++;
        if (outs < 3 && bases[2] !== null && rng() < 0.55 + 0.2 * spdOf(bases[2])) {
          score(bases[2], bi);
          bases[2] = null;
          text = '희생플라이';
          kind = 'sf';
        } else {
          bl.ab++;
          text = choose(rng, FLY);
        }
        if (outs < 3 && bases[1] !== null && bases[2] === null && rng() < 0.3) { bases[2] = bases[1]; bases[1] = null; }
        break;
      case 'LO':
        outs++; pl.outs++; bl.ab++;
        text = choose(rng, LINE);
        break;
    }

    events.push({ kind, who: batter.name, text, runs: off.box.runs - before });
    if (!top && isWalkoff()) {
      events.push({ kind: 'walkoff', text: '끝내기!', runs: 0 });
      break;
    }
    if (outs < 3) managePitcher(def, inning, false, events);
  }
  return log;
}

export function simulateGame(away: TeamSetup, home: TeamSetup, seed: number = Date.now()): GameResult {
  const rng = mulberry32(seed);
  const A = initTeam(away);
  const H = initTeam(home);
  const halves: HalfLog[] = [];

  for (let inning = 1; inning <= MAX_INNINGS; inning++) {
    halves.push(playHalf(A, H, inning, true, rng, () => false));
    if (inning >= 9 && H.box.runs > A.box.runs) {
      H.box.line.push(null); // 말 공격 없음
      break;
    }
    halves.push(playHalf(H, A, inning, false, rng, () => inning >= 9 && H.box.runs > A.box.runs));
    if (inning >= 9 && H.box.runs !== A.box.runs) break;
  }

  const winner = A.box.runs > H.box.runs ? 'away' : H.box.runs > A.box.runs ? 'home' : 'tie';
  return { seed, away: A.box, home: H.box, halves, winner };
}

export const inningsPitched = (outs: number) => `${Math.floor(outs / 3)}${outs % 3 ? `.${outs % 3}` : ''}`;
