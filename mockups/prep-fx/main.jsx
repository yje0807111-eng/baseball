/*
 * 정비 3단계 고르기 설명 = 색 + 숫자 8안 (/mockups/prep-fx/?v=1~8, 1920 × 911)
 *  근거: 다키스트 던전 장신구 · 문명 6 툴팁 · 클래시 로얄 업그레이드 — 이득 초록 + · 손해 빨강 −, 크기를 숫자로
 *  숫자 = 실제 엔진(choice.oddsOf, 경기 중 결정 카드와 같은 셈) — 오늘 상대(1997 현대) 선발 vs 우리 9명, 득점권(2루 · 1아웃) 타석마다 600번(200번은 볼넷이 ±20% 흔들림)
 *   보이는 득실 = 안타 · 홈런 · 볼넷 · 삼진 가운데 이득 · 손해에서 가장 크게 움직인 것 하나씩
 *   도루 = 주력 85+ 주자의 성공 확률(stealOdds) · 정면 승부 = 상대 9명 vs 우리 선발, 존 안 35%
 *  /mockups/prep-fx/ (v 없음) = 한 페이지에 8안 모두(세로로 넘김)
 *  1 말 + 상대 % · 2 이전 → 이후 · 3 %p · 4 ▲▼ · 5 숫자 타일 · 6 막대 · 7 알약 · 8 이득 | 손해 두 칸
 */
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { UiStyle, GlassBg } from '../../src/myteam/ui.jsx';
import { seeded } from '../../src/engine/rng.js';
import { createGame, stealOdds } from '../../src/engine/pitchSim.js';
import { oddsOf } from '../../src/play/choice.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const ME = engineTeam(seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)));
const OPP = engineTeam(seriesTeam(pick(/^1997-hyundai/) || SERIES[9], seeded(5)));
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const V = Number(new URLSearchParams(location.search).get('v') || 0); // 0 = 한 페이지에 8안 모두
const cut = (c) => ({ '--c': `${c}px` });
const US = '#10b981', GOOD = '#34d399', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa', ORG = '#f59e0b', SKY = '#38bdf8', VIO = '#a78bfa';

const rel = (e) => (e.base ? (e.after - e.base) / e.base : 0);
/* ───── 엔진으로 잰 득실 ───── */
function measure() {
  const avg = (list) => { const o = {}; for (const x of list) for (const k of Object.keys(x)) o[k] = (o[k] || 0) + x[k] / list.length; return o; };
  const bat = (order) => avg(ME.batters.slice(0, 9).map((b, i) => {
    const g = createGame({ home: engineTeam(seriesTeam(pick(/^2010-sk/), seeded(2))), away: engineTeam(seriesTeam(pick(/^1997-hyundai/), seeded(5))), rng: seeded(7 + i) });
    Object.assign(g, { top: false, inning: 5, outs: 1, balls: 0, strikes: 0, bases: [null, g.home.team.batters[(i + 8) % 9], null] }); g.home.idx = i;
    return oddsOf(g, order, 600);
  }));
  const zoneIn = (gg) => (gg.rng() < 0.35 ? { zone: [4, 1, 3, 5, 7][Math.floor(gg.rng() * 5)] } : {});
  const pit = (order) => avg(OPP.batters.slice(0, 9).map((b, i) => {
    const g = createGame({ home: engineTeam(seriesTeam(pick(/^2010-sk/), seeded(2))), away: engineTeam(seriesTeam(pick(/^1997-hyundai/), seeded(5))), rng: seeded(70 + i) });
    Object.assign(g, { top: true, inning: 3, outs: 1, balls: 0, strikes: 0, bases: [null, null, null] }); g.away.idx = i;
    return oddsOf(g, order, 600);
  }));
  const base = bat(() => ({})), pow = bat(() => ({ approach: 'power' })), con = bat(() => ({ approach: 'contact' })), pat = bat(() => ({ patience: 1 }));
  const pBase = pit(() => ({})), pZone = pit(zoneIn);
  const runners = ME.batters.filter((p) => st(p, 'speed') >= 85);
  const steal = runners.length ? runners.reduce((a, r) => { const g = createGame({ home: ME, away: OPP, rng: seeded(3) }); Object.assign(g, { top: false, inning: 5, outs: 0, bases: [r, null, null] }); return a + stealOdds(g, 0) / runners.length; }, 0) : 0;
  /* 네 수치 가운데 이득 · 손해에서 가장 크게 움직인 것 하나씩(3% 아래는 뺌) — 손으로 고른 문구가 엔진과 어긋나던 것(홈런 우선 '삼진 증가'는 실측 ±0) */
  const KEYS = [['안타', 'hit', 1], ['홈런', 'hr', 1], ['볼넷', 'bb', 1], ['삼진', 'k', -1]];
  const top = (from, to, mine = true) => {
    const all = KEYS.map(([ko, k, up]) => ({ ko, base: from[k], after: to[k], good: (to[k] - from[k]) * up * (mine ? 1 : -1) > 0 })).filter((e) => Math.abs(rel(e)) >= 0.03).sort((x, y) => Math.abs(rel(y)) - Math.abs(rel(x)));
    return [all.find((e) => e.good), all.find((e) => !e.good)].filter(Boolean);
  };
  return {
    bat: [[], top(base, pow), top(base, con), top(base, pat)],
    run: [[], [{ ko: '도루 성공', abs: steal, good: true }, { ko: '실패 아웃', abs: 1 - steal, good: false }]],
    pit: [[], top(pBase, pZone, false)],
  };
}

