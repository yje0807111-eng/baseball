/*
 * 정비 2단계 공격 줄 — 그래프 8안 (/mockups/prep-attack2/?v=1~8, 1920 × 911)
 *  높이 = 스윙 크기(강공 · 보통 · 짧게 · 기다리기), 회마다 점 하나 · 선은 부드럽게 이음 — 왼쪽 상대 흐름과 같은 곡선. 회 위를 끌며 지나가면 마우스 높이대로 점이 찍힘
 *  1 선 + 점 · 2 색 띠 · 3 색 바뀌는 선 · 4 상대 파도 겹치기 · 5 막대 + 선 · 6 점 아래 이름 · 7 그리는 중 · 8 유리 · 최소
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const ME = engineTeam(seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)));
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => Math.round((st(p, 'stuff', 80) + st(p, 'control', 75)) / 2);
const V = Number(new URLSearchParams(location.search).get('v') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', OPP = '#a78bfa', SPB = '#60a5fa';
const SP = ME.pitchers[0];
const PEN = ME.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a));
const MOUND = [79, 78, 74, 71, 68, 68, 69, 72, 79];
const AVG = MOUND.reduce((a, b) => a + b, 0) / 9;
const LOW = MOUND.map((v) => v <= AVG - 2);
const EXIT = 5.2;
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const pct = (inn) => `${(inn / 9) * 100}%`;
const L = '9rem';
const KO = { base: '보통', power: '강공', contact: '짧게', patience: '기다리기' };
const C = { base: W3, power: '#f59e0b', contact: '#38bdf8', patience: '#a78bfa' };
const ORDER = ['power', 'contact', 'patience', 'base'];
const A0 = ['base', 'base', 'base', 'power', 'power', 'base', 'base', 'base', 'contact'];
const PAINT = { a: 4, b: 7, v: 'power' }; // 칠하는 중 — 4~7회 강공

/* ───── 바탕 조각(지금 게임 모습) ───── */
function Lane({ label, sub, h = 60, children, glass = true, lead }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: `${L} minmax(0,1fr)`, minHeight: h }}>
      <span className="flex flex-col items-start justify-center gap-1.5 pr-3"><b className="text-t3" style={{ color: W1 }}>{label}</b>{sub && <span className="text-[11px]" style={{ color: W3 }}>{sub}</span>}{lead}</span>
      <span className="relative block rounded-lg" style={glass ? { background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' } : null}>
        <span className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <i key={i} style={{ borderLeft: i > 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: LOW[i - 1] ? 'rgba(16,185,129,.06)' : 'transparent' }} />)}</span>
        {children}
      </span>
    </div>
  );
}
const Head = () => (
  <div className="grid" style={{ gridTemplateColumns: `${L} minmax(0,1fr)` }}>
    <span />
    <span className="grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <span key={i} className="flex flex-col items-center"><b className="font-display text-t3" style={{ color: LOW[i - 1] ? US : W2 }}>{i}회</b><span className="text-[10px]" style={{ color: US, visibility: LOW[i - 1] ? 'visible' : 'hidden' }}>기회</span></span>)}</span>
  </div>
);
const Grip = ({ x, on }) => (
  <span className="absolute z-10 flex -translate-x-1/2 items-center justify-center" style={{ left: x, top: 4, bottom: 4, width: 16 }}>
    <i className="absolute w-px" style={{ top: 4, bottom: 4, background: on ? US : 'rgba(255,255,255,.10)' }} />
    <i className="relative block rounded-full" style={{ height: 20, width: 4, background: on ? US : 'rgba(255,255,255,.3)' }} />
  </span>
);
const OppCells = () => <span className="absolute grid gap-1" style={{ inset: 4, gridTemplateColumns: 'repeat(9,1fr)' }}>{MOUND.map((v, i) => <span key={i} className="grid place-items-center rounded-md font-display text-t4" style={{ background: LOW[i] ? 'rgba(16,185,129,.16)' : `rgba(167,139,250,${0.1 + (v - 66) / 70})`, color: LOW[i] ? US : W1 }}>{v}</span>)}</span>;
function Mound() {
  const box = (a, b, p, close) => (
    <span key={a} className="absolute flex items-center justify-center gap-1.5 rounded-md" style={{ top: 6, bottom: 6, left: `calc(${pct(a)} + 5px)`, width: `calc(${pct(b - a)} - 10px)`, background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
      <Portrait player={p} w={24} h={30} color="#334155" /><span className="flex flex-col leading-tight"><span className="text-[11px]" style={{ color: W1 }}>{p.name}</span>{close && <span className="text-[10px]" style={{ color: GOLD }}>마무리</span>}</span>
    </span>
  );
  return (
    <>
      <span className="absolute flex items-center gap-2 rounded-md px-2" style={{ top: 6, bottom: 6, left: 4, width: `calc(${pct(EXIT)} - 9px)`, background: `linear-gradient(90deg, ${SPB}66, ${SPB}22)` }}>
        <Portrait player={SP} w={30} h={38} color="#334155" /><b className="text-t4" style={{ color: W1 }}>{SP.name}</b>
        <b className="ml-auto rounded-md px-2 py-0.5 text-t4" style={{ background: 'rgba(11,15,26,.72)', color: W1, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>85구 · 약 5.2회</b>
      </span>
      {box(EXIT, 7, PEN[2])}{box(7, 8, PEN[1])}{box(8, 9, PEN[0], true)}
      <Grip x={pct(EXIT)} /><Grip x={pct(7)} /><Grip x={pct(8)} />
    </>
  );
}
const Aug = () => <span className="absolute top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-t4 font-black" style={{ zIndex: 0, left: pct(5.5), width: 32, height: 32, background: GOLD, color: '#1c1203', boxShadow: '0 0 0 3px rgba(11,15,26,.9)' }}>✦</span>;
const Mix = () => (
  <span className="flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>볼 배합</span>
    <span className="inline-flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>{['섞기', '직구', '휘는 공', '떨어지는 공'].map((o, i) => <b key={o} className="rounded-md px-3 py-1 text-t4" style={i === 0 ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : { color: W2 }}>{o}</b>)}</span>
  </span>
);

/* ───── 공격 그래프 ─────
 * 높이 = 스윙 크기: 0 강공(맨 위) · 1 보통 · 2 짧게 · 3 기다리기(맨 아래). 회 가운데 점 하나, 점은 네 칸 중 하나에 딱
 * 선은 회 사이를 부드럽게(왼쪽 상대 흐름과 같은 곡선 — 가로 접선 베지어). 끌면서 지나가면 마우스 높이대로 회마다 점이 찍힘
 */
const LV = ['power', 'base', 'contact', 'patience'];
const PLAN = [3, 3, 1, 0, 0, 0, 0, 1, 2]; // 초반 기다리기 · 3회 보통 · 기회(4~7) 강공 · 8회 보통 · 9회 짧게
const GH = 156, PAD = 20;
const yOf = (lv) => PAD + (lv * (GH - PAD * 2)) / 3;
const xOf = (i) => i * 100 + 50; // viewBox 900 기준 회 가운데
function curve(vals, close = false) {
  let d = `M0,${yOf(vals[0])} L${xOf(0)},${yOf(vals[0])}`;
  for (let i = 1; i < 9; i += 1) { const mx = (xOf(i - 1) + xOf(i)) / 2; d += ` C${mx},${yOf(vals[i - 1])} ${mx},${yOf(vals[i])} ${xOf(i)},${yOf(vals[i])}`; }
  d += ` L900,${yOf(vals[8])}`;
  return close ? `${d} L900,${GH} L0,${GH} Z` : d;
}
const dotC = (lv) => (LV[lv] === 'base' ? '#cbd5e1' : C[LV[lv]]);
/* 공격 줄 — 왼쪽 이름 칸에 네 칸 눈금 글자(점 높이와 같은 y) */
function GLane({ children, labels = 'left', glass = true }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: `${L} minmax(0,1fr)`, height: GH }}>
      <span className="relative block pr-3">
        <b className="absolute text-t3" style={{ left: 0, top: 0, color: W1 }}>공격</b>
        {labels === 'left' && LV.map((v, lv) => <span key={v} className="absolute flex -translate-y-1/2 items-center gap-1.5" style={{ right: 12, top: yOf(lv) }}><span className="text-[11px]" style={{ color: W2 }}>{KO[v]}</span><i className="block rounded-full" style={{ width: 6, height: 6, background: dotC(lv) }} /></span>)}
      </span>
      <span className="relative block overflow-visible rounded-lg" style={glass ? { background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' } : null}>
        <span className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <i key={i} style={{ borderLeft: i > 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: LOW[i - 1] ? 'rgba(16,185,129,.06)' : 'transparent' }} />)}</span>
        {children}
      </span>
    </div>
  );
}
const Bands = ({ tint }) => LV.map((v, lv) => (
  <span key={v} className="pointer-events-none absolute left-0 right-0" style={tint
    ? { top: yOf(lv) - (GH - PAD * 2) / 6, height: (GH - PAD * 2) / 3, background: v === 'base' ? 'transparent' : `${C[v]}0d` }
    : { top: yOf(lv), height: 1, background: 'rgba(255,255,255,.06)' }} />
));
const Svg = ({ children }) => <svg viewBox={`0 0 900 ${GH}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">{children}</svg>;
const Line = ({ vals = PLAN, fill = true, grad = false, color = '#e5e7eb', w = 2.5, dash }) => (
  <Svg>
    <defs>
      <linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f59e0b" stopOpacity=".28" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></linearGradient>
      <linearGradient id="gline" x1="0" y1="0" x2="1" y2="0">{vals.map((lv, i) => <stop key={i} offset={(i + 0.5) / 9} stopColor={dotC(lv)} />)}</linearGradient>
    </defs>
    {fill && <path d={curve(vals, true)} fill="url(#gfill)" />}
    <path d={curve(vals)} fill="none" stroke={grad ? 'url(#gline)' : color} strokeWidth={w} strokeDasharray={dash} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
  </Svg>
);
const Dots = ({ vals = PLAN, size = 12, ring = true, label = false, dim = null }) => vals.map((lv, i) => (
  <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(i + 0.5), top: yOf(lv), opacity: dim && !dim.includes(i) ? 0.35 : 1 }}>
    <i className="block rounded-full" style={{ width: size, height: size, background: dotC(lv), boxShadow: ring ? '0 0 0 3px rgba(11,15,26,.9)' : 'none' }} />
    {label && <b className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px]" style={{ top: lv === 3 ? -20 : size + 4, color: lv === 1 ? W2 : dotC(lv) }}>{KO[LV[lv]]}</b>}
  </span>
));
/* 상대 마운드 파도(같은 줄 뒤에 옅게) — 낮을수록 기회 */
const OppWave = () => {
  const y = (v) => PAD + ((v - 66) / 14) * (GH - PAD * 2);
  let d = `M0,${y(MOUND[0])} L50,${y(MOUND[0])}`;
  for (let i = 1; i < 9; i += 1) { const mx = i * 100; d += ` C${mx},${y(MOUND[i - 1])} ${mx},${y(MOUND[i])} ${i * 100 + 50},${y(MOUND[i])}`; }
  d += ` L900,${y(MOUND[8])}`;
  return <Svg><path d={`${d} L900,0 L0,0 Z`} fill="rgba(167,139,250,.08)" /><path d={d} fill="none" stroke={OPP} strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" /></Svg>;
};
/* 그리는 중 — 손가락 · 지나간 회 · 위 칩 */
const Drawing = ({ at = 6, lv = 0 }) => (
  <>
    <span className="absolute -translate-x-1/2 rounded-full" style={{ left: pct(at - 0.5), top: yOf(lv) - 16, width: 32, height: 32, boxShadow: `0 0 0 2px ${C.power}`, background: `${C.power}22` }} />
    <b className="absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-t4" style={{ left: pct(at - 0.5), top: yOf(lv) - 44, background: 'rgba(11,15,26,.88)', color: W1, boxShadow: `inset 0 0 0 1px ${C.power}` }}>{at}회 강공</b>
  </>
);

/* ───── 공통 판 ───── */
function Board({ atk, below = null, labels, glass }) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="mt-cut flex shrink-0 items-center gap-4 px-4 py-2.5" style={{ ...cut(12), background: 'rgba(96,165,250,.06)', boxShadow: 'inset 0 0 0 1px rgba(96,165,250,.28)' }}>
        <Portrait player={SP} w={36} h={44} color="#334155" />
        <span className="flex flex-col"><span className="text-t4" style={{ color: W3 }}>오늘 선발</span><b className="text-t2" style={{ color: W1 }}>{SP.name}</b></span>
        <span className="ml-auto flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>끊는 기준</span><Ghost>이닝</Ghost><Ghost on c="#ffffff">투구 수</Ghost><Ghost>타자 수</Ghost><b className="font-display text-t1" style={{ color: W1 }}>85구</b></span>
      </div>
      <Head />
      <Lane label="상대 마운드" h={42} glass={false}><OppCells /></Lane>
      <i className="block h-px shrink-0 bg-white/[0.07]" />
      <Lane label="우리 마운드" h={68}><Mound /></Lane>
      <span className="h-2" />
      <GLane labels={labels} glass={glass}>{atk}</GLane>
      {below}
      <Lane label="증강" h={42} glass={false}><Aug /></Lane>
      <span className="mt-auto flex justify-end"><Mix /></span>
    </div>
  );
}
const Ghost = ({ children, on, c = US }) => (
  <span className="rounded-md px-3 py-1 text-t4 font-bold" style={{ color: on ? '#fff' : W2, background: on ? `${c}26` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${on ? c : 'rgba(255,255,255,.1)'}` }}>{children}</span>
);

