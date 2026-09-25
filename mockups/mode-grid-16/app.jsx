/* 플레이 · 베이직 모드 가운데 판 — 자리를 덜 먹는 16안
   A그룹(1+4): 작은 카드 격자 + 대표 카드  ·  B그룹: 2 목록 · 3 묶음 접기 · 5 가로 띠 · 6 요약
   테두리 · 제목 · 칩 · 줄은 게임에 있는 그대로 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, KV } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';

const G = '#10b981';
const KIND_KO = { club: '구단 시즌', legend: '레전드', national: '국가대표' };
const T = SERIES.map((s) => ({
  key: s.id, year: s.year || 'ALL', title: s.title, kind: s.kind,
  sub: `${s.subtitle || KIND_KO[s.kind] || ''} · ${s.players.length}명`,
  star: [...s.players].sort((a, b) => b.overall - a.overall)[0], champ: !!s.champion,
}));
const art = (t) => (t.star ? `url(cards/${encodeURIComponent(t.star.id)}.webp), url(profiles/${encodeURIComponent(t.star.id)}.webp)` : undefined);
const BY_KIND = ['legend', 'club', 'national'].map((k) => [KIND_KO[k], T.filter((x) => x.kind === k)]).filter(([, l]) => l.length);
const DECADES = ['1980', '1990', '2000', '2010', '2020'].map((d) => [`${d}년대`, T.filter((x) => String(x.year).startsWith(d.slice(0, 3)))]).filter(([, l]) => l.length);

const head = (right) => (
  <div className="flex flex-wrap items-baseline gap-3">
    <p className="ui-lab font-display">All Series Season</p>
    {right}
  </div>
);
const section = (children, right) => (
  <section className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col p-6" style={{ '--c': '20px', '--a': G }}>
    {head(right)}
    {children}
  </section>
);
/* 카드 — 지금 쓰는 티켓과 같은 생김새, 크기만 조절 */
const ticket = (t, { h = 176, big = false } = {}) => (
  <div key={t.key} className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover bg-no-repeat" style={{ '--c': big ? '12px' : '8px', height: h, backgroundImage: art(t), backgroundPosition: '60% 18%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.55),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,rgba(5,8,15,.92) 72%,#05080f)' }} />
    <span className="absolute left-2 top-1 font-display font-extrabold leading-none" style={{ fontSize: big ? 30 : 18, color: G, textShadow: `0 0 14px ${G}88,0 2px 4px #000` }}>{t.year}</span>
    <div className="absolute inset-x-2 bottom-1.5">
      <p className={`truncate font-black text-white ${big ? 'text-base' : 'text-[12.5px]'}`}>{t.title}</p>
      {big && <p className="truncate text-[11px] text-gray-400">{t.sub}</p>}
    </div>
  </div>
);
const grid = (list, cols, h) => (
  <div className="syn-scroll mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1" style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
    {list.map((t) => ticket(t, { h }))}
  </div>
);
const chips = (list) => (
  <div className="syn-scroll mt-3 flex min-h-0 flex-1 flex-wrap content-start gap-1.5 overflow-y-auto pr-1">
    {list.map((t) => (
      <span key={t.key} className="ui-cut px-2.5 py-1 text-[12.5px] text-gray-300" style={{ '--c': '5px', background: 'rgba(255,255,255,.05)' }}>
        <b className="font-display text-[11px]" style={{ color: G }}>{t.year}</b> {t.title}
      </span>
    ))}
  </div>
);
const rows = (list, cols = 2) => (
  <div className="syn-scroll mt-3 grid min-h-0 flex-1 content-start gap-x-4 gap-y-1 overflow-y-auto pr-1" style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
    {list.map((t) => (
      <div key={t.key} className="flex items-center gap-2.5 border-b border-white/[0.07] py-1.5">
        <span className="ui-cut block h-8 w-7 shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '4px', backgroundImage: art(t), backgroundPosition: '60% 12%' }} />
        <b className="font-display text-[12px]" style={{ color: G }}>{t.year}</b>
        <b className="min-w-0 flex-1 truncate text-[13px] text-white">{t.title}</b>
        <span className="text-[11.5px] text-gray-500">{t.sub.split(' · ').pop()}</span>
      </div>
    ))}
  </div>
);
const featured = (n = 4, h = 168) => (
  <div className="mt-3 grid shrink-0 gap-2" style={{ gridTemplateColumns: `repeat(${n},minmax(0,1fr))` }}>
    {T.slice(0, n).map((t) => ticket(t, { h, big: true }))}
  </div>
);
const grpLine = (ko, n) => (
  <div className="mt-3 flex shrink-0 items-center gap-2">
    <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: G }}>{ko.toUpperCase()}</span>
    <b className="text-[12px] text-gray-300">{ko} {n}</b>
    <span className="h-px flex-1 bg-white/10" />
  </div>
);
const count = <p className="text-sm text-gray-400">{T.length} 시리즈 · {SERIES.reduce((n, s) => n + s.players.length, 0).toLocaleString()}명</p>;

/* ═══ A그룹: 1+4 (대표 카드 + 작은 격자) ═══ */
const A1 = () => section(<>{featured(4, 168)}{grid(T.slice(4), 6, 96)}</>, count);
const A2 = () => section(<>{featured(3, 190)}{grid(T.slice(3), 7, 86)}</>, count);
const A3 = () => section(<>{featured(4, 150)}{grpLine('그 밖의 시리즈', T.length - 4)}{grid(T.slice(4), 8, 76)}</>, count);
const A4 = () => section(<>{featured(2, 210)}{grid(T.slice(2), 6, 104)}</>, count);
const A5 = () => section(<>{featured(4, 168)}{chips(T.slice(4))}</>, count);
const A6 = () => section(<>{featured(4, 168)}{rows(T.slice(4), 3)}</>, count);
const A7 = () => section(<>{featured(6, 140)}{grid(T.slice(6), 7, 84)}</>, count);
const A8 = () => section(<>{featured(4, 176)}{grpLine('전체', T.length)}{grid(T.slice(4), 6, 92)}</>, count);

