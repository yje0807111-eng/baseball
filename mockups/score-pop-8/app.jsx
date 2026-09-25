/* 감독 모드 스코어보드 — 배경에 묻히지 않게 눈에 띄게 하는 8안 (구성은 지금 화면 그대로) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { teamFlag } from '/src/myteam/teamArt.js';

const G = {
  away: { name: '2026 롯데 자이언츠', runs: 3 },
  home: { name: '나의 드림팀', runs: 2 },
  inning: 5, top: true, balls: 2, strikes: 1, outs: 1, bases: [true, false, true], pitches: 57,
};
const SHORT = { kia: 'KIA', doosan: '두산', samsung: '삼성', hanwha: '한화', lg: 'LG', lotte: '롯데', nc: 'NC', kt: 'KT', hyundai: '현대', sk: 'SSG', kiwoom: '키움', korea: '한국', legend: '레전드' };
const MY = { key: 'legend', color: '#10b981', src: 'ui/teams/flag-legend.webp' };
const flagOf = (name, mine) => (mine ? MY : teamFlag(name) || MY);
const shortOf = (name, mine) => {
  if (mine) return name.replace(/^나의\s*/, '').slice(0, 4);
  const f = teamFlag(name);
  return (f && SHORT[f.key]) || name.replace(/^\d{4}\s*/, '').split(' ')[0];
};
const FLAG_MASK = 'linear-gradient(90deg,transparent 8%,#000 88%)';
const MODES = ['보통', '자동', '스킵'];
const W = 246;

const Diamond = ({ size = 92 }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    <path d="M50 88 L86 52 L50 16 L14 52 Z" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
    {[[86, 52], [50, 16], [14, 52]].map(([x, y], i) => (
      <rect key={i} x={x - 8} y={y - 8} width="16" height="16" transform={`rotate(45 ${x} ${y})`}
        fill={G.bases[i] ? '#fde047' : 'rgba(255,255,255,.14)'} style={G.bases[i] ? { filter: 'drop-shadow(0 0 7px #fde047)' } : undefined} />
    ))}
    <rect x="45" y="83" width="10" height="10" transform="rotate(45 50 88)" fill="#fff" />
  </svg>
);
const Bso = ({ dot = 14 }) => (
  <div className="grid items-center" style={{ gridTemplateColumns: `repeat(3, ${dot}px)`, gap: 5 }}>
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.balls ? '#34d399' : 'rgba(255,255,255,.15)', boxShadow: i < G.balls ? '0 0 7px #34d399' : 'none' }} />)}
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.strikes ? '#fde047' : 'rgba(255,255,255,.15)', boxShadow: i < G.strikes ? '0 0 7px #fde047' : 'none' }} />)}<span />
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.outs ? '#ef4444' : 'rgba(255,255,255,.15)', boxShadow: i < G.outs ? '0 0 7px #ef4444' : 'none' }} />)}<span />
  </div>
);
const Head = () => (
  <header className="relative col-span-3 -mx-5 flex items-center gap-6 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
    <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#10b981] to-transparent" />
    <button type="button" className="mt-cut grid h-9 w-9 shrink-0 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]" style={{ '--c': '7px' }}>←</button>
    <div className="shrink-0 leading-none">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Manager Mode</p>
      <h1 className="mt-1 text-xl font-black leading-none text-white">감독 모드</h1>
    </div>
    <span className="mt-cut shrink-0 bg-red-500 px-2 py-0.5 font-display text-xs font-bold tracking-[0.2em] text-[#05080f]" style={{ '--c': '4px' }}>
      <i className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#05080f] align-middle" />LIVE
    </span>
    <div className="ml-auto flex items-center gap-6">
      <div className="mt-cut mt-glass flex gap-1 p-1" style={{ '--c': '8px' }}>
        {MODES.map((m, i) => <button key={m} type="button" className={`mt-cut px-3.5 py-1 font-display text-sm font-bold ${i === 0 ? 'bg-[#10b981] text-[#05080f]' : 'text-gray-400'}`} style={{ '--c': '5px' }}>{m}</button>)}
      </div>
      <button type="button" className="mt-btn sm">계속 ▶</button>
    </div>
  </header>
);
/* 밝은 잔디가 보이는 자리에 놓고 견준다 */
const Frame = ({ board, under = null }) => (
  <div className="relative overflow-hidden" style={{ width: 1880, height: 520, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', backgroundPosition: 'center 62%', opacity: 0.95 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.7) 0,rgba(3,5,10,.12) 26%,rgba(3,5,10,.1) 76%,rgba(3,5,10,.7) 100%), linear-gradient(180deg,rgba(3,5,10,.8) 0,rgba(3,5,10,0) 26%)' }} />
    {under}
    <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: '63px auto 1fr' }}>
      <Head />
      <div className="col-start-1 row-start-2 self-start"><div className="w-max">{board}</div></div>
    </div>
  </div>
);

