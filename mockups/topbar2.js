/* 상단 바 · 스탯 스트립 변형 8안 — 드래프트 화면 헤더 문법(큰 수치 · 분절 게이지 · 구획선 · 네온 밑줄)을 가져온다 */
const C = { em: '#10b981', em2: '#34d399', yel: '#fde047', sky: '#7dd3fc', vio: '#c4b5fd', red: '#f87171', gray: '#94a3b8' };
const IMG = { card: 'clutch/mt-card.webp', locker: 'clutch/tile-locker.webp', shop: 'clutch/tile-shop.webp', field: 'clutch/sim-broad.webp' };
const SECTIONS = [['메인', 'main'], ['내 라커', 'locker'], ['상점', 'shop']];

const lab = (t, a = C.em, s = 9) => `<p class="lab" style="--a:${a};font-size:${s}px">${t}</p>`;
const chip = (t, a = C.gray) => `<span class="chip" style="--a:${a}">${t}</span>`;
const avatar = (s = 40) => `<span class="cut" style="--c:7px;display:inline-block;width:${s}px;height:${s}px;background:url(${IMG.card}) center/cover"></span>`;
const div = () => '<span style="width:1px;height:38px;background:rgba(255,255,255,.1)"></span>';
/* 분절 게이지 (드래프트 화면 샐러리 캡 바 문법) */
const seg = (pct, w = 200, n = 24, c = C.em) => `<span style="position:relative;display:inline-block;width:${w}px;height:10px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)">
  <span style="position:absolute;inset:0;width:${pct}%;background:linear-gradient(90deg,${c},${C.yel})"></span>
  <span style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 ${(w / n) - 2}px,rgba(5,8,15,.9) ${(w / n) - 2}px ${w / n}px)"></span></span>`;
/* 수치 블록 */
const stat = (k, v, o = {}) => `<span style="display:inline-flex;flex-direction:column;align-items:${o.align || 'center'};min-width:${o.w || 58}px">
  <b class="d" style="font-size:${o.f || 22}px;line-height:1;color:${o.c || '#fff'};text-shadow:${o.glow ? `0 0 16px ${o.c}66` : 'none'}">${v}</b>
  <small style="font-size:10px;letter-spacing:.14em;color:#6b7280;margin-top:3px">${k}</small></span>`;
/* 얇은 막대 스탯 */
const barStat = (k, v, c = C.em2) => `<span style="display:inline-flex;flex-direction:column;gap:4px;min-width:74px">
  <span style="display:flex;justify-content:space-between;font-size:10px;letter-spacing:.1em;color:#9ca3af">${k}<b class="d" style="font-size:13px;color:#fff">${v}</b></span>
  <span style="display:block;height:4px;background:rgba(255,255,255,.08)"><span style="display:block;width:${v}%;height:100%;background:${c}"></span></span></span>`;
const radar = (vals, size = 62) => {
  const pts = vals.map((v, i) => { const a = (Math.PI * 2 * i) / vals.length - Math.PI / 2; const r = (v / 100) * (size / 2 - 4); return `${size / 2 + Math.cos(a) * r},${size / 2 + Math.sin(a) * r}`; }).join(' ');
  const out = vals.map((_, i) => { const a = (Math.PI * 2 * i) / vals.length - Math.PI / 2; const r = size / 2 - 4; return `${size / 2 + Math.cos(a) * r},${size / 2 + Math.sin(a) * r}`; }).join(' ');
  return `<svg width="${size}" height="${size}" style="display:block"><polygon points="${out}" fill="none" stroke="rgba(255,255,255,.14)"/><polygon points="${pts}" fill="${C.em}33" stroke="${C.em2}" stroke-width="1.5"/></svg>`;
};
const scan = '<span class="scan" style="position:absolute;inset:0;opacity:.5;pointer-events:none"></span>';
const underline = (w = 300, c = C.em) => `<span style="position:absolute;left:0;bottom:-1px;width:${w}px;height:2px;background:linear-gradient(90deg,${c},transparent)"></span>`;

