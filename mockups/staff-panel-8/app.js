/* 내 라커 · 감독·코치 — 자리 카드를 누르면 해임 대신 선택. 오른쪽 “코치진 효과” 아래에 선택한 코치 프로필 + 강화 · 해임
   강화(제안): Lv.1~5, 레벨마다 주 효과 +1(도루는 +1%p), 골드 500 · 1,000 · 1,500 · 2,000 */
import { STAFF, staffEffect } from '/src/myteam/staff.js';
import { topbar } from '../squad-8/common.js';

const VIO = '#c4b5fd';
const SLOTS = [['manager', '감독', 'manager'], ['head', '수석코치', 'head'], ['batting', '타격코치', 'batting'], ['pitching', '수비·투수코치', 'pitching']];
const byRole = (r) => STAFF.filter((s) => s.role === r);
const staff = Object.fromEntries(SLOTS.map(([k, , role], i) => [k, byRole(role)[i === 0 ? 0 : 1]]));
const LEVEL = { manager: 2, head: 1, batting: 3, pitching: 1 };
const selKey = new URLSearchParams(location.search).get('slot') || 'manager';
const sel = staff[selKey];
const lv = LEVEL[selKey];
const EFF = { bat: '타격', field: '수비', pitch: '구위', stamina: '체력', steal: '도루', clutch: '승부처' };
const fmt = (k, v) => (k === 'steal' ? `+${Math.round(v * 100)}%p` : `+${v}`);
const up = (effect, n = 1) => Object.fromEntries(Object.entries(effect).map(([k, v]) => [k, k === 'steal' ? Math.round((v + 0.01 * n) * 100) / 100 : v + n]));
const effNow = up(sel.effect, lv - 1);
const effNext = up(sel.effect, lv);
const COST = [500, 1000, 1500, 2000];
const nextCost = lv < 5 ? COST[lv - 1] : null;
const total = staffEffect(Object.fromEntries(Object.entries(staff).map(([k, s]) => [k, { ...s, effect: up(s.effect, LEVEL[k] - 1) }])));
const staffCost = Object.values(staff).reduce((s, x) => s + x.cost, 0);
const img = (s) => `url(/staff/${encodeURIComponent(s.id)}.webp), url(/ui/mt/silhouette-coach.webp)`;
const lab = (t) => `<p class="lab" style="--a:${VIO}">${t}</p>`;
const stars = (n, size = 14) => `<span style="display:inline-flex;gap:2px">${Array.from({ length: 5 }, (_, i) => `<i style="width:${size}px;height:${size}px;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);background:${i < n ? '#fde047' : 'rgba(255,255,255,.14)'}"></i>`).join('')}</span>`;
const btns = (big = true) => `<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:8px"><span class="btn pri" style="--a:${VIO};min-height:${big ? 52 : 44}px;font-size:${big ? 16 : 14}px;flex-direction:column;gap:0;line-height:1.15">강화 ▲<small style="font-size:11px;font-weight:700;opacity:.75">${nextCost ? `${nextCost.toLocaleString()} G` : 'MAX'}</small></span><span class="btn" style="min-height:${big ? 52 : 44}px;font-size:${big ? 16 : 14}px;color:#ff5a67">해임</span></div>`;
const effectSummary = (compact = false) => `
  ${lab('Staff Effect')}<h2 style="margin:-4px 0 0;font-size:${compact ? 22 : 28}px;font-weight:900;color:#fff">코치진 효과</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[['선임', '4/4'], ['코치 CP', staffCost], ['남는 CP', 2000 - 1914]].map(([k, v]) => `<div class="cut" style="--c:7px;padding:5px 10px;background:rgba(255,255,255,.045)"><div style="font-size:10px;color:#9ca3af">${k}</div><b class="d" style="font-size:19px;color:#fff">${v}</b></div>`).join('')}</div>
  <div style="display:flex;flex-wrap:wrap;gap:5px">${Object.entries(total).filter(([, v]) => v).map(([k, v]) => `<span class="cut" style="--c:5px;padding:3px 9px;font-size:13px;color:#e9d5ff;background:rgba(196,181,253,.1);box-shadow:inset 0 0 0 1px rgba(196,181,253,.35)">${EFF[k]} <b class="d" style="font-size:15px;color:${VIO}">${fmt(k, v)}</b></span>`).join('')}</div>`;
