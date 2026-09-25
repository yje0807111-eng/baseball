import { ALL, squad, rotation, bullpen, defense, lineup, playing, bench, cost, sel, tone, img, face, chip, KEYS, keysOf, stat, num, ovr, meta, down, topbar, nav, side, head, benchTray, wrap, batRow, pitRow, pitHead, posColor, statColor, SQUAD_SIZE } from './common.js';

/* ═════════ 8안 ═════════ */
const V = [];

/* A · 공격 | 마운드 두 판 */
V.push({ id: 'A', name: '공격 | 마운드 두 판', note: '왼쪽은 <b>타순 9명</b>(수비 자리 칩 · 타격 4능력치), 오른쪽은 <b>선발 로테이션 5 + 불펜 8</b>. 출전 22명이 스크롤 없이 한 화면에, 벤치 4명은 맨 아래 카드로.',
  html: () => wrap(`${head()}
  <div style="flex:1;min-height:0;margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:18px">
    <div style="display:flex;flex-direction:column;gap:5px"><div class="grp">OFFENSE · 타순 <b>9</b></div>${lineup.map((x, i) => batRow(x, { h: 57, on: i === 0 })).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:4px">
      <div class="grp" style="--a:#60a5fa">ROTATION · 선발 <b>5</b></div>${pitHead()}${rotation.map((p, i) => pitRow(p, `${i + 1}선`, { h: 38 })).join('')}
      <div class="grp" style="margin-top:8px">BULLPEN · 불펜 <b>8</b></div>${bullpen.map((p, i) => pitRow(p, i === 0 ? 'CL' : 'RP', { h: 36 })).join('')}
    </div>
  </div>${benchTray('card')}`) });

/* B · 탭 전환 (공격 / 마운드) */
V.push({ id: 'B', name: '공격 · 마운드 탭', note: '위에서 <b>공격 · 마운드 탭</b>을 골라 한 묶음만 크게 본다. 탭에는 출전 얼굴이 작게 붙어 있어 넘기지 않아도 누가 나가는지 보인다. 행이 넓어 능력치를 막대로 크게.',
  html: () => {
    const tab = (on, title, en, list) => `<div class="cut" style="--c:10px;flex:1;display:flex;align-items:center;gap:14px;padding:10px 16px;background:${on ? 'linear-gradient(90deg,rgba(16,185,129,.24),rgba(6,10,19,.5))' : 'rgba(255,255,255,.04)'};box-shadow:${on ? 'inset 0 -3px 0 #10b981' : 'inset 0 0 0 1px rgba(255,255,255,.08)'}">
      <span><span class="d" style="display:block;font-size:11px;letter-spacing:.28em;color:${on ? '#34d399' : '#6b7280'}">${en}</span><b style="font-size:20px;font-weight:900;color:${on ? '#fff' : '#9ca3af'}">${title}</b></span>
      <span style="margin-left:auto;display:flex">${list.map((p, i) => face(p, 26, 30, `margin-left:${i ? -6 : 0}px;box-shadow:0 0 0 2px #05080f;opacity:${on ? 1 : .6}`)).join('')}</span></div>`;
    const bigRow = (x, i) => `<div class="cut" style="--c:9px;display:grid;grid-template-columns:30px 40px 48px 44px minmax(0,1.1fr) repeat(4,minmax(0,1fr)) 60px 70px;gap:14px;align-items:center;height:58px;padding:0 14px;background:${i === 0 ? 'linear-gradient(90deg,rgba(52,211,153,.16),rgba(6,10,19,.5))' : 'rgba(255,255,255,.035)'};box-shadow:${i === 0 ? 'inset 3px 0 0 #34d399' : 'none'}">
      <b class="d" style="font-size:22px;color:#6b7280;text-align:center">${x.order}</b>${chip(x.slot, posColor(x.p))}${face(x.p, 48, 52)}${ovr(x.p, 28)}
      <span style="min-width:0"><b style="display:block;font-size:17px;font-weight:900;color:#fff">${x.p.name}</b><small style="font-size:12px;color:#6b7280">${meta(x.p)}</small></span>
      ${keysOf(x.p).map(([l, k]) => stat(x.p, l, k, { big: true })).join('')}<b class="d" style="text-align:right;font-size:18px;color:#fcd34d">${x.p.cost}</b>${down}</div>`;
    return wrap(`${head()}
    <div style="display:flex;gap:10px;margin-top:12px">${tab(true, '공격 · 타순 9', 'OFFENSE', lineup.map((x) => x.p))}${tab(false, '마운드 · 선발 5 · 불펜 8', 'PITCHING', [...rotation, ...bullpen])}</div>
    <div style="flex:1;min-height:0;margin-top:10px;display:flex;flex-direction:column;gap:5px">${lineup.map(bigRow).join('')}</div>${benchTray('card')}`);
  } });

