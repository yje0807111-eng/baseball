/* 날씨 — 홈런(바람) · 실책(비) · 투구 수 한도(더위)가 실제로 갈린다 */
import { test, expect } from 'vitest';
import { createGame, pitch, staminaOf, weatherOf, WEATHER } from '../src/engine/pitchSim.js';
import { seeded } from '../src/engine/rng.js';

const man = (id) => ({ id, name: id, position: 'CF', stats: { contact: 80, power: 85, speed: 75, defense: 72, stuff: 80, control: 78, stamina: 90 } });
const team = (tag) => ({ name: tag, batters: Array.from({ length: 9 }, (_, i) => man(`${tag}${i}`)), pitchers: [man(`${tag}P`), man(`${tag}R`)] });
const rate = (weather, keys, n = 3000) => {
  let k = 0;
  for (let i = 0; i < n; i += 1) {
    const g = createGame({ home: team('H'), away: team('A'), rng: seeded(i + 1), weather });
    let ev; do { ev = pitch(g, {}); } while (ev && !ev.result);
    if (keys.includes(ev.result)) k += 1;
  }
  return k / n;
};

test('바람이 외야로면 홈런 ↑ · 안으로면 ↓', () => {
  expect(rate('windOut', ['HR'])).toBeGreaterThan(rate('windIn', ['HR']) + 0.005);
});
test('비가 오면 실책 ↑', () => {
  expect(rate('rain', ['E'])).toBeGreaterThan(rate('clear', ['E']));
});
test('무더위엔 투수가 일찍 지친다', () => {
  const at = (weather) => { const g = createGame({ home: team('H'), away: team('A'), weather }); g.home.pitches = 60; return staminaOf(g.home); };
  expect(at('hot')).toBeLessThan(at('clear') - 5);
});
test('날씨 뽑기 — 모든 날씨가 나온다', () => {
  const r = seeded(9), seen = new Set();
  for (let i = 0; i < 400; i += 1) seen.add(weatherOf(r));
  expect([...seen].sort()).toEqual(Object.keys(WEATHER).sort());
});

test('타순이 돌수록 — 같은 투수를 세 번째 만나면 구위가 깎인다 · 교체하면 처음부터', async () => {
  const { ttoOf, TTO_PEN } = await import('../src/engine/pitchSim.js');
  const g = createGame({ home: team('H'), away: team('A'), rng: seeded(3) });
  expect(ttoOf(g.home)).toBe(0);
  g.home.bf = 18;
  expect(ttoOf(g.home)).toBe(TTO_PEN[2]);
  pitch(g, { changePitcher: true });
  expect(g.home.bf).toBeLessThanOrEqual(1);
});

test('타자 구종 강약 — 약한 계열 공에 덜 맞힌다', async () => {
  const { batterFam, famAdjOf, PITCHES } = await import('../src/engine/pitchSim.js');
  const b = { id: 'x1' }; const f = batterFam(b);
  const weakT = Object.keys(PITCHES).find((t) => PITCHES[t].fam === f.weak), strongT = Object.keys(PITCHES).find((t) => PITCHES[t].fam === f.strong);
  if (f.weak) { expect(famAdjOf(b, weakT)).toBe(-1); expect(famAdjOf(b, strongT)).toBe(1); }
  const kinds = new Set(Array.from({ length: 200 }, (_, i) => JSON.stringify(batterFam({ id: `p${i}` }))));
  expect(kinds.size).toBe(7); // 강 · 약 짝 여섯 + 고르게
});
