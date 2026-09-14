// art-src/<선수 id>.png (생성 원본) → public/cards/<선수 id>.webp (600×900, 게임용)
// art-src/profiles/<선수 id>.png (정면 상반신 프로필) → public/profiles/<선수 id>.webp (360×480, 필드 슬롯·로테이션용)
// 사용법: node scripts/convert-art.mjs   (이미 변환된 파일은 원본이 더 새로울 때만 다시 변환)
import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const JOBS = [
  { src: join(root, 'art-src'), out: join(root, 'public', 'cards'), w: 600, h: 900 },
  { src: join(root, 'art-src', 'profiles'), out: join(root, 'public', 'profiles'), w: 360, h: 480 },
];

for (const { src: srcDir, out: outDir, w, h } of JOBS) {
  mkdirSync(outDir, { recursive: true });
  const files = existsSync(srcDir) ? readdirSync(srcDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)) : [];
  let done = 0;
  for (const f of files) {
    const src = join(srcDir, f);
    const out = join(outDir, `${basename(f, extname(f))}.webp`);
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue;
    await sharp(src).resize(w, h, { fit: 'cover', position: 'top' }).webp({ quality: 80 }).toFile(out);
    console.log(`${f} → ${basename(outDir)}/${basename(out)} (${Math.round(statSync(out).size / 1024)}KB)`);
    done++;
  }
  console.log(`${basename(outDir)}: 변환 ${done}개 / 원본 ${files.length}개`);
}