/* C · 자리 슬롯 카드 */
V.push({ id: 'C', name: '자리 슬롯 카드', note: '포지션 자리마다 <b>카드 한 칸</b>. 첫 줄 야수 9자리(C → DH, 위에 타순 번호), 둘째 줄 선발 1~5선발, 셋째 줄 불펜 8칸. 빈 자리나 약한 자리가 칸 단위로 바로 보인다.',
  html: () => {
    const fcard = ({ p, slot, order }, i) => `<div class="cut frame" style="--c:12px;--a:${posColor(p)};position:relative;height:238px;background:#0b1220 50% 12%/cover;background-image:${img(p, 'cards')}">
      <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.5),rgba(5,8,15,0) 28%,rgba(5,8,15,0) 44%,rgba(5,8,15,.95) 78%)"></span><span class="scan"></span>
      <span style="position:absolute;left:8px;top:8px;display:flex;align-items:center;gap:6px">${chip(slot, posColor(p))}<b class="d" style="font-size:13px;color:#e5e7eb">${order}번</b></span>
      <span style="position:absolute;right:8px;top:6px">${ovr(p, 26)}</span>
      <span style="position:absolute;left:8px;right:8px;bottom:8px"><b style="display:block;font-size:15px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b>
        <span style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">${stat(p, '파워', 'power')}${stat(p, '컨택', 'contact')}</span></span></div>`;
    const pcard = (p, label, h) => `<div class="cut" style="--c:10px;display:grid;grid-template-columns:${h > 100 ? 70 : 52}px minmax(0,1fr);gap:10px;align-items:center;height:${h}px;padding:6px 10px 6px 6px;background:rgba(255,255,255,.04);box-shadow:inset 0 2px 0 ${posColor(p)}">
      ${face(p, h > 100 ? 70 : 52, h - 12)}
      <span style="min-width:0"><span style="display:flex;align-items:center;gap:6px">${chip(label, posColor(p))}${ovr(p, h > 100 ? 24 : 20)}</span>
        <b style="display:block;margin-top:2px;font-size:${h > 100 ? 15 : 13}px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b>
        <span style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:3px">${stat(p, '구위', 'stuff', { lab: h > 100 })}${stat(p, '제구', 'control', { lab: h > 100 })}</span></span></div>`;
    return wrap(`${head()}
    <div style="flex:1;min-height:0;margin-top:10px;display:flex;flex-direction:column;gap:6px">
      <div class="grp">LINEUP · 수비 자리 <b>9</b></div>
      <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:8px">${defense.map((d) => fcard(lineup.find((x) => x.p.id === d.p.id))).join('')}</div>
      <div class="grp" style="margin-top:6px">ROTATION <b>5</b></div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${rotation.map((p, i) => pcard(p, `${i + 1}선발`, 112)).join('')}</div>
      <div class="grp" style="margin-top:6px">BULLPEN <b>8</b></div>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px">${bullpen.map((p, i) => pcard(p, i === 0 ? 'CL' : 'RP', 84)).join('')}</div>
    </div>${benchTray('mini')}`);
  } });

