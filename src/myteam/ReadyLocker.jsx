/*
 * 경기 준비 화면 — 세 칸, 칸마다 판단에 필요한 것만.
 *  왼쪽: 오늘 상대(선발 · 경계 타자 · 전력 비교, 타순은 단추로) · 가운데: 라인업(구장 + 타순 + 시너지, 투수진 · 벤치는 단추로)
 *  · 오른쪽: 작전(세 갈래 · 준비 카드 · 경기 시작)
 * 내 팀 경기(engine 을 넘길 때)는 설계 판(ROADMAP 12 · mockups/plan-prep 1안 + 3안 흐름 줄): 왼쪽에 상대 선발 구종 · 타선 구종 약점 · 우리 선발과 불펜 차이,
 * 오른쪽에 공격 · 선발 운용 · 볼 배합(칸마다 승률 변화 · 추천) · 조건 지시 2칸 · 경기 흐름 줄(선발이 내려가는 이닝 · 7~9회 불펜). 예상 승률은 고른 설계로 굴린 값
 * 자리·타순 바꾸기는 SquadBoard 가 하고, 이 판은 바뀐 결과(order)를 그대로 위로 올린다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Count } from '../ui/motion.jsx';

/** 예상 승률 막대 — 50:50 에서 출발해 제 값으로(0.7초), 값이 바뀌면 그 값으로 미끄러진다 */
function WinBar({ win, c }) {
  const [shown, setShown] = useState(50);
  useEffect(() => { const id = setTimeout(() => setShown(win), 60); return () => clearTimeout(id); }, [win]); // 한 번 그린 뒤 제 값으로 — 전환이 보이게
  return (
    <>
      <div className="flex items-baseline justify-between">
        <Sub>예상 승률</Sub>
        <span className="font-display text-t2 font-extrabold">
          <Count value={win} from={50} dur={700} style={{ color: '#34d399' }} format={(n) => `${n}%`} /> <span className="text-gray-500">:</span>{' '}
          <Count value={100 - win} from={50} dur={700} style={{ color: c }} format={(n) => `${n}%`} />
        </span>
      </div>
      <span className="relative flex h-2 overflow-hidden rounded-full">
        <i className="block h-full transition-[width] duration-700" style={{ width: `${shown}%`, background: '#34d399', transitionTimingFunction: 'var(--fx-out)' }} />
        <i className="block h-full flex-1" style={{ background: c }} />
        {/* 가운데 50% 눈금 — 어느 쪽으로 기울었는지 */}
        <b className="absolute inset-y-0 left-1/2 w-px bg-[#05080f]/70" aria-hidden="true" />
      </span>
    </>
  );
}
import SquadBoard from './SquadBoard.jsx';
import { SynergyTip } from '../KboAugmentDraft.jsx';
import { SIDES, DEFAULT_SIDES, planOfSides, sideReasons, scoutTags } from './strategy.js';

import { pitchMix, repertoireOf, PITCHES } from '../engine/pitchSim.js';
import { planRun, planSummary, planAnalysis, planDeltas } from './planSim.js';
import { Btn, UiStyle, Pop, FxChips } from './ui.jsx';
import { posColor } from './teamColor.js';
import { FORM_OF } from './form.js';

const cut = (c) => ({ '--c': `${c}px` });
/* 공통 규칙 색 — 우리(주 단추) · 주의 */
const US = '#10b981';
const WARN = '#fbbf24';
const HEX = 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)';
/* 드래프트 시너지 도크와 같은 단계 색 */
const TIER = [
  { fr: 'linear-gradient(160deg,#2b3445,#161c27)', bd: '#3a4556', gc: '#6b7280' },
  { fr: 'linear-gradient(160deg,#d69a62,#8a5428)', bd: '#e7b184', gc: '#1a0f07' },
  { fr: 'linear-gradient(160deg,#eef2f6,#8d99a6)', bd: '#f8fafc', gc: '#0f172a' },
  { fr: 'linear-gradient(160deg,#fde68a,#c08a0e)', bd: '#fef3c7', gc: '#1c1402' },
  { fr: 'linear-gradient(135deg,#f0abfc,#7dd3fc 45%,#6ee7b7 70%,#fde68a)', bd: '#fff', gc: '#0b0f1a' },
];
const tierOf = (s) => (!s.level ? 0 : s.level === s.tiers.length ? (s.tiers.length >= 3 ? 4 : 3) : Math.min(s.level, 2));
const BONUS_KO = { bat: '타격', pit: '투구', power: '파워', contact: '컨택', speed: '주루', defense: '수비', stability: '안정' };

export const SynIcon = ({ s, w = 38 }) => {
  const t = TIER[tierOf(s)];
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: w, height: Math.round(w * 0.87), background: t.bd, clipPath: HEX }}>
      <span className="absolute" style={{ inset: '2px 2.3px', background: t.fr, clipPath: HEX }} />
      <i className="relative block" style={{ width: '58%', height: '66%', background: t.gc, WebkitMaskImage: `url(ui/synergy/${s.id}.png)`, maskImage: `url(ui/synergy/${s.id}.png)`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
    </span>
  );
};

const Rule = () => <span className="block h-px shrink-0 bg-white/[0.08]" />;
const Sub = ({ children }) => <span className="text-t3 font-bold text-gray-300">{children}</span>;

