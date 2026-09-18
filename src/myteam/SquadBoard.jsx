/*
 * 내 라커 · 내 선수 — 큰 사진 구장 위 수비 9명 카드(끌어서 자리 맞바꿈), 구장 아래 1→9번 타순 띠(좌우로 끌어 순서),
 * 오른쪽 열에 선발 로테이션 · 불펜(위아래로 끌어 순서) · 벤치(끌어서 같은 묶음 출전 선수 위에 놓으면 맞바꿈). 투수 컨디션은 team.pitchFatigue(src/myteam/fatigue.js 와 같은 표)로 보여 준다.
 *
 * 저장: team.order = { lineup: [{ id, slot }] (타순 순서, slot = C·1B·2B·3B·SS·LF·CF·RF·DH), rotation: [id ×5], bullpen: [id ×8] (0 마무리 · 1~2 셋업 · 나머지 중계) }
 *  없거나 엔트리가 바뀌어 맞지 않으면 squadOrder 가 채워 넣는다.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { playingIds } from './match.js';
import { posColor, statColor, teamNeon } from './teamColor.js';
import { Btn } from './ui.jsx';
import { offPositionPenalty } from '../KboAugmentDraft.jsx';
import { seasonRecord, HAND_LABEL } from './traits.js';

const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const ROLE = { SP: '#60a5fa', CL: '#fbbf24', SU: '#fb923c', MR: '#f87171' };
const FIELD = [['C', 'C'], ['1B', '1B'], ['2B', '2B'], ['3B', '3B'], ['SS', 'SS'], ['LF', 'OF'], ['CF', 'OF'], ['RF', 'OF'], ['DH', 'DH']];
/* 구장 사진(ui/field.webp) 위 카드 가운데 자리 (%) — 세로 카드가 판 안에 들도록 외야 · 코너를 안쪽에 */
const XY = { CF: [50, 14], LF: [17, 26], RF: [83, 26], SS: [35, 46], '2B': [65, 46], '3B': [17, 65], '1B': [83, 65], C: [50, 87], DH: [89, 87], P: [50, 64] };
/** 구장 위 선수 표시: 중계 자막처럼 기운 사진 + 위 어두운 이름 띠(종합 · 이름) + 아래 구단색 정보 띠 */
const SKEW = (n) => `polygon(${n}px 0,100% 0,calc(100% - ${n}px) 100%,0 100%)`;
const Lower = ({ p, c, ovr, sub }) => (
  <span className="flex items-center">
    <span className="block h-[52px] w-[44px] shrink-0 bg-[#0b1220] bg-cover" style={{ clipPath: SKEW(9), backgroundPosition: 'center 8%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
    <span className="-ml-[5px] block">
      <span className="flex h-[28px] items-baseline gap-1.5 whitespace-nowrap bg-[rgba(6,10,19,.95)] pl-3 pr-3.5 pt-1" style={{ clipPath: SKEW(8) }}>{ovr}<b className="text-[13px] font-extrabold text-white">{p.name}</b></span>
      <span className="ml-2 block h-[20px] whitespace-nowrap pl-3 pr-3.5 pt-[2px] font-display text-[11px] font-extrabold text-[#05080f]" style={{ clipPath: SKEW(7), background: c }}>{sub}</span>
    </span>
  </span>
);
const byOvr = (a, b) => b.overall - a.overall;
/** 줄은 늘 같은 DOM 순서(id 순)로 그린다 — 순서가 바뀌어도 노드가 옮겨지지 않아야 놓을 때 미끄러지는 움직임이 끊기지 않는다 */
const stable = (list, key = (p) => p.id) => [...list].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));

/* 컨디션: fatigue.js 의 conditionOf 와 같은 표 (휴식 0 → 100 · 1 → 85 · 2 → 70 · 3+ → 55) */
const conditionOf = (rest = 0) => (rest <= 0 ? 100 : rest === 1 ? 85 : rest === 2 ? 70 : 55);
const condColor = (c) => (c >= 100 ? '#34d399' : c >= 85 ? '#a3e635' : c >= 70 ? '#fbbf24' : '#fb923c');

