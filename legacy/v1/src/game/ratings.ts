import type { PlayerCard } from '../data/types';

export function ovr(c: PlayerCard): number {
  if (c.type === 'batter') {
    return Math.round(c.con * 0.3 + c.pow * 0.3 + c.eye * 0.15 + c.spd * 0.1 + c.def * 0.15);
  }
  return Math.round(c.role === 'SP' ? c.stu * 0.5 + c.ctl * 0.35 + c.sta * 0.15 : c.stu * 0.6 + c.ctl * 0.4);
}

export function tier(v: number): 'legend' | 'star' | 'good' | 'avg' {
  if (v >= 90) return 'legend';
  if (v >= 82) return 'star';
  if (v >= 72) return 'good';
  return 'avg';
}
