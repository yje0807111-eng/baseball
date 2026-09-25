/* 일반 대결 · 단판 오른쪽 판 — 오늘 상대 + 최근 5경기 8안 (384 × 800) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { AI_SERIES, seriesTeam } from '/src/myteam/aiTeam.js';
import { posColor } from '/src/myteam/teamColor.js';

const cut = (c) => ({ '--c': `${c}px` });
const G = '#10b981';
const OPP = seriesTeam(AI_SERIES[5] || AI_SERIES[0], () => 0.4);
const ROS = OPP.roster;
const byOvr = (a, b) => b.overall - a.overall;
const BATS = ROS.filter((p) => p.type === 'batter');
const PITS = [...ROS.filter((p) => p.type === 'pitcher')].sort(byOvr);
const ACE = PITS[0];
const SLUG = [...BATS].sort((a, b) => b.stats.power - a.stats.power)[0];
const avg = (xs, f) => (xs.length ? Math.round(xs.reduce((s, p) => s + f(p), 0) / xs.length) : 0);
const O = {
  ovr: avg(ROS, (p) => p.overall),
  bat: avg(BATS, (p) => p.overall),
  def: avg(BATS, (p) => p.stats.defense),
  sp: avg(PITS.filter((p) => p.position === 'SP'), (p) => p.overall),
  rp: avg(PITS.filter((p) => p.position === 'RP'), (p) => p.overall),
};
const EMB = /레전드/.test(OPP.name) ? 'legend' : /대표/.test(OPP.name) ? 'korea' : 'lotte';
const MINE = { name: '나의 드림팀', ovr: 84, emblem: 'dream' };
/* 최근 5경기 (예시) */
const REC = [
  { opp: '2015 두산', my: 7, them: 3, w: 'W' },
  { opp: '1994 LG', my: 2, them: 5, w: 'L' },
  { opp: '2010 SK', my: 4, them: 4, w: 'D' },
  { opp: '2023 LG', my: 6, them: 1, w: 'W' },
  { opp: '1999 한화', my: 3, them: 2, w: 'W' },
];
const WC = { W: G, L: '#f87171', D: '#94a3b8' };
const REC_SUM = { w: REC.filter((r) => r.w === 'W').length, l: REC.filter((r) => r.w === 'L').length, d: REC.filter((r) => r.w === 'D').length };

