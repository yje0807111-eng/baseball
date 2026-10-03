/*
 * 경기 전 설계 목업 (/mockups/plan-prep/?v=1~4) — ROADMAP 12. 정비에서 상대를 분석해 경기 흐름을 설계하고, 경기 중 결정은 3~4번.
 * 설계 셋 + 조건 지시(plan-sim 6,000경기로 고른 것만 — 승률을 움직이고, 답이 팀 · 상대마다 갈리는 것):
 *  선발 운용 — 길게 · 두 바퀴(18타자) · 빠른 계투: 우리 불펜이 선발보다 약하면 길게, 훨씬 세면 빠른 계투(−4.3 ~ +4.7%p)
 *  볼 배합   — 섞기 · 직구 · 휘는 공 · 떨어지는 공: 상대 타선이 약한 계열(휘는 공 약한 타선 +1.7%p)
 *  공격 성향 — 강공 · 짧게 치기 · 기동력 · 기다리기(지금 정비와 같음)
 *  조건 지시 — 두 칸: 7회 이후 리드면 센 불펜(+3.5%p) · 상대 최고 장타자 득점권 거르기 · 8회 이후 뒤지면 노림수 …
 * 4안:
 *  1 오른쪽 설계 판 — 지금 정비 배치 그대로, 오른쪽 '작전'이 '설계'로(분석은 왼쪽 판에 더한다)
 *  2 설계 탭        — 가운데를 라인업 ↔ 설계로 바꿔 큰 카드 셋 + 조건 두 칸, 고를 때마다 위 예상 승률이 움직인다
 *  3 흐름 설계도    — 1~9회 줄 위에 선발 · 불펜 · 조건이 언제 들어가는지 그린다(경기를 미리 그려 보기)
 *  4 분석 리포트    — 상대 타자 아홉의 약점 칸 · 상대 선발 구종 · 우리 선발과 불펜 차이를 크게, 오른쪽에 추천 설계
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
const OSP = OP.pitchers[0];
const WEAK = { F: 0, B: 0, O: 0 }; OP.batters.forEach((b) => { const w = batterFam(b).weak; if (w) WEAK[w] += 1; });
const MYFAM = new Set(repertoireOf(SP).map((t) => PITCHES[t].fam));
/* 추천은 승률이 가장 오르는 칸(plan-sim 그룹 값) — 우리 선발이 그 계열 공이 없으면 빼고 */
const HOOK_REC = GAP < 0 ? 'long' : GAP < 15 ? 'two' : 'quick';
const v = Number(new URLSearchParams(location.search).get('v') || 1);
const MY = '#34d399', OPPC = '#f87171', GOLD = '#fbbf24', SKY = '#38bdf8', MUTE = '#94a3b8', VIO = '#a78bfa';

