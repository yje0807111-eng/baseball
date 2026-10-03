/*
 * 정비 2단계 왼쪽 상대 판 — 위 '상대 흐름'(7안 파도 확정) + 아래 '작전 단서' 8안 (/mockups/scout-step2/?p=1 · ?p=2, 실제 크기 340 × 806)
 * 단서는 숫자가 아니라 2단계에서 고를 것마다 답 하나 — 근거는 아래 '작전 단서' 주석
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

const InnNums = () => <div className="grid text-center text-[11px] text-gray-500" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{FLOW.map((x) => <span key={x.inn}>{x.inn}</span>)}</div>;
const LaneLab = ({ t, c }) => <span className="text-t4 font-bold" style={{ color: c }}>{t}</span>;
import { batterFam, repertoireOf, PITCHES } from '../../src/engine/pitchSim.js';

/*
 * ───── 작전 단서 — 숫자 대신 '2단계에서 고를 것'마다 답 하나 ─────
 * 지난 짝 표(선발 구위 · 선발 제구 · 불펜 구위 · 포수 수비 숫자)를 살펴보니:
 *  - 선발 · 불펜 구위는 머리 칸 막대 · 파도와 겹친다(같은 투수 세기를 세 번)
 *  - 71 · 87 같은 숫자는 '좋은가 나쁜가'를 따로 알아야 읽힌다 → 한눈에 안 들어온다
 *  - 볼 배합의 근거(상대 타선 약한 계열)는 빠져 있었다
 * 그래서 고를 것(공격 성향 · 볼 배합 · 힘 줄 이닝 · 도루)마다 [근거 낱말 · 답]으로. 답 = flow2-sim · plan-sim 갈림:
 *  공격 성향: 선발 제구 약함 → 기다리기(+2.7) / 구위 셈 → 짧게 치기(+2.3) / 구위 약함 → 강공 / 그 밖 → 강공(기본)
 *  볼 배합: 상대 타선이 한 계열에 4명 이상 약하고 우리 선발이 그 공을 던지면 그 공(+1.7) / 아니면 섞기
 *  힘 줄 이닝: 파도가 꺼진 회(상대 마운드 평균 −2)
 *  도루: 상대 포수 수비 약함(84 아래) → 가능(본전) / 그 밖 → 자제(−4.2까지)
 */
const OSP2 = OP.pitchers[0], CAT = OP.catcher || OP.batters.find((b) => b.position === 'C');
const band = (v, lo, hi) => (v <= lo ? 0 : v >= hi ? 2 : 1);
const spB = band(st(OSP2, 'stuff', 80), 74, 83), ctlB = band(st(OSP2, 'control', 75), 79, 89), catB = band(st(CAT, 'defense', 85), 84, 87);
const FAMS = ['F', 'B', 'O'], FAM_S = { F: '직구', B: '휘는 공', O: '떨어지는 공' };
const WEAKN = Object.fromEntries(FAMS.map((f) => [f, OP.batters.filter((b) => batterFam(b).weak === f).length]));
const OUR = new Set(repertoireOf(ME.pitchers[0]).map((t) => PITCHES[t].fam));
const hotFam = FAMS.filter((f) => WEAKN[f] >= 4 && OUR.has(f)).sort((a, b) => WEAKN[b] - WEAKN[a])[0];
const maxFam = [...FAMS].sort((a, b) => WEAKN[b] - WEAKN[a])[0];
const low = FLOW.filter((d) => mWord(d.mound) === '약함').map((d) => d.inn);
const span = (l) => (l.length ? (l.length > 1 && l[l.length - 1] - l[0] === l.length - 1 ? `${l[0]}~${l[l.length - 1]}회` : l.map((x) => `${x}회`).join(' · ')) : '없음');
/* [고를 것, 근거, 답, 기본값과 다른가] */
const CLUES = [
  ctlB === 0 ? ['공격 성향', '선발 제구 약함', '기다리기', true] : spB === 2 ? ['공격 성향', '선발 구위 셈', '짧게 치기', true] : spB === 0 ? ['공격 성향', '선발 구위 약함', '강공', false] : ['공격 성향', '선발 보통', '강공', false],
  hotFam ? ['볼 배합', `${FAM_S[hotFam]} 약한 타자 ${WEAKN[hotFam]}`, FAM_S[hotFam], true] : ['볼 배합', `약점 몰림 없음 · 최다 ${FAM_S[maxFam]} ${WEAKN[maxFam]}`, '섞기', false],
  ['힘 줄 이닝', low.length ? '상대 마운드 꺼짐' : '꺼짐 없음', span(low), !!low.length],
  catB === 0 ? ['도루', '포수 수비 약함', '가능', true] : ['도루', `포수 수비 ${catB === 2 ? '셈' : '보통'}`, '자제', false],
];
const ANS = '#0b0f1a';
const Ans = ({ t, on, lg }) => <b className={`whitespace-nowrap rounded-full px-2.5 ${lg ? 'py-1 text-t2' : 'py-0.5 text-t3'}`} style={on ? { color: ANS, background: MY } : { color: '#e5e7eb', background: 'rgba(255,255,255,.07)' }}>{t}</b>;

