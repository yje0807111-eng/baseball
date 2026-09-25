/* 감독 모드 스코어보드 — 위아래 두 장(점수 / 카운트+주자) 다듬기 4안 + 추천 4안 */
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
const W = 212; // 두 장이 같은 폭으로 선다

const Diamond = ({ size = 76 }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    <path d="M50 88 L86 52 L50 16 L14 52 Z" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
    {[[86, 52], [50, 16], [14, 52]].map(([x, y], i) => (
      <rect key={i} x={x - 8} y={y - 8} width="16" height="16" transform={`rotate(45 ${x} ${y})`}
        fill={G.bases[i] ? '#fde047' : 'rgba(255,255,255,.14)'} style={G.bases[i] ? { filter: 'drop-shadow(0 0 7px #fde047)' } : undefined} />
    ))}
    <rect x="45" y="83" width="10" height="10" transform="rotate(45 50 88)" fill="#fff" />
  </svg>
);
const Bso = ({ dot = 11, gap = 5 }) => (
  <div className="grid items-center font-display text-[12px] font-extrabold" style={{ gridTemplateColumns: `13px repeat(3, ${dot}px)`, gap }}>
    <span className="text-emerald-400">B</span>
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.balls ? '#34d399' : 'rgba(255,255,255,.15)', boxShadow: i < G.balls ? '0 0 7px #34d399' : 'none' }} />)}
    <span className="text-yellow-300">S</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.strikes ? '#fde047' : 'rgba(255,255,255,.15)', boxShadow: i < G.strikes ? '0 0 7px #fde047' : 'none' }} />)}<span />
    <span className="text-red-400">O</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.outs ? '#ef4444' : 'rgba(255,255,255,.15)', boxShadow: i < G.outs ? '0 0 7px #ef4444' : 'none' }} />)}<span />
  </div>
);
const Card = ({ children, style }) => (
  <div className="mt-cut overflow-hidden" style={{ '--c': '7px', width: W, background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)', ...style }}>{children}</div>
);
/* 점수 줄 — 짧은 이름 + 바로 옆 점수 칸 */
const TeamRow = ({ t, mine, h = 36, font = 15, big = 23, opacity = 0.55, border = false, lead = false }) => {
  const f = flagOf(t.name, mine);
  return (
    <div className={`relative flex items-stretch ${border ? 'border-b border-white/12' : ''}`} style={{ height: h }}>
      <span className="relative flex flex-1 items-center gap-2 overflow-hidden px-2.5">
        <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${f.src})`, opacity, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />
        {lead && <i className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(90deg,${f.color}2e,transparent 70%)` }} />}
        <span className="relative block h-4 w-1 shrink-0" style={{ background: f.color }} />
        <b className="relative truncate font-extrabold text-white" style={{ fontSize: font, textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{shortOf(t.name, mine)}</b>
      </span>
      <span className="grid w-12 shrink-0 place-items-center border-l border-white/12 font-display font-extrabold"
        style={{ fontSize: big, background: mine ? 'rgba(253,224,71,.12)' : 'rgba(0,0,0,.3)', color: mine ? '#fde047' : '#fff' }}>{t.runs}</span>
    </div>
  );
};
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
const Glass = ({ children }) => (
  <div className="mt-cut mt-frame mt-glass p-2.5" style={{ '--c': '12px', '--a': '#fde047' }}>{children}</div>
);

/* ───── A. 8번을 다듬은 4안 ───── */

/* A1. 두 장을 같은 폭으로 — 회 칩은 점수 카드 머리 띠에 */
const A1 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-2">
        <Card>
          <div className="flex items-center justify-between bg-white/[0.07] px-2.5 py-1">
            <b className="font-display text-[12px] font-extrabold text-yellow-300">{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></b>
            <span className="font-display text-[11px] text-gray-400">투구 <b className="text-white">{G.pitches}</b></span>
          </div>
          <TeamRow t={G.away} border />
          <TeamRow t={G.home} mine />
        </Card>
        <Card>
          <div className="flex items-center">
            <span className="grid flex-1 place-items-center py-2"><Bso /></span>
            <span className="grid place-items-center border-l border-white/12 px-1.5 py-1"><Diamond size={72} /></span>
          </div>
        </Card>
      </div>
    </Glass>
  )} />
);

