/*
 * 정비 2단계 왼쪽 상대 판 — 위 '상대 흐름'(파도) + 아래 '상대 성향' 8안 (/mockups/scout-trait/?p=1 · ?p=2, 실제 크기 340 × 806)
 * 작전 단서(답)는 힌트가 지나쳐 뺐다 — 상대가 어떤 팀인가만 보여 주고 고르기는 감독 몫
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
import { Portrait } from '../../src/myteam/ui.jsx';
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

/*
 * ───── 상대 성향 — 답(작전)이 아니라 상대가 어떤 팀인가. 읽고 고르는 건 감독 몫 ─────
 * 성향마다 근거(능력치)와 쓰임(flow2-sim · plan-sim):
 *  선발 유형   구위 − 제구 ≥ 5 구위형 · ≤ −5 제구형 · 그 밖 균형형        (구위 약하면 강공 · 세면 짧게 치기)
 *  선발 구위   구위 ≤ 74 약함 · ≥ 83 강함                               (강공 · 짧게 치기)
 *  선발 볼넷   제구 ≤ 79 많음 · ≥ 89 적음                               (기다리기)
 *  선발 이닝   체력 ≥ 95 길게 · ≤ 85 짧게                               (힘 줄 이닝 — 파도와 짝)
 *  불펜        센 셋 평균 (구위+제구)/2 ≥ 84 뒷문 강함 · 구위 평균 ≤ 76 중간 약함
 *  타선 유형   파워 − 컨택 ≥ 4 장타형 · ≤ −4 교타형 · 그 밖 고른 타선
 *  타선 발     주력 평균 ≥ 80 발 빠름 · ≤ 70 발 느림
 *  타선 약점   한 계열에 약한 타자 4명 이상이면 그 공에 약함              (볼 배합)
 *  포수 어깨   수비 ≥ 87 강함 · ≤ 84 약함 · 그 밖 보통                    (도루)
 */
