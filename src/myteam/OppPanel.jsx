/*
 * 정비 왼쪽 '오늘 상대' 판(경기 모드) — ROADMAP 13 · 목업 scout-tug 5안 · scout-lineup2 1안 · scout-timing 7안 · scout-trait 2안 · scout-gauge 5안.
 *  머리(세 단계 공통): 구단 한 줄 + 칸 막대 셋(타선 · 선발 · 불펜) — 상대는 늘 왼쪽 · 우리는 늘 오른쪽, 2점 = 1칸, 앞선 쪽만 제 색
 *  1 라인업:   상대 타순 9명(장타 · 주루) + 오늘 만날 상대 투수(이닝 · 주무기 · 손) — lineup-sim: 상성 교체는 손해라 '알아 두기'만
 *  2 경기 흐름: 상대 흐름(회마다 상대 마운드 실제 힘, 미리보기 600판 — 꺼진 회 = 기회) + 상대 성향(양끝 막대)
 *  3 상황 대응: 상대 성향 10(기운 것만 진하게) + 경보 4(맞대결 위험도 — 높음만 진하게). 어느 칸에도 '답'은 적지 않는다
 */
import React from 'react';
import { Portrait } from './ui.jsx';
import { pitchMix, repertoireOf, PITCHES, styleOf } from '../engine/pitchSim.js';

const cut = (c) => ({ '--c': `${c}px` });
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;
const bat = (b) => (st(b, 'contact') + st(b, 'power')) / 2;
const mean = (l, f) => (l.length ? l.reduce((n, x) => n + f(x), 0) / l.length : 0);
const pen3 = (e) => e.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a)).slice(0, 3);
const MY = '#34d399', DIM = '#9ca3af', GOLD = '#fbbf24', RED = '#f87171', POW = '#f87171', SPD = '#38bdf8';
const HAND_C = { L: '#fbbf24', R: '#7dd3fc', S: '#c4b5fd' };
const Rule = () => <span className="block h-px shrink-0 bg-white/[0.08]" />;
const Sub = ({ children, right }) => <span className="flex items-baseline justify-between"><span className="text-t3 font-bold text-gray-300">{children}</span>{right}</span>;

