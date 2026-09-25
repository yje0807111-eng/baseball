/* 내 라커 · MY SQUAD 목업 공통: 실제 선수 26인 엔트리 · 화면 크롬 · 행 문법 */
import { SERIES } from '/src/data/seriesPlayers.js';
import { SQUAD_SIZE, SQUAD_CAP, POS_RULES, addBlockReason, squadCost, foreignCount } from '/src/myteam/rules.js';
import { posColor, statColor } from '/src/myteam/teamColor.js';

/* ───── 26인 엔트리: 선발 6 · 불펜 8 · 포수 2 · 1·2·3루 1 · 유격 2 · 외야 4 · 지명 1 ───── */
const ALL = SERIES.filter((s) => s.kind !== 'national').flatMap((s) => s.players);
const PLAN = { SP: 6, RP: 8, C: 2, '1B': 1, '2B': 1, '3B': 1, SS: 2, OF: 4, DH: 1 };
const squad = [];
const staff = {};
for (const [pos, n] of Object.entries(PLAN)) {
  for (let i = 0; i < n; i++) {
    const slots = SQUAD_SIZE - squad.length;
    const budget = Math.max(40, Math.floor((SQUAD_CAP - squadCost(squad, staff)) / Math.max(1, slots)) + (i === 0 ? 14 : -6));
    const pick = ALL.filter((p) => p.position === pos && p.cost <= budget && !addBlockReason(p, squad, staff, SQUAD_CAP)).sort((a, b) => b.overall - a.overall)[0];
    if (pick) squad.push(pick);
  }
}
const byOvr = (a, b) => b.overall - a.overall;
const SP = squad.filter((p) => p.position === 'SP').sort(byOvr);
const RP = squad.filter((p) => p.position === 'RP').sort(byOvr);
const rotation = SP.slice(0, 5);
const bullpen = RP.slice(0, 8);
// 수비 자리: C · 1B · 2B · 3B · SS · LF · CF · RF · DH (포지션별 최고 선수)
const used = new Set();
const FIELD = [['C', 'C'], ['1B', '1B'], ['2B', '2B'], ['3B', '3B'], ['SS', 'SS'], ['LF', 'OF'], ['CF', 'OF'], ['RF', 'OF'], ['DH', 'DH']];
const defense = FIELD.map(([slot, pos]) => {
  const p = squad.filter((x) => x.position === pos && !used.has(x.id)).sort(byOvr)[0];
  used.add(p.id);
  return { slot, p };
});
const lineup = [...defense].sort((a, b) => (b.p.stats.speed + b.p.stats.contact) - (a.p.stats.speed + a.p.stats.contact)).map((x, i) => ({ ...x, order: i + 1 }));
const playing = new Set([...rotation, ...bullpen, ...defense.map((x) => x.p)].map((p) => p.id));
const bench = squad.filter((p) => !playing.has(p.id)).sort(byOvr);
const cost = squadCost(squad, staff);
const sel = lineup[0].p;

/* ───── 조각 ───── */
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const img = (p, kind = 'profiles') => `url(/${kind}/${encodeURIComponent(p.id)}.webp), url(/ui/mt/silhouette-player.webp)`;
const face = (p, w, h, extra = '') => `<span class="face cut" style="--c:${Math.max(4, Math.round(w / 8))}px;width:${w}px;height:${h}px;background-image:${img(p)};${extra}"></span>`;
const chip = (t, c) => `<span class="chip" style="background:${c}">${t}</span>`;
const KEYS = { pitcher: [['구위', 'stuff'], ['제구', 'control'], ['체력', 'stamina'], ['안정', 'stability']], batter: [['파워', 'power'], ['컨택', 'contact'], ['주루', 'speed'], ['수비', 'defense']] };
const keysOf = (p) => KEYS[p.type] || KEYS.batter;
const stat = (p, label, k, { big = false, lab = true } = {}) => {
  const v = p.stats?.[k] ?? 0;
  const c = statColor(v, posColor(p));
  return `<span style="min-width:0;display:block">
    <span style="display:flex;justify-content:space-between;align-items:baseline;font-size:${big ? 12 : 11}px;color:#cbd5e1;font-weight:600">${lab ? label : ''}<b class="d" style="font-size:${big ? 16 : 14}px;color:${c.num}">${v}</b></span>
    <span class="bar" style="margin-top:3px;height:${big ? 6 : 5}px"><i style="width:${v}%;background:${c.bar}"></i></span></span>`;
};
const num = (p, k) => { const v = p.stats?.[k] ?? 0; return `<b class="d" style="font-size:16px;color:${statColor(v, posColor(p)).num}">${v}</b>`; };
const ovr = (p, size = 26) => `<b class="d" style="font-size:${size}px;font-weight:800;line-height:1;color:${tone(p.overall)};text-shadow:0 0 12px ${tone(p.overall)}66">${p.overall}</b>`;
const meta = (p) => `${p.year} ${p.team}`;
const down = '<span class="btn xs down">벤치 ↓</span>';
const SLOT_LABEL = { SP: '선발', RP: '불펜' };

