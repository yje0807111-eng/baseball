/* 내 라커 — 배치 4안 */
const S = [];
const C = { yel: '#fde047', grn: '#34d399', sky: '#7dd3fc', vio: '#c4b5fd', red: '#f87171', gray: '#94a3b8' };
const tone = (o) => (o >= 92 ? C.yel : o >= 85 ? C.grn : o >= 78 ? C.sky : C.gray);
const IMGS = ['mt-card.webp', 'mt-locker.webp', 'mt-tunnel.webp', 'mt-season.webp'];

const P = (ovr, name, year, team, pos, cost, extra = {}) => ({ ovr, name, year, team, pos, cost, ...extra });
const POOL = [
  P(96, '선동열', 1986, '해태', 'SP', 118), P(94, '이승엽', 2003, '삼성', '1B', 112), P(93, '이종범', 1994, '해태', 'SS', 110),
  P(92, '류현진', 2006, '한화', 'SP', 108), P(91, '이대호', 2010, '롯데', '3B', 104), P(90, '오승환', 2011, '삼성', 'RP', 102),
  P(89, '양현종', 2017, 'KIA', 'SP', 99), P(88, '김광현', 2010, 'SK', 'SP', 97), P(87, '박병호', 2015, '넥센', '1B', 95),
  P(86, '강정호', 2014, '넥센', 'SS', 93), P(85, '최형우', 2011, '삼성', 'OF', 91), P(84, '김재현', 1997, 'LG', 'OF', 89),
];
const MINE = [
  P(96, '선동열', 1986, '해태', 'SP', 118), P(92, '류현진', 2006, '한화', 'SP', 108), P(89, '양현종', 2017, 'KIA', 'SP', 99),
  P(88, '김광현', 2010, 'SK', 'SP', 97), P(83, '구대성', 1996, '한화', 'SP', 86), P(90, '오승환', 2011, '삼성', 'RP', 102),
  P(84, '임창용', 1999, '삼성', 'RP', 88), P(82, '정우람', 2014, 'SK', 'RP', 84), P(81, '손승락', 2013, '넥센', 'RP', 82),
  P(80, '조상우', 2019, '키움', 'RP', 80), P(79, '고우석', 2019, 'LG', 'RP', 79), P(86, '양의지', 2018, '두산', 'C', 93),
  P(78, '강민호', 2008, '롯데', 'C', 78), P(94, '이승엽', 2003, '삼성', '1B', 112), P(80, '최희섭', 2009, 'KIA', '1B', 80),
  P(85, '정근우', 2009, 'SK', '2B', 91), P(91, '이대호', 2010, '롯데', '3B', 104), P(83, '김동주', 2007, '두산', '3B', 86),
  P(93, '이종범', 1994, '해태', 'SS', 110), P(86, '강정호', 2014, '넥센', 'SS', 93), P(85, '최형우', 2011, '삼성', 'OF', 91),
  P(84, '이용규', 2008, 'KIA', 'OF', 89), P(82, '장효조', 1987, '삼성', 'OF', 84), P(81, '손아섭', 2017, '롯데', 'OF', 82),
  P(87, '박병호', 2015, '넥센', 'DH', 95), P(80, '김현수', 2009, '두산', 'DH', 80),
];
const card = (p, i = 0, opt = {}) => {
  const a = tone(p.ovr);
  const w = opt.w || 150; const h = opt.h || 200;
  return `<div class="pc cut frame ${opt.hot ? 'hot' : ''}" style="--c:12px;--a:${a};width:${w}px;height:${h}px;${opt.style || ''}">
    <div class="img" style="--img:url(clutch/${IMGS[i % 4]})"></div><div class="grad"></div><div class="scan" style="position:absolute;inset:0;opacity:.5"></div>
    <span class="ov" style="font-size:${w < 120 ? 22 : 30}px">${p.ovr}</span><span class="pos">${p.pos}</span>
    ${opt.badge || ''}
    <span class="nm" style="font-size:${w < 120 ? 13 : 16}px;bottom:${w < 120 ? 20 : 26}px">${p.name}</span>
    <span class="meta" style="font-size:${w < 120 ? 10 : 11}px">${p.year} ${p.team} · ${p.cost}</span></div>`;
};
const row = (p, i, opt = {}) => {
  const a = tone(p.ovr);
  return `<div class="cut" style="--c:8px;display:grid;grid-template-columns:34px 1fr auto auto;gap:10px;align-items:center;padding:7px 10px;background:${opt.on ? 'rgba(16,185,129,.12)' : 'rgba(5,8,15,.6)'};box-shadow:inset ${opt.on ? '3px 0 0 var(--em)' : '0 0 0 1px rgba(255,255,255,.07)'}">
    <b class="d" style="font-size:18px;color:${a}">${p.ovr}</b>
    <div style="min-width:0"><b style="display:block;font-size:14px;color:#fff">${p.name}</b><span style="font-size:11px;color:#9ca3af">${p.year} ${p.team} · ${p.pos}</span></div>
    <span class="d" style="font-size:14px;color:#cbd5e1">${p.cost}</span>
    <span class="btn" style="--c:6px;min-height:28px;padding:0 10px;font-size:12px">${opt.action || '영입'}</span></div>`;
};
const capBar = (used = 1942, cap = 2000) => `<div><div class="bar"><i style="width:${(used / cap) * 100}%;background:linear-gradient(90deg,var(--em),var(--yel))"></i></div>
  <p style="margin:6px 0 0;font-size:12px;color:#9ca3af">${used.toLocaleString()} / ${cap.toLocaleString()} CP · 남은 ${(cap - used).toLocaleString()}</p></div>`;
