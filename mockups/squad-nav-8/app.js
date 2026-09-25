/* 내 라커 왼쪽 판 · SQUAD 8안 — 272×807 실제 크기
   규칙 보기: 포지션마다 필수(최소) 인원은 꼭 채우고, 나머지는 어느 포지션에나 쓰는 자유 자리(26 − 필수 합)에서 가져간다
   ?state=bad 이면 필수를 못 채운 · 자유 자리를 넘긴 엔트리 */
const bad = new URLSearchParams(location.search).get('state') === 'bad';
const POS = [
  ['SP', '선발', 5, 6], ['RP', '불펜', 6, bad ? 5 : 7], ['C', '포수', 2, 2],
  ['1B', '1루수', 1, 1], ['2B', '2루수', 1, bad ? 5 : 3], ['3B', '3루수', 1, 1], ['SS', '유격수', 1, 2],
  ['OF', '외야수', 4, bad ? 3 : 4], ['DH', '지명', 0, bad ? 2 : 0],
].map(([key, label, min, n]) => ({ key, label, min, n, extra: Math.max(0, n - min), miss: Math.max(0, min - n) }));
const SIZE = 26;
const REQ = POS.reduce((s, p) => s + p.min, 0); // 21
const FREE = SIZE - REQ; // 5
const USED = POS.reduce((s, p) => s + p.extra, 0);
const MISS = POS.reduce((s, p) => s + p.miss, 0);
const ENTRY = POS.reduce((s, p) => s + p.n, 0);
const FOREIGN = { n: 3, max: 3 };
const C = { bad: '#f87171', em: '#34d399', free: '#7dd3fc', dim: '#6b7280', text: '#e5e7eb' };
const PLAY = { SP: 5, RP: 8 };
const freeColor = USED > FREE ? C.bad : USED === FREE ? C.free : '#9ca3af';
const byKey = Object.fromEntries(POS.map((p) => [p.key, p]));

const menu = (small = false) => ['영입|선수 검색 · 1206명|tile-locker', `내 선수|${ENTRY} / ${SIZE}명|mt-card|on`, '감독·코치|0 / 4 자리|silhouette-coach'].map((s) => {
  const [t, sub, img, on] = s.split('|');
  return `<div class="item cut ${on ? 'on' : ''} ${small ? 'sm' : ''}"><span class="th" style="background-image:url(/ui/mt/${img}.webp)"></span><span><b style="display:block;font-size:${small ? 15 : 16}px;font-weight:900;color:${on ? '#fff' : '#d1d5db'}">${t}</b><small class="d" style="font-size:11px;letter-spacing:.12em;color:#9ca3af">${sub}</small></span></div>`;
}).join('');
const squadLab = (right = '') => `<div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px 8px"><span class="lab" style="font-size:10px">Squad</span>${right}</div>`;
const entryBadge = () => `<b class="d" style="font-size:13px;color:${ENTRY === SIZE && !MISS && USED <= FREE ? C.em : C.bad}">${ENTRY}/${SIZE}</b>`;
/** 포지션 숫자: 필수를 못 채우면 빨강, 필수 위로 더 넣은 만큼 +k(자유 자리 색) */
const count = (p, size = 16) => `<b class="d" style="font-size:${size}px;color:${p.miss ? C.bad : C.text}">${p.n}</b>${p.extra ? `<small class="d" style="margin-left:2px;font-size:${Math.round(size * 0.7)}px;color:${C.free}">+${p.extra}</small>` : ''}`;
/** 자유 자리 게이지 */
const freeBar = (compact = false) => `<div style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;${compact ? '' : 'margin-top:8px'}">
  <span style="font-size:12px;color:#9ca3af">자유 자리</span>
  <span style="display:flex;gap:3px">${Array.from({ length: Math.max(FREE, USED) }, (_, i) => `<i style="flex:1;height:8px;background:${i < USED ? (i >= FREE ? C.bad : C.free) : 'transparent'};box-shadow:inset 0 0 0 1px ${i >= FREE ? C.bad : 'rgba(125,211,252,.45)'}"></i>`).join('')}</span>
  <b class="d" style="font-size:14px;color:${freeColor}">${USED}/${FREE}</b></div>`;
const foreignLine = () => `<div class="d" style="display:flex;justify-content:space-between;padding:0 2px;font-size:13px;color:#9ca3af"><span>외국인</span><b style="color:${FOREIGN.n > FOREIGN.max ? C.bad : '#fde047'}">${FOREIGN.n}/${FOREIGN.max}</b></div>`;
const V = [];

