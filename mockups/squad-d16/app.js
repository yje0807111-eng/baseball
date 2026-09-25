/* 내 라커 · MY SQUAD — 다이아몬드로 한눈에 보고, 옆에서 타순 · 선발 · 중간계투 · 마무리를 정하는 16안
   다이아몬드 4종(사진 구장 · 가로 구장 · 미니 선화 · 불펜석 구장) × 편집 4종(탭 · 두 열 · 칸 보드 · 선택 교체) */
import { squad, rotation, bullpen, defense, lineup, bench, sel, tone, img, face, chip, keysOf, stat, ovr, meta, head, benchTray, wrap, posColor } from '../squad-8/common.js';

const closer = bullpen[0];
const middle = bullpen.slice(1); // 중간계투 7
const selLine = lineup.find((x) => x.p.id === sel.id);
const XY = { C: [50, 90], '1B': [79, 60], '2B': [64, 42], SS: [36, 42], '3B': [21, 60], LF: [15, 18], CF: [50, 8], RF: [85, 18], DH: [86, 90], P: [50, 62] };
const ROLE = { SP: '#60a5fa', MR: '#f87171', CL: '#fbbf24' };
const nm = (p, size = 14, w = 800) => `<b style="font-size:${size}px;font-weight:${w};color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${p.name}</b>`;
const handle = '<span style="color:#475569;font-size:14px;letter-spacing:-2px;cursor:grab">⋮⋮</span>';
const orderOf = (p) => lineup.find((x) => x.p.id === p.id);

/* ───── 편집 행: 높이는 목록 칸을 나눠 채운다(flex) · 폭에 따라 능력치 개수 ───── */
function row(p, { label, color, stats = 2, active = false, right = '', faceW = 34 } = {}) {
  const ks = keysOf(p).slice(0, stats);
  const a = tone(p.overall);
  return `<div class="cut" style="--c:7px;flex:1 1 0;min-height:0;max-height:64px;display:grid;grid-template-columns:16px ${label ? 'auto' : ''} ${faceW}px 28px minmax(0,1fr) ${ks.map(() => 'minmax(44px,58px)').join(' ')} ${right ? 'auto' : ''};gap:9px;align-items:center;padding:0 10px;background:${active ? `linear-gradient(90deg,color-mix(in srgb,${a} 18%,transparent),rgba(6,10,19,.5))` : 'rgba(255,255,255,.035)'};box-shadow:${active ? `inset 3px 0 0 ${a}` : 'none'}">
    ${handle}${label ? chip(label, color || posColor(p)) : ''}${face(p, faceW, 0, 'height:calc(100% - 8px);max-height:48px')}${ovr(p, 19)}${nm(p)}
    ${ks.map(([l, k]) => stat(p, l, k, { lab: false })).join('')}${right}</div>`;
}
const list = (rows) => `<div style="flex:1;min-height:0;display:flex;flex-direction:column;gap:4px">${rows.join('')}</div>`;
const grp = (en, ko, n, color = '#9ca3af') => `<div class="grp" style="color:${color};margin:0 0 5px">${en} <b>${ko} ${n}</b></div>`;
const colBox = (inner, extra = '') => `<div style="display:flex;flex-direction:column;min-height:0;${extra}">${inner}</div>`;
const statsFor = (w) => (w >= 520 ? 4 : w >= 380 ? 2 : w >= 290 ? 1 : 0);

const batRows = (w, activeId = sel.id) => lineup.map((x) => row(x.p, { label: `${x.order} ${x.slot}`, color: posColor(x.p), stats: statsFor(w), active: x.p.id === activeId }));
const spRows = (w) => rotation.map((p, i) => row(p, { label: `${i + 1}선발`, color: ROLE.SP, stats: statsFor(w) }));
const mrRows = (w) => middle.map((p, i) => row(p, { label: `중계${i + 1}`, color: ROLE.MR, stats: statsFor(w) }));
const clRow = (w) => row(closer, { label: '마무리', color: ROLE.CL, stats: statsFor(w) });

