/*
 * 정비 1단계(라인업) 가운데 판 목업 (/mockups/prep-lineup/?v=1~8, 1920 × 911 — 왼쪽 상대 판 자리는 비워 둠)
 * lineup-sim(8,000경기): 1단계에서 승률을 바꾸는 건 '센 선수를 자기 자리에'(포지션 이탈 한 명 −2.3%p)와 타순(거꾸로 −1.5) — 상대와 상관없다.
 * 그래서 판이 보여 줄 것: 타순 1~9 · 각자 수비 자리 · 이탈 감점 · 벤치 · 오늘 선발. 답(추천)은 적지 않는다.
 * 비교: MLB 9이닝스(타순 목록 + 포지션) · OOTP(표) · FC 온라인(구장 위 배치 + 벤치) · MLB The Show(타순 목록 + 상세)
 *  1 구장 + 타순   — 왼쪽 다이아몬드(수비 자리), 오른쪽 타순 9줄, 아래 벤치
 *  2 카드 줄       — 지금 판(타순 카드 9장) 다듬기 + 아래 벤치 · 오늘 선발
 *  3 표            — 타순 · 자리 · 이름 · 컨택 · 파워 · 주력 · 수비 · 종합 표 + 오른쪽 벤치 표
 *  4 줄 + 상세     — 타순 9줄, 고른 선수 상세(능력치 · 같은 자리 벤치)
 *  5 3 × 3 카드    — 큰 카드 아홉 + 오른쪽 벤치 기둥
 *  6 구장 크게     — 구장 위 아홉(타순 번호 배지), 아래 벤치 줄
 *  7 타선 묶음     — 테이블 세터(1~2) · 중심(3~5) · 하위(6~9) 묶음
 *  8 경기 명단     — 타순 9 + 오늘 선발 + 불펜 순서까지 한 판
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { POS_COLOR } from '../../src/myteam/teamColor.js';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const MYT = seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2));
const ME = engineTeam(MYT);
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;
const V = Number(new URLSearchParams(location.search).get('v') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', DIM = '#9ca3af';
const POS_KO = { C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', LF: '좌익수', CF: '중견수', RF: '우익수', DH: '지명' };
/* 수비 자리 — 외야(OF)는 좌 · 중 · 우 순서로. 예시로 6번을 3루로 돌려 이탈 감점(−6)을 보인다 */
let of = 0;
const LINE = ME.batters.map((b, i) => {
  const nat = b.position;
  let slot = nat === 'OF' ? ['LF', 'CF', 'RF'][of++] || 'DH' : nat;
  return { b, slot, nat, order: i + 1 };
});
const seen = new Set(); LINE.forEach((x) => { if (seen.has(x.slot)) x.slot = 'DH'; seen.add(x.slot); });
if (!seen.has('DH')) { const k = LINE.find((x) => x.order === 9); if (k) k.slot = 'DH'; }
const OFF = LINE.find((x) => x.slot === '3B') || LINE[3]; // 예시 이탈(제 자리 아닌 3루) — 지명은 감점 없음
const offPen = (x) => (x === OFF ? 6 : 0);
const BENCH = ME.bench || [];
const SP = ME.pitchers[0], PEN = ME.pitchers.slice(1).filter((p) => p.position !== 'SP');
const posC = (slot) => POS_COLOR[['LF', 'CF', 'RF'].includes(slot) ? 'OF' : slot] || US;
const XY = { C: [50, 90], '1B': [74, 60], '2B': [62, 44], SS: [38, 44], '3B': [26, 60], LF: [17, 24], CF: [50, 11], RF: [83, 24], DH: [90, 92] };
const ovr = (p) => p.overall;

