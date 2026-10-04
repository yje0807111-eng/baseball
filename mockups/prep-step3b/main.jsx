/*
 * 정비 3단계 다시 짜기 8안 (/mockups/prep-step3b/?v=1~8, 1920 × 911) — sit-sim(ROADMAP 13) 뒤 정리안
 *  상황 대응은 셋만(도루 ↔ 도루 기회 경보 · 외야 후진 ↔ 장타 위험 · 유인구 — 득점권 강타자) + 지친 선발 교체는 늘 켬(자동)
 *  나머지 자리는 '경기 계획' 마무리 점검(라인업 · 마운드 · 공격 · 상황) + 준비 카드
 *  1 위 상황 · 아래 점검 셋 · 2 왼쪽 점검 · 오른쪽 상황 · 3 회 한 줄 계획표 · 4 점검 목록 · 5 상황 카드 크게 · 6 승률 가운데 · 7 켜고 끄기 줄 · 8 준비 카드 크게
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
const C = { power: '#f59e0b', base: '#cbd5e1', contact: '#38bdf8', patience: '#a78bfa' };
const LV = ['power', 'base', 'contact', 'patience'];
const PLAN = [3, 3, 1, 0, 0, 0, 0, 1, 2];
const LOW = [false, false, false, true, true, true, true, false, false];
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/* 상황 셋 — 고른 값 · 이어진 경보 */
const SITS = [
  { id: 'steal', side: '공격', ko: '우리 빠른 1루 주자', opts: ['그대로', '도루'], on: 1, alert: ['도루 기회', '큼', US] },
  { id: 'deep', side: '수비', ko: '상대 장타자 타석', opts: ['정상 수비', '외야 후진'], on: 0, alert: ['장타 위험', '높음', RED] },
  { id: 'chase', side: '수비', ko: '득점권 · 상대 강타자', opts: ['승부', '유인구'], on: 0, alert: null },
];
const AUTO = '지친 선발 교체';
const CARDS = [['타선 미팅', 2], ['불펜 데이', 1]];

