/*
 * 코치진 값어치 확인 — 코치진 CP 만큼 선수를 덜 산 팀(A) vs 캡을 다 선수에 쓴 팀(B).
 * 제값이면 A 승률 ≈ 50%. 50 보다 높으면 CP 에 비해 강하고(싸다), 낮으면 약하다(비싸다).
 * npx vite-node scripts/staff-balance.mjs [경기 수]
 * 한 경기 시뮬이라 투수 휴식(rest) · 나쁜 날 흔들림(calm)은 재지 못한다.
 */
import { buildAiTeam, buildMyTeam } from '../src/myteam/match.js';
import { STAFF } from '../src/myteam/staff.js';
import { SQUAD_CAP } from '../src/myteam/rules.js';
import { seeded } from '../src/engine/rng.js';
import { simulateGame } from '../src/engine/pitchSim.js';
import { engineTeam } from '../src/BroadcastGame.jsx';

const N = Number(process.argv[2] || 3000);
const by = (name) => STAFF.find((s) => s.name === name);
const slotOf = { manager: 'manager', head: 'head', batting: 'batting', pitching: 'pitching' };

function run(label, people, capGap = null) {
  const staff = Object.fromEntries(people.map((p) => [slotOf[p.role], p]));
  const cost = capGap ?? people.reduce((t, p) => t + p.cost, 0);
  let w = 0, d = 0;
  for (let i = 0; i < N; i++) {
    const a = engineTeam(buildMyTeam({ squad: buildAiTeam(SQUAD_CAP - cost, seeded(i * 2 + 1)).roster, staff: capGap != null ? {} : staff, name: 'A' }));
    const b = engineTeam(buildMyTeam({ squad: buildAiTeam(SQUAD_CAP, seeded(i * 2 + 2)).roster, staff: {}, name: 'B' }));
    const aHome = i % 2 === 0;
    const g = simulateGame({ home: aHome ? a : b, away: aHome ? b : a, rng: seeded(i + 99) });
    if (g.winner === 'draw') d++; else if ((g.winner === 'home') === aHome) w++;
  }
  const p = w / (N - d);
  console.log(`${label.padEnd(28)} ${String(cost).padStart(3)} CP  A 승률 ${(p * 100).toFixed(1)}%  ±${(196 * Math.sqrt(p * (1 - p) / (N - d))).toFixed(1)}`);
}

const only = process.argv[3];
const CASES = [
  ['기준: 똑같이', [], 0],
  ['기준: 선수 CP −100', [], 100],
  ...['김응용', '백인천', '김태형', '허삼영', '염경엽', '김영덕', '김성근', '류중일', '트레이 힐만', '김인식', '이강철'].map((n) => [`감독 ${n}`, [by(n)]]),
  ...['정경배', '김용달', '박흥식', '김무관', '오치아이 에이지', '후쿠하라 미네오', '조웅천', '이대진', '정민태'].map((n) => [`코치 ${n}`, [by(n)]]),
  ['조합: 김응용 · 정경배 · 김용달 · 오치아이', ['김응용', '정경배', '김용달', '오치아이 에이지'].map(by)],
];
for (const [label, people, gap] of CASES) if (!only || label.includes(only)) run(label, people, gap);
