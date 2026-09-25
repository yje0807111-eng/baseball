/* 연도별 시즌 가운데 판이 비어 보이는 문제 — 16안
   A1~A8: 시리즈 카드 크게 + 그 해 대표 선수   ·   B1~B8: 타임라인 · 시즌 이야기 · 선수 중심 등
   테두리 · 제목 · 칩 · 카드는 게임에 있는 그대로 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';

const A = '#a3e635';
const YEARS = [...new Set(SERIES.map((s) => s.year).filter(Boolean))].sort((a, b) => b - a);
const seriesOf = (y) => SERIES.filter((s) => s.year === y);
const ticketsOf = (y) => seriesOf(y).map((s) => ({
  key: s.id, year: s.year, title: s.title, sub: `${s.subtitle || ''} · ${s.players.length}명`,
  star: [...s.players].sort((a, b) => b.overall - a.overall)[0], champ: !!s.champion,
}));
const starsOf = (y, n) => {
  const seen = new Set();
  return seriesOf(y).flatMap((s) => s.players).sort((a, b) => b.overall - a.overall)
    .filter((p) => !seen.has(p.name) && seen.add(p.name)).slice(0, n);
};
const art = (p) => (p ? `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp)` : undefined);
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');

const trophy = (size = 14) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
    <path d="M12 14v3" /><path d="M9 20.5h6" /><path d="M10 17.5h4l1 3H9l1-3Z" />
  </svg>
);
const ticket = (t, h) => (
  <div key={t.key} className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover bg-no-repeat" style={{ '--c': '12px', height: h, backgroundImage: art(t.star), backgroundPosition: '60% 16%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.5),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,rgba(5,8,15,.92) 72%,#05080f)' }} />
    <span className="absolute left-3 top-2 font-display text-3xl font-extrabold leading-none" style={{ color: A, textShadow: `0 0 16px ${A}88,0 2px 4px #000` }}>{t.year}</span>
    {t.champ && <span className="absolute right-2.5 top-2.5">{trophy()}</span>}
    <div className="absolute inset-x-3 bottom-2.5">
      <p className="truncate text-base font-black text-white">{t.title}</p>
      <p className="truncate text-[11px] text-gray-400">{t.sub}</p>
    </div>
  </div>
);
const playerCard = (p, h) => (
  <div key={p.id} className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '8px', height: h, backgroundImage: art(p), backgroundPosition: '60% 14%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.35),rgba(5,8,15,0) 35%,rgba(5,8,15,.9) 72%,#05080f)' }} />
    <span className="absolute left-2 top-1 font-display text-lg font-extrabold" style={{ color: tone(p.overall), textShadow: `0 0 10px ${tone(p.overall)}66` }}>{p.overall}</span>
    <b className="absolute inset-x-2 bottom-1 truncate text-[12.5px] text-white">{p.name}</b>
  </div>
);
const lab = (t, extra) => (
  <div className="flex shrink-0 items-baseline gap-2">
    <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: A }}>{t}</span>
    {extra && <b className="text-[12px] text-gray-300">{extra}</b>}
    <span className="h-px flex-1 bg-white/10" />
  </div>
);
const chips = (year, set) => (
  <div className="mt-3 flex shrink-0 flex-wrap gap-1.5">
    {YEARS.map((y) => (
      <button key={y} type="button" onClick={() => set(y)}
        className={`ui-cut px-3 py-1 font-display text-sm font-bold ${y === year ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400'}`}
        style={{ '--c': '5px', background: y === year ? A : undefined }}>{y}</button>
    ))}
  </div>
);
const section = (year, set, children) => (
  <section className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col p-5" style={{ '--c': '20px', '--a': A }}>
    <div className="flex flex-wrap items-baseline gap-3"><p className="ui-lab font-display" style={{ '--a': A }}>Season</p></div>
    {chips(year, set)}
    {children}
  </section>
);
/* 시리즈 수에 따라 카드 크기를 키운다 */
const fitCols = (n) => (n <= 2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : 4);
const fitHeight = (n) => (n <= 2 ? 300 : n <= 4 ? 230 : n <= 6 ? 200 : 176);