/* ═════ 다이아몬드 4종 ═════ */
function photoDiamond(tw = 150, xy = XY) {
  const tok = ({ p, slot, order }) => `<div class="cut" style="--c:7px;position:absolute;left:${xy[slot][0]}%;top:${xy[slot][1]}%;transform:translate(-50%,-50%);width:${tw}px;display:grid;grid-template-columns:38px minmax(0,1fr);gap:7px;align-items:center;padding:3px 7px 3px 3px;background:rgba(6,10,19,.84);box-shadow:inset 0 -2px 0 ${posColor(p)},${p.id === sel.id ? `0 0 0 2px ${tone(p.overall)},` : ''} inset 0 0 0 1px rgba(255,255,255,.12)">
    ${face(p, 38, 44)}<span style="min-width:0"><span style="display:flex;align-items:center;gap:4px">${chip(slot, posColor(p))}<b class="d" style="font-size:11px;color:#9ca3af">${order}</b><span style="margin-left:auto">${ovr(p, 17)}</span></span>${nm(p, 13)}</span></div>`;
  const sp = rotation[0];
  return `<div class="cut" style="--c:14px;position:relative;height:100%;background:#07130c url(/ui/field.webp) center 60%/cover">
    <span style="position:absolute;inset:0;background:radial-gradient(70% 70% at 50% 60%,rgba(5,8,15,.05),rgba(5,8,15,.62))"></span>
    ${lineup.map(tok).join('')}
    <div class="cut" style="--c:7px;position:absolute;left:50%;top:${XY.P[1]}%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;padding:3px 8px 3px 3px;background:rgba(6,10,19,.88);box-shadow:inset 0 -2px 0 ${ROLE.SP}">${face(sp, 34, 40)}${chip('1선발', ROLE.SP)}${ovr(sp, 17)}</div></div>`;
}

function wideDiamond() {
  const W = { C: [50, 90], '1B': [66, 62], '2B': [58, 38], SS: [42, 38], '3B': [34, 62], LF: [22, 22], CF: [50, 10], RF: [78, 22], DH: [70, 90], P: [50, 58] };
  const tok = ({ p, slot, order }) => `<div style="position:absolute;left:${W[slot][0]}%;top:${W[slot][1]}%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;padding:2px 10px 2px 2px;border-radius:999px;background:rgba(6,10,19,.86);box-shadow:0 0 0 ${p.id === sel.id ? 2 : 1}px ${p.id === sel.id ? tone(p.overall) : posColor(p)}">
    <span class="face" style="width:32px;height:32px;border-radius:50%;background-image:${img(p)}"></span>${chip(slot, posColor(p))}<b class="d" style="font-size:11px;color:#9ca3af">${order}</b><b style="font-size:13px;color:#fff;white-space:nowrap">${p.name}</b>${ovr(p, 15)}</div>`;
  const sp = rotation[0];
  return `<div class="cut" style="--c:14px;position:relative;height:100%;background:#07130c url(/ui/field-wide.webp) center 62%/cover">
    <span style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,8,15,.7),rgba(5,8,15,.1) 25%,rgba(5,8,15,.1) 75%,rgba(5,8,15,.7))"></span>
    ${lineup.map(tok).join('')}
    <div style="position:absolute;left:50%;top:${W.P[1]}%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;padding:2px 10px 2px 2px;border-radius:999px;background:rgba(6,10,19,.9);box-shadow:0 0 0 1px ${ROLE.SP}"><span class="face" style="width:32px;height:32px;border-radius:50%;background-image:${img(sp)}"></span>${chip('1선발', ROLE.SP)}<b style="font-size:13px;color:#fff">${sp.name}</b></div>
    <div style="position:absolute;right:14px;top:12px;display:flex;flex-direction:column;align-items:flex-end;gap:6px">
      <span class="lab" style="--a:${ROLE.MR}">Bullpen</span>
      <span style="display:flex">${middle.map((p, i) => `<span class="face" style="width:26px;height:26px;border-radius:50%;margin-left:${i ? -7 : 0}px;box-shadow:0 0 0 2px #05080f;background-image:${img(p)}"></span>`).join('')}<span class="face" style="width:30px;height:30px;border-radius:50%;margin-left:6px;box-shadow:0 0 0 2px ${ROLE.CL};background-image:${img(closer)}"></span></span></div></div>`;
}