const divider = () => '<div style="height:1px;background:linear-gradient(90deg,rgba(196,181,253,.5),transparent)"></div>';

/* ───── 가운데: 자리 카드(선택 표시) + 후보 ───── */
const center = () => `<section class="cut frame glass sec" style="--a:${VIO}">
  <div class="head"><p class="lab" style="--a:${VIO}">Staff</p><span class="sub">4 / 4 자리 · 코치진 ${staffCost} CP</span></div>
  <div style="margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;height:192px">${SLOTS.map(([k, label]) => {
    const s = staff[k]; const on = k === selKey;
    return `<a href="?${new URLSearchParams({ v: new URLSearchParams(location.search).get('v') || '', slot: k })}" class="cut ${on ? 'frame' : ''}" style="--c:12px;--a:${VIO};position:relative;display:block;height:100%;overflow:hidden;background:#0b1220 60% 30%/cover;background-image:${img(s)};${on ? `box-shadow:0 0 0 2px ${VIO}, 0 0 26px -6px ${VIO}` : 'filter:brightness(.8)'}">
      <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.4),rgba(5,8,15,0) 30%,rgba(5,8,15,.92) 70%,#05080f)"></span>
      <span class="d" style="position:absolute;left:12px;top:8px;font-size:22px;font-weight:800;color:${VIO};text-shadow:0 0 16px ${VIO}88">${label}</span>
      <span style="position:absolute;right:10px;top:12px">${stars(LEVEL[k], 11)}</span>
      <span style="position:absolute;left:12px;right:12px;bottom:10px"><b style="display:block;font-size:18px;font-weight:900;color:#fff">${s.name}</b><span style="font-size:12px;color:${VIO}">${Object.entries(up(s.effect, LEVEL[k] - 1)).map(([ek, ev]) => `${EFF[ek]} ${fmt(ek, ev)}`).join(' · ')}</span></span></a>`;
  }).join('')}</div>
  <div class="grp" style="margin:14px 0 8px">${SLOTS.find(([k]) => k === selKey)[1]} 후보</div>
  <div style="display:flex;flex-direction:column;gap:6px">${byRole(SLOTS.find(([k]) => k === selKey)[2]).filter((m) => m.id !== sel.id).slice(0, 8).map((m) => `
    <div class="cut" style="--c:9px;display:grid;grid-template-columns:44px minmax(0,1fr) minmax(0,1.2fr) 60px 76px;gap:12px;align-items:center;padding:6px 12px;background:rgba(255,255,255,.035)">
      <span class="face cut" style="--c:6px;width:44px;height:52px;background-image:${img(m)};background-position:60% 25%"></span>
      <span style="min-width:0"><b style="display:block;font-size:16px;font-weight:900;color:#fff">${m.name}</b><small style="font-size:11px;color:#6b7280">${m.era} · ${m.note}</small></span>
      <span style="font-size:14px;color:${VIO}">${Object.entries(m.effect).map(([k, v]) => `${EFF[k]} ${fmt(k, v)}`).join(' · ')}</span>
      <b class="d" style="text-align:right;font-size:18px;color:#fcd34d">${m.cost}</b><span class="btn" style="--a:${VIO}">교체</span></div>`).join('')}</div></section>`;

