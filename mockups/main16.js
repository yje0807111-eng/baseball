/* 메인 화면 16안 — 공통 조각으로 조립 */
const S = [];
const C = { em: '#10b981', em2: '#34d399', yel: '#fde047', sky: '#7dd3fc', vio: '#c4b5fd', red: '#f87171', gray: '#94a3b8' };
const IMG = { bg: 'clutch/mt-bg.webp', locker: 'clutch/mt-locker.webp', tunnel: 'clutch/mt-tunnel.webp', card: 'clutch/mt-card.webp', season: 'clutch/mt-season.webp', boost: 'clutch/mt-boost.webp', pack: 'clutch/mt-pack.webp', field: 'clutch/sim-broad.webp' };
const tone = (o) => (o >= 92 ? C.yel : o >= 85 ? C.em2 : o >= 78 ? C.sky : C.gray);
const MY = [[96, '선동열', '1986 해태', 'SP'], [94, '이승엽', '2003 삼성', '1B'], [93, '이종범', '1994 해태', 'SS'], [92, '류현진', '2006 한화', 'SP'], [91, '이대호', '2010 롯데', '3B'], [90, '오승환', '2011 삼성', 'RP']];

const bg = (img = IMG.bg, grad = 'linear-gradient(180deg,rgba(3,5,10,.93) 0,rgba(3,5,10,.86) 40%,rgba(3,5,10,.96) 100%)', op = 0.9) =>
  `<div style="position:absolute;inset:0;background:url(${img}) center/cover;opacity:${op}"></div><div style="position:absolute;inset:0;background:${grad}"></div>`;
const lab = (t, a = C.em) => `<p class="lab" style="--a:${a}">${t}</p>`;
const pane = (body, o = {}) => `<div class="cut frame ${o.hot ? 'hot' : ''} ${o.glass === false ? '' : 'glass'}" style="--c:${o.c || 14}px;--a:${o.a || C.em};padding:${o.pad || '16px 18px'};${o.style || ''}">${o.label ? lab(o.label, o.a || C.em) : ''}${body}</div>`;
const card = (p, i = 0, o = {}) => {
  const [ovr, name, meta, pos] = p; const a = tone(ovr);
  const w = o.w || 132, h = o.h || 176;
  return `<div class="pc cut frame" style="--c:12px;--a:${a};width:${o.full ? '100%' : `${w}px`};height:${h}px">
    <div class="img" style="--img:url(${[IMG.card, IMG.locker, IMG.tunnel, IMG.season][i % 4]})"></div><div class="grad"></div>
    <span class="ov" style="font-size:${h < 130 ? 20 : 26}px">${ovr}</span><span class="pos">${pos}</span>
    <span class="nm" style="font-size:${h < 130 ? 12 : 15}px;bottom:${h < 130 ? 18 : 24}px">${name}</span><span class="meta">${meta}</span></div>`;
};
const cta = (t = '경기 시작', sub = 'AI 올스타 · 전력 87 · 예상 승률 54%', o = {}) => `
  <div class="cut frame hot" style="--c:${o.c || 18}px;--a:${C.em};position:relative;overflow:hidden;padding:${o.pad || '28px 32px'};background:linear-gradient(120deg,rgba(16,185,129,.28),rgba(5,8,15,.9) 62%),url(${IMG.field}) center/cover;${o.style || ''}">
    ${lab(o.label || 'Next Match')}
    <h2 style="margin:10px 0 2px;font-size:${o.big || 44}px;font-weight:800;color:#fff;text-shadow:0 4px 30px rgba(0,0,0,.6)">${o.title || '오늘의 경기'}</h2>
    <p style="margin:0 0 ${o.gap || 22}px;font-size:15px;color:#cbd5e1">${sub}</p>
    <span class="btn pri" style="--c:14px;min-height:${o.btnH || 74}px;font-size:${o.btnF || 24}px;padding:0 54px;box-shadow:0 0 50px -8px rgba(16,185,129,.9)">${t} ▶</span>
    ${o.extra || ''}</div>`;
const teamCard = (o = {}) => pane(`
  <h2 style="margin:8px 0 2px;font-size:${o.big || 30}px;font-weight:800;color:#fff">나의 드림팀</h2>
  <p style="margin:0;font-size:13px;color:#cbd5e1">엔트리 26/26 · 코치진 4/4 · 팀 종합 <b class="d" style="font-size:18px;color:${C.em2}">87</b></p>
  <div class="bar" style="margin-top:14px"><i style="width:97%;background:linear-gradient(90deg,var(--em),var(--yel))"></i></div>
  <p style="margin:6px 0 0;font-size:12px;color:#9ca3af">1,942 / 2,000 CP</p>
  <div style="display:flex;gap:8px;margin-top:16px">${MY.slice(0, o.n || 3).map((p, i) => card(p, i, { w: o.cw || 104, h: o.ch || 138 })).join('')}</div>
  ${o.btn === false ? '' : `<span class="btn" style="--c:12px;width:100%;margin-top:16px;min-height:${o.btnH || 54}px;font-size:16px">내 라커 들어가기</span>`}`,
  { label: 'My Locker', hot: true, c: 16, style: `position:relative;overflow:hidden;background:linear-gradient(160deg,rgba(16,185,129,.18),rgba(5,8,15,.92) 55%),url(${IMG.locker}) center/cover;${o.style || ''}` });
const lineupMini = (o = {}) => pane(`
  <div style="display:grid;grid-template-columns:repeat(${o.cols || 5},1fr);gap:10px;margin-top:12px">
    ${MY.slice(0, o.cols || 5).map((p, i) => card(p, i, { full: true, h: o.h || 150 })).join('')}
  </div>`, { label: o.label || 'Today Lineup', a: C.sky, ...o.pane });
