/* 내 라커 · 내 선수 — 줄에는 포지션 칩 대신 좌/우 + 능력치 + 강점 아이콘, 오른쪽 카드에는 강점 · 약점 전부.
   타순 · 선발 · 불펜 모두 같은 문법. 줄 4종(R1~R4) × 카드 2종(C1 · C2) = 8안.  ?sel=pit 이면 투수를 고른 상태 */
import { squad, rotation, bullpen, lineup, bench, tone, img, face, chip, statColor, posColor, topbar, nav, head, benchTray } from '../squad-8/common.js';

/* ───── 시즌 기록 읽기 (source: ".300/.393 33SB 5HR ..." · "150IP ERA2.52 109K 42BB 12승") ───── */
const num = (re, s) => { const m = s?.match(re); return m ? Number(m[1]) : null; };
function record(p) {
  const s = p.source || '';
  if (p.type === 'pitcher') {
    const ipRaw = num(/([\d.]+)\s?IP/, s);
    const ip = ipRaw == null ? null : Math.floor(ipRaw) + ((ipRaw % 1) * 10) / 3;
    return { g: num(/(\d+)G/, s), ip, era: num(/ERA\s?([\d.]+)/, s), k: num(/(\d+)K\b/, s), bb: num(/(\d+)BB/, s), whip: num(/WHIP\s?([\d.]+)/, s), w: num(/(\d+)승/, s), sv: num(/(\d+)\s?SV/, s), hld: num(/(\d+)\s?HLD/, s) };
  }
  const avg = num(/(?:^|\s)\.(\d{3})/, s);
  const obp = num(/\.\d{3}\/\.(\d{3})/, s);
  return { g: num(/(\d+)G/, s), avg: avg == null ? null : avg / 1000, obp: obp == null ? null : obp / 1000, hr: num(/(\d+)HR/, s), sb: num(/(\d+)SB/, s), bb: num(/(\d+)BB/, s), pa: num(/(\d+)PA/, s), rbi: num(/(\d+)(?:타점|RBI)/, s) };
}
const per = (v, g, full) => (v == null || !g ? null : Math.round((v / g) * full));

/* ───── 강점 · 약점: 기록이 있으면 기록으로, 없으면 능력치로 ───── */
function traits(p) {
  const st = p.stats;
  const r = record(p);
  const good = [];
  const bad = [];
  if (p.type === 'batter') {
    const sb = per(r.sb, r.g, 144); const hr = per(r.hr, r.g, 144);
    if ((sb ?? 0) >= 25 || st.speed >= 85) good.push(['🏃', '도루', sb != null ? `144경기 ${sb}도루` : `주루 ${st.speed}`]);
    if ((hr ?? 0) >= 25 || st.power >= 88) good.push(['💥', '장타', hr != null ? `144경기 ${hr}홈런` : `파워 ${st.power}`]);
    if ((r.avg ?? 0) >= 0.31 || st.contact >= 88) good.push(['🎯', '정교함', r.avg != null ? `타율 ${r.avg.toFixed(3).slice(1)}` : `컨택 ${st.contact}`]);
    if (r.obp != null && r.avg != null && r.obp - r.avg >= 0.08) good.push(['👁', '선구안', `출루 ${r.obp.toFixed(3).slice(1)}`]);
    if (st.contact >= 75 && st.power < 65 && st.speed >= 70) good.push(['🪃', '작전', `컨택 ${st.contact} · 주루 ${st.speed}`]);
    if (st.defense >= 88) good.push(['🧤', '수비', `수비 ${st.defense}`]);
    if (st.speed <= 45) bad.push(['🐢', '발 느림', `주루 ${st.speed}`]);
    if (st.power <= 50) bad.push(['🪶', '장타 없음', hr != null ? `144경기 ${hr}홈런` : `파워 ${st.power}`]);
    if ((r.avg != null && r.avg < 0.25) || st.contact <= 60) bad.push(['🌀', '정교함 부족', r.avg != null ? `타율 ${r.avg.toFixed(3).slice(1)}` : `컨택 ${st.contact}`]);
    if (st.defense <= 60) bad.push(['⚠️', '수비 불안', `수비 ${st.defense}`]);
  } else {
    const k9 = r.k != null && r.ip ? (r.k * 9) / r.ip : null;
    const bb9 = r.bb != null && r.ip ? (r.bb * 9) / r.ip : null;
    const ipg = r.ip && r.g ? r.ip / r.g : null;
    if ((k9 ?? 0) >= 9 || st.stuff >= 88) good.push(['🔥', '탈삼진', k9 != null ? `9이닝 ${k9.toFixed(1)}K` : `구위 ${st.stuff}`]);
    if ((bb9 != null && bb9 <= 2.5) || st.control >= 88) good.push(['🎯', '제구', bb9 != null ? `9이닝 볼넷 ${bb9.toFixed(1)}` : `제구 ${st.control}`]);
    if ((p.position === 'SP' && (ipg ?? 0) >= 6) || st.stamina >= 88) good.push(['🔋', '이닝이터', ipg != null ? `경기당 ${ipg.toFixed(1)}이닝` : `체력 ${st.stamina}`]);
    if ((r.era != null && r.era <= 2.8) || (r.whip != null && r.whip <= 1.1)) good.push(['🛡', '짠물', r.era != null ? `ERA ${r.era.toFixed(2)}` : `WHIP ${r.whip}`]);
    if (st.stability >= 88) good.push(['🧊', '강심장', `안정 ${st.stability}`]);
    if ((bb9 ?? 0) >= 4.5 || st.control <= 60) bad.push(['🎲', '볼넷 많음', bb9 != null ? `9이닝 볼넷 ${bb9.toFixed(1)}` : `제구 ${st.control}`]);
    if ((r.era ?? 0) >= 5) bad.push(['💧', '실점 많음', `ERA ${r.era.toFixed(2)}`]);
    if (p.position === 'SP' && st.stamina <= 60) bad.push(['⏱', '짧은 이닝', `체력 ${st.stamina}`]);
    if (st.stuff <= 60) bad.push(['🪶', '구위 약함', `구위 ${st.stuff}`]);
  }
  return { good, bad, r };
}

