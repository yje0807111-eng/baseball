const S = [];
const cardTile = (ovr, name, meta, pos, a, img) => `<div class="pc cut frame" style="--c:12px;--a:${a}">
  <div class="img" style="--img:url(clutch/${img})"></div><div class="grad"></div><div class="scan" style="position:absolute;inset:0;opacity:.5"></div>
  <span class="ov">${ovr}</span><span class="pos">${pos}</span>
  <span class="nm">${name}</span><span class="meta">${meta}</span></div>`;
const tile = (opt) => `<div class="cut frame ${opt.hot ? 'hot' : ''} ${opt.glass === false ? '' : 'glass'}" style="--c:${opt.c || 14}px;--a:${opt.a || '#10b981'};padding:${opt.pad || '16px 18px'};${opt.style || ''}">
  ${opt.label ? `<p class="lab" style="--a:${opt.a || '#10b981'}">${opt.label}</p>` : ''}${opt.body}</div>`;

/* ───── A · 로그인 ───── */
S.push({ name: 'A · 로그인', note: '터널 밖 그라운드를 보는 감독 컷 위에 로그인 판. 판·버튼·라벨은 드래프트 화면과 같은 문법이고, 오른쪽 아래에 이어서 하기 슬롯(나중에 계정 로그인 자리).', html: `
<div style="position:absolute;inset:0;background:url(clutch/mt-tunnel.webp) center/cover"></div>
<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,5,10,.96) 0,rgba(3,5,10,.78) 34%,rgba(3,5,10,.15) 62%,rgba(3,5,10,.6) 100%)"></div>
<div class="scan" style="position:absolute;inset:0;opacity:.6"></div>
<div style="position:absolute;left:96px;top:50%;transform:translateY(-50%);width:520px">
  <p class="lab">Legend Draft</p>
  <h2 style="margin:10px 0 0;font-size:62px;font-weight:800;line-height:1.02;color:#fff">내 팀을<br>만든다</h2>
  <p style="margin:16px 0 0;font-size:16px;line-height:1.75;color:#9ca3af;max-width:430px">1982년부터 오늘까지, 역대 KBO 선수를 직접 검색해 26인 엔트리와 코치진을 꾸립니다.<br>샐러리 캡 2000 CP 안에서 당신의 최적해를 찾으세요.</p>
  <div class="cut frame" style="--c:16px;margin-top:34px;padding:26px 28px;background:rgba(6,10,19,.86);backdrop-filter:blur(10px)">
    <p class="lab" style="--a:#34d399">Manager</p>
    <div style="margin-top:12px;display:grid;grid-template-columns:1fr auto;gap:12px">
      <div class="cut frame" style="--c:10px;padding:14px 16px;background:rgba(255,255,255,.06)"><span style="font-size:19px;color:#fff">홍길동</span><span style="display:inline-block;width:2px;height:20px;background:var(--em2);margin-left:3px;vertical-align:-4px;animation:pulse .9s infinite"></span></div>
      <span class="btn pri" style="--c:10px;padding:0 34px">시작하기</span>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><span class="chip" style="--a:#7dd3fc">엔트리 26명</span><span class="chip" style="--a:#fde047">외국인 3명</span><span class="chip" style="--a:#34d399">CP 2000</span><span class="chip">감독·코치 4명</span></div>
  </div>
  <p style="margin:18px 0 0;font-size:13px;color:#6b7280">계정 연동과 다른 감독과의 대결은 준비 중입니다</p>
</div>
<div class="cut frame" style="--c:12px;position:absolute;right:70px;bottom:70px;width:330px;padding:18px;background:rgba(6,10,19,.8);backdrop-filter:blur(10px)">
  <p class="lab" style="--a:#7dd3fc">이어서 하기</p>
  <div style="margin-top:12px;display:flex;align-items:center;gap:14px">
    <div class="cut" style="--c:8px;width:56px;height:56px;background:url(clutch/mt-card.webp) center/cover"></div>
    <div style="flex:1"><b style="display:block;font-size:17px;color:#fff">홍감독</b><span style="font-size:12px;color:#9ca3af">나의 드림팀 · 26/26 · 12승 6패</span></div>
    <span class="btn" style="--c:8px;min-height:36px;padding:0 14px">열기</span>
  </div>
</div>` });

