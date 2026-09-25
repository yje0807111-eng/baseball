import { describe, it, expect, beforeEach } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
const store = await import('../src/myteam/store.js');
const { presetCount, presetIssue, applyPreset, snapshot } = await import('../src/myteam/presets.js');
const { starterSquad } = await import('../src/myteam/starter.js');
const { SHOP_ITEMS, expandTeam, expandLeft } = await import('../src/myteam/shop.js');

describe('엔트리 프리셋', () => {
  const squad = starterSquad('프리셋');
  const extra = starterSquad('다른팀').filter((p) => !squad.some((x) => x.personId === p.personId)).slice(0, 3);
  beforeEach(() => { mem.clear(); store.signIn('프리셋감독'); });

  it('칸은 기본 1, 상점에서 두 번 늘려 3', () => {
    expect(presetCount({})).toBe(1);
    const it = SHOP_ITEMS.find((i) => i.id === 'op-preset');
    expect(it.expand).toBe('preset');
    let t = {};
    t = expandTeam(expandTeam(expandTeam(t, 'preset'), 'preset'), 'preset');
    expect(t.presetSlots).toBe(2);
    expect(presetCount(t)).toBe(3);
    expect(expandLeft(t, 'preset')).toBe(0);
  });
  it('저장했다가 불러오면 그 엔트리 · 순서로, 나머지는 보관함으로', () => {
    const a = store.loadAccount();
    const team0 = { ...a.team, squad, club: extra, order: { lineup: [{ id: squad[20].id, slot: 'C' }] } };
    const saved = store.savePreset(team0, 0);
    expect(saved.team.presets[0].ids).toHaveLength(26);
    /* 엔트리 하나를 보관함 선수와 바꾼 뒤 불러오기 */
    const swapped = { ...saved.team, squad: [...squad.slice(1), extra[0]], club: [squad[0], ...extra.slice(1)] };
    const loaded = store.loadPreset(swapped, 0);
    expect(loaded.team.squad.map((p) => p.id)).toEqual(squad.map((p) => p.id));
    expect(loaded.team.club.map((p) => p.id).sort()).toEqual(extra.map((p) => p.id).sort());
    expect(loaded.team.order.lineup[0].id).toBe(squad[20].id);
    expect(loaded.team.presetOn).toBe(0);
  });
  it('그사이 방출한 선수가 있으면 불러오지 않는다', () => {
    const team = { squad, club: [] };
    const p = snapshot(team, '프리셋 1');
    expect(presetIssue({ squad: squad.slice(1), club: [] }, p)).toBe('방출한 선수 1명');
    expect(applyPreset({ squad: squad.slice(1), club: [] }, p)).toBeNull();
    expect(presetIssue(team, undefined)).toBe('비어 있음');
  });
  it('열리지 않은 칸에는 저장하지 않는다', () => {
    const a = store.loadAccount();
    expect(store.savePreset({ ...a.team, squad }, 1)).toBeNull();
  });
});
