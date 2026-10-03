/*
 * 정비 1단계(라인업) 왼쪽 상대 판 목업 (/mockups/scout-lineup/?p=1 → 1~4안, ?p=2 → 5~8안, 실제 크기 340 × 806)
 * 머리 = 확정 5안(칸 막대: 상대 왼쪽 · 우리 오른쪽, 타선 · 선발 · 불펜). 아래 = 라인업에 쓰는 정보.
 * 엔진에서 우리 라인업을 바꾸는 것(pitchSim):
 *  - 좌우 — 타자 손 vs 투수 손(platoonOf): 좌타가 우투 상대 +, 같은 손이면 −. 좌타 폭(3)이 우타(1.6)보다 크다
 *  - 구종 — 타자마다 강한 계열 · 약한 계열(batterFam), 상대 선발 구종 비율만큼 맞힘 · 안타 ±(FAM_ADJ)
 *  → 우리 타자 × 상대 선발이 핵심. 상대 타선은 우리 '투수'에 걸린다(우리 선발 손 vs 상대 타선 좌우) — 8안에서만.
 *  1 상성 표      — 우리 9명 줄마다 좌우 · 구종 표시
 *  2 선발 해부    — 상대 선발 구종 막대(계열별) + 강한 타자 · 약한 타자 칩
 *  3 좌우 판      — 상대 선발 손 + 우리 좌타 · 우타 · 양타 두 칸
 *  4 구종 판      — 직구 · 휘는 공 · 떨어지는 공 줄마다 비율 + 강한 · 약한 우리 타자
 *  5 바꿀 자리    — 벤치가 더 맞는 자리만 '선발 ↔ 벤치' 줄
 *  6 타순 띠      — 1~9번 칸을 상성 색으로, 아래 벤치 칸
 *  7 오늘 만날 투수 — 상대 선발 + 불펜 셋(손 · 주무기 계열), 나올 이닝
 *  8 상대 타선 좌우 — 상대 타선 좌 · 우 + 우리 선발 후보 손별 상성
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { platoonOf, batterFam, famAdjOf, pitchMix, repertoireOf, PITCHES, FAM_KO } from '../../src/engine/pitchSim.js';
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
const C = TEAM_NEON[club] || '#a78bfa', MY = '#34d399', BAD = '#f87171', DIM = '#9ca3af';
const PAGE = Number(new URLSearchParams(location.search).get('p') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const OSP = OP.pitchers[0];
const MIX = pitchMix(OSP), REP = repertoireOf(OSP);
const FAMS = ['F', 'B', 'O'];
const famShare = Object.fromEntries(FAMS.map((f) => [f, REP.filter((t) => PITCHES[t].fam === f).reduce((n, t) => n + (MIX[t] || 0), 0)]));
const HAND_KO = { L: '좌', R: '우', S: '양' };
const handOf = (p) => (p?.hand === 'L' ? '좌투' : '우투');
/* 우리 타자 × 상대 선발 — 좌우(±1.5 · ±0.8) · 구종(비율 가중 −1~1) */
const fit = (b) => {
  const pl = platoonOf(b, OSP), fm = REP.reduce((n, t) => n + (MIX[t] || 0) * famAdjOf(b, t), 0);
  return { b, pl, fm, sc: pl / 1.5 + fm * 2 };
};
const LINE = ME.batters.map(fit), BENCH = (ME.bench || []).map(fit);
const tone = (v, e = 0.05) => (v > e ? MY : v < -e ? BAD : DIM);
const mark = (v, e = 0.05) => (v > e ? '▲' : v < -e ? '▼' : '·');