/* D · 다이아몬드 + 마운드 */
V.push({ id: 'D', name: '다이아몬드 + 마운드', note: '왼쪽 <b>구장 위에 수비 자리 그대로</b> 9명을 세우고(카드에 타순 번호), 오른쪽에 선발 로테이션 · 불펜. 수비 배치 감각이 가장 직관적.',
  html: () => {
    const XY = { C: [50, 88], '1B': [80, 58], '2B': [64, 40], SS: [36, 40], '3B': [20, 58], LF: [14, 16], CF: [50, 7], RF: [86, 16], DH: [86, 88] };
    const tok = ({ p, slot, order }) => `<div class="cut" style="--c:8px;position:absolute;left:${XY[slot][0]}%;top:${XY[slot][1]}%;transform:translate(-50%,-50%);width:200px;display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px;align-items:center;padding:4px 8px 4px 4px;background:rgba(6,10,19,.82);backdrop-filter:blur(6px);box-shadow:inset 0 -2px 0 ${posColor(p)}, inset 0 0 0 1px rgba(255,255,255,.12)">
      ${face(p, 44, 50)}<span style="min-width:0"><span style="display:flex;align-items:center;gap:5px">${chip(slot, posColor(p))}<b class="d" style="font-size:12px;color:#9ca3af">${order}번</b><span style="margin-left:auto">${ovr(p, 20)}</span></span>
      <b style="display:block;font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b></span></div>`;
    const mini = (p, label) => `<div class="cut" style="--c:7px;display:grid;grid-template-columns:36px 28px 30px minmax(0,1fr) 42px 42px;gap:8px;align-items:center;height:42px;padding:0 8px;background:rgba(255,255,255,.04)">
      ${chip(label, posColor(p))}${face(p, 28, 34)}${ovr(p, 19)}<b style="font-size:13.5px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b>${stat(p, '구위', 'stuff', { lab: false })}${stat(p, '제구', 'control', { lab: false })}</div>`;
    const mini2 = (p, label) => `<div class="cut" style="--c:7px;display:grid;grid-template-columns:28px 26px 24px minmax(0,1fr) 46px;gap:7px;align-items:center;height:42px;padding:0 8px;background:rgba(255,255,255,.04)">${chip(label, posColor(p))}${face(p, 26, 34)}${ovr(p, 17)}<b style="font-size:13px;font-weight:800;color:#fff;white-space:nowrap">${p.name}</b>${stat(p, '', 'stuff', { lab: false })}</div>`;
    return wrap(`${head()}
    <div style="flex:1;min-height:0;margin-top:12px;display:grid;grid-template-columns:640px minmax(0,1fr);gap:16px">
      <div class="cut" style="--c:14px;position:relative;background:#07130c url(/ui/field.webp) center 60%/cover"><span style="position:absolute;inset:0;background:radial-gradient(70% 70% at 50% 60%,rgba(5,8,15,.1),rgba(5,8,15,.65))"></span>
        <span class="lab" style="position:absolute;left:14px;top:12px">Defense</span>${defense.map((d) => tok(lineup.find((x) => x.p.id === d.p.id))).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <div class="grp">ROTATION <b>5</b></div>${rotation.map((p, i) => mini(p, `${i + 1}선`)).join('')}
        <div class="grp" style="margin-top:8px">BULLPEN <b>8</b></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px">${bullpen.map((p, i) => mini2(p, i === 0 ? 'CL' : 'RP')).join('')}</div>
      </div>
    </div>${benchTray('card')}`);
  } });

