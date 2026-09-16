/* 상단 바 8안 — 각 안을 메인/라커/상점 세 상황으로 보여 준다 */
const C = { em: '#10b981', em2: '#34d399', yel: '#fde047', sky: '#7dd3fc', vio: '#c4b5fd', red: '#f87171', gray: '#94a3b8' };
const IMG = { card: 'clutch/mt-card.webp', locker: 'clutch/tile-locker.webp', shop: 'clutch/tile-shop.webp', field: 'clutch/sim-broad.webp' };
const lab = (t, a = C.em, s = 10) => `<p class="lab" style="--a:${a};font-size:${s}px">${t}</p>`;
const chip = (t, a = C.gray) => `<span class="chip" style="--a:${a}">${t}</span>`;
const btn = (t, o = {}) => `<span class="btn ${o.pri ? 'pri' : ''}" style="--c:${o.c || 8}px;min-height:${o.h || 38}px;padding:0 ${o.px || 16}px;font-size:${o.f || 14}px">${t}</span>`;
const gauge = (pct, w = 120, c = `linear-gradient(90deg,${C.em},${C.yel})`) => `<span style="display:inline-block;width:${w}px;height:5px;background:rgba(255,255,255,.1);vertical-align:middle"><span style="display:block;width:${pct}%;height:100%;background:${c}"></span></span>`;
const avatar = (s = 40) => `<span class="cut" style="--c:7px;display:inline-block;width:${s}px;height:${s}px;background:url(${IMG.card}) center/cover"></span>`;
const stat = (k, v, c = '#fff') => `<span style="display:inline-flex;flex-direction:column;align-items:center;min-width:56px"><b class="d" style="font-size:20px;line-height:1;color:${c}">${v}</b><small style="font-size:10px;color:#6b7280">${k}</small></span>`;

/* 바 아래에 보이는 화면 맛보기 */
const body = (kind) => {
  if (kind === 'locker') return `<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:10px;padding:16px 26px">
    ${Array.from({ length: 8 }, (_, i) => `<div class="cut frame" style="--c:10px;height:120px;background:linear-gradient(180deg,rgba(14,23,38,.9),rgba(5,8,15,.95))"></div>`).join('')}</div>`;
  if (kind === 'shop') return `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:16px 26px">
    ${Array.from({ length: 5 }, () => `<div class="cut frame" style="--c:10px;height:120px;background:linear-gradient(180deg,rgba(14,23,38,.9),rgba(5,8,15,.95)),url(${IMG.shop}) center/cover;background-blend-mode:overlay"></div>`).join('')}</div>`;
  return `<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;padding:16px 26px">
    <div class="cut frame" style="--c:12px;height:120px;background:linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,.9)),url(${IMG.field}) center/cover"></div>
    <div class="cut frame" style="--c:12px;background:linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,.9)),url(${IMG.locker}) center/cover"></div>
    <div class="cut frame" style="--c:12px;background:linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,.9)),url(${IMG.shop}) center/cover"></div></div>`;
};

const SECTIONS = [['메인', 'main'], ['내 라커', 'locker'], ['상점', 'shop']];
const bars = [];

/* 1 · 표준형 */
bars.push({
  n: '1 · 표준형', note: '왼쪽에 <b>로고와 섹션 이름</b>, 가운데에 팀 요약 칩(팀 종합·엔트리·CP), 오른쪽에 골드·전적·프로필. 가장 무난하고 어느 화면에나 맞는다.',
  bar: (sec) => `<header style="height:66px;display:flex;align-items:center;gap:20px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,rgba(5,8,15,.97),rgba(5,8,15,.5))">
    ${sec === '메인' ? '' : btn('←', { px: 14 })}
    <div>${lab('Legend Draft', C.em, 9)}<b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">${sec}</b></div>
    <div style="display:flex;gap:8px;margin-left:12px">${chip('팀 종합 87', C.em2)}${chip('엔트리 26/26', C.sky)}${chip('1,942 / 2,000 CP', C.gray)}</div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:12px">${chip('💰 12,400 G', C.yel)}${chip('12승 6패 1무', C.sky)}${avatar()}${btn('설정')}</div></header>`,
});

/* 2 · 팀 중심형 */
bars.push({
  n: '2 · 팀 중심형', note: '왼쪽을 <b>팀 정체성</b>으로 채운다. 엠블럼·팀 이름·종합이 크게 들어가고 섹션 이름은 그 옆에 작게. "내 팀을 키우는 게임"이라는 인상이 가장 강하다.',
  bar: (sec) => `<header style="height:76px;display:flex;align-items:center;gap:18px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,rgba(5,8,15,.97),rgba(5,8,15,.5))">
    <span class="cut" style="--c:8px;width:46px;height:52px;display:grid;place-items:center;background:${C.em};color:#05080f;font:800 14px 'Saira Condensed'">MY</span>
    <div><b style="display:block;font-size:21px;font-weight:800;color:#fff">나의 드림팀</b>
      <span style="font-size:12px;color:#9ca3af">종합 <b class="d" style="color:${C.em2};font-size:15px">87</b> · 26/26 · 1,942 CP ${gauge(97, 90)}</span></div>
    <span style="width:1px;height:38px;background:rgba(255,255,255,.12);margin:0 6px"></span>
    <b style="font-size:17px;color:#cbd5e1">${sec}</b>
    <div style="margin-left:auto;display:flex;align-items:center;gap:12px">${chip('💰 12,400 G', C.yel)}${chip('12승 6패 1무', C.sky)}${avatar(44)}</div></header>`,
});

