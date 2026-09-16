import { test, expect } from 'vitest';
import { AUGMENTS } from '../src/KboAugmentDraft.jsx';

test('증강은 등급마다 30개씩, id 는 겹치지 않는다', () => {
  const byTier = {};
  AUGMENTS.forEach((a) => { byTier[a.tier] = (byTier[a.tier] || 0) + 1; });
  const ids = AUGMENTS.map((a) => a.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(byTier).toEqual({ silver: 30, gold: 30, prismatic: 30 });
});
