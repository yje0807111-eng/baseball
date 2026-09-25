/* 연도별 시즌 — 그 해 시리즈 카드를 왼쪽에 두는 8가지 (배경 · 제목 · 선수 줄은 지금 화면 그대로) */
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
const topOf = (s) => [...s.players].sort((a, b) => b.overall - a.overall)[0];
const starsOf = (y, n) => {
  const seen = new Set();
  return seriesOf(y).flatMap((s) => s.players).sort((a, b) => b.overall - a.overall)
    .filter((p) => !seen.has(p.name) && seen.add(p.name)).slice(0, n);
};
const art = (p) => (p ? `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp)` : undefined);
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const trophy = (size = 18, op = 0.8) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ opacity: op, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.8))' }}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
    <path d="M12 14v3" /><path d="M9 20.5h6" /><path d="M10 17.5h4l1 3H9l1-3Z" />
  </svg>
);

/* 시리즈 카드 — 지금 화면의 SeriesTicket 그대로 (큰 것 / 작은 것) */
const Ticket = ({ s, w, h, sm = false }) => (
  <div className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover bg-no-repeat"
    style={{ '--c': sm ? '8px' : '12px', width: w, height: h, backgroundImage: art(topOf(s)), backgroundPosition: '60% 18%' }}>
    <span className="absolute inset-0" style={{ background: sm ? 'linear-gradient(180deg,rgba(5,8,15,.82),rgba(5,8,15,.9))' : 'linear-gradient(180deg,rgba(5,8,15,.55),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,rgba(5,8,15,.92) 72%,#05080f)' }} />
    {!sm && <span className="absolute left-3 top-2 font-display text-3xl font-extrabold leading-none" style={{ color: A, textShadow: `0 0 16px ${A}88, 0 2px 4px #000` }}>{s.year}</span>}
    {s.champion && <span className={`absolute ${sm ? 'right-1.5 top-1.5' : 'right-2.5 top-2.5'}`}>{trophy(sm ? 12 : 15, 0.7)}</span>}
    <div className={sm ? 'absolute inset-x-2 bottom-1.5' : 'absolute inset-x-3 bottom-2.5'}>
      {sm && <b className="block truncate font-display text-[11.5px]" style={{ color: A }}>{s.year}</b>}
      <p className={`truncate font-black text-white ${sm ? 'text-[12.5px]' : 'text-base'}`}>{s.title}</p>
      {!sm && <p className="truncate text-[11px] text-gray-400">{s.subtitle || `${s.players.length}명`}</p>}
    </div>
  </div>
);
/* 가로로 긴 줄 카드 — 라커 목록과 같은 결 */
const TicketRow = ({ s, w = 300 }) => (
  <div className="ui-cut relative flex shrink-0 items-center gap-2.5 overflow-hidden bg-white/[0.05] p-1.5" style={{ '--c': '8px', width: w }}>
    <span className="ui-cut block shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '5px', width: 46, height: 46, backgroundImage: art(topOf(s)), backgroundPosition: '60% 12%' }} />
    <span className="min-w-0 flex-1">
      <b className="block truncate text-[13px] text-white">{s.title}</b>
      <span className="block truncate text-[11px] text-gray-400">{s.subtitle || `${s.players.length}명`}</span>
    </span>
    {s.champion && trophy(14, 0.7)}
    <b className="mr-1 font-display text-[13px]" style={{ color: A }}>{s.players.length}</b>
  </div>
);

