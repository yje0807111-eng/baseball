// 유니폼 레퍼런스 내려받기: node scripts/fetch-uniform.mjs <#uniform-plan 순번>=<URL> [...] → art-src/uniforms/<key>.png
// 받은 레퍼런스의 job id 는 art-src/uniform-jobs.json 에 { key: jobId } 로 모은다 (카드 생성 때 Image 1 로 넣음)
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'art-src');
mkdirSync(join(dir, 'uniforms'), { recursive: true });
const plan = JSON.parse(readFileSync(join(dir, 'uniform-plan.json'), 'utf8'));
const jobsPath = join(dir, 'uniform-jobs.json');
const jobs = existsSync(jobsPath) ? JSON.parse(readFileSync(jobsPath, 'utf8')) : {};
const failed = [];
await Promise.all(process.argv.slice(2).map(async (arg) => {
  const i = arg.indexOf('=');
  const key = plan[Number(arg.slice(1, i))]?.key;
  const url = arg.slice(i + 1);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(join(dir, 'uniforms', `${key}.png`), Buffer.from(await res.arrayBuffer()));
    const id = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];
    if (id) jobs[key] = id;
  } catch (e) { failed.push(`${key} (${e.message})`); }
}));
writeFileSync(jobsPath, JSON.stringify(jobs, null, 1));
console.log(`저장 ${process.argv.length - 2 - failed.length}개${failed.length ? `, 실패: ${failed.join(', ')}` : ''}`);
