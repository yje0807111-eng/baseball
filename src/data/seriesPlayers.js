// src/data/series/*.json (실제 시즌·대회 로스터) → 게임 선수 형식으로 변환
const modules = import.meta.glob('./series/*.json', { eager: true, import: 'default' });

const PITCHERS = ['SP', 'RP'];

/** 종합 능력치 = 영입가(CP). 포지션 역할에 맞춘 가중 평균 */
export function overallOf(position, s) {
  if (position === 'SP') return Math.round(s.stuff * 0.35 + s.control * 0.25 + s.stamina * 0.15 + s.stability * 0.25);
  if (position === 'RP') return Math.round(s.stuff * 0.4 + s.control * 0.2 + s.stability * 0.4);
  return Math.round(s.power * 0.3 + s.contact * 0.35 + s.speed * 0.15 + s.defense * 0.2);
}

/** 카드 id·그림 파일명에 쓸 수 있게 괄호 등을 뺀다. scripts/art-plan.mjs 와 같은 규칙 */
export const safeId = (s) => s.replace(/[^\p{L}\p{N}-]/gu, '');

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
      isNational: s.kind === 'national',
      isForeign: p.isForeign,
      note: p.note,
      stats: p.stats,
    })),
  }));
