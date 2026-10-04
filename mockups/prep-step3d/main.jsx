/*
 * 정비 3단계 세분화 8안 (/mockups/prep-step3d/?v=1~8, 1920 × 911) — 경기 계획 뺌, sit2-sim(ROADMAP 13)에서 나눌 값어치 있던 것만
 *  타자 득점권(하나) · 주자 도루 + 누가 뛰나(주력 80+ · 85+ · 90+) · 투수 맞혀 잡기 + 누구에게(모든 타자 · 교타자만) · 언제(경기 내내 · 초반만) · 자동 교체
 *  1 세 열 카드 · 2 위 타자 · 아래 둘 · 3 레인 · 4 고른 칸 아래 펼침 · 5 다이얼 · 6 큰 고르기 + 세부 칩 · 7 공격 | 수비 두 판 · 8 위 요약 칩
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { UiStyle, GlassBg } from '../../src/myteam/ui.jsx';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const ME = engineTeam(seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)));
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => Math.round((st(p, 'stuff', 80) + st(p, 'control', 75)) / 2);
const V = Number(new URLSearchParams(location.search).get('v') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa', ORG = '#f59e0b', SKY = '#38bdf8', VIO = '#a78bfa';
const SP = ME.pitchers[0];
const PEN = ME.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a));
const LOW = [false, false, false, true, true, true, true, false, false];
const PLAN = [3, 3, 1, 0, 0, 0, 0, 1, 2];
const LVC = [ORG, '#cbd5e1', SKY, VIO];
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/* 구역 · 상황 */
const ZONES = [
  { id: 'bat', side: '공격', ko: '타자', sits: [{ ko: '득점권 기회', opts: [['그대로', null], ['홈런 우선', ORG, '장타 ↑ · 삼진 ↑'], ['안타 우선', SKY, '안타 ↑ · 장타 ↓'], ['출루 우선', VIO, '볼넷 ↑ · 루킹 ↑']], on: 2, link: ['상대 선발', '구위 강함', RED] }] },
  { id: 'run', side: '공격', ko: '주자', sits: [{ ko: '빠른 1루 주자', opts: [['그대로', null], ['도루 우선', US, '진루 ↑ · 아웃 위험']], on: 1, link: ['도루 기회', '큼', US] }] },
  { id: 'pit', side: '수비', ko: '투수', sits: [{ ko: '경기 운영', opts: [['기본', null], ['맞혀 잡기', SPB, '볼넷 ↓ · 장타 위험']], on: 0, link: ['상대 타선', '장타 많음', RED] }], auto: '선발 무너질 때 · 자동 교체' },
];
const CARDS = [['bo-meeting', '타선 미팅', 2], ['bo-bullpen', '불펜 데이', 1], ['bo-mound', '마운드 미팅', 0]];

