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
  SB: { ko: '쌍방울', title: '쌍방울 레이더스', fr: 'SSANGBANGWOOL' },
};
/* 그해 당시 이름 — 규격은 그 시즌에 쓰던 구단명을 쓰라고 한다 */
const THEN = {
  WO: [[2019, { ko: '키움', title: '키움 히어로즈' }], [2010, { ko: '넥센', title: '넥센 히어로즈' }], [2008, { ko: '히어로즈', title: '히어로즈' }]],
  SK: [[2021, { ko: 'SSG', title: 'SSG 랜더스' }], [2000, { ko: 'SK', title: 'SK 와이번스' }]],
  HT: [[2001, { ko: 'KIA', title: 'KIA 타이거즈' }], [1982, { ko: '해태', title: '해태 타이거즈' }]],
  OB: [[1999, { ko: '두산', title: '두산 베어스' }], [1982, { ko: 'OB', title: 'OB 베어스' }]],
  HH: [[1994, { ko: '한화', title: '한화 이글스' }], [1986, { ko: '빙그레', title: '빙그레 이글스' }]],
  /* 삼미 → 청보 → 태평양 → 현대로 이어진 구단 — 기록실도 같은 코드로 준다 */
  HD: [[1996, { ko: '현대', title: '현대 유니콘스' }], [1988, { ko: '태평양', title: '태평양 돌핀스' }],
    [1986, { ko: '청보', title: '청보 핀토스' }], [1982, { ko: '삼미', title: '삼미 슈퍼스타즈' }]],
  LG: [[1990, { ko: 'LG', title: 'LG 트윈스' }], [1982, { ko: 'MBC', title: 'MBC 청룡' }]],
};
/** 그 해의 구단 이름 · 프랜차이즈 */
export function teamOf(code, year) {
  const base = TEAM[code];
  const rules = THEN[code];
  if (!rules) return base;
  for (const [from, name] of rules) if (year >= from) return { ...base, ...name };
  return base;
}
const SLUG = { OB: 'doosan', HT: 'kia', WO: 'kiwoom', KT: 'kt', LT: 'lotte', NC: 'nc', SS: 'samsung', HH: 'hanwha', SK: 'ssg', LG: 'lg', HD: 'hyundai', SB: 'ssangbangwool' };
/** 옛 이름으로 파일을 두는 구단 — [바뀐 해, 그 전 이름] */
const OLD_SLUG = { SK: [2021, 'sk'], HT: [2001, 'haitai'], OB: [1999, 'ob'], HH: [1994, 'binggrae'], LG: [1990, 'mbc'] };
/** 파일 이름 — 구단명이 바뀌기 전 시즌은 그때 이름으로 (2017-sk · 2014-nexen · 1993-haitai) */
export const slugOf = (code, year) => {
  if (code === 'WO') return year < 2010 ? 'heroes' : year < 2019 ? 'nexen' : 'kiwoom';
  if (code === 'HD') return year >= 1996 ? 'hyundai' : year >= 1988 ? 'taepyungyang' : year >= 1986 ? 'chungbo' : 'sammi';
  const old = OLD_SLUG[code];
  if (old && year < old[0]) return old[1];
  return SLUG[code];
};
const POS = { 포수: 'C', '1루수': '1B', '2루수': '2B', '3루수': '3B', 유격수: 'SS', 좌익수: 'OF', 중견수: 'OF', 우익수: 'OF', 외야수: 'OF', 지명타자: 'DH', 내야수: 'DH', '?': 'DH' };
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
  /* 투타를 겸한 선수(김성한처럼)는 한쪽으로만 — 더 많이 나선 쪽을 남긴다 */
  for (const t of Object.values(out)) {
    const bat = new Map(t.bat.map((b) => [b.name, b]));
    t.pit = t.pit.filter((p) => {
      const b = bat.get(p.name);
      if (!b) return true;
      if (b.pa >= 100) { return false; }
      t.bat = t.bat.filter((x) => x !== b);
      return true;
    });
  }
  return out;
}

/** 선발인가 — 등판당 이닝이 길면 선발로 본다 */
const isStarter = (p) => ipOf(p.ip) / Math.max(1, p.g) >= 3.5;

