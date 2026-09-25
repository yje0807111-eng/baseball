/* 랭크전 · 시즌 전 가운데 화면 8안 — 설명을 더 또렷하게 + 시스템 그림
   테두리 · 제목 · 줄 · 칸 · 버튼은 게임에 있는 그대로 (KEYFRAMES 의 ui-*, ui.jsx 의 KV · Stats) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, KV, Stats } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { TIERS } from '/src/myteam/rank.js';
import { LEAGUE_SIZE, GAMES, POST_TEAMS, PLACE_REWARD, STAGES } from '/src/myteam/ranked.js';

const RK = '#a78bfa';
const MY = { rp: 420, ovr: 77 };
const STEPS = [
  ['정규 시즌', `${LEAGUE_SIZE}팀 · ${GAMES}경기`],
  ['와일드카드', '4위 vs 5위'],
  ['준플레이오프', 'vs 3위'],
  ['플레이오프', 'vs 2위'],
  ['한국시리즈', 'vs 1위'],
];
const REWARD = PLACE_REWARD.slice(0, 5);
const bgImg = (img, pos = 'center 40%', dark = 0.55) => ({
  backgroundImage: `linear-gradient(90deg,rgba(5,8,15,.95) 18%,rgba(5,8,15,${dark})), url(ui/rank2/${img}.webp)`,
  backgroundSize: 'cover', backgroundPosition: pos,
});
const section = (children, bg) => (
  <section className="ui-cut ui-frame ui-glass relative flex h-full min-h-0 flex-col overflow-hidden p-7" style={{ '--c': '20px', '--a': RK, ...(bg || {}) }}>
    {children}
  </section>
);
const head = (sub) => (
  <>
    <p className="ui-lab font-display" style={{ '--a': RK }}>Ranked · Season</p>
    <h1 className="mt-2 text-6xl font-black text-white">랭크전</h1>
    <p className="mt-3 text-lg text-gray-300">{sub}</p>
  </>
);
const lab = (t) => <p className="ui-lab font-display" style={{ '--a': RK }}>{t}</p>;
/* 설명 카드 세 장 — 한 줄씩 또렷하게 */
const cards = () => (
  <div className="grid grid-cols-3 gap-3">
    {[['1', '정규 시즌', `${LEAGUE_SIZE}팀과 ${GAMES}경기`], ['2', '가을야구', `상위 ${POST_TEAMS}팀 단판 토너먼트`], ['3', '랭크 승점', '최종 순위로 RP가 오르내림']].map(([n, t, d]) => (
      <div key={n} className="ui-cut px-4 py-3" style={{ '--c': '10px', background: 'rgba(255,255,255,.05)' }}>
        <span className="ui-chip font-display" style={{ '--a': RK }}>{n}</span>
        <b className="mt-2 block text-xl font-black text-white">{t}</b>
        <span className="text-sm text-gray-400">{d}</span>
      </div>
    ))}
  </div>
);
/* 가을야구 흐름 — 칩 화살표 */
const flow = () => (
  <div className="flex flex-wrap items-center gap-2">
    {STEPS.map(([k], i) => (
      <React.Fragment key={k}>
        <span className="ui-cut px-4 py-1.5 font-display text-[15px] font-bold"
          style={{ '--c': '6px', color: i === STEPS.length - 1 ? '#05080f' : '#e5e7eb', background: i === STEPS.length - 1 ? '#fbbf24' : 'rgba(255,255,255,.08)' }}>{k}</span>
        {i < STEPS.length - 1 && <span className="font-display text-gray-600">›</span>}
      </React.Fragment>
    ))}
  </div>
);
/* 등급 사다리 */
const ladder = (compact = false) => (
  <div className={`grid gap-2 ${compact ? 'grid-cols-6' : 'grid-cols-3'}`}>
    {TIERS.map((t) => {
      const on = MY.rp >= t.min;
      return (
        <div key={t.key} className="ui-cut px-3 py-2" style={{ '--c': '8px', background: on ? `color-mix(in srgb,${t.c} 16%,transparent)` : 'rgba(255,255,255,.04)', boxShadow: on ? `inset 0 0 0 1px ${t.c}66` : 'none' }}>
          <b className="block font-display text-base" style={{ color: on ? t.c : '#6b7280' }}>{t.ko}</b>
          <span className="font-display text-[12px] text-gray-500">{t.min} RP</span>
        </div>
      );
    })}
  </div>
);
/* 순위별 승점 표 */
const rewardRows = (sm = false) => (
  <div>{REWARD.map((r, i) => <KV key={r.ko} k={r.ko} v={`${r.rp >= 0 ? '+' : ''}${r.rp} RP · ${r.gold} G`} color={i === 0 ? '#fbbf24' : '#fff'} sm={sm} />)}</div>
);
/* 빈 순위표 미리보기 */
const table = () => (
  <div className="ui-cut bg-[#05080f]/60 px-4 py-3" style={{ '--c': '12px' }}>
    <div className="grid gap-1 text-[13px] text-gray-400" style={{ gridTemplateColumns: '28px minmax(0,1fr) repeat(3,44px)' }}>
      <span>#</span><span>팀</span><span className="text-right">승</span><span className="text-right">무</span><span className="text-right">패</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <React.Fragment key={i}>
          <span className="font-display" style={{ color: i < POST_TEAMS ? RK : '#6b7280' }}>{i + 1}</span>
          <span className={i === 2 ? 'text-white' : 'text-gray-500'}>{i === 2 ? '나의 드림팀' : '— — —'}</span>
          <span className="text-right text-gray-600">-</span><span className="text-right text-gray-600">-</span><span className="text-right text-gray-600">-</span>
        </React.Fragment>
      ))}
    </div>
  </div>
);