const body = (kind) => {
  if (kind === 'locker') return `<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:10px;padding:14px 26px">${Array.from({ length: 8 }, () => '<div class="cut frame" style="--c:10px;height:104px;background:linear-gradient(180deg,rgba(14,23,38,.9),rgba(5,8,15,.95))"></div>').join('')}</div>`;
  if (kind === 'shop') return `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:14px 26px">${Array.from({ length: 5 }, () => `<div class="cut frame" style="--c:10px;height:104px;background:linear-gradient(180deg,rgba(5,8,15,.5),rgba(5,8,15,.95)),url(${IMG.shop}) center/cover"></div>`).join('')}</div>`;
  return `<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;padding:14px 26px">
    <div class="cut frame" style="--c:12px;height:104px;background:linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,.9)),url(${IMG.field}) center/cover"></div>
    <div class="cut frame" style="--c:12px;background:linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,.9)),url(${IMG.locker}) center/cover"></div>
    <div class="cut frame" style="--c:12px;background:linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,.9)),url(${IMG.shop}) center/cover"></div></div>`;
};

const shell = (inner, h = 72) => `<header style="position:relative;height:${h}px;display:flex;align-items:center;gap:16px;padding:0 24px;border-bottom:1px solid rgba(16,185,129,.28);background:linear-gradient(180deg,rgba(5,8,15,.98),rgba(5,8,15,.55))">${scan}${underline()}${inner}</header>`;
const brand = (sec) => `<div style="min-width:150px">${lab('Legend Draft')}<b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">${sec}</b></div>`;
const gold = () => `<span class="chip" style="--a:${C.yel};font-size:13px;padding:6px 12px">💰 <b class="d" style="font-size:15px;color:#fff">12,400</b> G</span>`;
const prof = (s = 40) => `<span style="display:flex;align-items:center;gap:10px">${avatar(s)}<span><b style="display:block;font-size:13px;color:#fff">홍길동</b><span style="font-size:11px;color:#9ca3af">12승 6패 1무</span></span></span>`;

const S = [];

/* S1 · 분절 게이지 */
S.push({
  n: 'S1 · 분절 게이지', note: '드래프트 화면의 <b>샐러리 캡 바</b>를 그대로 가져왔다. 눈금이 있는 긴 게이지가 가운데를 가로질러 빈 곳이 사라진다.',
  bar: (sec) => shell(`${brand(sec)}${div()}
    <span style="display:flex;gap:10px">${stat('종합', 87, { c: C.em2, glow: 1, f: 26 })}${stat('타선', 88)}${stat('선발', 86)}${stat('불펜', 83)}${stat('수비', 85)}</span>
    ${div()}
    <span style="display:flex;flex-direction:column;gap:5px;flex:1;min-width:0">
      <span style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:.16em;color:#6b7280">SALARY CAP<b class="d" style="font-size:15px;color:#fff">1,942 <span style="color:#4b5563">/ 2,000 CP</span></b></span>
      ${seg(97, 460, 28)}</span>
    ${div()}${gold()}${chip('엔트리 26/26', C.sky)}${chip('외국인 3/3', C.yel)}${prof()}`),
});

/* S2 · 대형 수치 */
S.push({
  n: 'S2 · 대형 수치', note: '드래프트의 <b>ROUND 09/12</b> 자리처럼 팀 종합을 아주 크게 박는다. 시선이 왼쪽에서 바로 잡히고 나머지는 보조 수치로 붙는다.',
  bar: (sec) => shell(`${brand(sec)}${div()}
    <span style="display:flex;align-items:baseline;gap:8px"><span class="d" style="font-size:12px;letter-spacing:.3em;color:#6b7280">OVR</span>
      <b class="d" style="font-size:44px;line-height:1;color:#fff;text-shadow:0 0 22px ${C.em}66">87</b>
      <span class="d" style="font-size:16px;color:${C.em2}">▲2</span></span>
    ${div()}
    <span style="display:flex;gap:14px">${barStat('타선', 88)}${barStat('선발', 86, C.sky)}${barStat('불펜', 83, C.vio)}${barStat('수비', 85, C.yel)}</span>
    ${div()}
    <span style="display:flex;flex-direction:column;gap:4px"><span style="font-size:11px;color:#6b7280;letter-spacing:.16em">CAP</span>${seg(97, 180, 16)}</span>
    <span style="margin-left:auto;display:flex;align-items:center;gap:12px">${gold()}${prof(44)}</span>`, 76),
});