/* ───── 조각 ───── */
const HAND = { R: ['우', '#7dd3fc'], L: ['좌', '#f9a8d4'], S: ['양', '#c4b5fd'] };
const hand = (p, size = 20) => {
  const [t, c] = HAND[p.hand] || HAND.R;
  const label = p.type === 'pitcher' ? `${t}완` : `${t}타`;
  return `<b class="d" title="${label}" style="flex:none;display:grid;place-items:center;width:${size}px;height:${size}px;font-family:'IBM Plex Sans KR';font-size:${size * 0.55}px;font-weight:800;color:#05080f;background:${c};border-radius:50%">${t}</b>`;
};
const handText = (p) => { const [t, c] = HAND[p.hand] || HAND.R; return `<b style="color:${c}">${t}${p.type === 'pitcher' ? '완' : '타'}</b>`; };
const KEY4 = { batter: [['컨', 'contact'], ['파', 'power'], ['주', 'speed'], ['수', 'defense']], pitcher: [['구', 'stuff'], ['제', 'control'], ['체', 'stamina'], ['안', 'stability']] };
const vbars = (p) => `<span style="flex:none;display:flex;align-items:flex-end;gap:3px;height:26px">${KEY4[p.type].map(([l, k]) => {
  const v = p.stats[k]; const c = statColor(v, posColor(p));
  return `<span title="${l} ${v}" style="display:flex;flex-direction:column;align-items:center;gap:1px"><span style="position:relative;width:7px;height:18px;background:rgba(255,255,255,.08)"><i style="position:absolute;left:0;right:0;bottom:0;height:${Math.max(8, (v - 30) * 1.45)}%;background:${c.num}"></i></span><span style="font-size:8.5px;line-height:1;color:#6b7280">${l}</span></span>`;
}).join('')}</span>`;
const nums4 = (p) => `<span style="flex:none;display:grid;grid-template-columns:repeat(2,26px);gap:0 4px;font-family:'Saira Condensed';line-height:1.05">${KEY4[p.type].map(([l, k]) => `<span style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280">${l}<b style="font-size:13px;color:${statColor(p.stats[k], posColor(p)).num}">${p.stats[k]}</b></span>`).join('')}</span>`;
const icon = (p) => { const g = traits(p).good[0]; return `<span title="${g ? g[1] : ''}" style="flex:none;width:18px;text-align:center;font-size:14px;opacity:${g ? 1 : 0}">${g ? g[0] : '·'}</span>`; };
const tag = (p) => { const g = traits(p).good[0]; return g ? `<span style="flex:none;padding:1px 6px;font-size:11px;font-weight:700;color:#bbf7d0;background:rgba(52,211,153,.14);box-shadow:inset 0 0 0 1px rgba(52,211,153,.4)">${g[0]} ${g[1]}</span>` : '<span style="flex:none;width:0"></span>'; };
const recLine = (p) => {
  const { r } = traits(p);
  const cell = (v, l) => `<span style="white-space:nowrap"><b style="color:#e5e7eb">${v ?? '-'}</b><small style="color:#6b7280;margin-left:1px">${l}</small></span>`;
  const inner = p.type === 'pitcher'
    ? [cell(r.era != null ? r.era.toFixed(2) : null, 'ERA'), cell(r.k, 'K')]
    : [cell(r.avg != null ? r.avg.toFixed(3).slice(1) : null, ''), cell(r.hr, 'HR'), cell(r.sb, 'SB')];
  return `<span class="d" style="flex:none;display:flex;gap:6px;font-size:12.5px">${inner.join('')}</span>`;
};
const ovrB = (p, size = 17) => `<b class="d" style="flex:none;font-size:${size}px;font-weight:800;line-height:1;color:${tone(p.overall)};text-shadow:0 0 12px ${tone(p.overall)}66">${p.overall}</b>`;
const nameB = (p) => `<b style="min-width:0;flex:1;font-size:13.5px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b>`;

