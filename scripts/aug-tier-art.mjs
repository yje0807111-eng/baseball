/* 증강 화면 왼쪽 칸 그림(public/ui/aug/<키>.webp) 생성 도구.
   키: silver · gold · prismatic · upgrade. 그림체는 게임의 다른 아트와 같은 "야간 구장 시네마틱 실사",
   배경은 아주 어두운 남색 한 톤으로 통일해 두었다 — 나중에 증강마다 그림을 넣을 때 같은 배경색을 쓰면 된다.

   node scripts/aug-tier-art.mjs prompts                    프롬프트 출력
   node scripts/aug-tier-art.mjs fetch <키>=<이미지URL> [...]  내려받아 art-src/aug/<키>.png + public/ui/aug/<키>.webp (480×480) */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'art-src', 'aug');
const OUT = join(root, 'public', 'ui', 'aug');
const SIZE = 480;

/** 키 → [빛 색, 장면] */
export const TIER_ART = {
  silver: ['Silver-white (#cbd5e1) and steel-blue', 'A baseball glove and ball resting on the dugout steps at night, wrapped in a cold energy haze, fine sparks drifting'],
  gold: ['Golden amber (#fbbf24)', 'A wooden bat standing upright on home plate at night, wrapped in a warm energy haze, glowing embers drifting'],
  prismatic: ['Magenta (#e879f9) and violet', 'A baseball floating in mid-air above the mound, wrapped in swirling prismatic energy and refracted light shards'],
  upgrade: ['Emerald green (#34d399)', 'A blank glowing card rising in mid-air wrapped in energy and upward sparks, as if being upgraded'],
};
const prompt = (k) => {
  const [light, scene] = TIER_ART[k];
  return `Cinematic night baseball photograph, square. ${scene}. ${light} light on a very dark navy-black background, the background reads as one flat dark tone. Centered subject with empty dark space around it, no text, no logos, no watermark.`;
};

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'prompts') {
  console.log(JSON.stringify(Object.fromEntries(Object.keys(TIER_ART).map((k) => [k, prompt(k)])), null, 2));
} else if (cmd === 'fetch') {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  for (const a of args) {
    const i = a.indexOf('=');
    const key = a.slice(0, i), url = a.slice(i + 1);
    if (!TIER_ART[key]) { console.log(`모르는 키 ${key}`); continue; }
    const res = await fetch(url);
    if (!res.ok) { console.log(`${key} 실패 HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(SRC, `${key}.png`), buf);
    await sharp(buf).resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: 82 }).toFile(join(OUT, `${key}.webp`));
    console.log(`${key} → public/ui/aug/${key}.webp`);
  }
} else {
  console.log('쓰기: node scripts/aug-tier-art.mjs prompts | fetch <키>=<url> ...');
}
