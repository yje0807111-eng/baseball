/*
 * 정비 2단계(경기 흐름) 가운데 — 이닝마다 짜기(목업 prep-innings2 1안 + 5안 기회 기둥 + 7안 손잡이 말풍선, 2026-10-03)
 *  모든 줄이 '왼쪽 이름 칸 + 1~9회' 같은 눈금 — 왼쪽 상대 흐름(파도)과 같은 회. 상대 마운드가 꺼진 회(평균 −2) = 기회 기둥(옅은 초록)
 *  말풍선은 손잡이 왼쪽(막대 끝 안) — 위로 띄우면 상대 마운드 줄을 가린다
 *  정돈(목업 prep-flow3 7안, 2026-10-04): 선발 카드 걷어냄 → 맨 위 도구 띠 한 줄(끊는 기준 · 값 − +)
 *   볼 배합은 뺌(mix-sim: 섞기보다 나은 게 거의 없음 · 상대 타선 약한 계열로 골라도 ±0 — 늘 섞기)
 *   상대 마운드 줄은 왼쪽 상대 판(OppPanel 2단계 흐름 아래 1~9회 칸)으로. 우리 마운드 칸 안에 투수 수치(선발 구위 · 제구 · 체력, 불펜 구위 · 제구)
 *  끊는 기준(이닝 · 투구 수 · 타자 수) · 값(− +). 선발 막대 끝 손잡이를 끌어도 값이 바뀐다(말풍선에 값 · 어림 이닝)
 *  마운드 한 줄: 선발(손잡이까지) → 계투(기본 1명) → 마무리(9회). 칸을 누르면 아래에 교체 줄 — 왼쪽 '교체' · 불펜 · 오른쪽 추가 · 빼기
 *   추가 = 누른 투수 바로 뒤(마무리를 눌렀으면 마무리 앞)에 안 쓴 투수 중 가장 센 투수, 줄은 새 칸으로 넘어가 바로 고를 수 있게
 *   선발을 당기면 계투 자리가 늘고, 늘리면 넘치는 계투는 숨음(다시 당기면 그대로 나옴)
 *   투수 사이마다 경계 손잡이 — 한 아웃씩 옮김(rel.cuts), 끄는 동안 위에 '8회 1아웃' 칩. 마무리 기본 9회
 *  경계 손잡이(Grip) — 칸 사이 틈에 가는 선 + 작은 알약만(평소 흐리게, 올리면 밝게, 끄는 동안 초록). 잡는 폭은 16px
 *   (간트 · 피그마 분할선처럼 평소엔 안 보이다시피 — 선발 끝 · 투수 사이 · 공격 구간 모두 같은 손잡이, 선발 끝만 값 말풍선)
 *  공격 그래프(목업 prep-attack2 1 + 4안): 높이 = 스윙 크기(위부터 강공 · 보통 · 짧게 · 기다리기), 회 가운데 점 하나 + 부드러운 선
 *   값은 0~3 높이(0.1 단위) — 칸 사이는 두 성향을 타석마다 섞음(엔진 atkAt). 네 칸 가까이(±0.15)는 칸에 붙음 — 순수 값을 쉽게
 *   회 위를 끌며 지나가면 마우스 높이대로 회마다 점이 찍힘(건너뛴 회도 같은 높이로 채움), 끄는 동안 '6회 강공 70 · 보통 30' 칩. 점에서 ↑ ↓ 로 0.1씩
 *   아래 스타일 단추 — 누르면 아홉 회 값이 0.24초 동안 그 모양으로 미끄러져 바뀜(드문 동작 · 0.3초 안, 애니메이션 줄이기면 바로).
 *    창이 가려져 프레임이 멈춰도 끝 값은 타이머로 맞춤. 지금 값이 그 스타일과 같으면 단추 초록
 *   뒤에 상대 마운드 흐름을 점선으로 겹침 — 위로 갈수록 상대가 약한 회(기회), 우리 선을 그 회에 올리는 그림
 *  증강 시점은 이 판에서 뺌(저장된 값 · 기본 7회 그대로)
 *  어림 이닝(손잡이 자리): 투구 수 ÷ 16.5 · 타자 수 ÷ 4.3(미리보기 평균 — 85구 ≈ 5.2회) · 이닝은 그대로
 * 색은 뜻만: 초록 = 기회 · 고름, 성향 색은 점 하나 + 옅은 바탕
 */
