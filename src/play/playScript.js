/*
 * 이벤트 하나(pitchSim 의 ev) → 시간축 대본.
 *
 * 대본은 "무엇이 언제부터 언제까지 어디서 어디로 움직이는가" 만 담는다. 그리는 방법은 담지 않는다.
 * 지금은 PlayView 가 점·선으로 그리지만, 나중에 스프라이트나 3D 로 바꿔도 이 대본은 그대로 쓴다.
 *
 * 시간 t 는 0~1 (그 공에 배정된 시간 안에서의 비율). 좌표는 두 가지 계를 쓴다.
 *   존 뷰(포수 뒤 시점): x -1~1(좌우) · y -1~1(위아래). 스트라이크존은 ZONE 크기.
 *   필드 뷰(위에서 본 그라운드): x -1~1 · y 0(홈) ~ 1(중앙 펜스). 파울라인은 ±45°.
 */

/* ───────── 필드 좌표 ───────── */
const D2R = Math.PI / 180;
/** 방향(-1~1)·거리(0~1) → 필드 좌표. 파울라인이 ±45° 가 되게 편다 */
export const spot = (dir, dist) => [dist * Math.sin(dir * 45 * D2R), dist * Math.cos(dir * 45 * D2R)];

export const BASE_POS = [spot(1, 0.225), spot(0, 0.318), spot(-1, 0.225), [0, 0]]; // 1루 · 2루 · 3루 · 홈
export const HOME = [0, 0];
export const MOUND = [0, 0.151];
/** 수비 위치 — 기본 자리 */
export const FIELDERS = {
  P: MOUND, C: [0, -0.035],
  '1B': [0.185, 0.2], '2B': [0.105, 0.33], SS: [-0.105, 0.33], '3B': [-0.185, 0.2],
  LF: [-0.37, 0.64], CF: [0, 0.76], RF: [0.37, 0.64],
};
export { fenceAt } from '../engine/pitchSim.js'; // 담장은 엔진과 같은 값을 쓴다
import { fenceAt } from '../engine/pitchSim.js';

/* ───────── 존 좌표 ───────── */
export const ZONE = { w: 0.34, h: 0.42 }; // 스트라이크존 반폭·반높이
/** 존 번호 0~8 (왼위 → 오른아래) → 존 뷰 좌표 */
export const zoneCell = (i) => [((i % 3) - 1) * ZONE.w * 0.66, (Math.floor(i / 3) - 1) * ZONE.h * 0.66];

