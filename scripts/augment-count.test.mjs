import { test, expect } from 'vitest';
import { AUGMENTS } from '../src/KboAugmentDraft.jsx';

test('증강은 한 등급으로 모여 있고, id 는 겹치지 않는다', () => {
  const byTier = {};
  AUGMENTS.forEach((a) => { byTier[a.tier] = (byTier[a.tier] || 0) + 1; });
  const ids = AUGMENTS.map((a) => a.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(Object.keys(byTier)).toEqual(['silver']); // 등급을 하나로 합쳤다
  expect(byTier.silver).toBe(AUGMENTS.length);
  expect(AUGMENTS.length).toBeGreaterThanOrEqual(90);
});
