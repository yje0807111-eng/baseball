/* 감독 모드 스코어보드 — b1(점수 카드 + 카운트·주자·투구 세 칸)을 더 세련되게 다듬은 8안 */
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
const W = 212;
const lead = G.away.runs === G.home.runs ? -1 : (G.away.runs > G.home.runs ? 0 : 1);

const Diamond = ({ size = 68, glow = false }) => (
  <span className="relative grid place-items-center">
    {glow && <i className="pointer-events-none absolute" style={{ width: size, height: size, background: 'radial-gradient(circle, rgba(253,224,71,.12), transparent 65%)' }} />}
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      <path d="M50 88 L86 52 L50 16 L14 52 Z" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
      {[[86, 52], [50, 16], [14, 52]].map(([x, y], i) => (
        <rect key={i} x={x - 8} y={y - 8} width="16" height="16" transform={`rotate(45 ${x} ${y})`}
          fill={G.bases[i] ? '#fde047' : 'rgba(255,255,255,.13)'} style={G.bases[i] ? { filter: 'drop-shadow(0 0 7px #fde047)' } : undefined} />
      ))}
      <rect x="45" y="83" width="10" height="10" transform="rotate(45 50 88)" fill="#fff" />
    </svg>
  </span>
);
const Bso = ({ dot = 11, gap = 5, label = true }) => (
  <div className="grid items-center font-display text-[12px] font-extrabold" style={{ gridTemplateColumns: `${label ? 13 : 0}px repeat(3, ${dot}px)`, gap }}>
    {label ? <span className="text-emerald-400">B</span> : <span />}
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.balls ? '#34d399' : 'rgba(255,255,255,.14)', boxShadow: i < G.balls ? '0 0 7px #34d399' : 'none' }} />)}
    {label ? <span className="text-yellow-300">S</span> : <span />}
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.strikes ? '#fde047' : 'rgba(255,255,255,.14)', boxShadow: i < G.strikes ? '0 0 7px #fde047' : 'none' }} />)}<span />
    {label ? <span className="text-red-400">O</span> : <span />}
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.outs ? '#ef4444' : 'rgba(255,255,255,.14)', boxShadow: i < G.outs ? '0 0 7px #ef4444' : 'none' }} />)}<span />
  </div>
);
const Pitch = ({ cap = '투구', size = 17 }) => (
  <span className="text-center leading-tight">
    <b className="block font-display font-extrabold text-white" style={{ fontSize: size }}>{G.pitches}</b>
    <small className="font-display text-[10px] tracking-[0.12em] text-gray-500">{cap}</small>
  </span>
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
const Glass = ({ children, pad = 'p-2.5', c = '12px' }) => (
  <div className={`mt-cut mt-frame mt-glass ${pad}`} style={{ '--c': c, '--a': '#fde047' }}>{children}</div>
);
const Card = ({ children, style, c = '7px' }) => (
  <div className="mt-cut overflow-hidden" style={{ '--c': c, width: W, background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)', ...style }}>{children}</div>
);
/* 기본 팀 줄 */
const Row = ({ t, mine, h = 36, font = 15, big = 23, opacity = 0.55, border = false, extra = null, scoreBg }) => {
  const f = flagOf(t.name, mine);
  return (
    <div className={`relative flex items-stretch ${border ? 'border-b border-white/[0.09]' : ''}`} style={{ height: h }}>
      <span className="relative flex flex-1 items-center gap-2 overflow-hidden px-2.5">
        <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${f.src})`, opacity, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />
        {extra}
        <span className="relative block h-4 w-1 shrink-0" style={{ background: f.color }} />
        <b className="relative truncate font-extrabold text-white" style={{ fontSize: font, textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{shortOf(t.name, mine)}</b>
      </span>
      <span className="grid w-12 shrink-0 place-items-center border-l border-white/[0.09] font-display font-extrabold"
        style={{ fontSize: big, background: scoreBg || (mine ? 'rgba(253,224,71,.12)' : 'rgba(0,0,0,.3)'), color: mine ? '#fde047' : '#fff' }}>{t.runs}</span>
    </div>
  );
};
const Meta = ({ right = '단판 1차전', bg = 'rgba(255,255,255,.07)' }) => (
  <div className="flex items-center justify-between px-2.5 py-1" style={{ background: bg }}>
    <b className="font-display text-[12px] font-extrabold text-yellow-300">{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></b>
    <span className="font-display text-[10.5px] tracking-[0.16em] text-gray-400">{right}</span>
  </div>
);
const CountCard = ({ dot = 11, size = 68, glow = false, cap = '투구' }) => (
  <Card>
    <div className="flex items-stretch">
      <span className="grid flex-1 place-items-center py-2"><Bso dot={dot} /></span>
      <span className="grid place-items-center border-l border-white/[0.09] px-1.5 py-1"><Diamond size={size} glow={glow} /></span>
      <span className="grid w-12 place-items-center border-l border-white/[0.09]"><Pitch cap={cap} /></span>
    </div>
  </Card>
);

/* 1. 팀 색 실선 — 줄 위에 1px 색선이 지나간다 */
const V1 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-2">
        <Card>
          <Meta />
          {[[G.away, false], [G.home, true]].map(([t, mine], i) => (
            <div key={t.name} className="relative">
              <i className="absolute inset-x-0 top-0 z-10 h-px" style={{ background: `linear-gradient(90deg,${flagOf(t.name, mine).color},transparent 70%)` }} />
              <Row t={t} mine={mine} border={i === 0} />
            </div>
          ))}
        </Card>
        <CountCard />
      </div>
    </Glass>
  )} />
);

/* 2. 점수 칸 그라디언트 — 팀 색이 숫자 뒤로 번진다 */
const V2 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-2">
        <Card>
          <Meta />
          {[[G.away, false], [G.home, true]].map(([t, mine], i) => (
            <Row key={t.name} t={t} mine={mine} border={i === 0} scoreBg={`linear-gradient(180deg,${flagOf(t.name, mine).color}2e,rgba(0,0,0,.34))`} />
          ))}
        </Card>
        <CountCard />
      </div>
    </Glass>
  )} />
);

/* 3. 테두리형 — 배경은 거의 비우고 선으로만 잡는다 */
const V3 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-2">
        <Card style={{ background: 'rgba(5,8,15,.55)', boxShadow: 'inset 0 0 0 1px rgba(253,224,71,.35)' }}>
          <Meta bg="rgba(253,224,71,.1)" />
          <Row t={G.away} border /><Row t={G.home} mine />
        </Card>
        <Card style={{ background: 'rgba(5,8,15,.55)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>
          <div className="flex items-stretch">
            <span className="grid flex-1 place-items-center py-2"><Bso /></span>
            <span className="grid place-items-center border-l border-white/[0.09] px-1.5 py-1"><Diamond /></span>
            <span className="grid w-12 place-items-center border-l border-white/[0.09]"><Pitch /></span>
          </div>
        </Card>
      </div>
    </Glass>
  )} />
);

/* 4. 앞선 쪽 표식 — 작은 삼각과 밝기 차이로 승부를 읽는다 */
const V4 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-2">
        <Card>
          <Meta />
          {[[G.away, false], [G.home, true]].map(([t, mine], i) => (
            <div key={t.name} style={{ opacity: lead === -1 || lead === i ? 1 : 0.68 }}>
              <Row t={t} mine={mine} border={i === 0}
                extra={lead === i ? <b className="relative -ml-0.5 mr-0.5 font-display text-[10px] text-yellow-300">▲</b> : null} />
            </div>
          ))}
        </Card>
        <CountCard />
      </div>
    </Glass>
  )} />
);

/* 5. 단단한 슬레이트 — 카드를 더 어둡게, 선은 더 얇게 */
const V5 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-2">
        <Card style={{ background: 'rgba(8,12,20,.9)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
          <Meta bg="rgba(255,255,255,.05)" />
          <Row t={G.away} border h={38} big={24} opacity={0.62} />
          <Row t={G.home} mine h={38} big={24} opacity={0.62} />
        </Card>
        <Card style={{ background: 'rgba(8,12,20,.9)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
          <div className="flex items-stretch">
            <span className="grid flex-1 place-items-center py-2"><Bso dot={12} /></span>
            <span className="grid place-items-center border-l border-white/[0.09] px-1.5 py-1"><Diamond size={70} glow /></span>
            <span className="grid w-12 place-items-center border-l border-white/[0.09]"><Pitch /></span>
          </div>
        </Card>
      </div>
    </Glass>
  )} />
);

/* 6. 유리판 없이 — 두 카드가 그림자로 떠 있다 */
const V6 = () => (
  <Frame board={(
    <div className="flex flex-col gap-2" style={{ filter: 'drop-shadow(0 12px 26px rgba(0,0,0,.6))' }}>
      <Card c="9px" style={{ background: 'rgba(8,12,20,.92)', boxShadow: 'inset 0 0 0 1px rgba(253,224,71,.3)' }}>
        <Meta bg="rgba(253,224,71,.12)" />
        <Row t={G.away} border /><Row t={G.home} mine />
      </Card>
      <Card c="9px" style={{ background: 'rgba(8,12,20,.92)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>
        <div className="flex items-stretch">
          <span className="grid flex-1 place-items-center py-2"><Bso /></span>
          <span className="grid place-items-center border-l border-white/[0.09] px-1.5 py-1"><Diamond /></span>
          <span className="grid w-12 place-items-center border-l border-white/[0.09]"><Pitch /></span>
        </div>
      </Card>
    </div>
  )} />
);

/* 7. 한 장 통합 — 띠 · 점수 · 세 칸이 한 판 안에서 나뉜다 */
const V7 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass overflow-hidden" style={{ '--c': '11px', '--a': '#fde047', width: W + 16 }}>
      <div className="flex items-center justify-between bg-[#fde047] px-3 py-1 font-display text-[12px] font-extrabold text-[#05080f]">
        <span>{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></span>
        <span className="tracking-[0.16em] opacity-75">단판 1차전</span>
      </div>
      <div style={{ width: '100%' }}><Row t={G.away} border h={38} big={24} /><Row t={G.home} mine h={38} big={24} /></div>
      <div className="flex items-stretch border-t border-white/[0.09]">
        <span className="grid flex-1 place-items-center py-2"><Bso /></span>
        <span className="grid place-items-center border-l border-white/[0.09] px-1.5 py-1"><Diamond /></span>
        <span className="grid w-12 place-items-center border-l border-white/[0.09]"><Pitch /></span>
      </div>
    </div>
  )} />
);

/* 8. 영문 캡션 — 라벨을 작게 깔고 점만 남긴다 */
const V8 = () => (
  <Frame board={(
    <Glass>
      <div className="flex flex-col gap-2">
        <Card>
          <Meta right="GAME 1" />
          <Row t={G.away} border /><Row t={G.home} mine />
        </Card>
        <Card>
          <div className="flex items-stretch">
            <span className="grid flex-1 place-items-center gap-1 py-1.5">
              <small className="font-display text-[9.5px] tracking-[0.22em] text-gray-500">COUNT</small>
              <Bso dot={11} label={false} />
            </span>
            <span className="grid place-items-center border-l border-white/[0.09] px-1.5 py-1"><Diamond size={66} /></span>
            <span className="grid w-12 place-items-center border-l border-white/[0.09]"><Pitch cap="PITCH" /></span>
          </div>
        </Card>
      </div>
    </Glass>
  )} />
);

const V = [['1', '팀 색 실선', V1], ['2', '점수 칸 번짐', V2], ['3', '테두리형', V3], ['4', '앞선 쪽 표식', V4],
  ['5', '단단한 슬레이트', V5], ['6', '판 없이 띄우기', V6], ['7', '한 장 통합', V7], ['8', '영문 캡션', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">스코어보드 세련 · 8안</b>
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
