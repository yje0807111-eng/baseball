/* 감독 모드 — 오른쪽을 비우고 왼쪽에 스코어보드 + 타순을 함께 두는 16안 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { teamFlag } from '/src/myteam/teamArt.js';

const ME = '#34d399', ON = '#f97316', INK = '#0b1220';
const PAPER = 'rgba(199,206,217,.95)';
const MASK = 'linear-gradient(90deg,transparent 8%,#000 88%)';
const SHORT = { kia: 'KIA', doosan: '두산', samsung: '삼성', hanwha: '한화', lg: 'LG', lotte: '롯데', nc: 'NC', kt: 'KT', hyundai: '현대', sk: 'SSG', kiwoom: '키움', korea: '한국', legend: '레전드' };
const MY = { key: 'legend', color: ME, src: 'ui/teams/flag-legend.webp' };
const G = { away: { name: '2026 롯데 자이언츠', runs: 3 }, home: { name: '나의 드림팀', runs: 2 }, inning: 5, top: true, balls: 2, strikes: 1, outs: 1, bases: [true, false, true], pitches: 57 };
const flagOf = (name, mine) => (mine ? MY : teamFlag(name) || MY);
const shortOf = (name, mine) => { if (mine) return name.replace(/^나의\s*/, '').slice(0, 4); const f = teamFlag(name); return (f && SHORT[f.key]) || name.replace(/^\d{4}\s*/, '').split(' ')[0]; };
/* 지금 공격은 원정(롯데) — 그 팀 타순이 나온다 */
const BAT_TEAM = G.away, BAT_MINE = false;
const LINEUP = [
  { n: 1, name: '황성빈', ovr: 76, ko: '1안타', on: 1 },
  { n: 2, name: '고승민', ovr: 79, ko: '무안타' },
  { n: 3, name: '레이예스', ovr: 84, ko: '2루타', on: 3 },
  { n: 4, name: '전준우', ovr: 83, ko: '1안타' },
  { n: 5, name: '나승엽', ovr: 78, ko: '무안타' },
  { n: 6, name: '윤동희', ovr: 80, ko: '1안타', at: true },
  { n: 7, name: '유강남', ovr: 74, ko: '삼진' },
  { n: 8, name: '노진혁', ovr: 73, ko: '볼넷' },
  { n: 9, name: '박승욱', ovr: 71, ko: '무안타' },
];
const tone = (o) => (o >= 88 ? '#fde047' : o >= 82 ? '#34d399' : o >= 76 ? '#7dd3fc' : '#94a3b8');
const state = (p) => (p.at ? 'at' : p.on ? 'on' : 'wait');
const koColor = (ko, dark) => (/홈런|루타/.test(ko) ? (dark ? '#a16207' : '#fde047') : /안타/.test(ko) && !/무/.test(ko) ? (dark ? '#047857' : '#a7f3d0') : /볼넷/.test(ko) ? (dark ? '#1d4ed8' : '#93c5fd') : dark ? 'rgba(11,18,32,.45)' : 'rgba(255,255,255,.45)');

