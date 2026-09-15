// 공 하나 단위 엔진 밸런스 확인: node scripts/sim-test.mjs [경기 수]
import { simulateGame, stealOdds } from '../src/engine/pitchSim.js';

const N = Number(process.argv[2] || 2000);
const pos = ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'DH'];
const team = (name, lv) => ({
  name,
  batters: pos.map((position, i) => ({ id: `${name}${i}`, name: `${name}${i + 1}`, position, stats: { contact: lv + (i % 3) * 3, power: lv - 6 + (i === 3 ? 18 : i % 4 * 3), speed: lv + (i < 2 ? 12 : -4), defense: lv } })),
  pitchers: [0, 1, 2, 3].map((i) => ({ id: `${name}P${i}`, name: `${name}투수${i + 1}`, stats: { stuff: lv + 8 - i * 2, control: lv + 5 - i, stability: lv + 6 - i * 2 } })),
});

const t = { runs: 0, hits: 0, hr: 0, k: 0, bb: 0, pitches: 0, dp: 0, sf: 0, err: 0, homeWin: 0, draw: 0, sb: 0, cs: 0, innings: 0 };
for (let i = 0; i < N; i++) {
  const home = team('홈', 78);
  const away = team('원정', 78);
  // 원정 팀은 1루 주자가 빠르면 가끔 도루
  const g = simulateGame({ home, away }, (g) => (g.top && g.bases[0] && !g.bases[1] && g.balls + g.strikes === 0 && stealOdds(g, 0) > 0.7 && Math.random() < 0.3 ? { steal: 0 } : {}));
  for (const ev of g.events) {
    if (ev.result === 'HR') t.hr++;
    if (ev.result === 'K') t.k++;
    if (ev.result === 'BB') t.bb++;
    if (ev.result === 'DP') t.dp++;
    if (ev.result === 'SF') t.sf++;
    if (ev.result === 'E') t.err++;
    if (ev.steal) ev.steal.ok ? t.sb++ : t.cs++;
    if (ev.pitch) t.pitches++;
  }
  t.runs += g.home.runs + g.away.runs;
  t.hits += g.home.hits + g.away.hits;
  t.homeWin += g.winner === 'home';
  t.draw += g.winner === 'draw';
  t.innings += g.inning;
}
const per = (v) => (v / N / 2).toFixed(2); // 팀당 경기당
console.log(`경기 ${N} · 팀당 평균`);
console.log({ 득점: per(t.runs), 안타: per(t.hits), 홈런: per(t.hr), 삼진: per(t.k), 볼넷: per(t.bb), 병살: per(t.dp), 희생플라이: per(t.sf), 실책: per(t.err), 투구수: per(t.pitches), 도루: `${t.sb}/${t.sb + t.cs}` });
console.log({ 홈승률: (t.homeWin / N).toFixed(3), 무승부: (t.draw / N).toFixed(3), 평균이닝: (t.innings / N).toFixed(2) });
