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
const withTeam = (team) => { const t = { ...emptyTeam(), ...(team || {}) }; return { ...t, staff: freshStaff(t.staff) }; };

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
export const AUG_TIERS = ['silver', 'gold', 'prismatic'];
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

/** 즐겨찾기한 증강 id */
export function favAugIds() {
  const a = read();
  if (!a?.nick || a.signedOut) return new Set();
  return new Set(withAug(a).favs);
}

const emptyAccount = (nick) => ({
  nick,
  gold: START_GOLD,
  items: [], // 구매한 부스트 { id, itemId, playerId }
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
  return { ...emptyAccount(a.nick), ...a, team: withTeam(a.team), aug: withAug(a) };
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
  const next = { ...a, team: { ...team, updatedAt: new Date().toISOString() } };
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
  return { ...a, gold: Math.max(0, (a.gold ?? START_GOLD) + gold), tournament: { ...t, claimed: true, reward: { gold } } };
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
    gold: Math.max(0, (a.gold ?? START_GOLD) + r.gold),
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
  const next = { ...a, gold: Math.max(0, (a.gold ?? START_GOLD) + delta) };
  write(next);
  return next;
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