/* 설계 값 — 고른 것(목업은 추천으로 시작) · Δ 는 plan-sim 그룹 값 */
const HOOK = [
  { id: 'long', ko: '선발 길게', sub: '세 바퀴까지', d: GAP < 0 ? 0 : -2.6 },
  { id: 'two', ko: '두 바퀴 교체', sub: '18타자에서 불펜', d: GAP < 0 ? -4.3 : GAP < 15 ? 2.8 : 2.6 },
  { id: 'quick', ko: '빠른 계투', sub: '위기면 바로', d: GAP < 0 ? -2.1 : GAP < 15 ? 3.4 : 4.7 },
];
const MIX = [
  { id: 'mix', ko: '섞기', sub: '투수 배합대로', d: 0 },
  { id: 'F', ko: '직구 위주', sub: `직구 약한 타자 ${WEAK.F}`, d: WEAK.F >= 4 ? 0.1 : -1.4 },
  { id: 'B', ko: '휘는 공 위주', sub: `휘는 공 약한 타자 ${WEAK.B}`, d: WEAK.B >= 4 ? 1.7 : -0.9 },
  { id: 'O', ko: '떨어지는 공 위주', sub: `떨어지는 공 약한 타자 ${WEAK.O}`, d: -1.3 },
];
const MIX_REC = MIX.filter((m) => m.id === 'mix' || MYFAM.has(m.id)).sort((a, b) => b.d - a.d)[0].id;
const OFF = [{ id: 'big', ko: '강공', sub: '장타 ↑' }, { id: 'contact', ko: '짧게 치기', sub: '삼진 ↓' }, { id: 'speed', ko: '기동력', sub: '진루 ↑' }, { id: 'onbase', ko: '기다리기', sub: '볼넷 ↑' }];
const CONDS = [
  { id: 'close', ko: '7회 이후 리드', act: `센 불펜 · ${PEN[0]?.name}`, d: 3.5, on: true },
  { id: 'walk', ko: `득점권 · ${[...OP.batters].sort((a, b) => st(b, 'power') - st(a, 'power'))[0]?.name}`, act: '거르기', d: -0.8, on: true },
  { id: 'swing', ko: '8회 이후 뒤짐', act: '노림수', d: -0.1 },
  { id: 'steal', ko: '1루 주자 주력 85+', act: '도루', d: 0 },
];
const BASE_WP = 41;
const pickedWp = BASE_WP + HOOK.find((h) => h.id === HOOK_REC).d + (MIX.find((m) => m.id === MIX_REC)?.d || 0) + 3.5 - 0.8;