/* ───── B · 메인(로비) ───── */
const HOT_PLAYERS = [[97, '선동열', '1986 해태', 'SP', '#fde047', 'mt-locker.webp'], [95, '이승엽', '2003 삼성', '1B', '#fde047', 'mt-card.webp'], [93, '이종범', '1994 해태', 'CF', '#34d399', 'mt-tunnel.webp'], [92, '류현진', '2006 한화', 'SP', '#7dd3fc', 'mt-locker.webp'], [91, '이대호', '2010 롯데', '3B', '#34d399', 'mt-card.webp'], [90, '오승환', '2011 삼성', 'CL', '#7dd3fc', 'mt-locker.webp']];
const HOT_SEASONS = [['1994 해태', '14연승 · 이종범의 해', '#fde047'], ['2009 KIA', 'V10 · 김상현 MVP', '#34d399'], ['2018 두산', '93승 · 압도적 정규리그', '#7dd3fc']];
const HOT_MANAGERS = [['김응용', '한국시리즈 10회', '타격 +2 · 승부처 +1', '#fde047'], ['김성근', '벼랑 끝 관리 야구', '수비 +2 · 구위 +1', '#7dd3fc'], ['염경엽', '발야구와 데이터', '도루 +5%p · 타격 +1', '#34d399']];
const SHOP_MINI = [['에너지 드링크', '선수 1명 체력 +15 (3경기)', '120', '#34d399', 'mt-boost.webp'], ['레전드 팩', '80+ 선수 3장 중 1장 선택', '450', '#fde047', 'mt-pack.webp'], ['타격 특훈', '타자 1명 컨택 +3 (영구)', '300', '#7dd3fc', 'mt-boost.webp']];