import React, { useEffect, useRef, useState } from 'react';
import { Portrait } from './ui.jsx';
import { reducedMotion } from '../ui/motion.jsx';

const cut = (c) => ({ '--c': `${c}px` });
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const armOf = (p) => Math.round((st(p, 'stuff', 80) + st(p, 'control', 75)) / 2);
const US = '#10b981', GOLD = '#fbbf24', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa';
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const LEAD = '9rem';
export const ATK_KO = { base: '보통', power: '강공', contact: '짧게', patience: '기다리기' };
const ATK_C = { base: W3, power: '#f59e0b', contact: '#38bdf8', patience: '#a78bfa' };
export const ATK_LV = ['power', 'base', 'contact', 'patience']; // 그래프 높이 — 위부터
const GH = 200, GPAD = 24; // 상대 마운드 줄 · 선발 카드가 빠져 156 → 200
const gy = (lv) => GPAD + (lv * (GH - GPAD * 2)) / 3;
const gx = (i) => i * 100 + 50; // viewBox 900 기준 회 가운데
/* 왼쪽 상대 흐름과 같은 곡선 — 회 사이 가로 접선 베지어 */
const curveOf = (ys) => { let d = `M0,${ys[0]} L${gx(0)},${ys[0]}`; for (let i = 1; i < 9; i += 1) { const mx = (gx(i - 1) + gx(i)) / 2; d += ` C${mx},${ys[i - 1]} ${mx},${ys[i]} ${gx(i)},${ys[i]}`; } return `${d} L900,${ys[8]}`; };
const dotC = (v) => (v === 'base' ? '#cbd5e1' : ATK_C[v]);
/*
 * 공격 스타일 — 높이 9개(0 강공 · 1 보통 · 2 짧게 · 3 기다리기). 여섯 갈래 × 2~3개, 이름은 '~형'(FC 온라인 전술 이름처럼 한눈에)
 *  기본 · 상대 맞춤 · 초반 탐색 · 후반 공격 · 안타 · 장타 — 갈래 = 단추 한 열(맨 위가 대표)
 *  상대 맞춤 셋은 미리보기 상대 마운드(0 = 가장 약한 회 ~ 1 = 가장 센 회)로 만든다 — 미리보기 값이 없으면 기본형
 *   상대 맞춤형: 약할수록 강공 · 셀수록 짧게 · 기다리기 쪽(0 ~ 2.4) / 약점 집중형: 가장 약한 세 회만 강공 / 강약 조절형: 약한 1/3 강공 · 센 1/3 짧게
 *  득실(style-sim, ROADMAP 13): 안타 쪽 ↔ 상대 구위 셀수록 이득, 장타 쪽 ↔ 구위 약할수록 이득, 초반 탐색(기다리기) ↔ 제구 나쁠수록 이득
 */
