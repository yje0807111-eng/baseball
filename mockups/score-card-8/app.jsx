/* 감독 모드 스코어보드 — 짧은 팀 이름 + 붙은 점수(카드 1) / 볼카운트 + 주자 판(카드 2) · 투구 수 8안 */
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
/* 중계 자막처럼 짧게 부른다 */
const SHORT = { kia: 'KIA', doosan: '두산', samsung: '삼성', hanwha: '한화', lg: 'LG', lotte: '롯데', nc: 'NC', kt: 'KT', hyundai: '현대', sk: 'SSG', kiwoom: '키움', korea: '한국', legend: '레전드' };
const MY = { key: 'legend', color: '#10b981', src: 'ui/teams/flag-legend.webp' };
const flagOf = (name, mine) => (mine ? MY : teamFlag(name) || MY);
const shortOf = (name, mine) => {
  if (mine) return name.replace(/^나의\s*/, '').slice(0, 4);
  const f = teamFlag(name);
  return (f && SHORT[f.key]) || name.replace(/^\d{4}\s*/, '').split(' ')[0];
};
const FLAG_MASK = 'linear-gradient(90deg,transparent 10%,#000 85%)';
const MODES = ['보통', '자동', '스킵'];

const Diamond = ({ size = 86 }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    <path d="M50 88 L86 52 L50 16 L14 52 Z" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
    {[[86, 52], [50, 16], [14, 52]].map(([x, y], i) => (
      <rect key={i} x={x - 8} y={y - 8} width="16" height="16" transform={`rotate(45 ${x} ${y})`}
        fill={G.bases[i] ? '#fde047' : 'rgba(255,255,255,.14)'} style={G.bases[i] ? { filter: 'drop-shadow(0 0 7px #fde047)' } : undefined} />
    ))}
    <rect x="45" y="83" width="10" height="10" transform="rotate(45 50 88)" fill="#fff" />
  </svg>
);
const Bso = ({ dot = 12, gap = 5 }) => (
  <div className="grid items-center font-display text-[12px] font-extrabold" style={{ gridTemplateColumns: `14px repeat(3, ${dot}px)`, gap }}>
    <span className="text-emerald-400">B</span>
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.balls ? '#34d399' : 'rgba(255,255,255,.15)', boxShadow: i < G.balls ? '0 0 7px #34d399' : 'none' }} />)}
    <span className="text-yellow-300">S</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.strikes ? '#fde047' : 'rgba(255,255,255,.15)', boxShadow: i < G.strikes ? '0 0 7px #fde047' : 'none' }} />)}<span />
    <span className="text-red-400">O</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.outs ? '#ef4444' : 'rgba(255,255,255,.15)', boxShadow: i < G.outs ? '0 0 7px #ef4444' : 'none' }} />)}<span />
  </div>
);
const InnChip = ({ sm = false }) => (
  <span className="mt-cut inline-block bg-[#fde047] font-display font-extrabold text-[#05080f]" style={{ '--c': '4px', padding: sm ? '1px 7px' : '2px 9px', fontSize: sm ? 12 : 13 }}>
    {G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i>
  </span>
);
const Pitches = ({ cls = 'font-display text-[11px] tracking-[0.14em] text-gray-400' }) => (
  <span className={cls}>투구 <b className="text-white">{G.pitches}</b></span>
);

/* 카드 1 — 짧은 이름 + 바로 옆 점수, 두 줄이 내부 선으로 나뉜다 */
const ScoreCard = ({ nameW = 62, h = 34, font = 15, big = 22, opacity = 0.5, divider = true }) => (
  <div className="mt-cut overflow-hidden" style={{ '--c': '7px', background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>
    {[[G.away, false], [G.home, true]].map(([t, mine], i) => {
      const f = flagOf(t.name, mine);
      return (
        <div key={t.name} className={`relative flex items-stretch ${divider && i === 0 ? 'border-b border-white/12' : ''}`}>
          <span className="relative flex items-center gap-2 overflow-hidden px-2.5" style={{ width: nameW + 34, height: h }}>
            <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${f.src})`, opacity, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />
            <span className="relative block h-4 w-1 shrink-0" style={{ background: f.color }} />
            <b className="relative truncate font-extrabold text-white" style={{ fontSize: font, textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{shortOf(t.name, mine)}</b>
          </span>
          <span className="grid w-11 shrink-0 place-items-center border-l border-white/12 font-display font-extrabold"
            style={{ fontSize: big, background: mine ? 'rgba(253,224,71,.12)' : 'rgba(0,0,0,.28)', color: mine ? '#fde047' : '#fff' }}>{t.runs}</span>
        </div>
      );
    })}
  </div>
);
/* 카드 2 — 볼카운트와 주자 판, 가운데 선으로 나뉜다 */
const CountCard = ({ size = 86, dot = 12, col = false, foot = null }) => (
  <div className="mt-cut overflow-hidden" style={{ '--c': '7px', background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>
    <div className={`flex ${col ? 'flex-col items-center' : 'items-center'}`}>
      <span className={`grid place-items-center ${col ? 'w-full border-b border-white/12 py-2' : 'h-full px-3 py-2'}`}><Bso dot={dot} /></span>
      <span className={`grid place-items-center ${col ? 'py-1.5' : 'border-l border-white/12 px-2 py-1'}`}><Diamond size={size} /></span>
    </div>
    {foot}
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
const Frame = ({ board }) => (
  <div className="relative overflow-hidden" style={{ width: 1880, height: 520, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', opacity: 0.85 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.9) 0,rgba(3,5,10,.2) 22%,rgba(3,5,10,.12) 78%,rgba(3,5,10,.9) 100%), linear-gradient(180deg,rgba(3,5,10,.86) 0,rgba(3,5,10,0) 24%)' }} />
    <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: '63px auto 1fr' }}>
      <Head />
      <div className="col-start-1 row-start-2 self-start"><div className="inline-block">{board}</div></div>
    </div>
  </div>
);
const Glass = ({ children, pad = 'p-3' }) => (
  <div className={`mt-cut mt-frame mt-glass ${pad}`} style={{ '--c': '12px', '--a': '#fde047' }}>{children}</div>
);

/* 1. 두 카드 나란히 — 위에 회와 투구 수 */
const V1 = () => (
  <Frame board={(
    <Glass>
      <div className="mb-2 flex items-center gap-2"><InnChip /><Pitches /></div>
      <div className="flex items-center gap-2"><ScoreCard /><CountCard /></div>
    </Glass>
  )} />
);

/* 2. 회는 점수 카드 위 띠로, 투구 수는 카운트 카드 아래 띠로 */
const V2 = () => (
  <Frame board={(
    <Glass>
      <div className="flex items-start gap-2">
        <div>
          <div className="mb-1.5"><InnChip /></div>
          <ScoreCard />
        </div>
        <CountCard foot={<div className="border-t border-white/12 px-2 py-1 text-center"><Pitches cls="font-display text-[11px] text-gray-400" /></div>} />
      </div>
    </Glass>
  )} />
);

/* 3. 카운트를 위, 주자 판을 아래 — 카드가 세로로 나뉜다 */
const V3 = () => (
  <Frame board={(
    <Glass>
      <div className="mb-2 flex items-center gap-2"><InnChip /><Pitches /></div>
      <div className="flex items-start gap-2"><ScoreCard h={38} big={24} /><CountCard col size={64} dot={11} /></div>
    </Glass>
  )} />
);

/* 4. 회를 왼쪽 기둥으로 — 카드 두 장이 그 옆에 */
const V4 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass flex items-stretch overflow-hidden" style={{ '--c': '12px', '--a': '#fde047' }}>
      <span className="flex w-11 shrink-0 flex-col items-center justify-center gap-1 bg-[#fde047]/15">
        <b className="font-display text-[18px] font-extrabold text-yellow-300">{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></b>
        <b className="font-display text-[11px] text-gray-300">{G.pitches}</b>
      </span>
      <div className="flex items-center gap-2 p-2.5"><ScoreCard /><CountCard /></div>
    </div>
  )} />
);

/* 5. 이름 칸을 더 좁게 · 점수를 크게 */
const V5 = () => (
  <Frame board={(
    <Glass>
      <div className="mb-2 flex items-center gap-2"><InnChip /><Pitches /></div>
      <div className="flex items-center gap-2"><ScoreCard nameW={44} h={38} font={16} big={26} /><CountCard size={80} /></div>
    </Glass>
  )} />
);

/* 6. 깃발을 진하게 — 짧은 이름 뒤가 더 보인다 */
const V6 = () => (
  <Frame board={(
    <Glass>
      <div className="mb-2 flex items-center gap-2"><InnChip /><Pitches /></div>
      <div className="flex items-center gap-2"><ScoreCard opacity={0.75} /><CountCard /></div>
    </Glass>
  )} />
);

/* 7. 위 띠에 회 · 투구 수 — 카드 두 장은 아래에 */
const V7 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass overflow-hidden" style={{ '--c': '12px', '--a': '#fde047' }}>
      <div className="flex items-center justify-between gap-3 whitespace-nowrap bg-[#fde047] px-3 py-1 font-display text-[12px] font-extrabold text-[#05080f]">
        <span>{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i> · 단판 1차전</span>
        <span>투구 {G.pitches}</span>
      </div>
      <div className="flex items-center gap-2 p-2.5"><ScoreCard /><CountCard /></div>
    </div>
  )} />
);

/* 8. 카드 두 장을 위아래로 — 폭이 가장 좁다 */
const V8 = () => (
  <Frame board={(
    <Glass>
      <div className="mb-2 flex items-center gap-2"><InnChip /><Pitches /></div>
      <div className="flex flex-col gap-2">
        <ScoreCard nameW={78} h={34} />
        <CountCard size={72} />
      </div>
    </Glass>
  )} />
);

const V = [['1', '나란히', V1], ['2', '띠로 나눠', V2], ['3', '카운트 위 · 주자 아래', V3], ['4', '회 기둥', V4],
  ['5', '이름 더 좁게', V5], ['6', '깃발 진하게', V6], ['7', '위 띠', V7], ['8', '위아래 두 장', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">스코어보드 카드 · 8안</b>
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