/* 3 · 탭 내비형 */
bars.push({
  n: '3 · 탭 내비형', note: '가운데 <b>탭이 주인공</b>. 어디서든 한 번에 다른 구역으로 갈 수 있어 이동이 가장 빠르다. 게임 클라이언트에서 가장 익숙한 형태.',
  bar: (sec) => `<header style="height:70px;display:flex;align-items:center;gap:18px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,rgba(5,8,15,.97),rgba(5,8,15,.5))">
    <div>${lab('Legend Draft', C.em, 9)}<b style="display:block;font-size:17px;font-weight:800;color:#fff">레전드 드래프트</b></div>
    <div style="display:flex;gap:4px;margin-left:16px">
      ${['메인', '내 라커', '상점', '모드', '기록'].map((t) => `<span class="cut" style="--c:8px;padding:10px 22px;font-weight:700;font-size:14px;color:${t === sec ? '#05080f' : '#9ca3af'};background:${t === sec ? C.em : 'rgba(255,255,255,.05)'}">${t}</span>`).join('')}</div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:12px">${chip('💰 12,400 G', C.yel)}${avatar()}
      <div><b style="display:block;font-size:13px;color:#fff">홍길동</b><span style="font-size:11px;color:#9ca3af">12승 6패 1무</span></div></div></header>`,
});

/* 4 · 스탯 스트립형 */
bars.push({
  n: '4 · 스탯 스트립형', note: '팀 <b>평균 스탯을 숫자로 나열</b>한다. 타선·선발·불펜·수비가 늘 보여서 팀을 고칠 때 기준이 생긴다. 라커·상점에서 특히 쓸모 있다.',
  bar: (sec) => `<header style="height:76px;display:flex;align-items:center;gap:22px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,rgba(5,8,15,.97),rgba(5,8,15,.5))">
    <div>${lab('Legend Draft', C.em, 9)}<b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">${sec}</b></div>
    <div style="display:flex;gap:6px;padding:0 6px;border-left:1px solid rgba(255,255,255,.1);border-right:1px solid rgba(255,255,255,.1);margin-left:8px">
      ${stat('종합', 87, C.em2)}${stat('타선', 88)}${stat('선발', 86)}${stat('불펜', 83)}${stat('수비', 85)}</div>
    <span style="font-size:12px;color:#9ca3af">엔트리 26/26 · 외국인 3/3<br>1,942 / 2,000 CP ${gauge(97, 70)}</span>
    <div style="margin-left:auto;display:flex;align-items:center;gap:12px">${chip('💰 12,400 G', C.yel)}${chip('12승 6패 1무', C.sky)}${avatar(44)}</div></header>`,
});

/* 5 · 알림형 */
bars.push({
  n: '5 · 알림형', note: '가운데를 <b>지금 신경 쓸 것</b>에 쓴다. 부스트 남은 경기, 시너지 한 명, 상점 갱신 같은 것이 흐른다. 정보가 늘 바뀌어 화면이 살아 있다.',
  bar: (sec) => `<header style="height:66px;display:flex;align-items:center;gap:18px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,rgba(5,8,15,.97),rgba(5,8,15,.5))">
    <div>${lab('Legend Draft', C.em, 9)}<b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">${sec}</b></div>
    <div class="cut" style="--c:8px;display:flex;align-items:center;gap:10px;margin-left:10px;padding:8px 14px;background:rgba(253,224,71,.1);box-shadow:inset 3px 0 0 ${C.yel}">
      <span>⚡</span><span style="font-size:13px;color:#e8ecf2">1994 해태 시너지 한 명 남음 · 부스트 1경기 남음</span></div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:12px">${chip('💰 12,400 G', C.yel)}${chip('팀 종합 87', C.em2)}${chip('12승 6패', C.sky)}${avatar()}</div></header>`,
});

/* 6 · 프로필(레벨)형 */
bars.push({
  n: '6 · 프로필형', note: '오른쪽에 <b>감독 프로필</b>을 크게: 아바타·레벨·경험치 바·전적. 계속 키우는 재미가 상단에 늘 보인다. 로그인 연동 뒤에 잘 맞는다.',
  bar: (sec) => `<header style="height:76px;display:flex;align-items:center;gap:18px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,rgba(5,8,15,.97),rgba(5,8,15,.5))">
    <div>${lab('Legend Draft', C.em, 9)}<b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">${sec}</b></div>
    <div style="display:flex;gap:8px;margin-left:12px">${chip('팀 종합 87', C.em2)}${chip('26/26', C.sky)}</div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:16px">
      ${chip('💰 12,400 G', C.yel)}
      <div class="cut" style="--c:10px;display:flex;align-items:center;gap:12px;padding:8px 14px;background:rgba(255,255,255,.05)">
        ${avatar(46)}
        <div><b style="display:block;font-size:15px;color:#fff">홍길동 <span class="d" style="color:${C.yel};font-size:13px">Lv.12</span></b>
          <span style="font-size:11px;color:#9ca3af">12승 6패 1무 · 다음 레벨 ${gauge(64, 90, C.sky)}</span></div></div></div></header>`,
});