/* ───── 조각 ───── */
const Box = ({ children, className = '', style, pad = 'p-4' }) => (
  <div className={`mt-cut flex flex-col ${pad} ${className}`} style={{ ...cut(12), background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.012))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)', ...style }}>{children}</div>
);
const Side = ({ side }) => <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: side === '공격' ? US : SPB, boxShadow: `inset 0 0 0 1px ${side === '공격' ? US : SPB}66` }}>{side}</span>;
const Link = ({ l }) => l && <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: l[2], background: `${l[2]}1a` }}><i className="block rounded-full" style={{ width: 6, height: 6, background: l[2] }} />{l[0]} {l[1]}</span>;
const Auto = ({ ko }) => <span className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ color: W2, background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}><i className="block rounded-full" style={{ width: 6, height: 6, background: US }} />{ko}</span>;
function Opts({ s, kind = 'seg' }) {
  return (
    <span className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${s.opts.length},minmax(0,1fr))` }}>
      {s.opts.map(([ko, c, fx], i) => {
        const on = i === s.on, col = c || '#cbd5e1';
        if (kind === 'card') return (
          <span key={ko} className="mt-cut flex flex-col gap-1.5 px-3 py-3" style={{ ...cut(8), background: on ? `${col}1f` : 'rgba(255,255,255,.025)', boxShadow: `inset 0 0 0 1px ${on ? col : 'rgba(255,255,255,.08)'}` }}>
            <span className="flex items-center gap-1.5"><i className="block rounded-full" style={{ width: 8, height: 8, background: c || 'rgba(255,255,255,.3)' }} /><b className="text-t3" style={{ color: on ? '#fff' : W2 }}>{ko}</b></span>
            <span className="text-[11px]" style={{ color: on ? W2 : W3 }}>{fx || '정비 계획대로'}</span>
          </span>
        );
        if (kind === 'big') return <span key={ko} className="grid place-items-center rounded-lg py-4 text-t2 font-bold" style={{ color: on ? '#fff' : W2, background: on ? `${col}24` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${on ? col : 'rgba(255,255,255,.08)'}` }}>{ko}</span>;
        return <span key={ko} className="flex items-center justify-center gap-1.5 rounded-md py-2 text-t4 font-bold" style={{ color: on ? '#fff' : W2, background: on ? `${col}22` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${on ? col : 'rgba(255,255,255,.08)'}` }}>{c && <i className="block rounded-full" style={{ width: 6, height: 6, background: c }} />}{ko}</span>;
      })}
    </span>
  );
}
function Zone({ z, kind, link = true }) {
  return (
    <Box>
      <span className="flex items-center gap-2"><Side side={z.side} /><b className="text-t2" style={{ color: W1 }}>{z.ko}</b></span>
      <div className="mt-3 flex flex-col gap-4">
        {z.sits.map((s) => (
          <div key={s.ko} className="flex flex-col gap-2">
            <span className="flex items-center justify-between"><b className="text-t3" style={{ color: W2 }}>{s.ko}</b>{link && <Link l={s.link} />}</span>
            <Opts s={s} kind={kind} />
          </div>
        ))}
        {z.auto && <Auto ko={z.auto} />}
      </div>
    </Box>
  );
}
/* 준비 카드 — 아래 띠 아이템 칸 */
function ItemSlots({ kind = 'sq' }) {
  return (
    <span className="flex items-center gap-2">
      <span className="mr-1 text-[11px] font-bold" style={{ color: W3 }}>준비 카드</span>
      {CARDS.map(([img, ko, n], i) => {
        const on = i === 0, dim = n === 0;
        if (kind === 'pill') return <span key={ko} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3" style={{ opacity: dim ? 0.35 : 1, background: on ? 'rgba(16,185,129,.14)' : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? US : 'rgba(255,255,255,.1)'}` }}><img src={`/ui/shop/${img}.webp`} alt="" style={{ width: 28, height: 28, borderRadius: 999, objectFit: 'cover' }} /><b className="text-t4" style={{ color: on ? '#fff' : W2 }}>{ko}</b><span className="font-display text-[11px]" style={{ color: W3 }}>{n}</span></span>;
        return (
          <span key={ko} className="relative" title={ko} style={{ opacity: dim ? 0.3 : 1 }}>
            <span className="mt-cut block overflow-hidden" style={{ ...cut(8), width: 48, height: 48, boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? US : 'rgba(255,255,255,.14)'}`, filter: on ? 'none' : 'saturate(.6) brightness(.85)' }}><img src={`/ui/shop/${img}.webp`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
            <b className="absolute -right-1 -top-1 grid place-items-center rounded-full font-display text-[10px]" style={{ width: 16, height: 16, background: '#0b0f1a', color: W1, boxShadow: '0 0 0 1px rgba(255,255,255,.2)' }}>{n}</b>
          </span>
        );
      })}
    </span>
  );
}
function Plan() {
  return (
    <Box>
      <b className="text-t3" style={{ color: W1 }}>경기 계획</b>
      <div className="mt-3 grid" style={{ gridTemplateColumns: '6rem repeat(9,1fr)', rowGap: 8 }}>
        <span />{INN.map((i) => <b key={i} className="text-center font-display text-t4" style={{ color: LOW[i - 1] ? US : W2 }}>{i}회</b>)}
        <span className="text-t4" style={{ color: W2 }}>마운드</span>
        <span className="relative block" style={{ gridColumn: 'span 9', height: 22 }}>{[[0, 6.1, SP, SPB], [6.1, 8, PEN[2], '#94a3b8'], [8, 9, PEN[0], GOLD]].map(([a, b, p, c]) => <span key={a} className="absolute flex items-center overflow-hidden rounded px-1.5 text-[11px] font-bold" style={{ left: `calc(${(a / 9) * 100}% + 1px)`, width: `calc(${((b - a) / 9) * 100}% - 2px)`, top: 0, bottom: 0, background: `${c}33`, color: W1 }}>{p.name}</span>)}</span>
        <span className="text-t4" style={{ color: W2 }}>공격</span>{PLAN.map((lv, i) => <span key={i} className="grid place-items-center"><i className="block rounded-full" style={{ width: 10, height: 10, background: LVC[lv] }} /></span>)}
      </div>
    </Box>
  );
}

/* ───── 세분화 8안(경기 계획 뺌) ───── */
const SEGBOX = { background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' };
/* 2단계와 같은 Seg(알약 안 칸) */
const SegP = ({ opts, on, dim, sm }) => (
  <span className="inline-flex rounded-lg p-0.5" style={{ ...SEGBOX, opacity: dim ? 0.35 : 1 }}>
    {opts.map((o) => <b key={o} className={`rounded-md ${sm ? 'px-2.5 py-0.5 text-[12px]' : 'px-3 py-1 text-t4'}`} style={o === on ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : { color: W2 }}>{o}</b>)}
  </span>
);
const SUB = {
  run: [['누가 뛰나', ['주력 80+', '주력 85+', '주력 90+'], '주력 85+']],
  pit: [['누구에게', ['모든 타자', '교타자만'], '교타자만'], ['언제', ['경기 내내', '초반만'], '경기 내내']],
};
const Z = {
  bat: { ...ZONES[0], on: 2 },
  run: { ...ZONES[1], on: 1 },
  pit: { ...ZONES[2], on: 1 },
};
const ZoneHead = ({ z }) => <span className="flex items-center gap-2"><Side side={z.side} /><b className="text-t2" style={{ color: W1 }}>{z.ko}</b><span className="ml-auto"><Link l={z.sits[0].link} /></span></span>;
const sitOf = (z) => ({ ...z.sits[0], on: z.on });
function SubRows({ id, on, layout = 'row' }) {
  const rows = SUB[id] || [];
  return (
    <div className={layout === 'row' ? 'flex flex-wrap items-center gap-x-5 gap-y-2' : 'flex flex-col gap-2'}>
      {rows.map(([k, opts, cur]) => <span key={k} className="flex items-center gap-2"><span className="text-[12px] font-bold" style={{ color: W3 }}>{k}</span><SegP opts={opts} on={cur} dim={!on} sm /></span>)}
    </div>
  );
}
function ZoneCard({ z, id, kind = 'card', sub = 'row', grow }) {
  return (
    <Box className={grow ? 'min-h-0 flex-1' : ''}>
      <ZoneHead z={z} />
      <b className="mt-3 text-t3" style={{ color: W2 }}>{z.sits[0].ko}</b>
      <div className="mt-2"><Opts s={sitOf(z)} kind={kind} /></div>
      {SUB[id] && <div className="mt-3 border-t border-white/[0.06] pt-3"><SubRows id={id} on={z.on > 0} layout={sub} /></div>}
      {z.auto && <div className="mt-3"><Auto ko={z.auto} /></div>}
    </Box>
  );
}
/* 레인형(2단계 '우리 마운드' 줄처럼 왼쪽 이름 칸 + 유리 레인) */
function LaneRow({ z, id, h = 76 }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: '9rem minmax(0,1fr)' }}>
      <span className="flex flex-col justify-center gap-1 pr-3"><span className="flex items-center gap-2"><Side side={z.side} /><b className="text-t2" style={{ color: W1 }}>{z.ko}</b></span><span className="text-[12px]" style={{ color: W3 }}>{z.sits[0].ko}</span></span>
      <span className="flex items-center gap-4 rounded-lg px-3 py-2.5" style={{ minHeight: h, background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="min-w-0 flex-1"><Opts s={sitOf(z)} /></span>
        {SUB[id] && <span className="shrink-0"><SubRows id={id} on={z.on > 0} layout="col" /></span>}
        <span className="flex w-36 shrink-0 flex-col items-end gap-2"><Link l={z.sits[0].link} />{z.auto && <Auto ko="자동 교체" />}</span>
      </span>
    </div>
  );
}
/* 주력 다이얼 — 80 · 85 · 90 세 점 슬라이더 */
const Dial = ({ on = 1 }) => (
  <span className="flex flex-col gap-1.5" style={{ width: 220 }}>
    <span className="flex justify-between text-[12px] font-bold" style={{ color: W3 }}><span>누가 뛰나</span><span style={{ color: W1 }}>주력 {[80, 85, 90][on]}+</span></span>
    <span className="relative block h-1.5 rounded-full" style={{ background: `linear-gradient(90deg, ${RED}66, ${US}66)` }}>
      {[0, 1, 2].map((i) => <i key={i} className="absolute top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${i * 50}%`, width: i === on ? 16 : 8, height: i === on ? 16 : 8, background: i === on ? '#fff' : 'rgba(255,255,255,.35)', boxShadow: i === on ? '0 0 0 3px rgba(11,15,26,.9)' : 'none' }} />)}
    </span>
    <span className="flex justify-between text-[11px]" style={{ color: W3 }}><span>자주</span><span>가끔</span><span>드물게</span></span>
  </span>
);
const Chips = ({ items }) => <span className="flex flex-wrap gap-1.5">{items.map(([t, c]) => <span key={t} className="rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ color: c || W1, background: `${c || '#ffffff'}14`, boxShadow: `inset 0 0 0 1px ${c || '#ffffff'}33` }}>{t}</span>)}</span>;

const CENTER = {
  1: ['세 열 카드 · 아래 세부', 'sq', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}>
      <ZoneCard z={Z.bat} id="bat" /><ZoneCard z={Z.run} id="run" /><ZoneCard z={Z.pit} id="pit" sub="col" />
    </div>
  )],
  2: ['위 타자 · 아래 주자 | 투수', 'sq', () => (
    <div className="flex h-full flex-col gap-4">
      <ZoneCard z={Z.bat} id="bat" />
      <div className="grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}><ZoneCard z={Z.run} id="run" grow /><ZoneCard z={Z.pit} id="pit" grow /></div>
    </div>
  )],
  3: ['레인(2단계 줄과 같은 결)', 'sq', () => (
    <div className="flex h-full flex-col gap-3">
      <LaneRow z={Z.bat} id="bat" /><i className="block h-px bg-white/[0.07]" /><LaneRow z={Z.run} id="run" /><i className="block h-px bg-white/[0.07]" /><LaneRow z={Z.pit} id="pit" h={96} />
    </div>
  )],
  4: ['고른 칸 아래로 펼침', 'sq', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}>
      <ZoneCard z={Z.bat} id="bat" />
      <Box><ZoneHead z={Z.run} /><b className="mt-3 text-t3" style={{ color: W2 }}>빠른 1루 주자</b><div className="mt-2"><Opts s={sitOf(Z.run)} kind="card" /></div>
        <div className="mt-2 rounded-lg p-3" style={{ background: 'rgba(16,185,129,.06)', boxShadow: `inset 0 0 0 1px ${US}33` }}><SubRows id="run" on layout="col" /></div></Box>
      <Box><ZoneHead z={Z.pit} /><b className="mt-3 text-t3" style={{ color: W2 }}>경기 운영</b><div className="mt-2"><Opts s={sitOf(Z.pit)} kind="card" /></div>
        <div className="mt-2 rounded-lg p-3" style={{ background: 'rgba(96,165,250,.06)', boxShadow: `inset 0 0 0 1px ${SPB}33` }}><SubRows id="pit" on layout="col" /></div><div className="mt-3"><Auto ko={Z.pit.auto} /></div></Box>
    </div>
  )],
  5: ['다이얼', 'sq', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}>
      <ZoneCard z={Z.bat} id="bat" />
      <Box><ZoneHead z={Z.run} /><b className="mt-3 text-t3" style={{ color: W2 }}>빠른 1루 주자</b><div className="mt-2"><Opts s={sitOf(Z.run)} kind="card" /></div><div className="mt-4"><Dial /></div></Box>
      <ZoneCard z={Z.pit} id="pit" sub="col" />
    </div>
  )],
  6: ['큰 고르기 + 작은 세부 칩', 'sq', () => (
    <div className="flex h-full flex-col gap-4">
      {[['bat', Z.bat], ['run', Z.run], ['pit', Z.pit]].map(([id, z]) => (
        <Box key={id} pad="px-5 py-4">
          <div className="grid items-center gap-5" style={{ gridTemplateColumns: '11rem minmax(0,1fr) 15rem' }}>
            <span className="flex flex-col gap-1.5"><span className="flex items-center gap-2"><Side side={z.side} /><b className="text-t2" style={{ color: W1 }}>{z.ko}</b></span><span className="text-[12px]" style={{ color: W3 }}>{z.sits[0].ko}</span></span>
            <Opts s={sitOf(z)} kind="big" />
            <span className="flex flex-col items-end gap-2"><Link l={z.sits[0].link} />{SUB[id] && <Chips items={SUB[id].map(([k, , cur]) => [`${k} · ${cur}`])} />}{z.auto && <Auto ko="자동 교체" />}</span>
          </div>
        </Box>
      ))}
    </div>
  )],
  7: ['공격 | 수비 두 판', 'sq', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1.35fr 1fr' }}>
      <Box><b className="text-t2" style={{ color: US }}>공격</b>
        <div className="mt-3 flex flex-col gap-5">
          <div className="flex flex-col gap-2"><span className="flex items-center gap-2"><b className="text-t3" style={{ color: W1 }}>타자 · 득점권 기회</b><span className="ml-auto"><Link l={Z.bat.sits[0].link} /></span></span><Opts s={sitOf(Z.bat)} kind="card" /></div>
          <i className="block h-px bg-white/[0.06]" />
          <div className="flex flex-col gap-2"><span className="flex items-center gap-2"><b className="text-t3" style={{ color: W1 }}>주자 · 빠른 1루 주자</b><span className="ml-auto"><Link l={Z.run.sits[0].link} /></span></span><Opts s={sitOf(Z.run)} kind="card" /><SubRows id="run" on /></div>
        </div>
      </Box>
      <Box><b className="text-t2" style={{ color: SPB }}>수비</b>
        <div className="mt-3 flex flex-col gap-2"><span className="flex items-center gap-2"><b className="text-t3" style={{ color: W1 }}>투수 · 경기 운영</b><span className="ml-auto"><Link l={Z.pit.sits[0].link} /></span></span><Opts s={sitOf(Z.pit)} kind="card" /><div className="mt-1"><SubRows id="pit" on layout="col" /></div><div className="mt-3"><Auto ko={Z.pit.auto} /></div></div>
      </Box>
    </div>
  )],
  8: ['위 요약 칩 + 아래 편집', 'sq', () => (
    <div className="flex h-full flex-col gap-4">
      <Box pad="px-4 py-3"><div className="flex items-center gap-3"><b className="text-t4" style={{ color: W2 }}>지금 설정</b><Chips items={[['득점권 · 안타 우선', SKY], ['도루 · 주력 85+', US], ['맞혀 잡기 · 교타자만 · 경기 내내', SPB], ['선발 무너질 때 · 자동 교체', null]]} /></div></Box>
      <div className="grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}><ZoneCard z={Z.bat} id="bat" /><ZoneCard z={Z.run} id="run" sub="col" /><ZoneCard z={Z.pit} id="pit" sub="col" /></div>
    </div>
  )],
};


