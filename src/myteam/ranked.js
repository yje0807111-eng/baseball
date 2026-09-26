/*
 * 랭크전 — 가을야구처럼 치르는 공식 시즌.
 *  정규 시즌: 나 + 상대 9팀 = 10팀 리그(다른 감독이 올린 방어 팀 사진이 먼저, 모자라면 AI 시리즈 팀), 모든 팀이 서로 한 번씩(9경기). 내 경기는 직접, 나머지는 엔진으로 계산.
 *  포스트시즌: 상위 5팀. 와일드카드(4 vs 5) → 준플레이오프(vs 3) → 플레이오프(vs 2) → 한국시리즈(vs 1), 모두 단판.
 *  비기면 순위가 높은 팀이 올라간다. 최종 순위로 랭크 승점(RP)과 골드를 받는다.
 */
import { teamOf, seeded, hashKey, newKey, ownerOf, decide, simulate } from './tournament.js';
import { AI_SERIES, seriesName } from './aiTeam.js';
import { PLACE_REWARD } from './rewards.js';

export { PLACE_REWARD };

export const LEAGUE_SIZE = 10;
export const GAMES = LEAGUE_SIZE - 1;
export const POST_TEAMS = 5;
/** 포스트시즌 단계: hi = 기다리는 상위 시드(순위 번호), 상대는 앞 단계 승자 (와일드카드는 5위) */
export const STAGES = [
  { key: 'wc', ko: '와일드카드', en: 'WILD CARD', hi: 4 },
  { key: 'spo', ko: '준플레이오프', en: 'SEMI-PLAYOFF', hi: 3 },
  { key: 'po', ko: '플레이오프', en: 'PLAYOFF', hi: 2 },
  { key: 'ks', ko: '한국시리즈', en: 'KOREAN SERIES', hi: 1 },
];


/** 10팀 풀리그 일정(원형 방식): 라운드마다 5경기, 9라운드 */
function roundRobin(n) {
  const ids = Array.from({ length: n }, (_, i) => i);
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i], b = ids[n - 1 - i];
      pairs.push((r + i) % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    ids.splice(1, 0, ids.pop()); // 첫 팀은 고정하고 나머지를 돌린다
  }
  return rounds;
}

/**
 * 새 시즌: 상대 9팀 — ghosts(다른 감독 팀 사진 { uid, teamId, nick, snap }, 검사를 마친 것)가 먼저, 남는 자리는 서로 다른 AI 시리즈.
 * 사진은 시즌에 그대로 담는다 — 상대가 나중에 팀을 바꿔도 이번 시즌 상대는 그대로. 내 자리 · 일정 순서는 무작위
 */
export function makeSeason({ season = 1, myName = '나의 드림팀', key = newKey(), ghosts = [] } = {}) {
  const rng = seeded(hashKey(`ranked:${key}`));
  const pool = [...AI_SERIES];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const seen = new Set();
  const people = ghosts.filter((g) => g?.snap && g.uid && !seen.has(g.uid) && seen.add(g.uid)).slice(0, GAMES);
  const teams = [
    // 못 쓰게 된 사진이면(데이터가 바뀌어 검사 탈락) 경기 때 seriesId 의 AI 팀이 대신 나온다
    ...people.map((g, i) => ({ id: `gh-${i}`, ghost: { uid: g.uid, teamId: g.teamId ?? null }, snap: g.snap, seriesId: pool[GAMES + i]?.id,
      name: g.snap.name, owner: g.nick || '감독', seed: hashKey(`ranked:${key}:ghost:${i}`) })),
    ...pool.slice(0, GAMES - people.length).map((s, i) => ({ id: `rk-${i}`, seriesId: s.id, name: seriesName(s), owner: ownerOf(rng), seed: hashKey(`ranked:${key}:team:${i}`) })),
  ];
  for (let i = teams.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [teams[i], teams[j]] = [teams[j], teams[i]]; }
  teams.splice(Math.floor(rng() * LEAGUE_SIZE), 0, { id: 'me', name: myName, owner: '나', me: true });
  const schedule = roundRobin(LEAGUE_SIZE);
  for (let i = schedule.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [schedule[i], schedule[j]] = [schedule[j], schedule[i]]; }
  return { key, season, teams, schedule, games: [], round: 0, post: null, done: false, place: null, claimed: false };
}

export const meOf = (s) => s.teams.findIndex((t) => t.me);

/** 순위표: 승률(무승부 제외) → 득실차 → 득점 순 */
export function standings(s) {
  const rows = s.teams.map((t, idx) => ({ idx, team: t, g: 0, w: 0, l: 0, d: 0, rs: 0, ra: 0, form: [] }));
  s.games.forEach((round) => round.forEach(({ a, b, as, bs }) => {
    const A = rows[a], B = rows[b];
    A.g += 1; B.g += 1; A.rs += as; A.ra += bs; B.rs += bs; B.ra += as;
    const ra = as > bs ? 'W' : as < bs ? 'L' : 'D';
    const rb = ra === 'W' ? 'L' : ra === 'L' ? 'W' : 'D';
    A[ra.toLowerCase()] += 1; B[rb.toLowerCase()] += 1;
    A.form.push(ra); B.form.push(rb);
  }));
  rows.forEach((r) => { r.pct = r.w + r.l ? r.w / (r.w + r.l) : 0; });
  rows.sort((x, y) => y.pct - x.pct || (y.w - y.l) - (x.w - x.l) || (y.rs - y.ra) - (x.rs - x.ra) || y.rs - x.rs || x.idx - y.idx);
  const lead = rows[0];
  rows.forEach((r, i) => { r.rank = i + 1; r.gb = ((lead.w - lead.l) - (r.w - r.l)) / 2; });
  return rows;
}

