/*
 * 정비 3단계 '우선' 고르기 8안 (/mockups/prep-step3c/?v=1~8, 1920 × 911) — sit-sim(ROADMAP 13)에서 상대에 따라 갈린 것만
 *  공격: 타자 — 득점권 기회(그대로 · 홈런 우선 · 안타 우선 · 출루 우선) ↔ 상대 선발 구위 · 제구 / 주자 — 빠른 1루 주자(그대로 · 도루 우선) ↔ 상대 포수
 *  수비: 투수 — 경기 운영(기본 · 맞혀 잡기) ↔ 상대 파워 · 우리 선발 제구 / 선발 무너질 때 자동 교체(늘)
 *  준비 카드는 아래 띠 '◀ 이전 · 경기 시작' 왼쪽 아이템 칸
 *  1 두 열 구역 · 2 네 칸 가로 · 3 고르기 카드(결과 칩) · 4 회 계획표 + 구역 · 5 세로 목록 · 6 경보 줄 이음 · 7 공격/수비 탭 · 8 큰 단추
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

/* ───── 8안 ───── */
const [BAT, RUN, PIT] = ZONES;
const CENTER = {
  1: ['두 열 구역', 'sq', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1.35fr 1fr' }}>
      <div className="flex flex-col gap-4"><div className="flex items-center gap-2"><b className="text-t2" style={{ color: US }}>공격</b></div><Zone z={BAT} /><Zone z={RUN} /></div>
      <div className="flex flex-col gap-4"><div className="flex items-center gap-2"><b className="text-t2" style={{ color: SPB }}>수비</b></div><Zone z={PIT} /></div>
    </div>
  )],
  2: ['네 칸 가로', 'sq', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}>{ZONES.map((z) => <Zone key={z.id} z={z} />)}</div>
  )],
  3: ['고르기 카드 · 결과 칩', 'sq', () => (
    <div className="flex h-full flex-col gap-4"><Zone z={BAT} kind="card" /><div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}><Zone z={RUN} kind="card" /><Zone z={PIT} kind="card" /></div></div>
  )],
  4: ['회 계획표 + 구역', 'sq', () => (
    <div className="flex h-full flex-col gap-4"><Plan /><div className="grid gap-4" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}>{ZONES.map((z) => <Zone key={z.id} z={z} />)}</div></div>
  )],
  5: ['세로 목록', 'pill', () => (
    <Box className="h-full">
      {ZONES.map((z, k) => z.sits.map((s) => (
        <div key={s.ko} className="grid items-center gap-4 border-b border-white/[0.05] py-4 last:border-b-0" style={{ gridTemplateColumns: '9rem 12rem minmax(0,1fr) 11rem' }}>
          <span className="flex items-center gap-2"><Side side={z.side} /><b className="text-t2" style={{ color: W1 }}>{z.ko}</b></span>
          <b className="text-t3" style={{ color: W2 }}>{s.ko}</b>
          <Opts s={s} />
          <span className="flex justify-end"><Link l={s.link} /></span>
        </div>
      )))}
      <div className="py-4"><Auto ko={PIT.auto} /></div>
    </Box>
  )],
  6: ['경보 줄 이음', 'sq', () => (
    <div className="flex h-full flex-col gap-4">
      {ZONES.map((z) => z.sits.map((s) => (
        <Box key={s.ko} pad="px-4 py-3" style={{ boxShadow: `inset 3px 0 0 ${s.link[2]}, inset 0 0 0 1px rgba(255,255,255,.08)` }}>
          <div className="grid items-center gap-4" style={{ gridTemplateColumns: '14rem minmax(0,1fr)' }}>
            <span className="flex flex-col gap-1"><span className="flex items-center gap-2"><Side side={z.side} /><b className="text-t3" style={{ color: W1 }}>{z.ko} · {s.ko}</b></span><Link l={s.link} /></span>
            <Opts s={s} />
          </div>
        </Box>
      )))}
      <Auto ko={PIT.auto} />
    </div>
  )],
  7: ['공격 / 수비 탭', 'pill', () => (
    <div className="flex h-full flex-col gap-4">
      <span className="flex gap-1 rounded-lg p-1" style={{ width: 'fit-content', background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>{[['공격', '타자 · 주자', true], ['수비', '투수', false]].map(([k, sub, on]) => <span key={k} className="flex items-center gap-2 rounded-md px-5 py-2" style={{ background: on ? 'rgba(16,185,129,.16)' : 'transparent' }}><b className="text-t3" style={{ color: on ? '#fff' : W2 }}>{k}</b><span className="text-[11px]" style={{ color: W3 }}>{sub}</span></span>)}</span>
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.5fr 1fr' }}><Zone z={BAT} kind="card" /><Zone z={RUN} kind="card" /></div>
    </div>
  )],
  8: ['큰 단추', 'sq', () => (
    <div className="grid h-full gap-4" style={{ gridTemplateRows: 'auto auto' }}>
      <Zone z={BAT} kind="big" />
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}><Zone z={RUN} kind="big" /><Zone z={PIT} kind="big" /></div>
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
              <span className="flex min-w-0 flex-col"><span className="text-[11px]" style={{ color: W3 }}>공격 · 선발 · 불펜</span><b className="text-t4" style={{ color: W1 }}>후반 공격형 · 100구 · {PEN[2].name} → {PEN[0].name}</b></span>
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