S.push({
  name: 'B · 메인 로비', note: '홈은 <b>허브</b>다. 왼쪽 위 <b>내 라커</b>로 팀 관리에 들어가고, 그 아래 <b>바로 플레이</b>. 가운데는 <b>인기 선수·인기 시즌·감독 추천</b>으로 영입 동선을 만들고, 오른쪽은 <b>상점</b>과 <b>모드 방</b>. 카드·패널 문법은 드래프트 화면 그대로.', html: `
<div style="position:absolute;inset:0;background:url(clutch/mt-bg.webp) center/cover;opacity:.9"></div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,5,10,.92) 0,rgba(3,5,10,.82) 40%,rgba(3,5,10,.95) 100%)"></div>
<header style="position:relative;height:66px;display:flex;align-items:center;gap:22px;padding:0 26px;border-bottom:1px solid rgba(16,185,129,.25);background:linear-gradient(180deg,rgba(5,8,15,.96),rgba(5,8,15,.4))">
  <div><p class="lab" style="font-size:9px">Legend Draft</p><b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">메인</b></div>
  <span class="chip" style="--a:#34d399">감독 홍길동 · Lv.12</span>
  <div style="margin-left:auto;display:flex;align-items:center;gap:12px">
    <span class="chip" style="--a:#fde047">💰 12,400 G</span>
    <span class="btn" style="--c:8px;min-height:38px">기록</span><span class="btn" style="--c:8px;min-height:38px">설정</span>
  </div>
</header>
<div style="position:relative;display:grid;grid-template-columns:420px 1fr 340px;gap:16px;padding:18px 26px;height:calc(911px - 66px)">

  <!-- 왼쪽: 내 라커 + 바로 플레이 -->
  <div style="display:grid;grid-template-rows:1fr auto;gap:16px;min-height:0">
    <div class="cut frame hot" style="--c:18px;--a:#10b981;position:relative;overflow:hidden;padding:22px;background:linear-gradient(160deg,rgba(16,185,129,.2),rgba(5,8,15,.92) 55%),url(clutch/mt-locker.webp) center/cover">
      <p class="lab">My Locker</p>
      <h2 style="margin:10px 0 2px;font-size:36px;font-weight:800;color:#fff">나의 드림팀</h2>
      <p style="margin:0;font-size:13px;color:#cbd5e1">엔트리 26/26 · 코치진 4/4 · 팀 종합 <b class="d" style="font-size:18px;color:var(--em2)">87</b></p>
      <div class="bar" style="margin-top:16px"><i style="width:97%;background:linear-gradient(90deg,var(--em),var(--yel))"></i></div>
      <p style="margin:6px 0 0;font-size:12px;color:#9ca3af">1,942 / 2,000 CP · 남은 예산 58</p>
      <div style="display:flex;gap:10px;margin-top:18px">${HOT_PLAYERS.slice(0, 3).map((p) => cardTile(...p)).join('')}</div>
      <div style="display:flex;gap:10px;margin-top:18px"><span class="btn pri lg" style="--c:12px;flex:1">내 라커 들어가기</span><span class="btn lg" style="--c:12px">라인업</span></div>
    </div>
    <div class="cut frame" style="--c:16px;--a:#7dd3fc;overflow:hidden;padding:20px 22px;background:linear-gradient(120deg,rgba(125,211,252,.18),rgba(5,8,15,.92) 60%),url(clutch/mt-tunnel.webp) center/cover">
      <p class="lab" style="--a:#7dd3fc">Quick Play</p>
      <div style="display:flex;align-items:center;gap:18px;margin-top:10px">
        <div style="flex:1"><b style="display:block;font-size:24px;color:#fff">바로 플레이</b><span style="font-size:13px;color:#cbd5e1">AI 올스타 (전력 87) · 예상 승률 54%</span></div>
        <span class="btn pri lg" style="--c:12px;padding:0 34px">경기 시작</span>
      </div>
    </div>
  </div>

  <!-- 가운데: 추천 -->
  <div style="display:grid;grid-template-rows:auto auto 1fr;gap:16px;min-height:0">
    ${tile({
    label: 'Hot Players · 이번 주 인기 영입', a: '#fde047', body: `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:-22px"><span></span><span class="btn" style="--c:8px;min-height:32px;font-size:13px">선수 검색</span></div>
      <div style="display:flex;gap:12px;margin-top:12px">${HOT_PLAYERS.map((p) => cardTile(...p)).join('')}</div>`,
  })}
    ${tile({
    label: 'Hot Seasons · 인기 시즌', a: '#34d399', body: `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px">
        ${HOT_SEASONS.map(([t, s, c]) => `<div class="cut frame" style="--c:12px;--a:${c};position:relative;height:120px;overflow:hidden;background:url(clutch/mt-season.webp) center/cover">
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,.94))"></div>
          <div style="position:absolute;left:14px;right:14px;bottom:12px"><b style="display:block;font-size:19px;color:#fff">${t}</b><span style="font-size:12px;color:${c}">${s}</span></div>
        </div>`).join('')}
      </div>`,
  })}
    ${tile({
    label: 'Managers · 감독 추천', a: '#c4b5fd', style: 'min-height:0', body: `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px">
        ${HOT_MANAGERS.map(([n, d, e, c]) => `<div class="cut" style="--c:10px;padding:14px;background:rgba(5,8,15,.66);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
          <div style="display:flex;gap:12px;align-items:center">
            <div class="cut" style="--c:7px;width:52px;height:52px;background:url(clutch/mt-card.webp) center/cover;opacity:.8"></div>
            <div><b style="display:block;font-size:17px;color:#fff">${n}</b><span style="font-size:12px;color:#9ca3af">${d}</span></div>
          </div>
          <p style="margin:10px 0 0;font-size:12px;color:${c}">${e}</p>
          <span class="btn" style="--c:8px;min-height:34px;width:100%;margin-top:10px;font-size:13px">영입</span>
        </div>`).join('')}
      </div>`,
  })}
  </div>

  <!-- 오른쪽: 상점 · 모드 -->
  <div style="display:grid;grid-template-rows:1fr auto;gap:16px;min-height:0">
    ${tile({
    label: 'Shop · 오늘의 상품', a: '#fde047', style: 'min-height:0', body: `
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
        ${SHOP_MINI.map(([t, d, p, c, img]) => `<div class="cut" style="--c:10px;display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:center;padding:10px 12px;background:rgba(5,8,15,.66);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)">
          <div class="cut" style="--c:7px;width:56px;height:56px;background:url(clutch/${img}) center/cover"></div>
          <div><b style="display:block;font-size:15px;color:#fff">${t}</b><span style="font-size:12px;color:#9ca3af">${d}</span></div>
          <span class="d" style="font-size:18px;color:${c}">${p}G</span>
        </div>`).join('')}
      </div>
      <span class="btn" style="--c:10px;width:100%;margin-top:14px">상점 열기</span>
      <p style="margin:10px 0 0;font-size:12px;color:#6b7280">부스트는 선수·감독에게 붙여 쓰는 소모품입니다</p>`,
  })}
    ${tile({
    label: 'Modes · 모드 방', a: '#c4b5fd', body: `
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
        <div class="cut frame" style="--c:10px;--a:#c4b5fd;padding:12px 14px;background:rgba(196,181,253,.1)">
          <b style="display:block;font-size:16px;color:#fff">레전드 드래프트</b>
          <span style="font-size:12px;color:#9ca3af">랜덤 시즌에서 한 명씩 뽑아 한 판</span>
          <span class="btn" style="--c:8px;min-height:34px;width:100%;margin-top:10px;font-size:13px">입장</span>
        </div>
        <div class="cut" style="--c:10px;padding:12px 14px;background:rgba(5,8,15,.6);opacity:.55">
          <b style="display:block;font-size:16px;color:#fff">감독 리그</b><span style="font-size:12px;color:#9ca3af">다른 감독의 팀과 대결 · 준비 중</span>
        </div>
        <div class="cut" style="--c:10px;padding:12px 14px;background:rgba(5,8,15,.6);opacity:.55">
          <b style="display:block;font-size:16px;color:#fff">주간 도전</b><span style="font-size:12px;color:#9ca3af">특정 조건으로 팀을 짜는 과제 · 준비 중</span>
        </div>
      </div>`,
  })}
  </div>
</div>` });

