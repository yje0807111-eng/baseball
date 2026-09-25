/*
 * 정비 화면 — 내 라커의 MY SQUAD 판을 그대로 쓴다.
 *  왼쪽: 다음 상대 스카우팅(상대가 정해졌을 때) · 가운데: 구장 + 타순 + 선발 · 불펜 · 벤치 · 시너지 · 오른쪽: 정비(합계 · 팀 · 투수 휴식 · 버튼)
 * 자리·타순 바꾸기는 SquadBoard 가 하고, 이 판은 바뀐 결과(order)를 그대로 위로 올린다.
 */
import React, { useRef, useState } from 'react';
import SquadBoard from './SquadBoard.jsx';
import { SynergyTip } from '../KboAugmentDraft.jsx';
import { SIDES, DEFAULT_SIDES, FINE, sideOpt, planOfSides, untouch, sideReasons, scoutTags } from './strategy.js';
import { Btn, UiStyle } from './ui.jsx';
import { posColor } from './teamColor.js';
import { FORM_OF } from './form.js';
import { artId } from '../data/artAlias.js';

const cut = (c) => ({ '--c': `${c}px` });
const A = { bat: '#34d399', def: '#60a5fa', pit: '#f87171', syn: '#fbbf24', main: '#10b981' };
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

/** 시너지 도크 — 아이콘 한 줄 + 받은 보너스 합계 */
const foeSums = (opponent) => {
  const ros = opponent?.roster || [];
  if (!ros.length) return null;
  const bats = ros.filter((p) => p.type === 'batter');
  const line = (opponent.batters || [...bats].sort((a, b) => b.overall - a.overall)).slice(0, 9);
  const pits = [...ros.filter((p) => p.type === 'pitcher')].sort((a, b) => b.overall - a.overall).slice(0, 8);
  return {
    bat: Math.round(line.reduce((s, p) => s + p.overall, 0)),
    def: Math.round(line.filter((p) => p.position !== 'DH').reduce((s, p) => s + p.stats.defense, 0)),
    pit: Math.round(pits.reduce((s, p) => s + p.overall, 0)),
    ovr: Math.round(ros.reduce((s, p) => s + p.overall, 0) / ros.length),
  };
};
/* 벤치와 시너지 사이 남던 자리 — 우리와 상대를 같은 잣대로 견준다 */
function VersusBar({ sums, ovr, opponent }) {
  const foe = foeSums(opponent);
  if (!foe) return null;
  const c = opponent.color || '#f472b6';
  const cols = [['타자', sums.bat, foe.bat, A.bat], ['수비', sums.def, foe.def, A.def], ['투수', sums.pit, foe.pit, A.pit], ['종합', ovr, foe.ovr, A.syn]];
  return (
    <div className="flex shrink-0 gap-1 pb-1.5">
      {cols.map(([ko, mine, them, a]) => (
        <div key={ko} className="mt-cut flex flex-1 flex-col items-center gap-[3px] py-1.5" style={{ ...cut(5), background: 'rgba(255,255,255,.04)' }}>
          <span className="font-display text-[9.5px] tracking-[0.14em] text-gray-400">{ko}</span>
          <span className="flex items-baseline gap-[3px] leading-none">
            <b className="font-display text-[13px] font-extrabold" style={{ color: a }}>{mine}</b>
            <small className="text-[8.5px] text-gray-600">vs</small>
            <b className="font-display text-[12px] font-bold" style={{ color: c }}>{them}</b>
          </span>
          <span className="flex h-[3px] w-full bg-white/[0.07]">
            <i style={{ width: `${(mine / (mine + them || 1)) * 100}%`, background: a }} />
            <i className="flex-1" style={{ background: `color-mix(in srgb,${c} 65%,transparent)` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function SynergyDockMini({ synergies = [] }) {
  const rootRef = useRef(null);
  const [hover, setHover] = useState(null); // { id, left } — 마우스를 올린 조각
  const on = synergies.filter((s) => s.active);
  const next = synergies.filter((s) => !s.active && s.count > 0).sort((a, b) => (a.need - a.count) - (b.need - b.count)).slice(0, Math.max(0, 5 - on.length));
  const shown = [...on, ...next].slice(0, 5);
  const sum = {};
  for (const s of on) for (const [k, v] of Object.entries(s.bonus || {})) sum[k] = (sum[k] || 0) + v;
  const totals = Object.entries(sum).filter(([, v]) => v).slice(0, 3);
  const hv = hover && shown.find((s) => s.id === hover.id);
  /* 조각 가운데에 맞춰 정보창을 띄운다 (도크 밖으로 나가면 SynergyTip 이 안쪽으로 당긴다) */
  const show = (id, el) => {
    const box = rootRef.current;
    if (!box) return;
    const r = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    setHover({ id, left: r.left - b.left + r.width / 2 - 131 });
  };
  return (
    <div ref={rootRef} className="relative" onMouseLeave={() => setHover(null)}>
      <div className="flex shrink-0 items-center gap-2 pb-1">
        <b className="text-[12px] text-gray-300">시너지 {on.length}/{synergies.length}</b>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="flex shrink-0 gap-1.5">
        {shown.map((s) => (
          <span key={s.id} className="flex min-w-0 flex-1 cursor-default flex-col items-center gap-0.5"
            style={{ opacity: s.active ? 1 : 0.5 }}
            onMouseEnter={(e) => show(s.id, e.currentTarget)}>
            <SynIcon s={s} w={36} />
            <b className="w-full truncate text-center text-[10.5px] text-white">{s.name}</b>
            <span className="font-display text-[10px]" style={{ color: TIER[tierOf(s)].bd }}>{s.cur}/{s.need}</span>
          </span>
        ))}
        {!shown.length && <span className="text-[12px] text-gray-600">-</span>}
      </div>
      {!!totals.length && (
        <div className="mt-1.5 grid shrink-0 gap-1" style={{ gridTemplateColumns: `repeat(${totals.length},minmax(0,1fr))` }}>
          {totals.map(([k, v]) => (
            <div key={k} className="mt-cut flex items-baseline justify-between px-2 py-1" style={{ ...cut(5), background: 'rgba(255,255,255,.04)' }}>
              <span className="text-[11px] text-gray-400">{BONUS_KO[k] || k}</span>
              <b className="font-display text-[14px]" style={{ color: A.bat }}>+{v}</b>
            </div>
          ))}
        </div>
      )}
      {hv && <SynergyTip s={hv} up left={hover.left} />}
    </div>
  );
}

/** 왼쪽 — 다음 상대 스카우팅: 오늘 상대 선발 · 특징 · 수비 자리 · 타순 */
const SPOT = [[50, 13], [20, 27], [80, 27], [34, 47], [66, 47], [20, 68], [80, 68], [50, 88], [88, 88]];
const avg = (xs, f) => (xs.length ? xs.reduce((s, p) => s + f(p), 0) / xs.length : 0);

function ScoutPanel({ opponent, sums, myOvr }) {
  const ros = opponent.roster || [];
  const bats = ros.filter((p) => p.type === 'batter');
  const pits = [...ros.filter((p) => p.type === 'pitcher')].sort((a, b) => b.overall - a.overall);
  const ace = opponent.starter || pits[0];
  const lineup = (opponent.batters || [...bats].sort((a, b) => b.overall - a.overall)).slice(0, 9);
  const ovr = Math.round(avg(ros, (p) => p.overall));
  const c = opponent.color || '#60a5fa';
  const danger = new Map();
  [...bats].sort((a, b) => b.stats.power - a.stats.power).slice(0, 2).forEach((p) => danger.set(p.id, { t: '장타', c: '#f87171' }));
  [...bats].sort((a, b) => b.stats.speed - a.stats.speed).slice(0, 1).forEach((p) => { if (!danger.has(p.id)) danger.set(p.id, { t: '주루', c: '#fbbf24' }); });
  const tags = scoutTags(opponent);

  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2 p-4" style={{ ...cut(20), '--a': c }}>
      <p className="mt-lab" style={{ '--a': c }}>상대 분석</p>
      <div className="flex shrink-0 items-center gap-2.5">
        {opponent.emblem && <span className="block h-11 w-11 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${opponent.emblem})` }} />}
        <b className="min-w-0 flex-1 truncate text-[17px] font-black text-white">{opponent.name}</b>
        <b className="font-display text-[26px] font-extrabold leading-none" style={{ color: c }}>{ovr}</b>
      </div>

      {ace && (
        <div className="mt-cut relative shrink-0 overflow-hidden" style={{ height: 116, ...cut(12), background: '#0b1220' }}>
          <span className="absolute inset-0 bg-cover" style={{ backgroundPosition: '60% 12%', backgroundImage: `url(cards/${encodeURIComponent(artId(ace.id))}.webp), url(profiles/${encodeURIComponent(artId(ace.id))}.webp), url(ui/mt/silhouette-player.webp)` }} />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 22%,rgba(5,8,15,.45) 62%,rgba(5,8,15,0))' }} />
          <span className="absolute inset-y-2.5 left-3 flex flex-col justify-center">
            <span className="font-display text-[10px] tracking-[0.22em]" style={{ color: A.pit }}>오늘 상대 선발</span>
            <b className="flex items-baseline gap-1.5 text-[19px] font-black leading-tight text-white">
              {ace.name}
              {FORM_OF[ace.form]?.swing ? <em className="font-display text-[13px] font-extrabold not-italic" style={{ color: FORM_OF[ace.form].color }}>{FORM_OF[ace.form].mark} {FORM_OF[ace.form].ko}</em> : null}
            </b>
            <span className="mt-0.5 flex items-baseline gap-1.5">
              <b className="font-display text-[21px]" style={{ color: c }}>{ace.overall}</b>
              <small className="text-[10.5px] text-gray-400">구위 {ace.stats.stuff} · 제구 {ace.stats.control}</small>
            </span>
          </span>
        </div>
      )}

      <div className="flex shrink-0 gap-1">
        {tags.map((x) => (
          <span key={x.label} className="mt-cut min-w-0 flex-1 truncate px-1 py-[3px] text-center text-[10.5px] font-bold"
            style={{ ...cut(4), color: x.c, background: `color-mix(in srgb,${x.c} 16%,transparent)`, boxShadow: `inset 0 0 0 1px ${x.c}55` }}>{x.label}</span>
        ))}
      </div>

      <div className="mt-cut relative shrink-0 overflow-hidden bg-[#07130c] bg-cover" style={{ height: 176, ...cut(12), backgroundImage: 'url(ui/field.webp)', backgroundPosition: 'center 58%' }}>
        <span className="absolute inset-0" style={{ background: 'radial-gradient(75% 75% at 50% 55%,rgba(5,8,15,.08),rgba(5,8,15,.72))' }} />
        {lineup.map((p, i) => {
          const d = danger.get(p.id);
          return (
            <span key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-1 text-[10px] font-bold text-white"
              style={{ left: `${SPOT[i][0]}%`, top: `${SPOT[i][1]}%`, background: 'rgba(5,8,15,.76)', boxShadow: `inset 0 -2px 0 ${d ? d.c : posColor(p)}${d ? `, 0 0 0 1px ${d.c}88` : ''}` }}>
              {p.name}<b className="ml-1 font-display" style={{ color: d ? d.c : c }}>{p.overall}</b>
            </span>
          );
        })}
      </div>

      {sums && <VersusBar sums={sums} ovr={myOvr} opponent={opponent} />}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 pb-1">
          <b className="text-[12px] text-gray-300">타순 {lineup.length}</b>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-[3px]">
          {lineup.map((p, i) => {
            const d = danger.get(p.id);
            return (
              <div key={p.id} className="mt-cut flex flex-1 items-center gap-1.5 px-1.5"
                style={{ ...cut(5), background: d ? `color-mix(in srgb,${d.c} 14%,transparent)` : 'rgba(255,255,255,.035)', boxShadow: d ? `inset 0 0 0 1px ${d.c}55` : 'none' }}>
                <b className="w-3 text-center font-display text-[11px] text-gray-500">{i + 1}</b>
                <span className="shrink-0 px-[4px] font-display text-[10.5px] font-extrabold leading-[15px] text-[#05080f]" style={{ background: posColor(p) }}>{p.position}</span>
                <b className="min-w-0 flex-1 truncate text-[12.5px] text-white">{p.name}</b>
                {FORM_OF[p.form]?.swing ? <b className="shrink-0 font-display text-[10px] font-extrabold" style={{ color: FORM_OF[p.form].color }} title={`오늘 ${FORM_OF[p.form].ko}`}>{FORM_OF[p.form].mark}</b> : null}
                {d && <span className="font-display text-[10px]" style={{ color: d.c }}>{d.t}</span>}
                <b className="font-display text-[13px]" style={{ color: c }}>{p.overall}</b>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

/** 상대가 아직 없을 때(드래프트 직후) — 내 엔트리를 포지션별로 */
function RosterPanel({ squad, cap }) {
  const POS = [['SP', '선발'], ['RP', '불펜'], ['C', '포수'], ['1B', '1루수'], ['2B', '2루수'], ['3B', '3루수'], ['SS', '유격수'], ['OF', '외야수'], ['DH', '지명타자']];
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3 p-5" style={{ ...cut(20), '--a': A.main }}>
      <p className="mt-lab">선수 구성</p>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[24px] font-black text-white">내 엔트리</h2>
        <span className="font-display"><b className="text-[17px] text-emerald-400">{squad.length}</b><small className="text-[13px] text-gray-500">/{cap}</small></span>
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        {POS.map(([key, label]) => {
          const n = squad.filter((p) => p.position === key).length;
          return (
            <div key={key} className="flex h-8 items-center justify-between border-b border-white/[0.07] px-[5px]">
              <span className="text-[13px] text-gray-400">{label}</span>
              <b className="font-display text-[16px]" style={{ color: n ? posColor({ position: key }) : '#6b7280' }}>{n}</b>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/** 오른쪽 — 전략실: 팀 종합 · 세 갈래 · 경기 시작 */
/* 전략실 속 — 공격 · 마운드 · 수비에서 하나씩. 더보기를 펼치면 그 갈래의 성향 눈금이 나온다.
   접혀 있을 때도 지금 잡힌 세부가 한 줄로 보인다. */
function SideBlock({ sides, touched, onPick, onDial, opponent }) {
  const [open, setOpen] = useState(null);
  const reasons = sideReasons(opponent);
  const plan = planOfSides(sides, touched);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {SIDES.map((g) => {
        const on = open === g.key;
        const dials = g.dials.map((k) => FINE.find((f) => f.key === k)).filter(Boolean);
        return (
          <div key={g.key} className="flex shrink-0 flex-col gap-1.5">
            <button type="button" onClick={() => setOpen(on ? null : g.key)} className="flex items-baseline gap-2 text-left">
              <span className="font-display text-[10px] font-bold tracking-[0.26em]" style={{ color: g.color }}>{g.en.toUpperCase()}</span>
              <b className="text-[12.5px] text-gray-100">{g.ko}</b>
              <span className="h-px flex-1 bg-white/10" />
              <b className="text-[11px]" style={{ color: on ? g.color : '#7d8a9c' }}>{on ? '접기 ▴' : '더보기 ▾'}</b>
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              {g.opts.map((o) => {
                const pick = sides[g.key] === o.id;
                const why = reasons[o.id] || [];
                return (
                  <button key={o.id} type="button" onClick={() => onPick(g.key, o.id)}
                    className="mt-cut flex h-[2.9rem] flex-col justify-center gap-0.5 px-3 text-left"
                    style={{ ...cut(5), background: pick ? `color-mix(in srgb,${g.color} 20%,transparent)` : 'rgba(255,255,255,.04)',
                      boxShadow: `inset 0 0 0 ${pick ? 2 : 1}px ${pick ? g.color : 'rgba(255,255,255,.09)'}` }}>
                    <span className="flex items-center gap-1">
                      <b className="text-[13px]" style={{ color: pick ? '#fff' : '#cbd5e1' }}>{o.ko}</b>
                      {!!why.length && <b className="text-[9.5px]" style={{ color: A.syn }}>★</b>}
                    </span>
                    <small className="truncate text-[10px] text-gray-500">{why.length ? why[0].label : o.tip}</small>
                  </button>
                );
              })}
            </div>

            {on ? (
              <div className="mt-cut flex flex-col gap-3 p-3" style={{ ...cut(7), background: `color-mix(in srgb,${g.color} 7%,transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in srgb,${g.color} 22%,transparent)` }}>
                {dials.map((f) => (
                  <div key={f.key} className="flex flex-col gap-1.5">
                    <span className="flex items-baseline">
                      <small className="text-[11px] text-gray-400">{f.ko}</small>
                      <b className="ml-auto text-[13px] font-extrabold text-white">{plan.fine[f.key]}</b>
                    </span>
                    <span className="flex gap-1">
                      {f.opts.map((o) => (
                        <button key={o} type="button" onClick={() => onDial(f.key, o)} aria-label={`${f.ko} ${o}`}
                          className="h-[7px] flex-1" style={{ background: plan.fine[f.key] === o ? g.color : 'rgba(255,255,255,.1)' }} />
                      ))}
                    </span>
                    <span className="flex text-[10px] text-gray-500"><span>{f.opts[0]}</span><span className="ml-auto">{f.opts[f.opts.length - 1]}</span></span>
                  </div>
                ))}
              </div>
            ) : (
              /* 접혀 있어도 지금 무엇으로 잡혀 있는지는 보인다 */
              <button type="button" onClick={() => setOpen(g.key)}
                className="mt-cut flex h-[1.9rem] items-center gap-2 px-3 text-left"
                style={{ ...cut(4), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
                <small className="truncate text-[10.5px] text-gray-400">{g.dials.map((k) => plan.fine[k]).join(' · ')}</small>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* 전략실 판 — 수치 총합과 투수 휴식은 뺐다. 팀 종합 하나와 세 갈래, 그리고 경기 시작. */
function WarRoom({ team, autoFilled, onStart, startLabel, children, startBlock = null }) {
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2.5 p-5" style={{ ...cut(20), '--a': A.main }}>
      <div className="flex shrink-0 items-baseline gap-2.5">
        <p className="mt-lab">경기 준비</p>
        <span className="ml-auto flex items-baseline gap-1.5">
          <small className="text-[11px] text-gray-500">팀 종합</small>
          <b className="font-display text-[30px] font-extrabold leading-none" style={{ color: A.syn }}>{team.ovr}</b>
        </span>
      </div>
      {!!autoFilled && (
        <div className="mt-cut flex shrink-0 items-baseline justify-between px-3 py-1.5 text-[12px]" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
          <span className="text-gray-400">퓨처스 유망주</span><b className="font-display text-[14px] text-[#fcd34d]">{autoFilled}명</b>
        </div>
      )}
      {children}
      <div className="mt-auto flex shrink-0 flex-col gap-2">
        {startBlock && (
          <p className="mt-cut px-3 py-2 text-center text-[12.5px] font-bold text-[#f87171]"
            style={{ ...cut(8), background: 'rgba(248,113,113,.12)', boxShadow: 'inset 0 0 0 1px rgba(248,113,113,.45)' }}>{startBlock}</p>
        )}
        <Btn lg pri a={A.main} disabled={!!startBlock} style={{ ...cut(12), minHeight: '3.4rem', ...(startBlock ? { opacity: 0.45, pointerEvents: 'none' } : null) }} onClick={onStart}>{startLabel}</Btn>
      </div>
    </aside>
  );
}
export default function ReadyLocker({
  team, squad, bench, sums, synergies = [], opponent = null, autoFilled = 0, teamInfo,
  onCommit, onAutoLineup, onReset, onStart, onRestart, startLabel = '시즌 시작 ▶', restartLabel = '다시 드래프트', startBlock = null,
}) {
  const [sel, setSel] = useState(null);
  /* 전략실 — 세 갈래를 고르고, 손댄 눈금(touched)만 따로 기억한다 */
  const [sides, setSides] = useState(team.plan?.sides || DEFAULT_SIDES);
  const [touched, setTouched] = useState(team.plan?.touched || {});
  /* 갈래를 바꾸면 그 갈래의 눈금만 기본값으로 돌아간다 — 다른 갈래에서 만진 값은 남는다 */
  const pickSide = (key, id) => { setSides((v) => ({ ...v, [key]: id })); setTouched((t) => untouch(t, key)); };
  const byId = new Map(squad.map((p) => [p.id, p]));

  return (
    <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateColumns: '16.5rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>
      {/* 라커 문법(잘린 모서리 · 네온 테두리 · Saira 라벨) — 드래프트 화면에는 이 CSS 가 없어서 여기서 함께 올린다 */}
      <UiStyle />
      {opponent ? <ScoutPanel opponent={opponent} sums={sums} myOvr={teamInfo.ovr} /> : <RosterPanel squad={squad} cap={teamInfo.cap} />}

      <SquadBoard team={team} squad={squad} bench={bench} sel={sel} onSelect={setSel} onCommit={onCommit}
        onToggleBench={() => {}} fitSlots railW={264} footer={<SynergyDockMini synergies={synergies} />} />

      <WarRoom team={teamInfo} autoFilled={autoFilled}
        onStart={() => onStart({ ...planOfSides(sides, touched), touched })} startLabel={startLabel} startBlock={startBlock}>
        <SideBlock sides={sides} touched={touched} onPick={pickSide}
          onDial={(k, v) => setTouched((t) => ({ ...t, [k]: v }))} opponent={opponent} />
      </WarRoom>
    </div>
  );
}