const hdr = (title, right = '') => `<header style="position:relative;height:66px;display:flex;align-items:center;gap:20px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.25);background:linear-gradient(180deg,rgba(5,8,15,.96),rgba(5,8,15,.4))">
  <span class="btn" style="--c:8px;min-height:38px">← 메인</span>
  <div><p class="lab" style="font-size:9px">Legend Draft</p><b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">${title}</b></div>
  <span class="chip" style="--a:#34d399">엔트리 26/26</span><span class="chip" style="--a:#fde047">외국인 3/3</span><span class="chip" style="--a:#7dd3fc">1,942 / 2,000 CP</span>
  <div style="margin-left:auto;display:flex;gap:10px;align-items:center">${right}<span class="btn" style="--c:8px;min-height:38px">자동 채우기</span><span class="btn pri" style="--c:8px;min-height:38px">저장</span></div>
</header>`;
const search = (opt = {}) => `<div style="display:grid;grid-template-columns:1fr repeat(3,120px);gap:8px">
  <div class="cut frame" style="--c:8px;padding:10px 12px;background:rgba(255,255,255,.06);color:#9ca3af;font-size:14px">🔍 선수 이름 · 연도 · 구단 검색</div>
  ${['연도 전체', '구단 전체', '포지션'].map((t) => `<div class="cut" style="--c:8px;padding:10px 12px;background:rgba(5,8,15,.6);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);font-size:13px;color:#cbd5e1">${t} ▾</div>`).join('')}
</div>${opt.chips === false ? '' : `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${['2009 KIA', '1994 해태', '2018 두산', '국가대표', '외국인'].map((t, i) => `<span class="chip" style="--a:${i === 0 ? '#34d399' : '#94a3b8'}">${t}</span>`).join('')}</div>`}`;

