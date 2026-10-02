/*
 * 봇(buildMyTeam) vs 같은 캡의 내 팀(실제 경기 흐름 readyRoster → matchTeamOf) 승률 — 봇 팀 꾸리기를 바꿀 때 세기 비교용
 * npx vite-node scripts/bot-vs-me.mjs [경기 수]
 */
import { buildAiTeam, buildMyTeam } from '../src/myteam/match.js';
import { SQUAD_CAP } from '../src/myteam/rules.js';
import { seeded } from '../src/engine/rng.js';
import { simulateGame } from '../src/engine/pitchSim.js';
import { readyRoster, matchTeamOf } from '../src/myteam/prep.js';
import { engineTeam } from '../src/BroadcastGame.jsx';

const N = Number(process.argv[2] || 1500);
let w = 0, d = 0, rpShare = 0, pitches = 0;
for (let i = 0; i < N; i++) {
  const mine = { name: 'ME', squad: buildAiTeam(SQUAD_CAP, seeded(i * 2 + 1)).roster, staff: {} };
  const me = engineTeam(matchTeamOf(mine, readyRoster(mine).ready));
  const bot = engineTeam(buildMyTeam({ squad: buildAiTeam(SQUAD_CAP, seeded(i * 2 + 2)).roster, staff: {}, name: 'BOT' }));
  const meHome = i % 2 === 0;
  const g = simulateGame({ home: meHome ? me : bot, away: meHome ? bot : me, rng: seeded(i + 7) });
  if (g.winner === 'draw') d++; else if ((g.winner === 'home') === meHome) w++;
  const botSide = meHome ? g.away : g.home;
  for (const ev of g.events) if (ev.pitch && ev.pitcher && bot.pitchers.some((p) => p.id === ev.pitcher.id)) { pitches++; if (ev.pitcher.position === 'RP') rpShare++; }
  void botSide;
}
const p = w / (N - d);
console.log(`내 팀 승률 vs 봇 ${(p * 100).toFixed(1)}% ±${(196 * Math.sqrt(p * (1 - p) / (N - d))).toFixed(1)} · 봇 투구 중 불펜 몫 ${pitches ? ((rpShare / pitches) * 100).toFixed(0) : '?'}%`);
