/* 내 라커 왼쪽 판 · SQUAD 텍스트 4안 — N8 방향(작은 메뉴 + 글자만). 포지션은 “인원/필수”, 넘기면 6/5, 자유 자리 · 외국인도 숫자만
   ?state=bad 이면 필수 부족 · 자유 초과 */
const bad = new URLSearchParams(location.search).get('state') === 'bad';
const POS = [
  ['SP', '선발', 5, 6], ['RP', '불펜', 6, bad ? 5 : 7], ['C', '포수', 2, 2],
  ['1B', '1루수', 1, 1], ['2B', '2루수', 1, bad ? 5 : 3], ['3B', '3루수', 1, 1], ['SS', '유격수', 1, 2],
  ['OF', '외야수', 4, bad ? 3 : 4], ['DH', '지명타자', 0, bad ? 2 : 0],
].map(([key, label, min, n]) => ({ key, label, min, n, extra: Math.max(0, n - min), miss: Math.max(0, min - n) }));
const SIZE = 26;
const FREE = SIZE - POS.reduce((s, p) => s + p.min, 0);
const USED = POS.reduce((s, p) => s + p.extra, 0);
const ENTRY = POS.reduce((s, p) => s + p.n, 0);
const FOREIGN = { n: 3, max: 3 };
const C = { bad: '#f87171', over: '#7dd3fc', ok: '#e5e7eb', full: '#34d399', dim: '#6b7280', lab: '#9ca3af' };
const byKey = Object.fromEntries(POS.map((p) => [p.key, p]));
/** 인원 색: 필수 부족 빨강 · 필수만큼 초록 · 넘기면 하늘(자유 자리를 쓴 것) · 필수 0 인데 없음은 회색 */
const tint = (p) => (p.miss ? C.bad : p.extra ? C.over : p.min ? C.full : C.dim);
const freeTint = USED > FREE ? C.bad : USED === FREE ? C.full : C.ok;
const entryTint = ENTRY === SIZE ? C.full : C.bad;
const frac = (n, d, color, size = 15) => `<span class="d" style="white-space:nowrap"><b style="font-size:${size}px;color:${color}">${n}</b><small style="font-size:${Math.round(size * 0.8)}px;color:${C.dim}">/${d}</small></span>`;

const menu = () => ['영입|선수 검색 · 1206명|tile-locker', `내 선수|${ENTRY} / ${SIZE}명|mt-card|on`, '감독·코치|0 / 4 자리|silhouette-coach'].map((s) => {
  const [t, sub, img, on] = s.split('|');
  return `<div class="item sm cut ${on ? 'on' : ''}"><span class="th" style="background-image:url(/ui/mt/${img}.webp)"></span><span><b style="display:block;font-size:15px;font-weight:900;color:${on ? '#fff' : '#d1d5db'}">${t}</b><small class="d" style="font-size:11px;letter-spacing:.12em;color:#9ca3af">${sub}</small></span></div>`;
}).join('');
const lab = (right = '') => `<div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px 8px"><span class="lab" style="font-size:10px">Squad</span>${right}</div>`;
const V = [];

/* 1 · 한 열 목록 */
V.push({ id: 'T1', name: '한 열 목록', note: 'N8 그대로 한 열. 줄 26px, 오른쪽 “6/5” 한 칸. 아래 자유 자리 · 외국인 · 엔트리 세 줄을 같은 문법으로',
  squad: () => {
    const line = (label, value, strong = false) => `<div style="display:flex;justify-content:space-between;align-items:center;height:26px;padding:0 4px;border-bottom:1px solid rgba(255,255,255,.07)"><span style="font-size:13px;color:${strong ? '#d1d5db' : C.lab}">${label}</span>${value}</div>`;
    return `${lab()}<div>${POS.map((p) => line(p.label, frac(p.n, p.min, tint(p)))).join('')}</div>
      <div style="margin-top:8px">${line('자유 자리', frac(USED, FREE, freeTint), true)}${line('외국인', frac(FOREIGN.n, FOREIGN.max, FOREIGN.n > FOREIGN.max ? C.bad : C.ok), true)}${line('엔트리', frac(ENTRY, SIZE, entryTint), true)}</div>`;
  } });

/* 2 · 두 열 목록 */
V.push({ id: 'T2', name: '두 열 목록', note: '포지션을 두 열로 나눠 줄 수를 반으로(투수 · 포수 · 외야 · 지명 | 내야). 맨 위 머리 줄에 엔트리, 아래 한 줄에 자유 자리 · 외국인',
  squad: () => {
    const cell = (p) => `<div style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 5px;border-bottom:1px solid rgba(255,255,255,.07)"><span style="font-size:12.5px;color:${C.lab}">${p.label}</span>${frac(p.n, p.min, tint(p))}</div>`;
    return `${lab(frac(ENTRY, SIZE, entryTint, 14))}
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:10px"><div>${[byKey.SP, byKey.RP, byKey.C, byKey.OF, byKey.DH].map(cell).join('')}</div><div>${[byKey['1B'], byKey['2B'], byKey['3B'], byKey.SS].map(cell).join('')}</div></div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;padding:0 5px;font-size:13px;color:#d1d5db"><span>자유 자리 ${frac(USED, FREE, freeTint)}</span><span>외국인 ${frac(FOREIGN.n, FOREIGN.max, C.ok)}</span></div>`;
  } });

