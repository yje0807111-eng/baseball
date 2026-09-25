/*
 * 주간 과제 — 주(월요일 시작, 현지 시각)마다 셋. 셋을 다 하면 보너스.
 * 과제는 '하던 대로 하면 채워지는 것'과 '이번 주에 해 볼 것'을 섞는다 — 새 기능(조건부 대회 · 기념 카드 · 특가 · 증강 · 승부처 지시)으로 이끈다.
 * 기록은 account.week = { key, counts: { 사건: 수 }, claimed: [과제 id], bonus: bool }. 주가 바뀌면 새로.
 */
export const MISSIONS = [
  { id: 'win5', ko: '승리 5번', ev: 'win', goal: 5, gold: 400 },
  { id: 'games8', ko: '경기 8번', ev: 'game', goal: 8, gold: 300 },
  { id: 'gain10', ko: '내 지시로 승률 +10%p 경기', ev: 'gain10', goal: 1, gold: 400 },
  { id: 'aug10', ko: '증강 10장 고르기', ev: 'aug', goal: 10, gold: 300 },
  { id: 'cup', ko: '조건부 대회 열기', ev: 'cup', goal: 1, gold: 500 },
  { id: 'tour8', ko: '토너먼트 8강 이상', ev: 'tour8', goal: 1, gold: 500 },
  { id: 'memento', ko: '드래프트 기념 카드 받기', ev: 'memento', goal: 1, gold: 500 },
  { id: 'deal', ko: '오늘의 특가 영입', ev: 'deal', goal: 1, gold: 300 },
];
export const WEEK_COUNT = 3;
export const WEEK_BONUS = 500;

/** 주 열쇠 — 그 주 월요일 날짜 (현지 시각) */
export function weekKey(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}

function seeded(key) {
  let h = 2166136261;
  for (const ch of String(key)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  let t = h >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 이번 주 과제 셋 — 모두에게 같은 주 같은 과제. 첫 과제는 늘 '하던 대로' 쪽(승리 · 경기) 하나 */
export function weekMissions(key = weekKey()) {
  const rng = seeded(`week-${key}`);
  const easy = MISSIONS.filter((m) => m.ev === 'win' || m.ev === 'game');
  const rest = MISSIONS.filter((m) => !easy.includes(m));
  const first = easy[Math.floor(rng() * easy.length)];
  const pool = [...rest];
  const out = [first];
  while (out.length < WEEK_COUNT && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/** 이번 주 기록 — 주가 바뀌었으면 빈 기록 */
export const weekOf = (week, key = weekKey()) => (week?.key === key ? week : { key, counts: {}, claimed: [], bonus: false });

/** 과제 진행 { m, n, done, claimed } */
export function missionState(week, key = weekKey()) {
  const w = weekOf(week, key);
  return weekMissions(key).map((m) => {
    const n = Math.min(m.goal, w.counts[m.ev] || 0);
    return { m, n, done: n >= m.goal, claimed: w.claimed.includes(m.id) };
  });
}
