/* 감독 모드 화면 — 힉스필드 콘셉트 이미지 네 장을 우리 데이터·글꼴로 옮긴 목업 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { teamFlag } from '/src/myteam/teamArt.js';

const MINT = '#34d399', AMBER = '#fbbf24', ON = '#f97316';
const MASK = 'linear-gradient(90deg,transparent 8%,#000 88%)';
const SHORT = { kia: 'KIA', doosan: '두산', samsung: '삼성', hanwha: '한화', lg: 'LG', lotte: '롯데', nc: 'NC', kt: 'KT', hyundai: '현대', sk: 'SSG', kiwoom: '키움', korea: '한국', legend: '레전드' };
const MY = { key: 'legend', color: MINT, src: 'ui/teams/flag-legend.webp' };
const G = {
  away: { name: '2026 롯데 자이언츠', runs: 3, hits: 5, errors: 0, line: [0, 1, 0, 2, 0, null, null, null, null] },
  home: { name: '나의 드림팀', runs: 2, hits: 4, errors: 1, line: [1, 0, 0, 1, 0, null, null, null, null] },
  inning: 5, top: true, balls: 2, strikes: 1, outs: 1, bases: [true, false, true], pitches: 57,
};
const flagOf = (n, mine) => (mine ? MY : teamFlag(n) || MY);
const shortOf = (n, mine) => { if (mine) return n.replace(/^나의\s*/, '').slice(0, 4); const f = teamFlag(n); return (f && SHORT[f.key]) || n.replace(/^\d{4}\s*/, '').split(' ')[0]; };
const LINEUP = [
  { n: 1, pos: 'CF', name: '황성빈', ovr: 76, ko: '1안타', on: 1 },
  { n: 2, pos: '2B', name: '고승민', ovr: 79, ko: '무안타' },
  { n: 3, pos: 'RF', name: '레이예스', ovr: 84, ko: '2루타', on: 3 },
  { n: 4, pos: 'LF', name: '전준우', ovr: 83, ko: '1안타' },
  { n: 5, pos: '1B', name: '나승엽', ovr: 78, ko: '무안타' },
  { n: 6, pos: 'DH', name: '윤동희', ovr: 80, ko: '1안타', at: true },
  { n: 7, pos: 'C', name: '유강남', ovr: 74, ko: '삼진' },
  { n: 8, pos: '3B', name: '노진혁', ovr: 73, ko: '볼넷' },
  { n: 9, pos: 'SS', name: '박승욱', ovr: 71, ko: '무안타' },
];
const PITCHER = { name: '윤학길', no: 77, pos: 'SP', team: '1989 롯데', stats: [['구위', 82], ['제구', 79], ['안정', 85], ['체력', 92]], line: [['투구수', 57], ['탈삼진', 4], ['피안타', 3], ['실점', 2]] };
const PEN = [['이승민', 'RP', 77], ['곽도규', 'RP', 77], ['유희관', 'RP', 74], ['김원중', 'RP', 65]];
const ACTS = [['도루', '주자 없음', '🏃'], ['번트', '주자 진루', '🪃'], ['직구 노리기', '36%', '🎯'], ['변화구 노리기', '65%', '🌀'], ['투수 교체', '불펜에서', '🔁']];
const PBP = ['체인지업 119km — 볼. 1볼 0스트라이크', '직구 145km — 파울. 1볼 1스트라이크', '슬라이더 124km — 헛스윙! 1볼 2스트라이크'];
const tone = (o) => (o >= 88 ? '#fde047' : o >= 82 ? MINT : o >= 76 ? '#7dd3fc' : '#94a3b8');
const koColor = (ko) => (/홈런|루타/.test(ko) ? '#fde047' : /안타/.test(ko) && !/무/.test(ko) ? '#a7f3d0' : /볼넷/.test(ko) ? '#93c5fd' : 'rgba(255,255,255,.45)');

