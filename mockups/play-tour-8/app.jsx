/* 토너먼트 · 시작 전 오른쪽 판 — 간결하게 "어떤 경기인지"만, 대신 더 세련되게 8안 (384 × 800) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';

const cut = (c) => ({ '--c': `${c}px` });
const A = '#fbbf24';
const SIZE = 16;
const ROUNDS = ['16강', '8강', '4강', '결승'];
const PRIZE = 960;
const GOLD_TX = { background: 'linear-gradient(180deg,#fde68a,#f59e0b 60%,#b45309)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };

const FORMATS = [['단판'], ['16강', true], ['32강'], ['64강']];
const Picker = () => (
  <div className="grid grid-cols-4 gap-1.5">
    {FORMATS.map(([t, on]) => (
      <span key={t} className={`ui-cut py-2 text-center font-display text-lg font-extrabold ${on ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400'}`}
        style={{ ...cut(7), background: on ? A : undefined, boxShadow: on ? `0 0 22px -6px ${A}` : undefined }}>{t}</span>
    ))}
  </div>
);
const Head = ({ title = '일반 대결' }) => (
  <>
    <p className="ui-lab font-display" style={{ '--a': A }}>Tournament · {SIZE}</p>
    <h2 className="-mt-2 text-3xl font-black text-white">{title}</h2>
    <Picker />
  </>
);
const startBtn = () => (
  <div className="mt-auto">
    <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ ...cut(12), '--a': A }}>{SIZE}강 시작 ▶</button>
  </div>
);
const pane = (children, gap = 'gap-4') => <aside className={`ui-cut ui-frame ui-glass flex h-full flex-col ${gap} p-6`} style={{ ...cut(20), '--a': A }}>{children}</aside>;
/* 금빛 트로피 — 그림 없이 도형으로 */
const Trophy = ({ s = 84 }) => (
  <span className="relative grid place-items-center" style={{ width: s, height: s }}>
    <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle,${A}44,transparent 70%)` }} />
    <svg viewBox="0 0 24 24" width={s * 0.62} height={s * 0.62} fill="none" stroke="url(#g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#d97706" /></linearGradient></defs>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
      <path d="M12 14v4" /><path d="M8.5 20h7" /><path d="M9.5 18h5l1 2h-7l1-2Z" />
    </svg>
  </span>
);
const line = () => <span className="block h-px w-full" style={{ background: `linear-gradient(90deg,transparent,${A}66,transparent)` }} />;
const desc = (t) => <p className="text-center text-[13.5px] leading-relaxed text-gray-400">{t}</p>;

/* ── 1. 트로피 + 큰 상금 ── */
const V1 = () => pane(<>
  <Head />
  <div className="flex flex-1 flex-col items-center justify-center gap-3">
    <Trophy s={96} />
    <p className="font-display text-[11px] tracking-[0.3em] text-gray-500">WINNER TAKES</p>
    <b className="font-display text-[54px] font-extrabold leading-none" style={GOLD_TX}>{PRIZE} G</b>
    {line()}
    {desc('내 팀으로 치르는 16팀 토너먼트. 네 번 이기면 우승.')}
  </div>
  {startBtn()}
</>);

/* ── 2. 큰 배지 숫자 ── */
const V2 = () => pane(<>
  <Head />
  <div className="flex flex-1 flex-col items-center justify-center gap-4">
    <span className="relative grid h-[150px] w-[150px] place-items-center" style={{ background: `conic-gradient(from 210deg,${A}22,transparent 40%,${A}22)`, clipPath: 'polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)' }}>
      <span className="absolute inset-[3px]" style={{ background: 'rgba(6,10,19,.85)', clipPath: 'polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)' }} />
      <span className="relative flex flex-col items-center">
        <b className="font-display text-[58px] font-black leading-none" style={GOLD_TX}>{SIZE}</b>
        <span className="font-display text-[12px] tracking-[0.3em] text-gray-400">TEAMS</span>
      </span>
    </span>
    {desc('16팀이 맞붙는 토너먼트. 한 번 지면 끝.')}
    <div className="ui-cut flex w-full items-center justify-between px-4 py-3" style={{ ...cut(10), background: `linear-gradient(90deg,${A}1f,rgba(255,255,255,.03))`, boxShadow: `inset 0 0 0 1px ${A}44` }}>
      <span className="font-display text-[11px] tracking-[0.24em] text-gray-400">우승 상금</span>
      <b className="font-display text-[26px]" style={GOLD_TX}>{PRIZE} G</b>
    </div>
  </div>
  {startBtn()}
</>);

/* ── 3. 입장권 ── */
const V3 = () => pane(<>
  <Head />
  <div className="flex flex-1 items-center">
    <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(160deg,rgba(251,191,36,.14),rgba(6,10,19,.65))', boxShadow: `inset 0 0 0 1px ${A}55`, clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' }}>
      <div className="p-5">
        <p className="font-display text-[11px] tracking-[0.34em]" style={{ color: A }}>ENTRY TICKET</p>
        <b className="mt-1 block text-[30px] font-black leading-tight text-white">{SIZE}강 토너먼트</b>
        <p className="mt-1 text-[13px] text-gray-400">내 팀으로 치르는 단판 승부 토너먼트</p>
      </div>
      <div className="relative">
        <span className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#080c15]" />
        <span className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#080c15]" />
        <span className="block border-t border-dashed" style={{ borderColor: `${A}66` }} />
      </div>
      <div className="grid grid-cols-2 gap-3 p-5">
        <span><span className="block font-display text-[10px] tracking-[0.24em] text-gray-500">ROUNDS</span><b className="font-display text-[22px] text-white">{ROUNDS.length}</b></span>
        <span className="text-right"><span className="block font-display text-[10px] tracking-[0.24em] text-gray-500">우승 상금</span><b className="font-display text-[22px]" style={GOLD_TX}>{PRIZE} G</b></span>
      </div>
    </div>
  </div>
  {startBtn()}
</>);

/* ── 4. 라운드 계단 ── */
const V4 = () => pane(<>
  <Head />
  {desc('네 번 이기면 우승. 한 번 지면 끝.')}
  <div className="flex flex-1 flex-col justify-center gap-2">
    {ROUNDS.map((r, i) => {
      const last = i === ROUNDS.length - 1;
      return (
        <div key={r} className="ui-cut flex items-center gap-3 px-4" style={{ ...cut(8), height: 46 + i * 8, marginLeft: i * 10, background: last ? `linear-gradient(90deg,${A}2a,rgba(255,255,255,.03))` : 'rgba(255,255,255,.04)', boxShadow: last ? `inset 0 0 0 1px ${A}66` : 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
          <b className="font-display text-[15px]" style={{ color: last ? A : '#e5e7eb' }}>{r}</b>
          {last && <b className="ml-auto font-display text-[22px]" style={GOLD_TX}>{PRIZE} G</b>}
        </div>
      );
    })}
  </div>
  {startBtn()}
</>);

/* ── 5. 네온 액자 ── */
const V5 = () => pane(<>
  <Head />
  <div className="relative flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden" style={{ boxShadow: `inset 0 0 0 1px ${A}40, inset 0 0 40px -18px ${A}` }}>
    <span className="absolute inset-3 opacity-40" style={{ background: `repeating-linear-gradient(135deg,transparent 0 12px,${A}12 12px 13px)` }} />
    <span className="relative font-display text-[11px] tracking-[0.34em]" style={{ color: A }}>SINGLE ELIMINATION</span>
    <b className="relative text-[34px] font-black leading-none text-white">{SIZE}강 토너먼트</b>
    <span className="relative" style={{ width: 120 }}>{line()}</span>
    <b className="relative font-display text-[46px] font-extrabold leading-none" style={GOLD_TX}>{PRIZE} G</b>
    <span className="relative font-display text-[11px] tracking-[0.24em] text-gray-500">우승 상금</span>
  </div>
  {startBtn()}
</>);

/* ── 6. 포스터 ── */
const V6 = () => pane(<>
  <Head />
  <div className="relative min-h-0 flex-1 overflow-hidden bg-cover" style={{ ...cut(14), clipPath: 'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)', backgroundImage: 'url(ui/stadium.webp)', backgroundPosition: 'center 35%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.25),rgba(5,8,15,.55) 40%,#05080f)' }} />
    <div className="absolute" style={{ left: 20, right: 20, bottom: 20 }}>
      <p className="font-display text-[11px] tracking-[0.34em]" style={{ color: A }}>TOURNAMENT</p>
      <b className="mt-1 block text-[34px] font-black leading-tight text-white">{SIZE}강</b>
      <p className="mt-1 text-[13px] text-gray-300">내 팀으로 치르는 토너먼트 · 네 번 이기면 우승</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-[11px] tracking-[0.24em] text-gray-400">우승 상금</span>
        <b className="font-display text-[28px]" style={GOLD_TX}>{PRIZE} G</b>
      </div>
    </div>
  </div>
  {startBtn()}
</>);

/* ── 7. 미니멀 ── */
const V7 = () => pane(<>
  <Head />
  <div className="flex flex-1 flex-col justify-center gap-6 px-1">
    <div>
      <p className="font-display text-[11px] tracking-[0.3em] text-gray-500">HOW IT WORKS</p>
      <p className="mt-2 text-[15px] leading-relaxed text-gray-300">내 라커의 팀으로 16팀 토너먼트를 치릅니다. 모든 경기는 단판이고, 한 번 지면 끝납니다.</p>
    </div>
    {line()}
    <div className="flex items-end justify-between">
      <span className="font-display text-[11px] tracking-[0.3em] text-gray-500">우승 상금</span>
      <b className="font-display text-[40px] font-extrabold leading-none" style={GOLD_TX}>{PRIZE} G</b>
    </div>
  </div>
  {startBtn()}
</>, 'gap-5');

/* ── 8. 메달 세 줄 ── */
const V8 = () => pane(<>
  <Head />
  {desc('한 번 지면 끝나는 16팀 토너먼트')}
  <div className="flex flex-1 flex-col justify-center gap-2.5">
    {[['우승', 960, ['#fde68a', '#d97706']], ['준우승', 640, ['#e5e7eb', '#94a3b8']], ['4강', 400, ['#f0b48a', '#b45309']]].map(([k, g, [c1, c2]], i) => (
      <div key={k} className="ui-cut flex items-center gap-3 px-4 py-3" style={{ ...cut(10), background: `linear-gradient(90deg,${c1}1f,rgba(255,255,255,.03))`, boxShadow: `inset 0 0 0 1px ${c1}44` }}>
        <span className="grid h-8 w-8 place-items-center rounded-full font-display text-[13px] font-extrabold text-[#1c1402]" style={{ background: `linear-gradient(160deg,${c1},${c2})` }}>{i + 1}</span>
        <b className="text-[15px] text-white">{k}</b>
        <b className="ml-auto font-display text-[22px]" style={{ background: `linear-gradient(180deg,${c1},${c2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{g} G</b>
      </div>
    ))}
  </div>
  {startBtn()}
</>);

const V = [
  ['1', '트로피 + 큰 상금', V1], ['2', '배지 숫자', V2], ['3', '입장권', V3], ['4', '라운드 계단', V4],
  ['5', '네온 액자', V5], ['6', '포스터', V6], ['7', '미니멀', V7], ['8', '메달 세 줄', V8],
];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <UiStyle />
      <div className="mb-3 flex items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">토너먼트 시작 전 판 · 8안</b>
        {V.map(([id, name]) => <a key={id} className="bg-white/[0.06] px-2.5 py-1 text-gray-300 no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a>)}
      </div>
      {pick ? <div style={{ width: 384, height: 800 }}>{pick[2]()}</div> : (
        <div className="grid grid-cols-4 gap-4">
          {V.map(([id, name, C]) => (
            <div key={id}>
              <h3 className="mb-1.5 text-[13px] text-white"><a className="text-inherit no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a></h3>
              <div style={{ width: 384, height: 800 }}>{C()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
