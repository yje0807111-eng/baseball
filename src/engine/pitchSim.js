/*
 * 공 하나 단위 경기 엔진 (UI 없음)
 *
 * const g = createGame({ home, away, rng })       // home = 사용자 팀(말 공격)
 * const ev = pitch(g, orders)                     // 공 하나 진행, g 를 직접 바꾸고 이벤트를 돌려준다
 * while (!g.final) pitch(g)
 *
 * 팀: { name, batters: [9명, 타순], pitchers: [선발, 불펜...], catcher?, buff?, edge?, usage? }
 *   buff: 팀 전체 보정(능력치 점수) — 타자 컨택·파워, 투수 구위·제구에 더한다. AI 난이도 · 전력 보정
 *   edge: { bat, pit } 효과형 증강의 팀 보너스 — bat 은 타자 컨택·파워, pit 은 투수 구위·제구에 buff 와 함께 더한다
 *   usage.fatigueGrace: 투수가 지치기 시작하는 투구 수 여유 (증강 투수 운용)
 *   타자 stats: contact · power · speed · defense   투수 stats: stuff · control · stability
 * orders (공격 측 지시, 없으면 자동):
 *   { steal: 0|1 (1루→2루 | 2루→3루), bunt: true, hitAndRun: true, guess: 'fast'|'slider'|'change' }
 * orders (수비 측 지시):
 *   { ibb: true, pitchType: 'fast'|'slider'|'change', zone: 0~8 | 'chase', changePitcher: true }
 */