const questRow = (t, s, c = C.em2, act = '보러 가기') => `<div class="cut" style="--c:9px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:11px 13px;background:rgba(5,8,15,.66);box-shadow:inset 3px 0 0 ${c}">
  <span style="font-size:19px">${s.icon || '⚡'}</span><div><b style="display:block;font-size:14px;color:#fff">${t}</b><span style="font-size:12px;color:#9ca3af">${s.desc}</span></div>
  <span class="btn" style="--c:7px;min-height:30px;padding:0 12px;font-size:12px">${act}</span></div>`;
const shopMini = (o = {}) => pane(`<div style="display:${o.rowMode ? 'grid' : 'flex'};${o.rowMode ? 'grid-template-columns:repeat(3,1fr);' : 'flex-direction:column;'}gap:10px;margin-top:12px">
    ${[['에너지 드링크', 120, C.em2, IMG.boost], ['레전드 팩', 450, C.yel, IMG.pack], ['타격 특훈', 300, C.sky, IMG.boost]].map(([t, p, c, img]) => `
      <div class="cut" style="--c:9px;display:${o.rowMode ? 'block' : 'grid'};${o.rowMode ? '' : 'grid-template-columns:48px 1fr auto;'}gap:10px;align-items:center;padding:9px 11px;background:rgba(5,8,15,.66);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)">
        <div class="cut" style="--c:6px;${o.rowMode ? 'height:64px' : 'width:48px;height:48px'};background:url(${img}) center/cover"></div>
        <b style="display:block;font-size:13px;color:#fff;${o.rowMode ? 'margin-top:8px' : ''}">${t}</b>
        <span class="d" style="font-size:15px;color:${c}">${p}G</span></div>`).join('')}
  </div>`, { label: o.label || 'Shop', a: C.yel, ...o.pane });
const modeList = (o = {}) => pane(`<div style="display:${o.rowMode ? 'grid' : 'flex'};${o.rowMode ? 'grid-template-columns:repeat(3,1fr);' : 'flex-direction:column;'}gap:10px;margin-top:12px">
    ${[['레전드 드래프트', '랜덤 시즌 한 판', 1], ['감독 리그', '다른 감독과 대결 · 준비 중', 0], ['주간 도전', '조건 팀 짜기 · 준비 중', 0]].map(([t, d, on]) => `
      <div class="cut ${on ? 'frame' : ''}" style="--c:9px;--a:${C.vio};padding:11px 13px;background:${on ? 'rgba(196,181,253,.1)' : 'rgba(5,8,15,.6)'};opacity:${on ? 1 : .5}">
        <b style="display:block;font-size:15px;color:#fff">${t}</b><span style="font-size:12px;color:#9ca3af">${d}</span></div>`).join('')}
  </div>`, { label: o.label || 'Modes', a: C.vio, ...o.pane });
const topbar = (title = '메인', o = {}) => `<header style="position:relative;height:66px;display:flex;align-items:center;gap:20px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,rgba(5,8,15,.96),rgba(5,8,15,.35))">
  <div><p class="lab" style="font-size:9px">Legend Draft</p><b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">${title}</b></div>
  ${o.tabs ? `<div style="display:flex;gap:4px;margin-left:24px">${o.tabs.map((t, i) => `<span class="cut" style="--c:8px;padding:9px 20px;font-weight:700;font-size:14px;color:${i === (o.active ?? 0) ? '#05080f' : '#9ca3af'};background:${i === (o.active ?? 0) ? C.em : 'rgba(255,255,255,.05)'}">${t}</span>`).join('')}</div>` : ''}
  <div style="margin-left:auto;display:flex;align-items:center;gap:12px">
    <span class="chip" style="--a:${C.yel}">💰 12,400 G</span><span class="chip" style="--a:${C.em2}">감독 홍길동</span>
    <span class="btn" style="--c:8px;min-height:38px">설정</span></div></header>`;
const grid = (cols, rows, body, pad = '18px 26px') => `<div style="position:relative;display:grid;grid-template-columns:${cols};grid-template-rows:${rows};gap:16px;padding:${pad};height:calc(911px - 66px)">${body}</div>`;

/* ═════════ A안 — 지적 반영 (경기 CTA 중심 3분할) ═════════ */
S.push({ n: 'A1 · 중앙 히어로(위)', note: '가운데 위가 <b>경기 시작</b>. 그 아래 오늘 라인업 요약, 맨 아래 추천은 얇은 띠. 왼쪽은 팀 카드 하나로 통합, 오른쪽은 상점 배너 + 모드 목록으로 정리.', h: `
${bg()}${topbar()}
${grid('380px minmax(0,1fr) 320px', 'minmax(0,1fr) auto auto', `
  <div style="grid-row:1 / span 3">${teamCard({ style: 'height:100%' })}</div>
  ${cta('경기 시작', 'AI 올스타 · 전력 87 · 예상 승률 54%', { style: 'grid-column:2' })}
  <div style="grid-column:2">${lineupMini({ cols: 5, h: 132 })}</div>
  <div style="grid-column:2">${pane(`<div style="display:flex;gap:10px;margin-top:10px">${[['⚡', '이종범을 넣으면 1994 해태 시너지 3/3'], ['🎯', '불펜이 얇습니다 · 마무리 추천'], ['💰', '오늘의 상품 30% 할인']].map(([i, t]) => `<div class="cut" style="--c:8px;flex:1;display:flex;gap:10px;align-items:center;padding:10px 12px;background:rgba(5,8,15,.6)"><span>${i}</span><span style="font-size:13px;color:#cbd5e1">${t}</span></div>`).join('')}</div>`, { label: 'Today', a: C.yel })}</div>
  <div style="grid-row:1 / span 2;grid-column:3;display:grid;grid-template-rows:auto 1fr;gap:16px">${shopMini()}${modeList()}</div>
  <div style="grid-column:3">${pane('<p style="margin:10px 0 0;font-size:13px;color:#9ca3af">12승 6패 1무 · 최근 3연승</p>', { label: 'Record', a: C.sky })}</div>`)}` });