/** 출전 선수로 타순 · 수비 자리 · 로테이션 · 불펜 순서를 만든다. 저장된 순서는 살릴 수 있는 만큼 살린다 */
export function squadOrder(squad, bench = [], saved = {}) {
  const play = playingIds(squad, bench);
  const on = squad.filter((p) => play.has(p.id));
  const byId = new Map(on.map((p) => [p.id, p]));

  // 타순 · 자리: 저장된 줄 중 아직 출전 중인 타자만 남기고, 빈 자리는 포지션 최고 선수로
  const kept = (saved.lineup || []).filter((x) => byId.get(x.id)?.type === 'batter');
  const usedId = new Set(kept.map((x) => x.id));
  const usedSlot = new Set(kept.map((x) => x.slot));
  const added = [];
  for (const [slot, pos] of FIELD) {
    if (usedSlot.has(slot)) continue;
    const p = on.filter((x) => x.type === 'batter' && !usedId.has(x.id)).sort((a, b) => (b.position === pos) - (a.position === pos) || byOvr(a, b))[0];
    if (!p) continue;
    usedId.add(p.id); usedSlot.add(slot);
    added.push({ id: p.id, slot });
  }
  // 새로 들어온 타자는 주루 · 컨택 순으로 뒤에 붙인다
  added.sort((a, b) => (byId.get(b.id).stats.speed + byId.get(b.id).stats.contact) - (byId.get(a.id).stats.speed + byId.get(a.id).stats.contact));
  const lineup = [...kept, ...added].slice(0, 9);

  const keep = (ids, pos) => {
    const list = (ids || []).filter((id) => byId.get(id)?.position === pos);
    const rest = on.filter((p) => p.position === pos && !list.includes(p.id)).sort(byOvr).map((p) => p.id);
    return [...list, ...rest];
  };
  return { lineup, rotation: keep(saved.rotation, 'SP'), bullpen: keep(saved.bullpen, 'RP') };
}

/**
 * 자동 배치: 출전 선수는 그대로 두고 자리 · 타순 · 로테이션 · 불펜 순서를 정한다
 *  - 수비 자리: 9명 × 9자리 모든 경우 중 선 자리 기준 종합(포지션 이탈 감소 반영) 합이 가장 큰 배치
 *  - 타순: 1번 주루+컨택 · 2번 컨택 · 3번 컨택+파워 · 4번 파워 · 5번 다음 파워 · 6~9번 타격 합 순
 *  - 선발: 휴식이 적게 남은 순 → 종합 순 · 불펜: 구위+안정 순으로 마무리 → 셋업 → 중계
 */
export function autoArrange(squad, bench = [], fatigue = {}) {
  const base = squadOrder(squad, bench, {});
  const byId = new Map(squad.map((p) => [p.id, p]));
  const bats = base.lineup.map((x) => byId.get(x.id)).filter(Boolean);
  const slots = FIELD.map(([slot]) => slot).slice(0, bats.length);
  const score = bats.map((p) => slots.map((slot) => Math.max(30, p.overall - penaltyAt(p, slot))));
  let best = -1;
  let bestPick = bats.map((_, i) => i);
  const pick = [];
  const usedSlot = new Array(slots.length).fill(false);
  const upper = bats.map((_, i) => Math.max(...score[i]));
  const dfs = (i, sum) => {
    if (i === bats.length) { if (sum > best) { best = sum; bestPick = [...pick]; } return; }
    let bound = sum;
    for (let k = i; k < bats.length; k++) bound += upper[k];
    if (bound <= best) return;
    for (let k = 0; k < slots.length; k++) {
      if (usedSlot[k]) continue;
      usedSlot[k] = true; pick[i] = k;
      dfs(i + 1, sum + score[i][k]);
      usedSlot[k] = false;
    }
  };
  dfs(0, 0);
  const placed = bats.map((p, i) => ({ p, slot: slots[bestPick[i]], st: effAt(p, slots[bestPick[i]]).stats }));
  const take = (fn) => { placed.sort((a, b) => fn(b) - fn(a)); return placed.shift(); };
  const order = [
    take((x) => x.st.speed + x.st.contact),
    take((x) => x.st.contact),
    take((x) => x.st.contact + x.st.power),
    take((x) => x.st.power),
    take((x) => x.st.power),
  ];
  placed.sort((a, b) => (b.st.contact + b.st.power + b.st.speed * 0.5) - (a.st.contact + a.st.power + a.st.speed * 0.5));
  order.push(...placed);
  const rest = (id) => fatigue?.[id]?.rest || 0;
  const rotation = [...base.rotation].sort((a, b) => rest(a) - rest(b) || byId.get(b).overall - byId.get(a).overall);
  const relief = (id) => { const p = byId.get(id); return p.stats.stuff + p.stats.stability; };
  const bullpen = [...base.bullpen].sort((a, b) => relief(b) - relief(a));
  return { lineup: order.filter(Boolean).map((x) => ({ id: x.p.id, slot: x.slot })), rotation, bullpen };
}

