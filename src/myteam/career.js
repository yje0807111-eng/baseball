/*
 * 통산 기록 — 경기 기록(history)은 최근 50경기만 남으니, 끝난 경기마다 여기에 더해 둔다(account.career).
 *  bat: 카드 id → { name, g, ab, h, hr, rbi, bb, k }       (경기 상세의 선발 타순 9명)
 *  arm: 카드 id → { name, g, bf, h, k, bb, r, o, ro }          o = 잡은 아웃, ro = 아웃을 센 경기의 실점(옛 경기엔 아웃이 없어 평균실점에서 뺀다)
 *  aug: 증강 id → { n, w }                                   그 증강을 고른 경기 수 · 이긴 수
 * 예전 저장본은 처음 읽을 때 남아 있는 경기 기록(최대 50)으로 채운다 — careerOf.
 * 자동 진행한 랭크 경기처럼 상세가 없는 경기는 승패만 센다.
 */
export const emptyCareer = () => ({ v: 1, games: 0, wins: 0, bat: {}, arm: {}, aug: {} });

/** 경기 기록 한 줄을 더한 새 통산 */
export function careerAdd(career, h) {
  const c = { ...career, games: career.games + 1, wins: career.wins + (h.winner === 'my' ? 1 : 0), bat: { ...career.bat }, arm: { ...career.arm }, aug: { ...career.aug } };
  const d = h.detail;
  for (const b of d?.lineup || []) {
    const s = c.bat[b.id] || { name: b.name, g: 0, ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0 };
    c.bat[b.id] = { ...s, name: b.name, g: s.g + 1, ab: s.ab + (b.ab || 0), h: s.h + (b.h || 0), hr: s.hr + (b.hr || 0), rbi: s.rbi + (b.rbi || 0), bb: s.bb + (b.bb || 0), k: s.k + (b.k || 0) };
  }
  for (const p of d?.arms || []) {
    const s = c.arm[p.id] || { name: p.name, g: 0, bf: 0, h: 0, k: 0, bb: 0, r: 0, o: 0, ro: 0 };
    const known = Number.isFinite(p.o);
    c.arm[p.id] = { ...s, name: p.name, g: s.g + 1, bf: s.bf + (p.bf || 0), h: s.h + (p.h || 0), k: s.k + (p.k || 0), bb: (s.bb || 0) + (p.bb || 0), r: s.r + (p.r || 0), o: s.o + (known ? p.o : 0), ro: s.ro + (known ? p.r || 0 : 0) };
  }
  for (const a of h.augs || []) {
    const s = c.aug[a.id] || { n: 0, w: 0 };
    c.aug[a.id] = { n: s.n + 1, w: s.w + (h.winner === 'my' ? 1 : 0) };
  }
  return c;
}

/** 경기 기록(최신이 앞)으로 통산 만들기 */
export const careerFrom = (history = []) => [...history].reverse().reduce(careerAdd, emptyCareer());
/** 계정의 통산 — 저장된 게 없으면 남은 경기 기록으로 */
export const careerOf = (a) => (a?.career?.v === 1 ? a.career : careerFrom(a?.history || []));

/* 보이는 값 */
export const avgOf = (s) => (s.ab ? s.h / s.ab : null);                     // 타율
export const ipOf = (o) => `${Math.floor(o / 3)}${o % 3 ? `.${o % 3}` : ''}`; // 이닝 12.1 = 12⅓
export const raOf = (s) => (s.o ? (s.ro * 27) / s.o : null);                // 9이닝당 실점
export const fmtAvg = (v) => (v == null ? '—' : v.toFixed(3).replace(/^0/, ''));
export const fmtRa = (v) => (v == null ? '—' : v.toFixed(2));
/* 순위에 드는 최소 기준 — 몇 타석 · 몇 이닝으로 1위가 되지 않게(KBO 규정 타석 · 이닝의 축소판) */
export const QUAL_AB = (games) => Math.max(10, Math.round(games * 2.5));
export const QUAL_OUTS = (games) => Math.max(27, games * 3);