S.push({ n: 'A2 · 중앙 히어로(아래)', note: '위쪽에 상대 정보와 라인업을 먼저 보여 주고 <b>아래에 큰 경기 시작</b>. 시선이 위에서 아래로 흐르며 마지막에 버튼에서 멈춘다.', h: `
${bg()}${topbar()}
${grid('360px minmax(0,1fr) 320px', 'auto minmax(0,1fr) auto', `
  <div style="grid-row:1 / span 3">${teamCard({ style: 'height:100%' })}</div>
  <div style="grid-column:2">${pane(`<div style="display:flex;align-items:center;gap:20px;margin-top:10px"><div style="flex:1"><b style="font-size:26px;color:#fff">AI 올스타</b><p style="margin:4px 0 0;font-size:13px;color:#9ca3af">전력 87 · 예상 승률 54% · 보상 300G</p></div><span class="chip" style="--a:${C.sky}">난이도 보통</span></div>`, { label: 'Opponent', a: C.sky })}</div>
  <div style="grid-column:2">${lineupMini({ cols: 6, h: 190, label: 'My Lineup' })}</div>
  ${cta('경기 시작', '준비 완료 · 엔트리 26/26', { style: 'grid-column:2', big: 34, btnH: 84, btnF: 26, gap: 16 })}
  <div style="grid-row:1 / span 2;grid-column:3;display:grid;grid-template-rows:1fr auto;gap:16px">${modeList()}${shopMini()}</div>
  <div style="grid-column:3">${pane('<p style="margin:10px 0 0;font-size:13px;color:#9ca3af">최근 경기 7:4 승 · 5:2 승</p>', { label: 'Record', a: C.sky })}</div>`)}` });

S.push({ n: 'A3 · 알림(퀘스트)형', note: '가운데를 <b>할 일 목록</b>으로 만든 안. "시너지 2/3 → 3/3", "불펜 부족" 처럼 내 팀 상태에 근거한 알림이 쌓이고, 맨 위에는 경기 시작. 로비가 살아 있다는 느낌이 가장 강하다.', h: `
${bg()}${topbar()}
${grid('360px minmax(0,1fr) 330px', 'auto minmax(0,1fr)', `
  <div style="grid-row:1 / span 2">${teamCard({ style: 'height:100%', n: 4 })}</div>
  ${cta('경기 시작', 'AI 올스타 · 보상 300G', { style: 'grid-column:2', big: 32, btnH: 70, gap: 14 })}
  <div style="grid-column:2">${pane(`<div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
    ${questRow('1994 해태 시너지가 한 명 남았습니다', { icon: '⚡', desc: '이대진(1994 해태 · 84 CP)을 넣으면 3/3 완성 · 팀 종합 +2' }, C.yel, '영입하기')}
    ${questRow('불펜이 얇습니다', { icon: '🧤', desc: '7회 이후 실점이 많습니다 · 마무리 후보 3명 보기' }, C.sky, '후보 보기')}
    ${questRow('부스트가 1경기 남았습니다', { icon: '⏳', desc: '오승환 · 에너지 드링크' }, C.em2, '연장 구매')}
    ${questRow('감독 자리가 비었습니다', { icon: '🎩', desc: '김응용 · 타격 +2 · 승부처 +1' }, C.vio, '선임')}
    ${questRow('주간 도전 시작', { icon: '🏆', desc: '2000년대 선수만으로 3승 · 보상 1,200G' }, C.red, '참가')}</div>`, { label: 'To Do', a: C.em2 })}</div>
  <div style="grid-row:1 / span 2;grid-column:3;display:grid;grid-template-rows:auto 1fr auto;gap:16px">${shopMini()}${modeList()}${pane('<p style="margin:10px 0 0;font-size:13px;color:#9ca3af">12승 6패 1무</p>', { label: 'Record', a: C.sky })}</div>`)}` });

S.push({ n: 'A4 · 2분할 큰 판', note: '왼쪽 절반이 <b>내 팀</b>, 오른쪽 절반이 <b>경기와 메뉴</b>. 추천은 맨 아래 한 줄 띠로 눌러 두어, 화면에 덩어리가 네 개만 보인다.', h: `
${bg(IMG.locker, 'linear-gradient(90deg,rgba(3,5,10,.9),rgba(3,5,10,.95))', 0.5)}${topbar()}
${grid('minmax(0,1fr) minmax(0,1fr)', 'minmax(0,1fr) auto', `
  <div>${teamCard({ style: 'height:100%', big: 38, n: 6, cw: 118, ch: 158, btnH: 62 })}</div>
  <div style="display:grid;grid-template-rows:minmax(0,1fr) auto;gap:16px">
    ${cta('경기 시작', 'AI 올스타 · 전력 87 · 보상 300G', { big: 40, btnH: 86, btnF: 26, style: 'display:flex;flex-direction:column;justify-content:center' })}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${shopMini({ rowMode: true })}${modeList()}</div>
  </div>
  <div style="grid-column:1 / span 2">${pane(`<div style="display:flex;gap:10px;margin-top:10px">${['1994 해태 시너지 2/3', '불펜 후보 3명', '오늘의 상품 3', '주간 도전 진행 중'].map((t) => `<span class="chip" style="--a:${C.gray};font-size:13px;padding:8px 14px">${t}</span>`).join('')}</div>`, { label: 'Today', a: C.yel })}</div>`)}` });

