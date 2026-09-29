import { describe, it, expect } from 'vitest';
import { consumeItem, trainLevel, trainRate, TRAIN_MAX, TRAIN_RATE, capLeft, CAP_EXTRA_MAX } from '../src/myteam/shop.js';
import { SQUAD_CAP } from '../src/myteam/rules.js';

const batter = (trained = []) => ({ id: 'b1', type: 'batter', position: 'OF', stats: { contact: 80, power: 80, speed: 80, defense: 80 }, overall: 80, trained });
const teamWith = (p, n = 1) => ({ squad: [p], items: Array.from({ length: n }, (_, i) => ({ key: `k${i}`, itemId: 'tr-contact' })) });

describe('훈련 강화 — 단계 · 확률', () => {
  it('확률은 단계가 오를수록 낮다', () => {
    for (let i = 1; i < TRAIN_RATE.length; i += 1) expect(TRAIN_RATE[i]).toBeLessThan(TRAIN_RATE[i - 1]);
    expect(trainRate(batter())).toBe(100);
  });
  it('성공하면 능력치 · 단계가 오른다', () => {
    const p = batter([{}, {}]); // +2, 다음 75%
    const next = consumeItem(teamWith(p), 'k0', p, null, 0.1);
    expect(next.items).toHaveLength(0);
    expect(trainLevel(next.squad[0])).toBe(3);
    expect(next.squad[0].stats.contact).toBe(83);
  });
  it('실패하면 아이템만 사라지고 단계 · 능력치는 그대로', () => {
    const p = batter([{}, {}]);
    const next = consumeItem(teamWith(p), 'k0', p, null, 0.99);
    expect(next.items).toHaveLength(0);
    expect(next.squad[0]).toBe(p);
  });
  it('최대 단계면 쓰지 못한다(아이템도 그대로)', () => {
    const p = batter(Array.from({ length: TRAIN_MAX }, () => ({})));
    const t = teamWith(p);
    expect(consumeItem(t, 'k0', p, null, 0)).toBe(t);
  });
});

describe('CP 확장 한도', () => {
  it('기본 캡에서 합계 +200 까지', () => {
    expect(capLeft({ cap: SQUAD_CAP })).toBe(CAP_EXTRA_MAX);
    expect(capLeft({ cap: SQUAD_CAP + 160 })).toBe(40);
    expect(capLeft({ cap: SQUAD_CAP + 400 })).toBe(0); // 이미 넘게 산 저장본
  });
});
