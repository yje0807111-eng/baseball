/* 토너먼트 시작 전 — 가운데 큰 화면 4안 + 오른쪽 판(1안: 트로피 + 상금) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';

const cut = (c) => ({ '--c': `${c}px` });
const A = '#fbbf24';
const SIZE = 16;
const ROUNDS = ['16강', '8강', '4강', '결승'];
const PRIZE = 960;
const GOLD = { background: 'linear-gradient(180deg,#fde68a,#f59e0b 60%,#b45309)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
const TEAM = SERIES.find((s) => s.players?.length > 12).players.slice(0, 8);
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');

/* ───── 오른쪽 판: 트로피 + 상금 ───── */
const FORMATS = [['단판'], ['16강', true], ['32강'], ['64강']];
const Aside = () => (
  <aside className="ui-cut ui-frame ui-glass flex h-full flex-col gap-4 p-6" style={{ ...cut(20), '--a': A, width: 384 }}>
    <p className="ui-lab font-display" style={{ '--a': A }}>Tournament · {SIZE}</p>
    <h2 className="-mt-2 text-3xl font-black text-white">일반 대결</h2>
    <div className="grid grid-cols-4 gap-1.5">
      {FORMATS.map(([t, on]) => (
        <span key={t} className={`ui-cut py-2 text-center font-display text-lg font-extrabold ${on ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400'}`}
          style={{ ...cut(7), background: on ? A : undefined, boxShadow: on ? `0 0 22px -6px ${A}` : undefined }}>{t}</span>
      ))}
    </div>
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <span className="block w-full bg-contain bg-center bg-no-repeat" style={{ height: 300, backgroundImage: 'url(ui/tour/trophy.webp)', mixBlendMode: 'screen' }} />
      <p className="font-display text-[11px] tracking-[0.3em] text-gray-500">WINNER TAKES</p>
      <b className="font-display text-[52px] font-extrabold leading-none" style={GOLD}>{PRIZE} G</b>
      <span className="my-1 block h-px w-full" style={{ background: `linear-gradient(90deg,transparent,${A}66,transparent)` }} />
      <p className="text-center text-[13.5px] leading-relaxed text-gray-400">내 팀으로 치르는 {SIZE}팀 토너먼트.<br />네 번 이기면 우승.</p>
    </div>
    <div className="mt-auto">
      <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ ...cut(12), '--a': A }}>{SIZE}강 시작 ▶</button>
    </div>
  </aside>
);