S.push({ n: 'A5 · 하단 도크', note: '위쪽 전체가 <b>경기 배너</b>, 아래에 라커·상점·모드·기록이 <b>큰 아이콘 도크</b>로 깔린다. 콘솔 게임 타이틀 화면에 가깝고 누를 곳이 아주 분명하다.', h: `
${bg(IMG.field, 'linear-gradient(180deg,rgba(3,5,10,.75) 0,rgba(3,5,10,.4) 40%,rgba(3,5,10,.97) 100%)', 1)}${topbar()}
<div style="position:relative;height:calc(911px - 66px);display:grid;grid-template-rows:minmax(0,1fr) auto;padding:22px 30px 26px;gap:20px">
  <div style="align-self:center;max-width:760px">
    ${lab('Next Match')}
    <h2 style="margin:12px 0 4px;font-size:62px;font-weight:800;color:#fff;text-shadow:0 6px 40px #000">AI 올스타</h2>
    <p style="margin:0 0 26px;font-size:17px;color:#cbd5e1">전력 87 · 예상 승률 54% · 승리 보상 300G</p>
    <div style="display:flex;gap:14px"><span class="btn pri" style="--c:14px;min-height:82px;font-size:26px;padding:0 64px;box-shadow:0 0 60px -10px rgba(16,185,129,.95)">경기 시작 ▶</span>
      <span class="btn" style="--c:14px;min-height:82px;font-size:17px;padding:0 30px">라인업 확인</span></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
    ${[['내 라커', '26/26 · 종합 87', C.em, IMG.locker], ['상점', '오늘의 상품 3', C.yel, IMG.pack], ['모드', '레전드 드래프트', C.vio, IMG.tunnel], ['기록', '12승 6패 1무', C.sky, IMG.season]].map(([t, d, c, img]) => `
      <div class="cut frame" style="--c:14px;--a:${c};position:relative;height:150px;overflow:hidden;background:linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,.95)),url(${img}) center/cover">
        <div style="position:absolute;left:18px;bottom:16px"><b style="display:block;font-size:22px;color:#fff">${t}</b><span style="font-size:13px;color:${c}">${d}</span></div></div>`).join('')}
  </div></div>` });

S.push({ n: 'A6 · 좌측 세로 내비', note: '왼쪽에 <b>세로 메뉴 바</b>를 두고(홈·라커·상점·모드·기록), 가운데는 경기, 오른쪽은 위젯. 메뉴가 한 곳에 모여 화면이 정리된다.', h: `
${bg()}${topbar()}
<div style="position:relative;display:grid;grid-template-columns:96px minmax(0,1fr) 340px;gap:16px;padding:18px 26px;height:calc(911px - 66px)">
  <div class="cut frame glass" style="--c:14px;padding:12px 8px;display:flex;flex-direction:column;gap:8px">
    ${[['🏠', '홈', 1], ['🧳', '라커', 0], ['🛒', '상점', 0], ['🎮', '모드', 0], ['📊', '기록', 0]].map(([i, t, on]) => `
      <div class="cut" style="--c:8px;padding:14px 0;text-align:center;background:${on ? 'rgba(16,185,129,.16)' : 'transparent'};box-shadow:${on ? 'inset 0 0 0 2px ' + C.em : 'none'}">
        <span style="font-size:22px">${i}</span><b style="display:block;font-size:12px;color:${on ? '#fff' : '#9ca3af'};margin-top:4px">${t}</b></div>`).join('')}
  </div>
  <div style="display:grid;grid-template-rows:minmax(0,1fr) auto auto;gap:16px;min-height:0">
    ${cta('경기 시작', 'AI 올스타 · 전력 87 · 보상 300G', { big: 44, btnH: 84, btnF: 26, style: 'display:flex;flex-direction:column;justify-content:center' })}
    ${lineupMini({ cols: 6, h: 150 })}
    ${pane(`<div style="display:flex;gap:10px;margin-top:10px">${['1994 해태 2/3', '불펜 얇음', '부스트 1경기'].map((t) => `<span class="chip">${t}</span>`).join('')}</div>`, { label: 'Today', a: C.yel })}
  </div>
  <div style="display:grid;grid-template-rows:auto auto 1fr;gap:16px;min-height:0">${teamCard({ btn: true, n: 3, cw: 92, ch: 122 })}${shopMini()}${modeList()}</div>
</div>` });

