// art-src/<선수 id>.png (생성 원본) → public/cards/<선수 id>.webp (600×900, 게임용)
// 사용법: node scripts/convert-art.mjs   (이미 변환된 파일은 원본이 더 새로울 때만 다시 변환)
import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'art-src');
const outDir = join(root, 'public', 'cards');
mkdirSync(outDir, { recursive: true });

const files = existsSync(srcDir) ? readdirSync(srcDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)) : [];
let done = 0;
for (const f of files) {
  const src = join(srcDir, f);
  const out = join(outDir, `${basename(f, extname(f))}.webp`);
  if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue;
  await sharp(src).resize(600, 900, { fit: 'cover', position: 'top' }).webp({ quality: 80 }).toFile(out);
  console.log(`${f} → public/cards/${basename(out)} (${Math.round(statSync(out).size / 1024)}KB)`);
  done++;
}
console.log(`변환 ${done}개 / 원본 ${files.length}개`);
