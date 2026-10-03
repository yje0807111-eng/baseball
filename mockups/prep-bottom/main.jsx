/*
 * 정비 판 아래 띠 목업 (/mockups/prep-bottom/?p=1 → 1~4안, ?p=2 → 5~8안) — 안마다 단계 셋(1 라인업 · 2 경기 흐름 · 3 상황 대응)의 띠를 위아래로.
 * 분석(2026-10-03): 늘 필요한 건 '다음 · 경기 시작' 단추뿐. 1단계 = 시너지(출전 명단에 따라 바뀜), 2단계 = 없음(가운데에 다 보임),
 * 3단계 = 고른 설계 한 줄 요약(경기 전 마지막 확인) + 준비 카드(가진 게 있을 때만). 선발 이닝 · 증강 · 필승조 · 상황 개수는 중복이라 뺀다.
 *  1 기본 — 왼쪽 정보 · 오른쪽 단추
 *  2 단계 점 — 왼쪽에 1 · 2 · 3 진행 점, 2단계도 띠가 비지 않게
 *  3 띠 없애기 — 2단계는 띠 없이 단추만 판 오른쪽 아래, 1 · 3단계는 낮은 띠
 *  4 칩 — 시너지 이름 칩 · 요약 칩
 *  5 두 줄 요약 — 3단계 요약을 공격 · 마운드 · 상황 두 줄로
 *  6 준비 카드 크게 — 3단계 준비 카드를 단추 옆 큰 카드 셋
 *  7 이전 · 다음 — 왼쪽 '◀ 이전' 단추 함께
 *  8 단추 안 진행 — 단추에 '1 / 3' 진행을 넣어 한 덩어리
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { UiStyle, GlassBg } from '../../src/myteam/ui.jsx';
import { SynIcon } from '../../src/myteam/ReadyLocker.jsx';

const PAGE = Number(new URLSearchParams(location.search).get('p') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const US = '#10b981', GOLD = '#fbbf24', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280';
const SYN = [
  { id: 'franchise', name: '프랜차이즈', level: 2, tiers: [2, 4, 6] }, { id: 'cleanup', name: '클린업', level: 1, tiers: [2, 3] },
  { id: 'battery', name: '배터리', level: 2, tiers: [1, 2] }, { id: 'fireball', name: '파이어볼', level: 1, tiers: [2, 4, 6] },
  { id: 'contactLine', name: '교타 라인', level: 1, tiers: [3, 5] }, { id: 'changeup', name: '체인지업', level: 0, tiers: [2, 4] },
];
const SUM = [['공격', '강공'], ['선발', '두 바퀴'], ['배합', '섞기'], ['필승조', '이재만 · 유동훈 · 차명석'], ['증강', '7회'], ['상황', '센 불펜 · 유인구']];
const CARDS = [['타선 미팅', 2, '타선 컨택 +5'], ['마운드 미팅', 0, '마운드 구위 +5'], ['불펜 데이', 1, '불펜 체력 +20']];
const NEXT = ['다음 · 경기 흐름 ▶', '다음 · 상황 대응 ▶', '경기 시작 ▶'];

const Go = ({ t, w = 288 }) => <span className="mt-cut grid h-12 shrink-0 place-items-center text-t2 font-black" style={{ ...cut(12), width: w, background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}>{t}</span>;
const Syn = ({ names }) => (
  <span className="flex items-center gap-2.5">
    <span className="text-t4" style={{ color: W3 }}>시너지</span><b className="font-display text-t3" style={{ color: W1 }}>{SYN.filter((s) => s.level).length}</b>
    {SYN.map((s) => (names
      ? <span key={s.id} className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)', opacity: s.level ? 1 : 0.45 }}><SynIcon s={s} w={24} /><span className="text-t4" style={{ color: W1 }}>{s.name}</span></span>
      : <span key={s.id} style={{ opacity: s.level ? 1 : 0.45 }}><SynIcon s={s} w={30} /></span>))}
  </span>
);
const Sum = ({ chips }) => (
  <span className="flex min-w-0 items-center gap-x-4 gap-y-1">
    {SUM.map(([k, v]) => (chips
      ? <span key={k} className="whitespace-nowrap rounded-full px-2.5 py-1 text-t4" style={{ color: W1, background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}><span style={{ color: W3 }}>{k} </span>{v}</span>
      : <span key={k} className="flex flex-col"><span className="text-[11px]" style={{ color: W3 }}>{k}</span><b className="whitespace-nowrap text-t3" style={{ color: W1 }}>{v}</b></span>))}
  </span>
);
const Cards = ({ big }) => (
  <span className="flex shrink-0 items-center gap-1.5">
    {!big && <span className="mr-1 text-t4" style={{ color: W3 }}>준비 카드</span>}
    {CARDS.filter(([, n]) => n > 0).map(([k, n, eff], i) => (
      <span key={k} className="mt-cut flex flex-col justify-center px-3" style={{ ...cut(8), height: big ? 56 : 40, background: i === 0 ? 'rgba(16,185,129,.14)' : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${i === 0 ? US : 'rgba(255,255,255,.1)'}` }}>
        <span className="flex items-center gap-2"><b className="text-t4" style={{ color: W1 }}>{k}</b><span className="font-display text-t4" style={{ color: W3 }}>{n}</span></span>
        {big && <span className="text-[11px]" style={{ color: W2 }}>{eff}</span>}
      </span>
    ))}
  </span>
);
const Dots = ({ s }) => <span className="flex shrink-0 items-center gap-1.5">{[0, 1, 2].map((i) => <i key={i} className="block h-2 rounded-full" style={{ width: i === s ? 22 : 8, background: i <= s ? GOLD : 'rgba(255,255,255,.15)' }} />)}<span className="ml-1.5 text-t4" style={{ color: W2 }}>{s + 1} / 3</span></span>;

/* 안마다 [1단계, 2단계, 3단계] 띠 */
const V = {
  1: ['기본', [() => <><Syn /><span className="flex-1" /><Go t={NEXT[0]} /></>, () => <><span className="flex-1" /><Go t={NEXT[1]} /></>, () => <><Sum /><span className="flex-1" /><Cards /><Go t={NEXT[2]} /></>]],
  2: ['단계 점', [() => <><Dots s={0} /><i className="h-8 w-px bg-white/10" /><Syn /><span className="flex-1" /><Go t={NEXT[0]} /></>, () => <><Dots s={1} /><span className="flex-1" /><Go t={NEXT[1]} /></>, () => <><Dots s={2} /><i className="h-8 w-px bg-white/10" /><Sum /><span className="flex-1" /><Cards /><Go t={NEXT[2]} /></>]],
  3: ['띠 없애기', [() => <><Syn /><span className="flex-1" /><Go t={NEXT[0]} w={240} /></>, 'none', () => <><Sum /><span className="flex-1" /><Cards /><Go t={NEXT[2]} w={240} /></>]],
  4: ['칩', [() => <><Syn names /><span className="flex-1" /><Go t={NEXT[0]} /></>, () => <><span className="flex-1" /><Go t={NEXT[1]} /></>, () => <><Sum chips /><span className="flex-1" /><Cards /><Go t={NEXT[2]} /></>]],
  5: ['두 줄 요약', [() => <><Syn /><span className="flex-1" /><Go t={NEXT[0]} /></>, () => <><span className="flex-1" /><Go t={NEXT[1]} /></>, () => (
    <>
      <span className="grid gap-x-5 gap-y-1 text-t4" style={{ gridTemplateColumns: 'auto 1fr' }}>
        <span style={{ color: W3 }}>공격 · 마운드</span><b style={{ color: W1 }}>강공 · 두 바퀴 교체 · 섞기 · 필승조 이재만 · 유동훈 · 차명석</b>
        <span style={{ color: W3 }}>증강 · 상황</span><b style={{ color: W1 }}>7회 증강 · 센 불펜 · 유인구</b>
      </span>
      <span className="flex-1" /><Cards /><Go t={NEXT[2]} />
    </>)]],
  6: ['준비 카드 크게', [() => <><Syn /><span className="flex-1" /><Go t={NEXT[0]} /></>, () => <><span className="flex-1" /><Go t={NEXT[1]} /></>, () => <><Sum /><span className="flex-1" /><Cards big /><Go t={NEXT[2]} /></>]],
  7: ['이전 · 다음', [() => <><Syn /><span className="flex-1" /><Go t={NEXT[0]} /></>, () => <><span className="mt-cut grid h-12 place-items-center text-t3 font-bold" style={{ ...cut(10), width: 128, color: W1, background: 'rgba(255,255,255,.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>◀ 이전</span><span className="flex-1" /><Go t={NEXT[1]} /></>, () => <><span className="mt-cut grid h-12 shrink-0 place-items-center text-t3 font-bold" style={{ ...cut(10), width: 128, color: W1, background: 'rgba(255,255,255,.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>◀ 이전</span><Sum /><span className="flex-1" /><Cards /><Go t={NEXT[2]} /></>]],
  8: ['단추 안 진행', [0, 1, 2].map((s) => () => {
    const btn = (
      <span className="mt-cut flex h-12 shrink-0 items-center gap-3 px-5" style={{ ...cut(12), background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}>
        <span className="flex gap-1">{[0, 1, 2].map((i) => <i key={i} className="block h-1.5 rounded-full" style={{ width: i === s ? 16 : 6, background: i <= s ? '#1c1203' : 'rgba(28,18,3,.3)' }} />)}</span>
        <b className="text-t2 font-black">{NEXT[s]}</b>
      </span>
    );
    return s === 0 ? <><Syn /><span className="flex-1" />{btn}</> : s === 1 ? <><span className="flex-1" />{btn}</> : <><Sum /><span className="flex-1" /><Cards />{btn}</>;
  })],
};

function Variant({ n }) {
  const [t, bars] = V[n];
  return (
    <div className="flex flex-col gap-1.5">
      <b className="text-t3 text-white"><span className="mr-2 font-display" style={{ color: GOLD }}>{n}</span>{t}</b>
      <div className="mt-cut flex flex-col p-4 pt-0" style={{ ...cut(16), width: 1530, background: 'rgba(14,18,32,.85)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
        {bars.map((B, i) => (
          <div key={i} className="flex items-center gap-4" style={{ minHeight: 76, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 12, marginTop: i ? 10 : 12 }}>
            <span className="w-14 shrink-0 text-t4" style={{ color: W3 }}>{i + 1}단계</span>
            {B === 'none' ? <span className="text-t4" style={{ color: W3 }}>띠 없음 — 판 오른쪽 아래에 '다음 · 상황 대응 ▶'만</span> : <B />}
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex h-full flex-col items-center justify-center gap-3" style={{ transform: 'scale(.62)', transformOrigin: '50% 50%' }}>
        {(PAGE === 2 ? [5, 6, 7, 8] : [1, 2, 3, 4]).map((n) => <Variant key={n} n={n} />)}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
