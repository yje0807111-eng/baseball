/* 연도별 시즌 — 위쪽 연도 고르개 8안 (아래 본문은 적용된 화면과 같은 구성) */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';
import { teamFlag } from '/src/myteam/teamArt.js';

const A = '#a3e635', GOLD = '#fcd34d';
const YEARS = [...new Set(SERIES.map((s) => s.year).filter(Boolean))].sort((a, b) => b - a);
const seriesOf = (y) => SERIES.filter((s) => s.year === y);
const rankOf = (x) => Number((/(\d+)위/.exec(x.subtitle || '') || [])[1] || 99);
const ovrOf = (x) => Math.round(x.players.reduce((n, p) => n + p.overall, 0) / Math.max(1, x.players.length));
const heroOf = (y) => {
  const list = seriesOf(y), clubs = list.filter((x) => x.kind === 'team');
  return clubs.find((x) => x.champion) || clubs.filter((x) => rankOf(x) < 99).sort((a, b) => rankOf(a) - rankOf(b))[0]
    || [...clubs].sort((a, b) => ovrOf(b) - ovrOf(a))[0] || list[0];
};
const flagOf = (y) => teamFlag(heroOf(y)?.title || '');
const champ = (y) => !!heroOf(y)?.champion;
const art = (p) => (p ? `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp)` : undefined);
const starsOf = (y, n) => {
  const seen = new Set();
  return seriesOf(y).flatMap((s) => s.players).sort((a, b) => b.overall - a.overall)
    .filter((p) => !seen.has(p.name) && seen.add(p.name)).slice(0, n);
};
const DECADES = [[2020, '2020s'], [2010, '2010s'], [2000, '2000s'], [1990, '1990s'], [1980, '1980s']]
  .map(([d, ko]) => [ko, d, YEARS.filter((y) => y >= d && y < d + 10)]).filter(([, , l]) => l.length);
const dot = (y, size = 6) => <span className="block rounded-full" style={{ width: size, height: size, background: flagOf(y)?.color || '#475569', opacity: champ(y) ? 1 : 0.45 }} />;
const trophy = (size = 11) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M12 14v3" /><path d="M9 20.5h6" /><path d="M10 17.5h4l1 3H9l1-3Z" />
  </svg>
);

/* 본문 — 적용된 화면과 같은 구성(작게) */
const body = (y) => {
  const h = heroOf(y), star = [...h.players].sort((a, b) => b.overall - a.overall)[0];
  const flag = flagOf(y);
  return (
    <div className="relative mt-3 grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px' }}>
      <div className="flex flex-col justify-end pb-4">
        <span className="flex items-center gap-2">{champ(y) && trophy(16)}<b className="font-display text-[12px] tracking-[0.25em]" style={{ color: champ(y) ? GOLD : A }}>{y} {champ(y) ? 'CHAMPION' : '시즌'}</b></span>
        <b className="mt-1 text-5xl font-black text-white">{h.title}</b>
        <span className="mt-1 text-[14px] text-gray-300">{h.subtitle || ''}</span>
        <div className="mt-3 flex gap-1.5">{starsOf(y, 6).map((p) => (
          <span key={p.id} className="ui-cut block shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '6px', width: 62, height: 82, backgroundImage: art(p), backgroundPosition: '60% 12%' }} />
        ))}</div>
      </div>
      <div className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '14px', backgroundImage: art(star), backgroundPosition: '60% 8%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,0) 40%,#05080f)' }} />
        <b className="absolute inset-x-3 bottom-2 text-xl font-black text-white">{star?.name}</b>
      </div>
      {flag && <span className="pointer-events-none absolute inset-0 -z-10" style={{ background: `radial-gradient(70% 90% at 12% 70%, ${flag.color}22, transparent 70%)` }} />}
    </div>
  );
};
const shell = (picker, y) => (
  <section className="ui-cut ui-frame ui-glass relative flex h-full min-h-0 flex-col overflow-hidden p-5" style={{ '--c': '20px', '--a': A }}>
    {(() => { const f = flagOf(y); return f ? (
      <>
        <span className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${f.src})`, opacity: 0.16 }} />
        <span className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(75% 95% at 12% 70%, ${f.color}26, transparent 70%), linear-gradient(90deg,rgba(5,8,15,.92) 18%, rgba(5,8,15,.6))` }} />
      </>
    ) : null; })()}
    <div className="relative flex min-h-0 flex-1 flex-col">
      <p className="ui-lab font-display" style={{ '--a': A }}>Season</p>
      {picker}
      {body(y)}
    </div>
  </section>
);

