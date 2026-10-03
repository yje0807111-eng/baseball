/*
 * 정비 1단계(라인업) 가운데 — 구장 + 타순(목업 prep-lineup2 9안 · 구장 그림 1번, 2026-10-03)
 *  구장 = 수비(자리 · 수비 능력 · 이탈 감점 · 마운드에 오늘 선발), 타순 = 공격(컨택 · 파워 · 주력) — 같은 숫자를 두 군데 적지 않는다.
 *  고르기: 타순 줄이나 구장 선수를 누르면 양쪽에서 함께 빛나고, 그 줄 아래 '바꾸기' 줄이 열린다
 *    벤치 선수 → 사람만 바꿈(타순 · 자리 그대로, SquadBoard benchSwap 과 같은 규칙) / 다른 타자 → 타순 맞바꿈
 *    고른 채로 구장의 다른 선수를 누르면 → 수비 자리 맞바꿈
 *  lineup-sim: 승률을 바꾸는 건 '자기 자리'(이탈 한 명 −2.3%p)와 타순 — 추천은 적지 않는다(자동 배치 단추만)
 * 구장 그림(public/ui/field/field-1.webp, 힉스필드 GPT Image 2)은 베이스 자리가 정해져 있어 그 좌표(그림 %)로 수비 자리를 셈한다.
 */
import React, { useState } from 'react';
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
const Hand = ({ h }) => <b className="text-t4" style={{ color: h === 'L' ? GOLD : h === 'S' ? '#c4b5fd' : '#7dd3fc' }}>{h === 'L' ? '좌' : h === 'S' ? '양' : '우'}</b>;
const Num = ({ v }) => <b className="font-display text-t3" style={{ color: v >= 90 ? GOLD : v >= 80 ? '#e5e7eb' : DIM }}>{v}</b>;
const Pen = ({ n }) => (n ? <b className="whitespace-nowrap rounded-full px-2 text-t4" style={{ color: '#0b0f1a', background: RED }}>이탈 −{n}</b> : null);
const Sub = ({ children, right }) => <div className="flex shrink-0 items-center justify-between"><span className="text-t3 font-bold text-gray-300">{children}</span>{right}</div>;