const REST = new Map([...rotation.map((p, i) => [p.id, i]), [bullpen[0].id, 1], [bullpen[2]?.id, 2]]);
const COND = [100, 85, 70, 55];
const condColor = (c) => (c >= 100 ? '#34d399' : c >= 85 ? '#a3e635' : c >= 70 ? '#fbbf24' : '#fb923c');

/* 줄 하나: 왼쪽 번호/역할, 오른쪽 R 종류별 정보. 투수 컨디션은 줄 아래 가는 선 + −N */
function row(p, lead, leadColor, R, { next = false, on = false } = {}) {
  const pit = p.type === 'pitcher';
  const rest = pit ? REST.get(p.id) ?? 0 : 0;
  const c = COND[Math.min(3, rest)];
  const info = { R1: `${vbars(p)}${icon(p)}`, R2: `${nums4(p)}${icon(p)}`, R3: tag(p), R4: `${recLine(p)}${icon(p)}` }[R];
  const bg = next ? 'linear-gradient(90deg,#16263f,#0b111c)' : on ? `linear-gradient(90deg,color-mix(in srgb,${tone(p.overall)} 20%,#0b111c),#0b111c)` : '#0e141f';
  const ring = next ? 'inset 3px 0 0 #60a5fa, inset 0 0 0 1px rgba(96,165,250,.35)' : on ? `inset 3px 0 0 ${tone(p.overall)}` : 'none';
  return `<div class="cut" style="--c:7px;position:relative;flex:1 1 0;min-height:0;max-height:62px;display:flex;align-items:center;gap:7px;padding:0 9px;background:${bg};box-shadow:${ring}">
    <span style="color:#475569;font-size:13px;letter-spacing:-2px">⋮⋮</span>
    ${pit ? `<b class="d" style="flex:none;width:30px;padding:0 2px;font-size:11.5px;font-weight:800;text-align:center;color:#05080f;background:${leadColor}">${lead}</b>` : `<b class="d" style="flex:none;width:14px;text-align:center;font-size:17px;color:#6b7280">${lead}</b>`}
    ${face(p, 28, 0, 'height:calc(100% - 10px);max-height:44px')}${ovrB(p)}${hand(p, 18)}${nameB(p)}${next ? '<b class="d" style="flex:none;padding:0 4px;font-size:10.5px;color:#05080f;background:#60a5fa">NEXT</b>' : ''}${info}
    ${pit ? `<span style="position:absolute;left:9px;right:9px;bottom:3px;height:2px;background:rgba(255,255,255,.06)"><i style="position:absolute;left:0;top:0;bottom:0;width:${c}%;background:${condColor(c)}"></i></span><b class="d" style="position:absolute;right:6px;top:2px;font-size:10.5px;color:${condColor(c)}">${rest ? `-${rest}` : ''}</b>` : ''}
  </div>`;
}

