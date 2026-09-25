import { describe, it, expect } from 'vitest';
import { starterSquad, STARTER_BAND } from '../src/myteam/starter.js';
import { squadIssues, squadCost, SQUAD_CAP, foreignCount } from '../src/myteam/rules.js';
import { isLegend } from '../src/myteam/market.js';
import { readyRoster, matchTeamOf } from '../src/myteam/prep.js';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/BroadcastGame.jsx';
import { createGame, pitch } from '../src/engine/pitchSim.js';

describe('스타터 스쿼드', () => {
  const squad = starterSquad('감독A');
  it('바로 경기에 나갈 수 있는 26명', () => {
    expect(squad).toHaveLength(26);
    expect(squadIssues(squad)).toEqual([]);
  });
  it('캡은 넉넉히 남긴다 — 영입할 자리', () => {
    expect(SQUAD_CAP - squadCost(squad)).toBeGreaterThan(250);
  });
  it('외국인 · 레전드 없이, 정한 수준 안에서', () => {
    expect(foreignCount(squad)).toBe(0);
    for (const p of squad) {
      expect(isLegend(p)).toBe(false);
      expect(p.overall).toBeGreaterThanOrEqual(STARTER_BAND[0]);
      expect(p.overall).toBeLessThanOrEqual(STARTER_BAND[1]);
      expect(p.paid).toBe(0);
    }
    expect(new Set(squad.map((p) => p.personId)).size).toBe(26);
  });
  it('같은 이름이면 같은 스쿼드, 다른 이름이면 다른 스쿼드', () => {
    expect(starterSquad('감독A').map((p) => p.id)).toEqual(squad.map((p) => p.id));
    expect(starterSquad('감독B').map((p) => p.id)).not.toEqual(squad.map((p) => p.id));
  });

  /* 균형: 스타터로 AI 시리즈 팀을 상대한 승률. 처음부터 쉽게 이기지도, 거의 못 이기지도 않게 */
  it('AI 상대 승률이 너무 높지도 낮지도 않다', () => {
    let win = 0; let games = 0;
    const seeds = ['감독A', '감독B', '감독C', '감독D'];
    for (const seed of seeds) {
      const team = { name: seed, squad: starterSquad(seed), staff: {}, cap: SQUAD_CAP };
      const { ready, rest } = readyRoster(team, 1);
      const my = engineTeam(matchTeamOf(team, ready, rest));
      for (let i = 0; i < 40; i += 1) {
        let s = i * 7 + seed.length;
        const rng = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
        const opp = engineTeam(seriesTeam(AI_SERIES[Math.floor(rng() * AI_SERIES.length)], rng));
        const g = createGame({ home: my, away: opp });
        let k = 0;
        while (!g.final && k < 20000) { k += 1; if (!pitch(g, {})) break; }
        games += 1;
        if (g.winner === 'home') win += 1;
      }
    }
    const rate = win / games;
    process.stderr.write(`스타터 승률 ${(rate * 100).toFixed(1)}% (${win}/${games})\n`);
    expect(rate).toBeGreaterThan(0.25);
    expect(rate).toBeLessThan(0.5);
  }, 120000);
});
