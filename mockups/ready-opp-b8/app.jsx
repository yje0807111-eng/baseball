/* 정비 화면 왼쪽 · 다음 상대 — 7안(스카우팅 태그)에서 아래 선수 구역만 8가지로
   위(엠블럼 · 이름 · 종합 · 위험/약점 태그)는 모두 같고, 아래 선수 목록만 다르다 */
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
const PITS = ROS.filter((p) => p.type === 'pitcher');
const ACE = PITS.sort(byOvr)[0];
const LINEUP = [...BATS].sort(byOvr).slice(0, 9);
const REST = [...BATS].sort(byOvr).slice(9, 13);

/* 태그는 상대 능력치에서 뽑는다 */
const TAGS = (() => {
  const t = [];
  const push = (on, threat, label, c) => t.push({ on, threat, label, c });
  push(avg(BATS, (p) => p.stats.power) >= 72, true, '장타 위험', '#f87171');
  push(avg(BATS, (p) => p.stats.speed) >= 70, true, '발 빠른 타선', '#fbbf24');
  push(avg(BATS, (p) => p.stats.contact) >= 74, true, '컨택 강함', '#34d399');
  push(avg(BATS, (p) => p.stats.defense) >= 72, true, '수비 탄탄', A.def);
  push(BATS.filter((p) => p.hand === 'L').length / Math.max(1, BATS.length) >= 0.35, true, '좌타 다수', '#a78bfa');
  push(avg(PITS.filter((p) => p.position === 'RP'), (p) => p.overall) < 74, false, '불펜 얇음', '#34d399');
  push(avg(PITS.filter((p) => p.position === 'SP'), (p) => p.stats.stamina) < 70, false, '선발 이닝 짧음', '#34d399');
  push(avg(BATS, (p) => p.stats.power) < 66, false, '한 방 없음', '#34d399');
  return t.filter((x) => x.on);
})();

const faceOf = (p, w, h, c = 5) => (
  <span className="mt-cut block shrink-0 bg-[#0b1220] bg-cover" style={{ ...cut(c), width: w, height: h, backgroundPosition: 'center 12%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
);
const Pos = ({ p }) => <span className="shrink-0 px-[5px] font-display text-[11px] font-extrabold leading-[16px] text-[#05080f]" style={{ background: posColor(p) }}>{p.position}</span>;
const Ovr = ({ p, size = 15, color = C }) => <b className="font-display" style={{ fontSize: size, color }}>{p.overall}</b>;

/* 위 절반 — 여덟 안 공통 */
const Head = () => (
  <>
    <p className="mt-lab" style={{ '--a': C }}>Scouting</p>
    <div className="flex items-center gap-2.5">
      <span className="block h-11 w-11 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(ui/clubs/${OPP_CLUB.key}.webp)` }} />
      <span className="min-w-0">
        <b className="block truncate text-[17px] font-black text-white">{OPP.name}</b>
        <small className="font-display text-[10.5px] tracking-[0.2em] text-gray-500">1차전 · 홈</small>
      </span>
      <b className="ml-auto font-display text-[26px] font-extrabold leading-none" style={{ color: C }}>{O.ovr}</b>
    </div>
    {[['THREAT', true, '#f87171'], ['WEAK', false, A.bat]].map(([en, threat, c]) => (
      <div key={en}>
        <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: c }}>{en}</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {TAGS.filter((x) => x.threat === threat).map((x) => (
            <span key={x.label} className="mt-cut px-2 py-[3px] text-[11.5px] font-bold" style={{ ...cut(5), color: x.c, background: `color-mix(in srgb,${x.c} 16%,transparent)`, boxShadow: `inset 0 0 0 1px ${x.c}55` }}>{x.label}</span>
          ))}
          {!TAGS.some((x) => x.threat === threat) && <span className="text-[12px] text-gray-600">-</span>}
        </div>
      </div>
    ))}
  </>
);

