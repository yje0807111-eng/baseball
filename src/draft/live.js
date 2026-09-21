/*
 * 라이브 드래프트 진행 — 규칙은 src/data/DRAFT_SPEC.md.
 * 여러 구단이 같은 보드(시리즈 하나 = 선수 18명)를 스네이크 순서로 나눠 갖는다.
 * 화면과 떼어 놓은 순수 상태 기계다: 상태를 받아 다음 상태를 돌려준다 (React 도 타이머도 모른다).
 */
import { getLockReason, ROSTER_SIZE, SALARY_CAP, DRAFT_SERIES, freeSlot, FIELD_SLOTS, POS_LABEL } from '../KboAugmentDraft.jsx';

export const CLUB_COUNT = 8;        // 참가 구단 (나 1 + AI 7)
export const LAPS_PER_BOARD = 2;    // 보드 하나를 도는 바퀴 수 — 18명 중 16명이 나가고 2명은 유찰
export const PICK_SECONDS = 25;     // 한 픽 제한 시간 (화면이 재고, 넘기면 autoPick)
/* 보드 수(=10). KboAugmentDraft 와 서로 불러오는 사이라 모듈을 읽는 때가 아니라 쓸 때 센다 */
export const boardCount = () => Math.ceil(ROSTER_SIZE / LAPS_PER_BOARD);

/** AI 성향 — 같은 규칙 위에서 무엇을 더 좋아하는지만 다르다 */
export const TRAITS = {
  power: { ko: '한 방', score: (p) => (p.type === 'batter' ? p.stats.power * 0.5 : -6) },
  mound: { ko: '마운드', score: (p) => (p.type === 'pitcher' ? 14 : 0) },
  value: { ko: '가성비', score: (p) => (p.overall - p.cost) * 1.2 },
  defense: { ko: '수비', score: (p) => (p.type === 'batter' ? p.stats.defense * 0.4 + (['C', 'SS', '2B'].includes(p.position) ? 8 : 0) : 0) },
  balance: { ko: '균형', score: () => 0 },
};

export const AI_CLUBS = [
  { name: '한빛 다이노스', trait: 'power', color: '#f87171' },
  { name: '청우 베어스', trait: 'mound', color: '#60a5fa' },
  { name: '금성 트윈스', trait: 'value', color: '#fbbf24' },
  { name: '남해 자이언츠', trait: 'defense', color: '#34d399' },
  { name: '백호 타이거즈', trait: 'balance', color: '#fb923c' },
  { name: '태극 이글스', trait: 'power', color: '#a78bfa' },
  { name: '해풍 위즈', trait: 'mound', color: '#38bdf8' },
];

const shuffle = (a, rng) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** 픽 번호(0부터) → 몇 바퀴째 · 그 바퀴의 몇 번째 자리 · 어느 보드 */
export const lapOf = (pick) => Math.floor(pick / CLUB_COUNT);
export const boardOf = (pick) => Math.floor(lapOf(pick) / LAPS_PER_BOARD);
/** 스네이크: 짝수 바퀴는 순번대로, 홀수 바퀴는 거꾸로 */
export function clubAt(pick, order) {
  const lap = lapOf(pick);
  const i = pick % CLUB_COUNT;
  return order[lap % 2 === 0 ? i : CLUB_COUNT - 1 - i];
}

/** 새 판. myName 구단이 order 어딘가에 섞여 들어간다(추첨) */
export function createLive({ myName = '나의 드림팀', myColor = '#e879f9', cap = SALARY_CAP, series = DRAFT_SERIES, rng = Math.random } = {}) {
  const clubs = [
    { name: myName, trait: 'me', color: myColor, me: true },
    ...AI_CLUBS,
  ].map((c) => ({ ...c, roster: [], cp: cap }));
  const order = shuffle(clubs.map((_, i) => i), rng);          // 추첨한 순번 (order[자리] = 구단 번호)
  const pool = shuffle(series.filter((s) => s.players.length), rng).slice(0, boardCount());
  return {
    cap,
    clubs,
    order,
    pool,                    // 이번 판에서 열 보드(시리즈) 10개
    pick: 0,                 // 몇 번째 픽인지 (0부터, 끝은 CLUB_COUNT * ROSTER_SIZE)
    taken: {},               // 선수 id → 데려간 구단 번호
    picks: [],               // { pick, club, player, board }
    lastAuto: null,          // 방금 자동 지명이었는지 (화면 알림용)
  };
}

export const myIndex = (s) => s.clubs.findIndex((c) => c.me);
export const currentClub = (s) => clubAt(s.pick, s.order);
export const isMyTurn = (s) => !isDone(s) && currentClub(s) === myIndex(s);
export const isDone = (s) => s.pick >= CLUB_COUNT * ROSTER_SIZE;
export const boardNo = (s) => Math.min(boardCount() - 1, boardOf(s.pick));
export const currentSeries = (s) => s.pool[boardNo(s)];
/** 지금 보드에 깔린 선수 — 데려간 선수도 그대로 두고 taken 으로 표시한다 */
export const boardPlayers = (s) => currentSeries(s)?.players || [];
/** 이 구단이 지금 순번에서 몇 번째로 뽑는지 (1부터) */
export const slotInLap = (s) => (s.pick % CLUB_COUNT) + 1;