const CENTER = {
  1: ['선 + 점', () => <Board atk={<><Bands /><Line /><Dots /></>} />],
  2: ['색 띠', () => <Board atk={<><Bands tint /><Line fill={false} /><Dots /></>} />],
  3: ['색 바뀌는 선', () => <Board atk={<><Bands /><Line grad w={3.5} /><Dots size={10} /></>} />],
  4: ['상대 파도 겹치기', () => <Board atk={<><Bands /><OppWave /><Line fill={false} /><Dots /></>} />],
  5: ['막대 + 선', () => (
    <Board atk={<>
      <Bands />
      {PLAN.map((lv, i) => <span key={i} className="absolute -translate-x-1/2 rounded-t-md" style={{ left: pct(i + 0.5), width: 28, top: yOf(lv), bottom: 0, background: `linear-gradient(180deg, ${dotC(lv)}55, ${dotC(lv)}08)` }} />)}
      <Line fill={false} w={2} /><Dots size={10} />
    </>} />
  )],
  6: ['점 아래 이름', () => <Board labels="none" atk={<><Bands /><Line /><Dots label /></>} />],
  7: ['그리는 중', () => <Board atk={<><Bands /><Line fill={false} color="rgba(229,231,235,.35)" dash="5 5" /><Line vals={[3, 3, 1, 0, 0, 0, 1, 1, 2].map((v, i) => (i < 6 ? v : v))} fill /><Dots vals={[3, 3, 1, 0, 0, 0, 1, 1, 2]} dim={[3, 4, 5]} /><Drawing at={6} lv={0} /></>}
    below={<div className="grid" style={{ gridTemplateColumns: `${L} minmax(0,1fr)` }}><span /><span className="flex justify-end gap-1.5">{['기회 회 강공', '모두 보통'].map((p) => <Ghost key={p}>{p}</Ghost>)}</span></div>} />],
  8: ['유리 · 최소', () => <Board glass={false} atk={<><Bands /><Line fill={false} w={2} color="#f8fafc" /><Dots size={9} ring={false} /></>} />],
};