export default function LineupField({ team, squad, bench, onCommit, starter = null, onPitchers = null, footer = null }) {
  const [sel, setSel] = useState(null);
  const order = squadOrder(squad, bench, team.order);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const play = playingIds(squad, bench);
  const benchAll = squad.filter((p) => !play.has(p.id));
  const benchBats = benchAll.filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall);
  const rows = order.lineup.map((x, i) => ({ ...x, p: byId.get(x.id), n: i + 1 })).filter((x) => x.p);
  const save = (lineup, extra = {}) => onCommit({ ...team, ...extra, order: { ...order, lineup, ...(extra.order || {}) } });

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
  const swapSlot = (a, b) => {
    const sa = order.lineup.find((x) => x.id === a)?.slot, sb = order.lineup.find((x) => x.id === b)?.slot;
    save(order.lineup.map((x) => (x.id === a ? { ...x, slot: sb } : x.id === b ? { ...x, slot: sa } : x)));
    setSel(null);
  };
  const pickField = (id) => (sel && sel !== id ? swapSlot(sel, id) : setSel(sel === id ? null : id));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.05fr)' }}>
        {/* 구장 — 수비 */}
        <div className="flex min-h-0 flex-col gap-2">
          <Sub>수비 · 오늘 선발</Sub>
          {/* 그림 비율(2336:1744)을 지키며 칸에 꽉 — 칸 크기 단위(cqw · cqh)로 가로 · 세로 중 작은 쪽에 맞춘다 */}
          <div className="relative min-h-0 flex-1" style={{ containerType: 'size' }}>
          <div className="absolute inset-0 m-auto" style={{ width: 'min(100cqw, 133.94cqh)', height: 'min(100cqh, 74.66cqw)' }}>
            <img src="ui/field/field-1.webp" alt="" draggable={false} className="absolute inset-0 h-full w-full select-none rounded-2xl object-cover" style={{ filter: 'brightness(.72) saturate(.9)' }} />
            <i className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse at 50% 60%, transparent 45%, rgba(5,8,15,.75) 100%)' }} />
            {starter && (
              <span className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={at('P')}>
                <Portrait player={starter} w={36} h={46} color="#60a5fa" />
                <b className="whitespace-nowrap rounded-md px-1.5 text-t4 text-white" style={{ background: 'rgba(96,165,250,.3)' }}>{starter.name}</b>
              </span>
            )}
            {rows.map((x) => {
              const on = sel === x.id, pen = penaltyAt(x.p, x.slot), c = pen ? RED : posC(x.slot);
              return (
                <button key={x.id} type="button" onClick={() => pickField(x.id)} aria-pressed={on}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ width: 132, ...at(x.slot) }}>
                  <span className="relative flex shrink-0" style={{ filter: on ? `drop-shadow(0 0 10px ${US})` : undefined }}>
                    <Portrait player={x.p} w={38} h={48} color={on ? US : c} />
                    <b className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full font-display text-t4" style={{ background: on ? US : '#0b0f1a', color: on ? '#0b0f1a' : GOLD, boxShadow: `inset 0 0 0 1.5px ${on ? US : GOLD}` }}>{x.n}</b>
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: on ? 'rgba(6,40,30,.8)' : 'rgba(11,15,26,.72)', boxShadow: `inset 0 0 0 1px ${on ? US : `${c}66`}`, backdropFilter: 'blur(6px)' }}>
                    <b className="whitespace-nowrap text-t4 text-white">{x.p.name}</b>
                    <span className="text-[11px]" style={{ color: c }}>{POS_KO[x.slot]}</span>
                    {x.slot !== 'DH' && <b className="font-display text-t4" style={{ color: st(x.p, 'defense') >= 85 ? '#fff' : DIM }}>{st(x.p, 'defense')}</b>}
                  </span>
                  <Pen n={pen} />
                </button>
              );
            })}
          </div>
          </div>
        </div>
        {/* 타순 — 공격 */}
        <div className="flex min-h-0 flex-col gap-1 overflow-y-auto pr-1">
          <Sub right={<span className="flex gap-1.5">{onPitchers && <Btn sm onClick={onPitchers}>투수진 · 벤치</Btn>}<Btn sm onClick={() => onCommit({ ...team, order: autoArrange(squad, bench, team.pitchFatigue) })} disabled={!squad.length}>자동 배치</Btn></span>}>타순</Sub>
          {rows.map((x) => {
            const on = sel === x.id, pen = penaltyAt(x.p, x.slot);
            return (
              <React.Fragment key={x.id}>
                <button type="button" onClick={() => setSel(on ? null : x.id)} aria-pressed={on}
                  className="mt-cut grid shrink-0 items-center gap-3 px-3 py-[7px] text-left" style={{ ...cut(8), gridTemplateColumns: '1.6rem 2.2rem minmax(0,1fr) auto 10rem', background: on ? 'rgba(16,185,129,.14)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${on ? US : pen ? `${RED}66` : 'rgba(255,255,255,.06)'}` }}>
                  <b className="font-display text-t2" style={{ color: on ? US : GOLD }}>{x.n}</b>
                  <Portrait player={x.p} w={30} h={38} color={posC(x.slot)} />
                  <span className="flex min-w-0 items-center gap-2"><b className="truncate text-t3 text-white">{x.p.name}</b><Hand h={x.p.hand} /><span className="text-t4" style={{ color: posC(x.slot) }}>{POS_KO[x.slot]}</span></span>
                  <Pen n={pen} />
                  <span className="flex justify-end gap-3 text-t4 text-gray-500"><span>컨 <Num v={st(x.p, 'contact')} /></span><span>파 <Num v={st(x.p, 'power')} /></span><span>주 <Num v={st(x.p, 'speed')} /></span></span>
                </button>
                {on && (
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
            <span key={p.id} className="mt-cut flex items-center gap-2 px-2.5 py-1.5" style={{ ...cut(8), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
              <Portrait player={p} w={24} h={30} color={POS_COLOR[p.position] || US} />
              <span className="flex flex-col"><b className="text-t4 text-white">{p.name}</b><span className="text-[11px] text-gray-400">{POS_KO[p.position] || p.position} · {p.overall}</span></span>
            </span>
          ))}
          {!benchBats.length && <span className="text-t4 text-gray-500">없음</span>}
        </div>
        <span className="flex-1" />
        {footer}
      </div>
    </div>
  );
}
