/* 랭크전 오른쪽 판(1안) — 최근 10경기 요약 줄을 한 줄로 담는 4가지 */
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
const W = FORM.filter((r) => r === 'my').length, L = FORM.filter((r) => r === 'opp').length, D = FORM.filter((r) => r === 'draw').length;
const WIN = Math.round((W / FORM.length) * 100);
const SEASONS = [{ season: 3, place: '준우승', rp: 45 }, { season: 2, place: '와일드카드 탈락', rp: 15 }, { season: 1, place: '정규 7위', rp: -5 }];
const PARTS = [['타선', 78], ['수비', 74], ['선발', 80], ['불펜', 76]];

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
    <div className="mt-2 flex justify-between font-display text-[12px] text-gray-500">
      <span>다음 등급까지 {rank.toNext} RP</span><span>최고 {BEST} RP</span>
    </div>
  </div>
);
const formRow = () => (
  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${FORM.length},1fr)` }}>
    {FORM.map((r, i) => {
      const [ko, c] = RESULT[r];
      return <span key={i} className="ui-cut py-1 text-center font-display text-[12px] font-extrabold"
        style={{ '--c': '4px', color: r === 'my' ? '#05080f' : c, background: r === 'my' ? c : 'rgba(255,255,255,.06)' }}>{ko}</span>;
    })}
  </div>
);
const rest = () => (
  <>
    {lab('History')}
    <div>{SEASONS.map((s) => <KV key={s.season} k={`시즌 ${s.season} · ${s.place}`} v={`${s.rp >= 0 ? '+' : ''}${s.rp} RP`} color={s.rp >= 0 ? '#34d399' : '#f87171'} sm />)}</div>
    {lab('My Team')}
    <Stats items={PARTS} />
  </>
);
const pane = (children) => (
  <aside className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col gap-4 p-6" style={{ '--c': '20px', '--a': RK }}>
    <p className="ui-lab font-display" style={{ '--a': RK }}>Ranked</p>
    <h2 className="-mt-2 text-3xl font-black text-white">랭크전</h2>
    {tierBox()}
    {children}
    {rest()}
    <div className="mt-auto">
      <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': RK }}>시즌 1 시작 ▶</button>
    </div>
  </aside>
);

/* 1. 승률 · 연승 두 칸만, 성적은 라벨 오른쪽에 */
const F1 = () => pane(<>
  {lab('Form · 최근 10경기', `${W}승 ${D}무 ${L}패`)}
  {formRow()}
  <Stats items={[['승률', `${WIN}%`], ['연승', '2']]} />
</>);

/* 2. 세 칸이되 값을 짧게 (7-1-2) */
const F2 = () => pane(<>
  {lab('Form · 최근 10경기')}
  {formRow()}
  <Stats items={[['승률', `${WIN}%`], ['연승', '2'], ['성적', `${W}-${D}-${L}`]]} />
</>);

/* 3. 칸은 두 개, 성적은 KV 한 줄 */
const F3 = () => pane(<>
  {lab('Form · 최근 10경기')}
  {formRow()}
  <Stats items={[['승률', `${WIN}%`], ['연승', '2']]} />
  <div><KV k="최근 10경기" v={`${W}승 ${D}무 ${L}패`} sm /></div>
</>);

/* 4. 칸 없이 KV 두 줄 */
const F4 = () => pane(<>
  {lab('Form · 최근 10경기', `승률 ${WIN}% · 2연승`)}
  {formRow()}
  <div><KV k="최근 10경기" v={`${W}승 ${D}무 ${L}패`} sm /></div>
</>);

const V = [['1', '두 칸 + 라벨 옆 성적', F1], ['2', '세 칸 · 7-1-2', F2], ['3', '두 칸 + 성적 줄', F3], ['4', '칸 없이 라벨 + 줄', F4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">최근 10경기 요약 한 줄 · 4안</b>
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
