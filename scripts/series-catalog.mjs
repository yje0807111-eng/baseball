// 사용법: node scripts/series-catalog.mjs  → src/data/SERIES_CATALOG.md (구단별·연도별 시리즈 목록, 자동 생성)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'data', 'series');
const series = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));

const FRANCHISE = [
  ['KIA', '해태·KIA 타이거즈'], ['SAMSUNG', '삼성 라이온즈'], ['LG', 'MBC·LG 트윈스'], ['DOOSAN', 'OB·두산 베어스'], ['SSG', 'SK·SSG 랜더스'],
  ['LOTTE', '롯데 자이언츠'], ['HANWHA', '빙그레·한화 이글스'], ['KIWOOM', '넥센·키움 히어로즈'], ['NC', 'NC 다이노스'], ['KT', 'KT 위즈'], ['HYUNDAI', '현대 유니콘스'],
];
const teams = series.filter((s) => s.kind === 'team').sort((a, b) => a.year - b.year);
const nationals = series.filter((s) => s.kind === 'national').sort((a, b) => a.year - b.year);
const legends = series.filter((s) => s.kind === 'legend');
const legendOf = (code) => legends.filter((s) => s.franchise === code).map((s) => s.id);

const out = [
  '# 시리즈 목록',
  '',
  '> 자동 생성 파일 — 직접 고치지 말 것. `node scripts/series-catalog.mjs`',
  '',
  `구단 시즌 ${teams.length} · 국가대표 ${nationals.length} · 레전드 ${legends.length} (+ 게임 코드 안 올타임 레전드 1묶음)`,
  '',
  '## 모드별',
  '',
  '| 모드 | 기준 | 시리즈 수 |',
  '|---|---|---|',
  `| 가을의 왕조 | \`champion: true\` | ${teams.filter((s) => s.champion).length} |`,
  `| 최근 시즌 | 구단 시즌 2021년 이후 | ${teams.filter((s) => s.year >= 2021).length} |`,
  `| 태극마크 | 국가대표 | ${nationals.length} |`,
  `| 올타임 레전드 | 레전드 + 올타임 1묶음 | ${legends.length + 1} |`,
  '',
  '## 구단별',
  '',
  '| 구단 | 구단 시즌 (★ 한국시리즈 우승) | 레전드 |',
  '|---|---|---|',
  ...FRANCHISE.map(([code, name]) => {
    const ys = teams.filter((s) => s.franchise === code).map((s) => `${s.year}${s.champion ? '★' : ''}`);
    return `| ${name} | ${ys.join(' · ') || '—'} | ${legendOf(code).join(' · ') || '—'} |`;
  }),
  ...(legends.some((s) => !s.franchise) ? [`| 구단 없음 | — | ${legends.filter((s) => !s.franchise).map((s) => s.id).join(' · ')} |`] : []),
  '',
  '## 연도별',
  '',
  '| 연도 | 구단 시즌 | 국가대표 |',
  '|---|---|---|',
  ...[...new Set([...teams, ...nationals].map((s) => s.year))].sort((a, b) => a - b).map((y) => {
    const t = teams.filter((s) => s.year === y).map((s) => `${s.title}${s.champion ? '★' : ''}`);
    const n = nationals.filter((s) => s.year === y).map((s) => s.title);
    return `| ${y} | ${t.join(' · ') || '—'} | ${n.join(' · ') || '—'} |`;
  }),
  '',
];
writeFileSync(join(root, 'src', 'data', 'SERIES_CATALOG.md'), out.join('\n'));
console.log(`SERIES_CATALOG.md: 구단 시즌 ${teams.length} · 국가대표 ${nationals.length} · 레전드 ${legends.length}`);
