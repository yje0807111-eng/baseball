/* 연도별 시즌 — 판 전체를 하나의 그림처럼: 그 해 우승팀을 가운데 두고 나머지가 둘러싸는 6안 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';

const A = '#a3e635';
const GOLD = '#fcd34d';
const YEARS = [...new Set(SERIES.map((s) => s.year).filter(Boolean))].sort((a, b) => b - a);
const seriesOf = (y) => SERIES.filter((s) => s.year === y);
/* 그 해의 주인공: 우승 구단 → (없으면) 그 해 가장 센 구단 시즌 → (그것도 없으면) 첫 시리즈 */
const avgOvr = (s) => Math.round(s.players.reduce((n, p) => n + p.overall, 0) / s.players.length);
const champOf = (y) => {
  const list = seriesOf(y);
  const clubs = list.filter((s) => s.kind === 'team');
  return clubs.find((s) => s.champion) || [...clubs].sort((a, b) => avgOvr(b) - avgOvr(a))[0] || list[0];
};
const champLabel = (y) => (champOf(y)?.champion ? `${y} CHAMPION` : `${y} SEASON`);
const starsOf = (y, n) => {
  const seen = new Set();
  return seriesOf(y).flatMap((s) => s.players).sort((a, b) => b.overall - a.overall)
    .filter((p) => !seen.has(p.name) && seen.add(p.name)).slice(0, n);
};
const topOf = (s, n = 1) => [...s.players].sort((a, b) => b.overall - a.overall).slice(0, n);
const art = (p) => (p ? `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp)` : undefined);
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const trophy = (size = 16, op = 0.8) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: op }}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
    <path d="M12 14v3" /><path d="M9 20.5h6" /><path d="M10 17.5h4l1 3H9l1-3Z" />
  </svg>
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
const mini = (s, w = 150, h = 90) => (
  <div key={s.id} className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '8px', width: w, height: h, backgroundImage: art(topOf(s)[0]), backgroundPosition: '60% 14%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.75),rgba(5,8,15,.88))' }} />
    <div className="absolute inset-x-2 bottom-1.5">
      <b className="block truncate text-[12.5px] text-white">{s.title}</b>
      <span className="block truncate text-[10.5px] text-gray-400">{s.players.length}명</span>
    </div>
    {s.champion && <span className="absolute right-1.5 top-1.5">{trophy(12, 0.7)}</span>}
  </div>
);
const face = (p, w = 74, h = 96) => (
  <div key={p.id} className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '7px', width: w, height: h, backgroundImage: art(p), backgroundPosition: '60% 12%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,0) 40%,#05080f)' }} />
    <b className="absolute left-1.5 top-0.5 font-display text-[13px]" style={{ color: tone(p.overall) }}>{p.overall}</b>
    <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[11px] text-white">{p.name}</b>
  </div>
);
const shell = (year, set, children, bg) => (
  <section className="ui-cut ui-frame ui-glass relative flex h-full min-h-0 flex-col overflow-hidden p-5" style={{ '--c': '20px', '--a': A }}>
    {bg}
    <div className="relative flex min-h-0 flex-1 flex-col">
      <p className="ui-lab font-display" style={{ '--a': A }}>Season</p>
      {chips(year, set)}
      {children}
    </div>
  </section>
);
const bgOf = (img, pos = 'center 40%', dark = '.62') => (
  <>
    <span className="absolute inset-0 bg-cover" style={{ backgroundImage: `url(ui/tour/${img}.webp)`, backgroundPosition: pos }} />
    <span className="absolute inset-0" style={{ background: `linear-gradient(180deg,rgba(5,8,15,.86),rgba(5,8,15,${dark}) 45%,#05080f)` }} />
  </>
);

