// src/data/series/*.json 을 모아 src/data/index.js 를 생성한다. (Vite·esbuild 공용 정적 import)
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const files = readdirSync(join(dataDir, 'series')).filter((f) => f.endsWith('.json')).sort();

const lines = [
  '// 자동 생성 파일 — 직접 수정하지 말 것. (node scripts/build-data-index.mjs)',
  ...files.map((f, i) => `import s${i} from './series/${f}';`),
  '',
  `export const SERIES = [${files.map((_, i) => `s${i}`).join(', ')}];`,
  '',
];
writeFileSync(join(dataDir, 'index.js'), lines.join('\n'));
console.log(`src/data/index.js: 시리즈 ${files.length}개`);
