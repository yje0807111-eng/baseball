/* 사이드 메뉴 칸 그림(public/ui/nav/<키>.webp) 생성 도구 — 라커 · 상점 · 증강이 같은 규칙을 쓴다.
   그림체는 "야간 구장 시네마틱 실사", 배경은 아주 어두운 남색 한 톤, 주제는 가운데에 두고 둘레는 비운다.
   빛 색만 그 칸의 색을 쓴다 (증강 등급 그림은 scripts/aug-tier-art.mjs).

   node scripts/nav-art.mjs prompts                      프롬프트 출력
   node scripts/nav-art.mjs fetch <키>=<이미지URL> [...]    내려받아 art-src/nav/<키>.png + public/ui/nav/<키>.webp (480×480) */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'art-src', 'nav');
const OUT = join(root, 'public', 'ui', 'nav');
const SIZE = 480;

/** 키 → [빛 색, 장면] — 키는 화면에서 쓰는 이름 (locker-*, shop-*) */
export const NAV_ART = {
  'locker-scout': ['Emerald green (#10b981)', "A scout's radar gun and clipboard resting on a stadium seat at night, overlooking a dark empty field"],
  'locker-squad': ['Emerald green (#10b981)', 'A clean white baseball jersey hanging in a dark locker with a bat leaning beside it'],
  'locker-staff': ['Violet (#c4b5fd)', 'A lineup card, a pen and a team cap resting on the dugout rail at night'],
  'locker-items': ['Warm gold (#fde047)', 'An open equipment bag on a dugout bench with wrist tape, rosin bag and batting gloves spilling out'],
  'shop-all': ['Warm gold (#fde047)', 'A wooden shop counter at night with stacked supply crates and a small glowing lamp, baseball gear visible'],
  'shop-training': ['Sky-blue (#7dd3fc)', 'A batting tee with a ball on it inside a dark indoor practice cage, chalk dust in the air'],
  'shop-boost': ['Emerald green (#34d399)', 'A cold energy drink can standing on a dugout bench with condensation beads'],
  'shop-ops': ['Warm red (#f87171)', 'A glowing salary-cap gauge board and stacked roster papers on a club office desk at night'],
  'shop-staff': ['Violet (#c4b5fd)', 'A contract document with a fountain pen resting on it and a team cap beside it, on a dark desk'],
  'shop-draft': ['Warm gold (#fbbf24)', 'A draft board table at night with a row of name placards and a single glowing baseball in front of them'],
  'shop-aug': ['Magenta (#e879f9)', 'A glowing energy orb hovering above a baseball, prismatic light shards around it'],
};
const prompt = (k) => {
  const [light, scene] = NAV_ART[k];
  return `Cinematic night baseball photograph, square. ${scene}. ${light} light on a very dark navy-black background, the background reads as one flat dark tone. Centered subject with empty dark space around it, no text, no logos, no watermark.`;
};

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'prompts') {
  console.log(JSON.stringify(Object.fromEntries(Object.keys(NAV_ART).map((k) => [k, prompt(k)])), null, 2));
} else if (cmd === 'fetch') {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  for (const a of args) {
    const i = a.indexOf('=');
    const key = a.slice(0, i), url = a.slice(i + 1);
    if (!NAV_ART[key]) { console.log(`모르는 키 ${key}`); continue; }
    const res = await fetch(url);
    if (!res.ok) { console.log(`${key} 실패 HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(SRC, `${key}.png`), buf);
    await sharp(buf).resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: 82 }).toFile(join(OUT, `${key}.webp`));
    console.log(`${key} → public/ui/nav/${key}.webp`);
  }
} else {
  console.log('쓰기: node scripts/nav-art.mjs prompts | fetch <키>=<url> ...');
}