/* ── 1. 설명 카드 셋 + 흐름 ── */
const M1 = () => section(<>
  {head(`${LEAGUE_SIZE}팀 리그 ${GAMES}경기 → 상위 ${POST_TEAMS}팀 가을야구 → 최종 순위로 랭크 승점`)}
  <div className="mt-auto flex flex-col gap-4">
    {cards()}
    {lab('Postseason')}
    {flow()}
  </div>
</>, bgImg('crowd'));

/* ── 2. 흐름 + 순위별 승점 ── */
const M2 = () => section(<>
  {head('정규 시즌을 치르고, 가을야구 성적으로 승점을 받습니다.')}
  <div className="mt-auto grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1.2fr) 320px' }}>
    <div className="flex flex-col gap-3">{lab('Postseason')}{flow()}{cards()}</div>
    <div>{lab('Reward')}{rewardRows(true)}</div>
  </div>
</>, bgImg('dusk'));

/* ── 3. 등급 사다리 중심 ── */
const M3 = () => section(<>
  {head('시즌 최종 순위로 랭크 승점(RP)이 오르내립니다.')}
  <div className="mt-auto flex flex-col gap-4">
    {lab('Tier')}
    {ladder()}
    <Stats items={[['내 승점', `${MY.rp} RP`], ['다음 등급까지', `${Math.max(0, 600 - MY.rp)} RP`], ['우승하면', `+${PLACE_REWARD[0].rp} RP`]]} />
  </div>
</>, bgImg('board'));

/* ── 4. 순위표 미리보기 ── */
const M4 = () => section(<>
  {head(`${LEAGUE_SIZE}팀이 ${GAMES}경기를 치러 순위를 가립니다. 상위 ${POST_TEAMS}팀이 가을야구로.`)}
  <div className="mt-auto flex flex-col gap-3">
    {lab('Standings')}
    {table()}
    {flow()}
  </div>
</>, bgImg('dusk', 'center 55%'));