/* ═══ B그룹 ═══ */
/* 2. 목록 줄 */
const B21 = () => section(rows(T, 2), count);
const B22 = () => section(rows(T, 3), count);
/* 3. 묶음 접기 — 묶음 머리 + 접힌 칩 */
const B31 = () => section(
  <div className="syn-scroll mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
    {BY_KIND.map(([ko, list]) => (
      <React.Fragment key={ko}>
        {grpLine(ko, list.length)}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))' }}>{list.slice(0, 6).map((t) => ticket(t, { h: 92 }))}</div>
        {list.length > 6 && <p className="mt-1.5 text-[12px] text-gray-500">+ {list.length - 6}개 더 보기</p>}
      </React.Fragment>
    ))}
  </div>, count,
);
const B32 = () => section(
  <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
    {BY_KIND.map(([ko, list], i) => (
      <div key={ko} className="ui-cut flex items-center gap-3 px-4 py-3" style={{ '--c': '10px', background: i === 0 ? `color-mix(in srgb,${G} 12%,transparent)` : 'rgba(255,255,255,.04)' }}>
        <b className="text-lg text-white">{ko}</b>
        <span className="text-sm text-gray-400">{list.length}개</span>
        <span className="ml-auto flex gap-1.5">
          {list.slice(0, 5).map((t) => <span key={t.key} className="ui-cut block h-10 w-8 bg-[#0b1220] bg-cover" style={{ '--c': '4px', backgroundImage: art(t), backgroundPosition: '60% 12%' }} />)}
        </span>
        <span className="font-display text-gray-500">›</span>
      </div>
    ))}
    {grpLine(BY_KIND[0][0], BY_KIND[0][1].length)}
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))' }}>{BY_KIND[0][1].slice(0, 12).map((t) => ticket(t, { h: 92 }))}</div>
  </div>, count,
);
/* 5. 가로 띠 */
const B51 = () => section(
  <div className="syn-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
    {DECADES.map(([ko, list]) => (
      <React.Fragment key={ko}>
        {grpLine(ko, list.length)}
        <div className="flex gap-2 overflow-x-auto pb-1">{list.map((t) => <span key={t.key} className="shrink-0" style={{ width: 132 }}>{ticket(t, { h: 96 })}</span>)}</div>
      </React.Fragment>
    ))}
  </div>, count,
);
const B52 = () => section(
  <div className="syn-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
    {BY_KIND.map(([ko, list]) => (
      <React.Fragment key={ko}>
        {grpLine(ko, list.length)}
        <div className="flex gap-2 overflow-x-auto pb-1">{list.map((t) => <span key={t.key} className="shrink-0" style={{ width: 150 }}>{ticket(t, { h: 110 })}</span>)}</div>
      </React.Fragment>
    ))}
  </div>, count,
);
/* 6. 요약 */
const B61 = () => section(
  <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
    <div className="grid shrink-0 grid-cols-3 gap-2">
      {[['시리즈', T.length], ['선수', SERIES.reduce((n, s) => n + s.players.length, 0).toLocaleString()], ['구단 · 레전드 · 국가대표', BY_KIND.length]].map(([k, v]) => (
        <div key={k} className="ui-cut bg-white/[0.045] px-4 py-3" style={{ '--c': '10px' }}>
          <div className="text-[11px] text-gray-400">{k}</div>
          <div className="font-display text-3xl font-bold text-white">{v}</div>
        </div>
      ))}
    </div>
    {grpLine('대표 시리즈', 8)}
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>{T.slice(0, 8).map((t) => ticket(t, { h: 130, big: true }))}</div>
    <div className="mt-auto"><KV k="한 판에 열리는 시리즈" v="라운드마다 무작위" /></div>
  </div>, count,
);
const B62 = () => section(
  <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
    {featured(4, 200)}
    <div>{BY_KIND.map(([ko, list]) => <KV key={ko} k={ko} v={`${list.length}개`} sm />)}</div>
    <p className="text-sm text-gray-400">라운드마다 이 가운데에서 무작위로 열립니다.</p>
  </div>, count,
);

const V = [
  ['A1', '대표 4 + 6열', A1], ['A2', '대표 3 + 7열', A2], ['A3', '대표 4 + 8열', A3], ['A4', '대표 2 + 6열(큼)', A4],
  ['A5', '대표 4 + 이름 칩', A5], ['A6', '대표 4 + 목록 3열', A6], ['A7', '대표 6 + 7열', A7], ['A8', '대표 4 + 묶음선 + 6열', A8],
  ['B2a', '목록 2열', B21], ['B2b', '목록 3열', B22],
  ['B3a', '묶음 접기(격자)', B31], ['B3b', '묶음 줄 + 펼침', B32],
  ['B5a', '가로 띠 · 시대별', B51], ['B5b', '가로 띠 · 종류별', B52],
  ['B6a', '요약 + 대표 8', B61], ['B6b', '요약 + 대표 4', B62],
];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || 'A1';
  const pick = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-gray-400">
        <b className="mr-2 text-[15px] text-white">베이직 모드 가운데 판 · 16안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2 py-1 text-[12px] no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? G : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      <div style={{ width: 1184, height: 807 }}>{pick[2]()}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
