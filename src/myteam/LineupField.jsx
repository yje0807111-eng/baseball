/*
 * 정비 1단계(라인업) 가운데 — 구장 + 타순(목업 prep-lineup2 9안 · 구장 그림 1번, 2026-10-03)
 *  구장 = 수비(자리 · 수비 능력 · 이탈 감점 · 마운드에 오늘 선발), 타순 = 공격(컨택 · 파워 · 주력) — 같은 숫자를 두 군데 적지 않는다.
 *  끌기(예전 SquadBoard 와 같은 손맛, 5px 넘게 움직여야 끌기 · 아니면 누르기):
 *    구장 선수 → 다른 선수 위에 놓기 = 수비 자리 맞바꿈(끄는 동안 대상 칸이 빛남)
 *    타순 줄 → 위아래로 끌기 = 그 자리에 끼워 넣기(끄는 동안 줄이 미리 밀려남)
 *    벤치 칩 → 타순 줄이나 구장 선수 위에 놓기 = 사람만 바꿈(타순 · 자리 그대로, SquadBoard benchSwap 과 같은 셈)
 *  누르기: 타순 줄 · 구장 선수를 누르면 양쪽이 함께 빛나고 그 줄 아래 '바꾸기' 줄(벤치 → 사람 · 다른 타자 → 타순)
 *  lineup-sim: 승률을 바꾸는 건 '자기 자리'(이탈 한 명 −2.3%p)와 타순 — 추천은 적지 않는다(자동 배치 단추만)
 * 구장 그림(public/ui/field/field-1.webp, 힉스필드 GPT Image 2)은 베이스 자리가 정해져 있어 그 좌표(그림 %)로 수비 자리를 셈한다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Btn, Portrait } from './ui.jsx';
import { playingIds } from './match.js';
import { squadOrder, autoArrange, penaltyAt } from './SquadBoard.jsx';
import { POS_COLOR } from './teamColor.js';

const cut = (c) => ({ '--c': `${c}px` });
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', DIM = '#9ca3af';
const POS_KO = { C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', LF: '좌익수', CF: '중견수', RF: '우익수', DH: '지명', OF: '외야수', SP: '선발', RP: '불펜' };
const posC = (slot) => POS_COLOR[['LF', 'CF', 'RF'].includes(slot) ? 'OF' : slot] || US;
/* 그림 1번의 베이스(그림 %) → 수비 자리. 2루수 · 유격수는 잔디 쪽으로 올려 1 · 3루 이름표와 겹치지 않게 */
const B = { h: [50, 89], b1: [67.3, 65.8], b2: [50, 47.2], b3: [32.8, 65.8] };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const up = (p, d) => [p[0], p[1] - d];
const SPOT = {
  C: [B.h[0], B.h[1] + 2], '1B': [B.b1[0] + 3, B.b1[1] - 1], '3B': [B.b3[0] - 3, B.b3[1] - 1],
  '2B': up(lerp(B.b2, B.b1, 0.55), 15), SS: up(lerp(B.b2, B.b3, 0.55), 15),
  LF: [B.b3[0] - 9, B.b2[1] - 24], CF: [50, B.b2[1] - 33], RF: [B.b1[0] + 9, B.b2[1] - 24],
  DH: [91, 92], P: [50, (B.h[1] + B.b2[1]) / 2 - 2],
};
const at = (k) => ({ left: `${SPOT[k][0]}%`, top: `${SPOT[k][1]}%` });
const move = (arr, from, to) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };
const Hand = ({ h }) => <b className="text-t4" style={{ color: h === 'L' ? GOLD : h === 'S' ? '#c4b5fd' : '#7dd3fc' }}>{h === 'L' ? '좌' : h === 'S' ? '양' : '우'}</b>;
const Num = ({ v }) => <b className="font-display text-t3" style={{ color: v >= 90 ? GOLD : v >= 80 ? '#e5e7eb' : DIM }}>{v}</b>;
const Pen = ({ n }) => (n ? <b className="whitespace-nowrap rounded-full px-2 text-t4" style={{ color: '#0b0f1a', background: RED }}>이탈 −{n}</b> : null);
const Sub = ({ children, right }) => <div className="flex shrink-0 items-center justify-between"><span className="text-t3 font-bold text-gray-300">{children}</span>{right}</div>;

