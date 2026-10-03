/*
 * 정비 2단계(경기 흐름) 가운데 — 이닝마다 짜기(목업 prep-innings2 1안 + 5안 기회 기둥 + 7안 손잡이 말풍선, 2026-10-03)
 *  모든 줄이 '왼쪽 이름 칸 + 1~9회' 같은 눈금 — 왼쪽 상대 흐름(파도)과 같은 회. 상대 마운드가 꺼진 회(평균 −2) = 기회 기둥(옅은 초록)
 *  말풍선은 손잡이 왼쪽(막대 끝 안) — 위로 띄우면 상대 마운드 줄을 가린다
 *  투수 카드: 오늘 선발 · 끊는 기준(이닝 · 투구 수 · 타자 수) · 값(− +). 선발 막대 끝 노란 손잡이를 끌어도 값이 바뀐다(말풍선에 값 · 어림 이닝)
 *  마운드 한 줄: 선발(손잡이까지) → 계투(+ 로 늘림, 기본 1명) → 마무리(9회). 칸을 누르면 아래에 불펜 줄이 열려 고름
 *   선발을 당기면 계투 자리가 늘고, 늘리면 넘치는 계투는 숨음(다시 당기면 그대로 나옴)
 *   투수 사이마다 경계 손잡이 — 계투끼리 · 계투와 마무리 사이를 회 단위로 옮김(rel.ends, 마지막 값 = 마무리 앞 회). 마무리 기본 9회
 *  경계 손잡이(Grip) — 칸 사이 틈에 가는 선 + 작은 알약만(평소 흐리게, 올리면 밝게, 끄는 동안 초록). 잡는 폭은 16px
 *   (간트 · 피그마 분할선처럼 평소엔 안 보이다시피 — 마운드 · 공격 두 줄이 같은 손잡이)
 *  공격: 회마다 칸 — 누르면 보통 → 강공 → 짧게 → 기다리기 돌림, 구간 사이 손잡이를 끌면 구간이 늘고 줄음
 *  증강: 노란 핀을 끌거나 칸을 눌러 3~8회
 *  어림 이닝(손잡이 자리): 투구 수 ÷ 16.5 · 타자 수 ÷ 4.3(미리보기 평균 — 85구 ≈ 5.2회) · 이닝은 그대로
 * 색은 뜻만: 초록 = 기회 · 고름, 노랑 = 끄는 손잡이 · 증강, 성향 색은 점 하나 + 옅은 바탕
 */
import React, { useEffect, useRef, useState } from 'react';
import { Portrait } from './ui.jsx';

const cut = (c) => ({ '--c': `${c}px` });
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const armOf = (p) => Math.round((st(p, 'stuff', 80) + st(p, 'control', 75)) / 2);
const US = '#10b981', GOLD = '#fbbf24', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa';
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const LEAD = '9rem';
export const ATK_KO = { base: '보통', power: '강공', contact: '짧게', patience: '기다리기' };
const ATK_C = { base: W3, power: '#f59e0b', contact: '#38bdf8', patience: '#a78bfa' };
const ATK_CYCLE = ['base', 'power', 'contact', 'patience'];
export const LIMIT = {
  inn: { ko: '이닝', min: 1, max: 9, step: 1, unit: '회까지', per: 1 },
  pitch: { ko: '투구 수', min: 40, max: 120, step: 5, unit: '구', per: 16.5 },
  bf: { ko: '타자 수', min: 9, max: 36, step: 1, unit: '타자', per: 4.3 },
};
export const exitOf = (limit) => Math.max(0.5, Math.min(9, limit.value / LIMIT[limit.mode].per));
export const limitKo = (limit) => (limit.mode === 'inn' ? `${limit.value}회까지` : `${limit.value}${LIMIT[limit.mode].unit}`);
const pct = (inn) => `${(inn / 9) * 100}%`;
/*
 * 마운드 계획 — rel = { mid: [계투 id], close: 마무리 id } → 엔진 pens(회 → id)
 *  첫 계투 회 F = 선발 어림 이닝 다음 회. F ~ 8회를 계투가 앞에서부터 고르게 나눔(남는 회는 앞 투수가 한 회 더)
 *  자리(9 − F)보다 계투가 많으면 들어가는 만큼만. 1회 ~ F−1 은 첫 투수로 채워 둠 — 선발이 계획보다 일찍 내려가도 그 투수가 받게
 */