S.push({ n: 'A7 · 큰 타일 3장', note: '가운데를 <b>경기 · 라커 · 상점</b> 세 개의 큰 타일로만 구성. 고를 것이 셋뿐이라 헤매지 않는다. 경기 타일이 가장 크고 밝다.', h: `
${bg()}${topbar()}
${grid('minmax(0,1.5fr) minmax(0,1fr)', 'minmax(0,1fr) minmax(0,1fr)', `
  <div style="grid-row:1 / span 2">${cta('경기 시작', 'AI 올스타 · 전력 87 · 예상 승률 54% · 보상 300G', { big: 52, btnH: 92, btnF: 28, c: 20, style: 'height:100%;display:flex;flex-direction:column;justify-content:center', extra: `<div style="display:flex;gap:10px;margin-top:22px">${MY.slice(0, 5).map((p, i) => card(p, i, { w: 108, h: 144 })).join('')}</div>` })}</div>
  <div class="cut frame" style="--c:16px;--a:${C.em2};position:relative;overflow:hidden;padding:20px;background:linear-gradient(160deg,rgba(16,185,129,.16),rgba(5,8,15,.92) 60%),url(${IMG.locker}) center/cover">
    ${lab('My Locker', C.em2)}<h3 style="margin:10px 0 2px;font-size:30px;font-weight:800;color:#fff">나의 드림팀</h3>
    <p style="margin:0;font-size:13px;color:#cbd5e1">26/26 · 종합 87 · 1,942 CP</p>
    <div style="display:flex;gap:8px;margin-top:14px">${MY.slice(0, 3).map((p, i) => card(p, i, { w: 96, h: 128 })).join('')}</div>
    <span class="btn" style="--c:12px;width:100%;margin-top:16px;min-height:52px">라커 열기</span></div>
  <div class="cut frame" style="--c:16px;--a:${C.yel};position:relative;overflow:hidden;padding:20px;background:linear-gradient(160deg,rgba(253,224,71,.14),rgba(5,8,15,.92) 60%),url(${IMG.pack}) center/cover">
    ${lab('Shop & Modes', C.yel)}<h3 style="margin:10px 0 2px;font-size:30px;font-weight:800;color:#fff">상점 · 모드</h3>
    <p style="margin:0 0 14px;font-size:13px;color:#cbd5e1">오늘의 상품 3 · 레전드 드래프트 입장 가능</p>
    <div style="display:flex;gap:10px">${[['🛒', '상점'], ['🎮', '모드'], ['🏆', '도전']].map(([i, t]) => `<div class="cut" style="--c:9px;flex:1;text-align:center;padding:14px 0;background:rgba(5,8,15,.6)"><span style="font-size:22px">${i}</span><b style="display:block;font-size:13px;color:#fff;margin-top:4px">${t}</b></div>`).join('')}</div></div>`)}` });

S.push({ n: 'A8 · 상단 탭 + 중앙 집중', note: '메뉴를 <b>상단 탭</b>으로 올려 좌우 패널을 줄이고, 화면 대부분을 경기와 내 팀에 쓴다. 웹 서비스에 가장 가까운 정돈된 형태.', h: `
${bg()}${topbar('메인', { tabs: ['홈', '내 라커', '상점', '모드', '기록'], active: 0 })}
${grid('minmax(0,1fr) 380px', 'minmax(0,1fr) auto', `
  ${cta('경기 시작', 'AI 올스타 · 전력 87 · 보상 300G', { big: 46, btnH: 88, btnF: 26, style: 'display:flex;flex-direction:column;justify-content:center' })}
  <div style="grid-row:1 / span 2">${teamCard({ style: 'height:100%', n: 6, cw: 104, ch: 140, big: 32 })}</div>
  <div>${lineupMini({ cols: 7, h: 140, label: 'Today Lineup' })}</div>`)}` });

/* ═════════ B안 — 일반 게임·웹 메인 구조 ═════════ */
S.push({ n: 'B1 · 런처형 (배틀넷)', note: '게임 런처 구조. 왼쪽 세로 목록에서 <b>모드를 고르고</b>, 오른쪽은 그 모드의 큰 배너와 소식, 맨 아래 <b>PLAY</b> 버튼이 고정된다.', h: `
${bg(IMG.field, 'linear-gradient(90deg,rgba(3,5,10,.97) 0,rgba(3,5,10,.7) 30%,rgba(3,5,10,.55) 100%)', 1)}
<div style="position:relative;display:grid;grid-template-columns:260px minmax(0,1fr);height:911px">
  <div style="background:rgba(4,7,12,.92);padding:20px 16px;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div class="cut" style="--c:8px;width:42px;height:42px;background:${C.em}"></div><b style="font-size:17px;color:#fff">레전드 드래프트</b></div>
    ${[['내 팀 경기', 1], ['레전드 드래프트', 0], ['감독 리그', 0], ['주간 도전', 0]].map(([t, on]) => `<div class="cut" style="--c:8px;padding:13px 14px;background:${on ? 'rgba(16,185,129,.16)' : 'rgba(255,255,255,.03)'};box-shadow:${on ? 'inset 3px 0 0 ' + C.em : 'none'};font-weight:700;color:${on ? '#fff' : '#9ca3af'}">${t}</div>`).join('')}
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:8px">
      <span class="chip" style="--a:${C.yel}">💰 12,400 G</span>
      <div class="cut" style="--c:8px;display:flex;gap:10px;align-items:center;padding:10px;background:rgba(255,255,255,.04)"><div class="cut" style="--c:6px;width:34px;height:34px;background:url(${IMG.card}) center/cover"></div><div><b style="display:block;font-size:13px;color:#fff">홍길동</b><span style="font-size:11px;color:#9ca3af">12승 6패</span></div></div>
    </div>
  </div>
  <div style="position:relative;display:grid;grid-template-rows:minmax(0,1fr) auto">
    <div style="padding:60px;display:flex;flex-direction:column;justify-content:flex-end">
      <p class="lab">Today</p>
      <h2 style="margin:12px 0 6px;font-size:58px;font-weight:800;color:#fff;text-shadow:0 6px 40px #000">AI 올스타와의 경기</h2>
      <p style="margin:0;font-size:16px;color:#cbd5e1;max-width:560px">전력 87 · 예상 승률 54% · 승리 시 300G. 오늘 라인업은 선동열 선발, 4번 이승엽입니다.</p>
      <div style="display:flex;gap:10px;margin-top:22px">${MY.slice(0, 4).map((p, i) => card(p, i, { w: 108, h: 144 })).join('')}</div>
    </div>
    <div style="display:flex;align-items:center;gap:20px;padding:22px 60px;background:linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,.96))">
      <span class="btn pri" style="--c:14px;min-height:78px;font-size:26px;padding:0 70px;box-shadow:0 0 60px -12px rgba(16,185,129,.9)">PLAY ▶</span>
      <div><b style="display:block;font-size:15px;color:#fff">내 팀 · 나의 드림팀</b><span style="font-size:13px;color:#9ca3af">엔트리 26/26 · 종합 87 · 1,942 CP</span></div>
      <div style="margin-left:auto;display:flex;gap:10px"><span class="btn" style="--c:10px">내 라커</span><span class="btn" style="--c:10px">상점</span></div>
    </div>
  </div>
</div>` });

