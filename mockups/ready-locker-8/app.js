/* 드래프트 정비 화면(ReadyScreen)을 내 라커 디자인으로 — 8안
   기존 요소는 모두 유지: TUNE UP 합계 3종 + 증감, 퓨처스 인원, 자동 라인업 · 처음 배치로 · 다시 드래프트 · 시즌 시작,
   타순 1~9, 예비(벤치), 수비 다이아몬드, 투수 로테이션 5자리(+ 빈 칸), 시너지 목록 */
import { rotation, bullpen, defense, lineup, bench, tone, img, face, chip, keysOf, stat, num, ovr, meta, posColor, statColor } from '../squad-8/common.js';

/* ───── 이 화면의 값 ───── */
const A = { bat: '#34d399', def: '#60a5fa', pit: '#f87171', syn: '#fbbf24', main: '#10b981' };
const batSum = lineup.reduce((s, x) => s + x.p.overall, 0);
const defSum = defense.filter((x) => x.slot !== 'DH').reduce((s, x) => s + x.p.overall, 0);
const ROT = [['선발 투수', 'STARTING', 'SP', rotation[0]], ['롱릴리프', 'LONG RELIEF', 'LR', bullpen[1]], ['중간 계투', 'MIDDLE RELIEF', 'MR', bullpen[2]], ['셋업맨', 'SETUP', 'SU', bullpen[3]], ['마무리', 'CLOSER', 'CL', bullpen[0]]];
const pitSum = ROT.reduce((s, [, , , p]) => s + p.overall, 0);
const TOT = [['타자 OVR 합계', batSum, +6, A.bat, 9 * 99], ['수비 OVR 합계', defSum, +2, A.def, 8 * 99], ['투수 OVR 합계', pitSum, 0, A.pit, 5 * 99]];
const SYN = [
  { n: '베이징 9전 전승', e: '능력치 +1', c: '베이징 금메달 멤버', m: 3, on: true },
  { n: 'LG 29년의 한', e: '컨택 +3', c: '오지환 · 김현수 · 박해민 · 홍창기 · 오스틴', m: 2, on: true },
  { n: '용병 트리오', e: '능력치 +3', c: '외국인 선수', m: 3, on: true },
  { n: '프랜차이즈의 기억', e: '능력치 +1', c: '최다 구단: 부산 · LG 3명 (해태=KIA)', m: 6, on: true },
  { n: '클린업 트리오', e: '파워 +2', c: '3 · 4 · 5번 타자 장타력 80 이상', m: 2, need: 3, on: false },
];
const XY = { LF: [20, 24], CF: [50, 12], RF: [80, 24], SS: [34, 46], '2B': [66, 46], SP: [50, 66], '3B': [20, 64], '1B': [80, 64], C: [50, 88], DH: [82, 88] };
const HAND = ['L', 'R', 'R', 'R', 'L', 'R', 'R', 'R', 'R'];

/* ───── 조각 (라커 문법) ───── */
const lab = (t, a = A.main, extra = '') => `<p class="lab" style="--a:${a};${extra}">${t}</p>`;
const ph = (ko, en, sumLab, sum, a) => `<div class="ph" style="--a:${a}">
  <div><h3>${ko}</h3><em>${en}</em></div><span class="sum"><small>${sumLab}</small><b style="color:${a}">${sum}</b></span></div>`;
const delta = (v) => `<em class="dl ${v > 0 ? 'up' : v < 0 ? 'dn' : ''}">${v > 0 ? '+' : ''}${v}</em>`;

/* TUNE UP 사이드 — 합계 막대 · 퓨처스 인원 · 버튼 4개 */
const tune = ({ compact = false } = {}) => `<nav class="cut frame glass side" style="--c:20px;--a:${A.main}">
  ${lab('Tune Up')}
  ${TOT.map(([t, v, d, a, max]) => `<div class="tot cut" style="--c:10px;--a:${a}">
    <span>${t}</span><span class="v"><b class="d" style="color:${a}">${v}</b>${delta(d)}</span>
    <i style="width:${Math.min(100, (v / max) * 100)}%;background:${a}"></i></div>`).join('')}
  <span class="cut" style="--c:6px;padding:5px 10px;font-size:12.5px;color:#fcd34d;background:rgba(251,191,36,.12);box-shadow:inset 0 0 0 1px rgba(251,191,36,.4)">퓨처스 유망주 4명</span>
  ${compact ? '' : `<div class="cut" style="--c:10px;margin-top:6px;padding:10px 12px;background:rgba(255,255,255,.035)">
    ${[['엔트리', '26 / 26명'], ['외국인', '3 / 3'], ['샐러리 캡 잔여', '26 CP']].map(([k, v]) => `<div class="kv"><span>${k}</span><b class="d">${v}</b></div>`).join('')}</div>`}
  <div style="margin-top:auto;display:flex;flex-direction:column;gap:8px">
    <span class="btn">자동 라인업</span><span class="btn">처음 배치로</span><span class="btn">다시 드래프트</span>
    <span class="btn pri" style="--a:${A.main};min-height:54px;font-size:16px">시즌 시작 ▶</span></div></nav>`;

