/*
 * 정비 2단계 가운데 — 2안(타임라인 끌기) + 7안(투수 카드) 다듬기 8안 (/mockups/prep-innings2/?v=1~8, 1920 × 911)
 * 정돈 원칙(1단계와 같음): 격자 맞춤(왼쪽 이름 칸 + 1~9 회 칸이 모든 줄에 같은 눈금) · 색은 뜻만(초록 = 기회 · 선택, 노랑 = 끄는 손잡이, 성향 색은 점 하나)
 * 끌기: 선발 막대 끝 손잡이(어디까지) · 공격 구간 사이 손잡이(구간 늘이기 · 줄이기) · 증강 핀
 * 투수 카드: 끊는 기준(이닝 · 투구 수 · 타자 수) + 값 — 막대 손잡이와 같은 값(투구 수 · 타자 수면 미리보기 평균 이닝으로 손잡이 자리)
 *  1 정돈 기본 · 2 간트 · 3 투수 카드 위 · 4 열띠 · 5 기회 기둥 · 6 유리 레인 · 7 손잡이 말풍선 · 8 흑백
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
const EXIT = 5.2; // 85구 ≈ 5.2회(미리보기)
const RELIEF = [[6, 6, PEN[3]], [7, 7, PEN[2]], [8, 8, PEN[1]], [9, 9, PEN[0]]];
const ATK = [[1, 4, '보통'], [5, 7, '강공'], [8, 8, '보통'], [9, 9, '짧게']];
const AUG = 6;
const ATK_C = { 보통: W3, 강공: '#f59e0b', 짧게: '#38bdf8', 기다리기: '#a78bfa' };
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const pct = (inn) => `${(inn / 9) * 100}%`; // 회 끝 자리(0 = 시작)

/* ───── 조각 ───── */
const Seg = ({ opts, on }) => (
  <span className="inline-flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
    {opts.map((o) => <b key={o} className="rounded-md px-3 py-1 text-t4" style={o === on ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : { color: W2 }}>{o}</b>)}
  </span>
);
const Handle = ({ at, label, bubble }) => (
  <span className="absolute z-10 flex -translate-x-1/2 flex-col items-center" style={{ left: at, top: -8, bottom: -8 }}>
    {bubble && <b className="absolute -top-7 whitespace-nowrap rounded-md px-2 py-0.5 text-t4" style={{ background: GOLD, color: '#1c1203' }}>{label}</b>}
    <span className="grid h-full w-4 cursor-ew-resize place-items-center rounded-md" style={{ background: GOLD, boxShadow: '0 0 0 3px rgba(11,15,26,.9)' }}><i className="block h-5 w-[2px] rounded bg-[#1c1203]" /></span>
  </span>
);
/* 줄 하나 — 왼쪽 이름 칸 + 9회 칸(세로 눈금선) */
function Lane({ label, sub, h = 64, lead, children, glass, guides = true, low = false }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: `${lead} minmax(0,1fr)`, minHeight: h, flexGrow: h >= 56 ? 1 : 0, maxHeight: h >= 56 ? h * 1.7 : undefined }}>
      <span className="flex flex-col justify-center pr-3"><b className="text-t3" style={{ color: W1 }}>{label}</b>{sub && <span className="text-[11px]" style={{ color: W3 }}>{sub}</span>}</span>
      <span className="relative block rounded-lg" style={glass ? { background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' } : null}>
        {guides && <span className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <i key={i} style={{ borderLeft: i > 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: low && LOW[i - 1] ? 'rgba(16,185,129,.06)' : 'transparent' }} />)}</span>}
        {children}
      </span>
    </div>
  );
}
const Head = ({ lead }) => (
  <div className="grid" style={{ gridTemplateColumns: `${lead} minmax(0,1fr)` }}>
    <span />
    <span className="grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <span key={i} className="flex flex-col items-center"><b className="font-display text-t3" style={{ color: LOW[i - 1] ? US : W2 }}>{i}회</b><span className="text-[10px]" style={{ color: US, visibility: LOW[i - 1] ? 'visible' : 'hidden' }}>기회</span></span>)}</span>
  </div>
);
const OppCells = () => <span className="absolute grid gap-1" style={{ inset: 4, gridTemplateColumns: 'repeat(9,1fr)' }}>{MOUND.map((v, i) => <span key={i} className="grid place-items-center rounded-md font-display text-t4" style={{ background: LOW[i] ? 'rgba(16,185,129,.16)' : `rgba(167,139,250,${0.1 + (v - 66) / 70})`, color: LOW[i] ? US : W1 }}>{v}</span>)}</span>;
const OppHeat = () => <span className="absolute rounded-full" style={{ left: 4, right: 4, top: '50%', height: 12, transform: 'translateY(-50%)', background: `linear-gradient(90deg, ${MOUND.map((v, i) => `${LOW[i] ? 'rgba(16,185,129,.7)' : `rgba(167,139,250,${0.25 + (v - 66) / 25})`} ${(i / 8) * 100}%`).join(', ')})` }} />;
const OppWave = () => (
  <svg viewBox="0 0 900 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
    <path d={`M0,60 L0,${60 - (MOUND[0] - 64) * 3.4} ${MOUND.map((v, i) => `L${i * 100 + 50},${60 - (v - 64) * 3.4}`).join(' ')} L900,${60 - (MOUND[8] - 64) * 3.4} L900,60 Z`} fill="rgba(167,139,250,.22)" stroke={OPP} strokeWidth="2" vectorEffect="non-scaling-stroke" />
  </svg>
);
const Starter = ({ bubble, mono }) => (
  <>
    <span className="absolute inset-y-1.5 left-1 flex items-center gap-2 rounded-md px-2" style={{ width: `calc(${pct(EXIT)} - 6px)`, background: mono ? 'rgba(255,255,255,.12)' : `linear-gradient(90deg, ${SPB}66, ${SPB}22)` }}>
      <Portrait player={SP} w={30} h={38} color="#334155" /><b className="text-t4" style={{ color: W1 }}>{SP.name}</b>
    </span>
    <Handle at={pct(EXIT)} label="85구 · 약 5.2회" bubble={bubble} />
  </>
);
const Pens = ({ mono }) => RELIEF.map(([a, b, p]) => (
  <span key={a} className="absolute inset-y-1.5 flex items-center justify-center gap-1.5 rounded-md px-1" style={{ left: `calc(${pct(a - 1)} + 3px)`, width: `calc(${pct(b - a + 1)} - 6px)`, background: mono ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
    <Portrait player={p} w={26} h={32} color="#334155" /><span className="truncate text-[11px]" style={{ color: W1 }}>{p.name}</span>
  </span>
));
const Atk = ({ mono }) => ATK.map(([a, b, v], i) => (
  <React.Fragment key={a}>
    <span className="absolute inset-y-1.5 flex items-center justify-center gap-2 rounded-md" style={{ left: `calc(${pct(a - 1)} + 3px)`, width: `calc(${pct(b - a + 1)} - 6px)`, background: v === '보통' || mono ? 'rgba(255,255,255,.04)' : `${ATK_C[v]}1f`, boxShadow: `inset 0 0 0 1px ${v === '보통' || mono ? 'rgba(255,255,255,.08)' : `${ATK_C[v]}66`}` }}>
      {!mono && v !== '보통' && <i className="block h-2 w-2 rounded-full" style={{ background: ATK_C[v] }} />}
      <b className="text-t4" style={{ color: v === '보통' ? W2 : W1 }}>{v}</b>
    </span>
    {i < ATK.length - 1 && <span className="absolute inset-y-3 z-10 w-1.5 -translate-x-1/2 cursor-ew-resize rounded-full bg-white/40" style={{ left: pct(b) }} />}
  </React.Fragment>
));
const Aug = () => <span className="absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full text-t4 font-black" style={{ left: `calc(${pct(AUG - 1)} + ${100 / 18}%)`, background: GOLD, color: '#1c1203', boxShadow: '0 0 0 3px rgba(11,15,26,.9)' }}>✦</span>;
const Card = ({ wide }) => (
  <div className="mt-cut flex items-center gap-4 px-4 py-3" style={{ ...cut(12), background: 'rgba(96,165,250,.06)', boxShadow: 'inset 0 0 0 1px rgba(96,165,250,.28)' }}>
    <Portrait player={SP} w={wide ? 52 : 40} h={wide ? 66 : 50} color="#334155" />
    <span className="flex flex-col"><span className="text-t4" style={{ color: W3 }}>오늘 선발</span><b className="text-t2" style={{ color: W1 }}>{SP.name}</b><span className="text-[11px]" style={{ color: W3 }}>체력 {st(SP, 'stamina', 90)} · 구위 {st(SP, 'stuff', 80)}</span></span>
    <span className="ml-auto flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>끊는 기준</span><Seg opts={['이닝', '투구 수', '타자 수']} on="투구 수" /><b className="w-16 text-right font-display text-t1" style={{ color: W1 }}>85구</b></span>
  </div>
);
const Mix = () => <span className="flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>볼 배합</span><Seg opts={['섞기', '직구', '휘는 공', '떨어지는 공']} on="섞기" /></span>;

/* ───── 8안 ───── */
const L = '9rem';
const CENTER = {
  1: ['정돈 기본', () => (
    <div className="flex h-full flex-col gap-3">
      <Card />
      <Head lead={L} />
      <Lane lead={L} label="상대 마운드" h={44} guides={false}><OppCells /></Lane>
      <i className="block h-px bg-white/[0.07]" />
      <Lane lead={L} label="우리 선발" sub="손잡이로 어디까지" h={64} glass><Starter /></Lane>
      <Lane lead={L} label="불펜" h={64} glass><Pens /></Lane>
      <Lane lead={L} label="공격" sub="구간 끝을 끌어" h={56} glass><Atk /></Lane>
      <Lane lead={L} label="증강" h={44}><Aug /></Lane>
      <span className="mt-auto flex justify-end"><Mix /></span>
    </div>
  )],
  2: ['간트', () => (
    <div className="flex h-full flex-col gap-1">
      <Head lead={L} />
      <div className="relative flex flex-1 flex-col gap-1">
        {[['상대 마운드', null, 50, <OppWave key="w" />], ['우리 선발', '85구 · 약 5.2회', 70, <Starter key="s" />], ['불펜', null, 70, <Pens key="p" />], ['공격', null, 60, <Atk key="a" />], ['증강', null, 46, <Aug key="g" />]].map(([k, sub, h, el]) => (
          <Lane key={k} lead={L} label={k} sub={sub} h={h}>{el}</Lane>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2"><span className="flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>선발 끊는 기준</span><Seg opts={['이닝', '투구 수', '타자 수']} on="투구 수" /></span><Mix /></div>
    </div>
  )],
  3: ['투수 카드 위', () => (
    <div className="flex h-full flex-col gap-4">
      <Card wide />
      <div className="flex flex-1 flex-col gap-2">
        <Head lead={L} />
        <Lane lead={L} label="상대 마운드" h={40} guides={false}><OppHeat /></Lane>
        <Lane lead={L} label="마운드" h={72} glass><Starter /><Pens /></Lane>
        <Lane lead={L} label="공격" h={60} glass><Atk /></Lane>
        <Lane lead={L} label="증강" h={44}><Aug /></Lane>
      </div>
      <span className="flex justify-end"><Mix /></span>
    </div>
  )],
  4: ['열띠', () => (
    <div className="flex h-full flex-col gap-3">
      <Head lead={L} />
      <Lane lead={L} label="상대 마운드" sub="꺼진 곳 = 기회" h={36} guides={false}><OppHeat /></Lane>
      <Lane lead={L} label="우리 선발" h={68} glass><Starter /></Lane>
      <Lane lead={L} label="불펜" h={68} glass><Pens /></Lane>
      <Lane lead={L} label="공격" h={60} glass><Atk /></Lane>
      <Lane lead={L} label="증강" h={44}><Aug /></Lane>
      <div className="mt-auto flex items-center justify-between"><span className="flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>선발 끊는 기준</span><Seg opts={['이닝', '투구 수', '타자 수']} on="투구 수" /><b className="font-display text-t2" style={{ color: W1 }}>85구</b></span><Mix /></div>
    </div>
  )],
  5: ['기회 기둥', () => (
    <div className="flex h-full flex-col gap-2">
      <Card />
      <Head lead={L} />
      <Lane lead={L} label="상대 마운드" h={44} low><OppCells /></Lane>
      <Lane lead={L} label="우리 선발" h={64} low><Starter /></Lane>
      <Lane lead={L} label="불펜" h={64} low><Pens /></Lane>
      <Lane lead={L} label="공격" h={56} low><Atk /></Lane>
      <Lane lead={L} label="증강" h={44} low><Aug /></Lane>
      <span className="mt-auto flex justify-end"><Mix /></span>
    </div>
  )],
  6: ['유리 레인', () => (
    <div className="flex h-full flex-col gap-3">
      <Head lead={L} />
      {[['상대', <OppWave key="w" />, 60], ['마운드', <React.Fragment key="m"><Starter /><Pens /></React.Fragment>, 76], ['공격', <Atk key="a" />, 64]].map(([k, el, h]) => (
        <div key={k} className="mt-cut p-2" style={{ ...cut(12), background: 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.015))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.09)' }}>
          <Lane lead={L} label={k} h={h}>{el}</Lane>
        </div>
      ))}
      <Lane lead={L} label="증강" h={44}><Aug /></Lane>
      <div className="mt-auto flex items-center justify-between"><span className="flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>선발 끊는 기준</span><Seg opts={['이닝', '투구 수', '타자 수']} on="투구 수" /><b className="font-display text-t2" style={{ color: W1 }}>85구</b></span><Mix /></div>
    </div>
  )],
  7: ['손잡이 말풍선', () => (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-4"><span className="text-t4" style={{ color: W2 }}>선발 {SP.name} 끊는 기준</span><Seg opts={['이닝', '투구 수', '타자 수']} on="투구 수" /><span className="text-t4" style={{ color: W3 }}>손잡이를 끌면 값이 바뀜</span><span className="ml-auto"><Mix /></span></div>
      <Head lead={L} />
      <Lane lead={L} label="상대 마운드" h={44} guides={false}><OppCells /></Lane>
      <span className="h-4" />
      <Lane lead={L} label="우리 선발" h={68} glass><Starter bubble /></Lane>
      <Lane lead={L} label="불펜" h={68} glass><Pens /></Lane>
      <Lane lead={L} label="공격" h={60} glass><Atk /></Lane>
      <Lane lead={L} label="증강" h={44}><Aug /></Lane>
    </div>
  )],
  8: ['흑백', () => (
    <div className="flex h-full flex-col gap-3">
      <Card />
      <Head lead={L} />
      <Lane lead={L} label="상대 마운드" h={44} guides={false}><OppCells /></Lane>
      <Lane lead={L} label="우리 선발" h={64} glass><Starter mono /></Lane>
      <Lane lead={L} label="불펜" h={64} glass><Pens mono /></Lane>
      <Lane lead={L} label="공격" h={56} glass><Atk mono /></Lane>
      <Lane lead={L} label="증강" h={44}><Aug /></Lane>
      <span className="mt-auto flex justify-end"><Mix /></span>
    </div>
  )],
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
