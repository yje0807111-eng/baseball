/*
 * 스타터 스쿼드 — 새 계정(또는 한 번도 선수를 받은 적 없는 빈 라커)에 주는 26명.
 * 첫 경기를 바로 할 수 있게 하되, 좋은 팀은 골드로 영입해 만들게 한다.
 *
 * 뽑는 풀: 구단 시즌 선수만(국가대표 · 레전드 · 외국인 제외). 외국인 · 레전드는 영입으로 얻는 목표로 남긴다.
 * 수준: 종합 STARTER_BAND 안에서 고르게 — 영입 풀의 아래쪽 1/4 ~ 가운데(73~79) 사이. AI 상대(시리즈 팀 평균 가운데 78.7)보다
 *   조금 약해 처음엔 이기고 지기를 섞어 하고, 영입할 때마다 차이가 느껴진다. (scripts/starter.test.mjs 의 시뮬이 승률을 잰다)
 * 구성: 포지션 필수(21명) + 자유 자리 5명을 자동 채우기와 같은 순서(불펜 둘 · 외야 · 유격 · 포수)로 — 26명, DH 없음.
 * 씨앗: 계정 이름. 같은 이름이면 같은 스쿼드라 다시 만들어도 바뀌지 않는다.
 */
import { SERIES } from '../data/seriesPlayers.js';
import { isLegend } from './market.js';

export const STARTER_BAND = [72, 78];
/** 포지션별 인원 — 합 26 */
export const STARTER_PLAN = [['SP', 5], ['RP', 8], ['C', 3], ['SS', 2], ['2B', 1], ['3B', 1], ['1B', 1], ['OF', 5]];

const POOL = SERIES.filter((s) => s.kind !== 'national').flatMap((s) => s.players)
  .filter((p) => !p.isForeign && !isLegend(p) && p.overall >= STARTER_BAND[0] && p.overall <= STARTER_BAND[1]);

/** 문자열 → 0~1 난수열 (mulberry32) */
function rngOf(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  let t = h >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 스타터 26명 — 산 값 0 (방출해도 돌려받을 골드 없음) */
export function starterSquad(seed = 'starter') {
  const rng = rngOf(seed);
  const used = new Set();
  const out = [];
  for (const [pos, n] of STARTER_PLAN) {
    const cands = POOL.filter((p) => p.position === pos);
    for (let i = 0; i < n; i += 1) {
      const left = cands.filter((p) => !used.has(p.personId));
      if (!left.length) break;
      const p = left[Math.floor(rng() * left.length)];
      used.add(p.personId);
      out.push({ ...p, paid: 0 });
    }
  }
  return out;
}
