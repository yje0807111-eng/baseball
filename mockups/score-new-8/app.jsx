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

/* ───────── 완전히 새로 짠 여덟 가지 ───────── */
const A = [G.away, false], H = [G.home, true];
const TEAMS = [A, H];
const col = (t, mine) => flagOf(t.name, mine).color;
const nm = (t, mine) => shortOf(t.name, mine);

/* 1. 방송 로어서드 — 화면 위쪽을 가로로 긋는 한 줄 띠 */
const V1 = () => (
  <Frame board={(
    <div className="mt-cut flex items-stretch overflow-hidden" style={{ '--c': '8px', height: 46, background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }}>
      <span className="grid shrink-0 place-items-center px-3" style={{ background: 'rgba(255,255,255,.5)' }}>
        <b className="font-display text-[19px] font-extrabold leading-none" style={{ color: INK }}><i className="mr-1 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}</b>
      </span>
      {TEAMS.map(([t, mine]) => (
        <React.Fragment key={t.name}>
          <span className="relative flex items-center gap-2 overflow-hidden px-3" style={{ background: col(t, mine), minWidth: 104 }}>
            <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${flagOf(t.name, mine).src})`, opacity: 0.3, WebkitMaskImage: MASK, maskImage: MASK }} />
            <b className="relative text-[16px] font-extrabold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,.55)' }}>{nm(t, mine)}</b>
          </span>
          <span className="grid shrink-0 place-items-center px-3 font-display text-[24px] font-extrabold leading-none" style={{ color: INK, background: 'rgba(255,255,255,.35)' }}>{t.runs}</span>
        </React.Fragment>
      ))}
      <Sep />
      <span className="grid place-items-center px-3"><BsoRow dot={11} /></span>
      <Sep />
      <span className="grid place-items-center px-2.5"><Diamond size={40} /></span>
      <span className="grid shrink-0 place-items-center px-3" style={{ background: 'rgba(0,0,0,.06)' }}><Pitch size={14} /></span>
    </div>
  )} />
);

/* 2. 세로 타워 — 좁은 기둥 하나에 위에서 아래로 */
const V2 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden" style={{ '--c': '10px', width: 124, background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }}>
      <div className="grid place-items-center py-1" style={{ background: 'rgba(255,255,255,.5)' }}>
        <b className="font-display text-[20px] font-extrabold leading-none" style={{ color: INK }}><i className="mr-1 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}</b>
      </div>
      {TEAMS.map(([t, mine]) => (
        <div key={t.name} className="relative flex items-center overflow-hidden border-t border-black/20" style={{ height: 38 }}>
          <span className="relative flex flex-1 items-center justify-center overflow-hidden" style={{ background: col(t, mine), height: '100%' }}>
            <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${flagOf(t.name, mine).src})`, opacity: 0.32, WebkitMaskImage: MASK, maskImage: MASK }} />
            <b className="relative text-[16px] font-extrabold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,.55)' }}>{nm(t, mine)}</b>
          </span>
          <span className="grid w-11 shrink-0 place-items-center border-l border-black/20 font-display text-[24px] font-extrabold leading-none" style={{ color: INK }}>{t.runs}</span>
        </div>
      ))}
      <div className="grid place-items-center gap-1 border-t border-black/20 py-2">
        <Bso dot={12} font={12} />
        <Diamond size={58} note={G.pitches} />
      </div>
    </div>
  )} />
);

/* 3. 밝은 점수 + 어두운 상황 칩 — 대비로 역할을 나눈다 */
const V3 = () => (
  <Frame board={(
    <div className="flex items-stretch gap-1.5">
      <div className="mt-cut flex items-stretch overflow-hidden" style={{ '--c': '10px', background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }}>
        <InnCol />
        <Teams w={158} />
      </div>
      <div className="mt-cut flex items-stretch overflow-hidden" style={{ '--c': '10px', background: 'rgba(12,17,26,.92)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)' }}>
        <span className="grid place-items-center px-3"><Bso dot={13} off="rgba(255,255,255,.16)" lab="rgba(255,255,255,.75)" /></span>
        <span className="w-px bg-white/15" />
        <span className="grid place-items-center px-2"><Diamond size={66} note={G.pitches} off="rgba(255,255,255,.16)" ink="rgba(255,255,255,.8)" /></span>
      </div>
    </div>
  )} />
);

/* 4. 주루를 가운데 크게 — 그 둘레로 점수와 카운트 */
const V4 = () => (
  <Frame board={(
    <div className="mt-cut flex items-stretch overflow-hidden" style={{ '--c': '12px', background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }}>
      <span className="flex flex-col justify-center" style={{ width: 126 }}>
        {TEAMS.map(([t, mine], i) => (
          <span key={t.name} className={`relative flex items-center gap-2 overflow-hidden px-2.5 ${i === 0 ? 'border-b border-black/15' : ''}`} style={{ height: 43 }}>
            <span className="block h-5 w-1.5 shrink-0" style={{ background: col(t, mine) }} />
            <b className="text-[15px] font-extrabold" style={{ color: INK }}>{nm(t, mine)}</b>
            <b className="ml-auto font-display text-[26px] font-extrabold leading-none" style={{ color: INK }}>{t.runs}</b>
          </span>
        ))}
      </span>
      <Sep />
      <span className="grid place-items-center px-2"><Diamond size={84} note={G.pitches} /></span>
      <Sep />
      <span className="grid place-items-center px-3" style={{ background: 'rgba(255,255,255,.3)' }}>
        <span className="grid place-items-center gap-1.5">
          <b className="font-display text-[17px] font-extrabold leading-none" style={{ color: INK }}><i className="mr-0.5 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}</b>
          <Bso dot={11} font={11} />
        </span>
      </span>
    </div>
  )} />
);