/* 타순 줄 — 라커 행 문법(번호 · 포지션 · 손 · 얼굴 · 이름 · 기록 · OVR) */
const batRow = (x, i, { stats = 0, h = 0 } = {}) => {
  const p = x.p, c = posColor(p);
  return `<div class="row cut" style="--c:8px;--a:${c};${h ? `height:${h}px` : 'flex:1 1 0;min-height:0;max-height:46px'};grid-template-columns:22px 38px 18px 34px minmax(0,1fr) ${stats ? `repeat(${stats},54px) ` : ''}44px">
    <b class="d no">${i + 1}</b>${chip(x.slot, c)}<span class="hand">${HAND[i]}</span>${face(p, 34, 40)}
    <span style="min-width:0"><b class="nm">${p.name}</b><small class="mt">${meta(p)}</small></span>
    ${stats ? keysOf(p).slice(0, stats).map(([l, k]) => stat(p, l, k, { lab: false })).join('') : ''}
    ${ovr(p, 22)}</div>`;
};
const lineupPanel = (opt = {}) => `${ph('타순 라인업', 'LINEUP', '타자 OVR 합계', batSum, A.bat)}
  <div class="rows">${lineup.map((x, i) => batRow(x, i, opt)).join('')}</div>`;

/* 예비(벤치) */
const benchBox = (cols = 2) => `<div class="bnh">예비 <em>BENCH</em><small>경기에는 나서지 않고 시너지에만 보탭니다</small></div>
  <div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:6px">
    ${bench.slice(0, cols * 3).map((p) => `<div class="bc cut" style="--c:7px">${face(p, 26, 30)}${chip(p.position, posColor(p))}<b>${p.name}</b><em class="d" style="color:${tone(p.overall)}">${p.overall}</em></div>`).join('')}</div>`;

/* 수비 다이아몬드 — 라커 토큰 카드 */
const tokenOf = (p, slot, { w = 132 } = {}) => {
  const c = slot === 'SP' ? A.pit : posColor(p);
  return `<div class="tok cut" style="--c:7px;left:${XY[slot][0]}%;top:${XY[slot][1]}%;width:${w}px">
    ${face(p, 34, 40)}<span style="min-width:0"><span class="tl">${chip(slot, c)}<b class="d" style="margin-left:auto;color:${tone(p.overall)}">${p.overall}</b></span>
    <b class="nm" style="font-size:13px">${p.name}</b><small class="mt">${meta(p)}</small></span></div>`;
};
const fieldPanel = ({ head = true, w = 132 } = {}) => `${head ? ph('수비 포지션', 'DEFENSE', '수비 OVR 합계', defSum, A.def) : ''}
  <div class="fieldbox cut" style="--c:14px"><div class="field">
    ${defense.map((x) => tokenOf(x.p, x.slot, { w })).join('')}
    ${tokenOf(rotation[0], 'SP', { w })}</div></div>`;

/* 투수 로테이션 — 다섯 자리 + 빈 칸 */
const rotPanel = ({ row = false } = {}) => `${ph('투수 로테이션', 'PITCHING STAFF', '투수 OVR 합계', pitSum, A.pit)}
  <div class="rot" style="${row ? 'flex-direction:row;gap:8px' : ''}">
    ${ROT.map(([ko, en, key, p]) => `<div class="slot" style="${row ? 'flex:1' : ''}">
      <span>${ko}<em>${en}</em></span>
      <div>${[`<div class="pc cut" style="--c:7px;--a:${A.pit}">${face(p, 28, 34)}<span class="pcn">${chip(key, A.pit)}<b class="nm" style="font-size:13px">${p.name}</b><small class="mt">${meta(p)}</small></span><b class="d" style="color:${tone(p.overall)};font-size:18px">${p.overall}</b></div>`, '<span class="empty cut" style="--c:7px">＋</span>'].join('')}</div></div>`).join('')}</div>`;

