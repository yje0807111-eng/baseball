/*
 * 도장깨기 — 라이브 드래프트가 끝나면 여덟 구단이 한 탑에 쌓인다.
 * 내 자리는 맨 아래(0번), 위로 갈수록 센 구단이다. 바로 윗 칸과 붙어 이기면 그 자리를 빼앗고
 * 진 구단이 내 아래로 내려온다. 지면 자리는 그대로, 같은 상대를 다시 친다.
 * 화면과 떼어 놓은 순수 상태다 (React 도 타이머도 모른다).
 */
import { FIELD_SLOTS, PITCH_SLOTS, fillRoster } from '../KboAugmentDraft.jsx';
import * as Live from './live.js';

/** 탑의 칸 수 = 참가 구단 수(나 포함). 모듈을 읽는 때가 아니라 쓸 때 센다 (KboAugmentDraft 와 서로 불러오는 사이) */
export const steps = () => Live.CLUB_COUNT;

const avg = (a) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : 0);
const st = (p, k) => p?.stats?.[k] ?? 60;

/**
 * 팀 수치 넷 — 주전 자리에 앉은 선수만 본다 (빈 자리는 퓨처스가 들어간다).
 *  bat 타격(컨택 · 파워) · pit 마운드(구위 · 제구) · def 수비 · str 전력(주전 종합 평균)
 */
export function teamStats(roster) {
  const full = fillRoster(roster || []);
  const by = {};
  full.forEach((p) => { if (p.slot) by[p.slot] = p; });
  const at = (ids) => ids.map((id) => by[id]).filter(Boolean);
  const arms = at(PITCH_SLOTS);
  const bats = at(FIELD_SLOTS.filter((s) => !PITCH_SLOTS.includes(s.id)).map((s) => s.id));
  return {
    bat: Math.round(avg(bats.map((p) => (st(p, 'contact') + st(p, 'power')) / 2))),
    pit: Math.round(avg(arms.map((p) => (st(p, 'stuff') + st(p, 'control')) / 2))),
    def: Math.round(avg(bats.map((p) => st(p, 'defense')))),
    str: Math.round(avg([...arms, ...bats].map((p) => p.overall ?? 60)) * 10) / 10,
  };
}

/** 이 구단의 간판 — 종합이 가장 높은 선수 */
export const starOf = (roster) => (roster || []).reduce((m, p) => (!m || p.overall > m.overall ? p : m), null);

/** 라이브 판 → 도장깨기 탑. 맨 아래가 나, 위로 갈수록 센 구단 (잣대는 화면에 보이는 전력 그대로) */
export function makeGauntlet(live) {
  const mine = Live.myIndex(live);
  const one = (club) => {
    const c = live.clubs[club];
    const roster = Live.rosterOf(live, club);
    return {
      club,
      me: !!c.me,
      name: c.name,
      short: c.short,
      key: c.key || null,
      color: c.color,
      grade: c.grade || null,
      trait: c.trait,
      roster,
      star: starOf(roster),
      ...teamStats(roster),
    };
  };
  const rivals = live.clubs
    .map((_, club) => club)
    .filter((club) => club !== mine)
    .map(one)
    .sort((a, b) => a.str - b.str);
  return { tower: [one(mine), ...rivals], results: [], done: false };
}

/** 지금 내가 선 칸 (맨 아래가 0) */
export const myPos = (g) => (g?.tower || []).findIndex((x) => x.me);
/** 바로 윗 칸 — 지금 쳐야 할 상대 (꼭대기에 올라섰으면 null) */
export const currentRung = (g) => (g && !g.done ? g.tower[myPos(g) + 1] || null : null);
/** 이 칸이 내가 이미 지나온 자리인지 — 내 아래로 내려온 구단 */
export const isCleared = (g, index) => index < myPos(g);
/** 몇 승 몇 패 */
export const record = (g) => g.results.reduce((t, r) => ({ w: t.w + (r.win ? 1 : 0), l: t.l + (r.win ? 0 : 1) }), { w: 0, l: 0 });

/** 경기 결과를 넣는다. 이기면 윗 칸과 자리를 바꿔 한 칸 올라서고, 지면 자리는 그대로 */
export function settle(g, { win, my = null, opp = null } = {}) {
  const cur = currentRung(g);
  if (!cur) return g;
  const at = myPos(g);
  const results = [...g.results, { at, club: cur.club, win: !!win, my, opp }];
  if (!win) return { ...g, results };
  const tower = [...g.tower];
  [tower[at], tower[at + 1]] = [tower[at + 1], tower[at]];   // 이긴 자리를 빼앗고, 진 구단은 내 아래로
  return { ...g, tower, results, done: at + 1 >= tower.length - 1 };
}
