/*
 * 정비 2단계 공격 줄 — 쉽게 짜기 14안 (/mockups/prep-attack/?v=1~14, 1920 × 911)
 *  지금: 회 칸을 누를 때마다 보통 → 강공 → 짧게 → 기다리기 돌림(원하는 값까지 여러 번) + 구간 손잡이
 *  A 붓 칠하기: 성향 하나 고르고 회 위를 끌면 그 성향(그림판 · 간트 칠하기) / B 한 번에 채우기: 묶음 단추 / C 회 칸 팝업
 *  1~8 = A + B, 9 · 10 = A, 11 · 12 = B, 13 · 14 = C. 칠하는 중 모습은 점선 칸 + 위 칩(5~7회 강공)
 *  1 왼쪽 붓 + 위 묶음 · 2 아래 도구 띠 · 3 묶음 카드(미리보기) · 4 떠 있는 붓 + 채우기 메뉴 · 5 기회 연동 · 6 초중후 + 붓 · 7 단축키 붓 · 8 최소
 *  9 붓만(왼쪽) · 10 붓 쟁반 · 11 묶음 줄 · 12 상대 흐름 묶음 · 13 칸 위 알약 · 14 칸 아래 목록
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const ME = engineTeam(seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)));
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => Math.round((st(p, 'stuff', 80) + st(p, 'control', 75)) / 2);
const V = Number(new URLSearchParams(location.search).get('v') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', OPP = '#a78bfa', SPB = '#60a5fa';
const SP = ME.pitchers[0];
const PEN = ME.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a));
const MOUND = [79, 78, 74, 71, 68, 68, 69, 72, 79];
const AVG = MOUND.reduce((a, b) => a + b, 0) / 9;
const LOW = MOUND.map((v) => v <= AVG - 2);
const EXIT = 5.2;
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const pct = (inn) => `${(inn / 9) * 100}%`;
const L = '9rem';
const KO = { base: '보통', power: '강공', contact: '짧게', patience: '기다리기' };
const C = { base: W3, power: '#f59e0b', contact: '#38bdf8', patience: '#a78bfa' };
const ORDER = ['power', 'contact', 'patience', 'base'];
const A0 = ['base', 'base', 'base', 'power', 'power', 'base', 'base', 'base', 'contact'];
const PAINT = { a: 4, b: 7, v: 'power' }; // 칠하는 중 — 4~7회 강공

/* ───── 바탕 조각(지금 게임 모습) ───── */
function Lane({ label, sub, h = 60, children, glass = true, lead }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: `${L} minmax(0,1fr)`, minHeight: h }}>
      <span className="flex flex-col items-start justify-center gap-1.5 pr-3"><b className="text-t3" style={{ color: W1 }}>{label}</b>{sub && <span className="text-[11px]" style={{ color: W3 }}>{sub}</span>}{lead}</span>
      <span className="relative block rounded-lg" style={glass ? { background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' } : null}>
        <span className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <i key={i} style={{ borderLeft: i > 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: LOW[i - 1] ? 'rgba(16,185,129,.06)' : 'transparent' }} />)}</span>
        {children}
      </span>
    </div>
  );
}
const Head = () => (
  <div className="grid" style={{ gridTemplateColumns: `${L} minmax(0,1fr)` }}>
    <span />
    <span className="grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <span key={i} className="flex flex-col items-center"><b className="font-display text-t3" style={{ color: LOW[i - 1] ? US : W2 }}>{i}회</b><span className="text-[10px]" style={{ color: US, visibility: LOW[i - 1] ? 'visible' : 'hidden' }}>기회</span></span>)}</span>
  </div>
);
const Grip = ({ x, on }) => (
  <span className="absolute z-10 flex -translate-x-1/2 items-center justify-center" style={{ left: x, top: 4, bottom: 4, width: 16 }}>
    <i className="absolute w-px" style={{ top: 4, bottom: 4, background: on ? US : 'rgba(255,255,255,.10)' }} />
    <i className="relative block rounded-full" style={{ height: 20, width: 4, background: on ? US : 'rgba(255,255,255,.3)' }} />
  </span>
);
const OppCells = () => <span className="absolute grid gap-1" style={{ inset: 4, gridTemplateColumns: 'repeat(9,1fr)' }}>{MOUND.map((v, i) => <span key={i} className="grid place-items-center rounded-md font-display text-t4" style={{ background: LOW[i] ? 'rgba(16,185,129,.16)' : `rgba(167,139,250,${0.1 + (v - 66) / 70})`, color: LOW[i] ? US : W1 }}>{v}</span>)}</span>;
function Mound() {
  const box = (a, b, p, close) => (
    <span key={a} className="absolute flex items-center justify-center gap-1.5 rounded-md" style={{ top: 6, bottom: 6, left: `calc(${pct(a)} + 5px)`, width: `calc(${pct(b - a)} - 10px)`, background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
      <Portrait player={p} w={24} h={30} color="#334155" /><span className="flex flex-col leading-tight"><span className="text-[11px]" style={{ color: W1 }}>{p.name}</span>{close && <span className="text-[10px]" style={{ color: GOLD }}>마무리</span>}</span>
    </span>
  );
  return (
    <>
      <span className="absolute flex items-center gap-2 rounded-md px-2" style={{ top: 6, bottom: 6, left: 4, width: `calc(${pct(EXIT)} - 9px)`, background: `linear-gradient(90deg, ${SPB}66, ${SPB}22)` }}>
        <Portrait player={SP} w={30} h={38} color="#334155" /><b className="text-t4" style={{ color: W1 }}>{SP.name}</b>
        <b className="ml-auto rounded-md px-2 py-0.5 text-t4" style={{ background: 'rgba(11,15,26,.72)', color: W1, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>85구 · 약 5.2회</b>
      </span>
      {box(EXIT, 7, PEN[2])}{box(7, 8, PEN[1])}{box(8, 9, PEN[0], true)}
      <Grip x={pct(EXIT)} /><Grip x={pct(7)} /><Grip x={pct(8)} />
    </>
  );
}
const Aug = () => <span className="absolute top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-t4 font-black" style={{ zIndex: 0, left: pct(5.5), width: 32, height: 32, background: GOLD, color: '#1c1203', boxShadow: '0 0 0 3px rgba(11,15,26,.9)' }}>✦</span>;
const Mix = () => (
  <span className="flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>볼 배합</span>
    <span className="inline-flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>{['섞기', '직구', '휘는 공', '떨어지는 공'].map((o, i) => <b key={o} className="rounded-md px-3 py-1 text-t4" style={i === 0 ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : { color: W2 }}>{o}</b>)}</span>
  </span>
);

/* ───── 공격 칸 ───── */
const segsOf = (atk) => atk.reduce((acc, v, i) => { const t = acc[acc.length - 1]; if (t && t.v === v) t.b = i + 1; else acc.push({ a: i + 1, b: i + 1, v }); return acc; }, []);
function Atk({ vals = A0, paint = null, grips = true, sel = null }) {
  const segs = segsOf(vals);
  return (
    <>
      {segs.map((s) => (
        <span key={s.a} className="absolute flex items-center justify-center gap-2 rounded-md" style={{ top: 6, bottom: 6, left: `calc(${pct(s.a - 1)} + 3px)`, width: `calc(${pct(s.b - s.a + 1)} - 6px)`, background: s.v === 'base' ? 'rgba(255,255,255,.04)' : `${C[s.v]}1f`, boxShadow: `inset 0 0 0 1px ${s.v === 'base' ? 'rgba(255,255,255,.08)' : `${C[s.v]}66`}` }}>
          {s.v !== 'base' && <i className="block rounded-full" style={{ width: 8, height: 8, background: C[s.v] }} />}<b className="text-t4" style={{ color: s.v === 'base' ? W2 : W1 }}>{KO[s.v]}</b>
        </span>
      ))}
      {grips && segs.slice(0, -1).map((s) => <Grip key={s.b} x={pct(s.b)} />)}
      {paint && (
        <>
          <span className="absolute rounded-md" style={{ top: 3, bottom: 3, left: `calc(${pct(paint.a - 1)} + 1px)`, width: `calc(${pct(paint.b - paint.a + 1)} - 2px)`, background: `${C[paint.v]}33`, boxShadow: `inset 0 0 0 2px ${C[paint.v]}`, outline: `1px dashed ${C[paint.v]}`, outlineOffset: 3 }} />
          <b className="absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-t4" style={{ top: -30, left: pct((paint.a - 1 + paint.b) / 2), background: 'rgba(11,15,26,.88)', color: W1, boxShadow: `inset 0 0 0 1px ${C[paint.v]}` }}>{paint.a}~{paint.b}회 {KO[paint.v]}</b>
          <Brush x={pct(paint.b - 0.3)} c={C[paint.v]} />
        </>
      )}
      {sel && <span className="absolute rounded-md" style={{ top: 3, bottom: 3, left: `calc(${pct(sel - 1)} + 1px)`, width: `calc(${pct(1)} - 2px)`, boxShadow: `inset 0 0 0 2px ${US}` }} />}
    </>
  );
}
/* 붓 모양 손(칠하는 중 커서) */
const Brush = ({ x, c }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" className="absolute z-20" style={{ left: x, top: '58%' }}><path d="M3 21c3 0 5-2 5-4.5 0-1.4-1.1-2.5-2.5-2.5S3 15.1 3 16.5V21z" fill={c} /><path d="M9.5 14.5 20 4l-1.5-1.5L8 13" stroke="#fff" strokeWidth="2" fill="none" /></svg>
);
/* 붓 칩 — 고른 성향은 채워진 바탕 */
const Chip = ({ v, on, k, big, wide }) => (
  <span className="flex items-center gap-1.5 rounded-md" style={{ padding: big ? '8px 12px' : '4px 8px', width: wide ? '100%' : undefined, background: on ? `${C[v]}2e` : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? C[v] : 'rgba(255,255,255,.09)'}` }}>
    <i className="block rounded-full" style={{ width: 8, height: 8, background: v === 'base' ? 'rgba(255,255,255,.35)' : C[v] }} />
    <b className="whitespace-nowrap text-t4" style={{ color: on ? "#fff" : W2 }}>{KO[v]}</b>
    {k && <span className="ml-auto rounded px-1 font-display text-[11px]" style={{ color: W3, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>{k}</span>}
  </span>
);
const Palette = ({ on = 'power', col, keys, big }) => (
  <span className={col ? 'flex w-full flex-col gap-1' : 'flex items-center gap-1.5'}>{ORDER.map((v, i) => <Chip key={v} v={v} on={v === on} k={keys ? String(i + 1) : null} big={big} wide={col} />)}</span>
);
const Ghost = ({ children, on, c = US }) => (
  <span className="rounded-md px-3 py-1 text-t4 font-bold" style={{ color: on ? '#fff' : W2, background: on ? `${c}26` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${on ? c : 'rgba(255,255,255,.1)'}` }}>{children}</span>
);
const PRESETS = ['기회 회 강공', '초반 기다리기', '후반 짧게', '모두 보통'];
const Mini = ({ vals }) => <span className="flex gap-0.5">{vals.map((v, i) => <i key={i} className="block rounded-sm" style={{ width: 14, height: 8, background: v === 'base' ? 'rgba(255,255,255,.12)' : C[v] }} />)}</span>;
const P_LOW = INN.map((i) => (LOW[i - 1] ? 'power' : 'base'));
const P_EARLY = ['patience', 'patience', 'patience', 'base', 'base', 'base', 'base', 'base', 'base'];
const P_LATE = ['base', 'base', 'base', 'base', 'base', 'base', 'contact', 'contact', 'contact'];

/* ───── 공통 판 ───── */
function Board({ atk, atkLead, atkSub = null, above = null, below = null, atkH = 60 }) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="mt-cut flex shrink-0 items-center gap-4 px-4 py-2.5" style={{ ...cut(12), background: 'rgba(96,165,250,.06)', boxShadow: 'inset 0 0 0 1px rgba(96,165,250,.28)' }}>
        <Portrait player={SP} w={36} h={44} color="#334155" />
        <span className="flex flex-col"><span className="text-t4" style={{ color: W3 }}>오늘 선발</span><b className="text-t2" style={{ color: W1 }}>{SP.name}</b></span>
        <span className="ml-auto flex items-center gap-3"><span className="text-t4" style={{ color: W2 }}>끊는 기준</span><Ghost>이닝</Ghost><Ghost on c="#ffffff">투구 수</Ghost><Ghost>타자 수</Ghost><b className="font-display text-t1" style={{ color: W1 }}>85구</b></span>
      </div>
      <Head />
      <Lane label="상대 마운드" h={42} glass={false}><OppCells /></Lane>
      <i className="block h-px shrink-0 bg-white/[0.07]" />
      <Lane label="우리 마운드" h={68}><Mound /></Lane>
      {above}
      <Lane label="공격" sub={atkSub} h={atkH} lead={atkLead}>{atk}</Lane>
      {below}
      <Lane label="증강" h={42} glass={false}><Aug /></Lane>
      <span className="mt-auto flex justify-end"><Mix /></span>
    </div>
  );
}
const Row = ({ children, style }) => <div className="grid items-center" style={{ gridTemplateColumns: `${L} minmax(0,1fr)`, ...style }}><span />{children}</div>;

const CENTER = {
  1: ['A+B · 왼쪽 붓 + 위 묶음', () => (
    <Board atkH={96} atkLead={<span className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr', width: '100%' }}>{ORDER.map((v) => <Chip key={v} v={v} on={v === 'power'} />)}</span>}
      above={<Row><span className="flex items-center gap-1.5"><span className="mr-1 text-t4" style={{ color: W3 }}>한 번에</span>{PRESETS.map((p, i) => <Ghost key={p} on={i === 0}>{p}</Ghost>)}</span></Row>}
      atk={<Atk paint={PAINT} />} />
  )],
  2: ['A+B · 아래 도구 띠', () => (
    <Board atk={<Atk paint={PAINT} />}
      below={<Row><span className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,.025)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}><span className="flex items-center gap-2"><span className="text-t4" style={{ color: W3 }}>칠하기</span><Palette /></span><span className="flex items-center gap-1.5"><span className="mr-1 text-t4" style={{ color: W3 }}>한 번에</span>{PRESETS.map((p) => <Ghost key={p}>{p}</Ghost>)}</span></span></Row>} />
  )],
  3: ['A+B · 묶음 카드', () => (
    <Board atkLead={<Palette col />} atkH={120} atk={<Atk vals={P_LOW.map((v, i) => (i === 8 ? 'contact' : v))} />}
      above={<Row><span className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>{[['기회 회 강공', P_LOW], ['초반 기다리기', P_EARLY], ['후반 짧게', P_LATE], ['모두 보통', Array(9).fill('base')]].map(([t, v], i) => (
        <span key={t} className="mt-cut flex items-center justify-between px-3 py-2" style={{ ...cut(8), background: i === 0 ? 'rgba(16,185,129,.1)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${i === 0 ? US : 'rgba(255,255,255,.08)'}` }}><b className="text-t4" style={{ color: i === 0 ? '#fff' : W2 }}>{t}</b><Mini vals={v} /></span>
      ))}</span></Row>} />
  )],
  4: ['A+B · 떠 있는 붓 + 채우기 메뉴', () => (
    <Board atkH={68} atk={<>
      <Atk paint={PAINT} />
      <span className="absolute z-20 flex items-center gap-1 rounded-lg p-1" style={{ right: 8, top: -44, background: 'rgba(11,15,26,.92)', boxShadow: '0 8px 24px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.1)' }}><Palette /><i className="mx-1 block h-5 w-px bg-white/10" /><span className="flex items-center gap-1 rounded-md px-2 py-1 text-t4 font-bold" style={{ color: W1, background: 'rgba(255,255,255,.06)' }}>채우기 ▾</span></span>
      <span className="absolute z-30 flex flex-col gap-0.5 rounded-lg p-1" style={{ right: 8, top: -4, width: 270, background: 'rgba(11,15,26,.96)', boxShadow: '0 12px 28px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.1)' }}>{[['기회 회 강공', P_LOW], ['초반 기다리기', P_EARLY], ['후반 짧게', P_LATE], ['모두 보통', Array(9).fill('base')]].map(([t, v], i) => <span key={t} className="flex items-center justify-between rounded-md px-2 py-1.5" style={{ background: i === 0 ? 'rgba(255,255,255,.07)' : 'transparent' }}><b className="whitespace-nowrap text-t4" style={{ color: W1 }}>{t}</b><Mini vals={v} /></span>)}</span>
    </>} />
  )],
  5: ['A+B · 기회 연동', () => (
    <Board atkH={96} atkLead={<span className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr', width: '100%' }}>{ORDER.map((v) => <Chip key={v} v={v} on={v === 'power'} />)}</span>}
      above={<Row><span className="flex items-center gap-2"><span className="flex items-center gap-1.5 rounded-md px-3 py-1 text-t4 font-bold" style={{ color: '#fff', background: 'rgba(16,185,129,.18)', boxShadow: `inset 0 0 0 1px ${US}` }}><i className="block rounded-full" style={{ width: 8, height: 8, background: C.power }} />기회 회에 칠하기</span><span className="text-t4" style={{ color: W3 }}>고른 붓</span></span></Row>}
      atk={<><Atk vals={A0} grips={false} />{INN.filter((i) => LOW[i - 1]).map((i) => <span key={i} className="absolute rounded-md" style={{ top: 3, bottom: 3, left: `calc(${pct(i - 1)} + 1px)`, width: `calc(${pct(1)} - 2px)`, outline: `1px dashed ${C.power}`, background: `${C.power}14` }} />)}</>} />
  )],
  6: ['A+B · 초중후 + 붓', () => (
    <Board atkLead={<Palette col />} atkH={120} atk={<Atk vals={['patience', 'patience', 'patience', 'power', 'power', 'power', 'contact', 'contact', 'contact']} paint={{ a: 9, b: 9, v: 'base' }} />}
      above={<Row><span className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{[['초반 1~3회', 'patience'], ['중반 4~6회', 'power'], ['후반 7~9회', 'contact']].map(([t, on]) => (
        <span key={t} className="flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,.025)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}><b className="text-t4" style={{ color: W2 }}>{t}</b><span className="flex gap-1">{ORDER.map((v) => <i key={v} className="grid place-items-center rounded-md" style={{ width: 26, height: 22, background: v === on ? `${C[v]}33` : 'transparent', boxShadow: `inset 0 0 0 1px ${v === on ? C[v] : 'rgba(255,255,255,.08)'}` }}><i className="block rounded-full" style={{ width: 7, height: 7, background: v === 'base' ? 'rgba(255,255,255,.35)' : C[v] }} /></i>)}</span></span>
      ))}</span></Row>} />
  )],
  7: ['A+B · 단축키 붓', () => (
    <Board atkLead={<Palette col keys />} atkH={124} atk={<Atk paint={PAINT} />}
      below={<Row><span className="flex items-center gap-1.5"><span className="mr-1 text-t4" style={{ color: W3 }}>한 번에</span>{PRESETS.map((p) => <Ghost key={p}>{p}</Ghost>)}</span></Row>} />
  )],
  8: ['A+B · 최소', () => (
    <Board atkLead={<span className="flex items-center gap-1.5"><Chip v="power" on /><span className="text-[11px]" style={{ color: W3 }}>▾</span></span>} atk={<Atk paint={PAINT} />}
      above={<Row><span className="flex justify-end gap-3">{PRESETS.map((p) => <span key={p} className="text-t4 font-bold" style={{ color: W2 }}>{p}</span>)}</span></Row>} />
  )],
  9: ['A · 붓만(왼쪽)', () => <Board atkLead={<Palette col />} atkH={120} atk={<Atk paint={PAINT} />} />],
  10: ['A · 붓 쟁반', () => (
    <Board atk={<Atk paint={PAINT} />}
      below={<Row><span className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>{ORDER.map((v) => <Chip key={v} v={v} on={v === 'power'} big />)}</span></Row>} />
  )],
  11: ['B · 묶음 줄', () => (
    <Board atk={<Atk vals={P_EARLY.map((v, i) => (i >= 6 ? 'contact' : v))} />}
      above={<Row><span className="flex items-center gap-1.5">{[['기회 회 강공', P_LOW], ['초반 기다리기', P_EARLY], ['후반 짧게', P_LATE], ['초반 기다리기 · 후반 짧게', P_EARLY.map((v, i) => (i >= 6 ? 'contact' : v))], ['모두 보통', Array(9).fill('base')]].map(([t, v], i) => (
        <span key={t} className="flex items-center gap-2 rounded-md px-3 py-1.5" style={{ background: i === 3 ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${i === 3 ? US : 'rgba(255,255,255,.08)'}` }}><b className="text-t4" style={{ color: i === 3 ? '#fff' : W2 }}>{t}</b><Mini vals={v} /></span>
      ))}</span></Row>} />
  )],
  12: ['B · 상대 흐름 묶음', () => (
    <Board atkH={68} atk={<Atk vals={P_LOW} />}
      above={<Row><span className="flex items-center gap-1.5"><span className="mr-1 text-t4" style={{ color: W3 }}>기회 회</span>{['power', 'contact', 'patience'].map((v) => <Chip key={v} v={v} on={v === 'power'} />)}<i className="mx-2 block h-5 w-px bg-white/10" /><span className="mr-1 text-t4" style={{ color: W3 }}>나머지</span>{['base', 'patience', 'contact'].map((v) => <Chip key={v} v={v} on={v === 'base'} />)}</span></Row>} />
  )],
  13: ['C · 칸 위 알약', () => (
    <Board atkH={68} atk={<>
      <Atk sel={6} />
      <span className="absolute z-20 flex -translate-x-1/2 items-center gap-1 rounded-full p-1" style={{ left: pct(5.5), top: -44, background: 'rgba(11,15,26,.94)', boxShadow: '0 8px 22px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.12)' }}>{ORDER.map((v) => <span key={v} className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: v === 'power' ? `${C[v]}2e` : 'transparent', boxShadow: v === 'power' ? `inset 0 0 0 1px ${C[v]}` : 'none' }}><i className="block rounded-full" style={{ width: 8, height: 8, background: v === 'base' ? 'rgba(255,255,255,.35)' : C[v] }} /><b className="text-t4" style={{ color: v === 'power' ? '#fff' : W2 }}>{KO[v]}</b></span>)}</span>
    </>} />
  )],
  14: ['C · 칸 아래 목록', () => (
    <Board atkH={68} atk={<>
      <Atk sel={6} />
      <span className="absolute flex flex-col gap-0.5 rounded-lg p-1" style={{ zIndex: 50, left: `calc(${pct(5)} + 2px)`, top: 'calc(100% + 4px)', width: `calc(${pct(1)} + 40px)`, background: 'rgba(11,15,26,.96)', boxShadow: '0 12px 28px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.12)' }}>{ORDER.map((v) => <span key={v} className="flex items-center gap-2 rounded-md px-2 py-1.5" style={{ background: v === 'power' ? 'rgba(255,255,255,.07)' : 'transparent' }}><i className="block rounded-full" style={{ width: 8, height: 8, background: v === 'base' ? 'rgba(255,255,255,.35)' : C[v] }} /><b className="text-t4" style={{ color: W1 }}>{KO[v]}</b>{v === 'base' && <span className="ml-auto text-[11px]" style={{ color: W3 }}>✓</span>}</span>)}</span>
    </>} />
  )],
};

function Left() {
  const W = 300, H = 90, x = (i) => (i * W) / 8, y = (v) => H - 10 - (v - (AVG - 8)) * 4.5;
  let d = `M0,${H} L0,${y(MOUND[0])}`;
  for (let i = 1; i < 9; i += 1) { const mx = (x(i - 1) + x(i)) / 2; d += ` C${mx},${y(MOUND[i - 1])} ${mx},${y(MOUND[i])} ${x(i)},${y(MOUND[i])}`; }
  d += ` L${W},${H} Z`;
  return (
    <aside className="mt-cut flex flex-col gap-3 p-5" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
      <span className="text-t4" style={{ color: W3 }}>오늘 상대 판 · 머리</span>
      <span style={{ height: 220 }} />
      <b className="text-t3" style={{ color: W2 }}>상대 흐름</b>
      <svg width={W} height={H} style={{ overflow: 'visible' }}><path d={d} fill="rgba(167,139,250,.25)" stroke={OPP} strokeWidth="2" />{MOUND.map((v, i) => LOW[i] && <circle key={i} cx={x(i)} cy={y(v)} r="5" fill={US} />)}</svg>
    </aside>
  );
}

function App() {
  const [t, Center] = CENTER[V];
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
                  <span className="flex items-center gap-2.5"><b className="grid h-8 w-8 place-items-center rounded-full font-display text-t3" style={{ background: i === 1 ? GOLD : i === 0 ? 'rgba(52,211,153,.22)' : 'rgba(255,255,255,.06)', color: i === 1 ? '#1c1203' : i === 0 ? '#34d399' : W2 }}>{i === 0 ? '✓' : i + 1}</b><b className="text-t3" style={{ color: i === 1 ? '#fff' : W2 }}>{x}</b></span>
                  {i < 2 && <i className="block h-px w-8 bg-white/15" />}
                </React.Fragment>
              ))}
              <span className="ml-auto flex flex-col gap-1.5" style={{ width: 288 }}><span className="flex justify-between text-t4"><span style={{ color: W2 }}>예상 승률</span><b className="font-display text-t3" style={{ color: '#34d399' }}>47% : 53%</b></span><span className="flex h-1.5 overflow-hidden rounded-full"><i style={{ width: '47%', background: '#34d399' }} /><i className="flex-1" style={{ background: RED }} /></span></span>
            </div>
            <div className="min-h-0 flex-1"><Center /></div>
            <div className="flex shrink-0 items-center border-t border-white/[0.08] pt-3" style={{ height: 64 }}><span className="flex-1" /><span className="mt-cut flex h-12 items-center gap-3 px-6" style={{ ...cut(12), minWidth: 288, justifyContent: 'center', background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}><span className="flex gap-1">{[1, 2, 3].map((i) => <i key={i} className="block h-1.5 rounded-full" style={{ width: i === 2 ? 16 : 6, background: i <= 2 ? '#1c1203' : 'rgba(28,18,3,.3)' }} />)}</span><b className="text-t2 font-black">다음 · 상황 대응 ▶</b></span></div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
