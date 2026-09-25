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

/* 1번(얇은 줄 + 타석만 확대)에서 마감만 달리한 여덟 가지 */
const short = (s) => s.replace('타수 ', '-').replace('안타', '').replace('무', '0').replace(/\s*\d+타점/, '').trim();

/* 1. 기준을 정돈 — 간격과 글자 크기만 손봤다 */
const V1 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-[3px]">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut flex items-center gap-2 px-2.5" style={{ '--c': '5px', height: s === 'at' ? 44 : 29, opacity: dim(p), background: s === 'at' ? `${ME}26` : s === 'on' ? 'rgba(249,115,22,.14)' : 'rgba(255,255,255,.05)', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : 'none' }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-400">{p.n}</b>
              <b className={`truncate text-white ${s === 'at' ? 'text-[17px]' : 'text-[13.5px]'}`}>{p.name}</b>
              {p.on && <OnBase p={p} size={8} />}
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className={`shrink-0 font-display ${s === 'at' ? 'text-[18px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 2. 배경 대신 왼쪽 굵은 띠로 표시 */
const V2 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-[3px]">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="relative flex items-center gap-2 pl-3 pr-1" style={{ height: s === 'at' ? 44 : 29, opacity: dim(p) }}>
              {s !== 'wait' && <i className="absolute inset-y-[3px] left-0 w-[3px] rounded-full" style={{ background: s === 'at' ? ME : '#f97316' }} />}
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-500">{p.n}</b>
              <b className={`truncate text-white ${s === 'at' ? 'text-[17px]' : 'text-[13.5px]'}`}>{p.name}</b>
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className={`shrink-0 font-display ${s === 'at' ? 'text-[18px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 3. 출루한 줄에 베이스 숫자를 붙인다 */
const V3 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-[3px]">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut flex items-center gap-2 px-2.5" style={{ '--c': '5px', height: s === 'at' ? 44 : 29, opacity: dim(p), background: s === 'at' ? `${ME}26` : 'rgba(255,255,255,.05)', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : s === 'on' ? 'inset 0 0 0 1px rgba(249,115,22,.55)' : 'none' }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-400">{p.n}</b>
              <b className={`truncate text-white ${s === 'at' ? 'text-[17px]' : 'text-[13.5px]'}`}>{p.name}</b>
              {p.on && <b className="shrink-0 font-display text-[11px] font-extrabold text-[#f97316]">{p.on}B</b>}
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className={`shrink-0 font-display ${s === 'at' ? 'text-[18px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 4. 성적을 짧은 꼴로 — 오른쪽 폭이 일정해진다 */
const V4 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-[3px]">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut flex items-center gap-2 px-2.5" style={{ '--c': '5px', height: s === 'at' ? 44 : 29, opacity: dim(p), background: s === 'at' ? `${ME}26` : s === 'on' ? 'rgba(249,115,22,.14)' : 'rgba(255,255,255,.05)', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : 'none' }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-400">{p.n}</b>
              <b className={`min-w-0 flex-1 truncate text-white ${s === 'at' ? 'text-[17px]' : 'text-[13.5px]'}`}>{p.name}</b>
              {p.on && <OnBase p={p} size={8} />}
              <span className="w-8 shrink-0 text-right font-display text-[12px] text-gray-300">{short(p.line)}</span>
              <b className={`w-7 shrink-0 text-right font-display ${s === 'at' ? 'text-[18px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 5. 칸 없이 줄만 — 사이에 아주 얇은 선 */
const V5 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col">
        {LINEUP.map((p, i) => {
          const s = state(p);
          return (
            <div key={p.n} className={`flex items-center gap-2 px-1.5 ${i ? 'border-t border-white/[0.07]' : ''}`} style={{ height: s === 'at' ? 44 : 30, opacity: dim(p) }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-500">{p.n}</b>
              <b className={`truncate ${s === 'at' ? 'text-[17px] text-white' : 'text-[13.5px] text-gray-100'}`}>{p.name}</b>
              {p.on && <OnBase p={p} size={8} />}
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className={`shrink-0 font-display ${s === 'at' ? 'text-[18px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 6. 타석 줄에 큰 타순 숫자 */
const V6 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-[3px]">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut flex items-center gap-2.5 px-2.5" style={{ '--c': '5px', height: s === 'at' ? 46 : 29, opacity: dim(p), background: s === 'at' ? `${ME}26` : s === 'on' ? 'rgba(249,115,22,.14)' : 'rgba(255,255,255,.05)', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : 'none' }}>
              <b className="shrink-0 font-display font-extrabold leading-none" style={{ fontSize: s === 'at' ? 24 : 12, width: s === 'at' ? 22 : 14, color: s === 'at' ? ME : '#94a3b8' }}>{p.n}</b>
              <b className={`truncate text-white ${s === 'at' ? 'text-[17px]' : 'text-[13.5px]'}`}>{p.name}</b>
              {p.on && <OnBase p={p} size={8} />}
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className={`shrink-0 font-display ${s === 'at' ? 'text-[18px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 7. 차이를 더 크게 — 타석은 더 크게, 대기는 더 흐리게 */
const V7 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-[3px]">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="ui-cut flex items-center gap-2 px-2.5" style={{ '--c': '5px', height: s === 'at' ? 52 : 27, opacity: s === 'wait' ? 0.32 : 1, background: s === 'at' ? `${ME}2e` : s === 'on' ? 'rgba(249,115,22,.16)' : 'rgba(255,255,255,.04)', boxShadow: s === 'at' ? `inset 0 0 0 1px ${ME}` : 'none' }}>
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-400">{p.n}</b>
              <b className={`truncate text-white ${s === 'at' ? 'text-[19px] font-black' : 'text-[13px]'}`}>{p.name}</b>
              {p.on && <OnBase p={p} size={8} />}
              <span className={`ml-auto truncate text-gray-400 ${s === 'at' ? 'text-[12px]' : 'text-[10.5px]'}`}>{p.line}</span>
              <b className={`shrink-0 font-display ${s === 'at' ? 'text-[20px]' : 'text-[12.5px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

/* 8. 색 점 하나로 — 배경 없이 글자 굵기로만 가른다 */
const V8 = () => (
  <Frame panel={(
    <Panel>
      <div className="flex flex-col gap-1">
        {LINEUP.map((p) => {
          const s = state(p);
          return (
            <div key={p.n} className="flex items-center gap-2 px-1" style={{ height: s === 'at' ? 42 : 28, opacity: dim(p) }}>
              <i className="shrink-0 rounded-full" style={{ width: 7, height: 7, background: s === 'at' ? ME : s === 'on' ? '#f97316' : 'rgba(255,255,255,.18)' }} />
              <b className="w-3.5 shrink-0 font-display text-[12px] text-gray-500">{p.n}</b>
              <b className={`truncate ${s === 'at' ? 'text-[18px] font-black text-white' : 'text-[13.5px] font-semibold text-gray-100'}`}>{p.name}</b>
              <span className="ml-auto truncate text-[11px] text-gray-400">{p.line}</span>
              <b className={`shrink-0 font-display ${s === 'at' ? 'text-[19px]' : 'text-[13px]'}`} style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          );
        })}
      </div>
    </Panel>
  )} />
);

const V = [['1', '정돈', V1], ['2', '왼쪽 띠', V2], ['3', '베이스 숫자', V3], ['4', '짧은 성적', V4],
  ['5', '선만', V5], ['6', '큰 타순 숫자', V6], ['7', '차이 크게', V7], ['8', '색 점 하나', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">타순 구역 추가 · 8안</b>
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
