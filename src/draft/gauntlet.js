/*
 * 도장깨기 — 라이브 드래프트가 끝나면 상대 일곱 구단이 약한 순서로 탑을 이룬다.
 * 1단(약체)부터 차례로 이겨야 다음 단이 열리고, 지면 같은 단을 다시 친다.
 * 화면과 떼어 놓은 순수 상태다 (React 도 타이머도 모른다).
 */
import { FIELD_SLOTS, PITCH_SLOTS, fillRoster } from '../KboAugmentDraft.jsx';
import * as Live from './live.js';

/** 도장깨기 한 판의 단 수 = 나를 뺀 구단 수. 모듈을 읽는 때가 아니라 쓸 때 센다 (KboAugmentDraft 와 서로 불러오는 사이) */
export const steps = () => Live.CLUB_COUNT - 1;

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

/** 라이브 판 → 도장깨기. 약한 구단이 1단, 강한 구단이 꼭대기 (줄 세우는 잣대는 화면에 보이는 전력 그대로) */
export function makeGauntlet(live) {
  const me = Live.myIndex(live);
  const rungs = live.clubs
    .map((_, club) => ({ club, ...teamStats(Live.rosterOf(live, club)) }))
    .filter((x) => x.club !== me)
    .sort((a, b) => a.str - b.str)
    .map((x, i) => {
    const c = live.clubs[x.club];
    return {
      step: i + 1,
      club: x.club,
      name: c.name,
      short: c.short,
      key: c.key || null,
      color: c.color,
      grade: c.grade || 'plain',
      trait: c.trait,
      roster: Live.rosterOf(live, x.club),
      bat: x.bat,
      pit: x.pit,
      def: x.def,
      str: x.str,
    };
  });
  return { rungs, step: 0, results: [], done: false };
}

/** 지금 쳐야 할 단 (다 깼으면 null) */
export const currentRung = (g) => (g && !g.done ? g.rungs[g.step] || null : null);
/** 이 단을 이미 깼는지 */
export const isCleared = (g, step) => step <= g.step;   // 단 번호는 1부터, g.step 은 깬 수
/** 몇 승 몇 패 */
export const record = (g) => g.results.reduce((t, r) => ({ w: t.w + (r.win ? 1 : 0), l: t.l + (r.win ? 0 : 1) }), { w: 0, l: 0 });

/** 경기 결과를 넣는다. 이기면 다음 단, 지면 같은 단을 다시 */
export function settle(g, { win, my = null, opp = null } = {}) {
  const cur = currentRung(g);
  if (!cur) return g;
  const results = [...g.results, { step: cur.step, club: cur.club, win: !!win, my, opp }];
  const step = win ? g.step + 1 : g.step;
  return { ...g, results, step, done: step >= g.rungs.length };
}
