import { SERIES } from '../data/series';
import type { Series } from '../data/types';
import { ovr } from './ratings';
import { openSlotsFor, SLOTS, type Pick } from './roster';

export const ROUNDS = SLOTS.length;
export const REROLLS = 3;

export const hasPickable = (s: Series, picks: Pick[]) => s.players.some((c) => openSlotsFor(c, picks).length > 0);

/** 지금 뽑을 수 있는 선수가 한 명 이상 있는 시리즈 중에서 무작위. 직전 시리즈는 가능하면 피한다. */
export function rollSeries(picks: Pick[], rng: () => number = Math.random, avoidId?: string): Series {
  let pool = SERIES.filter((s) => hasPickable(s, picks));
  if (avoidId && pool.length > 1) pool = pool.filter((s) => s.id !== avoidId);
  return pool[Math.floor(rng() * pool.length)];
}

/** AI: 매 라운드 무작위 시리즈에서 종합 능력치가 가장 높은 선수(약간의 무작위성)를 고른다. */
export function aiDraft(rng: () => number = Math.random): Pick[] {
  const picks: Pick[] = [];
  for (let guard = 0; picks.length < ROUNDS && guard < 500; guard++) {
    const s = rollSeries(picks, rng);
    let best: { pick: Pick; score: number } | null = null;
    for (const card of s.players) {
      const slots = openSlotsFor(card, picks);
      if (!slots.length) continue;
      const score = ovr(card) + rng() * 8;
      if (!best || score > best.score) best = { pick: { slot: slots[0], seriesId: s.id, card }, score };
    }
    if (best) picks.push(best.pick);
  }
  return picks;
}
