/* 감독 모드 스코어보드 — 점수 카드와 카운트 카드를 한 판으로 합치는 A 8안 + 추천 B 8안 */
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
const MASK = 'linear-gradient(90deg,transparent 8%,#000 88%)';
const PAPER = 'rgba(199,206,217,.95)';
const INK = '#0b1220';
const MODES = ['보통', '자동', '스킵'];

const Diamond = ({ size = 72, note = null, off = 'rgba(0,0,0,.16)', ink = 'rgba(11,18,32,.72)' }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    {[[74, 55], [50, 31], [26, 55]].map(([x, y], i) => (
      <rect key={i} x={x - 13} y={y - 13} width="26" height="26" rx="3" transform={`rotate(45 ${x} ${y})`} fill={G.bases[i] ? '#f97316' : off} />
    ))}
    {note != null && <text x="50" y="94" textAnchor="middle" fontFamily="'Saira Condensed', sans-serif" fontSize="20" fontWeight="800" fill={ink}>{note}</text>}
  </svg>
);
const Bso = ({ dot = 15, gap = 4, rowGap = 5, font = 14, off = 'rgba(0,0,0,.16)', lab = 'rgba(11,18,32,.7)' }) => (
  <div className="grid items-center font-display font-extrabold" style={{ gridTemplateColumns: `${font + 2}px repeat(3, ${dot}px)`, gap, rowGap, fontSize: font, color: lab }}>
    <span className="flex items-center justify-center leading-none" style={{ height: dot }}>B</span>
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.balls ? '#16a34a' : off }} />)}
    <span className="flex items-center justify-center leading-none" style={{ height: dot }}>S</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.strikes ? '#eab308' : off }} />)}<span />
    <span className="flex items-center justify-center leading-none" style={{ height: dot }}>O</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.outs ? '#dc2626' : off }} />)}<span />
  </div>
);
/* 가로 한 줄 볼카운트 */
const BsoRow = ({ dot = 12, ink = 'rgba(11,18,32,.7)' }) => (
  <div className="flex items-center gap-3 font-display text-[13px] font-extrabold" style={{ color: ink }}>
    {[['B', G.balls, 3, '#16a34a'], ['S', G.strikes, 2, '#eab308'], ['O', G.outs, 2, '#dc2626']].map(([k, v, n, c]) => (
      <span key={k} className="flex items-center gap-1.5">{k}
        {Array.from({ length: n }, (_, i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < v ? c : 'rgba(0,0,0,.16)' }} />)}
      </span>
    ))}
  </div>
);
const Inn = ({ size = 24, arrow = 11, ink = INK }) => (
  <b className="text-center font-display font-extrabold leading-none" style={{ fontSize: size, color: ink }}>
    <i className="mb-0.5 block leading-none not-italic text-[#dc2626]" style={{ fontSize: arrow }}>{G.top ? '▲' : '▼'}</i>{G.inning}
  </b>
);
/* 팀 두 줄 — 지금 화면 그대로 */
const Teams = ({ w = 150, h = 37, font = 19, score = 48, big = 26, line = true }) => (
  <span className="relative block" style={{ width: w }}>
    {[[G.away, false], [G.home, true]].map(([t, mine]) => {
      const f = flagOf(t.name, mine);
      return (
        <div key={t.name} className="relative flex items-stretch" style={{ height: h }}>
          <span className="relative flex flex-1 items-center justify-center overflow-hidden px-2" style={{ background: f.color }}>
            <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${f.src})`, opacity: 0.35, WebkitMaskImage: MASK, maskImage: MASK }} />
            <b className="relative truncate font-extrabold text-white" style={{ fontSize: font, textShadow: '0 1px 4px rgba(0,0,0,.55)' }}>{shortOf(t.name, mine)}</b>
          </span>
          <span className="grid shrink-0 place-items-center border-l border-black/20 font-display font-extrabold leading-none"
            style={{ width: score, fontSize: big, color: INK }}>{t.runs}</span>
        </div>
      );
    })}
    {line && <i className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: 'linear-gradient(90deg,rgba(255,255,255,.4),rgba(255,255,255,.18) 58%,rgba(0,0,0,.22))' }} />}
  </span>
);
const Card = ({ children, style, c = '10px' }) => (
  <div className="mt-cut flex items-stretch overflow-hidden" style={{ '--c': c, background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)', ...style }}>{children}</div>
);
const InnCol = ({ w = 40, bg = 'rgba(255,255,255,.5)' }) => (
  <span className="grid shrink-0 place-items-center border-r border-black/15" style={{ width: w, background: bg }}><Inn /></span>
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
  <div className="relative overflow-hidden" style={{ width: 1880, height: 460, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', backgroundPosition: 'center 58%', opacity: 0.95 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.7) 0,rgba(3,5,10,.12) 26%,rgba(3,5,10,.1) 76%,rgba(3,5,10,.7) 100%), linear-gradient(180deg,rgba(3,5,10,.8) 0,rgba(3,5,10,0) 26%)' }} />
    <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: '63px auto 1fr' }}>
      <Head />
      <div className="col-start-1 row-start-2 self-start">
        <div className="w-max" style={{ filter: 'drop-shadow(0 12px 26px rgba(0,0,0,.55))' }}>{board}</div>
      </div>
    </div>
  </div>
);
const Sep = () => <span className="w-px shrink-0 bg-black/20" />;

/* ───────── A. 한 판으로 합치는 여덟 가지 ───────── */

/* A1. 네 칸 — 회 · 팀 · 카운트 · 주루를 선으로 나눈다 */
const A1 = () => (
  <Frame board={(
    <Card>
      <InnCol />
      <Teams />
      <Sep />
      <span className="grid place-items-center" style={{ width: 92 }}><Bso /></span>
      <Sep />
      <span className="grid place-items-center" style={{ width: 92 }}><Diamond note={G.pitches} /></span>
    </Card>
  )} />
);

/* A2. 선 없이 — 여백으로만 나눈다 */
const A2 = () => (
  <Frame board={(
    <Card>
      <InnCol bg="rgba(255,255,255,.42)" />
      <Teams />
      <span className="grid place-items-center pl-3" style={{ width: 96 }}><Bso /></span>
      <span className="grid place-items-center pr-1" style={{ width: 92 }}><Diamond note={G.pitches} /></span>
    </Card>
  )} />
);

/* A3. 오른쪽 두 칸만 살짝 어둡게 — 역할이 갈린다 */
const A3 = () => (
  <Frame board={(
    <Card>
      <InnCol />
      <Teams />
      <span className="flex items-stretch" style={{ background: 'rgba(0,0,0,.07)' }}>
        <span className="grid place-items-center" style={{ width: 92 }}><Bso /></span>
        <Sep />
        <span className="grid place-items-center" style={{ width: 92 }}><Diamond note={G.pitches} /></span>
      </span>
    </Card>
  )} />
);

/* A4. 위아래 두 단 — 위는 팀, 아래 띠에 카운트와 주루 */
const A4 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden" style={{ '--c': '10px', background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }}>
      <div className="flex items-stretch"><InnCol /><Teams w={190} /></div>
      <div className="flex items-center justify-between border-t border-black/20 px-3 py-1">
        <BsoRow />
        <span className="flex items-center gap-2"><Diamond size={44} /><b className="font-display text-[13px] font-extrabold" style={{ color: 'rgba(11,18,32,.7)' }}>{G.pitches}<small className="ml-0.5 font-normal">P</small></b></span>
      </div>
    </div>
  )} />
);

/* A5. 카운트를 세로 한 줄로 좁게 */
const A5 = () => (
  <Frame board={(
    <Card>
      <InnCol />
      <Teams />
      <Sep />
      <span className="grid place-items-center px-2.5">
        <div className="flex flex-col gap-1.5">
          {[[G.balls, 3, '#16a34a'], [G.strikes, 2, '#eab308'], [G.outs, 2, '#dc2626']].map(([v, n, c], r) => (
            <span key={r} className="flex gap-1">{Array.from({ length: n }, (_, i) => <i key={i} className="rounded-full" style={{ width: 11, height: 11, background: i < v ? c : 'rgba(0,0,0,.16)' }} />)}</span>
          ))}
        </div>
      </span>
      <Sep />
      <span className="grid place-items-center" style={{ width: 92 }}><Diamond note={G.pitches} /></span>
    </Card>
  )} />
);

/* A6. 주루를 회 옆으로 — 왼쪽에 상황, 오른쪽에 점수 */
const A6 = () => (
  <Frame board={(
    <Card>
      <InnCol />
      <span className="grid place-items-center" style={{ width: 92 }}><Diamond note={G.pitches} /></span>
      <Sep />
      <span className="grid place-items-center" style={{ width: 92 }}><Bso /></span>
      <Sep />
      <Teams />
    </Card>
  )} />
);

/* A7. 세로로 쌓기 — 팀이 위, 카운트가 아래 */
const A7 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden" style={{ '--c': '10px', background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }}>
      <div className="flex items-stretch"><InnCol /><Teams w={200} /></div>
      <div className="flex items-stretch border-t border-black/20">
        <span className="grid flex-1 place-items-center py-1"><Bso dot={13} /></span>
        <Sep />
        <span className="grid place-items-center" style={{ width: 96 }}><Diamond size={66} note={G.pitches} /></span>
      </div>
    </div>
  )} />
);

/* A8. 회를 오른쪽 끝으로 */
const A8 = () => (
  <Frame board={(
    <Card>
      <Teams />
      <Sep />
      <span className="grid place-items-center" style={{ width: 92 }}><Bso /></span>
      <Sep />
      <span className="grid place-items-center" style={{ width: 92 }}><Diamond note={G.pitches} /></span>
      <span className="grid shrink-0 place-items-center border-l border-black/15" style={{ width: 40, background: 'rgba(255,255,255,.5)' }}><Inn /></span>
    </Card>
  )} />
);

/* ───────── B. 추천 여덟 가지 ───────── */

/* B1. 회 · 투구를 위 띠로 올리고 아래는 팀 · 카운트 · 주루 */
const B1 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden" style={{ '--c': '10px', background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }}>
      <div className="flex items-center justify-between px-3 py-0.5" style={{ background: 'rgba(255,255,255,.5)' }}>
        <b className="font-display text-[14px] font-extrabold" style={{ color: INK }}>
          <i className="mr-1 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}
        </b>
        <span className="font-display text-[11px] tracking-[0.14em]" style={{ color: 'rgba(11,18,32,.55)' }}>투구 <b style={{ color: INK }}>{G.pitches}</b></span>
      </div>
      <div className="flex items-stretch">
        <Teams w={158} />
        <Sep />
        <span className="grid place-items-center" style={{ width: 92 }}><Bso /></span>
        <Sep />
        <span className="grid place-items-center" style={{ width: 86 }}><Diamond size={66} /></span>
      </div>
    </div>
  )} />
);

/* B2. 왼쪽 가장자리에 두 팀 색 띠 — 회는 그 위 */
const B2 = () => (
  <Frame board={(
    <Card>
      <span className="w-1.5 shrink-0" style={{ background: `linear-gradient(180deg,${flagOf(G.away.name).color} 50%,${MY.color} 50%)` }} />
      <InnCol w={38} bg="transparent" />
      <Teams />
      <Sep />
      <span className="grid place-items-center" style={{ width: 92 }}><Bso /></span>
      <Sep />
      <span className="grid place-items-center" style={{ width: 92 }}><Diamond note={G.pitches} /></span>
    </Card>
  )} />
);

/* B3. 카운트를 팀 줄 오른쪽에 한 줄씩 — 높이를 나눠 쓴다 */
const B3 = () => (
  <Frame board={(
    <Card>
      <InnCol />
      <Teams />
      <Sep />
      <span className="flex flex-col justify-center gap-1.5 px-3">
        <BsoRow dot={11} />
        <span className="h-px" style={{ background: 'rgba(0,0,0,.14)' }} />
        <span className="flex items-center justify-between font-display text-[12px] font-extrabold" style={{ color: 'rgba(11,18,32,.6)' }}>
          <span>투구</span><b style={{ color: INK }}>{G.pitches}</b>
        </span>
      </span>
      <Sep />
      <span className="grid place-items-center" style={{ width: 86 }}><Diamond size={66} /></span>
    </Card>
  )} />
);

/* B4. 어두운 판 — 밝은 글씨로 뒤집는다 */
const B4 = () => (
  <Frame board={(
    <div className="mt-cut flex items-stretch overflow-hidden" style={{ '--c': '10px', background: 'rgba(12,17,26,.94)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)' }}>
      <span className="grid shrink-0 place-items-center border-r border-white/15" style={{ width: 40, background: 'rgba(255,255,255,.08)' }}><Inn ink="#fff" /></span>
      <span className="relative block" style={{ width: 150 }}>
        {[[G.away, false], [G.home, true]].map(([t, mine]) => {
          const f = flagOf(t.name, mine);
          return (
            <div key={t.name} className="relative flex items-stretch" style={{ height: 37 }}>
              <span className="relative flex flex-1 items-center justify-center overflow-hidden px-2" style={{ background: f.color }}>
                <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${f.src})`, opacity: 0.35, WebkitMaskImage: MASK, maskImage: MASK }} />
                <b className="relative truncate text-[19px] font-extrabold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,.55)' }}>{shortOf(t.name, mine)}</b>
              </span>
              <span className="grid w-12 shrink-0 place-items-center border-l border-white/15 font-display text-[26px] font-extrabold leading-none text-white">{t.runs}</span>
            </div>
          );
        })}
        <i className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: 'linear-gradient(90deg,rgba(255,255,255,.4),rgba(255,255,255,.14))' }} />
      </span>
      <span className="w-px shrink-0 bg-white/15" />
      <span className="grid place-items-center" style={{ width: 92 }}><Bso off="rgba(255,255,255,.16)" lab="rgba(255,255,255,.75)" /></span>
      <span className="w-px shrink-0 bg-white/15" />
      <span className="grid place-items-center" style={{ width: 92 }}><Diamond note={G.pitches} off="rgba(255,255,255,.16)" ink="rgba(255,255,255,.8)" /></span>
    </div>
  )} />
);

