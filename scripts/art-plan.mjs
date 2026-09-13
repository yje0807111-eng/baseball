// 시리즈 선수 카드 그림 계획: 이미 있는 그림은 재사용, 없는 선수는 생성 프롬프트를 만든다.
// 사용법: node scripts/art-plan.mjs  → art-src/plan.json ([{ id, prompt }])
import { readdirSync, readFileSync, existsSync, copyFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seriesDir = join(root, 'src', 'data', 'series');
const cardsDir = join(root, 'public', 'cards');
mkdirSync(join(root, 'art-src'), { recursive: true });

const safeId = (s) => s.replace(/[^\p{L}\p{N}-]/gu, '');

// 게임 내장 레전드 카드 [id, 이름, 연도, 팀] — 같은 시즌·같은 팀(국가대표 포함)이면 그림 재사용
const LEGENDS = [
  ['ryu06', '류현진', 2006, '한화'], ['ryu08', '류현진', 2008, '대한민국'], ['kkh08', '김광현', 2008, 'SK'], ['kkh08n', '김광현', 2008, '대한민국'],
  ['yoon11', '윤석민', 2011, 'KIA'], ['yang17', '양현종', 2017, 'KIA'], ['nip16', '니퍼트', 2016, '두산'], ['lind19', '린드블럼', 2019, '두산'],
  ['alc20', '알칸타라', 2020, '두산'], ['ruc20', '루친스키', 2020, 'NC'], ['yhk16', '유희관', 2016, '두산'], ['jws08', '장원삼', 2008, '대한민국'],
  ['ssj08', '송승준', 2008, '대한민국'], ['sun93', '선동열', 1993, '해태'], ['oh06', '오승환', 2006, '삼성'], ['koo06', '구대성', 2006, '한화'],
  ['jdh08', '정대현', 2008, '대한민국'], ['jwr08', '정우람', 2008, 'SK'], ['yej20', '양의지', 2020, 'NC'], ['pkw00', '박경완', 2000, '현대'],
  ['jgy08', '진갑용', 2008, '대한민국'], ['ktg24', '김태군', 2024, 'KIA'], ['lsy03', '이승엽', 2003, '삼성'], ['lsy08', '이승엽', 2008, '대한민국'],
  ['thm15', '테임즈', 2015, 'NC'], ['pbh14', '박병호', 2014, '넥센'], ['ojl16', '오재일', 2016, '두산'], ['sgc14', '서건창', 2014, '넥센'],
  ['nav14', '나바로', 2014, '삼성'], ['jkw08', '정근우', 2008, '대한민국'], ['kym08', '고영민', 2008, '대한민국'], ['ksb24', '김선빈', 2024, 'KIA'],
  ['ldh10', '이대호', 2010, '롯데'], ['kdy24', '김도영', 2024, 'KIA'], ['kdj08', '김동주', 2008, '대한민국'], ['hkm16', '허경민', 2016, '두산'],
  ['ljb94', '이종범', 1994, '해태'], ['kjh14', '강정호', 2014, '넥센'], ['pjm08', '박진만', 2008, '대한민국'], ['pch24', '박찬호', 2024, 'KIA'],
  ['ljh22', '이정후', 2022, '키움'], ['roh20', '로하스', 2020, 'KT'], ['khs08', '김현수', 2008, '대한민국'], ['ljw08', '이종욱', 2008, '대한민국'],
  ['lyk08', '이용규', 2008, '대한민국'], ['phm23', '박해민', 2023, 'LG'], ['chw16', '최형우', 2016, '삼성'], ['woo98', '우즈', 1998, 'OB'],
  ['ldh08', '이대호', 2008, '대한민국'], ['hsh10', '홍성흔', 2010, '롯데'],
];

const KOREA = "white jersey with 'KOREA' in red outlined in navy on the chest, navy trim, navy cap with red 'K' logo";
const UNIFORM = {
  '1993-haitai': "early-1990s Haitai Tigers home uniform, white jersey with red and black trim, 'HAITAI' in red outlined in black on the chest, red cap with black brim and tiger logo",
  '2006-hanwha': "2006 Hanwha Eagles home uniform, white jersey with orange and black trim, 'Eagles' in orange outlined in black on the chest, orange cap with black brim",
  '2006-wbc': `2006 World Baseball Classic South Korea national team uniform, ${KOREA}`,
  '2008-beijing': `2008 Beijing Olympics South Korea national team uniform, ${KOREA}`,
  '2008-sk': "2008 SK Wyverns home uniform, white jersey with red trim and red 'SK' on the chest, red cap with white SK logo",
  '2009-kia': "2009 KIA Tigers home uniform, white jersey with red and black trim, 'TIGERS' in red outlined in black on the chest, black cap with red brim and 'T' logo",
  '2009-wbc': `2009 World Baseball Classic South Korea national team uniform, ${KOREA}`,
  '2010-lotte': "2010 Lotte Giants home uniform, white jersey with navy and red trim, 'Giants' script in navy outlined in red on the chest, navy cap",
  '2014-nexen': "2014 Nexen Heroes home uniform, white jersey with burgundy trim, 'HEROES' in burgundy on the chest, burgundy cap",
  '2014-samsung': "2014 Samsung Lions home uniform, white jersey with blue trim, 'SAMSUNG' in blue on the chest, blue cap with white 'S' logo",
  '2015-premier12': `2015 WBSC Premier12 South Korea national team uniform, ${KOREA}`,
  '2016-doosan': "2016 Doosan Bears home uniform, white jersey with navy trim, 'BEARS' in navy on the chest, navy cap with white 'D' logo",
  '2020-nc': "2020 NC Dinos home uniform, white jersey with navy and gold trim, 'DINOS' in navy outlined in gold on the chest, navy cap with 'D' logo",
  '2023-lg': "2023 LG Twins home uniform, white jersey with thin black pinstripes, 'TWINS' in black outlined in red on the chest, black cap with red and white 'LG' logo",
  '2024-kia': "2024 KIA Tigers home uniform, white jersey with red and black trim, 'TIGERS' in red outlined in black on the chest, black cap with red 'T' logo",
};
const NEON = {
  한화: 'bright orange', SK: 'crimson red', KIA: 'crimson red', 해태: 'crimson red', 롯데: 'light blue', 넥센: 'magenta pink',
  삼성: 'electric blue', 두산: 'violet blue', NC: 'sky blue', LG: 'hot pink', 대한민국: 'royal blue',
};
const EVENT = { '2006-wbc': '2006 World Baseball Classic', '2008-beijing': '2008 Beijing Olympics', '2009-wbc': '2009 World Baseball Classic', '2015-premier12': '2015 WBSC Premier12' };

const POSES = {
  SP: ['high leg-kick windup at the peak of the delivery', 'explosive follow-through lunging toward the plate', 'set position, glaring at the batter over the glove', 'roaring fist pump after a strikeout'],
  RP: ['max-effort fastball release, arm whipping through', 'calm cold stare holding the ball at chest before the pitch', 'shouting celebration after closing out the game'],
  C: ["standing in full catcher's gear with the mask flipped up, pointing to the infield", "popping up from the crouch to throw to second base, mask pushed up"],
  '1B': ['powerful home run swing follow-through, watching the ball fly', 'compact line-drive swing at contact'],
  '3B': ['strong swing at contact driving the ball', 'backhanding a hard grounder and rising to throw'],
  DH: ['towering home run swing follow-through', 'home run trot pointing to the sky'],
  '2B': ['turning a double play with a leaping throw', 'sharp line-drive swing at contact'],
  SS: ['fielding a grounder and making a strong throw to first', 'diving stop then springing up, head raised'],
  OF: ['leaping catch at the outfield wall, glove extended', 'sprinting around the bases at full speed', 'line-drive swing at contact'],
};
const POS_WORD = { SP: 'starting pitcher', RP: 'relief pitcher', C: 'catcher', '1B': 'first baseman', '2B': 'second baseman', '3B': 'third baseman', SS: 'shortstop', OF: 'outfielder', DH: 'designated hitter' };

let reused = 0;
const plan = [];
for (const file of readdirSync(seriesDir).filter((f) => f.endsWith('.json')).sort()) {
  const s = JSON.parse(readFileSync(join(seriesDir, file), 'utf8').replace(/^﻿/, ''));
  const national = s.kind === 'national';
  s.players.forEach((p, i) => {
    const id = `${s.id}_${safeId(p.personId)}`;
    const out = join(cardsDir, `${id}.webp`);
    if (existsSync(out)) return;
    const team = national ? '대한민국' : p.team;
    const legend = LEGENDS.find(([, name, year, t]) => name === p.name && year === p.year && t === team);
    if (legend && existsSync(join(cardsDir, `${legend[0]}.webp`))) {
      copyFileSync(join(cardsDir, `${legend[0]}.webp`), out);
      reused++;
      return;
    }
    const pitcher = p.position === 'SP' || p.position === 'RP';
    const hand = pitcher ? `${p.hand === 'L' ? 'left' : 'right'}-handed` : `bats ${p.hand === 'S' ? 'switch' : p.hand === 'L' ? 'left' : 'right'}-handed`;
    const origin = p.isForeign ? 'foreign (non-Korean)' : 'Korean';
    const who = national
      ? `${origin} ${POS_WORD[p.position]} ${p.name} (${hand}) of the South Korea national team at the ${EVENT[s.id]}`
      : `${origin} KBO ${POS_WORD[p.position]} ${p.name} (${hand}) of the ${p.year} ${s.title}`;
    const poses = POSES[p.position];
    const prompt = `Collectible sports trading card art, semi-realistic digital painting, crisp detail. ${who}. Uniform: ${UNIFORM[s.id]}; authentic to that season with real chest lettering and cap logo. Pose: ${poses[i % poses.length]}. Composition 2:3: player in the RIGHT half, face about 65% from the left edge and never in the left half; top-left quadrant empty dark bokeh; head in upper 40%; dark simple bottom 20%. Near-black navy stadium floodlight bokeh background, strong ${NEON[team] || 'emerald'} neon rim light, cinematic contrast. No border, no frame, no text except uniform lettering.`;
    plan.push({ id, prompt });
  });
}
writeFileSync(join(root, 'art-src', 'plan.json'), JSON.stringify(plan, null, 1));
console.log(`재사용 ${reused}장, 생성 필요 ${plan.length}장 → art-src/plan.json`);