/* E · 세 칸 보드 (타선 · 선발 · 불펜) */
V.push({ id: 'E', name: '세 칸 보드', note: '<b>타선 · 선발 · 불펜</b> 세 칸을 나란히. 칸마다 인원 수가 머리에 크게 붙고, 선발은 한 명씩 크게(로테이션 순서가 중요해서), 불펜은 촘촘하게.',
  html: () => {
    const col = (title, en, n, body, a) => `<div class="cut" style="--c:12px;display:flex;flex-direction:column;min-height:0;padding:10px 12px;background:rgba(255,255,255,.025);box-shadow:inset 0 3px 0 ${a}">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px"><span class="d" style="font-size:11px;letter-spacing:.3em;color:${a}">${en}</span><b style="font-size:17px;font-weight:900;color:#fff">${title}</b><b class="d" style="margin-left:auto;font-size:26px;color:${a}">${n}</b></div>
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;gap:5px">${body}</div></div>`;
    const b = ({ p, slot, order }) => `<div class="cut" style="--c:7px;display:grid;grid-template-columns:20px 34px 38px minmax(0,1fr) 88px;gap:8px;align-items:center;flex:1;padding:0 8px;background:rgba(5,8,15,.5)">
      <b class="d" style="font-size:16px;color:#6b7280">${order}</b>${chip(slot, posColor(p))}${face(p, 38, 44)}
      <span style="min-width:0"><span style="display:flex;align-items:center;gap:6px">${ovr(p, 19)}<b style="font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b></span></span>
      <span style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${stat(p, '파', 'power', { lab: false })}${stat(p, '컨', 'contact', { lab: false })}</span></div>`;
    const s = (p, i) => `<div class="cut" style="--c:9px;display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px;align-items:center;flex:1;padding:6px 10px 6px 6px;background:rgba(5,8,15,.5)">
      ${face(p, 72, 90)}<span style="min-width:0"><span style="display:flex;align-items:center;gap:8px">${chip(`${i + 1}선발`, posColor(p))}${ovr(p, 24)}</span>
      <b style="display:block;margin:2px 0 4px;font-size:16px;font-weight:900;color:#fff">${p.name} <small style="font-size:11px;font-weight:500;color:#6b7280">${meta(p)}</small></b>
      <span style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${keysOf(p).map(([l, k]) => stat(p, l, k)).join('')}</span></span></div>`;
    const r = (p, i) => `<div class="cut" style="--c:7px;display:grid;grid-template-columns:30px 34px minmax(0,1fr) 100px;gap:8px;align-items:center;flex:1;padding:0 8px;background:rgba(5,8,15,.5)">
      ${chip(i === 0 ? 'CL' : 'RP', posColor(p))}${face(p, 34, 40)}<span style="display:flex;align-items:center;gap:6px;min-width:0">${ovr(p, 19)}<b style="font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b></span>
      <span style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${stat(p, '', 'stuff', { lab: false })}${stat(p, '', 'stability', { lab: false })}</span></div>`;
    return wrap(`${head()}
    <div style="flex:1;min-height:0;margin-top:12px;display:grid;grid-template-columns:1fr 1.15fr 0.95fr;gap:12px">
      ${col('타선', 'LINEUP', 9, lineup.map(b).join(''), '#34d399')}${col('선발', 'ROTATION', 5, rotation.map(s).join(''), '#60a5fa')}${col('불펜', 'BULLPEN', 8, bullpen.map(r).join(''), '#f87171')}
    </div>${benchTray('card')}`);
  } });