/*
 * 끌기 손맛(2026-10-03 다시) — 비교: Trello · Notion 줄 끌기(잡은 카드가 포인터에 붙고 나머지가 미끄러져 자리를 비움),
 * FC 온라인 포메이션 편집(자리 가까이 가면 그 자리에 붙음). 시간은 Material 작은 구성 요소 이동 150~200ms 기준:
 *  잡기    — 잡은 카드가 들림(줄 1.02 · 구장 1.06배 + 그림자), 포인터를 그대로 따라감(지연 없음)
 *  타순    — 나머지 줄이 한 칸씩 미끄러져(160ms) 놓일 자리를 비워 둠, 번호도 미리 바뀜
 *  구장    — 다른 선수 72px 안에 들어오면 그 자리로 끌려가 붙고(140ms) 그 선수는 내 원래 자리로 비켜 섬(180ms)
 *  벤치    — 떠 있는 칩이 포인터를 따라가다 줄 · 구장 선수 위에 오면 그 가운데로 붙음(140ms)
 *  놓기    — 붙은 자리에 그대로 안착(튀지 않게 그 한 그림만 전환 끔), 빈 데 놓으면 원래 자리로 돌아감(200ms)
 *  '애니메이션 줄이기'면 시간을 모두 0
 */
const RM = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const T = (ms) => (RM ? 0 : ms);
const SHIFT_MS = T(160), SNAP_MS = T(140), SETTLE_MS = T(200), MAGNET = 72;
const EASE = 'cubic-bezier(.2,.8,.2,1)';

