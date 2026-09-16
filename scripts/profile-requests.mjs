// 프로필(정면 상반신) 생성 요청 묶음 출력: 카드 그림을 Image 1 로 넣어 얼굴·유니폼을 카드와 같게 한다.
// 사용법: node scripts/profile-requests.mjs <시작> <끝>      art-src/plan.json 순번. 이미 art-src/profiles/<id>.png 가 있으면 건너뛴다.
//        node scripts/profile-requests.mjs fetch "#<번호>=<URL>" ...   결과를 art-src/profiles/<id>.png 로 저장
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'art-src');
const profDir = join(dir, 'profiles');
mkdirSync(profDir, { recursive: true });
const plan = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8'));

if (process.argv[2] === 'fetch') {
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
  const [from, to] = [Number(process.argv[2]), Number(process.argv[3])];
  const jobs = JSON.parse(readFileSync(join(dir, 'card-jobs.json'), 'utf8'));
  // 재사용 복사한 카드는 job id 가 없을 수 있다 → 같은 그림(해시)의 job id 를 쓴다
  const md5 = (id) => existsSync(join(dir, `${id}.png`)) && createHash('md5').update(readFileSync(join(dir, `${id}.png`))).digest('hex');
  let byHash;
  const jobOf = (id) => {
    if (jobs[id]) return jobs[id];
    byHash ??= new Map(Object.keys(jobs).map((k) => [md5(k), jobs[k]]));
    return byHash.get(md5(id));
  };
  // 같은 카드 그림(재사용 복사)은 프로필도 한 번만 만든다: 먼저 나온 순번의 프로필이 있으면 복사, 없으면 건너뜀
  const firstByHash = new Map();
  for (const { id } of plan) { const h = md5(id); if (h && !firstByHash.has(h)) firstByHash.set(h, id); }
  const base = { model: 'gpt_image_2_5', variant: 'sunburst', quality: 'medium', resolution: '1k', aspect_ratio: '3:4' };
  const out = [];
  const missing = [];
  let copied = 0;
  for (let i = from; i <= to && i < plan.length; i++) {
    const { id, prompt } = plan[i];
    if (existsSync(join(profDir, `${id}.png`))) continue;
    const first = firstByHash.get(md5(id));
    if (first && first !== id) {
      const srcPng = join(profDir, `${first}.png`);
      if (existsSync(srcPng)) { writeFileSync(join(profDir, `${id}.png`), readFileSync(srcPng)); copied++; }
      continue;
    }
    const job = jobOf(id);
    if (!job) { missing.push(id); continue; }
    const who = prompt.match(/crisp detail\. (.*?)\. Uniform/)[1];
    const neon = prompt.match(/strong ([a-z ]+) neon/)[1];
    out.push({ index: i, params: { ...base, medias: [{ value: job, role: 'image_references' }],
      prompt: `Profile portrait for a baseball card game roster screen, semi-realistic digital painting in the same art style as Image 1. Subject: the same player as Image 1, ${who}: keep the face and features identical to Image 1, and the uniform and cap identical to Image 1. Pose: static, facing the camera straight on, calm confident expression, mouth closed. Tight head-and-shoulders framing, 3:4 vertical: the head is large, top of the cap about 5% below the top edge, chin at about 58% of the height, face horizontally centered, only the top of the shoulders and collar visible at the bottom. Background: flat deep navy (#0b1220) with a soft subtle ${neon} glow behind the head; no stadium, no props, no text except uniform lettering.` } });
  }
  if (copied) console.error(`같은 카드 프로필 복사 ${copied}장`);
  if (missing.length) console.error(`카드 job id 없음: ${missing.join(', ')}`);
  console.log(JSON.stringify(out));
}