/** 경계 타자 — 장타 둘 · 주루 하나 */
const dangerOf = (bats) => {
  const d = new Map();
  [...bats].sort((a, b) => b.stats.power - a.stats.power).slice(0, 2).forEach((p) => d.set(p.id, '장타'));
  [...bats].sort((a, b) => b.stats.speed - a.stats.speed).slice(0, 1).forEach((p) => { if (!d.has(p.id)) d.set(p.id, '주루'); });
  return d;
};
const lineupOf = (opponent) => {
  const bats = (opponent.roster || []).filter((p) => p.type === 'batter');
  return (opponent.batters || [...bats].sort((a, b) => b.overall - a.overall)).slice(0, 9);
};

/** 전력 비교 — 우리 · 막대 · 상대. 앞선 쪽만 제 색. 두 쪽 합계는 부르는 쪽이 같은 셈(sumsOf)으로 넘긴다 */
function Versus({ sums, c }) {
  const foe = sums.foe;
  if (!foe) return null;
  const rows = [['타자', sums.bat, foe.bat], ['수비', sums.def, foe.def], ['투수', sums.pit, foe.pit]];
  return (
    <div className="flex shrink-0 flex-col gap-3">
      <Sub>전력 비교</Sub>
      {rows.map(([ko, mine, them]) => (
        <div key={ko} className="flex items-center gap-3">
          <b className="w-12 text-right font-display text-t2" style={{ color: mine >= them ? US : '#9ca3af' }}>{mine}</b>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-center text-t4 text-gray-400">{ko}</span>
            <span className="flex h-1.5 bg-white/[0.07]">
              <i style={{ width: `${(mine / (mine + them || 1)) * 100}%`, background: US }} />
              <i className="flex-1" style={{ background: `color-mix(in srgb,${c} 70%,transparent)` }} />
            </span>
          </span>
          <b className="w-12 font-display text-t2" style={{ color: them > mine ? c : '#9ca3af' }}>{them}</b>
        </div>
      ))}
    </div>
  );
}

/** 왼쪽 — 오늘 상대: 선발 · 경계 타자 · 전력 비교. 타순은 단추로 */
/* 설계 분석 조각 — 상대 선발 구종 막대 · 타선 구종 약점 · 우리 선발과 가장 센 불펜 */
const FAMS = [['F', '직구'], ['B', '휘는 공'], ['O', '떨어지는 공']];
const PITCH_C = ['#f87171', '#a78bfa', '#2dd4bf', '#60a5fa', '#fbbf24'];
function MixBar({ p }) {
  const mix = pitchMix(p), rep = repertoireOf(p);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex h-2 overflow-hidden rounded-full">{rep.map((t, i) => <i key={t} className="block h-full" style={{ width: `${(mix[t] || 0) * 100}%`, background: PITCH_C[i % 5] }} />)}</span>
      <span className="flex flex-wrap gap-x-3 text-t4 text-gray-400">{rep.map((t, i) => <span key={t}><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: PITCH_C[i % 5] }} />{PITCHES[t].name} {Math.round((mix[t] || 0) * 100)}%</span>)}</span>
    </div>
  );
}
function WeakBars({ an, c }) {
  return (
    <div className="flex shrink-0 flex-col gap-2.5">
      <Sub>타선 구종 약점</Sub>
      {FAMS.map(([k, ko]) => (
        <div key={k} className="grid items-center gap-3" style={{ gridTemplateColumns: '7.5rem 1fr 1.5rem' }}>
          <span className="whitespace-nowrap text-t3 text-gray-300">{ko} 약함</span>
          <span className="relative h-1.5 rounded-full bg-white/[0.07]"><i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(an.weak[k] / 9) * 100}%`, background: c }} /></span>
          <b className="text-right font-display text-t2 text-white">{an.weak[k]}</b>
        </div>
      ))}
    </div>
  );
}
function MoundGap({ an }) {
  const g = an.gap, tone = g >= 0 ? US : '#f87171';
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <Sub>우리 마운드</Sub>
      <div className="flex items-center gap-2 text-t3">
        <span className="min-w-0 truncate"><span className="text-gray-400">선발 </span><b className="text-white">{an.sp?.name}</b></span>
        <span className="text-gray-500">·</span>
        <span className="min-w-0 truncate"><span className="text-gray-400">불펜 최고 </span><b className="text-white">{an.best?.name || '-'}</b></span>
        <b className="ml-auto font-display text-t1 leading-none" style={{ color: tone }}>{g >= 0 ? '+' : ''}{g}</b>
      </div>
    </div>
  );
}

function ScoutPanel({ opponent, sums, win = null, onLineup, an = null, busy = false, step = 0, oppPen = null, stars = null }) {
  const ros = opponent.roster || [];
  const bats = ros.filter((p) => p.type === 'batter');
  const pits = [...ros.filter((p) => p.type === 'pitcher')].sort((a, b) => b.overall - a.overall);
  const ace = opponent.starter || pits[0];
  const ovr = ros.length ? Math.round(ros.reduce((s, p) => s + p.overall, 0) / ros.length) : 0;
  const c = opponent.color || '#60a5fa';
  const danger = dangerOf(bats);
  const watch = lineupOf(opponent).filter((p) => danger.has(p.id));
  const af = FORM_OF[ace?.form];

  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(20), '--a': c }}>
      <p className="mt-lab" style={{ '--a': c }}>오늘 상대</p>
      <div className="flex shrink-0 items-center gap-3">
        {opponent.emblem && <span className="block h-11 w-11 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${opponent.emblem})` }} />}
        <b className="min-w-0 flex-1 truncate text-t2 font-black text-white">{opponent.name}</b>
        <b className="font-display text-t1 font-extrabold leading-none" style={{ color: c }}>{ovr}</b>
      </div>
      <Rule />
      {ace && (
        <div className="flex shrink-0 flex-col gap-1">
          <Sub>상대 선발</Sub>
          <div className="flex items-baseline gap-2">
            <b className="text-t2 font-black text-white">{ace.name}</b>
            {af?.swing ? <b className="text-t4" style={{ color: af.color }}>{af.mark} {af.ko}</b> : null}
            <span className="flex-1" />
            <b className="font-display text-t2" style={{ color: c }}>{ace.overall}</b>
          </div>
          <span className="text-t4 text-gray-400">구위 {ace.stats.stuff} · 제구 {ace.stats.control}</span>
          {an && <MixBar p={ace} />}
        </div>
      )}
      <Rule />
      {an ? <>
        {step === 2 && oppPen ? (
          <div className="flex shrink-0 flex-col gap-2"><Sub>상대 불펜</Sub>
            {oppPen.slice(0, 4).map((p) => <div key={p.id} className="flex items-baseline gap-2"><b className="min-w-0 flex-1 truncate text-t3 text-white">{p.name}</b><span className="font-display text-t2" style={{ color: ((p.stats?.stuff ?? 80) + (p.stats?.control ?? 75)) / 2 < 78 ? '#34d399' : '#e2e8f0' }}>{Math.round(((p.stats?.stuff ?? 80) + (p.stats?.control ?? 75)) / 2)}</span></div>)}
          </div>
        ) : step === 3 && stars ? (
          <div className="flex shrink-0 flex-col gap-2"><Sub>상대 강타자</Sub>
            {stars.map((p) => <div key={p.id} className="flex items-baseline gap-2"><b className="min-w-0 flex-1 truncate text-t3 text-white">{p.name}</b><span className="text-t4 text-gray-400">파워</span><b className="font-display text-t2 text-white">{p.stats?.power}</b></div>)}
          </div>
        ) : <WeakBars an={an} c={c} />}
        <Rule /><MoundGap an={an} /></> : <>
      <div className="flex shrink-0 flex-col gap-2.5">
        <Sub>경계 타자</Sub>
        {watch.map((p) => (
          <div key={p.id} className="flex items-baseline gap-2">
            <b className="min-w-0 flex-1 truncate text-t3 text-white">{p.name}</b>
            <span className="text-t4" style={{ color: WARN }}>{danger.get(p.id)}</span>
            <b className="w-8 text-right font-display text-t2 text-white">{p.overall}</b>
          </div>
        ))}
      </div>
      <Rule />
      {sums && <Versus sums={sums} c={c} />}
      </>}
      {/* 예상 승률 — 내 쪽 초록 · 상대 쪽 상대 색 */}
      {win != null && (
        <div className="flex shrink-0 flex-col gap-1.5 transition-opacity" style={{ opacity: busy ? 0.4 : 1 }}>
          <WinBar win={win} c={c} />
        </div>
      )}
      <span className="flex-1" />
      <Btn onClick={onLineup}>상대 타순 보기</Btn>
    </aside>
  );
}