S.push({ n: 'B2 · 클라이언트형 (LoL)', note: '상단 가운데 <b>큰 PLAY</b>와 탭 메뉴, 화면 가운데는 넓게 비우고 정보는 좌우 끝으로. 게임 클라이언트에서 가장 익숙한 구조.', h: `
${bg(IMG.tunnel, 'linear-gradient(180deg,rgba(3,5,10,.9),rgba(3,5,10,.85))', 0.7)}
<div style="position:relative;height:911px;display:grid;grid-template-rows:auto minmax(0,1fr)">
  <div style="display:flex;align-items:center;gap:26px;padding:0 30px;height:84px;background:linear-gradient(180deg,rgba(5,8,15,.97),rgba(5,8,15,.5))">
    <span class="btn pri" style="--c:12px;min-height:56px;font-size:20px;padding:0 44px;box-shadow:0 0 44px -10px rgba(16,185,129,.9)">경기 시작</span>
    <div style="display:flex;gap:6px">${['홈', '내 라커', '상점', '모드', '기록'].map((t, i) => `<span class="cut" style="--c:8px;padding:10px 22px;font-weight:700;color:${i === 0 ? '#fff' : '#9ca3af'};background:${i === 0 ? 'rgba(255,255,255,.08)' : 'transparent'}">${t}</span>`).join('')}</div>
    <div style="margin-left:auto;display:flex;gap:12px;align-items:center"><span class="chip" style="--a:${C.yel}">💰 12,400</span><div class="cut" style="--c:8px;width:42px;height:42px;background:url(${IMG.card}) center/cover"></div></div>
  </div>
  <div style="display:grid;grid-template-columns:330px minmax(0,1fr) 330px;gap:18px;padding:22px 30px">
    ${teamCard({ style: 'height:100%', n: 3, cw: 92, ch: 124 })}
    <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
      <p class="lab">Next Match</p>
      <h2 style="margin:14px 0 6px;font-size:54px;font-weight:800;color:#fff">AI 올스타</h2>
      <p style="margin:0 0 24px;font-size:16px;color:#cbd5e1">전력 87 · 예상 승률 54%</p>
      <div style="display:flex;gap:12px">${MY.slice(0, 5).map((p, i) => card(p, i, { w: 120, h: 160 })).join('')}</div>
      <div style="display:flex;gap:10px;margin-top:24px"><span class="btn" style="--c:10px">라인업 편집</span><span class="btn" style="--c:10px">상대 바꾸기</span></div>
    </div>
    <div style="display:grid;grid-template-rows:auto 1fr auto;gap:16px">${shopMini()}${modeList()}${pane('<p style="margin:10px 0 0;font-size:13px;color:#9ca3af">12승 6패 1무</p>', { label: 'Record', a: C.sky })}</div>
  </div>
</div>` });

S.push({ n: 'B3 · 목록+상세 (스팀)', note: '왼쪽에 <b>목록</b>(내 팀·모드·상점), 오른쪽에 고른 항목의 <b>상세</b>. 정보가 많아져도 구조가 흔들리지 않는다.', h: `
${bg()}${topbar()}
<div style="position:relative;display:grid;grid-template-columns:330px minmax(0,1fr);gap:0;height:calc(911px - 66px)">
  <div style="background:rgba(4,7,12,.9);padding:18px 14px;display:flex;flex-direction:column;gap:6px">
    ${lab('Library', C.sky)}
    ${[['내 팀 경기', '오늘의 상대 AI 올스타', 1], ['내 라커', '26/26 · 종합 87', 0], ['상점', '오늘의 상품 3', 0], ['레전드 드래프트', '랜덤 시즌 한 판', 0], ['감독 리그', '준비 중', 0], ['기록', '12승 6패 1무', 0]].map(([t, d, on]) => `
      <div class="cut" style="--c:8px;padding:12px 14px;margin-top:6px;background:${on ? 'rgba(16,185,129,.14)' : 'transparent'};box-shadow:${on ? 'inset 3px 0 0 ' + C.em : 'none'}">
        <b style="display:block;font-size:15px;color:${on ? '#fff' : '#cbd5e1'}">${t}</b><span style="font-size:12px;color:#9ca3af">${d}</span></div>`).join('')}
  </div>
  <div style="position:relative;padding:26px 30px;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:18px">
    <div class="cut frame" style="--c:16px;--a:${C.em};position:relative;height:280px;overflow:hidden;background:linear-gradient(180deg,rgba(5,8,15,.25),rgba(5,8,15,.95)),url(${IMG.field}) center/cover">
      <div style="position:absolute;left:28px;bottom:22px"><p class="lab">Next Match</p><h2 style="margin:10px 0 4px;font-size:44px;font-weight:800;color:#fff">AI 올스타</h2><p style="margin:0;font-size:14px;color:#cbd5e1">전력 87 · 보상 300G</p></div>
      <span class="btn pri" style="--c:12px;position:absolute;right:28px;bottom:24px;min-height:70px;font-size:22px;padding:0 44px">경기 시작 ▶</span></div>
    ${lineupMini({ cols: 7, h: 176, label: 'My Lineup' })}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${shopMini({ rowMode: true })}${modeList({ rowMode: false })}${pane('<p style="margin:10px 0 0;font-size:13px;color:#9ca3af">최근 3연승 · 홈 6승 2패</p>', { label: 'Record', a: C.sky })}</div>
  </div>
</div>` });