export function moundPlan(rel, exit) {
  const F = Math.floor(exit) + 1;
  if (F > 9) return { F, room: 0, cap: 0, minFirst: 9, mid: [], spans: [], pens: {} };
  // 첫 계투는 선발이 거의 다 던진 회만 맡지 않게 — 선발 어림 + 0.5회 넘는 회까지(칸이 손톱만 해지지 않게)
  const minFirst = Math.min(8, Math.max(F, Math.ceil(exit + 0.5)));
  const room = 9 - F;
  const mid = (rel.mid || []).slice(0, 9 - minFirst);
  const pens = {}, spans = [];
  let at = F, even = F - 1;
  mid.forEach((id, k) => {
    even += Math.floor(room / mid.length) + (k < room % mid.length ? 1 : 0);
    const end = Math.max(k ? at : minFirst, Math.min(8 - (mid.length - 1 - k), rel.ends?.[k] ?? even));
    for (let i = at; i <= end; i += 1) pens[i] = id;
    spans.push({ slot: k, id, a: at, b: end }); at = end + 1;
  });
  if (rel.close) { for (let i = at; i <= 9; i += 1) pens[i] = rel.close; spans.push({ slot: 'close', id: rel.close, a: at, b: 9 }); }
  const first = spans[0]?.id;
  if (first) for (let i = 1; i < F; i += 1) pens[i] = first;
  return { F, room, cap: 9 - minFirst, minFirst, mid, spans, pens };
}
/* 계투 · 마무리 고르기 — 이미 다른 자리에 있는 투수면 서로 바꿈 */
export function pickRel(rel, slot, id) {
  const mid = [...rel.mid]; let close = rel.close;
  const cur = slot === 'close' ? close : mid[slot];
  const j = mid.indexOf(id);
  if (j >= 0) mid[j] = cur; else if (close === id) close = cur;
  if (slot === 'close') close = id; else mid[slot] = id;
  return { ...rel, mid: mid.filter(Boolean), close };
}
export const segsOf =(atk) => atk.reduce((acc, v, i) => { const last = acc[acc.length - 1]; if (last && last.v === v) last.b = i + 1; else acc.push({ a: i + 1, b: i + 1, v }); return acc; }, []);