/* 5. 숫자가 주인공 — 점수를 크게, 나머지는 아주 작게 */
const V5 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden" style={{ '--c': '12px', width: 250, background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }}>
      <div className="flex items-stretch">
        {TEAMS.map(([t, mine], i) => (
          <span key={t.name} className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ${i === 0 ? 'border-r border-black/20' : ''}`}>
            <span className="flex items-center gap-1.5">
              <span className="block h-3 w-1.5" style={{ background: col(t, mine) }} />
              <b className="text-[13px] font-extrabold" style={{ color: 'rgba(11,18,32,.75)' }}>{nm(t, mine)}</b>
            </span>
            <b className="font-display text-[40px] font-extrabold leading-none" style={{ color: INK }}>{t.runs}</b>
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-black/20 px-3 py-1" style={{ background: 'rgba(255,255,255,.34)' }}>
        <b className="font-display text-[14px] font-extrabold leading-none" style={{ color: INK }}><i className="mr-1 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}</b>
        <BsoRow dot={10} />
        <span className="flex items-center gap-1.5"><Diamond size={34} /><Pitch size={12} /></span>
      </div>
    </div>
  )} />
);

/* 6. 팀 색이 판을 반씩 — 글씨는 그 위에 흰색으로 */
const V6 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden" style={{ '--c': '12px', width: 244, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.35)' }}>
      {TEAMS.map(([t, mine]) => (
        <div key={t.name} className="relative flex items-center gap-3 overflow-hidden px-3" style={{ height: 46, background: col(t, mine) }}>
          <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${flagOf(t.name, mine).src})`, opacity: 0.32, WebkitMaskImage: MASK, maskImage: MASK }} />
          <i className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(0,0,0,.18),transparent 45%)' }} />
          <b className="relative text-[18px] font-extrabold text-white" style={{ textShadow: '0 1px 5px rgba(0,0,0,.6)' }}>{nm(t, mine)}</b>
          <b className="relative ml-auto font-display text-[30px] font-extrabold leading-none text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,.6)' }}>{t.runs}</b>
        </div>
      ))}
      <div className="flex items-stretch" style={{ background: PAPER }}>
        <span className="grid shrink-0 place-items-center px-3" style={{ background: 'rgba(255,255,255,.45)' }}>
          <b className="font-display text-[18px] font-extrabold leading-none" style={{ color: INK }}><i className="mr-0.5 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}</b>
        </span>
        <Sep />
        <span className="grid flex-1 place-items-center py-1"><Bso dot={12} font={12} /></span>
        <Sep />
        <span className="grid place-items-center px-2"><Diamond size={58} note={G.pitches} /></span>
      </div>
    </div>
  )} />
);

/* 7. 게임 판과 같은 결 — 사선 컷과 얇은 테두리로 화면에 녹인다 */
const V7 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame overflow-hidden" style={{ '--c': '14px', '--a': '#fde047', width: 252, background: 'rgba(214,220,229,.94)' }}>
      <div className="flex items-center justify-between px-3 py-1" style={{ background: 'linear-gradient(90deg,rgba(253,224,71,.55),rgba(253,224,71,.12))' }}>
        <b className="font-display text-[14px] font-extrabold leading-none" style={{ color: INK }}><i className="mr-1 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}</b>
        <span className="font-display text-[10.5px] tracking-[0.2em]" style={{ color: 'rgba(11,18,32,.6)' }}>SCORE</span>
      </div>
      <Teams w={252} h={40} font={18} score={52} big={27} />
      <div className="flex items-stretch border-t border-black/20">
        <span className="grid flex-1 place-items-center py-1"><Bso dot={13} /></span>
        <Sep />
        <span className="grid place-items-center px-2"><Diamond size={62} note={G.pitches} /></span>
      </div>
    </div>
  )} />
);

/* 8. 판 없이 — 글자와 점만 화면 위에 얹는다 */
const V8 = () => {
  const sh = { textShadow: '0 2px 8px rgba(0,0,0,.95), 0 0 2px rgba(0,0,0,.8)' };
  return (
    <Frame board={(
      <div className="flex flex-col gap-1.5 pl-0.5">
        <span className="flex items-center gap-2">
          <b className="font-display text-[17px] font-extrabold leading-none text-[#fca5a5]" style={sh}>{G.top ? '▲' : '▼'}{G.inning}</b>
          <span className="h-4 w-px bg-white/25" />
          <span className="flex items-center gap-2">
            {TEAMS.map(([t, mine]) => (
              <span key={t.name} className="flex items-center gap-1.5">
                <span className="block h-4 w-1" style={{ background: col(t, mine) }} />
                <b className="text-[16px] font-extrabold text-white" style={sh}>{nm(t, mine)}</b>
                <b className="font-display text-[24px] font-extrabold leading-none text-white" style={sh}>{t.runs}</b>
              </span>
            ))}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <BsoRow dot={11} ink="rgba(255,255,255,.9)" />
          <Diamond size={40} off="rgba(255,255,255,.22)" />
          <b className="font-display text-[12px] font-extrabold text-white/80" style={sh}>{G.pitches}P</b>
        </span>
      </div>
    )} />
  );
};

const V = [['1', '로어서드 한 줄', V1], ['2', '세로 타워', V2], ['3', '밝은 점수 + 어두운 상황', V3], ['4', '주루 가운데 크게', V4],
  ['5', '숫자가 주인공', V5], ['6', '팀 색이 판을 반씩', V6], ['7', '게임 판과 같은 결', V7], ['8', '판 없이 얹기', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">새 스코어보드 · 8안</b>
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