/* ── 5. 좌우 두 칸 ── */
const M5 = () => section(<>
  {head('리그 → 가을야구 → 승점. 한 시즌을 통째로 치릅니다.')}
  <div className="mt-auto grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
    <div className="flex flex-col gap-3">{lab('How')}{cards()}</div>
    <div className="flex flex-col gap-3">{lab('Tier')}{ladder(true)}{rewardRows(true)}</div>
  </div>
</>, bgImg('crowd', 'center 30%'));

/* ── 6. 큰 숫자 셋 ── */
const M6 = () => section(<>
  {head('랭크 승점을 모아 등급을 올립니다.')}
  <div className="mt-auto flex flex-col gap-4">
    <div className="grid grid-cols-3 gap-3">
      {[[`${LEAGUE_SIZE}`, '팀 리그'], [`${GAMES}`, '정규 경기'], [`${POST_TEAMS}`, '팀 가을야구']].map(([n, t]) => (
        <div key={t} className="ui-cut px-5 py-4" style={{ '--c': '12px', background: `linear-gradient(180deg,color-mix(in srgb,${RK} 14%,transparent),rgba(5,8,15,.5))` }}>
          <b className="font-display text-5xl font-black" style={{ color: RK }}>{n}</b>
          <span className="mt-1 block text-base text-gray-300">{t}</span>
        </div>
      ))}
    </div>
    {flow()}
  </div>
</>, bgImg('board', 'center 45%'));

/* ── 7. 가을야구 단계별 카드 ── */
const M7 = () => section(<>
  {head(`정규 ${GAMES}경기 뒤, 상위 ${POST_TEAMS}팀이 단판으로 우승을 가립니다.`)}
  <div className="mt-auto grid grid-cols-5 items-end gap-2.5" style={{ height: '46%' }}>
    {STEPS.map(([k, v], i) => (
      <div key={k} className="ui-cut flex flex-col justify-end p-4" style={{ '--c': '12px', height: `${46 + i * 13}%`,
        background: `linear-gradient(180deg,color-mix(in srgb,${i === 4 ? '#fbbf24' : RK} ${8 + i * 4}%,transparent),rgba(5,8,15,.6))`,
        boxShadow: `inset 0 2px 0 ${i === 4 ? '#fbbf24' : `${RK}66`}` }}>
        <b className="text-xl font-black" style={{ color: i === 4 ? '#fbbf24' : '#fff' }}>{k}</b>
        <span className="font-display text-sm text-gray-300">{v}</span>
      </div>
    ))}
  </div>
</>, bgImg('crowd', 'center 25%'));

/* ── 8. 설명 + 승점표 나란히 ── */
const M8 = () => section(<>
  {head(`${LEAGUE_SIZE}팀 리그 ${GAMES}경기 · 상위 ${POST_TEAMS}팀 가을야구`)}
  <div className="mt-auto grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 360px' }}>
    <div className="flex flex-col gap-3">{lab('Postseason')}{flow()}{ladder(true)}</div>
    <div>{lab('Reward')}{rewardRows(true)}</div>
  </div>
</>, bgImg('dusk', 'center 40%'));

const V = [['1', '설명 카드 + 흐름', M1], ['2', '흐름 + 승점표', M2], ['3', '등급 사다리', M3], ['4', '순위표 미리보기', M4],
  ['5', '좌우 두 칸', M5], ['6', '큰 숫자', M6], ['7', '가을야구 계단', M7], ['8', '흐름 + 등급 + 승점', M8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">랭크전 · 시즌 전 가운데 화면 8안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? RK : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      {pick ? <div style={{ width: 1184, height: 807 }}>{pick[2]()}</div> : (
        <div className="grid grid-cols-2 gap-4">
          {V.map(([id, name, C]) => (
            <div key={id}>
              <h3 className="mb-1.5 text-[13px] text-white"><a className="text-inherit no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a></h3>
              <div style={{ width: 920, height: 630, overflow: 'hidden' }}>
                <div style={{ width: 1184, height: 807, transform: 'scale(.777)', transformOrigin: '0 0' }}>{C()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