/* ───── 조각 ───── */
const Box = ({ children, className = '', style, pad = 'p-4' }) => (
  <div className={`mt-cut flex flex-col ${pad} ${className}`} style={{ ...cut(12), background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.012))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)', ...style }}>{children}</div>
);
const Sub = ({ children, right }) => <div className="flex items-center justify-between"><b className="text-t3" style={{ color: W1 }}>{children}</b>{right}</div>;
const Tag = ({ c, children }) => <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: c, boxShadow: `inset 0 0 0 1px ${c}66` }}>{children}</span>;
const AlertChip = ({ a }) => a && <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: a[2], background: `${a[2]}1a` }}><i className="block rounded-full" style={{ width: 6, height: 6, background: a[2] }} />{a[0]} {a[1]}</span>;
const Seg = ({ opts, on, big }) => (
  <span className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${opts.length},1fr)` }}>
    {opts.map((o, i) => <span key={o} className={`grid place-items-center rounded-md font-bold ${big ? 'py-3 text-t3' : 'py-2 text-t4'}`} style={{ color: i === on ? '#fff' : W2, background: i === on ? 'rgba(16,185,129,.16)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${i === on ? US : 'rgba(255,255,255,.08)'}` }}>{o}</span>)}
  </span>
);
const AutoChip = () => <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ color: W2, background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}><i className="block rounded-full" style={{ width: 6, height: 6, background: US }} />{AUTO} · 자동</span>;
function SitRow({ s, big }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2"><Tag c={s.side === '공격' ? US : SPB}>{s.side}</Tag><b className={big ? 'text-t2' : 'text-t3'} style={{ color: W1 }}>{s.ko}</b><span className="ml-auto"><AlertChip a={s.alert} /></span></span>
      <Seg opts={s.opts} on={s.on} big={big} />
    </div>
  );
}
/* 미니 그래프 · 마운드 */
const yv = (lv, h) => 4 + (lv * (h - 8)) / 3;
function MiniGraph({ h = 46, w = 260 }) {
  const x = (i) => ((i + 0.5) / 9) * w;
  let d = `M0,${yv(PLAN[0], h)} L${x(0)},${yv(PLAN[0], h)}`;
  for (let i = 1; i < 9; i += 1) { const mx = (x(i - 1) + x(i)) / 2; d += ` C${mx},${yv(PLAN[i - 1], h)} ${mx},${yv(PLAN[i], h)} ${x(i)},${yv(PLAN[i], h)}`; }
  d += ` L${w},${yv(PLAN[8], h)}`;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <line x1="0" x2={w} y1={yv(1, h)} y2={yv(1, h)} stroke="rgba(255,255,255,.12)" />
      <path d={d} fill="none" stroke="#e5e7eb" strokeWidth="2" />
      {PLAN.map((lv, i) => <circle key={i} cx={x(i)} cy={yv(lv, h)} r="3" fill={C[LV[lv]]} />)}
    </svg>
  );
}
function MiniMound({ w = 260 }) {
  const seg = [[0, 6.1, SP, SPB], [6.1, 8, PEN[2], '#94a3b8'], [8, 9, PEN[0], GOLD]];
  return (
    <span className="relative block" style={{ width: w, height: 24 }}>
      {seg.map(([a, b, p, c]) => <span key={a} className="absolute flex items-center overflow-hidden rounded px-1.5 text-[11px] font-bold" style={{ left: (a / 9) * w + 1, width: ((b - a) / 9) * w - 2, top: 0, bottom: 0, background: `${c}33`, color: W1 }}>{p.name}</span>)}
    </span>
  );
}
const Lineup = ({ cols = 1 }) => (
  <span className="grid gap-x-4 gap-y-1" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
    {ME.batters.slice(0, 9).map((b, i) => <span key={b.id} className="flex items-center gap-2 text-t4"><b className="font-display" style={{ color: W3, width: 14 }}>{i + 1}</b><b style={{ color: W1 }}>{b.name}</b><span className="ml-auto text-[11px]" style={{ color: W3 }}>{b.position}</span></span>)}
  </span>
);
const CardPick = ({ big }) => (
  <span className="flex flex-wrap gap-2">{CARDS.map(([ko, n], i) => <span key={ko} className={`mt-cut flex items-center gap-2 ${big ? 'px-4 py-3' : 'px-3 py-2'}`} style={{ ...cut(8), background: i === 0 ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${i === 0 ? US : 'rgba(255,255,255,.1)'}` }}><b className={big ? 'text-t3' : 'text-t4'} style={{ color: i === 0 ? '#fff' : W2 }}>{ko}</b><span className="font-display text-t4" style={{ color: W3 }}>{n}</span></span>)}<span className="mt-cut flex items-center px-3 py-2 text-t4" style={{ ...cut(8), color: W3, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>안 씀</span></span>
);
const Check = ({ k, children, step }) => (
  <div className="flex items-center gap-3 border-b border-white/[0.05] py-2.5 last:border-b-0">
    <b className="w-20 shrink-0 text-t4" style={{ color: W2 }}>{k}</b>
    <span className="min-w-0 flex-1">{children}</span>
    {step && <span className="shrink-0 rounded-md px-2 py-1 text-[11px] font-bold" style={{ color: W2, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>{step}단계 ↺</span>}
  </div>
);
const WinBig = () => (
  <div className="flex flex-col items-center gap-2">
    <span className="text-t4" style={{ color: W2 }}>예상 승률</span>
    <b className="font-display" style={{ fontSize: 64, lineHeight: 1, color: '#34d399' }}>52%</b>
    <span className="flex h-2 w-72 overflow-hidden rounded-full"><i style={{ width: '52%', background: '#34d399' }} /><i className="flex-1" style={{ background: RED }} /></span>
  </div>
);

/* ───── 8안 ───── */
const CENTER = {
  1: ['위 상황 · 아래 점검 셋', () => (
    <div className="flex h-full flex-col gap-4">
      <Box><Sub right={<AutoChip />}>상황 대응</Sub><div className="mt-3 grid gap-4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{SITS.map((s) => <SitRow key={s.id} s={s} />)}</div></Box>
      <div className="grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Box><Sub>라인업</Sub><div className="mt-3"><Lineup /></div></Box>
        <Box><Sub>마운드</Sub><div className="mt-3 flex flex-col gap-2"><MiniMound w={420} /><span className="text-t4" style={{ color: W3 }}>선발 100구 · 계투 1 · 마무리</span></div></Box>
        <Box><Sub>공격</Sub><div className="mt-3 flex flex-col gap-2"><MiniGraph w={420} h={70} /><span className="text-t4" style={{ color: W3 }}>후반 공격형</span></div></Box>
      </div>
      <Box pad="px-4 py-3"><div className="flex items-center gap-4"><b className="text-t4" style={{ color: W2 }}>준비 카드</b><CardPick /></div></Box>
    </div>
  )],
  2: ['왼쪽 점검 · 오른쪽 상황', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
      <Box><Sub>경기 계획</Sub>
        <div className="mt-2 flex flex-col">
          <Check k="라인업" step={1}><span className="text-t4" style={{ color: W1 }}>{ME.batters.slice(0, 4).map((b) => b.name).join(' · ')} …</span></Check>
          <Check k="마운드" step={2}><MiniMound w={420} /></Check>
          <Check k="공격" step={2}><MiniGraph w={420} h={40} /></Check>
          <Check k="자동"><AutoChip /></Check>
        </div>
      </Box>
      <div className="flex flex-col gap-4">
        <Box><Sub>상황 대응</Sub><div className="mt-3 flex flex-col gap-4">{SITS.map((s) => <SitRow key={s.id} s={s} />)}</div></Box>
        <Box><Sub>준비 카드</Sub><div className="mt-3"><CardPick /></div></Box>
      </div>
    </div>
  )],
  3: ['회 한 줄 계획표', () => (
    <div className="flex h-full flex-col gap-4">
      <Box>
        <Sub right={<AutoChip />}>경기 계획</Sub>
        <div className="mt-3 grid" style={{ gridTemplateColumns: '7rem repeat(9,1fr)', rowGap: 8 }}>
          <span />{INN.map((i) => <b key={i} className="text-center font-display text-t4" style={{ color: LOW[i - 1] ? US : W2 }}>{i}회</b>)}
          <span className="text-t4" style={{ color: W2 }}>마운드</span><span style={{ gridColumn: "span 9" }}><MiniMound w={1180} /></span>
          <span className="text-t4" style={{ color: W2 }}>공격</span>{PLAN.map((lv, i) => <span key={i} className="grid place-items-center"><span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: C[LV[lv]], background: `${C[LV[lv]]}1a` }}>{['풀스윙', '기본', '짧은', '신중'][lv]}</span></span>)}
          <span className="text-t4" style={{ color: W2 }}>상황</span><span className="flex gap-2" style={{ gridColumn: "span 9" }}><Tag c={US}>도루 · 늘</Tag><Tag c={SPB}>유인구 · 득점권 강타자</Tag></span>
        </div>
      </Box>
      <div className="grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <Box><Sub>상황 대응</Sub><div className="mt-3 grid gap-4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{SITS.map((s) => <SitRow key={s.id} s={s} />)}</div></Box>
        <Box><Sub>준비 카드</Sub><div className="mt-3"><CardPick /></div></Box>
      </div>
    </div>
  )],
  4: ['점검 목록', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <Box><Sub>경기 전 점검</Sub>
        <div className="mt-2 flex flex-col">
          {[['라인업', '9명 · 수비 빈칸 없음', 1], ['선발', `${SP.name} · 100구`, 2], ['불펜', `${PEN[2].name} → ${PEN[0].name}(마무리)`, 2], ['공격', '후반 공격형', 2], ['안전장치', AUTO, null]].map(([k, v, s]) => (
            <Check key={k} k={k} step={s}><span className="flex items-center gap-2 text-t4" style={{ color: W1 }}><i className="grid place-items-center rounded-full text-[10px] font-black" style={{ width: 16, height: 16, background: US, color: '#04130d' }}>✓</i>{v}</span></Check>
          ))}
        </div>
      </Box>
      <div className="flex flex-col gap-4">
        <Box><Sub>상황 대응</Sub><div className="mt-3 flex flex-col gap-4">{SITS.map((s) => <SitRow key={s.id} s={s} />)}</div></Box>
        <Box><Sub>준비 카드</Sub><div className="mt-3"><CardPick /></div></Box>
      </div>
    </div>
  )],
  5: ['상황 카드 크게', () => (
    <div className="flex h-full flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {SITS.map((s) => (
          <Box key={s.id} pad="p-5" style={s.alert ? { boxShadow: `inset 0 0 0 1px ${s.alert[2]}55` } : null}>
            <span className="flex items-center justify-between"><Tag c={s.side === '공격' ? US : SPB}>{s.side}</Tag><AlertChip a={s.alert} /></span>
            <b className="mt-4 text-t1" style={{ color: W1 }}>{s.ko}</b>
            <span className="mt-auto"><Seg opts={s.opts} on={s.on} big /></span>
          </Box>
        ))}
      </div>
      <Box pad="px-4 py-3"><div className="flex items-center gap-5"><AutoChip /><i className="h-5 w-px bg-white/10" /><b className="text-t4" style={{ color: W2 }}>준비 카드</b><CardPick /></div></Box>
    </div>
  )],
  6: ['승률 가운데', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1fr 1.1fr 1fr' }}>
      <Box><Sub>상황 대응</Sub><div className="mt-3 flex flex-col gap-4">{SITS.map((s) => <SitRow key={s.id} s={s} />)}</div><span className="mt-auto"><AutoChip /></span></Box>
      <Box pad="p-6"><div className="flex h-full flex-col items-center justify-center gap-6"><WinBig /><div className="flex flex-col items-center gap-2"><MiniMound w={380} /><MiniGraph w={380} h={44} /></div></div></Box>
      <Box><Sub>준비 카드</Sub><div className="mt-3"><CardPick big /></div><div className="mt-6"><Sub>라인업</Sub><div className="mt-2"><Lineup /></div></div></Box>
    </div>
  )],
  7: ['켜고 끄기 줄', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
      <Box><Sub>상황 대응</Sub>
        <div className="mt-2 flex flex-col">
          {[...SITS.map((s) => [s.side, s.ko, s.opts[1], s.on === 1, s.alert]), ['투수', '선발 체력 30 아래 · 주자', '교체', true, null, true]].map(([side, ko, act, on, alert, auto]) => (
            <div key={ko} className="flex items-center gap-3 border-b border-white/[0.05] py-3 last:border-b-0">
              <Tag c={side === '공격' ? US : side === '투수' ? GOLD : SPB}>{side}</Tag>
              <b className="text-t3" style={{ color: W1 }}>{ko}</b><span className="text-t4" style={{ color: W3 }}>→ {act}</span>
              <span className="ml-auto flex items-center gap-3"><AlertChip a={alert} />
                <span className="relative block rounded-full" style={{ width: 40, height: 22, background: on ? US : 'rgba(255,255,255,.12)', opacity: auto ? 0.6 : 1 }}><i className="absolute block rounded-full bg-white" style={{ width: 16, height: 16, top: 3, left: on ? 21 : 3 }} /></span>
                {auto && <span className="text-[11px]" style={{ color: W3 }}>자동</span>}
              </span>
            </div>
          ))}
        </div>
      </Box>
      <div className="flex flex-col gap-4">
        <Box><Sub>경기 계획</Sub><div className="mt-3 flex flex-col gap-3"><MiniMound w={560} /><MiniGraph w={560} h={52} /></div></Box>
        <Box><Sub>준비 카드</Sub><div className="mt-3"><CardPick /></div></Box>
      </div>
    </div>
  )],
  8: ['준비 카드 크게', () => (
    <div className="flex h-full flex-col gap-4">
      <Box><Sub right={<AutoChip />}>상황 대응</Sub><div className="mt-3 grid gap-4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{SITS.map((s) => <SitRow key={s.id} s={s} />)}</div></Box>
      <Box className="min-h-0 flex-1"><Sub>준비 카드</Sub>
        <div className="mt-4 grid flex-1 gap-4" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[['타선 미팅', 2, '타자 전원 컨택 +3'], ['불펜 데이', 1, '불펜 투수 전원 체력 +20'], ['마운드 미팅', 0, '투수 전원 제구 +3'], ['안 씀', null, '']].map(([ko, n, fx], i) => (
            <span key={ko} className="mt-cut flex flex-col gap-2 p-4" style={{ ...cut(10), opacity: n === 0 ? 0.35 : 1, background: i === 0 ? 'rgba(16,185,129,.1)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${i === 0 ? US : 'rgba(255,255,255,.08)'}` }}>
              <b className="text-t2" style={{ color: i === 0 ? '#fff' : W1 }}>{ko}</b>{fx && <span className="text-t4" style={{ color: W2 }}>{fx}</span>}{n != null && <span className="mt-auto font-display text-t3" style={{ color: W3 }}>{n}장</span>}
            </span>
          ))}
        </div>
      </Box>
    </div>
  )],
};

