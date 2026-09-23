/*
 * KBO 기록실에서 받아 둔 시즌 기록(팀별 타자 · 투수 한 줄씩)으로 시리즈 JSON 초안을 만든다.
 *   node scripts/series-from-records.mjs <기록폴더> [연도...]
 * 기록 형식(한 팀):
 *   #팀코드
 *   B:이름|포지션(한글)|타율|타석|홈런|타점|도루|출루율
 *   P:이름|ERA|G|승|패|세이브|홀드|이닝|탈삼진|볼넷|WHIP
 * 능력치는 scripts/stat-to-rating.mjs (규격의 구간표) 가 매긴다. 좌우(hand)는 여기서 정하지 않고
 * hands.json(이름 → L|R|S) 이 있으면 가져다 쓴다 — 없으면 R 로 두고 notes 에 남긴다.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { batRating, pitRating, ipOf } from './stat-to-rating.mjs';

const TEAM = {
  OB: { ko: '두산', title: '두산 베어스', fr: 'DOOSAN' },
  HT: { ko: 'KIA', title: 'KIA 타이거즈', fr: 'KIA' },
  WO: { ko: '키움', title: '키움 히어로즈', fr: 'KIWOOM' },
  KT: { ko: 'KT', title: 'KT 위즈', fr: 'KT' },
  LT: { ko: '롯데', title: '롯데 자이언츠', fr: 'LOTTE' },
  NC: { ko: 'NC', title: 'NC 다이노스', fr: 'NC' },
  SS: { ko: '삼성', title: '삼성 라이온즈', fr: 'SAMSUNG' },
  HH: { ko: '한화', title: '한화 이글스', fr: 'HANWHA' },
  SK: { ko: 'SSG', title: 'SSG 랜더스', fr: 'SSG' },
  LG: { ko: 'LG', title: 'LG 트윈스', fr: 'LG' },
  HD: { ko: '현대', title: '현대 유니콘스', fr: 'HYUNDAI' },
};
/* 그해 당시 이름 — 규격은 그 시즌에 쓰던 구단명을 쓰라고 한다 */
const THEN = {
  WO: [[2019, { ko: '키움', title: '키움 히어로즈' }], [2010, { ko: '넥센', title: '넥센 히어로즈' }], [2008, { ko: '히어로즈', title: '히어로즈' }]],
  SK: [[2021, { ko: 'SSG', title: 'SSG 랜더스' }], [2000, { ko: 'SK', title: 'SK 와이번스' }]],
};
/** 그 해의 구단 이름 · 프랜차이즈 */
export function teamOf(code, year) {
  const base = TEAM[code];
  const rules = THEN[code];
  if (!rules) return base;
  for (const [from, name] of rules) if (year >= from) return { ...base, ...name };
  return base;
}
const SLUG = { OB: 'doosan', HT: 'kia', WO: 'kiwoom', KT: 'kt', LT: 'lotte', NC: 'nc', SS: 'samsung', HH: 'hanwha', SK: 'ssg', LG: 'lg', HD: 'hyundai' };
/** 파일 이름 — 구단명이 바뀌기 전 시즌은 그때 이름으로 (2017-sk · 2014-nexen) */
export const slugOf = (code, year) => (code === 'SK' && year < 2021 ? 'sk' : code === 'WO' ? (year < 2010 ? 'heroes' : year < 2019 ? 'nexen' : 'kiwoom') : SLUG[code]);
const POS = { 포수: 'C', '1루수': '1B', '2루수': '2B', '3루수': '3B', 유격수: 'SS', 좌익수: 'OF', 중견수: 'OF', 우익수: 'OF', 지명타자: 'DH', '?': 'DH' };
/** 자리별 수비 평판 — 그 자리 주전이면 기본, 출장이 적으면 낮춘다 */
const FIELD = (pos, pa) => (pa >= 450 ? (pos === 'C' || pos === 'SS' || pos === 'OF' ? 'good' : 'ok') : 'ok');

const num = (v) => (v === '-' || v === '' || v == null ? 0 : Number(v));

