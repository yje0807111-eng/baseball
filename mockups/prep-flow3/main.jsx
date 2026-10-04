/*
 * 정비 2단계 정돈 8안 (/mockups/prep-flow3/?v=1~8, 1920 × 911)
 *  위 선발 카드 걷어냄 · 우리 마운드 칸 안에 투수 수치(구위 · 제구 · 체력) · 상대 마운드 줄은 왼쪽 상대 판으로
 *  끊는 기준 자리: 마운드 이름 칸 · 위 도구 띠 · 선발 막대 안 · 칩 하나 / 왼쪽 상대 마운드: 칸 · 파도 위 숫자 · 띠 · 회마다 표
 *  1 기본 · 2 도구 띠 + 막대 수치 · 3 선발 막대 안 조절 · 4 카드형 투수 칸 · 5 최소 · 6 세 줄 수치 · 7 도구 띠(끊는 기준 · 배합) · 8 왼쪽 상대 마운드 표
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
const EXIT = 6.1;
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
const GH = 220, PAD = 24;
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

/* ───── 이 목업 조각 ───── */
const Ghost = ({ children, on, c = US, sm }) => (
  <span className={`rounded-md font-bold ${sm ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-t4'}`} style={{ color: on ? '#fff' : W2, background: on ? `${c}26` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${on ? c : 'rgba(255,255,255,.1)'}` }}>{children}</span>
);
const MID = PEN[2], CLOSE = PEN[0];
const SPAN = [[0, EXIT, SP, 'sp'], [EXIT, 8, MID, 'mid'], [8, 9, CLOSE, 'close']];
/* 끊는 기준 — 세 모양: 'seg'(세 칸 + − 값 +) · 'chip'(값 하나 ▾) · 'col'(세로) */
function Limit({ kind = 'seg' }) {
  if (kind === 'chip') return <span className="flex items-center gap-1.5 rounded-md px-2.5 py-1" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)', background: 'rgba(255,255,255,.04)' }}><span className="text-[11px]" style={{ color: W3 }}>선발</span><b className="font-display text-t3" style={{ color: W1 }}>100구</b><span className="text-[11px]" style={{ color: W3 }}>▾</span></span>;
  if (kind === 'col') return (
    <span className="flex flex-col items-start gap-1">
      <span className="flex gap-0.5">{['이닝', '투구 수', '타자 수'].map((o) => <span key={o} className="whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: o === '투구 수' ? '#fff' : W3, background: o === '투구 수' ? 'rgba(255,255,255,.12)' : 'transparent', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>{o}</span>)}</span>
      <span className="flex items-center gap-1"><Ghost sm>−</Ghost><b className="font-display text-t2" style={{ color: W1, minWidth: 54, textAlign: 'center' }}>100구</b><Ghost sm>+</Ghost></span>
    </span>
  );
  return (
    <span className="flex items-center gap-2"><span className="text-t4" style={{ color: W3 }}>끊는 기준</span>
      {['이닝', '투구 수', '타자 수'].map((o) => <Ghost key={o} on={o === '투구 수'} c="#ffffff">{o}</Ghost>)}
      <Ghost>−</Ghost><b className="font-display text-t2" style={{ color: W1, minWidth: 64, textAlign: 'center' }}>100구</b><Ghost>+</Ghost>
    </span>
  );
}
/* 투수 수치 — 'line'(구위 · 제구 · 체력 한 줄) · 'bars'(작은 막대 셋) · 'arm'(힘 숫자 하나) · 'stack'(세 줄) */
const STATS = [['구위', 'stuff', 80], ['제구', 'control', 75], ['체력', 'stamina', 90]];
function Stats({ p, kind }) {
  if (kind === 'arm') return <b className="font-display text-t2" style={{ color: W1 }}>{arm(p)}</b>;
  if (kind === 'bars') return (
    <span className="flex flex-col gap-0.5">{STATS.map(([ko, k, d]) => (
      <span key={k} className="flex items-center gap-1.5"><span className="text-[10px]" style={{ color: W3, width: 22 }}>{ko}</span><span className="block overflow-hidden rounded-full" style={{ width: 54, height: 4, background: 'rgba(255,255,255,.1)' }}><i className="block h-full rounded-full" style={{ width: `${Math.max(0, st(p, k, d) - 40) * 1.67}%`, background: st(p, k, d) >= 85 ? US : '#cbd5e1' }} /></span><b className="font-display text-[11px]" style={{ color: W1 }}>{st(p, k, d)}</b></span>
    ))}</span>
  );
  if (kind === 'stack') return <span className="flex flex-col leading-tight">{STATS.map(([ko, k, d]) => <span key={k} className="text-[11px]" style={{ color: W3 }}>{ko} <b className="font-display" style={{ color: W1 }}>{st(p, k, d)}</b></span>)}</span>;
  return <span className="whitespace-nowrap text-[12px]" style={{ color: W2 }}>{STATS.map(([ko, k, d], i) => <React.Fragment key={k}>{i ? ' · ' : ''}{ko} <b className="font-display" style={{ color: W1 }}>{st(p, k, d)}</b></React.Fragment>)}</span>;
}
function Mound2({ stat = 'line', bubbleLimit = false, tall = false }) {
  return (
    <>
      {SPAN.map(([a, b, p, role]) => (
        <span key={role} className="absolute flex items-center gap-2.5 overflow-hidden rounded-md px-2.5" style={{ top: 6, bottom: 6, left: `calc(${pct(a)} + ${a ? 5 : 4}px)`, width: `calc(${pct(b - a)} - ${a ? 10 : 9}px)`, background: role === 'sp' ? `linear-gradient(90deg, ${SPB}66, ${SPB}22)` : 'rgba(255,255,255,.05)', boxShadow: role === 'sp' ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
          <Portrait player={p} w={tall ? 40 : 30} h={tall ? 50 : 38} color="#334155" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5"><b className="truncate text-t4" style={{ color: W1 }}>{p.name}</b>{role === 'close' && <span className="text-[10px]" style={{ color: GOLD }}>마무리</span>}</span>
            {stat !== 'arm' && <Stats p={p} kind={stat} />}
          </span>
          {stat === 'arm' && <span className="ml-auto"><Stats p={p} kind="arm" /></span>}
          {role === 'sp' && (bubbleLimit
            ? <span className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-1" style={{ background: 'rgba(11,15,26,.72)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}><Ghost sm>−</Ghost><span className="flex flex-col items-center leading-tight"><b className="font-display text-t4" style={{ color: W1 }}>100구</b><span className="text-[10px]" style={{ color: W3 }}>약 6.1회</span></span><Ghost sm>+</Ghost><span className="text-[10px]" style={{ color: W3 }}>▾</span></span>
            : <b className="ml-auto whitespace-nowrap rounded-md px-2 py-0.5 text-t4" style={{ background: 'rgba(11,15,26,.72)', color: W1, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>100구 · 약 6.1회</b>)}
        </span>
      ))}
      <Grip x={pct(EXIT)} /><Grip x={pct(8)} />
    </>
  );
}
/* 스타일 단추 여섯 갈래 */
const GROUPS = [['기본형', '신중형'], ['상대 맞춤형', '약점 집중형', '강약 조절형'], ['초반 탐색형', '투구 수 공략형', '탐색 후 공격형'], ['후반 공격형', '막판 승부형', '중반 승부형'], ['안타형', '출루형', '초반 안타형'], ['장타형', '적극형', '선제 공격형']];
const Styles = ({ rows = 3 }) => (
  <div className="grid" style={{ gridTemplateColumns: `${L} minmax(0,1fr)` }}><span />
    <span className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))' }}>{GROUPS.map((g) => (
      <span key={g[0]} className="flex flex-col gap-1">{g.slice(0, rows).map((ko, k) => <span key={ko} className="rounded-md px-2.5 py-1 text-t4 font-bold" style={{ color: ko === '기본형' ? '#fff' : k ? W2 : W1, background: ko === '기본형' ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${ko === '기본형' ? US : 'rgba(255,255,255,.08)'}` }}>{ko}</span>)}</span>
    ))}</span>
  </div>
);
const MixRow = () => <span className="flex justify-end"><Mix /></span>;