/* 시너지 */
const synPanel = ({ cols = 1 } = {}) => `${ph('시너지 효과', 'SYNERGY', '적용 중', `${SYN.filter((s) => s.on).length}/13`, A.syn)}
  <div class="syn" style="${cols > 1 ? `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr))` : ''}">
    ${SYN.map((s, i) => `<div class="sc cut" style="--c:8px;--s:${['#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#60a5fa'][i % 5]};${s.on ? '' : 'opacity:.6'}">
      <span class="ic d">${s.on ? s.n[0] : '🔒'}</span>
      <span style="min-width:0"><b>${s.n}</b><span class="ef">${s.e}</span><small>${s.c}</small></span>
      <span class="tag d">${s.on ? `${s.m}명` : `${s.m}/${s.need}`}</span></div>`).join('')}</div>`;

/* 선택 선수 상세 (라커 오른쪽 판) */
const detail = () => {
  const p = lineup[0].p, a = tone(p.overall);
  return `<aside class="cut frame glass side" style="--c:20px;--a:${a};gap:12px">
    ${lab('Selected', a)}
    <div class="cut" style="--c:12px;position:relative;height:180px;background:#0b1220 60% 18%/cover;background-image:${img(p, 'cards')}">
      <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.3),rgba(5,8,15,0) 40%,#05080f)"></span>
      <span style="position:absolute;left:12px;top:8px">${ovr(p, 38)}</span>
      <b style="position:absolute;left:12px;bottom:8px;font-size:28px;font-weight:900;color:#fff">${p.name}</b></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[['타순', '1번'], ['자리', lineup[0].slot], ['CP', p.cost]].map(([k, v]) => `<div class="cut" style="--c:7px;padding:6px 10px;background:rgba(255,255,255,.045)"><div style="font-size:10px;color:#9ca3af">${k}</div><div class="d" style="font-size:19px;color:#fff">${v}</div></div>`).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:8px">${keysOf(p).map(([l, k]) => `<div style="display:grid;grid-template-columns:40px 1fr 30px;gap:10px;align-items:center;font-size:13px;color:#9ca3af">${l}<span class="bar" style="height:6px"><i style="width:${p.stats[k]}%;background:${statColor(p.stats[k], posColor(p)).bar}"></i></span><b class="d" style="text-align:right;color:${statColor(p.stats[k], posColor(p)).num}">${p.stats[k]}</b></div>`).join('')}</div>
    <div style="margin-top:auto">${synPanel()}</div></aside>`;
};

/* 탭 머리 */
const tabs = (items, on = 0) => `<div class="tabs">${items.map((t, i) => `<span class="tab ${i === on ? 'on' : ''}">${t}</span>`).join('')}</div>`;

/* 상단 바 — 라운드 · 캡 · 외국인 · 규칙 */
const topbar = () => `<header class="tb">
  <span class="btn cut" style="--c:7px;width:36px;min-height:36px;padding:0">←</span>
  <div style="line-height:1"><p class="d" style="margin:0;font-size:10px;letter-spacing:.38em;color:#6b7280">LEGEND DRAFT</p><h1 style="margin:4px 0 0;font-size:20px;font-weight:900;color:#fff">레전드 드래프트</h1></div>
  <div style="line-height:1"><p class="d" style="margin:0;font-size:10px;letter-spacing:.3em;color:#6b7280">MODE</p><b style="font-size:15px;color:${A.main}">전체 믹스</b></div>
  <div class="d" style="display:flex;align-items:baseline;gap:8px"><span style="font-size:11px;letter-spacing:.3em;color:#6b7280">ROUND</span><b style="font-size:26px;color:#fff">20</b><span style="color:#6b7280">/ 20</span></div>
  <div style="margin-left:auto;display:flex;align-items:center;gap:20px">
    <div style="width:220px"><div class="d" style="display:flex;justify-content:space-between;font-size:11px;color:#6b7280"><span>샐러리 캡 잔여</span><b style="color:#fff">26 <small style="color:#6b7280">/ 1330 CP</small></b></div>
      <div style="margin-top:4px;height:6px;background:rgba(255,255,255,.1)"><i style="display:block;height:100%;width:97%;background:${A.main};box-shadow:0 0 8px ${A.main}"></i></div></div>
    <span class="cut" style="--c:6px;padding:4px 12px;font-size:13px;color:#cbd5e1;background:rgba(255,255,255,.06)">외국인 <b style="color:#fff">3/3</b></span>
    <span class="btn cut" style="--c:7px">? 드래프트 규칙</span></div></header>`;

