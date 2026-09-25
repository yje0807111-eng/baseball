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

/* 왼쪽 판만 고정 — 큰 선수 카드 자리는 안마다 다르다 */
const LeftPanel = ({ y, hero, rest }) => (
  <div className="ui-cut ui-frame ui-glass mt-4 flex min-h-0 flex-col p-4" style={{ '--c': '14px', '--a': A }}>
    <Title y={y} hero={hero} big={false} />
    <div className="mt-4 shrink-0"><Ticket s={hero} w="100%" h={150} /></div>
    <Lab t={`Series ${rest.length}`} />
    <div className="syn-scroll mt-1.5 grid min-h-0 gap-1.5 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridAutoRows: '82px' }}>
      {rest.map((s) => <Ticket key={s.id} s={s} w="100%" h="100%" sm />)}
    </div>
  </div>
);
/* 그림을 좌우로 뒤집어 실루엣을 왼쪽으로 보내는 배경 (새로 뽑지 않아도 된다) */
const FlipShell = ({ y, set, children }) => {
  const hero = heroOf(y), flag = teamFlag(hero?.title || '');
  return (
    <section className="ui-cut ui-frame ui-glass relative flex h-full min-h-0 flex-col overflow-hidden p-5" style={{ '--c': '20px', '--a': A }}>
      <span className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ zIndex: 0, backgroundImage: `url(ui/teams/bg-${flag?.key || 'legend'}.webp)`, opacity: 0.6, transform: 'scaleX(-1)' }} />
      <span className="pointer-events-none absolute inset-0" style={{ zIndex: 0, background: `linear-gradient(90deg,rgba(5,8,15,.86) 12%,rgba(5,8,15,.46) 46%,rgba(5,8,15,.2)), linear-gradient(0deg,rgba(5,8,15,.8),rgba(5,8,15,0) 45%), radial-gradient(60% 80% at 24% 70%, ${flag?.color || '#10b981'}2e, transparent 70%)` }} />
      <p className="relative z-10 ui-lab font-display" style={{ '--a': A }}>Season</p>
      <Picker y={y} set={set} />
      {children(hero, seriesOf(y).filter((s) => s !== hero), flag)}
    </section>
  );
};
const Row = ({ children, cols }) => (
  <div className="relative z-10 grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: cols }}>{children}</div>
);
const Star = ({ p, w = 78, h = 102 }) => (
  <div className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '7px', width: w, height: h, backgroundImage: art(p), backgroundPosition: '60% 12%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,0) 40%,#05080f)' }} />
    <b className="absolute left-1.5 top-0.5 font-display text-[13px]" style={{ color: tone(p.overall) }}>{p.overall}</b>
    <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[11px] text-white">{p.name}</b>
  </div>
);
const Big = ({ p, h, w = '100%', note = true }) => (
  <div className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '12px', width: w, height: h, backgroundImage: art(p), backgroundPosition: '60% 8%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,0) 35%,rgba(5,8,15,.92) 74%,#05080f)' }} />
    <b className="absolute right-2.5 top-2 font-display text-2xl" style={{ color: tone(p.overall), textShadow: '0 2px 6px #000' }}>{p.overall}</b>
    <div className="absolute inset-x-3 bottom-2.5">
      <span className="font-display text-[11px] tracking-[0.18em] text-gray-400">{p.position} · {p.team}</span>
      <b className="mt-0.5 block truncate text-2xl font-black text-white">{p.name}</b>
      {note && p.note && <span className="mt-0.5 block truncate text-[11.5px] text-gray-400">{p.note}</span>}
    </div>
  </div>
);
/* 가로로 눕힌 큰 카드 — 그림은 왼쪽, 글은 오른쪽 */
const BigWide = ({ p, h = 150 }) => (
  <div className="ui-cut relative flex items-center gap-4 overflow-hidden bg-[#0b1220] pr-4" style={{ '--c': '12px', height: h, background: 'rgba(5,8,15,.72)' }}>
    <span className="block h-full shrink-0 bg-cover" style={{ width: 176, backgroundImage: art(p), backgroundPosition: '60% 10%', WebkitMaskImage: 'linear-gradient(90deg,#000 62%,transparent)', maskImage: 'linear-gradient(90deg,#000 62%,transparent)' }} />
    <div className="min-w-0 flex-1">
      <span className="font-display text-[11px] tracking-[0.18em] text-gray-400">{p.position} · {p.team}</span>
      <b className="mt-0.5 block truncate text-3xl font-black text-white">{p.name}</b>
      {p.note && <span className="mt-1 block truncate text-[12px] text-gray-400">{p.note}</span>}
    </div>
    <b className="shrink-0 font-display text-4xl" style={{ color: tone(p.overall) }}>{p.overall}</b>
  </div>
);
const NameChip = ({ p }) => (
  <span className="ui-cut px-2 py-1 text-[12px] text-gray-300" style={{ '--c': '5px', background: 'rgba(255,255,255,.07)' }}>
    {p.name} <b className="font-display text-[11px]" style={{ color: tone(p.overall) }}>{p.overall}</b>
  </span>
);
const NameRow = ({ p }) => (
  <span className="ui-cut flex items-center gap-2 p-1" style={{ '--c': '6px', background: 'rgba(5,8,15,.66)' }}>
    <span className="ui-cut block shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '4px', width: 30, height: 30, backgroundImage: art(p), backgroundPosition: '60% 10%' }} />
    <b className="min-w-0 flex-1 truncate text-[13px] text-white">{p.name}</b>
    <span className="font-display text-[11px] text-gray-500">{p.position}</span>
    <b className="mr-1 font-display text-[14px]" style={{ color: tone(p.overall) }}>{p.overall}</b>
  </span>
);