function miniDiamond() {
  const svg = `<svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%" preserveAspectRatio="none">
    <path d="M6 30 Q50 -6 94 30" fill="none" stroke="rgba(16,185,129,.35)" stroke-width=".6"/>
    <path d="M50 88 L78 60 L50 32 L22 60 Z" fill="rgba(16,185,129,.06)" stroke="rgba(16,185,129,.55)" stroke-width=".6"/>
    <circle cx="50" cy="62" r="3" fill="none" stroke="rgba(16,185,129,.55)" stroke-width=".5"/></svg>`;
  const tok = ({ p, slot, order }) => `<div style="position:absolute;left:${XY[slot][0]}%;top:${XY[slot][1]}%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;width:84px">
    <span class="face" style="width:44px;height:44px;border-radius:50%;background-image:${img(p)};box-shadow:0 0 0 2px ${p.id === sel.id ? tone(p.overall) : posColor(p)}${p.id === sel.id ? `,0 0 14px ${tone(p.overall)}` : ''}"></span>
    <span style="display:flex;align-items:center;gap:3px">${chip(slot, posColor(p))}<b class="d" style="font-size:12px;color:${tone(p.overall)}">${p.overall}</b></span>
    <b style="font-size:11.5px;color:#e5e7eb;white-space:nowrap">${order}. ${p.name}</b></div>`;
  const sp = rotation[0];
  const avg = (ps, f) => Math.round(ps.reduce((s, p) => s + f(p), 0) / ps.length);
  const sums = [['타격', avg(lineup.map((x) => x.p), (p) => (p.stats.power + p.stats.contact) / 2), '#34d399'], ['수비', avg(lineup.map((x) => x.p), (p) => p.stats.defense), '#a78bfa'], ['선발', avg(rotation, (p) => p.overall), ROLE.SP], ['불펜', avg(bullpen, (p) => p.overall), ROLE.MR]];
  return `<div class="cut" style="--c:14px;position:relative;height:100%;display:flex;flex-direction:column;background:radial-gradient(90% 60% at 50% 45%,rgba(16,185,129,.08),rgba(5,8,15,.5))">
    <div style="position:relative;flex:1;min-height:0">${svg}${lineup.map(tok).join('')}
      <div style="position:absolute;left:50%;top:62%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px"><span class="face" style="width:40px;height:40px;border-radius:50%;background-image:${img(sp)};box-shadow:0 0 0 2px ${ROLE.SP}"></span>${chip('1선발', ROLE.SP)}</div></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:8px">${sums.map(([k, v, c]) => `<div class="cut" style="--c:6px;padding:5px 8px;background:rgba(255,255,255,.04);box-shadow:inset 0 2px 0 ${c}"><div style="font-size:10.5px;color:#9ca3af">${k}</div><b class="d" style="font-size:20px;color:#fff">${v}</b></div>`).join('')}</div></div>`;
}

function parkDiamond() {
  const P = { C: [62, 90], '1B': [86, 62], '2B': [74, 44], SS: [51, 44], '3B': [40, 62], LF: [38, 18], CF: [63, 8], RF: [88, 20], DH: [88, 90], P: [62, 64] };
  const tok = ({ p, slot, order }) => `<div class="cut" style="--c:6px;position:absolute;left:${P[slot][0]}%;top:${P[slot][1]}%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:5px;padding:2px 7px 2px 2px;background:rgba(6,10,19,.86);box-shadow:inset 0 -2px 0 ${posColor(p)}${p.id === sel.id ? `,0 0 0 2px ${tone(p.overall)}` : ''}">
    ${face(p, 30, 36)}<span><span style="display:flex;align-items:center;gap:3px">${chip(slot, posColor(p))}<b class="d" style="font-size:11px;color:#9ca3af">${order}</b></span><b style="display:block;font-size:12.5px;color:#fff;white-space:nowrap">${p.name}</b></span>${ovr(p, 16)}</div>`;
  const pen = (p, role) => `<span style="display:flex;flex-direction:column;align-items:center;gap:2px;width:${role === 'CL' ? 58 : 44}px"><span class="face" style="width:${role === 'CL' ? 44 : 34}px;height:${role === 'CL' ? 44 : 34}px;border-radius:50%;background-image:${img(p)};box-shadow:0 0 0 2px ${ROLE[role]}"></span><b style="font-size:10.5px;color:#e5e7eb;white-space:nowrap">${p.name}</b></span>`;
  return `<div class="cut" style="--c:14px;position:relative;height:100%;background:#07130c url(/ui/field.webp) 70% 60%/cover">
    <span style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,8,15,.8) 0%,rgba(5,8,15,.35) 26%,rgba(5,8,15,.1) 50%,rgba(5,8,15,.45))"></span>
    ${lineup.map(tok).join('')}
    <div style="position:absolute;left:62%;top:${P.P[1]}%;transform:translate(-50%,-50%);display:flex">${rotation.map((p, i) => `<span class="face" style="width:${i ? 26 : 38}px;height:${i ? 26 : 38}px;border-radius:50%;margin-left:${i ? -8 : 0}px;align-self:center;background-image:${img(p)};box-shadow:0 0 0 2px ${i ? '#05080f' : ROLE.SP}"></span>`).join('')}</div>
    <div class="cut" style="--c:10px;position:absolute;left:12px;top:12px;bottom:12px;width:23%;display:flex;flex-direction:column;gap:8px;padding:10px 8px;background:rgba(6,10,19,.7);box-shadow:inset 0 0 0 1px rgba(248,113,113,.3)">
      <span class="lab" style="--a:${ROLE.MR}">Bullpen</span>
      <div style="display:flex;justify-content:center">${pen(closer, 'CL')}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);justify-items:center;gap:6px 2px">${middle.map((p) => pen(p, 'MR')).join('')}</div></div></div>`;
}

