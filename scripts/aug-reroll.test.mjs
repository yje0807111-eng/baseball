import { test, expect } from 'vitest';
// 큰 모듈이라 불러오는 데 몇 초 — 테스트 시간(5초)에 넣지 않게 맨 위에서
const { rollAugmentOptions, rerollAugmentAt } = await import('../src/KboAugmentDraft.jsx');

test('증강 카드 한 장만 다시 굴리기 — 나머지는 그대로, 새 카드는 가진 것 · 판에 있던 세 장과 안 겹침', () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const owned = rollAugmentOptions([], rng).slice(0, 2);
  const opts = rollAugmentOptions(owned, rng);
  for (let i = 0; i < 3; i++) {
    const next = rerollAugmentAt(opts, i, owned, rng);
    expect(next.length).toBe(3);
    next.forEach((o, k) => { if (k !== i) expect(o.id).toBe(opts[k].id); });
    expect([...owned, ...opts].some((x) => x.id === next[i].id)).toBe(false);
  }
});