const SP = OP.pitchers[0], CAT = OP.catcher || OP.batters.find((b) => b.position === 'C');
const B = OP.batters, mean = (l, f) => l.reduce((n, x) => n + f(x), 0) / (l.length || 1);
const penAll = OP.pitchers.slice(1);
const FAMS = ['F', 'B', 'O'], FAM_S = { F: '직구', B: '휘는 공', O: '떨어지는 공' };
const WEAKN = Object.fromEntries(FAMS.map((f) => [f, B.filter((b) => batterFam(b).weak === f).length]));
const wkFam = FAMS.filter((f) => WEAKN[f] >= 4).sort((a, b) => WEAKN[b] - WEAKN[a])[0];
const v = {
  spType: st(SP, 'stuff', 80) - st(SP, 'control', 75), spCtl: st(SP, 'control', 75), spStam: st(SP, 'stamina', 90),
  pen: mean(pen3(OP), arm), penStuff: mean(penAll, (p) => st(p, 'stuff', 80)),
  batType: mean(B, (b) => st(b, 'power')) - mean(B, (b) => st(b, 'contact')), spd: mean(B, (b) => st(b, 'speed')), cat: st(CAT, 'defense', 85),
};
/* [누구, 성향 낱말, 강약(상대에게 + = 상대 강점 · − = 우리 기회 · 0 = 성격만)] */
const T = {
  spType: v.spType >= 5 ? '구위형' : v.spType <= -5 ? '제구형' : '균형형',
  spStuff: st(SP, 'stuff', 80) <= 74 ? ['구위 약함', -1] : st(SP, 'stuff', 80) >= 83 ? ['구위 강함', 1] : null,
  spBb: v.spCtl <= 79 ? ['볼넷 많음', -1] : v.spCtl >= 89 ? ['볼넷 적음', 1] : null,
  spInn: v.spStam >= 95 ? ['길게 던짐', 1] : v.spStam <= 85 ? ['일찍 지침', -1] : null,
  pen: v.pen >= 84 ? ['뒷문 강함', 1] : v.penStuff <= 76 ? ['중간 약함', -1] : null,
  batType: v.batType >= 4 ? '장타형' : v.batType <= -4 ? '교타형' : '고른 타선',
  spd: v.spd >= 80 ? ['발 빠름', 1] : v.spd <= 70 ? ['발 느림', -1] : null,
  weak: wkFam ? [`${FAM_S[wkFam]}에 약함`, -1] : null,
  cat: v.cat >= 87 ? ['어깨 강함', 1] : v.cat <= 84 ? ['어깨 약함', -1] : ['어깨 보통', 0],
};
const WHO = [
  { who: '선발', name: SP.name, p: SP, tags: [[T.spType, 0], T.spStuff, T.spBb, T.spInn].filter(Boolean) },
  { who: '불펜', name: pen3(OP)[0]?.name, p: pen3(OP)[0], tags: [T.pen || ['보통', 0]] },
  { who: '타선', name: null, p: null, tags: [[T.batType, 0], T.spd, T.weak].filter(Boolean) },
  { who: '포수', name: CAT?.name, p: CAT, tags: [T.cat] },
];
const toneOf = (s) => (s > 0 ? C : s < 0 ? MY : '#cbd5e1');
const Tag = ({ t, s, lg }) => <b className={`whitespace-nowrap rounded-full px-2.5 ${lg ? 'py-1 text-t3' : 'py-0.5 text-t4'}`} style={{ color: toneOf(s), background: `${toneOf(s)}1a`, boxShadow: `inset 0 0 0 1px ${toneOf(s)}55` }}>{t}</b>;
/* 양끝 성향 막대 — [왼쪽 낱말, 오른쪽 낱말, 값, 범위] */
const SLIDE = [
  ['선발', '제구', '구위', v.spType, -20, 20], ['선발', '짧게', '길게', v.spStam, 75, 100], ['불펜', '약함', '강함', v.pen, 72, 90],
  ['타선', '교타', '장타', v.batType, -15, 15], ['타선', '느림', '빠름', v.spd, 62, 90], ['포수', '어깨 약함', '어깨 강함', v.cat, 80, 95],
];
const Slider = ({ s }) => {
  const [who, l, r, val, lo, hi] = s, at = Math.max(4, Math.min(96, ((val - lo) / (hi - lo)) * 100));
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: '2.2rem 3.4rem 1fr 3.4rem' }}>
      <span className="text-t4 font-bold text-gray-400">{who}</span>
      <span className="text-right text-t4" style={{ color: at < 40 ? '#fff' : '#6b7280' }}>{l}</span>
      <span className="relative block h-1.5 rounded-full bg-white/[0.08]"><i className="absolute left-1/2 top-[-3px] bottom-[-3px] w-px bg-white/25" /><i className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${at}%`, background: '#e5e7eb', boxShadow: `0 0 0 2px #0b0f1a, 0 0 8px ${C}` }} /></span>
      <span className="text-t4" style={{ color: at > 60 ? '#fff' : '#6b7280' }}>{r}</span>
    </div>
  );
};

