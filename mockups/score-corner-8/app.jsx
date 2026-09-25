/* 감독 모드 — 중계처럼 왼쪽 위에 붙는 스코어보드 8안 (이닝 · 점수 · 볼카운트 · 주자) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';

const G = {
  away: { name: '2026 롯데 자이언츠', short: '롯데', runs: 3, hits: 5, errors: 0, color: '#60a5fa' },
  home: { name: '나의 드림팀', short: '드림팀', runs: 2, hits: 4, errors: 1, color: '#10b981' },
  inning: 5, top: true, balls: 2, strikes: 1, outs: 1, bases: [true, false, true], pitches: 57,
  note: '레이예스 오늘 3타수 2안타 · 윤학길 상대 통산 .340',
};
const MODES = ['보통', '자동', '스킵'];
const HEX = 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)';

/* 경기 화면에 이미 있는 부품 그대로 */
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
const Bso = () => (
  <div className="grid grid-cols-[16px_repeat(3,14px)] items-center gap-1.5 font-display text-[13px] font-extrabold">
    <span className="text-emerald-400">B</span>
    {[0, 1, 2].map((i) => <i key={i} className={`h-3.5 w-3.5 rounded-full ${i < G.balls ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/15'}`} />)}
    <span className="text-yellow-300">S</span>
    {[0, 1].map((i) => <i key={i} className={`h-3.5 w-3.5 rounded-full ${i < G.strikes ? 'bg-yellow-300 shadow-[0_0_8px_#fde047]' : 'bg-white/15'}`} />)}<span />
    <span className="text-red-400">O</span>
    {[0, 1].map((i) => <i key={i} className={`h-3.5 w-3.5 rounded-full ${i < G.outs ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-white/15'}`} />)}<span />
  </div>
);
/* 점 한 줄 — 좁은 자리에 B · S · O를 나란히 */
const DotRow = () => (
  <div className="flex items-center gap-2.5 font-display text-[11px] font-extrabold">
    <span className="flex items-center gap-1"><b className="text-emerald-400">B</b>{[0, 1, 2].map((i) => <i key={i} className={`h-2 w-2 rounded-full ${i < G.balls ? 'bg-emerald-400' : 'bg-white/15'}`} />)}</span>
    <span className="flex items-center gap-1"><b className="text-yellow-300">S</b>{[0, 1].map((i) => <i key={i} className={`h-2 w-2 rounded-full ${i < G.strikes ? 'bg-yellow-300' : 'bg-white/15'}`} />)}</span>
    <span className="flex items-center gap-1"><b className="text-red-400">O</b>{[0, 1].map((i) => <i key={i} className={`h-2 w-2 rounded-full ${i < G.outs ? 'bg-red-500' : 'bg-white/15'}`} />)}</span>
  </div>
);
const Inn = ({ size = 15 }) => (
  <span className="font-display font-extrabold leading-none text-yellow-300" style={{ fontSize: size }}>
    {G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i>
  </span>
);
/* 두 줄 팀 — 색 배지 + 이름 + 점수 (중계 스코어보드의 기본형) */
const Rows = ({ short = false, w = 132, big = 20 }) => (
  <div className="flex flex-col gap-1">
    {[G.away, G.home].map((t, i) => (
      <div key={t.name} className="flex items-center gap-2">
        <span className="block h-5 w-1.5 shrink-0" style={{ background: t.color }} />
        <b className="truncate text-[13px] font-extrabold text-white" style={{ width: w }}>{short ? t.short : t.name}</b>
        <b className="ml-auto font-display font-extrabold leading-none" style={{ fontSize: big, color: i === 0 ? '#fff' : '#fde047' }}>{t.runs}</b>
      </div>
    ))}
  </div>
);
const Note = () => <p className="m-0 truncate px-3 py-1 text-[11.5px] text-gray-300">{G.note}</p>;

/* ── 화면 틀: 머리글(칩 없음) · 왼쪽 위 스코어보드 · 가운데 이닝표 ── */
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
const Line = () => (
  <table className="mt-cut mt-glass w-full border-collapse text-center font-display" style={{ '--c': '12px' }}>
    <thead><tr className="text-xs font-semibold text-gray-500"><th className="w-[200px] py-1 pl-4 text-left">TEAM</th>{Array.from({ length: 12 }, (_, i) => <th key={i} className="py-1">{i + 1}</th>)}<th>R</th><th>H</th><th>E</th></tr></thead>
    <tbody>
      {[G.away, G.home].map((t, r) => (
        <tr key={t.name} className="border-t border-white/[0.07]">
          <td className="w-[200px] py-1 pl-4 text-left text-[15px] font-extrabold text-white">{t.name}</td>
          {Array.from({ length: 12 }, (_, i) => <td key={i} className={`py-1 text-[22px] text-gray-300 ${r === 0 && i === 4 ? 'bg-yellow-300/15 text-white' : ''}`}>{i < 5 ? (i === 1 ? 1 : 0) : '-'}</td>)}
          <td className="text-[22px] font-extrabold text-yellow-300">{t.runs}</td>
          <td className="text-[22px] text-gray-300">{t.hits}</td>
          <td className="text-[22px] text-gray-300">{t.errors}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
const Frame = ({ board }) => (
  <div className="relative overflow-hidden" style={{ width: 1880, height: 620, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', opacity: 0.85 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.9) 0,rgba(3,5,10,.2) 22%,rgba(3,5,10,.12) 78%,rgba(3,5,10,.9) 100%), linear-gradient(180deg,rgba(3,5,10,.86) 0,rgba(3,5,10,0) 24%)' }} />
    <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: '63px auto 1fr' }}>
      <Head />
      <div className="col-start-1 row-start-2 self-start">{board}</div>
      <div className="col-start-2 row-start-2 self-start"><Line /></div>
      <div className="col-start-1 row-start-3 mt-3">
        <div className="mt-cut mt-glass grid h-[180px] place-items-center text-[13px] text-gray-500" style={{ '--c': '14px' }}>NOW PITCHING 카드 (아래로)</div>
      </div>
    </div>
  </div>
);

/* 1. 중계 그대로 — 위 띠 + 두 줄 점수 + 오른쪽 이닝 · 카운트 · 주자 */
const V1 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden bg-[#05080f]/92 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <p className="m-0 bg-white/[0.08] px-3 py-1 font-display text-[11px] font-bold tracking-[0.18em] text-gray-300">단판 · 1차전</p>
      <div className="flex items-stretch gap-3 p-2.5">
        <div className="min-w-0 flex-1"><Rows w={112} /></div>
        <span className="w-px bg-white/12" />
        <div className="flex shrink-0 flex-col items-center justify-between py-0.5">
          <Inn size={17} /><DotRow />
        </div>
        <Diamond size={54} />
      </div>
    </div>
  )} />
);

/* 2. 컴팩트 — 왼쪽 이닝 기둥 + 점수 + 주자 · 카운트, 아래 한 줄 설명 */
const V2 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden bg-[#05080f]/92 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <div className="flex items-stretch">
        <span className="grid w-9 shrink-0 place-items-center bg-yellow-300/15"><Inn size={18} /></span>
        <div className="min-w-0 flex-1 p-2"><Rows short w={64} big={19} /></div>
        <div className="flex shrink-0 items-center gap-2 pr-2.5">
          <Diamond size={48} />
          <span className="flex flex-col items-start gap-1"><DotRow /><b className="font-display text-[11px] text-gray-400">투구 {G.pitches}</b></span>
        </div>
      </div>
      <div className="border-t border-white/10 bg-white/[0.05]"><Note /></div>
    </div>
  )} />
);