export default function LineupField({ team, squad, bench, onCommit, starter = null, onPitchers = null, footer = null }) {
  const [sel, setSel] = useState(null);
  const [drag, setDrag] = useState(null); // field: { ox, oy, snap, target } · row: { from, to, off, pitch } · bench: { x, y, snap, target }
  const [settle, setSettle] = useState(null); // 놓은 직후 한 그림: { kind, id, ox, oy, go }
  const dragRef = useRef(null);
  const rootRef = useRef(null);
  const order = squadOrder(squad, bench, team.order);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const play = playingIds(squad, bench);
  const benchAll = squad.filter((p) => !play.has(p.id));
  const benchBats = benchAll.filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall);
  const save = (lineup) => onCommit({ ...team, order: { ...order, lineup } });

  /* 벤치 b ↔ 출전 t — 타순 · 자리 · 투수 칸은 그대로 두고 사람만(SquadBoard benchSwap 과 같은 셈) */
  const benchSwap = (b, t) => {
    const swap = (ids) => ids.map((id) => (id === t ? b : id));
    onCommit({ ...team, bench: [...benchAll.map((p) => p.id).filter((id) => id !== b), t],
      order: { ...order, lineup: order.lineup.map((x) => (x.id === t ? { ...x, id: b } : x)), rotation: swap(order.rotation), bullpen: swap(order.bullpen) } });
    setSel(b);
  };
  const swapOrder = (a, b) => {
    const ia = order.lineup.findIndex((x) => x.id === a), ib = order.lineup.findIndex((x) => x.id === b);
    const next = [...order.lineup]; [next[ia], next[ib]] = [next[ib], next[ia]];
    save(next);
  };
  const swapSlots = (rowsIn, a, b) => {
    const sa = rowsIn.find((x) => x.id === a)?.slot, sb = rowsIn.find((x) => x.id === b)?.slot;
    return sa && sb ? rowsIn.map((x) => (x.id === a ? { ...x, slot: sb } : x.id === b ? { ...x, slot: sa } : x)) : rowsIn;
  };
  const pickField = (id) => {
    if (sel && sel !== id) { save(swapSlots(order.lineup, sel, id)); setSel(null); } else setSel(sel === id ? null : id);
  };

  const rows = order.lineup.map((x, i) => ({ ...x, p: byId.get(x.id), n: i + 1 })).filter((x) => x.p);
  /* 구장 미리보기 — 붙은 대상은 내 원래 자리로 비켜 선다 */
  const fieldLineup = drag?.kind === 'field' && drag.target ? swapSlots(order.lineup, drag.id, drag.target) : order.lineup;
  const slotOf = new Map(fieldLineup.map((x) => [x.id, x.slot]));

  /* 놓은 직후 — 한 그림은 전환 없이 그 자리에 두고, 다음 그림에 원래 자리로 미끄러진다(또는 그대로 끝) */
  useEffect(() => {
    if (!settle || settle.go) return undefined;
    let id2;
    const id1 = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setSettle((s) => (s ? { ...s, go: true } : s))); });
    const done = setTimeout(() => setSettle(null), SETTLE_MS + 60);
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); clearTimeout(done); };
  }, [settle]);

  /* ── 끌기: 누른 곳 기록 → 5px 넘게 움직이면 시작. 칸 위치는 시작할 때(바꾸기 줄을 닫은 뒤) 잰다 ── */
  const latest = useRef({});
  latest.current = { order, save, swapSlots, benchSwap, setSel, sel, pickField };
  const measure = (d) => {
    const root = rootRef.current;
    if (!root) return;
    const box = (el) => { const r = el.getBoundingClientRect(); return { id: el.dataset.id, r, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
    d.field = [...root.querySelectorAll('[data-drop="field"]')].map(box);
    d.rows = [...root.querySelectorAll('[data-drop="row"]')].map(box);
    d.pitch = d.rows.length > 1 ? d.rows[1].r.top - d.rows[0].r.top : 52;
    const me = (d.kind === 'row' ? d.rows : d.field).find((c) => c.id === d.id);
    if (me) d.fix = (d.kind === 'row' ? me.r.top - d.top0 : 0); // 바꾸기 줄이 닫혀 내 줄이 올라간 만큼
    d.me = me;
  };
  const start = (e, kind, id) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    dragRef.current = { kind, id, x0: e.clientX, y0: e.clientY, moved: false, wasSel: sel, top0: el.getBoundingClientRect().top,
      from: kind === 'row' ? order.lineup.findIndex((x) => x.id === id) : null };
  };
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved) {
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
        d.moved = true;
        if (latest.current.sel) latest.current.setSel(null); // 바꾸기 줄 닫기 — 닫힌 모습에서 잰다
        d.ready = false;
        requestAnimationFrame(() => requestAnimationFrame(() => { if (dragRef.current === d) { measure(d); d.ready = true; } }));
      }
      const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (!d.ready) { // 재기 전 두 그림(약 30ms) — 칸은 움직이지 않은 채로 재야 해서 들기만 한다(벤치 칩만 포인터를 따라감)
        if (d.kind === 'bench') setDrag({ kind: 'bench', id: d.id, x: e.clientX, y: e.clientY });
        else setDrag({ kind: d.kind, id: d.id, ox: 0, oy: 0, off: 0, from: d.from, to: d.from, pitch: 52 });
        return;
      }
      if (d.kind === 'field') {
        const px = d.me.cx + dx, py = d.me.cy + dy;
        let hit = null, best = MAGNET;
        d.field.forEach((c) => { if (c.id === d.id) return; const g = Math.hypot(px - c.cx, py - c.cy); if (g < best) { best = g; hit = c; } });
        d.target = hit?.id || null;
        setDrag(hit ? { kind: 'field', id: d.id, ox: hit.cx - d.me.cx, oy: hit.cy - d.me.cy, snap: true, target: hit.id }
          : { kind: 'field', id: d.id, ox: dx, oy: dy, snap: false, target: null });
      } else if (d.kind === 'row') {
        const off = dy - (d.fix || 0);
        const to = Math.max(0, Math.min(d.rows.length - 1, d.from + Math.round(off / d.pitch)));
        d.to = to; d.off = off;
        setDrag({ kind: 'row', id: d.id, from: d.from, to, off, pitch: d.pitch });
      } else {
        const pad = 10;
        const hit = [...d.rows, ...d.field].find((c) => e.clientX >= c.r.left - pad && e.clientX <= c.r.right + pad && e.clientY >= c.r.top - pad && e.clientY <= c.r.bottom + pad);
        d.target = hit?.id || null;
        setDrag(hit ? { kind: 'bench', id: d.id, x: hit.cx, y: hit.cy, snap: true, target: hit.id } : { kind: 'bench', id: d.id, x: e.clientX, y: e.clientY, snap: false, target: null });
      }
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      const L = latest.current;
      setDrag(null);
      if (!d.moved) { // 누르기
        if (d.kind === 'field') L.pickField(d.id);
        else if (d.kind === 'row') L.setSel(d.wasSel === d.id ? null : d.id);
        return;
      }
      if (!d.ready) return;
      if (d.kind === 'field') {
        if (d.target) { L.save(L.swapSlots(L.order.lineup, d.id, d.target)); setSettle({ kind: 'field', id: d.id, ox: 0, oy: 0, freeze: [d.id, d.target] }); }
        else setSettle({ kind: 'field', id: d.id, ox: d.lastX ?? 0, oy: d.lastY ?? 0 });
      } else if (d.kind === 'row') {
        const to = d.to ?? d.from;
        if (to !== d.from) L.save(move(L.order.lineup, d.from, to));
        setSettle({ kind: 'row', id: d.id, ox: 0, oy: (d.off ?? 0) - (to - d.from) * d.pitch, freezeAll: true });
      } else if (d.kind === 'bench' && d.target) L.benchSwap(d.id, d.target);
    };
    const track = (e) => { const d = dragRef.current; if (d?.kind === 'field' && d.moved) { d.lastX = e.clientX - d.x0; d.lastY = e.clientY - d.y0; } };
    const onKey = (e) => { if (e.key === 'Escape' && dragRef.current) { dragRef.current = null; setDrag(null); } };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointermove', track);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointermove', track); window.removeEventListener('pointerup', onUp); window.removeEventListener('keydown', onKey); };
  }, []);
  const benchGhost = drag?.kind === 'bench' ? byId.get(drag.id) : null;
  const dropOn = (id) => drag && drag.target === id;
  /* 키보드(누르기만) — 끌기는 포인터로, Enter · Space 는 누르기와 같게 */
  const keyPick = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

  /* 타순 줄 한 칸의 모습 — 들린 줄은 포인터에, 사이 줄은 한 칸씩 미끄러짐. 번호도 놓일 순서로 */
  const rowLook = (i, id) => {
    if (drag?.kind === 'row') {
      const { from, to, off, pitch } = drag;
      if (id === drag.id) return { y: off, lift: true, n: to + 1, tr: 'none' };
      const shift = from < to && i > from && i <= to ? -pitch : from > to && i >= to && i < from ? pitch : 0;
      return { y: shift, n: i + 1 + (shift < 0 ? -1 : shift > 0 ? 1 : 0), tr: `transform ${SHIFT_MS}ms ${EASE}` };
    }
    if (settle?.kind === 'row') {
      if (id === settle.id) return { y: settle.go ? 0 : settle.oy, n: i + 1, tr: settle.go ? `transform ${SETTLE_MS}ms ${EASE}` : 'none', lift: !settle.go };
      return { y: 0, n: i + 1, tr: 'none' };
    }
    return { y: 0, n: i + 1, tr: `transform ${SHIFT_MS}ms ${EASE}` };
  };
  /* 구장 선수 한 명의 모습 */
  const fieldLook = (id) => {
    if (drag?.kind === 'field' && drag.id === id) return { tf: `translate(calc(-50% + ${drag.ox}px), calc(-50% + ${drag.oy}px)) scale(1.06)`, tr: drag.snap ? `transform ${SNAP_MS}ms ${EASE}` : 'none', z: 30, lift: true };
    if (settle?.kind === 'field' && settle.id === id) return { tf: settle.go ? 'translate(-50%,-50%)' : `translate(calc(-50% + ${settle.ox}px), calc(-50% + ${settle.oy}px))`, tr: settle.go ? `transform ${SETTLE_MS}ms ${EASE}` : 'none', z: 30 };
    const frozen = settle?.freeze?.includes(id);
    return { tf: 'translate(-50%,-50%)', tr: frozen ? 'none' : `left 180ms ${EASE}, top 180ms ${EASE}`, z: 1 };
  };

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 select-none flex-col gap-3">
      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.05fr)' }}>
        {/* 구장 — 수비 */}
        <div className="flex min-h-0 flex-col gap-2">
          <Sub>수비 · 오늘 선발</Sub>
          {/* 그림 비율(2336:1744)을 지키며 칸에 꽉 — 칸 크기 단위(cqw · cqh)로 가로 · 세로 중 작은 쪽에 맞춘다 */}
          <div className="relative min-h-0 flex-1" style={{ containerType: 'size' }}>
            <div className="absolute inset-0 m-auto" style={{ width: 'min(100cqw, 133.94cqh)', height: 'min(100cqh, 74.66cqw)' }}>
              <img src="ui/field/field-1.webp" alt="" draggable={false} className="absolute inset-0 h-full w-full rounded-2xl object-cover" style={{ filter: 'brightness(.72) saturate(.9)' }} />
              <i className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse at 50% 60%, transparent 45%, rgba(5,8,15,.75) 100%)' }} />
              {starter && (
                <span className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={at('P')}>
                  <Portrait player={starter} w={36} h={46} color="#60a5fa" />
                  <b className="whitespace-nowrap rounded-md px-1.5 text-t4 text-white" style={{ background: 'rgba(96,165,250,.3)' }}>{starter.name}</b>
                </span>
              )}
              {/* 끄는 중 — 붙을 자리(대상 선수 자리)에 빛 고리 */}
              {drag?.kind === 'field' && drag.target && (
                <i className="pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ ...at(order.lineup.find((y) => y.id === drag.target)?.slot), boxShadow: `0 0 0 2px ${US}, 0 0 28px ${US}88`, background: `${US}14` }} />
              )}
              {rows.map((x) => {
                const dragged = drag?.kind === 'field' && drag.id === x.id;
                const posSlot = dragged ? x.slot : slotOf.get(x.id) || x.slot; // 끄는 선수는 원래 자리 기준으로 옮겨 그린다
                const slot = dragged && drag.target ? order.lineup.find((y) => y.id === drag.target)?.slot || x.slot : posSlot; // 붙으면 그 자리 이름 · 이탈 감점을 미리
                const look = fieldLook(x.id);
                const on = sel === x.id || dropOn(x.id) || look.lift, pen = penaltyAt(x.p, slot), c = pen ? RED : posC(slot);
                return (
                  <div key={x.id} role="button" tabIndex={0} data-drop="field" data-id={x.id} aria-pressed={sel === x.id}
                    onPointerDown={(e) => start(e, 'field', x.id)} onKeyDown={keyPick(() => pickField(x.id))}
                    className={`absolute flex flex-col items-center gap-1 outline-none ${look.lift ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{ width: 132, ...at(posSlot), zIndex: look.z, transform: look.tf, transition: look.tr }}>
                    <span className="relative flex shrink-0" style={{ filter: on ? `drop-shadow(0 0 10px ${US})` : undefined }}>
                      <Portrait player={x.p} w={38} h={48} color={on ? US : c} />
                      <b className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full font-display text-t4" style={{ background: on ? US : '#0b0f1a', color: on ? '#0b0f1a' : GOLD, boxShadow: `inset 0 0 0 1.5px ${on ? US : GOLD}` }}>{x.n}</b>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: on ? 'rgba(6,40,30,.8)' : 'rgba(11,15,26,.72)', boxShadow: `inset 0 0 0 1px ${on ? US : `${c}66`}${look.lift ? ', 0 10px 26px rgba(0,0,0,.55)' : ''}`, backdropFilter: 'blur(6px)' }}>
                      <b className="whitespace-nowrap text-t4 text-white">{x.p.name}</b>
                      <span className="text-[11px]" style={{ color: c }}>{POS_KO[slot]}</span>
                      {slot !== 'DH' && <b className="font-display text-t4" style={{ color: st(x.p, 'defense') >= 85 ? '#fff' : DIM }}>{st(x.p, 'defense')}</b>}
                    </span>
                    <Pen n={pen} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* 타순 — 공격 */}
        <div className="flex min-h-0 flex-col gap-1 overflow-y-auto overflow-x-hidden px-1">
          <Sub right={<span className="flex gap-1.5">{onPitchers && <Btn sm onClick={onPitchers}>투수진 · 벤치</Btn>}<Btn sm onClick={() => onCommit({ ...team, order: autoArrange(squad, bench, team.pitchFatigue) })} disabled={!squad.length}>자동 배치</Btn></span>}>타순</Sub>
          {rows.map((x, i) => {
            const look = rowLook(i, x.id), on = sel === x.id || dropOn(x.id) || look.lift, pen = penaltyAt(x.p, x.slot);
            return (
              <React.Fragment key={x.id}>
                <div role="button" tabIndex={0} data-drop="row" data-id={x.id} aria-pressed={sel === x.id}
                  onPointerDown={(e) => start(e, 'row', x.id)} onKeyDown={keyPick(() => setSel(sel === x.id ? null : x.id))}
                  className={`mt-cut grid shrink-0 items-center gap-3 px-3 py-[7px] outline-none ${look.lift ? 'cursor-grabbing' : 'cursor-grab'}`}
                  style={{ ...cut(8), gridTemplateColumns: '1.6rem 2.2rem minmax(0,1fr) auto 10rem', background: on ? 'rgba(16,185,129,.16)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${on ? US : pen ? `${RED}66` : 'rgba(255,255,255,.06)'}${look.lift ? ', 0 12px 28px rgba(0,0,0,.55)' : ''}`,
                    position: 'relative', zIndex: look.lift ? 20 : undefined, transform: `translateY(${look.y}px)${look.lift ? ' scale(1.02)' : ''}`, transition: look.tr }}>
                  <b className="font-display text-t2" style={{ color: on ? US : GOLD }}>{look.n}</b>
                  <Portrait player={x.p} w={30} h={38} color={posC(x.slot)} />
                  <span className="flex min-w-0 items-center gap-2"><b className="truncate text-t3 text-white">{x.p.name}</b><Hand h={x.p.hand} /><span className="text-t4" style={{ color: posC(x.slot) }}>{POS_KO[x.slot]}</span></span>
                  <Pen n={pen} />
                  <span className="flex justify-end gap-3 text-t4 text-gray-500"><span>컨 <Num v={st(x.p, 'contact')} /></span><span>파 <Num v={st(x.p, 'power')} /></span><span>주 <Num v={st(x.p, 'speed')} /></span></span>
                </div>
                {sel === x.id && !drag && (
                  <div className="mx-3 flex shrink-0 flex-wrap items-center gap-1.5 rounded-b-lg px-3 py-2" style={{ background: 'rgba(16,185,129,.06)', boxShadow: `inset 0 0 0 1px ${US}44` }}>
                    <span className="mr-1 text-t4 text-gray-400">바꾸기</span>
                    {benchBats.map((p) => (
                      <button key={p.id} type="button" onClick={() => benchSwap(p.id, x.id)} className="flex items-center gap-1.5 rounded-md bg-white/[0.05] px-2 py-1 hover:bg-white/[0.1]">
                        <Portrait player={p} w={18} h={22} color={US} /><b className="text-t4 text-white">{p.name}</b><span className="text-[11px] text-gray-500">벤치 · {POS_KO[p.position] || p.position}</span>
                      </button>
                    ))}
                    {rows.filter((y) => y.id !== x.id).map((y) => (
                      <button key={y.id} type="button" onClick={() => swapOrder(x.id, y.id)} className="flex items-center gap-1.5 rounded-md bg-white/[0.05] px-2 py-1 hover:bg-white/[0.1]">
                        <b className="text-t4 text-white">{y.p.name}</b><span className="text-[11px] text-gray-500">{y.n}번</span>
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <Sub>벤치</Sub>
        <div className="flex flex-wrap gap-1.5">
          {benchBats.map((p) => (
            <span key={p.id} onPointerDown={(e) => start(e, 'bench', p.id)} className="mt-cut flex cursor-grab items-center gap-2 px-2.5 py-1.5"
              style={{ ...cut(8), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)', opacity: benchGhost?.id === p.id ? 0.35 : 1 }}>
              <Portrait player={p} w={24} h={30} color={POS_COLOR[p.position] || US} />
              <span className="flex flex-col"><b className="text-t4 text-white">{p.name}</b><span className="text-[11px] text-gray-400">{POS_KO[p.position] || p.position} · {p.overall}</span></span>
            </span>
          ))}
          {!benchBats.length && <span className="text-t4 text-gray-500">없음</span>}
        </div>
        <span className="flex-1" />
        {footer}
      </div>
      {/* 벤치에서 끄는 칩 — 포인터를 따라가다 놓을 칸 위에선 그 가운데로 붙는다 */}
      {benchGhost && (
        <span className="pointer-events-none fixed z-50 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
          style={{ left: 0, top: 0, transform: `translate(${drag.x}px, ${drag.y}px) translate(-50%, -50%) scale(1.04)`, transition: drag.snap ? `transform ${SNAP_MS}ms ${EASE}` : 'none', background: 'rgba(6,40,30,.92)', boxShadow: `inset 0 0 0 1.5px ${US}, 0 12px 30px rgba(0,0,0,.55)` }}>
          <Portrait player={benchGhost} w={24} h={30} color={US} /><b className="text-t4 text-white">{benchGhost.name}</b>
        </span>
      )}
    </div>
  );
}