function Left() {
  const G = [['선발', '제구', '구위', 72], ['선발', '일찍 지침', '길게 던짐', 40], ['타선', '교타', '장타', 70], ['포수', '어깨 약함', '어깨 강함', 22]];
  return (
    <aside className="mt-cut flex flex-col gap-3 p-5" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
      <span className="text-t4" style={{ color: W3 }}>오늘 상대 · 머리(그대로)</span>
      <span style={{ height: 150 }} />
      <b className="text-t3" style={{ color: W1 }}>상대 성향</b>
      {G.map(([who, l, r, at]) => (
        <div key={l} className="grid items-center gap-2 text-[11px]" style={{ gridTemplateColumns: '2.4rem 4.6rem 1fr 4.6rem' }}><span style={{ color: W3 }}>{who}</span><span className="text-right" style={{ color: at < 40 ? W1 : W3 }}>{l}</span><span className="relative block h-1 rounded-full" style={{ background: 'rgba(255,255,255,.08)' }}><i className="absolute block h-3 w-3 -translate-x-1/2 rounded-full bg-white" style={{ left: `${at}%`, top: -4 }} /></span><span style={{ color: at > 60 ? W1 : W3 }}>{r}</span></div>
      ))}
      <i className="my-1 block h-px bg-white/[0.07]" />
      {[['장타 위험', 72, RED, '높음'], ['도루 위험', 40, GOLD, '보통'], ['세 바퀴째 위험', 30, W3, '낮음'], ['도루 기회', 80, US, '큼']].map(([ko, at, c, lv]) => (
        <div key={ko} className="flex flex-col gap-1.5" style={{ opacity: lv === '높음' || lv === '큼' ? 1 : 0.5 }}>
          <span className="flex justify-between"><b className="text-t4 text-white">{ko}</b><b className="text-t4" style={{ color: c }}>{lv}</b></span>
          <span className="relative block h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.08)' }}><i className="absolute block h-3 w-3 -translate-x-1/2 rounded-full" style={{ left: `${at}%`, top: -3, background: c }} /></span>
        </div>
      ))}
    </aside>
  );
}