/* 1. 타임라인 + 우승 구단 색 점 (1+4) */
const P1 = (y, set) => shell(
  <div className="mt-3 flex shrink-0 items-end gap-1 overflow-x-auto pb-1">
    {YEARS.map((n) => (
      <button key={n} type="button" onClick={() => set(n)} className="flex shrink-0 flex-col items-center px-2" style={{ opacity: n === y ? 1 : 0.6 }}>
        <span className="font-display text-[13px] font-bold" style={{ color: n === y ? A : '#94a3b8' }}>{n}</span>
        <span className="mt-1" style={{ width: 3, height: n === y ? 22 : 10, background: n === y ? A : 'rgba(255,255,255,.2)' }} />
        <span className="mt-1">{dot(n)}</span>
      </button>
    ))}
  </div>, y,
);
/* 2. 칩 + 색 점 */
const P2 = (y, set) => shell(
  <div className="mt-3 flex shrink-0 flex-wrap gap-1.5">
    {YEARS.map((n) => (
      <button key={n} type="button" onClick={() => set(n)} className={`ui-cut flex items-center gap-1.5 px-3 py-1 font-display text-sm font-bold ${n === y ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400'}`}
        style={{ '--c': '5px', background: n === y ? A : undefined }}>{n}{dot(n, 5)}</button>
    ))}
  </div>, y,
);
/* 3. 10년대 묶음 + 그 안의 연도 */
const P3 = (y, set) => {
  const dec = DECADES.find(([, d]) => y >= d && y < d + 10) || DECADES[0];
  return shell(
    <>
      <div className="mt-3 flex shrink-0 gap-1.5">
        {DECADES.map(([ko, d, list]) => (
          <button key={ko} type="button" onClick={() => set(list[0])} className={`ui-cut px-3 py-1 font-display text-sm font-bold ${dec[0] === ko ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400'}`}
            style={{ '--c': '5px', background: dec[0] === ko ? A : undefined }}>{ko}</button>
        ))}
      </div>
      <div className="mt-2 flex shrink-0 flex-wrap gap-1.5">
        {dec[2].map((n) => (
          <button key={n} type="button" onClick={() => set(n)} className={`ui-cut flex items-center gap-1.5 px-3 py-1 font-display text-sm ${n === y ? 'font-bold text-white' : 'text-gray-400'}`}
            style={{ '--c': '5px', background: 'rgba(255,255,255,.06)', boxShadow: n === y ? `inset 0 0 0 1px ${A}` : 'none' }}>{n}{dot(n, 5)}</button>
        ))}
      </div>
    </>, y,
  );
};
/* 4. 좌우 넘기기 + 펼치기 */
const P4 = (y, set) => {
  const i = YEARS.indexOf(y);
  return shell(
    <div className="mt-3 flex shrink-0 items-center gap-2">
      <button type="button" className="ui-btn ui-cut sm" onClick={() => set(YEARS[Math.max(0, i - 1)])}>‹</button>
      <b className="font-display text-2xl" style={{ color: A }}>{y}</b>
      {champ(y) && trophy(14)}
      <button type="button" className="ui-btn ui-cut sm" onClick={() => set(YEARS[Math.min(YEARS.length - 1, i + 1)])}>›</button>
      <span className="ml-3 flex flex-wrap gap-1">
        {YEARS.map((n) => <button key={n} type="button" onClick={() => set(n)} className="px-1 font-display text-[12px]" style={{ color: n === y ? A : '#64748b' }}>{n}</button>)}
      </span>
    </div>, y,
  );
};
/* 5. 타임라인 눈금 (10년 단위 구분) */
const P5 = (y, set) => shell(
  <div className="mt-3 flex shrink-0 items-end gap-0.5 overflow-x-auto pb-1">
    {YEARS.slice().reverse().map((n, k, arr) => (
      <React.Fragment key={n}>
        {k > 0 && Math.floor(n / 10) !== Math.floor(arr[k - 1] / 10) && <span className="mx-1 h-6 w-px bg-white/15" />}
        <button type="button" onClick={() => set(n)} className="flex shrink-0 flex-col items-center px-1.5">
          <span className="font-display text-[12px]" style={{ color: n === y ? A : '#64748b' }}>{String(n).slice(2)}</span>
          <span className="mt-1" style={{ width: 4, height: n === y ? 18 : 8, background: n === y ? A : flagOf(n)?.color || 'rgba(255,255,255,.2)', opacity: n === y ? 1 : 0.5 }} />
        </button>
      </React.Fragment>
    ))}
  </div>, y,
);
/* 6. 카드형 연도 (우승 구단 색 띠) */
const P6 = (y, set) => shell(
  <div className="mt-3 flex shrink-0 gap-1.5 overflow-x-auto pb-1">
    {YEARS.map((n) => (
      <button key={n} type="button" onClick={() => set(n)} className="ui-cut shrink-0 px-3 py-1.5 text-left"
        style={{ '--c': '6px', background: n === y ? `color-mix(in srgb,${A} 18%,transparent)` : 'rgba(255,255,255,.05)', boxShadow: `inset 0 -2px 0 ${flagOf(n)?.color || '#475569'}` }}>
        <b className="block font-display text-[14px]" style={{ color: n === y ? A : '#e5e7eb' }}>{n}</b>
        <span className="block truncate text-[10.5px] text-gray-500" style={{ maxWidth: 76 }}>{heroOf(n)?.title || ''}</span>
      </button>
    ))}
  </div>, y,
);
/* 7. 칩 + 우승 트로피 표시 */
const P7 = (y, set) => shell(
  <div className="mt-3 flex shrink-0 flex-wrap gap-1.5">
    {YEARS.map((n) => (
      <button key={n} type="button" onClick={() => set(n)} className={`ui-cut flex items-center gap-1 px-3 py-1 font-display text-sm font-bold ${n === y ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400'}`}
        style={{ '--c': '5px', background: n === y ? A : undefined }}>{n}{champ(n) && trophy(10)}</button>
    ))}
  </div>, y,
);
/* 8. 10년대 묶음 + 타임라인 */
const P8 = (y, set) => {
  const dec = DECADES.find(([, d]) => y >= d && y < d + 10) || DECADES[0];
  return shell(
    <>
      <div className="mt-3 flex shrink-0 gap-1.5">
        {DECADES.map(([ko, d, list]) => (
          <button key={ko} type="button" onClick={() => set(list[0])} className={`px-2 py-1 font-display text-[13px] font-bold ${dec[0] === ko ? '' : 'text-gray-500'}`}
            style={{ color: dec[0] === ko ? A : undefined, borderBottom: `2px solid ${dec[0] === ko ? A : 'transparent'}` }}>{ko}</button>
        ))}
      </div>
      <div className="mt-2 flex shrink-0 items-end gap-1">
        {dec[2].map((n) => (
          <button key={n} type="button" onClick={() => set(n)} className="flex flex-col items-center px-2">
            <span className="font-display text-[13px]" style={{ color: n === y ? A : '#94a3b8' }}>{n}</span>
            <span className="mt-1" style={{ width: 3, height: n === y ? 20 : 9, background: n === y ? A : 'rgba(255,255,255,.2)' }} />
            <span className="mt-1">{dot(n)}</span>
          </button>
        ))}
      </div>
    </>, y,
  );
};

const V = [['1', '타임라인 + 색 점', P1], ['2', '칩 + 색 점', P2], ['3', '10년대 묶음', P3], ['4', '좌우 넘기기', P4],
  ['5', '눈금 타임라인', P5], ['6', '카드형(팀 이름까지)', P6], ['7', '칩 + 트로피', P7], ['8', '10년대 + 타임라인', P8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const [year, setYear] = useState(2009);
  const pick = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">연도 고르개 8안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? A : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
        <span className="ml-2 text-[12px] text-gray-500">색 점 = 그 해 주인공 구단 색 (우승이면 진하게)</span>
      </div>
      <div style={{ width: 1184, height: 807 }}>{pick[2](year, setYear)}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