/* F · 공격 관점 / 수비 관점 */
V.push({ id: 'F', name: '공격 관점 · 수비 관점', note: '말 그대로 <b>공격과 수비를 따로</b>. 왼쪽 공격은 타순대로 타격 능력치만, 오른쪽 수비는 자리별 수비 능력치 + 마운드. 같은 타자라도 공격 줄과 수비 칸에 각각 나온다.',
  html: () => {
    const off = ({ p, slot, order }, i) => `<div class="cut" style="--c:8px;display:grid;grid-template-columns:26px 40px minmax(0,1fr) repeat(3,74px);gap:12px;align-items:center;height:56px;padding:0 12px;background:${i === 0 ? 'linear-gradient(90deg,rgba(52,211,153,.16),rgba(6,10,19,.5))' : 'rgba(255,255,255,.035)'};box-shadow:${i === 0 ? 'inset 3px 0 0 #34d399' : 'none'}">
      <b class="d" style="font-size:22px;color:#6b7280;text-align:center">${order}</b>${face(p, 40, 46)}
      <span style="min-width:0"><b style="display:flex;align-items:center;gap:6px;font-size:15px;font-weight:900;color:#fff">${ovr(p, 20)}${p.name}</b><small style="font-size:11px;color:#6b7280">${slot} · ${meta(p)}</small></span>
      ${stat(p, '파워', 'power', { big: true })}${stat(p, '컨택', 'contact', { big: true })}${stat(p, '주루', 'speed', { big: true })}</div>`;
    const def = ({ p, slot }) => `<div class="cut" style="--c:8px;display:grid;grid-template-columns:30px 32px minmax(0,1fr);grid-template-rows:auto auto;column-gap:8px;row-gap:3px;align-items:center;height:64px;padding:4px 10px;background:rgba(255,255,255,.035);box-shadow:inset 0 -2px 0 ${posColor(p)}">
      <b class="d" style="font-size:20px;font-weight:800;color:${posColor(p)}">${slot}</b>${face(p, 36, 44)}
      <b style="font-size:14px;font-weight:800;color:#fff;white-space:nowrap">${p.name}</b><span style="grid-column:1/-1">${stat(p, '수비', 'defense')}</span></div>`;
    const mound = (p, label, h) => `<div class="cut" style="--c:7px;display:grid;grid-template-columns:${label.length > 2 ? 30 : 30}px 26px 24px minmax(0,1fr) 62px;gap:8px;align-items:center;height:${h}px;padding:0 8px;background:rgba(255,255,255,.035)">
      ${chip(label, posColor(p))}${face(p, 26, h - 6)}${ovr(p, 16)}<b style="font-size:13px;font-weight:800;color:#fff;white-space:nowrap">${p.name}</b>${stat(p, '구위', 'stuff', { lab: false })}</div>`;
    return wrap(`${head()}
    <div style="flex:1;min-height:0;margin-top:12px;display:grid;grid-template-columns:520px minmax(0,1fr);gap:16px">
      <div style="display:flex;flex-direction:column;gap:5px"><div class="grp" style="color:#34d399">OFFENSE · 공격 <b>타순 9</b></div>${lineup.map(off).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:5px"><div class="grp" style="color:#7dd3fc">DEFENSE · 수비 <b>야수 8 · 마운드 13</b></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">${defense.filter((d) => d.slot !== 'DH').map(def).join('')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px;flex:1;min-height:0">
          <div style="display:flex;flex-direction:column;gap:4px"><div class="grp">선발 <b>5</b></div>${rotation.map((p, i) => mound(p, `${i + 1}선`, 42)).join('')}</div>
          <div style="display:flex;flex-direction:column;gap:4px"><div class="grp">불펜 <b>8</b></div>${bullpen.map((p, i) => mound(p, i === 0 ? 'CL' : 'RP', 30)).join('')}</div>
        </div>
      </div>
    </div>${benchTray('card')}`);
  } });