/* 1. 가운데 아래 — 실루엣 앞에 선수가 선다 */
const V1 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => {
    const [one, ...more] = starsOf(y, 7);
    return (
      <Row cols="392px minmax(0,1fr) 250px">
        <LeftPanel y={y} hero={hero} rest={rest} />
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <Lab t="Best of the year" />
          <div className="mt-1.5 flex justify-center"><Big p={one} w={268} h={330} /></div>
        </div>
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <Lab t="Stars" />
          <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">{more.map((p) => <Star key={p.id} p={p} w={78} h={100} />)}</div>
        </div>
      </Row>
    );
  }}</Shell>
);

/* 2. 왼쪽 판 바로 옆 — 제목 · 구단 · 얼굴이 한 줄로 이어진다 */
const V2 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => {
    const [one, ...more] = starsOf(y, 9);
    return (
      <Row cols="392px 262px minmax(0,1fr)">
        <LeftPanel y={y} hero={hero} rest={rest} />
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <Lab t="Best of the year" />
          <div className="mt-1.5"><Big p={one} h={318} /></div>
        </div>
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <div className="flex flex-wrap gap-1.5">{more.map((p) => <Star key={p.id} p={p} w={74} h={96} />)}</div>
        </div>
      </Row>
    );
  }}</Shell>
);

/* 3. 바닥을 가로질러 눕히기 — 위쪽 그림은 그대로 둔다 */
const V3 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => {
    const [one, ...more] = starsOf(y, 9);
    return (
      <Row cols="392px minmax(0,1fr)">
        <LeftPanel y={y} hero={hero} rest={rest} />
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <Lab t="Best of the year" />
          <div className="mt-1.5"><BigWide p={one} /></div>
          <div className="mt-2 flex flex-wrap gap-1">{more.map((p) => <NameChip key={p.id} p={p} />)}</div>
        </div>
      </Row>
    );
  }}</Shell>
);

