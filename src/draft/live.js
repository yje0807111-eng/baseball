/*
 * 라이브 드래프트 진행 — 규칙은 src/data/DRAFT_SPEC.md.
 * 여러 구단이 같은 보드(시리즈 하나 = 선수 18명)를 스네이크 순서로 나눠 갖는다.
 * 화면과 떼어 놓은 순수 상태 기계다: 상태를 받아 다음 상태를 돌려준다 (React 도 타이머도 모른다).
 */
import { getLockReason, ROSTER_SIZE, SALARY_CAP, DRAFT_SERIES, freeSlot, FIELD_SLOTS, POS_LABEL } from '../KboAugmentDraft.jsx';
import { BANNERS } from '../myteam/teamArt.js';

export const CLUB_COUNT = 8;        // 참가 구단 (나 1 + AI 7)
export const LAPS_PER_BOARD = 1;    // 보드 하나를 도는 바퀴 수 — 8구단이 한 바퀴 돌면 선수가 남아 있어도 다음 시리즈로
export const PICK_SECONDS = 25;     // 한 픽 제한 시간 (화면이 재고, 넘기면 autoPick)
export const BOARD_SIZE = 18;       // 보드에 까는 선수 수 — 실제 구단 시리즈 한 팀과 같은 수
/* 보드 포지션 구성: 구단 시즌 87개의 평균(SP 4.4 · RP 3.3 · C 1.4 · 내야 4.7 · OF 3.8 · DH 0.5)을 반올림한 것.
   선수가 18명보다 많은 시리즈에서 이 구성대로 뽑으면 어느 보드든 한 팀을 꾸릴 만큼 자리가 고루 나온다 */
const BOARD_MIX = { SP: 4, RP: 3, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 4, DH: 1 };
/* 보드 수(=10). KboAugmentDraft 와 서로 불러오는 사이라 모듈을 읽는 때가 아니라 쓸 때 센다 */
export const boardCount = () => Math.ceil(ROSTER_SIZE / LAPS_PER_BOARD);

/**
 * AI 성향 — 구단마다 드래프트 플랜이 있다.
 *  plan: 몇 번째로 뽑을 때 어느 자리를 노리는지 (앞에서부터 차례로, 그 자리가 보드에 없으면 다음 순위로)
 *  score: 같은 자리 안에서 무엇을 더 높게 치는지
 * 플랜이 있으니 구단마다 팀 모양이 다르게 나오고, 판을 다시 해도 그 구단다운 선택이 이어진다.
 */
export const TRAITS = {
  power: { ko: '한 방', // 강타선 먼저, 마운드는 중반에
    plan: ['OF', '1B', 'DH', '3B', 'SP', 'OF', 'C', 'SP', 'RP', '2B', 'SS', 'RP', 'OF', 'SP', 'RP', 'RP', '1B', '3B', 'SP', 'RP'],
    score: (p) => (p.type === 'batter' ? p.stats.power * 0.5 : -4) },
  mound: { ko: '마운드', // 선발 · 불펜부터 채우고 야수는 뒤에
    plan: ['SP', 'SP', 'RP', 'SP', 'RP', 'C', 'SS', 'OF', 'RP', '1B', '2B', 'OF', 'SP', '3B', 'OF', 'RP', 'DH', 'RP', 'SP', 'C'],
    score: (p) => (p.type === 'pitcher' ? p.stats.stuff * 0.25 + p.stats.control * 0.15 : 0) },
  value: { ko: '가성비', // 자리는 고루, 대신 값싼 알짜를 노린다
    plan: ['SP', 'C', 'SS', 'OF', 'RP', '1B', '2B', 'SP', 'OF', '3B', 'RP', 'SP', 'OF', 'RP', 'DH', 'RP', 'SP', 'C', 'SS', '1B'],
    score: (p) => (p.overall - p.cost) * 1.6 },
  defense: { ko: '수비', // 센터라인(포수 · 유격수 · 2루)부터
    plan: ['C', 'SS', '2B', 'OF', 'SP', '3B', 'SP', 'RP', 'OF', '1B', 'RP', 'SP', 'OF', 'RP', 'C', 'SS', 'RP', 'SP', 'DH', '2B'],
    score: (p) => (p.type === 'batter' ? p.stats.defense * 0.45 : p.stats.stability * 0.2) },
  balance: { ko: '균형', // 빈 자리 중 가장 좋은 선수
    plan: ['SP', 'OF', 'C', 'SP', 'SS', 'RP', '1B', 'OF', '3B', 'RP', '2B', 'SP', 'OF', 'RP', 'SP', 'DH', 'RP', 'C', 'SS', '1B'],
    score: () => 0 },
};
/**
 * 구단 급 — 같은 성향이라도 얼마나 야무지게 뽑는지가 다르다. 도장깨기에서 약한 구단부터 만나게 하는 축이다.
 *  reserve: 남은 자리 하나에 남겨 두는 CP (적을수록 초반에 특급을 지른다)
 *  plan:    플랜에 적힌 자리를 얼마나 고집하는지 (낮을수록 자리보다 좋은 선수를 집는다)
 *  spread:  1등과 이만큼 안쪽이면 그중에서 아무나 (넓을수록 헛발질이 잦다)
 */
