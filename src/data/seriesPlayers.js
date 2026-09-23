// src/data/series/*.json (실제 시즌·대회 로스터) → 게임 선수 형식으로 변환
const modules = import.meta.glob('./series/*.json', { eager: true, import: 'default' });

/* 계산은 ratings.js 에 있다 — 데이터 없이 함수만 쓰는 화면을 위해 떼어 두었다 */
export { overallOf, costOf, safeId } from './ratings.js';
import { overallOf, costOf, safeId } from './ratings.js';

const PITCHERS = ['SP', 'RP'];

export const SERIES = Object.values(modules)
  .sort((a, b) => a.year - b.year || a.id.localeCompare(b.id))
  .map((s) => ({
    ...s,
    players: s.players.map((p) => ({
      id: `${s.id}_${safeId(p.personId)}`,
      personId: p.personId,
      name: p.name,
      year: p.year,
      team: s.kind === 'national' ? '대한민국' : p.team,
      club: p.team,
      seriesId: s.id,
      position: p.position,
      hand: p.hand,
      type: PITCHERS.includes(p.position) ? 'pitcher' : 'batter',
      overall: overallOf(p.position, p.stats),
      cost: costOf(overallOf(p.position, p.stats)),
      isNational: s.kind === 'national',
      isForeign: p.isForeign,
      note: p.note,
      source: p.source, // 실제 시즌 기록 한 줄 (내 팀 판의 선수 기록 표가 읽는다)
      stats: p.stats,
    })),
  }));