/* 3. 컴팩트 — 설명 줄 없이 숫자만 */
const V3 = () => (
  <Frame board={(
    <div className="mt-cut flex items-stretch overflow-hidden bg-[#05080f]/92 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <span className="grid w-9 shrink-0 place-items-center bg-yellow-300/15"><Inn size={18} /></span>
      <div className="min-w-0 flex-1 p-2"><Rows short w={64} big={19} /></div>
      <div className="flex shrink-0 items-center gap-2 pr-2.5"><Diamond size={48} /><DotRow /></div>
    </div>
  )} />
);

/* 4. 가로 한 줄 — 배지 점수 · 이닝 · 카운트 · 주자가 나란히 */
const V4 = () => (
  <Frame board={(
    <div className="mt-cut flex items-center gap-3 bg-[#05080f]/92 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <span className="grid h-7 w-6 shrink-0 place-items-center font-display text-[10px] font-extrabold text-[#05080f]" style={{ background: G.away.color, clipPath: HEX }}>AI</span>
      <b className="font-display text-[22px] font-extrabold leading-none text-white">{G.away.runs}<span className="mx-1.5 text-gray-600">-</span>{G.home.runs}</b>
      <span className="grid h-7 w-6 shrink-0 place-items-center font-display text-[10px] font-extrabold text-[#05080f]" style={{ background: G.home.color, clipPath: HEX }}>MY</span>
      <span className="h-5 w-px bg-white/12" />
      <Inn size={16} />
      <span className="h-5 w-px bg-white/12" />
      <DotRow />
      <Diamond size={40} />
    </div>
  )} />
);

/* 5. 팀 색 큰 띠 — 점수를 크게, 카운트는 아래 한 줄 */
const V5 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden bg-[#05080f]/92 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      {[G.away, G.home].map((t, i) => (
        <div key={t.name} className="flex items-center gap-2.5 border-b border-white/10 px-2.5 py-1.5" style={{ background: `linear-gradient(90deg,${t.color}2e,transparent 60%)` }}>
          <span className="block h-7 w-1.5 shrink-0" style={{ background: t.color }} />
          <b className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-white">{t.name}</b>
          <b className="font-display text-[28px] font-extrabold leading-none" style={{ color: i === 0 ? '#fff' : '#fde047' }}>{t.runs}</b>
        </div>
      ))}
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <Inn size={15} /><DotRow /><Diamond size={34} />
      </div>
    </div>
  )} />
);

