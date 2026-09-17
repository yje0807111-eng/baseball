// 플레이 뷰 배경 후보 내려받기 → public/ui/<id>.webp (1600×895)
// 사용법: node scripts/fetch-ui-art.mjs            아직 없는 후보를 모두 받는다
//        node scripts/fetch-ui-art.mjs zone-a field-c   고른 것만 받는다
// 받은 뒤 src/play/backgrounds.js 의 그 후보 src 를 'ui/<id>.webp' 로 바꾸고 remote 를 지운다.
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { FIELD_BGS, ZONE_BGS } from '../src/play/backgrounds.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'ui');
mkdirSync(out, { recursive: true });

const want = process.argv.slice(2);
const all = [...ZONE_BGS, ...FIELD_BGS].filter((b) => b.remote && (!want.length || want.includes(b.id)));
if (!all.length) { console.log('받을 후보가 없다 (remote 후보 이름을 넘기거나, 이미 다 받았다)'); process.exit(0); }

for (const b of all) {
  const file = join(out, `${b.id}.webp`);
  if (existsSync(file) && !want.includes(b.id)) { console.log(`건너뜀 ${b.id} (이미 있음)`); continue; }
  try {
    const res = await fetch(b.src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(1600, 895, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(file);
    console.log(`${b.id} ← ${b.name}  → public/ui/${b.id}.webp`);
  } catch (e) {
    console.error(`실패 ${b.id}: ${e.message}`);
  }
}
console.log('\n다음: src/play/backgrounds.js 에서 고른 후보의 src 를 그 파일로 바꾸고 remote 를 지운다.');
