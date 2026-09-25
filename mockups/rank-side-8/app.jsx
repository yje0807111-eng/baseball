/* 랭크전 오른쪽 판 8안 — 등급·승점 / 최근 10경기 / 지난 시즌 / 내 팀 전력
   테두리 · 제목 · 줄 · 칸 · 버튼은 게임에 있는 그대로 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, KV, Stats } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { rankOf } from '/src/myteam/rank.js';
import { SERIES } from '/src/data/seriesPlayers.js';

const RK = '#a78bfa';
const RP = 420, BEST = 640;
const rank = rankOf(RP);
const FORM = ['my', 'my', 'opp', 'my', 'draw', 'my', 'my', 'opp', 'my', 'my'];
const RESULT = { my: ['승', '#34d399'], opp: ['패', '#f87171'], draw: ['무', '#94a3b8'] };
const WIN = Math.round((FORM.filter((r) => r === 'my').length / FORM.length) * 100);
const SEASONS = [
  { season: 3, place: 2, rp: 45 },
  { season: 2, place: 5, rp: 15 },
  { season: 1, place: 7, rp: -5 },
];
const PLACE_KO = ['통합 우승', '준우승', '플레이오프 탈락', '준플레이오프 탈락', '와일드카드 탈락', '정규 6위', '정규 7위', '정규 8위', '정규 9위', '정규 10위'];
const POOL = SERIES.find((s) => s.players?.length > 12).players;
const BAT = [...POOL].filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall)[0];
const PIT = [...POOL].filter((p) => p.type === 'pitcher').sort((a, b) => b.overall - a.overall)[0];
const PARTS = [['타선', 78], ['수비', 74], ['선발', 80], ['불펜', 76]];

const pane = (children, bg) => (
  <aside className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col gap-4 p-6" style={{ '--c': '20px', '--a': RK, ...(bg || {}) }}>
    <p className="ui-lab font-display" style={{ '--a': RK }}>Ranked</p>
    <h2 className="-mt-2 text-3xl font-black text-white">랭크전</h2>
    {children}
    <div className="mt-auto">
      <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': RK }}>시즌 1 시작 ▶</button>
    </div>
  </aside>
);
const bg = { backgroundImage: 'linear-gradient(180deg,rgba(6,10,19,.88),rgba(6,10,19,.97)), url(ui/rank2/panel.webp)', backgroundSize: 'cover', backgroundPosition: 'center' };
const lab = (t) => <p className="ui-lab font-display" style={{ '--a': RK }}>{t}</p>;

/* A. 등급 · 승점 막대 (+ 최고 승점) */
const tierBox = ({ best = true } = {}) => (
  <div className="ui-cut bg-white/[0.05] px-4 py-3" style={{ '--c': '10px' }}>
    <div className="flex items-baseline gap-2">
      <b className="font-display text-2xl font-extrabold" style={{ color: rank.tier.c }}>{rank.tier.ko} {rank.div}</b>
      <b className="ml-auto font-display text-xl text-white">{RP} RP</b>
    </div>
    <span className="mt-2 block h-1.5 bg-white/10"><i className="block h-full" style={{ width: `${rank.inDiv}%`, background: rank.tier.c }} /></span>
    {best && (
      <div className="mt-2 flex justify-between font-display text-[12px] text-gray-500">
        <span>다음 등급까지 {rank.toNext} RP</span><span>최고 {BEST} RP</span>
      </div>
    )}
  </div>
);
/* B. 최근 10경기 */
const formRow = () => (
  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${FORM.length},1fr)` }}>
    {FORM.map((r, i) => {
      const [ko, c] = RESULT[r];
      return <span key={i} className="ui-cut py-1 text-center font-display text-[12px] font-extrabold"
        style={{ '--c': '4px', color: r === 'my' ? '#05080f' : c, background: r === 'my' ? c : 'rgba(255,255,255,.06)' }}>{ko}</span>;
    })}
  </div>
);
const formBlock = ({ stats = true } = {}) => (
  <>
    {lab('Form · 최근 10경기')}
    {formRow()}
    {stats && <Stats items={[['승률', `${WIN}%`], ['연승', '2'], ['최근', '7승 1무 2패']]} />}
  </>
);
/* C. 지난 시즌 */
const seasonRows = (sm = true) => (
  <div>
    {SEASONS.map((s) => (
      <KV key={s.season} k={`시즌 ${s.season} · ${PLACE_KO[s.place - 1]}`} v={`${s.rp >= 0 ? '+' : ''}${s.rp} RP`} color={s.rp >= 0 ? '#34d399' : '#f87171'} sm={sm} />
    ))}
  </div>
);
/* D. 내 팀 전력 · 간판 */
const partsStats = () => <Stats items={PARTS} />;
const starRow = (p, role, c) => (
  <div className="flex items-center gap-2.5 border-b border-white/10 py-2">
    <span className="ui-cut block h-[38px] w-[32px] shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '6px', backgroundPosition: 'center 12%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
    <span className="min-w-0 flex-1">
      <span className="font-display text-[10px] tracking-[0.2em] text-gray-500">{role}</span>
      <b className="block truncate text-sm text-white">{p.name}</b>
    </span>
    <b className="font-display text-lg" style={{ color: c }}>{p.overall}</b>
  </div>
);
const stars = () => <div>{starRow(BAT, '간판 타자', '#34d399')}{starRow(PIT, '에이스', '#f87171')}</div>;

/* ═══ 8안 ═══ */
const V1 = () => pane(<>{tierBox()}{formBlock()}{lab('History')}{seasonRows()}{lab('My Team')}{partsStats()}</>);
const V2 = () => pane(<>{tierBox()}{lab('My Team')}{partsStats()}{stars()}{formBlock({ stats: false })}{lab('History')}{seasonRows()}</>);
const V3 = () => pane(<>{tierBox()}{formBlock()}{lab('History')}{seasonRows(false)}</>, bg);
const V4 = () => pane(<>{tierBox()}{lab('My Team')}{partsStats()}{stars()}{lab('Form')}{formRow()}<Stats items={[['승률', `${WIN}%`], ['연승', '2'], ['최고', `${BEST} RP`]]} /></>);
const V5 = () => pane(<>{tierBox({ best: false })}{formBlock()}{lab('History')}{seasonRows()}{stars()}</>, bg);
const V6 = () => pane(<>{tierBox()}{lab('History')}{seasonRows()}{formBlock({ stats: false })}{lab('My Team')}{partsStats()}</>);
const V7 = () => pane(<>{tierBox()}{lab('My Team')}{partsStats()}{lab('History')}{seasonRows()}{lab('Form')}{formRow()}</>, bg);
const V8 = () => pane(<>{tierBox()}{formBlock()}{lab('My Team')}{stars()}{lab('History')}{seasonRows()}</>);

const V = [['1', '등급→흐름→기록→전력', V1], ['2', '전력·간판 먼저', V2], ['3', '흐름 + 기록만', V3], ['4', '전력 중심', V4],
  ['5', '흐름 + 기록 + 간판', V5], ['6', '기록 먼저', V6], ['7', '전력 + 기록', V7], ['8', '흐름 + 간판 + 기록', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">랭크전 오른쪽 판 8안</b>
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
