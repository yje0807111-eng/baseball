/*
 * 정비 2단계(경기 흐름) 가운데 — 이닝마다 조절 목업 (/mockups/prep-innings/?v=1~8, 1920 × 911)
 * 왼쪽 '상대 흐름'(파도: 회마다 상대 마운드 힘, 꺼진 회 = 기회)을 보며 1~9회를 직접 짠다. 가운데 9칸은 왼쪽 파도와 같은 1~9 눈금.
 *  공격 — 회마다 성향: 보통 · 강공(약한 투수에 + · flow2-sim) · 짧게(센 투수에 +) · 기다리기(제구 나쁜 투수에 +)
 *  마운드 — 우리 선발이 어디까지(이닝 · 투구 수 · 타자 수 중 하나로 끊기) + 그 뒤 회마다 누가(필승조 · 중간)
 *  증강 — 받을 회(3~8)
 * 비교: MLB 9이닝스 '투수 운용' 설정(선발 한계 투구 수 · 마무리 지정), OOTP 투수 교체 기준(투구 수 · 피안타), FM 경기 전 '단계별 지시'.
 * 답은 적지 않는다 — 고르면 판 머리 예상 승률만 바뀐다.
 *  1 이닝 표 · 2 타임라인 끌기 · 3 붓 칠하기 · 4 초 · 중 · 후 펼치기 · 5 거울 레인 · 6 이닝 카드 · 7 투수 중심 · 8 슬라이더
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
const MYT = seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2));
const ME = engineTeam(MYT);
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => Math.round((st(p, 'stuff', 80) + st(p, 'control', 75)) / 2);
const V = Number(new URLSearchParams(location.search).get('v') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', OPP = '#a78bfa';
const SP = ME.pitchers[0];
const PEN = ME.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a));
/* 상대 흐름(왼쪽 파도와 같은 값 — 예시) */
const MOUND = [79, 78, 74, 71, 68, 68, 69, 72, 79];
const AVG = MOUND.reduce((a, b) => a + b, 0) / 9;
const LOW = MOUND.map((v) => v <= AVG - 2);
/* 예시로 고른 설계 */
const ATK = ['보통', '보통', '보통', '보통', '강공', '강공', '강공', '보통', '짧게'];
const EXIT = 5; // 선발 5회까지
const RELIEF = { 6: PEN[3], 7: PEN[2], 8: PEN[1], 9: PEN[0] };
const AUG = 6;
const ATK_C = { 보통: W3, 강공: '#f59e0b', 짧게: '#38bdf8', 기다리기: '#a78bfa' };
const ATK_S = { 보통: '—', 강공: '강', 짧게: '짧', 기다리기: '기' };
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/* ───── 조각 ───── */
const Sub = ({ children, right }) => <div className="flex shrink-0 items-center justify-between"><b className="text-t3" style={{ color: W1 }}>{children}</b>{right}</div>;
const Seg = ({ opts, on, sm }) => (
  <span className="inline-flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
    {opts.map((o) => <b key={o} className={`rounded-md ${sm ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-t4'}`} style={o === on ? { background: 'rgba(16,185,129,.18)', color: '#fff', boxShadow: `inset 0 0 0 1px ${US}` } : { color: W2 }}>{o}</b>)}
  </span>
);
const InnHead = ({ lead = '7rem' }) => (
  <div className="grid items-end gap-1" style={{ gridTemplateColumns: `${lead} repeat(9,minmax(0,1fr))` }}>
    <span />
    {INN.map((i) => <span key={i} className="flex flex-col items-center gap-0.5"><b className="font-display text-t3" style={{ color: LOW[i - 1] ? US : W2 }}>{i}</b>{LOW[i - 1] ? <span className="text-[10px]" style={{ color: US }}>기회</span> : <span className="text-[10px]">&nbsp;</span>}</span>)}
  </div>
);
/* 상대 마운드 줄 — 왼쪽 파도를 칸으로 옮긴 것(높을수록 진함) */
const OppRow = ({ lead = '7rem' }) => (
  <div className="grid items-center gap-1" style={{ gridTemplateColumns: `${lead} repeat(9,minmax(0,1fr))` }}>
    <span className="text-t4" style={{ color: W3 }}>상대 마운드</span>
    {MOUND.map((v, i) => <span key={i} className="grid place-items-center rounded-md font-display text-t3" style={{ height: 40, background: LOW[i] ? 'rgba(16,185,129,.14)' : `rgba(167,139,250,${0.08 + (v - 66) / 60})`, color: LOW[i] ? US : W1 }}>{v}</span>)}
  </div>
);
const PitCell = ({ p, i, sp }) => (
  <span className="flex flex-col items-center justify-center gap-1 rounded-md px-1" style={{ height: 104, background: sp ? 'rgba(96,165,250,.16)' : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${sp ? 'rgba(96,165,250,.4)' : 'rgba(255,255,255,.08)'}` }}>
    {p && <Portrait player={p} w={40} h={50} color="#334155" />}
    <span className="min-w-0 truncate text-[11px]" style={{ color: W1 }}>{p ? p.name : '—'}</span>
  </span>
);
const AtkCell = ({ v, big }) => (
  <span className="grid place-items-center rounded-md text-t3 font-bold" style={{ height: big ? 76 : 64, background: v === '보통' ? 'rgba(255,255,255,.03)' : `${ATK_C[v]}22`, boxShadow: `inset 0 0 0 1px ${v === '보통' ? 'rgba(255,255,255,.08)' : `${ATK_C[v]}88`}`, color: v === '보통' ? W3 : ATK_C[v] }}>{v}</span>
);
const Limit = ({ mode = '이닝' }) => (
  <span className="flex items-center gap-3">
    <span className="text-t4" style={{ color: W2 }}>선발 {SP.name} 끊는 기준</span>
    <Seg opts={['이닝', '투구 수', '타자 수']} on={mode} />
    <b className="font-display text-t2" style={{ color: W1 }}>{mode === '이닝' ? `${EXIT}회까지` : mode === '투구 수' ? '85구' : '18타자'}</b>
  </span>
);
const AugRow = ({ lead = '7rem' }) => (
  <div className="grid items-center gap-1" style={{ gridTemplateColumns: `${lead} repeat(9,minmax(0,1fr))` }}>
    <span className="text-t4" style={{ color: W3 }}>증강</span>
    {INN.map((i) => <span key={i} className="grid place-items-center" style={{ height: 48 }}>{i === AUG ? <b className="grid h-7 w-7 place-items-center rounded-full text-t4" style={{ background: GOLD, color: '#1c1203' }}>✦</b> : i >= 3 && i <= 8 ? <i className="block h-2 w-2 rounded-full bg-white/15" /> : null}</span>)}
  </div>
);
const pitOf = (i) => (i <= EXIT ? SP : RELIEF[i] || PEN[4]);

/* ───── 8안 ───── */
const CENTER = {
  1: ['이닝 표', () => (
    <div className="flex flex-col gap-4">
      <InnHead /><OppRow />
      <i className="block h-px bg-white/[0.08]" />
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '7rem repeat(9,minmax(0,1fr))' }}><span className="text-t4" style={{ color: W2 }}>공격</span>{ATK.map((v, i) => <AtkCell key={i} v={v} />)}</div>
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '7rem repeat(9,minmax(0,1fr))' }}><span className="text-t4" style={{ color: W2 }}>마운드</span>{INN.map((i) => <PitCell key={i} p={i === 1 || i === EXIT + 1 || i > EXIT ? pitOf(i) : null} sp={i <= EXIT} />)}</div>
      <AugRow />
      <div className="flex items-center justify-between pt-2"><Limit /><span className="flex items-center gap-2"><span className="text-t4" style={{ color: W3 }}>볼 배합</span><Seg opts={['섞기', '직구', '휘는 공', '떨어지는 공']} on="섞기" /></span></div>
    </div>
  )],
  2: ['타임라인 끌기', () => (
    <div className="flex flex-col gap-4">
      <InnHead lead="6rem" /><OppRow lead="6rem" />
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '6rem repeat(9,minmax(0,1fr))' }}>
        <span className="text-t4" style={{ color: W2 }}>우리 선발</span>
        <span className="relative block" style={{ gridColumn: '2 / 11', height: 64 }}>
          <span className="absolute inset-y-0 left-0 flex items-center gap-2 rounded-l-lg px-3" style={{ width: `${(EXIT / 9) * 100}%`, background: 'linear-gradient(90deg, rgba(96,165,250,.35), rgba(96,165,250,.15))' }}><Portrait player={SP} w={26} h={32} color="#334155" /><b className="text-t4" style={{ color: W1 }}>{SP.name}</b></span>
          <span className="absolute inset-y-[-6px] grid w-5 -translate-x-1/2 cursor-ew-resize place-items-center rounded-md" style={{ left: `${(EXIT / 9) * 100}%`, background: GOLD }}><i className="block h-5 w-0.5 bg-[#1c1203]" /></span>
          <span className="absolute -top-6 -translate-x-1/2 whitespace-nowrap text-t4 font-bold" style={{ left: `${(EXIT / 9) * 100}%`, color: GOLD }}>{EXIT}회까지 ⇔</span>
        </span>
      </div>
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '6rem repeat(9,minmax(0,1fr))' }}><span className="text-t4" style={{ color: W2 }}>불펜</span>{INN.map((i) => (i > EXIT ? <PitCell key={i} p={pitOf(i)} /> : <span key={i} />))}</div>
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '6rem repeat(9,minmax(0,1fr))' }}>
        <span className="text-t4" style={{ color: W2 }}>공격</span>
        {[[1, 4, '보통'], [5, 7, '강공'], [8, 8, '보통'], [9, 9, '짧게']].map(([a, b, v]) => <span key={a} className="relative" style={{ gridColumn: `${a + 1} / ${b + 2}` }}><AtkCell v={v} /><i className="absolute -right-1 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded bg-white/30" /></span>)}
      </div>
      <AugRow lead="6rem" />
    </div>
  )],
  3: ['붓 칠하기', () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>공격 붓</span>{Object.keys(ATK_C).map((k) => <b key={k} className="rounded-full px-3 py-1 text-t4" style={k === '강공' ? { background: ATK_C[k], color: '#1c1203' } : { color: ATK_C[k], boxShadow: `inset 0 0 0 1px ${ATK_C[k]}88` }}>{k}</b>)}<span className="ml-2 text-t4" style={{ color: W3 }}>칸을 눌러 칠하기 · 끌어서 여러 칸</span></div>
      <InnHead /><OppRow />
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '7rem repeat(9,minmax(0,1fr))' }}><span className="text-t4" style={{ color: W2 }}>공격</span>{ATK.map((v, i) => <AtkCell key={i} v={v} big />)}</div>
      <div className="flex items-center gap-3 pt-2"><span className="text-t4" style={{ color: W2 }}>투수 붓</span><b className="rounded-full px-3 py-1 text-t4" style={{ background: 'rgba(96,165,250,.3)', color: '#fff' }}>선발 {SP.name}</b>{PEN.slice(0, 4).map((p) => <b key={p.id} className="rounded-full px-3 py-1 text-t4" style={{ color: W1, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.15)' }}>{p.name}</b>)}</div>
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '7rem repeat(9,minmax(0,1fr))' }}><span className="text-t4" style={{ color: W2 }}>마운드</span>{INN.map((i) => <PitCell key={i} p={pitOf(i)} sp={i <= EXIT} />)}</div>
      <AugRow />
    </div>
  )],
  4: ['초 · 중 · 후 펼치기', () => {
    const ph = [['초반', [1, 3], '보통', SP.name], ['중반', [4, 6], '강공', `${SP.name} → 5회까지`], ['후반', [7, 9], '보통', `${RELIEF[7].name} · ${RELIEF[8].name} · ${RELIEF[9].name}`]];
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {ph.map(([k, [a, b], atk, pit], j) => (
          <div key={k} className="mt-cut flex flex-col gap-3 p-4" style={{ ...cut(12), background: 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${j === 1 ? `${US}66` : 'rgba(255,255,255,.08)'}` }}>
            <span className="flex items-baseline justify-between"><b className="text-t2" style={{ color: W1 }}>{k}</b><span className="text-t4" style={{ color: W3 }}>{a}~{b}회</span></span>
            <span className="flex gap-1">{INN.slice(a - 1, b).map((i) => <span key={i} className="grid h-7 flex-1 place-items-center rounded font-display text-t4" style={{ background: LOW[i - 1] ? 'rgba(16,185,129,.14)' : 'rgba(167,139,250,.14)', color: LOW[i - 1] ? US : W1 }}>{MOUND[i - 1]}</span>)}</span>
            <span className="flex items-center justify-between"><span className="text-t4" style={{ color: W2 }}>공격</span><Seg sm opts={['보통', '강공', '짧게', '기다리기']} on={atk} /></span>
            <span className="flex items-center justify-between gap-2"><span className="shrink-0 text-t4" style={{ color: W2 }}>마운드</span><b className="truncate text-t4" style={{ color: W1 }}>{pit}</b></span>
            {j === 1 && <span className="flex gap-1">{INN.slice(3, 6).map((i) => <span key={i} className="flex flex-1 flex-col items-center gap-1 rounded-md bg-white/[0.04] py-1.5"><span className="text-[11px]" style={{ color: W3 }}>{i}회</span><b className="text-[11px]" style={{ color: ATK_C[ATK[i - 1]] === W3 ? W2 : ATK_C[ATK[i - 1]] }}>{ATK[i - 1]}</b></span>)}</span>}
            {j === 1 && <span className="text-[11px]" style={{ color: W3 }}>펼쳐서 회마다</span>}
          </div>
        ))}
      </div>
    );
  }],
  5: ['거울 레인', () => (
    <div className="flex flex-col gap-2">
      <InnHead lead="6.5rem" />
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '6.5rem repeat(9,minmax(0,1fr))' }}>
        <span className="text-t4" style={{ color: OPP }}>상대 마운드</span>
        <span className="relative block" style={{ gridColumn: '2 / 11', height: 90 }}>
          <svg viewBox="0 0 900 56" preserveAspectRatio="none" className="absolute inset-0 h-full w-full"><path d={`M0,56 ${MOUND.map((v, i) => `L${i * 100 + 50},${56 - (v - 64) * 3.3}`).join(' ')} L900,56 Z`} fill="rgba(167,139,250,.25)" stroke={OPP} strokeWidth="2" /></svg>
        </span>
      </div>
      <i className="my-1 block h-px bg-white/10" />
      {[['우리 공격', () => ATK.map((v, i) => <AtkCell key={i} v={v} />)], ['우리 마운드', () => INN.map((i) => <PitCell key={i} p={pitOf(i)} sp={i <= EXIT} />)]].map(([k, R]) => (
        <div key={k} className="grid items-center gap-1" style={{ gridTemplateColumns: '6.5rem repeat(9,minmax(0,1fr))' }}><span className="text-t4" style={{ color: US }}>{k}</span><R /></div>
      ))}
      <AugRow lead="6.5rem" />
      <div className="pt-2"><Limit mode="투구 수" /></div>
    </div>
  )],
  6: ['이닝 카드', () => (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(9,minmax(0,1fr))' }}>
      {INN.map((i) => (
        <div key={i} className="mt-cut flex flex-col gap-2 p-2" style={{ ...cut(10), background: LOW[i - 1] ? 'rgba(16,185,129,.07)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${LOW[i - 1] ? `${US}55` : 'rgba(255,255,255,.08)'}` }}>
          <span className="flex items-baseline justify-between"><b className="font-display text-t1" style={{ color: W1 }}>{i}</b><span className="font-display text-t4" style={{ color: LOW[i - 1] ? US : OPP }}>{MOUND[i - 1]}</span></span>
          <span className="text-[11px]" style={{ color: W3 }}>공격</span>
          <span className="flex flex-col gap-1">{['보통', '강공', '짧게', '기다리기'].map((o) => <b key={o} className="rounded px-1.5 py-0.5 text-center text-[11px]" style={o === ATK[i - 1] ? { background: `${ATK_C[o] === W3 ? US : ATK_C[o]}33`, color: '#fff', boxShadow: `inset 0 0 0 1px ${ATK_C[o] === W3 ? US : ATK_C[o]}` } : { color: W3 }}>{o}</b>)}</span>
          <span className="text-[11px]" style={{ color: W3 }}>마운드</span>
          <span className="flex flex-col items-center gap-1 rounded-md py-1.5" style={{ background: i <= EXIT ? 'rgba(96,165,250,.14)' : 'rgba(255,255,255,.04)' }}><Portrait player={pitOf(i)} w={28} h={34} color="#334155" /><span className="w-full truncate text-center text-[11px]" style={{ color: W1 }}>{pitOf(i).name}</span></span>
          {i === AUG && <b className="rounded-full py-0.5 text-center text-[11px]" style={{ background: GOLD, color: '#1c1203' }}>✦ 증강</b>}
        </div>
      ))}
    </div>
  )],
  7: ['투수 중심', () => (
    <div className="flex flex-col gap-4">
      <InnHead /><OppRow />
      <div className="mt-cut flex flex-col gap-3 p-4" style={{ ...cut(12), background: 'rgba(96,165,250,.06)', boxShadow: 'inset 0 0 0 1px rgba(96,165,250,.3)' }}>
        <span className="flex items-center gap-3"><Portrait player={SP} w={40} h={50} color="#334155" /><span className="flex flex-col"><span className="text-t4" style={{ color: W3 }}>우리 선발</span><b className="text-t2" style={{ color: W1 }}>{SP.name}</b></span><span className="ml-6"><Limit mode="투구 수" /></span></span>
        <span className="relative block h-2 rounded-full bg-white/[0.08]"><i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(85 / 120) * 100}%`, background: 'rgba(96,165,250,.7)' }} /><i className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full" style={{ left: `${(85 / 120) * 100}%`, background: GOLD, boxShadow: '0 0 0 3px #0b0f1a' }} /></span>
        <span className="flex justify-between text-[11px]" style={{ color: W3 }}><span>40구</span><span>미리보기 기준 약 5.2회</span><span>120구</span></span>
      </div>
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '7rem repeat(9,minmax(0,1fr))' }}><span className="text-t4" style={{ color: W2 }}>불펜 순서</span>{INN.map((i) => (i > EXIT ? <PitCell key={i} p={pitOf(i)} /> : <span key={i} className="rounded-md" style={{ height: 104, background: 'rgba(96,165,250,.08)' }} />))}</div>
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: '7rem repeat(9,minmax(0,1fr))' }}><span className="text-t4" style={{ color: W2 }}>공격</span>{ATK.map((v, i) => <AtkCell key={i} v={v} />)}</div>
    </div>
  )],
  8: ['슬라이더', () => (
    <div className="flex flex-col gap-5">
      <InnHead lead="8rem" /><OppRow lead="8rem" />
      {[['공격 힘', ATK.map((v) => (v === '강공' ? 85 : v === '짧게' ? 30 : 50)), '짧게', '강공'], ['투수 교체 빠르기', INN.map((i) => (i <= EXIT ? 40 : 70)), '길게', '빠르게']].map(([k, vals, lo, hi]) => (
        <div key={k} className="grid items-end gap-1" style={{ gridTemplateColumns: '8rem repeat(9,minmax(0,1fr))' }}>
          <span className="flex flex-col"><span className="text-t4" style={{ color: W2 }}>{k}</span><span className="text-[11px]" style={{ color: W3 }}>아래 {lo} · 위 {hi}</span></span>
          {vals.map((v, i) => <span key={i} className="relative block rounded-md bg-white/[0.04]" style={{ height: 120 }}><i className="absolute inset-x-1 bottom-1 rounded" style={{ height: `${v * 0.8}%`, background: v > 60 ? 'rgba(245,158,11,.55)' : v < 40 ? 'rgba(56,189,248,.5)' : 'rgba(255,255,255,.15)' }} /><i className="absolute inset-x-0 h-1.5 rounded bg-white" style={{ bottom: `${v * 0.8}%` }} /></span>)}
        </div>
      ))}
      <AugRow lead="8rem" />
    </div>
  )],
};

/* 왼쪽 상대 판(파도만 그린 자리) */
function Left() {
  const W = 300, H = 90, x = (i) => (i * W) / 8, y = (v) => H - 10 - (v - (AVG - 8)) * 4.5;
  let d = `M0,${H} L0,${y(MOUND[0])}`;
  for (let i = 1; i < 9; i += 1) { const mx = (x(i - 1) + x(i)) / 2; d += ` C${mx},${y(MOUND[i - 1])} ${mx},${y(MOUND[i])} ${x(i)},${y(MOUND[i])}`; }
  d += ` L${W},${H} Z`;
  return (
    <aside className="mt-cut flex flex-col gap-3 p-5" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
      <span className="text-t4" style={{ color: W3 }}>오늘 상대 판 · 머리</span>
      <span className="h-56" />
      <b className="text-t3" style={{ color: W2 }}>상대 흐름</b>
      <svg width={W} height={H} style={{ overflow: 'visible' }}><path d={d} fill="rgba(167,139,250,.25)" stroke={OPP} strokeWidth="2" />{MOUND.map((v, i) => LOW[i] && <circle key={i} cx={x(i)} cy={y(v)} r="5" fill={US} />)}</svg>
      <div className="grid text-center text-[11px]" style={{ gridTemplateColumns: 'repeat(9,1fr)', color: W3 }}>{INN.map((i) => <span key={i}>{i}</span>)}</div>
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
        <div className="flex h-[70px] shrink-0 items-center gap-4 px-3"><b className="text-t1 font-black text-white">경기 전 정비</b><span className="rounded-full px-3 py-1 text-t4 font-bold" style={{ color: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}66` }}>{V} · {t}</span></div>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
          <Left />
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(20), '--a': US }}>
            <div className="flex h-10 shrink-0 items-center gap-6">
              {['라인업', '경기 흐름', '상황 대응'].map((x, i) => (
                <React.Fragment key={x}>
                  <span className="flex items-center gap-2.5"><b className="grid h-8 w-8 place-items-center rounded-full font-display text-t3" style={{ background: i === 1 ? GOLD : i === 0 ? 'rgba(52,211,153,.22)' : 'rgba(255,255,255,.06)', color: i === 1 ? '#1c1203' : i === 0 ? '#34d399' : W2 }}>{i === 0 ? '✓' : i + 1}</b><b className="text-t3" style={{ color: i === 1 ? '#fff' : W2 }}>{x}</b></span>
                  {i < 2 && <i className="block h-px w-8 bg-white/15" />}
                </React.Fragment>
              ))}
              <span className="ml-auto flex flex-col gap-1.5" style={{ width: 288 }}><span className="flex justify-between text-t4"><span style={{ color: W2 }}>예상 승률</span><b className="font-display text-t3" style={{ color: '#34d399' }}>47% : 53%</b></span><span className="flex h-1.5 overflow-hidden rounded-full"><i style={{ width: '47%', background: '#34d399' }} /><i className="flex-1" style={{ background: RED }} /></span></span>
            </div>
            <div className="min-h-0 flex-1"><Center /></div>
            <div className="flex h-16 shrink-0 items-center border-t border-white/[0.08] pt-3"><span className="flex-1" /><span className="mt-cut flex h-12 items-center gap-3 px-6" style={{ ...cut(12), minWidth: 288, justifyContent: 'center', background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}><span className="flex gap-1">{[1, 2, 3].map((i) => <i key={i} className="block h-1.5 rounded-full" style={{ width: i === 2 ? 16 : 6, background: i <= 2 ? '#1c1203' : 'rgba(28,18,3,.3)' }} />)}</span><b className="text-t2 font-black">다음 · 상황 대응 ▶</b></span></div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