/* 중앙 판 — 상대 마운드 줄 없음, 선발 카드 없음 */
function Center2({ limit = 'lead', stat = 'line', tall, toolbar, rows = 3, mixTop }) {
  const lead = limit === 'lead' ? <Limit kind="col" /> : limit === 'chip' ? <Limit kind="chip" /> : null;
  return (
    <div className="flex h-full flex-col gap-2.5">
      {toolbar && <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,.025)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}><Limit />{mixTop && <Mix />}</div>}
      <Head />
      <Lane label="우리 마운드" h={tall ? 120 : 92} lead={lead}><Mound2 stat={stat} tall={tall} bubbleLimit={limit === 'bubble'} /></Lane>
      <span className="h-1" />
      <GLane><Bands /><OppWave /><Line /><Dots /></GLane>
      <Styles rows={rows} />
      {!mixTop && <MixRow />}
    </div>
  );
}

/* 왼쪽 상대 판 — 상대 마운드 회마다 수치 */
const MOUND_NAMES = ['선발', '선발', '선발', '선발', '선발', '불펜', '불펜', '필승조', '마무리'];
function Left2({ kind = 'cells' }) {
  const W = 300, H = 92, x = (i) => (i * W) / 8, y = (v) => H - 12 - (v - (AVG - 8)) * 4.5;
  let d = `M0,${H} L0,${y(MOUND[0])}`;
  for (let i = 1; i < 9; i += 1) { const mx = (x(i - 1) + x(i)) / 2; d += ` C${mx},${y(MOUND[i - 1])} ${mx},${y(MOUND[i])} ${x(i)},${y(MOUND[i])}`; }
  d += ` L${W},${H} Z`;
  return (
    <aside className="mt-cut flex flex-col gap-3 p-5" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
      <span className="text-t4" style={{ color: W3 }}>오늘 상대 · 머리(그대로)</span>
      <span style={{ height: 150 }} />
      <b className="text-t3" style={{ color: W1 }}>{kind === 'table' ? '상대 마운드' : '상대 흐름'}</b>
      {kind !== 'table' && (
        <svg width={W} height={H + (kind === 'dots' ? 8 : 0)} style={{ overflow: 'visible' }}>
          <path d={d} fill="rgba(167,139,250,.22)" stroke={OPP} strokeWidth="2" />
          {MOUND.map((v, i) => (kind === 'dots' || LOW[i]) && <circle key={i} cx={x(i)} cy={y(v)} r={kind === 'dots' ? 3.5 : 5} fill={LOW[i] ? US : OPP} />)}
          {kind === 'dots' && MOUND.map((v, i) => <text key={i} x={x(i)} y={y(v) - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill={LOW[i] ? US : '#e5e7eb'}>{v}</text>)}
        </svg>
      )}
      {kind === 'cells' && (
        <span className="grid gap-1" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{MOUND.map((v, i) => (
          <span key={i} className="flex flex-col items-center rounded-md py-1" style={{ background: LOW[i] ? 'rgba(16,185,129,.14)' : `rgba(167,139,250,${0.1 + (v - 66) / 80})` }}>
            <span className="text-[10px]" style={{ color: W3 }}>{i + 1}</span><b className="font-display text-[12px]" style={{ color: LOW[i] ? US : W1 }}>{v}</b>
          </span>
        ))}</span>
      )}
      {kind === 'strip' && (
        <span className="flex flex-col gap-1">
          <span className="flex overflow-hidden rounded-md" style={{ height: 10 }}>{MOUND.map((v, i) => <i key={i} className="flex-1" style={{ background: LOW[i] ? US : `rgba(167,139,250,${0.2 + (v - 66) / 30})` }} />)}</span>
          <span className="grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{MOUND.map((v, i) => <b key={i} className="text-center font-display text-[11px]" style={{ color: LOW[i] ? US : W2 }}>{v}</b>)}</span>
        </span>
      )}
      {kind === 'table' && (
        <span className="flex flex-col">{MOUND.map((v, i) => (
          <span key={i} className="grid items-center py-1" style={{ gridTemplateColumns: '2.2rem 1fr 3rem', borderTop: i ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
            <span className="font-display text-t4" style={{ color: LOW[i] ? US : W3 }}>{i + 1}회</span>
            <span className="flex items-center gap-2"><span className="block overflow-hidden rounded-full" style={{ width: 120, height: 5, background: 'rgba(255,255,255,.08)' }}><i className="block h-full rounded-full" style={{ width: `${(v - 60) * 3}%`, background: LOW[i] ? US : OPP }} /></span><span className="text-[11px]" style={{ color: W3 }}>{MOUND_NAMES[i]}</span></span>
            <b className="text-right font-display text-t4" style={{ color: LOW[i] ? US : W1 }}>{v}</b>
          </span>
        ))}</span>
      )}
      {kind !== 'table' && <>
        <i className="my-1 block h-px bg-white/[0.07]" />
        <b className="text-t3" style={{ color: W1 }}>상대 성향</b>
        <span style={{ height: 150 }} className="rounded-lg bg-white/[0.02]" />
      </>}
    </aside>
  );
}

const CENTER = {
  1: ['기본 — 왼쪽 칸 + 수치 한 줄', 'cells', () => <Center2 limit="lead" stat="line" />],
  2: ['도구 띠 + 막대 수치', 'dots', () => <Center2 limit="none" stat="bars" toolbar mixTop rows={3} />],
  3: ['선발 막대 안 조절', 'strip', () => <Center2 limit="bubble" stat="line" />],
  4: ['카드형 투수 칸', 'cells', () => <Center2 limit="lead" stat="bars" tall />],
  5: ['최소 — 힘 숫자 하나', 'dots', () => <Center2 limit="chip" stat="arm" />],
  6: ['세 줄 수치', 'strip', () => <Center2 limit="lead" stat="stack" tall />],
  7: ['도구 띠(끊는 기준 · 배합)', 'cells', () => <Center2 limit="none" stat="line" toolbar mixTop />],
  8: ['왼쪽 상대 마운드 표', 'table', () => <Center2 limit="lead" stat="line" />],
};

function App() {
  const [t, left, Center] = CENTER[V];
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex h-full flex-col gap-3 px-2.5 pb-2.5 pt-3">
        <div className="flex shrink-0 items-center gap-4 px-3" style={{ height: 70 }}><b className="text-t1 font-black text-white">경기 전 정비</b><span className="rounded-full px-3 py-1 text-t4 font-bold" style={{ color: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}66` }}>{V} · {t}</span></div>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
          <Left2 kind={left} />
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
            <div className="flex shrink-0 items-center gap-2 border-t border-white/[0.08] pt-3" style={{ height: 64 }}><span className="flex-1" /><span className="flex h-12 items-center rounded-lg px-4 text-t3 font-bold" style={{ color: '#d1d5db', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>◀ 이전</span><span className="mt-cut flex h-12 items-center gap-3 px-6" style={{ ...cut(12), minWidth: 288, justifyContent: 'center', background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}><span className="flex gap-1">{[1, 2, 3].map((i) => <i key={i} className="block h-1.5 rounded-full" style={{ width: i === 2 ? 16 : 6, background: i <= 2 ? '#1c1203' : 'rgba(28,18,3,.3)' }} />)}</span><b className="text-t2 font-black">다음 · 상황 대응 ▶</b></span></div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
