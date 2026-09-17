/*
 * 내 라커 · 내 선수 — 사진 구장 위 수비 9명으로 한눈에 보고, 옆 두 열에서 타순 · 선발 로테이션 · 불펜 순서를 끌어서 정한다.
 * 벤치는 맨 아래 트레이. 투수 컨디션은 team.pitchFatigue(src/myteam/fatigue.js 와 같은 표)로 보여 준다.
 *
 * 저장: team.order = { lineup: [{ id, slot }] (타순 순서, slot = C·1B·2B·3B·SS·LF·CF·RF·DH), rotation: [id ×5], bullpen: [id ×8] (0 마무리 · 1~2 셋업 · 나머지 중계) }
 *  없거나 엔트리가 바뀌어 맞지 않으면 squadOrder 가 채워 넣는다.
 */
import React, { useState } from 'react';
import { playingIds } from './match.js';
import { posColor, statColor } from './teamColor.js';
import { Btn } from './ui.jsx';

const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const ROLE = { SP: '#60a5fa', CL: '#fbbf24', SU: '#fb923c', MR: '#f87171' };
const FIELD = [['C', 'C'], ['1B', '1B'], ['2B', '2B'], ['3B', '3B'], ['SS', 'SS'], ['LF', 'OF'], ['CF', 'OF'], ['RF', 'OF'], ['DH', 'DH']];
/* 구장 사진(ui/field.webp) 위 자리 (%) — 폭 480px 판 기준으로 외야 · 코너를 안쪽에 */
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

const face = (p, w, h) => (
  <span className="mt-cut block shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': `${Math.max(4, Math.round(w / 8))}px`, width: w, height: h, backgroundPosition: 'center 12%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
);
const Chip = ({ children, c }) => <span className="shrink-0 px-[5px] font-display text-[12px] font-extrabold leading-[17px] text-[#05080f]" style={{ background: c }}>{children}</span>;
const Ovr = ({ p, size = 17 }) => <b className="font-display font-extrabold leading-none" style={{ fontSize: size, color: tone(p.overall), textShadow: `0 0 12px ${tone(p.overall)}66` }}>{p.overall}</b>;
const Grp = ({ en, ko, color, right }) => (
  <div className="mt-grp !my-0 !mb-[5px]" style={{ color }}>
    {en} <b className="text-[14px] tracking-[0.04em] text-white">{ko}</b>
    {right && <span className="order-last ml-1 font-display text-[11px] tracking-[0.1em] text-gray-500">{right}</span>}
  </div>
);
const Handle = () => <span className="cursor-grab select-none text-[14px] tracking-[-2px] text-slate-600" aria-hidden="true">⋮⋮</span>;