/* 1 · 3×3 칸 격자 */
V.push({ id: 'N1', name: '3×3 칸 격자', note: '포지션 아홉 칸: 큰 숫자 + 필수 몇 명(작게), 필수를 넘긴 만큼 +k. 아래에 자유 자리 5칸 게이지',
  squad: () => `${squadLab(entryBadge())}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${POS.map((p) => `<div class="cut" style="--c:6px;padding:6px 8px 5px;background:rgba(255,255,255,.04);box-shadow:inset 0 -2px 0 ${p.miss ? C.bad : p.extra ? 'rgba(125,211,252,.55)' : 'rgba(255,255,255,.08)'}">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#9ca3af"><span>${p.label}</span><span class="d" style="color:${C.dim}">${p.min ? `필수 ${p.min}` : ''}</span></div>
      <div style="line-height:1.1">${count(p, 22)}</div></div>`).join('')}</div>
    ${freeBar()}<div style="height:6px"></div>${foreignLine()}` });

/* 2 · 필수 점 + 자유 점 */
V.push({ id: 'N2', name: '필수 점 + 자유 점', note: '줄마다 필수 인원만큼 흰 테두리 점(채우면 초록), 그 뒤 더 넣은 선수는 하늘색 점. 필수를 못 채운 점은 빨간 테두리',
  squad: () => `${squadLab(entryBadge())}
    <div style="display:flex;flex-direction:column;gap:3px">${POS.map((p) => `<div style="display:grid;grid-template-columns:50px 1fr 30px;align-items:center;gap:8px;height:22px">
      <span style="font-size:12.5px;color:#9ca3af">${p.label}</span>
      <span style="display:flex;gap:3px">${Array.from({ length: p.min }, (_, i) => `<i style="width:13px;height:9px;background:${i < p.n ? C.em : 'transparent'};box-shadow:inset 0 0 0 1px ${i < p.n ? C.em : C.bad}"></i>`).join('')}${p.extra ? `<i style="width:4px"></i>${Array.from({ length: p.extra }, () => `<i style="width:13px;height:9px;background:${C.free}"></i>`).join('')}` : ''}${!p.min && !p.n ? '<small style="font-size:11px;color:#4b5563">-</small>' : ''}</span>
      <span style="text-align:right">${count(p, 14)}</span></div>`).join('')}
      <div style="height:1px;margin:4px 0;background:rgba(255,255,255,.08)"></div>${freeBar(true)}<div style="height:4px"></div>${foreignLine()}</div>` });

/* 3 · 묶음 카드 */
V.push({ id: 'N3', name: '묶음 카드', note: '투수 · 포수/지명 · 내야 · 외야 네 묶음, 안은 “선발 6⁺¹ · 불펜 7⁺¹” 한 줄. 묶음 오른쪽 위에 필수 합',
  squad: () => {
    const block = (title, list) => `<div class="cut" style="--c:7px;padding:6px 9px;background:rgba(255,255,255,.04);box-shadow:inset 3px 0 0 ${list.some((p) => p.miss) ? C.bad : 'transparent'}">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#6b7280"><span>${title}</span><span class="d">필수 ${list.reduce((s, p) => s + p.min, 0)}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:2px">${list.map((p) => `<span style="font-size:13px;color:#cbd5e1">${p.label} ${count(p, 16)}</span>`).join('')}</div></div>`;
    return `${squadLab(entryBadge())}<div style="display:flex;flex-direction:column;gap:4px">
      ${block('투수', [byKey.SP, byKey.RP])}${block('포수 · 지명', [byKey.C, byKey.DH])}${block('내야', [byKey['1B'], byKey['2B'], byKey['3B'], byKey.SS])}${block('외야', [byKey.OF])}
      ${freeBar()}<div style="height:4px"></div>${foreignLine()}</div>`;
  } });

