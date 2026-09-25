/*
 * 내 팀 저장소 — 지금은 브라우저(localStorage). 나중에 로그인 서버가 생기면
 * loadAccount/saveAccount 안쪽만 바꿔 끼우면 된다 (화면은 이 파일만 본다).
 */
import { SQUAD_CAP } from './rules.js';
import { STAFF } from './staff.js';
import { finishOf, PLACE_REWARD } from './rewards.js';

const KEY = 'kbo.myteam.v1';

const staffById = new Map(STAFF.map((s) => [s.id, s]));
const freshStaff = (staff = {}) => Object.fromEntries(Object.entries(staff).map(([slot, s]) => {
  const base = s ? staffById.get(s.id) : null;
  if (!base) return [slot, null];
  return [slot, { ...base, ...(s.level > 1 ? { level: s.level } : {}), ...(s.contracted ? { contracted: true, cost: 0 } : {}) }];
}));
/* 능력치 눈금을 50~110 으로 넓히며 기본 캡이 2000 에서 올랐다.
   그전에 저장된 팀은 cap 에 옛 기본값이 박혀 있으니, 상점에서 산 만큼만 새 기본에 얹어 다시 센다. */
const OLD_SQUAD_CAP = 2000;
/** 상점에서 살 수 있는 캡 확장은 +40 과 +100 뿐 — 이 둘로 만들 수 있는 값인가 */
const buyableCap = (v) => v >= 0 && v % 20 === 0 && v !== 20 && v !== 60;
/**
 * 한때 라커를 열 때마다 캡이 330(= 2330 − 2000)씩 불어나던 적이 있다.
 * 기본 캡을 넘는 몫에서 330의 배수를 덜어 내되, 남는 값이 상점에서 산 만큼으로
 * 설명될 때만 덜어 낸다 — 정상으로 늘린 캡을 깎지 않기 위해서다.
 * 이미 바른 값이면 아무것도 덜지 않으므로 몇 번을 거쳐도 같은 값이 나온다.
 */
export function fixInflatedCap(cap, base = SQUAD_CAP, step = SQUAD_CAP - OLD_SQUAD_CAP) {
  const extra = (cap ?? base) - base;
  if (extra <= 0 || step <= 0) return cap ?? base;
  for (let n = Math.floor(extra / step); n >= 1; n -= 1) {
    if (buyableCap(extra - step * n)) return base + (extra - step * n);
  }
  return cap;
}

const withTeam = (team) => {
  const t = { ...emptyTeam(), ...(team || {}) };
  /* 한 번 저장된 적 있는 팀(updatedAt)이면서 아직 새 눈금을 안 거친 것만 다시 센다.
     새로 만든 팀까지 이 길을 타면 열 때마다 캡이 불어난다 */
  const older = t.updatedAt && t.capBase !== SQUAD_CAP;
  const moved = older ? SQUAD_CAP + Math.max(0, (t.cap ?? SQUAD_CAP) - OLD_SQUAD_CAP) : t.cap;
  return { ...t, cap: fixInflatedCap(moved), capBase: SQUAD_CAP, staff: freshStaff(t.staff) };
};

const emptyTeam = () => ({
  name: '나의 드림팀',
  squad: [], // 선수 26명
  staff: {}, // { manager, head, batting, pitching }
  lineup: [], // 선발 라인업 선수 id 9개 (없으면 자동)
  rotation: [], // 선발 투수 순서
  cap: SQUAD_CAP,
  record: { w: 0, l: 0, d: 0 },
  updatedAt: null,
});

export const START_GOLD = 5000;

/* 증강 풀 관리: 등급마다 제외 목록 · 제외 칸(기본 5, 제거권으로 최대 8) · 증강 레벨 · 제거권/강화권 */
export const AUG_TIERS = ['silver']; // 증강 등급은 하나로 합쳤다
export const AUG_SLOT_BASE = 5;
export const AUG_SLOT_MAX = 8;
export const AUG_LEVEL_MAX = 5;
const emptyAug = () => ({
  bans: { silver: [], gold: [], prismatic: [] },
  favs: [],                       // 즐겨찾기한 증강 id
  slots: { silver: AUG_SLOT_BASE, gold: AUG_SLOT_BASE, prismatic: AUG_SLOT_BASE },
  levels: {},
  removeTickets: 0,
  upgradeTickets: 0,
});
const withAug = (a) => {
  const d = emptyAug(); const g = a?.aug || {};
  return { ...d, ...g, bans: { ...d.bans, ...(g.bans || {}) }, slots: { ...d.slots, ...(g.slots || {}) }, levels: { ...(g.levels || {}) }, favs: [...(g.favs || [])] };
};