const r1 = (v) => Math.round(v * 10) / 10;
const fill = (v) => Array(9).fill(v);
const byOpp = (fn) => (opp) => (opp ? fn(opp) : fill(1));
const weakest = (opp, n) => new Set(opp.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]).slice(0, n).map(([, i]) => i));
export const ATK_GROUPS = [
  ['기본', [['기본형', () => fill(1)], ['신중형', () => fill(1.5)]]],
  ['상대 맞춤', [
    ['상대 맞춤형', byOpp((opp) => opp.map((n) => r1(n * 2.4)))],
    ['약점 집중형', byOpp((opp) => { const w = weakest(opp, 3); return opp.map((_, i) => (w.has(i) ? 0 : 1)); })],
    ['강약 조절형', byOpp((opp) => opp.map((n) => (n < 0.34 ? 0 : n > 0.66 ? 2 : 1)))],
  ]],
  ['초반 탐색', [
    ['초반 탐색형', () => [3, 3, 2.5, 1.5, 1, 1, 1, 1, 1]],
    ['투구 수 공략형', () => [3, 3, 3, 3, 3, 1, 1, 1, 1]],
    ['탐색 후 공격형', () => [3, 3, 3, 0.5, 0.5, 0.5, 1, 1, 1]],
  ]],
  ['후반 공격', [
    ['후반 공격형', () => [1, 1, 1, 1, 1, 0.7, 0.3, 0, 0]],
    ['막판 승부형', () => [1, 1, 1, 1, 1, 1, 1, 0, 0]],
    ['중반 승부형', () => [1, 1, 1, 0, 0, 0, 1, 1, 1]],
  ]],
  ['안타', [['안타형', () => fill(2)], ['출루형', () => fill(2.5)], ['초반 안타형', () => [2, 2, 2, 1, 1, 1, 1, 1, 1]]]],
  ['장타', [['장타형', () => fill(0)], ['적극형', () => fill(0.5)], ['선제 공격형', () => [0, 0, 0, 1, 1, 1, 1, 1, 1]]]],
];
export const ATK_STYLES = ATK_GROUPS.flatMap(([, list]) => list);
/* 높이 값 — 예전 이름도 받음 */
export const atkLvOf = (v) => (typeof v === 'number' ? v : Math.max(0, ATK_LV.indexOf(v)));
const lvC = (lv) => dotC(ATK_LV[Math.round(lv)]);
/* '강공' · '강공 70 · 보통 30' */
export const atkKoOf = (v) => {
  const lv = atkLvOf(v), lo = Math.floor(lv + 1e-9), f = Math.round((lv - lo) * 10) * 10;
  return f ? `${ATK_KO[ATK_LV[lo]]} ${100 - f} · ${ATK_KO[ATK_LV[lo + 1]]} ${f}` : ATK_KO[ATK_LV[lo]];
};
export const LIMIT = {
  inn: { ko: '이닝', min: 1, max: 9, step: 1, unit: '회까지', per: 1 },
  pitch: { ko: '투구 수', min: 40, max: 120, step: 5, unit: '구', per: 16.5 },
  bf: { ko: '타자 수', min: 9, max: 36, step: 1, unit: '타자', per: 4.3 },
};
export const exitOf = (limit) => Math.max(0.5, Math.min(9, limit.value / LIMIT[limit.mode].per));
export const limitKo = (limit) => (limit.mode === 'inn' ? `${limit.value}회까지` : `${limit.value}${LIMIT[limit.mode].unit}`);
const pct = (inn) => `${(inn / 9) * 100}%`;
/*
 * 마운드 계획(아웃 단위) — rel = { mid: [계투 id], close: 마무리 id, cuts: [계투마다 끝 아웃] } → 칸(spans) · 엔진 slots([[시작 아웃, id]])
 *  아웃 = (회−1)×3 + 아웃 수, 0 ~ 27. 경계 손잡이는 한 아웃씩(8회 1아웃부터 마무리 · 4아웃 세이브 등)
 *  기본(cuts 없음): 선발 어림 다음 회 F ~ 8회를 계투가 회 단위로 고르게, 마무리 9회
 *  첫 계투는 선발 어림 뒤 한 회(3아웃) 넘게, 나머지는 한 회 이상 — 칸이 손톱만 해지지 않게. 들어갈 자리보다 많은 계투는 숨음
 *  slots 첫 칸은 0부터 — 선발이 계획보다 일찍 내려가도 첫 계투가 받게
 */
