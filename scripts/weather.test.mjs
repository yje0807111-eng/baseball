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