/* ───── C · 상점 ───── */
const SHOP_ITEMS = [
  ['부스트', '에너지 드링크', '선수 1명 체력 +15 · 3경기', 120, '#34d399', 'mt-boost.webp'],
  ['부스트', '집중력 강화', '선수 1명 컨택 +4 · 1경기', 180, '#34d399', 'mt-boost.webp'],
  ['훈련', '타격 특훈', '타자 1명 컨택 +3 · 영구', 300, '#7dd3fc', 'mt-boost.webp'],
  ['훈련', '제구 교정', '투수 1명 제구 +3 · 영구', 300, '#7dd3fc', 'mt-boost.webp'],
  ['팩', '레전드 팩', '80+ 선수 3장 중 1장 선택', 450, '#fde047', 'mt-pack.webp'],
  ['팩', '시즌 팩', '고른 시즌에서 무작위 2장', 260, '#fde047', 'mt-pack.webp'],
  ['감독', '감독 계약서', '감독 3명 중 1명 영입', 520, '#c4b5fd', 'mt-card.webp'],
  ['운영', 'CP 확장 +40', '샐러리 캡 한도 +40 · 영구', 800, '#f87171', 'mt-pack.webp'],
];
S.push({
  name: 'C · 상점', note: '상점은 <b>부스트(소모품) · 훈련(영구 상승) · 팩(선수·감독) · 운영(캡 확장)</b> 네 갈래. 왼쪽에서 종류를 고르고 가운데에서 상품을 보고, 오른쪽에서 <b>적용 대상</b>을 고른 뒤 구매한다.', html: `
<div style="position:absolute;inset:0;background:url(clutch/mt-bg.webp) center/cover;opacity:.85"></div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,5,10,.94),rgba(3,5,10,.88))"></div>
<header style="position:relative;height:66px;display:flex;align-items:center;gap:22px;padding:0 26px;border-bottom:1px solid rgba(253,224,71,.25);background:linear-gradient(180deg,rgba(5,8,15,.96),rgba(5,8,15,.4))">
  <span class="btn" style="--c:8px;min-height:38px">← 메인</span>
  <div><p class="lab" style="--a:#fde047;font-size:9px">Shop</p><b style="display:block;font-size:19px;font-weight:800;color:#fff;margin-top:2px">상점</b></div>
  <div style="margin-left:auto;display:flex;gap:12px"><span class="chip" style="--a:#fde047">💰 12,400 G</span></div>
</header>
<div style="position:relative;display:grid;grid-template-columns:200px 1fr 320px;gap:16px;padding:18px 26px;height:calc(911px - 66px)">
  <div class="cut frame glass" style="--c:14px;padding:14px">
    <p class="lab" style="--a:#fde047">Category</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${[['전체', 1], ['부스트', 0], ['훈련', 0], ['팩', 0], ['감독', 0], ['운영', 0]].map(([t, on]) => `<div class="cut ${on ? 'frame hot' : ''}" style="--c:8px;--a:#fde047;padding:10px 12px;background:${on ? 'rgba(253,224,71,.12)' : 'rgba(5,8,15,.6)'};font-weight:700;color:${on ? '#fff' : '#9ca3af'}">${t}</div>`).join('')}
    </div>
    <p class="lab" style="--a:#34d399;margin-top:22px">Daily</p>
    <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;line-height:1.6">매일 09시에 상품이 새로 고쳐집니다.<br><b style="color:#fff">남은 시간 06:12</b></p>
  </div>

  <div class="cut frame glass" style="--c:14px;padding:16px 18px;min-height:0">
    <div style="display:flex;justify-content:space-between;align-items:center"><p class="lab" style="--a:#fde047">Items</p><span style="font-size:12px;color:#6b7280">8개</span></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:14px">
      ${SHOP_ITEMS.map(([cat, t, d, price, c, img], i) => `<div class="cut frame ${i === 4 ? 'hot' : ''}" style="--c:12px;--a:${c};position:relative;overflow:hidden;background:linear-gradient(180deg,rgba(14,23,38,.9),rgba(5,8,15,.95));padding:12px">
        <span class="d" style="position:absolute;right:10px;top:10px;font-size:10px;letter-spacing:.2em;color:${c}">${cat}</span>
        <div class="cut" style="--c:8px;height:104px;background:url(clutch/${img}) center/cover;opacity:.9"></div>
        <b style="display:block;margin-top:10px;font-size:15px;color:#fff">${t}</b>
        <span style="display:block;min-height:32px;font-size:12px;color:#9ca3af">${d}</span>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          <span class="d" style="font-size:20px;color:${c}">${price}G</span>
          <span class="btn ${i === 4 ? 'pri' : ''}" style="--c:7px;min-height:32px;padding:0 14px;font-size:13px">구매</span>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div style="display:grid;grid-template-rows:auto 1fr;gap:16px;min-height:0">
    <div class="cut frame hot" style="--c:14px;--a:#fde047;padding:16px;background:rgba(6,10,19,.86)">
      <p class="lab" style="--a:#fde047">선택한 상품</p>
      <div style="display:flex;gap:12px;align-items:center;margin-top:12px">
        <div class="cut" style="--c:8px;width:64px;height:64px;background:url(clutch/mt-pack.webp) center/cover"></div>
        <div><b style="display:block;font-size:17px;color:#fff">레전드 팩</b><span style="font-size:12px;color:#9ca3af">80+ 선수 3장 중 1장 선택</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px"><span style="font-size:13px;color:#9ca3af">가격</span><b class="d" style="font-size:26px;color:var(--yel)">450 G</b></div>
      <span class="btn pri lg" style="--c:12px;width:100%;margin-top:12px">구매하기</span>
    </div>
    <div class="cut frame glass" style="--c:14px;padding:16px;min-height:0">
      <p class="lab" style="--a:#7dd3fc">적용 대상</p>
      <p style="margin:10px 0 12px;font-size:12px;color:#9ca3af">부스트·훈련은 내 선수 한 명에게 붙습니다.</p>
      ${[[95, '이승엽', '1B · 체력 82', '#fde047'], [93, '이종범', 'CF · 체력 90', '#34d399'], [92, '류현진', 'SP · 체력 64', '#7dd3fc']].map(([o, n, m, c], i) => `<div class="cut ${i === 2 ? 'frame hot' : ''}" style="--c:8px;--a:${c};display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:10px 12px;margin-bottom:8px;background:rgba(5,8,15,.6)">
        <b class="d" style="font-size:22px;color:${c}">${o}</b>
        <div><b style="display:block;font-size:15px;color:#fff">${n}</b><span style="font-size:12px;color:#9ca3af">${m}</span></div>
      </div>`).join('')}
      <p style="margin:12px 0 0;font-size:12px;color:#6b7280">보유 중인 부스트는 라커의 선수 카드에 표시됩니다.</p>
    </div>
  </div>
</div>` });

document.getElementById('root').innerHTML = S.map((s) => `<div class="screen">${s.html}<span class="d" style="position:absolute;left:0;bottom:0;z-index:9;font-size:13px;font-weight:800;letter-spacing:.3em;color:#05080f;background:var(--em);padding:3px 12px">${s.name}</span></div><p class="note">${s.note}</p>`).join('');
