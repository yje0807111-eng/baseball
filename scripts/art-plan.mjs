// 카드 그림 계획 (유니폼 레퍼런스 방식): 같은 팀·시즌 선수는 같은 유니폼 레퍼런스 그림을 입혀 옷을 통일한다.
// 사용법: node scripts/art-plan.mjs
//   → art-src/uniform-plan.json  [{ key, label, players, prompt }]  팀·시즌(국가대표는 대회)마다 유니폼 레퍼런스 1장
//   → art-src/plan.json          [{ id, uniform, prompt }]           카드가 없는 선수. 생성할 때 uniform 레퍼런스를 Image 1 로 넣는다
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seriesDir = join(root, 'src', 'data', 'series');
const cardsDir = join(root, 'public', 'cards');
mkdirSync(join(root, 'art-src'), { recursive: true });

const safeId = (s) => s.replace(/[^\p{L}\p{N}-]/gu, '');

// 팀 약칭 → 영문 구단명, 카드 네온 색
const TEAM = {
  KIA: ['KIA Tigers', 'crimson red'], 해태: ['Haitai Tigers', 'crimson red'], 삼성: ['Samsung Lions', 'electric blue'],
  LG: ['LG Twins', 'hot pink'], MBC: ['MBC Blue Dragons', 'electric blue'], 두산: ['Doosan Bears', 'violet blue'], OB: ['OB Bears', 'violet blue'],
  SK: ['SK Wyverns', 'crimson red'], SSG: ['SSG Landers', 'crimson red'], 롯데: ['Lotte Giants', 'light blue'],
  한화: ['Hanwha Eagles', 'bright orange'], 빙그레: ['Binggrae Eagles', 'bright orange'], 현대: ['Hyundai Unicorns', 'teal'],
  우리: ['Woori Heroes', 'magenta pink'], 히어로즈: ['Seoul Heroes', 'magenta pink'], 넥센: ['Nexen Heroes', 'magenta pink'], 키움: ['Kiwoom Heroes', 'magenta pink'],
  NC: ['NC Dinos', 'sky blue'], KT: ['KT Wiz', 'scarlet red'],
};
const EVENT = {
  '1998-bangkok': '1998 Bangkok Asian Games', '2000-sydney': '2000 Sydney Olympics', '2002-busan': '2002 Busan Asian Games',
  '2006-wbc': '2006 World Baseball Classic', '2008-beijing': '2008 Beijing Olympics', '2009-wbc': '2009 World Baseball Classic',
  '2010-guangzhou': '2010 Guangzhou Asian Games', '2014-incheon': '2014 Incheon Asian Games', '2015-premier12': '2015 WBSC Premier12',
  '2018-jakarta': '2018 Jakarta-Palembang Asian Games', '2019-premier12': '2019 WBSC Premier12', '2023-hangzhou': '2022 Hangzhou Asian Games (held in 2023)',
};

const POSES = {
  SP: ['high leg-kick windup at the peak of the delivery', 'explosive follow-through lunging toward the plate', 'set position, glaring at the batter over the glove', 'roaring fist pump after a strikeout'],
  RP: ['max-effort fastball release, arm whipping through', 'calm cold stare holding the ball at chest before the pitch', 'shouting celebration after closing out the game'],
  C: ["standing in full catcher's gear with the mask flipped up, pointing to the infield", 'popping up from the crouch to throw to second base, mask pushed up'],
  '1B': ['powerful home run swing follow-through, watching the ball fly', 'compact line-drive swing at contact'],
  '3B': ['strong swing at contact driving the ball', 'backhanding a hard grounder and rising to throw'],
  DH: ['towering home run swing follow-through', 'home run trot pointing to the sky'],
  '2B': ['turning a double play with a leaping throw', 'sharp line-drive swing at contact'],
  SS: ['fielding a grounder and making a strong throw to first', 'diving stop then springing up, head raised'],
  OF: ['leaping catch at the outfield wall, glove extended', 'sprinting around the bases at full speed', 'line-drive swing at contact'],
};
const POS_WORD = { SP: 'starting pitcher', RP: 'relief pitcher', C: 'catcher', '1B': 'first baseman', '2B': 'second baseman', '3B': 'third baseman', SS: 'shortstop', OF: 'outfielder', DH: 'designated hitter' };

