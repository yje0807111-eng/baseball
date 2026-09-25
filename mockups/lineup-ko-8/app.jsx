/* 감독 모드 오른쪽 타순 — 오늘 성적을 한글로 짧게(무안타 · 1안타 · 볼넷) 새 4안 + 기존 결 4안 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';

const ME = '#34d399', ON = '#f97316';
const LINEUP = [
  { n: 1, name: '정수빈', ovr: 77, ko: '1안타', on: 1 },
  { n: 2, name: '허경민', ovr: 79, ko: '무안타' },
  { n: 3, name: '김재환', ovr: 88, ko: '2루타', on: 3 },
  { n: 4, name: '양의지', ovr: 90, ko: '1안타' },
  { n: 5, name: '박건우', ovr: 83, ko: '무안타' },
  { n: 6, name: '김재현', ovr: 78, ko: '1안타', at: true },
  { n: 7, name: '김강민', ovr: 78, ko: '삼진' },
  { n: 8, name: '이진영', ovr: 78, ko: '볼넷' },
  { n: 9, name: '오재원', ovr: 74, ko: '무안타' },
];
const tone = (o) => (o >= 88 ? '#fde047' : o >= 82 ? '#34d399' : o >= 76 ? '#7dd3fc' : '#94a3b8');
const state = (p) => (p.at ? 'at' : p.on ? 'on' : 'wait');
const dim = (p) => (state(p) === 'wait' ? 0.42 : 1);
/* 성적 글자색 — 잘 친 날은 밝게 */
const koColor = (ko) => (/홈런|루타/.test(ko) ? '#fde047' : /안타/.test(ko) && !/무/.test(ko) ? '#a7f3d0' : /볼넷/.test(ko) ? '#93c5fd' : 'rgba(255,255,255,.45)');

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
  </header>
);
const Frame = ({ panel }) => (
  <div className="relative overflow-hidden" style={{ width: 1880, height: 620, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', opacity: 0.9 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.8) 0,rgba(3,5,10,.15) 24%,rgba(3,5,10,.15) 74%,rgba(3,5,10,.9) 100%), linear-gradient(180deg,rgba(3,5,10,.86) 0,rgba(3,5,10,0) 24%)' }} />
    <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: '63px auto 1fr' }}>
      <Head />
      <div className="col-start-3 row-start-2 self-start">{panel}</div>
    </div>
  </div>
);
const Panel = ({ children, lab = 'Batting Order', pad = 'p-3' }) => (
  <div className={`mt-cut mt-frame mt-glass ${pad}`} style={{ '--c': '16px', '--a': ME }}>
    <p className="mt-lab mb-2" style={{ '--a': ME }}>{lab}</p>
    {children}
  </div>
);
const OnBase = ({ size = 8 }) => (
  <span className="inline-block shrink-0" style={{ width: size, height: size, background: ON, transform: 'rotate(45deg)', borderRadius: 2 }} />
);

/* ───────── 새로 짠 네 가지 ───────── */

