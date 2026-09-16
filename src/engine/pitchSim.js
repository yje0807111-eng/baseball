/*
 * 공 하나 단위 경기 엔진 (UI 없음)
 *
 * const g = createGame({ home, away, rng })       // home = 사용자 팀(말 공격)
 * const ev = pitch(g, orders)                     // 공 하나 진행, g 를 직접 바꾸고 이벤트를 돌려준다
 * while (!g.final) pitch(g)
 *
 * 팀: { name, batters: [9명, 타순], pitchers: [선발, 불펜...], catcher? }
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

export function pitchMix(pitcher) {
  const fast = clamp(0.4 + (st(pitcher, 'stuff', 80) - 80) * 0.015, 0.3, 0.65);
  return { fast, slider: (1 - fast) * 0.6, change: (1 - fast) * 0.4 };
}

function newSide(team) {
  return { team, idx: 0, pitcher: team.pitchers[0], pitcherIdx: 0, pitches: 0, runs: 0, hits: 0, errors: 0, line: [] };
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

/** 중요한 순간: 7회 이후 2점 차 이내에서 득점권 주자 또는 만루 · 9회 이후 동점/1점 차는 무조건 */
export function isClutch(g) {
  const diff = g.home.runs - g.away.runs;
  const close = Math.abs(diff) <= 2;
  const risp = g.bases[1] || g.bases[2];
  return g.inning >= 7 && close && (risp || (g.inning >= 9 && Math.abs(diff) <= 1));
}

/** 도루 성공 확률: 주자 스피드 vs 포수 수비 */
export function stealOdds(g, from) {
  const runner = g.bases[from];
  if (!runner || g.bases[from + 1]) return 0;
  const catcher = defenseOf(g).team.catcher || defenseOf(g).team.batters.find((p) => p.position === 'C');
  return clamp(0.42 + (st(runner, 'speed') - 70) * 0.02 - (st(catcher, 'defense') - 70) * 0.01 - (from === 1 ? 0.08 : 0), 0.08, 0.95);
}

/** 투수 체력: 안정성이 높을수록 오래 버틴다. 넘으면 구위·제구가 떨어진다 */
function fatigue(side) {
  const limit = 70 + (st(side.pitcher, 'stability', 75) - 70) * 1.2 - (side.pitcherIdx ? 45 : 0);
  return clamp((side.pitches - limit) / 40, 0, 1);
}

function choosePitch(g, pitcher, order) {
  const r = g.rng();
  const mix = pitchMix(pitcher);
  const type = order?.pitchType || (r < mix.fast ? 'fast' : r < mix.fast + mix.slider ? 'slider' : 'change');
  const tired = fatigue(defenseOf(g));
  const control = st(pitcher, 'control', 75) - tired * 12;
  // 존 안으로 들어갈 확률: 제구 + 볼카운트(볼이 많으면 존으로)
  let inZone = clamp(0.41 + (control - 75) * 0.006 + g.balls * 0.05 - g.strikes * 0.03, 0.28, 0.72);
  let zone;
  if (order?.zone === 'chase') inZone = Math.min(inZone, 0.25);
  if (typeof order?.zone === 'number') { inZone = clamp(inZone + 0.1, 0, 0.9); zone = order.zone; }
  const isIn = g.rng() < inZone;
  if (!isIn) zone = null;
  else if (zone == null) zone = Math.floor(g.rng() * 9);
  const [lo, hi] = PITCHES[type].speed;
  const velo = Math.round(lo + (hi - lo) * clamp((st(pitcher, 'stuff', 80) - 65) / 30, 0, 1) - tired * 4 + (g.rng() - 0.5) * 3);
  return { type, zone, inZone: isIn, velo, tired };
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
  if (orders.changePitcher && def.team.pitchers[def.pitcherIdx + 1]) {
    def.pitcherIdx += 1; def.pitcher = def.team.pitchers[def.pitcherIdx]; def.pitches = 0;
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

  const contact = st(batter, 'contact');
  const power = st(batter, 'power');
  const stuff = st(pitcher, 'stuff', 80) - p.tired * 10;
  const guessBonus = orders.guess ? (orders.guess === p.type ? 0.1 : -0.08) : 0;

  // 스윙 여부
  let swing;
  if (orders.bunt || orders.hitAndRun) swing = true;
  else if (p.inZone) swing = g.rng() < clamp(0.66 + g.strikes * 0.08, 0, 0.92);
  else swing = g.rng() < clamp(0.24 - (contact - 70) * 0.006 + g.strikes * 0.1 + (orders.guess === p.type ? -0.05 : 0), 0.06, 0.55);

  if (!swing) {
    if (p.inZone) { g.strikes += 1; ev.call = 'called'; }
    else { g.balls += 1; ev.call = 'ball'; }
  } else {
    const hitProb = clamp((p.inZone ? 0.82 : 0.56) + (contact - 75) * 0.006 - (stuff - 78) * 0.007 + guessBonus + (orders.bunt ? 0.08 : 0), 0.35, 0.96);
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
  const contact = st(batter, 'contact');
  const power = st(batter, 'power');
  const speed = st(batter, 'speed');
  const stuff = st(pitcher, 'stuff', 80) - p.tired * 10;
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

  const hit = clamp(0.33 + (contact - 75) * 0.005 + (power - 75) * 0.002 - (stuff - 78) * 0.004 - (defAvg - 75) * 0.003 + guessBonus * 0.5 + (p.inZone ? 0.02 : -0.06), 0.14, 0.48);
  if (g.rng() < hit) {
    off.hits += 1;
    const hr = clamp(0.03 + (power - 65) * 0.0075 + (p.zone === 4 ? 0.04 : 0), 0.01, 0.4);
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

function wrap(g, ev, runs) {
  ev.runs = runs;
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
export function simulateGame(opts, orderFn = () => ({})) {
  const g = createGame(opts);
  let guard = 0;
  while (!g.final && guard++ < 1200) {
    const def = defenseOf(g);
    // 자동 투수 교체: 지치면 불펜
    const auto = fatigue(def) > 0.6 && def.team.pitchers[def.pitcherIdx + 1] ? { changePitcher: true } : {};
    pitch(g, { ...auto, ...orderFn(g) });
  }
  return g;
}