/* ───── A · 라인업 필드 + 검색 ───── */
const FIELD_SLOTS = [['C', 50, 88], ['1B', 78, 62], ['2B', 63, 45], ['SS', 37, 45], ['3B', 22, 62], ['LF', 16, 24], ['CF', 50, 14], ['RF', 84, 24], ['SP', 50, 58], ['DH', 86, 86]];
S.push({
  name: 'A · 라인업 필드', note: '기존 드래프트 화면을 그대로 이어받은 배치. 왼쪽 <b>그라운드에 선발 라인업</b>을 놓고 끌어서 자리 변경, 오른쪽은 <b>검색 + 후보 리스트</b>. 아래에는 엔트리 26명을 포지션별로 접어 둔 목록. 익숙하고 라인업 감각이 바로 온다.', html: `
<div style="position:absolute;inset:0;background:url(clutch/mt-bg.webp) center/cover;opacity:.85"></div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,5,10,.93),rgba(3,5,10,.9))"></div>
${hdr('내 라커 · 라인업')}
<div style="position:relative;display:grid;grid-template-columns:1fr 470px;gap:16px;padding:16px 26px;height:calc(911px - 66px)">
  <div style="display:grid;grid-template-rows:1fr 250px;gap:16px;min-height:0">
    <div class="cut frame glass" style="--c:16px;position:relative;overflow:hidden;padding:16px 18px">
      <p class="lab">Starting Lineup</p>
      <div style="position:absolute;inset:46px 18px 16px;background:radial-gradient(60% 70% at 50% 75%,rgba(16,185,129,.12),transparent 70%)">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">
          <path d="M50 92 L92 52 L50 12 L8 52 Z" fill="rgba(16,185,129,.05)" stroke="rgba(255,255,255,.18)" stroke-width=".4"/>
          <path d="M50 92 L8 52 M50 92 L92 52" stroke="rgba(255,255,255,.14)" stroke-width=".4"/>
        </svg>
        ${FIELD_SLOTS.map(([pos, x, y], i) => `<div style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%)">${card(MINE[i], i, { w: 104, h: 138 })}</div>`).join('')}
      </div>
    </div>
    <div class="cut frame glass" style="--c:14px;padding:14px 16px;min-height:0">
      <div style="display:flex;align-items:center;gap:12px"><p class="lab" style="--a:#7dd3fc">Roster 26</p>
        <div style="display:flex;gap:6px">${['투수 11', '포수 2', '내야 6', '외야 5', '지명 2'].map((t) => `<span class="chip">${t}</span>`).join('')}</div></div>
      <div style="display:grid;grid-template-columns:repeat(13,1fr);gap:8px;margin-top:12px">
        ${MINE.slice(0, 26).map((p, i) => card(p, i, { w: 0, h: 74, style: 'width:100%' })).join('')}
      </div>
    </div>
  </div>
  <div class="cut frame glass" style="--c:14px;padding:16px;min-height:0;display:flex;flex-direction:column">
    <p class="lab" style="--a:#fde047">Search</p>
    <div style="margin-top:12px">${search()}</div>
    <p style="margin:14px 0 8px;font-size:12px;color:#6b7280">결과 248명 · 종합 높은 순</p>
    <div style="display:flex;flex-direction:column;gap:6px;overflow:hidden">${POOL.map((p, i) => row(p, i, { on: i === 0 })).join('')}</div>
    <div style="margin-top:auto;padding-top:14px">${capBar()}</div>
  </div>
</div>` });

/* ───── B · 카드 그리드 ───── */
S.push({
  name: 'B · 카드 그리드', note: '<b>수집 게임</b>에 가까운 배치. 왼쪽에 내 엔트리 26칸을 카드 격자로 두고(빈 칸은 점선), 오른쪽에서 검색 결과 카드를 골라 채운다. 카드가 크게 보여서 영입하는 맛이 가장 좋다.', html: `
<div style="position:absolute;inset:0;background:url(clutch/mt-locker.webp) center/cover;opacity:.5"></div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,5,10,.94),rgba(3,5,10,.93))"></div>
${hdr('내 라커 · 엔트리')}
<div style="position:relative;display:grid;grid-template-columns:1fr 620px;gap:16px;padding:16px 26px;height:calc(911px - 66px)">
  <div class="cut frame glass" style="--c:16px;padding:16px 18px;min-height:0">
    <div style="display:flex;align-items:center;gap:14px"><p class="lab">My Squad · 26</p>
      <div style="display:flex;gap:6px">${['전체', '투수', '포수·내야', '외야', '코치진'].map((t, i) => `<span class="chip" style="--a:${i === 0 ? '#10b981' : '#94a3b8'}">${t}</span>`).join('')}</div>
      <span style="margin-left:auto;font-size:12px;color:#9ca3af">카드를 끌어 라인업 순서를 바꿉니다</span></div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-top:14px">
      ${MINE.slice(0, 24).map((p, i) => card(p, i, { w: 0, h: 152, style: 'width:100%', hot: i === 0 })).join('')}
      ${[0, 1].map(() => `<div class="cut" style="--c:12px;height:152px;border:1px dashed rgba(255,255,255,.18);display:grid;place-items:center;color:#4b5563;font-size:13px">빈 자리</div>`).join('')}
    </div>
    <div style="display:flex;gap:12px;margin-top:16px;align-items:center">
      ${['감독 김응용', '수석 김원형', '타격 김용달', '투수 양상문'].map((t, i) => `<div class="cut" style="--c:8px;flex:1;display:flex;gap:10px;align-items:center;padding:8px 10px;background:rgba(5,8,15,.6);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
        <div class="cut" style="--c:6px;width:38px;height:38px;background:url(clutch/mt-card.webp) center/cover;opacity:.8"></div>
        <div><span class="d" style="display:block;font-size:10px;letter-spacing:.2em;color:${[C.yel, C.sky, C.grn, C.vio][i]}">${t.split(' ')[0]}</span><b style="font-size:14px;color:#fff">${t.split(' ')[1]}</b></div></div>`).join('')}
    </div>
  </div>
  <div class="cut frame glass" style="--c:14px;padding:16px;min-height:0;display:flex;flex-direction:column">
    <p class="lab" style="--a:#fde047">Search</p>
    <div style="margin-top:12px">${search()}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px">
      ${POOL.slice(0, 8).map((p, i) => card(p, i, { w: 0, h: 168, style: 'width:100%' })).join('')}
    </div>
    <div style="margin-top:auto;padding-top:14px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end">
      ${capBar()}<span class="btn pri" style="--c:10px">선택한 선수 영입</span></div>
  </div>