/* 공통 부품 */
const Field = ({ children, bright = false, bg = 'ui/broadcast-field.webp' }) => (
  <div className="relative overflow-hidden" style={{ width: 1880, height: 892, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})`, opacity: bright ? 1 : 0.92 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(3,5,10,.72) 0,rgba(3,5,10,0) 22%,rgba(3,5,10,0) 62%,rgba(3,5,10,.82) 100%)' }} />
    {children}
  </div>
);
const Panel = ({ children, style, cut = '14px', glow = false }) => (
  <div className="mt-cut backdrop-blur-[3px]" style={{ '--c': cut, background: 'rgba(7,12,20,.82)', boxShadow: `inset 0 0 0 1px rgba(255,255,255,.14)${glow ? `, 0 0 22px ${MINT}22` : ''}`, ...style }}>{children}</div>
);
const Lab = ({ t, color = MINT }) => (
  <p className="m-0 flex items-center gap-2 px-3 py-1.5 font-display text-[11px] font-bold tracking-[0.24em]" style={{ color }}>
    <i className="not-italic" style={{ color }}>//</i>{t}
  </p>
);
const Bases = ({ size = 46, off = 'rgba(255,255,255,.2)' }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    {[[74, 50], [50, 26], [26, 50]].map(([x, y], i) => (
      <rect key={i} x={x - 14} y={y - 14} width="28" height="28" rx="3" transform={`rotate(45 ${x} ${y})`}
        fill={G.bases[i] ? MINT : 'transparent'} stroke={G.bases[i] ? 'none' : off} strokeWidth={1.8} />
    ))}
  </svg>
);
const Count = ({ dot = 11, gap = 5 }) => (
  <div className="grid items-center font-display text-[11px] font-extrabold text-white/70" style={{ gridTemplateColumns: `12px repeat(3, ${dot}px)`, gap }}>
    <span>B</span>{[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, boxSizing: 'border-box', background: i < G.balls ? MINT : 'transparent', border: i < G.balls ? 'none' : '1.5px solid rgba(255,255,255,.3)' }} />)}
    <span>S</span>{[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, boxSizing: 'border-box', background: i < G.strikes ? AMBER : 'transparent', border: i < G.strikes ? 'none' : '1.5px solid rgba(255,255,255,.3)' }} />)}<span />
    <span>O</span>{[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, boxSizing: 'border-box', background: i < G.outs ? '#ef4444' : 'transparent', border: i < G.outs ? 'none' : '1.5px solid rgba(255,255,255,.3)' }} />)}<span />
  </div>
);
const TeamBadge = ({ t, mine, size = 30 }) => {
  const f = flagOf(t.name, mine);
  return <span className="grid shrink-0 place-items-center font-display text-[11px] font-extrabold text-white" style={{ width: size, height: size, borderRadius: 7, background: f.color }}>{shortOf(t.name, mine).slice(0, 2)}</span>;
};

/* ───────── 1안: 콘셉트 A — 좌상단 스코어 + 타순표, 우측 투수 카드, 하단 큰 버튼 ───────── */
const V1 = () => (
  <Field bg="ui/hud/c1.webp">
    <div className="absolute flex flex-col gap-3" style={{ left: 24, top: 20, width: 360 }}>
      <Panel style={{ padding: '10px 12px' }}>
        <div className="flex items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {[[G.away, false], [G.home, true]].map(([t, mine]) => (
              <div key={t.name} className="flex items-center gap-2.5">
                <TeamBadge t={t} mine={mine} size={26} />
                <b className="truncate text-[17px] font-extrabold text-white">{shortOf(t.name, mine)}</b>
                <b className="ml-auto font-display text-[26px] font-extrabold leading-none text-white">{t.runs}</b>
              </div>
            ))}
          </div>
          <span className="h-12 w-px bg-white/12" />
          <div className="flex flex-col items-center gap-1">
            <b className="font-display text-[19px] font-extrabold leading-none text-white">{G.inning}<i className="ml-0.5 not-italic text-[#f87171]">{G.top ? '▲' : '▼'}</i></b>
            <Count dot={9} gap={4} />
          </div>
          <Bases size={54} />
        </div>
      </Panel>
      <Panel>
        <Lab t="BATTING ORDER" />
        <div className="px-2 pb-2">
          {LINEUP.map((p) => (
            <div key={p.n} className="ui-cut flex items-center gap-2 px-2.5" style={{ '--c': '5px', height: p.at ? 34 : 30, background: p.at ? `${MINT}2e` : undefined, boxShadow: p.at ? `inset 0 0 0 1px ${MINT}` : undefined, opacity: p.at || p.on ? 1 : 0.62 }}>
              <b className="w-4 shrink-0 font-display text-[12px] text-white/45">{p.n}</b>
              <b className="w-8 shrink-0 font-display text-[11px] text-white/55">{p.pos}</b>
              <b className="truncate text-[14px] text-white">{p.name}</b>
              {p.on && <span className="inline-block shrink-0" style={{ width: 8, height: 8, background: ON, transform: 'rotate(45deg)', borderRadius: 2 }} />}
              <span className="ml-auto w-14 shrink-0 text-right text-[11.5px]" style={{ color: koColor(p.ko) }}>{p.ko}</span>
              <b className="w-7 shrink-0 text-right font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          ))}
        </div>
      </Panel>
    </div>
    {/* 오른쪽 — 마운드 위 투수 */}
    <div className="absolute" style={{ right: 24, top: 20, width: 340 }}>
      <Panel>
        <Lab t="ON THE MOUND" />
        <div className="flex items-center gap-3 px-3 pb-2">
          <span className="ui-cut block h-[84px] w-[70px] shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '8px', backgroundImage: 'url(ui/clutch-mound.webp)', backgroundPosition: '60% 20%' }} />
          <div className="min-w-0">
            <span className="font-display text-[12px] text-white/50">#{PITCHER.no} · {PITCHER.pos}</span>
            <b className="mt-0.5 block truncate text-[24px] font-black text-white">{PITCHER.name}</b>
            <span className="block truncate text-[12px] text-white/55">{PITCHER.team}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-px border-t border-white/10 bg-white/10">
          {PITCHER.line.map(([k, v]) => (
            <span key={k} className="flex flex-col items-center gap-0.5 bg-[#070c14] py-2">
              <b className="font-display text-[19px] font-extrabold text-white">{v}</b>
              <small className="text-[10.5px] text-white/45">{k}</small>
            </span>
          ))}
        </div>
        <div className="px-3 py-2">
          {PITCHER.stats.map(([k, v]) => (
            <div key={k} className="mt-1.5 grid grid-cols-[38px_1fr_28px] items-center gap-2 text-[11.5px] text-white/60">
              {k}<i className="block h-[6px] bg-white/10"><b className="block h-full" style={{ width: `${v}%`, background: MINT }} /></i>
              <em className="text-right font-display text-[13px] not-italic text-white">{v}</em>
            </div>
          ))}
        </div>
      </Panel>
    </div>
    {/* 하단 — 큰 육각 버튼 */}
    <div className="absolute flex justify-center gap-2.5" style={{ left: 0, right: 0, bottom: 86 }}>
      {ACTS.map(([t, s, icon], i) => (
        <span key={t} className="ui-cut grid place-items-center px-6 py-3 text-center"
          style={{ '--c': '14px', width: 168, background: i === 2 ? `${MINT}26` : 'rgba(7,12,20,.86)', boxShadow: `inset 0 0 0 1px ${i === 2 ? MINT : 'rgba(255,255,255,.14)'}` }}>
          <span className="text-[19px]">{icon}</span>
          <b className="mt-1 block text-[14px] text-white">{t}</b>
          <small className="block text-[11px] text-white/45">{s}</small>
        </span>
      ))}
    </div>
    {/* 맨 아래 — 해설 띠 */}
    <div className="absolute" style={{ left: 24, right: 24, bottom: 20 }}>
      <Panel style={{ padding: '8px 14px' }}>
        <div className="flex items-center gap-4">
          <span className="font-display text-[11px] font-bold tracking-[0.24em]" style={{ color: MINT }}>// PLAY-BY-PLAY</span>
          {PBP.map((l, i) => (
            <span key={l} className="flex items-center gap-2 text-[12.5px] text-white/80">
              <i className="grid h-[18px] w-[18px] place-items-center rounded-full not-italic" style={{ background: i === PBP.length - 1 ? MINT : 'rgba(255,255,255,.12)', color: i === PBP.length - 1 ? '#05080f' : '#fff', fontSize: 10 }}>{i + 1}</i>
              {l}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  </Field>
);

/* ───────── 2안: 콘셉트 B — 팀 색 배지 스코어 + 막대형 타순, 아이콘 버튼, 파형 띠 ───────── */
const V2 = () => (
  <Field bg="ui/hud/c2.webp">
    <div className="absolute" style={{ left: 24, top: 20, width: 330 }}>
      <Panel style={{ padding: '10px 12px' }}>
        <div className="flex items-center gap-3.5">
          <div className="flex flex-col gap-1">
            {[[G.away, false], [G.home, true]].map(([t, mine]) => (
              <div key={t.name} className="flex items-center gap-2">
                <TeamBadge t={t} mine={mine} size={24} />
                <b className="font-display text-[30px] font-extrabold leading-none text-white">{t.runs}</b>
              </div>
            ))}
          </div>
          <span className="h-12 w-px bg-white/12" />
          <b className="font-display text-[30px] font-extrabold leading-none text-white">{G.inning}<i className="block text-[11px] not-italic text-[#f87171]">{G.top ? '▲ 초' : '▼ 말'}</i></b>
          <Count />
          <Bases size={52} />
        </div>
      </Panel>
    </div>
    <div className="absolute" style={{ left: 24, top: 104, width: 330 }}>
      {LINEUP.map((p) => (
        <div key={p.n} className="relative mb-1.5 flex items-center gap-2.5 px-3"
          style={{ height: p.at ? 42 : 34, background: p.at ? `linear-gradient(90deg, ${MINT}4d, ${MINT}14)` : 'rgba(7,12,20,.8)', clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)', boxShadow: p.at ? `inset 0 0 0 1px ${MINT}` : 'inset 0 0 0 1px rgba(255,255,255,.1)', marginLeft: p.at ? -10 : 0, width: p.at ? 340 : 330 }}>
          <b className="w-4 shrink-0 font-display text-[13px] text-white/50">{p.n}</b>
          <b className={`truncate text-white ${p.at ? 'text-[16px] font-black' : 'text-[13.5px]'}`}>{p.name}</b>
          {p.on && <span className="inline-block shrink-0" style={{ width: 8, height: 8, background: ON, transform: 'rotate(45deg)', borderRadius: 2 }} />}
          <i className="ml-2 block h-[5px] flex-1 bg-white/10"><b className="block h-full" style={{ width: `${p.ovr}%`, background: p.at ? MINT : 'rgba(255,255,255,.35)' }} /></i>
          <b className="w-7 shrink-0 text-right font-display text-[13px] text-white">{p.ovr}</b>
        </div>
      ))}
    </div>
    {/* 우하단 미니 상황판 */}
    <div className="absolute" style={{ right: 24, bottom: 110, width: 240 }}>
      <Panel style={{ padding: 12 }}>
        <div className="flex items-center gap-3">
          <Bases size={72} />
          <div className="min-w-0 flex-1">
            {[['팀 안타', G.away.hits], ['팀 득점', G.away.runs], ['투구수', G.pitches]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-white/10 py-1 text-[11.5px] text-white/55">
                {k}<b className="font-display text-[15px] text-white">{v}</b>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
    <div className="absolute flex justify-center gap-2.5" style={{ left: 0, right: 0, bottom: 96 }}>
      {ACTS.map(([t, , icon], i) => (
        <span key={t} className="ui-cut grid h-[72px] w-[92px] place-items-center"
          style={{ '--c': '12px', background: i === 2 ? `${MINT}26` : 'rgba(7,12,20,.86)', boxShadow: `inset 0 0 0 1px ${i === 2 ? MINT : 'rgba(255,255,255,.14)'}` }}>
          <span className="text-[22px]">{icon}</span>
          <b className="mt-1 block text-[11.5px] text-white/80">{t}</b>
        </span>
      ))}
    </div>
    <div className="absolute" style={{ left: 24, right: 24, bottom: 20 }}>
      <Panel style={{ padding: '10px 16px' }}>
        <div className="flex items-center gap-4">
          <span className="text-[18px]">🎙️</span>
          <span className="flex h-6 flex-1 items-end gap-[3px]">
            {Array.from({ length: 96 }, (_, i) => (
              <i key={i} className="block flex-1 rounded-sm" style={{ height: `${20 + Math.abs(Math.sin(i * 0.7)) * 80}%`, background: i < 40 ? MINT : 'rgba(255,255,255,.18)' }} />
            ))}
          </span>
          <span className="shrink-0 text-[13px] text-white/85">{PBP[2]}</span>
        </div>
      </Panel>
    </div>
  </Field>
);

/* ───────── 3안: 콘셉트 C — 위 타이틀 바 + 좌 전광판/타순표 + 우 투수·불펜 + 원형 버튼 ───────── */
const V3 = () => (
  <Field bright bg="ui/hud/c3.webp">
    <div className="absolute flex items-center gap-4 px-6 py-3" style={{ left: 0, right: 0, top: 0, background: 'linear-gradient(180deg,rgba(5,8,15,.95),rgba(5,8,15,.55))' }}>
      <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${MINT}26`, color: MINT }}>◆</span>
      <div className="leading-none">
        <h1 className="text-[26px] font-black text-white">감독 모드</h1>
        <p className="mt-1 font-display text-[11px] tracking-[0.3em] text-white/40">DUGOUT MANAGER MODE</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="font-display text-[10.5px] tracking-[0.2em] text-white/40">GAME SPEED</span>
        {['⏸', '▶', '보통', '자동', '스킵'].map((t, i) => (
          <span key={t} className="ui-cut grid h-8 min-w-[42px] place-items-center px-2 font-display text-[13px] font-bold"
            style={{ '--c': '5px', background: i === 2 ? AMBER : 'rgba(255,255,255,.06)', color: i === 2 ? '#05080f' : '#d1d5db' }}>{t}</span>
        ))}
      </div>
    </div>
    <div className="absolute flex flex-col gap-3" style={{ left: 24, top: 92, width: 372 }}>
      <Panel>
        <Lab t="SCOREBOARD" />
        <table className="w-full border-collapse px-2 text-center font-display text-[12px]">
          <thead><tr className="text-white/35">
            <th className="w-[92px] py-1 pl-3 text-left" />
            {Array.from({ length: 9 }, (_, i) => <th key={i} className="py-1 font-normal">{i + 1}</th>)}
            <th style={{ color: MINT }}>R</th><th>H</th><th className="pr-2">E</th>
          </tr></thead>
          <tbody>
            {[[G.away, false], [G.home, true]].map(([t, mine]) => (
              <tr key={t.name} className="border-t border-white/10">
                <td className="py-1.5 pl-3 text-left"><b className="text-[13px] text-white">{shortOf(t.name, mine)}</b></td>
                {t.line.map((v, i) => <td key={i} className={`py-1.5 text-[13px] ${i + 1 === G.inning ? 'text-white' : 'text-white/55'}`} style={{ background: i + 1 === G.inning ? `${MINT}1f` : undefined }}>{v ?? '-'}</td>)}
                <td className="font-display text-[15px] font-extrabold" style={{ color: MINT }}>{t.runs}</td>
                <td className="text-white/70">{t.hits}</td><td className="pr-2 text-white/70">{t.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel>
        <Lab t="BATTING ORDER" />
        <div className="grid grid-cols-[26px_1fr_40px_56px_34px] gap-x-2 px-3 pb-1 font-display text-[10.5px] tracking-[0.12em] text-white/35">
          <span>#</span><span>PLAYER</span><span>POS</span><span className="text-right">TODAY</span><span className="text-right">OVR</span>
        </div>
        <div className="px-2 pb-2">
          {LINEUP.map((p) => (
            <div key={p.n} className="relative grid grid-cols-[26px_1fr_40px_56px_34px] items-center gap-x-2 px-1 py-[5px]"
              style={{ background: p.at ? `${AMBER}1f` : undefined, boxShadow: p.at ? `inset 0 0 0 1px ${AMBER}59` : undefined, opacity: p.at || p.on ? 1 : 0.65 }}>
              <b className="font-display text-[12px]" style={{ color: p.at ? AMBER : 'rgba(255,255,255,.45)' }}>{p.at ? '▸' : ''}{p.n}</b>
              <b className="truncate text-[13.5px] text-white">{p.name}{p.on ? <i className="ml-1.5 not-italic text-[10.5px]" style={{ color: ON }}>{p.on}루</i> : null}</b>
              <span className="font-display text-[11px] text-white/50">{p.pos}</span>
              <span className="text-right text-[11.5px]" style={{ color: koColor(p.ko) }}>{p.ko}</span>
              <b className="text-right font-display text-[13px]" style={{ color: tone(p.ovr) }}>{p.ovr}</b>
            </div>
          ))}
        </div>
      </Panel>
    </div>
    <div className="absolute flex flex-col gap-3" style={{ right: 24, top: 92, width: 372 }}>
      <Panel>
        <Lab t="STARTING PITCHER" />
        <div className="flex items-center gap-3 px-3 pb-2">
          <span className="ui-cut block h-[76px] w-[64px] shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '8px', backgroundImage: 'url(ui/clutch-mound.webp)', backgroundPosition: '60% 20%' }} />
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[20px] font-black text-white">{PITCHER.name}</b>
            <span className="block text-[12px] text-white/50">#{PITCHER.no} · {PITCHER.pos} · {PITCHER.team}</span>
            <div className="mt-1.5 flex gap-3">
              {PITCHER.line.slice(0, 3).map(([k, v]) => (
                <span key={k} className="text-[11px] text-white/45">{k} <b className="font-display text-[13px] text-white">{v}</b></span>
              ))}
            </div>
          </div>
        </div>
        <div className="px-3 pb-2.5">
          {PITCHER.stats.map(([k, v]) => (
            <div key={k} className="mt-1.5 grid grid-cols-[46px_1fr_28px] items-center gap-2 font-display text-[11px] tracking-[0.1em] text-white/50">
              {k}<i className="block h-[7px] bg-white/10"><b className="block h-full" style={{ width: `${v}%`, background: `linear-gradient(90deg, ${MINT}, ${AMBER})` }} /></i>
              <em className="text-right text-[13px] not-italic text-white">{v}</em>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <Lab t="BULLPEN" color={AMBER} />
        <div className="px-3 pb-2">
          {PEN.map(([n, r, o]) => (
            <div key={n} className="flex items-center gap-2 border-t border-white/[0.07] py-1.5">
              <b className="w-[74px] truncate text-[13px] text-white">{n}</b>
              <span className="font-display text-[11px] text-white/45">{r}</span>
              <i className="ml-2 block h-[5px] flex-1 bg-white/10"><b className="block h-full" style={{ width: `${o}%`, background: AMBER }} /></i>
              <b className="w-7 text-right font-display text-[13px] text-white">{o}</b>
            </div>
          ))}
        </div>
      </Panel>
    </div>
    <div className="absolute flex justify-center gap-7" style={{ left: 0, right: 0, bottom: 32 }}>
      {ACTS.map(([t, s, icon], i) => (
        <span key={t} className="grid place-items-center text-center">
          <span className="grid h-[76px] w-[76px] place-items-center rounded-full text-[24px]"
            style={{ background: 'rgba(7,12,20,.86)', boxShadow: `inset 0 0 0 2px ${i === 4 ? AMBER : MINT}` }}>{icon}</span>
          <b className="mt-2 block font-display text-[12px] tracking-[0.12em]" style={{ color: i === 4 ? AMBER : '#e5e7eb' }}>{t}</b>
          <small className="block text-[10.5px] text-white/35">{s}</small>
        </span>
      ))}
    </div>
  </Field>
);

/* ───────── 4안: 콘셉트 D — 숫자칸 스코어 + 아이콘 타순 + 우측 능력치 카드 ───────── */
const V4 = () => (
  <Field bg="ui/hud/c4.webp">
    <div className="absolute" style={{ left: 24, top: 20, width: 430 }}>
      <Panel style={{ padding: 10 }}>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            {[[G.away, false], [G.home, true]].map(([t, mine]) => {
              const f = flagOf(t.name, mine);
              return (
                <div key={t.name} className="flex items-center gap-1">
                  <span className="grid h-7 w-8 place-items-center rounded-l-md text-[12px] font-extrabold text-white" style={{ background: f.color }}>{shortOf(t.name, mine).slice(0, 2)}</span>
                  {[1, 2, 3].map((n) => <span key={n} className="grid h-7 w-7 place-items-center bg-white/[0.06] font-display text-[13px] text-white/70">{t.line[n] ?? 0}</span>)}
                  <span className="grid h-7 w-9 place-items-center rounded-r-md font-display text-[15px] font-extrabold text-[#05080f]" style={{ background: f.color }}>{t.runs}</span>
                </div>
              );
            })}
          </div>
          <Bases size={58} />
          <span className="h-12 w-px bg-white/12" />
          <div className="flex flex-col gap-1.5">
            {[['⚾', G.balls, 3, MINT], ['✕', G.strikes, 2, AMBER], ['●', G.outs, 2, '#ef4444']].map(([ic, v, n, c]) => (
              <span key={ic} className="flex items-center gap-1.5">
                <i className="w-4 not-italic text-[11px] text-white/45">{ic}</i>
                {Array.from({ length: n }, (_, i) => <i key={i} className="rounded-full" style={{ width: 11, height: 11, boxSizing: 'border-box', background: i < v ? c : 'transparent', border: i < v ? 'none' : '1.5px solid rgba(255,255,255,.28)' }} />)}
              </span>
            ))}
          </div>
        </div>
      </Panel>
    </div>
    <div className="absolute" style={{ left: 24, top: 126, width: 330 }}>
      <Panel style={{ padding: 8 }}>
        {LINEUP.map((p) => (
          <div key={p.n} className="ui-cut mb-1 flex items-center gap-2.5 px-2.5"
            style={{ '--c': '6px', height: p.at ? 40 : 32, background: p.at ? `${MINT}2e` : 'rgba(255,255,255,.04)', boxShadow: p.at ? `inset 0 0 0 1px ${MINT}, 0 0 14px ${MINT}33` : undefined, opacity: p.at || p.on ? 1 : 0.6 }}>
            <b className="w-4 shrink-0 font-display text-[13px] text-white/50">{p.n}</b>
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded text-[10px]" style={{ background: p.at ? MINT : 'rgba(255,255,255,.1)', color: p.at ? '#05080f' : '#9ca3af' }}>{p.pos.slice(0, 2)}</span>
            <b className={`truncate text-white ${p.at ? 'text-[15px] font-black' : 'text-[13px]'}`}>{p.name}</b>
            <i className="ml-1 block h-[5px] flex-1 bg-white/10"><b className="block h-full" style={{ width: `${p.ovr}%`, background: p.at ? MINT : 'rgba(255,255,255,.3)' }} /></i>
            {p.on
              ? <span className="inline-block shrink-0" style={{ width: 9, height: 9, background: ON, transform: 'rotate(45deg)', borderRadius: 2 }} />
              : <span className="inline-block shrink-0" style={{ width: 9, height: 9, border: '1.5px solid rgba(255,255,255,.22)', transform: 'rotate(45deg)', borderRadius: 2 }} />}
          </div>
        ))}
      </Panel>
    </div>
    <div className="absolute" style={{ right: 24, top: 126, width: 360 }}>
      <Panel style={{ padding: 12 }} glow>
        <div className="flex items-center gap-3">
          <span className="ui-cut block h-[70px] w-[62px] shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '8px', backgroundImage: 'url(ui/clutch-bat.webp)', backgroundPosition: '60% 15%' }} />
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[20px] font-black text-white">{LINEUP[5].name}</b>
            <span className="block text-[12px] text-white/50">{LINEUP[5].pos} · 6번 타자 · 오늘 {LINEUP[5].ko}</span>
          </div>
          <b className="font-display text-[30px] font-extrabold" style={{ color: tone(LINEUP[5].ovr) }}>{LINEUP[5].ovr}</b>
        </div>
        <div className="mt-3">
          {[['컨택', 79, MINT], ['파워', 68, ON], ['주력', 75, MINT], ['수비', 62, ON], ['선구', 71, MINT], ['클러치', 58, ON]].map(([k, v, c]) => (
            <div key={k} className="mt-2 grid grid-cols-[42px_1fr_58px] items-center gap-2 text-[11.5px] text-white/55">
              {k}
              <i className="block h-[7px] rounded-full bg-white/10"><b className="block h-full rounded-full" style={{ width: `${v}%`, background: c }} /></i>
              <span className="flex justify-end gap-1">
                {Array.from({ length: 5 }, (_, i) => <i key={i} className="rounded-full" style={{ width: 6, height: 6, background: i < Math.round(v / 20) ? c : 'rgba(255,255,255,.16)' }} />)}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
    <div className="absolute flex justify-center gap-2" style={{ left: 0, right: 0, bottom: 92 }}>
      {ACTS.map(([t, , icon], i) => (
        <span key={t} className="ui-cut grid h-[62px] w-[86px] place-items-center"
          style={{ '--c': '10px', background: i === 2 ? `${MINT}26` : 'rgba(7,12,20,.82)', boxShadow: `inset 0 0 0 1px ${i === 2 ? MINT : 'rgba(255,255,255,.12)'}` }}>
          <span className="text-[20px]">{icon}</span>
          <b className="mt-0.5 block text-[11px] text-white/75">{t}</b>
        </span>
      ))}
    </div>
    <div className="absolute" style={{ left: 24, right: 24, bottom: 20 }}>
      <Panel style={{ padding: '10px 16px' }}>
        <div className="flex items-center gap-4">
          <span className="text-[17px]">🎙️</span>
          <span className="flex h-5 flex-1 items-end gap-[2px]">
            {Array.from({ length: 120 }, (_, i) => (
              <i key={i} className="block flex-1" style={{ height: `${15 + Math.abs(Math.cos(i * 0.5)) * 85}%`, background: i < 52 ? `${MINT}cc` : 'rgba(255,255,255,.14)' }} />
            ))}
          </span>
          <span className="shrink-0 text-[13px] text-white/85">{PBP[2]}</span>
        </div>
      </Panel>
    </div>
  </Field>
);

const V = [['1', '콘셉트 A', V1], ['2', '콘셉트 B', V2], ['3', '콘셉트 C', V3], ['4', '콘셉트 D', V4]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || '1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">감독 모드 HUD · 콘셉트 4안</b>
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
