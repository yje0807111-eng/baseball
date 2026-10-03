/*
 * 정비 3단계 목업 (/mockups/prep-steps/?v=1~8&s=1~3) — ROADMAP 13 A안.
 * 왼쪽은 늘 상대 분석(전략을 짤 때 보며 짜는 판), 오른쪽 넓은 판이 단계마다 바뀐다: 1 라인업 → 2 경기 흐름 → 3 상황 대응 → 경기 시작.
 *  2 경기 흐름 — 효과가 확인된 것만(flow-sim · plan-sim): 선발 운용 · 필승조 이닝(7 · 8 · 9회 누구) · 볼 배합 · 증강 시점(3~8회, 그 이닝에 결정 하나로)
 *  3 상황 대응 — 팀에 따라 답이 갈리는 상황: 지친 선발(교체 · 맡기기) · 득점권 상대 강타자(승부 · 유인구 · 거르기) · 무사 1루(강공 · 히트앤런)
 *               + 늘 이득인 '7회 이후 1~2점 리드 → 센 불펜'은 기본으로 켜 둠
 * 8안(배치 · 단계 표시 · 2 · 3단계 그리는 법):
 *  1 위 탭       — 머리줄에 1 · 2 · 3 탭, 오른쪽 판 한 장. 2단계 = 이닝 줄(선발 · 필승조 · 증강 핀), 3단계 = 상황 카드 2 × 2
 *  2 아래 진행줄 — 판 아래 단계 막대 + 다음 단추(마법사형). 2단계 = 1~9회 세로 표, 3단계 = 상황 줄 + 고르는 칸
 *  3 리포트 왼쪽 — 왼쪽 상대 판이 단계마다 강조를 바꿈(1 상대 선발 · 2 상대 불펜 흐름 · 3 상대 강타자). 오른쪽은 1안과 같음
 *  4 거울 이닝   — 2단계에서 상대 흐름(상대 선발 지칠 이닝 · 불펜 약한 구간)과 우리 흐름을 위아래로 맞대 그림
 *  5 큰 카드     — 단계마다 큰 카드 넷(그림 · 이름 · 고르는 칸), 오른쪽 판 왼쪽에 세로 단계 표시
 *  6 작전판      — 2단계를 전광판처럼 9칸 표(칸마다 투수 · 증강 아이콘), 3단계를 상황 카드 묶음
 *  7 접는 칸     — 섹션을 접었다 펴는 한 줄씩(가장 촘촘), 단계 점 셋 + 큰 다음
 *  8 미리보기 기둥 — 오른쪽 판을 둘로: 고르는 칸 + 늘 보이는 예상 승률 · 흐름 미리보기
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { batterFam, pitchMix, repertoireOf, PITCHES, FAM_KO } from '../../src/engine/pitchSim.js';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const MYT = seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)), OPT = seriesTeam(pick(/^1997-ob/) || SERIES[9], seeded(3));
const ME = engineTeam(MYT), OP = engineTeam(OPT);
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;
const SP = ME.pitchers[0], PEN = ME.pitchers.slice(1).sort((a, b) => arm(b) - arm(a));
const GAP = Math.round(arm(PEN[0]) - arm(SP));
const OSP = OP.pitchers[0], OPEN = OP.pitchers.slice(1).sort((a, b) => arm(b) - arm(a));
const WEAK = { F: 0, B: 0, O: 0 }; OP.batters.forEach((b) => { const w = batterFam(b).weak; if (w) WEAK[w] += 1; });
const STARS = [...OP.batters].sort((a, b) => st(b, 'power') - st(a, 'power')).slice(0, 3);
const q = new URLSearchParams(location.search), V = Number(q.get('v') || 1), S = Number(q.get('s') || 1);
const MY = '#34d399', OPPC = '#f87171', GOLD = '#fbbf24', SKY = '#38bdf8', VIO = '#a78bfa', MUTE = '#94a3b8';
const STEPS = ['라인업', '경기 흐름', '상황 대응'];
const gi = GAP < 0 ? 0 : GAP < 7.5 ? 1 : 2;
const HOOK = [{ id: 'long', ko: '선발 길게', sub: '세 바퀴까지', d: 0 }, { id: 'two', ko: '두 바퀴 교체', sub: '18타자', d: [-4.3, 2.8, 2.6][gi] }, { id: 'quick', ko: '빠른 계투', sub: '위기면 바로', d: [-2.1, 3.4, 4.7][gi] }];
const HOOK_ON = HOOK.slice().sort((a, b) => b.d - a.d)[0].id;
const MIX = [{ id: 'mix', ko: '섞기', d: 0 }, { id: 'F', ko: '직구', d: WEAK.F >= 4 ? 0.1 : -1.4 }, { id: 'B', ko: '휘는 공', d: WEAK.B >= 4 ? 1.7 : -0.9 }, { id: 'O', ko: '떨어지는 공', d: -1.3 }];
const MIX_ON = MIX.slice().sort((a, b) => b.d - a.d)[0].id;
const LATE = [PEN[2], PEN[1], PEN[0]]; // 7 · 8 · 9회 — 가장 센 투수가 9회
const AUG_INN = 6;
const exitInn = HOOK_ON === 'long' ? 6.5 : HOOK_ON === 'two' ? 4.5 : 5;
const weakOff = (ME.batters.reduce((n, b) => n + st(b, 'contact') + st(b, 'power'), 0) / 18) < 82;
const SITS = [
  { id: 'tired', ko: '선발 체력 30 아래 · 주자 있음', side: '수비', opts: [['교체', GAP >= 0 ? 2.1 : -1.9], ['맡기기', 0]], on: GAP >= 0 ? 0 : 1 },
  { id: 'star', ko: `득점권 · ${STARS[0]?.name} 타석`, side: '수비', who: STARS[0], opts: [['승부', 0], ['유인구', weakOff ? 1.9 : -1.4], ['거르기', weakOff ? 0.4 : -2.0]], on: weakOff ? 1 : 0 },
  { id: 'n1', ko: '무사 1루', side: '공격', opts: [['강공', 0], ['히트앤런', 0.5]], on: 0 },
  { id: 'close', ko: '7회 이후 1~2점 리드', side: '수비', opts: [['센 불펜', 3.4], ['그대로', 0]], on: 0, fixed: true },
];
const WIN0 = 41, WIN = Math.round(WIN0 + HOOK.find((h) => h.id === HOOK_ON).d + MIX.find((m) => m.id === MIX_ON).d + 3.4);

/* ───── 조각 ───── */
const Chip = ({ t, c }) => <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-t4 font-bold" style={{ color: c, background: `${c}1f`, boxShadow: `inset 0 0 0 1px ${c}55` }}>{t}</span>;
const Lab = ({ t, a = MY, right }) => <div className="flex items-center gap-3"><p className="mt-lab" style={{ '--a': a }}>{t}</p>{right && <span className="ml-auto">{right}</span>}</div>;
const D = ({ d }) => (d == null ? null : <b className="font-display text-t4" style={{ color: Math.abs(d) < 0.5 ? '#6b7280' : d > 0 ? MY : OPPC }}>{Math.abs(d) < 0.05 ? '±0' : `${d > 0 ? '+' : ''}${d.toFixed(1)}%`}</b>);
const Opt = ({ ko, sub, d, on, rec, big, w }) => (
  <div className={`flex min-w-0 flex-col justify-center gap-0.5 rounded-xl px-3 ${big ? 'py-3.5' : 'py-2'}`} style={{ width: w, background: on ? 'linear-gradient(180deg,rgba(16,185,129,.18),rgba(16,185,129,.05))' : 'rgba(255,255,255,.04)', boxShadow: on ? 'inset 0 0 0 1.5px rgba(16,185,129,.7)' : 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
    <span className="flex items-center gap-2"><b className={`${big ? 'text-t2' : 'text-t3'} whitespace-nowrap text-white`}>{ko}</b><span className="ml-auto"><D d={d} /></span></span>
    {(sub || rec) && <span className="flex items-center gap-2">{sub && <small className="truncate text-t4 text-gray-400">{sub}</small>}{rec && <span className="ml-auto"><Chip t="추천" c={GOLD} /></span>}</span>}
  </div>
);
const Row = ({ children, cols, gap = 8 }) => <div className="grid" style={{ gridTemplateColumns: cols, gap }}>{children}</div>;
const Panel = ({ children, style, className = '' }) => <section className={`mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5 ${className}`} style={{ '--c': '22px', ...style }}>{children}</section>;
const Start = ({ label = '다음 ▶' }) => <button type="button" className="mt-btn pri lg" style={{ '--a': GOLD, minWidth: 220 }}>{label}</button>;
const nextLabel = S < 3 ? `다음 · ${STEPS[S]} ▶` : '경기 시작 ▶';

/* 상대 판 — 단계마다 강조(3안에서 크게) */
const MixBar = ({ p }) => { const mix = pitchMix(p); return <span className="flex h-2 overflow-hidden rounded-full">{repertoireOf(p).map((t, i) => <i key={t} className="block h-full" style={{ width: `${(mix[t] || 0) * 100}%`, background: ['#f87171', '#a78bfa', '#2dd4bf', '#60a5fa', '#fbbf24'][i % 5] }} />)}</span>; };
const OppStarter = () => (
  <div className="flex flex-col gap-2">
    <span className="flex items-center gap-3"><Portrait player={OSP} w={44} h={44} round t={OPPC} /><span className="min-w-0"><small className="block text-t4" style={{ color: OPPC }}>상대 선발 · {OSP.hand === 'L' ? '좌투' : '우투'} · 체력 {st(OSP, 'stamina', 90)}</small><b className="text-t2 text-white">{OSP.name}</b></span><b className="ml-auto font-display text-t1 text-white">{OSP.overall}</b></span>
    <MixBar p={OSP} />
    <span className="flex flex-wrap gap-x-3 text-t4 text-gray-400">{repertoireOf(OSP).map((t) => <span key={t}>{PITCHES[t].name} {Math.round((pitchMix(OSP)[t] || 0) * 100)}%</span>)}</span>
  </div>
);
const WeakBars = () => (
  <div className="flex flex-col gap-2">{Object.entries(WEAK).map(([f, n]) => (
    <span key={f} className="grid items-center gap-3" style={{ gridTemplateColumns: '7.5rem 1fr 1.5rem' }}><small className="whitespace-nowrap text-t3 text-gray-300">{FAM_KO[f]} 약함</small><i className="relative block h-1.5 rounded-full bg-white/[0.07]"><b className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(n / 9) * 100}%`, background: VIO }} /></i><b className="text-right font-display text-t2 text-white">{n}</b></span>
  ))}</div>
);
const OppPen = () => (
  <div className="flex flex-col gap-1.5">{OPEN.slice(0, 4).map((p) => <span key={p.id} className="flex items-center gap-2"><Portrait player={p} w={28} h={28} round t={OPPC} /><b className="truncate text-t3 text-white">{p.name}</b><span className="ml-auto font-display text-t3" style={{ color: arm(p) < 78 ? MY : '#e2e8f0' }}>{Math.round(arm(p))}</span></span>)}</div>
);
const Stars = () => (
  <div className="flex flex-col gap-1.5">{STARS.map((p) => <span key={p.id} className="flex items-center gap-2"><Portrait player={p} w={32} h={32} round t={OPPC} /><b className="truncate text-t3 text-white">{p.name}</b><small className="text-t4 text-gray-400">{p.position}</small><span className="ml-auto font-display text-t3 text-white">파워 {st(p, 'power')}</span></span>)}</div>
);
const MoundGap = () => (
  <div className="flex items-center gap-2 text-t3"><span className="text-gray-400">선발</span><b className="text-white">{SP.name}</b><span className="text-gray-500">·</span><span className="text-gray-400">불펜 최고</span><b className="text-white">{PEN[0]?.name}</b><b className="ml-auto font-display text-t1" style={{ color: GAP >= 0 ? MY : OPPC }}>{GAP >= 0 ? '+' : ''}{GAP}</b></div>
);
const WinLine = () => (
  <div className="flex flex-col gap-1.5"><span className="flex items-baseline justify-between"><small className="text-t3 font-bold text-gray-300">예상 승률</small><b className="font-display text-t2" style={{ color: MY }}>{WIN}% <span className="text-gray-500">:</span> <span style={{ color: OPPC }}>{100 - WIN}%</span></b></span><span className="flex h-2 overflow-hidden rounded-full"><i style={{ width: `${WIN}%`, background: MY }} /><i className="flex-1" style={{ background: OPPC }} /></span></div>
);
function OppPanel({ focus = false }) {
  const Sec = ({ t, children, hot }) => <div className="flex flex-col gap-2.5 rounded-xl p-3" style={hot ? { background: 'rgba(167,139,250,.08)', boxShadow: `inset 0 0 0 1px ${VIO}55` } : {}}><small className="text-t3 font-bold text-gray-300">{t}</small>{children}</div>;
  return (
    <Panel style={{ width: 360 }}>
      <Lab t="오늘 상대" a={VIO} right={<b className="font-display text-t1 text-white">{OPT.name.replace(/^\d+ /, '')}</b>} />
      <Sec t="상대 선발" hot={focus && S === 1}><OppStarter /></Sec>
      {(!focus || S !== 2) && <Sec t="타선 구종 약점" hot={focus && S === 1}><WeakBars /></Sec>}
      {focus && S === 2 && <Sec t="상대 불펜" hot><OppPen /></Sec>}
      {focus && S === 3 ? <Sec t="상대 강타자" hot><Stars /></Sec> : <Sec t="우리 마운드" hot={focus && S === 2}><MoundGap /></Sec>}
      <div className="mt-auto"><WinLine /></div>
    </Panel>
  );
}

/* ───── 1 라인업 ───── */
function Lineup({ compact }) {
  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl" style={{ background: 'url(ui/field-night.webp) center/cover', minHeight: compact ? 260 : 420 }}>
        {[['CF', 50, 12], ['LF', 18, 26], ['RF', 82, 26], ['SS', 36, 46], ['2B', 64, 46], ['3B', 22, 62], ['1B', 78, 62], ['C', 50, 88], ['DH', 86, 86]].map(([pos, x, y], i) => {
          const b = ME.batters.find((p) => p.position === pos) || ME.batters[i];
          return <span key={pos} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={{ left: `${x}%`, top: `${y}%` }}><Portrait player={b} w={compact ? 38 : 48} h={compact ? 38 : 48} round t={MY} /><b className="rounded bg-[#05080f]/80 px-1.5 text-t4 text-white">{b?.name}</b><small className="rounded bg-[#05080f]/70 px-1 text-[10px] text-gray-300">{pos}</small></span>;
        })}
      </div>
      <div className="flex w-[300px] flex-col gap-1.5">
        <small className="text-t3 font-bold text-gray-300">타순</small>
        {ME.batters.map((b, i) => (
          <div key={b.id} className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5"><b className="w-5 font-display text-t2 text-gray-400">{i + 1}</b><Portrait player={b} w={30} h={30} round t={MY} /><b className="truncate text-t3 text-white">{b.name}</b><small className="ml-auto text-t4 text-gray-400">{b.hand === 'L' ? '좌' : '우'} · {b.position}</small>{batterFam(b).weak && <span className="text-t4 text-gray-500">{FAM_KO[batterFam(b).weak]}↓</span>}</div>
        ))}
      </div>
    </div>
  );
}

/* ───── 2 경기 흐름 ───── */
const PenPick = ({ inn, p }) => (
  <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2"><b className="w-9 font-display text-t2" style={{ color: GOLD }}>{inn}회</b><Portrait player={p} w={30} h={30} round t={MY} /><b className="truncate text-t3 text-white">{p?.name}</b><span className="ml-auto font-display text-t3 text-gray-300">{Math.round(arm(p))}</span></div>
);
function FlowLanes({ mirror }) {
  const col = (x) => `${(x / 9) * 100}%`;
  const Lane = ({ t, a, children, h = 44 }) => <div className="grid items-center gap-3" style={{ gridTemplateColumns: '84px 1fr' }}><b className="text-t3" style={{ color: a }}>{t}</b><div className="relative rounded-lg bg-white/[0.03]" style={{ height: h }}>{children}</div></div>;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid gap-3" style={{ gridTemplateColumns: '84px 1fr' }}><span /><div className="grid text-center font-display text-t3 text-gray-400" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{Array.from({ length: 9 }, (_, i) => <span key={i}>{i + 1}회</span>)}</div></div>
      {mirror && <>
        <Lane t="상대 선발" a={OPPC}><i className="absolute inset-y-1.5 left-1 rounded-md" style={{ width: col(6), background: 'rgba(248,113,113,.25)' }} /><b className="absolute inset-y-0 left-3 flex items-center text-t4 text-white">{OSP.name}</b><span className="absolute inset-y-0 flex items-center text-t4" style={{ left: col(5), color: GOLD }}>체력 ↓</span></Lane>
        <Lane t="상대 불펜" a={OPPC}>{[6, 7, 8].map((x, i) => <span key={x} className="absolute inset-y-1.5 flex items-center justify-center rounded-md text-t4 text-white" style={{ left: col(x), width: `calc(${col(1)} - 4px)`, background: arm(OPEN[3 - i] || OPEN[0]) < 78 ? 'rgba(52,211,153,.25)' : 'rgba(248,113,113,.2)' }}>{(OPEN[3 - i] || OPEN[0])?.name}</span>)}</Lane>
        <i className="block h-px bg-white/10" />
      </>}
      <Lane t="우리 선발" a={MY}><i className="absolute inset-y-1.5 left-1 rounded-md" style={{ width: `calc(${col(exitInn)} - 4px)`, background: 'linear-gradient(90deg,rgba(52,211,153,.45),rgba(52,211,153,.15))' }} /><span className="absolute inset-y-0 left-3 flex items-center gap-2"><Portrait player={SP} w={28} h={28} round t={MY} /><b className="text-t4 text-white">{SP.name}</b></span><i className="absolute inset-y-0 w-[2px]" style={{ left: col(exitInn), background: GOLD }} /></Lane>
      <Lane t="필승조" a={MY}>{LATE.map((p, i) => <span key={i} className="absolute inset-y-1.5 flex items-center justify-center gap-1 rounded-md px-1 text-t4 text-white" style={{ left: col(6 + i), width: `calc(${col(1)} - 4px)`, background: 'rgba(96,165,250,.2)' }}><Portrait player={p} w={22} h={22} round t={MY} /><b className="truncate">{p?.name}</b></span>)}</Lane>
      <Lane t="증강" a={VIO}><span className="absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-t4 font-black" style={{ left: col(AUG_INN - 0.5), background: VIO, color: '#1c1203' }}>✦</span>{[3, 4, 5, 7, 8].map((x) => <i key={x} className="absolute top-1/2 block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20" style={{ left: col(x - 0.5) }} />)}</Lane>
    </div>
  );
}
function FlowPicks({ cols = 3, big }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2"><small className="text-t3 font-bold text-gray-300">선발 운용</small><Row cols={`repeat(${cols},minmax(0,1fr))`}>{HOOK.map((o) => <Opt key={o.id} {...o} big={big} on={o.id === HOOK_ON} rec={o.id === HOOK_ON} />)}</Row></div>
      <div className="flex flex-col gap-2"><small className="text-t3 font-bold text-gray-300">볼 배합</small><Row cols="repeat(4,minmax(0,1fr))">{MIX.map((o) => <Opt key={o.id} {...o} big={big} on={o.id === MIX_ON} rec={o.id === MIX_ON && o.d > 0.5} />)}</Row></div>
    </div>
  );
}

/* ───── 3 상황 대응 ───── */
function SitCard({ s, wide }) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] p-4" style={{ background: 'rgba(10,14,24,.72)', boxShadow: s.fixed ? `inset 0 0 0 1.5px ${SKY}88` : 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
      <span className="flex items-center gap-2"><Chip t={s.side} c={s.side === '공격' ? MY : SKY} />{s.who && <Portrait player={s.who} w={28} h={28} round t={OPPC} />}<b className="truncate text-t2 text-white">{s.ko}</b>{s.fixed && <span className="ml-auto"><Chip t="기본" c={SKY} /></span>}</span>
      <Row cols={wide ? `repeat(${s.opts.length},minmax(0,1fr))` : `repeat(${s.opts.length},minmax(0,1fr))`}>{s.opts.map(([ko, d], i) => <Opt key={ko} ko={ko} d={d} on={i === s.on} rec={i === s.on && d > 0.5} />)}</Row>
    </div>
  );
}

/* ───── 단계 표시 ───── */
const Tabs = () => <div className="flex items-center gap-2">{STEPS.map((t, i) => <a key={t} href={`/mockups/prep-steps/?v=${V}&s=${i + 1}`} className="rounded-xl px-4 py-2 text-t3 font-bold" style={i + 1 === S ? { background: GOLD, color: '#1c1203' } : { background: 'rgba(255,255,255,.06)', color: '#d1d5db' }}>{i + 1} {t}</a>)}</div>;
const Stepper = ({ vertical }) => (
  <div className={`flex ${vertical ? 'flex-col' : 'items-center'} gap-3`}>
    {STEPS.map((t, i) => { const done = i + 1 < S, on = i + 1 === S; return (
      <a key={t} href={`/mockups/prep-steps/?v=${V}&s=${i + 1}`} className="flex items-center gap-2.5">
        <b className="grid h-9 w-9 place-items-center rounded-full font-display text-t2" style={{ background: on ? GOLD : done ? 'rgba(52,211,153,.25)' : 'rgba(255,255,255,.06)', color: on ? '#1c1203' : done ? MY : '#9ca3af' }}>{done ? '✓' : i + 1}</b>
        <b className="text-t3" style={{ color: on ? '#fff' : '#9ca3af' }}>{t}</b>
        {!vertical && i < 2 && <i className="mx-1 block h-px w-10 bg-white/15" />}
      </a>
    ); })}
  </div>
);
const Dots = () => <div className="flex items-center gap-2">{STEPS.map((t, i) => <i key={t} className="block h-2.5 rounded-full" style={{ width: i + 1 === S ? 28 : 10, background: i + 1 === S ? GOLD : 'rgba(255,255,255,.2)' }} />)}<b className="ml-2 text-t3 text-white">{STEPS[S - 1]}</b></div>;

/* ───── 단계 내용(안마다 그리는 법) ───── */
function StepBody({ kind }) {
  if (S === 1) return <Lineup compact={kind === 'compact'} />;
  if (S === 2) {
    if (kind === 'table') return (
      <div className="flex min-h-0 flex-1 gap-5">
        <div className="flex flex-1 flex-col gap-1.5">{Array.from({ length: 9 }, (_, i) => { const inn = i + 1, sp = inn <= Math.floor(exitInn), pen = LATE[inn - 7]; return (
          <div key={inn} className="grid items-center gap-3 rounded-lg px-3 py-1.5" style={{ gridTemplateColumns: '3rem 1fr 1fr 5rem', background: inn === AUG_INN ? 'rgba(167,139,250,.1)' : 'rgba(255,255,255,.03)' }}>
            <b className="font-display text-t2 text-gray-300">{inn}회</b>
            <span className="flex items-center gap-2">{sp ? <><Portrait player={SP} w={24} h={24} round t={MY} /><b className="text-t3 text-white">{SP.name}</b></> : pen ? <><Portrait player={pen} w={24} h={24} round t={MY} /><b className="text-t3 text-white">{pen.name}</b><Chip t="필승조" c={SKY} /></> : <b className="text-t3 text-gray-400">불펜</b>}</span>
            <span className="text-t4 text-gray-400">{inn >= 7 ? '센 불펜 조건' : ''}</span>
            <span>{inn === AUG_INN && <Chip t="✦ 증강" c={VIO} />}</span>
          </div>
        ); })}</div>
        <div className="w-[420px]"><FlowPicks cols={3} /></div>
      </div>
    );
    if (kind === 'cards') return (
      <div className="grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
        {[['선발 운용', <Row cols="repeat(3,minmax(0,1fr))">{HOOK.map((o) => <Opt key={o.id} {...o} big on={o.id === HOOK_ON} rec={o.id === HOOK_ON} />)}</Row>, 'ui/clutch-mound.webp'],
          ['필승조 이닝', <div className="flex flex-col gap-1.5">{LATE.map((p, i) => <PenPick key={i} inn={7 + i} p={p} />)}</div>, null],
          ['볼 배합', <Row cols="repeat(2,minmax(0,1fr))">{MIX.map((o) => <Opt key={o.id} {...o} big on={o.id === MIX_ON} />)}</Row>, null],
          ['증강 시점', <div className="flex gap-2">{[3, 4, 5, 6, 7, 8].map((x) => <b key={x} className="grid h-12 flex-1 place-items-center rounded-xl font-display text-t2" style={x === AUG_INN ? { background: VIO, color: '#1c1203' } : { background: 'rgba(255,255,255,.05)', color: '#d1d5db' }}>{x}회</b>)}</div>, null]].map(([t, body]) => (
          <div key={t} className="flex flex-col gap-3 rounded-[20px] p-5" style={{ background: 'rgba(10,14,24,.72)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}><Lab t={t} a={t === '증강 시점' ? VIO : MY} />{body}</div>
        ))}
      </div>
    );
    if (kind === 'board') return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-1 rounded-2xl p-3" style={{ gridTemplateColumns: '90px repeat(9,1fr)', background: 'rgba(0,0,0,.35)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
          <span />{Array.from({ length: 9 }, (_, i) => <b key={i} className="text-center font-display text-t2 text-gray-400">{i + 1}</b>)}
          <b className="text-t3" style={{ color: MY }}>마운드</b>
          {Array.from({ length: 9 }, (_, i) => { const inn = i + 1, p = inn <= Math.floor(exitInn) ? SP : LATE[inn - 7] || PEN[3]; return <span key={i} className="grid h-16 place-items-center rounded-lg" style={{ background: inn <= Math.floor(exitInn) ? 'rgba(52,211,153,.12)' : 'rgba(96,165,250,.12)' }}><Portrait player={p} w={30} h={30} round t={MY} /><small className="truncate text-[10px] text-gray-300">{p?.name}</small></span>; })}
          <b className="text-t3" style={{ color: VIO }}>증강</b>
          {Array.from({ length: 9 }, (_, i) => <span key={i} className="grid h-10 place-items-center rounded-lg" style={{ background: i + 1 === AUG_INN ? VIO : 'rgba(255,255,255,.03)', color: '#1c1203' }}>{i + 1 === AUG_INN ? '✦' : ''}</span>)}
        </div>
        <FlowPicks cols={3} />
      </div>
    );
    if (kind === 'accordion') return (
      <div className="flex flex-col gap-2">
        {[['선발 운용', HOOK.find((h) => h.id === HOOK_ON).ko, true], ['필승조 이닝', LATE.map((p) => p?.name).join(' → ')], ['볼 배합', MIX.find((m) => m.id === MIX_ON).ko], ['증강 시점', `${AUG_INN}회`]].map(([t, v, open]) => (
          <div key={t} className="flex flex-col gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,.04)', boxShadow: open ? `inset 0 0 0 1px ${MY}66` : 'none' }}>
            <span className="flex items-center gap-3"><b className="text-t2 text-white">{t}</b><span className="ml-auto text-t3" style={{ color: GOLD }}>{v}</span><b className="text-gray-400">{open ? '▴' : '▾'}</b></span>
            {open && <Row cols="repeat(3,minmax(0,1fr))">{HOOK.map((o) => <Opt key={o.id} {...o} big on={o.id === HOOK_ON} rec={o.id === HOOK_ON} />)}</Row>}
          </div>
        ))}
        <div className="mt-2"><FlowLanes /></div>
      </div>
    );
    return (
      <div className="flex flex-col gap-5">
        <FlowLanes mirror={kind === 'mirror'} />
        <Row cols="1.4fr 1fr"><FlowPicks cols={3} /><div className="flex flex-col gap-2"><small className="text-t3 font-bold text-gray-300">필승조 이닝</small>{LATE.map((p, i) => <PenPick key={i} inn={7 + i} p={p} />)}</div></Row>
      </div>
    );
  }
  if (kind === 'list' || kind === 'accordion') return (
    <div className="flex flex-col gap-2">{SITS.map((s) => (
      <div key={s.id} className="grid items-center gap-4 rounded-xl px-4 py-3" style={{ gridTemplateColumns: '1.3fr 2fr', background: 'rgba(255,255,255,.04)', boxShadow: s.fixed ? `inset 0 0 0 1px ${SKY}66` : 'none' }}>
        <span className="flex items-center gap-2"><Chip t={s.side} c={s.side === '공격' ? MY : SKY} />{s.who && <Portrait player={s.who} w={28} h={28} round t={OPPC} />}<b className="truncate text-t2 text-white">{s.ko}</b></span>
        <Row cols={`repeat(${s.opts.length},minmax(0,1fr))`}>{s.opts.map(([ko, d], i) => <Opt key={ko} ko={ko} d={d} on={i === s.on} rec={i === s.on && d > 0.5} />)}</Row>
      </div>
    ))}</div>
  );
  if (kind === 'board') return (
    <div className="flex flex-1 items-center justify-center gap-5">
      {SITS.map((s, i) => (
        <div key={s.id} className="flex w-[300px] flex-col gap-3 rounded-[22px] p-5" style={{ transform: `rotate(${(i - 1.5) * 2}deg)`, background: 'linear-gradient(180deg,#141a2a,#0b0f1a)', boxShadow: `inset 0 0 0 1.5px ${i === 1 ? GOLD : 'rgba(255,255,255,.12)'}, 0 20px 40px -20px #000` }}>
          <Chip t={s.side} c={s.side === '공격' ? MY : SKY} /><b className="text-t2 text-white">{s.ko}</b>
          <div className="flex flex-col gap-1.5">{s.opts.map(([ko, d], j) => <Opt key={ko} ko={ko} d={d} on={j === s.on} rec={j === s.on && d > 0.5} />)}</div>
        </div>
      ))}
    </div>
  );
  return <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>{SITS.map((s) => <SitCard key={s.id} s={s} />)}</div>;
}