/** 상대 타순 창 — 특징 · 타순 9명 */
function FoeLineup({ opponent, onClose }) {
  const bats = (opponent.roster || []).filter((p) => p.type === 'batter');
  const danger = dangerOf(bats);
  const c = opponent.color || '#60a5fa';
  return (
    <Pop eyebrow="상대 타순" title={opponent.name} sub={scoutTags(opponent).map((t) => t.label).join(' · ')} a={c} width={520} onClose={onClose}>
        <div className="flex flex-col gap-1">
          {lineupOf(opponent).map((p, i) => {
            const d = danger.get(p.id);
            const f = FORM_OF[p.form];
            return (
              <div key={p.id} className="mt-cut flex h-10 items-center gap-3 px-3"
                style={{ ...cut(6), background: d ? 'rgba(251,191,36,.08)' : 'rgba(255,255,255,.04)' }}>
                <b className="w-4 font-display text-t3 text-gray-400">{i + 1}</b>
                <span className="w-7 text-t4 text-gray-400">{p.position}</span>
                <b className="min-w-0 flex-1 truncate text-t3 text-white">{p.name}</b>
                {f?.swing ? <b className="text-t4" style={{ color: f.color }}>{f.mark}</b> : null}
                {d && <span className="text-t4" style={{ color: WARN }}>{d}</span>}
                <b className="w-8 text-right font-display text-t2" style={{ color: c }}>{p.overall}</b>
              </div>
            );
          })}
        </div>
    </Pop>
  );
}

/** 시너지 한 줄 — 아이콘 · 받은 보너스 합계. 아이콘에 마우스를 올리면 자세히 */
function SynergyRow({ synergies = [] }) {
  const rootRef = useRef(null);
  const [hover, setHover] = useState(null); // { id, left } — 마우스를 올린 조각
  const on = synergies.filter((s) => s.active);
  const next = synergies.filter((s) => !s.active && s.count > 0).sort((a, b) => (a.need - a.count) - (b.need - b.count)).slice(0, Math.max(0, 6 - on.length));
  const shown = [...on, ...next].slice(0, 6);
  const sum = {};
  for (const s of on) for (const [k, v] of Object.entries(s.bonus || {})) sum[k] = (sum[k] || 0) + v;
  const totals = Object.entries(sum).filter(([, v]) => v).slice(0, 3);
  const hv = hover && shown.find((s) => s.id === hover.id);
  const show = (id, el) => {
    const box = rootRef.current;
    if (!box) return;
    const r = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    setHover({ id, left: r.left - b.left + r.width / 2 - 131 });
  };
  return (
    <div ref={rootRef} className="relative flex items-center gap-3 pt-2" onMouseLeave={() => setHover(null)}>
      <b className="shrink-0 text-t4 text-gray-400">시너지 {on.length}</b>
      <div className="flex gap-2">
        {shown.map((s) => (
          <span key={s.id} className="cursor-default" style={{ opacity: s.active ? 1 : 0.45 }} onMouseEnter={(e) => show(s.id, e.currentTarget)}>
            <SynIcon s={s} w={36} />
          </span>
        ))}
      </div>
      <span className="flex-1" />
      {totals.map(([k, v]) => (
        <span key={k} className="text-t4 text-gray-400">{BONUS_KO[k] || k} <b className="font-display text-t3" style={{ color: US }}>+{v}</b></span>
      ))}
      {hv && <SynergyTip s={hv} up left={hover.left} />}
    </div>
  );
}

