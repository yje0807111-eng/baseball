// 생성 결과 내려받기: node scripts/fetch-art.mjs <선수id>=<이미지URL> [...]
// 선수id 대신 #<번호> 를 쓰면 art-src/plan.json 의 해당 순번 id를 쓴다 (한글 id를 셸로 넘기지 않기 위해).
// art-src/<선수id>.png 로 저장한다. (이후 node scripts/convert-art.mjs)
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'art-src');
mkdirSync(dir, { recursive: true });
const planPath = join(dir, 'plan.json');
const plan = existsSync(planPath) ? JSON.parse(readFileSync(planPath, 'utf8')) : [];

const failed = [];
await Promise.all(process.argv.slice(2).map(async (arg) => {
  const i = arg.indexOf('=');
  const key = arg.slice(0, i);
  const id = key.startsWith('#') ? plan[Number(key.slice(1))]?.id : key;
  const url = arg.slice(i + 1);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(join(dir, `${id}.png`), Buffer.from(await res.arrayBuffer()));
  } catch (e) {
    failed.push(`${id} (${e.message})`);
  }
}));
console.log(`저장 ${process.argv.length - 2 - failed.length}개${failed.length ? `, 실패: ${failed.join(', ')}` : ''}`);
