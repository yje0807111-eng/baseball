/* 실제 드래프트 흐름을 흉내 내는 도구 — 시너지 시뮬(synergy-draft · synergy-game)이 같이 쓴다.
   드래프트는 20 라운드, 라운드마다 시리즈 하나(대개 한 팀의 한 시즌)를 열어 선반 17명 가운데 한 명을 고른다.
   아직 안 나온 시리즈가 먼저 나오고, 시리즈 새로고침은 3번 (게임의 rollSeries · sampleSeries 와 같은 방식) */
import { POS_ORDER, ROSTER_SIZE, getLockReason } from '../src/KboAugmentDraft.jsx';

const SHELF = 17;
const REROLLS = 3;

export const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const shuffle = (arr, rng) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** 가성비 — 종합에서 평균(78 CP)보다 비싼 만큼을 뺀다 */
export const value = (p) => p.overall - (p.cost - 78) * 0.5;

/** 선반: 포지션마다 1명씩 먼저, 나머지는 무작위 */
function shelfOf(series, rng) {
  if (series.players.length <= SHELF) return series.players;
  const all = shuffle(series.players, rng);
  const core = POS_ORDER.map((pos) => all.find((p) => p.position === pos)).filter(Boolean);
  return [...core, ...all.filter((p) => !core.includes(p)).slice(0, SHELF - core.length)];
}

/** 무리형 · 조합형은 지금 엔트리를 보고 목표를 정한다 */
const group = (key) => (roster) => {
  const c = {}; roster.forEach((p) => { const k = key(p); if (k) c[k] = (c[k] || 0) + 1; });
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  return (p) => !top || key(p) === top[0];
};
const TARGET = {
  franchise: group((p) => p.team),
  teamYear: group((p) => `${p.year} ${p.team}`),
  era: group((p) => Math.floor(p.year / 10)),
  battery: () => (p) => (p.position === 'C' && p.stats.defense >= 90) || (p.type === 'pitcher' && p.stats.control >= p.stats.stuff + 5),
};
/** 시너지를 노리는 사람의 눈 — 엔트리를 받아 '이 선수가 조건에 드는가' 를 돌려준다 */
export const hitterFor = (s) => (roster) => (TARGET[s.id] ? TARGET[s.id](roster) : (p) => s.members([p]).length > 0);

/** 한 판 드래프트. hitOf 가 있으면 조건 선수를 먼저 고르고, 선반에 없으면 새로고침한다 */
export function draft(mode, rng, hitOf = null) {
  const pool = shuffle(mode.series, rng);
  const seen = new Set();
  let roster = []; let cp = mode.cap; let rerolls = REROLLS; let prev = null;
  const nextSeries = () => {
    const fresh = pool.filter((s) => !seen.has(s.id) && s.id !== prev);
    const s = fresh[0] || pool.filter((x) => x.id !== prev)[Math.floor(rng() * (pool.length - 1))];
    seen.add(s.id); prev = s.id;
    return s;
  };
  for (let round = 1; round <= ROSTER_SIZE && roster.length < ROSTER_SIZE; round++) {
    let shelf = shelfOf(nextSeries(), rng);
    const hit = hitOf ? hitOf(roster) : null;
    const open = (list) => list.filter((p) => !getLockReason(p, roster, cp) && cp - p.cost >= (ROSTER_SIZE - roster.length - 1) * 50);
    while (hit && rerolls > 0 && !open(shelf).some(hit)) { rerolls--; shelf = shelfOf(nextSeries(), rng); }
    const ok = open(shelf);
    if (!ok.length) continue;
    const score = (p) => value(p) + (hit && hit(p) ? 40 : 0);
    const best = ok.sort((a, b) => score(b) - score(a))[0];
    roster = [...roster, best]; cp -= best.cost;
  }
  return roster;
}
