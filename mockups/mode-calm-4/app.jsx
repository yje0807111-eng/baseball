/* 베이직 모드 가운데 판 — 덜 화려하게 4안
   1) 작은 칸 사진 없음  2) 사진 어둡게  3) 묶음 + 사진 없음  4) 묶음 + 사진 어둡게 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';

const G = '#10b981';
const KIND_KO = { legend: '레전드', club: '구단 시즌', national: '국가대표' };
const T = SERIES.map((s) => ({
  key: s.id, year: s.year || 'ALL', title: s.title, kind: s.kind, n: s.players.length,
  sub: `${s.subtitle || KIND_KO[s.kind] || ''} · ${s.players.length}명`,
  star: [...s.players].sort((a, b) => b.overall - a.overall)[0], champ: !!s.champion,
}));
const BY_KIND = ['legend', 'club', 'national'].map((k) => [KIND_KO[k], T.filter((x) => x.kind === k)]).filter(([, l]) => l.length);
const art = (t) => (t.star ? `url(cards/${encodeURIComponent(t.star.id)}.webp), url(profiles/${encodeURIComponent(t.star.id)}.webp)` : undefined);

/* 큰 대표 카드 — 지금 쓰는 그대로 */
const big = (t) => (
  <div key={t.key} className="ui-cut relative h-full overflow-hidden bg-[#0b1220] bg-cover bg-no-repeat" style={{ '--c': '12px', backgroundImage: art(t), backgroundPosition: '60% 18%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.55),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,rgba(5,8,15,.92) 72%,#05080f)' }} />
    <span className="absolute left-3 top-2 font-display text-3xl font-extrabold leading-none" style={{ color: G, textShadow: `0 0 16px ${G}88,0 2px 4px #000` }}>{t.year}</span>
    <div className="absolute inset-x-3 bottom-2.5">
      <p className="truncate text-base font-black text-white">{t.title}</p>
      <p className="truncate text-[11px] text-gray-400">{t.sub}</p>
    </div>
  </div>
);
/* 작은 칸 — 사진 없음 */
const flat = (t) => (
  <div key={t.key} className="ui-cut flex h-full flex-col justify-center px-2.5" style={{ '--c': '6px', background: 'rgba(255,255,255,.045)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
    <span className="flex items-center gap-1.5">
      <b className="font-display text-[12px]" style={{ color: G }}>{t.year}</b>
      {t.champ && <span className="font-display text-[10px] text-amber-300">V</span>}
    </span>
    <b className="truncate text-[12.5px] text-white">{t.title}</b>
    <span className="truncate text-[10.5px] text-gray-500">{t.n}명</span>
  </div>
);
/* 작은 칸 — 사진을 아주 어둡게 */
const dim = (t) => (
  <div key={t.key} className="ui-cut relative h-full overflow-hidden bg-[#0b1220] bg-cover bg-no-repeat" style={{ '--c': '6px', backgroundImage: art(t), backgroundPosition: '60% 16%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.82),rgba(5,8,15,.9))' }} />
    <div className="absolute inset-x-2 bottom-1.5">
      <b className="block truncate font-display text-[11.5px]" style={{ color: G }}>{t.year}</b>
      <b className="block truncate text-[12.5px] text-white">{t.title}</b>
    </div>
  </div>
);
const grpLine = (ko, n) => (
  <div className="mt-3 flex shrink-0 items-center gap-2">
    <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: G }}>SERIES</span>
    <b className="text-[12px] text-gray-300">{ko} {n}</b>
    <span className="h-px flex-1 bg-white/10" />
  </div>
);
const head = () => (
  <div className="flex flex-wrap items-baseline gap-3">
    <p className="ui-lab font-display">All Series Season</p>
  </div>
);
const section = (children) => (
  <section className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col p-5" style={{ '--c': '20px', '--a': G }}>{head()}{children}</section>
);
const featured = () => (
  <div className="mt-3 grid shrink-0 gap-2.5" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridAutoRows: '9.5rem' }}>{T.slice(0, 4).map(big)}</div>
);
const smallGrid = (list, cell) => (
  <div className="syn-scroll mt-2 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(8,minmax(0,1fr))', gridAutoRows: '4.4rem' }}>
    {list.map(cell)}
  </div>
);

/* 1. 사진 없음 */
const C1 = () => section(<>{featured()}{grpLine('그 밖의 시리즈', T.length - 4)}{smallGrid(T.slice(4), flat)}</>);
/* 2. 사진 어둡게 */
const C2 = () => section(<>{featured()}{grpLine('그 밖의 시리즈', T.length - 4)}{smallGrid(T.slice(4), dim)}</>);
/* 3. 묶음 + 사진 없음 */
const C3 = () => section(
  <>
    {featured()}
    <div className="syn-scroll mt-1 min-h-0 flex-1 overflow-y-auto pr-1">
      {BY_KIND.map(([ko, list]) => (
        <React.Fragment key={ko}>
          {grpLine(ko, list.length)}
          <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: 'repeat(8,minmax(0,1fr))', gridAutoRows: '4.4rem' }}>{list.map(flat)}</div>
        </React.Fragment>
      ))}
    </div>
  </>,
);
/* 4. 묶음 + 사진 어둡게 */
const C4 = () => section(
  <>
    {featured()}
    <div className="syn-scroll mt-1 min-h-0 flex-1 overflow-y-auto pr-1">
      {BY_KIND.map(([ko, list]) => (
        <React.Fragment key={ko}>
          {grpLine(ko, list.length)}
          <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: 'repeat(8,minmax(0,1fr))', gridAutoRows: '4.4rem' }}>{list.map(dim)}</div>
        </React.Fragment>
      ))}
    </div>
  </>,
);

const V = [['1', '사진 없음', C1], ['2', '사진 어둡게', C2], ['3', '묶음 + 사진 없음', C3], ['4', '묶음 + 사진 어둡게', C4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">베이직 모드 가운데 판 · 차분하게 4안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? G : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      <div style={{ width: 1184, height: 807 }}>{pick[2]()}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
