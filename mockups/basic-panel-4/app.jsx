/* 전체 믹스 · 최근 시즌을 연도별 시즌과 같은 짜임으로 — 왼쪽 판 + 오른쪽 그 해 얼굴 4안 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';
import { teamFlag } from '/src/myteam/teamArt.js';

const A = '#a3e635', GOLD = '#fcd34d';
const KIND_KO = { legend: '레전드', team: '구단 시즌', national: '국가대표' };
const MODES = {
  mix: { name: '전체 믹스', en: 'All Series', list: SERIES, bg: 'legend' },
  recent: { name: '최근 시즌', en: 'Recent Seasons', list: SERIES.filter((s) => (s.year || 0) >= 2021), bg: null },
};
const ovrOf = (x) => Math.round(x.players.reduce((n, p) => n + p.overall, 0) / Math.max(1, x.players.length));
/* 판의 주인공: 가장 최근 우승 구단 → 없으면 종합이 가장 센 구단 → 없으면 첫 시리즈 */
const heroOf = (list) => {
  const clubs = list.filter((x) => x.kind === 'team');
  const champs = clubs.filter((x) => x.champion).sort((a, b) => (b.year || 0) - (a.year || 0));
  return champs[0] || [...clubs].sort((a, b) => ovrOf(b) - ovrOf(a))[0] || list[0];
};
const topOf = (s) => [...s.players].sort((a, b) => b.overall - a.overall)[0];
const starsOf = (list, n) => {
  const seen = new Set();
  return list.flatMap((s) => s.players).sort((a, b) => b.overall - a.overall)
    .filter((p) => !seen.has(p.name) && seen.add(p.name)).slice(0, n);
};
const groupOf = (list) => ['legend', 'team', 'national'].map((k) => [KIND_KO[k], list.filter((s) => s.kind === k)]).filter(([, l]) => l.length);
const art = (p) => (p ? `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp)` : undefined);
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const trophy = (size = 15, op = 0.7) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ opacity: op, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.8))' }}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
    <path d="M12 14v3" /><path d="M9 20.5h6" /><path d="M10 17.5h4l1 3H9l1-3Z" />
  </svg>
);
const Ticket = ({ s, w = '100%', h, sm = false }) => (
  <div className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover bg-no-repeat"
    style={{ '--c': sm ? '8px' : '12px', width: w, height: h, backgroundImage: art(topOf(s)), backgroundPosition: '60% 18%' }}>
    <span className="absolute inset-0" style={{ background: sm ? 'linear-gradient(180deg,rgba(5,8,15,.82),rgba(5,8,15,.9))' : 'linear-gradient(180deg,rgba(5,8,15,.55),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,rgba(5,8,15,.92) 72%,#05080f)' }} />
    {!sm && <span className="absolute left-3 top-2 font-display text-3xl font-extrabold leading-none" style={{ color: A, textShadow: `0 0 16px ${A}88, 0 2px 4px #000` }}>{s.year || 'ALL'}</span>}
    {s.champion && <span className={`absolute ${sm ? 'right-1.5 top-1.5' : 'right-2.5 top-2.5'}`}>{trophy(sm ? 12 : 15)}</span>}
    <div className={sm ? 'absolute inset-x-2 bottom-1.5' : 'absolute inset-x-3 bottom-2.5'}>
      {sm && <b className="block truncate font-display text-[11.5px]" style={{ color: A }}>{s.year || 'ALL'}</b>}
      <p className={`truncate font-black text-white ${sm ? 'text-[12.5px]' : 'text-base'}`}>{s.title}</p>
      {!sm && <p className="truncate text-[11px] text-gray-400">{s.subtitle || `${s.players.length}명`}</p>}
    </div>
  </div>
);
const Star = ({ p, w = 78, h = 102 }) => (
  <div className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '7px', width: w, height: h, backgroundImage: art(p), backgroundPosition: '60% 12%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,0) 40%,#05080f)' }} />
    <b className="absolute left-1.5 top-0.5 font-display text-[13px]" style={{ color: tone(p.overall) }}>{p.overall}</b>
    <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[11px] text-white">{p.name}</b>
  </div>
);
const Big = ({ p, w, h }) => (
  <div className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '12px', width: w, height: h, backgroundImage: art(p), backgroundPosition: '60% 8%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,0) 35%,rgba(5,8,15,.92) 74%,#05080f)' }} />
    <b className="absolute right-2.5 top-2 font-display text-2xl" style={{ color: tone(p.overall), textShadow: '0 2px 6px #000' }}>{p.overall}</b>
    <div className="absolute inset-x-3 bottom-2.5">
      <span className="font-display text-[11px] tracking-[0.18em] text-gray-400">{p.position} · {p.team}</span>
      <b className="mt-0.5 block truncate text-2xl font-black text-white">{p.name}</b>
      {p.note && <span className="mt-0.5 block truncate text-[11.5px] text-gray-400">{p.note}</span>}
    </div>
  </div>
);
const Lab = ({ t }) => <p className="ui-lab font-display" style={{ '--a': A }}>{t}</p>;
const GroupHead = ({ ko, n }) => (
  <div className="mt-3 flex items-center gap-2">
    <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: A }}>SERIES</span>
    <b className="text-[12px] text-gray-300">{ko} {n}</b>
    <span className="h-px flex-1 bg-white/10" />
  </div>
);
const Shell = ({ mode, pick, set, children }) => {
  const m = MODES[pick], hero = heroOf(m.list), flag = teamFlag(hero?.title || '');
  const key = m.bg || flag?.key || 'legend';
  const color = m.bg === 'legend' ? '#fbbf24' : flag?.color || A;
  return (
    <section className="ui-cut ui-frame ui-glass relative flex h-full min-h-0 flex-col overflow-hidden p-5" style={{ '--c': '20px', '--a': A }}>
      <span className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ zIndex: 0, backgroundImage: `url(ui/teams/bg-${key}.webp)`, opacity: 0.6 }} />
      <span className="pointer-events-none absolute inset-0" style={{ zIndex: 0, background: `linear-gradient(90deg,rgba(5,8,15,.92) 8%,rgba(5,8,15,.4) 55%,rgba(5,8,15,.12)), linear-gradient(0deg,rgba(5,8,15,.8),rgba(5,8,15,0) 45%), radial-gradient(60% 80% at 20% 75%, ${color}2e, transparent 70%)` }} />
      <p className="relative z-10 ui-lab font-display" style={{ '--a': A }}>Basic</p>
      <div className="relative z-10 mt-3 flex gap-1.5">
        {Object.entries(MODES).map(([k, v]) => (
          <button key={k} type="button" onClick={() => set(k)}
            className={`ui-cut px-3 py-1 font-display text-sm font-bold ${k === pick ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400'}`}
            style={{ '--c': '5px', background: k === pick ? A : undefined }}>{v.name}</button>
        ))}
      </div>
      {children(m, hero)}
    </section>
  );
};
const Head = ({ m, hero }) => (
  <>
    <b className="font-display text-[13px] tracking-[0.25em]" style={{ color: A }}>{m.en}</b>
    <b className="mt-2 block text-5xl font-black leading-none text-white">{m.name}</b>
    <span className="mt-2 block text-[15px] text-gray-300">
      {m.list.length} 시리즈 · {m.list.reduce((n, s) => n + s.players.length, 0)}명
    </span>
  </>
);
const Right = ({ m, n = 6 }) => {
  const [one, ...more] = starsOf(m.list, n + 1);
  return (
    <div className="flex min-h-0 flex-col justify-end pb-1">
      <Lab t="Best of all" />
      <div className="mt-1.5 flex items-end gap-1.5">
        <Big p={one} w={212} h={248} />
        <div className="grid min-w-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${more.length},minmax(0,1fr))` }}>
          {more.map((p) => <Star key={p.id} p={p} w="100%" h={168} />)}
        </div>
      </div>
    </div>
  );
};

