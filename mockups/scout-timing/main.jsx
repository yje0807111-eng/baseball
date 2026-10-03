/*
 * 정비 2단계 왼쪽 — 상대 전력 이닝 흐름 8안 (/mockups/scout-timing/?p=1 → 1~4안, ?p=2 → 5~8안, 실제 크기 340 × 806)
 * 상대가 언제 세고 언제 약한가를 1~9회로. 값은 이 맞대결을 300판 굴려 회마다 잰다(실제로는 미리보기 600판에 얹는다):
 *  상대 마운드 = 그 회 우리 타석에서 만난 상대 투수의 실제 힘 — (구위 + 제구)/2 − 지침(체력 50 아래부터 최대 −11) − 타순 바퀴(0 · 2.5 · 5)
 *               → 선발이 세 바퀴째 · 지칠 때 꺼지고, 센 불펜이 나오면 솟는다. 낮으면 우리 기회(초록)
 *  상대 타선 = 그 회 상대 타석에 선 타자들의 (컨택 + 파워)/2 평균 — 상위 타순이 도는 회가 솟는다. 높으면 위기(상대 색)
 * 아래는 2단계 3안(짝 표)을 줄여 붙여 둘이 한 판에 들어가는지 본다.
 *  1 두 줄 칸     — 상대 마운드 · 상대 타선 9칸씩, 센 회 · 약한 회 색
 *  2 두 선        — 회마다 두 선(마운드 · 타선), 가운데 평균 선
 *  3 위아래 막대  — 위 = 상대 타선 세기, 아래 = 상대 마운드 약함(우리 기회)
 *  4 초 · 중 · 후 — 세 칸에 마운드 · 타선 강약
 *  5 한 줄 종합   — 회마다 상대 우세(타선 + 마운드) 하나로
 *  6 이닝 기둥    — 9기둥마다 상대 투수 · 도는 타순
 *  7 파도         — 상대 마운드 세기를 매끈한 면으로, 꺼진 곳에 '기회'
 *  8 이닝 표      — 9줄: 상대 투수 · 힘 · 도는 타순 · 강약 점
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange, staminaOf, ttoOf } from '../../src/engine/pitchSim.js';
import { tacticOrders } from '../../src/engine/tactics.js';
import { planOfSides, DEFAULT_SIDES } from '../../src/myteam/strategy.js';
import { UiStyle, GlassBg } from '../../src/myteam/ui.jsx';
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
const OSP = OP.pitchers[0], PENS = pen3(OP);

/* ───── 회마다 재기(300판) ───── */
const FLOW = (() => {
  const fine = planOfSides(DEFAULT_SIDES).fine;
  const mound = Array.from({ length: 9 }, () => ({ s: 0, n: 0, who: {} })), lineup = Array.from({ length: 9 }, () => ({ s: 0, n: 0, lead: {} }));
  for (let i = 0; i < 300; i += 1) {
    const g = createGame({ home: engineTeam(MYT), away: engineTeam(OPT), rng: seeded(i + 1) });
    let guard = 0, lastHalf = null;
    while (!g.final && guard++ < 1500) {
      const k = Math.min(g.inning, 9) - 1, fresh = !g.balls && !g.strikes;
      if (fresh && g.inning <= 9) {
        if (!g.top) { // 우리 타석 — 상대 투수의 실제 힘
          const side = g.away, stam = staminaOf(side), f = stam < 50 ? (50 - stam) / 50 : 0;
          mound[k].s += arm(side.pitcher) - f * 11 - ttoOf(side); mound[k].n += 1;
          mound[k].who[side.pitcher.name] = (mound[k].who[side.pitcher.name] || 0) + 1;
        } else { // 상대 타석 — 타자 세기 · 그 회 첫 타자 타순
          const idx = g.away.idx ?? 0, b = g.away.team.batters[idx % 9];
          lineup[k].s += bat(b); lineup[k].n += 1;
          const half = `${g.inning}t`;
          if (half !== lastHalf) { lastHalf = half; lineup[k].lead[idx % 9] = (lineup[k].lead[idx % 9] || 0) + 1; }
        }
      }
      let o = tacticOrders(fine, !g.top, g.rng);
      if (!g.top) { const ch = aiPitchingChange(g, g.away); if (ch) o = { ...o, changePitcher: ch }; }
      pitch(g, o);
    }
  }
  const top = (m) => Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0];
  return Array.from({ length: 9 }, (_, k) => ({
    inn: k + 1, mound: mound[k].s / (mound[k].n || 1), pit: top(mound[k].who) || '', bat: lineup[k].s / (lineup[k].n || 1), lead: Number(top(lineup[k].lead) ?? 0) + 1,
  }));
})();
const MAVG = FLOW.reduce((n, x) => n + x.mound, 0) / 9, BAVG = FLOW.reduce((n, x) => n + x.bat, 0) / 9;
/* 강약 — 상대 마운드는 평균에서 ±2, 상대 타선은 ±1.2 넘으면(우리 눈으로: 마운드 약함 = 기회 초록, 타선 셈 = 위기 상대 색) */
const mTone = (v) => (v <= MAVG - 2 ? MY : v >= MAVG + 2 ? C : '#64748b');
const bTone = (v) => (v >= BAVG + 1.2 ? C : v <= BAVG - 1.2 ? MY : '#64748b');
const mWord = (v) => (v <= MAVG - 2 ? '약함' : v >= MAVG + 2 ? '셈' : '');
const bWord = (v) => (v >= BAVG + 1.2 ? '셈' : v <= BAVG - 1.2 ? '약함' : '');
const lineupRange = (lead) => `${lead}~${((lead + 2) % 9) + 1}번`;