/** 증강 풀 설정 저장 (제외 · 칸 · 레벨 · 권) */
export function saveAug(aug) {
  const a = read();
  if (!a) return null;
  const next = { ...a, aug };
  write(next);
  return next;
}
/** 드래프트 증강 선택지에서 뺄 증강 id (로그인 안 했으면 빈 집합) */
export function bannedAugIds() {
  const a = read();
  if (!a?.nick || a.signedOut) return new Set();
  return new Set(Object.values(withAug(a).bans).flat());
}

/** 드래프트 권 { reroll, first, ... } — 읽기 · 쓰기 (로그인 안 했으면 빈 값) */
export function draftTickets() {
  const a = read();
  if (!a?.nick || a.signedOut) return {};
  return { ...(a.draft || {}) };
}
export function saveDraftTickets(next) {
  const a = read();
  if (!a) return null;
  const out = { ...a, draft: { ...next } };
  write(out);
  return out;
}
/** 권 한 장 쓰기 — 없으면 false */
export function spendDraftTicket(key) {
  const a = read();
  const have = a?.draft?.[key] || 0;
  if (!a || have < 1) return false;
  write({ ...a, draft: { ...a.draft, [key]: have - 1 } });
  return true;
}

/** 증강 권 { reroll, pledge, favor } — 읽기 · 쓰기 */
export function augShopTickets() {
  const a = read();
  if (!a?.nick || a.signedOut) return {};
  return { ...(a.augShop || {}) };
}
export function saveAugShopTickets(next) {
  const a = read();
  if (!a) return null;
  const out = { ...a, augShop: { ...next } };
  write(out);
  return out;
}
/** 증강 권 한 장 쓰기 — 없으면 false */
export function spendAugTicket(key) {
  const a = read();
  const have = a?.augShop?.[key] || 0;
  if (!a || have < 1) return false;
  write({ ...a, augShop: { ...a.augShop, [key]: have - 1 } });
  return true;
}
/** 지명해 둔 증강 id — 다음 판 첫 선택지에 반드시 낀다 (쓰면 지운다) */
export const pledgedAugId = () => read()?.pledgeId || null;
export function setPledgedAug(id) {
  const a = read();
  if (!a) return null;
  write({ ...a, pledgeId: id || null });
  return id;
}

/** 강화한 증강 레벨 { id: 레벨 } (로그인 안 했으면 빈 객체) */
export function augLevels() {
  const a = read();
  if (!a?.nick || a.signedOut) return {};
  return { ...withAug(a).levels };
}

/** 즐겨찾기한 증강 id */
export function favAugIds() {
  const a = read();
  if (!a?.nick || a.signedOut) return new Set();
  return new Set(withAug(a).favs);
}

/** 저장된 골드 — 깨진 값(NaN · null)은 처음 값으로 되돌린다 */
const goldOf = (a) => (Number.isFinite(a?.gold) ? a.gold : START_GOLD);

const emptyAccount = (nick) => ({
  nick,
  gold: START_GOLD,
  items: [], // 구매한 부스트 { id, itemId, playerId }
  draft: {}, // 드래프트 권 { reroll, first, protect, series, agent }
  augShop: {}, // 증강 권 { reroll, pledge, favor } · pledgeId: 지명해 둔 증강
  createdAt: new Date().toISOString(),
  team: emptyTeam(),
  history: [], // 경기 기록 { at, my, opp, myRuns, oppRuns, winner }
  aug: emptyAug(),
});

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 사파리 프라이빗 등 */ }
}

/** 로그아웃 상태라도 저장된 계정을 들여다본다 (로그인 화면의 '이어서 하기') */
export function peekAccount() {
  const a = grantPending(read());
  return a?.nick ? { ...emptyAccount(a.nick), ...a, team: withTeam(a.team), aug: withAug(a) } : null;
}

export function loadAccount() {
  const a = grantPending(read());
  if (!a?.nick || a.signedOut) return null;
  return { ...emptyAccount(a.nick), ...a, gold: goldOf(a), draft: { ...(a.draft || {}) }, augShop: { ...(a.augShop || {}) }, team: withTeam(a.team), aug: withAug(a) };
}

export function signIn(nick) {
  const cur = read();
  const prev = cur?.nick === nick ? { ...emptyAccount(nick), ...cur, team: withTeam(cur.team), aug: withAug(cur) } : emptyAccount(nick);
  const next = { ...prev, signedOut: false };
  write(next);
  return next;
}

export function signOut() {
  const a = read();
  if (a) write({ ...a, signedOut: true });
}

export function saveTeam(team) {
  const a = read();
  if (!a) return null;
  /* capBase 를 같이 적어 둬야 다음에 열 때 캡을 또 옮기지 않는다 */
  const next = { ...a, team: { ...team, capBase: SQUAD_CAP, updatedAt: new Date().toISOString() } };
  write(next);
  return next;
}

