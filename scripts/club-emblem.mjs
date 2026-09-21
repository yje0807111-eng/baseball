/* 구단 엠블럼(public/ui/clubs/<키>.webp) 생성 도구 — 라이브 드래프트에서 카드가 사라질 때 배경으로 깔린다.
   ⚠ 실제 구단 로고는 쓰지 않는다. 구단 상징(사자 · 곰 · 호랑이 …)을 구단 색으로 새로 그린 그림이다.
   그림체: 굵은 그래픽 실루엣 문장(crest), 아주 어두운 남색 배경에 구단 색 빛, 글자 없음.

   node scripts/club-emblem.mjs prompts                      프롬프트 출력
   node scripts/club-emblem.mjs missing                      아직 그림이 없는 구단
   node scripts/club-emblem.mjs fetch <키>=<이미지URL> [...]    내려받아 art-src/clubs/<키>.png + public/ui/clubs/<키>.webp (512×768) */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'art-src', 'clubs');
const OUT = join(root, 'public', 'ui', 'clubs');
const W = 512, H = 768;

/** 키 → [구단, 색 표현, 상징] — 키는 src/myteam/teamArt.js 의 깃발 키와 같다 */
export const CLUB_ART = {
  samsung: ['삼성 라이온즈', 'royal blue and silver', 'A roaring lion head crest'],
  doosan: ['두산 베어스', 'deep indigo and white', 'A powerful bear head crest'],
  lg: ['LG 트윈스', 'crimson red and white', 'Twin crossed baseball bats forming a mirrored crest'],
  kia: ['KIA 타이거즈', 'scarlet red and black with white fangs', 'A fierce tiger head crest'],
  lotte: ['롯데 자이언츠', 'sea-blue and white with wave motifs', "A giant's clenched fist gripping a baseball"],
  hanwha: ['한화 이글스', 'burnt orange and black', 'A soaring eagle with spread wings crest'],
  sk: ['SSG 랜더스', 'rose-red and white', 'A cresting ocean wave breaking over a baseball'],
  nc: ['NC 다이노스', 'gold and charcoal', 'A dinosaur (tyrannosaurus) head crest'],
  kt: ['KT 위즈', 'crimson and white', "A wizard's pointed hat over a glowing baseball with sparks"],
  kiwoom: ['키움 히어로즈', 'magenta-burgundy and white', "A masked hero's cape and shield crest"],
  hyundai: ['현대 유니콘스', 'violet and silver', 'A unicorn head crest with a sharp horn'],
};
const prompt = (k) => {
  const [, color, scene] = CLUB_ART[k];
  return `Original sports club emblem illustration, vertical. ${scene} in ${color}, geometric and modern, centered on a very dark navy-black background with a soft glow behind it. Bold graphic silhouette style, no text, no letters, no real team logo, no watermark.`;
};

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'prompts') {
  console.log(JSON.stringify(Object.fromEntries(Object.keys(CLUB_ART).map((k) => [k, prompt(k)])), null, 2));
} else if (cmd === 'missing') {
  const miss = Object.keys(CLUB_ART).filter((k) => !existsSync(join(OUT, `${k}.webp`)));
  console.log(miss.length ? miss.join(' ') : '없음', `\n${Object.keys(CLUB_ART).length - miss.length} / ${Object.keys(CLUB_ART).length}`);
} else if (cmd === 'fetch') {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  for (const a of args) {
    const i = a.indexOf('=');
    const key = a.slice(0, i), url = a.slice(i + 1);
    if (!CLUB_ART[key]) { console.log(`모르는 키 ${key}`); continue; }
    const res = await fetch(url);
    if (!res.ok) { console.log(`${key} 실패 HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(SRC, `${key}.png`), buf);
    await sharp(buf).resize(W, H, { fit: 'cover' }).webp({ quality: 82 }).toFile(join(OUT, `${key}.webp`));
    console.log(`${key} → public/ui/clubs/${key}.webp`);
  }
} else {
  console.log('쓰기: node scripts/club-emblem.mjs prompts | missing | fetch <키>=<url> ...');
}
