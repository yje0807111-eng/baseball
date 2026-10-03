/*
 * 정비 1단계(라인업) 가운데 — 구장 + 타순(목업 prep-lineup3 1안 '기본 정돈' · 구장 그림 1번, 2026-10-03)
 *  정돈 다섯: ① 두 칸 제목 줄 높이 · 아래 끝 맞춤, 타순 9줄은 구장 높이에 고르게 ② 색은 두 뜻만 — 초록 = 고른 선수, 빨강 = 이탈 감점(평소 흰 · 회색)
 *   ③ 타순은 열 제목 있는 표(선수 · 자리 · 컨 · 파 · 주) ④ 구장 이름표 한 덩어리(번호 안, 너비 120 고정, 지명은 홈 옆 정해진 칸)
 *   ⑤ 바닥 한 줄 — 벤치는 표 아래 띠, 시너지는 미리보기 띠로(ReadyLocker). 타순 줄은 아주 옅은 선으로 나눔
 *  구장 = 수비(자리 · 이탈 감점 · 마운드에 오늘 선발), 타순 = 공격(컨택 · 파워 · 주력) — 같은 숫자를 두 군데 적지 않는다.
 *  끌기: 구장 선수 → 다른 선수 위(수비 자리 맞바꿈) · 타순 줄 위아래(끼워 넣기) · 벤치 칩 → 줄이나 구장 선수(사람만 바꿈, SquadBoard benchSwap 과 같은 셈)
 *  누르기: 타순 줄 · 구장 선수를 누르면 양쪽이 함께 초록, 그 줄 아래 '벤치와 바꾸기' 칸이 열림(사람만 바꿈)
 *  lineup-sim: 승률을 바꾸는 건 '자기 자리'(이탈 한 명 −2.3%p)와 타순 — 추천은 적지 않는다(자동 배치 단추만)
 * 구장 그림(public/ui/field/field-1.webp, 힉스필드 GPT Image 2)은 베이스 자리가 정해져 있어 그 좌표(그림 %)로 수비 자리를 셈한다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Btn, Portrait } from './ui.jsx';
import { playingIds } from './match.js';
import { squadOrder, autoArrange, penaltyAt } from './SquadBoard.jsx';

const cut = (c) => ({ '--c': `${c}px` });
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const US = '#10b981', RED = '#f87171';
const W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280'; // 평소 글자 — 진함 · 보통 · 흐림
const POS_KO = { C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', LF: '좌익수', CF: '중견수', RF: '우익수', DH: '지명', OF: '외야수', SP: '선발', RP: '불펜' };
/* 그림 1번의 베이스(그림 %) → 수비 자리. 2루수 · 유격수는 잔디 쪽으로 올려 1 · 3루 이름표와 겹치지 않게, 지명은 홈 오른쪽 칸 */
const B = { h: [50, 89], b1: [67.3, 65.8], b2: [50, 47.2], b3: [32.8, 65.8] };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const up = (p, d) => [p[0], p[1] - d];
const SPOT = {
  C: [50, 91], '1B': [B.b1[0] + 3, B.b1[1] - 1], '3B': [B.b3[0] - 3, B.b3[1] - 1],
  '2B': up(lerp(B.b2, B.b1, 0.55), 15), SS: up(lerp(B.b2, B.b3, 0.55), 15),
  LF: [B.b3[0] - 9, B.b2[1] - 24], CF: [50, B.b2[1] - 33], RF: [B.b1[0] + 9, B.b2[1] - 24],
  DH: [80, 91], P: [50, (B.h[1] + B.b2[1]) / 2 - 2],
};
const at = (k) => ({ left: `${SPOT[k][0]}%`, top: `${SPOT[k][1]}%` });
const move = (arr, from, to) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };
const hand = (h) => (h === 'L' ? '좌' : h === 'S' ? '양' : '우');
const TABLE = '2rem 2.2rem minmax(0,1fr) 4.6rem repeat(3,2.8rem)'; // 번호 · 얼굴 · 선수 · 자리 · 컨 · 파 · 주

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