/* ═══ A그룹: 카드 크게 + 대표 선수 ═══ */
const grid = (list, cols, h) => (
  <div className="mt-3 grid shrink-0 gap-2.5" style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>{list.map((t) => ticket(t, h))}</div>
);
const players = (year, n, cols, h) => (
  <>
    {lab('PLAYERS', `그 해 대표 선수 ${n}`)}
    <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>{starsOf(year, n).map((p) => playerCard(p, h))}</div>
  </>
);
const A1 = (y, set) => section(y, set, <>{grid(ticketsOf(y), fitCols(ticketsOf(y).length), fitHeight(ticketsOf(y).length))}<div className="mt-4 flex min-h-0 flex-1 flex-col">{players(y, 12, 6, 150)}</div></>);
const A2 = (y, set) => section(y, set, <>{grid(ticketsOf(y), fitCols(ticketsOf(y).length), fitHeight(ticketsOf(y).length))}<div className="mt-4 flex min-h-0 flex-1 flex-col">{players(y, 8, 8, 130)}</div></>);
const A3 = (y, set) => section(y, set, <>{grid(ticketsOf(y), 2, 260)}<div className="mt-4 flex min-h-0 flex-1 flex-col">{players(y, 18, 9, 120)}</div></>);
const A4 = (y, set) => section(y, set, <><div className="mt-3 flex min-h-0 flex-1 flex-col">{players(y, 6, 6, 170)}</div>{grid(ticketsOf(y), fitCols(ticketsOf(y).length), 180)}</>);
const A5 = (y, set) => section(y, set, <>{grid(ticketsOf(y), 3, 220)}<div className="mt-4 flex min-h-0 flex-1 flex-col">{players(y, 10, 5, 160)}</div></>);
const A6 = (y, set) => section(y, set, (
  <div className="mt-3 grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)' }}>
    <div className="flex flex-col gap-2.5">{ticketsOf(y).slice(0, 3).map((t) => ticket(t, 175))}</div>
    <div className="flex min-h-0 flex-col">{players(y, 12, 4, 150)}</div>
  </div>
));
const A7 = (y, set) => section(y, set, <>{grid(ticketsOf(y), 4, 200)}<div className="mt-4 flex min-h-0 flex-1 flex-col">{players(y, 16, 8, 140)}</div></>);
const A8 = (y, set) => section(y, set, <>{grid(ticketsOf(y), 2, 300)}<div className="mt-4 flex min-h-0 flex-1 flex-col">{players(y, 8, 4, 160)}</div></>);

