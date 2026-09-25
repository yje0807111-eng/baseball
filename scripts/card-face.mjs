/*
 * 카드 아트에서 얼굴(코) 높이를 찾아 src/data/cardFace.js 를 만든다.
 *
 * 얼굴은 피부색 픽셀이 가장 몰린 가로줄이다. 모자를 쓰고 있어 그 줄은 대개 눈~코 높이가 된다.
 * 찾은 높이를 선발 맞대결 판(367×260, cover)에서 목표 높이에 앉히는 background-position 값으로 바꾼다.
 */
import sharp from 'sharp';
import { readdirSync, writeFileSync } from 'node:fs';

const DIR = 'public/cards';
const W = 120, H = 180;      // 분석용 축소 크기
const ART_H = 900;           // 카드 아트 원본 높이
const CARD_W = 367, CARD_H = 260; // 선발 판 카드 크기
const AIM = 0.36;            // 얼굴이 앉을 카드 안 높이
const NOSE = 8;              // 찾은 자리는 눈썹께다 — 코까지 이만큼 내린다
const LO = 0.04, HI = 0.72;  // 얼굴을 찾는 구간 (원본 비율)

/** 피부색인가 — 조명이 센 카드라 아주 밝은 흰색은 뺀다 */
const skin = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return r > 65 && r > g && g >= b && r - b > 18 && mx - mn > 18 && mn < 215;
};

/** 그 카드에서 얼굴이 있는 원본 y (픽셀) */
export async function faceY(file) {
  const { data } = await sharp(file).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = new Array(H).fill(0);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 3;
      if (skin(data[i], data[i + 1], data[i + 2])) rows[y] += 1;
    }
  }
  /* 다섯 줄 이동평균으로 다듬고, 얼굴이 있을 만한 구간에서 가장 진한 줄 */
  const sm = rows.map((_, y) => {
    let s = 0; let n = 0;
    for (let k = -2; k <= 2; k += 1) { const t = y + k; if (t >= 0 && t < H) { s += rows[t]; n += 1; } }
    return s / n;
  });
  /* 팔뚝이 얼굴보다 넓을 때가 많다 — 가장 진한 줄이 아니라 위에서 내려오며 만나는
     첫 덩어리(모자 아래 얼굴)의 한가운데를 쓴다 */
  const y0 = Math.round(H * LO); const y1 = Math.round(H * HI);
  let peak = 0;
  for (let y = y0; y < y1; y += 1) peak = Math.max(peak, sm[y]);
  const mark = peak * 0.45;
  let s0 = -1; let s1 = -1;
  for (let y = y0; y < y1; y += 1) {
    if (sm[y] >= mark) { if (s0 < 0) s0 = y; s1 = y; } else if (s0 >= 0 && y - s1 > 3) break;
  }
  const at = s0 < 0 ? Math.round(H * 0.22) : Math.round((s0 + s1) / 2);
  return { y: (at / H) * ART_H, strength: peak / W };
}

/** 그 얼굴 높이를 카드에 앉히는 background-position 세로 % */
export function posOf(y) {
  const k = Math.max(CARD_W / 600, CARD_H / ART_H); // cover 배율
  const drawn = ART_H * k;
  const p = ((y * k - CARD_H * AIM) * 100) / (drawn - CARD_H);
  return Math.max(-10, Math.min(60, Math.round(p) - NOSE));
}

if (process.argv[1]?.endsWith('card-face.mjs')) {
  const only = process.argv[2]; // 일부만 보고 싶을 때
  const files = readdirSync(DIR).filter((n) => n.endsWith('.webp')).filter((n) => !only || n.includes(only));
  const out = {};
  let done = 0;
  for (const n of files) {
    const id = n.replace(/\.webp$/, '');
    try {
      const { y, strength } = await faceY(`${DIR}/${n}`);
      out[id] = posOf(y);
      if (strength < 0.02) out[id] = 0; // 피부를 거의 못 찾았으면 기본값
    } catch { out[id] = 0; }
    done += 1;
    if (done % 300 === 0) process.stdout.write(`${done}/${files.length} `);
  }
  const keys = Object.keys(out).sort();
  const body = keys.map((k) => `  ${JSON.stringify(k)}: ${out[k]},`).join('\n');
  writeFileSync('src/data/cardFace.js', `/*
 * 카드 아트에서 얼굴이 오는 세로 자리 (%).
 *
 * 카드 아트(600×900)는 포즈마다 얼굴 높이가 달라, 넓은 카드에 꽉 채우면
 * 누구는 얼굴이 위로 누구는 아래로 간다. 아래 표는 scripts/card-face.mjs 가
 * 피부색이 가장 몰린 가로줄(눈~코 높이)을 찾아 적어 둔 값이다.
 *
 * 눈으로 고치고 싶으면 mockups/card-face/ 에서 카드를 끌어 맞춘 뒤 값을 내보낸다.
 */
export const DEFAULT_FACE = 0;

/** 선수 id → 세로 % */
export const CARD_FACE = {
${body}
};

/** 그 선수의 카드 배경 자리 — background-position 값 */
export const faceAt = (id) => \`50% \${CARD_FACE[id] ?? DEFAULT_FACE}%\`;
`);
  /* 손으로 고칠 때 이 값 위에서 시작하도록 도구에도 넘겨 둔다 */
  writeFileSync('mockups/card-face/auto.json', JSON.stringify(out));
  console.log(`\n${keys.length}장 · ${keys.filter((k) => out[k] !== 0).length}장에 값이 붙었다`);
}
