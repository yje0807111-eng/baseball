/*
 * 정비 1단계(라인업) 왼쪽 상대 판 — 다시 8안 (/mockups/scout-lineup2/?p=1 → 1~4안, ?p=2 → 5~8안, 실제 크기 340 × 806)
 * lineup-sim(8,000경기): 상성으로 벤치를 넣으면 −1.5%p — 1단계는 '센 선수를 자기 자리에 · 타순'이 승률을 바꾸고 상대와 상관없다.
 * 그래서 왼쪽 아래는 '알아 두기'만, 가볍게: 상대 타순 9명(장타 · 주루 표시) + 오늘 만날 상대 투수(선발 → 불펜, 손 · 주무기).
 * 상성 ▲▼ · 바꿀 자리는 뺀다. 장타 = 파워 위 둘, 주루 = 주력 1위(ReadyLocker dangerOf 와 같은 셈).
 *  1 두 목록      — 타순 줄 9 + 투수 줄 4, 표시는 칩 하나
 *  2 3 × 3 칸     — 타순을 아홉 칸 판으로, 투수는 아래 한 줄 띠
 *  3 경계 크게    — 장타 · 주루 셋만 얼굴 카드, 나머지는 이름 한 줄
 *  4 탭           — 타순 | 투수 두 탭(그림은 타순), 줄을 크게
 *  5 투수 흐름    — 1~9회 띠에 누가 던지나 + 아래 타순
 *  6 얼굴 줄      — 타자 · 투수 모두 얼굴 작게
 *  7 큰 글씨      — 이름만 크게, 표시는 색 점, 투수 두 줄
 *  8 위협 색      — 타선 능력(컨택 + 파워)으로 줄 바탕을 칠함, 장타 · 주루 칩
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { pitchMix, repertoireOf, PITCHES } from '../../src/engine/pitchSim.js';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { TEAM_NEON } from '../../src/myteam/teamColor.js';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const MYT = seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)), OPT = seriesTeam(pick(/^1997-ob/) || SERIES[9], seeded(3));
const ME = engineTeam(MYT), OP = engineTeam(OPT);
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;
const bat = (b) => (st(b, 'contact') + st(b, 'power')) / 2;
const avg = (l, f) => Math.round(l.reduce((n, x) => n + f(x), 0) / (l.length || 1));
const pen3 = (e) => e.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a)).slice(0, 3);
const club = Object.keys(TEAM_NEON).find((k) => OPT.name.includes(k));
const C = TEAM_NEON[club] || '#a78bfa', MY = '#34d399', DIM = '#9ca3af';
const POW = '#f87171', SPD = '#38bdf8';
const PAGE = Number(new URLSearchParams(location.search).get('p') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const OSP = OP.pitchers[0];
const BATS = OP.batters;
/* 경계 — 장타 둘 · 주루 하나 */
const TAG = new Map();
[...BATS].sort((a, b) => st(b, 'power') - st(a, 'power')).slice(0, 2).forEach((p) => TAG.set(p.id, '장타'));
[...BATS].sort((a, b) => st(b, 'speed') - st(a, 'speed')).slice(0, 1).forEach((p) => { if (!TAG.has(p.id)) TAG.set(p.id, '주루'); });
const tagC = (t) => (t === '장타' ? POW : SPD);
/* 오늘 만날 투수 — 이닝은 미리보기(oppExit · oppPen)에서 온다고 치고 어림 */
const mainOf = (p) => { const mix = pitchMix(p); return repertoireOf(p).slice(1).sort((a, b) => (mix[b] || 0) - (mix[a] || 0))[0]; };
const PITS = [{ p: OSP, inn: '1~5회', from: 1, to: 5 }, ...pen3(OP).map((p, i) => ({ p, inn: ['6회', '7~8회', '9회'][i], from: [6, 7, 9][i], to: [6, 8, 9][i] }))];
const HAND_C = { L: '#fbbf24', R: '#7dd3fc', S: '#c4b5fd' };
const bHand = (b) => ({ L: '좌타', R: '우타', S: '양타' }[b.hand] || '우타');
const pHand = (p) => (p.hand === 'L' ? '좌투' : '우투');

