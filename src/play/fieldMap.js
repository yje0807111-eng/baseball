/*
 * 배경 사진 위의 좌표 — 필드를 새로 그리지 않고, 사진에 찍힌 진짜 그라운드에 선수를 올린다.
 *
 * 사진에서 네 베이스의 픽셀 자리만 재 두면(marks), 같은 평면 위의 나머지 —
 * 마운드·외야 수비 위치·파울폴 — 는 호모그래피가 알아서 맞춘다.
 * (지금 배경으로 확인: 마운드 예측 802,555 / 실측 802,560, 파울폴 좌우 대칭까지 일치)
 *
 * 배경을 바꾸면 marks 만 다시 재면 된다. play-lab.html 의 보정 자를 쓰면 눈으로 맞출 수 있다.
 */
import { spot, HOME } from './playScript.js';

export const ART = { w: 1600, h: 895 }; // 배경 아트 기준 크기 (16:9)

/** 네 베이스의 필드 좌표 — marks 와 짝이 되는 순서 */
export const BASE_FIELD = [[0, 0], spot(1, 0.225), spot(0, 0.318), spot(-1, 0.225)]; // 홈 · 1루 · 2루 · 3루

/** 가우스 소거 */
function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/** 네 베이스 픽셀 자리 → 필드 좌표를 사진 픽셀로 옮기는 함수 묶음 */
export function makeMapper(marks) {
  const A = []; const b = [];
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = BASE_FIELD[i];
    const [u, v] = marks[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const H = [...solve(A, b), 1];
  const at = ([x, y]) => {
    const w = H[6] * x + H[7] * y + H[8];
    return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
  };
  const step = ([x, y]) => Math.abs(at([x, y + 0.01])[1] - at([x, y])[1]) / 0.01;
  const home = step(HOME) || 1;
  return { at, scaleAt: (p) => Math.max(0.34, Math.min(1.1, step(p) / home)) };
}

/** 네 점을 한 줄로 만드는 자 — 보정 UI 가 쓴다 (홈 y · 1·3루 y · 2루 y · 좌우 반폭) */
export const marksFrom = ({ homeY, sideY, secondY, halfW, cx = ART.w / 2 }) =>
  [[cx, homeY], [cx + halfW, sideY], [cx, secondY], [cx - halfW, sideY]];
