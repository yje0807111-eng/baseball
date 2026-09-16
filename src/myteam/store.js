/*
 * 내 팀 저장소 — 지금은 브라우저(localStorage). 나중에 로그인 서버가 생기면
 * loadAccount/saveAccount 안쪽만 바꿔 끼우면 된다 (화면은 이 파일만 본다).
 */
import { SQUAD_CAP } from './rules.js';

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

const emptyAccount = (nick) => ({
  nick,
  createdAt: new Date().toISOString(),
  team: emptyTeam(),
  history: [], // 경기 기록 { at, my, opp, myRuns, oppRuns, winner }
});

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 사파리 프라이빗 등 */ }
}

export function loadAccount() {
  const a = read();
  if (!a?.nick || a.signedOut) return null;
  return { ...emptyAccount(a.nick), ...a, team: { ...emptyTeam(), ...(a.team || {}) } };
}

export function signIn(nick) {
  const cur = read();
  const prev = cur?.nick === nick ? { ...emptyAccount(nick), ...cur, team: { ...emptyTeam(), ...(cur.team || {}) } } : emptyAccount(nick);
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
  const next = { ...a, team: { ...a.team, record }, history: [{ at: new Date().toISOString(), ...entry }, ...(a.history || [])].slice(0, 50) };
  write(next);
  return next;
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