/* ───── 내 팀 줄 (지금 화면에 있는 것) ───── */
const MySquad = () => (
  <>
    <div className="flex items-baseline gap-3 pt-4">
      <p className="ui-lab font-display" style={{ '--a': A }}>My Team</p>
      <p className="text-sm text-gray-400">나의 드림팀 · 팀 종합 77</p>
    </div>
    <div className="mt-2 grid h-36 shrink-0 grid-cols-8 gap-2">
      {TEAM.map((p) => (
        <div key={p.id} className="ui-cut relative overflow-hidden bg-[#0b1220] bg-cover" style={{ ...cut(10), backgroundPosition: 'center 12%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }}>
          <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.1),rgba(5,8,15,0) 40%,#05080f)' }} />
          <b className="absolute left-2 top-1 font-display text-[17px]" style={{ color: tone(p.overall) }}>{p.overall}</b>
          <b className="absolute inset-x-1.5 bottom-1 truncate text-center text-[12.5px] font-extrabold text-white">{p.name}</b>
        </div>
      ))}
    </div>
  </>
);
const section = (children) => (
  <section className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col p-5" style={{ ...cut(20), '--a': A, width: 1184 }}>{children}</section>
);

/* ── H1. 트로피 포스터 — 구장 배경 + 트로피 ── */
const H1 = () => section(<>
  <div className="ui-cut relative min-h-0 flex-1 overflow-hidden bg-cover" style={{ ...cut(14), backgroundImage: 'url(ui/tour/stadium.webp)', backgroundPosition: 'center 40%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 18%,rgba(5,8,15,.5) 55%,rgba(5,8,15,.15))' }} />
    <span className="absolute bottom-0 right-8 top-0 w-[360px] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(ui/tour/trophy.webp)', mixBlendMode: 'screen', filter: 'drop-shadow(0 0 60px rgba(251,191,36,.35))' }} />
    <div className="absolute bottom-10 left-9">
      <p className="ui-lab font-display" style={{ '--a': A }}>Tournament</p>
      <p className="mt-2 text-6xl font-black leading-none text-white">{SIZE}강 토너먼트</p>
      <p className="mt-3 text-lg text-gray-300">내 팀으로 치르는 단판 승부 · 네 번 이기면 우승</p>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="font-display text-[12px] tracking-[0.3em] text-gray-400">우승 상금</span>
        <b className="font-display text-4xl" style={GOLD}>{PRIZE} G</b>
      </div>
    </div>
  </div>
  <MySquad />
</>);

/* ── H2. 터널 워크아웃 ── */
const H2 = () => section(<>
  <div className="ui-cut relative min-h-0 flex-1 overflow-hidden bg-cover" style={{ ...cut(14), backgroundImage: 'url(ui/tour/tunnel.webp)', backgroundPosition: 'center 45%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.55),rgba(5,8,15,.15) 45%,#05080f)' }} />
    <div className="absolute inset-x-0 bottom-9 text-center">
      <p className="font-display text-[12px] tracking-[0.4em]" style={{ color: A }}>ROAD TO THE TITLE</p>
      <p className="mt-2 text-6xl font-black leading-none text-white">{SIZE}강 토너먼트</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        {ROUNDS.map((r, i) => (
          <React.Fragment key={r}>
            <span className="ui-cut px-4 py-1.5 font-display text-[15px] font-bold"
              style={{ ...cut(6), color: i === ROUNDS.length - 1 ? '#05080f' : '#e5e7eb', background: i === ROUNDS.length - 1 ? A : 'rgba(255,255,255,.08)' }}>{r}</span>
            {i < ROUNDS.length - 1 && <span className="font-display text-gray-600">›</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  </div>
  <MySquad />
</>);

/* ── H3. 배너 홀 + 상금 계단(글자만) ── */
const H3 = () => section(<>
  <div className="ui-cut relative min-h-0 flex-1 overflow-hidden bg-cover" style={{ ...cut(14), backgroundImage: 'url(ui/tour/banners.webp)', backgroundPosition: 'center 35%' }}>
    <span className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 40%,rgba(5,8,15,.1),rgba(5,8,15,.85))' }} />
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <span className="h-[200px] w-[200px] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(ui/tour/trophy.webp)', mixBlendMode: 'screen' }} />
      <p className="text-5xl font-black text-white">{SIZE}강 토너먼트</p>
      <p className="text-base text-gray-300">한 번 지면 끝나는 단판 승부</p>
      <div className="mt-2 flex gap-2">
        {[['우승', 960], ['준우승', 640], ['4강', 400]].map(([k, g]) => (
          <span key={k} className="ui-cut px-5 py-2 text-center" style={{ ...cut(8), background: 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${A}33` }}>
            <span className="block text-[12px] text-gray-400">{k}</span>
            <b className="font-display text-xl" style={GOLD}>{g} G</b>
          </span>
        ))}
      </div>
    </div>
  </div>
  <MySquad />
</>);

/* ── H4. 대진 실루엣 — 아직 상대가 없는 빈 대진 ── */
const H4 = () => section(<>
  <div className="ui-cut relative min-h-0 flex-1 overflow-hidden bg-cover" style={{ ...cut(14), backgroundImage: 'url(ui/tour/stadium.webp)', backgroundPosition: 'center 55%' }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.8),rgba(5,8,15,.6) 40%,#05080f)' }} />
    <div className="absolute inset-x-10 top-8">
      <p className="ui-lab font-display" style={{ '--a': A }}>Bracket</p>
      <p className="mt-1 text-4xl font-black text-white">{SIZE}강 토너먼트</p>
    </div>
    <div className="absolute inset-x-10 bottom-10 grid items-end gap-3" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
      {ROUNDS.map((r, i) => {
        const n = 8 / 2 ** i;
        return (
          <div key={r} className="flex flex-col gap-2">
            <span className="font-display text-[12px] tracking-[0.24em]" style={{ color: i === 3 ? A : '#6b7280' }}>{r}</span>
            {Array.from({ length: n }).map((_, k) => (
              <span key={k} className="ui-cut flex h-7 items-center px-2 text-[12px]"
                style={{ ...cut(5), color: i === 0 && k === 0 ? '#05080f' : '#64748b', background: i === 0 && k === 0 ? A : 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
                {i === 0 && k === 0 ? '나의 드림팀' : '?'}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  </div>
  <MySquad />
</>);

const V = [['1', '트로피 포스터', H1], ['2', '터널 워크아웃', H2], ['3', '배너 홀 + 상금', H3], ['4', '빈 대진표', H4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">토너먼트 시작 전 · 가운데 화면 4안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`} style={{ background: id === one ? A : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      <div className="flex gap-4" style={{ height: 807 }}>{pick[2]()}<Aside /></div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