const screen = (body, cols) => `<div class="screen"><div class="bg"></div>${topbar()}<div class="body" style="grid-template-columns:${cols}">${body}</div></div>`;
const pan = (inner, { a = A.main, style = '', cls = '' } = {}) => `<section class="cut frame glass sec ${cls}" style="--c:20px;--a:${a};${style}">${inner}</section>`;

/* ═══════════ 8안 ═══════════ */
const V = [];
const add = (id, name, note, html) => V.push({ id, name, note, html });

/* A. 지금 구조 그대로, 라커 껍데기만 */
add('A', '라커 4열', '지금 자리 배치 그대로 — 판·줄·글자만 라커 문법으로. 왼쪽 TUNE UP, 타순, 필드, 오른쪽 투수+시너지.',
  screen([tune(), pan(`${lineupPanel()}${benchBox(2)}`, { a: A.bat }), pan(fieldPanel(), { a: A.def }),
    `<aside class="colgap">${pan(rotPanel(), { a: A.pit })}${pan(synPanel(), { a: A.syn, style: 'min-height:0' })}</aside>`].join(''),
  '272px 380px minmax(0,1fr) 390px'));

/* B. 라커 3열 — 오른쪽 한 판을 탭으로 */
add('B', '라커 3열 · 오른쪽 탭', '라커와 같은 세 칸. 필드를 크게 두고 타순 · 투수 · 시너지를 오른쪽 한 판에서 탭으로 넘긴다.',
  screen([tune(), pan(fieldPanel(), { a: A.def }),
    pan(`${tabs(['타순', '투수', '시너지'])}${lineupPanel({ stats: 2 })}${benchBox(2)}`, { a: A.bat })].join(''),
  '272px minmax(0,1fr) 430px'));

/* C. 필드 중심 · 아래 타순 띠 */
add('C', '필드 중심 · 타순 띠', '가운데는 필드만. 타순 아홉은 아래 가로 띠로 깔고 예비는 그 오른쪽에.',
  screen([tune(),
    `<div class="colgap">${pan(fieldPanel(), { a: A.def, style: 'min-height:0' })}
      ${pan(`${ph('타순 라인업', 'LINEUP', '타자 OVR 합계', batSum, A.bat)}<div class="strip">${lineup.map((x, i) => `<div class="sc9 cut" style="--c:8px;--a:${posColor(x.p)}"><b class="d no">${i + 1}</b>${face(x.p, 40, 46)}${chip(x.slot, posColor(x.p))}<b class="nm">${x.p.name}</b><em class="d" style="color:${tone(x.p.overall)}">${x.p.overall}</em></div>`).join('')}</div>`, { a: A.bat, style: 'flex:none;height:250px' })}</div>`,
    `<aside class="colgap">${pan(rotPanel(), { a: A.pit })}${pan(synPanel(), { a: A.syn })}${pan(benchBox(3), { a: '#94a3b8', style: 'flex:none' })}</aside>`].join(''),
  '272px minmax(0,1fr) 400px'));

/* D. 두 열 목록 + 오른쪽 필드 */
add('D', '왼쪽 목록 · 오른쪽 필드', '라커 내 선수처럼 왼쪽에 타순·투수 목록을 세로로 쌓고, 필드와 시너지를 오른쪽에 붙였다.',
  screen([tune({ compact: true }),
    `<div class="colgap">${pan(lineupPanel(), { a: A.bat })}${pan(rotPanel(), { a: A.pit })}</div>`,
    `<div class="colgap">${pan(fieldPanel(), { a: A.def })}${pan(`${synPanel({ cols: 2 })}`, { a: A.syn, style: 'flex:none;max-height:300px' })}</div>`,
    pan(benchBox(1), { a: '#94a3b8' })].join(''),
  '250px 400px minmax(0,1fr) 250px'));

