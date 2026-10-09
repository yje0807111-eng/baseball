import { describe, it, expect } from 'vitest';
import { SERIES } from '../src/data/seriesPlayers.js';
import { seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { seeded } from '../src/engine/rng.js';
import { sitOdds, batFx, zoneFx, stealFx, topFx } from '../src/myteam/sitFx.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
describe('정비 3단계 고르기 득실 — 엔진 실측', () => {
  it('홈런 우선 = 홈런 ↑ · 출루 우선 = 볼넷 ↑ · 정면 승부 = 볼넷 ↓, 0.5초 안팎', () => {
    const home = engineTeam(seriesTeam(pick(/^2010-sk/), seeded(2))), away = engineTeam(seriesTeam(pick(/^1997-hyundai/), seeded(5)));
    const t0 = performance.now();
    const odds = sitOdds(home, away);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(3000);
    const pow = batFx(odds, 'rispPow'), pat = batFx(odds, 'rispPat'), zone = zoneFx(odds, away, false);
    expect(pow.find((e) => e.ko === '홈런')).toMatchObject({ good: true });
    expect(pat.find((e) => e.ko === '볼넷')).toMatchObject({ good: true });
    expect(zone.find((e) => e.ko === '볼넷')).toMatchObject({ good: true });
    expect(zone.find((e) => e.ko === '볼넷').after).toBeLessThan(zone.find((e) => e.ko === '볼넷').base);
    expect(stealFx(home, away, 85)[0].abs).toBeGreaterThan(0.5);
  });
  it('이득 · 손해 하나씩, 3% 안쪽은 뺌', () => {
    const fx = topFx({ hit: 0.25, hr: 0.04, bb: 0.1, k: 0.2 }, { hit: 0.252, hr: 0.05, bb: 0.1, k: 0.24 });
    expect(fx.map((e) => [e.ko, e.good])).toEqual([['홈런', true], ['삼진', false]]);
  });
});