/* S3 · 카드 구획 */
S.push({
  n: 'S3 · 카드 구획', note: '정보를 <b>잘린 모서리 작은 판</b>으로 나눠 붙였다. 판이 줄지어 있어 빈 공간이 없고, 항목을 늘리기도 쉽다.',
  bar: (sec) => {
    const box = (t, v, a = C.gray) => `<span class="cut frame" style="--c:8px;--a:${a};display:inline-flex;flex-direction:column;justify-content:center;padding:7px 14px;background:rgba(255,255,255,.04)">
      <small style="font-size:10px;letter-spacing:.18em;color:#6b7280">${t}</small><b class="d" style="font-size:18px;color:#fff">${v}</b></span>`;
    return shell(`${brand(sec)}
      <span style="display:flex;gap:8px">${box('OVERALL', 87, C.em)}${box('타선', 88)}${box('선발', 86)}${box('불펜', 83)}${box('수비', 85)}${box('ENTRY', '26/26', C.sky)}${box('외국인', '3/3', C.yel)}${box('CP', '1,942 / 2,000', C.em2)}</span>
      <span style="margin-left:auto;display:flex;align-items:center;gap:10px">${gold()}${prof()}</span>`, 76);
  },
});

/* S4 · 레이더 */
S.push({
  n: 'S4 · 레이더', note: '팀 균형을 <b>작은 오각형 그래프</b>로 보여 준다. 숫자보다 모양이 먼저 읽혀서 약한 쪽이 한눈에 드러난다.',
  bar: (sec) => shell(`${brand(sec)}${div()}
    <span style="display:flex;align-items:center;gap:12px">${radar([88, 86, 83, 85, 87])}
      <span style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#9ca3af">
        <span>타선 <b style="color:#fff">88</b> · 선발 <b style="color:#fff">86</b></span>
        <span>불펜 <b style="color:${C.red}">83</b> · 수비 <b style="color:#fff">85</b></span>
        <span>종합 <b class="d" style="color:${C.em2};font-size:15px">87</b></span></span></span>
    ${div()}
    <span style="display:flex;flex-direction:column;gap:5px;flex:1;min-width:0">
      <span style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:.16em;color:#6b7280">SALARY CAP<b class="d" style="font-size:14px;color:#fff">1,942 / 2,000</b></span>${seg(97, 380, 24)}</span>
    ${div()}${gold()}${chip('26/26', C.sky)}${prof()}`, 80),
});

/* S5 · 막대 그래프 */
S.push({
  n: 'S5 · 막대 그래프', note: '스탯 다섯 개를 <b>막대</b>로 나란히. 수치와 길이를 같이 보여 줘 비교가 빠르고, 가운데가 촘촘하게 찬다.',
  bar: (sec) => shell(`${brand(sec)}${div()}
    <span style="display:flex;gap:16px;flex:1">${[['종합', 87, C.em], ['타선', 88, C.em2], ['선발', 86, C.sky], ['불펜', 83, C.red], ['수비', 85, C.yel]].map(([k, v, c]) => barStat(k, v, c)).join('')}</span>
    ${div()}
    <span style="display:flex;flex-direction:column;gap:4px;min-width:200px">
      <span style="display:flex;justify-content:space-between;font-size:11px;color:#6b7280;letter-spacing:.14em">CP<b class="d" style="font-size:13px;color:#fff">1,942 / 2,000</b></span>${seg(97, 200, 20)}</span>
    ${gold()}${prof()}`, 76),
});