/* 1. 가운데 우승팀 + 아래 호(arc)처럼 나머지 시리즈 */
const C1 = (y, set) => {
  const ch = champOf(y), star = topOf(ch)[0], rest = seriesOf(y).filter((s) => s.id !== ch.id);
  return shell(y, set, (
    <div className="relative mt-2 flex min-h-0 flex-1 flex-col items-center justify-center">
      <div className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '16px', width: 420, height: 300, backgroundImage: art(star), backgroundPosition: '60% 10%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.25),rgba(5,8,15,0) 35%,#05080f)' }} />
        <span className="absolute left-4 top-3 flex items-center gap-2">{champOf(y).champion && trophy(18)}<b className="font-display text-[12px] tracking-[0.2em]" style={{ color: GOLD }}>{champLabel(y)}</b></span>
        <div className="absolute inset-x-4 bottom-3">
          <b className="block text-3xl font-black text-white">{ch.title}</b>
          <span className="text-[13px] text-gray-300">{ch.subtitle || `${ch.players.length}명`}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">{rest.map((s) => mini(s))}</div>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">{starsOf(y, 10).map((p) => face(p, 66, 86))}</div>
    </div>
  ), bgOf('champ-crowd'));
};

/* 2. 왼쪽 우승 포스터 + 오른쪽에 나머지가 둘러싸듯 */
const C2 = (y, set) => {
  const ch = champOf(y), star = topOf(ch)[0], rest = seriesOf(y).filter((s) => s.id !== ch.id);
  return shell(y, set, (
    <div className="mt-2 grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 420px' }}>
      <div className="relative flex flex-col justify-end pb-6 pl-2">
        <span className="flex items-center gap-2">{champOf(y).champion && trophy(20)}<b className="font-display text-[13px] tracking-[0.25em]" style={{ color: GOLD }}>{champLabel(y)}</b></span>
        <b className="mt-2 text-6xl font-black leading-none text-white">{ch.title}</b>
        <span className="mt-2 text-[15px] text-gray-300">{ch.subtitle || ''}</span>
        <div className="mt-4 flex gap-1.5">{starsOf(y, 8).map((p) => face(p, 70, 92))}</div>
      </div>
      <div className="flex min-h-0 flex-col justify-center gap-2">
        <div className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '14px', height: 250, backgroundImage: art(star), backgroundPosition: '60% 8%' }}>
          <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,0) 40%,#05080f)' }} />
          <b className="absolute inset-x-4 bottom-3 text-2xl font-black text-white">{star?.name}</b>
        </div>
        <div className="flex flex-wrap gap-2">{rest.map((s) => mini(s, 132, 80))}</div>
      </div>
    </div>
  ), bgOf('champ-trophy', 'center 45%', '.7'));
};

/* 3. 배경 전체가 우승 장면, 카드가 그 위에 흩어져 */
const C3 = (y, set) => {
  const ch = champOf(y), rest = seriesOf(y).filter((s) => s.id !== ch.id);
  return shell(y, set, (
    <div className="relative mt-2 min-h-0 flex-1">
      <div className="absolute left-4 top-6">
        <span className="flex items-center gap-2">{champOf(y).champion && trophy(18)}<b className="font-display text-[12px] tracking-[0.25em]" style={{ color: GOLD }}>{champLabel(y)}</b></span>
        <b className="mt-1 block text-5xl font-black text-white">{ch.title}</b>
        <span className="text-[14px] text-gray-300">시리즈 {seriesOf(y).length} · 선수 {seriesOf(y).reduce((n, s) => n + s.players.length, 0)}명</span>
      </div>
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-end gap-2">
        {rest.map((s) => mini(s, 140, 86))}
        {starsOf(y, 6).map((p) => face(p, 70, 92))}
      </div>
    </div>
  ), bgOf('champ-crowd', 'center 35%', '.45'));
};

/* 4. 트로피를 중심에 두고 방사형 */
const C4 = (y, set) => {
  const ch = champOf(y), rest = seriesOf(y).filter((s) => s.id !== ch.id);
  return shell(y, set, (
    <div className="relative mt-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
      <span className="flex flex-col items-center gap-1">
        {champOf(y).champion ? trophy(56, 0.9) : null}
        <b className="font-display text-[12px] tracking-[0.3em]" style={{ color: GOLD }}>{champLabel(y)}</b>
        <b className="text-4xl font-black text-white">{ch.title}</b>
      </span>
      <div className="flex flex-wrap justify-center gap-2" style={{ maxWidth: 900 }}>{rest.map((s) => mini(s, 150, 88))}</div>
      <div className="flex flex-wrap justify-center gap-1.5" style={{ maxWidth: 940 }}>{starsOf(y, 12).map((p) => face(p, 66, 84))}</div>
    </div>
  ), bgOf('champ-trophy', 'center 50%', '.72'));
};

