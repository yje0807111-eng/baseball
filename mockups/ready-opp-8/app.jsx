/* 정비 화면 왼쪽 칸 = 바로 다음 상대 — 8안
   가운데 MY SQUAD 판과 오른쪽 TUNE UP 은 그대로 두고 왼쪽 판만 바꾼다 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Screen, NextOpponent, partsOf, OPP, OPP_CLUB, A, cut } from '../ready-squad/screen.jsx';
import { posColor } from '/src/myteam/teamColor.js';

const ROS = OPP.roster;
const O = partsOf(ROS);
const byOvr = (a, b) => b.overall - a.overall;
const ACE = ROS.filter((p) => p.type === 'pitcher').sort(byOvr)[0];
const SLUG = ROS.filter((p) => p.type === 'batter').sort((a, b) => b.stats.power - a.stats.power)[0];
const SPEED = ROS.filter((p) => p.type === 'batter').sort((a, b) => b.stats.speed - a.stats.speed)[0];
const BATS = ROS.filter((p) => p.type === 'batter').sort(byOvr).slice(0, 9);
const C = OPP_CLUB.color;

const pane = (children, a = C) => (
  <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3 p-5" style={{ ...cut(20), '--a': a }}>{children}</aside>
);
const lab = (t, a = C) => <p className="mt-lab" style={{ '--a': a }}>{t}</p>;
const emblem = (size = 52) => <span className="block shrink-0 bg-contain bg-center bg-no-repeat" style={{ width: size, height: size, backgroundImage: `url(ui/clubs/${OPP_CLUB.key}.webp)` }} />;
const faceOf = (p, w = 32, h = 38) => (
  <span className="mt-cut block shrink-0 bg-[#0b1220] bg-cover" style={{ ...cut(5), width: w, height: h, backgroundPosition: 'center 12%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
);
const PARTS = [['타선', 'bat', A.bat], ['수비', 'def', A.def], ['선발', 'sp', '#7dd3fc'], ['불펜', 'rp', A.pit]];
const pct = (v) => `${Math.max(0, Math.min(100, ((v - 40) / 55) * 100))}%`;

/* ── 1. 기본: 막대 + 간판 둘 + 예상 승률 (지금 안) ── */
const V1 = (mine) => <NextOpponent mine={mine} />;

/* ── 2. 맞대결 표: 내 팀과 상대를 줄마다 나란히 ── */
const V2 = (mine) => pane(<>
  {lab('Head to Head')}
  <div className="flex items-center gap-2">
    {emblem(44)}
    <b className="min-w-0 truncate text-[17px] font-black text-white">{OPP.name}</b>
    <b className="ml-auto font-display text-[26px]" style={{ color: C }}>{O.ovr}</b>
  </div>
  <div className="grid gap-1.5 text-center font-display text-[10px] tracking-[0.2em] text-gray-500" style={{ gridTemplateColumns: '1fr 44px 1fr' }}>
    <span>MINE</span><span /><span style={{ color: C }}>OPP</span>
  </div>
  {PARTS.map(([label, key, c]) => {
    const me = mine[key], them = O[key], win = me >= them;
    return (
      <div key={key} className="grid items-center gap-1.5" style={{ gridTemplateColumns: '1fr 44px 1fr' }}>
        <span className="flex items-center gap-2">
          <b className="w-8 text-right font-display text-[17px]" style={{ color: win ? A.bat : '#94a3b8' }}>{me}</b>
          <span className="relative h-2 flex-1 bg-white/[0.07]"><i className="absolute inset-y-0 right-0" style={{ width: pct(me), background: win ? c : '#475569' }} /></span>
        </span>
        <span className="text-center text-[12px] text-gray-400">{label}</span>
        <span className="flex items-center gap-2">
          <span className="relative h-2 flex-1 bg-white/[0.07]"><i className="absolute inset-y-0 left-0" style={{ width: pct(them), background: win ? '#475569' : c }} /></span>
          <b className="w-8 font-display text-[17px]" style={{ color: win ? '#94a3b8' : C }}>{them}</b>
        </span>
      </div>
    );
  })}
  <div className="mt-auto grid grid-cols-2 gap-2">
    {[['예상 승률', '54%', A.bat], ['상대 전적', '1승 1패', '#e5e7eb']].map(([k, v, c]) => (
      <div key={k} className="mt-cut px-3 py-2" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
        <span className="block text-[11px] text-gray-500">{k}</span><b className="font-display text-[19px]" style={{ color: c }}>{v}</b>
      </div>
    ))}
  </div>
</>);

