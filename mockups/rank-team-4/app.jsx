/* 랭크전 오른쪽 판 아래 MY TEAM 구역을 그래프로 — 4안
   색은 다른 구역과 같은 부문 색: 타선 #34d399 · 수비 #60a5fa · 선발 #7dd3fc · 불펜 #f87171 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, KV, Stats } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { rankOf } from '/src/myteam/rank.js';

const RK = '#a78bfa';
const RP = 420, BEST = 640;
const rank = rankOf(RP);
const FORM = ['my', 'my', 'opp', 'my', 'draw', 'my', 'my', 'opp', 'my', 'my'];
const RESULT = { my: ['승', '#34d399'], opp: ['패', '#f87171'], draw: ['무', '#94a3b8'] };
const W = FORM.filter((r) => r === 'my').length, L = FORM.filter((r) => r === 'opp').length, D = FORM.length - W - L;
const SEASONS = [{ season: 3, place: '준우승', rp: 45 }, { season: 2, place: '와일드카드 탈락', rp: 15 }, { season: 1, place: '정규 7위', rp: -5 }];
/* 부문 색 — 정비 화면 · 단판 판과 같은 값 */
const PARTS = [['타선', 77, '#34d399'], ['수비', 81, '#60a5fa'], ['선발', 77, '#7dd3fc'], ['불펜', 74, '#f87171']];
const pct = (v) => `${Math.max(4, Math.min(100, ((v - 40) / 55) * 100))}%`;

const lab = (t, extra) => (
  <div className="flex items-baseline gap-2">
    <p className="ui-lab font-display" style={{ '--a': RK }}>{t}</p>
    {extra && <span className="ml-auto font-display text-[12px] text-gray-400">{extra}</span>}
  </div>
);
const tierBox = () => (
  <div className="ui-cut bg-white/[0.05] px-4 py-3" style={{ '--c': '10px' }}>
    <div className="flex items-baseline gap-2">
      <b className="font-display text-2xl font-extrabold" style={{ color: rank.tier.c }}>{rank.tier.ko} {rank.div}</b>
      <b className="ml-auto font-display text-xl text-white">{RP} RP</b>
    </div>
    <span className="mt-2 block h-1.5 bg-white/10"><i className="block h-full" style={{ width: `${rank.inDiv}%`, background: rank.tier.c }} /></span>
    <div className="mt-2 flex justify-between font-display text-[12px] text-gray-500"><span>다음 등급까지 {rank.toNext} RP</span><span>최고 {BEST} RP</span></div>
  </div>
);
const formBlock = () => (
  <>
    {lab(`Form · 최근 ${FORM.length}경기`, `${W}승 ${D}무 ${L}패`)}
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${FORM.length},1fr)` }}>
      {FORM.map((r, i) => {
        const [ko, c] = RESULT[r];
        return <span key={i} className="ui-cut py-1 text-center font-display text-[12px] font-extrabold"
          style={{ '--c': '4px', color: r === 'my' ? '#05080f' : c, background: r === 'my' ? c : 'rgba(255,255,255,.06)' }}>{ko}</span>;
      })}
    </div>
    <Stats items={[['승률', `${Math.round((W / FORM.length) * 100)}%`], ['연승', 2]]} />
  </>
);
const history = () => (
  <>
    {lab('History')}
    <div>{SEASONS.map((s) => <KV key={s.season} k={`시즌 ${s.season} · ${s.place}`} v={`${s.rp >= 0 ? '+' : ''}${s.rp} RP`} color={s.rp >= 0 ? '#34d399' : '#f87171'} sm />)}</div>
  </>
);
const pane = (team) => (
  <aside className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col gap-4 p-6" style={{ '--c': '20px', '--a': RK }}>
    <p className="ui-lab font-display" style={{ '--a': RK }}>Ranked</p>
    <h2 className="-mt-2 text-3xl font-black text-white">랭크전</h2>
    {tierBox()}
    {formBlock()}
    {history()}
    {lab('My Team')}
    {team}
    <div className="mt-auto">
      <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': RK }}>시즌 1 시작 ▶</button>
    </div>
  </aside>
);

/* 1. 가로 막대 — 부문별 색, 오른쪽에 숫자 */
const T1 = () => pane(
  <div className="flex flex-col gap-2">
    {PARTS.map(([k, v, c]) => (
      <div key={k} className="grid items-center gap-2.5 text-[13px] text-gray-300" style={{ gridTemplateColumns: '34px 1fr 28px' }}>
        <span>{k}</span>
        <span className="relative h-2.5 bg-white/[0.07]"><i className="absolute inset-y-0 left-0" style={{ width: pct(v), background: c, boxShadow: `0 0 10px -2px ${c}` }} /></span>
        <b className="text-right font-display text-[15px]" style={{ color: c }}>{v}</b>
      </div>
    ))}
  </div>,
);

/* 2. 세로 막대 — 네 기둥 */
const T2 = () => pane(
  <div className="flex h-[120px] items-end gap-2">
    {PARTS.map(([k, v, c]) => (
      <span key={k} className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <b className="font-display text-[13px]" style={{ color: c }}>{v}</b>
        <span className="ui-cut w-full" style={{ '--c': '4px', height: `${Math.max(10, ((v - 40) / 55) * 84)}px`, background: `linear-gradient(180deg,${c},color-mix(in srgb,${c} 35%,transparent))` }} />
        <small className="text-[12px] text-gray-400">{k}</small>
      </span>
    ))}
  </div>,
);

/* 3. 칸 + 안쪽 막대 (Stats 칸 느낌 그대로) */
const T3 = () => pane(
  <div className="grid grid-cols-2 gap-1.5">
    {PARTS.map(([k, v, c]) => (
      <div key={k} className="ui-cut bg-white/[0.045] px-3 py-1.5" style={{ '--c': '7px' }}>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] text-gray-400">{k}</span>
          <b className="font-display text-xl font-bold leading-tight" style={{ color: c }}>{v}</b>
        </div>
        <span className="mt-1 block h-1 bg-white/10"><i className="block h-full" style={{ width: pct(v), background: c }} /></span>
      </div>
    ))}
  </div>,
);

/* 4. 한 줄 누적 띠 + 값 */
const T4 = () => pane(
  <>
    <div className="flex h-3 w-full overflow-hidden">
      {PARTS.map(([k, v, c]) => <span key={k} className="h-full" style={{ width: `${(v / PARTS.reduce((n, p) => n + p[1], 0)) * 100}%`, background: c }} />)}
    </div>
    <div className="mt-2 grid grid-cols-4 gap-1.5">
      {PARTS.map(([k, v, c]) => (
        <span key={k} className="flex flex-col items-center">
          <b className="font-display text-[17px]" style={{ color: c }}>{v}</b>
          <small className="text-[11.5px] text-gray-400">{k}</small>
        </span>
      ))}
    </div>
  </>,
);

const V = [['1', '가로 막대', T1], ['2', '세로 막대', T2], ['3', '칸 + 안쪽 막대', T3], ['4', '누적 띠', T4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">랭크전 판 · MY TEAM 그래프 4안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? RK : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      {pick ? <div style={{ width: 384, height: 807 }}>{pick[2]()}</div> : (
        <div className="grid grid-cols-4 gap-4">
          {V.map(([id, name, C]) => (
            <div key={id}>
              <h3 className="mb-1.5 text-[13px] text-white"><a className="text-inherit no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a></h3>
              <div style={{ width: 384, height: 807 }}>{C()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