/* 4. 그림을 뒤집어 실루엣을 왼쪽으로 — 오른쪽이 통째로 열린다 */
const V4 = (y, set) => (
  <FlipShell y={y} set={set}>{(hero, rest) => {
    const [one, ...more] = starsOf(y, 7);
    return (
      <Row cols="392px minmax(0,1fr) 300px">
        <LeftPanel y={y} hero={hero} rest={rest} />
        <span />
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <Lab t="Best of the year" />
          <div className="mt-1.5"><Big p={one} h={300} /></div>
          <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">{more.map((p) => <Star key={p.id} p={p} w={92} h={70} />)}</div>
        </div>
      </Row>
    );
  }}</FlipShell>
);

/* 5. 가운데 아래 + 오른쪽엔 이름줄 */
const V5 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => {
    const [one, ...more] = starsOf(y, 7);
    return (
      <Row cols="392px minmax(0,1fr) 262px">
        <LeftPanel y={y} hero={hero} rest={rest} />
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <Lab t="Best of the year" />
          <div className="mt-1.5 flex justify-center"><Big p={one} w={252} h={300} /></div>
        </div>
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <Lab t="Stars" />
          <div className="mt-1.5 flex flex-col gap-1">{more.map((p) => <NameRow key={p.id} p={p} />)}</div>
        </div>
      </Row>
    );
  }}</Shell>
);

/* 6. 가운데에서 위로 솟은 한 장 — 위아래를 다 쓴다 */
const V6 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => {
    const [one, ...more] = starsOf(y, 9);
    return (
      <Row cols="392px minmax(0,1fr) 230px">
        <LeftPanel y={y} hero={hero} rest={rest} />
        <div className="mt-4 flex min-h-0 justify-center pb-1"><Big p={one} w={286} h="100%" /></div>
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <Lab t="Stars" />
          <div className="mt-1.5 flex flex-wrap justify-end gap-1">{more.map((p) => <NameChip key={p.id} p={p} />)}</div>
        </div>
      </Row>
    );
  }}</Shell>
);

/* 7. 뒤집은 그림 + 가운데 한 장 · 얼굴은 바닥 가로줄 */
const V7 = (y, set) => (
  <FlipShell y={y} set={set}>{(hero, rest) => {
    const [one, ...more] = starsOf(y, 8);
    return (
      <Row cols="392px minmax(0,1fr)">
        <LeftPanel y={y} hero={hero} rest={rest} />
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <div className="flex justify-end"><Big p={one} w={262} h={286} /></div>
          <Lab t="Stars" />
          <div className="mt-1.5 flex flex-wrap gap-1.5">{more.map((p) => <Star key={p.id} p={p} w={74} h={96} />)}</div>
        </div>
      </Row>
    );
  }}</FlipShell>
);

/* 8. 큰 한 장에서 작은 얼굴로 이어지는 한 줄 — 바닥을 가로지른다 */
const V8 = (y, set) => (
  <Shell y={y} set={set}>{(hero, rest) => {
    const [one, ...more] = starsOf(y, 9);
    return (
      <Row cols="392px minmax(0,1fr)">
        <LeftPanel y={y} hero={hero} rest={rest} />
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <Lab t="Best of the year · Stars" />
          <div className="mt-1.5 flex items-end gap-1.5">
            <Big p={one} w={212} h={248} />
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{more.map((p) => <Star key={p.id} p={p} w={74} h={96} />)}</div>
          </div>
        </div>
      </Row>
    );
  }}</Shell>
);

const V = [['1', '가운데 아래', V1], ['2', '판 바로 옆', V2], ['3', '바닥에 눕히기', V3], ['4', '그림 뒤집기 + 오른쪽', V4],
  ['5', '가운데 + 이름줄', V5], ['6', '가운데 위아래 꽉', V6], ['7', '뒤집기 + 바닥 얼굴', V7], ['8', '큰 것에서 작은 것으로', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const [year, setYear] = useState(2026);
  const pick = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">큰 선수 카드 자리 · 8안 (왼쪽 판만 고정)</b>
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