/* ───── 공통 크롬: 상단 바 · 왼쪽 메뉴 · 오른쪽 상세 ───── */
const topbar = () => `<header class="tb">
  <span class="btn cut" style="--c:7px;width:36px;min-height:36px;padding:0">←</span>
  <div style="line-height:1"><p class="d" style="margin:0;font-size:10px;letter-spacing:.38em;color:#6b7280;font-weight:600">MY LOCKER</p><h1 style="margin:4px 0 0;font-size:20px;font-weight:900;color:#fff">내 라커</h1></div>
  <div style="margin-left:auto;display:flex;align-items:center;gap:24px">
    <div style="width:240px"><div class="d" style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:.2em;color:#6b7280"><span>SALARY CAP</span><b style="color:#fff">${cost.toLocaleString()} / ${SQUAD_CAP.toLocaleString()}</b></div>
      <div style="margin-top:4px;height:6px;background:rgba(255,255,255,.1)"><i style="display:block;height:100%;width:${(cost / SQUAD_CAP) * 100}%;background:#10b981;box-shadow:0 0 8px #10b981"></i></div></div>
    <span class="cut d" style="--c:6px;padding:4px 12px;background:rgba(255,255,255,.06);font-size:18px;font-weight:700;color:#fcd34d">12,400 G</span>
    <span style="font-size:14px;color:#9ca3af"><b style="color:#e5e7eb">감독</b> 감독 · 8승 5패 1무</span>
  </div></header>`;

const nav = () => `<nav class="cut frame glass nav" style="--c:20px">
  <p class="lab" style="padding:4px 4px 0">Menu</p>
  ${[['영입', `선수 검색 · ${ALL.length.toLocaleString()}명`, 'tile-locker'], ['내 선수', `${squad.length} / ${SQUAD_SIZE}명`, 'mt-card', true], ['감독·코치', '0 / 4 자리', 'silhouette-coach']].map(([t, s, i, on]) => `
    <div class="navit cut ${on ? 'on' : ''}" style="--c:8px"><span class="th cut" style="--c:6px;background-image:url(/ui/mt/${i}.webp)"></span>
      <span><b style="display:block;font-size:16px;font-weight:900;color:${on ? '#fff' : '#d1d5db'}">${t}</b><small class="d" style="font-size:11px;letter-spacing:.12em;color:#9ca3af">${s}</small></span></div>`).join('')}
  <div style="margin-top:auto">
    <p class="lab" style="font-size:10px;padding:0 4px 8px">Squad</p>
    ${POS_RULES.map((r) => { const n = squad.filter((p) => p.position === r.key).length; return `<div style="display:flex;justify-content:space-between;padding:5px 4px;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px;color:#9ca3af"><span>${r.label}</span><b class="d" style="color:#fff">${n}<small style="color:#6b7280"> / ${r.min}~${r.max}</small></b></div>`; }).join('')}
    <div style="display:flex;justify-content:space-between;padding:5px 4px;font-size:13px;color:#9ca3af"><span>외국인</span><b class="d" style="color:#fff">${foreignCount(squad)}/3</b></div>
  </div></nav>`;

