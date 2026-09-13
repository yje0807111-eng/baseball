import type { BatterCard, PitcherCard, PlayerCard } from '../data/types';
import { ovr } from './ratings';
import type { Pick, SlotId } from './roster';
import type { TeamSetup } from './sim';
import { applyBonus, bonusFor, findSynergies, type Bonus, type Synergy } from './synergy';

export interface Entry<T extends PlayerCard = PlayerCard> {
  pick: Pick;
  /** 시너지 보너스가 반영된 카드 */
  eff: T;
  bonus: Bonus;
}

export interface TeamView {
  name: string;
  synergies: Synergy[];
  batters: Entry<BatterCard>[]; // 타순
  pitchers: Entry<PitcherCard>[]; // 선발, 셋업, 마무리
}

function battingOrder(entries: Entry<BatterCard>[]): Entry<BatterCard>[] {
  const rest = [...entries];
  // 드래프트 도중에는 타자가 5명 미만일 수 있으므로 빈 슬롯은 undefined로 두고 마지막에 걸러낸다.
  const take = (score: (c: BatterCard) => number): Entry<BatterCard> | undefined => {
    if (!rest.length) return undefined;
    let best = 0;
    rest.forEach((e, i) => { if (score(e.eff) > score(rest[best].eff)) best = i; });
    return rest.splice(best, 1)[0];
  };
  const cleanup = take((c) => c.pow * 0.7 + c.con * 0.3);
  const third = take((c) => c.con * 0.5 + c.pow * 0.5);
  const fifth = take((c) => c.pow * 0.6 + c.con * 0.4);
  const leadoff = take((c) => c.spd * 0.45 + c.eye * 0.3 + c.con * 0.25);
  const second = take((c) => c.con * 0.5 + c.eye * 0.4 + c.spd * 0.1);
  rest.sort((a, b) => ovr(b.eff) - ovr(a.eff));
  return [leadoff, second, third, cleanup, fifth, ...rest].filter((e): e is Entry<BatterCard> => e !== undefined);
}

const PITCH_ORDER: SlotId[] = ['SP', 'RP1', 'RP2'];

export function buildTeam(name: string, picks: Pick[]): TeamView {
  const synergies = findSynergies(picks);
  const entries: Entry[] = picks.map((pick) => {
    const bonus = bonusFor(pick.slot, synergies);
    return { pick, eff: applyBonus(pick.card, bonus), bonus };
  });
  const batters = entries.filter((e): e is Entry<BatterCard> => e.eff.type === 'batter');
  const pitchers = entries
    .filter((e): e is Entry<PitcherCard> => e.eff.type === 'pitcher')
    .sort((a, b) => PITCH_ORDER.indexOf(a.pick.slot) - PITCH_ORDER.indexOf(b.pick.slot));
  return { name, synergies, batters: battingOrder(batters), pitchers };
}

export function toSetup(team: TeamView): TeamSetup {
  return {
    name: team.name,
    lineup: team.batters.map((e) => ({ card: e.eff, slot: e.pick.slot })),
    pitchers: team.pitchers.map((e) => ({ card: e.eff, slot: e.pick.slot })),
  };
}
