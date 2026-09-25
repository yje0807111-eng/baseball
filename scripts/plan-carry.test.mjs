import { describe, it, expect } from 'vitest';
import { starterSquad } from '../src/myteam/starter.js';
import { readyRoster, matchTeamOf } from '../src/myteam/prep.js';
import { TACTIC_CHANGES } from '../src/BroadcastGame.jsx';

describe('정비 계획을 경기 팀에 싣는다', () => {
  const team = { name: 't', squad: starterSquad('t'), staff: {}, cap: 2330, plan: { sides: { off: 'onbase', mound: 'quick', def: 'tight' } } };
  const { ready, rest } = readyRoster(team, 1);
  it('정비에서 고른 세 갈래가 경기의 첫 전술', () => {
    expect(matchTeamOf(team, ready, rest).plan).toEqual({ sides: { off: 'onbase', mound: 'quick', def: 'tight' } });
  });
  it('계획이 없으면 싣지 않는다(경기가 기본 전술로 시작)', () => {
    expect(matchTeamOf({ ...team, plan: undefined }, ready, rest).plan).toBeUndefined();
  });
  it('경기 중 전술 변경은 세 번', () => {
    expect(TACTIC_CHANGES).toBe(3);
  });
});