const DECADES = [...new Set(YEARS.map((y) => Math.floor(y / 10) * 10))].sort((a, b) => b - a);
const Picker = ({ y, set }) => (
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
const Faces = ({ y, n = 12, w = 76, h = 100 }) => (
  <div className="flex flex-wrap gap-1.5">
    {starsOf(y, n).map((p) => (
      <div key={p.id} className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '7px', width: w, height: h, backgroundImage: art(p), backgroundPosition: '60% 12%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,0) 40%,#05080f)' }} />
        <b className="absolute left-1.5 top-0.5 font-display text-[13px]" style={{ color: tone(p.overall) }}>{p.overall}</b>
        <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[11px] text-white">{p.name}</b>
      </div>
    ))}
  </div>
);
const Title = ({ y, hero, big = true }) => (
  <>
    <span className="flex items-center gap-2">
      {hero?.champion && trophy(20, 0.85)}
      <b className="font-display text-[13px] tracking-[0.25em]" style={{ color: hero?.champion ? GOLD : A }}>
        {y} {hero?.champion ? 'CHAMPION' : rankOf(hero) < 99 ? 'IN PROGRESS' : 'SEASON'}
      </b>
    </span>
    <b className={`mt-2 block font-black leading-none text-white ${big ? 'text-6xl' : 'text-5xl'}`}>{hero?.title}</b>
    <span className="mt-2 block text-[15px] text-gray-300">{hero?.subtitle || ''}</span>
  </>
);
const Shell = ({ y, set, children }) => {
  const hero = heroOf(y), flag = teamFlag(hero?.title || '');
  return (
    <section className="ui-cut ui-frame ui-glass relative flex h-full min-h-0 flex-col overflow-hidden p-5" style={{ '--c': '20px', '--a': A }}>
      <span className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ zIndex: 0, backgroundImage: `url(ui/teams/bg-${flag?.key || 'legend'}.webp)`, opacity: 0.6 }} />
      <span className="pointer-events-none absolute inset-0" style={{ zIndex: 0, background: `linear-gradient(90deg,rgba(5,8,15,.92) 8%,rgba(5,8,15,.4) 55%,rgba(5,8,15,.12)), linear-gradient(0deg,rgba(5,8,15,.8),rgba(5,8,15,0) 45%), radial-gradient(60% 80% at 20% 75%, ${flag?.color || '#10b981'}2e, transparent 70%)` }} />
      <p className="relative z-10 ui-lab font-display" style={{ '--a': A }}>Season</p>
      <Picker y={y} set={set} />
      {children(hero, seriesOf(y).filter((s) => s !== hero), flag)}
    </section>
  );
};
const Lab = ({ t }) => <p className="ui-lab font-display" style={{ '--a': A }}>{t}</p>;

/* 왼쪽 열은 모두 같다: 제목 → 큰 구단 카드 → (안마다 다른) 나머지 시리즈 */
const Left = ({ y, hero, children, w = 344 }) => (
  <div className="flex min-h-0 flex-col pt-5" style={{ width: w }}>
    <Title y={y} hero={hero} big={false} />
    <div className="mt-4 shrink-0"><Ticket s={hero} w="100%" h={158} /></div>
    {children}
  </div>
);
const Row = ({ children, cols }) => (
  <div className="relative z-10 grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: cols }}>{children}</div>
);
const Star = ({ p, w, h }) => (
  <div className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '7px', width: w, height: h, backgroundImage: art(p), backgroundPosition: '60% 12%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,0) 40%,#05080f)' }} />
    <b className="absolute left-1.5 top-0.5 font-display text-[13px]" style={{ color: tone(p.overall) }}>{p.overall}</b>
    <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[11px] text-white">{p.name}</b>
  </div>
);

/* 1. 나머지 2열 격자 · 선수는 오른쪽 바닥 */
const V1 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => (
    <Row cols="344px minmax(0,1fr)">
      <Left y={y} hero={hero}>
        <Lab t={`Series ${rest.length}`} />
        <div className="syn-scroll mt-1.5 grid min-h-0 gap-1.5 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridAutoRows: '84px' }}>
          {rest.map((s) => <Ticket key={s.id} s={s} w="100%" h="100%" sm />)}
        </div>
      </Left>
      <div className="flex flex-col justify-end pb-1"><Faces y={y} /></div>
    </Row>
  )}</Shell>
);

/* 2. 나머지 3열 작은 타일 · 선수는 오른쪽 바닥 */
const V2 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => (
    <Row cols="372px minmax(0,1fr)">
      <Left y={y} hero={hero} w={372}>
        <Lab t={`Series ${rest.length}`} />
        <div className="syn-scroll mt-1.5 grid min-h-0 gap-1.5 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gridAutoRows: '74px' }}>
          {rest.map((s) => <Ticket key={s.id} s={s} w="100%" h="100%" sm />)}
        </div>
      </Left>
      <div className="flex flex-col justify-end pb-1"><Faces y={y} /></div>
    </Row>
  )}</Shell>
);

/* 3. 나머지 줄 목록 · 선수는 오른쪽 바닥 */
const V3 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => (
    <Row cols="330px minmax(0,1fr)">
      <Left y={y} hero={hero} w={330}>
        <Lab t={`Series ${rest.length}`} />
        <div className="syn-scroll mt-1.5 flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
          {rest.map((s) => <TicketRow key={s.id} s={s} w="100%" />)}
        </div>
      </Left>
      <div className="flex flex-col justify-end pb-1"><Faces y={y} /></div>
    </Row>
  )}</Shell>
);

