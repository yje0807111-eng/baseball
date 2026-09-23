/*
 * KBO 기록실에서 한 시즌의 팀별 타자 · 투수 기록을 받아 텍스트로 저장한다.
 *   node scripts/kbo-fetch.mjs <받을폴더> <연도...>
 * 저장 형식은 series-from-records.mjs 가 읽는 그대로 —
 *   #팀코드
 *   B:이름|포지션(한글)|타율|타석|홈런|타점|도루|출루율
 *   P:이름|ERA|G|승|패|세이브|홀드|이닝|탈삼진|볼넷|WHIP
 * 받은 뒤에는 node scripts/series-from-records.mjs <받을폴더> <연도...> 로 시리즈를 만든다.
 *
 * 기록실은 ASP.NET 폼이라 숨은 값(__VIEWSTATE)을 그대로 돌려주며 select 를 하나씩 바꿔 나간다.
 * 포지션은 2001년부터 수비 기록에서 주 포지션을, 그 전 시즌은 포지션 필터로 포수 · 내야수 · 외야수만 가른다
 * (세부 자리는 기록실에 없다 — 손으로 채우거나 다른 자료를 쓴다).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'https://www.koreabaseball.com';
const P = {
  bat1: '/Record/Player/HitterBasic/BasicOld.aspx',
  bat2: '/Record/Player/HitterBasic/Basic2.aspx',
  pit: '/Record/Player/PitcherBasic/BasicOld.aspx',
  def: '/Record/Player/Defense/Basic.aspx',
};

let cookie = '';
const keep = (r) => {
  const sc = r.headers.getSetCookie?.() || [];
  if (sc.length) cookie = sc.map((s) => s.split(';')[0]).join('; ');
};
const get = async (path) => {
  const r = await fetch(BASE + path, { headers: cookie ? { cookie } : {} });
  keep(r);
  return r.text();
};
/** 받아 둔 페이지의 숨은 값과 select 를 그대로 되돌려 보내되, over 에 준 항목만 바꾼다 */
const post = async (path, html, over) => {
  const fd = new URLSearchParams();
  for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/gi)) {
    const n = /name="([^"]+)"/.exec(m[0]); const v = /value="([^"]*)"/.exec(m[0]);
    if (n) fd.set(n[1], v ? v[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') : '');
  }
  for (const m of html.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const sel = /<option[^>]*selected[^>]*value="([^"]*)"/i.exec(m[2]) || /value="([^"]*)"/i.exec(m[2]);
    fd.set(m[1], sel ? sel[1] : '');
  }
  for (const [k, v] of Object.entries(over)) {
    const hit = [...fd.keys()].find((n) => n.endsWith(k) || n.includes(`$${k}$`));
    fd.set(hit || k, v);
  }
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}) },
    body: fd.toString(),
  });
  keep(r);
  return r.text();
};

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
const rows = (html) => {
  const t = /<table[^>]*class="tData[^"]*"[\s\S]*?<\/table>/i.exec(html);
  const tb = t && /<tbody>([\s\S]*?)<\/tbody>/i.exec(t[0]);
  if (!tb) return [];
  return [...tb[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((tr) => [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((td) => strip(td[1])));
};
const teamsOf = (html) => {
  const m = /<select[^>]*ddlTeam[^>]*>([\s\S]*?)<\/select>/i.exec(html);
  return m ? [...m[1].matchAll(/value="([^"]+)"/g)].map((x) => x[1]).filter(Boolean) : [];
};
/** 한 페이지에 다 안 들어가는 표는 쪽 번호를 눌러 이어 받는다 */
async function allRows(path, html) {
  const out = rows(html);
  const seen = new Set(out.map((r) => r[1]));
  let cur = html;
  for (const target of [...new Set([...html.matchAll(/__doPostBack\('([^']*btnNo\d+)'/g)].map((m) => m[1]))]) {
    cur = await post(path, cur, { __EVENTTARGET: target });
    for (const r of rows(cur)) if (!seen.has(r[1])) { seen.add(r[1]); out.push(r); }
  }
  return out;
}
/** 이닝 문자열("138 2/3") → 숫자 */
const ipNum = (ip) => (ip.includes('/')
  ? Number(ip.split(' ')[0] || 0) + (ip.includes('1/3') ? 1 / 3 : 2 / 3)
  : Number(ip));

async function season(year, dir) {
  const first = await post(P.bat1, await get(P.bat1), { ddlSeason: String(year) });
  const list = teamsOf(first);
  const data = {};
  for (const code of list) {
    data[code] = { bat: {}, pit: [], def: {} };
    /* 타자 기본1 — 타율 · 타석 · 홈런 · 타점 · 도루 */
    let page = await post(P.bat1, first, { ddlPos: '' });
    page = await post(P.bat1, page, { ddlTeam: code });
    for (const r of await allRows(P.bat1, page)) {
      data[code].bat[r[1]] = { avg: r[3], pa: r[5], hr: r[10], rbi: r[11], sb: r[12], obp: '' };
    }
    /* 타자 기본2 — 출루율 */
    let h2 = await post(P.bat2, await get(P.bat2), { ddlSeason: String(year) });
    h2 = await post(P.bat2, h2, { ddlPos: '' });
    h2 = await post(P.bat2, h2, { ddlTeam: code });
    for (const r of await allRows(P.bat2, h2)) if (data[code].bat[r[1]]) data[code].bat[r[1]].obp = r[10];
    /* 투수 — WHIP 은 기록실에 없어 (피안타+볼넷)/이닝 으로 센다 */
    let hp = await post(P.pit, await get(P.pit), { ddlSeason: String(year) });
    hp = await post(P.pit, hp, { ddlTeam: code });
    for (const r of await allRows(P.pit, hp)) {
      const ip = r[13], hits = Number(r[14]), bb = Number(r[16]);
      const inn = ipNum(ip);
      data[code].pit.push({
        name: r[1], era: r[3], g: r[4], w: r[7], l: r[8], sv: r[9], hld: r[10],
        ip, so: r[18], bb: r[16], whip: inn ? ((hits + bb) / inn).toFixed(2) : '0.00',
      });
    }
    /* 수비 기록은 2001년부터 있다 — 가장 오래 선 자리를 그 선수의 자리로 */
    if (year >= 2001) {
      let hd = await post(P.def, await get(P.def), { ddlSeason: String(year) });
      hd = await post(P.def, hd, { ddlTeam: code });
      for (const r of await allRows(P.def, hd)) {
        const inn = Number((r[6] || '0').split(' ')[0]) || 0;
        const cur = data[code].def[r[1]];
        if (!cur || inn > cur.inn) data[code].def[r[1]] = { pos: r[3], inn };
      }
    }
    process.stderr.write(`${year} ${code} 타자 ${Object.keys(data[code].bat).length} 투수 ${data[code].pit.length}\n`);
  }
  /* 수비 기록이 없는 옛 시즌 — 포지션 필터로 포수 · 내야수 · 외야수만이라도 갈라 둔다.
     필터를 한 번 걸면 다음 조회까지 그 선택이 남는 탓에 팀 기록을 다 받은 뒤에 따로 돈다 */
  if (year < 2001) {
    for (const [val, ko] of [['2', '포수'], ['3,4,5,6', '내야수'], ['7,8,9', '외야수']]) {
      let hx = await post(P.bat1, await get(P.bat1), { ddlSeason: String(year) });
      hx = await post(P.bat1, hx, { ddlPos: val });
      for (const code of list) {
        const hy = await post(P.bat1, hx, { ddlTeam: code });
        for (const r of await allRows(P.bat1, hy)) {
          if (data[code].bat[r[1]] && !data[code].def[r[1]]) data[code].def[r[1]] = { pos: ko, inn: 0 };
        }
      }
    }
  }
  /* 텍스트로 — 타자는 타석, 투수는 등판이 많은 순 */
  const lines = [];
  for (const code of list) {
    lines.push(`#${code}`);
    Object.entries(data[code].bat)
      .filter(([, b]) => Number(b.pa) > 0)
      .sort((a, b) => Number(b[1].pa) - Number(a[1].pa))
      .forEach(([name, b], i) => {
        const pos = data[code].def[name]?.pos || '?';
        lines.push(`${i ? '' : 'B:'}${name}|${pos}|${b.avg}|${b.pa}|${b.hr}|${b.rbi}|${b.sb}|${b.obp || '0.000'}`);
      });
    data[code].pit
      .filter((p) => Number(p.g) > 0)
      .sort((a, b) => Number(b.g) - Number(a.g))
      .forEach((p, i) => lines.push(`${i ? '' : 'P:'}${p.name}|${p.era}|${p.g}|${p.w}|${p.l}|${p.sv}|${p.hld}|${p.ip}|${p.so}|${p.bb}|${p.whip}`));
  }
  writeFileSync(join(dir, `${year}.txt`), `${lines.join('\n')}\n`);
  console.log(`${year}.txt — 팀 ${list.length}`);
}

const dir = process.argv[2];
const years = process.argv.slice(3).map(Number).filter(Boolean);
if (!dir || !years.length) {
  console.error('쓰는 법: node scripts/kbo-fetch.mjs <받을폴더> <연도...>');
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
for (const y of years) await season(y, dir);