export const outKo = (o) => `${Math.floor(o / 3) + 1}회 ${o % 3 ? `${o % 3}아웃` : '시작'}`;
export function moundPlan(rel, exit) {
  const F = Math.floor(exit) + 1, E = exit * 3;
  const minFirst = Math.ceil(E - 1e-9) + 3;
  const cap = F > 9 || minFirst > 24 ? 0 : 1 + Math.floor((24 - minFirst) / 3);
  const mid = (rel.mid || []).slice(0, cap);
  const n = mid.length, room = 9 - F, spans = [];
  let even = F - 1;
  mid.forEach((id, k) => {
    even += Math.floor(room / n) + (k < room % n ? 1 : 0);
    const lo = k ? spans[k - 1].b + 3 : minFirst, hi = 24 - 3 * (n - 1 - k);
    spans.push({ slot: k, id, a: k ? spans[k - 1].b : E, b: Math.max(lo, Math.min(hi, rel.cuts?.[k] ?? even * 3)) });
  });
  if (rel.close && F <= 9) spans.push({ slot: 'close', id: rel.close, a: n ? spans[n - 1].b : E, b: 27 });
  const slots = spans.map((x, k) => [k ? x.a : 0, x.id]);
  return { F, cap, minFirst, mid, spans, slots };
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
function Grip({ x, on, onPointerDown, label, role = 'separator', style, children, ...rest }) {
  return (
    <span onPointerDown={onPointerDown} role={role} aria-label={label} {...rest} className="group absolute z-10 flex w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center outline-none" style={{ left: x, top: 4, bottom: 4, ...style }}>
      {children}
      <i className="absolute inset-y-1 w-px transition-colors" style={{ background: on ? US : 'rgba(255,255,255,.10)' }} />
      <i className={`relative block h-5 w-[4px] rounded-full transition-colors ${on ? '' : 'bg-white/30 group-hover:bg-white/70'}`} style={on ? { background: US, boxShadow: `0 0 8px ${US}88` } : null} />
    </span>
  );
}
/* 투수 수치 한 줄 — 선발 구위 · 제구 · 체력, 불펜은 구위 · 제구(한 회 칸에 들어가게) */
const STAT3 = [['구위', 'stuff', 80], ['제구', 'control', 75], ['체력', 'stamina', 90]], STAT2 = STAT3.slice(0, 2);
const PStats = ({ p, keys }) => (
  <span className="truncate whitespace-nowrap text-[12px]" style={{ color: W3 }}>{keys.map(([ko, k, d], i) => <React.Fragment key={k}>{i ? ' · ' : ''}{ko} <b className="font-display" style={{ color: W1 }}>{st(p, k, d)}</b></React.Fragment>)}</span>
);
const Seg = ({ opts, on, onPick }) => (
  <span className="inline-flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
    {opts.map(([id, ko]) => <button key={id} type="button" onClick={() => onPick(id)} className="rounded-md px-3 py-1 text-t4 font-bold" style={id === on ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : { color: W2 }}>{ko}</button>)}
  </span>
);

export default function FlowBoard({ pv, busy, starter, pens, atk, setAtk, limit, setLimit, rel, setRel }) {
  const [pick, setPick] = useState(null); // 고르는 자리 — 계투 번호 또는 'close'
  const [drag, setDrag] = useState(null); // { kind: 'sp' | 'mid' | 'draw', ... }
  const laneRef = useRef(null);
  const graphRef = useRef(null);
  const dragRef = useRef(null);
  const mound = pv?.oppMound || [];
  const known = mound.filter((v) => v != null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
  const low = INN.map((i) => mound[i - 1] != null && mound[i - 1] <= avg - 2);
  const L = LIMIT[limit.mode];
  const exit = exitOf(limit);
  const mp = moundPlan(rel, exit);
  const byId = new Map(pens.map((p) => [p.id, p]));

  /* ── 끌기: 레인 너비로 회를 잰다 ── */
  const innAt = (clientX) => { const r = laneRef.current?.getBoundingClientRect(); if (!r) return 0; return Math.max(0, Math.min(9, ((clientX - r.left) / r.width) * 9)); };
  const latest = useRef({});
  /* 그리기 — 회는 가로 자리, 높이는 0.1 단위(네 칸 가까이는 칸에 붙음). 지난 회 ~ 지금 회를 같은 높이로(빨리 끌어 건너뛴 회도) */
  const paintAt = (cx, cy, d) => {
    const r = graphRef.current?.getBoundingClientRect(); if (!r) return;
    const i = Math.max(0, Math.min(8, Math.floor(((cx - r.left) / r.width) * 9)));
    const raw = Math.max(0, Math.min(3, (((cy - r.top) / r.height) * GH - GPAD) / ((GH - GPAD * 2) / 3)));
    const lv = Math.abs(raw - Math.round(raw)) < 0.15 ? Math.round(raw) : Math.round(raw * 10) / 10;
    const S = latest.current, base = d.cur || S.atk, next = [...base];
    for (let k = Math.min(d.last ?? i, i); k <= Math.max(d.last ?? i, i); k += 1) next[k] = lv;
    Object.assign(d, { last: i, i, lv, cur: next });
    if (next.some((v, k) => v !== base[k])) S.setAtk(next);
    setDrag({ ...d });
  };
  latest.current = { limit, L, atk, setAtk, setLimit, rel, setRel, mp, paintAt };
  const drawStart = (e) => { if (e.button !== 0) return; e.preventDefault(); const d = { kind: 'draw', last: null }; dragRef.current = d; paintAt(e.clientX, e.clientY, d); };
  const start = (e, d) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); dragRef.current = d; setDrag(d); };
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return;
      const S = latest.current, x = innAt(e.clientX);
      if (d.kind === 'sp') { // 값으로 — 이닝은 회 끝에 딱, 투구 · 타자 수는 단위에 맞춰
        const raw = S.limit.mode === 'inn' ? Math.round(x) : Math.round((x * S.L.per) / S.L.step) * S.L.step;
        const v = Math.max(S.L.min, Math.min(S.L.max, raw));
        if (v !== S.limit.value) S.setLimit({ ...S.limit, value: v });
      } else if (d.kind === 'draw') {
        S.paintAt(e.clientX, e.clientY, d);
      } else if (d.kind === 'mid') { // 투수 경계 — 한 아웃씩, 앞뒤 투수가 한 회는 남게
        const b = Math.max(d.min, Math.min(d.max, Math.round(x * 3)));
        const cuts = S.mp.spans.filter((z) => typeof z.slot === 'number').map((z) => z.b);
        if (cuts[d.k] !== b) { cuts[d.k] = b; S.setRel({ ...S.rel, cuts }); }
      }
    };
    const onUp = () => { dragRef.current = null; setDrag(null); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, []);
  /* + 계투 — 안 쓴 투수 중 가장 센 투수를 보이는 계투 맨 뒤(마무리 앞)에 */
  const addMid = () => {
    const used = new Set([...rel.mid, rel.close]);
    const p = [...pens].filter((x) => !used.has(x.id)).sort((x, y) => armOf(y) - armOf(x))[0];
    if (!p) return;
    const at = pick === 'close' ? mp.mid.length : pick + 1;
    setRel({ ...rel, mid: [...rel.mid.slice(0, at), p.id, ...rel.mid.slice(at)], cuts: [] });
    setPick(at);
  };
  const canAdd = mp.mid.length < mp.cap && pens.some((x) => x.id !== rel.close && !rel.mid.includes(x.id));
  const nudge = (i, dir) => { const n = [...atk]; n[i] = Math.max(0, Math.min(3, Math.round((atkLvOf(atk[i]) + dir * 0.1) * 10) / 10)); setAtk(n); };
  /* 상대 마운드 흐름 — 셀수록 아래(약한 회 = 위 = 기회) */
  // 폭은 최소 6 — 상대 마운드가 고르면(77~79 등) 파도 · 상대 맞춤 스타일이 작은 차이를 부풀리지 않게
  const mid0 = known.length ? (Math.min(...known) + Math.max(...known)) / 2 : 0, span = known.length ? Math.max(6, Math.max(...known) - Math.min(...known)) : 1;
  const lo = mid0 - span / 2, hi = mid0 + span / 2;
  const oppYs = INN.map((i) => GPAD + (((mound[i - 1] ?? avg) - lo) / (hi - lo || 1)) * (GH - GPAD * 2));
  const atkYs = atk.map((v) => gy(atkLvOf(v)));
  const oppNorm = known.length ? INN.map((i) => ((mound[i - 1] ?? avg) - lo) / (hi - lo || 1)) : null;
  /* 스타일 적용 — 지금 값에서 목표 값으로 0.24초 미끄럼(ease-out) */
  const tween = useRef({ raf: 0, timer: 0 });
  useEffect(() => () => { cancelAnimationFrame(tween.current.raf); clearTimeout(tween.current.timer); }, []);
  const applyStyle = (target) => {
    cancelAnimationFrame(tween.current.raf); clearTimeout(tween.current.timer);
    if (reducedMotion()) { setAtk(target); return; }
    const from = atk.map(atkLvOf), t0 = performance.now(), D = 240;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / D), e = 1 - (1 - k) ** 3;
      setAtk(k < 1 ? from.map((v, i) => v + (target[i] - v) * e) : target);
      if (k < 1) tween.current.raf = requestAnimationFrame(tick);
    };
    tween.current.raf = requestAnimationFrame(tick);
    tween.current.timer = setTimeout(() => { cancelAnimationFrame(tween.current.raf); setAtk(target); }, D + 80);
  };
  const styleOn = (target) => target.every((v, i) => Math.abs(v - atkLvOf(atk[i])) < 0.05);
  const step = (dir) => setLimit({ ...limit, value: Math.max(L.min, Math.min(L.max, limit.value + dir * L.step)) });
  const setMode = (mode) => setLimit({ mode, value: Math.max(LIMIT[mode].min, Math.min(LIMIT[mode].max, Math.round((exit * LIMIT[mode].per) / LIMIT[mode].step) * LIMIT[mode].step)) });

  return (
    <div className="flex h-full min-h-0 select-none flex-col gap-3">
      {/* 도구 띠 — 끊는 기준 | 볼 배합 */}
      <div className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,.025)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
        <span className="text-t4" style={{ color: W2 }}>끊는 기준</span>
        <Seg opts={Object.entries(LIMIT).map(([k, v]) => [k, v.ko])} on={limit.mode} onPick={setMode} />
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} className="grid h-8 w-8 place-items-center rounded-md text-t3" style={{ color: W1, background: 'rgba(255,255,255,.06)' }} aria-label="줄이기">−</button>
          <b className="w-24 text-center font-display text-t2" style={{ color: W1 }}>{limitKo(limit)}</b>
          <button type="button" onClick={() => step(1)} className="grid h-8 w-8 place-items-center rounded-md text-t3" style={{ color: W1, background: 'rgba(255,255,255,.06)' }} aria-label="늘리기">+</button>
        </span>
      </div>
      {/* 회 머리 */}
      <div className="grid shrink-0" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)` }}>
        <span />
        <span className="grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <span key={i} className="flex flex-col items-center"><b className="font-display text-t3" style={{ color: low[i - 1] ? US : W2 }}>{i}회</b><span className="text-[10px]" style={{ color: US, visibility: low[i - 1] ? 'visible' : 'hidden' }}>기회</span></span>)}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <Lane label="우리 마운드" h={80} glass low={low}>
          <span ref={laneRef} className="absolute inset-0" />
          <span className="absolute flex items-center gap-2 overflow-hidden rounded-md px-2" style={{ top: 6, bottom: 6, left: 4, width: `calc(${pct(exit)} - 9px)`, background: `linear-gradient(90deg, ${SPB}66, ${SPB}22)`, transition: drag?.kind === 'sp' ? 'none' : 'width .16s cubic-bezier(.2,.8,.2,1)' }}>
            {starter && <Portrait player={starter} w={30} h={38} color="#334155" />}
            <span className="flex min-w-0 flex-col gap-0.5"><b className="truncate text-t4" style={{ color: W1 }}>{starter?.name}</b><PStats p={starter} keys={STAT3} /></span>
          </span>
          {mp.spans.map((x, k) => {
            const p = byId.get(x.id), on = pick === x.slot, a = x.a / 3, l = 5;
            return (
              <button key={x.slot} type="button" onClick={() => setPick(on ? null : x.slot)} className="absolute flex items-center justify-center gap-1.5 overflow-hidden rounded-md px-1"
                style={{ top: 6, bottom: 6, left: `calc(${pct(a)} + ${l}px)`, width: `calc(${pct(x.b / 3 - a)} - ${l + 5}px)`, background: on ? 'rgba(16,185,129,.16)' : 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${on ? US : 'rgba(255,255,255,.1)'}`, transition: drag ? 'none' : 'left .16s cubic-bezier(.2,.8,.2,1), width .16s cubic-bezier(.2,.8,.2,1)' }}>
                {p && <Portrait player={p} w={24} h={30} color="#334155" />}
                <span className="flex min-w-0 flex-col items-start gap-0.5 leading-tight"><span className="flex items-center gap-1.5"><span className="truncate text-t4 font-bold" style={{ color: W1 }}>{p?.name || '-'}</span>{x.slot === 'close' && <span className="text-[10px]" style={{ color: GOLD }}>마무리</span>}</span>{p && <PStats p={p} keys={STAT2} />}</span>
              </button>
            );
          })}
          {mp.spans.slice(0, -1).map((x, k) => (
            <Grip key={`g${k}`} x={pct(x.b / 3)} on={drag?.kind === 'mid' && drag.k === k} label={mp.spans[k + 1].slot === 'close' ? '계투 · 마무리 경계' : `계투 ${k + 1} · ${k + 2} 경계`}
              onPointerDown={(e) => start(e, { kind: 'mid', k, min: k ? x.a + 3 : mp.minFirst, max: mp.spans[k + 1].b - 3 })}>
              {drag?.kind === 'mid' && drag.k === k && <b className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-md px-2 py-0.5 text-t4 font-bold" style={{ background: 'rgba(11,15,26,.85)', color: W1, boxShadow: `inset 0 0 0 1px ${US}` }}>{outKo(x.b)}</b>}
            </Grip>
          ))}
          <Grip x={pct(exit)} on={drag?.kind === 'sp'} role="slider" label="선발 끊는 지점" aria-valuenow={limit.value} tabIndex={0}
            onPointerDown={(e) => start(e, { kind: 'sp' })} onKeyDown={(e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); }}
            style={{ transition: drag?.kind === 'sp' ? 'none' : 'left .16s cubic-bezier(.2,.8,.2,1)' }}>
            <b className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-t4 font-bold" style={{ right: 'calc(100% + 4px)', background: 'rgba(11,15,26,.72)', color: W1, boxShadow: `inset 0 0 0 1px ${drag?.kind === 'sp' ? US : 'rgba(255,255,255,.14)'}` }}>{limitKo(limit)}{limit.mode !== 'inn' ? ` · 약 ${exit.toFixed(1)}회` : ''}</b>
          </Grip>
        </Lane>
        {pick != null && (
          <div className="ml-[9rem] flex shrink-0 flex-wrap items-center gap-1.5 rounded-lg px-3 py-2" style={{ background: 'rgba(16,185,129,.06)', boxShadow: `inset 0 0 0 1px ${US}44` }}>
            <span className="mr-1 text-t4" style={{ color: W2 }}>교체</span>
            {pens.map((p) => {
              const on = (pick === 'close' ? rel.close : rel.mid[pick]) === p.id;
              return (
                <button key={p.id} type="button" onClick={() => { setRel(pickRel(rel, pick, p.id)); setPick(null); }} className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:brightness-125" style={{ background: on ? 'rgba(16,185,129,.18)' : 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
                  <Portrait player={p} w={18} h={22} color="#334155" /><b className="text-t4" style={{ color: W1 }}>{p.name}</b><span className="font-display text-[11px]" style={{ color: W3 }}>{armOf(p)}</span>
                </button>
              );
            })}
            <span className="ml-auto flex gap-1.5">
              <button type="button" onClick={addMid} disabled={!canAdd} className="rounded-md px-3 py-1 text-t4 font-bold disabled:opacity-30" style={{ color: US, boxShadow: `inset 0 0 0 1px ${US}66` }}>추가</button>
              <button type="button" onClick={() => { setRel({ ...rel, mid: rel.mid.filter((_, i) => i !== pick), cuts: [] }); setPick(null); }} disabled={pick === 'close' || rel.mid.length < 2}
                className="rounded-md px-3 py-1 text-t4 font-bold disabled:opacity-30" style={{ color: '#f87171', boxShadow: 'inset 0 0 0 1px rgba(248,113,113,.4)' }}>빼기</button>
            </span>
          </div>
        )}
        <div className="grid shrink-0" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)`, height: GH }}>
          <span className="relative block pr-3">
            <b className="absolute text-t3" style={{ left: 0, top: 0, color: W1 }}>공격</b>
            {ATK_LV.map((v, lv) => <span key={v} className="absolute flex -translate-y-1/2 items-center gap-1.5" style={{ right: 12, top: gy(lv) }}><span className="text-[11px]" style={{ color: W2 }}>{ATK_KO[v]}</span><i className="block h-1.5 w-1.5 rounded-full" style={{ background: dotC(v) }} /></span>)}
          </span>
          <span ref={graphRef} onPointerDown={drawStart} className="relative block cursor-crosshair touch-none rounded-lg" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
            <span className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
              {INN.map((i) => <i key={i} style={{ borderLeft: i > 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: low[i - 1] ? 'rgba(16,185,129,.07)' : 'transparent' }} />)}
            </span>
            {ATK_LV.map((v, lv) => <i key={v} className="pointer-events-none absolute left-0 right-0 h-px" style={{ top: gy(lv), background: 'rgba(255,255,255,.06)' }} />)}
            <svg viewBox={`0 0 900 ${GH}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              <defs><linearGradient id="atkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f59e0b" stopOpacity=".26" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></linearGradient></defs>
              {known.length > 0 && <path d={curveOf(oppYs)} fill="none" stroke="#a78bfa" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" style={{ opacity: busy ? 0.4 : 1 }} />}
              <path d={`${curveOf(atkYs)} L900,${GH} L0,${GH} Z`} fill="url(#atkFill)" />
              <path d={curveOf(atkYs)} fill="none" stroke="#e5e7eb" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {atk.map((v, i) => (
              <button key={i} type="button" aria-label={`${i + 1}회 공격 ${atkKoOf(v)}`} onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); nudge(i, e.key === 'ArrowUp' ? -1 : 1); } }}
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                style={{ left: pct(i + 0.5), top: gy(atkLvOf(v)), background: lvC(atkLvOf(v)), boxShadow: '0 0 0 3px rgba(11,15,26,.9)' }} />
            ))}
            {drag?.kind === 'draw' && drag.i != null && (
              <b className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-t4" style={{ left: pct(drag.i + 0.5), top: gy(drag.lv) - 34, background: 'rgba(11,15,26,.88)', color: W1, boxShadow: `inset 0 0 0 1px ${lvC(drag.lv)}` }}>{drag.i + 1}회 {atkKoOf(drag.lv)}</b>
            )}
          </span>
        </div>
        <div className="grid shrink-0" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)` }}>
          <span />
          <span className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${ATK_GROUPS.length}, minmax(0,1fr))` }}>
            {ATK_GROUPS.map(([group, list]) => (
              <span key={group} className="flex min-w-0 flex-col gap-1">
                {list.map(([ko, make], k) => {
                  const target = make(oppNorm), on = styleOn(target);
                  return (
                    <button key={ko} type="button" onClick={() => applyStyle(target)} aria-pressed={on}
                      className="flex min-w-0 items-center gap-2 rounded-md px-2.5 py-1 transition-colors hover:bg-white/[0.06]"
                      style={{ background: on ? 'rgba(16,185,129,.12)' : k ? 'rgba(255,255,255,.015)' : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? US : k ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.1)'}` }}>
                      <svg viewBox={`0 0 900 ${GH}`} preserveAspectRatio="none" className="h-3.5 w-10 shrink-0" aria-hidden="true">
                        <path d={curveOf(target.map(gy))} fill="none" stroke={on ? US : k ? '#6b7280' : '#9ca3af'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <b className="truncate text-t4" style={{ color: on ? '#fff' : k ? W2 : W1 }}>{ko}</b>
                    </button>
                  );
                })}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
