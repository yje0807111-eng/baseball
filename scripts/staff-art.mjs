// 감독·코치 프로필 그림: 선수 프로필과 같은 정면 상반신. 대표 구단 유니폼 레퍼런스(있으면)를 Image 1 로 넣는다.
// 사용법: node scripts/staff-art.mjs plan                   → art-src/staff-plan.json
//        node scripts/staff-art.mjs req <시작> <끝>          → generate_image_batch 요청 JSON (이미 받은 그림은 건너뜀)
//        node scripts/staff-art.mjs fetch "#<번호>=<URL>" ... → art-src/profiles/<id>.png (이후 node scripts/convert-art.mjs)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const art = join(root, 'art-src');
const profDir = join(art, 'profiles');
mkdirSync(profDir, { recursive: true });
const planFile = join(art, 'staff-plan.json');

// 대표 구단·시즌 (가장 성과가 컸던 시기)
const HOME = {
  'mg-kimeungyong': ['해태', 1993], 'mg-kimsunggeun': ['SK', 2008], 'mg-kimjaepark': ['현대', 2003], 'mg-ryujungil': ['삼성', 2013],
  'mg-kimtaehyung': ['두산', 2016], 'mg-kimyoungdeok': ['OB', 1982], 'mg-kangbyungchul': ['롯데', 1992], 'mg-baekincheon': ['LG', 1990],
  'mg-leekwanghwan': ['LG', 1994], 'mg-kiminsik': ['두산', 2001], 'mg-leeheesoo': ['한화', 1999], 'mg-sundongyol': ['삼성', 2005],
  'mg-jobeomhyeon': ['KIA', 2009], 'mg-kimgitae': ['KIA', 2017], 'mg-treyhillman': ['SK', 2018], 'mg-leedongwook': ['NC', 2020],
  'mg-leegangchul': ['KT', 2021], 'mg-yeomgyeongyeop': ['LG', 2023], 'mg-leebeomho': ['KIA', 2024], 'mg-kimkyungmoon': ['두산', 2008],
  'hc-kimwonhyung': ['두산', 2019], 'hc-sonhyeokdae': ['SK', 2018], 'hc-jeongkyungbae': ['SK', 2018], 'hc-jogyehyun': ['KIA', 2017],
  'hc-kangseokcheon': ['두산', 2019], 'hc-jingapyong': ['KIA', 2024], 'hc-kimminjae': ['SSG', 2022], 'hc-hwangbyungil': ['KIA', 2009],
  'bc-kimyongdal': ['현대', 2004], 'bc-leesungyeol': ['LG', 2002], 'bc-parkheungsik': ['삼성', 2005], 'bc-kimmugwan': ['롯데', 2010],
  'bc-parkchulwoo': ['두산', 2016], 'bc-jangjonghun': ['한화', 2008], 'bc-kimkwanglim': ['두산', 2007], 'bc-leebyungkyu': ['LG', 2019],
  'pc-yangsanghun': ['롯데', 1999], 'pc-jeongminchul': ['한화', 2012], 'pc-ochiaieiji': ['삼성', 2011], 'pc-jeongmyungwon': ['현대', 2004],
  'pc-kwonmyungchul': ['두산', 2015], 'pc-parkjinman': ['삼성', 2018], 'pc-kimminho': ['KIA', 2017], 'pc-fukuharamineo': ['SK', 2008],
};
const ORIGIN = { 'mg-treyhillman': 'American', 'pc-ochiaieiji': 'Japanese', 'pc-fukuharamineo': 'Japanese' };
const FIELD_COACH = new Set(['pc-parkjinman', 'pc-kimminho', 'pc-fukuharamineo']);
const TEAM = {
  KIA: ['KIA Tigers', 'crimson red'], 해태: ['Haitai Tigers', 'crimson red'], 삼성: ['Samsung Lions', 'electric blue'],
  LG: ['LG Twins', 'hot pink'], 두산: ['Doosan Bears', 'violet blue'], OB: ['OB Bears', 'violet blue'],
  SK: ['SK Wyverns', 'crimson red'], SSG: ['SSG Landers', 'crimson red'], 롯데: ['Lotte Giants', 'light blue'],
  한화: ['Hanwha Eagles', 'bright orange'], 현대: ['Hyundai Unicorns', 'teal'], NC: ['NC Dinos', 'sky blue'], KT: ['KT Wiz', 'scarlet red'],
};
const ROLE = { manager: 'manager', head: 'head coach', batting: 'hitting coach', pitching: 'pitching coach' };

