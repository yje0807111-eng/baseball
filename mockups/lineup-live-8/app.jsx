/* 감독 모드 오른쪽 — 공격 팀 타순 아홉 줄 (타석은 크게 · 출루는 색 유지 · 대기는 흐리게) 8안 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';

const ME = '#34d399';
/* 타순 아홉 — at: 지금 타석 / on: 나가 있는 베이스(1·2·3) */
const LINEUP = [
  { n: 1, name: '정수빈', ovr: 77, line: '2타수 1안타', on: 1 },
  { n: 2, name: '허경민', ovr: 79, line: '2타수 무안타' },
  { n: 3, name: '김재환', ovr: 88, line: '1타수 1안타', on: 3 },
  { n: 4, name: '양의지', ovr: 90, line: '2타수 1안타 1타점' },
  { n: 5, name: '박건우', ovr: 83, line: '2타수 무안타' },
  { n: 6, name: '김재현', ovr: 78, line: '1타수 1안타', at: true },
  { n: 7, name: '김강민', ovr: 78, line: '1타수 무안타' },
  { n: 8, name: '이진영', ovr: 78, line: '볼넷' },
  { n: 9, name: '오재원', ovr: 74, line: '1타수 무안타' },
];
const BASE_KO = { 1: '1루', 2: '2루', 3: '3루' };
const tone = (o) => (o >= 88 ? '#fde047' : o >= 82 ? '#34d399' : o >= 76 ? '#7dd3fc' : '#94a3b8');
const state = (p) => (p.at ? 'at' : p.on ? 'on' : 'wait');
const dim = (p) => (state(p) === 'wait' ? 0.42 : 1);

/* 화면 틀 — 오른쪽 열에 놓고 본다 */
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
const Panel = ({ children, pad = 'p-3' }) => (
  <div className={`mt-cut mt-frame mt-glass ${pad}`} style={{ '--c': '16px', '--a': ME }}>
    <p className="mt-lab mb-2" style={{ '--a': ME }}>Batting Order</p>
    {children}
  </div>
);
const OnBase = ({ p, size = 9 }) => (
  <span className="inline-block shrink-0" style={{ width: size, height: size, background: '#f97316', transform: 'rotate(45deg)', borderRadius: 2 }} title={BASE_KO[p.on]} />
);

