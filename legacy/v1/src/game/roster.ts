import type { PlayerCard } from '../data/types';

export type SlotId = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH' | 'SP' | 'RP1' | 'RP2';

export const SLOTS: { id: SlotId; label: string }[] = [
  { id: 'C', label: '포수' },
  { id: '1B', label: '1루수' },
  { id: '2B', label: '2루수' },
  { id: '3B', label: '3루수' },
  { id: 'SS', label: '유격수' },
  { id: 'LF', label: '좌익수' },
  { id: 'CF', label: '중견수' },
  { id: 'RF', label: '우익수' },
  { id: 'DH', label: '지명타자' },
  { id: 'SP', label: '선발' },
  { id: 'RP1', label: '셋업' },
  { id: 'RP2', label: '마무리' },
];

export const SLOT_LABEL = Object.fromEntries(SLOTS.map((s) => [s.id, s.label])) as Record<SlotId, string>;

export interface Pick {
  slot: SlotId;
  seriesId: string;
  card: PlayerCard;
}

const OUTFIELD: SlotId[] = ['LF', 'CF', 'RF'];

/** 들어갈 수 있는 슬롯, 선호 순서대로. 외야수는 외야 세 자리 어디든, 모든 타자는 지명타자 가능. */
export function eligibleSlots(card: PlayerCard): SlotId[] {
  if (card.type === 'pitcher') return card.role === 'SP' ? ['SP', 'RP1', 'RP2'] : ['RP1', 'RP2'];
  const out: SlotId[] = [];
  const add = (s: SlotId) => { if (!out.includes(s)) out.push(s); };
  for (const pos of card.pos) {
    if (pos === 'DH') continue;
    if (OUTFIELD.includes(pos)) [pos, ...OUTFIELD].forEach(add);
    else add(pos);
  }
  add('DH');
  return out;
}

export function openSlotsFor(card: PlayerCard, picks: Pick[]): SlotId[] {
  if (picks.some((p) => p.card.id === card.id)) return [];
  const filled = new Set(picks.map((p) => p.slot));
  return eligibleSlots(card).filter((s) => !filled.has(s));
}