/* ───── 안마다 배치 ───── */
function Shell({ nav, foot, side, kind, focus }) {
  return (
    <div className="flex min-h-0 flex-1 gap-5 px-7 pb-6">
      <OppPanel focus={focus} />
      <Panel className="flex-1">
        <div className="flex items-center gap-4"><Lab t={STEPS[S - 1]} a={GOLD} />{nav}</div>
        <div className="flex min-h-0 flex-1 gap-5">
          {side && <div className="w-[200px] shrink-0 border-r border-white/10 pr-4">{side}</div>}
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <StepBody kind={kind} />
          </div>
        </div>
        {foot || <div className="flex items-center justify-end"><Start label={nextLabel} /></div>}
      </Panel>
    </div>
  );
}
function V8() {
  return (
    <div className="flex min-h-0 flex-1 gap-5 px-7 pb-6">
      <OppPanel />
      <Panel className="flex-1">
        <div className="flex items-center gap-4"><Stepper /></div>
        <div className="flex min-h-0 flex-1 gap-5">
          <div className="flex min-h-0 flex-1 flex-col gap-4"><StepBody kind={S === 2 ? 'cards' : 'grid'} /></div>
          <div className="flex w-[360px] shrink-0 flex-col gap-4 rounded-2xl p-4" style={{ background: 'rgba(0,0,0,.3)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
            <Lab t="미리보기" a={SKY} /><WinLine /><small className="text-t3 font-bold text-gray-300">경기 흐름</small>
            <div className="grid text-center font-display text-t4 text-gray-500" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{Array.from({ length: 9 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
            <div className="relative h-5 rounded bg-white/[0.04]"><i className="absolute inset-y-0 left-0 rounded" style={{ width: `${(exitInn / 9) * 100}%`, background: 'rgba(52,211,153,.4)' }} />{LATE.map((p, i) => <b key={i} className="absolute inset-y-0 flex items-center justify-center truncate text-[10px] text-white" style={{ left: `${((6 + i) / 9) * 100}%`, width: `${100 / 9}%` }}>{p?.name}</b>)}</div>
            <span className="flex items-center gap-2 text-t3"><Chip t={`✦ ${AUG_INN}회 증강`} c={VIO} /><Chip t="7회+ 센 불펜" c={SKY} /></span>
            <div className="mt-auto"><Start label={nextLabel} /></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
const NAMES = ['위 탭', '아래 진행줄', '리포트 왼쪽', '거울 이닝', '큰 카드', '작전판', '접는 칸', '미리보기 기둥'];
function Body() {
  if (V === 1) return <Shell nav={<span className="ml-auto"><Tabs /></span>} kind="lanes" />;
  if (V === 2) return <Shell nav={null} kind={S === 2 ? 'table' : 'list'} foot={<div className="flex items-center gap-4"><Stepper /><span className="ml-auto"><Start label={nextLabel} /></span></div>} />;
  if (V === 3) return <Shell nav={<span className="ml-auto"><Tabs /></span>} kind="lanes" focus />;
  if (V === 4) return <Shell nav={<span className="ml-auto"><Tabs /></span>} kind="mirror" focus />;
  if (V === 5) return <Shell nav={null} side={<Stepper vertical />} kind={S === 2 ? 'cards' : 'grid'} />;
  if (V === 6) return <Shell nav={<span className="ml-auto"><Tabs /></span>} kind="board" />;
  if (V === 7) return <Shell nav={<span className="ml-auto"><Dots /></span>} kind={S === 1 ? 'compact' : 'accordion'} />;
  return <V8 />;
}
function App() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle /><GlassBg tint={MY} />
      <header className="relative flex h-[4.75rem] shrink-0 items-center gap-5 px-7">
        <button type="button" className="mt-cut grid h-11 w-11 place-items-center bg-white/[0.07] text-t2" style={{ '--c': '12px' }}>←</button>
        <div className="leading-none"><p className="text-t4 font-bold text-gray-400">플레이</p><b className="text-t1 font-black text-white">경기 전 정비</b></div>
        <span className="ml-6 flex items-center gap-1.5">{NAMES.map((n, i) => <a key={n} href={`/mockups/prep-steps/?v=${i + 1}&s=${S}`} className="rounded-full px-2.5 py-1 text-t4 font-bold" style={i + 1 === V ? { background: GOLD, color: '#1c1203' } : { background: 'rgba(255,255,255,.06)', color: '#d1d5db' }}>{i + 1} {n}</a>)}</span>
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col"><Body /></div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