const face = (p, w, h, c = 6) => (
  <span className="ui-cut block shrink-0 bg-[#0b1220] bg-cover" style={{ ...cut(c), width: w, height: h, backgroundPosition: 'center 12%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
);
const emblem = (key, size) => <span className="block shrink-0 bg-contain bg-center bg-no-repeat" style={{ width: size, height: size, backgroundImage: `url(ui/clubs/${key}.webp)` }} />;
const FORMATS = [['단판', true], ['16강'], ['32강'], ['64강']];

const Picker = () => (
  <div className="flex gap-1.5">
    {FORMATS.map(([t, on]) => (
      <span key={t} className={`ui-cut flex-1 py-1.5 text-center text-[13px] font-bold ${on ? 'text-[#05080f]' : 'text-gray-400'}`}
        style={{ ...cut(6), background: on ? G : 'rgba(255,255,255,.05)' }}>{t}</span>
    ))}
  </div>
);
const Head = () => (
  <>
    <p className="ui-lab font-display" style={{ '--a': G }}>Single Game</p>
    <h2 className="-mt-2 text-3xl font-black text-white">일반 대결</h2>
    <Picker />
  </>
);
const startBtn = () => (
  <div className="mt-auto">
    <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ ...cut(12), '--a': G }}>경기 시작 ▶</button>
  </div>
);
const pane = (children) => (
  <aside className="ui-cut ui-frame ui-glass flex h-full flex-col gap-3 p-6" style={{ ...cut(20), '--a': G }}>{children}</aside>
);
const grp = (en, ko, c = '#9ca3af') => (
  <div className="flex shrink-0 items-center gap-2 pb-1">
    <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: c }}>{en}</span>
    <b className="text-[12px] text-gray-300">{ko}</b>
    <span className="h-px flex-1 bg-white/10" />
  </div>
);
/* 조각들 */
const oppCard = (h = 150) => (
  <div className="ui-cut relative shrink-0 overflow-hidden" style={{ height: h, ...cut(14), background: '#0b1220' }}>
    <span className="absolute inset-0 bg-cover" style={{ backgroundPosition: '60% 14%', backgroundImage: `url(cards/${encodeURIComponent(ACE.id)}.webp), url(profiles/${encodeURIComponent(ACE.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 26%,rgba(5,8,15,.4) 66%,rgba(5,8,15,0))' }} />
    <span className="absolute inset-y-3 left-4 flex flex-col justify-center">
      <span className="flex items-center gap-2">{emblem(EMB, 26)}<b className="text-[15px] font-black text-white">{OPP.name}</b></span>
      <b className="mt-1 font-display text-[30px] leading-none" style={{ color: G }}>{O.ovr}</b>
      <span className="mt-2 font-display text-[10px] tracking-[0.2em] text-gray-400">오늘 상대 선발</span>
      <b className="text-[15px] font-extrabold text-white">{ACE.name} <small className="font-display text-[13px]" style={{ color: '#f87171' }}>{ACE.overall}</small></b>
    </span>
  </div>
);
const oppRow = () => (
  <div className="ui-cut flex shrink-0 items-center gap-2.5 px-3 py-2" style={{ ...cut(10), background: 'rgba(255,255,255,.045)' }}>
    {emblem(EMB, 38)}
    <span className="min-w-0 flex-1">
      <span className="font-display text-[10px] tracking-[0.2em] text-gray-500">오늘 상대</span>
      <b className="block truncate text-[16px] font-black text-white">{OPP.name}</b>
    </span>
    <b className="font-display text-[24px]" style={{ color: G }}>{O.ovr}</b>
  </div>
);
const bars = (keys = [['타선', 'bat', '#34d399'], ['수비', 'def', '#60a5fa'], ['선발', 'sp', '#7dd3fc'], ['불펜', 'rp', '#f87171']]) => (
  <div className="flex shrink-0 gap-1.5">
    {keys.map(([l, k, c]) => (
      <span key={k} className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between text-[10.5px] text-gray-500">{l}<b className="font-display text-[13px]" style={{ color: c }}>{O[k]}</b></span>
        <span className="relative mt-0.5 block h-1.5 bg-white/[0.08]"><i className="absolute inset-y-0 left-0" style={{ width: `${Math.max(4, Math.min(100, ((O[k] - 40) / 55) * 100))}%`, background: c }} /></span>
      </span>
    ))}
  </div>
);
const recRows = (n = 5) => (
  <div className="flex min-h-0 flex-1 flex-col gap-1">
    {REC.slice(0, n).map((r, i) => (
      <div key={i} className="ui-cut flex flex-1 items-center gap-2 px-2.5" style={{ ...cut(6), background: 'rgba(255,255,255,.035)', boxShadow: `inset 3px 0 0 ${WC[r.w]}` }}>
        <b className="font-display text-[12px]" style={{ color: WC[r.w] }}>{r.w === 'W' ? '승' : r.w === 'L' ? '패' : '무'}</b>
        <b className="min-w-0 flex-1 truncate text-[12.5px] text-gray-300">{r.opp}</b>
        <b className="font-display text-[14px] text-white">{r.my}<small className="text-gray-500"> : </small>{r.them}</b>
      </div>
    ))}
  </div>
);
const recDots = () => (
  <div className="flex shrink-0 items-center gap-1.5">
    {REC.map((r, i) => (
      <span key={i} className="grid h-7 flex-1 place-items-center font-display text-[12px] font-extrabold"
        style={{ color: r.w === 'W' ? '#05080f' : WC[r.w], background: r.w === 'W' ? G : `color-mix(in srgb,${WC[r.w]} 18%,transparent)` }}>
        {r.w === 'W' ? '승' : r.w === 'L' ? '패' : '무'}
      </span>
    ))}
  </div>
);
const recSummary = () => (
  <div className="grid shrink-0 grid-cols-3 gap-1.5">
    {[['승', REC_SUM.w, G], ['무', REC_SUM.d, '#94a3b8'], ['패', REC_SUM.l, '#f87171']].map(([k, v, c]) => (
      <div key={k} className="ui-cut flex flex-col items-center py-2" style={{ ...cut(7), background: 'rgba(255,255,255,.04)' }}>
        <span className="text-[11px] text-gray-400">{k}</span>
        <b className="font-display text-[20px]" style={{ color: c }}>{v}</b>
      </div>
    ))}
  </div>
);

/* ════ 8안 ════ */
const V1 = () => pane(<>
  <Head />
  {grp('TODAY', '오늘 상대', G)}
  {oppCard(160)}
  {bars()}
  {grp('RECENT', '최근 5경기')}
  {recRows()}
  {startBtn()}
</>);

const V2 = () => pane(<>
  <Head />
  {oppRow()}
  {bars()}
  <div className="ui-cut flex shrink-0 items-center gap-2.5 px-3 py-2" style={{ ...cut(10), background: 'rgba(255,255,255,.04)' }}>
    {face(ACE, 34, 40)}
    <span className="min-w-0 flex-1"><span className="font-display text-[10px] tracking-[0.2em]" style={{ color: '#f87171' }}>상대 선발</span>
      <b className="block truncate text-[14px] font-extrabold text-white">{ACE.name}</b></span>
    <b className="font-display text-[18px] text-white">{ACE.overall}</b>
  </div>
  {grp('RECENT', '최근 5경기')}
  {recDots()}
  {recRows()}
  {startBtn()}
</>);

const V3 = () => pane(<>
  <Head />
  <div className="ui-cut shrink-0 px-3 py-4" style={{ ...cut(14), background: `linear-gradient(90deg,rgba(16,185,129,.16),rgba(6,10,19,.4) 45%,rgba(248,113,113,.16))` }}>
    <div className="grid items-center" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
      <span className="flex flex-col items-center gap-1">{emblem(MINE.emblem, 44)}<b className="truncate text-[13px] text-white">{MINE.name}</b><b className="font-display text-[20px]" style={{ color: G }}>{MINE.ovr}</b></span>
      <span className="font-display text-[18px] font-black text-gray-500">VS</span>
      <span className="flex flex-col items-center gap-1">{emblem(EMB, 44)}<b className="truncate text-[13px] text-white">{OPP.name}</b><b className="font-display text-[20px]" style={{ color: '#f87171' }}>{O.ovr}</b></span>
    </div>
  </div>
  {bars()}
  {grp('RECENT', '최근 5경기')}
  {recRows()}
  {startBtn()}
</>);

const V4 = () => pane(<>
  <Head />
  {grp('TODAY', '오늘 상대', G)}
  {oppCard(180)}
  {grp('RECENT', `최근 5경기 · ${REC_SUM.w}승 ${REC_SUM.d}무 ${REC_SUM.l}패`)}
  <div className="flex min-h-0 flex-1 flex-col gap-1.5">
    {REC.map((r, i) => (
      <div key={i} className="flex flex-1 items-center gap-2">
        <span className="grid h-full w-6 place-items-center font-display text-[12px] font-extrabold" style={{ color: r.w === 'W' ? '#05080f' : WC[r.w], background: r.w === 'W' ? G : `color-mix(in srgb,${WC[r.w]} 18%,transparent)` }}>{r.w === 'W' ? '승' : r.w === 'L' ? '패' : '무'}</span>
        <b className="min-w-0 flex-1 truncate text-[12.5px] text-gray-300">{r.opp}</b>
        <span className="relative h-2 w-20 bg-white/[0.07]">
          <i className="absolute inset-y-0 left-1/2 -translate-x-1/2" style={{ width: `${Math.min(50, Math.abs(r.my - r.them) * 10)}%`, marginLeft: r.my >= r.them ? 0 : `-${Math.min(50, Math.abs(r.my - r.them) * 10)}%`, background: WC[r.w] }} />
        </span>
        <b className="font-display text-[13px] text-white">{r.my}:{r.them}</b>
      </div>
    ))}
  </div>
  {startBtn()}
</>);

const V5 = () => pane(<>
  <Head />
  {oppRow()}
  <div className="grid shrink-0 grid-cols-2 gap-1.5">
    {[['상대 선발', ACE], ['간판 타자', SLUG]].map(([k, p]) => (
      <div key={k} className="ui-cut flex flex-col items-center gap-1 py-2" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
        {face(p, 54, 62)}
        <span className="font-display text-[10px] tracking-[0.16em] text-gray-500">{k}</span>
        <b className="max-w-full truncate text-[13px] font-extrabold text-white">{p.name}</b>
        <b className="font-display text-[15px]" style={{ color: posColor(p) }}>{p.overall}</b>
      </div>
    ))}
  </div>
  {bars()}
  {grp('RECENT', '최근 5경기')}
  {recSummary()}
  {recRows(3)}
  {startBtn()}
</>);

const V6 = () => pane(<>
  <Head />
  <div className="flex shrink-0 gap-1.5">
    {['오늘 상대', '최근 5경기'].map((t, i) => (
      <span key={t} className={`ui-cut flex-1 py-1.5 text-center text-[13px] font-bold ${i === 0 ? 'text-[#05080f]' : 'text-gray-400'}`} style={{ ...cut(6), background: i === 0 ? G : 'rgba(255,255,255,.05)' }}>{t}</span>
    ))}
  </div>
  {oppCard(190)}
  {bars()}
  <div className="ui-cut flex shrink-0 items-center justify-between px-3 py-2" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
    <span className="text-[12.5px] text-gray-400">최근 5경기</span>
    <span className="flex gap-1">{REC.map((r, i) => <span key={i} className="h-4 w-4" style={{ background: WC[r.w] }} />)}</span>
  </div>
  {startBtn()}
</>);

const V7 = () => pane(<>
  <Head />
  {grp('TODAY', '오늘 상대', G)}
  <div className="ui-cut relative shrink-0 overflow-hidden bg-[#07130c] bg-cover" style={{ height: 170, ...cut(12), backgroundImage: 'url(ui/field.webp)', backgroundPosition: 'center 58%' }}>
    <span className="absolute inset-0" style={{ background: 'radial-gradient(75% 75% at 50% 55%,rgba(5,8,15,.1),rgba(5,8,15,.78))' }} />
    <span className="absolute left-3 top-3 flex items-center gap-2">{emblem(EMB, 30)}<b className="text-[14px] font-black text-white">{OPP.name}</b></span>
    <b className="absolute right-3 top-2 font-display text-[26px]" style={{ color: G }}>{O.ovr}</b>
    {[[50, 62, ACE], [30, 84, SLUG]].map(([x, y, p]) => (
      <span key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-1.5 py-0.5 text-[11px] font-bold text-white"
        style={{ left: `${x}%`, top: `${y}%`, background: 'rgba(5,8,15,.8)', boxShadow: `inset 0 -2px 0 ${posColor(p)}` }}>{p.name}<b className="ml-1 font-display" style={{ color: G }}>{p.overall}</b></span>
    ))}
  </div>
  {grp('RECENT', '최근 5경기')}
  {recDots()}
  {recRows(4)}
  {startBtn()}
</>);

const V8 = () => pane(<>
  <Head />
  <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateRows: 'auto auto minmax(0,1fr)' }}>
    {oppRow()}
    {bars()}
    <div className="grid min-h-0 gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="flex min-h-0 flex-col">
        {grp('ACE', '상대 선발', '#f87171')}
        <div className="ui-cut relative min-h-0 flex-1 overflow-hidden bg-[#0b1220] bg-cover" style={{ ...cut(10), backgroundPosition: 'center 10%', backgroundImage: `url(profiles/${encodeURIComponent(ACE.id)}.webp), url(ui/mt/silhouette-player.webp)` }}>
          <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.1),rgba(5,8,15,0) 40%,#05080f)' }} />
          <b className="absolute inset-x-2 bottom-1 truncate text-center text-[13px] font-extrabold text-white">{ACE.name}</b>
          <b className="absolute right-2 top-1 font-display text-[16px]" style={{ color: G }}>{ACE.overall}</b>
        </div>
      </div>
      <div className="flex min-h-0 flex-col">
        {grp('RECENT', '최근 5')}
        {recRows()}
      </div>
    </div>
  </div>
  {startBtn()}
</>);

const V = [
  ['1', '상대 카드 + 최근 줄', V1], ['2', '상대 요약 + 승패 칩 + 줄', V2], ['3', 'VS 대진 + 최근 줄', V3], ['4', '큰 상대 카드 + 점수차 막대', V4],
  ['5', '상대 선발·간판 + 최근 요약', V5], ['6', '탭 전환(상대/최근)', V6], ['7', '상대 미니 구장 + 최근', V7], ['8', '두 열(상대 선발 · 최근)', V8],
];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <UiStyle />
      <div className="mb-3 flex items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">일반 대결 · 단판 오른쪽 판 8안</b>
        {V.map(([id, name]) => <a key={id} className="bg-white/[0.06] px-2.5 py-1 text-gray-300 no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a>)}
      </div>
      {pick ? (
        <div style={{ width: 384, height: 800 }}>{pick[2]()}</div>
      ) : (
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