const nav = () => `<nav class="cut frame glass nav" style="--c:20px"><p class="lab" style="padding:4px 4px 0">Menu</p>
  ${[['영입', '선수 검색 · 1,206명', 'tile-locker'], ['내 선수', '26 / 26명', 'mt-card'], ['감독·코치', '4 / 4 자리', 'silhouette-coach', true]].map(([t, s, i, on]) => `<div class="navit cut ${on ? 'on' : ''}" style="--c:8px"><span class="th cut" style="--c:6px;background-image:url(/ui/mt/${i}.webp)"></span><span><b style="display:block;font-size:16px;font-weight:900;color:${on ? '#fff' : '#d1d5db'}">${t}</b><small class="d" style="font-size:11px;letter-spacing:.12em;color:#9ca3af">${s}</small></span></div>`).join('')}</nav>`;

const aside = (inner) => `<aside class="cut frame glass side" style="--a:${VIO};gap:12px;padding:20px">${inner}</aside>`;
const V = [];

/* 1 · 가로 프로필 카드 */
V.push({ id: 'P1', name: '가로 프로필 카드', note: '효과 요약 아래 선택 코치를 가로 카드로(왼쪽 사진 · 오른쪽 이름 · 시대 · 경력 · 레벨 별). 그 아래 지금 효과, 맨 아래 강화 · 해임',
  side: () => aside(`${effectSummary()}${divider()}${lab('Selected')}
    <div class="cut" style="--c:12px;display:grid;grid-template-columns:120px 1fr;gap:12px;padding:8px;background:rgba(196,181,253,.07);box-shadow:inset 0 0 0 1px rgba(196,181,253,.3)">
      <span class="cut" style="--c:9px;height:150px;background:#0b1220 60% 25%/cover;background-image:${img(sel)}"></span>
      <span style="min-width:0;display:flex;flex-direction:column;gap:4px"><span class="d" style="font-size:12px;letter-spacing:.2em;color:${VIO}">${SLOTS.find(([k]) => k === selKey)[1]}</span>
        <b style="font-size:26px;font-weight:900;color:#fff;line-height:1.1">${sel.name}</b><span style="font-size:12.5px;color:#9ca3af">${sel.era}</span><span style="font-size:13px;color:#d1d5db">${sel.note}</span>
        <span style="margin-top:auto;display:flex;align-items:center;gap:6px">${stars(lv)}<b class="d" style="font-size:14px;color:#fde047">Lv.${lv}</b></span></span></div>
    <div>${Object.entries(effNow).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;color:#d1d5db"><span>${EFF[k]}</span><b class="d" style="font-size:17px;color:${VIO}">${fmt(k, v)}</b></div>`).join('')}</div>
    <div style="margin-top:auto">${btns()}</div>`) });

/* 2 · 세로 초상 */
V.push({ id: 'P2', name: '세로 초상', note: '선택 코치 사진을 위에 크게(위쪽 효과 요약은 칩 한 줄로 줄임). 사진 위에 이름 · 레벨, 아래 효과 칩, 버튼',
  side: () => aside(`${lab('Staff Effect')}<div style="display:flex;flex-wrap:wrap;gap:5px">${Object.entries(total).filter(([, v]) => v).map(([k, v]) => `<span style="font-size:13px;color:#e9d5ff">${EFF[k]} <b class="d" style="font-size:16px;color:${VIO}">${fmt(k, v)}</b></span>`).join('<span style="color:#4b5563">·</span>')}</div>${divider()}
    <div class="cut" style="--c:14px;position:relative;flex:1;min-height:0;background:#0b1220 60% 20%/cover;background-image:${img(sel)}">
      <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.35),rgba(5,8,15,0) 25%,rgba(5,8,15,0) 50%,#05080f 92%)"></span>
      <span style="position:absolute;left:14px;top:12px;display:flex;align-items:center;gap:8px">${stars(lv, 16)}<b class="d" style="font-size:16px;color:#fde047">Lv.${lv}</b></span>
      <span style="position:absolute;left:14px;right:14px;bottom:12px"><span class="d" style="font-size:12px;letter-spacing:.2em;color:${VIO}">${SLOTS.find(([k]) => k === selKey)[1]} · ${sel.era}</span>
        <b style="display:block;font-size:32px;font-weight:900;color:#fff">${sel.name}</b><span style="font-size:13px;color:#d1d5db">${sel.note}</span>
        <span style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">${Object.entries(effNow).map(([k, v]) => `<span class="cut" style="--c:5px;padding:3px 9px;font-size:13px;color:#05080f;background:${VIO};font-weight:800">${EFF[k]} ${fmt(k, v)}</span>`).join('')}</span></span></div>
    ${btns()}`) });

/* 3 · 기여도 막대 */
V.push({ id: 'P3', name: '기여도 막대', note: '코치진 효과를 항목 막대로 두고, 선택 코치가 보탠 몫을 막대 안에 밝게 표시. 그 아래 프로필 한 줄 + 버튼',
  side: () => {
    const maxV = Math.max(...Object.entries(total).map(([k, v]) => (k === 'steal' ? v * 100 : v)), 1);
    return aside(`${lab('Staff Effect')}<h2 style="margin:-4px 0 0;font-size:26px;font-weight:900;color:#fff">코치진 효과</h2>
      <div style="display:flex;flex-direction:column;gap:8px">${Object.entries(total).filter(([, v]) => v).map(([k, v]) => {
        const mine = effNow[k] || 0; const scale = (x) => ((k === 'steal' ? x * 100 : x) / maxV) * 100;
        return `<div style="display:grid;grid-template-columns:50px 1fr 50px;align-items:center;gap:10px;font-size:13px;color:#d1d5db"><span>${EFF[k]}</span>
          <span style="position:relative;height:10px;background:rgba(255,255,255,.07)"><i style="position:absolute;left:0;top:0;bottom:0;width:${scale(v)}%;background:rgba(196,181,253,.35)"></i><i style="position:absolute;left:0;top:0;bottom:0;width:${scale(mine)}%;background:${VIO};box-shadow:0 0 10px ${VIO}"></i></span>
          <b class="d" style="text-align:right;font-size:16px;color:#fff">${fmt(k, v)}</b></div>`;
      }).join('')}</div>
      <div style="display:flex;gap:10px;font-size:11px;color:#9ca3af"><span><i style="display:inline-block;width:10px;height:8px;margin-right:4px;background:${VIO}"></i>${sel.name}</span><span><i style="display:inline-block;width:10px;height:8px;margin-right:4px;background:rgba(196,181,253,.35)"></i>나머지 코치</span></div>
      ${divider()}
      <div class="cut" style="--c:10px;display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center;padding:8px;background:rgba(255,255,255,.04)">
        <span class="cut" style="--c:7px;height:76px;background:#0b1220 60% 25%/cover;background-image:${img(sel)}"></span>
        <span><b style="font-size:22px;font-weight:900;color:#fff">${sel.name}</b><span style="display:block;font-size:12.5px;color:#9ca3af">${SLOTS.find(([kk]) => kk === selKey)[1]} · ${sel.era} · ${sel.cost} CP</span><span style="display:flex;align-items:center;gap:6px;margin-top:3px">${stars(lv, 12)}<b class="d" style="font-size:13px;color:#fde047">Lv.${lv}</b></span></span></div>
      <div style="margin-top:auto">${btns()}</div>`);
  } });

/* 4 · 강화 미리보기 표 */
V.push({ id: 'P4', name: '강화 미리보기 표', note: '프로필 아래 “지금 → 강화 후” 표를 크게. 무엇이 얼마나 오르는지 보고 강화 버튼을 누르게',
  side: () => aside(`${effectSummary(true)}${divider()}
    <div style="display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center">
      <span class="cut" style="--c:8px;height:88px;background:#0b1220 60% 25%/cover;background-image:${img(sel)}"></span>
      <span><span class="d" style="font-size:11px;letter-spacing:.2em;color:${VIO}">${SLOTS.find(([k]) => k === selKey)[1]}</span><b style="display:block;font-size:24px;font-weight:900;color:#fff">${sel.name}</b><span style="font-size:12px;color:#9ca3af">${sel.era} · ${sel.note}</span></span></div>
    <div class="cut" style="--c:10px;padding:10px 12px;background:rgba(255,255,255,.035)">
      <div class="d" style="display:grid;grid-template-columns:1fr 70px 24px 70px;align-items:center;padding-bottom:6px;font-size:12px;letter-spacing:.14em;color:#6b7280"><span>효과</span><span style="text-align:right">Lv.${lv}</span><span></span><span style="text-align:right;color:#fde047">Lv.${lv + 1}</span></div>
      ${Object.keys(effNow).map((k) => `<div style="display:grid;grid-template-columns:1fr 70px 24px 70px;align-items:center;height:30px;border-top:1px solid rgba(255,255,255,.07);font-size:14px;color:#d1d5db"><span>${EFF[k]}</span><b class="d" style="text-align:right;font-size:17px;color:#fff">${fmt(k, effNow[k])}</b><span style="text-align:center;color:#7dd3fc">→</span><b class="d" style="text-align:right;font-size:17px;color:#34d399">${fmt(k, effNext[k])}</b></div>`).join('')}</div>
    <div style="margin-top:auto">${btns()}</div>`) });

/* 5 · 명함 */
V.push({ id: 'P5', name: '명함', note: '선택 코치를 가로 명함처럼(사진이 카드 오른쪽 절반을 채우고 왼쪽에 이름 · 자리 · 경력). 명함 아래 효과 줄 · 버튼',
  side: () => aside(`${effectSummary(true)}${divider()}
    <div class="cut" style="--c:14px;position:relative;height:200px;background:linear-gradient(90deg,#140f24 45%,transparent 75%),#0b1220 90% 22%/62% auto no-repeat;background-image:linear-gradient(90deg,#140f24 42%,rgba(20,15,36,0) 70%),${img(sel)};background-size:auto,62% auto;background-position:0 0,100% 20%;background-repeat:no-repeat;box-shadow:inset 0 0 0 1px rgba(196,181,253,.35)">
      <span style="position:absolute;left:16px;top:14px;bottom:14px;width:54%;display:flex;flex-direction:column;gap:3px">
        <span class="d" style="font-size:12px;letter-spacing:.24em;color:${VIO}">${SLOTS.find(([k]) => k === selKey)[1]}</span>
        <b style="font-size:30px;font-weight:900;color:#fff;line-height:1.05">${sel.name}</b><span style="font-size:12.5px;color:#9ca3af">${sel.era}</span>
        <span style="font-size:13px;color:#d1d5db;line-height:1.35">${sel.note}</span>
        <span style="margin-top:auto;display:flex;align-items:center;gap:6px">${stars(lv, 13)}<b class="d" style="font-size:14px;color:#fde047">Lv.${lv}</b></span></span></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${Object.entries(effNow).map(([k, v]) => `<span style="font-size:14px;color:#d1d5db">${EFF[k]} <b class="d" style="font-size:18px;color:${VIO}">${fmt(k, v)}</b></span>`).join('<span style="color:#4b5563">·</span>')}<span style="margin-left:auto;font-size:13px;color:#fcd34d" class="d">${sel.cost} CP</span></div>
    <div style="margin-top:auto">${btns()}</div>`) });

/* 6 · 레벨 트랙 */
V.push({ id: 'P6', name: '레벨 트랙', note: '프로필 아래 Lv.1~5 트랙(지나온 레벨 채움 · 다음 레벨 비용 표시). 강화가 성장 단계로 보이게',
  side: () => aside(`${effectSummary(true)}${divider()}
    <div style="display:grid;grid-template-columns:84px 1fr;gap:12px"><span class="cut" style="--c:8px;height:104px;background:#0b1220 60% 25%/cover;background-image:${img(sel)}"></span>
      <span><span class="d" style="font-size:11px;letter-spacing:.2em;color:${VIO}">${SLOTS.find(([k]) => k === selKey)[1]}</span><b style="display:block;font-size:25px;font-weight:900;color:#fff">${sel.name}</b><span style="display:block;font-size:12px;color:#9ca3af">${sel.era} · ${sel.note}</span>
        <span style="display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:6px">${Object.entries(effNow).map(([k, v]) => `<span style="font-size:13px;color:#d1d5db">${EFF[k]} <b class="d" style="font-size:16px;color:${VIO}">${fmt(k, v)}</b></span>`).join('')}</span></span></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px">${[1, 2, 3, 4, 5].map((n) => `<div style="text-align:center"><div style="height:8px;background:${n <= lv ? VIO : n === lv + 1 ? 'rgba(253,224,71,.35)' : 'rgba(255,255,255,.08)'};${n === lv + 1 ? 'box-shadow:inset 0 0 0 1px #fde047' : ''}"></div><b class="d" style="display:block;margin-top:4px;font-size:13px;color:${n <= lv ? '#fff' : n === lv + 1 ? '#fde047' : '#4b5563'}">Lv.${n}</b><small class="d" style="font-size:11px;color:#6b7280">${n === 1 ? '기본' : `${COST[n - 2].toLocaleString()}G`}</small></div>`).join('')}</div>
    <div style="margin-top:auto">${btns()}</div>`) });

/* 7 · 스탯 카드 문법 (선수 카드와 같게) */
V.push({ id: 'P7', name: '선수 카드 문법', note: '내 선수 오른쪽 카드와 같은 틀: 큰 사진 머리 · 수치 칸(CP · 레벨 · 경력) · 효과 줄 · 버튼. 화면끼리 통일감',
  side: () => aside(`${effectSummary(true)}${divider()}
    <div class="cut" style="--c:12px;position:relative;height:150px;flex:none;background:#0b1220 60% 22%/cover;background-image:${img(sel)}">
      <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.35),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,#05080f)"></span>
      <span style="position:absolute;left:12px;top:10px">${stars(lv, 15)}</span>
      <b style="position:absolute;left:12px;bottom:8px;font-size:28px;font-weight:900;color:#fff">${sel.name} <small style="font-size:13px;font-weight:600;color:#9ca3af">${SLOTS.find(([k]) => k === selKey)[1]}</small></b></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[['CP', sel.cost], ['레벨', `Lv.${lv}`], ['경력', sel.era.split('-')[0]]].map(([k, v]) => `<div class="cut" style="--c:7px;padding:5px 10px;background:rgba(255,255,255,.045)"><div style="font-size:10px;color:#9ca3af">${k}</div><b class="d" style="font-size:19px;color:#fff">${v}</b></div>`).join('')}</div>
    <p style="margin:0;font-size:13px;color:#d1d5db">${sel.note}</p>
    <div>${Object.entries(effNow).map(([k, v]) => `<div style="display:grid;grid-template-columns:48px 1fr 46px;align-items:center;gap:10px;padding:4px 0;font-size:13.5px;color:#9ca3af"><span>${EFF[k]}</span><span class="bar" style="height:6px"><i style="width:${Math.min(100, (k === 'steal' ? v * 100 : v) * 12)}%;background:${VIO}"></i></span><b class="d" style="text-align:right;font-size:16px;color:${VIO}">${fmt(k, v)}</b></div>`).join('')}</div>
    <div style="margin-top:auto">${btns()}</div>`) });

/* 8 · 접는 요약 + 큰 프로필 */
V.push({ id: 'P8', name: '작은 요약 + 큰 프로필', note: '코치진 효과는 맨 위 한 줄(선임 · CP · 효과 칩)로 접고, 남는 높이를 프로필에 몰아줌. 버튼은 판 맨 아래 고정',
  side: () => aside(`<div style="display:flex;align-items:center;justify-content:space-between">${lab('Staff Effect')}<span class="d" style="font-size:13px;color:#9ca3af">4/4 · ${staffCost} CP</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:5px">${Object.entries(total).filter(([, v]) => v).map(([k, v]) => `<span class="cut" style="--c:5px;padding:2px 8px;font-size:12.5px;color:#e9d5ff;background:rgba(196,181,253,.1)">${EFF[k]} <b class="d" style="color:${VIO}">${fmt(k, v)}</b></span>`).join('')}</div>${divider()}
    <div class="cut" style="--c:14px;position:relative;height:300px;flex:none;background:#0b1220 60% 18%/cover;background-image:${img(sel)}">
      <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.3),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 55%,#05080f)"></span>
      <span class="d" style="position:absolute;left:14px;top:12px;font-size:13px;letter-spacing:.24em;color:${VIO}">${SLOTS.find(([k]) => k === selKey)[1]}</span>
      <span style="position:absolute;right:14px;top:12px;display:flex;align-items:center;gap:6px">${stars(lv, 14)}<b class="d" style="color:#fde047">Lv.${lv}</b></span>
      <span style="position:absolute;left:14px;right:14px;bottom:12px"><b style="display:block;font-size:34px;font-weight:900;color:#fff">${sel.name}</b><span style="font-size:13px;color:#d1d5db">${sel.era} · ${sel.note}</span></span></div>
    <div style="display:grid;grid-template-columns:repeat(${Object.keys(effNow).length},1fr);gap:6px">${Object.entries(effNow).map(([k, v]) => `<div class="cut" style="--c:7px;padding:6px 10px;background:rgba(196,181,253,.08)"><div style="font-size:11px;color:#9ca3af">${EFF[k]}</div><b class="d" style="font-size:21px;color:${VIO}">${fmt(k, v)}</b></div>`).join('')}</div>
    <div style="margin-top:auto">${btns()}</div>`) });

/* ───── 렌더 ───── */
const params = new URLSearchParams(location.search);
const only = params.get('v');
const q = (v) => `?${new URLSearchParams({ ...(v ? { v } : {}), slot: selKey })}`;
document.getElementById('top').innerHTML = `<b>감독·코치 프로필 8안</b><a href="${q('')}" class="${only ? '' : 'on'}">전체</a>${V.map((v) => `<a href="${q(v.id)}" class="${only === v.id ? 'on' : ''}">${v.id}</a>`).join('')}
  <span style="margin-left:14px">선택 자리:</span>${SLOTS.map(([k, l]) => `<a href="?${new URLSearchParams({ ...(only ? { v: only } : {}), slot: k })}" class="${k === selKey ? 'on' : ''}">${l}</a>`).join('')}`;
const screen = (v) => `<div class="screen"><div class="bg"></div>${topbar()}<div class="body">${nav()}${center()}${v.side()}</div></div>`;
const root = document.getElementById('root');
if (only) {
  const v = V.find((x) => x.id === only) || V[0];
  root.innerHTML = `<div class="note"><b>${v.id} · ${v.name}</b> — ${v.note} <span style="color:#6b7280">(강화 수치 · 비용은 제안값: Lv.1~5, 레벨마다 주 효과 +1 · 도루 +1%p, 500 · 1,000 · 1,500 · 2,000 G)</span></div>${screen(v)}`;
} else {
  root.innerHTML = `<div class="grid">${V.map((v) => `<div class="thumb"><h3><a href="${q(v.id)}"><i>${v.id}</i>${v.name} ↗</a></h3><p>${v.note}</p><div class="frame-s">${screen(v)}</div></div>`).join('')}</div>`;
}
