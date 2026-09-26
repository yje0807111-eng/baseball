/*
 * 대전 — 방어 팀 사진 올리기 · 상대 찾기 · 대전 기록 · 방어 결과.
 * 서버가 없거나(오프라인 빌드) 로그인 전 · 인터넷이 끊기면 모두 조용히 빠진다 — 랭크전은 AI 상대로 그대로 돈다.
 */
import { client, online } from './supabase.js';
import { syncState } from './sync.js';
import { snapshotOf, reviveTeam } from '../myteam/ghost.js';

const MODE = 'ranked';
const FRESH_DAYS = 14; // 이만큼 안에 올린 팀만 상대로
const WINDOWS = [150, 300]; // RP 차이 — 반 등급 안에서 먼저, 모자라면 한 등급까지. 그 밖은 봇 · AI 로 채운다

const timeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
const me = () => syncState()?.uid || null;

async function ready() {
  if (!online || !me()) return null;
  return client();
}

/** 내 방어 팀 올리기(같은 모드는 덮어쓴다). 규칙을 어긴 엔트리면 올리지 않는다 → true | false */
export async function uploadDefense(team, rp = 0) {
  const sb = await ready();
  if (!sb) return false;
  const snap = snapshotOf(team);
  if (!reviveTeam(snap)) return false;
  const { error } = await timeout(sb.from('teams').upsert({
    user_id: me(), mode: MODE, version: snap.v, rating: Math.round(rp), cap: snap.cap, ovr: snap.ovr, payload: snap, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,mode' }), 6000);
  return !error;
}

/**
 * 새 시즌 상대 — 내 RP 가까운 다른 감독 팀 최대 n개(검사를 통과한 것만).
 * 돌려주는 값: [{ uid, teamId, nick, snap }] (서버가 없거나 실패하면 [])
 */
export async function findGhosts(rp = 0, n = 9) {
  try {
    const sb = await ready();
    if (!sb) return [];
    const since = new Date(Date.now() - FRESH_DAYS * 864e5).toISOString();
    const found = new Map();
    for (const w of WINDOWS) {
      let q = sb.from('teams').select('id, user_id, rating, payload, profiles(nick)')
        .eq('mode', MODE).neq('user_id', me()).gte('updated_at', since).limit(60);
      q = q.gte('rating', rp - w).lte('rating', rp + w);
      const { data, error } = await timeout(q, 5000);
      if (error) break;
      for (const row of data || []) {
        if (found.has(row.user_id) || !reviveTeam(row.payload)) continue;
        found.set(row.user_id, { uid: row.user_id, teamId: row.id, nick: row.profiles?.nick || '감독', snap: row.payload, gap: Math.abs(row.rating - rp) });
      }
      if (found.size >= n) break;
    }
    return [...found.values()].sort((a, b) => a.gap - b.gap).slice(0, n).map(({ gap, ...g }) => g); // eslint-disable-line no-unused-vars
  } catch {
    return [];
  }
}

/** 실제 감독 팀과 직접 치른 경기 한 판 → 대전 기록(도전한 쪽이 올린다) */
export async function recordBattle({ ghost, seed, myRuns, oppRuns }) {
  try {
    const sb = await ready();
    if (!sb || !ghost?.uid || ghost.uid === me()) return false;
    const { error } = await timeout(sb.from('battles').insert({
      attacker: me(), defender: ghost.uid, team_id: ghost.teamId ?? null, mode: MODE,
      seed: Number(seed) || 0, att_runs: myRuns, def_runs: oppRuns,
    }), 6000);
    return !error;
  } catch {
    return false;
  }
}

/** 내가 없는 사이 내 방어 팀이 치른 경기 — since(ISO) 뒤로. { w, l, d, games: [{ nick, att, def, at }] } | null */
export async function defenseSince(since) {
  try {
    const sb = await ready();
    if (!sb) return null;
    let q = sb.from('battles').select('att_runs, def_runs, created_at, attacker:profiles!battles_attacker_fkey(nick)')
      .eq('defender', me()).eq('mode', MODE).order('created_at', { ascending: false }).limit(50);
    if (since) q = q.gt('created_at', since);
    const { data, error } = await timeout(q, 5000);
    if (error) return null;
    const games = (data || []).map((r) => ({ nick: r.attacker?.nick || '감독', att: r.att_runs, def: r.def_runs, at: r.created_at }));
    const w = games.filter((g) => g.def > g.att).length;
    const l = games.filter((g) => g.def < g.att).length;
    return { w, l, d: games.length - w - l, games };
  } catch {
    return null;
  }
}
