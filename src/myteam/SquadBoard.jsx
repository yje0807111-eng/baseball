/*
 * 내 라커 · 내 선수 — 사진 구장 위 수비 9명으로 한눈에 보고, 옆 두 열에서 타순 · 선발 로테이션 · 불펜 순서를 끌어서 정한다.
 * 벤치는 맨 아래 트레이. 투수 컨디션은 team.pitchFatigue(src/myteam/fatigue.js 와 같은 표)로 보여 준다.
 *
 * 저장: team.order = { lineup: [{ id, slot }] (타순 순서, slot = C·1B·2B·3B·SS·LF·CF·RF·DH), rotation: [id ×5], bullpen: [id ×8] (0 마무리 · 1~2 셋업 · 나머지 중계) }
 *  없거나 엔트리가 바뀌어 맞지 않으면 squadOrder 가 채워 넣는다.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { playingIds } from './match.js';
import { posColor, statColor, teamNeon } from './teamColor.js';
import { Btn } from './ui.jsx';
import { offPositionPenalty } from '../KboAugmentDraft.jsx';
import { seasonRecord, playerTraits, HAND_LABEL, traitIconStyle } from './traits.js';

const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const ROLE = { SP: '#60a5fa', CL: '#fbbf24', SU: '#fb923c', MR: '#f87171' };
const FIELD = [['C', 'C'], ['1B', '1B'], ['2B', '2B'], ['3B', '3B'], ['SS', 'SS'], ['LF', 'OF'], ['CF', 'OF'], ['RF', 'OF'], ['DH', 'DH']];
/* 구장 사진(ui/field.webp) 위 자리 (%) — 폭 440px 판 기준으로 외야 · 코너를 안쪽에 */
const XY = { C: [50, 90], '1B': [78, 60], '2B': [64, 42], SS: [36, 42], '3B': [22, 60], LF: [17, 18], CF: [50, 8], RF: [83, 18], DH: [84, 90], P: [50, 62] };
const byOvr = (a, b) => b.overall - a.overall;

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
/** 이름 칸: 위에 포지션(구단색 작은 영문) · 투타(작은 글자), 아래 이름 — 영입 목록 줄과 같은 문법 */
const NameBlock = ({ p, pos = p.position, size = 13.5 }) => {
  const h = HAND_LABEL(p);
  return (
    <span className="min-w-0 flex-1 leading-tight">
      <span className="flex items-baseline gap-1.5 font-display text-[10.5px] font-bold tracking-[0.12em]">
        <span style={{ color: teamNeon(p) }}>{pos}</span>
        <span className="font-sans text-[10.5px] font-semibold tracking-normal" style={{ color: h.color }}>{h.long}</span>
      </span>
      <b className="block truncate font-extrabold text-white" style={{ fontSize: size }}>{p.name}</b>
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
function Slots({ count, maxH, gap = 4, style, children }) {
  const ref = useRef(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const rowH = count ? Math.max(24, Math.min(maxH, (h - gap * (count - 1)) / count)) : 0;
  return (
    <div ref={ref} className="relative min-h-0" style={style} data-pitch={rowH + gap} data-count={count}>
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
  latest.current = { order, save, onSelect };
  const cancel = () => { dragRef.current = null; setDrag(null); };
  // 움직임 · 놓기는 창 전체에서 받는다. 최신 값은 ref 로
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
      const first = !d.moved;
      d.moved = true;
      if (d.list === 'field') {
        // 다른 선수 카드가 원래 있던 자리(누른 순간의 카드 영역) 위에 포인터가 있을 때만 맞바꾼 모습, 벗어나면 원래대로
        const hit = d.cards.find((c) => e.clientX >= c.left && e.clientX <= c.right && e.clientY >= c.top && e.clientY <= c.bottom);
        const target = hit ? hit.id : null;
        if (first || target !== d.target) { d.target = target; setDrag({ list: 'field', id: d.id, target }); }
        return;
      }
      // 칸 번호 = 판 위쪽에서 포인터까지 거리 ÷ 칸 간격 (판 밖으로 나가도 첫 칸 · 마지막 칸에서 멈춤)
      const to = Math.max(0, Math.min(d.count - 1, Math.floor((e.clientY - d.top) / d.pitch)));
      if (first || to !== d.to) { d.to = to; setDrag({ list: d.list, id: d.id, from: d.from, to }); }
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      const { order: o, save: sv, onSelect: pick } = latest.current;
      if (!d.moved) { setDrag(null); pick(d.p); return; }
      if (d.list === 'field') { if (d.target) sv({ lineup: swapSlots(o.lineup, d.id, d.target) }); }
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
      dragRef.current = { list, id, p, from, to: from, top: box.getBoundingClientRect().top, pitch: Number(box.dataset.pitch), count: Number(box.dataset.count), x0: e.clientX, y0: e.clientY, moved: false };
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

  const lifted = { boxShadow: 'inset 0 0 0 2px #e5e7eb, 0 10px 24px -8px rgba(0,0,0,.9)', background: 'linear-gradient(90deg,#26303f,#161d2a)', zIndex: 5 };
  const rowBg = (hot) => (hot
    ? { background: `linear-gradient(90deg,color-mix(in srgb,${hot} 20%,#0b111c),#0b111c)`, boxShadow: `inset 3px 0 0 ${hot}` }
    : { background: '#0e141f' });
  /** 칸 위치: 판 안 절대 위치 + 칸 번호만큼 아래로. 끌리는 줄은 바로 붙고, 나머지는 미끄러진다 */
  const place = (pos, h, pitch, dragging) => ({
    position: 'absolute', left: 0, right: 0, top: 0, height: h,
    transform: `translateY(${pos * pitch}px)`,
    transition: dragging ? 'transform .08s ease-out' : 'transform .2s cubic-bezier(.2,.8,.2,1)',
  });

  /** 줄 오른쪽: 시즌 기록 두세 칸 + 대표 강점 아이콘 */
  const RecLine = ({ p }) => {
    const r = seasonRecord(p);
    const cells = p.type === 'pitcher'
      ? [[r.era != null ? r.era.toFixed(2) : null, 'ERA'], [r.k, 'K']]
      : [[r.avg != null ? r.avg.toFixed(3).slice(1) : null, 'AVG'], [r.hr, 'HR'], [r.sb, 'SB']];
    return (
      <span className="flex shrink-0 gap-2.5 font-display">
        {cells.map(([v, l]) => (
          <span key={l} className="flex flex-col items-end leading-none">
            <small className="text-[10px] font-semibold tracking-[0.08em] text-gray-400">{l}</small>
            <b className={`mt-0.5 text-[15px] font-bold tabular-nums ${v == null ? 'text-gray-600' : 'text-white'}`}>{v ?? '-'}</b>
          </span>
        ))}
      </span>
    );
  };
  const TopTrait = ({ p }) => {
    const g = playerTraits(p).good[0];
    return <span title={g ? `${g.name} · ${g.why}` : ''} className="block h-[17px] w-[17px] shrink-0" style={g ? traitIconStyle(g.id, '#6ee7b7') : null} />;
  };

  const batRow = (x, pos, h, pitch) => {
    const on = sel?.id === x.p.id;
    const dragging = drag?.list === 'lineup' && drag.id === x.id;
    const shownSlot = slotShown.get(x.id) || x.slot;
    const before = effAt(x.p, x.slot);
    const after = effAt(x.p, shownSlot);
    return (
      <div key={x.id} role="button" tabIndex={0} {...rowDrag('lineup', x.id, x.p)}
        className={`mt-cut flex touch-none select-none items-center gap-[7px] px-[9px] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ '--c': '7px', ...place(pos, h, pitch, dragging), ...rowBg(on && tone(x.p.overall)), ...(dragging ? lifted : null) }}>
        <Handle />
        <b className="w-[14px] shrink-0 text-center font-display text-[17px] text-gray-500">{pos + 1}</b>
        <span className="w-[26px] shrink-0 text-center">{previewing(x.id) ? <Delta before={before.ovr} after={after.ovr} size={16} /> : <Ovr p={x.p} v={after.ovr} size={19} />}</span>
        {face(x.p, 30, Math.min(44, h - 10))}
        <NameBlock p={x.p} pos={shownSlot} />
        <RecLine p={x.p} />
        <TopTrait p={x.p} />
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
          ...(next ? { background: 'linear-gradient(90deg,#16263f,#0b111c)', boxShadow: 'inset 3px 0 0 #60a5fa, inset 0 0 0 1px rgba(96,165,250,.35)' } : rowBg(on && tone(p.overall))), ...(dragging ? lifted : null) }}>
        <Handle />
        <b className="w-[32px] shrink-0 px-0.5 text-center font-display text-[11.5px] font-extrabold text-[#05080f]" style={{ background: color }}>{label}</b>
        <span className="w-[26px] shrink-0 text-center"><Ovr p={p} size={19} /></span>
        {face(p, 30, Math.min(42, h - 10))}
        <NameBlock p={p} />
        {next && <b className="shrink-0 bg-[#60a5fa] px-[4px] font-display text-[10.5px] tracking-[0.06em] text-[#05080f]">NEXT</b>}
        <RecLine p={p} />
        <TopTrait p={p} />
        <span className="pointer-events-none absolute bottom-[3px] left-[9px] right-[9px] h-[2px] bg-white/[0.06]" title={`컨디션 ${c}%`}><i className="absolute inset-y-0 left-0" style={{ width: `${c}%`, background: condColor(c) }} /></span>
        {rest > 0 && <b className="pointer-events-none absolute right-[6px] top-[2px] font-display text-[10.5px]" style={{ color: condColor(c) }}>-{rest}</b>}
      </div>
    );
  };
  const token = (x, n) => {
    const on = sel?.id === x.p.id;
    const dragging = drag?.list === 'field' && drag.id === x.id;
    return (
      <div key={x.id} data-token={x.id} role="button" tabIndex={0} {...tokenDrag(x.id, x.p)}
        className={`mt-cut absolute grid w-[132px] touch-none select-none items-center gap-[7px] py-[3px] pl-[3px] pr-[7px] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ '--c': '7px', left: `${XY[x.slot][0]}%`, top: `${XY[x.slot][1]}%`, transform: `translate(-50%,-50%)${dragging ? ' scale(1.08)' : ''}`, transition: 'left .2s cubic-bezier(.2,.8,.2,1), top .2s cubic-bezier(.2,.8,.2,1), transform .12s', zIndex: dragging ? 5 : undefined, gridTemplateColumns: '38px minmax(0,1fr)', background: 'rgba(6,10,19,.9)',
          boxShadow: dragging ? 'inset 0 0 0 2px #e5e7eb, 0 12px 26px -8px rgba(0,0,0,.95)' : drag?.target === x.id ? `inset 0 0 0 2px ${posColor(x.p)}` : `inset 0 -2px 0 ${posColor(x.p)},${on ? ` 0 0 0 2px ${tone(x.p.overall)},` : ''} inset 0 0 0 1px rgba(255,255,255,.12)` }}>
        {face(x.p, 38, 44)}
        <span className="min-w-0">
          <span className="flex items-center gap-1"><Chip c={posColor(x.p)}>{x.slot}</Chip>{!previewing(x.id) && <b className="font-display text-[11px] text-gray-400">{n}</b>}<span className="ml-auto">{previewing(x.id) ? <Delta before={effAt(x.p, slotNow.get(x.id)).ovr} after={effAt(x.p, x.slot).ovr} size={16} /> : <Ovr p={x.p} v={effAt(x.p, x.slot).ovr} />}</span></span>
          <b className="block truncate text-[13px] font-extrabold text-white">{x.p.name}</b>
        </span>
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
      <div className="flex items-baseline gap-3">
        <p className="mt-lab">My Squad</p>
        <div className="ml-auto flex gap-2">
          <Btn sm onClick={() => onCommit({ ...team, order: autoArrange(squad, bench, team.pitchFatigue) })} disabled={!squad.length}>자동 배치</Btn>
          <Btn sm onClick={onAutoFill} disabled={autoDisabled}>자동 채우기</Btn>
        </div>
      </div>

      {squad.length === 0 ? <p className="mt-4 text-sm text-gray-500">아직 영입한 선수가 없습니다. 왼쪽 영입에서 찾아 보세요.</p> : (
        <>
          <div className="mt-3 grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: '440px minmax(0,1fr)' }}>
            {/* 한눈에: 구장 위 수비 9명 + 마운드의 다음 선발 */}
            <div ref={fieldRef} className="mt-cut relative min-h-0 overflow-hidden bg-[#07130c] bg-cover" style={{ '--c': '14px', backgroundImage: 'url(ui/field.webp)', backgroundPosition: 'center 60%' }}>
              <span className="absolute inset-0" style={{ background: 'radial-gradient(70% 70% at 50% 60%,rgba(5,8,15,.05),rgba(5,8,15,.62))' }} />
              {fieldLineup.map((x) => ({ ...x, p: byId.get(x.id) })).filter((x) => x.p).map((x) => token(x, order.lineup.findIndex((r) => r.id === x.id) + 1))}
              {nextStarter && (
                <div role="button" tabIndex={0} onClick={() => onSelect(nextStarter)} className="mt-cut absolute flex cursor-pointer items-center gap-1.5 py-[3px] pl-[3px] pr-2"
                  style={{ '--c': '7px', left: `${XY.P[0]}%`, top: `${XY.P[1]}%`, transform: 'translate(-50%,-50%)', background: 'rgba(6,10,19,.9)', boxShadow: `inset 0 -2px 0 ${ROLE.SP}` }}>
                  {face(nextStarter, 34, 40)}
                  <span className="flex flex-col gap-px"><b className="font-display text-[10px] tracking-[0.2em] text-[#60a5fa]">NEXT</b><b className="whitespace-nowrap text-[13px] font-extrabold text-white">{nextStarter.name}</b></span>
                  <Ovr p={nextStarter} />
                </div>
              )}
            </div>

            {/* 정하기: 타순 | 로테이션 · 불펜 — 목록마다 자기 판 안에서만 움직인다 */}
            <div className="grid min-h-0 grid-cols-2 gap-3">
              <div className="flex min-h-0 flex-col">
                <Grp en="LINEUP" ko={`타순 ${lineupRows.length}`} color="#34d399" right="기록" />
                <Slots count={lineupRows.length} maxH={64} style={{ flex: 1 }}>
                  {(h, pitch) => lineupRows.map((x) => batRow(x, linePos.get(x.id), h, pitch))}
                </Slots>
              </div>
              <div className="flex min-h-0 flex-col">
                <Grp en="ROTATION" ko={`선발 ${rotation.length}`} color={ROLE.SP} right="기록" />
                <Slots count={rotation.length} maxH={56} style={{ flex: Math.max(1, rotation.length) }}>
                  {(h, pitch) => rotation.map((p) => pitRow(p, 'rotation', rotPos.get(p.id), h, pitch))}
                </Slots>
                <div className="h-2 shrink-0" />
                <Grp en="BULLPEN" ko={`불펜 ${bullpen.length}`} color={ROLE.MR} />
                <Slots count={bullpen.length} maxH={56} style={{ flex: Math.max(1, bullpen.length) }}>
                  {(h, pitch) => bullpen.map((p) => pitRow(p, 'bullpen', penPos.get(p.id), h, pitch))}
                </Slots>
              </div>
            </div>
          </div>

          {/* 벤치: 맨 아래 */}
          <div className="mt-cut mt-3.5 flex shrink-0 items-center gap-3.5 px-3.5 py-3" style={{ '--c': '12px', background: 'linear-gradient(180deg,rgba(148,163,184,.08),rgba(148,163,184,.03))', boxShadow: 'inset 0 1px 0 rgba(148,163,184,.25)' }}>
            <div className="mt-grp !my-0 shrink-0 text-slate-400">BENCH <b className="text-[14px] text-white">{benchList.length}</b></div>
            {benchList.length === 0 && <span className="text-sm text-gray-500">-</span>}
            {benchList.map((p) => (
              <div key={p.id} role="button" tabIndex={0} onClick={() => onSelect(p)} className="mt-cut grid min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-1 pl-1 pr-2"
                style={{ '--c': '8px', gridTemplateColumns: '26px 36px minmax(0,1fr) auto', background: 'rgba(5,8,15,.6)', boxShadow: `inset 0 0 0 1px ${sel?.id === p.id ? teamNeon(p) : 'rgba(148,163,184,.18)'}` }}>
                <span className="text-center"><Ovr p={p} size={18} /></span>
                {face(p, 36, 44)}
                <NameBlock p={p} size={14} />
                <button type="button" onClick={(e) => { e.stopPropagation(); onToggleBench(p); }}
                  className="mt-cut bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,.5)] hover:bg-emerald-500/35" style={{ '--c': '4px' }}>출전 ↑</button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