/* S6 · 두 줄 + 밑줄 강조 */
S.push({
  n: 'S6 · 두 줄', note: '위 줄은 <b>이동과 계정</b>, 아래 줄은 <b>스탯 스트립</b>. 아래 줄에 네온 밑줄을 넣어 드래프트 화면과 가장 닮았다. 높이는 96px.',
  bar: (sec) => `<header style="position:relative;border-bottom:1px solid rgba(16,185,129,.28);background:linear-gradient(180deg,rgba(5,8,15,.98),rgba(5,8,15,.6))">${scan}
    <div style="height:56px;display:flex;align-items:center;gap:16px;padding:0 24px">
      ${lab('Legend Draft')}
      <div style="display:flex;gap:4px">${['메인', '내 라커', '상점', '모드', '기록'].map((t) => `<span class="cut" style="--c:7px;padding:7px 18px;font-weight:700;font-size:13px;color:${t === sec ? '#05080f' : '#9ca3af'};background:${t === sec ? C.em : 'transparent'}">${t}</span>`).join('')}</div>
      <span style="margin-left:auto;display:flex;align-items:center;gap:12px">${gold()}${prof(34)}</span></div>
    <div style="position:relative;height:40px;display:flex;align-items:center;gap:14px;padding:0 24px;background:rgba(2,4,8,.7);border-top:1px solid rgba(255,255,255,.06)">
      ${underline(420, C.em2)}
      <b style="font-size:13px;color:#fff">나의 드림팀</b>
      <span style="display:flex;gap:12px;font-size:12px;color:#9ca3af">
        ${['종합 87', '타선 88', '선발 86', '불펜 83', '수비 85'].map((t, i) => `<span style="color:${i === 0 ? C.em2 : '#9ca3af'}"><b style="color:#fff">${t.split(' ')[1]}</b> ${t.split(' ')[0]}</span>`).join('<span style="color:#374151">·</span>')}</span>
      <span style="margin-left:auto;display:flex;align-items:center;gap:10px;font-size:12px;color:#9ca3af">엔트리 26/26 · 외국인 3/3 · CP 1,942 / 2,000 ${seg(97, 160, 16)}</span></div></header>`,
});

/* S7 · 비교형 */
S.push({
  n: 'S7 · 비교형', note: '스탯 옆에 <b>상대·리그 평균과의 차이</b>를 붙인다. "불펜 83 (−4)"처럼 약점이 바로 보여서 다음에 뭘 살지 정하기 쉽다.',
  bar: (sec) => {
    const cmp = (k, v, d) => `<span style="display:inline-flex;flex-direction:column;align-items:center;min-width:76px">
      <span style="display:flex;align-items:baseline;gap:5px"><b class="d" style="font-size:22px;color:#fff">${v}</b><span class="d" style="font-size:12px;color:${d >= 0 ? C.em2 : C.red}">${d >= 0 ? '+' : ''}${d}</span></span>
      <small style="font-size:10px;letter-spacing:.14em;color:#6b7280">${k}</small></span>`;
    return shell(`${brand(sec)}${div()}
      <span style="display:flex;gap:6px">${cmp('종합', 87, 2)}${cmp('타선', 88, 4)}${cmp('선발', 86, 1)}${cmp('불펜', 83, -4)}${cmp('수비', 85, 0)}</span>
      <span style="font-size:11px;color:#6b7280;max-width:120px;line-height:1.4">상대 AI 올스타<br>전력 87 기준</span>
      ${div()}
      <span style="display:flex;flex-direction:column;gap:5px;flex:1;min-width:0">
        <span style="display:flex;justify-content:space-between;font-size:11px;color:#6b7280;letter-spacing:.14em">SALARY CAP<b class="d" style="font-size:14px;color:#fff">1,942 / 2,000</b></span>${seg(97, 300, 20)}</span>
      ${gold()}${prof()}`, 78);
  },
});