/* 4 · 칩 흐름 */
V.push({ id: 'N4', name: '칩 흐름', note: '포지션 칩: 숫자 + 필수를 넘긴 +k. 필수 부족이면 칩 테두리 빨강. 맨 앞에 자유 자리 칩(5칸 중 몇 칸 썼는지)',
  squad: () => `${squadLab(entryBadge())}
    <div style="display:flex;flex-wrap:wrap;gap:5px">
      <span class="cut" style="--c:5px;display:inline-flex;align-items:baseline;gap:5px;padding:4px 8px;background:rgba(125,211,252,.1);box-shadow:inset 0 0 0 1px rgba(125,211,252,.5)"><span style="font-size:12px;color:#bae6fd">자유 자리</span><b class="d" style="font-size:16px;color:${freeColor}">${USED}</b><small class="d" style="font-size:10px;color:${C.dim}">/${FREE}</small></span>
      ${POS.map((p) => `<span class="cut" style="--c:5px;display:inline-flex;align-items:baseline;gap:5px;padding:4px 8px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px ${p.miss ? C.bad : 'rgba(148,163,184,.22)'}"><span style="font-size:12px;color:#9ca3af">${p.label}</span>${count(p, 16)}${p.miss ? `<small style="font-size:10.5px;color:${C.bad}">−${p.miss}</small>` : ''}</span>`).join('')}
      <span class="cut" style="--c:5px;display:inline-flex;align-items:baseline;gap:5px;padding:4px 8px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(253,224,71,.5)"><span style="font-size:12px;color:#9ca3af">외국인</span><b class="d" style="font-size:16px;color:#fde047">${FOREIGN.n}</b><small class="d" style="font-size:10px;color:${C.dim}">/${FOREIGN.max}</small></span></div>` });

/* 5 · 두 열 표 */
V.push({ id: 'N5', name: '두 열 표', note: '표를 두 열로 접어 줄 수를 반으로. 숫자 옆 위첨자로 필수(ᵐⁱⁿ 대신 “필5”), 넘긴 인원은 +k. 머리 줄 없음',
  squad: () => {
    const cell = (p) => `<div style="display:flex;align-items:baseline;justify-content:space-between;height:28px;padding:0 6px;border-bottom:1px solid rgba(255,255,255,.07)"><span style="font-size:12.5px;color:#9ca3af">${p.label}<sup class="d" style="margin-left:3px;font-size:9.5px;color:${C.dim}">${p.min ? `필${p.min}` : ''}</sup></span><span>${count(p, 16)}</span></div>`;
    return `${squadLab(entryBadge())}<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:8px">
      <div>${[byKey.SP, byKey.RP, byKey.C, byKey.OF, byKey.DH].map(cell).join('')}</div>
      <div>${[byKey['1B'], byKey['2B'], byKey['3B'], byKey.SS].map(cell).join('')}<div style="display:flex;align-items:baseline;justify-content:space-between;height:28px;padding:0 6px;border-bottom:1px solid rgba(255,255,255,.07)"><span style="font-size:12.5px;color:#9ca3af">외국인</span><b class="d" style="font-size:16px;color:#fde047">${FOREIGN.n}/${FOREIGN.max}</b></div></div></div>
      ${freeBar()}`;
  } });

/* 6 · 요약 + 문제만 */
V.push({ id: 'N6', name: '요약 + 문제만', note: '엔트리 · 자유 자리 · 외국인 세 칸 요약과 포지션 숫자(+k)만. 필수를 못 채우거나 자유 자리를 넘기면 그 내용만 빨간 줄로',
  squad: () => {
    const issues = POS.filter((p) => p.miss).map((p) => `${p.label} ${p.miss}명 더 필요 (필수 ${p.min})`).concat(USED > FREE ? [`자유 자리 ${USED - FREE}명 초과`] : []);
    const box = (k, v, c) => `<div class="cut" style="--c:6px;padding:5px 8px;background:rgba(255,255,255,.045)"><div style="font-size:10.5px;color:#9ca3af">${k}</div><b class="d" style="font-size:20px;color:${c}">${v}</b></div>`;
    return `${squadLab()}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${box('엔트리', `${ENTRY}/${SIZE}`, ENTRY === SIZE ? C.em : C.bad)}${box('자유 자리', `${USED}/${FREE}`, freeColor)}${box('외국인', `${FOREIGN.n}/${FOREIGN.max}`, '#fde047')}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0 6px;margin-top:8px">${POS.map((p) => `<div style="display:flex;justify-content:space-between;height:25px;align-items:center;padding:0 4px;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:12px;color:#9ca3af">${p.label.replace('수', '')}</span><span>${count(p, 15)}</span></div>`).join('')}</div>
      ${issues.length ? `<div style="display:flex;flex-direction:column;gap:3px;margin-top:8px">${issues.map((t) => `<div class="cut" style="--c:5px;padding:4px 8px;font-size:12.5px;font-weight:700;color:#fecaca;background:rgba(248,113,113,.12);box-shadow:inset 3px 0 0 ${C.bad}">${t}</div>`).join('')}</div>` : ''}`;
  } });

