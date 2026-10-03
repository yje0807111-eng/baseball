/*
 * 정비 2단계(경기 흐름) 왼쪽 상대 판 목업 (/mockups/scout-flow/?p=1 → 1~4안, ?p=2 → 5~8안, 실제 크기 340 × 806)
 * 머리 = 5안 칸 막대. 아래 = 2단계 고르기에 쓰는 상대 정보만(plan-sim · flow-sim):
 *  - 볼 배합 ← 상대 타선 구종 약점: 그 계열에 약한 타자 4명 이상이면 휘는 공 +1.7 · 직구 +0.1, 아니면 손해(−0.9 · −1.4).
 *    우리 선발이 그 계열 공이 없으면 0 — 그래서 '우리 선발이 던지나'도 붙인다.
 *  - 필승조 · 증강 시점 ← 상대 선발이 몇 회까지 · 회마다 나올 상대 불펜(미리보기 600판 oppExit · oppPen). 약한 불펜 = 기회.
 *  선발 운용(우리 불펜 − 선발)은 우리 정보라 가운데 판이 맡는다. 1단계 1안의 상대 투수 목록과 겹치지 않게, 여기선 '이닝'으로 본다.
 *  1 약점 막대 + 이닝 띠 — 계열 셋 막대(약한 타자 수) · 1~9회 상대 마운드 띠
 *  2 아홉 칸 약점 — 타순 9칸에 약한 계열 색, 계열별 수
 *  3 타순 × 계열 표 — 9줄 × 직구 · 휘는 · 떨어지는(약함 ● · 강함 ○)
 *  4 큰 숫자 셋 — 계열 타일 셋(약한 타자 수), 4명 이상만 불 켬 · 우리 선발이 던지는지
 *  5 이닝 줄 중심 — 회마다 상대 투수 · 구위 · 제구(약하면 초록), 아래 약점 한 줄
 *  6 우리 공 맞춤 — 우리 선발 구종마다 '약한 상대 타자 n'
 *  7 두 판     — 위 '볼 배합' 판 · 아래 '상대 마운드' 판, 판마다 큰 답 하나
 *  8 최소      — 큰 글씨 두 줄: 가장 약한 계열 · 상대 선발 내려가는 이닝
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { batterFam, repertoireOf, pitchMix, PITCHES, FAM_KO } from '../../src/engine/pitchSim.js';
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
const C = TEAM_NEON[club] || '#a78bfa', MY = '#34d399', DIM = '#9ca3af', GOLD = '#fbbf24';
const PAGE = Number(new URLSearchParams(location.search).get('p') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const OSP = OP.pitchers[0], MSP = ME.pitchers[0];
const BATS = OP.batters;
const FAMS = ['F', 'B', 'O'];
const FAM_C = { F: '#f87171', B: '#a78bfa', O: '#2dd4bf' };
const FAM_S = { F: '직구', B: '휘는 공', O: '떨어지는 공' };
const WEAK = Object.fromEntries(FAMS.map((f) => [f, BATS.filter((b) => batterFam(b).weak === f)]));
const STRONG = Object.fromEntries(FAMS.map((f) => [f, BATS.filter((b) => batterFam(b).strong === f)]));
const OUR_FAMS = new Set(repertoireOf(MSP).map((t) => PITCHES[t].fam));
const MANY = 4; // plan-sim: 약한 타자 4명 이상이면 그 계열 배합이 이득
const BEST = [...FAMS].sort((a, b) => WEAK[b].length - WEAK[a].length)[0];
/* 상대 마운드 — 미리보기에서 온다고 치고: 선발 5.1회까지, 6 · 7~8 · 9회 불펜 */
const OPP_EXIT = 5.1;
const PENS = pen3(OP);
const BY_INN = Array.from({ length: 9 }, (_, i) => (i + 1 <= Math.floor(OPP_EXIT) ? OSP : i + 1 === 6 ? PENS[2] : i + 1 <= 8 ? PENS[1] : PENS[0]));
const armC = (p) => (arm(p) < 78 ? MY : arm(p) >= 85 ? C : '#e5e7eb'); // 약한 투수 = 우리 기회(초록)