const pane = (children) => (
  <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2.5 p-5" style={{ ...cut(20), '--a': C }}>
    <Head />
    <div className="my-0.5 h-px shrink-0" style={{ background: `linear-gradient(90deg,${C}66,transparent)` }} />
    {children}
  </aside>
);
const grp = (en, ko, c = '#9ca3af') => (
  <div className="flex shrink-0 items-center gap-2 pb-1">
    <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: c }}>{en}</span>
    <b className="text-[12px] text-gray-300">{ko}</b>
    <span className="h-px flex-1 bg-white/10" />
  </div>
);

/* ── A. 타순 한 줄 (얼굴 없이 꽉) ── */
const A1 = () => pane(
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      {LINEUP.map((p, i) => (
        <div key={p.id} className="flex flex-1 items-center gap-2 px-2" style={{ background: 'rgba(255,255,255,.035)' }}>
          <b className="w-3 text-center font-display text-[12px] text-gray-500">{i + 1}</b>
          <Pos p={p} /><b className="min-w-0 flex-1 truncate text-[13px] text-white">{p.name}</b><Ovr p={p} />
        </div>
      ))}
      {grp('PITCHER', '선발', A.pit)}
      <div className="flex flex-1 items-center gap-2 px-2" style={{ background: `${A.pit}1f` }}>
        <Pos p={ACE} /><b className="min-w-0 flex-1 truncate text-[13px] text-white">{ACE.name}</b><Ovr p={ACE} color={A.pit} />
      </div>
    </div>
  </div>,
);

/* ── B. 얼굴 붙은 목록 ── */
const A2 = () => pane(
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      {[...LINEUP.map((p, i) => [i + 1, p]), ['SP', ACE]].map(([n, p]) => (
        <div key={p.id} className="mt-cut flex flex-1 items-center gap-2 px-2" style={{ ...cut(6), background: n === 'SP' ? `${A.pit}1f` : 'rgba(255,255,255,.035)' }}>
          <b className="w-4 text-center font-display text-[11px] text-gray-500">{n}</b>
          {faceOf(p, 24, 28, 4)}
          <b className="min-w-0 flex-1 truncate text-[13px] text-white">{p.name}</b>
          <Pos p={p} /><Ovr p={p} color={n === 'SP' ? A.pit : C} />
        </div>
      ))}
    </div>
  </div>,
);

/* ── C. 얼굴 격자 3열 ── */
const A3 = () => pane(
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5">
      {LINEUP.map((p, i) => (
        <div key={p.id} className="mt-cut relative min-h-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ ...cut(7), backgroundPosition: 'center 10%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }}>
          <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.1),rgba(5,8,15,0) 40%,#05080f)' }} />
          <b className="absolute left-1 top-0.5 font-display text-[11px] text-white/70">{i + 1}</b>
          <b className="absolute right-1 top-0.5 font-display text-[13px]" style={{ color: C }}>{p.overall}</b>
          <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[12px] font-extrabold text-white">{p.name}</b>
        </div>
      ))}
    </div>
    <div className="mt-1.5 flex shrink-0 items-center gap-2 px-2 py-1.5" style={{ background: `${A.pit}1f` }}>
      {faceOf(ACE, 24, 28, 4)}<span className="font-display text-[10px] tracking-[0.2em]" style={{ color: A.pit }}>선발</span>
      <b className="min-w-0 flex-1 truncate text-[13px] text-white">{ACE.name}</b><Ovr p={ACE} color={A.pit} />
    </div>
  </div>,
);