/* G · 기록지 표 */
V.push({ id: 'G', name: '기록지 표', note: '막대 없이 <b>숫자만 정렬한 표</b> 두 장(타순 · 투수진). 한눈에 가장 많은 숫자를 비교할 수 있고, 벤치도 같은 표 문법으로 아래에. 열 머리에서 정렬.',
  html: () => {
    const th = (cols, labels) => `<div class="d" style="display:grid;grid-template-columns:${cols};gap:8px;align-items:center;height:30px;padding:0 10px;font-size:12px;letter-spacing:.14em;color:#6b7280;border-bottom:1px solid rgba(255,255,255,.12)">${labels.map((l, i) => `<span style="${i > 2 ? 'text-align:right' : ''}">${l}</span>`).join('')}</div>`;
    const BC = '26px 40px minmax(0,1fr) 38px repeat(4,46px) 44px 58px';
    const PC = '46px minmax(0,1fr) 38px repeat(4,46px) 44px 58px';
    const br = ({ p, slot, order }, i) => `<div style="display:grid;grid-template-columns:${BC};gap:8px;align-items:center;height:44px;padding:0 10px;background:${i % 2 ? 'rgba(255,255,255,.028)' : 'transparent'}">
      <b class="d" style="font-size:17px;color:#6b7280">${order}</b>${chip(slot, posColor(p))}
      <b style="font-size:15px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b>
      <span style="text-align:right">${ovr(p, 20)}</span>${keysOf(p).map(([, k]) => `<span style="text-align:right">${num(p, k)}</span>`).join('')}<b class="d" style="text-align:right;font-size:15px;color:#fcd34d">${p.cost}</b>${down}</div>`;
    const pr = (p, label, i) => `<div style="display:grid;grid-template-columns:${PC};gap:8px;align-items:center;height:34px;padding:0 10px;background:${i % 2 ? 'rgba(255,255,255,.028)' : 'transparent'}">
      ${chip(label, posColor(p))}<b style="font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b>
      <span style="text-align:right">${ovr(p, 18)}</span>${keysOf(p).map(([, k]) => `<span style="text-align:right">${num(p, k)}</span>`).join('')}<b class="d" style="text-align:right;font-size:14px;color:#fcd34d">${p.cost}</b>${down}</div>`;
    return wrap(`${head()}
    <div style="flex:1;min-height:0;margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:18px">
      <div class="cut" style="--c:10px;background:rgba(5,8,15,.45)"><div class="grp" style="margin:8px 10px 0">OFFENSE <b>타순 9</b></div>${th(BC, ['#', '자리', '선수', 'OVR', '파워', '컨택', '주루', '수비', 'CP', ''])}${lineup.map(br).join('')}</div>
      <div class="cut" style="--c:10px;background:rgba(5,8,15,.45)"><div class="grp" style="margin:8px 10px 0">PITCHING <b>선발 5 · 불펜 8</b></div>${th(PC, ['역할', '선수', 'OVR', '구위', '제구', '체력', '안정', 'CP', ''])}
        ${rotation.map((p, i) => pr(p, `${i + 1}선발`, i)).join('')}<div style="height:1px;margin:3px 10px;background:rgba(255,255,255,.14)"></div>${bullpen.map((p, i) => pr(p, i === 0 ? '마무리' : '불펜', i)).join('')}</div>
    </div>${benchTray('table')}`);
  } });