/* 파도(7안 확정) — 꺼진 회에 '기회' */
function Wave({ h = 90, tag = true }) {
  const W = 300, H = h, x = (i) => (i * W) / 8, y = (v) => Math.max(6, Math.min(H - 4, H - 10 - (v - (MAVG - 8)) * (H / 20)));
  const pts = FLOW.map((d, i) => [x(i), y(d.mound)]);
  let d = `M0,${H} L${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i += 1) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
  d += ` L${W},${H} Z`;
  return (
    <div className="flex flex-col gap-1">
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        <defs><linearGradient id={`wv${h}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C} stopOpacity=".55" /><stop offset="1" stopColor={C} stopOpacity=".05" /></linearGradient></defs>
        <path d={d} fill={`url(#wv${h})`} stroke={C} strokeWidth="2" />
        {FLOW.map((f, i) => mWord(f.mound) === '약함' && <g key={i}><circle cx={x(i)} cy={y(f.mound)} r="5" fill={MY} />{tag && <text x={x(i)} y={y(f.mound) - 10} fill={MY} fontSize="11" fontWeight="700" textAnchor="middle">기회</text>}</g>)}
      </svg>
      <InnNums />
    </div>
  );
}

/* ───── 8안(아래 '작전 단서') ───── */
const V = {
  1: ['단서 표', () => (
    <div className="flex flex-col">
      {CLUES.map(([k, why, a, on], i) => (
        <div key={k} className="grid items-center gap-2 py-2.5" style={{ gridTemplateColumns: '1fr auto', borderTop: i ? '1px solid rgba(255,255,255,.06)' : undefined }}>
          <span className="flex min-w-0 flex-col"><b className="text-t3 text-white">{k}</b><span className="truncate text-t4 text-gray-400">{why}</span></span>
          <Ans t={a} on={on} />
        </div>
      ))}
    </div>
  )],
  2: ['큰 답', () => (
    <div className="grid gap-x-3 gap-y-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {CLUES.map(([k, why, a, on]) => (
        <span key={k} className="flex flex-col gap-0.5">
          <span className="text-t4 text-gray-400">{k}</span>
          <b className="text-t1 font-black leading-tight" style={{ color: on ? MY : '#fff' }}>{a}</b>
          <span className="truncate text-t4 text-gray-500">{why}</span>
        </span>
      ))}
    </div>
  )],
  3: ['단서 카드', () => (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {CLUES.map(([k, why, a, on]) => (
        <span key={k} className="flex flex-col gap-1.5 rounded-xl p-3" style={{ background: on ? `${MY}12` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${on ? `${MY}66` : 'rgba(255,255,255,.07)'}` }}>
          <span className="text-t4 text-gray-400">{k}</span>
          <b className="text-t2 leading-tight" style={{ color: on ? MY : '#fff' }}>{a}</b>
          <span className="text-[11px] leading-4 text-gray-500">{why}</span>
        </span>
      ))}
    </div>
  )],
  4: ['파도 위 답', () => (
    <div className="flex flex-col gap-2.5">
      {CLUES.filter(([k]) => k !== '힘 줄 이닝').map(([k, why, a, on]) => (
        <span key={k} className="flex items-center gap-2"><b className="w-[4.5rem] text-t3 text-white">{k}</b><span className="min-w-0 flex-1 truncate text-t4 text-gray-400">{why}</span><Ans t={a} on={on} /></span>
      ))}
    </div>
  )],
  5: ['바꿀 것만', () => {
    const chg = CLUES.filter((c) => c[3]), keep = CLUES.filter((c) => !c[3]);
    return (
      <div className="flex flex-col gap-2.5">
        {chg.map(([k, why, a]) => (
          <div key={k} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: `${MY}12`, boxShadow: `inset 0 0 0 1px ${MY}66` }}>
            <span className="flex min-w-0 flex-1 flex-col"><b className="text-t3 text-white">{k}</b><span className="truncate text-t4 text-gray-400">{why}</span></span><Ans t={a} on lg />
          </div>
        ))}
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-t4 text-gray-500">{keep.map(([k, , a]) => <span key={k}>{k} <b className="text-gray-300">{a}</b></span>)}</span>
      </div>
    );
  }],
  6: ['체크', () => {
    const cur = { '공격 성향': '강공', '볼 배합': '섞기', '힘 줄 이닝': '없음', 도루: '자제' }; // 지금 가운데 판에서 고른 것(기본값)
    return (
      <div className="flex flex-col gap-2">
        {CLUES.map(([k, why, a]) => { const ok = cur[k] === a; return (
          <span key={k} className="flex items-center gap-2.5">
            <b className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-t4" style={ok ? { color: ANS, background: MY } : { color: GOLD, boxShadow: `inset 0 0 0 1.5px ${GOLD}` }}>{ok ? '✓' : '!'}</b>
            <span className="flex min-w-0 flex-1 flex-col"><b className="text-t3 text-white">{k} · <span style={{ color: ok ? MY : GOLD }}>{a}</span></b><span className="truncate text-t4 text-gray-500">{why}</span></span>
          </span>
        ); })}
      </div>
    );
  }],
  7: ['칩 한 줄', () => (
    <div className="flex flex-col gap-2.5">
      <span className="flex flex-wrap gap-1.5">{CLUES.map(([k, , a, on]) => <Ans key={k} t={k === '힘 줄 이닝' ? `${a} 힘` : k === '도루' ? `도루 ${a}` : a} on={on} lg />)}</span>
      <span className="flex flex-col gap-0.5 text-t4 text-gray-500">{CLUES.map(([k, why]) => <span key={k}>{k} · {why}</span>)}</span>
    </div>
  )],
  8: ['공격 · 수비', () => {
    const col = (title, list) => (
      <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <b className="text-t4 text-gray-400">{title}</b>
        {list.map(([k, why, a, on]) => <span key={k} className="flex flex-col"><span className="text-[11px] text-gray-500">{k}</span><b className="text-t3" style={{ color: on ? MY : '#fff' }}>{a}</b></span>)}
      </div>
    );
    return <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>{col('공격', [CLUES[0], CLUES[2], CLUES[3]])}{col('수비', [CLUES[1]])}</div>;
  }],
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
          <div className="flex flex-col gap-2"><Sub>상대 흐름</Sub><Wave tag={n !== 4} /></div>
          <Rule />
          <div className="flex flex-col gap-2"><Sub>작전 단서</Sub><Body /></div>
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