/* A2. 회는 왼쪽 위 칩, 카운트 카드는 주자 판을 왼쪽에 */
const A2 = () => (
  <Frame board={(
    <Glass>
      <div className="mb-2 flex items-center gap-2">
        <span className="mt-cut bg-[#fde047] px-2 py-0.5 font-display text-[12px] font-extrabold text-[#05080f]" style={{ '--c': '4px' }}>{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></span>
        <span className="font-display text-[11px] text-gray-400">투구 <b className="text-white">{G.pitches}</b></span>
      </div>
      <div className="flex flex-col gap-2">
        <Card><TeamRow t={G.away} border /><TeamRow t={G.home} mine /></Card>
        <Card>
          <div className="flex items-center">
            <span className="grid place-items-center px-1.5 py-1"><Diamond size={72} /></span>
            <span className="grid flex-1 place-items-center border-l border-white/12 py-2"><Bso /></span>
          </div>
        </Card>
      </div>
    </Glass>
  )} />
);

/* A3. 유리판 없이 한 장으로 — 세 구역을 선으로만 나눈다 */
const A3 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass overflow-hidden" style={{ '--c': '10px', '--a': '#fde047', width: W + 20 }}>
      <div className="flex items-center justify-between bg-[#fde047] px-3 py-1 font-display text-[12px] font-extrabold text-[#05080f]">
        <span>{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i> · 단판 1차전</span><span>투구 {G.pitches}</span>
      </div>
      <div style={{ width: '100%' }}><TeamRow t={G.away} border h={38} /><TeamRow t={G.home} mine h={38} /></div>
      <div className="flex items-center border-t border-white/12">
        <span className="grid flex-1 place-items-center py-2"><Bso /></span>
        <span className="grid place-items-center border-l border-white/12 px-1.5 py-1"><Diamond size={72} /></span>
      </div>
    </div>
  )} />
);

/* A4. 팀 색을 더 살린 점수 카드 + 어두운 카운트 카드 */
const A4 = () => (
  <Frame board={(
    <Glass>
      <div className="mb-2 flex items-center gap-2">
        <span className="mt-cut bg-[#fde047] px-2 py-0.5 font-display text-[12px] font-extrabold text-[#05080f]" style={{ '--c': '4px' }}>{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></span>
        <span className="font-display text-[11px] text-gray-400">투구 <b className="text-white">{G.pitches}</b></span>
      </div>
      <div className="flex flex-col gap-2">
        <Card><TeamRow t={G.away} border h={40} big={25} lead /><TeamRow t={G.home} mine h={40} big={25} /></Card>
        <Card style={{ background: 'rgba(0,0,0,.34)' }}>
          <div className="flex items-center">
            <span className="grid flex-1 place-items-center py-2"><Bso dot={12} /></span>
            <span className="grid place-items-center border-l border-white/12 px-1.5 py-1"><Diamond size={74} /></span>
          </div>
        </Card>
      </div>
    </Glass>
  )} />
);

/* ───── B. 추천 4안 ───── */

/* B1. 카운트 카드를 세 칸으로 — 카운트 · 주자 · 투구 수 */
const B1 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-2">
        <Card>
          <div className="flex items-center justify-between bg-white/[0.07] px-2.5 py-1">
            <b className="font-display text-[12px] font-extrabold text-yellow-300">{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></b>
            <span className="font-display text-[11px] tracking-[0.14em] text-gray-400">단판 1차전</span>
          </div>
          <TeamRow t={G.away} border /><TeamRow t={G.home} mine />
        </Card>
        <Card>
          <div className="flex items-stretch">
            <span className="grid flex-1 place-items-center py-2"><Bso /></span>
            <span className="grid place-items-center border-l border-white/12 px-1.5 py-1"><Diamond size={68} /></span>
            <span className="grid w-12 place-items-center border-l border-white/12">
              <span className="text-center leading-tight">
                <b className="block font-display text-[17px] font-extrabold text-white">{G.pitches}</b>
                <small className="font-display text-[10px] text-gray-500">투구</small>
              </span>
            </span>
          </div>
        </Card>
      </div>
    </Glass>
  )} />
);

