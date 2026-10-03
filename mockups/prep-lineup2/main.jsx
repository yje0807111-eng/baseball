/*
 * 정비 1단계 가운데 — 1안(구장 + 타순) 다듬기 8안 (/mockups/prep-lineup2/?v=1~8, 1920 × 911)
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

/* ───── 1안(구장 + 타순) 다듬기 8안 ─────
 * 공통 원칙: 구장 = 수비(자리 · 수비 능력 · 이탈 감점), 타순 = 공격(컨택 · 파워 · 주력) — 두 판이 맡는 걸 나눠 같은 숫자를 두 번 적지 않는다.
 *  1 다듬기       — 구장 이름표 크게(수비 숫자) · 타순 줄 막대 · 아래 오늘 선발 + 벤치
 *  2 짝 강조      — 고른 타자(3번)가 구장 · 타순 양쪽에서 함께 빛남
 *  3 이름표 구장  — 구장엔 얼굴 없이 이름표만, 얼굴은 타순 줄에
 *  4 마운드까지   — 구장 마운드에 오늘 선발, 홈 옆 포수 — 수비 아홉 + 투수 한 판
 *  5 능력 막대    — 타순 줄의 컨택 · 파워 · 주력을 짧은 막대로
 *  6 바꾸기 열림  — 고른 타자 아래 바꿀 후보(같은 자리 벤치 · 다른 타자) 줄이 열림
 *  7 좌우 바꿈    — 타순 왼쪽 · 구장 오른쪽(읽는 순서 = 타순 먼저)
 *  8 구장 꾸밈    — 잔디 · 흙 · 베이스 · 마운드를 그린 구장 + 유리 이름표
 */