/* ── 3. 상대 에이스 카드: 사진을 크게 ── */
const V3 = () => pane(<>
  {lab('Next Opponent')}
  <div className="mt-cut relative shrink-0 overflow-hidden" style={{ height: 250, ...cut(14), background: '#0b1220' }}>
    <span className="absolute inset-0 bg-cover" style={{ backgroundPosition: 'center 12%', backgroundImage: `url(cards/${encodeURIComponent(ACE.id)}.webp), url(profiles/${encodeURIComponent(ACE.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.2),rgba(5,8,15,0) 35%,#05080f)' }} />
    <span className="absolute left-3 top-3 flex items-center gap-2">{emblem(30)}<b className="text-[13px] font-extrabold text-white">{OPP.name}</b></span>
    <span className="absolute inset-x-3 bottom-2.5">
      <span className="font-display text-[11px] tracking-[0.2em]" style={{ color: C }}>오늘 상대 선발</span>
      <b className="block text-[24px] font-black text-white">{ACE.name}</b>
    </span>
    <b className="absolute right-3 top-2 font-display text-[34px] font-extrabold" style={{ color: C }}>{ACE.overall}</b>
  </div>
  <div className="flex flex-col gap-1.5">
    {PARTS.map(([label, key, c]) => (
      <div key={key} className="flex items-center gap-2 text-[12.5px] text-gray-400">
        <span className="w-8">{label}</span>
        <span className="relative h-2 flex-1 bg-white/[0.07]"><i className="absolute inset-y-0 left-0" style={{ width: pct(O[key]), background: c }} /></span>
        <b className="w-7 text-right font-display text-[14px] text-white">{O[key]}</b>
      </div>
    ))}
  </div>
  <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3">
    <span className="text-[12.5px] text-gray-400">팀 종합</span>
    <b className="font-display text-[22px]" style={{ color: C }}>{O.ovr}<small className="text-gray-500">/{'{'}내{'}'}</small></b>
  </div>
</>);

/* ── 4. 상대 라인업 미리보기 ── */
const V4 = () => pane(<>
  {lab('Scouting')}
  <div className="flex items-center gap-2">{emblem(40)}<b className="min-w-0 truncate text-[17px] font-black text-white">{OPP.name}</b><b className="ml-auto font-display text-[24px]" style={{ color: C }}>{O.ovr}</b></div>
  <div className="mt-cut flex items-center gap-2.5 px-2.5 py-1.5" style={{ ...cut(8), background: `linear-gradient(90deg,${A.pit}22,rgba(6,10,19,.4))`, boxShadow: `inset 0 0 0 1px ${A.pit}55` }}>
    {faceOf(ACE, 30, 36)}
    <span className="min-w-0"><span className="font-display text-[10px] tracking-[0.2em]" style={{ color: A.pit }}>선발</span><b className="block truncate text-[14px] font-extrabold text-white">{ACE.name}</b></span>
    <b className="ml-auto font-display text-[18px] text-white">{ACE.overall}</b>
  </div>
  <div className="flex min-h-0 flex-1 flex-col gap-1">
    {BATS.map((p, i) => (
      <div key={p.id} className="flex flex-1 items-center gap-2 px-2" style={{ background: 'rgba(255,255,255,.035)' }}>
        <b className="w-3 text-center font-display text-[12px] text-gray-500">{i + 1}</b>
        <span className="px-[5px] font-display text-[11px] font-extrabold leading-[16px] text-[#05080f]" style={{ background: posColor(p) }}>{p.position}</span>
        <b className="min-w-0 flex-1 truncate text-[13px] text-white">{p.name}</b>
        <b className="font-display text-[14px]" style={{ color: C }}>{p.overall}</b>
      </div>
    ))}
  </div>
</>);

/* ── 5. 저울: 가운데 선을 기준으로 좌우로 ── */
const V5 = (mine) => pane(<>
  {lab('Match Up')}
  <div className="flex items-center gap-2">{emblem(40)}<b className="min-w-0 truncate text-[17px] font-black text-white">{OPP.name}</b><b className="ml-auto font-display text-[24px]" style={{ color: C }}>{O.ovr}</b></div>
  <div className="flex flex-col gap-3">
    {PARTS.map(([label, key]) => {
      const d = mine[key] - O[key];
      const w = Math.min(50, Math.abs(d) * 4);
      return (
        <div key={key}>
          <div className="flex items-baseline justify-between text-[12.5px] text-gray-400">
            <span>{label}</span>
            <b className="font-display text-[15px]" style={{ color: d >= 0 ? A.bat : '#f87171' }}>{d >= 0 ? '+' : ''}{d}</b>
          </div>
          <div className="relative mt-1 h-3 bg-white/[0.06]">
            <span className="absolute inset-y-[-3px] left-1/2 w-px bg-white/40" />
            <i className="absolute inset-y-0" style={{ left: d >= 0 ? '50%' : `${50 - w}%`, width: `${w}%`, background: d >= 0 ? A.bat : '#f87171', boxShadow: `0 0 10px ${d >= 0 ? A.bat : '#f87171'}` }} />
          </div>
        </div>
      );
    })}
  </div>
  <div className="mt-auto flex flex-col gap-1.5">
    {[['주의', SLUG, '장타'], ['주의', SPEED, '주루']].map(([k, p, tag]) => (
      <div key={p.id} className="mt-cut flex items-center gap-2.5 px-2.5 py-1.5" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
        {faceOf(p, 30, 36)}
        <span className="min-w-0"><span className="font-display text-[10px] tracking-[0.2em] text-amber-300">{k} · {tag}</span><b className="block truncate text-[14px] font-extrabold text-white">{p.name}</b></span>
        <b className="ml-auto font-display text-[18px]" style={{ color: C }}>{p.overall}</b>
      </div>
    ))}
  </div>
</>);

/* ── 6. 전광판: 큰 숫자와 최근 전적 ── */
const V6 = (mine) => pane(<>
  {lab('Next Game')}
  <div className="mt-cut flex flex-col items-center gap-1 py-4" style={{ ...cut(14), background: `linear-gradient(180deg,${C}22,rgba(6,10,19,.5))` }}>
    {emblem(64)}
    <b className="text-[19px] font-black text-white">{OPP.name}</b>
    <b className="font-display text-[46px] font-extrabold leading-none" style={{ color: C, textShadow: `0 0 24px ${C}66` }}>{O.ovr}</b>
    <span className="font-display text-[11px] tracking-[0.24em] text-gray-500">TEAM OVR</span>
  </div>
  <div className="grid grid-cols-2 gap-2">
    {[['내 팀', mine.ovr, A.bat], ['차이', `${mine.ovr - O.ovr >= 0 ? '+' : ''}${mine.ovr - O.ovr}`, mine.ovr >= O.ovr ? A.bat : '#f87171'], ['예상 승률', '54%', '#fde047'], ['상대 전적', '1승 1패', '#e5e7eb']].map(([k, v, c]) => (
      <div key={k} className="mt-cut px-3 py-2" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
        <span className="block text-[11px] text-gray-500">{k}</span><b className="font-display text-[20px]" style={{ color: c }}>{v}</b>
      </div>
    ))}
  </div>
  <div>
    <span className="font-display text-[10px] tracking-[0.2em] text-gray-500">최근 5경기</span>
    <div className="mt-1.5 flex gap-1.5">
      {['승', '패', '승', '승', '패'].map((r, i) => (
        <span key={i} className="grid h-7 flex-1 place-items-center font-display text-[13px] font-extrabold"
          style={{ color: r === '승' ? '#05080f' : '#fca5a5', background: r === '승' ? A.bat : 'rgba(248,113,113,.15)' }}>{r}</span>
      ))}
    </div>
  </div>
  <div className="mt-auto flex flex-col gap-1.5">
    {PARTS.map(([label, key, c]) => (
      <div key={key} className="flex items-center gap-2 text-[12px] text-gray-400">
        <span className="w-8">{label}</span>
        <span className="relative h-1.5 flex-1 bg-white/[0.07]"><i className="absolute inset-y-0 left-0" style={{ width: pct(O[key]), background: c }} /></span>
        <b className="w-6 text-right font-display text-[13px] text-white">{O[key]}</b>
      </div>
    ))}
  </div>
</>);

/* ── 7. 스카우팅 리포트: 강점 · 약점 태그 ── */
const V7 = () => {
  const tags = [
    { t: '장타 위험', on: true, c: '#f87171' }, { t: '발 빠른 타선', on: true, c: '#fbbf24' },
    { t: '불펜 얇음', on: false, c: A.bat }, { t: '수비 탄탄', on: true, c: A.def },
    { t: '좌타 다수', on: true, c: '#a78bfa' }, { t: '선발 이닝 짧음', on: false, c: A.bat },
  ];
  return pane(<>
    {lab('Report')}
    <div className="flex items-center gap-2">{emblem(40)}<b className="min-w-0 truncate text-[17px] font-black text-white">{OPP.name}</b><b className="ml-auto font-display text-[24px]" style={{ color: C }}>{O.ovr}</b></div>
    <div>
      <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: '#f87171' }}>THREAT</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.filter((x) => x.on).map((x) => (
          <span key={x.t} className="mt-cut px-2 py-1 text-[12px] font-bold" style={{ ...cut(5), color: x.c, background: `color-mix(in srgb,${x.c} 16%,transparent)`, boxShadow: `inset 0 0 0 1px ${x.c}55` }}>{x.t}</span>
        ))}
      </div>
    </div>
    <div>
      <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: A.bat }}>WEAK</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.filter((x) => !x.on).map((x) => (
          <span key={x.t} className="mt-cut px-2 py-1 text-[12px] font-bold" style={{ ...cut(5), color: x.c, background: `color-mix(in srgb,${x.c} 16%,transparent)`, boxShadow: `inset 0 0 0 1px ${x.c}55` }}>{x.t}</span>
        ))}
      </div>
    </div>
    <div className="mt-1 flex flex-col gap-1.5">
      {[ACE, SLUG, SPEED].map((p) => (
        <div key={p.id} className="mt-cut flex items-center gap-2.5 px-2.5 py-1.5" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
          {faceOf(p, 30, 36)}
          <b className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-white">{p.name}</b>
          <span className="px-[5px] font-display text-[11px] font-extrabold leading-[16px] text-[#05080f]" style={{ background: posColor(p) }}>{p.position}</span>
          <b className="font-display text-[17px]" style={{ color: C }}>{p.overall}</b>
        </div>
      ))}
    </div>
    <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3">
      <span className="text-[12.5px] text-gray-400">예상 승률</span><b className="font-display text-[22px]" style={{ color: A.bat }}>54%</b>
    </div>
  </>);
};

/* ── 8. 대진표: 이번 시리즈 어디까지 왔는지 ── */
const V8 = (mine) => pane(<>
  {lab('Bracket')}
  <div className="mt-cut flex items-center gap-2.5 p-2.5" style={{ ...cut(10), background: `linear-gradient(90deg,${C}22,rgba(6,10,19,.4))` }}>
    {emblem(42)}
    <span className="min-w-0"><span className="font-display text-[10px] tracking-[0.2em] text-gray-400">8강 · 2차전</span><b className="block truncate text-[17px] font-black text-white">{OPP.name}</b></span>
    <b className="ml-auto font-display text-[24px]" style={{ color: C }}>{O.ovr}</b>
  </div>
  <div className="flex flex-col gap-1">
    {[['16강', '승 7 : 3', true], ['8강 1차전', '패 2 : 5', true], ['8강 2차전', '오늘', false], ['4강', '-', false]].map(([r, s, done]) => (
      <div key={r} className="flex items-center gap-2 px-2 py-1.5 text-[12.5px]" style={{ background: done ? 'rgba(255,255,255,.04)' : 'transparent', boxShadow: s === '오늘' ? `inset 0 0 0 1px ${C}` : 'none' }}>
        <span className={done ? 'text-gray-400' : 'text-white'}>{r}</span>
        <b className={`ml-auto font-display text-[13px] ${s.startsWith('승') ? 'text-emerald-400' : s.startsWith('패') ? 'text-rose-400' : 'text-gray-500'}`}>{s}</b>
      </div>
    ))}
  </div>
  <div className="mt-1 flex flex-col gap-1.5">
    {PARTS.map(([label, key, c]) => {
      const win = mine[key] >= O[key];
      return (
        <div key={key} className="flex items-center gap-2 text-[12.5px] text-gray-400">
          <span className="w-8">{label}</span>
          <span className="relative h-2 flex-1 bg-white/[0.07]">
            <i className="absolute inset-y-0 left-0" style={{ width: pct(O[key]), background: c }} />
            <i className="absolute inset-y-[-3px] w-[2px] bg-white" style={{ left: pct(mine[key]) }} />
          </span>
          <b className="w-12 text-right font-display text-[13px]" style={{ color: win ? A.bat : '#f87171' }}>{O[key]}<small className="text-gray-500">/{mine[key]}</small></b>
        </div>
      );
    })}
  </div>
  <div className="mt-auto mt-cut flex items-center justify-between px-3 py-2" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
    <span className="text-[12.5px] text-gray-400">이기면</span><b className="font-display text-[15px] text-white">4강 진출 · 800 G</b>
  </div>
</>);

const V = [
  ['1', '기본 막대 + 간판', V1], ['2', '맞대결 표', V2], ['3', '상대 선발 카드', V3], ['4', '라인업 미리보기', V4],
  ['5', '저울(차이) 막대', V5], ['6', '전광판 + 최근 전적', V6], ['7', '스카우팅 태그', V7], ['8', '대진표 · 시리즈', V8],
];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  if (pick) return <Screen left={pick[2]} />;
  const mine = { ovr: 84, bat: 85, def: 74, sp: 88, rp: 82 };
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <div className="mb-3 flex items-center gap-3 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">정비 화면 왼쪽 · 다음 상대 8안</b>
        {V.map(([id, name]) => <a key={id} className="bg-white/[0.06] px-2.5 py-1 text-gray-300 no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a>)}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {V.map(([id, name, C2]) => (
          <div key={id}>
            <h3 className="mb-1.5 text-[13px] text-white"><a className="text-inherit no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a></h3>
            <div style={{ width: 272, height: 807, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>{C2(mine)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