/* ── D. 주력 셋은 크게, 나머지는 줄로 ── */
const A4 = () => pane(
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('KEY', '주의 선수 3', '#fbbf24')}
    <div className="grid shrink-0 grid-cols-3 gap-1.5">
      {[ACE, ...LINEUP.slice(0, 2)].map((p) => (
        <div key={p.id} className="mt-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ height: 104, ...cut(8), backgroundPosition: 'center 8%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }}>
          <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.1),rgba(5,8,15,0) 35%,#05080f)' }} />
          <b className="absolute left-1 top-0.5 font-display text-[15px]" style={{ color: C }}>{p.overall}</b>
          <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[12px] font-extrabold text-white">{p.name}</b>
        </div>
      ))}
    </div>
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      {LINEUP.map((p, i) => (
        <div key={p.id} className="flex flex-1 items-center gap-2 px-2" style={{ background: 'rgba(255,255,255,.035)' }}>
          <b className="w-3 text-center font-display text-[12px] text-gray-500">{i + 1}</b>
          <Pos p={p} /><b className="min-w-0 flex-1 truncate text-[13px] text-white">{p.name}</b><Ovr p={p} />
        </div>
      ))}
    </div>
  </div>,
);

/* ── E. 능력치 막대까지 붙은 목록 ── */
const A5 = () => pane(
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      {LINEUP.map((p, i) => (
        <div key={p.id} className="mt-cut flex flex-1 items-center gap-2 px-2" style={{ ...cut(6), background: 'rgba(255,255,255,.035)' }}>
          <b className="w-3 text-center font-display text-[11px] text-gray-500">{i + 1}</b>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[12.5px] text-white">{p.name}</b>
            <span className="mt-0.5 flex gap-[3px]">
              {[['파워', p.stats.power, '#f87171'], ['컨택', p.stats.contact, A.bat], ['주루', p.stats.speed, '#fbbf24']].map(([l, v, c]) => (
                <span key={l} className="relative h-1 flex-1 bg-white/10"><i className="absolute inset-y-0 left-0" style={{ width: `${v}%`, background: c }} /></span>
              ))}
            </span>
          </span>
          <Pos p={p} /><Ovr p={p} size={14} />
        </div>
      ))}
    </div>
  </div>,
);

/* ── F. 수비 자리 미니 구장 + 목록 ── */
const XY = { 1: [50, 12], 2: [20, 26], 3: [80, 26], 4: [34, 46], 5: [66, 46], 6: [20, 66], 7: [80, 66], 8: [50, 86], 9: [88, 86] };
const A6 = () => pane(
  <div className="flex min-h-0 flex-1 flex-col gap-2">
    {grp('DEFENSE', '상대 수비', A.def)}
    <div className="mt-cut relative shrink-0 overflow-hidden bg-[#07130c] bg-cover" style={{ height: 190, ...cut(12), backgroundImage: 'url(ui/field.webp)', backgroundPosition: 'center 58%' }}>
      <span className="absolute inset-0" style={{ background: 'radial-gradient(75% 75% at 50% 55%,rgba(5,8,15,.1),rgba(5,8,15,.75))' }} />
      {LINEUP.map((p, i) => (
        <span key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-1 text-[10px] font-bold text-white"
          style={{ left: `${XY[i + 1][0]}%`, top: `${XY[i + 1][1]}%`, background: 'rgba(5,8,15,.72)', boxShadow: `inset 0 -2px 0 ${posColor(p)}` }}>
          {p.name}<b className="ml-1 font-display" style={{ color: C }}>{p.overall}</b>
        </span>
      ))}
    </div>
    {grp('LINEUP', '타순', A.bat)}
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      {LINEUP.slice(0, 5).map((p, i) => (
        <div key={p.id} className="flex flex-1 items-center gap-2 px-2" style={{ background: 'rgba(255,255,255,.035)' }}>
          <b className="w-3 text-center font-display text-[12px] text-gray-500">{i + 1}</b>
          <Pos p={p} /><b className="min-w-0 flex-1 truncate text-[13px] text-white">{p.name}</b><Ovr p={p} />
        </div>
      ))}
      <div className="flex flex-1 items-center gap-2 px-2" style={{ background: `${A.pit}1f` }}>
        <Pos p={ACE} /><b className="min-w-0 flex-1 truncate text-[13px] text-white">{ACE.name}</b><Ovr p={ACE} color={A.pit} />
      </div>
    </div>
  </div>,
);

