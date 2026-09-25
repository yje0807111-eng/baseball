/* 토너먼트 · 시작 전 오른쪽 판 4안 (384 × 800) — 상대가 아직 없을 때 무엇을 보여 줄까 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { AI_SERIES, seriesName, seriesTeam } from '/src/myteam/aiTeam.js';

const cut = (c) => ({ '--c': `${c}px` });
const A = '#fbbf24', G = '#10b981';
const SIZE = 16;
const FINISH = [['16강', 160], ['8강', 280], ['4강', 400], ['준우승', 640], ['우승', 960]];
const MY = { name: '나의 드림팀', ovr: 77 };

const avgOf = (xs, f) => (xs.length ? Math.round(xs.reduce((n, p) => n + f(p), 0) / xs.length) : 0);
const POOL = AI_SERIES.map((s) => ({ id: s.id, name: seriesName(s), ovr: avgOf(s.players, (p) => p.overall) })).sort((a, b) => b.ovr - a.ovr);
const RANK = POOL.filter((t) => t.ovr > MY.ovr).length + 1;
const TOP = POOL.slice(0, 5);
const ACE_OF = (id) => { const t = seriesTeam(AI_SERIES.find((s) => s.id === id), () => 0.4); return [...t.roster].sort((a, b) => b.overall - a.overall)[0]; };

const FORMATS = [['단판'], ['16강', true], ['32강'], ['64강']];
const Picker = () => (
  <div className="grid grid-cols-4 gap-1.5">
    {FORMATS.map(([t, on]) => (
      <span key={t} className={`ui-cut py-2 text-center font-display text-lg font-extrabold ${on ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400'}`}
        style={{ ...cut(7), background: on ? A : undefined }}>{t}</span>
    ))}
  </div>
);
const Head = () => (
  <>
    <p className="ui-lab font-display" style={{ '--a': A }}>Tournament · {SIZE}</p>
    <h2 className="-mt-2 text-3xl font-black text-white">일반 대결</h2>
    <Picker />
  </>
);
const startBtn = () => (
  <div className="mt-auto">
    <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ ...cut(12), '--a': A }}>{SIZE}강 시작 ▶</button>
  </div>
);
const pane = (children) => <aside className="ui-cut ui-frame ui-glass flex h-full flex-col gap-3 p-6" style={{ ...cut(20), '--a': A }}>{children}</aside>;
const grp = (en, ko, c = '#9ca3af') => (
  <div className="flex shrink-0 items-center gap-2">
    <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: c }}>{en}</span>
    <b className="text-[12px] text-gray-300">{ko}</b>
    <span className="h-px flex-1 bg-white/10" />
  </div>
);
const summary = () => (
  <div className="grid shrink-0 grid-cols-3 gap-1.5">
    {[['참가', `${SIZE}팀`], ['경기', '최대 4'], ['우승', '960 G']].map(([k, v]) => (
      <div key={k} className="ui-cut px-3 py-1.5" style={{ ...cut(7), background: 'rgba(255,255,255,.045)' }}>
        <div className="text-[10px] text-gray-400">{k}</div>
        <div className="font-display text-[19px] font-bold leading-tight text-white">{v}</div>
      </div>
    ))}
  </div>
);
const myRank = () => (
  <div className="ui-cut shrink-0 px-3 py-2.5" style={{ ...cut(10), background: 'rgba(255,255,255,.045)' }}>
    <div className="flex items-baseline justify-between">
      <span className="text-[12.5px] text-gray-400">내 팀 전력</span>
      <span className="flex items-baseline gap-1.5"><b className="font-display text-[22px]" style={{ color: G }}>{MY.ovr}</b>
        <small className="font-display text-[12px] text-gray-400">참가 후보 {POOL.length}팀 중 {RANK}위</small></span>
    </div>
    <div className="relative mt-2 h-2 bg-white/[0.08]">
      <i className="absolute inset-y-0 left-0" style={{ width: `${100 - (RANK / POOL.length) * 100}%`, background: G }} />
      <i className="absolute inset-y-[-3px] w-[2px] bg-white" style={{ left: `${100 - (RANK / POOL.length) * 100}%` }} />
    </div>
  </div>
);
const topRows = (n = 5) => (
  <div className="flex min-h-0 flex-1 flex-col gap-1">
    {TOP.slice(0, n).map((t, i) => (
      <div key={t.id} className="ui-cut flex flex-1 items-center gap-2 px-2.5" style={{ ...cut(6), background: 'rgba(255,255,255,.035)', boxShadow: i === 0 ? `inset 3px 0 0 ${A}` : 'none' }}>
        <b className="w-4 text-center font-display text-[12px] text-gray-500">{i + 1}</b>
        <b className="min-w-0 flex-1 truncate text-[12.5px] text-gray-200">{t.name}</b>
        <b className="font-display text-[14px]" style={{ color: t.ovr > MY.ovr ? '#f87171' : '#94a3b8' }}>{t.ovr}</b>
      </div>
    ))}
  </div>
);
const rule = () => (
  <div className="flex shrink-0 items-baseline justify-between border-t border-white/10 pt-2 text-[12.5px] text-gray-400">
    <span>동점이면</span><b className="text-white">팀 종합 높은 쪽</b>
  </div>
);

/* T1. 요약 + 내 순위 + 강팀 다섯 */
const T1 = () => pane(<>
  <Head />
  {summary()}
  {myRank()}
  {grp('FAVORITES', '강팀 다섯', A)}
  {topRows()}
  {rule()}
  {startBtn()}
</>);

