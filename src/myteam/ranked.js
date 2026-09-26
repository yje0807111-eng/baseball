/*
 * 랭크전 — 가을야구처럼 치르는 공식 시즌.
 *  정규 시즌: 나 + 상대 9팀 = 10팀 리그. 상대는 내 등급에 맞춘다 — 비슷한 등급 감독 팀(방어 팀 사진)이 먼저,
 *  남는 자리는 등급 전력 구간(TIER_POWER)에 맞춘 감독 봇 · AI 시리즈 팀을 반씩., 모든 팀이 서로 한 번씩(9경기). 내 경기는 직접, 나머지는 엔진으로 계산.
 *  포스트시즌: 상위 5팀. 와일드카드(4 vs 5) → 준플레이오프(vs 3) → 플레이오프(vs 2) → 한국시리즈(vs 1), 모두 단판.
 *  비기면 순위가 높은 팀이 올라간다. 최종 순위로 랭크 승점(RP)과 골드를 받는다.
 */
import { teamOf, seeded, hashKey, newKey, ownerOf, decide, simulate, playStrength } from './tournament.js';
import { AI_SERIES, seriesName, seriesTeam } from './aiTeam.js';
import { botTeam, botName } from './bots.js';
import { rankOf } from './rank.js';
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
 * 등급별 상대 전력 가운데값(playStrength) — 루키 · 퓨처스 · 1군 · 올스타 · MVP · 명예의 전당.
 * 잰 값(2026-09-26): 스타터 26인 ≈ 75 · 시리즈 팀 가운데 79(국가대표 84.5 · 레전드 94.5) · 캡을 채운 팀 ≈ 84.
 * 루키는 스타터 팀과 비슷하게, 한 등급마다 2.5씩.
 */
export const TIER_POWER = [74.5, 77, 79.5, 82, 84.5, 87];
/** 상대 아홉의 전력 폭 — 가운데값에서 이만큼씩 흩는다(순위표가 한 줄로 몰리지 않게) */
const SPREAD = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3];
/** 봇 전력은 캡으로 맞춘다 — 잰 값(cap → 가운데 전력): 1650 → 70 · 1800 → 76 · 1950 → 78 · 2100 → 82 · 2400 → 83 · 2550 → 85.5 */
const CAP_FOR = [[71, 1650], [76.5, 1800], [79, 1950], [82.5, 2100], [84, 2400], [Infinity, 2550]];

let seriesPower = null;
/** 시리즈 팀 전력 — 처음 한 번만 잰다 */
function seriesPowerList() {
  seriesPower ||= AI_SERIES.map((x) => ({ s: x, v: playStrength(seriesTeam(x, seeded(1))) }));
  return seriesPower;
}
/** 목표 전력에 가장 가까운 시리즈 팀(쓴 것 빼고) — 가까운 몇 개 중에서 무작위 */
function pickSeries(target, used, rng) {
  const near = seriesPowerList().filter((x) => !used.has(x.s.id)).sort((a, b) => Math.abs(a.v - target) - Math.abs(b.v - target)).slice(0, 4);
  const hit = near[Math.floor(rng() * near.length)];
  if (hit) used.add(hit.s.id);
  return hit?.s || null;
}
/** 목표 전력에 맞는 봇 { cap, seed } — 캡 셋 × 씨 넷을 재 보고 가장 가까운 것(이름이 겹치지 않게) */
function pickBot(target, names, rng) {
  const guess = CAP_FOR.find(([t]) => target <= t)[1];
  let best = null;
  for (const cap of [guess - 150, guess, guess + 150]) {
    for (let k = 0; k < 4; k++) {
      const seed = Math.floor(rng() * 2 ** 31);
      if (names.has(botName(seed))) continue;
      const d = Math.abs(playStrength(botTeam({ cap, seed })) - target);
      if (!best || d < best.d) best = { cap, seed, d };
    }
  }
  if (best) names.add(botName(best.seed));
  return best && { cap: best.cap, seed: best.seed };
}

/**
 * 새 시즌: 상대 9팀.
 *  1) ghosts — 비슷한 등급 감독 팀 사진 { uid, teamId, nick, snap }(검사를 마친 것). 시즌에 그대로 담는다 — 상대가 나중에 팀을 바꿔도 이번 시즌 상대는 그대로
 *  2) 남는 자리 — 내 등급(rp) 전력 구간에 맞춘 감독 봇 · AI 시리즈 팀을 반씩(봇이 한 자리 더)
 * 내 자리 · 일정 순서는 무작위
 */
export function makeSeason({ season = 1, myName = '나의 드림팀', key = newKey(), ghosts = [], rp = 0 } = {}) {
  const rng = seeded(hashKey(`ranked:${key}`));
  const center = TIER_POWER[rankOf(rp).index] ?? TIER_POWER[0];
  const seen = new Set();
  const people = ghosts.filter((g) => g?.snap && g.uid && !seen.has(g.uid) && seen.add(g.uid)).slice(0, GAMES);
  const need = GAMES - people.length;
  const offsets = [...SPREAD];
  for (let i = offsets.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [offsets[i], offsets[j]] = [offsets[j], offsets[i]]; }
  const targets = offsets.slice(0, need).map((o) => center + o);
  const nBots = Math.ceil(need / 2);
  const usedSeries = new Set();
  const names = new Set([myName]);
  const bots = targets.slice(0, nBots).map((t) => pickBot(t, names, rng)).filter(Boolean);
  const series = targets.slice(bots.length).map((t) => pickSeries(t, usedSeries, rng)).filter(Boolean);
  const teams = [
    // 못 쓰게 된 사진이면(데이터가 바뀌어 검사 탈락) 경기 때 seriesId 의 AI 팀(등급 구간 가운데)이 대신 나온다
    ...people.map((g, i) => ({ id: `gh-${i}`, ghost: { uid: g.uid, teamId: g.teamId ?? null }, snap: g.snap, seriesId: pickSeries(center, usedSeries, rng)?.id,
      name: g.snap.name, owner: g.nick || '감독', seed: hashKey(`ranked:${key}:ghost:${i}`) })),
    ...bots.map((b, i) => ({ id: `bt-${i}`, bot: b, name: botName(b.seed), owner: ownerOf(rng), seed: hashKey(`ranked:${key}:bot:${i}`) })),
    ...series.map((x, i) => ({ id: `rk-${i}`, seriesId: x.id, name: seriesName(x), owner: ownerOf(rng), seed: hashKey(`ranked:${key}:team:${i}`) })),
  ];
  for (let i = teams.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [teams[i], teams[j]] = [teams[j], teams[i]]; }
  teams.splice(Math.floor(rng() * LEAGUE_SIZE), 0, { id: 'me', name: myName, owner: '나', me: true });
  const schedule = roundRobin(LEAGUE_SIZE);
  for (let i = schedule.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [schedule[i], schedule[j]] = [schedule[j], schedule[i]]; }
  return { key, season, tier: rankOf(rp).index, teams, schedule, games: [], round: 0, post: null, done: false, place: null, claimed: false };
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
