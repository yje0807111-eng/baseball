/*
 * 내 팀 저장소 — 지금은 브라우저(localStorage). 나중에 로그인 서버가 생기면
 * loadAccount/saveAccount 안쪽만 바꿔 끼우면 된다 (화면은 이 파일만 본다).
 */
import { SQUAD_CAP } from './rules.js';
import { RP_DELTA } from './rank.js';

const KEY = 'kbo.myteam.v1';

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
  slots: { silver: AUG_SLOT_BASE, gold: AUG_SLOT_BASE, prismatic: AUG_SLOT_BASE },
  levels: {},
  removeTickets: 0,
  upgradeTickets: 0,
});
const withAug = (a) => {
  const d = emptyAug(); const g = a?.aug || {};
  return { ...d, ...g, bans: { ...d.bans, ...(g.bans || {}) }, slots: { ...d.slots, ...(g.slots || {}) }, levels: { ...(g.levels || {}) } };
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
  const a = read();
  return a?.nick ? { ...emptyAccount(a.nick), ...a, team: { ...emptyTeam(), ...(a.team || {}) }, aug: withAug(a) } : null;
}

export function loadAccount() {
  const a = read();
  if (!a?.nick || a.signedOut) return null;
  return { ...emptyAccount(a.nick), ...a, team: { ...emptyTeam(), ...(a.team || {}) }, aug: withAug(a) };
}

export function signIn(nick) {
  const cur = read();
  const prev = cur?.nick === nick ? { ...emptyAccount(nick), ...cur, team: { ...emptyTeam(), ...(cur.team || {}) }, aug: withAug(cur) } : emptyAccount(nick);
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

export function addHistory(entry) {
  const a = read();
  if (!a) return null;
  const record = { ...(a.team?.record || { w: 0, l: 0, d: 0 }) };
  if (entry.winner === 'my') record.w += 1;
  else if (entry.winner === 'opp') record.l += 1;
  else record.d += 1;
  // 랭크 승점: 승 +20 · 무 +5 · 패 −12 (0 아래로는 안 내려감)
  const before = a.rank?.rp || 0;
  const rp = Math.max(0, before + (RP_DELTA[entry.winner] ?? 0));
  const rank = { rp, best: Math.max(rp, a.rank?.best || 0) };
  const next = { ...a, rank, team: { ...a.team, record }, history: [{ at: new Date().toISOString(), rp: rp - before, ...entry }, ...(a.history || [])].slice(0, 50) };
  write(next);
  return next;
}

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