/** 상대가 아직 없을 때(드래프트 직후) — 내 엔트리를 포지션별로 */
function RosterPanel({ squad, cap }) {
  const POS = [['SP', '선발'], ['RP', '불펜'], ['C', '포수'], ['1B', '1루수'], ['2B', '2루수'], ['3B', '3루수'], ['SS', '유격수'], ['OF', '외야수'], ['DH', '지명타자']];
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3 p-5" style={{ ...cut(20), '--a': US }}>
      <p className="mt-lab">선수 구성</p>
      <div className="flex items-baseline justify-between">
        <h2 className="text-t1 font-black text-white">내 엔트리</h2>
        <span className="font-display"><b className="text-t2 text-emerald-400">{squad.length}</b><small className="text-t3 text-gray-400">/{cap}</small></span>
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        {POS.map(([key, label]) => {
          const n = squad.filter((p) => p.position === key).length;
          return (
            <div key={key} className="flex h-8 items-center justify-between border-b border-white/[0.07] px-[5px]">
              <span className="text-t3 text-gray-400">{label}</span>
              <b className="font-display text-t2" style={{ color: n ? posColor({ position: key }) : '#6b7280' }}>{n}</b>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/** 고르는 칸 — 작전 · 준비 카드가 같은 모양. 고른 칸만 초록 */
const pickStyle = (on) => ({
  ...cut(6),
  background: on ? 'color-mix(in srgb,#10b981 18%,transparent)' : 'rgba(255,255,255,.04)',
  boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? US : 'rgba(255,255,255,.08)'}`,
});

/** 준비 카드 — 가진 카드 가운데 한 장(또는 안 씀). 고른 카드는 이 경기에만. 효과는 마우스를 올리면 */
function CardBlock({ cards, value, onPick }) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <Sub>준비 카드</Sub>
      <div className="grid grid-cols-3 gap-1">
        {cards.map((c) => {
          const on = value === c.id;
          return (
            <button key={c.id} type="button" disabled={!c.n} onClick={() => onPick(on ? null : c.id)} aria-pressed={on} title={c.effect}
              className="mt-cut flex h-11 items-center justify-center gap-1.5 px-2 disabled:opacity-35" style={pickStyle(on)}>
              <b className="truncate text-t3" style={{ color: on ? '#fff' : '#9ca3af' }}>{c.name}</b>
              <span className="shrink-0 font-display text-t4 text-gray-400">{c.n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 작전 — 공격 · 마운드 · 수비에서 하나씩. '추천' 은 오늘 상대에 맞는 갈래(이유는 마우스를 올리면).
 *  경기 중에는 공수 교대 때만, 경기당 몇 번만 바꿀 수 있으니 여기서 고르는 것이 기본 계획이다 */
const pct = (d) => `${d > 0 ? '+' : ''}${d.toFixed(1)}%`;
function SideBlock({ sides, onPick, opponent, deltas = null }) {
  const reasons = sideReasons(opponent);
  /* 승률 변화가 있는 갈래(선발 운용 · 볼 배합)는 가장 오르는 칸에 추천 — 0.5%p 넘게 오를 때만 */
  const best = (key) => { const d = deltas?.[key]; if (!d) return null; const [id, v] = Object.entries(d).sort((a, b) => b[1] - a[1])[0]; return v > 0.5 ? id : null; };
  return (
    <div className="flex shrink-0 flex-col gap-5">
      {SIDES.filter((g) => !g.hidden).map((g) => (
        <div key={g.key} className="flex flex-col gap-2">
          <Sub>{g.ko}</Sub>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${deltas ? g.opts.length : 2},minmax(0,1fr))` }}>
            {g.opts.map((o) => {
              const pick = sides[g.key] === o.id;
              const d = deltas?.[g.key]?.[o.id];
              const why = deltas?.[g.key] ? (best(g.key) === o.id ? [{ label: '승률 오름' }] : []) : reasons[o.id] || [];
              return (
                <button key={o.id} type="button" onClick={() => onPick(g.key, o.id)} aria-pressed={pick}
                  title={why.length ? why.map((w) => w.label).join(' · ') : o.tip}
                  className="mt-cut relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 py-1.5 text-t3 font-bold" style={{ ...pickStyle(pick), color: pick ? '#fff' : '#9ca3af' }}>
                  {o.ko}
                  {d != null ? <b className="font-display text-t4" style={{ color: Math.abs(d) < 0.5 ? '#6b7280' : d > 0 ? '#34d399' : '#f87171' }}>{Math.abs(d) < 0.05 ? '±0' : pct(d)}</b> : <FxChips fx={o.fx} main={o.main} on={pick} />}
                  {!!why.length && <b className="absolute right-1 top-1 rounded px-1 text-[11px] leading-[15px]" style={{ color: WARN, boxShadow: `inset 0 0 0 1px ${WARN}88` }}>추천</b>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/*
 * ───── 정비 3단계(ROADMAP 13 · mockups/prep-steps 4안 거울 이닝 + 8안 미리보기 기둥) ─────
 * 왼쪽은 늘 상대 분석(단계마다 강조: 1 상대 선발 · 타선 약점 / 2 상대 불펜 / 3 상대 강타자), 가운데는 단계 판, 오른쪽은 늘 미리보기 기둥
 * (예상 승률 · 경기 흐름 · 준비 카드 · 다음). 1 라인업 → 2 경기 흐름(선발 운용 · 볼 배합 · 공격 · 필승조 · 증강 시점) → 3 상황 대응 → 경기 시작.
 */
export const PREP_STEPS = ['라인업', '경기 흐름', '상황 대응'];
function Stepper({ step, onStep }) {
  return (
    <div className="flex items-center gap-3">
      {PREP_STEPS.map((t, i) => {
        const n = i + 1, on = n === step, done = n < step;
        return (
          <React.Fragment key={t}>
            <button type="button" onClick={() => onStep(n)} className="flex items-center gap-2.5" aria-current={on ? 'step' : undefined}>
              <b className="grid h-9 w-9 place-items-center rounded-full font-display text-t2" style={{ background: on ? WARN : done ? 'rgba(52,211,153,.22)' : 'rgba(255,255,255,.06)', color: on ? '#1c1203' : done ? '#34d399' : '#9ca3af' }}>{done ? '✓' : n}</b>
              <b className="text-t3" style={{ color: on ? '#fff' : '#9ca3af' }}>{t}</b>
            </button>
            {n < 3 && <i className="block h-px w-10 bg-white/15" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
/* 거울 이닝 — 위는 상대(선발이 내려가는 이닝 · 이닝마다 나올 불펜), 아래는 우리(선발 · 필승조 · 증강 시점). 값은 미리보기 600판 */
function MirrorLanes({ pv, late, augInn, pens }) {
  const x = (inn) => `${(Math.min(9, Math.max(0, inn)) / 9) * 100}%`;
  const Lane = ({ t, c, children }) => (
    <div className="grid items-center gap-3" style={{ gridTemplateColumns: '5.5rem 1fr' }}>
      <b className="text-t3" style={{ color: c }}>{t}</b><div className="relative h-11 rounded-lg bg-white/[0.03]">{children}</div>
    </div>
  );
  const nameOf = (id) => pens.find((p) => p.id === id)?.name;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3" style={{ gridTemplateColumns: '5.5rem 1fr' }}><span /><div className="grid text-center font-display text-t3 text-gray-400" style={{ gridTemplateColumns: 'repeat(9,minmax(0,1fr))' }}>{Array.from({ length: 9 }, (_, i) => <span key={i}>{i + 1}회</span>)}</div></div>
      <Lane t="상대 선발" c="#f87171">{pv && <i className="absolute inset-y-1.5 left-1 rounded-md" style={{ width: `calc(${x(pv.oppExit)} - 6px)`, background: 'rgba(248,113,113,.22)' }} />}</Lane>
      <Lane t="상대 불펜" c="#f87171">{pv && pv.oppPen.map((nm, i) => nm && i + 1 > pv.oppExit && <span key={i} className="absolute inset-y-1.5 flex items-center justify-center truncate rounded-md px-1 text-t4 text-white" style={{ left: x(i), width: `calc(${x(1)} - 4px)`, background: 'rgba(248,113,113,.14)' }}>{nm}</span>)}</Lane>
      <i className="my-1 block h-px bg-white/10" />
      <Lane t="우리 선발" c="#34d399">{pv && <><i className="absolute inset-y-1.5 left-1 rounded-md" style={{ width: `calc(${x(pv.exitInn)} - 6px)`, background: 'linear-gradient(90deg,rgba(52,211,153,.45),rgba(52,211,153,.15))' }} /><i className="absolute inset-y-0 w-[2px]" style={{ left: x(pv.exitInn), background: WARN }} /></>}</Lane>
      <Lane t="필승조" c="#34d399">{[0, 1, 2].map((i) => <span key={i} className="absolute inset-y-1.5 flex items-center justify-center truncate rounded-md px-1 text-t4 text-white" style={{ left: x(6 + i), width: `calc(${x(1)} - 4px)`, background: 'rgba(96,165,250,.2)' }}>{nameOf(late?.[i]) || pv?.pen[i] || '-'}</span>)}</Lane>
      <Lane t="증강" c="#a78bfa">{augInn && <span className="absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-t3 font-black" style={{ left: x(augInn - 0.5), background: '#a78bfa', color: '#1c1203' }}>✦</span>}</Lane>
    </div>
  );
}
/* 필승조 — 7 · 8 · 9회에 던질 투수. 칸을 누르면 아래에 불펜 줄이 열린다 */
function LatePick({ late, setLate, pens }) {
  const [open, setOpen] = useState(null);
  const arm = (p) => Math.round(((p?.stats?.stuff ?? 80) + (p?.stats?.control ?? 75)) / 2);
  return (
    <div className="flex flex-col gap-2">
      <Sub>필승조</Sub>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        {[7, 8, 9].map((inn, i) => { const p = pens.find((x) => x.id === late[i]); return (
          <button key={inn} type="button" onClick={() => setOpen(open === i ? null : i)} className="mt-cut flex min-h-[3.25rem] items-center gap-2 px-2.5" style={pickStyle(open === i)}>
            <b className="font-display text-t2" style={{ color: WARN }}>{inn}회</b><b className="truncate text-t3 text-white">{p?.name || '-'}</b><span className="ml-auto font-display text-t3 text-gray-400">{p ? arm(p) : ''}</span>
          </button>
        ); })}
      </div>
      {open != null && (
        <div className="flex flex-wrap gap-1">
          {pens.map((p) => (
            <button key={p.id} type="button" onClick={() => { setLate(late.map((id, j) => (j === open ? p.id : id === p.id ? late[open] : id))); setOpen(null); }}
              className="mt-cut flex items-center gap-1.5 px-2.5 py-1.5" style={pickStyle(late[open] === p.id)}>
              <b className="text-t4 text-white">{p.name}</b><span className="font-display text-t4 text-gray-400">{arm(p)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function AugPick({ augInn, setAugInn }) {
  return (
    <div className="flex flex-col gap-2">
      <Sub>증강 시점</Sub>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))' }}>
        {[3, 4, 5, 6, 7, 8].map((n) => (
          <button key={n} type="button" onClick={() => setAugInn(n)} className="mt-cut flex h-11 items-center justify-center font-display text-t2" style={{ ...pickStyle(augInn === n), color: augInn === n ? '#fff' : '#9ca3af' }}>{n}회</button>
        ))}
      </div>
    </div>
  );
}
/*
 * 상황 대응 — 상황마다 하나(첫 칸 = 맡기기). flow-sim 값으로 승률 변화 · 추천:
 *  지친 선발 교체는 우리 선발이 약하면 +2.1 · 강하면 −1.9, 강타자 유인구 · 거르기는 우리 타선이 약하면 +1.9 · +0.4 · 강하면 −1.4 · −2.0
 */
const SITUATIONS = [
  { id: 'close', side: '수비', ko: '7회 이후 1~2점 리드', opts: [['그대로', null], ['가장 센 불펜', 'close']] },
  { id: 'tired', side: '수비', ko: '선발 체력 30 아래 · 주자 있음', opts: [['맡기기', null], ['교체', 'tired']] },
  { id: 'star', side: '수비', ko: '득점권 · 상대 강타자', opts: [['승부', null], ['유인구', 'chase'], ['거르기', 'walk']] },
  { id: 'n1', side: '공격', ko: '무사 1루', opts: [['강공', null], ['히트앤런', 'hnr']] },
];
const sitDelta = (an, cond) => {
  const spWeak = an ? an.spArm < 80 : false, offWeak = an ? an.offAvg < 82 : false;
  return { close: 3.4, tired: spWeak ? 2.1 : -1.9, chase: offWeak ? 1.9 : -1.4, walk: offWeak ? 0.4 : -2.0, hnr: 0.5 }[cond] ?? 0;
};
function SitBlock({ conds, setConds, an }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
      {SITUATIONS.map((s) => {
        const cur = s.opts.find(([, c]) => c && conds.includes(c))?.[1] ?? null;
        const best = s.opts.map(([, c]) => [c, c ? sitDelta(an, c) : 0]).sort((x, y) => y[1] - x[1])[0];
        return (
          <div key={s.id} className="mt-cut flex flex-col gap-2.5 p-4" style={{ ...cut(10), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
            <span className="flex items-center gap-2">
              <b className="rounded px-1.5 text-t4" style={{ color: s.side === '공격' ? '#34d399' : '#7dd3fc', boxShadow: `inset 0 0 0 1px ${s.side === '공격' ? '#34d39966' : '#7dd3fc66'}` }}>{s.side}</b>
              <b className="truncate text-t2 text-white">{s.ko}</b>
            </span>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${s.opts.length},minmax(0,1fr))` }}>
              {s.opts.map(([ko, c]) => {
                const on = cur === c, d = c ? sitDelta(an, c) : 0, rec = best[1] > 0.5 && best[0] === c;
                return (
                  <button key={ko} type="button" aria-pressed={on} onClick={() => setConds([...conds.filter((x) => !s.opts.some(([, k]) => k === x)), ...(c ? [c] : [])])}
                    className="mt-cut relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 py-1.5 text-t3 font-bold" style={{ ...pickStyle(on), color: on ? '#fff' : '#9ca3af' }}>
                    {ko}
                    <b className="font-display text-t4" style={{ color: Math.abs(d) < 0.5 ? '#6b7280' : d > 0 ? '#34d399' : '#f87171' }}>{Math.abs(d) < 0.05 ? '±0' : pct(d)}</b>
                    {rec && <b className="absolute right-1 top-1 rounded px-1 text-[11px] leading-[15px]" style={{ color: WARN, boxShadow: `inset 0 0 0 1px ${WARN}88` }}>추천</b>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
/* 미리보기 기둥 — 늘 보인다: 예상 승률 · 흐름 한 줄 · 준비 카드 · 다음 */
function PreviewCol({ pv, busy, children, foot }) {
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-5 p-5" style={{ ...cut(20), '--a': '#38bdf8' }}>
      <p className="mt-lab" style={{ '--a': '#38bdf8' }}>미리보기</p>
      <div className="flex flex-col gap-1.5 transition-opacity" style={{ opacity: busy ? 0.4 : 1 }}>
        {pv ? <WinBar win={pv.win} c="#f87171" /> : <span className="h-10 animate-pulse rounded-lg bg-white/[0.04]" />}
      </div>
      {pv && (
        <div className="flex flex-col gap-1.5 text-t3 transition-opacity" style={{ opacity: busy ? 0.4 : 1 }}>
          <span className="flex justify-between"><span className="text-gray-400">우리 선발</span><b className="text-white">{pv.exitInn.toFixed(1)}회까지</b></span>
          <span className="flex justify-between"><span className="text-gray-400">상대 선발</span><b className="text-white">{pv.oppExit.toFixed(1)}회까지</b></span>
        </div>
      )}
      {children}
      <div className="mt-auto flex shrink-0 flex-col gap-2">{foot}</div>
    </aside>
  );
}

/** 오른쪽 — 작전: 팀 종합 · 세 갈래 · 준비 카드 · 경기 시작 */
function WarRoom({ team, autoFilled, onStart, startLabel, children, startBlock = null, onFix = null }) {
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-5 p-5" style={{ ...cut(20), '--a': US }}>
      <div className="flex shrink-0 items-baseline gap-2.5">
        <p className="mt-lab">작전</p>
        <span className="ml-auto flex items-baseline gap-2">
          <Sub>팀 종합</Sub>
          <b className="font-display text-t1 font-extrabold leading-none" style={{ color: US }}>{team.ovr}</b>
        </span>
      </div>
      {!!autoFilled && (
        <div className="flex shrink-0 items-baseline justify-between text-t3">
          <span className="text-gray-400">2군 대체</span><b className="font-display text-t2" style={{ color: WARN }}>{autoFilled}명</b>
        </div>
      )}
      {children}
      <div className="mt-auto flex shrink-0 flex-col gap-2">
        {startBlock && (
          <p className="mt-cut px-3 py-2 text-center text-t3 font-bold text-[#f87171]"
            style={{ ...cut(8), background: 'rgba(248,113,113,.12)', boxShadow: 'inset 0 0 0 1px rgba(248,113,113,.45)' }}>{startBlock}</p>
        )}
        {/* 막혔을 때 고칠 곳이 있으면(내 팀 정비 → 라커) 시작 단추 자리에 그리로 가는 단추 — 막힌 단추만 두면 뒤로 두세 번 */}
        {startBlock && onFix
          ? <Btn lg pri data-sfx="nav" a="#f87171" style={cut(12)} onClick={onFix}>라커에서 정리 ▶</Btn>
          : <Btn lg pri data-sfx="nav" a={US} disabled={!!startBlock} style={{ ...cut(12), ...(startBlock ? { opacity: 0.45, pointerEvents: 'none' } : null) }} onClick={onStart}>{startLabel}</Btn>}
      </div>
    </aside>
  );
}

export default function ReadyLocker({
  team, squad, bench, sums, synergies = [], opponent = null, autoFilled = 0, teamInfo,
  onCommit, onStart, startLabel = '시즌 시작 ▶', startBlock = null, onFix = null,
  cards = null, // 준비 카드 [{ id, name, effect, n }] — 내 팀 경기에서만 넘긴다
  full = false, // 내 팀 경기: 라커 배치 그대로(로테이션 5 · 불펜 8 · 벤치) — 드래프트는 20자리 판(fitSlots)
  win = null, // 예상 승률(%) — 상대가 있을 때
  engine = null, // { home, away } 엔진용 두 팀 — 넘기면 설계 판(분석 · 승률 변화 · 조건 지시 · 흐름 줄)
}) {
  const [sel, setSel] = useState(null);
  /* 작전 — 세 갈래. 고른 계획은 경기의 첫 전술이 된다 */
  const [sides, setSides] = useState(team.plan?.sides || DEFAULT_SIDES);
  const pickSide = (key, id) => setSides((v) => ({ ...v, [key]: id }));
  const [card, setCard] = useState(null); // 이번 경기에 쓸 준비 카드 id
  /* 정비 3단계 — 상황 대응(기본: 7회 이후 리드면 센 불펜) · 필승조 · 증강 시점 */
  const [step, setStep] = useState(1);
  const [conds, setConds] = useState(team.plan?.conds || ['close']);
  const pens = useMemo(() => (engine ? engine.home.pitchers.slice(1) : []), [engine]);
  const arm = (p) => (p?.stats?.stuff ?? 80) + (p?.stats?.control ?? 75);
  const [late, setLate] = useState(() => {
    const ids = new Set(pens.map((p) => p.id)), saved = team.plan?.late;
    if (saved?.every((id) => ids.has(id))) return saved;
    const top3 = [...pens].sort((x, y) => arm(y) - arm(x)).slice(0, 3); // 가장 센 투수가 9회
    return [top3[2]?.id, top3[1]?.id, top3[0]?.id];
  });
  const [augInn, setAugInn] = useState(team.plan?.augInn || 7);
  const oppPen = useMemo(() => (engine ? [...engine.away.pitchers.slice(1).filter((p) => p.position !== 'SP')].sort((x, y) => arm(y) - arm(x)) : null), [engine]); // eslint-disable-line react-hooks/exhaustive-deps
  const stars = useMemo(() => (engine ? [...engine.away.batters].sort((x, y) => (y.stats?.power ?? 0) - (x.stats?.power ?? 0)).slice(0, 3) : null), [engine]);
  const an = useMemo(() => (engine ? planAnalysis(engine.home, engine.away) : null), [engine]);
  const deltas = useMemo(() => (an ? planDeltas(an) : null), [an]);
  /*
   * 고른 설계로 굴린 미리보기 — 고르면 0.25초 뒤 100판씩 나눠 600판(약 2초)을 굴리고 다 되면 바꾼다(한 번에 굴리면 화면이 멈춘다).
   * 200판에서 먼저 보여 주면 600판과 12%p 까지 달랐다 — 그동안은 앞 숫자를 흐리게 둔다(busy)
   */
  const [pv, setPv] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!engine) return undefined;
    setBusy(true);
    const plan = planOfSides(sides, conds, { late, augInn });
    let acc, n = 0, id;
    const step = () => {
      acc = planRun(engine.home, engine.away, plan, n, n + 100, acc); n += 100;
      if (n < 600) id = setTimeout(step, 0);
      else { setPv(planSummary(acc)); setBusy(false); }
    };
    id = setTimeout(step, 250);
    return () => clearTimeout(id);
  }, [engine, sides, conds, late]); // eslint-disable-line react-hooks/exhaustive-deps
  const [foeOpen, setFoeOpen] = useState(false); // 상대 타순 창

  const an2 = useMemo(() => (an && engine ? { ...an, spArm: arm(an.sp) / 2, offAvg: engine.home.batters.reduce((n, b) => n + (b.stats?.contact ?? 75) + (b.stats?.power ?? 75), 0) / 18 } : an), [an, engine]); // eslint-disable-line react-hooks/exhaustive-deps
  if (engine && opponent) {
    const plan = () => planOfSides(sides, conds, { late, augInn });
    const foot = step < 3
      ? <Btn lg pri data-sfx="nav" a={US} style={cut(12)} onClick={() => setStep(step + 1)}>다음 · {PREP_STEPS[step]} ▶</Btn>
      : startBlock && onFix ? <Btn lg pri data-sfx="nav" a="#f87171" style={cut(12)} onClick={onFix}>라커에서 정리 ▶</Btn>
        : <Btn lg pri data-sfx="nav" a={US} disabled={!!startBlock} style={{ ...cut(12), ...(startBlock ? { opacity: 0.45, pointerEvents: 'none' } : null) }} onClick={() => onStart(plan(), card)}>{startLabel}</Btn>;
    return (
      <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr) 340px', gridTemplateRows: 'minmax(0,1fr)' }}>
        <UiStyle />
        <ScoutPanel opponent={opponent} sums={sums} win={null} an={an} step={step} oppPen={oppPen} stars={stars} onLineup={() => setFoeOpen(true)} />
        {foeOpen && <FoeLineup opponent={opponent} onClose={() => setFoeOpen(false)} />}
        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(20), '--a': US }}>
          <div className="flex shrink-0 items-center gap-4"><Stepper step={step} onStep={setStep} /><span className="ml-auto flex items-baseline gap-2"><Sub>팀 종합</Sub><b className="font-display text-t1 font-extrabold leading-none" style={{ color: US }}>{teamInfo.ovr}</b></span></div>
          {step === 1 && <SquadBoard team={team} squad={squad} bench={bench} sel={sel} onSelect={setSel} onCommit={onCommit} fitSlots={!full} compact railW={264} footer={<SynergyRow synergies={synergies} />} />}
          {step === 2 && (
            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto pr-1">
              <div className="transition-opacity" style={{ opacity: busy ? 0.5 : 1 }}><MirrorLanes pv={pv} late={late} augInn={augInn} pens={pens} /></div>
              <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' }}>
                <SideBlock sides={sides} onPick={pickSide} opponent={opponent} deltas={deltas} />
                <div className="flex flex-col gap-5"><LatePick late={late} setLate={setLate} pens={pens} /><AugPick augInn={augInn} setAugInn={setAugInn} /></div>
              </div>
            </div>
          )}
          {step === 3 && <SitBlock conds={conds} setConds={setConds} an={an2} />}
        </section>
        <PreviewCol pv={pv} busy={busy} foot={foot}>
          <div className="flex flex-col gap-1.5 text-t3">
            <span className="flex justify-between"><span className="text-gray-400">증강</span><b style={{ color: '#a78bfa' }}>{augInn}회</b></span>
            <span className="flex justify-between gap-3"><span className="shrink-0 text-gray-400">필승조</span><b className="truncate text-white">{late.map((id) => pens.find((p) => p.id === id)?.name || '-').join(' · ')}</b></span>
            <span className="flex justify-between"><span className="text-gray-400">상황 대응</span><b className="text-white">{conds.length}</b></span>
          </div>
          <Rule />
          {cards && <CardBlock cards={cards} value={card} onPick={setCard} />}
        </PreviewCol>
      </div>
    );
  }
  return (
    <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr) 420px', gridTemplateRows: 'minmax(0,1fr)' }}>
      {/* 라커 문법(잘린 모서리 · 네온 테두리 · 라벨) — 드래프트 화면에는 이 CSS 가 없어서 여기서 함께 올린다 */}
      <UiStyle />
      {opponent ? <ScoutPanel opponent={opponent} sums={sums} win={win} onLineup={() => setFoeOpen(true)} /> : <RosterPanel squad={squad} cap={teamInfo.cap} />}
      {foeOpen && opponent && <FoeLineup opponent={opponent} onClose={() => setFoeOpen(false)} />}

      <SquadBoard team={team} squad={squad} bench={bench} sel={sel} onSelect={setSel} onCommit={onCommit}
        fitSlots={!full} compact railW={264} footer={<SynergyRow synergies={synergies} />} />

      <WarRoom team={teamInfo} autoFilled={autoFilled}
        onStart={() => onStart(planOfSides(sides), card)} startLabel={startLabel} startBlock={startBlock} onFix={onFix}>
        <SideBlock sides={sides} onPick={pickSide} opponent={opponent} />
        {cards && <CardBlock cards={cards} value={card} onPick={setCard} />}
      </WarRoom>
    </div>
  );
}
