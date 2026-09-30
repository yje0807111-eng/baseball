/*
 * 코치진 값어치 확인 — 코치진 CP 만큼 선수를 덜 산 팀(A) vs 캡을 다 선수에 쓴 팀(B).
 * 제값이면 A 승률 ≈ 50%. 50 보다 높으면 CP 에 비해 강하고(싸다), 낮으면 약하다(비싸다).
 *  - 선수는 사람이 고르듯 CP 대비 종합이 가장 많이 오르는 쪽으로 채운다(greedy) — AI 무작위 뽑기는 CP 를 잘 못 써 값이 틀어진다
 *  - 경기는 실제 경기 준비 흐름(readyRoster → matchTeamOf → engineTeam) — 선발 1 · 불펜 8 이 자리대로 나선다
 * npx vite-node scripts/staff-balance.mjs [경기 수] [이름 거르기]
 * 한 경기 시뮬이라 투수 휴식(rest) · 나쁜 날 흔들림(calm)은 재지 못한다.
 */
import { buildAiTeam } from '../src/myteam/match.js';
import { STAFF } from '../src/myteam/staff.js';
import { SQUAD_CAP, FOREIGN_MAX } from '../src/myteam/rules.js';
import { SERIES } from '../src/data/seriesPlayers.js';
import { seeded } from '../src/engine/rng.js';
import { simulateGame } from '../src/engine/pitchSim.js';
import { readyRoster, matchTeamOf } from '../src/myteam/prep.js';
import { engineTeam } from '../src/BroadcastGame.jsx';

const N = Number(process.argv[2] || 2000);
const only = process.argv[3];
const ALL = SERIES.flatMap((s) => s.players);
const byPos = ALL.reduce((m, p) => ((m[p.position] ||= []).push(p), m), {});

/** 자리 틀(AI 팀의 포지션 구성)을 그대로 두고, 캡 안에서 종합 ÷ CP 이득이 큰 교체를 되풀이 */
function greedy(cap, rng) {
  const squad = buildAiTeam(Math.round(cap * 0.8), rng).roster.slice(); // 싸게 시작
  const cost = () => squad.reduce((t, p) => t + p.cost, 0);
  const foreign = () => squad.filter((p) => p.isForeign).length;
  for (let step = 0; step < 400; step++) {
    const left = cap - cost();
    let best = null;
    squad.forEach((cur, i) => {
      for (const c of byPos[cur.position] || []) {
        const dc = c.cost - cur.cost, dov = c.overall - cur.overall;
        if (dov <= 0 || dc > left || dc <= 0) continue;
        if (squad.some((x, j) => j !== i && x.personId === c.personId)) continue;
        if (c.isForeign && !cur.isForeign && foreign() >= FOREIGN_MAX) continue;
        const gain = dov / dc;
        if (!best || gain > best.gain) best = { i, c, gain };
      }
    });
    if (!best) break;
    squad[best.i] = best.c;
  }
  return squad;
}

const cache = new Map();
const squadFor = (cap, seed) => { const k = `${cap}:${seed}`; if (!cache.has(k)) cache.set(k, greedy(cap, seeded(seed))); return cache.get(k); };
const matchTeam = (squad, staff) => { const team = { name: 'T', squad, staff }; return engineTeam(matchTeamOf(team, readyRoster(team).ready)); };

const POOL = 60; // 팀 종류 수(시드) — 캐시해서 되풀이
function run(label, people, capGap = null) {
  const staff = Object.fromEntries(people.map((p) => [p.role, p]));
  const cost = capGap ?? people.reduce((t, p) => t + p.cost, 0);
  let w = 0, d = 0;
  for (let i = 0; i < N; i++) {
    const a = matchTeam(squadFor(SQUAD_CAP - cost, (i % POOL) * 2 + 1), capGap != null ? {} : staff);
    const b = matchTeam(squadFor(SQUAD_CAP, ((i * 7) % POOL) * 2 + 2), {});
    const aHome = i % 2 === 0;
    const g = simulateGame({ home: aHome ? a : b, away: aHome ? b : a, rng: seeded(i + 99) });
    if (g.winner === 'draw') d++; else if ((g.winner === 'home') === aHome) w++;
  }
  const p = w / (N - d);
  console.log(`${label.padEnd(24)} ${String(cost).padStart(3)} CP  A 승률 ${(p * 100).toFixed(1)}%  ±${(196 * Math.sqrt(p * (1 - p) / (N - d))).toFixed(1)}`);
}

const by = (name) => STAFF.find((s) => s.name === name);
const CASES = [
  ['기준: 똑같이', [], 0],
  ['기준: 선수 CP −50', [], 50],
  ['기준: 선수 CP −100', [], 100],
  ...['김응용', '이승엽', '김태형', '류중일', '김성근', '김영덕', '허삼영', '트레이 힐만', '염경엽'].map((n) => [`감독 ${n}`, [by(n)]]),
  ...['김용달', '김무관', '박흥식', '오치아이 에이지', '조웅천', '박진만'].map((n) => [`코치 ${n}`, [by(n)]]),
];
for (const [label, people, gap] of CASES) if (!only || label.includes(only)) run(label, people, gap);