export default function LineupField({ team, squad, bench, onCommit, starter = null }) {
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

  const chip = (p, extra) => (
    <span className="flex items-center gap-1.5 rounded-md px-2 py-1" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      <Portrait player={p} w={20} h={26} color="#334155" /><b className="text-t4" style={{ color: W1 }}>{p.name}</b><span className="text-[11px]" style={{ color: W3 }}>{extra}</span>
    </span>
  );

  return (
    <div ref={rootRef} className="grid min-h-0 flex-1 select-none gap-x-6" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gridTemplateRows: '36px minmax(0,1fr)' }}>
      {/* ① 제목 줄 — 두 칸 같은 높이 */}
      <div className="flex items-center justify-between"><b className="text-t3" style={{ color: W1 }}>수비</b><span className="text-t4" style={{ color: W3 }}>끌어서 자리 바꾸기</span></div>
      <div className="flex items-center justify-between"><b className="text-t3" style={{ color: W1 }}>타순</b>
        <span className="flex gap-1.5"><Btn sm onClick={() => onCommit({ ...team, order: autoArrange(squad, bench, team.pitchFatigue) })} disabled={!squad.length}>자동 배치</Btn></span>
      </div>

      {/* 구장 — 수비. 그림 비율(2336:1744)을 지키며 칸에 꽉(cqw · cqh) */}
      <div className="relative min-h-0" style={{ containerType: 'size' }}>
        <div className="absolute inset-0 m-auto" style={{ width: 'min(100cqw, 133.94cqh)', height: 'min(100cqh, 74.66cqw)' }}>
          <img src="ui/field/field-1.webp" alt="" draggable={false} className="absolute inset-0 h-full w-full rounded-2xl object-cover" style={{ filter: 'brightness(.66) saturate(.85)' }} />
          <i className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse at 50% 60%, transparent 45%, rgba(5,8,15,.8) 100%)' }} />
          {/* 지명 칸 — 홈 오른쪽 정해진 자리 */}
          <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-lg" style={{ ...at('DH'), width: 132, height: 84, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)', background: 'rgba(5,8,15,.35)' }} />
          {starter && (
            <span className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={at('P')}>
              <Portrait player={starter} w={30} h={38} color="#334155" />
              <span className="whitespace-nowrap rounded-md px-1.5 text-[11px] font-bold" style={{ color: W1, background: 'rgba(5,8,15,.7)' }}>선발 {starter.name}</span>
            </span>
          )}
          {rows.map((x) => {
            const dragged = drag?.kind === 'field' && drag.id === x.id;
            const posSlot = dragged ? x.slot : slotOf.get(x.id) || x.slot; // 끄는 선수는 원래 자리 기준으로 옮겨 그린다
            const slot = dragged && drag.target ? order.lineup.find((y) => y.id === drag.target)?.slot || x.slot : posSlot; // 붙으면 그 자리 이름 · 이탈 감점을 미리
            const look = fieldLook(x.id);
            const on = sel === x.id || dropOn(x.id) || look.lift, p = penaltyAt(x.p, slot);
            const ring = on ? US : p ? RED : 'rgba(255,255,255,.14)';
            return (
              <div key={x.id} role="button" tabIndex={0} data-drop="field" data-id={x.id} aria-pressed={sel === x.id}
                onPointerDown={(e) => start(e, 'field', x.id)} onKeyDown={keyPick(() => pickField(x.id))}
                className={`absolute flex flex-col items-center gap-1 outline-none ${look.lift ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ ...at(posSlot), zIndex: look.z, transform: look.tf, transition: look.tr }}>
                <Portrait player={x.p} w={46} h={58} color={on ? US : p ? RED : '#334155'} />
                {/* ④ 이름표 한 덩어리 — 번호 · 이름 · 자리(이탈이면 −N) */}
                <span className="flex items-center gap-1.5 rounded-md px-1.5 py-[3px]" style={{ width: 120, background: on ? 'rgba(6,40,30,.88)' : 'rgba(8,11,20,.84)', boxShadow: `inset 0 0 0 1px ${ring}${look.lift ? ', 0 10px 26px rgba(0,0,0,.55)' : ''}` }}>
                  <b className="grid h-5 w-5 shrink-0 place-items-center rounded font-display text-[12px]" style={{ background: on ? US : 'rgba(255,255,255,.1)', color: on ? '#0b0f1a' : W1 }}>{x.n}</b>
                  <b className="min-w-0 flex-1 truncate text-t4" style={{ color: W1 }}>{x.p.name}</b>
                  <span className="shrink-0 text-[11px]" style={{ color: p ? RED : W3 }}>{p ? `−${p}` : POS_KO[slot]}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 타순 — 공격. ③ 열 제목 있는 표, 9줄은 칸 높이에 고르게 */}
      <div className="flex min-h-0 flex-col">
        <div className="grid h-7 shrink-0 items-center gap-3 border-b border-white/[0.08] px-3 text-t4" style={{ gridTemplateColumns: TABLE, color: W3 }}>
          <span /><span /><span>선수</span><span>자리</span><span className="text-right">컨</span><span className="text-right">파</span><span className="text-right">주</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden py-1">
          {rows.map((x, i) => {
            const look = rowLook(i, x.id), on = sel === x.id || dropOn(x.id) || look.lift, p = penaltyAt(x.p, x.slot);
            const open = sel === x.id && !drag && !settle;
            return (
              <React.Fragment key={x.id}>
              <div role="button" tabIndex={0} data-drop="row" data-id={x.id} aria-pressed={sel === x.id}
                onPointerDown={(e) => start(e, 'row', x.id)} onKeyDown={keyPick(() => setSel(sel === x.id ? null : x.id))}
                className={`grid min-h-0 flex-1 items-center gap-3 px-3 outline-none ${open ? 'rounded-t-lg' : 'rounded-lg'} ${look.lift ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ gridTemplateColumns: TABLE, background: on ? 'rgba(16,185,129,.12)' : look.lift ? 'rgba(20,26,40,.95)' : 'transparent',
                  /* 줄 나눔 — 아래쪽 아주 옅은 선(고른 줄 · 들린 줄 · 마지막 줄은 없음) */
                  boxShadow: on ? `inset 0 0 0 1px ${US}${look.lift ? ', 0 12px 28px rgba(0,0,0,.55)' : ''}` : [p ? `inset 2px 0 0 ${RED}` : '', i < rows.length - 1 ? 'inset 0 -1px 0 rgba(255,255,255,.05)' : ''].filter(Boolean).join(', ') || 'none',
                  position: 'relative', zIndex: look.lift ? 20 : undefined, transform: `translateY(${look.y}px)${look.lift ? ' scale(1.015)' : ''}`, transition: look.tr }}>
                <b className="font-display text-t2" style={{ color: on ? US : W1 }}>{look.n}</b>
                <Portrait player={x.p} w={28} h={34} color="#334155" />
                <span className="flex min-w-0 items-center gap-2"><b className="truncate text-t3" style={{ color: W1 }}>{x.p.name}</b><span className="text-t4" style={{ color: W3 }}>{hand(x.p.hand)}</span></span>
                <span className="text-t4" style={{ color: p ? RED : W2 }}>{POS_KO[x.slot]}{p ? ` −${p}` : ''}</span>
                {['contact', 'power', 'speed'].map((k) => <b key={k} className="text-right font-display text-t3" style={{ color: st(x.p, k) >= 90 ? W1 : W2 }}>{st(x.p, k)}</b>)}
              </div>
              {/* 누른 줄 아래 — 벤치 선수와 바꾸기(사람만, 타순 · 자리 그대로) */}
              {open && (
                <div className="mb-1 flex shrink-0 flex-wrap items-center gap-1.5 rounded-b-lg px-3 py-2" style={{ background: 'rgba(16,185,129,.06)', boxShadow: `inset 0 0 0 1px ${US}44` }}>
                  <span className="mr-1 text-t4" style={{ color: W2 }}>벤치와 바꾸기</span>
                  {benchBats.map((b) => <button key={b.id} type="button" onClick={() => benchSwap(b.id, x.id)} className="hover:brightness-125">{chip(b, POS_KO[b.position] || b.position)}</button>)}
                  {!benchBats.length && <span className="text-t4" style={{ color: W3 }}>벤치 없음</span>}
                </div>
              )}
              </React.Fragment>
            );
          })}
        </div>
        {/* ⑤ 아래 띠 — 벤치(끌어서 줄이나 구장 선수 위에 놓으면 바꿈) */}
        <div className="flex h-14 shrink-0 items-center gap-2 overflow-hidden border-t border-white/[0.08] px-3">
          {(
            <>
              <span className="mr-1 shrink-0 text-t4" style={{ color: W3 }}>벤치</span>
              {benchBats.map((p) => (
                <span key={p.id} onPointerDown={(e) => start(e, 'bench', p.id)} className="shrink-0 cursor-grab" style={{ opacity: benchGhost?.id === p.id ? 0.35 : 1 }}>{chip(p, POS_KO[p.position] || p.position)}</span>
              ))}
              {!benchBats.length && <span className="text-t4" style={{ color: W3 }}>없음</span>}
            </>
          )}
        </div>
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