/** 한 연도 파일 → { 팀코드: { bat:[], pit:[] } } */
export function parseRecords(text) {
  const out = {};
  let team = null, mode = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) { team = line.slice(1); out[team] = { bat: [], pit: [] }; mode = null; continue; }
    let body = line;
    if (line.startsWith('B:')) { mode = 'bat'; body = line.slice(2); }
    else if (line.startsWith('P:')) { mode = 'pit'; body = line.slice(2); }
    const f = body.split('|');
    if (mode === 'bat') out[team].bat.push({ name: f[0], pos: POS[f[1]] || 'DH', avg: num(f[2]), pa: num(f[3]), hr: num(f[4]), rbi: num(f[5]), sb: num(f[6]), obp: num(f[7]) });
    else if (mode === 'pit') out[team].pit.push({ name: f[0], era: num(f[1]), g: num(f[2]), w: num(f[3]), l: num(f[4]), sv: num(f[5]), hld: num(f[6]), ip: f[7], so: num(f[8]), bb: num(f[9]), whip: num(f[10]) });
  }
  return out;
}

/** 선발인가 — 등판당 이닝이 길면 선발로 본다 */
const isStarter = (p) => ipOf(p.ip) / Math.max(1, p.g) >= 3.5;

/** 18명 고르기: 선발 4 · 불펜 4 · 포수 2 · 내야 각 1 · 외야 3 · 남는 한 자리는 타석 많은 순 */
export function pick18(team, fix = {}) {
  const sp = team.pit.filter(isStarter).sort((a, b) => ipOf(b.ip) - ipOf(a.ip));
  const rp = team.pit.filter((p) => !isStarter(p)).sort((a, b) => (b.sv + b.hld) * 3 + ipOf(b.ip) - ((a.sv + a.hld) * 3 + ipOf(a.ip)));
  const take = (list, n) => list.slice(0, n);
  const pit = [...take(sp, 4), ...take(rp, 4)];
  const posOf = (x) => fix[x.name] || x.pos;
  const byPos = (p) => team.bat.filter((x) => posOf(x) === p).sort((a, b) => b.pa - a.pa);
  const bat = [];
  const push = (list, n) => list.slice(0, n).forEach((x) => { if (!bat.includes(x)) bat.push(x); });
  push(byPos('C'), 2); push(byPos('1B'), 1); push(byPos('2B'), 1); push(byPos('3B'), 1); push(byPos('SS'), 1); push(byPos('OF'), 3);
  for (const x of [...team.bat].sort((a, b) => b.pa - a.pa)) { if (bat.length >= 18 - pit.length) break; if (!bat.includes(x)) bat.push(x); }
  return { pit, bat };
}

/** 이미 쓰인 값 — src/data/series 의 모든 시리즈에서 (personId|year) → 선수 */
export function knownPlayers(dir = join('src', 'data', 'series'), skip = new Set()) {
  const map = new Map();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    if (skip.has(f.replace('.json', ''))) continue;
    const s = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const p of s.players) {
      const key = `${p.personId}|${p.year}`;
      if (!map.has(key)) map.set(key, p);
    }
  }
  return map;
}

const numText = (v) => String(v).replace(/^0/, '');

