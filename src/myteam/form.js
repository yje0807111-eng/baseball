/*
 * 오늘 몸 상태 — 경기마다 선수마다 다르게 굴린다.
 *
 * 투수 피로([[fatigue.js]])가 경기 사이에 쌓이는 것이라면, 이쪽은 그날 하루짜리다.
 * 같은 경기에서는 늘 같은 값이 나오도록 상대 이름으로 씨를 심는다 — 정비 화면을
 * 들락거려도 다시 굴러가지 않고, 화면에서 본 그대로 경기에 들어간다.
 */
import { overallOf } from '../data/ratings.js';

/** 다섯 단계 — 가운데가 가장 흔하다 */
export const FORMS = [
  { key: 'hot', ko: '최상', mark: '▲▲', color: '#f97316', swing: 1, odds: 0.10 },
  { key: 'good', ko: '좋음', mark: '▲', color: '#34d399', swing: 0.5, odds: 0.22 },
  { key: 'flat', ko: '보통', mark: '―', color: '#94a3b8', swing: 0, odds: 0.36 },
  { key: 'poor', ko: '나쁨', mark: '▼', color: '#fbbf24', swing: -0.5, odds: 0.22 },
  { key: 'cold', ko: '최악', mark: '▼▼', color: '#f87171', swing: -1, odds: 0.10 },
];
export const FORM_OF = Object.fromEntries(FORMS.map((f) => [f.key, f]));
const SWING = 7; // 최상 · 최악에서 능력치가 흔들리는 폭
const HIT = ['contact', 'power', 'speed'];
const ARM = ['stuff', 'control'];

/** 문자열을 씨앗 수로 */
export function formSeed(...parts) {
  let h = 2166136261;
  for (const s of parts.join('|')) { h ^= s.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** 씨앗 하나로 0~1 을 잇달아 뽑는다 */
const rng = (seed) => { let x = seed || 1; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };

/** 한 번 굴려 단계 하나 */
function roll(r) {
  let v = r();
  for (const f of FORMS) { if (v < f.odds) return f; v -= f.odds; }
  return FORM_OF.flat;
}

/** 선수에게 오늘 몸 상태를 얹는다 — 능력치와 종합이 함께 움직인다 */
export function withForm(player, f) {
  if (!f || !f.swing) return { ...player, form: f?.key || 'flat' };
  const keys = player.type === 'pitcher' ? ARM : HIT;
  const cut = Math.round(f.swing * SWING);
  const stats = { ...player.stats };
  for (const k of keys) if (stats[k] != null) stats[k] = Math.max(40, Math.min(120, stats[k] + cut));
  return { ...player, stats, overall: overallOf(player.position, stats), form: f.key };
}

/** 로스터 전체에 오늘 몸 상태를 — 같은 씨앗이면 늘 같은 결과 */
export function applyForm(roster = [], seed = 0) {
  if (!seed) return roster.map((p) => ({ ...p, form: 'flat' }));
  const r = rng(seed);
  return roster.map((p) => withForm(p, roll(r)));
}

/** 상대 팀 씨앗 — 정비 화면과 경기가 같은 값을 쓰도록 이름과 모드만으로 심는다 */
export const oppSeed = (name = '', sub = '') => formSeed('opp', name, sub);

/** 팀 하나에 통째로 — 로스터를 새로 만들면 타순 · 선발도 같은 객체를 보게 이어 준다 */
export function applyFormTeam(team, seed = 0) {
  if (!team?.roster?.length || !seed) return team;
  const roster = applyForm(team.roster, seed);
  const byId = new Map(roster.map((p) => [p.id, p]));
  const keep = (p) => (p && byId.get(p.id)) || p;
  return {
    ...team,
    roster,
    ...(team.batters ? { batters: team.batters.map(keep) } : {}),
    ...(team.starter ? { starter: keep(team.starter) } : {}),
  };
}