/* ───── 숫자 꼴 ───── */
const pc = (x) => `${Math.round(x * 100)}%`;
const pc1 = (x) => `${(x * 100).toFixed(1)}%`;
const pp = (e) => (e.after - e.base) * 100;
const sign = (x) => (x > 0 ? '+' : x < 0 ? '−' : '±');
const colorOf = (e) => (e.good ? GOOD : RED);
/* 이득 = 좋은 쪽으로 움직인 것(볼넷 감소도 이득) */
const FMT = {
  1: (e) => e.abs != null ? `${e.ko} 확률 ${pc(e.abs)}` : `${e.ko} 확률 ${sign(rel(e))}${pc(Math.abs(rel(e)))}`,
  2: (e) => e.abs != null ? `${e.ko} ${pc(e.abs)}` : <>{e.ko} <span style={{ color: W3 }}>{pc1(e.base)}</span> → {pc1(e.after)}</>,
  3: (e) => e.abs != null ? `${e.ko} ${pc(e.abs)}` : `${e.ko} ${sign(pp(e))}${Math.abs(pp(e)).toFixed(1)}%p`,
  4: (e) => e.abs != null ? `${e.ko} ${pc(e.abs)}` : <>{(e.after >= e.base ? '▲' : '▼')} {e.ko} {pc(Math.abs(rel(e)))}</>,
};