export function buildSeries({ year, code, records, hands = {}, foreign = new Set(), meta = {}, dupes = {}, posFix = {}, known = new Map() }) {
  const t = teamOf(code, year);
  const { pit, bat } = pick18(records, posFix[`${year}-${code}`] || {});
  const players = [];
  /* 동명이인은 구분자를 붙인다 — dupes: { 이름: { 팀코드|역할: 'personId' } } */
  const idOf = (name, role) => {
    const d = dupes[name];
    if (!d) return name;
    return d[`${year}-${code}`] || d[code] || d[role] || name;
  };
  /* 이미 다른 시리즈에 있는 같은 선수 · 같은 시즌이면 그 값을 그대로 — 자리를 손으로 정했으면 그 자리는 지킨다 */
  const reuse = (draft, keepPos = false) => {
    const had = known.get(`${draft.personId}|${draft.year}`);
    if (!had) return draft;
    return { ...draft, position: keepPos ? draft.position : had.position, hand: had.hand, isForeign: had.isForeign, stats: { ...had.stats }, note: had.note || draft.note };
  };
  for (const p of pit) {
    const role = isStarter(p) ? 'SP' : 'RP';
    players.push(reuse({
      personId: idOf(p.name, role), name: p.name, year, team: t.ko, position: role,
      hand: (hands[idOf(p.name, role)] || hands[p.name] || 'RR')[0], isForeign: foreign.has(p.name),
      stats: pitRating({ ip: p.ip, era: p.era, so: p.so, bb: p.bb, whip: p.whip || null, role, year }),
      note: '',
      source: `${p.g}G ${p.ip}IP ERA${p.era.toFixed(2)} ${p.so}K ${p.bb}BB WHIP${p.whip.toFixed(2)}${p.w ? ` ${p.w}승` : ''}${p.sv ? ` ${p.sv}SV` : ''}${p.hld ? ` ${p.hld}HLD` : ''} — KBO 기록실`,
    }));
  }
  for (const b of bat) {
    const fixed = posFix[`${year}-${code}`]?.[b.name];
    const pos = fixed || b.pos;
    players.push(reuse({
      personId: idOf(b.name, pos), name: b.name, year, team: t.ko, position: pos,
      hand: (hands[idOf(b.name, pos)] || hands[b.name] || 'RR')[1], isForeign: foreign.has(b.name),
      stats: batRating({ avg: b.avg, hr: b.hr, sb: b.sb, pos, pa: b.pa, year, fielding: FIELD(pos, b.pa) }),
      note: '',
      /* 옛 시즌은 기록실에 출루율이 없는 팀이 있다 — 타율보다 낮게 들어온 값은 쓰지 않는다 */
      source: `${numText(b.avg.toFixed(3))}${b.obp > b.avg ? `/${numText(b.obp.toFixed(3))}` : ''} ${b.hr}HR ${b.rbi}타점 ${b.sb}SB ${b.pa}PA — KBO 기록실`,
    }, !!fixed));
  }
  return {
    id: `${year}-${slugOf(code, year)}`,
    ...(meta.champion ? { champion: true } : {}),
    kind: 'team',
    year,
    title: t.title,
    franchise: t.fr,
    subtitle: meta.subtitle || '',
    blurb: meta.blurb || '',
    notes: meta.notes || [],
    players,
  };
}

/* ── 실행 ── */
if (process.argv[1] && process.argv[1].endsWith('series-from-records.mjs')) {
  const dir = process.argv[2];
  const years = process.argv.slice(3).map(Number);
  const hands = existsSync(join(dir, 'hands.json')) ? JSON.parse(readFileSync(join(dir, 'hands.json'), 'utf8')) : {};
  const foreign = new Set(existsSync(join(dir, 'foreign.json')) ? JSON.parse(readFileSync(join(dir, 'foreign.json'), 'utf8')) : []);
  const metaAll = existsSync(join(dir, 'meta.json')) ? JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) : {};
  const dupes = existsSync(join(dir, 'dupes.json')) ? JSON.parse(readFileSync(join(dir, 'dupes.json'), 'utf8')) : {};
  const posFix = existsSync(join(dir, 'positions.json')) ? JSON.parse(readFileSync(join(dir, 'positions.json'), 'utf8')) : {};
  const mine = new Set();
  for (const year of years) for (const code of Object.keys(TEAM)) mine.add(`${year}-${slugOf(code, year)}`);
  const known = knownPlayers(join('src', 'data', 'series'), mine);   // 내가 만드는 시리즈는 빼고 읽는다
  for (const year of years) {
    const recs = parseRecords(readFileSync(join(dir, `${year}.txt`), 'utf8'));
    for (const code of Object.keys(recs)) {
      const s = buildSeries({ year, code, records: recs[code], hands, foreign, meta: metaAll[`${year}-${slugOf(code, year)}`] || {}, dupes, posFix, known });
      for (const p of s.players) if (!known.has(`${p.personId}|${p.year}`)) known.set(`${p.personId}|${p.year}`, p);
      const file = join('src', 'data', 'series', `${s.id}.json`);
      writeFileSync(file, `${JSON.stringify(s, null, 2)}\n`);
      console.log(`${s.id}  선수 ${s.players.length}`);
    }
  }
}