/* 6. 우리 판 결로 — 유리판에 담고 이닝은 칩으로 */
const V6 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass p-2.5" style={{ '--c': '12px', '--a': '#fde047' }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="mt-cut bg-[#fde047] px-2 py-0.5 font-display text-[11px] font-extrabold text-[#05080f]" style={{ '--c': '4px' }}>{G.inning}회{G.top ? '초' : '말'}</span>
        <b className="font-display text-[11px] tracking-[0.18em] text-gray-400">투구 {G.pitches}</b>
      </div>
      <Rows w={108} />
      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
        <Bso /><Diamond size={46} />
      </div>
    </div>
  )} />
);

/* 7. 두 칸으로 — 위는 점수, 아래는 카운트와 주자 */
const V7 = () => (
  <Frame board={(
    <div className="flex flex-col gap-1.5">
      <div className="mt-cut overflow-hidden bg-[#05080f]/92 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
        <div className="flex items-center gap-2 bg-white/[0.08] px-2.5 py-1">
          <Inn size={14} /><b className="font-display text-[11px] tracking-[0.18em] text-gray-300">단판 · 1차전</b>
        </div>
        <div className="p-2.5"><Rows w={108} big={22} /></div>
      </div>
      <div className="mt-cut flex items-center justify-between bg-[#05080f]/92 px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
        <Bso /><Diamond size={44} />
      </div>
    </div>
  )} />
);

/* 8. 주자를 왼쪽에 크게 — 오른쪽에 이닝과 점수 */
const V8 = () => (
  <Frame board={(
    <div className="mt-cut flex items-center gap-2.5 bg-[#05080f]/92 p-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <div className="flex shrink-0 flex-col items-center gap-1">
        <Diamond size={64} />
        <DotRow />
      </div>
      <span className="w-px self-stretch bg-white/12" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2"><Inn size={15} /><b className="font-display text-[11px] tracking-[0.18em] text-gray-400">투구 {G.pitches}</b></div>
        <Rows w={92} big={20} />
      </div>
    </div>
  )} />
);

const V = [['1', '중계 그대로', V1], ['2', '컴팩트 + 설명', V2], ['3', '컴팩트', V3], ['4', '가로 한 줄', V4],
  ['5', '팀 색 큰 띠', V5], ['6', '유리판', V6], ['7', '두 칸', V7], ['8', '주자 크게', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">왼쪽 위 스코어보드 · 8안</b>
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