/* ───── 머리(5안 칸 막대) ───── */
const mk = (ko, t, u) => ({ ko, t, u, d: u - t });
const ROWS = [mk('타선', avg(OP.batters, bat), avg(ME.batters, bat)), mk('선발', Math.round(arm(OSP)), Math.round(arm(ME.pitchers[0]))), mk('불펜', avg(PENS, arm), avg(pen3(ME), arm))];
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

/* 2단계 3안 짝 표(줄인 것) */
const CAT = OP.catcher || OP.batters.find((b) => b.position === 'C');
const penStuff = Math.round(OP.pitchers.slice(1).reduce((n, p) => n + st(p, 'stuff', 80), 0) / Math.max(1, OP.pitchers.length - 1));
const INFO = [
  { k: 'sp', ko: '선발 구위', v: st(OSP, 'stuff', 80), lo: 74, hi: 83, weak: '강공 · 초반 힘', strong: '짧게 치기' },
  { k: 'ctl', ko: '선발 제구', v: st(OSP, 'control', 75), lo: 79, hi: 89, weak: '기다리기', strong: null },
  { k: 'pen', ko: '불펜 구위', v: penStuff, lo: 76, hi: 81, weak: '후반 힘', strong: null },
  { k: 'cat', ko: '포수 수비', v: st(CAT, 'defense', 85), lo: 84, hi: 87, weak: '도루', strong: null },
].map((x) => ({ ...x, band: x.v <= x.lo ? 0 : x.v >= x.hi ? 2 : 1 }));
const bandC = (b) => (b === 0 ? MY : b === 2 ? C : DIM);
const PairTable = () => (
  <div className="flex flex-col">
    {INFO.map((x, i) => { const a = x.band === 0 ? x.weak : x.band === 2 ? x.strong : null; return (
      <div key={x.k} className="grid items-center gap-2 py-[7px]" style={{ gridTemplateColumns: '1fr 2rem 5.5rem', borderTop: i ? '1px solid rgba(255,255,255,.06)' : undefined }}>
        <b className="text-t3 text-white">{x.ko}</b>
        <b className="text-right font-display text-t3" style={{ color: bandC(x.band) }}>{x.v}</b>
        <span className="text-right text-t4 font-bold" style={{ color: a ? MY : '#4b5563' }}>{a || '—'}</span>
      </div>
    ); })}
  </div>
);
const InnNums = () => <div className="grid text-center text-[11px] text-gray-500" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{FLOW.map((x) => <span key={x.inn}>{x.inn}</span>)}</div>;
const LaneLab = ({ t, c }) => <span className="text-t4 font-bold" style={{ color: c }}>{t}</span>;