function Left() {
  const A = [['장타 위험', 72, RED, '높음'], ['도루 위험', 40, GOLD, '보통'], ['세 바퀴째 위험', 30, W3, '낮음'], ['도루 기회', 80, US, '큼']];
  return (
    <aside className="mt-cut flex flex-col gap-3 p-5" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
      <span className="text-t4" style={{ color: W3 }}>오늘 상대 · 머리(그대로)</span>
      <span style={{ height: 150 }} />
      <b className="text-t3" style={{ color: W1 }}>상대 성향</b>
      <span style={{ height: 230 }} className="rounded-lg bg-white/[0.02]" />
      <i className="my-1 block h-px bg-white/[0.07]" />
      {A.map(([ko, at, c, lv]) => (
        <div key={ko} className="flex flex-col gap-1.5" style={{ opacity: lv === '높음' || lv === '큼' ? 1 : 0.5 }}>
          <span className="flex justify-between"><b className="text-t4 text-white">{ko}</b><b className="text-t4" style={{ color: c }}>{lv}</b></span>
          <span className="relative block h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.08)' }}><i className="absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/4 rounded-full" style={{ left: `${at}%`, top: -1, background: c }} /></span>
        </div>
      ))}
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
                  <span className="flex items-center gap-2.5"><b className="grid h-8 w-8 place-items-center rounded-full font-display text-t3" style={{ background: i === 2 ? GOLD : 'rgba(52,211,153,.22)', color: i === 2 ? '#1c1203' : '#34d399' }}>{i < 2 ? '✓' : 3}</b><b className="text-t3" style={{ color: i === 2 ? '#fff' : W2 }}>{x}</b></span>
                  {i < 2 && <i className="block h-px w-8 bg-white/15" />}
                </React.Fragment>
              ))}
              {V !== 6 && <span className="ml-auto flex flex-col gap-1.5" style={{ width: 288 }}><span className="flex justify-between text-t4"><span style={{ color: W2 }}>예상 승률</span><b className="font-display text-t3" style={{ color: '#34d399' }}>52% : 48%</b></span><span className="flex h-1.5 overflow-hidden rounded-full"><i style={{ width: '52%', background: '#34d399' }} /><i className="flex-1" style={{ background: RED }} /></span></span>}
            </div>
            <div className="min-h-0 flex-1"><Center /></div>
            <div className="flex shrink-0 items-center gap-2 border-t border-white/[0.08] pt-3" style={{ height: 64 }}><span className="flex-1" /><span className="flex h-12 items-center rounded-lg px-4 text-t3 font-bold" style={{ color: '#d1d5db', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>◀ 이전</span><span className="mt-cut flex h-12 items-center gap-3 px-6" style={{ ...cut(12), minWidth: 288, justifyContent: 'center', background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}><span className="flex gap-1">{[1, 2, 3].map((i) => <i key={i} className="block h-1.5 rounded-full" style={{ width: i === 3 ? 16 : 6, background: '#1c1203' }} />)}</span><b className="text-t2 font-black">경기 시작 ▶</b></span></div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