function Fx({ list, on, v }) {
  if (!list.length) return <span className="text-[12px] font-bold" style={{ color: W3 }}>정비 계획대로</span>;
  const op = on ? 1 : 0.7;
  if (v <= 4) return <span className="flex flex-col">{list.map((e) => <span key={e.ko} className="truncate text-[13px] font-bold" style={{ color: colorOf(e), opacity: op }}>{FMT[v](e)}</span>)}</span>;
  if (v === 5) return (
    <span className="mt-1 flex gap-2" style={{ opacity: op }}>{list.map((e) => (
      <span key={e.ko} className="flex flex-col items-start rounded-md px-2 py-1" style={{ background: `${colorOf(e)}14` }}>
        <b className="font-display text-t2 leading-none" style={{ color: colorOf(e) }}>{e.abs != null ? pc(e.abs) : `${sign(rel(e))}${pc(Math.abs(rel(e)))}`}</b>
        <span className="text-[11px] font-bold" style={{ color: W2 }}>{e.ko}</span>
      </span>
    ))}</span>
  );
  if (v === 6) return (
    <span className="mt-1 flex flex-col gap-1.5 self-stretch" style={{ opacity: op }}>{list.map((e) => {
      const a = e.abs ?? e.base, b = e.abs ?? e.after, max = e.abs != null ? 1 : Math.max(a, b, 0.0001) * 1.25;
      return (
        <span key={e.ko} className="grid items-center gap-2" style={{ gridTemplateColumns: '3.6rem minmax(0,1fr) 3rem' }}>
          <span className="text-[12px] font-bold" style={{ color: W2 }}>{e.ko}</span>
          <span className="relative block h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.07)' }}>
            {e.abs == null && <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${(Math.min(a, b) / max) * 100}%`, background: 'rgba(255,255,255,.3)' }} />}
            <i className="absolute inset-y-0 block rounded-full" style={{ left: e.abs != null ? 0 : `${(Math.min(a, b) / max) * 100}%`, width: `${(e.abs != null ? b : Math.abs(b - a)) / max * 100}%`, background: colorOf(e) }} />
          </span>
          <b className="text-right font-display text-[13px]" style={{ color: colorOf(e) }}>{e.abs != null ? pc(e.abs) : `${sign(rel(e))}${pc(Math.abs(rel(e)))}`}</b>
        </span>
      );
    })}</span>
  );
  if (v === 7) return (
    <span className="mt-1 flex flex-wrap gap-1.5" style={{ opacity: op }}>{list.map((e) => (
      <span key={e.ko} className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ color: colorOf(e), background: `${colorOf(e)}1f`, boxShadow: `inset 0 0 0 1px ${colorOf(e)}55` }}>
        <b className="font-display text-[13px]">{e.abs != null ? pc(e.abs) : `${sign(rel(e))}${pc(Math.abs(rel(e)))}`}</b> {e.ko}
      </span>
    ))}</span>
  );
  /* 8 — 이득 | 손해 두 칸 */
  const g = list.filter((e) => e.good), b = list.filter((e) => !e.good);
  const cell = (e) => <span key={e.ko} className="flex items-baseline gap-1.5"><span className="text-[12px] font-bold" style={{ color: W2 }}>{e.ko}</span><b className="font-display text-t3" style={{ color: colorOf(e) }}>{e.abs != null ? pc(e.abs) : `${sign(rel(e))}${pc(Math.abs(rel(e)))}`}</b></span>;
  return (
    <span className="mt-1 grid gap-2 self-stretch" style={{ gridTemplateColumns: '1fr 1fr', opacity: op }}>
      <span className="flex flex-col border-l-2 pl-2" style={{ borderColor: GOOD }}>{g.map(cell)}</span>
      <span className="flex flex-col border-l-2 pl-2" style={{ borderColor: RED }}>{b.map(cell)}</span>
    </span>
  );
}

function Opts({ opts, fx, value, onPick, v }) {
  return (
    <span className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${opts.length},minmax(0,1fr))` }}>
      {opts.map(([id, ko, c, none], i) => {
        const on = value === i, col = c || '#cbd5e1';
        return (
          <button key={ko} type="button" onClick={() => onPick(i)} className="flex min-w-0 flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left"
            style={{ background: on ? `${col}1f` : 'rgba(255,255,255,.025)', boxShadow: `inset 0 0 0 1px ${on ? col : 'rgba(255,255,255,.08)'}` }}>
            <span className="flex items-center gap-1.5"><i className="block h-2 w-2 rounded-full" style={{ background: c || 'rgba(255,255,255,.3)' }} /><b className="truncate text-t4" style={{ color: on ? '#fff' : W2 }}>{ko}</b></span>
            {fx[i].length ? <Fx list={fx[i]} on={on} v={v} /> : <span className="text-[12px] font-bold" style={{ color: W3 }}>{none}</span>}
          </button>
        );
      })}
    </span>
  );
}
const Side = ({ side }) => <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: side === '공격' ? US : SPB, boxShadow: `inset 0 0 0 1px ${side === '공격' ? US : SPB}66` }}>{side}</span>;
function Row({ side, ko, sit, main, sub }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: '9rem minmax(0,1fr)' }}>
      <span className="flex flex-col justify-center gap-1 pr-3"><span className="flex items-center gap-2"><Side side={side} /><b className="text-t2" style={{ color: W1 }}>{ko}</b></span><span className="text-[12px]" style={{ color: W3 }}>{sit}</span></span>
      <span className="flex items-center gap-5 rounded-lg px-3 py-2.5" style={{ minHeight: 80, background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="min-w-0 flex-1">{main}</span>
        {sub && <span className="flex w-64 shrink-0 flex-col gap-2 text-[12px]" style={{ color: W3 }}>{sub}</span>}
      </span>
    </div>
  );
}