/* ═════ 편집 4종 ═════ */
const tabs = (on, w) => {
  const T = [['bat', '타순', 9], ['sp', '선발', 5], ['mr', '중간계투', 7], ['cl', '마무리', 1]];
  return `<div style="display:flex;gap:4px;margin-bottom:8px">${T.map(([k, t, n]) => `<div class="cut" style="--c:7px;flex:1;display:flex;align-items:baseline;justify-content:center;gap:6px;padding:8px 4px;background:${k === on ? 'linear-gradient(180deg,rgba(16,185,129,.26),rgba(16,185,129,.08))' : 'rgba(255,255,255,.04)'};box-shadow:${k === on ? 'inset 0 -2px 0 #10b981' : 'none'}"><b style="font-size:${w < 400 ? 13 : 15}px;font-weight:800;color:${k === on ? '#fff' : '#9ca3af'}">${t}</b><b class="d" style="font-size:14px;color:${k === on ? '#34d399' : '#6b7280'}">${n}</b></div>`).join('')}</div>`;
};
function editTabs(w, on = 'bat', flow = 1) {
  const rows = { bat: batRows(w / flow), sp: spRows(w / flow), mr: mrRows(w / flow), cl: [clRow(w / flow), ...middle.slice(0, 2).map((p, i) => row(p, { label: `셋업${i + 1}`, color: ROLE.MR, stats: statsFor(w / flow) }))] }[on];
  const body = flow === 1 ? list(rows) : `<div style="flex:1;min-height:0;display:grid;grid-template-columns:repeat(${flow},1fr);gap:8px">${Array.from({ length: flow }, (_, c) => list(rows.filter((_, i) => i % flow === c))).join('')}</div>`;
  return colBox(`${tabs(on, w)}${body}`, 'height:100%');
}
function editTwo(w) {
  const cw = (w - 12) / 2;
  return `<div style="height:100%;display:grid;grid-template-columns:1fr 1fr;gap:12px">
    ${colBox(`${grp('LINEUP', '타순', 9, '#34d399')}${list(batRows(cw))}`)}
    ${colBox(`${grp('ROTATION', '선발', 5, ROLE.SP)}<div style="flex:5;min-height:0;display:flex;flex-direction:column">${list(spRows(cw))}</div>
      <div style="height:8px"></div>${grp('RELIEF', '중간계투', 7, ROLE.MR)}<div style="flex:7;min-height:0;display:flex;flex-direction:column">${list(mrRows(cw))}</div>
      <div style="height:8px"></div>${grp('CLOSER', '마무리', 1, ROLE.CL)}<div style="flex:1.2;min-height:34px;display:flex;flex-direction:column">${list([clRow(cw)])}</div>`)}</div>`;
}
function editBoard(w, horizontal = false) {
  if (horizontal) {
    const cw = (w - 36) / 4;
    return `<div style="height:100%;display:grid;grid-template-columns:1.25fr 1fr 1fr 0.9fr;gap:12px">
      ${colBox(`${grp('LINEUP', '타순', 9, '#34d399')}${list(batRows(cw * 1.25))}`)}${colBox(`${grp('ROTATION', '선발', 5, ROLE.SP)}${list(spRows(cw))}`)}
      ${colBox(`${grp('RELIEF', '중간계투', 7, ROLE.MR)}${list(mrRows(cw))}`)}${colBox(`${grp('CLOSER', '마무리', 1, ROLE.CL)}<div style="flex:0 0 72px;display:flex;flex-direction:column">${list([clRow(cw)])}</div><div style="height:8px"></div>${grp('BENCH', '대기', bench.filter((p) => p.type === 'pitcher').length)}${list(bench.filter((p) => p.type === 'pitcher').map((p) => row(p, { label: '대기', color: '#64748b', stats: 0 })))}`)}</div>`;
  }
  const cw = (w - 12) * 0.5;
  const tile = (p, label, c, big = false) => `<div class="cut" style="--c:8px;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px 4px;background:rgba(255,255,255,.035);box-shadow:inset 0 2px 0 ${c}">
    <span class="face" style="width:${big ? 46 : 38}px;height:${big ? 46 : 38}px;border-radius:50%;background-image:${img(p)};box-shadow:0 0 0 2px ${c}"></span>
    <span style="display:flex;align-items:center;gap:4px">${chip(label, c)}${ovr(p, 15)}</span><b style="font-size:12px;color:#fff;white-space:nowrap">${p.name}</b></div>`;
  return `<div style="height:100%;display:grid;grid-template-columns:1fr 1fr;gap:12px">
    ${colBox(`${grp('LINEUP', '타순', 9, '#34d399')}${list(batRows(cw))}`)}
    ${colBox(`${grp('ROTATION', '선발', 5, ROLE.SP)}<div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:5px">${rotation.map((p, i) => tile(p, `${i + 1}선발`, ROLE.SP)).join('')}${tile(closer, '마무리', ROLE.CL, true)}</div>
      <div style="height:10px"></div>${grp('RELIEF', '중간계투', 7, ROLE.MR)}<div style="flex:1.3;display:grid;grid-template-columns:repeat(4,1fr);gap:5px">${middle.map((p, i) => tile(p, `중계${i + 1}`, ROLE.MR)).join('')}</div>`)}</div>`;
}
function editPick(w, horizontal = false) {
  const x = selLine;
  const p = x.p;
  const cands = [...bench.filter((b) => b.type === 'batter'), ...lineup.filter((l) => l.p.id !== p.id).map((l) => l.p)].slice(0, 6);
  const cand = (c) => {
    const o = orderOf(c);
    const d = c.overall - p.overall;
    return row(c, { label: o ? `${o.order} ${o.slot}` : '벤치', color: o ? posColor(c) : '#64748b', stats: statsFor(horizontal ? w / 2 - 20 : w) >= 2 ? 2 : 0,
      right: `<b class="d" style="width:34px;text-align:right;font-size:15px;color:${d >= 0 ? '#34d399' : '#f87171'}">${d >= 0 ? '+' : ''}${d}</b><span class="btn xs ${o ? 'down' : 'up'}">${o ? '맞바꾸기' : '투입'}</span>` });
  };
  const head1 = `<div class="cut" style="--c:10px;flex:none;display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 12px 8px 8px;background:linear-gradient(90deg,color-mix(in srgb,${tone(p.overall)} 20%,transparent),rgba(6,10,19,.5));box-shadow:inset 3px 0 0 ${tone(p.overall)}">
    ${face(p, 60, 68)}<span style="min-width:0"><span style="display:flex;align-items:center;gap:6px">${chip(x.slot, posColor(p))}<b class="d" style="font-size:13px;color:#9ca3af">${x.order}번 타자</b></span>
      <b style="display:flex;align-items:center;gap:8px;margin-top:2px;font-size:20px;font-weight:900;color:#fff">${ovr(p, 26)}${p.name}</b></span>
    <span style="display:grid;grid-template-columns:repeat(4,56px);gap:8px">${keysOf(p).map(([l, k]) => stat(p, l, k)).join('')}</span></div>`;
  const summary = () => {
    const strip = (en, ko, ps, c) => `<div class="cut" style="--c:8px;display:grid;grid-template-columns:92px minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px 10px;background:rgba(255,255,255,.035)">
      <span><span class="d" style="display:block;font-size:10.5px;letter-spacing:.24em;color:${c}">${en}</span><b style="font-size:14px;color:#fff">${ko}</b></span>
      <span style="display:flex">${ps.map((q, i) => `<span class="face" style="width:30px;height:30px;border-radius:50%;margin-left:${i ? -6 : 0}px;box-shadow:0 0 0 2px #05080f;background-image:${img(q)}"></span>`).join('')}</span><span class="btn xs">편집</span></div>`;
    return `<div style="display:flex;flex-direction:column;gap:5px">${strip('LINEUP', '타순 9', lineup.map((l) => l.p), '#34d399')}${strip('ROTATION', '선발 5', rotation, ROLE.SP)}${strip('RELIEF', '중간계투 7', middle, ROLE.MR)}${strip('CLOSER', '마무리 1', [closer], ROLE.CL)}</div>`;
  };
  if (horizontal) {
    return `<div style="height:100%;display:grid;grid-template-columns:1.15fr 1fr;gap:14px">
      ${colBox(`${head1}<div style="height:8px"></div>${grp('SWAP', `${x.slot} 자리 교체 후보`, cands.length)}${list(cands.map(cand))}`)}${colBox(`${grp('ROLES', '역할', 4)}${summary()}`)}</div>`;
  }
  return colBox(`${head1}<div style="height:8px"></div>${grp('SWAP', `${x.slot} 자리 교체 후보`, cands.length)}${list(cands.map(cand))}<div style="height:10px"></div>${summary()}`, 'height:100%');
}

