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

/* 두 단짜리 판 — 위는 회 · 팀 · 점수, 아래는 볼카운트 · 주루 */
const Two = ({ children, w = 240 }) => (
  <div className="mt-cut overflow-hidden" style={{ '--c': '10px', width: w, background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }}>
    {children}
  </div>
);
const Pitch = ({ ink = 'rgba(11,18,32,.7)', size = 13 }) => (
  <b className="font-display font-extrabold" style={{ fontSize: size, color: ink }}>{G.pitches}<small className="ml-0.5 font-normal opacity-70">P</small></b>
);

/* 6번(팀 색이 판을 반씩)에서 이름 칸을 어떻게 채울지 여섯 가지 */
const SIDE = [[G.away, false, { hits: 5, errors: 0, pitcher: '로드리게스', batter: '레이예스', record: '3승 2패', ovr: 79 }],
  [G.home, true, { hits: 4, errors: 1, pitcher: '윤학길', batter: '장두성', record: '2승 3패', ovr: 77 }]];
const col = (t, mine) => flagOf(t.name, mine).color;
const fullName = (t, mine) => (mine ? t.name.replace(/^나의\s*/, '') : t.name.replace(/^\d{4}\s*/, ''));

/* 팀 줄 한 개 — mid 에 넣을 것만 안마다 다르다 */
const TeamBar = ({ t, mine, mid = null, name = null, h = 46, font = 18 }) => {
  const f = flagOf(t.name, mine);
  return (
    <div className="relative flex items-center gap-3 overflow-hidden px-3" style={{ height: h, background: col(t, mine) }}>
      <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${f.src})`, opacity: 0.32, WebkitMaskImage: MASK, maskImage: MASK }} />
      <i className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(0,0,0,.18),transparent 45%)' }} />
      <b className="relative truncate font-extrabold text-white" style={{ fontSize: font, textShadow: '0 1px 5px rgba(0,0,0,.6)' }}>{name ?? shortOf(t.name, mine)}</b>
      {mid}
      <b className="relative ml-auto font-display text-[30px] font-extrabold leading-none text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,.6)' }}>{t.runs}</b>
    </div>
  );
};
const Bottom = () => (
  <div className="flex items-stretch" style={{ background: PAPER }}>
    <span className="grid shrink-0 place-items-center px-3" style={{ background: 'rgba(255,255,255,.45)' }}>
      <b className="font-display text-[18px] font-extrabold leading-none" style={{ color: INK }}><i className="mr-0.5 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}</b>
    </span>
    <Sep />
    <span className="grid flex-1 place-items-center py-1"><Bso dot={12} font={12} /></span>
    <Sep />
    <span className="grid place-items-center px-2"><Diamond size={58} note={G.pitches} /></span>
  </div>
);
const Board = ({ w = 244, rows }) => (
  <div className="mt-cut overflow-hidden" style={{ '--c': '12px', width: w, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.35)' }}>
    {rows}<Bottom />
  </div>
);

/* 1. 전체 이름 — 구단 이름을 그대로 */
const V1 = () => (
  <Frame board={(
    <Board w={276} rows={SIDE.map(([t, mine]) => <TeamBar key={t.name} t={t} mine={mine} name={fullName(t, mine)} font={17} />)} />
  )} />
);

/* 2. 공격 중 표시 — 지금 치는 팀에 작은 배트 */
const V2 = () => (
  <Frame board={(
    <Board rows={SIDE.map(([t, mine]) => (
      <TeamBar key={t.name} t={t} mine={mine}
        mid={(G.top ? !mine : mine) ? <span className="relative font-display text-[12px] font-extrabold tracking-[0.18em] text-white/85">AT BAT</span> : null} />
    ))} />
  )} />
);

/* 3. 안타 · 실책 — 중계 전광판의 H · E */
const V3 = () => (
  <Frame board={(
    <Board w={268} rows={SIDE.map(([t, mine, s]) => (
      <TeamBar key={t.name} t={t} mine={mine}
        mid={(
          <span className="relative ml-auto flex items-center gap-2.5 font-display text-[12px] font-extrabold text-white/85">
            <span>H <b className="text-[15px] text-white">{s.hits}</b></span>
            <span>E <b className="text-[15px] text-white">{s.errors}</b></span>
          </span>
        )} />
    ))} />
  )} />
);

/* 4. 지금 나와 있는 선수 — 위는 투수, 아래는 타자 */
const V4 = () => (
  <Frame board={(
    <Board w={286} rows={SIDE.map(([t, mine, s]) => (
      <TeamBar key={t.name} t={t} mine={mine} h={48}
        mid={(
          <span className="relative ml-auto mr-1 flex items-center gap-1.5 text-white/85">
            <small className="font-display text-[10px] tracking-[0.16em]">{(G.top ? !mine : mine) ? 'BAT' : 'P'}</small>
            <b className="text-[13.5px] text-white">{(G.top ? !mine : mine) ? s.batter : s.pitcher}</b>
          </span>
        )} />
    ))} />
  )} />
);

/* 5. 시리즈 전적 — 몇 승 몇 패로 왔는지 */
const V5 = () => (
  <Frame board={(
    <Board w={262} rows={SIDE.map(([t, mine, s]) => (
      <TeamBar key={t.name} t={t} mine={mine}
        mid={<span className="relative ml-auto mr-1 font-display text-[12.5px] font-extrabold text-white/85">{s.record}</span>} />
    ))} />
  )} />
);

/* 6. 팀 종합 — 전력 차이가 한눈에 */
const V6 = () => (
  <Frame board={(
    <Board rows={SIDE.map(([t, mine, s]) => (
      <TeamBar key={t.name} t={t} mine={mine}
        mid={(
          <span className="relative ml-auto mr-1 flex items-baseline gap-1 text-white/85">
            <small className="font-display text-[10px] tracking-[0.16em]">OVR</small>
            <b className="font-display text-[16px] font-extrabold text-white">{s.ovr}</b>
          </span>
        )} />
    ))} />
  )} />
);

const V = [['1', '전체 이름', V1], ['2', '공격 중 표시', V2], ['3', '안타 · 실책', V3], ['4', '나와 있는 선수', V4],
  ['5', '시리즈 전적', V5], ['6', '팀 종합', V6]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">이름 칸을 무엇으로 채울까 · 6안</b>
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
