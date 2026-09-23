/*
 * 연도별 리그 평균을 낸다 — 능력치를 그 시즌 리그와 견줘 매기기 위한 기준값.
 *   node scripts/league-norms.mjs <자료폴더>
 * 결과는 <자료폴더>/league.json 에 { 연도: { avg, hr, sb, k9, bb9, era, ip } } 로 남는다.
 * 1980년대는 탈삼진이 적고 2020년대는 많다. 그대로 매기면 옛 투수가 손해를 보니
 * 이 표를 기준으로 '리그 대비 몇 배'를 따져 능력치를 낸다.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ipOf } from './stat-to-rating.mjs';

const dir = process.argv[2];
if (!dir) {
  console.error('쓰는 법: node scripts/league-norms.mjs <자료폴더>');
  process.exit(1);
}

/** 한 해 기록 → 그 해 리그 평균 */
function normsOf(text) {
  const bat = [], pit = [];
  let mode = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) { if (line.startsWith('#')) mode = null; continue; }
    let body = line;
    if (line.startsWith('B:')) { mode = 'bat'; body = line.slice(2); }
    else if (line.startsWith('P:')) { mode = 'pit'; body = line.slice(2); }
    const f = body.split('|');
    if (mode === 'bat') bat.push({ avg: Number(f[2]), pa: Number(f[3]), hr: Number(f[4]), sb: Number(f[6]) });
    else if (mode === 'pit') pit.push({ g: Number(f[2]), ip: ipOf(f[7]), so: Number(f[8]), bb: Number(f[9]), era: Number(f[1]) });
  }
  /* 주전급만 본다 — 몇 타석 나온 선수까지 넣으면 평균이 내려앉는다 */
  const reg = bat.filter((b) => b.pa >= 300);
  const arm = pit.filter((p) => p.ip >= 50);
  const sp = arm.filter((p) => p.ip / Math.max(1, p.g) >= 3.5);
  const mean = (a, f) => (a.length ? a.reduce((t, x) => t + f(x), 0) / a.length : 0);
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  return {
    avg: Number(mean(reg, (b) => b.avg).toFixed(4)),
    hr: Number(mean(reg, (b) => (b.hr * 550) / Math.max(300, b.pa)).toFixed(2)),   // 550타석 환산
    sb: Number(mean(reg, (b) => (b.sb * 550) / Math.max(300, b.pa)).toFixed(2)),
    k9: Number(((sum(arm, (p) => p.so) * 9) / sum(arm, (p) => p.ip)).toFixed(2)),
    bb9: Number(((sum(arm, (p) => p.bb) * 9) / sum(arm, (p) => p.ip)).toFixed(2)),
    era: Number(mean(arm, (p) => p.era).toFixed(2)),
    ip: Number(mean(sp, (p) => p.ip).toFixed(1)),                                  // 선발 한 명의 평균 이닝
  };
}

const out = {};
for (const f of readdirSync(dir).filter((x) => /^\d{4}\.txt$/.test(x))) {
  out[f.slice(0, 4)] = normsOf(readFileSync(join(dir, f), 'utf8'));
}
writeFileSync(join(dir, 'league.json'), `${JSON.stringify(out, null, 1)}\n`);
const years = Object.keys(out).sort();
console.log(`league.json — ${years.length}개 시즌`);
for (const y of years.filter((_, i) => i % 6 === 0)) {
  const n = out[y];
  console.log(`  ${y}  타율 ${n.avg}  홈런 ${n.hr}  도루 ${n.sb}  K/9 ${n.k9}  BB/9 ${n.bb9}  ERA ${n.era}  선발이닝 ${n.ip}`);
}
