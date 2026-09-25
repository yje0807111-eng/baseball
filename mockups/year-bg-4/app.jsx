/* 연도별 시즌 — 배경 그림 4가지 × 빈 자리를 쓰는 배치 (2009 KIA 기준) */
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
const starsOf = (y, n) => {
  const seen = new Set();
  return seriesOf(y).flatMap((s) => s.players).sort((a, b) => b.overall - a.overall)
    .filter((p) => !seen.has(p.name) && seen.add(p.name)).slice(0, n);
};
const art = (p) => (p ? `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp)` : undefined);
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const trophy = (size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
    <path d="M12 14v3" /><path d="M9 20.5h6" /><path d="M10 17.5h4l1 3H9l1-3Z" />
  </svg>
);
const DECADES = [...new Set(YEARS.map((y) => Math.floor(y / 10) * 10))].sort((a, b) => b - a);
const picker = (y, set) => (
  <div className="relative z-10">
    <div className="mt-3 flex flex-wrap gap-1.5">
      {DECADES.map((d) => {
        const on = Math.floor(y / 10) * 10 === d;
        return (
          <button key={d} type="button" onClick={() => set(YEARS.filter((n) => Math.floor(n / 10) * 10 === d)[0])}
            className={`ui-cut px-3 py-1 font-display text-sm font-bold ${on ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400'}`}
            style={{ '--c': '5px', background: on ? A : undefined }}>{d}년대</button>
        );
      })}
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {YEARS.filter((n) => Math.floor(n / 10) * 10 === Math.floor(y / 10) * 10).map((n) => {
        const f = teamFlag(heroOf(n)?.title || '');
        return (
          <button key={n} type="button" onClick={() => set(n)}
            className={`ui-cut flex items-center gap-1.5 px-3 py-1 font-display text-sm ${n === y ? 'font-bold text-white' : 'text-gray-400'}`}
            style={{ '--c': '5px', background: 'rgba(255,255,255,.06)', boxShadow: n === y ? `inset 0 0 0 1px ${A}` : 'none' }}>
            {n}<span className="block rounded-full" style={{ width: 5, height: 5, background: f?.color || '#475569', opacity: heroOf(n)?.champion ? 1 : 0.45 }} />
          </button>
        );
      })}
    </div>
  </div>
);
const faces = (y, n = 8, w = 74, h = 96) => (
  <div className="flex flex-wrap gap-1.5">
    {starsOf(y, n).map((p) => (
      <div key={p.id} className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '7px', width: w, height: h, backgroundImage: art(p), backgroundPosition: '60% 12%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.25),rgba(5,8,15,0) 40%,#05080f)' }} />
        <b className="absolute left-1.5 top-0.5 font-display text-[13px]" style={{ color: tone(p.overall) }}>{p.overall}</b>
        <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[11px] text-white">{p.name}</b>
      </div>
    ))}
  </div>
);
const others = (y, hero) => (
  <div className="flex flex-wrap gap-1.5">
    {seriesOf(y).filter((s) => s !== hero).map((s) => (
      <span key={s.id} className="ui-cut px-2.5 py-1 text-[12px] text-gray-300" style={{ '--c': '5px', background: 'rgba(255,255,255,.07)' }}>
        {s.title} <b className="font-display text-[11px] text-gray-500">{s.players.length}</b>
      </span>
    ))}
  </div>
);

/* 배경: 그림을 또렷하게(0.45~0.6) + 팀 색 번짐, 글자 쪽만 어둡게 */
const bg = (img, flag, strength = 0.5) => (
  <>
    <span className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ zIndex: 0, backgroundImage: `url(ui/tour/${img}.webp)`, opacity: strength }} />
    <span className="pointer-events-none absolute inset-0" style={{ zIndex: 0, background: `linear-gradient(90deg,rgba(5,8,15,.9) 8%,rgba(5,8,15,.35) 55%,rgba(5,8,15,.15)), radial-gradient(60% 80% at 20% 75%, ${flag?.color || '#10b981'}33, transparent 70%)` }} />
  </>
);
const shell = (y, set, img, children, strength) => {
  const hero = heroOf(y), flag = teamFlag(hero?.title || '');
  return (
    <section className="ui-cut ui-frame ui-glass relative flex h-full min-h-0 flex-col overflow-hidden p-5" style={{ '--c': '20px', '--a': A }}>
      {bg(img, flag, strength)}
      <p className="relative z-10 ui-lab font-display" style={{ '--a': A }}>Season</p>
      {picker(y, set)}
      {children(hero, flag)}
    </section>
  );
};
const title = (y, hero) => (
  <>
    <span className="flex items-center gap-2">
      {hero?.champion && trophy()}
      <b className="font-display text-[13px] tracking-[0.25em]" style={{ color: hero?.champion ? GOLD : A }}>{y} {hero?.champion ? 'CHAMPION' : rankOf(hero) < 99 ? 'IN PROGRESS' : 'SEASON'}</b>
    </span>
    <b className="mt-2 block text-6xl font-black leading-none text-white">{hero?.title}</b>
    <span className="mt-2 block text-[15px] text-gray-300">{hero?.subtitle || ''}</span>
  </>
);

/* 1. 붉은 구장 조명 — 왼쪽 아래 제목, 가운데 선수 줄, 오른쪽엔 아무것도 없음 */
const B1 = (y, set) => shell(y, set, 'st1', (hero) => (
  <div className="relative z-10 mt-auto">
    {title(y, hero)}
    <div className="mt-4">{faces(y, 10, 80, 104)}</div>
    <div className="mt-3">{others(y, hero)}</div>
  </div>
), 0.55);

/* 2. 상징 실루엣 — 왼쪽 제목, 아래 가로로 선수 줄 */
const B2 = (y, set) => shell(y, set, 'st2', (hero) => (
  <div className="relative z-10 flex min-h-0 flex-1 flex-col">
    <div className="mt-6 max-w-[560px]">{title(y, hero)}</div>
    <div className="mt-auto">{faces(y, 12, 76, 100)}<div className="mt-3">{others(y, hero)}</div></div>
  </div>
), 0.6);

/* 3. 우승 세리머니 — 가운데 아래로 제목과 선수 */
const B3 = (y, set) => shell(y, set, 'st3', (hero) => (
  <div className="relative z-10 mt-auto flex flex-col items-start">
    {title(y, hero)}
    <div className="mt-4 w-full">{faces(y, 9, 88, 112)}</div>
    <div className="mt-3">{others(y, hero)}</div>
  </div>
), 0.6);

/* 4. 그래픽 빛줄기 — 왼쪽 위 제목, 가운데 큰 선수 줄 */
const B4 = (y, set) => shell(y, set, 'st4', (hero) => (
  <div className="relative z-10 flex min-h-0 flex-1 flex-col">
    <div className="mt-5">{title(y, hero)}</div>
    <div className="mt-auto flex items-end gap-4">
      <div className="min-w-0 flex-1">{faces(y, 10, 84, 108)}</div>
    </div>
    <div className="mt-3">{others(y, hero)}</div>
  </div>
), 0.5);

const V = [['1', '붉은 구장 조명', B1], ['2', '상징 실루엣', B2], ['3', '우승 세리머니', B3], ['4', '그래픽 빛줄기', B4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const [year, setYear] = useState(2009);
  const pick = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">연도별 시즌 배경 · 4안 (2009 KIA 기준)</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? A : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
        <span className="ml-2 text-[12px] text-gray-500">고르시면 구단마다 같은 스타일로 그림을 뽑아 넣습니다</span>
      </div>
      <div style={{ width: 1184, height: 807 }}>{pick[2](year, setYear)}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
