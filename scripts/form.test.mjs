import { describe, it, expect } from 'vitest';
import { applyForm, withForm, formSeed, oppSeed, applyFormTeam, FORMS, FORM_OF } from '../src/myteam/form.js';

const bat = (i) => ({ id: `b${i}`, name: `b${i}`, type: 'batter', position: 'CF', overall: 80, stats: { contact: 78, power: 80, speed: 72, defense: 74 } });
const arm = (i) => ({ id: `p${i}`, name: `p${i}`, type: 'pitcher', position: 'SP', overall: 80, stats: { stuff: 78, control: 76, stamina: 70 } });
const roster = [...Array.from({ length: 30 }, (_, i) => bat(i)), ...Array.from({ length: 10 }, (_, i) => arm(i))];

describe('오늘 몸 상태', () => {
  it('다섯 단계의 확률을 합치면 1', () => {
    expect(FORMS.reduce((s, f) => s + f.odds, 0)).toBeCloseTo(1, 6);
  });
  it('같은 씨앗이면 늘 같고, 씨앗이 다르면 갈린다', () => {
    const a = applyForm(roster, formSeed('SSG', 'SINGLE'));
    const b = applyForm(roster, formSeed('SSG', 'SINGLE'));
    const c = applyForm(roster, formSeed('KIA', 'SINGLE'));
    expect(a.map((p) => p.form)).toEqual(b.map((p) => p.form));
    expect(a.map((p) => p.form)).not.toEqual(c.map((p) => p.form));
  });
  it('씨앗이 없으면 모두 보통', () => {
    expect(applyForm(roster, 0).every((p) => p.form === 'flat')).toBe(true);
  });
  it('가운데가 가장 흔하고 양 끝이 드물다', () => {
    const count = {};
    for (let s = 1; s < 60; s += 1) for (const p of applyForm(roster, formSeed('t', String(s)))) count[p.form] = (count[p.form] || 0) + 1;
    expect(count.flat).toBeGreaterThan(count.good);
    expect(count.good).toBeGreaterThan(count.hot);
    expect(count.flat).toBeGreaterThan(count.poor);
    expect(count.poor).toBeGreaterThan(count.cold);
  });
  it('타자는 타격 쪽이, 투수는 마운드 쪽이 흔들린다', () => {
    const hot = withForm(bat(1), FORM_OF.hot);
    expect(hot.stats.contact).toBeGreaterThan(78);
    expect(hot.stats.defense).toBe(74); // 수비는 그대로
    const cold = withForm(arm(1), FORM_OF.cold);
    expect(cold.stats.stuff).toBeLessThan(78);
    expect(cold.stats.stamina).toBe(70); // 체력은 그대로
  });
  it('보통이면 수치가 하나도 바뀌지 않는다', () => {
    const p = bat(2);
    const same = withForm(p, FORM_OF.flat);
    expect(same.stats).toEqual(p.stats);
    expect(same.overall).toBe(p.overall);
  });
  it('종합도 함께 움직인다', () => {
    const p = bat(3);
    expect(withForm(p, FORM_OF.hot).overall).toBeGreaterThan(withForm(p, FORM_OF.cold).overall);
  });
});

describe('상대 팀 몸 상태', () => {
  const team = () => ({
    name: '1984 롯데', roster: [...Array.from({ length: 12 }, (_, i) => bat(i)), ...Array.from({ length: 6 }, (_, i) => arm(i))],
  });
  const withLineup = () => { const t = team(); return { ...t, batters: t.roster.slice(0, 9), starter: t.roster[12] }; };

  it('정비 화면과 경기가 같은 씨앗을 쓴다', () => {
    expect(oppSeed('1984 롯데', 'SINGLE GAME')).toBe(oppSeed('1984 롯데', 'SINGLE GAME'));
    expect(oppSeed('1984 롯데', 'SINGLE GAME')).not.toBe(oppSeed('2019 SK', 'SINGLE GAME'));
  });
  it('타순과 선발도 같은 사람을 본다', () => {
    const t = applyFormTeam(withLineup(), oppSeed('1984 롯데', 'X'));
    const byId = new Map(t.roster.map((p) => [p.id, p]));
    for (const b of t.batters) expect(b).toBe(byId.get(b.id));
    expect(t.starter).toBe(byId.get(t.starter.id));
    expect(t.starter.form).toBeTruthy();
  });
  it('씨앗이 없으면 그대로 돌려준다', () => {
    const t = withLineup();
    expect(applyFormTeam(t, 0)).toBe(t);
  });
});
