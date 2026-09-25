/* 감독 모드 — 왼쪽 위 스코어보드 8안 (가운데 회별 전광판 없음 · 이름 안 잘림 · B/S/O 세 줄) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';

const G = {
  away: { name: '2026 롯데 자이언츠', runs: 3, color: '#60a5fa' },
  home: { name: '나의 드림팀', runs: 2, color: '#10b981' },
  inning: 5, top: true, balls: 2, strikes: 1, outs: 1, bases: [true, false, true], pitches: 57,
  note: '레이예스 오늘 3타수 2안타 · 윤학길 상대 통산 .340',
};
const shortName = (s) => s.replace(/^\d{4}\s*/, ''); // 연도는 떼고 구단 이름만
const MODES = ['보통', '자동', '스킵'];
const HEX = 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)';

const Diamond = ({ size = 54 }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    <path d="M50 88 L86 52 L50 16 L14 52 Z" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
    {[[86, 52], [50, 16], [14, 52]].map(([x, y], i) => (
      <rect key={i} x={x - 8} y={y - 8} width="16" height="16" transform={`rotate(45 ${x} ${y})`}
        fill={G.bases[i] ? '#fde047' : 'rgba(255,255,255,.14)'} style={G.bases[i] ? { filter: 'drop-shadow(0 0 7px #fde047)' } : undefined} />
    ))}
    <rect x="45" y="83" width="10" height="10" transform="rotate(45 50 88)" fill="#fff" />
  </svg>
);
/* 볼 · 스트라이크 · 아웃 — 세 줄로 (경기 화면에 쓰던 그대로, 점만 조금 작게) */
const Bso = ({ dot = 11, gap = 5 }) => (
  <div className="grid items-center font-display text-[12px] font-extrabold" style={{ gridTemplateColumns: `14px repeat(3, ${dot}px)`, gap }}>
    <span className="text-emerald-400">B</span>
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.balls ? '#34d399' : 'rgba(255,255,255,.15)', boxShadow: i < G.balls ? '0 0 7px #34d399' : 'none' }} />)}
    <span className="text-yellow-300">S</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.strikes ? '#fde047' : 'rgba(255,255,255,.15)', boxShadow: i < G.strikes ? '0 0 7px #fde047' : 'none' }} />)}<span />
    <span className="text-red-400">O</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.outs ? '#ef4444' : 'rgba(255,255,255,.15)', boxShadow: i < G.outs ? '0 0 7px #ef4444' : 'none' }} />)}<span />
  </div>
);
const Inn = ({ size = 16 }) => (
  <span className="whitespace-nowrap font-display font-extrabold leading-none text-yellow-300" style={{ fontSize: size }}>
    {G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i>
  </span>
);
/* 두 줄 점수 — 이름이 잘리지 않게 폭을 넉넉히 준다 */
const Rows = ({ big = 22, pad = '' }) => (
  <div className={`flex flex-col gap-1 ${pad}`}>
    {[G.away, G.home].map((t, i) => (
      <div key={t.name} className="flex items-center gap-2.5 whitespace-nowrap">
        <span className="block h-5 w-1.5 shrink-0" style={{ background: t.color }} />
        <b className="text-[14px] font-extrabold text-white">{shortName(t.name)}</b>
        <b className="ml-auto pl-3 font-display font-extrabold leading-none" style={{ fontSize: big, color: i === 0 ? '#fff' : '#fde047' }}>{t.runs}</b>
      </div>
    ))}
  </div>
);
const Note = () => <p className="m-0 whitespace-nowrap px-3 py-1 text-[11.5px] text-gray-300">{G.note}</p>;

const Head = () => (
  <header className="relative col-span-3 -mx-5 flex items-center gap-6 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
    <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#10b981] to-transparent" />
    <button type="button" className="mt-cut grid h-9 w-9 shrink-0 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]" style={{ '--c': '7px' }}>←</button>
    <div className="shrink-0 leading-none">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Manager Mode</p>
      <h1 className="mt-1 text-xl font-black leading-none text-white">감독 모드</h1>
    </div>
    <span className="mt-cut shrink-0 bg-red-500 px-2 py-0.5 font-display text-xs font-bold tracking-[0.2em] text-[#05080f]" style={{ '--c': '4px' }}>
      <i className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#05080f] align-middle" />LIVE
    </span>
    <div className="ml-auto flex items-center gap-6">
      <div className="mt-cut mt-glass flex gap-1 p-1" style={{ '--c': '8px' }}>
        {MODES.map((m, i) => <button key={m} type="button" className={`mt-cut px-3.5 py-1 font-display text-sm font-bold ${i === 0 ? 'bg-[#10b981] text-[#05080f]' : 'text-gray-400'}`} style={{ '--c': '5px' }}>{m}</button>)}
      </div>
      <button type="button" className="mt-btn sm">계속 ▶</button>
    </div>
  </header>
);
/* 가운데 회별 전광판은 없앤다 — 화면이 열린다 */
const Frame = ({ board }) => (
  <div className="relative overflow-hidden" style={{ width: 1880, height: 620, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', opacity: 0.85 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.9) 0,rgba(3,5,10,.2) 22%,rgba(3,5,10,.12) 78%,rgba(3,5,10,.9) 100%), linear-gradient(180deg,rgba(3,5,10,.86) 0,rgba(3,5,10,0) 24%)' }} />
    <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: '63px auto 1fr' }}>
      <Head />
      <div className="col-start-1 row-start-2 self-start"><div className="inline-block">{board}</div></div>
      <div className="col-start-1 row-start-3 mt-3">
        <div className="mt-cut mt-glass grid h-[180px] w-[272px] place-items-center text-[13px] text-gray-500" style={{ '--c': '14px' }}>NOW PITCHING 카드</div>
      </div>
    </div>
  </div>
);

