/* 상점 상품 그림(public/ui/shop/<상품 id>.webp) 생성 도구.
   그림체는 게임의 다른 아트와 같은 "야간 구장 시네마틱 실사" — 상품마다 장면이 다르고, 빛과 안개 색은 분류마다 통일한다.
   분류 색: 훈련 #7dd3fc · 부스트 #34d399 · 운영 #f87171 · 감독 #c4b5fd · 증강 #e879f9

   node scripts/shop-art.mjs prompts [id ...]          생성용 프롬프트를 JSON 으로 출력
   node scripts/shop-art.mjs fetch <id>=<이미지URL> [...]  내려받아 art-src/shop/<id>.png + public/ui/shop/<id>.webp (720×960)
   node scripts/shop-art.mjs missing                   아직 그림이 없는 상품 id */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'art-src', 'shop');
const OUT = join(root, 'public', 'ui', 'shop');
const W = 720, H = 960;

export const CAT_LIGHT = { training: 'Cold sky-blue (#7dd3fc)', boost: 'Emerald green (#34d399)', ops: 'Warm red (#f87171)', staff: 'Violet (#c4b5fd)', aug: 'Magenta (#e879f9)', draft: 'Warm gold (#fbbf24)' };
/** 상품 id → [분류, 장면] */
export const SHOP_ART = {
  'tr-contact': ['training', 'Extreme close-up of a wooden bat meeting the ball squarely in a dark indoor batting cage, chalk dust and sparks of impact'],
  'tr-power': ['training', 'A baseball player lifting a heavy barbell in a dark weight room, chalk dust, strained muscles, sweat'],
  'tr-speed': ['training', 'A base runner sprinting and sliding into a base at night, dirt spray flying, motion blur'],
  'tr-control': ['training', "Close-up of a baseball thudding into the exact center of a catcher's mitt, leather deforming, dust puff"],
  'tr-stuff': ['training', "Extreme close-up of a pitcher's fingers releasing a spinning baseball, seams blurred, energy trail"],
  'bo-stamina': ['boost', 'A cold energy drink can on a dugout bench beside a folded towel and a rosin bag, condensation beads glowing'],
  'bo-focus': ['boost', "Tight close-up of a batter's face under the helmet at the plate, eyes locked in fierce focus"],
  'bo-power': ['boost', 'A home-run swing at the moment of impact, bat flexing, ball compressing, shockwave of dust'],
  'op-cap40': ['ops', 'A club front-office desk at night: a glowing salary-cap gauge board, roster papers and a calculator'],
  'op-cap100': ['ops', 'A heavy club vault door swinging open in a dark stadium corridor, glowing gauge meters on the wall'],
  'st-manager': ['staff', "Close-up of a manager's hand signing a contract with a fountain pen, team cap beside the papers"],
  'st-coach': ['staff', 'A coach in a team jacket holding a clipboard and instructing players on a dark field at night'],
  'st-upgrade': ['staff', "Extreme close-up of a metal star pin being fastened onto a coach's team jacket"],
  'dr-reroll': ['draft', "A scout's spiral notebook open on a stadium seat with a radar gun and a stopwatch beside it, pages fluttering"],
  'dr-first': ['draft', 'A single glowing number-one ball at the head of a row of identical dark baseballs on a draft table'],
  'dr-protect': ['draft', 'A glowing dome of light shielding one baseball on a dark draft table while other hands stop at the barrier'],
  'dr-series': ['draft', 'A hand pulling one glowing team pennant card out of a fanned row of dark pennant cards on a club desk'],
  'dr-agent': ['draft', 'A club agent in a dark suit shaking hands across a night office desk, a contract and a team cap on the table'],
  'au-reroll': ['aug', 'Three glowing card-sized plates spinning and flipping over in mid-air above a dark dugout bench, motion trails circling them'],
  'au-pledge': ['aug', 'A hand pointing at one card-sized plate in a row of three, only that one blazing bright while the others stay dark'],
  'au-favor': ['aug', 'A card-sized plate rising above a scattered pile of dark plates, a single sharp star mark burning at its center'],
  'au-upgrade3': ['aug', 'Three identical glowing card-sized plates stacked in a fanned pile on a dark table, each with an upward arrow of light'],
  'au-remove': ['aug', 'A single glowing card-sized plate torn cleanly in half in mid-air, the two halves pulling apart along a jagged break line, shards flying outward'],
  'au-upgrade': ['aug', 'A single glowing card-sized plate levitating flat and low with a tall upward arrow of light rising from it, five chevrons igniting one above another along the arrow'],
};
const prompt = (id) => {
  const [cat, scene] = SHOP_ART[id];
  return `Cinematic night baseball photograph, vertical. ${scene}. ${CAT_LIGHT[cat]} rim light and a soft haze of the same color. Dark navy-black tones, no text, no logos, no watermark. Bottom third fades to near black for caption text.`;
};

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'prompts') {
  const ids = args.length ? args : Object.keys(SHOP_ART);
  console.log(JSON.stringify(Object.fromEntries(ids.map((id) => [id, prompt(id)])), null, 2));
} else if (cmd === 'missing') {
  console.log(Object.keys(SHOP_ART).filter((id) => !existsSync(join(OUT, `${id}.webp`))).join(' ') || '모두 있음');
} else if (cmd === 'fetch') {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  for (const a of args) {
    const i = a.indexOf('=');
    const id = a.slice(0, i), url = a.slice(i + 1);
    if (!SHOP_ART[id]) { console.log(`모르는 상품 ${id}`); continue; }
    const res = await fetch(url);
    if (!res.ok) { console.log(`${id} 실패 HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(SRC, `${id}.png`), buf);
    await sharp(buf).resize(W, H, { fit: 'cover' }).webp({ quality: 82 }).toFile(join(OUT, `${id}.webp`));
    console.log(`${id} → public/ui/shop/${id}.webp`);
  }
} else {
  console.log('쓰기: node scripts/shop-art.mjs prompts [id ...] | missing | fetch <id>=<url> ...');
}