/* T2. 조심할 팀 셋을 사진 카드로 */
const T2 = () => pane(<>
  <Head />
  {summary()}
  {grp('FAVORITES', '우승 후보', A)}
  <div className="grid shrink-0 grid-cols-3 gap-1.5">
    {TOP.slice(0, 3).map((t) => {
      const ace = ACE_OF(t.id);
      return (
        <div key={t.id} className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ ...cut(8), height: 128, backgroundPosition: 'center 8%', backgroundImage: `url(profiles/${encodeURIComponent(ace.id)}.webp), url(ui/mt/silhouette-player.webp)` }}>
          <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.1),rgba(5,8,15,0) 35%,#05080f)' }} />
          <b className="absolute right-1 top-0.5 font-display text-[15px]" style={{ color: A }}>{t.ovr}</b>
          <b className="absolute inset-x-1 bottom-4 truncate text-center text-[11px] font-extrabold text-white">{t.name}</b>
          <small className="absolute inset-x-1 bottom-0.5 truncate text-center text-[10px] text-gray-400">{ace.name}</small>
        </div>
      );
    })}
  </div>
  {myRank()}
  {grp('REWARD', '성적별 보상')}
  <div className="flex min-h-0 flex-1 flex-col gap-1">
    {FINISH.slice().reverse().map(([k, g], i) => (
      <div key={k} className="flex flex-1 items-center justify-between border-b border-white/[0.07] px-1 text-[12.5px]">
        <span style={{ color: i === 0 ? A : '#9ca3af' }}>{k}</span>
        <b className="font-display text-[14px]" style={{ color: i === 0 ? A : '#e5e7eb' }}>{g} G</b>
      </div>
    ))}
  </div>
  {startBtn()}
</>);

/* T3. 전력 분포에서 내 자리 */
const T3 = () => {
  const bins = [0, 0, 0, 0, 0, 0];
  const lo = 60, step = 5;
  POOL.forEach((t) => { const i = Math.max(0, Math.min(bins.length - 1, Math.floor((t.ovr - lo) / step))); bins[i] += 1; });
  const max = Math.max(...bins);
  const mine = Math.max(0, Math.min(bins.length - 1, Math.floor((MY.ovr - lo) / step)));
  return pane(<>
    <Head />
    {summary()}
    {grp('POWER', '참가 후보 전력 분포', A)}
    <div className="flex h-[132px] shrink-0 items-end gap-1.5">
      {bins.map((n, i) => (
        <span key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <b className="font-display text-[11px]" style={{ color: i === mine ? G : '#6b7280' }}>{n}</b>
          <span className="w-full" style={{ height: `${Math.max(6, (n / max) * 96)}px`, background: i === mine ? G : 'rgba(251,191,36,.35)', boxShadow: i === mine ? `0 0 12px -2px ${G}` : 'none' }} />
          <small className="font-display text-[10px] text-gray-500">{lo + i * step}</small>
        </span>
      ))}
    </div>
    {myRank()}
    {grp('FAVORITES', '강팀 셋', A)}
    {topRows(3)}
    {rule()}
    {startBtn()}
  </>);
};

/* T4. 우승까지 4승 — 라운드별 예상 상대 전력 */
const T4 = () => {
  const rounds = [['16강', 160, 72], ['8강', 280, 76], ['4강', 400, 80], ['결승', 960, 84]];
  return pane(<>
    <Head />
    {summary()}
    {myRank()}
    {grp('ROAD', '우승까지 4승', A)}
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      {rounds.map(([k, g, ovr], i) => (
        <div key={k} className="ui-cut flex flex-1 items-center gap-2.5 px-3" style={{ ...cut(7), background: i === 0 ? `color-mix(in srgb,${A} 14%,transparent)` : 'rgba(255,255,255,.035)', boxShadow: i === 0 ? `inset 3px 0 0 ${A}` : 'none' }}>
          <b className="w-10 text-[13px] text-white">{k}</b>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between text-[11px] text-gray-500">예상 상대 전력<b className="font-display text-[13px]" style={{ color: ovr > MY.ovr ? '#f87171' : G }}>{ovr}</b></span>
            <span className="relative mt-0.5 block h-1.5 bg-white/[0.08]"><i className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, ((ovr - 55) / 35) * 100)}%`, background: ovr > MY.ovr ? '#f87171' : G }} /></span>
          </span>
          <b className="font-display text-[13px]" style={{ color: A }}>{g} G</b>
        </div>
      ))}
    </div>
    {grp('FAVORITES', '강팀 셋', A)}
    {topRows(3)}
    {startBtn()}
  </>);
};

const V = [['1', '요약 + 내 순위 + 강팀 다섯', T1], ['2', '우승 후보 카드 + 보상표', T2], ['3', '전력 분포 + 내 자리', T3], ['4', '우승까지 4승 · 라운드별', T4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <UiStyle />
      <div className="mb-3 flex items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">토너먼트 · 시작 전 오른쪽 판 4안</b>
        {V.map(([id, name]) => <a key={id} className="bg-white/[0.06] px-2.5 py-1 text-gray-300 no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a>)}
      </div>
      {pick ? <div style={{ width: 384, height: 800 }}>{pick[2]()}</div> : (
        <div className="grid grid-cols-4 gap-4">
          {V.map(([id, name, C]) => (
            <div key={id}>
              <h3 className="mb-1.5 text-[13px] text-white"><a className="text-inherit no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a></h3>
              <div style={{ width: 384, height: 800 }}>{C()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