/* B5. 점수를 가장 크게 — 카운트는 작게 곁들인다 */
const B5 = () => (
  <Frame board={(
    <Card>
      <InnCol />
      <Teams w={168} h={42} font={20} score={56} big={30} />
      <Sep />
      <span className="grid place-items-center" style={{ width: 78 }}><Bso dot={11} font={12} /></span>
      <Sep />
      <span className="grid place-items-center" style={{ width: 82 }}><Diamond size={62} note={G.pitches} /></span>
    </Card>
  )} />
);

/* B6. 주루를 가운데로 — 양쪽에 점수와 카운트 */
const B6 = () => (
  <Frame board={(
    <Card>
      <InnCol />
      <Teams />
      <Sep />
      <span className="grid place-items-center" style={{ width: 96 }}><Diamond note={G.pitches} /></span>
      <Sep />
      <span className="grid place-items-center" style={{ width: 92 }}><Bso /></span>
    </Card>
  )} />
);

/* B7. 칸마다 바탕 톤을 아주 조금씩 달리한다 */
const B7 = () => (
  <Frame board={(
    <Card>
      <InnCol />
      <Teams />
      <span className="grid place-items-center" style={{ width: 92, background: 'rgba(255,255,255,.28)' }}><Bso /></span>
      <span className="grid place-items-center" style={{ width: 92, background: 'rgba(0,0,0,.05)' }}><Diamond note={G.pitches} /></span>
    </Card>
  )} />
);