/* ───── 조각 ───── */
const Sub = ({ children, right }) => <span className="flex items-baseline justify-between"><span className="text-t3 font-bold text-gray-300">{children}</span>{right}</span>;
const PosB = ({ slot, sm }) => <b className={`whitespace-nowrap rounded px-1.5 ${sm ? 'text-[11px] leading-4' : 'text-t4'}`} style={{ color: posC(slot), boxShadow: `inset 0 0 0 1px ${posC(slot)}66` }}>{POS_KO[slot] || slot}</b>;
const Pen = ({ x }) => (offPen(x) ? <b className="whitespace-nowrap rounded-full px-2 text-t4" style={{ color: '#0b0f1a', background: RED }}>이탈 −{offPen(x)}</b> : null);
const Num = ({ v }) => <b className="font-display text-t3" style={{ color: v >= 90 ? GOLD : v >= 80 ? '#e5e7eb' : DIM }}>{v}</b>;
const Hand = ({ h }) => <b className="text-t4" style={{ color: h === 'L' ? GOLD : '#7dd3fc' }}>{h === 'L' ? '좌' : h === 'S' ? '양' : '우'}</b>;
function Field({ big, chips = true }) {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M50 96 L94 52 Q50 -14 6 52 Z" fill="rgba(52,211,153,.07)" stroke="rgba(255,255,255,.12)" strokeWidth=".4" />
        <path d="M50 92 L70 68 L50 46 L30 68 Z" fill="rgba(251,191,36,.07)" stroke="rgba(255,255,255,.22)" strokeWidth=".4" />
      </svg>
      {LINE.map((x) => (
        <span key={x.b.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ width: 120, left: `${XY[x.slot][0]}%`, top: `${XY[x.slot][1]}%` }}>
          <span className="relative flex shrink-0">
            <Portrait player={x.b} w={big ? 58 : 44} h={big ? 74 : 56} color={offPen(x) ? RED : posC(x.slot)} />
            <b className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full font-display text-t4" style={{ background: '#0b0f1a', color: GOLD, boxShadow: `inset 0 0 0 1.5px ${GOLD}` }}>{x.order}</b>
          </span>
          <b className={`whitespace-nowrap ${big ? 'text-t3' : 'text-t4'} text-white`}>{x.b.name}</b>
          {chips && (offPen(x) ? <Pen x={x} /> : <PosB slot={x.slot} sm />)}
        </span>
      ))}
    </div>
  );
}
const OrderRow = ({ x, sel, stats = true }) => (
  <div className="mt-cut grid items-center gap-3 px-3 py-2" style={{ ...cut(8), gridTemplateColumns: '1.6rem 2.2rem 1fr 4rem auto' + (stats ? ' 9rem' : ''), background: sel ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${sel ? `${US}88` : offPen(x) ? `${RED}66` : 'rgba(255,255,255,.06)'}` }}>
    <b className="font-display text-t2" style={{ color: GOLD }}>{x.order}</b>
    <Portrait player={x.b} w={30} h={38} color={posC(x.slot)} />
    <span className="flex min-w-0 items-center gap-2"><b className="truncate text-t3 text-white">{x.b.name}</b><Hand h={x.b.hand} /></span>
    <PosB slot={x.slot} />
    <span className="flex justify-end"><Pen x={x} /></span>
    {stats && <span className="flex justify-end gap-3 text-t4 text-gray-500"><span>컨 <Num v={st(x.b, 'contact')} /></span><span>파 <Num v={st(x.b, 'power')} /></span><span>주 <Num v={st(x.b, 'speed')} /></span></span>}
  </div>
);
const BenchChip = ({ p }) => (
  <span className="mt-cut flex items-center gap-2 px-2.5 py-1.5" style={{ ...cut(8), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
    <Portrait player={p} w={26} h={32} color={POS_COLOR[p.position] || US} />
    <span className="flex flex-col"><b className="text-t4 text-white">{p.name}</b><span className="text-[11px] text-gray-400">{POS_KO[p.position] || (p.position === 'OF' ? '외야수' : p.position)} · {ovr(p)}</span></span>
  </span>
);
const Bench = ({ col }) => (
  <div className={`flex ${col ? 'flex-col' : 'flex-wrap'} gap-1.5`}>{BENCH.map((p) => <BenchChip key={p.id} p={p} />)}</div>
);
const SpCard = () => (
  <span className="mt-cut flex items-center gap-3 px-3 py-2" style={{ ...cut(10), background: 'rgba(96,165,250,.1)', boxShadow: 'inset 0 0 0 1px rgba(96,165,250,.4)' }}>
    <Portrait player={SP} w={34} h={44} color="#60a5fa" />
    <span className="flex flex-col"><span className="text-t4 text-gray-400">오늘 선발</span><b className="text-t3 text-white">{SP.name}</b></span>
    <span className="ml-2 flex gap-3 text-t4 text-gray-500"><span>구위 <Num v={st(SP, 'stuff', 80)} /></span><span>제구 <Num v={st(SP, 'control', 75)} /></span><span>체력 <Num v={st(SP, 'stamina', 90)} /></span></span>
  </span>
);

/* ───── 8안 ───── */
const CENTER = {
  1: ['구장 + 타순', () => (
    <div className="grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '1fr 1.1fr' }}>
      <div className="flex min-h-0 flex-col gap-2"><Sub>수비</Sub><div className="min-h-0 flex-1"><Field /></div></div>
      <div className="flex min-h-0 flex-col gap-2">
        <Sub right={<span className="flex gap-2"><Btn t="자동 배치" /></span>}>타순</Sub>
        <div className="flex flex-col gap-1">{LINE.map((x) => <OrderRow key={x.b.id} x={x} sel={x.order === 3} />)}</div>
        <Sub>벤치</Sub><Bench />
      </div>
    </div>
  )],
  2: ['카드 줄', () => (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Sub right={<Btn t="자동 배치" />}>타순</Sub>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(9,minmax(0,1fr))' }}>
        {LINE.map((x) => (
          <span key={x.b.id} className="mt-cut flex flex-col gap-1.5 p-2" style={{ ...cut(10), background: 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1.5px ${offPen(x) ? RED : `${posC(x.slot)}55`}` }}>
            <span className="flex items-center justify-between"><b className="font-display text-t1 leading-none" style={{ color: GOLD }}>{x.order}</b><b className="font-display text-t3 text-white">{ovr(x.b)}</b></span>
            <Portrait player={x.b} w={120} h={130} color={posC(x.slot)} />
            <b className="truncate text-t3 text-white">{x.b.name}</b>
            <span className="flex items-center justify-between"><PosB slot={x.slot} sm /><Hand h={x.b.hand} /></span>
            <span className="h-5">{offPen(x) ? <Pen x={x} /> : null}</span>
          </span>
        ))}
      </div>
      <div className="grid gap-5" style={{ gridTemplateColumns: 'auto 1fr' }}>
        <div className="flex flex-col gap-2"><Sub>오늘 선발</Sub><SpCard /></div>
        <div className="flex flex-col gap-2"><Sub>벤치</Sub><Bench /></div>
      </div>
    </div>
  )],
  3: ['표', () => {
    const cols = ['타순', '', '이름', '자리', '컨택', '파워', '주력', '수비', '종합', ''];
    const g = '3rem 2.4rem 1fr 5rem repeat(5,4rem) 6rem';
    return (
      <div className="grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '1fr 20rem' }}>
        <div className="flex flex-col">
          <div className="grid px-3 pb-2 text-t4 text-gray-500" style={{ gridTemplateColumns: g }}>{cols.map((c, i) => <span key={i} className={i > 3 ? 'text-center' : ''}>{c}</span>)}</div>
          {LINE.map((x, i) => (
            <div key={x.b.id} className="grid items-center px-3 py-2" style={{ gridTemplateColumns: g, background: i % 2 ? 'transparent' : 'rgba(255,255,255,.025)', boxShadow: offPen(x) ? `inset 3px 0 0 ${RED}` : undefined }}>
              <b className="font-display text-t2" style={{ color: GOLD }}>{x.order}</b>
              <Portrait player={x.b} w={26} h={32} color={posC(x.slot)} />
              <span className="flex items-center gap-2"><b className="text-t3 text-white">{x.b.name}</b><Hand h={x.b.hand} /></span>
              <PosB slot={x.slot} />
              {['contact', 'power', 'speed', 'defense'].map((k) => <span key={k} className="text-center"><Num v={st(x.b, k)} /></span>)}
              <span className="text-center"><b className="font-display text-t2 text-white">{ovr(x.b)}</b></span>
              <span className="flex justify-end"><Pen x={x} /></span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2"><Sub>벤치</Sub><Bench col /><Sub>오늘 선발</Sub><SpCard /></div>
      </div>
    );
  }],
  4: ['줄 + 상세', () => {
    const x = LINE[2], same = BENCH.filter((p) => p.position === x.nat || (x.nat === 'OF' && p.position === 'OF'));
    return (
      <div className="grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div className="flex flex-col gap-1">{LINE.map((y) => <OrderRow key={y.b.id} x={y} sel={y === x} stats={false} />)}</div>
        <div className="mt-cut flex flex-col gap-4 p-5" style={{ ...cut(14), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
          <span className="flex items-center gap-4"><Portrait player={x.b} w={86} h={108} color={posC(x.slot)} /><span className="flex flex-col gap-1"><span className="flex items-center gap-2"><b className="font-display text-t1" style={{ color: GOLD }}>{x.order}번</b><PosB slot={x.slot} /></span><b className="text-t1 text-white">{x.b.name}</b><span className="text-t3 text-gray-400">종합 <b className="text-white">{ovr(x.b)}</b> · <Hand h={x.b.hand} />타</span></span></span>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>{[['컨택', 'contact'], ['파워', 'power'], ['주력', 'speed'], ['수비', 'defense']].map(([k, s]) => <span key={k} className="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.04] py-2.5"><span className="text-t4 text-gray-400">{k}</span><b className="font-display text-t1 leading-none text-white">{st(x.b, s)}</b></span>)}</div>
          <Sub>같은 자리 벤치</Sub>
          <div className="flex flex-wrap gap-1.5">{same.length ? same.map((p) => <BenchChip key={p.id} p={p} />) : <span className="text-t4 text-gray-500">없음</span>}</div>
        </div>
      </div>
    );
  }],
  5: ['3 × 3 카드', () => (
    <div className="grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '1fr 17rem' }}>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)' }}>
        {LINE.map((x) => (
          <span key={x.b.id} className="mt-cut flex items-center gap-3 px-3" style={{ ...cut(12), background: 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1.5px ${offPen(x) ? RED : `${posC(x.slot)}44`}` }}>
            <b className="font-display text-[40px] leading-none" style={{ color: GOLD }}>{x.order}</b>
            <Portrait player={x.b} w={58} h={72} color={posC(x.slot)} />
            <span className="flex min-w-0 flex-col gap-1"><b className="truncate text-t2 text-white">{x.b.name}</b><span className="flex items-center gap-2"><PosB slot={x.slot} sm /><Hand h={x.b.hand} /><b className="font-display text-t3 text-gray-300">{ovr(x.b)}</b></span>{offPen(x) ? <span><Pen x={x} /></span> : null}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2"><Sub>벤치</Sub><Bench col /></div>
    </div>
  )],
  6: ['구장 크게', () => (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1 px-24"><Field big /></div>
      <div className="flex items-center gap-4"><Sub>벤치</Sub><Bench /></div>
    </div>
  )],
  7: ['타선 묶음', () => {
    const grp = [['테이블 세터', [0, 2]], ['중심 타선', [2, 5]], ['하위 타선', [5, 9]]];
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 3fr 4fr' }}>
          {grp.map(([ko, [a, b]]) => (
            <div key={ko} className="mt-cut flex flex-col gap-2 p-3" style={{ ...cut(12), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
              <b className="text-t3 text-gray-300">{ko}</b>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${b - a},minmax(0,1fr))` }}>
                {LINE.slice(a, b).map((x) => (
                  <span key={x.b.id} className="flex flex-col items-center gap-1 rounded-lg py-2" style={{ background: offPen(x) ? `${RED}14` : 'rgba(255,255,255,.03)' }}>
                    <b className="font-display text-t2" style={{ color: GOLD }}>{x.order}</b>
                    <Portrait player={x.b} w={64} h={80} color={posC(x.slot)} />
                    <b className="text-t3 text-white">{x.b.name}</b>
                    <PosB slot={x.slot} sm />
                    <span className="flex gap-2 text-[11px] text-gray-500"><span>컨 {st(x.b, 'contact')}</span><span>파 {st(x.b, 'power')}</span><span>주 {st(x.b, 'speed')}</span></span>
                    {offPen(x) ? <Pen x={x} /> : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4"><Sub>벤치</Sub><Bench /></div>
      </div>
    );
  }],
  8: ['경기 명단', () => (
    <div className="grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
      <div className="flex flex-col gap-1"><Sub>타순</Sub>{LINE.map((x) => <OrderRow key={x.b.id} x={x} />)}</div>
      <div className="flex flex-col gap-3">
        <Sub>오늘 선발</Sub><SpCard />
        <Sub>불펜</Sub>
        <div className="flex flex-col gap-1">{PEN.slice(0, 6).map((p, i) => <span key={p.id} className="flex items-center gap-2.5 rounded-md bg-white/[0.03] px-3 py-1.5"><b className="w-4 font-display text-t4 text-gray-500">{i + 1}</b><Portrait player={p} w={22} h={28} color="#f87171" /><b className="flex-1 text-t3 text-white">{p.name}</b><span className="text-t4 text-gray-400">구위 · 제구</span><b className="font-display text-t3 text-gray-200">{Math.round(arm(p))}</b></span>)}</div>
        <Sub>벤치</Sub><Bench />
      </div>
    </div>
  )],
};
function Btn({ t }) { return <span className="mt-cut px-3.5 py-2 text-t3 font-bold text-white" style={{ ...cut(8), background: 'rgba(255,255,255,.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>{t}</span>; }

function App() {
  const [t, Center] = CENTER[V];
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex h-full flex-col gap-3 px-2.5 pb-2.5 pt-3">
        <div className="flex h-[70px] shrink-0 items-center gap-4 px-3"><b className="text-t1 font-black text-white">경기 전 정비</b><span className="rounded-full px-3 py-1 text-t4 font-bold" style={{ color: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}66` }}>{V} · {t}</span></div>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
          <aside className="mt-cut grid place-items-center text-t4 text-gray-600" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>오늘 상대 판</aside>
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(20), '--a': US }}>
            <div className="flex shrink-0 items-center gap-6">
              {['라인업', '경기 흐름', '상황 대응'].map((x, i) => (
                <React.Fragment key={x}>
                  <span className="flex items-center gap-2.5"><b className="grid h-9 w-9 place-items-center rounded-full font-display text-t2" style={{ background: i ? 'rgba(255,255,255,.06)' : GOLD, color: i ? '#9ca3af' : '#1c1203' }}>{i + 1}</b><b className="text-t3" style={{ color: i ? '#9ca3af' : '#fff' }}>{x}</b></span>
                  {i < 2 && <i className="block h-px w-10 bg-white/15" />}
                </React.Fragment>
              ))}
              <span className="ml-auto flex w-[19rem] flex-col gap-1.5"><span className="flex justify-between text-t3"><span className="font-bold text-gray-300">예상 승률</span><b className="font-display" style={{ color: '#34d399' }}>44% : 56%</b></span><span className="flex h-2 overflow-hidden rounded-full"><i style={{ width: '44%', background: '#34d399' }} /><i className="flex-1" style={{ background: RED }} /></span></span>
            </div>
            <Center />
            <div className="flex shrink-0 items-center gap-6 border-t border-white/[0.08] pt-4 text-t4 text-gray-500">
              <span>우리 선발 <b className="text-t3 text-white">4.0회까지</b></span><span>상대 선발 <b className="text-t3 text-white">4.9회까지</b></span>
              <span className="ml-auto mt-cut grid h-14 w-[20rem] place-items-center text-t2 font-black" style={{ ...cut(12), background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}>다음 · 경기 흐름 ▶</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
