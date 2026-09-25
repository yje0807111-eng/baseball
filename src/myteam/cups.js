/*
 * 조건부 대회 — 일반 대결 토너먼트에 조건을 걸고 상금을 올린다(OOTP 의 제한 대회처럼).
 * 같은 내 팀 풀에서 새 판을 만든다: 보관함(엔트리 밖 보유 선수)과 영입으로 조건에 맞춰 엔트리를 짜 들어간다.
 * 조건은 엔트리 26명(+확장)에 건다. 맞지 않으면 경기 전 정비에서 시작을 막고 이유를 보여 준다.
 * 상금 배수는 조건을 맞추는 수고 — 외국인 · 레전드는 흔한 전력이라 1.3, 시대 제한 1.4, 캡 제한이 가장 빡빡해 1.5.
 */
import { squadCost } from './rules.js';

const isLegend = (p) => String(p?.seriesId || p?.id || '').startsWith('legend');

export const CUPS = [
  { id: 'open', ko: '조건 없음', mult: 1 },
  { id: 'domestic', ko: '국내 선수만', mult: 1.3, issue: (sq) => { const n = sq.filter((p) => p.isForeign).length; return n ? `외국인 ${n}명` : null; } },
  { id: 'nolegend', ko: '레전드 없이', mult: 1.3, issue: (sq) => { const n = sq.filter(isLegend).length; return n ? `레전드 ${n}명` : null; } },
  { id: 'modern', ko: '2000년 이후 시즌', mult: 1.4, issue: (sq) => { const n = sq.filter((p) => (p.year || 0) < 2000).length; return n ? `2000년 전 시즌 ${n}명` : null; } },
  { id: 'lowcp', ko: 'CP 2,000 이하', mult: 1.5, issue: (sq, staff) => { const c = squadCost(sq, staff); return c > 2000 ? `CP ${c.toLocaleString()}` : null; } },
];
export const cupOf = (id) => CUPS.find((c) => c.id === id) || CUPS[0];
/** 상금 배수 */
export const cupMult = (id) => cupOf(id).mult;
/** 엔트리가 조건에 맞지 않으면 이유 한 줄 (맞으면 null) */
export function cupIssue(id, team = {}) {
  const c = cupOf(id);
  const why = c.issue?.(team.squad || [], team.staff || {});
  return why ? `${c.ko} · ${why}` : null;
}