/* 7 · 두 줄형 */
bars.push({
  n: '7 · 두 줄형', note: '위 줄은 <b>이동과 계정</b>, 아래 줄은 <b>팀 상태</b>(종합·스탯·CP 게이지). 정보가 많아도 겹치지 않지만 화면 높이를 12px쯤 더 쓴다.',
  bar: (sec) => `<header style="border-bottom:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,rgba(5,8,15,.97),rgba(5,8,15,.6))">
    <div style="height:54px;display:flex;align-items:center;gap:16px;padding:0 26px">
      <div>${lab('Legend Draft', C.em, 9)}</div>
      <div style="display:flex;gap:4px">${['메인', '내 라커', '상점', '모드', '기록'].map((t) => `<span class="cut" style="--c:7px;padding:7px 16px;font-weight:700;font-size:13px;color:${t === sec ? '#05080f' : '#9ca3af'};background:${t === sec ? C.em : 'transparent'}">${t}</span>`).join('')}</div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:10px">${chip('💰 12,400 G', C.yel)}${avatar(34)}<b style="font-size:13px;color:#fff">홍길동</b></div></div>
    <div style="height:38px;display:flex;align-items:center;gap:18px;padding:0 26px;background:rgba(5,8,15,.6);border-top:1px solid rgba(255,255,255,.06)">
      <b style="font-size:13px;color:#fff">나의 드림팀</b>
      <span style="font-size:12px;color:#9ca3af">종합 <b style="color:${C.em2}">87</b> · 타선 88 · 선발 86 · 불펜 83 · 수비 85</span>
      <span style="font-size:12px;color:#9ca3af">엔트리 26/26 · 외국인 3/3</span>
      <span style="margin-left:auto;font-size:12px;color:#9ca3af">1,942 / 2,000 CP ${gauge(97, 140)}</span>
      <span style="font-size:12px;color:${C.sky}">12승 6패 1무</span></div></header>`,
});

/* 8 · 상황 적응형 */
bars.push({
  n: '8 · 상황 적응형', note: '틀은 하나로 두고 <b>가운데만 화면에 맞춰 바뀐다</b>. 메인은 다음 경기, 라커는 CP·포지션 경고, 상점은 보유 골드와 갱신 시간. 늘 필요한 것만 보인다.',
  bar: (sec) => {
    const mid = sec === '메인'
      ? `<div class="cut" style="--c:8px;display:flex;align-items:center;gap:12px;padding:8px 16px;background:rgba(16,185,129,.12);box-shadow:inset 3px 0 0 ${C.em}"><span>⚾</span><span style="font-size:13px;color:#e8ecf2">다음 상대 <b style="color:#fff">AI 올스타</b> · 예상 승률 54% · 보상 300G</span></div>`
      : sec === '내 라커'
        ? `<div style="display:flex;align-items:center;gap:12px"><span style="font-size:12px;color:#9ca3af">1,942 / 2,000 CP ${gauge(97, 120)}</span>${chip('외국인 3/3', C.yel)}${chip('불펜 6/6', C.sky)}${chip('지명타자 0명 ⚠', C.red)}</div>`
        : `<div style="display:flex;align-items:center;gap:12px">${chip('오늘의 상품 8', C.yel)}${chip('갱신까지 06:12', C.gray)}${chip('보유 부스트 2', C.em2)}</div>`;
    return `<header style="height:70px;display:flex;align-items:center;gap:18px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,rgba(5,8,15,.97),rgba(5,8,15,.5))">
      ${sec === '메인' ? '' : btn('←', { px: 14 })}
      <div>${lab('Legend Draft', C.em, 9)}<b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">${sec}</b></div>
      <div style="margin-left:8px">${mid}</div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:12px">${chip('💰 12,400 G', C.yel)}${chip('팀 종합 87', C.em2)}${avatar()}</div></header>`;
  },
});

document.getElementById('root').innerHTML = bars.map((b) => `
  <div class="screen" style="height:auto;padding-bottom:10px">
    ${SECTIONS.map(([sec, kind]) => `<div style="position:relative">${b.bar(sec)}<div style="opacity:.5;pointer-events:none">${body(kind)}</div></div>`).join('')}
    <span class="d" style="position:absolute;left:0;bottom:0;z-index:9;font-size:13px;font-weight:800;letter-spacing:.3em;color:#05080f;background:var(--em);padding:3px 12px">${b.n}</span>
  </div><p class="note">${b.note}</p>`).join('');