const mode = process.argv[2];
if (mode === 'plan') {
  const staff = [...JSON.parse(readFileSync(join(root, 'src/data/staff/managers.json'), 'utf8')), ...JSON.parse(readFileSync(join(root, 'src/data/staff/coaches.json'), 'utf8'))];
  const uniJobs = JSON.parse(readFileSync(join(art, 'uniform-jobs.json'), 'utf8'));
  const plan = staff.map((s) => {
    const [team, year] = HOME[s.id] || (() => { throw new Error(`대표 구단 없음: ${s.id}`); })();
    // 그 구단의 유니폼 레퍼런스 중 대표 시즌과 가장 가까운 것
    const refKey = Object.keys(uniJobs).filter((k) => k.startsWith(`${team}-`)).sort((a, b) => Math.abs(+a.split('-')[1] - year) - Math.abs(+b.split('-')[1] - year))[0];
    const role = FIELD_COACH.has(s.id) ? 'fielding coach' : ROLE[s.role];
    const age = s.role === 'manager' ? 'in his fifties' : 'in his late forties';
    const [teamName, neon] = TEAM[team];
    const wear = refKey
      ? 'wearing the team uniform jersey and cap exactly as shown in Image 1 (coaching staff wear the same uniform as players): same colors, chest lettering, trim and cap logo'
      : `wearing the ${year} ${teamName} home uniform jersey and cap (coaching staff wear the same uniform as players)`;
    return {
      id: s.id, name: s.name, ref: refKey ? uniJobs[refKey] : null, refKey: refKey || null,
      prompt: `Profile portrait for a baseball card game roster screen, semi-realistic digital painting, crisp detail. Subject: ${ORIGIN[s.id] || 'Korean'} professional baseball ${role} ${s.name}, a man ${age}, ${year} ${teamName} coaching staff, ${wear}. Pose: static, facing the camera straight on, calm confident authoritative expression, mouth closed. Tight head-and-shoulders framing, 3:4 vertical: the head is large, top of the cap about 5% below the top edge, chin at about 58% of the height, face horizontally centered, only the top of the shoulders and collar visible at the bottom. Background: flat deep navy (#0b1220) with a soft subtle ${neon} glow behind the head; no stadium, no props, no text except uniform lettering.`,
    };
  });
  writeFileSync(planFile, JSON.stringify(plan, null, 1));
  console.log(`감독·코치 ${plan.length}명, 유니폼 레퍼런스 사용 ${plan.filter((p) => p.ref).length}명 → art-src/staff-plan.json`);
} else if (mode === 'req') {
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  const [from, to] = [Number(process.argv[3]), Number(process.argv[4])];
  const base = { model: 'gpt_image_2_5', variant: 'sunburst', quality: 'medium', resolution: '1k', aspect_ratio: '3:4' };
  const out = [];
  for (let i = from; i <= to && i < plan.length; i++) {
    if (existsSync(join(profDir, `${plan[i].id}.png`))) continue;
    out.push({ index: i, params: { ...base, ...(plan[i].ref ? { medias: [{ value: plan[i].ref, role: 'image_references' }] } : {}), prompt: plan[i].prompt } });
  }
  console.log(JSON.stringify(out));
} else if (mode === 'fetch') {
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  const failed = [];
  const args = process.argv.slice(3);
  await Promise.all(args.map(async (arg) => {
    const i = arg.indexOf('=');
    const id = plan[Number(arg.slice(1, i))]?.id;
    try {
      const res = await fetch(arg.slice(i + 1));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(join(profDir, `${id}.png`), Buffer.from(await res.arrayBuffer()));
    } catch (e) { failed.push(`${id} (${e.message})`); }
  }));
  console.log(`저장 ${args.length - failed.length}개${failed.length ? `, 실패: ${failed.join(', ')}` : ''}`);
} else {
  console.log('사용법: plan | req <시작> <끝> | fetch "#<번호>=<URL>" ...');
}