function App() {
  const [t, slots, Center] = CENTER[V];
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex h-full flex-col gap-3 px-2.5 pb-2.5 pt-3">
        <div className="flex shrink-0 items-center gap-4 px-3" style={{ height: 70 }}><b className="text-t1 font-black text-white">경기 전 정비</b><span className="rounded-full px-3 py-1 text-t4 font-bold" style={{ color: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}66` }}>{V} · {t}</span></div>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
          <Left />
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(20), '--a': US }}>
            <div className="flex shrink-0 items-center gap-6" style={{ height: 40 }}>
              {['라인업', '경기 흐름', '상황 대응'].map((x, i) => (
                <React.Fragment key={x}>
                  <span className="flex items-center gap-2.5"><b className="grid h-8 w-8 place-items-center rounded-full font-display text-t3" style={{ background: i === 2 ? GOLD : 'rgba(52,211,153,.22)', color: i === 2 ? '#1c1203' : '#34d399' }}>{i < 2 ? '✓' : 3}</b><b className="text-t3" style={{ color: i === 2 ? '#fff' : W2 }}>{x}</b></span>
                  {i < 2 && <i className="block h-px w-8 bg-white/15" />}
                </React.Fragment>
              ))}
              <span className="ml-auto flex flex-col gap-1.5" style={{ width: 288 }}><span className="flex justify-between text-t4"><span style={{ color: W2 }}>예상 승률</span><b className="font-display text-t3" style={{ color: '#34d399' }}>52% : 48%</b></span><span className="flex h-1.5 overflow-hidden rounded-full"><i style={{ width: '52%', background: '#34d399' }} /><i className="flex-1" style={{ background: RED }} /></span></span>
            </div>
            <div className="min-h-0 flex-1"><Center /></div>
            <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.08] pt-3" style={{ height: 64 }}>
              <span className="flex-1" />
              <ItemSlots kind={slots} />
              <i className="mx-2 block h-8 w-px bg-white/10" />
              <span className="flex h-12 items-center rounded-lg px-4 text-t3 font-bold" style={{ color: '#d1d5db', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>◀ 이전</span>
              <span className="mt-cut flex h-12 items-center gap-3 px-6" style={{ ...cut(12), minWidth: 288, justifyContent: 'center', background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}><span className="flex gap-1">{[1, 2, 3].map((i) => <i key={i} className="block h-1.5 rounded-full" style={{ width: i === 3 ? 16 : 6, background: '#1c1203' }} />)}</span><b className="text-t2 font-black">경기 시작 ▶</b></span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