/* ───── 오른쪽 카드 ───── */
function card(p, C) {
  const a = tone(p.overall);
  const t = traits(p);
  const r = t.r;
  const keys = KEY4[p.type].map(([, k]) => k);
  const LABEL = { contact: '컨택', power: '파워', speed: '주루', defense: '수비', stuff: '구위', control: '제구', stamina: '체력', stability: '안정' };
  const recs = p.type === 'pitcher'
    ? [['ERA', r.era?.toFixed(2)], ['이닝', r.ip ? Math.round(r.ip) : null], ['탈삼진', r.k], ['볼넷', r.bb], ['승', r.w], ['S/H', r.sv != null || r.hld != null ? `${r.sv ?? 0}/${r.hld ?? 0}` : null]]
    : [['타율', r.avg?.toFixed(3).slice(1)], ['출루', r.obp?.toFixed(3).slice(1)], ['홈런', r.hr], ['도루', r.sb], ['타점', r.rbi], ['경기', r.g]];
  const head = `<p class="lab" style="--a:${a}">My Player</p>
    <div class="cut" style="--c:12px;position:relative;height:170px;flex:none;background:#0b1220 60% 18%/cover;background-image:${img(p, 'cards')}">
      <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.35),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,#05080f)"></span>
      <span style="position:absolute;left:12px;top:8px">${ovrB(p, 38)}</span>
      <span style="position:absolute;right:10px;top:10px;display:flex;align-items:center;gap:6px;font-size:13px">${hand(p, 24)}${handText(p)}</span>
      <b style="position:absolute;left:12px;bottom:8px;font-size:28px;font-weight:900;color:#fff">${p.name} <small style="font-size:13px;font-weight:600;color:#9ca3af">${p.year} ${p.team} · ${p.position}</small></b></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${keys.map((k) => { const v = p.stats[k]; const c = statColor(v, posColor(p)); return `<div class="cut" style="--c:6px;padding:5px 8px;background:rgba(255,255,255,.045)"><div style="font-size:10.5px;color:#9ca3af">${LABEL[k]}</div><b class="d" style="font-size:21px;color:${c.num}">${v}</b><span class="bar" style="display:block;height:4px;margin-top:2px"><i style="width:${v}%;background:${c.bar}"></i></span></div>`; }).join('')}</div>`;
  const recGrid = `<div class="cut" style="--c:8px;display:grid;grid-template-columns:repeat(6,1fr);background:rgba(255,255,255,.03)">${recs.map(([k, v]) => `<div style="padding:6px 0;text-align:center"><div style="font-size:10.5px;color:#6b7280">${k}</div><b class="d" style="font-size:17px;color:${v == null ? '#4b5563' : '#fff'}">${v ?? '-'}</b></div>`).join('')}</div>`;
  let body;
  if (C === 'C1') {
    const chips = (list, good) => list.length ? list.map(([i, n]) => `<span class="cut" style="--c:5px;display:inline-flex;align-items:center;gap:5px;padding:4px 9px;font-size:13px;font-weight:700;color:${good ? '#bbf7d0' : '#fecaca'};background:${good ? 'rgba(52,211,153,.14)' : 'rgba(248,113,113,.12)'};box-shadow:inset 0 0 0 1px ${good ? 'rgba(52,211,153,.45)' : 'rgba(248,113,113,.4)'}">${i} ${n}</span>`).join('') : '<span style="color:#4b5563">-</span>';
    body = `<div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:flex-start;gap:10px"><b class="d" style="flex:none;width:34px;padding-top:4px;font-size:12px;letter-spacing:.14em;color:#34d399">강점</b><div style="display:flex;flex-wrap:wrap;gap:5px">${chips(t.good, true)}</div></div>
      <div style="display:flex;align-items:flex-start;gap:10px"><b class="d" style="flex:none;width:34px;padding-top:4px;font-size:12px;letter-spacing:.14em;color:#f87171">약점</b><div style="display:flex;flex-wrap:wrap;gap:5px">${chips(t.bad, false)}</div></div></div>${recGrid}`;
  } else {
    const line = ([i, n, why], good) => `<div class="cut" style="--c:6px;display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:8px;padding:6px 10px;background:${good ? 'rgba(52,211,153,.07)' : 'rgba(248,113,113,.07)'};box-shadow:inset 3px 0 0 ${good ? '#34d399' : '#f87171'}"><span style="font-size:15px;text-align:center">${i}</span><b style="font-size:14px;color:#fff">${n}</b><span class="d" style="font-size:14px;color:${good ? '#6ee7b7' : '#fca5a5'}">${why}</span></div>`;
    body = `<div style="display:flex;flex-direction:column;gap:4px">${t.good.map((x) => line(x, true)).join('')}${t.bad.map((x) => line(x, false)).join('')}${!t.good.length && !t.bad.length ? '<span style="color:#4b5563">-</span>' : ''}</div>${recGrid}`;
  }
  return `<aside class="cut frame glass side" style="--a:${a};gap:12px">${head}${body}
    <div style="margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px"><span class="btn" style="min-height:48px;font-size:15px">벤치로 ↓</span><span class="btn" style="min-height:48px;font-size:15px;color:#ff5a67">방출하기</span></div></aside>`;
}