/* ───── 머리(5안 칸 막대) ───── */
const mk = (ko, t, u) => ({ ko, t, u, d: u - t });
const ROWS = [mk('타선', avg(OP.batters, bat), avg(ME.batters, bat)), mk('선발', Math.round(arm(OSP)), Math.round(arm(ME.pitchers[0]))), mk('불펜', avg(pen3(OP), arm), avg(pen3(ME), arm))];
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
const Hand = ({ h, sm }) => <b className={`rounded px-1 ${sm ? 'text-[11px] leading-4' : 'text-t4'}`} style={{ color: h === 'L' ? '#fbbf24' : h === 'S' ? '#c4b5fd' : '#7dd3fc', boxShadow: `inset 0 0 0 1px ${h === 'L' ? '#fbbf2466' : h === 'S' ? '#c4b5fd66' : '#7dd3fc66'}` }}>{HAND_KO[h] || '우'}</b>;
const Chip = ({ t, c }) => <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-t4 font-bold" style={{ color: c, background: `${c}1a`, boxShadow: `inset 0 0 0 1px ${c}55` }}>{t}</span>;
const FamBar = () => (
  <span className="flex h-2 overflow-hidden rounded-full">{FAMS.map((f, i) => <i key={f} className="block h-full" style={{ width: `${famShare[f] * 100}%`, background: ['#f87171', '#a78bfa', '#2dd4bf'][i] }} />)}</span>
);
const StarterLine = () => (
  <div className="flex items-center gap-2.5">
    <Portrait player={OSP} w={34} h={44} color={C} />
    <span className="flex min-w-0 flex-1 flex-col"><span className="text-t4 text-gray-400">상대 선발</span><span className="flex items-center gap-1.5"><b className="truncate text-t3 font-black text-white">{OSP.name}</b><b className="text-t4" style={{ color: OSP.hand === 'L' ? '#fbbf24' : '#7dd3fc' }}>{handOf(OSP)}</b></span></span>
    <span className="flex gap-2 text-t4 text-gray-400">{FAMS.map((f) => <span key={f}>{FAM_KO[f].replace(' 공', '')} <b className="text-white">{Math.round(famShare[f] * 100)}</b></span>)}</span>
  </div>
);

/* 좌우 · 구종 가운데 기운 것만 */
const Why = ({ x }) => <span className="flex gap-2 text-t4">{[[x.pl, '좌우', 0.05], [x.fm, '구종', 0.1]].filter(([v, , e]) => Math.abs(v) > e).map(([v, k, e]) => <b key={k} style={{ color: tone(v, e) }}>{mark(v, e)} {k}</b>)}</span>;