/* ───── 머리(5안 칸 막대) ───── */
const mk = (ko, t, u) => ({ ko, t, u, d: u - t });
const ROWS = [mk('타선', avg(BATS, bat), avg(ME.batters, bat)), mk('선발', Math.round(arm(OSP)), Math.round(arm(ME.pitchers[0]))), mk('불펜', avg(pen3(OP), arm), avg(pen3(ME), arm))];
const Rule = () => <span className="block h-px shrink-0 bg-white/[0.08]" />;
const Sub = ({ children, right }) => <span className="flex items-baseline justify-between"><span className="text-t3 font-bold text-gray-300">{children}</span>{right}</span>;
const Emb = ({ s = 32 }) => <span className="grid shrink-0 place-items-center rounded-full font-display font-extrabold" style={{ width: s, height: s, fontSize: s * 0.36, color: C, background: `${C}1a`, boxShadow: `inset 0 0 0 1px ${C}66` }}>{club || 'OB'}</span>;
function Head() {
  return (
    <>
      <div className="flex shrink-0 items-center gap-2.5"><Emb /><b className="min-w-0 flex-1 truncate text-t2 font-black text-white">{OPT.name}</b><b className="font-display text-t1 font-extrabold leading-none" style={{ color: C }}>{avg(OPT.roster, (p) => p.overall)}</b></div>
      <Rule />
      <div className="flex flex-col gap-3">
        <span className="flex justify-between text-t4 font-bold"><span style={{ color: C }}>상대</span><span style={{ color: MY }}>우리</span></span>
        {ROWS.map((r) => {
          const n = Math.min(5, Math.ceil(Math.abs(r.d) / 2));
          const cells = (side) => Array.from({ length: 5 }, (_, i) => { const on = side === 'L' ? r.d < 0 && 4 - i < n : r.d > 0 && i < n; return <i key={i} className="block h-2 flex-1 rounded-[2px]" style={{ background: on ? (side === 'L' ? C : MY) : 'rgba(255,255,255,.06)' }} />; });
          return (
            <div key={r.ko} className="grid items-center gap-2" style={{ gridTemplateColumns: '2rem 1fr 2.6rem 1fr 2rem' }}>
              <b className="font-display text-t2 leading-none" style={{ color: r.d < 0 ? C : DIM }}>{r.t}</b><span className="flex gap-[3px]">{cells('L')}</span>
              <span className="text-center text-t4 text-gray-300">{r.ko}</span><span className="flex gap-[3px]">{cells('R')}</span>
              <b className="text-right font-display text-t2 leading-none" style={{ color: r.d > 0 ? MY : DIM }}>{r.u}</b>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ───── 조각 ───── */
const Tag = ({ t, sm }) => (t ? <b className={`whitespace-nowrap rounded-full px-2 ${sm ? 'text-[11px] leading-4' : 'py-0.5 text-t4'}`} style={{ color: tagC(t), background: `${tagC(t)}1a`, boxShadow: `inset 0 0 0 1px ${tagC(t)}55` }}>{t}</b> : null);
const HandB = ({ h, ko }) => <b className="text-t4" style={{ color: HAND_C[h] || HAND_C.R }}>{ko}</b>;
const BatRow = ({ b, i, big }) => (
  <div className="flex items-center gap-2.5">
    <b className={`w-4 font-display ${big ? 'text-t2' : 'text-t3'} text-gray-500`}>{i + 1}</b>
    <b className={`min-w-0 flex-1 truncate ${big ? 'text-t2' : 'text-t3'} text-white`}>{b.name}</b>
    <Tag t={TAG.get(b.id)} />
    <HandB h={b.hand} ko={bHand(b)} />
  </div>
);
const PitRow = ({ x, face }) => (
  <div className="flex items-center gap-2.5">
    {face && <Portrait player={x.p} w={28} h={36} color={C} />}
    <span className="w-12 text-t4 text-gray-400">{x.inn}</span>
    <b className="min-w-0 flex-1 truncate text-t3 text-white">{x.p.name}</b>
    <span className="text-t4 text-gray-300">{PITCHES[mainOf(x.p)]?.name}</span>
    <HandB h={x.p.hand} ko={pHand(x.p)} />
  </div>
);

/* ───── 8안 ───── */
const V = {
  1: ['두 목록', () => (
    <div className="flex flex-col gap-2.5">
      <Sub>상대 타순</Sub>
      {BATS.map((b, i) => <BatRow key={b.id} b={b} i={i} />)}
      <Rule />
      <Sub>상대 투수</Sub>
      {PITS.map((x) => <PitRow key={x.p.id} x={x} />)}
    </div>
  )],
  2: ['3 × 3 칸', () => (
    <div className="flex flex-col gap-3">
      <Sub>상대 타순</Sub>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {BATS.map((b, i) => { const t = TAG.get(b.id); return (
          <span key={b.id} className="flex flex-col gap-1 rounded-lg px-2 py-2" style={{ background: t ? `${tagC(t)}14` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${t ? `${tagC(t)}55` : 'rgba(255,255,255,.06)'}` }}>
            <span className="flex items-center justify-between"><b className="font-display text-t3 text-gray-400">{i + 1}</b><HandB h={b.hand} ko={bHand(b).slice(0, 1)} /></span>
            <b className="truncate text-t3 text-white">{b.name}</b>
            <span className="h-4">{t && <b className="text-t4" style={{ color: tagC(t) }}>{t}</b>}</span>
          </span>
        ); })}
      </div>
      <Sub>상대 투수</Sub>
      <div className="grid gap-1" style={{ gridTemplateColumns: '5fr 1fr 2fr 1fr' }}>
        {PITS.map((x, i) => (
          <span key={x.p.id} className="flex min-w-0 flex-col gap-0.5 rounded-md px-1.5 py-1.5" style={{ background: i ? 'rgba(255,255,255,.04)' : `${C}1f` }}>
            <span className="text-[11px] text-gray-400">{x.inn}</span><b className="truncate text-t4 text-white">{x.p.name}</b>
          </span>
        ))}
      </div>
    </div>
  )],
  3: ['경계 크게', () => {
    const watch = BATS.filter((b) => TAG.has(b.id));
    return (
      <div className="flex flex-col gap-3">
        <Sub>경계 타자</Sub>
        {watch.map((b) => { const t = TAG.get(b.id); return (
          <div key={b.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: `${tagC(t)}12`, boxShadow: `inset 0 0 0 1px ${tagC(t)}44` }}>
            <Portrait player={b} w={34} h={44} color={tagC(t)} />
            <span className="flex min-w-0 flex-1 flex-col"><span className="text-t4 text-gray-400">{BATS.indexOf(b) + 1}번 · {bHand(b)}</span><b className="truncate text-t2 text-white">{b.name}</b></span>
            <Tag t={t} />
          </div>
        ); })}
        <span className="flex flex-wrap gap-x-2.5 gap-y-1 text-t4 text-gray-400">{BATS.map((b, i) => !TAG.has(b.id) && <span key={b.id}><b className="font-display text-gray-500">{i + 1}</b> {b.name}</span>)}</span>
        <Rule />
        <Sub>상대 투수</Sub>
        {PITS.map((x) => <PitRow key={x.p.id} x={x} />)}
      </div>
    );
  }],
  4: ['탭', () => (
    <div className="flex flex-col gap-3">
      <div className="grid rounded-lg bg-white/[0.04] p-1" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <b className="rounded-md py-1.5 text-center text-t3 text-white" style={{ background: `${C}33` }}>타순</b>
        <b className="py-1.5 text-center text-t3 text-gray-500">투수</b>
      </div>
      {BATS.map((b, i) => <BatRow key={b.id} b={b} i={i} big />)}
    </div>
  )],
  5: ['투수 흐름', () => (
    <div className="flex flex-col gap-3">
      <Sub>상대 투수</Sub>
      <div className="flex flex-col gap-1">
        <div className="grid text-center text-[11px] text-gray-500" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{Array.from({ length: 9 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
          {PITS.map((x, i) => (
            <span key={x.p.id} className="flex h-9 items-center justify-center truncate rounded-md px-1 text-t4 font-bold text-white" style={{ gridColumn: `${x.from} / ${x.to + 1}`, background: i ? `${C}26` : `${C}55` }}>{x.to - x.from >= 1 ? x.p.name : x.p.name.slice(0, 2)}</span>
          ))}
        </div>
        <span className="flex justify-between text-t4 text-gray-400"><span>선발 <HandB h={OSP.hand} ko={pHand(OSP)} /> · {PITCHES[mainOf(OSP)]?.name}</span><span>불펜 좌투 <b className="text-white">{pen3(OP).filter((p) => p.hand === 'L').length}</b></span></span>
      </div>
      <Rule />
      <Sub>상대 타순</Sub>
      {BATS.map((b, i) => <BatRow key={b.id} b={b} i={i} />)}
    </div>
  )],
  6: ['얼굴 줄', () => (
    <div className="flex flex-col gap-1.5">
      <Sub>상대 타순</Sub>
      {BATS.map((b, i) => (
        <div key={b.id} className="flex items-center gap-2">
          <b className="w-3 font-display text-t4 text-gray-500">{i + 1}</b>
          <Portrait player={b} w={22} h={28} color={TAG.has(b.id) ? tagC(TAG.get(b.id)) : '#334155'} />
          <b className="min-w-0 flex-1 truncate text-t3 text-white">{b.name}</b>
          <Tag t={TAG.get(b.id)} sm /><HandB h={b.hand} ko={bHand(b).slice(0, 1)} />
        </div>
      ))}
      <Rule />
      <Sub>상대 투수</Sub>
      {PITS.map((x) => <PitRow key={x.p.id} x={x} face />)}
    </div>
  )],
  7: ['큰 글씨', () => (
    <div className="flex flex-col gap-2">
      {BATS.map((b, i) => { const t = TAG.get(b.id); return (
        <div key={b.id} className="flex items-center gap-3">
          <b className="w-5 font-display text-t2 text-gray-500">{i + 1}</b>
          <b className="flex-1 truncate text-t2" style={{ color: t ? tagC(t) : '#fff' }}>{b.name}</b>
          {t && <b className="text-t4" style={{ color: tagC(t) }}>{t}</b>}
        </div>
      ); })}
      <Rule />
      <div className="flex items-center gap-3"><span className="text-t3 text-gray-400">선발</span><b className="flex-1 truncate text-t2 text-white">{OSP.name}</b><HandB h={OSP.hand} ko={pHand(OSP)} /></div>
      <div className="flex items-center gap-3"><span className="text-t3 text-gray-400">불펜</span><b className="flex-1 truncate text-t3 text-gray-200">{pen3(OP).map((p) => p.name).join(' · ')}</b></div>
    </div>
  )],
  8: ['위협 색', () => {
    const lo = Math.min(...BATS.map(bat)), hi = Math.max(...BATS.map(bat));
    return (
      <div className="flex flex-col gap-1">
        <Sub right={<span className="text-t4 text-gray-400">타격</span>}>상대 타순</Sub>
        {BATS.map((b, i) => { const k = (bat(b) - lo) / (hi - lo || 1); return (
          <div key={b.id} className="flex items-center gap-2.5 rounded-md px-2 py-[5px]" style={{ background: `linear-gradient(90deg, ${C}${Math.round(8 + k * 40).toString(16).padStart(2, '0')}, transparent 85%)` }}>
            <b className="w-3 font-display text-t4 text-gray-400">{i + 1}</b>
            <b className="min-w-0 flex-1 truncate text-t3 text-white">{b.name}</b>
            <Tag t={TAG.get(b.id)} sm />
            <b className="w-7 text-right font-display text-t3" style={{ color: k > 0.66 ? C : DIM }}>{Math.round(bat(b))}</b>
          </div>
        ); })}
        <span className="h-2" />
        <Sub right={<span className="text-t4 text-gray-400">구위 · 제구</span>}>상대 투수</Sub>
        {PITS.map((x) => (
          <div key={x.p.id} className="flex items-center gap-2.5 px-2 py-1">
            <span className="w-12 text-t4 text-gray-400">{x.inn}</span><b className="min-w-0 flex-1 truncate text-t3 text-white">{x.p.name}</b><HandB h={x.p.hand} ko={pHand(x.p)} />
            <b className="w-7 text-right font-display text-t3 text-gray-300">{Math.round(arm(x.p))}</b>
          </div>
        ))}
      </div>
    );
  }],
};

function Panel({ n }) {
  const [t, Body] = V[n];
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <b className="text-t3 text-white"><span className="mr-2 font-display" style={{ color: '#fbbf24' }}>{n}</span>{t}<span className="ml-2 text-t4 font-normal text-gray-500" data-h={n} /></b>
      <aside className="mt-cut mt-frame mt-glass flex flex-col gap-3.5 overflow-hidden p-5" style={{ ...cut(20), '--a': C, width: 340, height: 806 }}>
        <p className="mt-lab" style={{ '--a': C }}>오늘 상대</p>
        <Head />
        <Rule />
        <div className="flex min-h-0 flex-1 flex-col" data-low={n}><Body /></div>
      </aside>
    </div>
  );
}

function App() {
  React.useEffect(() => {
    document.querySelectorAll('[data-low]').forEach((el) => {
      const h = document.querySelector(`[data-h="${el.dataset.low}"]`);
      if (h) h.textContent = el.scrollHeight > el.clientHeight + 1 ? `넘침 ${el.scrollHeight - el.clientHeight}px` : `여유 ${el.clientHeight - el.firstElementChild.getBoundingClientRect().height | 0}px`;
    });
  });
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative grid h-full" style={{ gridTemplateColumns: 'repeat(4,340px)', columnGap: 48, placeContent: 'center' }}>
        {(PAGE === 2 ? [5, 6, 7, 8] : [1, 2, 3, 4]).map((n) => <Panel key={n} n={n} />)}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