/* E. 선수 상세 판 (라커 오른쪽 카드 되살림) */
add('E', '선수 상세 판', '라커의 오른쪽 선수 카드를 그대로. 고른 선수의 카드와 능력치가 뜨고 그 아래에 시너지가 붙는다.',
  screen([tune({ compact: true }), pan(`${lineupPanel()}${benchBox(2)}`, { a: A.bat }), pan(fieldPanel(), { a: A.def }),
    `<div class="colgap">${pan(rotPanel(), { a: A.pit, style: 'flex:none;height:330px' })}${detail()}</div>`].join(''),
  '250px 360px minmax(0,1fr) 380px'));

/* F. 가운데 탭 한 판 */
add('F', '가운데 탭 한 판', '가운데 판 하나에서 수비 · 타순 · 투수를 탭으로 넘긴다. 시너지는 오른쪽에 크게.',
  screen([tune(),
    pan(`${tabs(['수비 포지션', '타순', '투수'])}${fieldPanel({ head: false, w: 140 })}`, { a: A.def }),
    `<aside class="colgap">${pan(synPanel(), { a: A.syn })}${pan(benchBox(2), { a: '#94a3b8', style: 'flex:none' })}</aside>`].join(''),
  '272px minmax(0,1fr) 420px'));

/* G. 가로 3단 */
add('G', '가로 3단', '위는 타순 띠, 가운데는 필드와 투수 로테이션, 아래는 시너지 가로 목록.',
  screen([tune({ compact: true }),
    `<div class="colgap">
      ${pan(`${ph('타순 라인업', 'LINEUP', '타자 OVR 합계', batSum, A.bat)}<div class="strip">${lineup.map((x, i) => `<div class="sc9 cut" style="--c:8px;--a:${posColor(x.p)}"><b class="d no">${i + 1}</b>${chip(x.slot, posColor(x.p))}<b class="nm">${x.p.name}</b><em class="d" style="color:${tone(x.p.overall)}">${x.p.overall}</em></div>`).join('')}</div>`, { a: A.bat, style: 'flex:none;height:190px' })}
      <div style="flex:1;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;min-height:0">
        ${pan(fieldPanel(), { a: A.def })}${pan(rotPanel(), { a: A.pit })}</div>
      ${pan(synPanel({ cols: 3 }), { a: A.syn, style: 'flex:none;height:200px' })}</div>`,
    pan(benchBox(1), { a: '#94a3b8' })].join(''),
  '250px minmax(0,1fr) 230px'));

/* H. 라커 보드형 — 목록과 필드가 한 판 */
add('H', '라커 보드형', '라커 MY SQUAD 판을 그대로 옮겼다. 한 판 안에서 왼쪽은 타순·투수 목록, 오른쪽은 필드.',
  screen([tune(),
    pan(`<div class="head"><p class="lab">Ready</p><span class="sub">타자 ${batSum} · 수비 ${defSum} · 투수 ${pitSum}</span><div style="margin-left:auto;display:flex;gap:8px"><span class="btn">자동 라인업</span><span class="btn">처음 배치로</span></div></div>
      <div style="display:grid;grid-template-columns:400px minmax(0,1fr);gap:14px;min-height:0;flex:1;margin-top:12px">
        <div class="colgap" style="gap:12px">${lineupPanel()}${rotPanel()}</div>
        <div class="colgap" style="gap:12px">${fieldPanel()}${benchBox(3)}</div></div>`, { a: A.main }),
    pan(synPanel(), { a: A.syn })].join(''),
  '272px minmax(0,1fr) 360px'));

/* ───── 목업 껍데기 ───── */
const one = new URLSearchParams(location.search).get('v');
const top = document.getElementById('top');
top.innerHTML = `<b>정비 화면 · 라커 디자인 8안</b>${one ? '<a href="./">◀ 전체</a>' : ''}${V.map((v) => `<a class="${one === v.id ? 'on' : ''}" href="./?v=${v.id}">${v.id}. ${v.name}</a>`).join('')}`;
const root = document.getElementById('root');
root.innerHTML = one
  ? (V.find((v) => v.id === one) || V[0]).html
  : `<div class="grid">${V.map((v) => `<div class="thumb"><h3><i>${v.id}</i><a href="./?v=${v.id}">${v.name}</a></h3><p>${v.note}</p><div class="frame-s"><a href="./?v=${v.id}">${v.html}</a></div></div>`).join('')}</div>`;