S.push({ n: 'B4 · 대시보드 위젯', note: '정보를 <b>같은 크기의 위젯</b>으로 나눠 격자에 깐다. 한눈에 전체 상태가 보이고, 나중에 위젯을 늘리기 쉽다.', h: `
${bg()}${topbar()}
<div style="position:relative;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(2,minmax(0,1fr));gap:16px;padding:18px 26px;height:calc(911px - 66px)">
  <div style="grid-column:1 / span 2;grid-row:1">${cta('경기 시작', 'AI 올스타 · 전력 87 · 보상 300G', { big: 36, btnH: 72, style: 'height:100%;display:flex;flex-direction:column;justify-content:center' })}</div>
  ${teamCard({ style: 'height:100%', n: 2, cw: 92, ch: 122 })}
  ${pane(`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:12px" class="kpi">
    <div><b>87</b><small>팀 종합</small></div><div><b>12-6-1</b><small>전적</small></div><div><b>1,942</b><small>사용 CP</small></div><div><b>12,400</b><small>골드</small></div></div>`, { label: 'Status', a: C.sky })}
  ${lineupMini({ cols: 4, h: 150, pane: { style: 'grid-column:1 / span 2' } })}
  ${shopMini()}
  ${modeList()}
</div>` });

S.push({ n: 'B5 · 메트로 타일', note: '크기가 다른 <b>타일 모자이크</b>. 중요한 것이 크고, 색으로 구분된다. 터치·마우스 모두 편하고 시원해 보인다.', h: `
${bg()}${topbar()}
<div style="position:relative;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,minmax(0,1fr));gap:14px;padding:18px 26px;height:calc(911px - 66px)">
  <div style="grid-column:1 / span 2;grid-row:1 / span 2">${cta('경기 시작', 'AI 올스타 · 전력 87', { big: 44, btnH: 80, btnF: 24, style: 'height:100%;display:flex;flex-direction:column;justify-content:center' })}</div>
  ${[['내 라커', '26/26', C.em2, IMG.locker, 'grid-column:3;grid-row:1'], ['상점', '상품 3', C.yel, IMG.pack, 'grid-column:4;grid-row:1'],
  ['모드', '드래프트', C.vio, IMG.tunnel, 'grid-column:3;grid-row:2'], ['기록', '12승 6패', C.sky, IMG.season, 'grid-column:4;grid-row:2']].map(([t, d, c, img, pos]) => `
    <div class="cut frame" style="--c:14px;--a:${c};position:relative;overflow:hidden;${pos};background:linear-gradient(180deg,rgba(5,8,15,.25),rgba(5,8,15,.94)),url(${img}) center/cover">
      <div style="position:absolute;left:18px;bottom:16px"><b style="display:block;font-size:24px;color:#fff">${t}</b><span style="font-size:13px;color:${c}">${d}</span></div></div>`).join('')}
  <div style="grid-column:1 / span 4;grid-row:3">${lineupMini({ cols: 8, h: 140, label: 'My Squad' })}</div>
</div>` });

S.push({ n: 'B6 · 피드형', note: '가운데를 <b>소식 피드</b>로. 경기 결과, 시너지 변화, 상점 소식이 시간 순으로 흐른다. 계속 들어와 보게 만드는 구조.', h: `
${bg()}${topbar()}
${grid('300px minmax(0,1fr) 320px', 'minmax(0,1fr)', `
  ${teamCard({ style: 'height:100%', n: 2, cw: 92, ch: 122 })}
  <div style="display:grid;grid-template-rows:auto minmax(0,1fr);gap:16px;min-height:0">
    ${cta('경기 시작', 'AI 올스타 · 보상 300G', { big: 30, btnH: 64, gap: 12 })}
    ${pane(`<div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
      ${[['🏆', '어제 경기 7 : 4 승리', '이승엽 2홈런 · MVP · +300G'], ['⚡', '1994 해태 시너지 2/3', '이대진을 넣으면 팀 종합 +2'], ['🛒', '오늘의 상품이 바뀌었습니다', '레전드 팩 450G · 타격 특훈 300G'], ['📈', '오승환 제구 87 → 90', '제구 교정 적용됨'], ['🎮', '레전드 드래프트 새 시즌', '2026 시즌 12팀 추가']].map(([i, t, d]) => `
        <div class="cut" style="--c:9px;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:12px 14px;background:rgba(5,8,15,.62)">
          <span style="font-size:20px">${i}</span><div><b style="display:block;font-size:15px;color:#fff">${t}</b><span style="font-size:12px;color:#9ca3af">${d}</span></div></div>`).join('')}</div>`, { label: 'Feed', a: C.em2, style: 'min-height:0' })}
  </div>
  <div style="display:grid;grid-template-rows:auto auto 1fr;gap:16px">${shopMini()}${modeList()}${pane('<p style="margin:10px 0 0;font-size:13px;color:#9ca3af">주간 도전 2/3 · 보상 1,200G</p>', { label: 'Weekly', a: C.red })}</div>`)}` });