/* ═══ B그룹: 그 밖의 방법 ═══ */
const story = (y) => {
  const list = seriesOf(y);
  const champ = list.find((s) => s.champion);
  return (
    <div className="ui-cut mt-3 shrink-0 px-4 py-3" style={{ '--c': '10px', background: 'rgba(255,255,255,.04)' }}>
      <p className="text-[15px] leading-relaxed text-gray-300">
        {y}년의 구단 시즌과 국가대표 로스터가 열립니다. 같은 해 선수들이라 시대 차이가 없습니다.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[`시리즈 ${list.length}`, `선수 ${list.reduce((n, s) => n + s.players.length, 0)}`, champ ? `우승 ${champ.title}` : null].filter(Boolean).map((t) => (
          <span key={t} className="ui-cut px-2.5 py-1 text-[12px] text-gray-300" style={{ '--c': '5px', background: 'rgba(255,255,255,.06)' }}>{t}</span>
        ))}
      </div>
    </div>
  );
};
const timeline = (year, set) => (
  <div className="mt-3 flex shrink-0 items-end gap-1 overflow-x-auto pb-1">
    {YEARS.map((y) => (
      <button key={y} type="button" onClick={() => set(y)} className="shrink-0 px-2 text-center" style={{ opacity: y === year ? 1 : 0.5 }}>
        <span className="block font-display text-[13px] font-bold" style={{ color: y === year ? A : '#94a3b8' }}>{y}</span>
        <span className="mt-1 block" style={{ height: y === year ? 26 : 12, width: 3, margin: '0 auto', background: y === year ? A : 'rgba(255,255,255,.18)' }} />
      </button>
    ))}
  </div>
);
const B1 = (y, set) => (
  <section className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col p-5" style={{ '--c': '20px', '--a': A }}>
    <p className="ui-lab font-display" style={{ '--a': A }}>Season</p>
    {timeline(y, set)}
    {grid(ticketsOf(y), fitCols(ticketsOf(y).length), fitHeight(ticketsOf(y).length))}
    <div className="mt-4 flex min-h-0 flex-1 flex-col">{players(y, 12, 6, 150)}</div>
  </section>
);
const B2 = (y, set) => section(y, set, <>{story(y)}{grid(ticketsOf(y), fitCols(ticketsOf(y).length), 200)}<div className="mt-4 flex min-h-0 flex-1 flex-col">{players(y, 10, 5, 150)}</div></>);
const B3 = (y, set) => section(y, set, <>{grid(ticketsOf(y), fitCols(ticketsOf(y).length), 170)}<div className="mt-4 flex min-h-0 flex-1 flex-col">{players(y, 24, 8, 120)}</div></>);
const B4 = (y, set) => section(y, set, (
  <div className="mt-3 grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '320px minmax(0,1fr)' }}>
    <div className="syn-scroll flex min-h-0 flex-col gap-2.5 overflow-y-auto pr-1">{ticketsOf(y).map((t) => ticket(t, 150))}</div>
    <div className="flex min-h-0 flex-col">{players(y, 18, 6, 150)}</div>
  </div>
));
const B5 = (y, set) => {
  const hero = starsOf(y, 1)[0];
  return section(y, set, (
    <>
      <div className="ui-cut relative mt-3 shrink-0 overflow-hidden bg-cover" style={{ '--c': '14px', height: 260, backgroundImage: art(hero), backgroundPosition: '60% 12%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 22%,rgba(5,8,15,.45) 60%,rgba(5,8,15,.1))' }} />
        <div className="absolute inset-y-6 left-6 flex flex-col justify-center">
          <span className="font-display text-[11px] tracking-[0.3em]" style={{ color: A }}>SEASON {y}</span>
          <b className="text-5xl font-black text-white">{y} 시즌</b>
          <span className="mt-2 text-gray-300">시리즈 {seriesOf(y).length} · 선수 {seriesOf(y).reduce((n, s) => n + s.players.length, 0)}명</span>
          <span className="mt-1 text-[13px] text-gray-400">대표 선수 {hero?.name} {hero?.overall}</span>
        </div>
      </div>
      {grid(ticketsOf(y), fitCols(ticketsOf(y).length), 170)}
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{players(y, 10, 10, 110)}</div>
    </>
  ));
};
const B6 = (y, set) => section(y, set, <>{story(y)}{grid(ticketsOf(y), 2, 250)}<div className="mt-3 flex min-h-0 flex-1 flex-col">{players(y, 12, 6, 130)}</div></>);
const B7 = (y, set) => (
  <section className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col p-5" style={{ '--c': '20px', '--a': A }}>
    <p className="ui-lab font-display" style={{ '--a': A }}>Season</p>
    {timeline(y, set)}
    {story(y)}
    <div className="mt-3 grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: 'minmax(0,1fr) 360px' }}>
      <div className="flex min-h-0 flex-col">{players(y, 15, 5, 150)}</div>
      <div className="syn-scroll flex min-h-0 flex-col gap-2.5 overflow-y-auto pr-1">{ticketsOf(y).map((t) => ticket(t, 140))}</div>
    </div>
  </section>
);
const B8 = (y, set) => section(y, set, <>{grid(ticketsOf(y), fitCols(ticketsOf(y).length), fitHeight(ticketsOf(y).length))}{story(y)}<div className="mt-3 flex min-h-0 flex-1 flex-col">{players(y, 8, 8, 120)}</div></>);

const V = [
  ['A1', '카드 맞춤 + 선수 12', A1], ['A2', '카드 맞춤 + 선수 8(작게)', A2], ['A3', '큰 카드 2열 + 선수 18', A3], ['A4', '선수 먼저 + 카드', A4],
  ['A5', '카드 3열 + 선수 10', A5], ['A6', '좌우: 카드 / 선수', A6], ['A7', '카드 4열 + 선수 16', A7], ['A8', '카드 2장 크게 + 선수 8', A8],
  ['B1', '타임라인 + 카드 + 선수', B1], ['B2', '시즌 설명 + 카드 + 선수', B2], ['B3', '선수 24명 중심', B3], ['B4', '왼쪽 카드 목록 / 오른쪽 선수', B4],
  ['B5', '포스터 + 카드 + 선수', B5], ['B6', '설명 + 큰 카드 + 선수', B6], ['B7', '타임라인 + 설명 + 좌우', B7], ['B8', '카드 + 설명 + 선수', B8],
];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || 'A1';
  const [year, setYear] = useState(2010);
  const pick = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-gray-400">
        <b className="mr-2 text-[15px] text-white">연도별 시즌 가운데 판 · 16안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2 py-1 text-[12px] no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? A : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
        <span className="ml-2 text-[12px] text-gray-500">연도 칩을 눌러 시리즈가 적은 해(2010: 2개)와 많은 해(2026: 10개)를 견줘 보세요</span>
      </div>
      <div style={{ width: 1184, height: 807 }}>{pick[2](year, setYear)}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