/** 다음 단판 상대(시리즈 id) — 화면에 미리 보여 주고 경기도 이 상대로 한다 */
export function saveNextDuel(seriesId) {
  const a = read();
  if (!a || a.nextDuel === seriesId) return null;
  const next = { ...a, nextDuel: seriesId };
  write(next);
  return next;
}
export function peekNextDuel() {
  return read()?.nextDuel || null;
}

export function addHistory(entry) {
  const a = read();
  if (!a) return null;
  const record = { ...(a.team?.record || { w: 0, l: 0, d: 0 }) };
  if (entry.winner === 'my') record.w += 1;
  else if (entry.winner === 'opp') record.l += 1;
  else record.d += 1;
  // 랭크 승점은 랭크전 시즌이 끝날 때만 오르내린다 (claimRanked)
  // 단판이 끝나면 다음 상대를 다시 뽑는다
  const nextDuel = entry.mode ? a.nextDuel : null;
  const next = { ...a, nextDuel, team: { ...a.team, record }, history: [{ at: new Date().toISOString(), ...entry }, ...(a.history || [])].slice(0, 50) };
  write(next);
  return next;
}

/*
 * 끝난 판의 보상은 누르지 않아도 지급한다 — 마지막 경기 결과를 저장하는 같은 쓰기에서 함께.
 * claimed 로 한 번만 주고, 지급한 값은 판에 남긴다(reward). 예전 저장본처럼 끝났는데 안 받은 판은 불러올 때 지급한다.
 */
function withTournamentReward(a) {
  const t = a?.tournament;
  if (!t?.done || t.claimed) return a;
  const gold = finishOf(t.size)[t.place]?.gold || 0;
  return { ...a, gold: Math.max(0, goldOf(a) + gold), tournament: { ...t, claimed: true, reward: { gold } } };
}
function withRankedReward(a) {
  const s = a?.ranked;
  if (!s?.done || s.claimed) return a;
  const r = PLACE_REWARD[s.place - 1] || { rp: 0, gold: 0 };
  const before = a.rank?.rp || 0;
  const rp = Math.max(0, before + r.rp); // 0 아래로는 안 내려감
  const seasons = [{ season: s.season, place: s.place, rp: rp - before, at: new Date().toISOString() }, ...(a.rank?.seasons || [])].slice(0, 20);
  return {
    ...a,
    gold: Math.max(0, goldOf(a) + r.gold),
    rank: { rp, best: Math.max(rp, a.rank?.best || 0), seasons },
    ranked: { ...s, claimed: true, reward: { rp: rp - before, gold: r.gold } },
  };
}
function grantPending(a) {
  if (!a) return a;
  const next = withRankedReward(withTournamentReward(a));
  if (next !== a) write(next);
  return next;
}

/** 일반 대결 토너먼트 진행 상태 저장 (account.tournament) — 끝났으면 보상까지 */
export function saveTournament(tournament) {
  const a = read();
  if (!a) return null;
  const next = withTournamentReward({ ...a, tournament });
  write(next);
  return next;
}

/** 예전 '보상 받기' 자리 — 이미 지급했으면 아무것도 안 한다 */
export function claimTournament() {
  const a = read();
  const next = withTournamentReward(a);
  if (next === a) return null;
  write(next);
  return next;
}

/** 랭크전 시즌 진행 상태 저장 (account.ranked) — 시즌이 끝났으면 RP · 골드까지 */
export function saveRanked(ranked) {
  const a = read();
  if (!a) return null;
  const next = withRankedReward({ ...a, ranked });
  write(next);
  return next;
}

/** 예전 '보상 받기' 자리 — 이미 지급했으면 아무것도 안 한다 */
export function claimRanked() {
  const a = read();
  const next = withRankedReward(a);
  if (next === a) return null;
  write(next);
  return next;
}

/**
 * 프로필: 이름(nick) · 대진표 내 팀 칸 배너(profile.banner = 깃발 key, 없으면 null).
 * 이름을 바꾸면 다음 로그인도 새 이름으로 한다 (계정은 이 기기에 하나)
 */
export function saveProfile({ nick, banner }) {
  const a = read();
  if (!a) return null;
  const next = { ...a, nick: (nick ?? a.nick).trim() || a.nick, profile: { ...(a.profile || {}), banner: banner === undefined ? a.profile?.banner ?? null : banner } };
  write(next);
  return next;
}
/** 대진표 내 팀 칸 배너 key (없으면 null) */
export const myBanner = () => read()?.profile?.banner ?? null;

/** 골드 증감 (상점·경기 보상) */
export function addGold(delta) {
  const a = read();
  if (!a) return null;
  const next = { ...a, gold: Math.max(0, goldOf(a) + delta) };
  write(next);
  return next;
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