/* ── G. 태그별로 묶은 선수 ── */
const A7 = () => {
  const groups = [
    ['장타', '#f87171', [...BATS].sort((a, b) => b.stats.power - a.stats.power).slice(0, 3)],
    ['주루', '#fbbf24', [...BATS].sort((a, b) => b.stats.speed - a.stats.speed).slice(0, 3)],
    ['마운드', A.pit, [...PITS].sort(byOvr).slice(0, 3)],
  ];
  return pane(
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {groups.map(([label, c, list]) => (
        <div key={label} className="flex min-h-0 flex-1 flex-col">
          {grp(label.toUpperCase(), label, c)}
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            {list.map((p) => (
              <div key={p.id} className="mt-cut flex flex-1 items-center gap-2 px-2" style={{ ...cut(6), background: `color-mix(in srgb,${c} 10%,rgba(255,255,255,.03))` }}>
                {faceOf(p, 22, 26, 4)}
                <b className="min-w-0 flex-1 truncate text-[13px] text-white">{p.name}</b>
                <Pos p={p} /><Ovr p={p} size={14} color={c} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>,
  );
};

/* ── H. 타순 + 예비까지 두 열 ── */
const A8 = () => pane(
  <div className="flex min-h-0 flex-1 flex-col">
    {grp('LINEUP', `타순 ${LINEUP.length}`, A.bat)}
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-2 gap-y-1">
      {LINEUP.map((p, i) => (
        <div key={p.id} className="flex items-center gap-1.5 border-b border-white/[0.07] px-1">
          <b className="w-3 text-center font-display text-[11px] text-gray-500">{i + 1}</b>
          <b className="min-w-0 flex-1 truncate text-[12.5px] text-white">{p.name}</b>
          <Ovr p={p} size={13} />
        </div>
      ))}
    </div>
    {grp('BENCH', `예비 ${REST.length}`, '#94a3b8')}
    <div className="grid shrink-0 grid-cols-2 gap-x-2 gap-y-1">
      {REST.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5 px-1">
          <Pos p={p} /><b className="min-w-0 flex-1 truncate text-[12px] text-gray-300">{p.name}</b>
          <b className="font-display text-[12px] text-gray-400">{p.overall}</b>
        </div>
      ))}
    </div>
    {grp('PITCHER', '마운드', A.pit)}
    <div className="flex shrink-0 flex-col gap-1">
      {PITS.sort(byOvr).slice(0, 3).map((p, i) => (
        <div key={p.id} className="mt-cut flex items-center gap-2 px-2 py-1" style={{ ...cut(6), background: i === 0 ? `${A.pit}1f` : 'rgba(255,255,255,.035)' }}>
          {faceOf(p, 22, 26, 4)}
          <span className="font-display text-[10px] tracking-[0.15em]" style={{ color: A.pit }}>{i === 0 ? '선발' : '불펜'}</span>
          <b className="min-w-0 flex-1 truncate text-[12.5px] text-white">{p.name}</b><Ovr p={p} size={14} color={A.pit} />
        </div>
      ))}
    </div>
  </div>,
);

const V = [
  ['1', '타순 한 줄', A1], ['2', '얼굴 붙은 목록', A2], ['3', '얼굴 격자 3열', A3], ['4', '주의 선수 + 타순', A4],
  ['5', '능력치 막대 목록', A5], ['6', '미니 구장 + 타순', A6], ['7', '태그별 묶음', A7], ['8', '타순 · 예비 · 마운드', A8],
];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  if (pick) return <Screen left={() => pick[2]()} />;
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <div className="mb-3 flex items-center gap-3 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">다음 상대 · 스카우팅 + 선수 구역 8안</b>
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