/* 3 · 묶음 제목 목록 */
V.push({ id: 'T3', name: '묶음 제목 목록', note: '투수 · 포수/지명 · 내야 · 외야 작은 제목 아래 줄 목록. 줄 사이 선 없이 간격만, 제목 옆에 그 묶음 합',
  squad: () => {
    const group = (title, list) => {
      const n = list.reduce((s, p) => s + p.n, 0);
      const m = list.reduce((s, p) => s + p.min, 0);
      return `<div style="margin-bottom:6px"><div class="d" style="display:flex;justify-content:space-between;padding:0 4px 2px;font-size:11px;letter-spacing:.2em;color:#4b5563"><span>${title}</span><span>${n}/${m}</span></div>
        ${list.map((p) => `<div style="display:flex;justify-content:space-between;align-items:center;height:23px;padding:0 4px"><span style="font-size:13px;color:${C.lab}">${p.label}</span>${frac(p.n, p.min, tint(p))}</div>`).join('')}</div>`;
    };
    return `${lab(frac(ENTRY, SIZE, entryTint, 14))}
      ${group('PITCHER', [byKey.SP, byKey.RP])}${group('CATCHER · DH', [byKey.C, byKey.DH])}${group('INFIELD', [byKey['1B'], byKey['2B'], byKey['3B'], byKey.SS])}${group('OUTFIELD', [byKey.OF])}
      <div style="height:1px;margin:2px 4px 6px;background:rgba(255,255,255,.1)"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;height:24px;padding:0 4px"><span style="font-size:13px;color:#d1d5db">자유 자리</span>${frac(USED, FREE, freeTint)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;height:24px;padding:0 4px"><span style="font-size:13px;color:#d1d5db">외국인</span>${frac(FOREIGN.n, FOREIGN.max, C.ok)}</div>`;
  } });

/* 4 · 점선 기록지 */
V.push({ id: 'T4', name: '점선 기록지', note: '“선발 ········ 6/5” 처럼 이름과 숫자를 점선으로 잇는 경기 기록지 문법. 맨 아래 엔트리만 크게',
  squad: () => {
    const dotted = (label, value, labColor = C.lab) => `<div style="display:flex;align-items:baseline;gap:6px;height:24px;padding:0 4px"><span style="font-size:13px;color:${labColor};white-space:nowrap">${label}</span><i style="flex:1;border-bottom:1px dotted rgba(148,163,184,.3);transform:translateY(-3px)"></i>${value}</div>`;
    return `${lab()}${POS.map((p) => dotted(p.label, frac(p.n, p.min, tint(p)))).join('')}
      <div style="height:8px"></div>${dotted('자유 자리', frac(USED, FREE, freeTint), '#d1d5db')}${dotted('외국인', frac(FOREIGN.n, FOREIGN.max, C.ok), '#d1d5db')}
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:10px;padding:8px 4px 0;border-top:1px solid rgba(255,255,255,.1)"><span class="d" style="font-size:12px;letter-spacing:.24em;color:#6b7280">ENTRY</span>${frac(ENTRY, SIZE, entryTint, 24)}</div>`;
  } });

const stage = (v) => `<div class="stage"><nav class="nav cut frame"><p class="lab" style="padding:4px 4px 0">Menu</p>${menu()}<div class="squad" data-squad>${v.squad()}</div></nav></div>`;
document.getElementById('top').innerHTML = `<b>왼쪽 SQUAD 텍스트 4안</b><span>실제 크기 272×807 · 인원/필수 · 자유 자리 ${FREE}</span><a href="?" class="${bad ? '' : 'on'}">정상 엔트리</a><a href="?state=bad" class="${bad ? 'on' : ''}">필수 부족 · 자유 초과</a>`;
document.getElementById('root').innerHTML = `<div class="grid">${V.map((v) => `<section><div class="hd"><b><i>${v.id}</i>${v.name}</b><p>${v.note}</p><span class="m" data-meta></span></div>${stage(v)}</section>`).join('')}</div>`;
requestAnimationFrame(() => document.querySelectorAll('section').forEach((sec) => {
  const nav = sec.querySelector('.nav');
  const sq = sec.querySelector('[data-squad]');
  const over = nav.scrollHeight > nav.clientHeight + 1 || [...sq.querySelectorAll('*')].some((e) => e.getBoundingClientRect().right > nav.getBoundingClientRect().right + 1);
  const m = sec.querySelector('[data-meta]');
  m.textContent = `SQUAD 높이 ${Math.round(sq.getBoundingClientRect().height)}px · ${over ? '넘침' : '스크롤 없음'}`;
  if (over) m.classList.add('bad');
}));