/* 가로 구장 아래: 타순 카드 한 줄 · 마운드 카드 한 줄 */
function editStrips() {
  const card = (p, top, c, sub) => `<div class="cut" style="--c:9px;position:relative;min-width:0;height:100%;background:#0b1220 50% 14%/cover;background-image:${img(p, 'cards')};box-shadow:inset 0 -3px 0 ${c}${p.id === sel.id ? `,inset 0 0 0 2px ${tone(p.overall)}` : ''}">
    <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.5),rgba(5,8,15,0) 30%,rgba(5,8,15,.95) 78%)"></span>
    <span style="position:absolute;left:5px;top:5px">${chip(top, c)}</span><span style="position:absolute;right:5px;top:3px">${ovr(p, 17)}</span>
    <span style="position:absolute;left:6px;right:6px;bottom:6px"><b style="display:block;font-size:12.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b>${sub ? `<span class="d" style="font-size:11px;color:#9ca3af">${sub}</span>` : ''}</span></div>`;
  return `<div style="height:100%;display:flex;flex-direction:column;gap:8px">
    ${grp('LINEUP', '타순', 9, '#34d399')}<div style="flex:1;min-height:0;display:grid;grid-template-columns:repeat(9,1fr);gap:6px">${lineup.map((x) => card(x.p, `${x.order} ${x.slot}`, posColor(x.p))).join('')}</div>
    <div style="display:grid;grid-template-columns:5fr 7fr 1.2fr;gap:14px">${grp('ROTATION', '선발', 5, ROLE.SP)}${grp('RELIEF', '중간계투', 7, ROLE.MR)}${grp('CLOSER', '마무리', 1, ROLE.CL)}</div>
    <div style="flex:1;min-height:0;display:grid;grid-template-columns:5fr 7fr 1.2fr;gap:14px">
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${rotation.map((p, i) => card(p, `${i + 1}선발`, ROLE.SP)).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">${middle.map((p, i) => card(p, `중계${i + 1}`, ROLE.MR)).join('')}</div>
      <div style="display:grid">${card(closer, '마무리', ROLE.CL)}</div></div></div>`;
}