const Diamond = ({ size = 70, note = null }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    {[[74, 55], [50, 31], [26, 55]].map(([x, y], i) => (
      <rect key={i} x={x - 13} y={y - 13} width="26" height="26" rx="3" transform={`rotate(45 ${x} ${y})`} fill={G.bases[i] ? ON : 'rgba(0,0,0,.16)'} />
    ))}
    {note != null && <text x="50" y="94" textAnchor="middle" fontFamily="'Saira Condensed', sans-serif" fontSize="20" fontWeight="800" fill="rgba(11,18,32,.72)">{note}</text>}
  </svg>
);
const Bso = ({ dot = 14, font = 13 }) => (
  <div className="grid items-center font-display font-extrabold" style={{ gridTemplateColumns: `${font + 2}px repeat(3, ${dot}px)`, gap: 4, rowGap: 5, fontSize: font, color: 'rgba(11,18,32,.7)' }}>
    <span className="flex items-center justify-center leading-none" style={{ height: dot }}>B</span>
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.balls ? '#16a34a' : 'rgba(0,0,0,.16)' }} />)}
    <span className="flex items-center justify-center leading-none" style={{ height: dot }}>S</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.strikes ? '#eab308' : 'rgba(0,0,0,.16)' }} />)}<span />
    <span className="flex items-center justify-center leading-none" style={{ height: dot }}>O</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.outs ? '#dc2626' : 'rgba(0,0,0,.16)' }} />)}<span />
  </div>
);
/* 지금 쓰는 스코어보드 그대로 */
const Score = ({ w = 272, round = true }) => (
  <div className={round ? 'mt-cut overflow-hidden' : 'overflow-hidden'} style={{ '--c': '12px', width: w, boxShadow: round ? 'inset 0 0 0 1px rgba(0,0,0,.35)' : 'none' }}>
    {[[G.away, false], [G.home, true]].map(([t, mine]) => {
      const f = flagOf(t.name, mine);
      const atBat = G.top ? !mine : mine;
      return (
        <div key={t.name} className="relative flex items-center gap-2.5 overflow-hidden px-3" style={{ height: 52, background: f.color }}>
          <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${f.src})`, opacity: 0.32, WebkitMaskImage: MASK, maskImage: MASK }} />
          <i className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(0,0,0,.18),transparent 45%)' }} />
          <b className="relative truncate text-[22px] font-extrabold text-white" style={{ textShadow: '0 1px 5px rgba(0,0,0,.6)' }}>{shortOf(t.name, mine)}</b>
          {atBat && <span className="relative font-display text-[12px] font-extrabold tracking-[0.18em] text-white/85">AT BAT</span>}
          <b className="relative ml-auto font-display text-[34px] font-extrabold leading-none text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,.6)' }}>{t.runs}</b>
        </div>
      );
    })}
    <div className="flex items-stretch" style={{ background: PAPER }}>
      <span className="grid shrink-0 place-items-center px-3" style={{ background: 'rgba(255,255,255,.45)' }}>
        <b className="font-display text-[21px] font-extrabold leading-none" style={{ color: INK }}><i className="mr-0.5 not-italic text-[#dc2626]">{G.top ? '▲' : '▼'}</i>{G.inning}</b>
      </span>
      <span className="w-px shrink-0 bg-black/20" />
      <span className="grid flex-1 place-items-center py-1"><Bso /></span>
      <span className="w-px shrink-0 bg-black/20" />
      <span className="grid place-items-center px-1.5"><Diamond note={G.pitches} /></span>
    </div>
  </div>
);
/* 타순 — dark(어두운 유리판) / paper(밝은 판) 두 톤, 줄 높이와 꾸밈을 바꿔 가며 */
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
/* 왼쪽 열에만 놓고 오른쪽은 비운다 */
const Frame = ({ left }) => (
  <div className="relative overflow-hidden" style={{ width: 1880, height: 800, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', opacity: 0.9 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.8) 0,rgba(3,5,10,.15) 24%,rgba(3,5,10,.15) 74%,rgba(3,5,10,.6) 100%), linear-gradient(180deg,rgba(3,5,10,.86) 0,rgba(3,5,10,0) 24%)' }} />
    <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: '63px auto 1fr' }}>
      <Head />
      <div className="col-start-1 row-start-2 self-start" style={{ filter: 'drop-shadow(0 12px 26px rgba(0,0,0,.55))' }}>{left}</div>
    </div>
  </div>
);

const koPaper = (ko) => (/홈런|루타/.test(ko) ? '#a16207' : /안타/.test(ko) && !/무/.test(ko) ? '#047857' : /볼넷/.test(ko) ? '#1d4ed8' : 'rgba(11,18,32,.45)');
const koDark = (ko) => (/홈런|루타/.test(ko) ? '#fde047' : /안타/.test(ko) && !/무/.test(ko) ? '#a7f3d0' : /볼넷/.test(ko) ? '#93c5fd' : 'rgba(255,255,255,.5)');
/* 타순 판 — 위 스코어보드보다 조금 좁고, 바탕은 반투명하게 */
const Order = ({ w = 240, bg, ink = INK, sub = 'rgba(11,18,32,.45)', line = 'rgba(0,0,0,.1)', blur = false, head = true, koInk = koPaper }) => {
  const f = flagOf(BAT_TEAM.name, BAT_MINE);
  return (
    <div className={`mt-cut overflow-hidden ${blur ? 'backdrop-blur-[3px]' : ''}`}
      style={{ '--c': '11px', width: w, background: bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.25)' }}>
      {head && (
        <div className="flex items-center gap-2 px-3 py-1" style={{ background: `${f.color}d9` }}>
          <b className="truncate text-[12.5px] font-extrabold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{shortOf(BAT_TEAM.name, BAT_MINE)} 공격</b>
          <span className="ml-auto font-display text-[10px] tracking-[0.2em] text-white/70">ORDER</span>
        </div>
      )}
      <div className="px-2 py-1">
        {LINEUP.map((p, i) => {
          const s = state(p);
          return (
            <div key={p.n} className={`flex items-center gap-2 px-1.5 ${i ? 'border-t' : ''}`}
              style={{ height: s === 'at' ? 40 : 27, opacity: s === 'wait' ? 0.55 : 1, borderColor: line }}>
              <b className="w-3.5 shrink-0 font-display text-[12px]" style={{ color: sub }}>{p.n}</b>
              <b className="truncate" style={{ color: ink, fontSize: s === 'at' ? 16 : 13, fontWeight: s === 'at' ? 900 : 700, textShadow: ink === '#fff' ? '0 1px 4px rgba(0,0,0,.6)' : 'none' }}>{p.name}</b>
              {p.on && <span className="inline-block shrink-0" style={{ width: 8, height: 8, background: ON, transform: 'rotate(45deg)', borderRadius: 2 }} />}
              <span className="ml-auto w-12 shrink-0 text-right text-[11.5px]" style={{ color: koInk(p.ko) }}>{p.ko}</span>
              <b className="w-7 shrink-0 text-right font-display" style={{ fontSize: s === 'at' ? 17 : 13, color: ink, textShadow: ink === '#fff' ? '0 1px 4px rgba(0,0,0,.6)' : 'none' }}>{p.overall ?? p.ovr}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
};
const Stack = ({ children }) => <div className="flex flex-col gap-2">{children}</div>;

/* 1. 조금 좁게(240) · 밝은 판을 옅게 */
const V1 = () => (
  <Frame left={<Stack><Score /><Order w={240} bg="rgba(199,206,217,.62)" /></Stack>} />
);

/* 2. 더 좁게(228) · 더 옅게 + 뒤 흐림 */
const V2 = () => (
  <Frame left={<Stack><Score /><Order w={228} bg="rgba(199,206,217,.5)" blur /></Stack>} />
);

/* 3. 어두운 유리 — 화면에 녹고 글씨는 흰색 */
const V3 = () => (
  <Frame left={<Stack><Score /><Order w={244} bg="rgba(8,12,20,.55)" ink="#fff" sub="rgba(255,255,255,.4)" line="rgba(255,255,255,.1)" koInk={koDark} blur /></Stack>} />
);

/* 4. 위는 조금 진하고 아래로 갈수록 옅어진다 */
const V4 = () => (
  <Frame left={<Stack><Score /><Order w={236} bg="linear-gradient(180deg,rgba(199,206,217,.78),rgba(199,206,217,.42))" /></Stack>} />
);

const V = [['1', '240 · 옅게', V1], ['2', '228 · 더 옅게 + 흐림', V2], ['3', '어두운 유리', V3], ['4', '아래로 옅어짐', V4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">타순 판 · 4안</b>
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