/* 점수 카드 안쪽 — 안마다 바뀌는 건 겉껍데기다 */
const Rows = ({ dark = false, rowH = 48 }) => (
  <>
    {[[G.away, false], [G.home, true]].map(([t, mine], i) => {
      const f = flagOf(t.name, mine);
      return (
        <div key={t.name} className={`relative flex items-stretch ${i === 0 ? (dark ? 'border-b border-black/15' : 'border-b border-white/[0.09]') : ''}`} style={{ height: rowH }}>
          <span className="relative flex flex-1 items-center gap-2.5 overflow-hidden px-3">
            <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${f.src})`, opacity: dark ? 0.3 : 0.62, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />
            <span className="relative block h-5 w-1.5 shrink-0" style={{ background: f.color }} />
            <b className={`relative truncate text-[19px] font-extrabold ${dark ? 'text-[#05080f]' : 'text-white'}`} style={{ textShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.9)' }}>{shortOf(t.name, mine)}</b>
          </span>
          <span className={`grid w-14 shrink-0 place-items-center font-display text-[30px] font-extrabold ${dark ? 'border-l border-black/15' : 'border-l border-white/[0.09]'}`}
            style={{ background: dark ? 'rgba(0,0,0,.08)' : (mine ? 'rgba(253,224,71,.12)' : 'rgba(0,0,0,.3)'), color: dark ? '#05080f' : (mine ? '#fde047' : '#fff') }}>{t.runs}</span>
        </div>
      );
    })}
  </>
);
const Meta = ({ style, cls = 'text-yellow-300', sub = 'text-gray-500' }) => (
  <div className="flex items-center justify-between px-3 py-1" style={style}>
    <b className={`font-display text-[15px] font-extrabold ${cls}`}>{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></b>
    <span className={`font-display text-[11px] tracking-[0.22em] ${sub}`}>SCORE</span>
  </div>
);
const CountBody = ({ dot = 14, size = 92 }) => (
  <div className="flex h-full items-stretch">
    <span className="grid place-items-center gap-1.5 px-3.5 py-2">
      <small className="font-display text-[10.5px] tracking-[0.22em] text-gray-500">COUNT</small>
      <Bso dot={dot} />
    </span>
    <span className="grid place-items-center border-l border-white/[0.09] px-2"><Diamond size={size} /></span>
    <span className="grid w-14 place-items-center border-l border-white/[0.09]">
      <span className="text-center leading-tight">
        <b className="block font-display text-[22px] font-extrabold text-white">{G.pitches}</b>
        <small className="font-display text-[10.5px] tracking-[0.12em] text-gray-500">PITCH</small>
      </span>
    </span>
  </div>
);
const Pair = ({ score, count, gap = 8, shadow = 'drop-shadow(0 12px 26px rgba(0,0,0,.6))' }) => (
  <div className="flex items-stretch" style={{ gap, filter: shadow }}>{score}{count}</div>
);

/* 1. 더 짙게 — 배경을 거의 검게, 테두리를 밝게 */
const V1 = () => (
  <Frame board={(
    <Pair
      score={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', width: W, background: 'rgba(3,5,10,.97)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.3)' }}>
        <Meta style={{ background: 'rgba(253,224,71,.16)' }} /><Rows />
      </div>}
      count={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', background: 'rgba(3,5,10,.97)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.3)' }}><CountBody /></div>}
    />
  )} />
);

/* 2. 팀 색 굵은 띠 — 왼쪽에 색 기둥을 세운다 */
const V2 = () => (
  <Frame board={(
    <Pair
      score={<div className="mt-cut relative overflow-hidden" style={{ '--c': '10px', width: W, background: 'rgba(8,12,20,.94)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)' }}>
        <i className="absolute inset-y-0 left-0 w-1.5" style={{ background: 'linear-gradient(180deg,#60a5fa 50%,#10b981 50%)' }} />
        <div className="pl-1.5"><Meta style={{ background: 'rgba(255,255,255,.08)' }} /><Rows /></div>
      </div>}
      count={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', background: 'rgba(8,12,20,.94)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)' }}><CountBody /></div>}
    />
  )} />
);

/* 3. 밝은 카드 — 중계처럼 하얀 판에 검은 글씨 */
const V3 = () => (
  <Frame board={(
    <Pair
      score={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', width: W, background: 'rgba(233,238,245,.95)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.25)' }}>
        <Meta style={{ background: '#fde047' }} cls="text-[#05080f]" sub="text-[#05080f]/60" /><Rows dark />
      </div>}
      count={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', background: 'rgba(8,12,20,.94)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)' }}><CountBody /></div>}
    />
  )} />
);

/* 4. 노란 테두리 + 번짐 — 카드가 빛을 머금는다 */
const V4 = () => (
  <Frame board={(
    <Pair shadow="drop-shadow(0 0 14px rgba(253,224,71,.28)) drop-shadow(0 14px 28px rgba(0,0,0,.7))"
      score={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', width: W, background: 'rgba(8,12,20,.94)', boxShadow: 'inset 0 0 0 2px rgba(253,224,71,.6)' }}>
        <Meta style={{ background: 'rgba(253,224,71,.18)' }} /><Rows />
      </div>}
      count={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', background: 'rgba(8,12,20,.94)', boxShadow: 'inset 0 0 0 2px rgba(253,224,71,.35)' }}><CountBody /></div>}
    />
  )} />
);

/* 5. 흐림 판 — 뒤 그림을 흐려 글이 떠오른다 */
const V5 = () => (
  <Frame board={(
    <Pair
      score={<div className="mt-cut overflow-hidden backdrop-blur-md" style={{ '--c': '10px', width: W, background: 'rgba(5,8,15,.72)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.22)' }}>
        <Meta style={{ background: 'rgba(253,224,71,.16)' }} /><Rows />
      </div>}
      count={<div className="mt-cut overflow-hidden backdrop-blur-md" style={{ '--c': '10px', background: 'rgba(5,8,15,.72)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.22)' }}><CountBody /></div>}
    />
  )} />
);

/* 6. 노란 머리 띠를 꽉 — 위가 눈에 먼저 걸린다 */
const V6 = () => (
  <Frame board={(
    <Pair
      score={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', width: W, background: 'rgba(8,12,20,.94)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)' }}>
        <div className="flex items-center justify-between bg-[#fde047] px-3 py-1">
          <b className="font-display text-[15px] font-extrabold text-[#05080f]">{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></b>
          <span className="font-display text-[11px] tracking-[0.22em] text-[#05080f]/70">SCORE</span>
        </div>
        <Rows />
      </div>}
      count={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', background: 'rgba(8,12,20,.94)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)' }}><CountBody /></div>}
    />
  )} />
);

/* 7. 화면 모서리를 어둡게 — 카드가 아니라 바탕을 눌러 준다 */
const V7 = () => (
  <Frame
    under={<span className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 0% 0%, rgba(3,5,10,.92), rgba(3,5,10,0) 70%)' }} />}
    board={(
      <Pair
        score={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', width: W, background: 'rgba(8,12,20,.9)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)' }}>
          <Meta style={{ background: 'rgba(253,224,71,.14)' }} /><Rows />
        </div>}
        count={<div className="mt-cut overflow-hidden" style={{ '--c': '10px', background: 'rgba(8,12,20,.9)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)' }}><CountBody /></div>}
      />
    )} />
);

/* 8. 모서리 표식 — 네 귀에 밝은 갈고리를 둔다 */
const V8 = () => {
  const Corner = ({ pos }) => (
    <i className="pointer-events-none absolute" style={{ width: 14, height: 14, ...pos, boxShadow: 'inset 0 0 0 2px #fde047', clipPath: 'polygon(0 0,100% 0,100% 35%,35% 35%,35% 100%,0 100%)' }} />
  );
  const Box = ({ children, w }) => (
    <div className="mt-cut relative overflow-hidden" style={{ '--c': '10px', width: w, background: 'rgba(5,8,15,.95)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)' }}>
      {children}
      <Corner pos={{ left: 3, top: 3 }} />
      <Corner pos={{ right: 3, bottom: 3, transform: 'rotate(180deg)' }} />
    </div>
  );
  return (
    <Frame board={(
      <Pair
        score={<Box w={W}><Meta style={{ background: 'rgba(253,224,71,.16)' }} /><Rows /></Box>}
        count={<Box><CountBody /></Box>}
      />
    )} />
  );
};

const V = [['1', '더 짙게', V1], ['2', '팀 색 기둥', V2], ['3', '밝은 카드', V3], ['4', '노란 테두리 번짐', V4],
  ['5', '흐림 판', V5], ['6', '노란 머리 띠', V6], ['7', '바탕 모서리 눌러주기', V7], ['8', '모서리 표식', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">스코어보드 대비 · 8안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? '#10b981' : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      <Cur />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