/* ───── 8안(아래 '상대 성향') ───── */
const V = {
  1: ['사람별 태그', () => (
    <div className="flex flex-col gap-2.5">
      {WHO.map((w) => (
        <div key={w.who} className="flex items-start gap-2.5">
          <b className="w-8 shrink-0 pt-0.5 text-t4 text-gray-400">{w.who}</b>
          <span className="flex flex-wrap gap-1">{w.tags.map(([t, s]) => <Tag key={t} t={t} s={s} />)}</span>
        </div>
      ))}
    </div>
  )],
  2: ['양끝 막대', () => <div className="flex flex-col gap-3">{SLIDE.map((s) => <Slider key={s[0] + s[1]} s={s} />)}</div>],
  3: ['리포트 줄', () => (
    <div className="flex flex-col gap-2">
      {WHO.map((w) => (
        <div key={w.who} className="flex items-baseline gap-2 text-t3">
          <b className="w-8 shrink-0 text-t4 text-gray-400">{w.who}</b>
          <span className="min-w-0 flex-1 text-gray-200">{w.tags.map(([t, s], i) => <React.Fragment key={t}>{i > 0 && <span className="text-gray-600"> · </span>}<b style={{ color: toneOf(s) }}>{t}</b></React.Fragment>)}</span>
        </div>
      ))}
    </div>
  )],
  4: ['사람 카드', () => (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {WHO.map((w) => (
        <span key={w.who} className="flex flex-col gap-1.5 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
          <span className="flex items-center gap-1.5">{w.p && <Portrait player={w.p} w={22} h={28} color={C} />}<span className="flex min-w-0 flex-col"><span className="text-[11px] text-gray-400">{w.who}</span>{w.name && <b className="truncate text-t4 text-white">{w.name}</b>}</span></span>
          <span className="flex flex-wrap gap-1">{w.tags.map(([t, s]) => <Tag key={t} t={t} s={s} />)}</span>
        </span>
      ))}
    </div>
  )],
  5: ['배지 판', () => {
    const all = WHO.flatMap((w) => w.tags.map(([t, s]) => ({ who: w.who, t, s })));
    return (
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {all.map((x) => (
          <span key={x.who + x.t} className="flex flex-col items-center gap-1 rounded-xl py-2.5" style={{ background: `${toneOf(x.s)}12`, boxShadow: `inset 0 0 0 1px ${toneOf(x.s)}44` }}>
            <span className="text-[11px] text-gray-400">{x.who}</span><b className="text-center text-t4 leading-tight" style={{ color: toneOf(x.s) }}>{x.t}</b>
          </span>
        ))}
      </div>
    );
  }],
  6: ['강점 · 빈틈', () => {
    const all = WHO.flatMap((w) => w.tags.map(([t, s]) => ({ who: w.who, t, s })));
    const col = (title, list, c) => (
      <div className="flex flex-col gap-1.5 rounded-xl p-3" style={{ background: `${c}10`, boxShadow: `inset 0 0 0 1px ${c}44` }}>
        <b className="text-t4" style={{ color: c }}>{title}</b>
        {list.length ? list.map((x) => <span key={x.who + x.t} className="text-t4 text-gray-200"><span className="text-gray-500">{x.who} </span>{x.t}</span>) : <span className="text-t4 text-gray-500">없음</span>}
      </div>
    );
    return (
      <div className="flex flex-col gap-1.5">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>{col('상대 강점', all.filter((x) => x.s > 0), C)}{col('상대 빈틈', all.filter((x) => x.s < 0), MY)}</div>
        <span className="flex flex-wrap gap-1">{all.filter((x) => x.s === 0).map((x) => <Tag key={x.who + x.t} t={`${x.who} ${x.t}`} s={0} />)}</span>
      </div>
    );
  }],
  7: ['유형 크게', () => (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {[['선발', T.spType, SP], ['타선', T.batType, null]].map(([who, t, p]) => (
          <span key={who} className="flex flex-col gap-0.5 rounded-xl p-3" style={{ background: `${C}12`, boxShadow: `inset 0 0 0 1px ${C}44` }}>
            <span className="text-t4 text-gray-400">{who}{p ? ` · ${p.name}` : ''}</span><b className="text-t1 font-black leading-tight text-white">{t}</b>
          </span>
        ))}
      </div>
      <span className="flex flex-wrap gap-1.5">{[T.spStuff && ['선발', ...T.spStuff], T.spBb && ['선발', ...T.spBb], T.spInn && ['선발', ...T.spInn], T.pen && ['불펜', ...T.pen], T.spd && ['타선', ...T.spd], T.weak && ['타선', ...T.weak], ['포수', ...T.cat]].filter(Boolean).map(([w, t, s]) => <Tag key={w + t} t={`${w} ${t}`} s={s} lg />)}</span>
    </div>
  )],
  8: ['막대 + 태그', () => (
    <div className="flex flex-col gap-2.5">
      {SLIDE.slice(0, 1).concat(SLIDE.slice(3, 4)).map((s) => <Slider key={s[0] + s[1]} s={s} />)}
      <Rule />
      <span className="flex flex-wrap gap-1">{[T.spStuff && ['선발', ...T.spStuff], T.spBb && ['선발', ...T.spBb], T.spInn && ['선발', ...T.spInn], T.pen && ['불펜', ...T.pen], T.spd && ['타선', ...T.spd], T.weak && ['타선', ...T.weak], ['포수', ...T.cat]].filter(Boolean).map(([w, t, s]) => <Tag key={w + t} t={`${w} ${t}`} s={s} />)}</span>
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
          <div className="flex flex-col gap-2"><Sub>상대 흐름</Sub><Wave /></div>
          <Rule />
          <div className="flex flex-col gap-2"><Sub>상대 성향</Sub><Body /></div>
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