</div>` });

/* ───── C · 상세 중심 ───── */
S.push({
  name: 'C · 선수 상세 중심', note: '가운데에 <b>고른 선수를 크게</b> 띄우고 실제 기록·시너지·영입 결과(종합 변화, 남은 CP)를 보여 주는 배치. 왼쪽은 내 엔트리 목록, 오른쪽은 검색 결과. 한 명 한 명 따져 가며 뽑는 사람에게 맞다.', html: `
<div style="position:absolute;inset:0;background:url(clutch/mt-bg.webp) center/cover;opacity:.85"></div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,5,10,.93),rgba(3,5,10,.92))"></div>
${hdr('내 라커 · 영입')}
<div style="position:relative;display:grid;grid-template-columns:330px 1fr 380px;gap:16px;padding:16px 26px;height:calc(911px - 66px)">
  <div class="cut frame glass" style="--c:14px;padding:14px 16px;min-height:0;display:flex;flex-direction:column">
    <p class="lab">My Squad</p>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;overflow:hidden">${MINE.slice(0, 12).map((p, i) => row(p, i, { action: '방출', on: i === 3 })).join('')}</div>
    <div style="margin-top:auto;padding-top:12px">${capBar()}</div>
  </div>
  <div class="cut frame hot" style="--c:16px;--a:#fde047;position:relative;overflow:hidden;padding:20px;background:linear-gradient(160deg,rgba(253,224,71,.12),rgba(5,8,15,.94) 55%),url(clutch/mt-card.webp) center/cover">
    <p class="lab" style="--a:#fde047">Selected</p>
    <div style="display:flex;gap:24px;margin-top:14px">
      ${card(POOL[0], 0, { w: 230, h: 306 })}
      <div style="flex:1">
        <h2 style="margin:0;font-size:40px;font-weight:800;color:#fff">선동열 <span class="d" style="font-size:22px;color:#9ca3af">1986 해태 · SP</span></h2>
        <p style="margin:6px 0 0;font-size:14px;color:#cbd5e1">24승 6패 ERA 0.99 · 214.2이닝 214K</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px" class="kpi">
          <div><b>96</b><small>구위</small></div><div><b>92</b><small>제구</small></div><div><b>95</b><small>체력</small></div><div><b>97</b><small>안정</small></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
          <span class="chip" style="--a:#fde047">1986 해태 시너지 2/3</span><span class="chip" style="--a:#34d399">좌완 없음</span><span class="chip" style="--a:#7dd3fc">국가대표</span>
        </div>
        <div class="cut" style="--c:10px;margin-top:18px;padding:14px 16px;background:rgba(5,8,15,.72)">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#9ca3af"><span>영입가</span><b class="d" style="font-size:20px;color:#fff">118 CP</b></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#9ca3af;margin-top:6px"><span>영입 후 남은 예산</span><b class="d" style="font-size:20px;color:var(--red)">-60</b></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#9ca3af;margin-top:6px"><span>팀 종합</span><b class="d" style="font-size:20px;color:var(--em2)">87 → 88</b></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px"><span class="btn pri lg" style="--c:12px;flex:1">영입하기</span><span class="btn lg" style="--c:12px">비교</span></div>
      </div>
    </div>
  </div>
  <div class="cut frame glass" style="--c:14px;padding:14px 16px;min-height:0;display:flex;flex-direction:column">
    <p class="lab" style="--a:#7dd3fc">Search</p>
    <div style="margin-top:12px">${search({ chips: false })}</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;overflow:hidden">${POOL.map((p, i) => row(p, i, { on: i === 0 })).join('')}</div>
  </div>
