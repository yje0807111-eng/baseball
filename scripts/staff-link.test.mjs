import { describe, it, expect } from 'vitest';
import { applyStaff } from '../src/myteam/match.js';
import { staffRules, staffTeam, staffValue, clubBond, STAFF, CP_PER_PCT } from '../src/myteam/staff.js';
import { afterGame } from '../src/myteam/fatigue.js';
import { withForm, FORM_OF } from '../src/myteam/form.js';
import { createGame, stealOdds } from '../src/engine/pitchSim.js';

/* 코치진 효과가 경기 엔진까지 닿는지 — 규칙 한 줄씩(조건 · 대가 · 구단 궁합 · 강화) */
const coach = (rules, o = {}) => ({ role: 'batting', rules, ...o });
const P = (id, type, o = {}) => ({ id, type, position: type === 'pitcher' ? 'SP' : 'OF', hand: 'R', team: '해태', stats: type === 'pitcher' ? { stuff: 80, control: 78, stamina: 90, stability: 78 } : { contact: 80, power: 80, speed: 80, defense: 80 }, ...o });

describe('코치진 규칙 → 선수 능력치', () => {
  it('조건이 맞는 선수에게만 — 좌타자 컨택', () => {
    const [l, rr] = applyStaff([P('l', 'batter', { hand: 'L' }), P('r', 'batter')], { batting: coach([{ who: 'L', stat: 'contact', v: 5 }]) });
    expect(l.stats.contact).toBe(85);
    expect(rr.stats.contact).toBe(80);
  });
  it('체력은 투수 체력에 그대로 · 안정은 그대로', () => {
    const [p] = applyStaff([P('p', 'pitcher')], { pitching: coach([{ who: 'pitcher', stat: 'stamina', v: 8 }]) });
    expect(p.stats.stamina).toBe(98);
    expect(p.stats.stability).toBe(78);
  });
  it('감독 대가(−)는 강화 · 궁합으로 커지지 않고, + 만 ×1.2(Lv.2) · ×1.5(궁합)', () => {
    const mgr = { role: 'manager', style: 'attack', grade: 1, clubs: ['kia'], level: 2 };
    const squad = Array.from({ length: 6 }, (_, i) => P(`b${i}`, 'batter'));
    expect(clubBond(mgr, squad).on).toBe(true);
    const rules = staffRules(mgr, squad);
    expect(rules.find((x) => x.stat === 'contact').v).toBe(Math.round(6 * 1.2 * 1.5));
    expect(rules.find((x) => x.stat === 'control').v).toBe(-3);
    expect(clubBond(mgr, squad.slice(0, 5)).on).toBe(false);
  });
});

describe('코치진 팀 운영', () => {
  it('도루 성공 확률에 edge.steal 이 더해진다', () => {
    const team = (edge) => ({ name: 'T', edge, batters: ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'DH'].map((position, i) => ({ id: `b${i}`, name: `b${i}`, position, stats: { contact: 78, power: 78, speed: 80, defense: 75 } })), pitchers: [P('p', 'pitcher')] });
    const odds = (edge) => { const g = createGame({ home: team(null), away: team(edge) }); g.bases[0] = g.away.team.batters[0]; return stealOdds(g, 0); };
    expect(odds({ steal: 0.05 }) - odds(null)).toBeCloseTo(0.05, 5);
  });
  it('투수 관리 — 휴식 경기 수를 줄인다(0 아래로는 안 감)', () => {
    expect(staffTeam({ manager: { role: 'manager', style: 'care', grade: 3 } }).rest).toBe(1);
    expect(afterGame({}, ['p'], { p: 95 }, 'p', 1).p.rest).toBe(3);
    expect(afterGame({}, ['r'], { r: 10 }, null, 1).r.rest).toBe(0);
  });
  it('믿음의 야구 — 나쁜 날 흔들림 절반 · 좋은 날은 ¾', () => {
    const b = P('b', 'batter');
    expect(withForm(b, FORM_OF.cold, 0.5).stats.contact).toBe(80 + Math.round(-7 * 0.5));
    expect(withForm(b, FORM_OF.hot, 0.5).stats.contact).toBe(80 + Math.round(7 * 0.75));
  });
});

describe('CP = 올리는 승률 × 4', () => {
  it('모든 후보가 값어치대로 · 최소 15', () => {
    for (const s of STAFF) expect(s.cost).toBe(Math.max(15, Math.round(staffValue(s) * CP_PER_PCT)));
  });
});