/* 1. 기본 — 얇은 줄 아홉, 타석만 키운다 */
const V1 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-1">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut flex items-center gap-2 px-2.5" style={{ '--c': '5px', height: s === 'at' ? 46 : 30, opacity: dim(p), background: s === 'at' ? `${ME}26` : s === 'on' ? 'rgba(249,115,22,.14)' : 'rgba(255,255,255,.05)', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : 'none' }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-400">{p.n}</b>
              <b className={`truncate text-white ${s === 'at' ? 'text-[16px]' : 'text-[13px]'}`}>{p.name}</b>
              {p.on && <OnBase p={p} />}
              <span className={`ml-auto truncate text-gray-400 ${s === 'at' ? 'text-[12px]' : 'text-[11px]'}`}>{p.line}</span>
              <b className={`shrink-0 font-display ${s === 'at' ? 'text-[17px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 2. 타석 줄에 큰 숫자와 두 줄 글 */
const V2 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-1">
        {LINEUP.map((p) => {
          const s = state(p);
          if (s === 'at') {
            return (
              <div key={p.n} className="ui-cut flex items-center gap-2.5 px-3 py-2" style={{ '--c': '7px', background: `${ME}26`, boxShadow: `inset 0 0 0 1px ${ME}` }}>
                <b className="font-display text-[26px] font-extrabold leading-none" style={{ color: ME }}>{p.n}</b>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[17px] text-white">{p.name}</b>
                  <span className="block truncate text-[11.5px] text-gray-300">{p.line}</span>
                </span>
                <b className="font-display text-[20px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
              </div>
            );
          }
          return (
            <div key={p.n} className="flex items-center gap-2 px-2.5 py-1" style={{ opacity: dim(p) }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-500">{p.n}</b>
              <b className="truncate text-[13px] text-white">{p.name}</b>
              {p.on && <OnBase p={p} />}
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className="shrink-0 font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 3. 왼쪽에 타순 기둥 — 지금 차례에 불이 들어온다 */
const V3 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-1">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut flex items-stretch overflow-hidden" style={{ '--c': '5px', height: s === 'at' ? 44 : 30, opacity: dim(p), background: 'rgba(255,255,255,.05)' }}>
              <span className="grid w-7 shrink-0 place-items-center font-display text-[13px] font-extrabold"
                style={{ background: s === 'at' ? ME : s === 'on' ? '#f97316' : 'rgba(255,255,255,.08)', color: s === 'wait' ? '#94a3b8' : '#05080f' }}>{p.n}</span>
              <span className="flex min-w-0 flex-1 items-center gap-2 px-2.5">
                <b className={`truncate text-white ${s === 'at' ? 'text-[16px]' : 'text-[13px]'}`}>{p.name}</b>
                <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
                <b className="shrink-0 font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 4. 출루는 오른쪽에 베이스 글자로 */
const V4 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-1">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut flex items-center gap-2 px-2.5" style={{ '--c': '5px', height: s === 'at' ? 46 : 31, opacity: dim(p), background: s === 'at' ? `${ME}26` : 'rgba(255,255,255,.05)', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : 'none' }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-400">{p.n}</b>
              <b className={`truncate text-white ${s === 'at' ? 'text-[16px]' : 'text-[13px]'}`}>{p.name}</b>
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className="shrink-0 font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
              {p.on ? (
                <span className="ui-cut shrink-0 px-1.5 py-0.5 font-display text-[10px] font-extrabold text-[#05080f]" style={{ '--c': '3px', background: '#f97316' }}>{BASE_KO[p.on]}</span>
              ) : <span className="w-[26px] shrink-0" />}
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 5. 타석은 따로 위 카드로, 아래는 목록 */
const V5 = () => {
  const at = LINEUP.find((p) => p.at);
  return (
    <Frame panel={(
      <Panel>
        <div className="ui-cut mb-2 flex items-center gap-3 px-3 py-2.5" style={{ '--c': '9px', background: `${ME}22`, boxShadow: `inset 0 0 0 1px ${ME}` }}>
          <b className="font-display text-[30px] font-extrabold leading-none" style={{ color: ME }}>{at.n}</b>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[19px] text-white">{at.name}</b>
            <span className="block truncate text-[12px] text-gray-300">{at.line}</span>
          </span>
          <b className="font-display text-[22px]" style={{ color: tone(at.ovr) }}>{at.ovr}</b>
        </div>
        <div className="flex flex-col">
          {LINEUP.filter((p) => !p.at).map((p) => (
            <div key={p.n} className="flex items-center gap-2 border-t border-white/[0.07] px-2 py-1" style={{ opacity: dim(p) }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-500">{p.n}</b>
              <b className="truncate text-[13px] text-white">{p.name}</b>
              {p.on && <OnBase p={p} size={8} />}
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className="shrink-0 font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          ))}
        </div>
      </Panel>
    )} />
  );
};

/* 6. 높이는 같게, 타석만 색 띠와 큰 글씨 */
const V6 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="relative flex items-center gap-2 border-b border-white/[0.06] px-2.5" style={{ height: 34, opacity: dim(p) }}>
              {s !== 'wait' && <i className="absolute inset-y-0 left-0 w-1" style={{ background: s === 'at' ? ME : '#f97316' }} />}
              <b className="w-3.5 shrink-0 pl-1 font-display text-[12px] text-gray-500">{p.n}</b>
              <b className={`truncate text-white ${s === 'at' ? 'text-[16px] font-black' : 'text-[13px]'}`}>{p.name}</b>
              {p.on && <OnBase p={p} size={8} />}
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className="shrink-0 font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 7. 타순을 동그라미로 — 지금 차례가 가득 찬다 */
const V7 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-1">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="flex items-center gap-2.5 px-1" style={{ height: s === 'at' ? 42 : 30, opacity: dim(p) }}>
              <span className="grid shrink-0 place-items-center rounded-full font-display text-[12px] font-extrabold"
                style={{ width: 22, height: 22, background: s === 'at' ? ME : 'transparent', color: s === 'at' ? '#05080f' : s === 'on' ? '#f97316' : '#94a3b8', boxShadow: s === 'at' ? 'none' : `inset 0 0 0 1.5px ${s === 'on' ? '#f97316' : 'rgba(255,255,255,.22)'}` }}>{p.n}</span>
              <b className={`truncate text-white ${s === 'at' ? 'text-[16px]' : 'text-[13px]'}`}>{p.name}</b>
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className="shrink-0 font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 8. 성적을 아래 줄로 내려 이름을 크게 */
const V8 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-1">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut flex items-center gap-2.5 px-2.5 py-1" style={{ '--c': '5px', opacity: dim(p), background: s === 'at' ? `${ME}26` : s === 'on' ? 'rgba(249,115,22,.12)' : 'transparent', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : 'none' }}>
              <b className="w-4 shrink-0 font-display text-[13px] text-gray-400">{p.n}</b>
              <span className="min-w-0 flex-1">
                <b className={`block truncate text-white ${s === 'at' ? 'text-[17px]' : 'text-[14px]'}`}>{p.name}{p.on ? <i className="ml-1.5 not-italic text-[11px] text-[#f97316]">{BASE_KO[p.on]}</i> : null}</b>
                <span className="block truncate text-[11px] text-gray-400">{p.line}</span>
              </span>
              <b className={`shrink-0 font-display ${s === 'at' ? 'text-[19px]' : 'text-[14px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

const V = [['1', '얇은 줄', V1], ['2', '타석 두 줄', V2], ['3', '타순 기둥', V3], ['4', '베이스 글자', V4],
  ['5', '타석 따로 위', V5], ['6', '높이 같게', V6], ['7', '동그라미 타순', V7], ['8', '이름 크게 · 성적 아래', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">타순 구역 · 8안</b>
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