/** 이번 정규 시즌 라운드의 내 상대 */
export function leagueOpponent(s) {
  if (s.done || s.round >= GAMES) return null;
  const me = meOf(s);
  const pair = s.schedule[s.round].find(([a, b]) => a === me || b === me);
  return pair ? s.teams[pair[0] === me ? pair[1] : pair[0]] : null;
}

/** 지금 포스트시즌 경기: { stage, hi, lo } (순위 번호가 아닌 팀 순번) */
export function postMatch(s) {
  const p = s.post;
  if (!p || s.done || p.stage >= STAGES.length) return null;
  const st = STAGES[p.stage];
  const hi = p.seeds[st.hi - 1];
  const lo = p.stage === 0 ? p.seeds[4] : p.results[p.stage - 1].winner;
  return { stage: p.stage, hi, lo };
}
/** 지금 내가 치를 경기의 상대 (정규 · 포스트시즌) */
export function myOpponent(s) {
  if (s.done) return null;
  if (!s.post) return leagueOpponent(s);
  const m = postMatch(s);
  const me = meOf(s);
  return m && (m.hi === me || m.lo === me) ? s.teams[m.hi === me ? m.lo : m.hi] : null;
}

/** 포스트시즌에서 내 경기가 아닌 단계는 바로 계산한다. 내가 떨어졌거나 없으면 끝까지 */
function runPost(s, myTeam) {
  const me = meOf(s);
  let post = s.post;
  while (post.stage < STAGES.length) {
    const m = postMatch({ ...s, post });
    if (m.hi === me || m.lo === me) break;
    const rng = seeded(hashKey(`ranked:${s.key}:post:${post.stage}`));
    const H = teamOf(s.teams[m.hi], myTeam), L = teamOf(s.teams[m.lo], myTeam);
    const { as, bs } = simulate(H, L, rng);
    post = { ...post, stage: post.stage + 1, results: [...post.results, { stage: m.stage, hi: m.hi, lo: m.lo, hs: as, ls: bs, winner: as >= bs ? m.hi : m.lo }] };
  }
  const done = post.stage >= STAGES.length;
  return { ...s, post, done, place: done ? placeOf({ ...s, post }) : null };
}

/** 최종 순위: 우승 1 · 한국시리즈 패 2 · 플레이오프 패 3 · 준PO 패 4 · 와일드카드 패 5 · 그 밖은 정규 순위 */
function placeOf(s) {
  const me = meOf(s);
  const lostAt = s.post.results.find((r) => (r.hi === me || r.lo === me) && r.winner !== me);
  if (lostAt) return 5 - lostAt.stage;
  if (s.post.results[STAGES.length - 1]?.winner === me) return 1;
  return standings(s).find((r) => r.idx === me).rank;
}

/** 내 경기 결과(score: { my, opp })를 넣고 진행: 정규 시즌이면 이번 라운드 나머지 4경기 계산, 포스트시즌이면 다음 단계로 */
export function play(s, myScore, myTeam) {
  const me = meOf(s);
  if (!s.post) {
    const rng = seeded(hashKey(`ranked:${s.key}:round:${s.round}`));
    const results = s.schedule[s.round].map(([a, b]) => {
      if (a === me || b === me) return { a, b, as: a === me ? myScore.my : myScore.opp, bs: a === me ? myScore.opp : myScore.my };
      const { as, bs } = simulate(teamOf(s.teams[a], myTeam), teamOf(s.teams[b], myTeam), rng);
      return { a, b, as, bs };
    });
    const next = { ...s, games: [...s.games, results], round: s.round + 1 };
    if (next.round < GAMES) return next;
    const seeds = standings(next).slice(0, POST_TEAMS).map((r) => r.idx);
    return runPost({ ...next, post: { seeds, stage: 0, results: [] } }, myTeam);
  }
  const m = postMatch(s);
  const hs = m.hi === me ? myScore.my : myScore.opp;
  const ls = m.hi === me ? myScore.opp : myScore.my;
  const winner = hs >= ls ? m.hi : m.lo; // 비기면 상위 시드
  const post = { ...s.post, stage: s.post.stage + 1, results: [...s.post.results, { stage: m.stage, hi: m.hi, lo: m.lo, hs, ls, winner }] };
  if (winner !== me) return { ...s, post: { ...post, stage: STAGES.length }, done: true, place: placeOf({ ...s, post }) };
  return runPost({ ...s, post }, myTeam);
}

export { decide };
