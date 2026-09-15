// 이미지 생성 요청 묶음 출력 (힉스필드 generate_image_batch 에 그대로 넣을 JSON)
// 사용법: node scripts/art-requests.mjs cards <시작> <끝>    카드: art-src/plan.json 순번, 유니폼 레퍼런스를 Image 1 로
//        node scripts/art-requests.mjs uniforms <시작> <끝> 유니폼 레퍼런스: art-src/uniform-plan.json 순번
// 이미 그림이 받아진 항목(art-src/<id>.png, art-src/uniforms/<key>.png)은 건너뛴다.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'art-src');
const [kind, from, to] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
const base = { model: 'gpt_image_2_5', variant: 'sunburst', quality: 'medium', resolution: '1k' };
const out = [];
if (kind === 'uniforms') {
  const plan = JSON.parse(readFileSync(join(dir, 'uniform-plan.json'), 'utf8'));
  for (let i = from; i <= to && i < plan.length; i++) {
    if (existsSync(join(dir, 'uniforms', `${plan[i].key}.png`))) continue;
    out.push({ index: i, params: { ...base, aspect_ratio: '3:2', prompt: plan[i].prompt } });
  }
} else {
  const plan = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8'));
  const jobs = JSON.parse(readFileSync(join(dir, 'uniform-jobs.json'), 'utf8'));
  const missing = new Set();
  for (let i = from; i <= to && i < plan.length; i++) {
    if (existsSync(join(dir, `${plan[i].id}.png`))) continue;
    const ref = jobs[plan[i].uniform];
    if (!ref) { missing.add(plan[i].uniform); continue; }
    out.push({ index: i, params: { ...base, aspect_ratio: '2:3', medias: [{ value: ref, role: 'image_references' }], prompt: plan[i].prompt } });
  }
  if (missing.size) console.error(`유니폼 레퍼런스 없음: ${[...missing].join(', ')}`);
}
console.log(JSON.stringify(out));