/* 7 · 막대 게이지 */
V.push({ id: 'N7', name: '막대 게이지', note: '줄마다 막대: 필수 구간(흰 테두리)을 채우면 초록, 넘긴 인원은 막대 뒤에 하늘색으로 이어 붙음. 오른쪽은 숫자+k',
  squad: () => {
    const unit = 16;
    return `${squadLab(entryBadge())}
      <div style="display:flex;flex-direction:column;gap:2px">${POS.map((p) => `<div style="display:grid;grid-template-columns:50px 1fr 34px;align-items:center;gap:8px;height:23px">
        <span style="font-size:12.5px;color:#9ca3af">${p.label}</span>
        <span style="display:flex;align-items:center;height:7px">${p.min ? `<span style="position:relative;width:${p.min * unit}px;height:7px;box-shadow:inset 0 0 0 1px ${p.miss ? C.bad : 'rgba(229,231,235,.55)'}"><i style="position:absolute;left:0;top:0;bottom:0;width:${(Math.min(p.n, p.min) / p.min) * 100}%;background:${p.miss ? C.bad : C.em}"></i></span>` : ''}${p.extra ? `<i style="width:${p.extra * unit}px;height:7px;margin-left:2px;background:${C.free}"></i>` : ''}</span>
        <span style="text-align:right">${count(p, 14)}</span></div>`).join('')}
        <div style="height:1px;margin:4px 0;background:rgba(255,255,255,.08)"></div>${freeBar(true)}<div style="height:4px"></div>${foreignLine()}</div>`;
  } });

/* 8 · 메뉴 줄이기 + 간단 표 */
V.push({ id: 'N8', name: '메뉴 줄이기 + 간단 표', note: '위 메뉴 판 높이를 70 → 52px 로 줄이고, 표는 “필수 5 · 6⁺¹” 두 칸만 · 줄 높이 26px. 맨 아래 자유 자리 게이지',
  small: true,
  squad: () => `${squadLab(entryBadge())}
    <div>${POS.map((p) => `<div style="display:grid;grid-template-columns:1fr 48px 44px;align-items:center;height:26px;padding:0 4px;border-bottom:1px solid rgba(255,255,255,.07)"><span style="font-size:13px;color:#9ca3af">${p.label}${PLAY[p.key] ? `<small style="margin-left:4px;font-size:10.5px;color:#4b5563">출전 ${PLAY[p.key]}</small>` : ''}</span><small class="d" style="font-size:12px;color:${C.dim}">${p.min ? `필수 ${p.min}` : '-'}</small><span style="text-align:right">${count(p, 15)}</span></div>`).join('')}</div>
    ${freeBar()}<div style="height:6px"></div>${foreignLine()}` });

/* ───── 렌더 ───── */
const stage = (v) => `<div class="stage"><nav class="nav cut frame"><p class="lab" style="padding:4px 4px 0">Menu</p>${menu(v.small)}<div class="squad" data-squad>${v.squad()}</div></nav></div>`;
document.getElementById('top').innerHTML = `<b>왼쪽 SQUAD 8안</b><span>실제 크기 272×807 · 필수 ${REQ}자리 + 자유 ${FREE}자리</span><a href="?" class="${bad ? '' : 'on'}">정상 엔트리</a><a href="?state=bad" class="${bad ? 'on' : ''}">필수 부족 · 자유 초과</a>`;
document.getElementById('root').innerHTML = `<div class="grid">${V.map((v) => `<section><div class="hd"><b><i>${v.id}</i>${v.name}</b><p>${v.note}</p><span class="m" data-meta></span></div>${stage(v)}</section>`).join('')}</div>`;
requestAnimationFrame(() => document.querySelectorAll('section').forEach((sec) => {
  const nav = sec.querySelector('.nav');
  const sq = sec.querySelector('[data-squad]');
  const over = nav.scrollHeight > nav.clientHeight + 1 || [...sq.querySelectorAll('*')].some((e) => e.getBoundingClientRect().right > nav.getBoundingClientRect().right + 1);
  const m = sec.querySelector('[data-meta]');
  m.textContent = `SQUAD 높이 ${Math.round(sq.getBoundingClientRect().height)}px · ${over ? '넘침' : '스크롤 없음'}`;
  if (over) m.classList.add('bad');
}));