const SEL = LINE[2];
const Bar = ({ v, c }) => <span className="relative block h-1.5 w-14 rounded-full bg-white/[0.08]"><i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(6, Math.min(100, ((v - 55) / 55) * 100))}%`, background: c }} /></span>;
function Diamond({ plate = 'face', sel = null, mound = false, fancy = false }) {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {fancy && <defs><radialGradient id="grass" cx="50%" cy="90%" r="90%"><stop offset="0" stopColor="#1f6b45" stopOpacity=".55" /><stop offset="1" stopColor="#0c3a26" stopOpacity=".25" /></radialGradient></defs>}
        <path d="M50 96 L94 52 Q50 -14 6 52 Z" fill={fancy ? 'url(#grass)' : 'rgba(52,211,153,.07)'} stroke="rgba(255,255,255,.14)" strokeWidth=".4" />
        {fancy && <path d="M50 96 L76 66 Q50 30 24 66 Z" fill="rgba(180,120,70,.18)" />}
        <path d="M50 92 L70 68 L50 46 L30 68 Z" fill={fancy ? 'rgba(31,107,69,.45)' : 'rgba(251,191,36,.07)'} stroke="rgba(255,255,255,.3)" strokeWidth=".4" />
        {fancy && [[50, 92], [70, 68], [50, 46], [30, 68]].map(([x, y], i) => <rect key={i} x={x - 1.1} y={y - 1.1} width="2.2" height="2.2" fill="#f8fafc" transform={`rotate(45 ${x} ${y})`} />)}
        {(fancy || mound) && <circle cx="50" cy="68" r="2.6" fill="rgba(180,120,70,.5)" />}
      </svg>
      {mound && (
        <span className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={{ left: '50%', top: '66%' }}>
          <Portrait player={SP} w={40} h={50} color="#60a5fa" />
          <b className="whitespace-nowrap rounded-md px-1.5 text-t4 text-white" style={{ background: 'rgba(96,165,250,.25)' }}>{SP.name}</b>
        </span>
      )}
      {LINE.map((x) => {
        const on = sel === x, pen = offPen(x), c = pen ? RED : posC(x.slot);
        return (
          <span key={x.b.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ width: 132, left: `${XY[x.slot][0]}%`, top: `${XY[x.slot][1]}%` }}>
            {plate === 'face' && (
              <span className="relative flex shrink-0" style={{ filter: on ? `drop-shadow(0 0 10px ${US})` : undefined }}>
                <Portrait player={x.b} w={46} h={58} color={on ? US : c} />
                <b className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full font-display text-t4" style={{ background: on ? US : '#0b0f1a', color: on ? '#0b0f1a' : GOLD, boxShadow: `inset 0 0 0 1.5px ${on ? US : GOLD}` }}>{x.order}</b>
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: fancy ? 'rgba(11,15,26,.72)' : on ? `${US}26` : 'rgba(11,15,26,.6)', boxShadow: `inset 0 0 0 1px ${on ? US : `${c}66`}`, backdropFilter: fancy ? 'blur(6px)' : undefined }}>
              {plate !== 'face' && <b className="font-display text-t3" style={{ color: GOLD }}>{x.order}</b>}
              <b className="whitespace-nowrap text-t4 text-white">{x.b.name}</b>
              <span className="text-[11px]" style={{ color: c }}>{POS_KO[x.slot]}</span>
              {x.slot !== 'DH' && <b className="font-display text-t4" style={{ color: st(x.b, 'defense') >= 85 ? '#fff' : DIM }}>{st(x.b, 'defense')}</b>}
            </span>
            {pen ? <Pen x={x} /> : null}
          </span>
        );
      })}
    </div>
  );
}
const Row = ({ x, sel, bars, face = true }) => (
  <div className="mt-cut grid items-center gap-3 px-3 py-[7px]" style={{ ...cut(8), gridTemplateColumns: `1.6rem ${face ? '2.2rem ' : ''}1fr ${bars ? '15rem' : '10rem'}`, background: sel ? 'rgba(16,185,129,.14)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${sel ? US : 'rgba(255,255,255,.06)'}` }}>
    <b className="font-display text-t2" style={{ color: sel ? US : GOLD }}>{x.order}</b>
    {face && <Portrait player={x.b} w={30} h={38} color={posC(x.slot)} />}
    <span className="flex min-w-0 items-center gap-2"><b className="truncate text-t3 text-white">{x.b.name}</b><Hand h={x.b.hand} /><span className="text-t4" style={{ color: posC(x.slot) }}>{POS_KO[x.slot]}</span></span>
    {bars
      ? <span className="flex items-center justify-end gap-3">{[['컨', 'contact', '#38bdf8'], ['파', 'power', '#f87171'], ['주', 'speed', '#34d399']].map(([k, s, c]) => <span key={k} className="flex items-center gap-1"><span className="text-[11px] text-gray-500">{k}</span><Bar v={st(x.b, s)} c={c} /></span>)}</span>
      : <span className="flex justify-end gap-3 text-t4 text-gray-500"><span>컨 <Num v={st(x.b, 'contact')} /></span><span>파 <Num v={st(x.b, 'power')} /></span><span>주 <Num v={st(x.b, 'speed')} /></span></span>}
  </div>
);
const Foot = () => (
  <div className="flex shrink-0 items-center gap-5">
    <SpCard />
    <i className="block h-10 w-px bg-white/10" />
    <Sub>벤치</Sub><Bench />
  </div>
);
const Head2 = ({ l, r }) => <div className="flex shrink-0 items-center justify-between"><Sub>{l}</Sub>{r}</div>;