</div>` });

/* ───── D · 시즌 브라우저 ───── */
const YEARS = [1982, 1986, 1991, 1994, 1997, 2000, 2003, 2006, 2009, 2011, 2014, 2017, 2020, 2023, 2026];
S.push({
  name: 'D · 시즌 브라우저', note: '<b>연도 → 구단 → 선수</b> 순으로 파고드는 배치. 왼쪽 타임라인에서 연도를 고르고 그 해 구단을 누르면 가운데에 그 팀 선수 카드가 깔린다. "1994 해태를 통째로 보고 싶다"는 사람에게 맞고, 시즌 시너지를 노리기 쉽다.', html: `
<div style="position:absolute;inset:0;background:url(clutch/mt-season.webp) center/cover;opacity:.35"></div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,5,10,.95),rgba(3,5,10,.93))"></div>
${hdr('내 라커 · 시즌 탐색')}
<div style="position:relative;display:grid;grid-template-columns:150px 1fr 400px;gap:16px;padding:16px 26px;height:calc(911px - 66px)">
  <div class="cut frame glass" style="--c:14px;padding:14px 10px;min-height:0">
    <p class="lab" style="--a:#fde047;margin-left:4px">Years</p>
    <div style="display:flex;flex-direction:column;gap:4px;margin-top:12px">
      ${YEARS.map((y, i) => `<div class="cut ${i === 3 ? 'frame hot' : ''}" style="--c:6px;--a:#fde047;padding:8px 12px;background:${i === 3 ? 'rgba(253,224,71,.14)' : 'transparent'};font:800 17px 'Saira Condensed';color:${i === 3 ? '#fff' : '#6b7280'}">${y}</div>`).join('')}
    </div>
  </div>
  <div style="display:grid;grid-template-rows:auto 1fr;gap:16px;min-height:0">
    <div class="cut frame glass" style="--c:14px;padding:14px 16px">
      <p class="lab" style="--a:#34d399">1994 시즌 · 구단</p>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        ${['해태', 'LG', '삼성', '한화', '롯데', 'OB', '태평양', '쌍방울'].map((t, i) => `<span class="chip" style="--a:${i === 0 ? '#34d399' : '#94a3b8'};font-size:14px;padding:8px 14px">${t}</span>`).join('')}
      </div>
    </div>
    <div class="cut frame glass" style="--c:16px;padding:16px 18px;min-height:0;position:relative;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px">
        <p class="lab" style="--a:#fde047">1994 해태 타이거즈</p>
        <span class="chip" style="--a:#fde047">한국시리즈 우승</span>
        <span style="margin-left:auto;font-size:12px;color:#9ca3af">18명 · 이 시즌에서 3명 영입 시 시너지</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-top:14px">
        ${POOL.concat(POOL).slice(0, 12).map((p, i) => card(p, i, { w: 0, h: 176, style: 'width:100%', hot: i === 2 })).join('')}
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-rows:auto 1fr auto;gap:16px;min-height:0">
    <div class="cut frame glass" style="--c:14px;padding:14px 16px">
      <p class="lab">My Squad · 26/26</p>
      <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:5px;margin-top:12px">
        ${MINE.map((p, i) => `<div class="cut" style="--c:5px;height:34px;display:grid;place-items:center;background:rgba(5,8,15,.6);box-shadow:inset 0 0 0 1px ${tone(p.ovr)}55;font:800 14px 'Saira Condensed';color:${tone(p.ovr)}">${p.ovr}</div>`).join('')}
      </div>
      <div style="margin-top:14px">${capBar()}</div>
    </div>
    <div class="cut frame glass" style="--c:14px;padding:14px 16px;min-height:0">
      <p class="lab" style="--a:#7dd3fc">Synergy</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
        ${[['1994 해태', '이종범 · 선동열', 2, 3, C.yel], ['국가대표', '류현진 · 이승엽 · 김광현', 3, 5, C.sky], ['좌완 셋', '양현종 · 김광현 · 구대성', 3, 3, C.grn]].map(([t, s, cur, need, c]) => `
          <div class="cut" style="--c:8px;padding:10px 12px;background:rgba(5,8,15,.6);box-shadow:inset 3px 0 0 ${c}">
            <div style="display:flex;justify-content:space-between"><b style="font-size:14px;color:#fff">${t}</b><span class="d" style="color:${c}">${cur}/${need}</span></div>
            <p style="margin:3px 0 0;font-size:12px;color:#9ca3af">${s}</p></div>`).join('')}
      </div>
    </div>
    <div class="cut frame glass" style="--c:14px;padding:14px 16px">
      <p class="lab" style="--a:#c4b5fd">Staff 4/4</p>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px">
        ${[['감독', '김응용'], ['수석', '김원형'], ['타격', '김용달'], ['투수', '양상문']].map(([r, n]) => `<div class="cut" style="--c:7px;padding:8px 10px;background:rgba(5,8,15,.6)"><span class="d" style="display:block;font-size:10px;letter-spacing:.2em;color:#6b7280">${r}</span><b style="font-size:14px;color:#fff">${n}</b></div>`).join('')}
      </div>
    </div>
  </div>
</div>` });

document.getElementById('root').innerHTML = S.map((s) => `<div class="screen">${s.html}<span class="d" style="position:absolute;left:0;bottom:0;z-index:9;font-size:13px;font-weight:800;letter-spacing:.3em;color:#05080f;background:var(--em);padding:3px 12px">${s.name}</span></div><p class="note">${s.note}</p>`).join('');
