/*
 * 능력치 점검 — 시리즈 선수의 능력치를 '그 선수 카드에 적힌 기록 한 줄(source)'로 다시 매겨 견준다.
 *   node scripts/audit-ratings.mjs            요약
 *   node scripts/audit-ratings.mjs --list     크게 어긋난 선수
 *   node scripts/audit-ratings.mjs --fix      크게 어긋난 선수를 기록 값으로 (수비는 그대로)
 *
 * 왜 source 인가: 연도 기록 파일에서 이름으로 찾으면 동명이인(1995 김민호 · 2003 김태균 …)에 걸린다. 카드의 source 는 그 선수 자신의 기록이다.
 * 규격은 series-from-records.mjs 와 같다(stat-to-rating.mjs · 그해 리그 평균 · 자리 · 수비 평판).
 *
 * 무엇을 고치나 — 수치 몇 점 차이는 의도한 것이다(인지도 보정: 수비 평판 · 이름값). 그래서
 *   - 기록 한 줄이 KBO 기록실 것이고 필요한 칸이 다 있을 때만(투수 탈삼진 · 볼넷 · WHIP, 타자 타석 · 도루) — 기사 · 위키 한 줄은
 *     'K·BB 미확인' · 시즌 중간 기록이 섞여 기록 값이 오히려 틀린다. 타자는 250타석 이상 — 적은 타석을 시즌으로 늘려 잡으면 주루가 튄다.
 *   - 수비(defense)는 견주지 않는다 — 기록실에 수비 기록이 없던 시절의 평판 값이다.
 *   - 나머지 능력치 가운데 하나라도 FIX 점 이상 어긋나면(몇 이닝짜리 투수는 100 넘는 극단값만) 그 선수의 기록 값으로 바꾼다.
 *     실제로 걸리는 것: 같은 해 동명이인의 값이 옮겨 온 카드, 몇 이닝 볼넷 0개로 제구가 100을 넘은 카드.
 *   - 같은 카드가 여러 시리즈에 나오면(레전드 등) 모두 같이 고친다. 같은 카드인지는 이름 · 해 · 기록 한 줄이 모두 같은지로 본다.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { batRating, pitRating } from './stat-to-rating.mjs';

export const FIX = 22;   // 한 능력치가 이만큼 이상 어긋나면 (동명이인 값 · 잘못 옮긴 값)
export const TINY_IP = 20; // 이만큼도 안 던진 투수의 100 넘는 값은 표본이 만든 극단값
const DIR = join('src', 'data', 'series');
const league = JSON.parse(readFileSync(join('data', 'kbo', 'league.json'), 'utf8'));
const FIELD = (pos, pa) => (pa >= 450 ? (pos === 'C' || pos === 'SS' || pos === 'OF' ? 'good' : 'ok') : 'ok');

const num = (re, s) => { const m = s.match(re); return m ? Number(m[1]) : null; };
/** 타자 source: ".346/.452 28HR 87타점 23SB 530PA" · "126G .346 28HR 87RBI 23SB" 등 */
export function parseBat(src = '') {
  const avg = num(/(?:^|\s)(\.\d{3}|[01]\.\d{3})/, src);
  if (avg == null) return null;
  const hr = num(/(\d+)\s*HR/, src) ?? 0;
  const sb = num(/(\d+)\s*SB/, src) ?? 0;
  const pa = num(/(\d+)\s*PA/, src) ?? (num(/(\d+)\s*G\b/, src) != null ? Math.round(num(/(\d+)\s*G\b/, src) * 4.2) : 550);
  return { avg, hr, sb, pa };
}
/** 투수 source: "41G 99 1/3IP ERA2.54 95K 37BB WHIP1.08" · "178.2IP" 등 */
export function parsePit(src = '') {
  const era = num(/ERA\s*([\d.]+)/, src);
  const ipm = src.match(/(\d+(?:\.\d)?(?:\s+\d\/3)?)\s*IP/);
  if (era == null || !ipm) return null;
  return { era, ip: ipm[1], so: num(/(\d+)\s*K\b/, src) ?? 0, bb: num(/(\d+)\s*BB/, src) ?? 0, whip: num(/WHIP\s*([\d.]+)/, src) };
}

/** 카드의 기록 한 줄로 매긴 값 (못 읽으면 null) */
export function ratedFromSource(p) {
  const norms = league[p.year] || null;
  if (p.position === 'SP' || p.position === 'RP') {
    const r = parsePit(p.source);
    return r && pitRating({ ...r, whip: r.whip || null, role: p.position, norms });
  }
  const r = parseBat(p.source);
  return r && batRating({ ...r, pos: p.position, fielding: FIELD(p.position, r.pa), norms });
}

/**
 * 견줄 능력치 — 수비는 늘 빼고(평판), 기록으로 잴 수 없는 것도 뺀다:
 *   도루 0~3개 타자의 주루(도루가 없으면 기록 값이 55로 떨어진다 — 발 빠른 거포를 잴 수 없다),
 *   20경기가 안 되는 선발의 체력(시즌 중간 합류 · 9월 중순까지 기록이라 이닝이 적다).
 */