S.push({ n: 'B7 · 풀스크린 + 캐러셀', note: '배경이 화면을 가득 채우고 아래에 <b>가로 캐러셀</b>. 콘솔 게임 타이틀 화면 문법으로, 그림이 주인공이 된다.', h: `
${bg(IMG.tunnel, 'linear-gradient(180deg,rgba(3,5,10,.55) 0,rgba(3,5,10,.25) 35%,rgba(3,5,10,.97) 100%)', 1)}
<div style="position:relative;height:911px;display:grid;grid-template-rows:auto minmax(0,1fr) auto">
  <div style="display:flex;align-items:center;gap:16px;padding:22px 40px">
    <b style="font-size:20px;font-weight:800;color:#fff">레전드 드래프트</b>
    <div style="margin-left:auto;display:flex;gap:10px;align-items:center"><span class="chip" style="--a:${C.yel}">💰 12,400 G</span><span class="chip" style="--a:${C.em2}">홍길동</span></div>
  </div>
  <div style="padding:0 40px;display:flex;flex-direction:column;justify-content:center">
    <p class="lab">Next Match</p>
    <h2 style="margin:14px 0 8px;font-size:72px;font-weight:800;color:#fff;text-shadow:0 8px 50px #000">오늘의 경기</h2>
    <p style="margin:0 0 28px;font-size:18px;color:#cbd5e1">AI 올스타 · 전력 87 · 예상 승률 54%</p>
    <span class="btn pri" style="--c:14px;align-self:flex-start;min-height:84px;font-size:27px;padding:0 66px;box-shadow:0 0 64px -12px rgba(16,185,129,.95)">경기 시작 ▶</span>
  </div>
  <div style="padding:0 40px 34px">
    <div style="display:flex;gap:14px;overflow:hidden">
      ${[['내 라커', '26/26 · 종합 87', C.em2, IMG.locker], ['상점', '오늘의 상품 3', C.yel, IMG.pack], ['레전드 드래프트', '랜덤 한 판', C.vio, IMG.season], ['주간 도전', '2/3 진행', C.red, IMG.field], ['기록', '12승 6패 1무', C.sky, IMG.card]].map(([t, d, c, img]) => `
        <div class="cut frame" style="--c:12px;--a:${c};position:relative;width:300px;height:170px;flex:none;overflow:hidden;background:linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,.95)),url(${img}) center/cover">
          <div style="position:absolute;left:16px;bottom:14px"><b style="display:block;font-size:20px;color:#fff">${t}</b><span style="font-size:12px;color:${c}">${d}</span></div></div>`).join('')}
    </div>
  </div>
</div>` });

S.push({ n: 'B8 · 관리 허브 (FC 얼티밋)', note: '<b>표와 수치</b>가 중심. 왼쪽에 팀 요약, 가운데에 스쿼드 표, 오른쪽에 할 일과 상점. 팀을 계속 만지는 사람에게 가장 실용적이다.', h: `
${bg(IMG.bg, 'linear-gradient(180deg,rgba(3,5,10,.95),rgba(3,5,10,.93))', 0.6)}${topbar('메인', { tabs: ['홈', '스쿼드', '이적', '상점'], active: 0 })}
${grid('320px minmax(0,1fr) 340px', 'minmax(0,1fr)', `
  <div style="display:grid;grid-template-rows:auto auto 1fr;gap:16px;min-height:0">
    ${teamCard({ n: 0, btn: true, big: 26 })}
    ${cta('경기 시작', 'AI 올스타 · 보상 300G', { big: 24, btnH: 62, btnF: 19, gap: 12, c: 14, pad: '18px 20px' })}
    ${pane(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px" class="kpi"><div><b>87</b><small>종합</small></div><div><b>12-6-1</b><small>전적</small></div></div>`, { label: 'Status', a: C.sky })}
  </div>
  ${pane(`<div style="margin-top:12px;display:grid;grid-template-columns:36px 1fr 60px 60px 60px 60px;gap:8px;font:600 11px 'Saira Condensed';letter-spacing:.18em;color:#6b7280;padding:0 8px">
      <span>OVR</span><span>NAME</span><span>POS</span><span>CP</span><span>시즌</span><span>상태</span></div>
    <div style="display:flex;flex-direction:column;gap:5px;margin-top:6px">
      ${MY.concat(MY).slice(0, 11).map((p, i) => `<div class="cut" style="--c:7px;display:grid;grid-template-columns:36px 1fr 60px 60px 60px 60px;gap:8px;align-items:center;padding:9px 8px;background:rgba(5,8,15,.6)">
        <b class="d" style="font-size:17px;color:${tone(p[0])}">${p[0]}</b><b style="font-size:14px;color:#fff">${p[1]}</b>
        <span class="d" style="color:#9ca3af">${p[3]}</span><span class="d" style="color:#cbd5e1">${90 + i}</span><span style="font-size:12px;color:#9ca3af">${p[2].split(' ')[0]}</span>
        <span class="chip" style="--a:${i === 1 ? C.yel : C.gray};font-size:11px">${i === 1 ? '부스트' : '정상'}</span></div>`).join('')}
    </div>`, { label: 'Squad 26', a: C.em2, style: 'min-height:0;overflow:hidden' })}
  <div style="display:grid;grid-template-rows:auto auto 1fr;gap:16px;min-height:0">
    ${pane(`<div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">
      ${questRow('시너지 한 명 남음', { icon: '⚡', desc: '1994 해태 2/3' }, C.yel, '영입')}
      ${questRow('부스트 만료 임박', { icon: '⏳', desc: '오승환 · 1경기' }, C.em2, '연장')}</div>`, { label: 'To Do', a: C.yel })}
    ${shopMini()}
    ${modeList()}
  </div>`)}` });

document.getElementById('root').innerHTML = S.map((s) => `<div class="screen">${s.h}<span class="d" style="position:absolute;left:0;bottom:0;z-index:9;font-size:13px;font-weight:800;letter-spacing:.3em;color:#05080f;background:var(--em);padding:3px 12px">${s.n}</span></div><p class="note">${s.note}</p>`).join('');