const side = () => {
  const a = tone(sel.overall);
  return `<aside class="cut frame glass side" style="--a:${a}">
  <p class="lab" style="--a:${a}">My Player</p>
  <div class="cut" style="--c:12px;position:relative;height:190px;background:#0b1220 60% 18%/cover;background-image:${img(sel, 'cards')}">
    <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.35),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,#05080f)"></span>
    <span style="position:absolute;left:12px;top:8px">${ovr(sel, 40)}</span>
    <b style="position:absolute;left:12px;bottom:8px;font-size:30px;font-weight:900;color:#fff">${sel.name}</b></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
    ${[['CP', sel.cost], ['포지션', sel.position], ['시즌', sel.year]].map(([k, v]) => `<div class="cut" style="--c:7px;padding:6px 12px;background:rgba(255,255,255,.045)"><div style="font-size:10px;color:#9ca3af">${k}</div><div class="d" style="font-size:20px;font-weight:700;color:#fff">${v}</div></div>`).join('')}</div>
  <div style="display:flex;flex-direction:column;gap:8px">${keysOf(sel).map(([l, k]) => `<div style="display:grid;grid-template-columns:40px 1fr 30px;gap:10px;align-items:center;font-size:14px;color:#9ca3af">${l}<span class="bar" style="height:6px"><i style="width:${sel.stats[k]}%;background:${statColor(sel.stats[k], posColor(sel)).bar}"></i></span><b class="d" style="text-align:right;color:${statColor(sel.stats[k], posColor(sel)).num}">${sel.stats[k]}</b></div>`).join('')}</div>
  <div>${[['출전', `${lineup[0].order}번 타자 · ${lineup[0].slot}`], ['팀 종합', Math.round(squad.reduce((s, p) => s + p.overall, 0) / squad.length)]].map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.1);font-size:14px;color:#d1d5db"><span>${k}</span><b class="d" style="font-size:18px;color:#fff">${v}</b></div>`).join('')}</div>
  <div style="margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px"><span class="btn" style="min-height:52px;font-size:16px">벤치로 ↓</span><span class="btn" style="min-height:52px;font-size:16px;color:#ff5a67">방출</span></div>
</aside>`;
};

const head = (extra = '') => `<div class="head"><p class="lab">My Squad</p><span class="sub">${squad.length} / ${SQUAD_SIZE}명 · 출전 ${playing.size} · 벤치 ${bench.length} · ${cost.toLocaleString()} CP</span><div style="margin-left:auto;display:flex;gap:8px">${extra}<span class="btn">자동 채우기</span></div></div>`;

/* 벤치 트레이 — 모든 안 공통으로 맨 아래 */
const benchTray = (variant = 'card') => {
  const title = `<div class="grp" style="margin-bottom:8px;color:#94a3b8">BENCH <b>${bench.length}</b></div>`;
  if (variant === 'table') {
    return `<div class="bench cut" style="--c:12px">${title}
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px 16px">${bench.map((p) => `
        <div style="display:grid;grid-template-columns:44px 30px minmax(0,1fr) repeat(4,40px) 60px;gap:8px;align-items:center;height:32px;padding:0 8px;background:rgba(5,8,15,.5)">
          ${chip(p.position, posColor(p))}${ovr(p, 18)}<b style="font-size:14px;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name} <small style="color:#6b7280;font-weight:500">${meta(p)}</small></b>
          ${keysOf(p).map(([, k]) => `<span style="text-align:right">${num(p, k)}</span>`).join('')}<span class="btn xs up">출전 ↑</span></div>`).join('')}</div></div>`;
  }
  if (variant === 'mini') {
    return `<div class="bench cut" style="--c:12px;display:flex;align-items:center;gap:14px">
      <div class="grp" style="margin:0;flex:none;color:#94a3b8">BENCH <b>${bench.length}</b></div>
      ${bench.map((p) => `<div class="bcard cut" style="--c:8px;flex:1;grid-template-columns:40px minmax(0,1fr) auto;padding:4px 8px 4px 4px">
        ${face(p, 40, 46)}<span style="min-width:0"><b style="display:block;font-size:14px;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${chip(p.position, posColor(p))} ${p.name}</b><small style="font-size:11px;color:#6b7280">${ovr(p, 15)} · ${meta(p)}</small></span><span class="btn xs up">출전 ↑</span></div>`).join('')}</div>`;
  }
  return `<div class="bench cut" style="--c:12px">${title}
    <div style="display:grid;grid-template-columns:repeat(${Math.max(4, bench.length)},minmax(0,1fr));gap:10px">${bench.map((p) => `
      <div class="bcard cut" style="--c:9px">
        ${face(p, 52, 60)}
        <span style="min-width:0"><b style="display:flex;align-items:center;gap:6px;font-size:15px;color:#e5e7eb;white-space:nowrap">${ovr(p, 22)}<span style="overflow:hidden;text-overflow:ellipsis">${p.name}</span>${chip(p.position, posColor(p))}</b>
          <span style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:4px">${keysOf(p).slice(0, 2).map(([l, k]) => stat(p, l, k)).join('')}</span></span>
        <span class="btn xs up" style="align-self:center">출전 ↑</span></div>`).join('')}</div></div>`;
};

