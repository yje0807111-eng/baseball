/* 감독 모드 — 가운데 떠 있던 vs 스코어를 상단 바로 올리는 8안 (헤더 아래 이닝표는 그대로) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';

const G = { away: { name: '2026 롯데 자이언츠', runs: 0, hits: 0, errors: 0, color: '#60a5fa' },
  home: { name: '나의 드림팀', runs: 0, hits: 0, errors: 0, color: '#10b981' }, inning: 1, top: true };
const MODES = ['보통', '자동', '스킵'];
const HEX = 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)';

const Badge = ({ t, who, h = 34, w = 30 }) => (
  <span className="grid shrink-0 place-items-center font-display text-[11px] font-extrabold text-[#05080f]" style={{ height: h, width: w, background: t.color, clipPath: HEX }}>{who}</span>
);
const Runs = ({ size = 30 }) => (
  <span className="font-display font-extrabold leading-none text-white" style={{ fontSize: size }}>
    {G.away.runs}<span className="mx-2 text-gray-600">-</span>{G.home.runs}
  </span>
);
const Inn = ({ cls = 'font-display text-[13px] font-extrabold tracking-[0.2em] text-yellow-300' }) => (
  <span className={cls}>{G.inning}회{G.top ? '초' : '말'}</span>
);
const Back = () => (
  <button type="button" className="mt-cut grid h-9 w-9 shrink-0 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]" style={{ '--c': '7px' }}>←</button>
);
const Title = ({ small = false }) => (
  <div className="shrink-0 leading-none">
    <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Manager Mode</p>
    <h1 className={`mt-1 font-black leading-none text-white ${small ? 'text-base' : 'text-xl'}`}>감독 모드</h1>
  </div>
);
const Live = () => (
  <span className="mt-cut shrink-0 bg-red-500 px-2 py-0.5 font-display text-xs font-bold tracking-[0.2em] text-[#05080f]" style={{ '--c': '4px' }}>
    <i className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#05080f] align-middle" />LIVE
  </span>
);
const Speed = () => (
  <div className="mt-cut mt-glass flex shrink-0 gap-1 p-1" style={{ '--c': '8px' }}>
    {MODES.map((m, i) => (
      <button key={m} type="button" className={`mt-cut px-3.5 py-1 font-display text-sm font-bold ${i === 0 ? 'bg-[#10b981] text-[#05080f]' : 'text-gray-400'}`} style={{ '--c': '5px' }}>{m}</button>
    ))}
  </div>
);
const Tip = () => <span className="hidden shrink-0 font-display text-[11px] tracking-[.18em] text-gray-500 xl:block">화면을 꾹 누르면 빨리감기</span>;
const Go = () => <button type="button" className="mt-btn sm shrink-0">계속 ▶</button>;

/* 헤더 아래 — 이닝표는 원래 자리에 그대로 둔다 */
const Line = () => (
  <table className="mt-cut mt-glass w-full border-collapse text-center font-display" style={{ '--c': '12px' }}>
    <thead><tr className="text-xs font-semibold text-gray-500"><th className="w-[200px] py-1 pl-4 text-left">TEAM</th>{Array.from({ length: 12 }, (_, i) => <th key={i} className="py-1">{i + 1}</th>)}<th>R</th><th>H</th><th>E</th></tr></thead>
    <tbody>
      {[G.away, G.home].map((t, r) => (
        <tr key={t.name} className="border-t border-white/[0.07]">
          <td className="w-[200px] py-1 pl-4 text-left text-[15px] font-extrabold text-white">{t.name}</td>
          {Array.from({ length: 12 }, (_, i) => (
            <td key={i} className={`py-1 text-[22px] text-gray-300 ${r === 0 && i === 0 ? 'bg-yellow-300/15 text-white' : ''}`}>{r === 0 && i === 0 ? 0 : '-'}</td>
          ))}
          <td className="text-[22px] font-extrabold text-yellow-300">{t.runs}</td>
          <td className="text-[22px] text-gray-300">{t.hits}</td>
          <td className="text-[22px] text-gray-300">{t.errors}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Frame = ({ head, h = 63 }) => (
  <div className="relative overflow-hidden" style={{ width: 1880, height: 560, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', opacity: 0.85 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.9) 0,rgba(3,5,10,.2) 22%,rgba(3,5,10,.12) 78%,rgba(3,5,10,.9) 100%), linear-gradient(180deg,rgba(3,5,10,.86) 0,rgba(3,5,10,0) 24%)' }} />
    <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: `${h}px auto 1fr` }}>
      <header className="relative col-span-3 -mx-5 flex items-center gap-6 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
        <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#10b981] to-transparent" />
        {head}
      </header>
      <div className="col-start-2 row-start-2 self-start"><Line /></div>
    </div>
  </div>
);

/* 1. 가운데 한 줄 — 팀 이름 · 점수 · 이닝이 헤더 한복판에 */
const V1 = () => (
  <Frame head={(
    <>
      <Back /><Title /><Live />
      <span className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-4">
        <Badge t={G.away} who="AI" />
        <b className="text-[17px] font-extrabold text-white">{G.away.name}</b>
        <Runs size={32} />
        <b className="text-[17px] font-extrabold text-white">{G.home.name}</b>
        <Badge t={G.home} who="MY" />
        <span className="ml-2 mt-cut bg-yellow-300/15 px-2.5 py-1" style={{ '--c': '5px' }}><Inn /></span>
      </span>
      <div className="ml-auto flex items-center gap-6"><Speed /><Tip /><Go /></div>
    </>
  )} />
);

/* 2. LIVE 옆에 붙이기 — 왼쪽에서 이어 읽는다 */
const V2 = () => (
  <Frame head={(
    <>
      <Back /><Title /><Live />
      <span className="mt-cut mt-glass flex items-center gap-3 px-3 py-1.5" style={{ '--c': '8px' }}>
        <Badge t={G.away} who="AI" h={28} w={24} />
        <b className="text-[15px] font-extrabold text-white">{G.away.name}</b>
        <Runs size={26} />
        <b className="text-[15px] font-extrabold text-white">{G.home.name}</b>
        <Badge t={G.home} who="MY" h={28} w={24} />
        <span className="ml-1 h-4 w-px bg-white/15" />
        <Inn />
      </span>
      <div className="ml-auto flex items-center gap-6"><Speed /><Tip /><Go /></div>
    </>
  )} />
);

/* 3. 점수만 크게 — 이름 대신 색 배지로 (가장 좁게 쓴다) */
const V3 = () => (
  <Frame head={(
    <>
      <Back /><Title /><Live />
      <span className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
        <Badge t={G.away} who="AI" h={38} w={34} />
        <Runs size={38} />
        <Badge t={G.home} who="MY" h={38} w={34} />
        <Inn cls="ml-2 font-display text-[15px] font-extrabold tracking-[0.2em] text-yellow-300" />
      </span>
      <div className="ml-auto flex items-center gap-6"><Speed /><Tip /><Go /></div>
    </>
  )} />
);

/* 4. 작은 판 하나 — 지금 스코어 카드를 그대로 줄여 헤더에 앉힌다 */
const V4 = () => (
  <Frame head={(
    <>
      <Back /><Title /><Live />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2">
        <span className="mt-cut mt-frame mt-glass flex items-center gap-4 px-6 py-1.5" style={{ '--c': '12px', '--a': '#fde047' }}>
          <Badge t={G.away} who="AI" h={30} w={26} />
          <b className="text-[16px] font-extrabold text-white">{G.away.name}</b>
          <Runs size={30} />
          <b className="text-[16px] font-extrabold text-white">{G.home.name}</b>
          <Badge t={G.home} who="MY" h={30} w={26} />
          <span className="h-4 w-px bg-white/15" />
          <Inn />
        </span>
      </span>
      <div className="ml-auto flex items-center gap-6"><Speed /><Tip /><Go /></div>
    </>
  )} />
);

/* 5. 모드 버튼 왼쪽에 — 오른쪽 조작 묶음과 한 덩어리로 */
const V5 = () => (
  <Frame head={(
    <>
      <Back /><Title /><Live />
      <div className="ml-auto flex items-center gap-5">
        <span className="flex items-center gap-2.5">
          <Badge t={G.away} who="AI" h={30} w={26} />
          <b className="text-[15px] font-extrabold text-white">{G.away.name}</b>
          <Runs size={28} />
          <b className="text-[15px] font-extrabold text-white">{G.home.name}</b>
          <Badge t={G.home} who="MY" h={30} w={26} />
          <span className="mt-cut bg-yellow-300/15 px-2 py-0.5" style={{ '--c': '4px' }}><Inn cls="font-display text-[12px] font-extrabold tracking-[0.2em] text-yellow-300" /></span>
        </span>
        <span className="h-7 w-px bg-white/12" />
        <Speed /><Go />
      </div>
    </>
  )} />
);

/* 6. 헤더를 조금 높여 두 줄 — 위에 이름, 아래에 점수와 이닝 */
const V6 = () => (
  <Frame h={80} head={(
    <>
      <Back /><Title /><Live />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center">
        <span className="flex items-center justify-center gap-3 font-display text-[12px] tracking-[0.2em] text-gray-400">
          <b className="text-[14px] font-extrabold tracking-normal text-white">{G.away.name}</b>
          <span>VS</span>
          <b className="text-[14px] font-extrabold tracking-normal text-white">{G.home.name}</b>
        </span>
        <span className="mt-0.5 flex items-center justify-center gap-3">
          <Badge t={G.away} who="AI" h={26} w={22} />
          <Runs size={30} />
          <Badge t={G.home} who="MY" h={26} w={22} />
          <Inn cls="ml-1 font-display text-[13px] font-extrabold tracking-[0.2em] text-yellow-300" />
        </span>
      </span>
      <div className="ml-auto flex items-center gap-6"><Speed /><Tip /><Go /></div>
    </>
  )} />
);

/* 7. 제목 자리를 내주고 — 감독 모드는 작게, 스코어가 머리글이 된다 */
const V7 = () => (
  <Frame head={(
    <>
      <Back /><Title small /><Live />
      <span className="ml-5 flex items-center gap-3.5 border-l border-white/12 pl-5">
        <Badge t={G.away} who="AI" h={34} w={30} />
        <b className="text-[18px] font-extrabold text-white">{G.away.name}</b>
        <Runs size={34} />
        <b className="text-[18px] font-extrabold text-white">{G.home.name}</b>
        <Badge t={G.home} who="MY" h={34} w={30} />
        <Inn cls="ml-1 font-display text-[14px] font-extrabold tracking-[0.2em] text-yellow-300" />
      </span>
      <div className="ml-auto flex items-center gap-6"><Speed /><Go /></div>
    </>
  )} />
);

/* 8. 이닝은 아래 띠로 — 헤더 경계에 작은 알약이 걸린다 */
const V8 = () => (
  <Frame head={(
    <>
      <Back /><Title /><Live />
      <span className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-4">
        <Badge t={G.away} who="AI" h={36} w={32} />
        <b className="text-[17px] font-extrabold text-white">{G.away.name}</b>
        <Runs size={34} />
        <b className="text-[17px] font-extrabold text-white">{G.home.name}</b>
        <Badge t={G.home} who="MY" h={36} w={32} />
      </span>
      <span className="pointer-events-none absolute -bottom-3 left-1/2 mt-cut -translate-x-1/2 bg-[#fde047] px-3 py-0.5" style={{ '--c': '4px' }}>
        <b className="font-display text-[12px] font-extrabold tracking-[0.2em] text-[#05080f]">{G.inning}회{G.top ? '초' : '말'}</b>
      </span>
      <div className="ml-auto flex items-center gap-6"><Speed /><Tip /><Go /></div>
    </>
  )} />
);

const V = [['1', '가운데 한 줄', V1], ['2', 'LIVE 옆에', V2], ['3', '점수만 크게', V3], ['4', '작은 판 하나', V4],
  ['5', '오른쪽 묶음', V5], ['6', '두 줄 헤더', V6], ['7', '제목 자리 내주기', V7], ['8', '이닝은 아래 띠', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">상단 바 스코어 · 8안</b>
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
