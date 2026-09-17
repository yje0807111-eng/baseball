/* 투수 교체: 원하는 투수를 골라 넣기 · 이미 던진 투수는 다시 못 나옴 */
import { test, expect } from 'vitest';
import { createGame, pitch } from '../src/engine/pitchSim.js';

const P = (id, o = 75) => ({ id, name: id, overall: o, type: 'pitcher', stats: { stuff: o, control: o, stamina: o, stability: o } });
const B = (id) => ({ id, name: id, overall: 70, type: 'batter', position: 'OF', stats: { power: 70, contact: 70, speed: 70, defense: 70 } });
const team = (n) => ({ name: n, batters: Array.from({ length: 9 }, (_, i) => B(`${n}b${i}`)), pitchers: [P(`${n}sp`), P(`${n}lr`), P(`${n}mr`), P(`${n}cl`, 90)] });

test('고른 투수로 바로 교체하고, 내려간 투수는 다시 고를 수 없다', () => {
  let seed = 1; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const g = createGame({ home: team('h'), away: team('a'), rng });
  // 원정 공격(top) = 홈 수비. 마무리를 골라 넣는다
  pitch(g, { changePitcher: 'hcl' });
  expect(g.home.pitcher.id).toBe('hcl');
  expect(g.home.pitcherIdx).toBe(1);
  // 내려간 선발을 다시 부르면 무시되고 다음 순번이 나온다
  pitch(g, { changePitcher: 'hsp' });
  expect(g.home.pitcher.id).not.toBe('hsp');
  expect(g.home.team.pitchers.slice(0, g.home.pitcherIdx + 1).map((p) => p.id)).toContain('hsp');
});

test('true 로 주면 예전처럼 다음 순번', () => {
  const g = createGame({ home: team('h'), away: team('a'), rng: () => 0.5 });
  pitch(g, { changePitcher: true });
  expect(g.home.pitcher.id).toBe('hlr');
});