/* ───── 머리(5안 칸 막대) ───── */
const mk = (ko, t, u) => ({ ko, t, u, d: u - t });
const ROWS = [mk('타선', avg(BATS, bat), avg(ME.batters, bat)), mk('선발', Math.round(arm(OSP)), Math.round(arm(MSP))), mk('불펜', avg(PENS, arm), avg(pen3(ME), arm))];
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
const Throws = ({ f }) => (OUR_FAMS.has(f) ? null : <b className="text-[11px] text-gray-500">우리 선발 없음</b>);
const WeakBars = ({ big }) => (
  <div className="flex flex-col gap-2">
    {FAMS.map((f) => {
      const n = WEAK[f].length, hot = n >= MANY && OUR_FAMS.has(f);
      return (
        <div key={f} className="grid items-center gap-2.5" style={{ gridTemplateColumns: '5.6rem 1fr 1.6rem' }}>
          <span className="flex items-center gap-1.5 text-t3" style={{ color: hot ? '#fff' : '#cbd5e1' }}><i className="block h-2 w-2 rounded-full" style={{ background: FAM_C[f] }} />{FAM_S[f]}</span>
          <span className="flex gap-[3px]">{Array.from({ length: 9 }, (_, i) => <i key={i} className={`block ${big ? 'h-3' : 'h-2'} flex-1 rounded-[2px]`} style={{ background: i < n ? (hot ? FAM_C[f] : `${FAM_C[f]}66`) : 'rgba(255,255,255,.06)' }} />)}</span>
          <b className="text-right font-display text-t2" style={{ color: hot ? FAM_C[f] : '#e5e7eb' }}>{n}</b>
        </div>
      );
    })}
  </div>
);
const InnStrip = ({ nums }) => (
  <div className="flex flex-col gap-1">
    <div className="grid text-center text-[11px] text-gray-500" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{Array.from({ length: 9 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
    <div className="relative grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
      {BY_INN.map((p, i) => <span key={i} className="flex h-8 items-center justify-center rounded-[4px] font-display text-t4" style={{ background: p === OSP ? `${C}40` : `${armC(p)}22`, color: p === OSP ? '#fff' : armC(p), boxShadow: p === OSP ? undefined : `inset 0 -2px 0 ${armC(p)}` }}>{nums ? Math.round(arm(p)) : ''}</span>)}
      <i className="absolute -bottom-1 -top-1 w-[2px]" style={{ left: `${(OPP_EXIT / 9) * 100}%`, background: GOLD }} />
    </div>
  </div>
);

/* ───── 8안 ───── */
const V = {
  1: ['약점 막대 + 이닝 띠', () => (
    <div className="flex flex-col gap-3">
      <Sub>상대 타선 약점</Sub>
      <WeakBars />
      <Rule />
      <Sub right={<span className="text-t4 text-gray-400">선발 <b className="text-white">{OPP_EXIT}회</b>까지</span>}>상대 마운드</Sub>
      <InnStrip nums />
      <span className="flex flex-wrap gap-x-3 text-t4 text-gray-400">{PENS.map((p) => <span key={p.id}><b style={{ color: armC(p) }}>{p.name}</b> {Math.round(arm(p))}</span>)}</span>
    </div>
  )],
  2: ['아홉 칸 약점', () => (
    <div className="flex flex-col gap-3">
      <Sub>상대 타선 약점</Sub>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {BATS.map((b, i) => { const w = batterFam(b).weak; return (
          <span key={b.id} className="flex flex-col gap-1 rounded-lg px-2 py-2" style={{ background: w ? `${FAM_C[w]}14` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${w ? `${FAM_C[w]}55` : 'rgba(255,255,255,.06)'}` }}>
            <span className="flex items-center justify-between"><b className="font-display text-t4 text-gray-400">{i + 1}</b>{w && <i className="block h-2 w-2 rounded-full" style={{ background: FAM_C[w] }} />}</span>
            <b className="truncate text-t3 text-white">{b.name}</b>
            <span className="h-4 text-t4" style={{ color: w ? FAM_C[w] : DIM }}>{w ? FAM_S[w] : '고름'}</span>
          </span>
        ); })}
      </div>
      <span className="flex justify-between text-t4">{FAMS.map((f) => <span key={f} style={{ color: FAM_C[f] }}>{FAM_S[f]} <b className="font-display text-t3">{WEAK[f].length}</b></span>)}</span>
      <Rule />
      <Sub right={<span className="text-t4 text-gray-400">선발 <b className="text-white">{OPP_EXIT}회</b>까지</span>}>상대 마운드</Sub>
      <InnStrip />
    </div>
  )],
  3: ['타순 × 계열 표', () => (
    <div className="flex flex-col gap-1.5">
      <div className="grid text-center text-t4" style={{ gridTemplateColumns: '1.1rem 1fr 3rem 3rem 3rem' }}><span /><span className="text-left text-gray-400">상대 타순</span>{FAMS.map((f) => <b key={f} style={{ color: FAM_C[f] }}>{FAM_S[f].replace(' 공', '')}</b>)}</div>
      {BATS.map((b, i) => { const fm = batterFam(b); return (
        <div key={b.id} className="grid items-center text-center text-t3" style={{ gridTemplateColumns: '1.1rem 1fr 3rem 3rem 3rem' }}>
          <span className="text-left font-display text-t4 text-gray-500">{i + 1}</span><b className="truncate text-left text-white">{b.name}</b>
          {FAMS.map((f) => <span key={f} style={{ color: fm.weak === f ? FAM_C[f] : fm.strong === f ? '#6b7280' : 'transparent' }}>{fm.weak === f ? '●' : fm.strong === f ? '○' : '·'}</span>)}
        </div>
      ); })}
      <div className="grid text-center text-t3" style={{ gridTemplateColumns: '1.1rem 1fr 3rem 3rem 3rem' }}><span /><span className="text-left text-t4 text-gray-400">약함</span>{FAMS.map((f) => <b key={f} className="font-display" style={{ color: WEAK[f].length >= MANY ? FAM_C[f] : '#e5e7eb' }}>{WEAK[f].length}</b>)}</div>
      <Rule />
      <Sub right={<span className="text-t4 text-gray-400">선발 <b className="text-white">{OPP_EXIT}회</b>까지</span>}>상대 마운드</Sub>
      <InnStrip nums />
    </div>
  )],
  4: ['큰 숫자 셋', () => (
    <div className="flex flex-col gap-3">
      <Sub>상대 타선 약점</Sub>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {FAMS.map((f) => { const n = WEAK[f].length, hot = n >= MANY && OUR_FAMS.has(f); return (
          <span key={f} className="flex flex-col items-center gap-1 rounded-xl py-3" style={{ background: hot ? `${FAM_C[f]}22` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${hot ? FAM_C[f] : 'rgba(255,255,255,.07)'}` }}>
            <span className="text-t4" style={{ color: hot ? FAM_C[f] : DIM }}>{FAM_S[f]}</span>
            <b className="font-display text-[34px] leading-none" style={{ color: hot ? '#fff' : '#94a3b8' }}>{n}</b>
            <span className="h-4"><Throws f={f} /></span>
          </span>
        ); })}
      </div>
      <Rule />
      <Sub right={<span className="text-t4 text-gray-400">선발 <b className="text-white">{OPP_EXIT}회</b>까지</span>}>상대 마운드</Sub>
      <InnStrip nums />
    </div>
  )],
  5: ['이닝 줄 중심', () => (
    <div className="flex flex-col gap-1.5">
      <Sub>상대 마운드</Sub>
      {BY_INN.map((p, i) => {
        const first = i === 0 || BY_INN[i - 1] !== p;
        return (
          <div key={i} className="grid items-center gap-2.5 rounded-md px-2 py-[5px]" style={{ gridTemplateColumns: '2rem 1fr 2rem', background: p === OSP ? `${C}14` : 'rgba(255,255,255,.025)' }}>
            <b className="font-display text-t3 text-gray-400">{i + 1}회</b>
            <span className="truncate text-t3" style={{ color: first ? '#fff' : '#6b7280' }}>{first ? p.name : '〃'}</span>
            <b className="text-right font-display text-t3" style={{ color: first ? armC(p) : '#6b7280' }}>{first ? Math.round(arm(p)) : ''}</b>
          </div>
        );
      })}
      <Rule />
      <span className="flex items-center gap-2 text-t3"><span className="text-gray-400">약점</span>{FAMS.map((f) => <b key={f} className="rounded-full px-2 text-t4" style={{ color: FAM_C[f], background: WEAK[f].length >= MANY ? `${FAM_C[f]}26` : 'transparent', boxShadow: `inset 0 0 0 1px ${FAM_C[f]}55` }}>{FAM_S[f]} {WEAK[f].length}</b>)}</span>
    </div>
  )],
  6: ['우리 공 맞춤', () => {
    const rep = repertoireOf(MSP), mix = pitchMix(MSP);
    return (
      <div className="flex flex-col gap-2.5">
        <Sub right={<span className="text-t4 text-gray-400">약한 상대 타자</span>}>우리 선발 {MSP.name}</Sub>
        {rep.map((t) => { const f = PITCHES[t].fam, n = WEAK[f].length, hot = n >= MANY; return (
          <div key={t} className="grid items-center gap-2.5" style={{ gridTemplateColumns: '5rem 1fr 1.6rem' }}>
            <span className="flex items-center gap-1.5 text-t3 text-white"><i className="block h-2 w-2 rounded-full" style={{ background: FAM_C[f] }} />{PITCHES[t].name}</span>
            <span className="flex gap-[3px]">{Array.from({ length: 9 }, (_, i) => <i key={i} className="block h-2 flex-1 rounded-[2px]" style={{ background: i < n ? (hot ? FAM_C[f] : `${FAM_C[f]}55`) : 'rgba(255,255,255,.06)' }} />)}</span>
            <b className="text-right font-display text-t2" style={{ color: hot ? FAM_C[f] : '#e5e7eb' }}>{n}</b>
          </div>
        ); })}
        <span className="text-t4 text-gray-500">{Math.round((mix.fast || 0) * 100)}% 직구 · 나머지 변화구</span>
        <Rule />
        <Sub right={<span className="text-t4 text-gray-400">선발 <b className="text-white">{OPP_EXIT}회</b>까지</span>}>상대 마운드</Sub>
        <InnStrip nums />
      </div>
    );
  }],
  7: ['두 판', () => (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5 rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="flex items-baseline justify-between"><span className="text-t4 text-gray-400">볼 배합</span><b className="text-t2" style={{ color: FAM_C[BEST] }}>{FAM_S[BEST]} 약함 {WEAK[BEST].length}</b></span>
        <WeakBars />
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="flex items-baseline justify-between"><span className="text-t4 text-gray-400">상대 마운드</span><b className="text-t2 text-white">선발 {OPP_EXIT}회까지</b></span>
        <InnStrip nums />
      </div>
    </div>
  )],
  8: ['최소', () => (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex flex-col gap-1">
        <span className="text-t4 text-gray-400">상대 타선 약점</span>
        <b className="text-[28px] font-black leading-tight" style={{ color: FAM_C[BEST] }}>{FAM_S[BEST]} {WEAK[BEST].length}명</b>
        <span className="text-t4 text-gray-500">{FAMS.filter((f) => f !== BEST).map((f) => `${FAM_S[f]} ${WEAK[f].length}`).join(' · ')}</span>
      </div>
      <Rule />
      <div className="flex flex-col gap-1">
        <span className="text-t4 text-gray-400">상대 선발</span>
        <b className="text-[28px] font-black leading-tight text-white">{OPP_EXIT}회까지</b>
        <span className="text-t4 text-gray-500">불펜 {PENS.map((p) => `${p.name} ${Math.round(arm(p))}`).join(' · ')}</span>
      </div>
    </div>
  )],
};

function Panel({ n }) {
  const [t, Body] = V[n];
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <b className="text-t3 text-white"><span className="mr-2 font-display" style={{ color: GOLD }}>{n}</span>{t}<span className="ml-2 text-t4 font-normal text-gray-500" data-h={n} /></b>
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