const face = (p, w, h) => (
  <span className="mt-cut block shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': `${Math.max(4, Math.round(w / 8))}px`, width: w, height: h, backgroundPosition: 'center 12%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
);
const Chip = ({ children, c }) => <span className="shrink-0 px-[5px] font-display text-[12px] font-extrabold leading-[17px] text-[#05080f]" style={{ background: c }}>{children}</span>;
/** 종합: 영입 목록과 같은 등급 색 — 90 이상 무지개 · 75 이상 초록 · 그 밖 흰색 (st-v 는 라커 화면 스타일) */
const Ovr = ({ p, size = 17, v = p.overall }) => <b className={`st-v ${v >= 90 ? 't90' : v >= 75 ? 't75' : ''} font-display font-extrabold leading-none`} style={{ fontSize: size }}>{v}</b>;
/** 이름 칸 두 줄: 위 이름 · 포지션(구단색) · 투타 / 아래 시즌 기록 가로 */
const recCells = (p) => {
  const r = seasonRecord(p);
  return p.type === 'pitcher'
    ? [['ERA', r.era != null ? r.era.toFixed(2) : null], ['K', r.k], p.position === 'RP' ? (r.sv || !r.hld ? ['SV', r.sv] : ['HLD', r.hld]) : ['W', r.w]]
    : [['AVG', r.avg != null ? r.avg.toFixed(3).slice(1) : null], ['HR', r.hr], ['SB', r.sb]];
};
const NameBlock = ({ p, pos = p.position, size = 14 }) => {
  const h = HAND_LABEL(p);
  return (
    <span className="min-w-0 flex-1 leading-[1.25]">
      <span className="flex min-w-0 items-baseline gap-1.5">
        <b className="truncate font-extrabold text-white" style={{ fontSize: size }}>{p.name}</b>
        <small className="shrink-0 font-display text-[10.5px] font-bold tracking-[0.1em]" style={{ color: teamNeon(p) }}>{pos}</small>
        <small className="shrink-0 text-[10.5px] font-semibold" style={{ color: h.color }}>{h.long}</small>
      </span>
      <span className="flex gap-2.5 font-display text-[13px]">
        {recCells(p).map(([l, v]) => (
          <span key={l} className="whitespace-nowrap"><small className="text-[10px] text-gray-400">{l} </small><b className={`tabular-nums ${v == null ? 'text-gray-600' : 'text-white'}`}>{v ?? '-'}</b></span>
        ))}
      </span>
    </span>
  );
};
const Grp = ({ en, ko, color, right }) => (
  <div className="mt-grp !my-0 !mb-[5px]" style={{ color }}>
    {en} <b className="text-[14px] tracking-[0.04em] text-white">{ko}</b>
    {right && <span className="order-last ml-1 font-display text-[11px] tracking-[0.1em] text-gray-500">{right}</span>}
  </div>
);
/* 선 자리 기준 실전 수치: 드래프트와 같은 포지션 이탈 감소(비슷한 자리 3 · 같은 계열 6 · 포수 8, 지명타자 0) */
const SLOT_POS = { LF: 'OF', CF: 'OF', RF: 'OF' };
export const penaltyAt = (p, slot) => offPositionPenalty(p, SLOT_POS[slot] || slot);
const effAt = (p, slot) => {
  const pen = slot ? penaltyAt(p, slot) : 0;
  if (!pen) return { ovr: p.overall, stats: p.stats, pen: 0 };
  return { ovr: Math.max(30, p.overall - pen), stats: Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, Math.max(30, v - pen)])), pen };
};
/** 놓기 전 미리보기: 77 → 71 (오르면 초록 · 조금 내리면 노랑 · 많이 내리면 빨강) */
const Delta = ({ before, after, size = 17 }) => {
  const dv = after - before;
  const c = dv > 0 ? '#34d399' : dv > -8 ? '#fbbf24' : '#f87171';
  return (
    <span className="flex shrink-0 items-baseline gap-[3px] whitespace-nowrap font-display font-bold leading-none">
      <s className="text-slate-400" style={{ fontSize: size * 0.62, textDecorationThickness: 2 }}>{before}</s>
      <i className="not-italic text-sky-300" style={{ fontSize: size * 0.5 }}>→</i>
      <em className="not-italic" style={{ fontSize: size, color: c, textShadow: `0 0 10px ${c}66` }}>{after}</em>
    </span>
  );
};
const Handle = () => <span className="cursor-grab select-none text-[14px] tracking-[-2px] text-slate-600" aria-hidden="true">⋮⋮</span>;

/**
 * 칸 목록: 줄은 DOM 순서를 바꾸지 않고 제 칸 번호(pos)만큼 아래로 옮겨 놓는다(transform).
 * 칸 높이는 판 높이를 줄 수로 나눈 값(최대 maxH). 순서가 바뀌면 목표 위치만 바뀌어 CSS 가 부드럽게 옮긴다.
 */