export const PITCHES = {
  fast: { name: '직구', speed: [138, 156] },
  slider: { name: '슬라이더', speed: [124, 138] },
  change: { name: '체인지업', speed: [118, 132] },
};
export const RESULT_LABEL = {
  K: '삼진', BB: '볼넷', IBB: '고의사구', '1B': '안타', '2B': '2루타', '3B': '3루타', HR: '홈런',
  GO: '땅볼 아웃', FO: '뜬공 아웃', LO: '직선타 아웃', DP: '병살타', SF: '희생플라이', SAC: '희생번트', BH: '번트 안타', E: '실책 출루',
  SB: '도루 성공', CS: '도루 실패',
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const st = (p, k, d = 70) => p?.stats?.[k] ?? d;
const tb = (side, kind) => (side?.team?.buff || 0) + (side?.team?.edge?.[kind] || 0); // 팀 보정 + 증강 팀 보너스

export function pitchMix(pitcher) {
  const fast = clamp(0.4 + (st(pitcher, 'stuff', 80) - 80) * 0.015, 0.3, 0.65);
  return { fast, slider: (1 - fast) * 0.6, change: (1 - fast) * 0.4 };
}

/** 증강 보정: 공격 쪽 hit(안타 확률 +) · hitMul(×) · hr(홈런 확률 +) · steal(도루 +), 수비 쪽 pitch(구위 · 제구 점수 +) */
export const noMod = () => ({ hit: 0, hitMul: 1, hr: 0, steal: 0, pitch: 0 });

function newSide(team) {
  return { team, idx: 0, pitcher: team.pitchers[0], pitcherIdx: 0, pitches: 0, runs: 0, hits: 0, errors: 0, line: [], mod: noMod() };
}

/** 반 이닝마다 보정을 새로 깐다 (증강 어댑터가 부른다) */
export function setMods(g, { home = noMod(), away = noMod() } = {}) {
  g.home.mod = { ...noMod(), ...home };
  g.away.mod = { ...noMod(), ...away };
}

/** 증강이 이닝 점수를 보정할 때: 그 이닝 그 팀 점수를 n 만큼 더하거나 뺀다 (음수면 지운다) */
export function addRuns(g, n, inning = g.inning, sideKey = null) {
  if (!n) return 0;
  const off = sideKey ? g[sideKey] : offenseOf(g);
  const cur = off.line[inning - 1] ?? 0;
  const next = Math.max(0, cur + n);
  const delta = next - cur;
  off.line[inning - 1] = next;
  off.runs += delta;
  if (!g.top && g.inning >= 9 && g.home.runs > g.away.runs) finish(g);
  return delta;
}

/** 경기 중 증강으로 팀 능력치가 바뀌면 갈아 끼운다 (타순 자리 · 지금 던지는 투수는 그대로) */
export function replaceTeam(side, team) {
  side.team = team;
  side.pitcher = team.pitchers[side.pitcherIdx] || team.pitchers[0] || side.pitcher;
}

export function createGame({ home, away, rng = Math.random, maxInnings = 12 }) {
  return {
    rng, maxInnings,
    home: newSide(home), away: newSide(away),
    inning: 1, top: true, outs: 0, balls: 0, strikes: 0,
    bases: [null, null, null],
    final: false, winner: null,
    events: [],
  };
}

export const offenseOf = (g) => (g.top ? g.away : g.home);
export const defenseOf = (g) => (g.top ? g.home : g.away);
export const batterOf = (g) => { const o = offenseOf(g); return o.team.batters[o.idx % o.team.batters.length]; };
export const pitcherOf = (g) => defenseOf(g).pitcher;

/* 주자 · 아웃 → 이 타석이 점수로 이어질 무게 (실제 득점 기대값 표를 거칠게 따온 값) */
const BASE_WEIGHT = {
  '000': [0.30, 0.20, 0.12], '100': [0.52, 0.38, 0.22], '010': [0.66, 0.50, 0.30], '001': [0.78, 0.66, 0.40],
  '110': [0.82, 0.62, 0.38], '101': [0.88, 0.72, 0.44], '011': [0.94, 0.80, 0.50], '111': [1.00, 0.88, 0.56],
};
/**
 * 승부처 무게 0~1 — 늦은 이닝일수록 · 점수가 붙어 있을수록 · 주자가 쌓일수록 높다.
 * 1회는 남은 기회가 여덟 번이라 만루여도 승부처가 아니다.
 */
export function leverage(g) {
  const key = g.bases.map((b) => (b ? 1 : 0)).join('');
  const base = (BASE_WEIGHT[key] || BASE_WEIGHT['000'])[Math.min(2, g.outs)];
  const late = Math.min(1, (Math.min(g.inning, 9) - 1) / 8);
  const inningW = 0.18 + 0.82 * late ** 1.6;
  const closeW = Math.max(0.12, 1 - Math.abs(g.home.runs - g.away.runs) / 5);
  return base * inningW * closeW;
}
/** 멈추고 물을 만한 자리 — 80경기를 돌려 경기당 두어 번 걸리게 맞춘 문턱 */
export const CLUTCH_MARK = 0.15;
/** 감독이 손댈 수 있는 횟수 — 승부처는 더 자주 오지만 이만큼만 쓴다 */
export const CLUTCH_LIMIT = 3;
export const isClutch = (g) => leverage(g) >= CLUTCH_MARK;

/** 도루 성공 확률: 주자 스피드 vs 포수 수비 */
export function stealOdds(g, from) {
  const runner = g.bases[from];
  if (!runner || g.bases[from + 1]) return 0;
  const catcher = defenseOf(g).team.catcher || defenseOf(g).team.batters.find((p) => p.position === 'C');
  return clamp(0.42 + (st(runner, 'speed') - 70) * 0.02 - (st(catcher, 'defense') - 70) * 0.01 - (from === 1 ? 0.08 : 0) + (offenseOf(g).mod?.steal || 0), 0.08, 0.95);
}

/** 투수 체력: 안정성이 높을수록 오래 버틴다. 넘으면 구위·제구가 떨어진다 */
function fatigue(side) {
  const limit = 70 + (st(side.pitcher, 'stability', 75) - 70) * 1.2 - (side.pitcherIdx ? 45 : 0) + (side.team.usage?.fatigueGrace || 0);
  return clamp((side.pitches - limit) / 40, 0, 1);
}

function choosePitch(g, pitcher, order) {
  const r = g.rng();
  const mix = pitchMix(pitcher);
  const type = order?.pitchType || (r < mix.fast ? 'fast' : r < mix.fast + mix.slider ? 'slider' : 'change');
  /* 구종을 찍어 승부하면 그 투수가 자주 쓰는 공일수록 힘이 실린다 (주무기 +, 안 쓰던 공 −) */
  const picked = order?.pitchType ? (mix[type] ?? 0.2) - 0.33 : 0;
  const tired = fatigue(defenseOf(g));
  const control = st(pitcher, 'control', 75) - tired * 12 + (defenseOf(g).mod?.pitch || 0) + tb(defenseOf(g), 'pit');
  // 존 안으로 들어갈 확률: 제구 + 볼카운트(볼이 많으면 존으로)
  let inZone = clamp(0.41 + (control - 75) * 0.006 + g.balls * 0.05 - g.strikes * 0.03, 0.28, 0.72);
  let zone;
  if (order?.zone === 'chase') inZone = Math.min(inZone, 0.25);
  /* 코스를 찍으면 존 구석을 노린다 — 들어갈 확률은 조금 오르지만 맞히기는 어렵다 */
  if (typeof order?.zone === 'number') { inZone = clamp(inZone + 0.06, 0, 0.9); zone = order.zone; }
  const isIn = g.rng() < inZone;
  if (!isIn) zone = null;
  else if (zone == null) zone = Math.floor(g.rng() * 9);
  const [lo, hi] = PITCHES[type].speed;
  /* 구위 60 이면 그 구종의 가장 느린 쪽, 105 면 가장 빠른 쪽 — 능력치 눈금(50~110)에 맞춘 폭 */
  const velo = Math.round(lo + (hi - lo) * clamp((st(pitcher, 'stuff', 79) - 60 + (defenseOf(g).mod?.pitch || 0) + tb(defenseOf(g), 'pit')) / 45, 0, 1) - tired * 4 + (g.rng() - 0.5) * 3);
  return { type, zone, inZone: isIn, velo, tired, picked, corner: typeof order?.zone === 'number' };
}

function advance(g, n, batter, extra = {}) {
  // n 루씩 진루(4 = 홈런). extra.scoreFrom2 · scoreFrom1: 추가 진루 확률
  const scored = [];
  const next = [null, null, null];
  for (let i = 2; i >= 0; i--) {
    const r = g.bases[i];
    if (!r) continue;
    let to = i + n;
    if (n === 1 && i === 1 && g.rng() < (extra.scoreFrom2 ?? 0.6)) to = 3;
    if (n === 1 && i === 0 && extra.hitAndRun) to = 2;
    if (n === 2 && i === 0 && g.rng() < (extra.scoreFrom1 ?? 0.4)) to = 3;
    if (to >= 3) scored.push(r);
    else if (next[to]) { next[to + 1 >= 3 ? 2 : to + 1] = r; } // 드물게 겹치면 한 칸 더
    else next[to] = r;
  }
  if (n >= 4) scored.push(batter);
  else if (batter) next[n - 1] = batter;
  g.bases = next;
  return scored;
}

function forceWalk(g, batter) {
  const scored = [];
  if (g.bases[0]) {
    if (g.bases[1]) { if (g.bases[2]) scored.push(g.bases[2]); g.bases[2] = g.bases[1]; }
    g.bases[1] = g.bases[0];
  }
  g.bases[0] = batter;
  return scored;
}

function endHalfIfNeeded(g) {
  if (g.outs < 3) return;
  const off = offenseOf(g);
  off.line[g.inning - 1] = off.line[g.inning - 1] ?? 0;
  g.outs = 0; g.balls = 0; g.strikes = 0; g.bases = [null, null, null];
  if (g.top) {
    // 9회초 이후 홈팀이 이기고 있으면 말 공격 없이 종료
    if (g.inning >= 9 && g.home.runs > g.away.runs) { g.home.line[g.inning - 1] = 'X'; return finish(g); }
    g.top = false;
  } else {
    if (g.inning >= 9 && g.home.runs !== g.away.runs) return finish(g);
    if (g.inning >= g.maxInnings) return finish(g);
    g.inning += 1; g.top = true;
  }
}
function finish(g) {
  g.final = true;
  g.winner = g.home.runs > g.away.runs ? 'home' : g.away.runs > g.home.runs ? 'away' : 'draw';
}

function score(g, runners) {
  if (!runners.length) return 0;
  const off = offenseOf(g);
  off.runs += runners.length;
  off.line[g.inning - 1] = (off.line[g.inning - 1] ?? 0) + runners.length;
  // 끝내기
  if (!g.top && g.inning >= 9 && g.home.runs > g.away.runs) finish(g);
  return runners.length;
}

function nextBatter(g) {
  offenseOf(g).idx += 1;
  g.balls = 0; g.strikes = 0;
}

/** 공 하나. 결과 이벤트를 돌려주고 g 를 갱신한다 */
export function pitch(g, orders = {}) {
  if (g.final) return null;
  const off = offenseOf(g);
  const def = defenseOf(g);
  const batter = batterOf(g);
  if (orders.changePitcher) {
    // id 를 주면 그 투수를 다음 순번으로 당겨 온다 (이미 던진 투수 · 지금 투수는 고를 수 없다)
    if (typeof orders.changePitcher === 'string') {
      const list = def.team.pitchers;
      const at = list.findIndex((x, i) => i > def.pitcherIdx && x.id === orders.changePitcher);
      if (at > def.pitcherIdx + 1) {
        const [pick] = list.splice(at, 1);
        list.splice(def.pitcherIdx + 1, 0, pick);
      }
    }
    if (def.team.pitchers[def.pitcherIdx + 1]) {
      def.pitcherIdx += 1; def.pitcher = def.team.pitchers[def.pitcherIdx]; def.pitches = 0;
    }
  }
  const pitcher = def.pitcher;
  const ev = { inning: g.inning, top: g.top, batter, pitcher, orders, before: { outs: g.outs, balls: g.balls, strikes: g.strikes, bases: [...g.bases] } };
  let runs = 0;

  // 고의사구
  if (orders.ibb) {
    runs += score(g, forceWalk(g, batter));
    Object.assign(ev, { call: 'ibb', result: 'IBB' });
    nextBatter(g);
    return wrap(g, ev, runs);
  }

  // 도루(투구와 함께 출발)
  if (orders.steal != null && g.bases[orders.steal] && !g.bases[orders.steal + 1]) {
    const from = orders.steal;
    const ok = g.rng() < stealOdds(g, from);
    ev.steal = { from, runner: g.bases[from], ok };
    if (ok) { g.bases[from + 1] = g.bases[from]; g.bases[from] = null; }
    else { g.bases[from] = null; g.outs += 1; if (g.outs >= 3) { Object.assign(ev, { call: 'none', result: 'CS' }); nextBatter(g); endHalfIfNeeded(g); return wrap(g, ev, 0); } }
  }

  const p = choosePitch(g, pitcher, orders);
  def.pitches += 1;
  Object.assign(ev, { pitch: p });

  const contact = st(batter, 'contact') + tb(off, 'bat');
  const power = st(batter, 'power') + tb(off, 'bat');
  const stuff = st(pitcher, 'stuff', 80) - p.tired * 10 + (def.mod?.pitch || 0) + tb(def, 'pit') + p.picked * 30;
  /* 구종을 맞히면 크게 붙고, 빗나가면 그만큼 헛돈다 */
  const guessBonus = orders.guess ? (orders.guess === p.type ? 0.14 : -0.1) : 0;
  const cornerPen = p.corner ? 0.07 : 0; // 구석에 꽂힌 공은 맞히기 어렵다

  // 스윙 여부
  let swing;
  if (orders.bunt || orders.hitAndRun) swing = true;
  else if (p.inZone) swing = g.rng() < clamp(0.66 + g.strikes * 0.08, 0, 0.92);
  else swing = g.rng() < clamp(0.24 - (contact - 70) * 0.006 + g.strikes * 0.1 + (orders.guess === p.type ? -0.05 : 0), 0.06, 0.55);

  if (!swing) {
    if (p.inZone) { g.strikes += 1; ev.call = 'called'; }
    else { g.balls += 1; ev.call = 'ball'; }
  } else {
    const hitProb = clamp((p.inZone ? 0.82 : 0.56) + (contact - 75) * 0.006 - (stuff - 78) * 0.007 + guessBonus - cornerPen + (orders.bunt ? 0.08 : 0) + (off.mod?.hit || 0) * 0.5, 0.35, 0.96);
    if (g.rng() >= hitProb) { g.strikes += 1; ev.call = 'swinging'; if (orders.bunt && g.strikes >= 3) ev.buntK = true; }
    else if (g.rng() < (orders.bunt ? 0.3 : 0.42)) { ev.call = 'foul'; if (g.strikes < 2) g.strikes += 1; else if (orders.bunt) { g.strikes = 3; ev.buntK = true; } }
    else { ev.call = 'inplay'; runs += inPlay(g, ev, batter, pitcher, p, orders, guessBonus); }
  }

  if (ev.call !== 'inplay') {
    if (g.strikes >= 3) { ev.result = 'K'; g.outs += 1; nextBatter(g); }
    else if (g.balls >= 4) { ev.result = 'BB'; runs += score(g, forceWalk(g, batter)); nextBatter(g); }
  }
  endHalfIfNeeded(g);
  return wrap(g, ev, runs);
}

function inPlay(g, ev, batter, pitcher, p, orders, guessBonus) {
  const def = defenseOf(g);
  const off = offenseOf(g);
  const contact = st(batter, 'contact') + tb(off, 'bat');
  const power = st(batter, 'power') + tb(off, 'bat');
  const speed = st(batter, 'speed');
  const stuff = st(pitcher, 'stuff', 80) - p.tired * 10 + (def.mod?.pitch || 0) + tb(def, 'pit');
  const defAvg = def.team.batters.reduce((s, x) => s + st(x, 'defense'), 0) / def.team.batters.length;
  let runs = 0;
  nextBatter(g);

  if (orders.bunt) {
    const r = g.rng();
    if (r < 0.08) { ev.result = 'FO'; g.outs += 1; ev.text = '번트가 떠 버렸다'; return 0; }
    if (r < 0.08 + clamp(0.06 + (speed - 70) * 0.01, 0.02, 0.3)) { ev.result = 'BH'; runs += score(g, advance(g, 1, batter, { scoreFrom2: 0 })); off.hits += 1; return runs; }
    ev.result = 'SAC'; g.outs += 1;
    if (g.outs < 3) runs += score(g, advance(g, 1, null, { scoreFrom2: 0 }));
    return runs;
  }

  // 실책
  if (g.rng() < clamp(0.018 - (defAvg - 75) * 0.001, 0.004, 0.04)) {
    ev.result = 'E'; def.errors += 1;
    return score(g, advance(g, 1, batter, { scoreFrom2: 0.7 }));
  }

  const hit = clamp((0.33 + (contact - 75) * 0.005 + (power - 75) * 0.002 - (stuff - 78) * 0.004 - (defAvg - 75) * 0.003 + guessBonus * 0.5 + (p.inZone ? 0.02 : -0.06) + (off.mod?.hit || 0)) * (off.mod?.hitMul ?? 1), 0.1, 0.62);
  if (g.rng() < hit) {
    off.hits += 1;
    const hr = clamp(0.03 + (power - 65) * 0.0075 + (p.zone === 4 ? 0.04 : 0) + (off.mod?.hr || 0), 0.01, 0.5);
    const tri = clamp(0.015 + (speed - 75) * 0.002, 0, 0.06);
    const dbl = clamp(0.18 + (power - 70) * 0.004, 0.08, 0.35);
    const r = g.rng();
    const kind = r < hr ? 'HR' : r < hr + tri ? '3B' : r < hr + tri + dbl ? '2B' : '1B';
    ev.result = kind;
    return score(g, advance(g, { '1B': 1, '2B': 2, '3B': 3, HR: 4 }[kind], batter, { hitAndRun: orders.hitAndRun, scoreFrom2: 0.55 + (speed - 70) * 0.01 }));
  }

  // 아웃
  const r = g.rng();
  const fly = clamp(0.38 + (power - 70) * 0.008, 0.2, 0.65);
  if (r < fly) {
    ev.result = 'FO'; g.outs += 1;
    if (g.bases[2] && g.outs < 3 && g.rng() < 0.62) { ev.result = 'SF'; const runner = g.bases[2]; g.bases[2] = null; runs += score(g, [runner]); }
    return runs;
  }
  if (r < fly + 0.12) { ev.result = 'LO'; g.outs += 1; return 0; }
  ev.result = 'GO'; g.outs += 1;
  if (g.bases[0] && g.outs < 3 && !orders.hitAndRun && g.rng() < clamp(0.5 - (speed - 70) * 0.01, 0.2, 0.7)) {
    ev.result = 'DP'; g.outs += 1; g.bases[0] = null;
  }
  if (g.outs < 3) {
    // 땅볼 진루: 선행 주자 한 칸씩(1루 주자는 병살이 아니면 2루로)
    const moved = [null, g.bases[0], g.bases[1]];
    const scored = g.bases[2] && g.outs < 3 && g.rng() < 0.5 ? [g.bases[2]] : [];
    if (!scored.length && g.bases[2]) moved[2] = moved[2] || g.bases[2];
    g.bases = moved;
    runs += score(g, scored);
  }
  return runs;
}

/*
 * 타구가 어디로 갔는지 — 결과에 맞는 방향·발사각·비거리를 붙인다.
 * 화면(플레이 뷰·해설)에서만 쓰고 경기 결과에는 영향을 주지 않는다. 결과가 먼저 정해진 뒤에 부른다.
 *   dir  -1 좌측 파울라인 ~ 0 중앙 ~ +1 우측 파울라인
 *   loft 발사각(도) · dist 0 홈플레이트 ~ 1 펜스
 *   by   공을 처리하는 야수 (P C 1B 2B 3B SS LF CF RF)
 */
const between = (rng, a, b) => a + rng() * (b - a);
/** 좌우 어느 쪽으로 갈지 — 크게 당긴 타구일수록 파울라인 쪽 */
const pull = (rng, near, far) => (rng() < 0.5 ? -1 : 1) * between(rng, near, far);

export function hitLocation(rng, result, { power = 75, speed = 70 } = {}) {
  let dir, loft, dist;
  switch (result) {
    case 'HR': dir = pull(rng, 0.05, 0.9); loft = between(rng, 24, 36); dist = between(rng, 1.02, 1.22); break;
    case '3B': dir = pull(rng, 0.45, 0.9); loft = between(rng, 9, 22); dist = between(rng, 0.8, 0.96); break;
    case '2B': dir = pull(rng, 0.3, 0.85); loft = between(rng, 12, 26); dist = between(rng, 0.68, 0.88); break;
    case 'SF': dir = pull(rng, 0.05, 0.75); loft = between(rng, 28, 44); dist = between(rng, 0.7, 0.88); break;
    case 'FO': dir = pull(rng, 0.05, 0.85); loft = between(rng, 30, 52); dist = between(rng, 0.42, 0.8); break;
    case 'LO': dir = pull(rng, 0.05, 0.7); loft = between(rng, 8, 16); dist = between(rng, 0.24, 0.4); break;
    case 'SAC': case 'BH': dir = pull(rng, 0.1, 0.45); loft = between(rng, 0, 7); dist = between(rng, 0.06, 0.15); break;
    case '1B':
      if (rng() < 0.62) { dir = pull(rng, 0.1, 0.8); loft = between(rng, 0, 8); dist = between(rng, 0.34, 0.52); } // 내야를 뚫는 땅볼
      else { dir = pull(rng, 0.05, 0.7); loft = between(rng, 20, 34); dist = between(rng, 0.48, 0.64); }           // 빗맞은 뜬공
      break;
    default: dir = pull(rng, 0.05, 0.85); loft = between(rng, -4, 7); dist = between(rng, 0.17, 0.33); // GO · DP · E
  }
  // 힘이 센 타자는 조금 더 멀리, 발이 빠른 타자의 땅볼은 조금 더 깊게 (보이는 맛만)
  dist *= 1 + (power - 75) * 0.0012 + (loft < 10 ? (speed - 70) * 0.0008 : 0);
  // 담장 안팎은 결과가 정한다 — 홈런은 넘기고, 나머지는 담장 앞에 떨어진다
  const fence = fenceAt(dir);
  dist = result === 'HR' ? Math.max(dist, fence + 0.03) : Math.min(dist, fence - 0.04);
  return { dir, loft, dist, by: fielderAt(dir, dist) };
}

/** 담장까지의 거리 — 가운데가 멀고 파울폴 쪽이 가깝다 (플레이 뷰와 같은 값) */
export const fenceAt = (dir) => 1 - 0.17 * Math.abs(Math.sin((dir * 45 * Math.PI) / 180)) / Math.sin((45 * Math.PI) / 180);

/** 방향·깊이로 처리할 야수를 고른다 */
export function fielderAt(dir, dist) {
  if (dist >= fenceAt(dir)) return null; // 담장을 넘어갔다
  if (dist < 0.1) return Math.abs(dir) > 0.75 ? (dir < 0 ? '3B' : '1B') : 'C';
  if (dist < 0.38) {
    if (dir < -0.58) return '3B';
    if (dir < -0.14) return 'SS';
    if (dir <= 0.14) return 'P';
    if (dir <= 0.58) return '2B';
    return '1B';
  }
  return dir < -0.3 ? 'LF' : dir > 0.3 ? 'RF' : 'CF';
}

/** 해설용 방향 이름 */
export function dirName(dir) {
  if (dir < -0.72) return '좌익선상';
  if (dir < -0.34) return '좌익수 쪽';
  if (dir < -0.12) return '좌중간';
  if (dir <= 0.12) return '중앙';
  if (dir <= 0.34) return '우중간';
  if (dir <= 0.72) return '우익수 쪽';
  return '우익선상';
}

function wrap(g, ev, runs) {
  ev.runs = runs;
  // 인플레이 타구는 어디로 갔는지까지 실어 보낸다 (플레이 뷰·해설이 쓴다)
  if (ev.call === 'inplay' && ev.result) {
    ev.hit = hitLocation(g.rng, ev.result, { power: st(ev.batter, 'power'), speed: st(ev.batter, 'speed') });
  }
  ev.after = { outs: g.final ? ev.before.outs : g.outs, balls: g.balls, strikes: g.strikes, bases: [...g.bases] };
  ev.score = { home: g.home.runs, away: g.away.runs };
  ev.text = ev.text || describe(ev);
  g.events.push(ev);
  return ev;
}

export function describe(ev) {
  const name = ev.batter?.name || '타자';
  const pt = ev.pitch ? `${PITCHES[ev.pitch.type].name} ${ev.pitch.velo}km` : '';
  const steal = ev.steal ? `${ev.steal.runner.name} ${ev.steal.from + 2}루 도루 ${ev.steal.ok ? '성공!' : '실패'} · ` : '';
  const runs = ev.runs ? ` +${ev.runs}` : '';
  if (ev.result) return `${steal}${name} ${RESULT_LABEL[ev.result]}${runs}${pt && ev.result !== 'IBB' ? ` (${pt})` : ''}`;
  const call = { ball: '볼', called: '루킹 스트라이크', swinging: '헛스윙', foul: '파울' }[ev.call] || '';
  return `${steal}${pt} ${call}`.trim();
}

/** 한 경기를 끝까지 자동으로(테스트·AI용) */
/*
 * AI 감독의 투수 교체 — 팀의 usage(시리즈별 조사값: src/data/pitching-usage.json)를 따른다.
 *  starterPitches 선발을 내리는 투구 수 · relieverPitches 불펜 한 명의 투구 수 · quickHook 실점하면 일찍 내리는 성향 · closerInnings 마무리 이닝
 * 타석이 바뀌는 순간(0-0)에만 판단한다. 바꿀 투수 id(마무리) 또는 true(다음 순번) · 안 바꾸면 null
 */
export const DEFAULT_USAGE = { starterPitches: 95, relieverPitches: 20, quickHook: 0.5, closerInnings: 1 };
export function aiPitchingChange(g, side) {
  if (g.final || g.balls || g.strikes) return null;
  const list = side.team.pitchers;
  if (!list[side.pitcherIdx + 1]) return null;
  const u = { ...DEFAULT_USAGE, ...(side.team.usage || {}) };
  const closer = side.team.closerId ? list.find((p, i) => i > side.pitcherIdx && p.id === side.team.closerId) : null;
  const isCloser = side.team.closerId && side.pitcher?.id === side.team.closerId;
  const lead = (side === g.home ? g.home.runs - g.away.runs : g.away.runs - g.home.runs);
  const lateInning = 10 - Math.max(1, Math.round(u.closerInnings));
  // 마무리: 리드 1~3점 상황의 마지막 이닝(들)
  if (closer && g.outs === 0 && g.inning >= lateInning && lead >= 1 && lead <= 3) return closer.id;
  if (isCloser) return side.pitches >= u.relieverPitches * Math.max(1, u.closerInnings) * 1.6 ? nextArm(side) : null;
  const starter = side.pitcherIdx === 0;
  // 선발로 나온 투수 · 롱릴리프(선발 포지션 투수가 불펜으로)는 길게, 불펜 투수는 짧게
  const long = !starter && side.pitcher?.position === 'SP';
  const limit = starter ? u.starterPitches : long ? u.relieverPitches * 2.2 : u.relieverPitches;
  if (side.pitches >= limit) return nextArm(side);
  if (fatigue(side) >= 0.45) return nextArm(side);
  // 퀵훅: 선발이 이번 경기에 내준 점수. 1~2회엔 더 참는다
  if (starter && g.inning <= 6) {
    const allowed = g.events.reduce((n, ev) => n + (ev.pitcher?.id === side.pitcher?.id && ev.runs ? ev.runs : 0), 0);
    const hook = (u.quickHook >= 0.7 ? 3 : u.quickHook >= 0.4 ? 5 : 7) + (g.inning <= 2 ? 2 : 0);
    if (allowed >= hook) return nextArm(side);
  }
  return null;
}

/** 순번 교체 때는 마무리를 아껴 둔다: 마무리가 아닌 다음 투수, 없으면 마무리 */
function nextArm(side) {
  const list = side.team.pitchers;
  const pick = list.find((p, i) => i > side.pitcherIdx && p.id !== side.team.closerId);
  return pick ? pick.id : true;
}

export function simulateGame(opts, orderFn = () => ({})) {
  const g = createGame(opts);
  let guard = 0;
  while (!g.final && guard++ < 1200) {
    const def = defenseOf(g);
    // 자동 투수 교체: AI 감독 판단(팀 usage)
    const change = aiPitchingChange(g, def);
    pitch(g, { ...(change ? { changePitcher: change } : {}), ...orderFn(g) });
  }
  return g;
}
