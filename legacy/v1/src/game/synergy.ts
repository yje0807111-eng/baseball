import { FRANCHISE_NAMES, SERIES_BY_ID, seriesLabel } from '../data/series';
import type { PlayerCard } from '../data/types';
import type { Pick, SlotId } from './roster';

export type StatKey = 'con' | 'pow' | 'eye' | 'spd' | 'def' | 'stu' | 'ctl' | 'sta';
export const STAT_KEYS: StatKey[] = ['con', 'pow', 'eye', 'spd', 'def', 'stu', 'ctl', 'sta'];
export type Bonus = Record<StatKey, number>;

export interface Synergy {
  key: string;
  name: string;
  desc: string;
  effects: { slot: SlotId; stat: StatKey | 'all'; amount: number }[];
}

/** 한 능력치에 쌓이는 시너지 보너스 상한 */
export const BONUS_CAP = 5;

function groupBy<T>(items: T[], key: (t: T) => string | undefined): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    if (k === undefined) continue;
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  return m;
}

const names = (ps: Pick[]) => ps.map((p) => p.card.name).join(', ');

export function findSynergies(picks: Pick[]): Synergy[] {
  const out: Synergy[] = [];

  for (const [sid, group] of groupBy(picks, (p) => p.seriesId)) {
    if (group.length < 2) continue;
    const s = SERIES_BY_ID[sid];
    const amount = s.kind === 'team'
      ? (group.length >= 4 ? 3 : group.length === 3 ? 2 : 1)
      : (group.length >= 3 ? 2 : 1);
    out.push({
      key: `series:${sid}`,
      name: s.kind === 'team' ? '같은 시즌 동료' : '국가대표 동료',
      desc: `${seriesLabel(s)} ${group.length}명 (${names(group)}) · 전 능력치 +${amount}`,
      effects: group.map((p) => ({ slot: p.slot, stat: 'all', amount })),
    });
  }

  for (const [fr, group] of groupBy(picks, (p) => SERIES_BY_ID[p.seriesId].franchise)) {
    const seasons = new Set(group.map((p) => p.seriesId)).size;
    if (group.length < 3 || seasons < 2) continue;
    out.push({
      key: `franchise:${fr}`,
      name: '프랜차이즈 DNA',
      desc: `${FRANCHISE_NAMES[fr as keyof typeof FRANCHISE_NAMES]} ${seasons}개 시즌 ${group.length}명 · 전 능력치 +1`,
      effects: group.map((p) => ({ slot: p.slot, stat: 'all', amount: 1 })),
    });
  }

  const at = (slot: SlotId) => picks.find((p) => p.slot === slot);

  const catcher = at('C');
  if (catcher) {
    const mates = picks.filter((p) => p.card.type === 'pitcher' && p.seriesId === catcher.seriesId);
    if (mates.length) {
      out.push({
        key: 'battery',
        name: '배터리 호흡',
        desc: `${catcher.card.name} ↔ ${names(mates)} · 투수 제구 +3, 포수 수비 +2`,
        effects: [
          ...mates.map((p) => ({ slot: p.slot, stat: 'ctl' as const, amount: 3 })),
          { slot: 'C', stat: 'def', amount: 2 },
        ],
      });
    }
  }

  const second = at('2B');
  const short = at('SS');
  if (second && short && second.seriesId === short.seriesId) {
    out.push({
      key: 'keystone',
      name: '키스톤 콤비',
      desc: `${second.card.name} – ${short.card.name} · 수비 +4`,
      effects: [{ slot: '2B', stat: 'def', amount: 4 }, { slot: 'SS', stat: 'def', amount: 4 }],
    });
  }

  const of = (['LF', 'CF', 'RF'] as SlotId[]).map(at);
  if (of.every(Boolean) && new Set(of.map((p) => p!.seriesId)).size === 1) {
    out.push({
      key: 'outfield',
      name: '외야 트리오',
      desc: `${names(of as Pick[])} · 수비 +3, 주루 +2`,
      effects: (['LF', 'CF', 'RF'] as SlotId[]).flatMap((slot) => [
        { slot, stat: 'def' as const, amount: 3 },
        { slot, stat: 'spd' as const, amount: 2 },
      ]),
    });
  }

  return out;
}

export function bonusFor(slot: SlotId, synergies: Synergy[]): Bonus {
  const bonus = Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Bonus;
  for (const s of synergies) {
    for (const e of s.effects) {
      if (e.slot !== slot) continue;
      if (e.stat === 'all') STAT_KEYS.forEach((k) => (bonus[k] += e.amount));
      else bonus[e.stat] += e.amount;
    }
  }
  STAT_KEYS.forEach((k) => (bonus[k] = Math.min(BONUS_CAP, bonus[k])));
  return bonus;
}

export function applyBonus<T extends PlayerCard>(card: T, bonus: Bonus): T {
  const add = (v: number, k: StatKey) => Math.min(99, v + bonus[k]);
  if (card.type === 'batter') {
    return { ...card, con: add(card.con, 'con'), pow: add(card.pow, 'pow'), eye: add(card.eye, 'eye'), spd: add(card.spd, 'spd'), def: add(card.def, 'def') };
  }
  return { ...card, stu: add(card.stu, 'stu'), ctl: add(card.ctl, 'ctl'), sta: add(card.sta, 'sta') };
}
