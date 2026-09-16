// 감독·코치 자리 카드 아트의 얼굴 위치·크기를 맞춘다.
// 사용법: node scripts/staff-align.mjs [--sheet <미리보기.png>]
//   art-src/staff-cards/<id>.png 에서 얼굴(피부색 영역)을 찾아, 얼굴 폭·중심이 모두 같은 자리에 오도록
//   확대·이동해 public/staff/<id>.webp (800×600) 로 쓴다. 비는 가장자리는 배경색으로 채운다.
//   얼굴을 잘못 잡는 그림은 FIX 에 { cx, cy, w } (원본 픽셀)를 적어 덮어쓴다.
import { readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'art-src', 'staff-cards');
const out = join(root, 'public', 'staff');
mkdirSync(out, { recursive: true });

const OUT_W = 800, OUT_H = 600;
// 얼굴 중심과 폭 (결과 픽셀). 원본 인물 자리·크기에 가깝게 잡아 확대·축소 폭을 줄인다
const TARGET = { cx: 0.59 * OUT_W, cy: 0.42 * OUT_H, w: 0.17 * OUT_W };
const BG = { r: 5, g: 8, b: 15 };
const FIX = {};
// 옮기면서 비는 가장자리와 원본 경계가 드러나지 않게 가장자리를 배경색으로 덮는다
const VIGNETTE = Buffer.from(`<svg width="${OUT_W}" height="${OUT_H}"><defs>
<radialGradient id="v" cx="59%" cy="45%" r="75%"><stop offset="60%" stop-color="#05080f" stop-opacity="0"/><stop offset="100%" stop-color="#05080f" stop-opacity="1"/></radialGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="88%" stop-color="#05080f" stop-opacity="0"/><stop offset="100%" stop-color="#05080f" stop-opacity=".9"/></linearGradient>
</defs><rect width="100%" height="100%" fill="url(#v)"/><rect width="100%" height="100%" fill="url(#b)"/></svg>`);

/** 피부색 픽셀로 얼굴 상자를 찾는다: 위쪽 65% 에서 피부 픽셀이 충분한 첫 연속 행 구간 → 그 구간의 가장 큰 가로 덩어리 */
async function findFace(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const skin = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return y > 70 && cb > 77 && cb < 127 && cr > 136 && cr < 173 && r > g && r > b;
  };
  const rows = [];
  const maxY = Math.floor(H * 0.65);
  for (let y = 0; y < maxY; y++) {
    const xs = [];
    for (let x = Math.floor(W * 0.2); x < Math.floor(W * 0.95); x++) if (skin((y * W + x) * 3)) xs.push(x);
    rows.push(xs);
  }
  const minCount = Math.max(12, Math.round(W * 0.02));
  const longest = (xs) => {
    let best = [0, -1], cur = [xs[0], xs[0]];
    for (let k = 1; k < xs.length; k++) {
      if (xs[k] - xs[k - 1] <= 6) cur[1] = xs[k];
      else { if (cur[1] - cur[0] > best[1] - best[0]) best = cur; cur = [xs[k], xs[k]]; }
    }
    if (xs.length && cur[1] - cur[0] > best[1] - best[0]) best = cur;
    return best;
  };
  // 피부색이 이어지는 행 구간을 위에서부터 훑되, 모자 로고·붉은 림라이트처럼 좁은 구간(폭 < 그림 폭의 8%)은 건너뛴다
  let from = 0;
  for (;;) {
    const start = rows.findIndex((xs, y) => y >= from && xs.length >= minCount);
    if (start < 0) return null;
    let end = start;
    while (end + 1 < rows.length && rows[end + 1].length >= minCount * 0.6) end++;
    const runs = rows.slice(start, end + 1).map(longest);
    const widths = runs.map(([x0, x1]) => x1 - x0).filter((v) => v > 0).sort((x, y) => x - y);
    const w = widths[Math.floor(widths.length * 0.8)] || 0;
    if (w < W * 0.08 || end - start < 20) { from = end + 1; continue; }
    // 턱 아래 목까지 이어질 수 있어 얼굴 높이를 폭의 1.3배로 자른다
    const h = Math.min(end - start + 1, Math.round(w * 1.3));
    const centers = runs.slice(0, h).filter(([x0, x1]) => x1 - x0 > w * 0.5).map(([x0, x1]) => (x0 + x1) / 2).sort((x, y) => x - y);
    const cx = centers[Math.floor(centers.length / 2)];
    return { cx, cy: start + h / 2, w, W, H };
  }
}

const files = readdirSync(src).filter((f) => f.endsWith('.png')).sort();
const report = [];
for (const f of files) {
  const id = f.replace(/\.png$/, '');
  const file = join(src, f);
  const meta = await sharp(file).metadata();
  const face = FIX[id] ? { ...FIX[id], W: meta.width, H: meta.height } : await findFace(file);
  if (!face) { report.push(`${id}: 얼굴 못 찾음`); continue; }
  const k = TARGET.w / face.w; // 원본 → 결과 배율
  const rw = Math.round(face.W * k), rh = Math.round(face.H * k);
  const left = Math.round(TARGET.cx - face.cx * k), top = Math.round(TARGET.cy - face.cy * k);
  // 결과 캔버스(800×600)에 확대한 원본을 left/top 만큼 옮겨 붙이고, 넘치는 부분은 자른다
  const resized = await sharp(file).resize(rw, rh).toBuffer();
  const cropL = Math.max(0, -left), cropT = Math.max(0, -top);
  const cw = Math.min(rw - cropL, OUT_W - Math.max(0, left)), ch = Math.min(rh - cropT, OUT_H - Math.max(0, top));
  const piece = await sharp(resized).extract({ left: cropL, top: cropT, width: cw, height: ch }).toBuffer();
  await sharp({ create: { width: OUT_W, height: OUT_H, channels: 3, background: BG } })
    .composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }, { input: VIGNETTE, left: 0, top: 0 }])
    .webp({ quality: 80 }).toFile(join(out, `${id}.webp`));
  report.push(`${id}: 얼굴 폭 ${Math.round(face.w)} 중심 (${Math.round(face.cx)},${Math.round(face.cy)}) 배율 ${k.toFixed(2)}`);
}
console.log(report.join('\n'));

const sheetAt = process.argv.indexOf('--sheet');
if (sheetAt > 0) {
  const ids = files.map((f) => f.replace(/\.png$/, ''));
  const tw = 200, th = 150, cols = 8;
  const tiles = await Promise.all(ids.map((id) => sharp(join(out, `${id}.webp`)).resize(tw, th).toBuffer()));
  const rowsN = Math.ceil(tiles.length / cols);
  // 기준선: 얼굴 중심 가로·세로 가는 선
  const guide = Buffer.from(`<svg width="${tw}" height="${th}"><line x1="${TARGET.cx / 4}" y1="0" x2="${TARGET.cx / 4}" y2="${th}" stroke="#34d399" stroke-opacity=".5"/><line x1="0" y1="${TARGET.cy / 4}" x2="${tw}" y2="${TARGET.cy / 4}" stroke="#34d399" stroke-opacity=".5"/></svg>`);
  await sharp({ create: { width: cols * tw, height: rowsN * th, channels: 3, background: '#000' } })
    .composite(tiles.flatMap((b, i) => [{ input: b, left: (i % cols) * tw, top: Math.floor(i / cols) * th }, { input: guide, left: (i % cols) * tw, top: Math.floor(i / cols) * th }]))
    .png().toFile(process.argv[sheetAt + 1]);
}
