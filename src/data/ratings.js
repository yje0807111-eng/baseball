/*
 * 능력치 → 종합 · 영입가 계산. 시즌 로스터 데이터와 떼어 두었다 —
 * 이 셋만 필요한 화면이 시리즈 412개를 함께 받지 않도록 한다.
 */

/** 종합 능력치 = 영입가(CP)의 바탕. 포지션 역할에 맞춘 가중 평균 */
export function overallOf(position, s) {
  if (position === 'SP') return Math.round(s.stuff * 0.35 + s.control * 0.25 + s.stamina * 0.15 + s.stability * 0.25);
  if (position === 'RP') return Math.round(s.stuff * 0.4 + s.control * 0.2 + s.stability * 0.4);
  return Math.round(s.power * 0.3 + s.contact * 0.35 + s.speed * 0.15 + s.defense * 0.2);
}

/**
 * 영입가(CP). 종합 90 초과 스타는 할증, 82 미만은 할인 — 스타만 모으면 샐러리 캡을 넘고,
 * 가성비 선수와 섞어야 자리를 채울 수 있게 한다. (눈금은 리그 평균 78 · 50~110)
 */
export const costOf = (overall) => Math.round(overall + Math.max(0, overall - 90) * 0.8 - Math.max(0, 82 - overall) * 0.4);

/** 카드 id·그림 파일명에 쓸 수 있게 괄호 등을 뺀다. scripts/art-plan.mjs 와 같은 규칙 */
export const safeId = (s) => s.replace(/[^\p{L}\p{N}-]/gu, '');