function Center({ v, M, all }) {
  const [bat, setBat] = useState(1), [run, setRun] = useState(1), [pit, setPit] = useState(1);
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Row side="공격" ko="타자" sit="득점권 기회" main={<Opts v={v} value={bat} onPick={setBat} fx={M.bat} opts={[[null, '그대로', null, '정비 계획대로'], ['p', '홈런 우선', ORG], ['c', '안타 우선', SKY], ['e', '출루 우선', VIO]]} />} />
      <i className="block h-px shrink-0 bg-white/[0.07]" />
      <Row side="공격" ko="주자" sit="빠른 1루 주자" sub={<span>누가 뛰나 · 주력 85+ (그대로)</span>} main={<Opts v={v} value={run} onPick={setRun} fx={M.run} opts={[[null, '그대로', null, '뛰지 않음'], ['r', '도루 우선', US]]} />} />
      <i className="block h-px shrink-0 bg-white/[0.07]" />
      <Row side="수비" ko="투수" sit="경기 운영" sub={<span>누구에게 · 언제 (그대로)</span>} main={<Opts v={v} value={pit} onPick={setPit} fx={M.pit} opts={[[null, '기본', null, '투수 배합대로'], ['z', '정면 승부', SPB]]} />} />
      {!all && <div className="mt-1 flex min-h-0 flex-1 items-center justify-center rounded-lg text-t4" style={{ color: W3, background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>타순 두 줄(그대로)</div>}
    </div>
  );
}

const TITLES = { 1: '말 + 상대 %', 2: '이전 → 이후', 3: '%p', 4: '▲▼ + %', 5: '숫자 타일', 6: '막대', 7: '알약', 8: '이득 | 손해 두 칸' };
function All({ M }) {
  return (
    <div className="relative" style={{ width: 1920, minHeight: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex flex-col gap-4 px-6 py-5">
        <div className="flex items-center gap-4"><b className="text-t1 font-black text-white">고르기 득실 · 색 + 숫자 8안</b><span className="text-t4" style={{ color: W3 }}>2010 SK vs 1997 현대 · 엔진 실측 · 눌러서 바꿔 보기 가능</span></div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => (
          <section key={v} className="mt-cut mt-frame mt-glass flex flex-col gap-3 p-5" style={{ ...cut(16), '--a': US }}>
            <span className="flex items-center gap-3"><b className="grid h-8 w-8 place-items-center rounded-full font-display text-t3" style={{ background: GOLD, color: '#1c1203' }}>{v}</b><b className="text-t2" style={{ color: W1 }}>{TITLES[v]}</b></span>
            <Center v={v} M={M} all />
          </section>
        ))}
      </div>
    </div>
  );
}
function App() {
  const M = useMemo(measure, []);
  if (!V) return <All M={M} />;
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex h-full flex-col gap-3 px-2.5 pb-2.5 pt-3">
        <div className="flex shrink-0 items-center gap-4 px-3" style={{ height: 70 }}><b className="text-t1 font-black text-white">경기 전 정비</b><span className="rounded-full px-3 py-1 text-t4 font-bold" style={{ color: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}66` }}>{V} · {TITLES[V]}</span><span className="text-t4" style={{ color: W3 }}>2010 SK vs 1997 현대 · 엔진 실측</span></div>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
          <aside className="mt-cut p-5" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}><span className="text-t4" style={{ color: W3 }}>오늘 상대(그대로)</span></aside>
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(20), '--a': US }}>
            <div className="flex shrink-0 items-center gap-6" style={{ height: 40 }}><b className="text-t3" style={{ color: W1 }}>3 상황 대응</b></div>
            <div className="min-h-0 flex-1"><Center v={V} M={M} /></div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
