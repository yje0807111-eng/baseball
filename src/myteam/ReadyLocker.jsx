/*
 * 경기 준비 화면 — 세 칸, 칸마다 판단에 필요한 것만.
 *  왼쪽: 오늘 상대(선발 · 경계 타자 · 전력 비교, 타순은 단추로) · 가운데: 라인업(구장 + 타순 + 시너지, 투수진 · 벤치는 단추로)
 *  · 오른쪽: 작전(세 갈래 · 준비 카드 · 경기 시작)
 * 자리·타순 바꾸기는 SquadBoard 가 하고, 이 판은 바뀐 결과(order)를 그대로 위로 올린다.
 */
import React, { useRef, useState } from 'react';
import SquadBoard from './SquadBoard.jsx';
import { SynergyTip } from '../KboAugmentDraft.jsx';
import { SIDES, DEFAULT_SIDES, planOfSides, sideReasons, scoutTags } from './strategy.js';
import { Btn, UiStyle } from './ui.jsx';
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
const Sub = ({ children }) => <span className="text-t4 text-gray-400">{children}</span>;

/** 상대 전력 합계 — 타순 9명 · 수비 8자리 · 투수 8명 */
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
  };
};
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

/** 전력 비교 — 우리 · 막대 · 상대. 앞선 쪽만 제 색 */
function Versus({ sums, opponent, c }) {
  const foe = foeSums(opponent);
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
function ScoutPanel({ opponent, sums, onLineup }) {
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
        </div>
      )}
      <Rule />
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
      {sums && <Versus sums={sums} opponent={opponent} c={c} />}
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65" onClick={onClose}>
      <div className="mt-cut mt-frame mt-glass flex w-[520px] flex-col gap-4 p-7" style={{ ...cut(18), '--a': c }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-label="상대 타순">
        <div>
          <p className="mt-lab" style={{ '--a': c }}>상대 타순</p>
          <h2 className="mt-1 text-t1 font-black text-white">{opponent.name}</h2>
          <p className="mt-1 text-t3 text-gray-400">{scoutTags(opponent).map((t) => t.label).join(' · ')}</p>
        </div>
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
        <Btn pri onClick={onClose}>닫기</Btn>
      </div>
    </div>
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

/** 작전 — 공격 · 마운드 · 수비에서 하나씩. ★ 는 오늘 상대에 맞는 갈래(이유는 마우스를 올리면).
 *  경기 중에는 공수 교대 때만, 경기당 몇 번만 바꿀 수 있으니 여기서 고르는 것이 기본 계획이다 */
function SideBlock({ sides, onPick, opponent }) {
  const reasons = sideReasons(opponent);
  return (
    <div className="flex shrink-0 flex-col gap-5">
      {SIDES.map((g) => (
        <div key={g.key} className="flex flex-col gap-2">
          <Sub>{g.ko}</Sub>
          <div className="grid grid-cols-2 gap-1">
            {g.opts.map((o) => {
              const pick = sides[g.key] === o.id;
              const why = reasons[o.id] || [];
              return (
                <button key={o.id} type="button" onClick={() => onPick(g.key, o.id)} aria-pressed={pick}
                  title={why.length ? why.map((w) => w.label).join(' · ') : o.tip}
                  className="mt-cut relative h-11 text-t3 font-bold" style={{ ...pickStyle(pick), color: pick ? '#fff' : '#9ca3af' }}>
                  {o.ko}
                  {!!why.length && <b className="absolute right-1.5 top-0.5 text-t4" style={{ color: WARN }}>★</b>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 오른쪽 — 작전: 팀 종합 · 세 갈래 · 준비 카드 · 경기 시작 */
function WarRoom({ team, autoFilled, onStart, startLabel, children, startBlock = null }) {
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
          <span className="text-gray-400">퓨처스 유망주</span><b className="font-display text-t2" style={{ color: WARN }}>{autoFilled}명</b>
        </div>
      )}
      {children}
      <div className="mt-auto flex shrink-0 flex-col gap-2">
        {startBlock && (
          <p className="mt-cut px-3 py-2 text-center text-t3 font-bold text-[#f87171]"
            style={{ ...cut(8), background: 'rgba(248,113,113,.12)', boxShadow: 'inset 0 0 0 1px rgba(248,113,113,.45)' }}>{startBlock}</p>
        )}
        <Btn lg pri a={US} disabled={!!startBlock} style={{ ...cut(12), minHeight: '4rem', ...(startBlock ? { opacity: 0.45, pointerEvents: 'none' } : null) }} onClick={onStart}>{startLabel}</Btn>
      </div>
    </aside>
  );
}

export default function ReadyLocker({
  team, squad, bench, sums, synergies = [], opponent = null, autoFilled = 0, teamInfo,
  onCommit, onStart, startLabel = '시즌 시작 ▶', startBlock = null,
  cards = null, // 준비 카드 [{ id, name, effect, n }] — 내 팀 경기에서만 넘긴다
}) {
  const [sel, setSel] = useState(null);
  /* 작전 — 세 갈래. 고른 계획은 경기의 첫 전술이 된다 */
  const [sides, setSides] = useState(team.plan?.sides || DEFAULT_SIDES);
  const pickSide = (key, id) => setSides((v) => ({ ...v, [key]: id }));
  const [card, setCard] = useState(null); // 이번 경기에 쓸 준비 카드 id
  const [foeOpen, setFoeOpen] = useState(false); // 상대 타순 창

  return (
    <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr) 420px', gridTemplateRows: 'minmax(0,1fr)' }}>
      {/* 라커 문법(잘린 모서리 · 네온 테두리 · 라벨) — 드래프트 화면에는 이 CSS 가 없어서 여기서 함께 올린다 */}
      <UiStyle />
      {opponent ? <ScoutPanel opponent={opponent} sums={sums} onLineup={() => setFoeOpen(true)} /> : <RosterPanel squad={squad} cap={teamInfo.cap} />}
      {foeOpen && opponent && <FoeLineup opponent={opponent} onClose={() => setFoeOpen(false)} />}

      <SquadBoard team={team} squad={squad} bench={bench} sel={sel} onSelect={setSel} onCommit={onCommit}
        onToggleBench={() => {}} fitSlots compact railW={264} footer={<SynergyRow synergies={synergies} />} />

      <WarRoom team={teamInfo} autoFilled={autoFilled}
        onStart={() => onStart(planOfSides(sides), card)} startLabel={startLabel} startBlock={startBlock}>
        <SideBlock sides={sides} onPick={pickSide} opponent={opponent} />
        {cards && <CardBlock cards={cards} value={card} onPick={setCard} />}
      </WarRoom>
    </div>
  );
}