/* 1. 타석은 위에 큰 카드, 나머지는 촘촘한 목록 */
const N1 = () => {
  const at = LINEUP.find((p) => p.at);
  return (
    <Frame panel={(
      <Panel>
        <div className="ui-cut mb-2 flex items-center gap-3 px-3 py-2.5" style={{ '--c': '9px', background: `${ME}22`, boxShadow: `inset 0 0 0 1px ${ME}` }}>
          <b className="font-display text-[30px] font-extrabold leading-none" style={{ color: ME }}>{at.n}</b>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[19px] text-white">{at.name}</b>
            <span className="block truncate text-[12px]" style={{ color: koColor(at.ko) }}>오늘 {at.ko}</span>
          </span>
          <b className="font-display text-[22px]" style={{ color: tone(at.ovr) }}>{at.ovr}</b>
        </div>
        <div className="flex flex-col">
          {LINEUP.filter((p) => !p.at).map((p) => (
            <div key={p.n} className="flex items-center gap-2 border-t border-white/[0.07] px-1.5 py-[5px]" style={{ opacity: dim(p) }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-500">{p.n}</b>
              <b className="truncate text-[13.5px] text-white">{p.name}</b>
              {p.on && <OnBase />}
              <span className="ml-auto w-12 shrink-0 text-right text-[11.5px]" style={{ color: koColor(p.ko) }}>{p.ko}</span>
              <b className="w-7 shrink-0 text-right font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          ))}
        </div>
      </Panel>
    )} />
  );
};

/* 2. 세 줄 격자 — 아홉 칸이 한눈에 */
const N2 = () => (
  <Frame panel={(
    <Panel>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut relative px-2 py-1.5" style={{ '--c': '6px', opacity: dim(p), background: s === 'at' ? `${ME}26` : s === 'on' ? 'rgba(249,115,22,.16)' : 'rgba(255,255,255,.05)', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : 'none' }}>
              <span className="flex items-center gap-1">
                <b className="font-display text-[10.5px] text-gray-400">{p.n}</b>
                <b className={`truncate text-white ${s === 'at' ? 'text-[14px]' : 'text-[12.5px]'}`}>{p.name}</b>
              </span>
              <span className="mt-0.5 flex items-center justify-between">
                <span className="truncate text-[10.5px]" style={{ color: koColor(p.ko) }}>{p.ko}</span>
                <b className="font-display text-[12px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 3. 타순 흐름 — 왼쪽 세로 선을 따라 점이 내려온다 */
const N3 = () => (
  <Frame panel={(
    <Panel>
      <div className="relative pl-5">
        <i className="absolute bottom-3 left-[7px] top-3 w-px bg-white/15" />
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="relative flex items-center gap-2 py-[5px]" style={{ height: s === 'at' ? 42 : 28, opacity: dim(p) }}>
              <i className="absolute rounded-full" style={{ left: -18, width: s === 'at' ? 13 : 8, height: s === 'at' ? 13 : 8, background: s === 'at' ? ME : s === 'on' ? ON : 'rgba(255,255,255,.22)', boxShadow: s === 'at' ? `0 0 0 3px ${ME}33` : 'none' }} />
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-500">{p.n}</b>
              <b className={`truncate text-white ${s === 'at' ? 'text-[17px] font-black' : 'text-[13.5px]'}`}>{p.name}</b>
              <span className="ml-auto w-12 shrink-0 text-right text-[11.5px]" style={{ color: koColor(p.ko) }}>{p.ko}</span>
              <b className={`w-7 shrink-0 text-right font-display ${s === 'at' ? 'text-[18px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 4. 나가 있는 선수를 위에 따로 — 그 아래 타순 */
const N4 = () => {
  const on = LINEUP.filter((p) => p.on);
  return (
    <Frame panel={(
      <Panel>
        <div className="ui-cut mb-2 flex flex-wrap items-center gap-1.5 px-2.5 py-1.5" style={{ '--c': '6px', background: 'rgba(249,115,22,.14)' }}>
          <span className="font-display text-[10px] tracking-[0.18em] text-[#fdba74]">ON BASE</span>
          {on.map((p) => (
            <span key={p.n} className="flex items-center gap-1 text-[12.5px] text-white"><OnBase size={7} />{p.name}<i className="not-italic text-[10.5px] text-[#fdba74]">{p.on}루</i></span>
          ))}
        </div>
        <div className="flex flex-col gap-[3px]">
          {LINEUP.map((p) => {
            const s = state(p);
            return (
              <div key={p.n} className="ui-cut flex items-center gap-2 px-2.5" style={{ '--c': '5px', height: s === 'at' ? 42 : 27, opacity: dim(p), background: s === 'at' ? `${ME}26` : 'rgba(255,255,255,.05)', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : 'none' }}>
                <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-400">{p.n}</b>
                <b className={`truncate text-white ${s === 'at' ? 'text-[16px]' : 'text-[13px]'}`}>{p.name}</b>
                <span className="ml-auto w-12 shrink-0 text-right text-[11px]" style={{ color: koColor(p.ko) }}>{p.ko}</span>
                <b className="w-7 shrink-0 text-right font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
              </div>
            );
          })}
        </div>
      </Panel>
    )} />
  );
};

/* ───────── 기존 결 네 가지 (표기만 한글 축약) ───────── */
const Rows = ({ mode }) => (
  <div className={`flex flex-col ${mode === 'line' ? '' : 'gap-[3px]'}`}>
    {LINEUP.map((p, i) => {
      const s = state(p);
      const box = mode === 'box';
      const bar = mode === 'bar';
      const dot = mode === 'dot';
      return (
        <div key={p.n}
          className={`flex items-center gap-2 ${box ? 'ui-cut px-2.5' : bar ? 'relative pl-3 pr-1' : dot ? 'px-1' : `px-1.5 ${i ? 'border-t border-white/[0.07]' : ''}`}`}
          style={{ '--c': '5px', height: s === 'at' ? 44 : 29, opacity: dim(p),
            background: box ? (s === 'at' ? `${ME}26` : s === 'on' ? 'rgba(249,115,22,.14)' : 'rgba(255,255,255,.05)') : undefined,
            boxShadow: box && s === 'at' ? `inset 0 0 0 1px ${ME}` : undefined }}>
          {bar && s !== 'wait' && <i className="absolute inset-y-[3px] left-0 w-[3px] rounded-full" style={{ background: s === 'at' ? ME : ON }} />}
          {dot && <i className="shrink-0 rounded-full" style={{ width: 7, height: 7, background: s === 'at' ? ME : s === 'on' ? ON : 'rgba(255,255,255,.18)' }} />}
          <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-500">{p.n}</b>
          <b className={`truncate text-white ${s === 'at' ? 'text-[17px]' : 'text-[13.5px]'}`}>{p.name}</b>
          {(box || mode === 'line') && p.on && <OnBase />}
          <span className="ml-auto w-12 shrink-0 text-right text-[11.5px]" style={{ color: koColor(p.ko) }}>{p.ko}</span>
          <b className={`w-7 shrink-0 text-right font-display ${s === 'at' ? 'text-[18px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
        </div>
      );
    })}
  </div>
);
const K1 = () => <Frame panel={<Panel><Rows mode="box" /></Panel>} />;
const K2 = () => <Frame panel={<Panel><Rows mode="bar" /></Panel>} />;
const K3 = () => <Frame panel={<Panel><Rows mode="line" /></Panel>} />;
const K4 = () => <Frame panel={<Panel><Rows mode="dot" /></Panel>} />;

const V = [['1', '타석 카드 + 목록', N1], ['2', '세 줄 격자', N2], ['3', '타순 흐름선', N3], ['4', '나가 있는 선수 위로', N4],
  ['5', '칸 배경', K1], ['6', '왼쪽 띠', K2], ['7', '선만', K3], ['8', '색 점', K4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">타순 · 한글 축약 8안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? '#10b981' : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
        <span className="ml-2 text-[12px] text-gray-500">1~4 새 디자인 · 5~8 지금 결</span>
      </div>
      <Cur />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