const wrap = (center, sectionStyle = '') => `<div class="screen"><div class="bg"></div>${topbar()}<div class="body">${nav()}<section class="cut frame glass sec" style="${sectionStyle}">${center}</section>${side()}</div></div>`;

/* ───── 행 문법 ───── */
const batRow = ({ p, slot, order }, { h = 58, on = false } = {}) => `
  <div class="cut" style="--c:8px;--a:${posColor(p)};display:grid;grid-template-columns:22px 36px 40px 34px minmax(0,1fr) repeat(4,54px) 52px;gap:10px;align-items:center;height:${h}px;padding:0 10px;background:${on ? `linear-gradient(90deg,color-mix(in srgb,${tone(p.overall)} 18%,transparent),rgba(6,10,19,.5))` : 'rgba(255,255,255,.035)'};box-shadow:${on ? `inset 3px 0 0 ${tone(p.overall)}` : 'none'}">
    <b class="d" style="font-size:18px;color:#6b7280;text-align:center">${order}</b>${chip(slot, posColor(p))}
    ${face(p, 40, Math.min(48, h - 8))}${ovr(p, 24)}
    <span style="min-width:0"><b style="display:block;font-size:15px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b><small style="font-size:11px;color:#6b7280">${meta(p)}</small></span>
    ${keysOf(p).map(([l, k]) => stat(p, l, k)).join('')}${down}</div>`;
const pitRow = (p, role, { h = 40 } = {}) => `
  <div class="cut" style="--c:7px;display:grid;grid-template-columns:30px 28px 30px minmax(0,1fr) repeat(4,50px) 52px;gap:9px;align-items:center;height:${h}px;padding:0 10px;background:rgba(255,255,255,.035)">
    ${chip(role, posColor(p))}${face(p, 28, h - 8)}${ovr(p, 20)}
    <b style="font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name} <small style="font-weight:500;color:#6b7280;font-size:11px">${meta(p)}</small></b>
    ${keysOf(p).map(([l, k]) => stat(p, l, k, { lab: false })).join('')}${down}</div>`;
const pitHead = () => `<div style="display:grid;grid-template-columns:30px 28px 30px minmax(0,1fr) repeat(4,50px) 52px;gap:9px;padding:0 10px 2px;font-size:10.5px;color:#6b7280">${'<span></span>'.repeat(4)}${KEYS.pitcher.map(([l]) => `<span>${l}</span>`).join('')}<span></span></div>`;

export { ALL, squad, rotation, bullpen, defense, lineup, playing, bench, cost, sel, tone, img, face, chip, KEYS, keysOf, stat, num, ovr, meta, down, topbar, nav, side, head, benchTray, wrap, batRow, pitRow, pitHead, posColor, statColor, SQUAD_SIZE };