/* ───── 구장(1B 그대로) ───── */
const XY = { C: [50, 90], '1B': [78, 60], '2B': [64, 42], SS: [36, 42], '3B': [22, 60], LF: [17, 18], CF: [50, 8], RF: [83, 18], DH: [84, 90], P: [50, 62] };
const field = (selId) => `<div class="cut" style="--c:14px;position:relative;height:100%;background:#07130c url(/ui/field.webp) center 60%/cover">
  <span style="position:absolute;inset:0;background:radial-gradient(70% 70% at 50% 60%,rgba(5,8,15,.05),rgba(5,8,15,.62))"></span>
  ${lineup.map(({ p, slot, order }) => `<div class="cut" style="--c:7px;position:absolute;left:${XY[slot][0]}%;top:${XY[slot][1]}%;transform:translate(-50%,-50%);width:126px;display:grid;grid-template-columns:36px minmax(0,1fr);gap:6px;align-items:center;padding:3px 6px 3px 3px;background:rgba(6,10,19,.9);box-shadow:inset 0 -2px 0 ${posColor(p)}${p.id === selId ? `,0 0 0 2px ${tone(p.overall)}` : ''}">
    ${face(p, 36, 42)}<span style="min-width:0"><span style="display:flex;align-items:center;gap:4px">${chip(slot, posColor(p))}<b class="d" style="font-size:11px;color:#9ca3af">${order}</b><span style="margin-left:auto">${ovrB(p, 16)}</span></span><b style="display:block;font-size:12.5px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b></span></div>`).join('')}
  <div class="cut" style="--c:7px;position:absolute;left:50%;top:62%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;padding:3px 8px 3px 3px;background:rgba(6,10,19,.9);box-shadow:inset 0 -2px 0 #60a5fa">${face(rotation[0], 32, 38)}<span style="display:flex;flex-direction:column"><b class="d" style="font-size:10px;letter-spacing:.2em;color:#60a5fa">NEXT</b><b style="font-size:12.5px;color:#fff;white-space:nowrap">${rotation[0].name}</b></span>${ovrB(rotation[0], 16)}</div></div>`;

const grp = (en, ko, color, right = '') => `<div class="grp" style="color:${color};margin:0 0 5px">${en} <b>${ko}</b>${right ? `<span class="d" style="order:9;font-size:11px;letter-spacing:.1em;color:#6b7280">${right}</span>` : ''}</div>`;
const list = (rows, flex = 1) => `<div style="flex:${flex};min-height:0;display:flex;flex-direction:column;gap:4px">${rows.join('')}</div>`;
const R_NOTE = { R1: '능력치 네 개를 세로 막대로', R2: '능력치 네 개를 작은 숫자로', R3: '능력치 대신 대표 강점 태그 하나', R4: '시즌 기록(타율·홈런·도루 / ERA·탈삼진)' };
const R_RIGHT = { R1: '컨 파 주 수', R2: '컨 파 / 주 수', R3: '강점', R4: '기록' };
const C_NOTE = { C1: '강점 · 약점 칩 두 줄 + 시즌 기록 여섯 칸', C2: '강점 · 약점을 한 줄씩(아이콘 · 이름 · 근거 수치) + 시즌 기록 여섯 칸' };

const selPit = new URLSearchParams(location.search).get('sel') === 'pit';
const selPlayer = selPit ? rotation[1] : [...lineup].sort((a, b) => traits(b.p).good.length - traits(a.p).good.length)[0].p;

const screen = (R, C) => {
  const center = `${head()}
    <div style="flex:1;min-height:0;margin-top:12px;display:grid;grid-template-columns:440px minmax(0,1fr);gap:14px">
      <div style="min-height:0">${field(selPlayer.id)}</div>
      <div style="min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="display:flex;flex-direction:column;min-height:0">${grp('LINEUP', '타순 9', '#34d399', R_RIGHT[R])}${list(lineup.map((x) => row(x.p, x.order, null, R, { on: x.p.id === selPlayer.id })))}</div>
        <div style="display:flex;flex-direction:column;min-height:0">
          ${grp('ROTATION', '선발 5', '#60a5fa', '')}${list(rotation.map((p, i) => row(p, `${i + 1}선발`.replace('선발', 'SP'), '#60a5fa', R, { next: i === 0, on: p.id === selPlayer.id })), 5)}
          <div style="height:8px"></div>${grp('BULLPEN', '불펜 8', '#f87171')}
          ${list(bullpen.map((p, i) => row(p, i === 0 ? 'CL' : i <= 2 ? 'SU' : `MR${i - 2}`, i === 0 ? '#fbbf24' : i <= 2 ? '#fb923c' : '#f87171', R)), 8)}
        </div>
      </div>
    </div>${benchTray('mini')}`;
  return `<div class="screen"><div class="bg"></div>${topbar()}<div class="body">${nav()}<section class="cut frame glass sec">${center}</section>${card(selPlayer, C)}</div></div>`;
};

const V = [];
for (const R of ['R1', 'R2', 'R3', 'R4']) for (const C of ['C1', 'C2']) V.push({ id: `${R}${C}`, name: `${R_NOTE[R]} + ${C === 'C1' ? '칩' : '줄 목록'}`, note: `<b>줄</b> — 포지션 칩을 빼고 좌/우 동그라미 + ${R_NOTE[R]}, 투수 컨디션은 줄 아래 가는 선. <b>카드</b> — ${C_NOTE[C]}.`, html: () => screen(R, C) });

const only = new URLSearchParams(location.search).get('v');
const selQ = selPit ? '&sel=pit' : '';
document.getElementById('top').innerHTML = `<b>타순 줄 · 강점 약점 8안</b><a href="?${selPit ? 'sel=pit' : ''}" class="${only ? '' : 'on'}">전체</a>${V.map((v) => `<a href="./?v=${v.id}${selQ}" class="${only === v.id ? 'on' : ''}">${v.id}</a>`).join('')}
  <span style="margin-left:14px">선택:</span><a href="?${only ? `v=${only}` : ''}" class="${selPit ? '' : 'on'}">타자</a><a href="?${only ? `v=${only}&` : ''}sel=pit" class="${selPit ? 'on' : ''}">투수</a>`;
const root = document.getElementById('root');
if (only) {
  const v = V.find((x) => x.id === only) || V[0];
  root.innerHTML = `<div class="note"><b>${v.id}</b> — ${v.note}</div>${v.html()}`;
} else {
  root.innerHTML = `<div class="grid">${V.map((v) => `<div class="thumb"><h3><a href="./?v=${v.id}${selQ}"><i>${v.id}</i>${v.name} ↗</a></h3><p>${v.note}</p><div class="frame-s">${v.html()}</div></div>`).join('')}</div>`;
}
