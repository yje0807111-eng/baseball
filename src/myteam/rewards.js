import { cupMult } from './cups.js';
/*
 * 모드 보상표 — 토너먼트 최종 성적 골드 · 랭크전 최종 순위 RP/골드.
 * 엔진을 끌어오지 않는 가벼운 파일이라 저장소(store.js)가 끝난 판의 보상을 바로 지급할 때 쓴다.
 */

const ROUND_NAME = (n) => (n === 2 ? { ko: '결승', en: 'FINAL' } : n === 4 ? { ko: '4강', en: 'SEMIFINAL' } : n === 8 ? { ko: '8강', en: 'QUARTERFINAL' } : { ko: `${n}강`, en: `ROUND OF ${n}` });
/** 참가 수별 라운드: 64 → 64강 · 32강 · 16강 · 8강 · 4강 · 결승 */
export function roundsOf(size = 32) {
  const out = [];
  for (let n = size; n >= 2; n >>= 1) out.push({ key: `r${n}`, ...ROUND_NAME(n) });
  return out;
}

/* 최종 성적 보상: 뒤에서부터 우승 · 준우승 · 4강 … (큰 대회일수록 조금 더) */
const REWARD_TAIL = [
  { gold: 1200 }, { gold: 800 }, { gold: 500 }, { gold: 350 }, { gold: 200 }, { gold: 100 }, { gold: 60 },
];
const SIZE_MUL = { 16: 0.8, 32: 1, 64: 1.25 };
/** 최종 성적(0: 첫 라운드 탈락 … rounds−1: 준우승 · rounds: 우승)별 보상 */
export function finishOf(size = 32, cup = null) {
  const rounds = roundsOf(size);
  const n = rounds.length;
  const mul = SIZE_MUL[size] || 1;
  return Array.from({ length: n + 1 }, (_, place) => ({
    ko: place === n ? '우승' : place === n - 1 ? '준우승' : `${rounds[place].ko} 탈락`,
    gold: Math.round((REWARD_TAIL[n - place]?.gold || 50) * mul * cupMult(cup) / 10) * 10,
  }));
}

/** 최종 순위(1~10)별 보상 */
export const PLACE_REWARD = [
  { ko: '통합 우승', rp: 60, gold: 1500 },
  { ko: '준우승', rp: 45, gold: 1000 },
  { ko: '플레이오프 탈락', rp: 35, gold: 800 },
  { ko: '준플레이오프 탈락', rp: 25, gold: 600 },
  { ko: '와일드카드 탈락', rp: 15, gold: 500 },
  { ko: '정규 6위', rp: 0, gold: 300 },
  { ko: '정규 7위', rp: -5, gold: 250 },
  { ko: '정규 8위', rp: -10, gold: 200 },
  { ko: '정규 9위', rp: -15, gold: 150 },
  { ko: '정규 10위', rp: -20, gold: 100 },
];