export default function SquadBoard({ team, squad, bench, cost, sizeLabel, sel, onSelect, onCommit, onToggleBench, onAutoFill, autoDisabled }) {
  const order = squadOrder(squad, bench, team.order);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const fatigue = team.pitchFatigue || {};
  const restOf = (p) => fatigue[p.id]?.rest || 0;
  const lineup = order.lineup.map((x, i) => ({ ...x, p: byId.get(x.id), n: i + 1 })).filter((x) => x.p);
  const rotation = order.rotation.map((id) => byId.get(id)).filter(Boolean);
  const bullpen = order.bullpen.map((id) => byId.get(id)).filter(Boolean);
  const nextStarter = rotation.find((p) => restOf(p) <= 0) || [...rotation].sort((a, b) => restOf(a) - restOf(b))[0];
  const play = playingIds(squad, bench);
  const benchList = squad.filter((p) => !play.has(p.id)).sort(byOvr);

  const [drag, setDrag] = useState(null); // { list, id }
  const save = (next) => onCommit({ ...team, order: { ...order, ...next } });
  const move = (arr, from, to) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };
  const dropOn = (list, id) => {
    if (!drag || drag.id === id) return setDrag(null);
    if (list === 'field' && (drag.list === 'field' || drag.list === 'lineup')) {
      // 구장에서 끼리 놓으면 수비 자리를 맞바꾼다
      const a = order.lineup.find((x) => x.id === drag.id);
      const b = order.lineup.find((x) => x.id === id);
      if (a && b) save({ lineup: order.lineup.map((x) => (x.id === a.id ? { ...x, slot: b.slot } : x.id === b.id ? { ...x, slot: a.slot } : x)) });
    } else if (list === drag.list) {
      const key = list === 'lineup' ? 'lineup' : list;
      const ids = key === 'lineup' ? order.lineup.map((x) => x.id) : order[key];
      const from = ids.indexOf(drag.id);
      const to = ids.indexOf(id);
      if (from >= 0 && to >= 0) save({ [key]: move(order[key], from, to) });
    }
    setDrag(null);
  };
  const dnd = (list, id) => ({
    draggable: true,
    onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; setDrag({ list, id }); },
    onDragOver: (e) => { if (drag && (drag.list === list || (list === 'field' && drag.list === 'lineup'))) e.preventDefault(); },
    onDrop: (e) => { e.preventDefault(); dropOn(list, id); },
    onDragEnd: () => setDrag(null),
  });
  const rowBg = (p, hot) => (hot
    ? { background: `linear-gradient(90deg,color-mix(in srgb,${hot} 20%,transparent),rgba(6,10,19,.5))`, boxShadow: `inset 3px 0 0 ${hot}` }
    : { background: 'rgba(255,255,255,.035)' });

  const batRow = (x) => {
    const on = sel?.id === x.p.id;
    const v = x.p.stats?.power ?? 0;
    return (
      <div key={x.id} role="button" tabIndex={0} {...dnd('lineup', x.id)} onClick={() => onSelect(x.p)}
        className={`mt-cut grid min-h-0 flex-[1_1_0] cursor-pointer items-center gap-[7px] px-[9px] ${drag?.id === x.id ? 'opacity-40' : ''}`}
        style={{ '--c': '7px', maxHeight: 64, gridTemplateColumns: '12px 20px 34px 28px 24px minmax(0,1fr) 46px', ...rowBg(x.p, on && tone(x.p.overall)) }}>
        <Handle />
        <b className="text-center font-display text-[17px] text-gray-500">{x.n}</b>
        <Chip c={posColor(x.p)}>{x.slot}</Chip>
        {face(x.p, 28, 'calc(100% - 8px)')}
        <Ovr p={x.p} />
        <b className="truncate text-[14px] font-extrabold text-white">{x.p.name}</b>
        <span className="block">
          <span className="flex justify-end"><b className="font-display text-[14px]" style={{ color: statColor(v, posColor(x.p)).num }}>{v}</b></span>
          <span className="relative mt-[3px] block h-[5px] bg-white/[0.08]"><i className="absolute inset-y-0 left-0" style={{ width: `${v}%`, background: statColor(v, posColor(x.p)).bar }} /></span>
        </span>
      </div>
    );
  };
  const pitRow = (p, label, color, list) => {
    const on = sel?.id === p.id;
    const next = p.id === nextStarter?.id && list === 'rotation';
    const rest = restOf(p);
    const c = conditionOf(rest);
    return (
      <div key={p.id} role="button" tabIndex={0} {...dnd(list, p.id)} onClick={() => onSelect(p)}
        className={`mt-cut grid min-h-0 flex-[1_1_0] cursor-pointer items-center gap-[7px] px-[9px] ${drag?.id === p.id ? 'opacity-40' : ''}`}
        style={{ '--c': '7px', maxHeight: 56, gridTemplateColumns: '12px 46px 28px 22px minmax(0,1fr) 64px',
          ...(next ? { background: 'linear-gradient(90deg,rgba(96,165,250,.22),rgba(6,10,19,.5))', boxShadow: 'inset 3px 0 0 #60a5fa, inset 0 0 0 1px rgba(96,165,250,.35)' } : rowBg(p, on && tone(p.overall))) }}>
        <Handle />
        <Chip c={color}>{label}</Chip>
        {face(p, 28, 'calc(100% - 8px)')}
        <Ovr p={p} size={16} />
        <span className="flex min-w-0 items-center gap-1.5">
          <b className="truncate text-[13.5px] font-extrabold text-white">{p.name}</b>
          {next && <b className="shrink-0 bg-[#60a5fa] px-[5px] font-display text-[11px] tracking-[0.08em] text-[#05080f]">NEXT</b>}
        </span>
        <span className="grid items-center gap-[5px]" style={{ gridTemplateColumns: '1fr auto' }} title={`컨디션 ${c}%`}>
          <span className="relative block h-[5px] bg-white/[0.08]"><i className="absolute inset-y-0 left-0" style={{ width: `${c}%`, background: condColor(c) }} /></span>
          <b className="w-[22px] text-right font-display text-[13px]" style={{ color: condColor(c) }}>{rest ? `-${rest}` : '✓'}</b>
        </span>
      </div>
    );
  };
  const token = (x) => {
    const on = sel?.id === x.p.id;
    return (
      <div key={x.id} role="button" tabIndex={0} {...dnd('field', x.id)} onClick={() => onSelect(x.p)}
        className={`mt-cut absolute grid w-[132px] cursor-grab items-center gap-[7px] py-[3px] pl-[3px] pr-[7px] ${drag?.id === x.id ? 'opacity-40' : ''}`}
        style={{ '--c': '7px', left: `${XY[x.slot][0]}%`, top: `${XY[x.slot][1]}%`, transform: 'translate(-50%,-50%)', gridTemplateColumns: '38px minmax(0,1fr)', background: 'rgba(6,10,19,.84)',
          boxShadow: `inset 0 -2px 0 ${posColor(x.p)},${on ? ` 0 0 0 2px ${tone(x.p.overall)},` : ''} inset 0 0 0 1px rgba(255,255,255,.12)` }}>
        {face(x.p, 38, 44)}
        <span className="min-w-0">
          <span className="flex items-center gap-1"><Chip c={posColor(x.p)}>{x.slot}</Chip><b className="font-display text-[11px] text-gray-400">{x.n}</b><span className="ml-auto"><Ovr p={x.p} /></span></span>
          <b className="block truncate text-[13px] font-extrabold text-white">{x.p.name}</b>
        </span>
      </div>
    );
  };

  return (
    <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ '--c': '20px' }}>
      <div className="flex items-baseline gap-3">
        <p className="mt-lab">My Squad</p>
        <p className="text-sm text-gray-400">{sizeLabel} · 출전 {play.size} · 벤치 {benchList.length} · {cost.toLocaleString()} CP</p>
        <div className="ml-auto"><Btn sm onClick={onAutoFill} disabled={autoDisabled}>자동 채우기</Btn></div>
      </div>

      {squad.length === 0 ? <p className="mt-4 text-sm text-gray-500">아직 영입한 선수가 없습니다. 왼쪽 영입에서 찾아 보세요.</p> : (
        <>
          <div className="mt-3 grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: '480px minmax(0,1fr)' }}>
            {/* 한눈에: 구장 위 수비 9명 + 마운드의 다음 선발 */}
            <div className="mt-cut relative min-h-0 bg-[#07130c] bg-cover" style={{ '--c': '14px', backgroundImage: 'url(ui/field.webp)', backgroundPosition: 'center 60%' }}>
              <span className="absolute inset-0" style={{ background: 'radial-gradient(70% 70% at 50% 60%,rgba(5,8,15,.05),rgba(5,8,15,.62))' }} />
              {lineup.map(token)}
              {nextStarter && (
                <div role="button" tabIndex={0} onClick={() => onSelect(nextStarter)} className="mt-cut absolute flex cursor-pointer items-center gap-1.5 py-[3px] pl-[3px] pr-2"
                  style={{ '--c': '7px', left: `${XY.P[0]}%`, top: `${XY.P[1]}%`, transform: 'translate(-50%,-50%)', background: 'rgba(6,10,19,.88)', boxShadow: `inset 0 -2px 0 ${ROLE.SP}` }}>
                  {face(nextStarter, 34, 40)}
                  <span className="flex flex-col gap-px"><b className="font-display text-[10px] tracking-[0.2em] text-[#60a5fa]">NEXT</b><b className="whitespace-nowrap text-[13px] font-extrabold text-white">{nextStarter.name}</b></span>
                  <Ovr p={nextStarter} />
                </div>
              )}
            </div>

            {/* 정하기: 타순 | 로테이션 · 불펜 */}
            <div className="grid min-h-0 grid-cols-2 gap-3">
              <div className="flex min-h-0 flex-col">
                <Grp en="LINEUP" ko={`타순 ${lineup.length}`} color="#34d399" right="파워" />
                <div className="flex min-h-0 flex-1 flex-col gap-1">{lineup.map(batRow)}</div>
              </div>
              <div className="flex min-h-0 flex-col">
                <Grp en="ROTATION" ko={`선발 ${rotation.length}`} color={ROLE.SP} right="컨디션" />
                <div className="flex min-h-0 flex-col gap-1" style={{ flex: Math.max(1, rotation.length) }}>{rotation.map((p, i) => pitRow(p, `${i + 1}선발`, ROLE.SP, 'rotation'))}</div>
                <div className="h-2 shrink-0" />
                <Grp en="BULLPEN" ko={`불펜 ${bullpen.length}`} color={ROLE.MR} />
                <div className="flex min-h-0 flex-col gap-1" style={{ flex: Math.max(1, bullpen.length) }}>
                  {bullpen.map((p, i) => (i === 0 ? pitRow(p, '마무리', ROLE.CL, 'bullpen') : i <= 2 ? pitRow(p, '셋업', ROLE.SU, 'bullpen') : pitRow(p, `중계${i - 2}`, ROLE.MR, 'bullpen')))}
                </div>
              </div>
            </div>
          </div>

          {/* 벤치: 맨 아래 */}
          <div className="mt-cut mt-3.5 flex shrink-0 items-center gap-3.5 px-3.5 py-3" style={{ '--c': '12px', background: 'linear-gradient(180deg,rgba(148,163,184,.08),rgba(148,163,184,.03))', boxShadow: 'inset 0 1px 0 rgba(148,163,184,.25)' }}>
            <div className="mt-grp !my-0 shrink-0 text-slate-400">BENCH <b className="text-[14px] text-white">{benchList.length}</b></div>
            {benchList.length === 0 && <span className="text-sm text-gray-500">-</span>}
            {benchList.map((p) => (
              <div key={p.id} role="button" tabIndex={0} onClick={() => onSelect(p)} className="mt-cut grid min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-1 pl-1 pr-2"
                style={{ '--c': '8px', gridTemplateColumns: '40px minmax(0,1fr) auto', background: 'rgba(5,8,15,.6)', boxShadow: `inset 0 0 0 1px ${sel?.id === p.id ? tone(p.overall) : 'rgba(148,163,184,.18)'}` }}>
                {face(p, 40, 46)}
                <span className="min-w-0">
                  <b className="flex items-center gap-1.5 truncate text-[14px] text-gray-200"><Chip c={posColor(p)}>{p.position}</Chip>{p.name}</b>
                  <small className="text-[11px] text-gray-500"><Ovr p={p} size={15} /> · {p.year} {p.team}</small>
                </span>
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