/* ═════ 1B 확정안: 사진 구장 + 두 열 편집 — 다음 선발 · 불펜 등판 순서 · 투수 컨디션 ═════ */
// 목업용 피로: 로테이션은 1번이 다 쉬었고 뒤로 갈수록 최근에 던짐, 불펜은 어제 던진 투수 몇 명
const REST = new Map([
  ...rotation.map((p, i) => [p.id, i]),
  [bullpen[0].id, 1], [bullpen[2].id, 2], [bullpen[5].id, 1],
]);
const COND = [100, 85, 70, 55];
const condOf = (p) => COND[Math.min(3, REST.get(p.id) ?? 0)];
const condColor = (c) => (c >= 100 ? '#34d399' : c >= 85 ? '#a3e635' : c >= 70 ? '#fbbf24' : '#fb923c');
const setup = bullpen.slice(1, 3);
const relief = bullpen.slice(3);
const condCell = (p) => {
  const c = condOf(p);
  const rest = REST.get(p.id) ?? 0;
  return `<span style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:5px;width:64px">
    <span class="bar" style="height:5px"><i style="width:${c}%;background:${condColor(c)}"></i></span>
    <b class="d" style="font-size:13px;color:${condColor(c)};width:22px;text-align:right">${rest ? `-${rest}` : '✓'}</b></span>`;
};
function prow(p, label, color, { next = false } = {}) {
  const a = next ? '#60a5fa' : null;
  return `<div class="cut" style="--c:7px;flex:1 1 0;min-height:0;max-height:56px;display:grid;grid-template-columns:12px 46px 28px 22px minmax(0,1fr) 64px;gap:7px;align-items:center;padding:0 9px;background:${next ? 'linear-gradient(90deg,rgba(96,165,250,.22),rgba(6,10,19,.5))' : 'rgba(255,255,255,.035)'};box-shadow:${next ? `inset 3px 0 0 ${a},inset 0 0 0 1px rgba(96,165,250,.35)` : 'none'}">
    ${handle}${chip(label, color)}${face(p, 28, 0, 'height:calc(100% - 8px);max-height:44px')}${ovr(p, 16)}
    <span style="min-width:0;display:flex;align-items:center;gap:6px">${nm(p, 13.5)}${next ? '<b class="d" style="flex:none;padding:0 5px;font-size:11px;letter-spacing:.08em;color:#05080f;background:#60a5fa">NEXT</b>' : ''}</span>
    ${condCell(p)}</div>`;
}
function brow(x) {
  const { p } = x;
  const active = p.id === sel.id;
  const a = tone(p.overall);
  return `<div class="cut" style="--c:7px;flex:1 1 0;min-height:0;max-height:64px;display:grid;grid-template-columns:12px 20px 34px 28px 24px minmax(0,1fr) 46px;gap:7px;align-items:center;padding:0 9px;background:${active ? `linear-gradient(90deg,color-mix(in srgb,${a} 18%,transparent),rgba(6,10,19,.5))` : 'rgba(255,255,255,.035)'};box-shadow:${active ? `inset 3px 0 0 ${a}` : 'none'}">
    ${handle}<b class="d" style="font-size:17px;color:#6b7280;text-align:center">${x.order}</b>${chip(x.slot, posColor(p))}${face(p, 28, 0, 'height:calc(100% - 8px);max-height:46px')}${ovr(p, 17)}${nm(p, 14)}
    ${stat(p, '', 'power', { lab: false })}</div>`;
}
function editOneB() {
  const sub = (en, ko, n, color) => `<div class="grp" style="color:${color};margin:0 0 5px">${en} <b>${ko} ${n}</b></div>`;
  const box = (flex, rows) => `<div style="flex:${flex};min-height:0;display:flex;flex-direction:column;gap:4px">${rows.join('')}</div>`;
  return `<div style="height:100%;display:grid;grid-template-columns:1fr 1fr;gap:12px">
    ${colBox(`<div class="grp" style="color:#34d399;margin:0 0 5px">LINEUP <b>타순 9</b><span class="d" style="margin-left:auto;font-size:11px;letter-spacing:.1em;color:#6b7280">파워</span></div>${list(lineup.map(brow))}`)}
    ${colBox(`<div class="grp" style="color:${ROLE.SP};margin:0 0 5px">ROTATION <b>선발 5</b><span class="d" style="margin-left:auto;font-size:11px;letter-spacing:.1em;color:#6b7280">컨디션</span></div>
      ${box(5, rotation.map((p, i) => prow(p, `${i + 1}선발`, ROLE.SP, { next: i === 0 })))}
      <div style="height:8px"></div>${sub('BULLPEN', '불펜', 8, ROLE.MR)}
      ${box(8, [prow(bullpen[0], '마무리', ROLE.CL), ...setup.map((p) => prow(p, '셋업', '#fb923c')), ...relief.map((p, i) => prow(p, `중계${i + 1}`, ROLE.MR))])}`)}</div>`;
}
function photoDiamondNext() {
  const html = photoDiamond(132, { ...XY, LF: [17, 18], RF: [83, 18], '3B': [22, 60], '1B': [78, 60], DH: [84, 90] });
  const sp = rotation[0];
  return html.replace(`${chip('1선발', ROLE.SP)}${ovr(sp, 17)}`, `<span style="display:flex;flex-direction:column;gap:1px"><b class="d" style="font-size:10px;letter-spacing:.2em;color:#60a5fa">NEXT</b>${nm(sp, 13)}</span>${ovr(sp, 17)}`);
}