/* 4. 나머지 칩 목록 · 선수는 크게 */
const V4 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => (
    <Row cols="300px minmax(0,1fr)">
      <Left y={y} hero={hero} w={300}>
        <Lab t={`Series ${rest.length}`} />
        <div className="syn-scroll mt-1.5 flex min-h-0 flex-col gap-1 overflow-y-auto pr-1">
          {rest.map((s) => (
            <span key={s.id} className="ui-cut flex items-center gap-2 px-2.5 py-1.5" style={{ '--c': '5px', background: 'rgba(255,255,255,.07)' }}>
              {s.champion && trophy(12, 0.7)}
              <b className="min-w-0 flex-1 truncate text-[12.5px] font-normal text-gray-200">{s.title}</b>
              <b className="font-display text-[11px] text-gray-500">{s.players.length}</b>
            </span>
          ))}
        </div>
      </Left>
      <div className="flex flex-col justify-end pb-1"><Faces y={y} n={10} w={84} h={110} /></div>
    </Row>
  )}</Shell>
);

/* 5. 나머지는 오른쪽 위 가로줄 · 선수는 오른쪽 바닥 */
const V5 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => (
    <Row cols="300px minmax(0,1fr)">
      <Left y={y} hero={hero} w={300} />
      <div className="flex min-h-0 flex-col pt-5">
        <Lab t={`Series ${rest.length}`} />
        <div className="syn-scroll mt-1.5 flex shrink-0 gap-1.5 overflow-x-auto pb-1">
          {rest.map((s) => <Ticket key={s.id} s={s} w={132} h={86} sm />)}
        </div>
        <div className="mt-auto pb-1"><Faces y={y} n={10} /></div>
      </div>
    </Row>
  )}</Shell>
);

/* 6. 나머지는 바닥을 가로지르고 · 선수는 그 위 */
const V6 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => (
    <Row cols="300px minmax(0,1fr)">
      <Left y={y} hero={hero} w={300} />
      <div className="flex min-h-0 flex-col justify-end pb-1">
        <Faces y={y} n={8} />
        <div className="mt-3"><Lab t={`Series ${rest.length}`} /></div>
        <div className="syn-scroll mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
          {rest.map((s) => <Ticket key={s.id} s={s} w={132} h={86} sm />)}
        </div>
      </div>
    </Row>
  )}</Shell>
);

/* 7. 나머지 2열 격자 · 선수는 오른쪽을 가득 채우는 격자 */
const V7 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => (
    <Row cols="344px minmax(0,1fr)">
      <Left y={y} hero={hero}>
        <Lab t={`Series ${rest.length}`} />
        <div className="syn-scroll mt-1.5 grid min-h-0 gap-1.5 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridAutoRows: '84px' }}>
          {rest.map((s) => <Ticket key={s.id} s={s} w="100%" h="100%" sm />)}
        </div>
      </Left>
      <div className="flex min-h-0 flex-col justify-end pb-1">
        <Lab t="Stars" />
        <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gridAutoRows: '118px' }}>
          {starsOf(y, 12).map((p) => <Star key={p.id} p={p} w="100%" h="100%" />)}
        </div>
      </div>
    </Row>
  )}</Shell>
);

/* 8. 나머지 2열 격자 · 선수는 오른쪽 끝에 세로로 붙어 가운데 배경이 열린다 */
const V8 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => (
    <Row cols="344px minmax(0,1fr) 250px">
      <Left y={y} hero={hero}>
        <Lab t={`Series ${rest.length}`} />
        <div className="syn-scroll mt-1.5 grid min-h-0 gap-1.5 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridAutoRows: '84px' }}>
          {rest.map((s) => <Ticket key={s.id} s={s} w="100%" h="100%" sm />)}
        </div>
      </Left>
      <span />
      <div className="flex min-h-0 flex-col justify-end pb-1">
        <Lab t="Stars" />
        <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
          {starsOf(y, 9).map((p) => <Star key={p.id} p={p} w={78} h={102} />)}
        </div>
      </div>
    </Row>
  )}</Shell>
);

const V = [['1', '2열 격자', V1], ['2', '3열 타일', V2], ['3', '줄 목록', V3], ['4', '칩 목록 + 큰 선수', V4],
  ['5', '오른쪽 위 가로줄', V5], ['6', '바닥 가로줄', V6], ['7', '선수 격자', V7], ['8', '선수 오른쪽 끝', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const [year, setYear] = useState(2026);
  const pick = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">큰 구단 카드 고정 · 8안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? A : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      <div style={{ width: 1184, height: 807 }}>{pick[2](year, setYear)}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