function Left() {
  const W = 300, H = 90, x = (i) => (i * W) / 8, y = (v) => H - 10 - (v - (AVG - 8)) * 4.5;
  let d = `M0,${H} L0,${y(MOUND[0])}`;
  for (let i = 1; i < 9; i += 1) { const mx = (x(i - 1) + x(i)) / 2; d += ` C${mx},${y(MOUND[i - 1])} ${mx},${y(MOUND[i])} ${x(i)},${y(MOUND[i])}`; }
  d += ` L${W},${H} Z`;
  return (
    <aside className="mt-cut flex flex-col gap-3 p-5" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
      <span className="text-t4" style={{ color: W3 }}>오늘 상대 판 · 머리</span>
      <span style={{ height: 220 }} />
      <b className="text-t3" style={{ color: W2 }}>상대 흐름</b>
      <svg width={W} height={H} style={{ overflow: 'visible' }}><path d={d} fill="rgba(167,139,250,.25)" stroke={OPP} strokeWidth="2" />{MOUND.map((v, i) => LOW[i] && <circle key={i} cx={x(i)} cy={y(v)} r="5" fill={US} />)}</svg>
    </aside>
  );
}

function App() {
  const [t, Center] = CENTER[V];
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex h-full flex-col gap-3 px-2.5 pb-2.5 pt-3">
        <div className="flex shrink-0 items-center gap-4 px-3" style={{ height: 70 }}><b className="text-t1 font-black text-white">경기 전 정비</b><span className="rounded-full px-3 py-1 text-t4 font-bold" style={{ color: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}66` }}>{V} · {t}</span></div>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
          <Left />
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(20), '--a': US }}>
            <div className="flex shrink-0 items-center gap-6" style={{ height: 40 }}>
              {['라인업', '경기 흐름', '상황 대응'].map((x, i) => (
                <React.Fragment key={x}>
                  <span className="flex items-center gap-2.5"><b className="grid h-8 w-8 place-items-center rounded-full font-display text-t3" style={{ background: i === 1 ? GOLD : i === 0 ? 'rgba(52,211,153,.22)' : 'rgba(255,255,255,.06)', color: i === 1 ? '#1c1203' : i === 0 ? '#34d399' : W2 }}>{i === 0 ? '✓' : i + 1}</b><b className="text-t3" style={{ color: i === 1 ? '#fff' : W2 }}>{x}</b></span>
                  {i < 2 && <i className="block h-px w-8 bg-white/15" />}
                </React.Fragment>
              ))}
              <span className="ml-auto flex flex-col gap-1.5" style={{ width: 288 }}><span className="flex justify-between text-t4"><span style={{ color: W2 }}>예상 승률</span><b className="font-display text-t3" style={{ color: '#34d399' }}>47% : 53%</b></span><span className="flex h-1.5 overflow-hidden rounded-full"><i style={{ width: '47%', background: '#34d399' }} /><i className="flex-1" style={{ background: RED }} /></span></span>
            </div>
            <div className="min-h-0 flex-1"><Center /></div>
            <div className="flex shrink-0 items-center border-t border-white/[0.08] pt-3" style={{ height: 64 }}><span className="flex-1" /><span className="mt-cut flex h-12 items-center gap-3 px-6" style={{ ...cut(12), minWidth: 288, justifyContent: 'center', background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}><span className="flex gap-1">{[1, 2, 3].map((i) => <i key={i} className="block h-1.5 rounded-full" style={{ width: i === 2 ? 16 : 6, background: i <= 2 ? '#1c1203' : 'rgba(28,18,3,.3)' }} />)}</span><b className="text-t2 font-black">다음 · 상황 대응 ▶</b></span></div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
