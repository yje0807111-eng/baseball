/* 다음 상대 판 — 내가 고른 네 안
   기준: 272px 폭에서 (1) 오늘 누가 던지나 (2) 누구를 조심하나 (3) 타순이 어떻게 서나 를 한눈에 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Screen, partsOf, OPP, OPP_CLUB, A, cut } from '../ready-squad/screen.jsx';
import { posColor } from '/src/myteam/teamColor.js';

const ROS = OPP.roster;
const O = partsOf(ROS);
const C = OPP_CLUB.color;
const byOvr = (a, b) => b.overall - a.overall;
const avg = (xs, f) => (xs.length ? xs.reduce((s, p) => s + f(p), 0) / xs.length : 0);
const BATS = ROS.filter((p) => p.type === 'batter');
const PITS = [...ROS.filter((p) => p.type === 'pitcher')].sort(byOvr);
const ACE = PITS[0];
const LINEUP = [...BATS].sort(byOvr).slice(0, 9);
/* 조심할 선수: 장타 · 주루가 눈에 띄게 높은 타자 */
const DANGER = new Map();
[...BATS].sort((a, b) => b.stats.power - a.stats.power).slice(0, 2).forEach((p) => DANGER.set(p.id, { t: '장타', c: '#f87171' }));
[...BATS].sort((a, b) => b.stats.speed - a.stats.speed).slice(0, 1).forEach((p) => { if (!DANGER.has(p.id)) DANGER.set(p.id, { t: '주루', c: '#fbbf24' }); });

const TAGS = [
  { on: avg(BATS, (p) => p.stats.power) >= 72, threat: true, label: '장타 위험', c: '#f87171' },
  { on: avg(BATS, (p) => p.stats.speed) >= 70, threat: true, label: '발 빠른 타선', c: '#fbbf24' },
  { on: avg(BATS, (p) => p.stats.contact) >= 74, threat: true, label: '컨택 강함', c: '#34d399' },
  { on: avg(BATS, (p) => p.stats.defense) >= 72, threat: true, label: '수비 탄탄', c: A.def },
  { on: BATS.filter((p) => p.hand === 'L').length / Math.max(1, BATS.length) >= 0.35, threat: true, label: '좌타 다수', c: '#a78bfa' },
  { on: avg(PITS.filter((p) => p.position === 'RP'), (p) => p.overall) < 74, threat: false, label: '불펜 얇음', c: '#34d399' },
  { on: avg(PITS.filter((p) => p.position === 'SP'), (p) => p.stats.stamina) < 70, threat: false, label: '선발 이닝 짧음', c: '#34d399' },
  { on: avg(BATS, (p) => p.stats.power) < 66, threat: false, label: '한 방 없음', c: '#34d399' },
].filter((x) => x.on);

const faceOf = (p, w, h, c = 5) => (
  <span className="mt-cut block shrink-0 bg-[#0b1220] bg-cover" style={{ ...cut(c), width: w, height: h, backgroundPosition: 'center 12%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
);
const Pos = ({ p }) => <span className="shrink-0 px-[5px] font-display text-[11px] font-extrabold leading-[16px] text-[#05080f]" style={{ background: posColor(p) }}>{p.position}</span>;
const pane = (children, gap = 'gap-2.5') => (
  <aside className={`mt-cut mt-frame mt-glass flex min-h-0 flex-col ${gap} p-5`} style={{ ...cut(20), '--a': C }}>{children}</aside>
);
const Title = ({ sub = '1차전 · 홈', size = 44 }) => (
  <div className="flex shrink-0 items-center gap-2.5">
    <span className="block shrink-0 bg-contain bg-center bg-no-repeat" style={{ width: size, height: size, backgroundImage: `url(ui/clubs/${OPP_CLUB.key}.webp)` }} />
    <span className="min-w-0">
      <b className="block truncate text-[17px] font-black text-white">{OPP.name}</b>
      <small className="font-display text-[10.5px] tracking-[0.2em] text-gray-500">{sub}</small>
    </span>
    <b className="ml-auto font-display text-[26px] font-extrabold leading-none" style={{ color: C }}>{O.ovr}</b>
  </div>
);
const TagRow = ({ threat }) => (
  <div className="flex flex-wrap gap-1.5">
    {TAGS.filter((x) => x.threat === threat).map((x) => (
      <span key={x.label} className="mt-cut px-2 py-[3px] text-[11.5px] font-bold" style={{ ...cut(5), color: x.c, background: `color-mix(in srgb,${x.c} 16%,transparent)`, boxShadow: `inset 0 0 0 1px ${x.c}55` }}>{x.label}</span>
    ))}
    {!TAGS.some((x) => x.threat === threat) && <span className="text-[12px] text-gray-600">-</span>}
  </div>
);
const grp = (en, ko, c = '#9ca3af') => (
  <div className="flex shrink-0 items-center gap-2 pb-1">
    <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: c }}>{en}</span>
    <b className="text-[12px] text-gray-300">{ko}</b>
    <span className="h-px flex-1 bg-white/10" />
  </div>
);
const bars = () => (
  <div className="flex shrink-0 gap-1.5">
    {[['타선', O.bat, A.bat], ['수비', O.def, A.def], ['선발', O.sp, '#7dd3fc'], ['불펜', O.rp, A.pit]].map(([l, v, c]) => (
      <span key={l} className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between text-[10.5px] text-gray-500">{l}<b className="font-display text-[13px]" style={{ color: c }}>{v}</b></span>
        <span className="relative mt-0.5 block h-1.5 bg-white/[0.08]"><i className="absolute inset-y-0 left-0" style={{ width: `${Math.max(0, Math.min(100, ((v - 40) / 55) * 100))}%`, background: c }} /></span>
      </span>
    ))}
  </div>
);

