/*
 * 카드 아트에서 얼굴이 오는 세로 자리 (%).
 *
 * 카드 아트(600×900)는 포즈마다 얼굴 높이가 달라, 넓은 카드에 꽉 채우면
 * 누구는 얼굴이 위로 누구는 아래로 간다. 눈으로 맞춘 값을 여기에 적어 둔다.
 *
 * 값 만드는 곳: mockups/card-face/ — 카드를 위아래로 끌어 붉은 선에 얼굴을 맞추고
 * '값 내보내기'로 뽑아 이 표에 붙인다. 없는 선수는 DEFAULT_FACE 를 쓴다.
 */
export const DEFAULT_FACE = 0;

/** 선수 id → 세로 % */
export const CARD_FACE = {
};

/** 그 선수의 카드 배경 자리 — background-position 값 */
export const faceAt = (id) => `50% ${CARD_FACE[id] ?? DEFAULT_FACE}%`;