function Lane({ label, sub, h, children, glass, low }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)`, minHeight: h, flexGrow: h >= 56 ? 1 : 0, maxHeight: h >= 56 ? h * 1.6 : undefined }}>
      <span className="flex flex-col items-start justify-center gap-1 pr-3"><b className="text-t3" style={{ color: W1 }}>{label}</b>{sub && (typeof sub === 'string' ? <span className="text-[11px]" style={{ color: W3 }}>{sub}</span> : sub)}</span>
      <span className="relative block rounded-lg" style={glass ? { background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' } : null}>
        <span className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
          {INN.map((i) => <i key={i} style={{ borderLeft: i > 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: low?.[i - 1] ? 'rgba(16,185,129,.07)' : 'transparent' }} />)}
        </span>
        {children}
      </span>
    </div>
  );
}
/* 경계 손잡이 — 틈 가운데 가는 선 + 알약. 끄는 동안 초록 */
function Grip({ x, on, onPointerDown, label }) {
  return (
    <span onPointerDown={onPointerDown} role="separator" aria-label={label} className="group absolute z-10 flex w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center" style={{ left: x, top: 4, bottom: 4 }}>
      <i className="absolute inset-y-1 w-px transition-colors" style={{ background: on ? US : 'rgba(255,255,255,.10)' }} />
      <i className={`relative block h-5 w-[4px] rounded-full transition-colors ${on ? '' : 'bg-white/30 group-hover:bg-white/70'}`} style={on ? { background: US, boxShadow: `0 0 8px ${US}88` } : null} />
    </span>
  );
}
const Seg = ({ opts, on, onPick }) => (
  <span className="inline-flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
    {opts.map(([id, ko]) => <button key={id} type="button" onClick={() => onPick(id)} className="rounded-md px-3 py-1 text-t4 font-bold" style={id === on ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : { color: W2 }}>{ko}</button>)}
  </span>
);

export default function FlowBoard({ pv, busy, starter, pens, atk, setAtk, limit, setLimit, rel, setRel, augInn, setAugInn, mix, mixOpts, setMix }) {
  const [pick, setPick] = useState(null); // 고르는 자리 — 계투 번호 또는 'close'
  const [drag, setDrag] = useState(null); // { kind: 'sp' | 'seg' | 'aug', ... }
  const laneRef = useRef(null);
  const dragRef = useRef(null);
  const mound = pv?.oppMound || [];
  const known = mound.filter((v) => v != null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
  const low = INN.map((i) => mound[i - 1] != null && mound[i - 1] <= avg - 2);
  const L = LIMIT[limit.mode];
  const exit = exitOf(limit);
  const mp = moundPlan(rel, exit);
  const byId = new Map(pens.map((p) => [p.id, p]));
  const segs = segsOf(atk);

  /* ── 끌기: 레인 너비로 회를 잰다 ── */
  const innAt = (clientX) => { const r = laneRef.current?.getBoundingClientRect(); if (!r) return 0; return Math.max(0, Math.min(9, ((clientX - r.left) / r.width) * 9)); };
  const latest = useRef({});
  latest.current = { limit, L, atk, setAtk, setLimit, setAugInn, rel, setRel, mp };
  const start = (e, d) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); dragRef.current = d; setDrag(d); };
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return;
      const S = latest.current, x = innAt(e.clientX);
      if (d.kind === 'sp') { // 값으로 — 이닝은 회 끝에 딱, 투구 · 타자 수는 단위에 맞춰
        const raw = S.limit.mode === 'inn' ? Math.round(x) : Math.round((x * S.L.per) / S.L.step) * S.L.step;
        const v = Math.max(S.L.min, Math.min(S.L.max, raw));
        if (v !== S.limit.value) S.setLimit({ ...S.limit, value: v });
      } else if (d.kind === 'seg') { // 구간 사이 — 왼쪽 구간 끝 회를 옮긴다(이웃 구간 안에서)
        const b = Math.max(d.min, Math.min(d.max, Math.round(x)));
        if (b !== d.b) { const next = [...S.atk]; for (let i = d.min; i <= d.max + 1; i += 1) next[i - 1] = i <= b ? d.lv : d.rv; d.b = b; S.setAtk(next); }
      } else if (d.kind === 'mid') { // 계투 경계 — 회 끝에 딱, 앞뒤 계투가 한 회는 남게
        const b = Math.max(d.min, Math.min(d.max, Math.round(x)));
        const ends = S.mp.spans.filter((z) => typeof z.slot === 'number').map((z) => z.b);
        if (ends[d.k] !== b) { ends[d.k] = b; S.setRel({ ...S.rel, ends }); }
      } else if (d.kind === 'aug') {
        const v = Math.max(3, Math.min(8, Math.floor(x) + 1));
        S.setAugInn(v);
      }
    };
    const onUp = () => { dragRef.current = null; setDrag(null); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, []);
  /* + 계투 — 안 쓴 투수 중 가장 센 투수를 보이는 계투 맨 뒤(마무리 앞)에 */
  const addMid = () => { const used = new Set([...rel.mid, rel.close]); const p = [...pens].filter((x) => !used.has(x.id)).sort((x, y) => armOf(y) - armOf(x))[0]; if (p) setRel({ ...rel, mid: [...mp.mid, p.id, ...rel.mid.slice(mp.mid.length)], ends: [] }); };
  const cycle = (i) => { const next = [...atk]; next[i - 1] = ATK_CYCLE[(ATK_CYCLE.indexOf(atk[i - 1]) + 1) % ATK_CYCLE.length]; setAtk(next); };
  const step = (dir) => setLimit({ ...limit, value: Math.max(L.min, Math.min(L.max, limit.value + dir * L.step)) });
  const setMode = (mode) => setLimit({ mode, value: Math.max(LIMIT[mode].min, Math.min(LIMIT[mode].max, Math.round((exit * LIMIT[mode].per) / LIMIT[mode].step) * LIMIT[mode].step)) });

  return (
    <div className="flex h-full min-h-0 select-none flex-col gap-3">
      {/* 투수 카드 — 오늘 선발 · 끊는 기준 */}
      <div className="mt-cut flex shrink-0 items-center gap-4 px-4 py-3" style={{ ...cut(12), background: 'rgba(96,165,250,.06)', boxShadow: 'inset 0 0 0 1px rgba(96,165,250,.28)' }}>
        {starter && <Portrait player={starter} w={40} h={50} color="#334155" />}
        <span className="flex flex-col"><span className="text-t4" style={{ color: W3 }}>오늘 선발</span><b className="text-t2" style={{ color: W1 }}>{starter?.name}</b><span className="text-[11px]" style={{ color: W3 }}>체력 {st(starter, 'stamina', 90)} · 구위 {st(starter, 'stuff', 80)}</span></span>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-t4" style={{ color: W2 }}>끊는 기준</span>
          <Seg opts={Object.entries(LIMIT).map(([k, v]) => [k, v.ko])} on={limit.mode} onPick={setMode} />
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => step(-1)} className="grid h-8 w-8 place-items-center rounded-md text-t3" style={{ color: W1, background: 'rgba(255,255,255,.06)' }} aria-label="줄이기">−</button>
            <b className="w-24 text-center font-display text-t1" style={{ color: W1 }}>{limitKo(limit)}</b>
            <button type="button" onClick={() => step(1)} className="grid h-8 w-8 place-items-center rounded-md text-t3" style={{ color: W1, background: 'rgba(255,255,255,.06)' }} aria-label="늘리기">+</button>
          </span>
        </span>
      </div>
      {/* 회 머리 */}
      <div className="grid shrink-0" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)` }}>
        <span />
        <span className="grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <span key={i} className="flex flex-col items-center"><b className="font-display text-t3" style={{ color: low[i - 1] ? US : W2 }}>{i}회</b><span className="text-[10px]" style={{ color: US, visibility: low[i - 1] ? 'visible' : 'hidden' }}>기회</span></span>)}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <Lane label="상대 마운드" h={44} low={low}>
          <span className="absolute grid gap-1 transition-opacity" style={{ inset: 4, gridTemplateColumns: 'repeat(9,1fr)', opacity: busy ? 0.45 : 1 }}>
            {INN.map((i) => { const v = mound[i - 1]; return <span key={i} className="grid place-items-center rounded-md font-display text-t4" style={{ background: v == null ? 'rgba(255,255,255,.03)' : low[i - 1] ? 'rgba(16,185,129,.16)' : `rgba(167,139,250,${Math.max(0.08, Math.min(0.5, 0.1 + (v - avg + 6) / 30))})`, color: low[i - 1] ? US : W1 }}>{v == null ? '' : Math.round(v)}</span>; })}
          </span>
        </Lane>
        <i className="block h-px shrink-0 bg-white/[0.07]" />
        <Lane label="우리 마운드" h={72} glass low={low}
          sub={<button type="button" onClick={addMid} disabled={mp.mid.length >= mp.cap} className="rounded-md px-2 py-0.5 text-t4 font-bold disabled:opacity-30" style={{ color: US, boxShadow: `inset 0 0 0 1px ${US}66` }}>+ 계투</button>}>
          <span ref={laneRef} className="absolute inset-0" />
          <span className="absolute flex items-center gap-2 overflow-hidden rounded-md px-2" style={{ top: 6, bottom: 6, left: 4, width: `calc(${pct(exit)} - 8px)`, background: `linear-gradient(90deg, ${SPB}66, ${SPB}22)`, transition: drag?.kind === 'sp' ? 'none' : 'width .16s cubic-bezier(.2,.8,.2,1)' }}>
            {starter && <Portrait player={starter} w={30} h={38} color="#334155" />}<b className="truncate text-t4" style={{ color: W1 }}>{starter?.name}</b>
          </span>
          {mp.spans.map((x, k) => {
            const p = byId.get(x.id), on = pick === x.slot, a = k === 0 ? exit : x.a - 1, l = k === 0 ? 12 : 5;
            return (
              <button key={x.slot} type="button" onClick={() => setPick(on ? null : x.slot)} className="absolute flex items-center justify-center gap-1.5 overflow-hidden rounded-md px-1"
                style={{ top: 6, bottom: 6, left: `calc(${pct(a)} + ${l}px)`, width: `calc(${pct(x.b - a)} - ${l + 5}px)`, background: on ? 'rgba(16,185,129,.16)' : 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${on ? US : 'rgba(255,255,255,.1)'}`, transition: drag ? 'none' : 'left .16s cubic-bezier(.2,.8,.2,1), width .16s cubic-bezier(.2,.8,.2,1)' }}>
                {p && <Portrait player={p} w={24} h={30} color="#334155" />}
                <span className="flex min-w-0 flex-col items-start leading-tight"><span className="truncate text-[11px]" style={{ color: W1 }}>{p?.name || '-'}</span>{x.slot === 'close' && <span className="text-[10px]" style={{ color: GOLD }}>마무리</span>}</span>
              </button>
            );
          })}
          {mp.spans.slice(0, -1).map((x, k) => (
            <Grip key={`g${k}`} x={pct(x.b)} on={drag?.kind === 'mid' && drag.k === k} label={mp.spans[k + 1].slot === 'close' ? '계투 · 마무리 경계' : `계투 ${k + 1} · ${k + 2} 경계`}
              onPointerDown={(e) => start(e, { kind: 'mid', k, min: k ? x.a : mp.minFirst, max: mp.spans[k + 1].b - 1 })} />
          ))}
          <span className="absolute z-10 flex -translate-x-1/2 flex-col items-center" style={{ left: pct(exit), top: -8, bottom: -8, transition: drag?.kind === 'sp' ? 'none' : 'left .16s cubic-bezier(.2,.8,.2,1)' }}>
            <b className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-t4" style={{ right: 'calc(100% + 6px)', background: GOLD, color: '#1c1203' }}>{limitKo(limit)}{limit.mode !== 'inn' ? ` · 약 ${exit.toFixed(1)}회` : ''}</b>
            <span onPointerDown={(e) => start(e, { kind: 'sp' })} role="slider" aria-label="선발 끊는 지점" aria-valuenow={limit.value} tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); }}
              className="grid h-full w-4 cursor-ew-resize place-items-center rounded-md outline-none" style={{ background: GOLD, boxShadow: '0 0 0 3px rgba(11,15,26,.9)' }}><i className="block h-5 w-[2px] rounded bg-[#1c1203]" /></span>
          </span>
        </Lane>
        {pick != null && (
          <div className="ml-[9rem] flex shrink-0 flex-wrap items-center gap-1.5 rounded-lg px-3 py-2" style={{ background: 'rgba(16,185,129,.06)', boxShadow: `inset 0 0 0 1px ${US}44` }}>
            <span className="mr-1 text-t4" style={{ color: W2 }}>{pick === 'close' ? '마무리' : `계투 ${pick + 1}`}</span>
            {pens.map((p) => {
              const on = (pick === 'close' ? rel.close : rel.mid[pick]) === p.id;
              return (
                <button key={p.id} type="button" onClick={() => { setRel(pickRel(rel, pick, p.id)); setPick(null); }} className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:brightness-125" style={{ background: on ? 'rgba(16,185,129,.18)' : 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
                  <Portrait player={p} w={18} h={22} color="#334155" /><b className="text-t4" style={{ color: W1 }}>{p.name}</b><span className="font-display text-[11px]" style={{ color: W3 }}>{armOf(p)}</span>
                </button>
              );
            })}
            {pick !== 'close' && rel.mid.length > 1 && <button type="button" onClick={() => { setRel({ ...rel, mid: rel.mid.filter((_, i) => i !== pick), ends: [] }); setPick(null); }} className="ml-auto rounded-md px-2 py-1 text-t4" style={{ color: '#f87171', boxShadow: 'inset 0 0 0 1px rgba(248,113,113,.4)' }}>빼기</button>}
          </div>
        )}
        <Lane label="공격" sub="눌러 바꾸고 끝을 끌기" h={56} glass low={low}>
          {INN.map((i) => (
            <button key={i} type="button" onClick={() => cycle(i)} className="absolute" style={{ top: 6, bottom: 6, left: `calc(${pct(i - 1)} + 3px)`, width: `calc(${pct(1)} - 6px)` }} aria-label={`${i}회 공격 ${ATK_KO[atk[i - 1]]}`} />
          ))}
          {segs.map((s, k) => (
            <React.Fragment key={s.a}>
              <span className="pointer-events-none absolute flex items-center justify-center gap-2 rounded-md" style={{ top: 6, bottom: 6, left: `calc(${pct(s.a - 1)} + 3px)`, width: `calc(${pct(s.b - s.a + 1)} - 6px)`, background: s.v === 'base' ? 'rgba(255,255,255,.04)' : `${ATK_C[s.v]}1f`, boxShadow: `inset 0 0 0 1px ${s.v === 'base' ? 'rgba(255,255,255,.08)' : `${ATK_C[s.v]}66`}` }}>
                {s.v !== 'base' && <i className="block h-2 w-2 rounded-full" style={{ background: ATK_C[s.v] }} />}
                <b className="text-t4" style={{ color: s.v === 'base' ? W2 : W1 }}>{ATK_KO[s.v]}</b>
              </span>
              {k < segs.length - 1 && (
                <Grip x={pct(s.b)} on={drag?.kind === 'seg' && drag.k === k} label={`${s.b}회 공격 경계`}
                  onPointerDown={(e) => start(e, { kind: 'seg', k, min: s.a, max: segs[k + 1].b - 1, b: s.b, lv: s.v, rv: segs[k + 1].v })} />
              )}
            </React.Fragment>
          ))}
        </Lane>
        <Lane label="증강" h={44} low={low}>
          {INN.filter((i) => i >= 3 && i <= 8).map((i) => <button key={i} type="button" onClick={() => setAugInn(i)} className="absolute grid place-items-center" style={{ top: 0, bottom: 0, left: pct(i - 1), width: pct(1) }} aria-label={`증강 ${i}회`}><i className="block h-1.5 w-1.5 rounded-full bg-white/15" /></button>)}
          <span onPointerDown={(e) => start(e, { kind: 'aug' })} className="absolute top-1/2 z-10 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full text-t4 font-black"
            style={{ left: `calc(${pct(augInn - 1)} + ${100 / 18}%)`, background: GOLD, color: '#1c1203', boxShadow: '0 0 0 3px rgba(11,15,26,.9)', transition: drag?.kind === 'aug' ? 'none' : 'left .16s cubic-bezier(.2,.8,.2,1)' }}>✦</span>
        </Lane>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3">
        <span className="text-t4" style={{ color: W2 }}>볼 배합</span>
        <Seg opts={mixOpts} on={mix} onPick={setMix} />
      </div>
    </div>
  );
}