/* 1. 대표 카드 한 장 + 묶음별 3열 타일 (연도별 판과 같은 폭) */
const V1 = (pick, set) => (
  <Shell pick={pick} set={set}>{(m, hero) => (
    <div className="relative z-10 grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '392px minmax(0,1fr)' }}>
      <div className="ui-cut ui-frame ui-glass mt-4 flex min-h-0 flex-col p-4" style={{ '--c': '14px', '--a': A }}>
        <Head m={m} hero={hero} />
        <div className="mt-4 shrink-0"><Ticket s={hero} h={176} /></div>
        <div className="syn-scroll min-h-0 overflow-y-auto pr-1">
          {groupOf(m.list.filter((s) => s !== hero)).map(([ko, l]) => (
            <React.Fragment key={ko}>
              <GroupHead ko={ko} n={l.length} />
              <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gridAutoRows: '68px' }}>
                {l.map((s) => <Ticket key={s.id} s={s} h="100%" sm />)}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
      <Right m={m} />
    </div>
  )}</Shell>
);

/* 2. 대표 카드 없이 묶음 타일만 — 목록이 더 많이 보인다 */
const V2 = (pick, set) => (
  <Shell pick={pick} set={set}>{(m, hero) => (
    <div className="relative z-10 grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '392px minmax(0,1fr)' }}>
      <div className="ui-cut ui-frame ui-glass mt-4 flex min-h-0 flex-col p-4" style={{ '--c': '14px', '--a': A }}>
        <Head m={m} hero={hero} />
        <div className="syn-scroll mt-2 min-h-0 overflow-y-auto pr-1">
          {groupOf(m.list).map(([ko, l]) => (
            <React.Fragment key={ko}>
              <GroupHead ko={ko} n={l.length} />
              <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gridAutoRows: '68px' }}>
                {l.map((s) => <Ticket key={s.id} s={s} h="100%" sm />)}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
      <Right m={m} />
    </div>
  )}</Shell>
);

/* 3. 판을 넓게 — 4열 타일, 오른쪽 얼굴은 다섯 */
const V3 = (pick, set) => (
  <Shell pick={pick} set={set}>{(m, hero) => (
    <div className="relative z-10 grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '520px minmax(0,1fr)' }}>
      <div className="ui-cut ui-frame ui-glass mt-4 flex min-h-0 flex-col p-4" style={{ '--c': '14px', '--a': A }}>
        <div className="flex items-end gap-4">
          <div className="min-w-0 flex-1"><Head m={m} hero={hero} /></div>
          <Ticket s={hero} w={176} h={112} />
        </div>
        <div className="syn-scroll min-h-0 overflow-y-auto pr-1">
          {groupOf(m.list.filter((s) => s !== hero)).map(([ko, l]) => (
            <React.Fragment key={ko}>
              <GroupHead ko={ko} n={l.length} />
              <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridAutoRows: '66px' }}>
                {l.map((s) => <Ticket key={s.id} s={s} h="100%" sm />)}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
      <Right m={m} n={4} />
    </div>
  )}</Shell>
);

/* 4. 판에는 묶음 숫자와 대표 여덟만 — 전체는 접어 둔다 */
const V4 = (pick, set) => (
  <Shell pick={pick} set={set}>{(m, hero) => {
    const rest = m.list.filter((s) => s !== hero);
    const pickTop = [...rest].sort((a, b) => ovrOf(b) - ovrOf(a)).slice(0, 8);
    return (
      <div className="relative z-10 grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '392px minmax(0,1fr)' }}>
        <div className="ui-cut ui-frame ui-glass mt-4 flex min-h-0 flex-col p-4" style={{ '--c': '14px', '--a': A }}>
          <Head m={m} hero={hero} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {groupOf(m.list).map(([ko, l]) => (
              <span key={ko} className="ui-cut px-2.5 py-1 text-[12px] text-gray-300" style={{ '--c': '5px', background: 'rgba(255,255,255,.07)' }}>
                {ko} <b className="font-display text-[11px]" style={{ color: A }}>{l.length}</b>
              </span>
            ))}
          </div>
          <div className="mt-3 shrink-0"><Ticket s={hero} h={176} /></div>
          <Lab t="대표 시리즈" />
          <div className="mt-1.5 grid min-h-0 gap-1.5 overflow-hidden" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridAutoRows: '82px' }}>
            {pickTop.map((s) => <Ticket key={s.id} s={s} h="100%" sm />)}
          </div>
        </div>
        <Right m={m} />
      </div>
    );
  }}</Shell>
);

const V = [['1', '대표 카드 + 3열 타일', V1], ['2', '묶음 타일만', V2], ['3', '넓은 판 4열', V3], ['4', '숫자 + 대표 여덟', V4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const [pick, setPick] = useState('mix');
  const cur = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">전체 믹스 · 최근 시즌 · 4안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? A : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      <div style={{ width: 1184, height: 807 }}>{cur[2](pick, setPick)}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