/* ───── 8안 ───── */
const V = {
  1: ['두 줄 칸', () => (
    <div className="flex flex-col gap-1.5">
      <InnNums />
      <LaneLab t="상대 마운드" c={DIM} />
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{FLOW.map((x) => <span key={x.inn} className="grid h-8 place-items-center rounded-[4px] font-display text-t4" style={{ background: `${mTone(x.mound)}33`, color: mTone(x.mound) === '#64748b' ? '#94a3b8' : mTone(x.mound), boxShadow: `inset 0 -2px 0 ${mTone(x.mound)}` }}>{Math.round(x.mound)}</span>)}</div>
      <LaneLab t="상대 타선" c={DIM} />
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{FLOW.map((x) => <span key={x.inn} className="grid h-8 place-items-center rounded-[4px] font-display text-t4" style={{ background: `${bTone(x.bat)}33`, color: bTone(x.bat) === '#64748b' ? '#94a3b8' : bTone(x.bat), boxShadow: `inset 0 -2px 0 ${bTone(x.bat)}` }}>{x.lead}</span>)}</div>
    </div>
  )],
  2: ['두 선', () => {
    const W = 300, H = 120, x = (i) => 10 + (i * (W - 20)) / 8;
    const yM = (v) => H / 2 - (v - MAVG) * 6, yB = (v) => H / 2 - (v - BAVG) * 9;
    const path = (f) => FLOW.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${Math.max(6, Math.min(H - 6, f(d)))}`).join(' ');
    return (
      <div className="flex flex-col gap-1.5">
        <span className="flex gap-3 text-t4"><span style={{ color: '#7dd3fc' }}>— 상대 마운드</span><span style={{ color: C }}>— 상대 타선</span></span>
        <svg width={W} height={H}>
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,.12)" strokeDasharray="3 4" />
          <path d={path((d) => yM(d.mound))} fill="none" stroke="#7dd3fc" strokeWidth="2.5" />
          <path d={path((d) => yB(d.bat))} fill="none" stroke={C} strokeWidth="2.5" />
          {FLOW.map((d, i) => mWord(d.mound) === '약함' && <circle key={i} cx={x(i)} cy={yM(d.mound)} r="5" fill={MY} />)}
        </svg>
        <InnNums />
      </div>
    );
  }],
  3: ['위아래 막대', () => (
    <div className="flex flex-col gap-1">
      <LaneLab t="상대 타선" c={C} />
      <div className="grid items-end gap-[3px]" style={{ gridTemplateColumns: 'repeat(9,1fr)', height: 54 }}>{FLOW.map((d) => <i key={d.inn} className="block rounded-t-[3px]" style={{ height: `${Math.max(8, 50 + (d.bat - BAVG) * 14)}%`, background: bTone(d.bat) === C ? C : `${C}55` }} />)}</div>
      <InnNums />
      <div className="grid items-start gap-[3px]" style={{ gridTemplateColumns: 'repeat(9,1fr)', height: 54 }}>{FLOW.map((d) => <i key={d.inn} className="block rounded-b-[3px]" style={{ height: `${Math.max(8, 50 + (MAVG - d.mound) * 8)}%`, background: mTone(d.mound) === MY ? MY : `${MY}55` }} />)}</div>
      <LaneLab t="상대 마운드 빈틈" c={MY} />
    </div>
  )],
  4: ['초 · 중 · 후', () => {
    const ph = [[0, 3, '초반'], [3, 6, '중반'], [6, 9, '후반']].map(([a, b, ko]) => { const s = FLOW.slice(a, b); return { ko, m: s.reduce((n, x) => n + x.mound, 0) / 3, b: s.reduce((n, x) => n + x.bat, 0) / 3 }; });
    return (
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {ph.map((p) => (
          <span key={p.ko} className="flex flex-col gap-2 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
            <b className="text-center text-t3 text-white">{p.ko}</b>
            <span className="flex flex-col items-center"><span className="text-[11px] text-gray-400">마운드</span><b className="text-t3" style={{ color: mTone(p.m) === '#64748b' ? '#cbd5e1' : mTone(p.m) }}>{mWord(p.m) || '보통'}</b></span>
            <span className="flex flex-col items-center"><span className="text-[11px] text-gray-400">타선</span><b className="text-t3" style={{ color: bTone(p.b) === '#64748b' ? '#cbd5e1' : bTone(p.b) }}>{bWord(p.b) || '보통'}</b></span>
          </span>
        ))}
      </div>
    );
  }],
  5: ['한 줄 종합', () => {
    const score = (d) => (d.mound - MAVG) / 2 + (d.bat - BAVG) / 1.2; // 상대 우세(+) · 빈틈(−)
    return (
      <div className="flex flex-col gap-1.5">
        <span className="flex justify-between text-t4"><span style={{ color: MY }}>상대 빈틈</span><span style={{ color: C }}>상대 우세</span></span>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
          {FLOW.map((d) => { const s = Math.max(-2, Math.min(2, score(d))), c = s > 0 ? C : MY; return <span key={d.inn} className="h-10 rounded-[4px]" style={{ background: `${c}${Math.round(20 + Math.abs(s) * 50).toString(16).padStart(2, '0')}` }} />; })}
        </div>
        <InnNums />
      </div>
    );
  }],
  6: ['이닝 기둥', () => (
    <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
      {FLOW.map((d) => (
        <span key={d.inn} className="flex flex-col items-center gap-1 rounded-md py-1.5" style={{ background: 'rgba(255,255,255,.03)' }}>
          <b className="font-display text-t4 text-gray-400">{d.inn}</b>
          <span className="h-7 w-full px-[2px] text-center text-[10px] leading-[13px] text-gray-200" style={{ wordBreak: 'keep-all' }}>{d.pit.slice(0, 3)}</span>
          <i className="block h-1.5 w-4/5 rounded-full" style={{ background: mTone(d.mound) }} />
          <span className="text-[10px] text-gray-400">{d.lead}번</span>
          <i className="block h-1.5 w-4/5 rounded-full" style={{ background: bTone(d.bat) }} />
        </span>
      ))}
    </div>
  )],
  7: ['파도', () => {
    const W = 300, H = 90, x = (i) => (i * W) / 8, y = (v) => Math.max(6, Math.min(H - 4, H - 10 - (v - (MAVG - 8)) * 4.5));
    const pts = FLOW.map((d, i) => [x(i), y(d.mound)]);
    let d = `M0,${H} L${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i += 1) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
    d += ` L${W},${H} Z`;
    const low = FLOW.map((f, i) => [f, i]).filter(([f]) => mWord(f.mound) === '약함');
    return (
      <div className="flex flex-col gap-1">
        <LaneLab t="상대 마운드" c={DIM} />
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          <defs><linearGradient id="wv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C} stopOpacity=".55" /><stop offset="1" stopColor={C} stopOpacity=".05" /></linearGradient></defs>
          <path d={d} fill="url(#wv)" stroke={C} strokeWidth="2" />
          {low.map(([f, i]) => <g key={i}><circle cx={x(i)} cy={y(f.mound)} r="5" fill={MY} /><text x={x(i)} y={y(f.mound) - 10} fill={MY} fontSize="11" fontWeight="700" textAnchor="middle">기회</text></g>)}
        </svg>
        <InnNums />
      </div>
    );
  }],
  8: ['이닝 표', () => (
    <div className="flex flex-col">
      {FLOW.map((d) => (
        <div key={d.inn} className="grid items-center gap-2 py-[3px] text-t4" style={{ gridTemplateColumns: '1.8rem 1fr 1.6rem 3rem 0.5rem 0.5rem' }}>
          <b className="font-display text-gray-400">{d.inn}회</b>
          <span className="truncate text-gray-200">{d.pit}</span>
          <b className="text-right font-display" style={{ color: mTone(d.mound) === '#64748b' ? '#cbd5e1' : mTone(d.mound) }}>{Math.round(d.mound)}</b>
          <span className="text-right text-gray-400">{lineupRange(d.lead)}</span>
          <i className="block h-2 w-2 rounded-full" style={{ background: mTone(d.mound) }} />
          <i className="block h-2 w-2 rounded-full" style={{ background: bTone(d.bat) }} />
        </div>
      ))}
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
        <div className="flex min-h-0 flex-1 flex-col gap-3" data-low={n}>
          <div className="flex flex-col gap-2"><Sub>상대 흐름</Sub><Body /></div>
          <Rule />
          <PairTable />
        </div>
      </aside>
    </div>
  );
}

function App() {
  React.useEffect(() => {
    document.querySelectorAll('[data-low]').forEach((el) => {
      const h = document.querySelector(`[data-h="${el.dataset.low}"]`);
      const used = [...el.children].reduce((n, c) => n + c.getBoundingClientRect().height, 0) + 12 * (el.children.length - 1);
      if (h) h.textContent = el.scrollHeight > el.clientHeight + 1 ? `넘침 ${el.scrollHeight - el.clientHeight}px` : `여유 ${Math.round(el.clientHeight - used)}px`;
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