/** 이벤트마다 같은 값이 나오는 잡음 — 다시 그려도 공이 튀지 않게 */
function noise(ev, salt) {
  const s = `${ev.inning}|${ev.top}|${ev.batter?.id}|${ev.before?.balls}|${ev.before?.strikes}|${ev.pitch?.velo}|${salt}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

/* ───────── 주자 ───────── */
/** 공 하나 앞뒤의 루 상황을 견줘 "누가 어디서 어디로" 를 뽑는다. to: 0~2 루 · 3 득점 · null 아웃 */
export function runnerMoves(ev) {
  const before = ev.before?.bases || [null, null, null];
  const after = ev.after?.bases || [null, null, null];
  const at = (bases, p) => bases.findIndex((r) => r && p && r.id === p.id);
  const moves = [];
  const gone = []; // 루에서 사라진 주자 — 득점 아니면 아웃

  for (let i = 0; i < 3; i += 1) {
    const r = before[i];
    if (!r) continue;
    const to = at(after, r);
    if (to >= 0) moves.push({ player: r, from: i, to }); // 안 움직였으면 제자리에 서 있는 것도 그린다
    else gone.push({ player: r, from: i });
  }
  // 타자: 루에 있으면 홈(-1)에서 그 루로, 없으면 홈런이면 득점 · 아니면 아웃
  const batterTo = at(after, ev.batter);
  if (batterTo >= 0) moves.push({ player: ev.batter, from: -1, to: batterTo });
  else if (ev.result === 'HR') gone.push({ player: ev.batter, from: -1 });
  else if (ev.call === 'inplay' || ev.result === 'K') moves.push({ player: ev.batter, from: -1, to: null, quiet: true });

  // 사라진 주자 가운데 앞선 주자부터 득점으로 본다 (남으면 아웃)
  gone.sort((a, b) => b.from - a.from);
  gone.forEach((m, i) => moves.push({ ...m, to: i < (ev.runs || 0) ? 3 : null }));
  return moves;
}

/** 루에서 루로 달리는 길 — 사이에 있는 루를 모두 밟는다. off 는 홈에 들어온 뒤 비켜설 자리 */
export function runPath(from, to, off = 0) {
  const pos = (i) => (i < 0 || i >= 3 ? HOME : BASE_POS[i]);
  if (to == null) return [pos(from), pos(from)]; // 아웃 — 제자리에서 사라진다
  const pts = [pos(from)];
  for (let i = from + 1; i <= to; i += 1) pts.push(i >= 3 ? HOME : BASE_POS[i]);
  if (to === 3) pts.push(spot(-1, 0.05 + off)); // 홈을 밟고 3루 더그아웃 쪽으로
  return pts.length > 1 ? pts : [pos(from), pos(from)];
}

/* ───────── 대본 ───────── */
/*
 * 대본의 시간은 0~1 이지만 투구만은 늘 같은 초를 쓴다 — 공 하나에 주는 시간(beatMs)이
 * 길어져도 공이 늘어지지 않고, 남는 시간은 타구 · 주루 · 자막이 가져간다.
 */
const PITCH_WIND = 40;  // 와인드업
const PITCH_FLY = 420;  // 공이 마운드에서 홈까지
const CUT_AFTER = 90;   // 맞고 나서 타구가 시작되기까지

/** 그 공이 존 뷰 어디에 꽂혔는지 — 지나간 공을 다시 찍을 때도 같은 자리가 나온다 */
export function pitchTarget(ev) {
  const p = ev?.pitch;
  if (!p) return null;
  if (p.inZone && p.zone != null) return zoneCell(p.zone);
  return [
    (noise(ev, 'x') < 0.5 ? -1 : 1) * (ZONE.w + 0.06 + noise(ev, 'x2') * 0.22),
    (noise(ev, 'y') - 0.5) * 2 * (ZONE.h + 0.08),
  ];
}

export function buildPlay(ev, beatMs = 1200) {
  if (!ev) return null;
  const beats = [];
  const p = ev.pitch;
  const swung = ['swinging', 'foul', 'inplay'].includes(ev.call);
  const ms = Math.max(240, beatMs);
  const P0 = Math.min(0.06, PITCH_WIND / ms);
  const P1 = Math.min(0.66, (PITCH_WIND + PITCH_FLY) / ms); // 공이 홈에 닿는 때
  const CUT = Math.min(0.62, P1 + CUT_AFTER / ms);

  // 1. 투구 — 마운드에서 존으로. 변화구는 늦게 휜다
  if (p) {
    const bend = { fast: [0, -0.04], slider: [-0.24, 0.06], change: [0.06, 0.2] }[p.type] || [0, 0];
    beats.push({ kind: 'pitch', t0: P0, t1: P1, from: [0.06, -0.45], to: pitchTarget(ev), bend, type: p.type, velo: p.velo, inZone: p.inZone });
  }
  // 2. 스윙 / 판정
  if (swung) beats.push({ kind: 'swing', t0: Math.max(0, P1 - 0.08), t1: Math.min(1, P1 + 0.08), contact: ev.call !== 'swinging' });
  if (ev.call !== 'inplay') {
    const label = { ball: '볼', called: '스트라이크', swinging: '헛스윙', foul: '파울', ibb: '고의사구' }[ev.call];
    if (label) beats.push({ kind: 'call', t0: Math.min(0.95, P1 + 0.03), t1: 1, label, tone: ev.call === 'ball' ? 'ball' : 'strike' });
  }
  // 3. 도루 — 투구와 함께 출발한다
  if (ev.steal) {
    beats.push({
      kind: 'steal', t0: P0, t1: Math.min(0.95, CUT + 0.2), player: ev.steal.runner, ok: ev.steal.ok,
      path: runPath(ev.steal.from, ev.steal.from + 1),
    });
  }

  // 4. 인플레이 — 필드로 컷 전환
  if (ev.call === 'inplay' && ev.hit) {
    const { dir, dist, loft, by } = ev.hit;
    const land = spot(dir, dist);
    const gone = dist >= fenceAt(dir);
    beats.push({ kind: 'cut', t: CUT });
    beats.push({ kind: 'ball', t0: CUT, t1: gone ? 0.9 : 0.74, from: HOME, to: land, loft, gone });
    if (by && !gone) {
      beats.push({ kind: 'fielder', t0: CUT + 0.04, t1: 0.76, pos: by, from: FIELDERS[by] || HOME, to: land });
      // 잡아서 던진다 — 땅볼·직선타는 1루로, 뜬공 아웃은 그대로
      const throwTo = ['GO', 'DP', 'E', 'SAC', 'BH'].includes(ev.result) ? BASE_POS[0] : null;
      if (throwTo) beats.push({ kind: 'throw', t0: 0.78, t1: 0.92, from: land, to: throwTo });
    }
    const moves = runnerMoves(ev).filter((m) => !(m.quiet && m.to == null)); // 타석에서 바로 아웃이면 그릴 것이 없다
    const scorers = moves.filter((m) => m.to === 3).length;
    let k = 0;
    for (const m of moves.sort((a, b) => b.from - a.from)) { // 앞선 주자부터
      const off = m.to === 3 ? k * 0.06 : 0;
      beats.push({
        kind: 'run', t0: Math.min(0.9, CUT + 0.03 + k * 0.03), t1: Math.min(0.99, 0.84 + k * 0.045),
        player: m.player, path: runPath(m.from, m.to, off), out: m.to == null, scored: m.to === 3, still: m.from === m.to,
      });
      if (m.to === 3) k += 1; else k += 0.4;
    }
  }
  return { beats, cut: ev.call === 'inplay' && ev.hit ? CUT : null, ev };
}

/* ───────── 대본 읽기 ───────── */
/** 꺾은선 길을 0~1 로 따라간 자리 */
export function along(path, u) {
  if (!path || path.length === 0) return HOME;
  if (path.length === 1) return path[0];
  const seg = [];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) || 0.0001;
    seg.push(d); total += d;
  }
  let want = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < seg.length; i += 1) {
    if (want <= seg[i]) {
      const k = want / seg[i];
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
    }
    want -= seg[i];
  }
  return path[path.length - 1];
}

/** 0~1 로 자른 구간 진행도 */
export const phase = (t, t0, t1) => Math.max(0, Math.min(1, (t - t0) / Math.max(0.0001, t1 - t0)));
export const ease = (u) => u * u * (3 - 2 * u);