/* S8 · 풀블리드 네온 */
S.push({
  n: 'S8 · 풀블리드 네온', note: '구획마다 <b>배경 톤을 달리해</b> 좌우 끝까지 칸이 이어지게 했다. 사이 경계는 네온 실선. 가장 꽉 차 보이고 게임 UI 느낌이 강하다.',
  bar: (sec) => {
    const cell = (inner, o = {}) => `<span style="position:relative;display:flex;align-items:center;gap:${o.gap || 10}px;height:100%;padding:0 ${o.px || 18}px;background:${o.bg || 'transparent'};${o.grow ? 'flex:1;min-width:0;' : ''}">
      ${o.line === false ? '' : `<span style="position:absolute;right:0;top:14px;bottom:14px;width:1px;background:linear-gradient(180deg,transparent,${o.lc || 'rgba(16,185,129,.4)'},transparent)"></span>`}${inner}</span>`;
    return `<header style="position:relative;height:78px;display:flex;align-items:stretch;border-bottom:1px solid rgba(16,185,129,.35);background:linear-gradient(180deg,rgba(4,7,12,.99),rgba(5,8,15,.7))">${scan}${underline(520)}
      ${cell(`<span class="cut" style="--c:8px;width:44px;height:50px;display:grid;place-items:center;background:${C.em};color:#05080f;font:800 13px 'Saira Condensed'">MY</span>
        <span>${lab('Legend Draft')}<b style="display:block;font-size:18px;font-weight:800;color:#fff">${sec}</b></span>`, { bg: 'rgba(16,185,129,.08)' })}
      ${cell(`<b class="d" style="font-size:40px;line-height:1;color:#fff;text-shadow:0 0 24px ${C.em}55">87</b><span><small style="display:block;font-size:10px;letter-spacing:.2em;color:#6b7280">TEAM OVR</small><span class="d" style="font-size:13px;color:${C.em2}">▲2 이번 주</span></span>`)}
      ${cell(`${[['타선', 88, C.em2], ['선발', 86, C.sky], ['불펜', 83, C.red], ['수비', 85, C.yel]].map(([k, v, c]) => `<span style="display:inline-flex;flex-direction:column;align-items:center;min-width:56px"><b class="d" style="font-size:20px;color:${c}">${v}</b><small style="font-size:10px;color:#6b7280;letter-spacing:.14em">${k}</small></span>`).join('')}`, { bg: 'rgba(255,255,255,.02)' })}
      ${cell(`<span style="width:100%"><span style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:.16em;color:#6b7280">SALARY CAP<b class="d" style="font-size:15px;color:#fff">1,942 <span style="color:#4b5563">/ 2,000</span></b></span>
        <span style="display:block;margin-top:6px">${seg(97, 320, 24)}</span>
        <span style="display:flex;gap:8px;margin-top:6px">${chip('엔트리 26/26', C.sky)}${chip('외국인 3/3', C.yel)}</span></span>`, { grow: true })}
      ${cell(`${gold()}`, { bg: 'rgba(253,224,71,.06)', lc: 'rgba(253,224,71,.4)' })}
      ${cell(`${prof(46)}`, { line: false })}</header>`;
  },
});

document.getElementById('root').innerHTML = S.map((b) => `
  <div class="screen" style="height:auto;padding-bottom:10px">
    ${SECTIONS.map(([sec, kind]) => `<div style="position:relative">${b.bar(sec)}<div style="opacity:.45;pointer-events:none">${body(kind)}</div></div>`).join('')}
    <span class="d" style="position:absolute;left:0;bottom:0;z-index:9;font-size:13px;font-weight:800;letter-spacing:.3em;color:#05080f;background:var(--em);padding:3px 12px">${b.n}</span>
  </div><p class="note">${b.note}</p>`).join('');