function Slots({ count, maxH, gap = 4, axis = 'y', style, children }) {
  const ref = useRef(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setH(axis === 'x' ? el.clientWidth : el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const rowH = count ? Math.max(24, Math.min(maxH, (h - gap * (count - 1)) / count)) : 0;
  return (
    <div ref={ref} className="relative min-h-0" style={style} data-pitch={rowH + gap} data-count={count} data-axis={axis}>
      {h > 0 && children(rowH, rowH + gap)}
    </div>
  );
}

export default function SquadBoard({ team, squad, bench, sel, onSelect, onCommit, onToggleBench, onAutoFill, autoDisabled }) {
  const order = squadOrder(squad, bench, team.order);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const fatigue = team.pitchFatigue || {};
  const restOf = (p) => fatigue[p.id]?.rest || 0;
  const play = playingIds(squad, bench);
  const benchList = squad.filter((p) => !play.has(p.id)).sort(byOvr);

  /* ── 끌어서 바꾸기: 카드는 마우스를 따라가지 않고 가리킨 칸으로 옮겨진 모습만 보여 준다. 놓으면 저장 ── */
  const [drag, setDrag] = useState(null); // 줄: { list, id, from, to } · 구장: { list: 'field', id, target }
  const dragRef = useRef(null);
  const [settle, setSettle] = useState(null); // 놓은 카드가 새 자리로 들어가는 첫 프레임의 밀림 { id, dx, dy }
  const move = (arr, from, to) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };
  const swapSlots = (rows, a, b) => {
    const sa = rows.find((x) => x.id === a)?.slot;
    const sb = rows.find((x) => x.id === b)?.slot;
    return sa && sb ? rows.map((x) => (x.id === a ? { ...x, slot: sb } : x.id === b ? { ...x, slot: sa } : x)) : rows;
  };
  const idsOf = (list) => (list === 'lineup' ? order.lineup.map((x) => x.id) : order[list]);
  /** 보여 줄 칸 번호: 끌고 있는 목록만 미리보기 순서로 */
  const posMap = (list) => {
    const ids = idsOf(list);
    const shown = drag?.list === list && drag.to !== drag.from ? move(ids, drag.from, drag.to) : ids;
    return new Map(shown.map((id, i) => [id, i]));
  };
  const fieldLineup = drag?.list === 'field' && drag.target ? swapSlots(order.lineup, drag.id, drag.target) : order.lineup;
  const slotNow = new Map(order.lineup.map((x) => [x.id, x.slot]));
  const slotShown = new Map(fieldLineup.map((x) => [x.id, x.slot]));
  /** 구장에서 자리를 바꿔 보는 중인 두 선수: 놓기 전부터 바뀐 수치를 보여 준다 */
  const previewing = (id) => drag?.list === 'field' && !!drag.target && (id === drag.id || id === drag.target);
  const nextStarter = (() => {
    const rot = order.rotation.map((id) => byId.get(id)).filter(Boolean);
    return rot.find((p) => restOf(p) <= 0) || [...rot].sort((a, b) => restOf(a) - restOf(b))[0];
  })();

  const save = (next) => onCommit({ ...team, order: { ...order, ...next } });
  const latest = useRef({});
  /** 벤치 선수 b 를 출전 선수 t 자리에: 타순 · 수비 자리 · 로테이션 · 불펜 칸은 그대로 두고 사람만 바꾼다.
   *  벤치 목록 = 지금 안 뛰는 모두 − b + t 로 적어 두어야 playingIds 가 정확히 b 를 올리고 t 를 내린다 */
  const benchSwap = (b, t) => {
    const swap = (ids) => ids.map((id) => (id === t ? b : id));
    onCommit({ ...team,
      bench: [...benchList.map((p) => p.id).filter((id) => id !== b), t],
      order: { ...order, lineup: order.lineup.map((x) => (x.id === t ? { ...x, id: b } : x)), rotation: swap(order.rotation), bullpen: swap(order.bullpen) } });
    setJustIn(b);
    clearTimeout(justTimer.current);
    justTimer.current = setTimeout(() => setJustIn(null), 700);
  };
  const [justIn, setJustIn] = useState(null); // 방금 벤치에서 올라온 선수 — 잠깐 빛남
  const justTimer = useRef(null);
  useEffect(() => () => clearTimeout(justTimer.current), []);
  latest.current = { order, save, onSelect, benchSwap };
  const cancel = () => { dragRef.current = null; setDrag(null); };
  // 움직임 · 놓기는 창 전체에서 받는다. 최신 값은 ref 로
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
      d.moved = true;
      if (d.list === 'bench') {
        // 벤치 카드는 떠서 포인터를 따라가고, 같은 묶음(타자 → 구장 · 타순 / 선발 → 로테이션 / 불펜 → 불펜) 칸 위에 있으면 그 선수와 맞바꿀 준비
        const hit = d.targets.find((c) => e.clientX >= c.left && e.clientX <= c.right && e.clientY >= c.top && e.clientY <= c.bottom);
        d.target = hit ? hit.id : null;
        setDrag({ list: 'bench', id: d.id, x: e.clientX - d.ox, y: e.clientY - d.oy, w: d.w, target: d.target });
        return;
      }
      if (d.list === 'field') {
        // 다른 선수 카드가 원래 있던 자리(누른 순간의 카드 영역) 위에 포인터가 있을 때만 맞바꾼 모습, 벗어나면 원래대로
        const hit = d.cards.find((c) => e.clientX >= c.left && e.clientX <= c.right && e.clientY >= c.top && e.clientY <= c.bottom);
        const target = hit ? hit.id : null;
        d.target = target;
        d.last = { dx: e.clientX - d.x0, dy: e.clientY - d.y0 };
        // 끌리는 카드는 포인터를 그대로 따라간다
        setDrag({ list: 'field', id: d.id, target, dx: e.clientX - d.x0, dy: e.clientY - d.y0 });
        return;
      }
      // 줄은 포인터를 그대로 따라가고, 줄 가운데가 넘어선 칸이 새 자리 (첫 칸 · 마지막 칸에서 멈춤)
      const off = (d.axis === 'x' ? e.clientX : e.clientY) - (d.axis === 'x' ? d.x0 : d.y0);
      const to = Math.max(0, Math.min(d.count - 1, d.from + Math.round(off / d.pitch)));
      d.to = to;
      setDrag({ list: d.list, id: d.id, from: d.from, to, off, count: d.count });
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      const { order: o, save: sv, onSelect: pick } = latest.current;
      if (!d.moved) { setDrag(null); pick(d.p); return; }
      if (d.list === 'bench') { if (d.target) latest.current.benchSwap(d.id, d.target); setDrag(null); return; }
      if (d.list === 'field') {
        if (d.target) {
          // 놓은 자리에서 새 자리로 미끄러져 들어가게: 새 자리 기준으로 지금 보이는 위치만큼 밀어 둔 채 그리고, 다음 프레임에 0 으로
          const box = fieldRef.current?.getBoundingClientRect();
          const from = o.lineup.find((x) => x.id === d.id)?.slot;
          const to = o.lineup.find((x) => x.id === d.target)?.slot;
          if (box && from && to && d.last) {
            const px = (slot, k) => (XY[slot][k] / 100) * (k ? box.height : box.width);
            setSettle({ id: d.id, dx: px(from, 0) + d.last.dx - px(to, 0), dy: px(from, 1) + d.last.dy - px(to, 1) });
            requestAnimationFrame(() => requestAnimationFrame(() => setSettle(null)));
          }
          sv({ lineup: swapSlots(o.lineup, d.id, d.target) });
        }
      }
      else if (d.to !== d.from) sv({ [d.list]: move(o[d.list], d.from, d.to) });
      setDrag(null);
    };
    const esc = (e) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', esc);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rowDrag = (list, id, p) => ({
    'data-row': `${list}:${id}`,
    onPointerDown: (e) => {
      if (e.button !== 0 || dragRef.current) return;
      e.preventDefault();
      const box = e.currentTarget.parentElement;
      const from = idsOf(list).indexOf(id);
      dragRef.current = { list, id, p, from, to: from, axis: box.dataset.axis, top: box.dataset.axis === 'x' ? box.getBoundingClientRect().left : box.getBoundingClientRect().top, pitch: Number(box.dataset.pitch), count: Number(box.dataset.count), x0: e.clientX, y0: e.clientY, moved: false };
    },
    onKeyDown: (e) => { if (e.key === 'Enter') onSelect(p); },
  });
  const fieldRef = useRef(null);
  const tokenDrag = (id, p) => ({
    onPointerDown: (e) => {
      if (e.button !== 0 || dragRef.current) return;
      e.preventDefault();
      const cards = [...fieldRef.current.querySelectorAll('[data-token]')].filter((el) => el.dataset.token !== id)
        .map((el) => { const b = el.getBoundingClientRect(); return { id: el.dataset.token, left: b.left, right: b.right, top: b.top, bottom: b.bottom }; });
      dragRef.current = { list: 'field', id, p, x0: e.clientX, y0: e.clientY, moved: false, target: null, cards };
    },
    onKeyDown: (e) => { if (e.key === 'Enter') onSelect(p); },
  });

  const benchDrag = (p) => ({
    onPointerDown: (e) => {
      if (e.button !== 0 || dragRef.current) return;
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      const lists = p.type === 'batter' ? ['lineup'] : p.position === 'SP' ? ['rotation'] : ['bullpen'];
      const rects = [...(p.type === 'batter' ? [...fieldRef.current.querySelectorAll('[data-token]')].map((el) => [el.dataset.token, el]) : []),
        ...lists.flatMap((l) => [...document.querySelectorAll(`[data-row^="${l}:"]`)].map((el) => [el.dataset.row.split(':')[1], el]))];
      const targets = rects.map(([id, el]) => { const b = el.getBoundingClientRect(); return { id, left: b.left, right: b.right, top: b.top, bottom: b.bottom }; });
      dragRef.current = { list: 'bench', id: p.id, p, x0: e.clientX, y0: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, w: r.width, moved: false, target: null, targets };
    },
    onKeyDown: (e) => { if (e.key === 'Enter') onSelect(p); },
  });
  /** 벤치 선수를 끌어다 놓을 칸: 초록 테두리 · 빛 */
  const benchHit = (id) => drag?.list === 'bench' && drag.target === id;
  const hitGlow = { boxShadow: 'inset 0 0 0 2px #34d399, 0 0 18px -4px #34d399' };
  const inFx = (id) => (justIn === id ? { animation: 'sb-in .7s ease-out' } : null);
  const benchFace = (p) => (<>
    <span className="w-[22px] text-center"><Ovr p={p} size={15} /></span>
    {face(p, 24, 30)}
    <b className="min-w-0 flex-1 truncate text-[13px] text-white">{p.name}</b>
    <small className="font-display text-[11px] font-bold" style={{ color: teamNeon(p) }}>{p.position}</small>
  </>);
  const lifted = { boxShadow: 'inset 0 0 0 2px #e5e7eb, 0 10px 24px -8px rgba(0,0,0,.9)', background: 'linear-gradient(90deg,#26303f,#161d2a)', zIndex: 5 };
  const rowBg = (hot) => (hot
    ? { background: `linear-gradient(90deg,color-mix(in srgb,${hot} 20%,#0b111c),#0b111c)`, boxShadow: `inset 3px 0 0 ${hot}` }
    : { background: '#0e141f' });
  /** 칸 위치: 판 안 절대 위치 + 칸 번호만큼 아래로. 끌리는 줄은 바로 붙고, 나머지는 미끄러진다 */
  const place = (pos, h, pitch, dragging, axis = 'y') => {
    // 끌리는 줄: 제 칸에서 포인터만큼(판 안에서만) · 나머지: 칸이 바뀌면 미끄러짐 · 놓으면 끌린 줄도 새 칸으로 미끄러져 들어감
    const follow = dragging && drag?.off != null;
    const at = follow ? Math.max(0, Math.min((drag.count - 1) * pitch, drag.from * pitch + drag.off)) : pos * pitch;
    return {
      position: 'absolute', left: 0, top: 0, ...(axis === 'x' ? { bottom: 0, width: h } : { right: 0, height: h }),
      transform: `${axis === 'x' ? `translateX(${at}px)` : `translateY(${at}px)`}${follow ? ' scale(1.03)' : ''}`,
      transition: follow ? 'none' : 'transform .26s cubic-bezier(.2,.8,.2,1)',
    };
  };

  /** 타순 띠 한 칸 (구장 표시와 같은 중계 자막 문법): 기운 사진 위 큰 타순 번호 · 이름 띠(종합 · 이름) · 구단색 기록 띠.
   *  사진은 프로필(360×480)을 같은 크기 · 같은 위치로 줄여 얼굴이 잘리지 않고 칸마다 크기가 같다. 좌우로 끌어 순서를 바꾼다 */
  const batCell = (x, pos, w, pitch) => {
    const on = sel?.id === x.p.id;
    const dragging = drag?.list === 'lineup' && drag.id === x.id;
    const shownSlot = slotShown.get(x.id) || x.slot;
    const after = effAt(x.p, shownSlot);
    const r = seasonRecord(x.p);
    const c = teamNeon(x.p);
    const ring = dragging ? '#e5e7eb' : benchHit(x.id) ? '#34d399' : on ? tone(x.p.overall) : null;
    return (
      <div key={x.id} role="button" tabIndex={0} {...rowDrag('lineup', x.id, x.p)}
        className={`touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ ...place(pos, w, pitch, dragging, 'x'), zIndex: dragging ? 5 : undefined,
          filter: ring ? `drop-shadow(0 0 1.5px ${ring}) drop-shadow(0 0 1.5px ${ring}) drop-shadow(0 0 8px ${ring})` : 'drop-shadow(0 4px 8px rgba(0,0,0,.5))', ...inFx(x.id) }}>
        <span className="absolute inset-x-0 top-0 h-[62px] bg-no-repeat"
          style={{ clipPath: SKEW(10), backgroundImage: `url(profiles/${encodeURIComponent(x.p.id)}.webp), url(ui/mt/silhouette-player.webp), linear-gradient(180deg, color-mix(in srgb, ${c} 30%, #0b1220), #0b1220)`,
            backgroundSize: '66px auto, 66px auto, 100% 100%', backgroundPosition: 'center 6px, center 6px, 0 0' }}>
          <b className="absolute left-3 top-0.5 font-display text-[30px] font-extrabold leading-none text-white" style={{ textShadow: '0 2px 6px #000' }}>{pos + 1}</b>
        </span>
        <span className="absolute inset-x-0 top-[64px] flex h-[26px] items-baseline gap-[5px] whitespace-nowrap bg-[rgba(6,10,19,.96)] px-3 pt-1" style={{ clipPath: SKEW(8) }}>
          <Ovr p={x.p} v={after.ovr} size={15} /><b className="truncate text-[12.5px] font-extrabold text-white">{x.p.name}</b>
        </span>
        <span className="absolute left-1.5 right-0 top-[92px] h-[20px] whitespace-nowrap px-3 pt-[2px] font-display text-[11px] font-extrabold text-[#05080f]" style={{ clipPath: SKEW(7), background: c }}>
          AVG {r.avg != null ? r.avg.toFixed(3).slice(1) : '-'}{r.hr != null ? ` · ${r.hr}HR` : ''}
        </span>
      </div>
    );
  };
  const pitRow = (p, list, pos, h, pitch) => {
    const on = sel?.id === p.id;
    const dragging = drag?.list === list && drag.id === p.id;
    const [label, color] = list === 'rotation' ? [`${pos + 1}SP`, ROLE.SP] : pos === 0 ? ['CL', ROLE.CL] : pos <= 2 ? ['SU', ROLE.SU] : [`MR${pos - 2}`, ROLE.MR];
    const next = list === 'rotation' && p.id === nextStarter?.id;
    const rest = restOf(p);
    const c = conditionOf(rest);
    return (
      <div key={p.id} role="button" tabIndex={0} {...rowDrag(list, p.id, p)}
        className={`mt-cut flex touch-none select-none items-center gap-[7px] px-[9px] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ '--c': '7px', ...place(pos, h, pitch, dragging),
          ...(next ? { background: 'linear-gradient(90deg,#16263f,#0b111c)', boxShadow: 'inset 3px 0 0 #60a5fa, inset 0 0 0 1px rgba(96,165,250,.35)' } : rowBg(on && tone(p.overall))), ...(dragging ? lifted : null), ...(benchHit(p.id) ? hitGlow : null), ...inFx(p.id) }}>
        <Handle />
        <b className="w-[32px] shrink-0 px-0.5 text-center font-display text-[11.5px] font-extrabold text-[#05080f]" style={{ background: color }}>{label}</b>
        <span className="w-[26px] shrink-0 text-center"><Ovr p={p} size={18} /></span>
        <NameBlock p={p} size={13.5} />
        {next && <b className="shrink-0 bg-[#60a5fa] px-[4px] font-display text-[10.5px] tracking-[0.06em] text-[#05080f]">NEXT</b>}
        <span className="pointer-events-none absolute bottom-[3px] left-[9px] right-[9px] h-[2px] bg-white/[0.06]" title={`컨디션 ${c}%`}><i className="absolute inset-y-0 left-0" style={{ width: `${c}%`, background: condColor(c) }} /></span>
        {rest > 0 && <b className="pointer-events-none absolute right-[6px] top-[2px] font-display text-[10.5px]" style={{ color: condColor(c) }}>-{rest}</b>}
      </div>
    );
  };
  /** 구장 위 세로 카드: 사진 바탕 · 왼쪽 위 종합 · 자리 · 이름 · 대표 기록. 다른 카드 위에 놓으면 수비 자리를 맞바꾼다 */
  const token = (x) => {
    const on = sel?.id === x.p.id;
    const dragging = drag?.list === 'field' && drag.id === x.id;
    const target = drag?.list === 'field' && drag.target === x.id;
    const shownSlot = slotShown.get(x.id) || x.slot;
    const before = effAt(x.p, x.slot);
    const after = effAt(x.p, shownSlot);
    const r = seasonRecord(x.p);
    const ring = dragging ? '#e5e7eb' : target ? posColor(x.p) : benchHit(x.id) ? '#34d399' : on ? tone(x.p.overall) : null;
    // 끌리는 카드는 원래 자리에서 포인터만큼 · 방금 놓은 카드는 새 자리에서 밀린 만큼 (다음 프레임에 제자리로 미끄러짐) · 나머지는 자리 바뀌면 미끄러짐
    const posSlot = dragging ? slotNow.get(x.id) || x.slot : x.slot;
    const settling = settle?.id === x.id;
    const off = dragging ? [drag.dx || 0, drag.dy || 0] : settling ? [settle.dx, settle.dy] : [0, 0];
    const glow = ring ? `drop-shadow(0 0 1.5px ${ring}) drop-shadow(0 0 1.5px ${ring}) drop-shadow(0 0 8px ${ring})` : 'drop-shadow(0 6px 10px rgba(0,0,0,.7))';
    return (
      <div key={x.id} data-token={x.id} role="button" tabIndex={0} {...tokenDrag(x.id, x.p)}
        className={`absolute touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ left: `${XY[posSlot][0]}%`, top: `${XY[posSlot][1]}%`, zIndex: dragging || settling ? 5 : undefined,
          transform: `translate(calc(-50% + ${off[0]}px),calc(-50% + ${off[1]}px))${dragging ? ' scale(1.06)' : ''}`,
          transition: dragging || settling ? 'none' : 'left .28s cubic-bezier(.2,.8,.2,1), top .28s cubic-bezier(.2,.8,.2,1), transform .28s cubic-bezier(.2,.8,.2,1)',
          filter: glow, ...inFx(x.id) }}>
        <Lower p={x.p} c={teamNeon(x.p)} sub={`${shownSlot} · AVG ${r.avg != null ? r.avg.toFixed(3).slice(1) : '-'}`}
          ovr={previewing(x.id) ? <Delta before={before.ovr} after={after.ovr} size={16} /> : <Ovr p={x.p} v={after.ovr} size={16} />} />
      </div>
    );
  };

  const lineupRows = order.lineup.map((x) => ({ ...x, p: byId.get(x.id) })).filter((x) => x.p);
  const rotation = order.rotation.map((id) => byId.get(id)).filter(Boolean);
  const bullpen = order.bullpen.map((id) => byId.get(id)).filter(Boolean);
  const linePos = posMap('lineup');
  const rotPos = posMap('rotation');
  const penPos = posMap('bullpen');

  return (
    <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ '--c': '20px' }}>
      <style>{'@keyframes sb-in { 0% { filter: brightness(2.2) saturate(1.5); } 100% { filter: none; } }'}</style>
      {drag?.list === 'bench' && byId.get(drag.id) && createPortal(
        <div className="mt-cut pointer-events-none fixed z-50 flex h-[40px] items-center gap-2 px-2"
          style={{ '--c': '6px', left: drag.x, top: drag.y, width: drag.w, transform: 'scale(1.05)', background: 'linear-gradient(90deg,#26303f,#161d2a)', boxShadow: `inset 0 0 0 2px ${drag.target ? '#34d399' : '#e5e7eb'}, 0 14px 28px -8px rgba(0,0,0,.95)` }}>
          <Handle />
          {benchFace(byId.get(drag.id))}
        </div>, document.body,
      )}
      <div className="flex items-baseline gap-3">
        <p className="mt-lab">My Squad</p>
        <div className="ml-auto flex gap-2">
          <Btn sm onClick={() => onCommit({ ...team, order: autoArrange(squad, bench, team.pitchFatigue) })} disabled={!squad.length}>자동 배치</Btn>
          <Btn sm onClick={onAutoFill} disabled={autoDisabled}>자동 채우기</Btn>
        </div>
      </div>

      {squad.length === 0 ? <p className="mt-4 text-sm text-gray-500">아직 영입한 선수가 없습니다. 왼쪽 영입에서 찾아 보세요.</p> : (
        <div className="mt-3 grid min-h-0 flex-1 gap-3.5" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>
          {/* 왼쪽: 구장(수비 자리) + 아래 타순 띠 */}
          <div className="flex min-h-0 flex-col gap-2.5">
            <div ref={fieldRef} className="mt-cut relative min-h-0 flex-1 overflow-hidden bg-[#07130c] bg-cover" style={{ '--c': '18px', backgroundImage: 'url(ui/field.webp)', backgroundPosition: 'center 58%' }}>
              <span className="absolute inset-0" style={{ background: 'radial-gradient(80% 80% at 50% 55%,rgba(5,8,15,0),rgba(5,8,15,.7))' }} />
              {fieldLineup.map((x) => ({ ...x, p: byId.get(x.id) })).filter((x) => x.p).map((x) => token(x))}
              {nextStarter && (() => {
                const r = seasonRecord(nextStarter);
                return (
                  <div role="button" tabIndex={0} onClick={() => onSelect(nextStarter)} className="absolute cursor-pointer"
                    style={{ left: `${XY.P[0]}%`, top: `${XY.P[1]}%`, transform: 'translate(-50%,-50%)', filter: `drop-shadow(0 0 1.5px ${ROLE.SP}) drop-shadow(0 0 8px ${ROLE.SP}88)` }}>
                    <Lower p={nextStarter} c={ROLE.SP} ovr={<Ovr p={nextStarter} size={16} />}
                      sub={`SP · ERA ${r.era != null ? r.era.toFixed(2) : '-'}${r.k != null ? ` · ${r.k}K` : ''}`} />
                  </div>
                );
              })()}
            </div>
            <div className="shrink-0">
              <Grp en="BATTING ORDER" ko={`타순 ${lineupRows.length}`} color="#34d399" />
              <Slots count={lineupRows.length} maxH={200} gap={5} axis="x" style={{ height: 112 }}>
                {(w, pitch) => stable(lineupRows, (x) => x.id).map((x) => batCell(x, linePos.get(x.id), w, pitch))}
              </Slots>
            </div>
          </div>

          {/* 오른쪽: 로테이션 · 불펜 · 벤치 */}
          <div className="flex min-h-0 flex-col">
            <Grp en="ROTATION" ko={`선발 ${rotation.length}`} color={ROLE.SP} />
            <Slots count={rotation.length} maxH={52} style={{ flex: Math.max(1, rotation.length) }}>
              {(h, pitch) => stable(rotation).map((p) => pitRow(p, 'rotation', rotPos.get(p.id), h, pitch))}
            </Slots>
            <div className="h-2 shrink-0" />
            <Grp en="BULLPEN" ko={`불펜 ${bullpen.length}`} color={ROLE.MR} />
            <Slots count={bullpen.length} maxH={46} style={{ flex: Math.max(1, bullpen.length) }}>
              {(h, pitch) => stable(bullpen).map((p) => pitRow(p, 'bullpen', penPos.get(p.id), h, pitch))}
            </Slots>
            <div className="h-2 shrink-0" />
            <Grp en="BENCH" ko={`벤치 ${benchList.length}`} color="#94a3b8" />
            <div className="mt-scroll slim flex max-h-[150px] shrink-0 flex-col gap-1 overflow-y-auto">
              {benchList.length === 0 && <span className="text-sm text-gray-500">-</span>}
              {benchList.map((p) => (
                <div key={p.id} role="button" tabIndex={0} {...benchDrag(p)}
                  className={`mt-cut flex h-[40px] shrink-0 touch-none select-none items-center gap-2 px-2 ${drag?.list === 'bench' && drag.id === p.id ? 'cursor-grabbing opacity-35' : 'cursor-grab'}`}
                  style={{ '--c': '6px', background: 'rgba(5,8,15,.6)', boxShadow: `inset 0 0 0 1px ${sel?.id === p.id ? teamNeon(p) : 'rgba(148,163,184,.18)'}` }}>
                  <Handle />
                  {benchFace(p)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