/* B2. 두 장 사이에 상황 띠 — 회와 투구 수가 가운데로 */
const B2 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-1.5">
        <Card><TeamRow t={G.away} border h={38} /><TeamRow t={G.home} mine h={38} /></Card>
        <div className="mt-cut flex items-center justify-between px-2.5 py-1 font-display text-[12px] font-extrabold" style={{ '--c': '4px', width: W, background: 'rgba(253,224,71,.16)' }}>
          <span className="text-yellow-300">{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></span>
          <span className="text-gray-300">투구 <b className="text-white">{G.pitches}</b></span>
        </div>
        <Card>
          <div className="flex items-center">
            <span className="grid flex-1 place-items-center py-2"><Bso /></span>
            <span className="grid place-items-center border-l border-white/12 px-1.5 py-1"><Diamond size={72} /></span>
          </div>
        </Card>
      </div>
    </Glass>
  )} />
);

/* B3. 주자 판을 크게 왼쪽, 카운트는 세로로 오른쪽 */
const B3 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-2">
        <Card>
          <div className="flex items-center justify-between bg-white/[0.07] px-2.5 py-1">
            <b className="font-display text-[12px] font-extrabold text-yellow-300">{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></b>
            <span className="font-display text-[11px] text-gray-400">투구 <b className="text-white">{G.pitches}</b></span>
          </div>
          <TeamRow t={G.away} border /><TeamRow t={G.home} mine />
        </Card>
        <Card>
          <div className="flex items-center">
            <span className="grid flex-1 place-items-center py-1"><Diamond size={88} /></span>
            <span className="grid place-items-center border-l border-white/12 px-3 py-2"><Bso dot={12} gap={6} /></span>
          </div>
        </Card>
      </div>
    </Glass>
  )} />
);

/* B4. 미니 — 폭을 줄이고 글씨만 또렷하게 */
const B4 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass p-2" style={{ '--c': '10px', '--a': '#fde047' }}>
      <div className="flex flex-col gap-1.5" style={{ width: 176 }}>
        <div className="mt-cut overflow-hidden" style={{ '--c': '6px', background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>
          <div className="flex items-center justify-between bg-white/[0.07] px-2 py-0.5">
            <b className="font-display text-[11px] font-extrabold text-yellow-300">{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></b>
            <span className="font-display text-[10px] text-gray-400">투구 <b className="text-white">{G.pitches}</b></span>
          </div>
          <div style={{ width: '100%' }}><TeamRow t={G.away} border h={32} font={13.5} big={20} /><TeamRow t={G.home} mine h={32} font={13.5} big={20} /></div>
        </div>
        <div className="mt-cut overflow-hidden" style={{ '--c': '6px', background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>
          <div className="flex items-center">
            <span className="grid flex-1 place-items-center py-1.5"><Bso dot={10} gap={4} /></span>
            <span className="grid place-items-center border-l border-white/12 px-1 py-1"><Diamond size={58} /></span>
          </div>
        </div>
      </div>
    </div>
  )} />
);

const V = [['a1', '같은 폭 · 머리 띠', A1], ['a2', '주자 왼쪽', A2], ['a3', '한 장으로', A3], ['a4', '팀 색 살리기', A4],
  ['b1', '세 칸 카운트 ★', B1], ['b2', '가운데 상황 띠 ★', B2], ['b3', '주자 크게 ★', B3], ['b4', '미니 ★', B4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || 'a1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">위아래 두 장 · 4 + 추천 4</b>
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