/* ── R1. 오늘 선발을 맨 위 카드로, 아래 타순 아홉 ── */
const R1 = () => pane(<>
  <p className="mt-lab" style={{ '--a': C }}>Scouting</p>
  <Title />
  <div className="mt-cut relative shrink-0 overflow-hidden" style={{ height: 120, ...cut(12), background: '#0b1220' }}>
    <span className="absolute inset-0 bg-cover" style={{ backgroundPosition: '60% 12%', backgroundImage: `url(cards/${encodeURIComponent(ACE.id)}.webp), url(profiles/${encodeURIComponent(ACE.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 20%,rgba(5,8,15,.4) 60%,rgba(5,8,15,0))' }} />
    <span className="absolute inset-y-3 left-3 flex flex-col justify-center">
      <span className="font-display text-[10px] tracking-[0.22em]" style={{ color: A.pit }}>오늘 상대 선발</span>
      <b className="text-[19px] font-black leading-tight text-white">{ACE.name}</b>
      <span className="mt-0.5 flex items-baseline gap-1.5">
        <b className="font-display text-[22px]" style={{ color: C }}>{ACE.overall}</b>
        <small className="text-[11px] text-gray-400">구위 {ACE.stats.stuff} · 제구 {ACE.stats.control}</small>
      </span>
    </span>
  </div>
  <TagRow threat />
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      {LINEUP.map((p, i) => {
        const d = DANGER.get(p.id);
        return (
          <div key={p.id} className="mt-cut flex flex-1 items-center gap-2 px-2" style={{ ...cut(6), background: d ? `color-mix(in srgb,${d.c} 14%,transparent)` : 'rgba(255,255,255,.035)', boxShadow: d ? `inset 0 0 0 1px ${d.c}55` : 'none' }}>
            <b className="w-3 text-center font-display text-[11px] text-gray-500">{i + 1}</b>
            <Pos p={p} />
            <b className="min-w-0 flex-1 truncate text-[13px] text-white">{p.name}</b>
            {d && <span className="font-display text-[10px]" style={{ color: d.c }}>{d.t}</span>}
            <b className="font-display text-[14px]" style={{ color: C }}>{p.overall}</b>
          </div>
        );
      })}
    </div>
  </div>
  <div className="shrink-0"><TagRow threat={false} /></div>
</>);

/* ── R2. 사진 격자 아홉 + 위험 선수 테두리 ── */
const R2 = () => pane(<>
  <p className="mt-lab" style={{ '--a': C }}>Scouting</p>
  <Title />
  {bars()}
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5">
      {LINEUP.map((p, i) => {
        const d = DANGER.get(p.id);
        return (
          <div key={p.id} className="mt-cut relative min-h-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ ...cut(7), backgroundPosition: 'center 10%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`, boxShadow: d ? `inset 0 0 0 2px ${d.c}` : 'none' }}>
            <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.1),rgba(5,8,15,0) 40%,#05080f)' }} />
            <b className="absolute left-1 top-0.5 font-display text-[11px] text-white/70">{i + 1}</b>
            <b className="absolute right-1 top-0.5 font-display text-[13px]" style={{ color: C }}>{p.overall}</b>
            {d && <span className="absolute inset-x-0 top-[22px] text-center font-display text-[10px] font-extrabold" style={{ color: d.c }}>{d.t}</span>}
            <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[12px] font-extrabold text-white">{p.name}</b>
          </div>
        );
      })}
    </div>
  </div>
  <div className="mt-cut flex shrink-0 items-center gap-2 px-2 py-1.5" style={{ ...cut(7), background: `${A.pit}1f`, boxShadow: `inset 0 0 0 1px ${A.pit}44` }}>
    {faceOf(ACE, 26, 30, 4)}
    <span className="font-display text-[10px] tracking-[0.18em]" style={{ color: A.pit }}>선발</span>
    <b className="min-w-0 flex-1 truncate text-[13px] text-white">{ACE.name}</b>
    <b className="font-display text-[15px]" style={{ color: A.pit }}>{ACE.overall}</b>
  </div>
  <div className="shrink-0"><TagRow threat /></div>
</>);