function comparable(p) {
  const src = p.source || '';
  if (p.position === 'SP' || p.position === 'RP') {
    const g = Number((src.match(/(\d+)\s*G\b/) || [])[1] || 0);
    return p.position === 'SP' && g < 20 ? ['stuff', 'control', 'stability'] : ['stuff', 'control', 'stamina', 'stability'];
  }
  const r = parseBat(src);
  return r && r.sb <= 3 ? ['contact', 'power'] : ['contact', 'power', 'speed'];
}
const ipNum = (src) => { const m = (src || '').match(/(\d+)(?:\.(\d))?(?:\s+(\d)\/3)?\s*IP/); return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 3 : 0) + (m[3] ? Number(m[3]) / 3 : 0) : 0; };

/** 기록 값으로 바로잡아도 되는 카드인가 */
export function trusted(p) {
  const src = p.source || '';
  if (!src.includes('KBO 기록실')) return false;
  if (p.position === 'SP' || p.position === 'RP') { const r = parsePit(src); return !!r && /\d+\s*K\b/.test(src) && /\d+\s*BB/.test(src) && r.whip != null; }
  const r = parseBat(src);
  return !!r && /\d+\s*PA/.test(src) && /\d+\s*SB/.test(src) && r.pa >= 250;
}

export function audit() {
  const rows = [];
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
    const s = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
    if (s.kind === 'national') continue;
    for (const p of s.players) {
      const want = ratedFromSource(p);
      if (!want) { rows.push({ series: s.id, kind: s.kind, p, want: null }); continue; }
      const keys = comparable(p).filter((k) => want[k] != null);
      const diff = Object.fromEntries(keys.map((k) => [k, (p.stats[k] ?? 0) - want[k]]));
      const worst = Math.max(...Object.values(diff).map(Math.abs));
      const pitcher = p.position === 'SP' || p.position === 'RP';
      const ip = pitcher ? ipNum(p.source) : 0;
      /* 고칠 카드: 믿을 기록이고 — 몇 이닝짜리 투수면 100 넘는 극단값이 있을 때, 아니면 한 능력치가 FIX 넘게 어긋날 때 */
      const tinyExtreme = pitcher && ip < TINY_IP && keys.some((k) => p.stats[k] >= 100 && want[k] < 90);
      const fixable = trusted(p) && (pitcher && ip < 40 ? tinyExtreme : worst >= FIX);
      rows.push({ series: s.id, kind: s.kind, p, want, diff, worst, ok: fixable });
    }
  }
  return rows;
}

if (process.argv[1] && process.argv[1].endsWith('audit-ratings.mjs')) {
  const rows = audit();
  const got = rows.filter((r) => r.want);
  const band = (lo, hi) => got.filter((r) => r.worst > lo && r.worst <= hi).length;
  console.log(`선수 칸 ${rows.length} · 기록으로 매김 ${got.length} · 기록 한 줄을 못 읽음 ${rows.length - got.length}`);
  console.log(`수비 뺀 최대 차이: 0~3 ${band(-1, 3)} · 4~8 ${band(3, 8)} · 9~${FIX} ${band(8, FIX)} · ${FIX + 1}+ ${got.filter((r) => r.worst > FIX).length}`);
  const big = got.filter((r) => r.ok).sort((a, b) => b.worst - a.worst);
  console.log(`바로잡을 대상(KBO 기록실 · 칸 다 있음 · ${FIX}점 이상 또는 ${TINY_IP}이닝 미만 극단값): ${big.length}`);
  if (process.argv.includes('--list')) {
    for (const r of big) console.log(`${r.series} ${r.p.name} ${r.p.position} ${r.worst} · 지금 ${JSON.stringify(r.p.stats)} · 기록 ${JSON.stringify(r.want)} · ${r.p.source}`);
  }
  if (process.argv.includes('--fix')) {
    /* 같은 카드인지는 이름 · 해 · 기록 한 줄이 모두 같은지로 — personId 는 동명이인끼리 같을 때가 있다(2003 김태균 한화 · 롯데) */
    const keyOf = (p) => `${p.name}|${p.year}|${p.source || ''}`;
    const fix = new Map();
    for (const r of big) fix.set(keyOf(r.p), r.want);
    let n = 0;
    for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
      const file = join(DIR, f);
      const s = JSON.parse(readFileSync(file, 'utf8'));
      if (s.kind === 'national') continue;
      let changed = false;
      for (const p of s.players) {
        const want = fix.get(keyOf(p));
        if (!want) continue;
        p.stats = { ...want, ...(p.stats.defense != null ? { defense: p.stats.defense } : {}) }; // 수비 평판은 그대로
        changed = true;
        n += 1;
      }
      if (changed) writeFileSync(file, `${JSON.stringify(s, null, 2)}\n`);
    }
    console.log(`바로잡은 선수 칸 ${n} (사람 · 해 ${fix.size})`);
  }
}