/* ═════ 조합 16안 ═════ */
const DIA = {
  1: { name: '사진 구장', fn: photoDiamond, w: 600 },
  2: { name: '가로 구장', fn: wideDiamond, h: 250 },
  3: { name: '미니 선화', fn: miniDiamond, w: 400 },
  4: { name: '불펜석 구장', fn: parkDiamond, w: 660 },
};
const ED = {
  a: { name: '탭 편집', note: '역할 탭(타순 · 선발 · 중간계투 · 마무리) 중 하나만 크게 펼쳐 순서를 끌어 바꾼다' },
  b: { name: '두 열 편집', note: '왼쪽 타순 9, 오른쪽 선발 5 · 중간계투 7 · 마무리 1을 모두 펼쳐 둔다 (가로 구장에서는 타순 · 마운드를 카드 두 줄로)' },
  c: { name: '칸 보드', note: '타순 · 선발 · 중간계투 · 마무리를 각자 칸으로 나눈 보드' },
  d: { name: '선택 교체', note: '다이아몬드에서 누른 자리의 교체 후보(벤치 · 다른 야수, 종합 차이)와 역할 요약' },
};
const DIA_NOTE = {
  1: '구장 사진 위 실제 수비 위치에 카드 토큰, 마운드에 1선발',
  2: '넓은 가로 구장을 위에 얇게 깔고 원형 토큰, 오른쪽 위에 불펜 얼굴 줄',
  3: '선화 다이아몬드를 작게 두고 아래에 타격 · 수비 · 선발 · 불펜 평균',
  4: '구장 왼쪽에 불펜석(마무리 + 중간계투 7)을 넣어 투수까지 구장 안에서 한눈에, 마운드엔 선발 5 겹침',
};
const TAB_ON = { 1: 'bat', 2: 'bat', 3: 'sp', 4: 'mr' };
const CENTER_W = 1144;
const V = [];
for (const dk of [1, 2, 3, 4]) {
  for (const ek of ['a', 'b', 'c', 'd']) {
    const d = DIA[dk];
    const e = ED[ek];
    V.push({
      id: `${dk}${ek.toUpperCase()}`, name: dk === 1 && ek === 'b' ? '확정 · 사진 구장 + 두 열 편집' : `${d.name} + ${e.name}`, note: dk === 1 && ek === 'b' ? '<b>확정안</b> — 사진 구장 위 수비 9명 · 마운드에 NEXT 선발. 오른쪽 왼쪽 열은 타순 9(컨택 · 파워), 오른쪽 열은 <b>선발 로테이션 5</b>(1선발 = NEXT, 컨디션 막대 · 남은 휴식 경기 −N / ✓)와 <b>불펜 8</b>(마무리 → 셋업 2 → 중계 5 등판 순서). 모든 줄은 ⋮⋮ 로 끌어 순서 변경, 벤치는 맨 아래.' : `<b>${d.name}</b> — ${DIA_NOTE[dk]}. <b>${e.name}</b> — ${e.note}.`,
      html: () => {
        if (d.h) { // 위 가로 구장 · 아래 편집
          const ew = CENTER_W;
          const ed = ek === 'a' ? editTabs(ew, TAB_ON[dk], 2) : ek === 'b' ? editStrips() : ek === 'c' ? editBoard(ew, true) : editPick(ew, true);
          return wrap(`${head()}<div style="flex:1;min-height:0;margin-top:12px;display:flex;flex-direction:column;gap:12px"><div style="flex:0 0 ${d.h}px">${d.fn()}</div><div style="flex:1;min-height:0">${ed}</div></div>${benchTray('mini')}`);
        }
        if (dk === 1 && ek === 'b') {
          return wrap(`${head()}<div style="flex:1;min-height:0;margin-top:12px;display:grid;grid-template-columns:480px minmax(0,1fr);gap:16px"><div style="min-height:0">${photoDiamondNext()}</div><div style="min-height:0">${editOneB()}</div></div>${benchTray('mini')}`);
        }
        const ew = CENTER_W - d.w - 16;
        const ed = ek === 'a' ? editTabs(ew, TAB_ON[dk]) : ek === 'b' ? editTwo(ew) : ek === 'c' ? editBoard(ew) : editPick(ew);
        return wrap(`${head()}<div style="flex:1;min-height:0;margin-top:12px;display:grid;grid-template-columns:${d.w}px minmax(0,1fr);gap:16px"><div style="min-height:0">${d.fn()}</div><div style="min-height:0">${ed}</div></div>${benchTray('mini')}`);
      },
    });
  }
}

/* ───── 렌더 ───── */
const only = new URLSearchParams(location.search).get('v');
document.getElementById('top').innerHTML = `<b>다이아몬드 + 편집 16안</b><a href="?" class="${only ? '' : 'on'}">전체</a>${V.map((v) => `<a href="./?v=${v.id}" class="${only === v.id ? 'on' : ''}">${v.id}</a>`).join('')}`;
const root = document.getElementById('root');
if (only) {
  const v = V.find((x) => x.id === only) || V[0];
  root.innerHTML = `<div class="note"><b>${v.id} · ${v.name}</b> — ${v.note}</div>${v.html()}`;
} else {
  root.innerHTML = `<div class="grid">${V.map((v) => `<div class="thumb"><h3><a href="./?v=${v.id}"><i>${v.id}</i>${v.name} ↗</a></h3><p>${v.note}</p><div class="frame-s">${v.html()}</div></div>`).join('')}</div>`;
}