/* ───── 8안 ───── */
const V = {
  1: ['상성 표', () => (
    <div className="flex min-h-0 flex-col gap-2">
      <StarterLine />
      <Rule />
      <div className="grid text-t4 text-gray-500" style={{ gridTemplateColumns: '1.2rem 1fr 2.4rem 2.4rem' }}><span /><span>우리 타선</span><span className="text-center">좌우</span><span className="text-center">구종</span></div>
      {LINE.map((x, i) => (
        <div key={x.b.id} className="grid items-center text-t3" style={{ gridTemplateColumns: '1.2rem 1fr 2.4rem 2.4rem' }}>
          <span className="font-display text-gray-500">{i + 1}</span>
          <span className="flex min-w-0 items-center gap-1.5"><b className="truncate text-white">{x.b.name}</b><Hand h={x.b.hand} sm /></span>
          <b className="text-center" style={{ color: tone(x.pl) }}>{mark(x.pl)}</b>
          <b className="text-center" style={{ color: tone(x.fm, 0.1) }}>{mark(x.fm, 0.1)}</b>
        </div>
      ))}
    </div>
  )],
  2: ['선발 해부', () => {
    const strong = LINE.filter((x) => x.fm > 0.1), weak = LINE.filter((x) => x.fm < -0.1);
    return (
      <div className="flex flex-col gap-3">
        <StarterLine />
        <div className="flex flex-col gap-1.5">
          {REP.map((t, i) => (
            <div key={t} className="grid items-center gap-2 text-t4" style={{ gridTemplateColumns: '4.5rem 1fr 2rem' }}>
              <span className="text-gray-300">{PITCHES[t].name}</span>
              <span className="h-1.5 rounded-full bg-white/[0.06]"><i className="block h-full rounded-full" style={{ width: `${(MIX[t] || 0) * 100 / 0.6}%`, background: ['#f87171', '#a78bfa', '#2dd4bf'][FAMS.indexOf(PITCHES[t].fam)] }} /></span>
              <b className="text-right font-display text-white">{Math.round((MIX[t] || 0) * 100)}</b>
            </div>
          ))}
        </div>
        <Rule />
        <Sub>강한 타자</Sub>
        <span className="flex flex-wrap gap-1.5">{strong.map((x) => <Chip key={x.b.id} t={x.b.name} c={MY} />)}</span>
        <Sub>약한 타자</Sub>
        <span className="flex flex-wrap gap-1.5">{weak.map((x) => <Chip key={x.b.id} t={x.b.name} c={BAD} />)}</span>
      </div>
    );
  }],
  3: ['좌우 판', () => {
    const col = (h) => [...LINE, ...BENCH.map((x) => ({ ...x, bench: true }))].filter((x) => (x.b.hand || 'R') === h);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: `${C}14`, boxShadow: `inset 0 0 0 1px ${C}44` }}>
          <Portrait player={OSP} w={34} h={44} color={C} />
          <span className="flex-1"><span className="block text-t4 text-gray-400">상대 선발</span><b className="text-t3 text-white">{OSP.name}</b></span>
          <b className="font-display text-t1" style={{ color: OSP.hand === 'L' ? '#fbbf24' : '#7dd3fc' }}>{handOf(OSP)}</b>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          {['L', 'R'].map((h) => {
            const good = platoonOf({ hand: h }, OSP) > 0;
            return (
              <div key={h} className="flex flex-col gap-1.5 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${good ? `${MY}55` : `${BAD}44`}` }}>
                <span className="flex items-baseline justify-between"><b className="text-t3 text-white">{h === 'L' ? '좌타' : '우타'}</b><b className="text-t4" style={{ color: good ? MY : BAD }}>{good ? '유리' : '불리'}</b></span>
                {col(h).map((x) => <span key={x.b.id} className="truncate text-t4" style={{ color: x.bench ? '#6b7280' : '#e5e7eb' }}>{x.bench ? '벤치 · ' : ''}{x.b.name}</span>)}
              </div>
            );
          })}
        </div>
        {col('S').length > 0 && <span className="text-t4 text-gray-400">양타 · {col('S').map((x) => x.b.name).join(' · ')}</span>}
      </div>
    );
  }],
  4: ['구종 판', () => (
    <div className="flex flex-col gap-2.5">
      <StarterLine />
      <FamBar />
      {FAMS.map((f, i) => {
        const s = LINE.filter((x) => batterFam(x.b).strong === f), w = LINE.filter((x) => batterFam(x.b).weak === f);
        return (
          <div key={f} className="flex flex-col gap-1.5 rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)', boxShadow: `inset 3px 0 0 ${['#f87171', '#a78bfa', '#2dd4bf'][i]}` }}>
            <span className="flex items-baseline justify-between"><b className="text-t3 text-white">{FAM_KO[f]}</b><b className="font-display text-t2 text-white">{Math.round(famShare[f] * 100)}%</b></span>
            <span className="flex flex-wrap gap-1">{s.map((x) => <Chip key={x.b.id} t={x.b.name} c={MY} />)}{w.map((x) => <Chip key={x.b.id} t={x.b.name} c={BAD} />)}</span>
          </div>
        );
      })}
    </div>
  )],
  5: ['바꿀 자리', () => {
    const used = new Set(), swaps = LINE.map((x, i) => ({ x, i })).sort((p, q) => p.x.sc - q.x.sc).map(({ x, i }) => { const alt = BENCH.filter((y) => !used.has(y.b.id) && y.sc > x.sc + 0.3).sort((a, b) => b.sc - a.sc)[0]; if (alt) used.add(alt.b.id); return alt && { i, x, alt }; }).filter(Boolean).sort((p, q) => p.i - q.i); // 벤치 한 명은 한 자리에만
    return (
      <div className="flex flex-col gap-2.5">
        <StarterLine />
        <Rule />
        <Sub right={<b className="font-display text-t2" style={{ color: swaps.length ? '#fbbf24' : DIM }}>{swaps.length}</b>}>바꿀 자리</Sub>
        {swaps.length ? swaps.map(({ i, x, alt }) => (
          <div key={x.b.id} className="grid items-center gap-2 rounded-xl px-3 py-2.5" style={{ gridTemplateColumns: '1.2rem 1fr auto 1fr', background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
            <span className="font-display text-t4 text-gray-500">{i + 1}</span>
            <span className="flex min-w-0 flex-col"><b className="truncate text-t3 text-white">{x.b.name}</b><Why x={x} /></span>
            <b className="text-gray-500">↔</b>
            <span className="flex min-w-0 flex-col items-end"><b className="truncate text-t3" style={{ color: MY }}>{alt.b.name}</b><Why x={alt} /></span>
          </div>
        )) : <span className="text-t4 text-gray-500">없음</span>}
      </div>
    );
  }],
  6: ['타순 띠', () => (
    <div className="flex flex-col gap-3">
      <StarterLine />
      <Rule />
      <Sub>타순</Sub>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
        {LINE.map((x, i) => (
          <span key={x.b.id} className="flex flex-col items-center gap-1 rounded-md py-2" style={{ background: `${tone(x.sc, 0.2)}22`, boxShadow: `inset 0 -2px 0 ${tone(x.sc, 0.2)}` }}>
            <b className="font-display text-t3 text-white">{i + 1}</b><Hand h={x.b.hand} sm />
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {LINE.map((x, i) => <span key={x.b.id} className="flex items-center gap-2 text-t4"><b className="w-4 font-display text-gray-500">{i + 1}</b><span className="flex-1 truncate text-gray-200">{x.b.name}</span><i className="block h-1.5 w-1.5 rounded-full" style={{ background: tone(x.sc, 0.2) }} /></span>)}
      </div>
      <Sub>벤치</Sub>
      <span className="flex flex-wrap gap-1.5">{BENCH.map((x) => <Chip key={x.b.id} t={x.b.name} c={tone(x.sc, 0.2)} />)}</span>
    </div>
  )],
  7: ['오늘 만날 투수', () => {
    const ps = [{ p: OSP, inn: '1~5회' }, ...pen3(OP).map((p, i) => ({ p, inn: ['6회', '7~8회', '9회'][i] }))];
    const lefty = LINE.filter((x) => x.b.hand === 'L').length;
    return (
      <div className="flex flex-col gap-2">
        <Sub right={<span className="text-t4 text-gray-400">우리 좌타 <b className="text-white">{lefty}</b> · 우타 <b className="text-white">{9 - lefty}</b></span>}>상대 투수</Sub>
        {ps.map(({ p, inn }, i) => {
          const rep = repertoireOf(p), mix = pitchMix(p), main = rep.slice(1).sort((a, b) => (mix[b] || 0) - (mix[a] || 0))[0];
          const good = LINE.filter((x) => platoonOf(x.b, p) > 0).length;
          return (
            <div key={p.id} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: i ? 'rgba(255,255,255,.03)' : `${C}14`, boxShadow: `inset 0 0 0 1px ${i ? 'rgba(255,255,255,.07)' : `${C}44`}` }}>
              <Portrait player={p} w={30} h={38} color={C} />
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-t4 text-gray-400">{inn}</span><span className="flex items-center gap-1.5"><b className="truncate text-t3 text-white">{p.name}</b><b className="text-t4" style={{ color: p.hand === 'L' ? '#fbbf24' : '#7dd3fc' }}>{handOf(p)}</b></span></span>
              <span className="flex flex-col items-end text-t4"><span className="text-gray-300">{PITCHES[main]?.name}</span><span style={{ color: good >= 5 ? MY : BAD }}>유리 {good}</span></span>
            </div>
          );
        })}
      </div>
    );
  }],
  8: ['상대 타선 좌우', () => {
    const oL = OP.batters.filter((b) => b.hand === 'L').length, oS = OP.batters.filter((b) => b.hand === 'S').length, oR = 9 - oL - oS;
    const rot = ME.pitchers.slice(0, 1).concat((MYT.roster || []).filter((p) => p.type === 'pitcher' && p.position === 'SP' && p.id !== ME.pitchers[0].id).slice(0, 4));
    return (
      <div className="flex flex-col gap-3">
        <Sub>상대 타선</Sub>
        <span className="flex h-7 overflow-hidden rounded-lg text-t4 font-bold">
          <span className="grid place-items-center" style={{ width: `${(oL / 9) * 100}%`, background: '#fbbf2433', color: '#fbbf24' }}>좌 {oL}</span>
          {oS > 0 && <span className="grid place-items-center" style={{ width: `${(oS / 9) * 100}%`, background: '#c4b5fd33', color: '#c4b5fd' }}>양 {oS}</span>}
          <span className="grid flex-1 place-items-center" style={{ background: '#7dd3fc26', color: '#7dd3fc' }}>우 {oR}</span>
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-t4">{OP.batters.map((b, i) => <span key={b.id} className="flex items-center gap-1"><b className="font-display text-gray-500">{i + 1}</b><span className="text-gray-200">{b.name}</span><Hand h={b.hand} sm /></span>)}</span>
        <Rule />
        <Sub>우리 선발 후보</Sub>
        {rot.map((p, i) => {
          const adv = OP.batters.filter((b) => platoonOf(b, p) < 0).length; // 상대 타자가 불리한 수 = 우리 투수에 유리
          return (
            <div key={p.id} className="flex items-center gap-2 text-t3">
              <b className="truncate text-white">{p.name}</b><b className="text-t4" style={{ color: p.hand === 'L' ? '#fbbf24' : '#7dd3fc' }}>{handOf(p)}</b>
              {i === 0 && <Chip t="오늘" c="#fbbf24" />}
              <span className="ml-auto text-t4" style={{ color: adv >= 5 ? MY : BAD }}>유리 {adv}</span>
            </div>
          );
        })}
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