export const GRADES = {
  ace:   { ko: '강호', reserve: 42, plan: 10, spread: 1 },  // 좋은 선수를 먼저, 돈도 과감히
  solid: { ko: '탄탄', reserve: 48, plan: 18, spread: 3 },
  plain: { ko: '평범', reserve: 52, plan: 22, spread: 5 },
  weak:  { ko: '약체', reserve: 60, plan: 26, spread: 9 },  // 플랜만 고집하다 돈을 남긴다
};
/** 상대 일곱 구단에 돌릴 급 — 강호 하나 · 탄탄 둘 · 평범 둘 · 약체 둘 */
const GRADE_ORDER = ['ace', 'solid', 'solid', 'plain', 'plain', 'weak', 'weak'];
export const gradeOf = (club) => GRADES[club?.grade] || GRADES.plain;

/** 이 구단이 이번 차례에 노리는 자리 — 플랜에서 아직 못 채운 자리를 앞에서부터 찾는다 */
export function planTarget(roster, trait) {
  const plan = (TRAITS[trait] || TRAITS.balance).plan || [];
  const have = {};
  roster.forEach((p) => { have[p.position] = (have[p.position] || 0) + 1; });
  const want = {};
  for (const pos of plan.slice(0, roster.length + 1)) want[pos] = (want[pos] || 0) + 1;
  // 계획한 만큼 아직 못 채운 자리 중 가장 앞선 것
  for (const pos of plan) if ((want[pos] || 0) > (have[pos] || 0)) return pos;
  return plan[Math.min(roster.length, plan.length - 1)] || null;
}

/* 상대 구단은 실제 구단에서 뽑는다 (국가대표 · 레전드는 구단이 아니라 뺀다).
   엠블럼은 public/ui/clubs/<키>.webp — 실제 로고가 아니라 구단 상징을 새로 그린 그림이다 */
export const CLUB_POOL = BANNERS.filter((b) => !['korea', 'legend'].includes(b.key));
const TRAIT_ORDER = ['power', 'mound', 'value', 'defense', 'balance', 'power', 'mound'];
export const emblemOf = (key) => `ui/clubs/${key}.webp`;
/** 프로필 배너 키 → 내 카드에 뜰 그림. 고른 배너가 없으면 드림팀 그림 */
export const bannerEmblem = (key) => emblemOf(key || 'dream');