/* B8. 한 줄로 아주 낮게 — 팀은 한 칸에 둘 다 */
const B8 = () => (
  <Frame board={(
    <Card>
      <span className="grid shrink-0 place-items-center border-r border-black/15 px-2.5" style={{ background: 'rgba(255,255,255,.5)' }}>
        <b className="font-display text-[20px] font-extrabold leading-none" style={{ color: INK }}><i className="mr-1 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}</b>
      </span>
      <span className="flex items-center gap-2 px-3">
        {[[G.away, false], [G.home, true]].map(([t, mine]) => {
          const f = flagOf(t.name, mine);
          return (
            <span key={t.name} className="flex items-center gap-1.5">
              <span className="block h-4 w-1.5" style={{ background: f.color }} />
              <b className="text-[15px] font-extrabold" style={{ color: INK }}>{shortOf(t.name, mine)}</b>
              <b className="font-display text-[22px] font-extrabold leading-none" style={{ color: INK }}>{t.runs}</b>
            </span>
          );
        })}
      </span>
      <Sep />
      <span className="grid place-items-center px-3"><BsoRow /></span>
      <Sep />
      <span className="grid place-items-center px-2"><Diamond size={52} note={G.pitches} /></span>
    </Card>
  )} />
);

const V = [['a1', '네 칸', A1], ['a2', '선 없이', A2], ['a3', '오른쪽만 어둡게', A3], ['a4', '아래 띠', A4],
  ['a5', '세로 카운트', A5], ['a6', '상황이 왼쪽', A6], ['a7', '두 단', A7], ['a8', '회가 오른쪽', A8],
  ['b1', '위 띠에 회 · 투구 ★', B1], ['b2', '팀 색 가장자리 ★', B2], ['b3', '카운트 두 줄 ★', B3], ['b4', '어두운 판 ★', B4],
  ['b5', '점수 크게 ★', B5], ['b6', '주루 가운데 ★', B6], ['b7', '칸마다 톤 ★', B7], ['b8', '한 줄 ★', B8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || 'a1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-gray-400">
        <b className="mr-1 text-[15px] text-white">스코어보드 합치기 16안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? '#10b981' : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      <Cur />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