/* H · 중계 라인업 보드 */
V.push({ id: 'H', name: '중계 라인업 보드', note: '경기 중계 화면에 뜨는 <b>STARTING LINEUP 전광판</b> 문법. 왼쪽 LED 타순판, 오른쪽 선발 로테이션은 큰 카드 5장, 불펜은 작은 카드 8장. 경기 화면과 같은 인상이라 “이대로 경기에 나간다”는 느낌이 강하다.',
  html: () => {
    const led = ({ p, slot, order }, i) => `<div style="display:grid;grid-template-columns:34px 44px minmax(0,1fr) 44px 40px;gap:10px;align-items:center;height:56px;padding:0 14px;border-bottom:1px solid rgba(253,224,71,.08);background:${i === 0 ? 'rgba(253,224,71,.08)' : 'transparent'}">
      <b class="d" style="font-size:28px;color:#fde047;text-shadow:0 0 10px #fde04788">${order}</b><b class="d" style="font-size:20px;color:${posColor(p)}">${slot}</b>
      <span style="display:flex;align-items:center;gap:10px;min-width:0">${face(p, 36, 42)}<b style="font-size:18px;font-weight:900;color:#fff;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b></span>
      <span style="text-align:right">${ovr(p, 24)}</span><span class="btn xs down">↓</span></div>`;
    const big = (p, i) => `<div class="cut frame" style="--c:12px;--a:${posColor(p)};position:relative;height:292px;background:#0b1220 50% 14%/cover;background-image:${img(p, 'cards')}">
      <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.45),rgba(5,8,15,0) 26%,rgba(5,8,15,0) 50%,rgba(5,8,15,.96) 82%)"></span><span class="scan"></span>
      <b class="d" style="position:absolute;left:10px;top:6px;font-size:34px;font-weight:800;color:#fff;text-shadow:0 2px 8px #000">${i + 1}</b><span style="position:absolute;right:10px;top:8px">${ovr(p, 28)}</span>
      <span style="position:absolute;left:10px;right:10px;bottom:10px"><span class="d" style="font-size:11px;letter-spacing:.24em;color:${posColor(p)}">STARTER</span><b style="display:block;font-size:17px;font-weight:900;color:#fff">${p.name}</b>
        <span style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:5px">${stat(p, '구위', 'stuff')}${stat(p, '제구', 'control')}</span></span></div>`;
    const small = (p, i) => `<div class="cut" style="--c:9px;position:relative;height:176px;background:#0b1220 50% 14%/cover;background-image:${img(p, 'cards')};box-shadow:inset 0 -3px 0 ${posColor(p)}">
      <span style="position:absolute;inset:0;background:linear-gradient(rgba(5,8,15,.4),rgba(5,8,15,0) 30%,rgba(5,8,15,.95) 80%)"></span>
      <span style="position:absolute;left:6px;top:6px">${chip(i === 0 ? 'CL' : 'RP', posColor(p))}</span><span style="position:absolute;right:6px;top:4px">${ovr(p, 20)}</span>
      <b style="position:absolute;left:6px;right:6px;bottom:8px;font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</b></div>`;
    return wrap(`${head()}
    <div style="flex:1;min-height:0;margin-top:12px;display:grid;grid-template-columns:440px minmax(0,1fr);gap:16px">
      <div class="cut" style="--c:12px;background:linear-gradient(180deg,#0b0f07,#050803);box-shadow:inset 0 0 0 1px rgba(253,224,71,.22)">
        <div style="display:flex;align-items:center;justify-content:space-between;height:40px;padding:0 14px;border-bottom:1px solid rgba(253,224,71,.25)"><b class="d" style="font-size:16px;letter-spacing:.3em;color:#fde047">STARTING LINEUP</b><span class="d" style="font-size:13px;color:#a3a3a3">9</span></div>
        ${lineup.map(led).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="grp">ROTATION <b>5</b></div><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${rotation.map(big).join('')}</div>
        <div class="grp" style="margin-top:6px">BULLPEN <b>8</b></div><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:7px">${bullpen.map(small).join('')}</div>
      </div>
    </div>${benchTray('mini')}`);
  } });

/* ───── 렌더: 기본은 8안 한눈 보기(절반 크기), ?v=A 로 1920×911 실제 크기 ───── */
const params = new URLSearchParams(location.search);
const only = params.get('v');
document.getElementById('top').innerHTML = `<b>내 라커 · MY SQUAD 8안</b><a href="?" class="${only ? '' : 'on'}">전체</a>${V.map((v) => `<a href="./?v=${v.id}" class="${only === v.id ? 'on' : ''}">${v.id} ${v.name}</a>`).join('')}`;
const root = document.getElementById('root');
if (only) {
  const v = V.find((x) => x.id === only) || V[0];
  root.innerHTML = `<div class="note"><b>${v.id} · ${v.name}</b> — ${v.note}</div>${v.html()}`;
} else {
  root.innerHTML = `<div class="grid">${V.map((v) => `<div class="thumb"><h3><a href="./?v=${v.id}"><i>${v.id}</i>${v.name} ↗</a></h3><p>${v.note}</p><div class="frame-s">${v.html()}</div></div>`).join('')}</div>`;
}