/* 1. 중계 그대로 — 위 띠 + 두 줄 점수 + 세로 카운트 + 주자 */
const V1 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden bg-[#05080f]/92 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <p className="m-0 whitespace-nowrap bg-white/[0.08] px-3 py-1 font-display text-[11px] font-bold tracking-[0.18em] text-gray-300">단판 · 1차전 · {G.inning}회{G.top ? '초' : '말'}</p>
      <div className="flex items-center gap-3.5 p-2.5">
        <Rows />
        <span className="self-stretch w-px bg-white/12" />
        <Bso />
        <Diamond />
      </div>
    </div>
  )} />
);

/* 2. 이닝 기둥 — 왼쪽에 회, 가운데 점수, 오른쪽 카운트와 주자 */
const V2 = () => (
  <Frame board={(
    <div className="mt-cut flex items-stretch overflow-hidden bg-[#05080f]/92 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <span className="grid w-10 shrink-0 place-items-center bg-yellow-300/15"><Inn size={18} /></span>
      <div className="flex items-center gap-3.5 px-3 py-2.5">
        <Rows />
        <span className="self-stretch w-px bg-white/12" />
        <Bso />
        <Diamond />
      </div>
    </div>
  )} />
);

/* 3. 이닝 기둥 + 아래 한 줄 설명 */
const V3 = () => (
  <Frame board={(
    <div className="mt-cut overflow-hidden bg-[#05080f]/92 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <div className="flex items-stretch">
        <span className="grid w-10 shrink-0 place-items-center bg-yellow-300/15"><Inn size={18} /></span>
        <div className="flex items-center gap-3.5 px-3 py-2.5">
          <Rows />
          <span className="self-stretch w-px bg-white/12" />
          <Bso />
          <Diamond />
        </div>
      </div>
      <div className="border-t border-white/10 bg-white/[0.05]"><Note /></div>
    </div>
  )} />
);

/* 4. 팀 색 바탕 — 두 줄이 각자 색을 깔고, 오른쪽에 카운트와 주자 */
const V4 = () => (
  <Frame board={(
    <div className="mt-cut flex items-center gap-3.5 overflow-hidden bg-[#05080f]/92 p-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <div className="flex flex-col gap-1">
        {[G.away, G.home].map((t, i) => (
          <div key={t.name} className="mt-cut flex items-center gap-2.5 whitespace-nowrap px-2 py-1" style={{ '--c': '4px', background: `linear-gradient(90deg,${t.color}33,transparent 70%)` }}>
            <span className="block h-5 w-1.5 shrink-0" style={{ background: t.color }} />
            <b className="text-[14px] font-extrabold text-white">{shortName(t.name)}</b>
            <b className="ml-auto pl-3 font-display text-[22px] font-extrabold leading-none" style={{ color: i === 0 ? '#fff' : '#fde047' }}>{t.runs}</b>
          </div>
        ))}
      </div>
      <span className="self-stretch w-px bg-white/12" />
      <div className="flex flex-col items-center gap-1"><Inn size={15} /><Bso dot={10} /></div>
      <Diamond />
    </div>
  )} />
);