/** 아직 못 채운 필드 자리 (예비 자리는 아무나 받으므로 세지 않는다) */
export function openFieldSlots(roster) {
  const used = new Set(roster.map((p) => p.slot).filter(Boolean));
  return FIELD_SLOTS.filter((s) => !used.has(s.id));
}

/** 이 선수를 데려간 구단 번호 (없으면 null) — 0번 구단도 있으므로 값으로 참·거짓을 따지지 않는다 */
export const takenBy = (s, player) => (player && player.id in s.taken ? s.taken[player.id] : null);

/** 지명할 수 없는 이유 (기존 드래프트와 같은 규칙 + 막판 자리 강제) */
export function lockReason(s, player, club = currentClub(s)) {
  const c = s.clubs[club];
  const owner = takenBy(s, player);
  if (owner != null) return `${s.clubs[owner].name} 지명`;
  const base = getLockReason(player, c.roster, c.cp);
  if (base) return base;
  const forced = forcedPositions(s, club);
  if (forced && !forced.includes(player.position)) return `${forced.map((p) => POS_LABEL[p]).join(' · ')} 자리를 채울 차례`;
  return null;
}

/** 남은 픽 수와 못 채운 필드 자리 수가 같아지면 그 자리 포지션만 고를 수 있다 */
export function forcedPositions(s, club = currentClub(s)) {
  const c = s.clubs[club];
  const left = ROSTER_SIZE - c.roster.length;                      // 앞으로 받을 픽 수
  const open = openFieldSlots(c.roster);
  if (!open.length || left > open.length) return null;
  return [...new Set(open.map((x) => x.pos))];
}

/** 이 구단이 지금 지명할 수 있는 선수들 */
export const pickable = (s, club = currentClub(s)) => boardPlayers(s).filter((p) => !lockReason(s, p, club));

/** 성향 점수 — 높을수록 먼저 데려간다 */
export function scoreFor(s, player, club = currentClub(s)) {
  const c = s.clubs[club];
  const trait = TRAITS[c.trait] || TRAITS.balance;
  const need = openFieldSlots(c.roster).some((x) => x.pos === player.position) ? 10 : 0; // 빈 자리를 채우는 선수 우대
  const room = c.cp - (ROSTER_SIZE - c.roster.length - 1) * 55;    // 남은 자리 몫을 남긴 상한 (aiDraft 와 같은 생각)
  const afford = player.cost > room ? -25 : 0;
  return player.overall + need + afford + trait.score(player);
}

/** AI(또는 시간 초과)가 고를 선수 — 못 고르면 null(패스) */
export function autoPick(s, club = currentClub(s), rng = Math.random) {
  const list = pickable(s, club);
  if (!list.length) return null;
  const ranked = list.map((p) => ({ p, v: scoreFor(s, p, club) })).sort((a, b) => b.v - a.v);
  const top = ranked.slice(0, Math.min(3, ranked.length));          // 늘 1등만 고르면 판이 똑같아진다
  return top[Math.floor(rng() * top.length)].p;
}

/** 지명. player 가 null 이면 패스(고를 선수가 없을 때). 규칙에 어긋나면 상태를 그대로 돌려준다 */
export function pick(s, player, { auto = false } = {}) {
  if (isDone(s)) return s;
  const club = currentClub(s);
  if (player && lockReason(s, player, club)) return s;
  const clubs = s.clubs.map((c, i) => (i !== club || !player ? c : {
    ...c,
    cp: c.cp - player.cost,
    roster: [...c.roster, { ...player, slot: freeSlot(c.roster, player.position)?.id || null }],
  }));
  return {
    ...s,
    clubs,
    taken: player ? { ...s.taken, [player.id]: club } : s.taken,
    picks: player ? [...s.picks, { pick: s.pick, club, player, board: boardNo(s) }] : s.picks,
    pick: s.pick + 1,
    lastAuto: player ? auto : null,
  };
}

/** 내 차례가 올 때까지 AI 가 알아서 뽑는다 (화면은 한 픽씩 시간을 두고 부른다) */
export function stepAi(s, rng = Math.random) {
  if (isDone(s) || isMyTurn(s)) return s;
  return pick(s, autoPick(s, currentClub(s), rng), { auto: true });
}

/** 판이 끝난 뒤 쓸 구단별 결과 */
export const rosterOf = (s, club) => s.clubs[club].roster;
export const myRoster = (s) => rosterOf(s, myIndex(s));
/** 나를 뺀 구단 중 전력이 가장 가까운 상대 (정비 → 경기로 넘길 때) */
export function opponentOf(s) {
  const me = myIndex(s);
  const avg = (r) => (r.length ? r.reduce((t, p) => t + p.overall, 0) / r.length : 0);
  const mine = avg(myRoster(s));
  return s.clubs
    .map((c, i) => ({ i, d: Math.abs(avg(c.roster) - mine) }))
    .filter((x) => x.i !== me)
    .sort((a, b) => a.d - b.d)[0].i;
}