const Chip = ({ t, c }) => <span className="rounded-full px-2.5 py-0.5 text-t4 font-bold" style={{ color: c, background: `${c}1f`, boxShadow: `inset 0 0 0 1px ${c}55` }}>{t}</span>;
const Lab = ({ t, a = MY, right }) => <div className="flex items-center"><p className="mt-lab" style={{ '--a': a }}>{t}</p>{right && <span className="ml-auto">{right}</span>}</div>;
const delta = (d) => (d ? <b className="font-display text-t3" style={{ color: d > 0 ? MY : OPPC }}>{d > 0 ? '+' : ''}{d.toFixed(1)}%</b> : <b className="font-display text-t3 text-gray-500">±0</b>);
/** 고르기 칸 — 지금 정비 작전 칸과 같은 모양(유리 · 고르면 초록 테두리) + 추천 칩 · 승률 변화 */
const Opt = ({ o, on, rec, big }) => (
  <div className={`flex flex-col gap-1 rounded-xl px-3.5 ${big ? 'py-4' : 'py-2.5'}`} style={{ background: on ? 'linear-gradient(180deg,rgba(16,185,129,.18),rgba(16,185,129,.05))' : 'rgba(255,255,255,.04)', boxShadow: on ? 'inset 0 0 0 1.5px rgba(16,185,129,.7)' : 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
    <span className="flex items-center gap-2"><b className={`${big ? 'text-t2' : 'text-t3'} whitespace-nowrap text-white`}>{o.ko}</b><span className="ml-auto">{o.d != null && delta(o.d)}</span></span>
    <span className="flex items-center gap-2"><small className="truncate text-t4 text-gray-400">{o.sub}</small>{rec && <span className="ml-auto shrink-0"><Chip t="추천" c={GOLD} /></span>}</span>
  </div>
);
const WinHead = () => (
  <div className="flex items-center gap-3">
    <small className="text-t3 text-gray-400">예상 승률</small>
    <b className="font-display text-t2 text-gray-500">{BASE_WP}%</b><b className="text-gray-500">→</b>
    <b className="font-display text-t1" style={{ color: MY }}>{pickedWp.toFixed(0)}%</b>
  </div>
);
/* 상대 분석 조각 — 타선 약점 막대 · 우리 선발 vs 불펜 */
const WeakBars = () => (
  <div className="flex flex-col gap-2">
    {Object.entries(WEAK).map(([f, n]) => (
      <span key={f} className="grid items-center gap-3" style={{ gridTemplateColumns: '118px 1fr 24px' }}>
        <small className="whitespace-nowrap text-t3 text-gray-300">{FAM_KO[f]} 약함</small>
        <i className="relative block h-2 rounded-full bg-white/[0.07]"><b className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(n / 9) * 100}%`, background: f === MIX_REC ? GOLD : VIO }} /></i>
        <b className="text-right font-display text-t2 text-white">{n}</b>
      </span>
    ))}
  </div>
);
const ArmGap = () => (
  <div className="flex items-center gap-3">
    <span className="flex items-center gap-2"><Portrait player={SP} w={40} h={40} round t={MY} /><span><small className="block text-t4 text-gray-400">선발</small><b className="text-t3 text-white">{SP.name}</b></span></span>
    <b className="font-display text-t2" style={{ color: GAP >= 0 ? MY : OPPC }}>{GAP >= 0 ? '< ' : '> '}</b>
    <span className="flex items-center gap-2"><Portrait player={PEN[0]} w={40} h={40} round t={MY} /><span><small className="block text-t4 text-gray-400">불펜 최고</small><b className="text-t3 text-white">{PEN[0]?.name}</b></span></span>
    <b className="ml-auto font-display text-t1" style={{ color: GAP >= 0 ? MY : OPPC }}>{GAP >= 0 ? '+' : ''}{GAP}</b>
  </div>
);
const OppStarter = () => {
  const mix = pitchMix(OSP);
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-3"><Portrait player={OSP} w={44} h={44} round t={OPPC} /><span><small className="block text-t4" style={{ color: OPPC }}>상대 선발 · {OSP.hand === 'L' ? '좌투' : '우투'}</small><b className="text-t2 text-white">{OSP.name}</b></span><b className="ml-auto font-display text-t1 text-white">{OSP.overall}</b></span>
      <span className="flex h-2.5 overflow-hidden rounded-full">{repertoireOf(OSP).map((t, i) => <i key={t} className="block h-full" style={{ width: `${(mix[t] || 0) * 100}%`, background: ['#f87171', '#a78bfa', '#2dd4bf', '#60a5fa', '#fbbf24'][i % 5] }} />)}</span>
      <span className="flex flex-wrap gap-x-3 text-t4 text-gray-400">{repertoireOf(OSP).map((t) => <span key={t}>{PITCHES[t].name} {Math.round((pitchMix(OSP)[t] || 0) * 100)}%</span>)}</span>
    </div>
  );
};
const CondRow = ({ c }) => (
  <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: c.on ? 'rgba(56,189,248,.08)' : 'rgba(255,255,255,.03)', boxShadow: c.on ? `inset 0 0 0 1.5px ${SKY}88` : 'inset 0 0 0 1px rgba(255,255,255,.06)', opacity: c.on ? 1 : 0.6 }}>
    <b className="text-t3 text-white">{c.ko}</b><b className="text-gray-500">→</b><b className="text-t3" style={{ color: SKY }}>{c.act}</b><span className="ml-auto">{delta(c.d)}</span>
  </div>
);
const Panel = ({ children, className = '', style }) => <section className={`mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5 ${className}`} style={{ '--c': '22px', ...style }}>{children}</section>;
const Header = () => (
  <header className="flex h-[4.75rem] shrink-0 items-center gap-5 px-7">
    <button type="button" className="mt-cut grid h-11 w-11 place-items-center bg-white/[0.07] text-t2" style={{ '--c': '12px' }}>←</button>
    <div className="leading-none"><p className="text-t4 font-bold text-gray-400">플레이</p><b className="text-t1 font-black text-white">경기 전 정비</b></div>
    <div className="ml-6 flex items-center gap-2">{[1, 2, 3, 4].map((k) => <a key={k} href={`/mockups/plan-prep/?v=${k}`} className="rounded-full px-3 py-1 text-t3 font-bold" style={k === v ? { background: GOLD, color: '#1c1203' } : { background: 'rgba(255,255,255,.06)', color: '#d1d5db' }}>{k} {['오른쪽 설계 판', '설계 탭', '흐름 설계도', '분석 리포트'][k - 1]}</a>)}</div>
    <span className="ml-auto"><WinHead /></span>
  </header>
);
const Start = () => <button type="button" className="mt-btn pri lg w-full" style={{ '--a': GOLD }}>경기 시작 ▶</button>;
const Lineup = () => (
  <div className="grid  gap-2" style={{ gridTemplateColumns: 'repeat(9,minmax(0,1fr))' }}>{ME.batters.map((b, i) => (
    <div key={b.id} className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.04] py-3"><b className="font-display text-t2 text-gray-400">{i + 1}</b><Portrait player={b} w={52} h={52} round t={MY} /><b className="truncate text-t4 text-white">{b.name}</b><small className="text-t4 text-gray-400">{b.position}</small></div>
  ))}</div>
);

function V1() {
  return (
    <div className="grid min-h-0 flex-1 gap-5 px-7 pb-6" style={{ gridTemplateColumns: '340px 1fr 430px' }}>
      <Panel>
        <Lab t="오늘 상대" a={VIO} right={<b className="font-display text-t1 text-white">{OPT.name.slice(0, 12)}</b>} />
        <OppStarter />
        <i className="h-px bg-white/10" />
        <Lab t="상대 타선 약점" a={VIO} />
        <WeakBars />
        <i className="h-px bg-white/10" />
        <Lab t="우리 마운드" a={MY} />
        <ArmGap />
      </Panel>
      <Panel><Lab t="라인업" /><div className="grid flex-1 place-items-center rounded-2xl" style={{ background: 'url(ui/field-night.webp) center/cover' }}><span className="text-t3 text-gray-300">(지금 다이아몬드 배치 그대로)</span></div><Lineup /></Panel>
      <Panel>
        <Lab t="설계" a={GOLD} />
        <small className="text-t4 font-bold text-gray-400">선발 운용</small>
        <div className="grid  gap-2" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>{HOOK.map((o) => <Opt key={o.id} o={o} on={o.id === HOOK_REC} rec={o.id === HOOK_REC} />)}</div>
        <small className="text-t4 font-bold text-gray-400">볼 배합</small>
        <div className="grid  gap-2" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>{MIX.map((o) => <Opt key={o.id} o={o} on={o.id === MIX_REC} rec={o.id === MIX_REC} />)}</div>
        <small className="text-t4 font-bold text-gray-400">공격 성향</small>
        <div className="grid  gap-2" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>{OFF.map((o, i) => <Opt key={o.id} o={{ ...o, d: null }} on={i === 0} />)}</div>
        <small className="text-t4 font-bold text-gray-400">조건 지시 · 2칸</small>
        <div className="flex flex-col gap-2">{CONDS.slice(0, 2).map((c) => <CondRow key={c.id} c={c} />)}</div>
        <div className="mt-auto"><Start /></div>
      </Panel>
    </div>
  );
}
function V2() {
  const Card = ({ t, a, children }) => <div className="flex min-h-0 flex-col gap-3 rounded-[20px] p-5" style={{ background: 'rgba(10,14,24,.78)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}><Lab t={t} a={a} />{children}</div>;
  return (
    <div className="grid min-h-0 flex-1 gap-5 px-7 pb-6" style={{ gridTemplateColumns: '340px 1fr' }}>
      <Panel>
        <Lab t="오늘 상대" a={VIO} />
        <b className="text-t2 text-white">{OPT.name}</b>
        <OppStarter /><i className="h-px bg-white/10" /><WeakBars /><i className="h-px bg-white/10" /><ArmGap />
        <div className="mt-auto"><Start /></div>
      </Panel>
      <Panel>
        <div className="flex items-center gap-2">
          {['라인업', '설계'].map((t, i) => <b key={t} className="rounded-xl px-5 py-2 text-t2" style={i ? { background: GOLD, color: '#1c1203' } : { background: 'rgba(255,255,255,.06)', color: '#d1d5db' }}>{t}</b>)}
        </div>
        <div className="grid min-h-0 flex-1  gap-4" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <Card t="선발 운용" a={MY}><ArmGap />{HOOK.map((o) => <Opt key={o.id} o={o} big on={o.id === HOOK_REC} rec={o.id === HOOK_REC} />)}</Card>
          <Card t="볼 배합" a={VIO}><WeakBars />{MIX.map((o) => <Opt key={o.id} o={o} on={o.id === MIX_REC} rec={o.id === MIX_REC} />)}</Card>
          <Card t="공격 성향" a={MY}>{OFF.map((o, i) => <Opt key={o.id} o={{ ...o, d: null }} big on={i === 0} />)}</Card>
        </div>
        <div className="rounded-[20px] p-4" style={{ background: 'rgba(10,14,24,.78)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
          <Lab t="조건 지시 · 2칸" a={SKY} />
          <div className="mt-3 grid  gap-2" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>{CONDS.map((c) => <CondRow key={c.id} c={c} />)}</div>
        </div>
      </Panel>
    </div>
  );
}
function V3() {
  const col = (i) => `${(i / 9) * 100}%`;
  const hookAt = HOOK_REC === 'long' ? 7.5 : HOOK_REC === 'two' ? 6 : 5;
  const Lane = ({ t, a, children }) => (
    <div className="grid items-center gap-4" style={{ gridTemplateColumns: '120px 1fr' }}>
      <b className="text-t3" style={{ color: a }}>{t}</b>
      <div className="relative h-14 rounded-xl bg-white/[0.03]">{children}</div>
    </div>
  );
  return (
    <div className="grid min-h-0 flex-1 gap-5 px-7 pb-6" style={{ gridTemplateColumns: '1fr 400px' }}>
      <Panel>
        <Lab t="경기 흐름 설계" a={GOLD} right={<span className="flex gap-2"><Chip t={`상대 선발 ${OSP.name}`} c={OPPC} /><Chip t={`휘는 공 약한 타자 ${WEAK.B}`} c={VIO} /></span>} />
        <div className="grid gap-4" style={{ gridTemplateColumns: '120px 1fr' }}><span />
          <div className="grid " style={{ gridTemplateColumns: 'repeat(9,minmax(0,1fr))' }}>{Array.from({ length: 9 }, (_, i) => <b key={i} className="text-center font-display text-t2 text-gray-400">{i + 1}회</b>)}</div>
        </div>
        <Lane t="선발" a={MY}>
          <div className="absolute inset-y-1.5 left-1 flex items-center gap-2 rounded-lg px-3" style={{ width: `calc(${col(hookAt)} - 8px)`, background: 'linear-gradient(90deg,rgba(52,211,153,.35),rgba(52,211,153,.12))' }}><Portrait player={SP} w={34} h={34} round t={MY} /><b className="text-t3 text-white">{SP.name}</b><small className="text-t4 text-gray-300">두 바퀴 · 18타자</small></div>
          <i className="absolute inset-y-0 block w-[2px]" style={{ left: col(hookAt), background: GOLD }} />
        </Lane>
        <Lane t="불펜" a={MY}>
          {PEN.slice(0, 3).map((p, i) => <div key={p.id} className="absolute inset-y-1.5 flex items-center gap-2 rounded-lg px-2" style={{ left: col(hookAt + i * ((9 - hookAt) / 3)), width: `calc(${col((9 - hookAt) / 3)} - 6px)`, background: 'rgba(96,165,250,.18)' }}><Portrait player={p} w={30} h={30} round t={MY} /><b className="truncate text-t4 text-white">{p.name}</b></div>)}
        </Lane>
        <Lane t="볼 배합" a={VIO}><div className="absolute inset-y-1.5 left-1 right-1 flex items-center rounded-lg px-3" style={{ background: 'rgba(167,139,250,.14)' }}><b className="text-t3 text-white">{MIX.find((m) => m.id === MIX_REC)?.ko}</b></div></Lane>
        <Lane t="조건 지시" a={SKY}>
          <div className="absolute inset-y-1.5 flex items-center rounded-lg px-3" style={{ left: col(6), right: 4, background: 'rgba(56,189,248,.14)', boxShadow: `inset 0 0 0 1px ${SKY}66` }}><b className="text-t3 text-white">7회 이후 리드 → 센 불펜 {PEN[0]?.name}</b></div>
          <div className="absolute inset-y-1.5 flex items-center rounded-lg px-3" style={{ left: 4, width: `calc(${col(6)} - 8px)`, background: 'rgba(56,189,248,.08)' }}><b className="text-t4 text-gray-200">득점권 · 상대 최고 장타자 거르기</b></div>
        </Lane>
        <Lane t="결정" a={GOLD}>{[3, 6.5, 8.5].map((x, i) => <span key={i} className="absolute top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-display text-t3" style={{ left: col(x), background: 'rgba(251,191,36,.2)', boxShadow: `inset 0 0 0 1.5px ${GOLD}`, color: '#fde68a' }}>?</span>)}</Lane>
      </Panel>
      <Panel>
        <Lab t="고르기" a={GOLD} />
        <small className="text-t4 font-bold text-gray-400">선발 운용</small>
        {HOOK.map((o) => <Opt key={o.id} o={o} on={o.id === HOOK_REC} rec={o.id === HOOK_REC} />)}
        <small className="text-t4 font-bold text-gray-400">볼 배합</small>
        <div className="grid  gap-2" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>{MIX.map((o) => <Opt key={o.id} o={o} on={o.id === MIX_REC} rec={o.id === MIX_REC} />)}</div>
        <div className="mt-auto"><Start /></div>
      </Panel>
    </div>
  );
}
function V4() {
  return (
    <div className="grid min-h-0 flex-1 gap-5 px-7 pb-6" style={{ gridTemplateColumns: '1fr 440px' }}>
      <Panel>
        <Lab t="분석 리포트" a={VIO} right={<b className="text-t2 text-white">{OPT.name}</b>} />
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="rounded-2xl bg-white/[0.03] p-4"><OppStarter /></div>
          <div className="rounded-2xl bg-white/[0.03] p-4"><Lab t="우리 마운드" a={MY} /><div className="mt-3"><ArmGap /></div></div>
        </div>
        <Lab t="상대 타선 · 구종 약점" a={VIO} />
        <div className="grid  gap-2" style={{ gridTemplateColumns: 'repeat(9,minmax(0,1fr))' }}>
          {OP.batters.map((b, i) => { const f = batterFam(b); return (
            <div key={b.id} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.04] py-3">
              <b className="font-display text-t3 text-gray-500">{i + 1}</b><Portrait player={b} w={48} h={48} round t={OPPC} /><b className="truncate text-t4 text-white">{b.name}</b>
              {f.weak ? <Chip t={`${FAM_KO[f.weak]} ↓`} c={f.weak === MIX_REC ? GOLD : VIO} /> : <small className="text-t4 text-gray-500">고르게</small>}
              {f.strong && <small className="text-t4 text-gray-500">{FAM_KO[f.strong]} ↑</small>}
            </div>
          ); })}
        </div>
        <WeakBars />
      </Panel>
      <Panel>
        <Lab t="추천 설계" a={GOLD} right={<Chip t="한 번에 적용" c={GOLD} />} />
        {[['선발 운용', HOOK.find((h) => h.id === HOOK_REC)], ['볼 배합', MIX.find((m) => m.id === MIX_REC)], ['공격 성향', { ...OFF[0], d: null }]].map(([k, o]) => (
          <div key={k} className="flex flex-col gap-1.5"><small className="text-t4 font-bold text-gray-400">{k}</small><Opt o={o} big on rec /></div>
        ))}
        <small className="text-t4 font-bold text-gray-400">조건 지시 · 2칸</small>
        {CONDS.slice(0, 2).map((c) => <CondRow key={c.id} c={c} />)}
        <div className="mt-auto"><Start /></div>
      </Panel>
    </div>
  );
}

function App() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle /><GlassBg tint={MY} />
      <div className="relative flex min-h-0 flex-1 flex-col"><Header />{v === 1 ? <V1 /> : v === 2 ? <V2 /> : v === 3 ? <V3 /> : <V4 />}</div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