/* ── R3. 위는 조심할 셋, 아래는 두 열 타순 ── */
const R3 = () => pane(<>
  <p className="mt-lab" style={{ '--a': C }}>Scouting</p>
  <Title />
  <div className="grid shrink-0 grid-cols-3 gap-1.5">
    {[[ACE, '선발', A.pit], ...[...DANGER.keys()].slice(0, 2).map((id) => [BATS.find((p) => p.id === id), DANGER.get(id).t, DANGER.get(id).c])].map(([p, t, c]) => (
      <div key={p.id} className="mt-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ height: 112, ...cut(8), backgroundPosition: 'center 8%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`, boxShadow: `inset 0 -2px 0 ${c}` }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.05),rgba(5,8,15,0) 35%,#05080f)' }} />
        <span className="absolute left-1 top-1 px-1 font-display text-[10px] font-extrabold text-[#05080f]" style={{ background: c }}>{t}</span>
        <b className="absolute right-1 top-0.5 font-display text-[14px]" style={{ color: C }}>{p.overall}</b>
        <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[12px] font-extrabold text-white">{p.name}</b>
      </div>
    ))}
  </div>
  {bars()}
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-2.5 gap-y-1">
      {LINEUP.map((p, i) => (
        <div key={p.id} className="flex items-center gap-1.5 border-b border-white/[0.07] px-0.5">
          <b className="w-3 text-center font-display text-[11px] text-gray-500">{i + 1}</b>
          <Pos p={p} />
          <b className="min-w-0 flex-1 truncate text-[12.5px] text-white">{p.name}</b>
          <b className="font-display text-[13px]" style={{ color: C }}>{p.overall}</b>
        </div>
      ))}
    </div>
  </div>
  <div className="shrink-0 flex flex-col gap-1.5"><TagRow threat /><TagRow threat={false} /></div>
</>);

/* ── R4. 타순에 능력치 막대까지, 태그는 맨 위 한 줄 ── */
const R4 = () => pane(<>
  <p className="mt-lab" style={{ '--a': C }}>Scouting</p>
  <Title size={40} />
  <div className="flex shrink-0 flex-wrap gap-1.5"><TagRow threat /></div>
  <div className="mt-cut flex shrink-0 items-center gap-2.5 px-2.5 py-2" style={{ ...cut(8), background: `${A.pit}1f`, boxShadow: `inset 0 0 0 1px ${A.pit}44` }}>
    {faceOf(ACE, 34, 40, 5)}
    <span className="min-w-0">
      <span className="font-display text-[10px] tracking-[0.18em]" style={{ color: A.pit }}>오늘 선발</span>
      <b className="block truncate text-[14px] font-extrabold text-white">{ACE.name}</b>
      <small className="text-[10.5px] text-gray-400">구위 {ACE.stats.stuff} · 제구 {ACE.stats.control} · 체력 {ACE.stats.stamina}</small>
    </span>
    <b className="ml-auto font-display text-[20px]" style={{ color: A.pit }}>{ACE.overall}</b>
  </div>
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      {LINEUP.map((p, i) => {
        const d = DANGER.get(p.id);
        return (
          <div key={p.id} className="mt-cut flex flex-1 items-center gap-2 px-2" style={{ ...cut(6), background: d ? `color-mix(in srgb,${d.c} 12%,transparent)` : 'rgba(255,255,255,.035)' }}>
            <b className="w-3 text-center font-display text-[11px] text-gray-500">{i + 1}</b>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[12.5px] text-white">{p.name}</b>
              <span className="mt-0.5 flex gap-[3px]">
                {[[p.stats.power, '#f87171'], [p.stats.contact, A.bat], [p.stats.speed, '#fbbf24']].map(([v, c], k) => (
                  <span key={k} className="relative h-1 flex-1 bg-white/10"><i className="absolute inset-y-0 left-0" style={{ width: `${v}%`, background: c }} /></span>
                ))}
              </span>
            </span>
            <Pos p={p} />
            <b className="font-display text-[14px]" style={{ color: C }}>{p.overall}</b>
          </div>
        );
      })}
    </div>
  </div>
  <div className="shrink-0"><TagRow threat={false} /></div>
</>);

const V = [
  ['1', '선발 카드 + 타순(위험 강조)', R1],
  ['2', '사진 격자 + 위험 테두리', R2],
  ['3', '조심할 셋 + 두 열 타순', R3],
  ['4', '선발 한 줄 + 능력치 타순', R4],
];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  if (pick) return <Screen left={() => pick[2]()} />;
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <div className="mb-3 flex items-center gap-3 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">다음 상대 · 추천 4안</b>
        {V.map(([id, name]) => <a key={id} className="bg-white/[0.06] px-2.5 py-1 text-gray-300 no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a>)}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {V.map(([id, name, Comp]) => (
          <div key={id}>
            <h3 className="mb-1.5 text-[13px] text-white"><a className="text-inherit no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a></h3>
            <div style={{ width: 272, height: 807, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>{Comp()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