const CENTER = {
  1: ['다듬기', () => (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: '1fr 1.05fr' }}>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="수비" /><div className="min-h-0 flex-1"><Diamond /></div></div>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="타순" r={<Btn t="자동 배치" />} /><div className="flex flex-col gap-1">{LINE.map((x) => <Row key={x.b.id} x={x} />)}</div></div>
      </div>
      <Foot />
    </div>
  )],
  2: ['짝 강조', () => (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: '1fr 1.05fr' }}>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="수비" /><div className="min-h-0 flex-1"><Diamond sel={SEL} /></div></div>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="타순" r={<Btn t="자동 배치" />} /><div className="flex flex-col gap-1">{LINE.map((x) => <Row key={x.b.id} x={x} sel={x === SEL} />)}</div></div>
      </div>
      <Foot />
    </div>
  )],
  3: ['이름표 구장', () => (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: '1fr 1.05fr' }}>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="수비" /><div className="min-h-0 flex-1"><Diamond plate="tag" /></div></div>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="타순" r={<Btn t="자동 배치" />} /><div className="flex flex-col gap-1">{LINE.map((x) => <Row key={x.b.id} x={x} />)}</div></div>
      </div>
      <Foot />
    </div>
  )],
  4: ['마운드까지', () => (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: '1fr 1.05fr' }}>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="수비 · 오늘 선발" /><div className="min-h-0 flex-1"><Diamond plate="tag" mound /></div></div>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="타순" r={<Btn t="자동 배치" />} /><div className="flex flex-col gap-1">{LINE.map((x) => <Row key={x.b.id} x={x} />)}</div>
          <Head2 l="벤치" /><Bench /></div>
      </div>
    </div>
  )],
  5: ['능력 막대', () => (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: '1fr 1.15fr' }}>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="수비" /><div className="min-h-0 flex-1"><Diamond plate="tag" /></div></div>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="타순" r={<Btn t="자동 배치" />} /><div className="flex flex-col gap-1">{LINE.map((x) => <Row key={x.b.id} x={x} bars />)}</div></div>
      </div>
      <Foot />
    </div>
  )],
  6: ['바꾸기 열림', () => {
    const cands = [...BENCH, ...LINE.filter((x) => x !== SEL).slice(0, 3).map((x) => x.b)];
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: '1fr 1.05fr' }}>
          <div className="flex min-h-0 flex-col gap-2"><Head2 l="수비" /><div className="min-h-0 flex-1"><Diamond sel={SEL} /></div></div>
          <div className="flex min-h-0 flex-col gap-1">
            <Head2 l="타순" r={<Btn t="자동 배치" />} />
            {LINE.map((x) => (
              <React.Fragment key={x.b.id}>
                <Row x={x} sel={x === SEL} />
                {x === SEL && (
                  <div className="mx-3 flex flex-wrap items-center gap-1.5 rounded-b-lg px-3 py-2" style={{ background: 'rgba(16,185,129,.06)', boxShadow: `inset 0 0 0 1px ${US}44` }}>
                    <span className="mr-1 text-t4 text-gray-400">바꾸기</span>
                    {cands.map((p) => <span key={p.id} className="flex items-center gap-1.5 rounded-md bg-white/[0.05] px-2 py-1"><Portrait player={p} w={18} h={22} color={US} /><b className="text-t4 text-white">{p.name}</b><span className="text-[11px] text-gray-500">{BENCH.includes(p) ? '벤치' : `${LINE.find((y) => y.b === p)?.order}번`}</span></span>)}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        <Foot />
      </div>
    );
  }],
  7: ['좌우 바꿈', () => (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: '1.05fr 1fr' }}>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="타순" r={<Btn t="자동 배치" />} /><div className="flex flex-col gap-1">{LINE.map((x) => <Row key={x.b.id} x={x} />)}</div></div>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="수비" /><div className="min-h-0 flex-1"><Diamond /></div></div>
      </div>
      <Foot />
    </div>
  )],
  8: ['구장 꾸밈', () => (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: '1fr 1.05fr' }}>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="수비" /><div className="min-h-0 flex-1"><Diamond fancy plate="tag" mound /></div></div>
        <div className="flex min-h-0 flex-col gap-2"><Head2 l="타순" r={<Btn t="자동 배치" />} /><div className="flex flex-col gap-1">{LINE.map((x) => <Row key={x.b.id} x={x} bars />)}</div></div>
      </div>
      <div className="flex shrink-0 items-center gap-4"><Sub>벤치</Sub><Bench /></div>
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