/* ───── 머리 — 칸 막대 ───── */
function Head({ opponent, home, away, c }) {
  const ros = opponent.roster || [];
  const ovr = ros.length ? Math.round(mean(ros, (p) => p.overall)) : 0;
  const rows = [['타선', mean(away.batters, bat), mean(home.batters, bat)], ['선발', arm(away.pitchers[0]), arm(home.pitchers[0])], ['불펜', mean(pen3(away), arm), mean(pen3(home), arm)]]
    .map(([ko, t, u]) => ({ ko, t: Math.round(t), u: Math.round(u), d: Math.round(u) - Math.round(t) }));
  return (
    <>
      <div className="flex shrink-0 items-center gap-2.5">
        {opponent.emblem && <span className="block h-8 w-8 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${opponent.emblem})` }} />}
        <b className="min-w-0 flex-1 truncate text-t2 font-black text-white">{opponent.name}</b>
        <b className="font-display text-t1 font-extrabold leading-none" style={{ color: c }}>{ovr}</b>
      </div>
      <Rule />
      <div className="flex shrink-0 flex-col gap-3">
        <span className="flex justify-between text-t4 font-bold"><span style={{ color: c }}>상대</span><span style={{ color: MY }}>우리</span></span>
        {rows.map((r) => {
          const n = Math.min(5, Math.ceil(Math.abs(r.d) / 2));
          const cells = (side) => Array.from({ length: 5 }, (_, i) => { const on = side === 'L' ? r.d < 0 && 4 - i < n : r.d > 0 && i < n; return <i key={i} className="block h-2 flex-1 rounded-[2px]" style={{ background: on ? (side === 'L' ? c : MY) : 'rgba(255,255,255,.06)' }} />; });
          return (
            <div key={r.ko} className="grid items-center gap-2" style={{ gridTemplateColumns: '2rem 1fr 2.6rem 1fr 2rem' }}>
              <b className="font-display text-t2 leading-none" style={{ color: r.d < 0 ? c : DIM }}>{r.t}</b><span className="flex gap-[3px]">{cells('L')}</span>
              <span className="text-center text-t4 text-gray-300">{r.ko}</span><span className="flex gap-[3px]">{cells('R')}</span>
              <b className="text-right font-display text-t2 leading-none" style={{ color: r.d > 0 ? MY : DIM }}>{r.u}</b>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ───── 1 라인업 — 상대 타순 + 오늘 만날 투수 ───── */
const mainOf = (p) => { const mix = pitchMix(p); return repertoireOf(p).slice(1).sort((a, b) => (mix[b] || 0) - (mix[a] || 0))[0]; };
function StepLineup({ away, pv }) {
  const bats = away.batters;
  const tag = new Map();
  [...bats].sort((a, b) => st(b, 'power') - st(a, 'power')).slice(0, 2).forEach((p) => tag.set(p.id, '장타'));
  [...bats].sort((a, b) => st(b, 'speed') - st(a, 'speed')).slice(0, 1).forEach((p) => { if (!tag.has(p.id)) tag.set(p.id, '주루'); });
  /* 오늘 만날 투수 — 미리보기(상대 선발이 내려가는 이닝 · 회마다 가장 자주 나온 불펜), 없으면 선발 + 센 불펜 셋 */
  const byName = new Map(away.pitchers.map((p) => [p.name, p]));
  let pits;
  if (pv) {
    const exit = Math.max(1, Math.min(9, Math.floor(pv.oppExit)));
    pits = [{ p: away.pitchers[0], a: 1, b: exit }];
    for (let i = exit; i < 9; i += 1) {
      const p = byName.get(pv.oppPen[i]); if (!p) continue;
      const last = pits[pits.length - 1];
      if (last.p === p) last.b = i + 1; else pits.push({ p, a: i + 1, b: i + 1 });
    }
  } else pits = [{ p: away.pitchers[0], a: 1, b: 5 }, ...pen3(away).map((p, i) => ({ p, a: [6, 7, 9][i], b: [6, 8, 9][i] }))];
  const Tag = ({ t }) => { const k = t === '장타' ? POW : SPD; return <b className="whitespace-nowrap rounded-full px-2 py-0.5 text-t4" style={{ color: k, background: `${k}1a`, boxShadow: `inset 0 0 0 1px ${k}55` }}>{t}</b>; };
  return (
    <div className="flex min-h-0 flex-col gap-2.5">
      <Sub>상대 타순</Sub>
      {bats.map((b, i) => (
        <div key={b.id} className="flex items-center gap-2.5">
          <b className="w-4 font-display text-t3 text-gray-500">{i + 1}</b>
          <b className="min-w-0 flex-1 truncate text-t3 text-white">{b.name}</b>
          {tag.get(b.id) && <Tag t={tag.get(b.id)} />}
          <b className="text-t4" style={{ color: HAND_C[b.hand] || HAND_C.R }}>{{ L: '좌타', S: '양타' }[b.hand] || '우타'}</b>
        </div>
      ))}
      <Rule />
      <Sub>상대 투수</Sub>
      {pits.slice(0, 5).map(({ p, a, b }) => (
        <div key={p.id + a} className="flex items-center gap-2.5">
          <span className="w-12 text-t4 text-gray-400">{a === b ? `${a}회` : `${a}~${b}회`}</span>
          <b className="min-w-0 flex-1 truncate text-t3 text-white">{p.name}</b>
          <span className="text-t4 text-gray-300">{PITCHES[mainOf(p)]?.name}</span>
          <b className="text-t4" style={{ color: HAND_C[p.hand] || HAND_C.R }}>{p.hand === 'L' ? '좌투' : '우투'}</b>
        </div>
      ))}
    </div>
  );
}

/* ───── 2 경기 흐름 — 파도 + 성향 ───── */
function Wave({ mound, c }) {
  const vals = (mound || []).map((v) => v ?? null);
  const known = vals.filter((v) => v != null);
  const W = 300, H = 90;
  if (known.length < 2) return <span className="block h-[110px] animate-pulse rounded-lg bg-white/[0.04]" />;
  const avgM = known.reduce((a, b) => a + b, 0) / known.length;
  const fill = vals.map((v, i) => v ?? vals.slice(0, i).reverse().find((x) => x != null) ?? avgM);
  const x = (i) => (i * W) / 8, y = (v) => Math.max(6, Math.min(H - 4, H - 10 - (v - (avgM - 8)) * 4.5));
  const pts = fill.map((v, i) => [x(i), y(v)]);
  let d = `M0,${H} L${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i += 1) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
  d += ` L${W},${H} Z`;
  return (
    <div className="flex flex-col gap-1">
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        <defs><linearGradient id="opp-wave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".55" /><stop offset="1" stopColor={c} stopOpacity=".05" /></linearGradient></defs>
        <path d={d} fill="url(#opp-wave)" stroke={c} strokeWidth="2" />
        {fill.map((v, i) => v <= avgM - 2 && <g key={i}><circle cx={x(i)} cy={y(v)} r="5" fill={MY} /><text x={x(i)} y={y(v) - 10} fill={MY} fontSize="11" fontWeight="700" textAnchor="middle">기회</text></g>)}
      </svg>
      <div className="grid text-center text-[11px] text-gray-500" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{fill.map((_, i) => <span key={i}>{i + 1}</span>)}</div>
    </div>
  );
}
/* 양끝 막대 — [누구, 왼쪽, 오른쪽, 자리 %]. 기운 쪽 낱말만 밝게, dim 이면 가운데 가까운 줄을 흐리게 */
const pos = (v, lo, hi) => Math.max(4, Math.min(96, ((v - lo) / (hi - lo)) * 100));
const vivid = (t) => t.at <= 25 || t.at >= 75;
function Gauge({ t, c, dim }) {
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: '2.2rem 4.3rem 1fr 4.3rem', opacity: dim && !vivid(t) ? 0.45 : 1 }}>
      <span className="text-t4 font-bold text-gray-500">{t.who}</span>
      <span className="truncate text-right text-t4" style={{ color: t.at < 40 ? '#fff' : '#6b7280', fontWeight: t.at < 40 ? 700 : 400 }}>{t.l}</span>
      <span className="relative block h-1.5 rounded-full bg-white/[0.08]"><i className="absolute bottom-[-3px] left-1/2 top-[-3px] w-px bg-white/20" /><i className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${t.at}%`, background: '#e5e7eb', boxShadow: `0 0 0 2px #0b0f1a, 0 0 8px ${c}` }} /></span>
      <span className="truncate text-t4" style={{ color: t.at > 60 ? '#fff' : '#6b7280', fontWeight: t.at > 60 ? 700 : 400 }}>{t.r}</span>
    </div>
  );
}
/*
 * 성향 — 눈금 양끝 = AI 시리즈 팀 하위 10% · 상위 10% 자리가 막대의 10% · 90%(2026-10-03 411팀):
 *  선발 구위 67~93 · 제구 68~95 · 안정 71~92 · 체력 81~102, 타선 파워 73~86 · 컨택 74~88 · 주력 75~84, 포수 수비 84~93, 불펜 센 셋 73~89
 * ponytail: 유형 축(구위 − 제구 · 파워 − 컨택)은 어림 범위 — 쓰다 치우치면 분포로 다시
 */
function traitsOf(away) {
  const sp = away.pitchers[0], cat = away.catcher || away.batters.find((b) => b.position === 'C'), B = away.batters;
  const sty = styleOf(sp).k;
  return {
    type: { who: '선발', l: '제구', r: '구위', at: pos(st(sp, 'stuff', 80) - st(sp, 'control', 75), -25, 11) },
    stuff: { who: '선발', l: '구위 약함', r: '구위 강함', at: pos(st(sp, 'stuff', 80), 64, 96) },
    bb: { who: '선발', l: '볼넷 많음', r: '볼넷 적음', at: pos(st(sp, 'control', 75), 65, 98) },
    duel: { who: '선발', l: '기교', r: '정면', at: sty === 'tempo' ? 15 : sty === 'power' ? 85 : 50 },
    hold: { who: '선발', l: '견제 느슨', r: '견제 날카로움', at: pos(st(sp, 'stability', 81), 68, 95) },
    inn: { who: '선발', l: '일찍 지침', r: '길게 던짐', at: pos(st(sp, 'stamina', 90), 78, 105) },
    batType: { who: '타선', l: '교타', r: '장타', at: pos(mean(B, (b) => st(b, 'power')) - mean(B, (b) => st(b, 'contact')), -12, 10) },
    pow: { who: '타선', l: '교타', r: '장타', at: pos(mean(B, (b) => st(b, 'power')), 71, 88) },
    con: { who: '타선', l: '삼진 많음', r: '삼진 적음', at: pos(mean(B, (b) => st(b, 'contact')), 72, 90) },
    spd: { who: '타선', l: '발 느림', r: '발 빠름', at: pos(mean(B, (b) => st(b, 'speed')), 74, 85) },
    cat: { who: '포수', l: '어깨 약함', r: '어깨 강함', at: pos(st(cat, 'defense', 85), 83, 94) },
    pen: { who: '불펜', l: '뒷문 약함', r: '뒷문 강함', at: pos(mean(pen3(away), arm), 71, 91) },
  };
}
/* 상대 마운드 회마다 — 가운데 판에 있던 줄을 상대 판으로(목업 prep-flow3 7안). 기회(평균 −2 아래)는 초록, 가운데 그래프 기둥과 같은 셈 */
function MoundCells({ mound }) {
  const known = (mound || []).filter((v) => v != null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
      {Array.from({ length: 9 }, (_, i) => {
        const v = mound?.[i], low = v != null && v <= avg - 2;
        return (
          <span key={i} className="flex flex-col items-center rounded-md py-1" style={{ background: v == null ? 'rgba(255,255,255,.03)' : low ? 'rgba(16,185,129,.14)' : `rgba(167,139,250,${Math.max(0.08, Math.min(0.42, 0.1 + (v - avg + 6) / 34))})` }}>
            <span className="text-[10px] text-gray-500">{i + 1}</span><b className="font-display text-[12px]" style={{ color: low ? '#10b981' : '#e5e7eb' }}>{v == null ? '' : Math.round(v)}</b>
          </span>
        );
      })}
    </div>
  );
}
function StepFlow({ away, pv, busy, c }) {
  const T = traitsOf(away);
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Sub>상대 흐름</Sub>
      <div className="flex flex-col gap-2 transition-opacity" style={{ opacity: busy ? 0.45 : 1 }}><Wave mound={pv?.oppMound} c={c} /><MoundCells mound={pv?.oppMound} /></div>
      <Rule />
      <Sub>상대 성향</Sub>
      <div className="flex flex-col gap-3">{[T.type, T.inn, T.pen, T.batType, T.spd, T.cat].map((t) => <Gauge key={t.who + t.l} t={t} c={c} />)}</div>
    </div>
  );
}

/* ───── 3 상황 대응 — 성향 10 + 경보 4 ───── */
/*
 * 경보 — 상대 혼자가 아니라 우리와 맞대결(엔진 식 그대로):
 *  장타 위험 = 상대 파워 위 셋 평균 − 우리 선발 구위 / 도루 위험 = 상대 주력 85+(AI 도루 문턱) 가장 빠른 주자 vs 우리 포수 · 우리 선발 견제(stealOdds)
 *  세 바퀴째 위험 = 상대 타선 − (우리 선발 (구위+제구)/2 − 5) / 도루 기회 = 우리 주력 80+ 가장 빠른 주자 vs 상대 포수 · 상대 선발 견제
 * ponytail: 높음 문턱(막대 66%)은 어림 — 쓰다 치우치면 AI 팀 3등분으로
 */
const stealP = (runner, catcher, pitcher) => Math.max(0.08, Math.min(0.95, 0.52 + (st(runner, 'speed') - 75) * 0.02 - (st(catcher, 'defense', 85) - 85) * 0.025 - (st(pitcher, 'stability', 81) - 81) * 0.008));
function alertsOf(home, away) {
  const msp = home.pitchers[0], osp = away.pitchers[0];
  const myCat = home.catcher || home.batters.find((b) => b.position === 'C'), opCat = away.catcher || away.batters.find((b) => b.position === 'C');
  const slug = [...away.batters].sort((a, b) => st(b, 'power') - st(a, 'power')).slice(0, 3);
  const oppFast = away.batters.filter((b) => st(b, 'speed') >= 85).sort((a, b) => st(b, 'speed') - st(a, 'speed'));
  const myFast = home.batters.filter((b) => st(b, 'speed') >= 80).sort((a, b) => st(b, 'speed') - st(a, 'speed'));
  return [
    { ko: '장타 위험', kind: 'risk', at: pos(mean(slug, (p) => st(p, 'power')) - st(msp, 'stuff', 80), -5, 25) },
    { ko: '도루 위험', kind: 'risk', at: oppFast[0] ? pos(stealP(oppFast[0], myCat, msp) * 100, 40, 100) : 4 },
    { ko: '세 바퀴째 위험', kind: 'risk', at: pos(mean(away.batters, bat) - (arm(msp) - 5), -12, 10) },
    { ko: '도루 기회', kind: 'chance', at: myFast[0] ? pos(stealP(myFast[0], opCat, osp) * 100, 40, 100) : 4 },
  ];
}
const LV = { risk: ['낮음', '보통', '높음'], chance: ['작음', '보통', '큼'] };
const lvOf = (a) => (a.at >= 66 ? 2 : a.at >= 40 ? 1 : 0);
const alertC = (a) => (a.kind === 'chance' ? [DIM, '#a7f3d0', MY][lvOf(a)] : [DIM, GOLD, RED][lvOf(a)]);
function AlertGauge({ a }) {
  return (
    <div className="flex flex-col gap-1.5" style={{ opacity: lvOf(a) === 2 ? 1 : 0.5 }}>
      <span className="flex items-baseline justify-between"><b className="text-t4 text-white">{a.ko}</b><b className="text-t4" style={{ color: alertC(a) }}>{LV[a.kind][lvOf(a)]}</b></span>
      <span className="relative block h-2 rounded-full" style={{ background: a.kind === 'chance' ? `linear-gradient(90deg, rgba(255,255,255,.08), ${MY}88)` : `linear-gradient(90deg, rgba(255,255,255,.08), ${GOLD}88 55%, ${RED})` }}>
        <i className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${a.at}%`, boxShadow: '0 0 0 2px #0b0f1a' }} />
      </span>
    </div>
  );
}
function StepSit({ home, away, c }) {
  const T = traitsOf(away);
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-1.5">{[T.stuff, T.bb, T.duel, T.hold, T.inn, T.pow, T.con, T.spd, T.cat, T.pen].map((t) => <Gauge key={t.who + t.l} t={t} c={c} dim />)}</div>
      <Rule />
      <div className="flex flex-col gap-2.5">{alertsOf(home, away).map((a) => <AlertGauge key={a.ko} a={a} />)}</div>
    </div>
  );
}

export default function OppPanel({ opponent, engine, step, pv = null, busy = false }) {
  const c = opponent.color || '#60a5fa';
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3.5 overflow-hidden p-5" style={{ ...cut(20), '--a': c }}>
      <p className="mt-lab" style={{ '--a': c }}>오늘 상대</p>
      <Head opponent={opponent} home={engine.home} away={engine.away} c={c} />
      <Rule />
      {step === 1 && <StepLineup away={engine.away} pv={pv} />}
      {step === 2 && <StepFlow away={engine.away} pv={pv} busy={busy} c={c} />}
      {step === 3 && <StepSit home={engine.home} away={engine.away} c={c} />}
    </aside>
  );
}