/* 5. 우승팀 큰 카드 + 좌우로 선수들이 감싸듯 */
const C5 = (y, set) => {
  const ch = champOf(y), star = topOf(ch)[0], stars = starsOf(y, 12);
  return shell(y, set, (
    <div className="mt-2 grid min-h-0 flex-1 items-center gap-3" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px minmax(0,1fr)' }}>
      <div className="flex flex-wrap justify-end gap-1.5">{stars.slice(0, 6).map((p) => face(p, 84, 108))}</div>
      <div className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '16px', height: 380, backgroundImage: art(star), backgroundPosition: '60% 8%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.25),rgba(5,8,15,0) 35%,#05080f)' }} />
        <span className="absolute left-4 top-3 flex items-center gap-2">{champOf(y).champion && trophy(18)}<b className="font-display text-[12px] tracking-[0.2em]" style={{ color: GOLD }}>{champLabel(y)}</b></span>
        <div className="absolute inset-x-4 bottom-4">
          <b className="block text-3xl font-black text-white">{ch.title}</b>
          <span className="text-[13px] text-gray-300">{seriesOf(y).length} 시리즈 · {seriesOf(y).reduce((n, s) => n + s.players.length, 0)}명</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">{stars.slice(6).map((p) => face(p, 84, 108))}</div>
    </div>
  ), bgOf('champ-crowd', 'center 30%', '.7'));
};

/* 6. 대각선 — 왼쪽 위 제목, 오른쪽 아래로 흐르는 카드 */
const C6 = (y, set) => {
  const ch = champOf(y), star = topOf(ch)[0], rest = seriesOf(y).filter((s) => s.id !== ch.id);
  return shell(y, set, (
    <div className="relative mt-2 min-h-0 flex-1">
      <div className="absolute left-2 top-4 max-w-[520px]">
        <span className="flex items-center gap-2">{champOf(y).champion && trophy(18)}<b className="font-display text-[12px] tracking-[0.25em]" style={{ color: GOLD }}>{champLabel(y)}</b></span>
        <b className="mt-1 block text-5xl font-black leading-tight text-white">{ch.title}</b>
        <p className="mt-2 text-[14px] leading-relaxed text-gray-300">{y}년 구단 시즌과 국가대표 로스터가 열립니다. 같은 해 선수들이라 시대 차이가 없습니다.</p>
        <div className="mt-3 flex gap-1.5">{starsOf(y, 5).map((p) => face(p, 72, 94))}</div>
      </div>
      <div className="ui-cut absolute right-3 top-2 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '14px', width: 300, height: 260, backgroundImage: art(star), backgroundPosition: '60% 8%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,0) 40%,#05080f)' }} />
        <b className="absolute inset-x-3 bottom-2 text-xl font-black text-white">{star?.name}</b>
      </div>
      <div className="absolute inset-x-3 bottom-3 flex flex-wrap justify-end gap-2">{rest.map((s) => mini(s, 146, 88))}</div>
    </div>
  ), bgOf('champ-trophy', 'center 55%', '.68'));
};

const V = [['1', '가운데 우승 + 아래 둘레', C1], ['2', '왼쪽 포스터 + 오른쪽 묶음', C2], ['3', '배경 장면 + 흩어진 카드', C3],
  ['4', '트로피 중심 방사형', C4], ['5', '가운데 카드 + 좌우 선수', C5], ['6', '대각선 구성', C6]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const [year, setYear] = useState(2010);
  const pick = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">연도별 시즌 · 우승팀 중심 6안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? A : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
        <span className="ml-2 text-[12px] text-gray-500">연도 칩으로 2010(2개) · 2026(10개) 비교</span>
      </div>
      <div style={{ width: 1184, height: 807 }}>{pick[2](year, setYear)}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