/* 5. 우리 판 결 — 유리판에 담고 이닝은 노란 칩으로 */
const V5 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass p-3" style={{ '--c': '12px', '--a': '#fde047' }}>
      <div className="mb-2 flex items-center gap-2 whitespace-nowrap">
        <span className="mt-cut bg-[#fde047] px-2 py-0.5 font-display text-[11px] font-extrabold text-[#05080f]" style={{ '--c': '4px' }}>{G.inning}회{G.top ? '초' : '말'}</span>
        <b className="font-display text-[11px] tracking-[0.18em] text-gray-400">투구 {G.pitches}</b>
      </div>
      <div className="flex items-center gap-3.5">
        <Rows />
        <span className="self-stretch w-px bg-white/12" />
        <Bso />
        <Diamond />
      </div>
    </div>
  )} />
);

/* 6. 두 칸 — 위는 점수, 아래는 카운트와 주자 */
const V6 = () => (
  <Frame board={(
    <div className="flex flex-col gap-1.5">
      <div className="mt-cut overflow-hidden bg-[#05080f]/92 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
        <div className="flex items-center gap-2 whitespace-nowrap bg-white/[0.08] px-3 py-1">
          <Inn size={14} /><b className="font-display text-[11px] tracking-[0.18em] text-gray-300">단판 · 1차전</b>
        </div>
        <div className="px-3 py-2.5"><Rows big={24} /></div>
      </div>
      <div className="mt-cut flex items-center gap-4 bg-[#05080f]/92 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
        <Bso /><Diamond size={50} /><b className="ml-auto font-display text-[11px] text-gray-400">투구 {G.pitches}</b>
      </div>
    </div>
  )} />
);

/* 7. 주자를 왼쪽에 크게 — 오른쪽에 이닝 · 점수 · 카운트 */
const V7 = () => (
  <Frame board={(
    <div className="mt-cut flex items-center gap-3 bg-[#05080f]/92 p-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <Diamond size={72} />
      <span className="self-stretch w-px bg-white/12" />
      <div>
        <div className="mb-1 flex items-center gap-2 whitespace-nowrap"><Inn size={15} /><b className="font-display text-[11px] tracking-[0.18em] text-gray-400">투구 {G.pitches}</b></div>
        <Rows big={20} />
      </div>
      <span className="self-stretch w-px bg-white/12" />
      <Bso />
    </div>
  )} />
);

/* 8. 배지형 — AI · MY 육각 배지에 점수, 오른쪽에 카운트와 주자 */
const V8 = () => (
  <Frame board={(
    <div className="mt-cut flex items-center gap-3.5 bg-[#05080f]/92 p-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '10px' }}>
      <div className="flex flex-col gap-1">
        {[[G.away, 'AI'], [G.home, 'MY']].map(([t, who], i) => (
          <div key={who} className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="grid h-6 w-[22px] shrink-0 place-items-center font-display text-[10px] font-extrabold text-[#05080f]" style={{ background: t.color, clipPath: HEX }}>{who}</span>
            <b className="text-[14px] font-extrabold text-white">{shortName(t.name)}</b>
            <b className="ml-auto pl-3 font-display text-[22px] font-extrabold leading-none" style={{ color: i === 0 ? '#fff' : '#fde047' }}>{t.runs}</b>
          </div>
        ))}
      </div>
      <span className="self-stretch w-px bg-white/12" />
      <div className="flex flex-col items-center gap-1"><Inn size={15} /><Bso dot={10} /></div>
      <Diamond />
    </div>
  )} />
);

const V = [['1', '중계 그대로', V1], ['2', '이닝 기둥', V2], ['3', '이닝 기둥 + 설명', V3], ['4', '팀 색 바탕', V4],
  ['5', '유리판', V5], ['6', '두 칸', V6], ['7', '주자 크게', V7], ['8', '배지형', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">왼쪽 위 스코어보드 · 8안 (전광판 없음)</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? '#10b981' : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      <Cur />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