const shuffle = (a, rng) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** 시리즈를 보드 한 판(18명)으로 추린다. 포지션은 BOARD_MIX 만큼 먼저 채우고, 모자란 자리는 남은 선수로 메운다 */
export function sampleBoard(series, rng = Math.random) {
  if (!series || series.players.length <= BOARD_SIZE) return series;
  const pool = shuffle(series.players, rng);
  const picked = [];
  const taken = new Set();
  for (const [pos, want] of Object.entries(BOARD_MIX)) {
    for (const pl of pool) {
      if (picked.filter((x) => x.position === pos).length >= want) break;
      if (pl.position === pos && !taken.has(pl.id)) { picked.push(pl); taken.add(pl.id); }
    }
  }
  for (const pl of pool) { // 그 시리즈에 없는 포지션이 있으면 남은 선수로 18명을 맞춘다
    if (picked.length >= BOARD_SIZE) break;
    if (!taken.has(pl.id)) { picked.push(pl); taken.add(pl.id); }
  }
  return { ...series, players: picked.slice(0, BOARD_SIZE) };
}

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
export function createLive({ myName = '나의 드림팀', myShort = null, myColor = '#e879f9', myEmblem = null, cap = SALARY_CAP, series = DRAFT_SERIES, rng = Math.random } = {}) {
  // 상대 일곱 구단은 실제 구단 중에서 판마다 새로 뽑는다
  const rivals = shuffle(CLUB_POOL, rng).slice(0, CLUB_COUNT - 1)
    .map((b, i) => ({ name: b.label, short: b.label.split(' ')[0], key: b.key, color: b.color, emblem: emblemOf(b.key), trait: TRAIT_ORDER[i], grade: GRADE_ORDER[i] }));
  const clubs = [
    // 내 구단의 짧은 이름은 내 닉네임 (카드에 들어가야 하므로 네 글자까지)
    { name: myName, short: (myShort || myName).slice(0, 4), trait: 'me', color: myColor, emblem: myEmblem, me: true },
    ...rivals,
  ].map((c) => ({ ...c, roster: [], cp: cap }));
  const order = shuffle(clubs.map((_, i) => i), rng);          // 추첨한 순번 (order[자리] = 구단 번호)
  // 보드는 라운드마다 하나씩 — 모드에 시리즈가 모자라면 다시 섞어 이어 붙인다 (이미 나간 선수는 그대로 잠겨 있다)
  const usable = series.filter((s) => s.players.length);
  const pool = [];
  while (pool.length < boardCount() && usable.length) pool.push(...shuffle(usable, rng).slice(0, boardCount() - pool.length));
  const boards = pool.map((x) => sampleBoard(x, rng)); // 18명이 넘는 시리즈는 포지션을 고루 섞어 18명으로
  return {
    cap,
    clubs,
    order,
    pool: boards,            // 이번 판에서 열 보드 (시리즈마다 18명)
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
  // 채워야 할 자리의 선수가 이 보드에 하나도 없으면 강제하지 않는다 (강제하면 한 명도 못 뽑고 지나간다)
  if (forced && !forced.includes(player.position)
    && boardPlayers(s).some((p) => forced.includes(p.position) && takenBy(s, p) == null && !getLockReason(p, c.roster, c.cp))) {
    return `${forced.map((p) => POS_LABEL[p]).join(' · ')} 자리를 채울 차례`;
  }
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
  // 막판에는 플랜보다 빈 자리를 먼저 메운다 (플랜만 보다가 자리를 못 채우면 퓨처스가 들어간다)
  const late = ROSTER_SIZE - c.roster.length <= 6;
  const need = openFieldSlots(c.roster).some((x) => x.pos === player.position) ? (late ? 26 : 8) : 0;
  const target = planTarget(c.roster, c.trait);
  const g = gradeOf(c);
  const onPlan = target && player.position === target ? (late ? 6 : g.plan) : 0;      // 이번 차례에 노리던 자리
  const room = c.cp - (ROSTER_SIZE - c.roster.length - 1) * (g.reserve - 6); // 남은 자리 몫을 남긴 상한
  const afford = player.cost > room ? -25 : 0;
  return player.overall + need + onPlan + afford + trait.score(player);
}

/** AI(또는 시간 초과)가 고를 선수 — 못 고르면 null(패스) */
export function autoPick(s, club = currentClub(s), rng = Math.random) {
  const all = pickable(s, club);
  if (!all.length) return null;
  // 남은 자리를 채울 몫은 남겨 둔다 — 앞에서 다 써 버리면 뒤에서 한 명도 못 뽑는다. 얼마를 남기는지는 급마다 다르다
  const c = s.clubs[club];
  const g = gradeOf(c);
  const room = c.cp - (ROSTER_SIZE - c.roster.length - 1) * g.reserve;
  const afford = all.filter((p) => p.cost <= room);
  // 그 안에 아무도 없으면 가장 싼 선수 하나만 후보로 둔다 (비싼 선수를 질러 뒤를 비우지 않게)
  const budget = afford.length ? afford : [all.reduce((m, p) => (p.cost < m.cost ? p : m), all[0])];
  // 주전 자리를 먼저 채운다 — 예비만 남기면 뒤에 오는 보드에서 자리 마감으로 한 명도 못 뽑는다
  const open = openFieldSlots(c.roster);
  const starters = budget.filter((p) => open.some((x) => x.pos === p.position));
  const list = starters.length ? starters : budget;
  const ranked = list.map((p) => ({ p, v: scoreFor(s, p, club) })).sort((a, b) => b.v - a.v);
  // 플랜대로 뽑되, 점수가 엇비슷한 선수끼리만 갈린다 — 급이 낮을수록 그 폭이 넓어 엉뚱한 선택이 섞인다
  const close = ranked.filter((x) => x.v >= ranked[0].v - g.spread);
  return close[Math.floor(rng() * close.length)].p;
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

/**
 * 이 구단이 앞으로 한 명도 데려갈 수 없는지 — 엔트리가 찼거나, 남은 보드를 통틀어 캡 안에 드는 선수가 없다.
 * 사람 구단이 이렇게 되면 남은 라운드를 기다릴 까닭이 없다
 */
export function cannotPickMore(s, club = myIndex(s)) {
  const c = s.clubs[club];
  if (c.roster.length >= ROSTER_SIZE) return true;
  return !s.pool.slice(boardNo(s)).some((b) => b.players
    .some((pl) => takenBy(s, pl) == null && !getLockReason(pl, c.roster, c.cp)));
}

/** 남은 픽을 모두 소화한 마지막 판 — AI 는 뽑고, 나는 넘긴다 */
export function finishAll(s, rng = Math.random) {
  let out = s;
  let guard = 0;
  while (!isDone(out) && guard++ < CLUB_COUNT * ROSTER_SIZE + 10) {
    out = isMyTurn(out) ? pick(out, null) : stepAi(out, rng);
  }
  return out;
}

/** 판이 끝난 뒤 쓸 구단별 결과 */
export const rosterOf = (s, club) => s.clubs[club].roster;
export const myRoster = (s) => rosterOf(s, myIndex(s));
/**
 * 구단 전력 — 주전 자리에 앉은 선수의 평균. 빈 자리는 퓨처스가 들어가므로 60 으로 친다.
 * 예비까지 넣은 평균보다 실제 경기력과 가깝다
 */
export function clubStrength(s, club) {
  const by = {};
  s.clubs[club].roster.forEach((p) => { if (p.slot) by[p.slot] = p; });
  const v = FIELD_SLOTS.map((x) => (by[x.id] ? by[x.id].overall : 60));
  return v.reduce((t, x) => t + x, 0) / v.length;
}

/** 도장깨기 사다리 — 나를 뺀 구단을 약한 순서로. 앞에서부터 차례로 만난다 */
export function ladder(s) {
  const me = myIndex(s);
  return s.clubs
    .map((c, i) => ({ club: i, strength: clubStrength(s, i) }))
    .filter((x) => x.club !== me)
    .sort((a, b) => a.strength - b.strength)
    .map((x, i) => ({ ...x, step: i }));
}

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
