/*
 * 오늘의 토너먼트 — 32강부터 결승까지 5경기. 하루에 한 번, 날짜로 대진이 정해진다.
 * 지금은 서버가 없어 참가 31팀이 AI 시리즈 팀(구단 시즌 · 국가대표 · 레전드 멤버 그대로)이다. 나중에 다른 유저 팀 스냅샷을 받으면 entrantsFor() 만 바꿔 끼우면 된다
 * (유저 팀이 모자라면 남는 자리를 AI 팀으로 채운다).
 * 내 경기는 중계 화면에서 직접 치르고, 나머지 경기는 같은 엔진으로 바로 계산한다. 비기면 팀 종합이 높은 쪽이 올라간다.
 */
import { buildMyTeam, teamRating } from './match.js';
import { AI_SERIES, seriesTeam, seriesName } from './aiTeam.js';
import { engineTeam } from '../BroadcastGame.jsx';
import { simulateGame } from '../engine/pitchSim.js';

export const ROUNDS = [
  { key: 'r32', ko: '32강', en: 'ROUND OF 32' },
  { key: 'r16', ko: '16강', en: 'ROUND OF 16' },
  { key: 'qf', ko: '8강', en: 'QUARTERFINAL' },
  { key: 'sf', ko: '4강', en: 'SEMIFINAL' },
  { key: 'final', ko: '결승', en: 'FINAL' },
];
/** 최종 성적(0: 32강 탈락 … 4: 준우승 · 5: 우승)별 보상 */
export const FINISH = [
  { ko: '32강 탈락', gold: 100, rp: 0 },
  { ko: '16강 탈락', gold: 200, rp: 10 },
  { ko: '8강 탈락', gold: 350, rp: 25 },
  { ko: '4강 탈락', gold: 500, rp: 45 },
  { ko: '준우승', gold: 800, rp: 70 },
  { ko: '우승', gold: 1200, rp: 100 },
];

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const seeded = (seed) => () => { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** 기기 시간 기준 오늘 'YYYY-MM-DD' */
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const OWNERS = ['홈런왕', '불펜장인', '도루머신', '직관러', '야구덕후', '9회말2아웃', '끝내기', '에이스', '포수리드', '타격왕', '무실점', '클러치', '번트장인', '골든글러브', '신인왕', '명승부'];

/** 참가 31팀 (서버가 생기면 여기서 유저 팀 스냅샷을 먼저 넣고, 모자라는 자리만 AI 로 채운다) */
function entrantsFor(date) {
  const rng = seeded(hash(`tourney:${date}`));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const pool = [...AI_SERIES];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 31).map((series, i) => ({
    id: `ai-${i}`,
    seriesId: series.id,
    name: seriesName(series),
    owner: `${pick(OWNERS)}${Math.floor(rng() * 90) + 10}`,
    seed: hash(`tourney:${date}:team:${i}`),
  }));
}

/** 오늘 대진 새로 만들기: 내 자리는 날짜로 정해진다 */
export function makeTournament(date, myName = '나의 드림팀') {
  const others = entrantsFor(date);
  const rng = seeded(hash(`tourney:${date}:me`));
  const at = Math.floor(rng() * 32);
  const entrants = [...others.slice(0, at), { id: 'me', name: myName, owner: '나', me: true }, ...others.slice(at)];
  return { date, entrants, round: 0, winners: [], results: [], done: false, place: null, claimed: false };
}

const cache = new Map();
/** 참가 팀의 경기용 팀. AI 팀은 seed 로 언제든 같은 로스터를 다시 만든다 */
export function teamOf(entry, myTeam) {
  if (entry.me) return { ...buildMyTeam(myTeam), name: myTeam?.name || entry.name };
  if (!cache.has(entry.id + entry.seed)) {
    const series = AI_SERIES.find((x) => x.id === entry.seriesId) || AI_SERIES[entry.seed % AI_SERIES.length];
    cache.set(entry.id + entry.seed, { ...seriesTeam(series, seeded(entry.seed)), owner: entry.owner });
  }
  return cache.get(entry.id + entry.seed);
}

/** 라운드 r 의 대진: 참가 순번 쌍 [[a, b], ...] */
export function pairsOf(t, r = t.round) {
  const list = r === 0 ? t.entrants.map((_, i) => i) : t.winners[r - 1] || [];
  const out = [];
  for (let i = 0; i + 1 < list.length; i += 2) out.push([list[i], list[i + 1]]);
  return out;
}

export const meIndex = (t) => t.entrants.findIndex((e) => e.me);
/** 이번 라운드 내 상대 (탈락했거나 끝났으면 null) */
export function myOpponent(t) {
  if (t.done) return null;
  const me = meIndex(t);
  const pair = pairsOf(t).find(([a, b]) => a === me || b === me);
  return pair ? t.entrants[pair[0] === me ? pair[1] : pair[0]] : null;
}

/** 비기면 팀 종합이 높은 쪽, 같으면 앞 순번 */
const decide = (aRuns, bRuns, aTeam, bTeam) => {
  if (aRuns !== bRuns) return { aWin: aRuns > bRuns, tiebreak: false };
  return { aWin: teamRating(aTeam.roster) >= teamRating(bTeam.roster), tiebreak: true };
};

/** 내 경기 결과(score: { my, opp })를 넣고 이번 라운드 나머지 경기를 계산해 다음 라운드로 */
export function advance(t, myScore, myTeam) {
  const r = t.round;
  const me = meIndex(t);
  const rng = seeded(hash(`tourney:${t.date}:round:${r}`));
  const results = pairsOf(t, r).map(([a, b]) => {
    const A = teamOf(t.entrants[a], myTeam), B = teamOf(t.entrants[b], myTeam);
    let as, bs;
    if (a === me || b === me) {
      as = a === me ? myScore.my : myScore.opp;
      bs = a === me ? myScore.opp : myScore.my;
    } else {
      const g = simulateGame({ home: engineTeam(A), away: engineTeam(B), rng, maxInnings: 9 });
      as = g.home.runs; bs = g.away.runs;
    }
    const { aWin, tiebreak } = decide(as, bs, A, B);
    return { a, b, as, bs, winner: aWin ? a : b, tiebreak };
  });
  const winners = results.map((x) => x.winner);
  const alive = winners.includes(me);
  const last = r === ROUNDS.length - 1;
  return {
    ...t,
    results: [...t.results.slice(0, r), results],
    winners: [...t.winners.slice(0, r), winners],
    round: alive && !last ? r + 1 : r,
    done: !alive || last,
    place: !alive ? r : last ? ROUNDS.length : null,
  };
}