const uniforms = new Map();
const plan = [];
const unknown = new Set();
for (const file of readdirSync(seriesDir).filter((f) => f.endsWith('.json')).sort()) {
  const s = JSON.parse(readFileSync(join(seriesDir, file), 'utf8').replace(/^﻿/, ''));
  const national = s.kind === 'national';
  s.players.forEach((p, i) => {
    const id = `${s.id}_${safeId(p.personId)}`;
    if (existsSync(join(cardsDir, `${id}.webp`))) return;
    if (!national && !TEAM[p.team]) { unknown.add(p.team); return; }
    const key = national ? s.id : `${safeId(p.team)}-${p.year}`;
    const label = national ? `South Korea national team at the ${EVENT[s.id] || s.title}` : `${p.year} ${TEAM[p.team][0]}`;
    if (!uniforms.has(key)) {
      const what = national
        ? `the South Korea national baseball team uniform worn at the ${EVENT[s.id] || s.title}`
        : `the ${label} home uniform exactly as worn in the ${p.year} KBO season`;
      uniforms.set(key, {
        key, label, players: 0,
        prompt: `Uniform reference sheet, semi-realistic digital painting in collectible trading card style: ${what}. Show the home jersey front view, the jersey back view without name or number, and the baseball cap from the front and from the side, neatly arranged with no mannequin and no person. Accurate team colors, chest lettering, trim and piping, sleeve patch and cap logo for that season. Flat deep navy (#0b1220) background, even soft light. No faces, no other text.`,
      });
    }
    uniforms.get(key).players++;
    const pitcher = p.position === 'SP' || p.position === 'RP';
    const hand = pitcher ? `${p.hand === 'L' ? 'left' : 'right'}-handed` : `bats ${p.hand === 'S' ? 'switch' : p.hand === 'L' ? 'left' : 'right'}-handed`;
    const origin = p.isForeign ? 'foreign (non-Korean)' : 'Korean';
    const neon = national ? 'royal blue' : TEAM[p.team][1];
    const poses = POSES[p.position];
    plan.push({
      id, uniform: key,
      prompt: `Collectible sports trading card art, semi-realistic digital painting, crisp detail. ${origin} ${POS_WORD[p.position]} ${p.name} (${hand}), ${label}. Uniform and cap: exactly the uniform and cap shown in Image 1 — same colors, chest lettering, trim and cap logo; no name or number on the back. Pose: ${poses[i % poses.length]}. Composition 2:3: player in the RIGHT half, face about 65% from the left edge and never in the left half; top-left quadrant empty dark bokeh; head in upper 40%; dark simple bottom 20%. Near-black navy stadium floodlight bokeh background, strong ${neon} neon rim light, cinematic contrast. No border, no frame, no text except uniform lettering.`,
    });
  });
}
if (unknown.size) console.log(`영문 구단명이 없는 팀 약칭 (TEAM 에 추가 필요): ${[...unknown].join(', ')}`);
// 순번(#번호)으로 내려받으므로, 시리즈가 추가돼도 기존 항목 순서는 유지하고 새 항목만 뒤에 붙인다
const stable = (file, list, keyOf) => {
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).map(keyOf) : [];
  const rank = (x) => { const i = prev.indexOf(keyOf(x)); return i < 0 ? Infinity : i; };
  return list.map((x, i) => [x, i]).sort(([a, i], [b, j]) => rank(a) - rank(b) || i - j).map(([x]) => x);
};
const uniformFile = join(root, 'art-src', 'uniform-plan.json');
const planFile = join(root, 'art-src', 'plan.json');
writeFileSync(uniformFile, JSON.stringify(stable(uniformFile, [...uniforms.values()], (u) => u.key), null, 1));
writeFileSync(planFile, JSON.stringify(stable(planFile, plan, (p) => p.id), null, 1));
console.log(`유니폼 레퍼런스 ${uniforms.size}장, 카드 생성 필요 ${plan.length}장 → art-src/uniform-plan.json, art-src/plan.json`);