/** 18명 고르기: 선발 4 · 불펜 4 · 포수 2 · 내야 각 1 · 외야 3 · 남는 한 자리는 타석 많은 순 */
export function pick18(team, fix = {}, roleOf = () => null) {
  /* 다른 시리즈에서 이미 자리가 정해진 투수는 그 자리를 따른다 — 같은 시즌은 같은 값이어야 한다 */
  const isSp = (p) => (roleOf(p.name) ? roleOf(p.name) === 'SP' : isStarter(p));
  const sp = team.pit.filter(isSp).sort((a, b) => ipOf(b.ip) - ipOf(a.ip));
  let rp = team.pit.filter((p) => !isSp(p)).sort((a, b) => (b.sv + b.hld) * 3 + ipOf(b.ip) - ((a.sv + a.hld) * 3 + ipOf(a.ip)));
  /* 선발 로테이션이 흔들린 해에는 선발로 볼 만한 투수가 셋도 안 된다 — 이닝을 많이 던진 쪽을 올린다 */
  while (sp.length < 3 && rp.length) {
    const free = rp.filter((p) => !roleOf(p.name));
    if (!free.length) break;
    const most = [...free].sort((a, b) => ipOf(b.ip) - ipOf(a.ip))[0];
    rp = rp.filter((x) => x !== most);
    sp.push(most);
  }
  /* 반대로 선발과 구원을 가르지 않던 옛 시즌에는 불펜이 둘도 안 된다 — 이닝이 적은 쪽을 내린다 */
  while (rp.length < 2 && sp.length > 3) {
    const idx = sp.map((p, i) => [ipOf(p.ip), i]).filter(([, i]) => !roleOf(sp[i].name)).sort((a, b) => a[0] - b[0])[0];
    if (!idx) break;
    rp.push(...sp.splice(idx[1], 1));
  }
  const take = (list, n) => list.slice(0, n);
  const starters = new Set(take(sp, 4));
  const pit = [...take(sp, 4), ...take(rp, 4)];
  const posOf = (x) => fix[x.name] || x.pos;
  const byPos = (p) => team.bat.filter((x) => posOf(x) === p).sort((a, b) => b.pa - a.pa);
  const bat = [];
  const push = (list, n) => list.slice(0, n).forEach((x) => { if (!bat.includes(x)) bat.push(x); });
  push(byPos('C'), 2); push(byPos('1B'), 1); push(byPos('2B'), 1); push(byPos('3B'), 1); push(byPos('SS'), 1); push(byPos('OF'), 3);
  for (const x of [...team.bat].sort((a, b) => b.pa - a.pa)) { if (bat.length >= 18 - pit.length) break; if (!bat.includes(x)) bat.push(x); }
  return { pit, bat, starters };
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

export function buildSeries({ year, code, records, hands = {}, foreign = new Set(), meta = {}, dupes = {}, posFix = {}, known = new Map(), norms = null }) {
  const t = teamOf(code, year);
  /* 이미 다른 시리즈에 있는 투수의 자리 — 선발·불펜을 그대로 따른다 */
  const roleOf = (name) => { const had = known.get(`${name}|${year}`); return had && (had.position === 'SP' || had.position === 'RP') ? had.position : null; };
  const { pit, bat, starters } = pick18(records, posFix[`${year}-${code}`] || {}, roleOf);
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
    const role = starters.has(p) ? 'SP' : 'RP';
    players.push(reuse({
      personId: idOf(p.name, role), name: p.name, year, team: t.ko, position: role,
      hand: (hands[idOf(p.name, role)] || hands[p.name] || 'RR')[0], isForeign: foreign.has(p.name),
      stats: pitRating({ ip: p.ip, era: p.era, so: p.so, bb: p.bb, whip: p.whip || null, role, norms }),
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
      stats: batRating({ avg: b.avg, hr: b.hr, sb: b.sb, pos, pa: b.pa, fielding: FIELD(pos, b.pa), norms }),
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
  const force = process.argv.includes('--force');   // 이미 있는 시리즈까지 다시 만든다
  const years = process.argv.slice(3).filter((x) => x !== '--force').map(Number);
  const hands = existsSync(join(dir, 'hands.json')) ? JSON.parse(readFileSync(join(dir, 'hands.json'), 'utf8')) : {};
  const foreign = new Set(existsSync(join(dir, 'foreign.json')) ? JSON.parse(readFileSync(join(dir, 'foreign.json'), 'utf8')) : []);
  const metaAll = existsSync(join(dir, 'meta.json')) ? JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) : {};
  const dupes = existsSync(join(dir, 'dupes.json')) ? JSON.parse(readFileSync(join(dir, 'dupes.json'), 'utf8')) : {};
  const posFix = existsSync(join(dir, 'positions.json')) ? JSON.parse(readFileSync(join(dir, 'positions.json'), 'utf8')) : {};
  const league = existsSync(join(dir, 'league.json')) ? JSON.parse(readFileSync(join(dir, 'league.json'), 'utf8')) : {};
  const mine = new Set();
  for (const year of years) for (const code of Object.keys(TEAM)) {
    const id = `${year}-${slugOf(code, year)}`;
    if (force || !existsSync(join('src', 'data', 'series', `${id}.json`))) mine.add(id);
  }
  const known = knownPlayers(join('src', 'data', 'series'), mine);   // 내가 만드는 시리즈는 빼고 읽는다
  for (const year of years) {
    const recs = parseRecords(readFileSync(join(dir, `${year}.txt`), 'utf8'));
    for (const code of Object.keys(recs)) {
      const s = buildSeries({ year, code, records: recs[code], hands, foreign, meta: metaAll[`${year}-${slugOf(code, year)}`] || {}, dupes, posFix, known, norms: league[year] });
      for (const p of s.players) if (!known.has(`${p.personId}|${p.year}`)) known.set(`${p.personId}|${p.year}`, p);
      const file = join('src', 'data', 'series', `${s.id}.json`);
      if (!mine.has(s.id)) { console.log(`${s.id}  그대로 둠`); continue; }
      writeFileSync(file, `${JSON.stringify(s, null, 2)}\n`);
      console.log(`${s.id}  선수 ${s.players.length}`);
    }
  }
}
