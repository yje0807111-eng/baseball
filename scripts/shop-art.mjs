/* 상점 분류 사진(public/ui/shop/<cat>.webp) 생성 도구.
   그림체는 게임의 다른 아트와 같은 "야간 구장 시네마틱 실사" — 분류 색 안개가 깔리고 아래 3분의 1은 글자가 올라가도록 어둡다.

   node scripts/shop-art.mjs prompts                      분류별 생성 프롬프트 출력
   node scripts/shop-art.mjs fetch <cat>=<이미지URL> [...]  내려받아 art-src/shop/<cat>.png + public/ui/shop/<cat>.webp (720×960) */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'art-src', 'shop');
const OUT = join(root, 'public', 'ui', 'shop');
const W = 720, H = 960;

export const SHOP_ART = {
  training: ['#7dd3fc', '빈 실내 타격 훈련장에서 혼자 스윙하는 타자 — 배트에 잔상, 공기 중의 분필 가루'],
  boost: ['#34d399', '더그아웃에서 차가운 에너지 드링크 캔을 쥔 장갑 낀 손 — 물방울, 손목 테이프'],
  ops: ['#f87171', '밤 구장이 보이는 프런트 사무실 책상 — 로스터 표와 샐러리 캡 숫자판'],
  staff: ['#c4b5fd', '더그아웃 난간에 팔짱 끼고 선 감독 — 난간 위 라인업 카드와 펜'],
  aug: ['#e879f9', '빈 야간 구장 마운드 위를 도는 자홍빛 에너지 구체와 빛 줄기'],
};
const prompt = (k) => {
  const [c, scene] = SHOP_ART[k];
  return `Cinematic night baseball photograph, vertical composition. ${scene}. ${c} rim light and a soft haze of the same color in the background. Dark navy-black tones, no text, no logos, no watermark. The bottom third of the frame fades to near black so caption text can sit over it.`;
};

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'prompts') {
  console.log(JSON.stringify(Object.fromEntries(Object.keys(SHOP_ART).map((k) => [k, prompt(k)])), null, 2));
} else if (cmd === 'fetch') {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  for (const a of args) {
    const i = a.indexOf('=');
    const cat = a.slice(0, i), url = a.slice(i + 1);
    if (!SHOP_ART[cat]) { console.log(`모르는 분류 ${cat}`); continue; }
    const res = await fetch(url);
    if (!res.ok) { console.log(`${cat} 실패 HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(SRC, `${cat}.png`), buf);
    await sharp(buf).resize(W, H, { fit: 'cover' }).webp({ quality: 82 }).toFile(join(OUT, `${cat}.webp`));
    console.log(`${cat} → public/ui/shop/${cat}.webp`);
  }
} else {
  console.log('쓰기: node scripts/shop-art.mjs prompts | fetch <cat>=<url> ...');
}
