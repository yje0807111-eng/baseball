/*
 * 정비 화면 — 내 라커의 MY SQUAD 판을 그대로 쓴다.
 *  왼쪽: 다음 상대 스카우팅(상대가 정해졌을 때) · 가운데: 구장 + 타순 + 선발 · 불펜 · 벤치 · 시너지 · 오른쪽: 정비(합계 · 팀 · 투수 휴식 · 버튼)
 * 자리·타순 바꾸기는 SquadBoard 가 하고, 이 판은 바뀐 결과(order)를 그대로 위로 올린다.
 */
import React, { useState } from 'react';
import SquadBoard from './SquadBoard.jsx';
import GamePlan from './GamePlan.jsx';
import { BASE, PRESETS, DEFAULT_PLAN, planOf, scoutTags, recommend } from './strategy.js';
import { Btn, UiStyle } from './ui.jsx';
import { posColor } from './teamColor.js';

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

const SynIcon = ({ s, w = 38 }) => {
  const t = TIER[tierOf(s)];
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: w, height: Math.round(w * 0.87), background: t.bd, clipPath: HEX }}>
      <span className="absolute" style={{ inset: '2px 2.3px', background: t.fr, clipPath: HEX }} />
      <i className="relative block" style={{ width: '58%', height: '66%', background: t.gc, WebkitMaskImage: `url(ui/synergy/${s.id}.png)`, maskImage: `url(ui/synergy/${s.id}.png)`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
    </span>
  );
};

/** 시너지 도크 — 아이콘 한 줄 + 받은 보너스 합계 */
function SynergyDockMini({ synergies = [] }) {
  const on = synergies.filter((s) => s.active);
  const next = synergies.filter((s) => !s.active && s.count > 0).sort((a, b) => (a.need - a.count) - (b.need - b.count)).slice(0, Math.max(0, 5 - on.length));
  const shown = [...on, ...next].slice(0, 5);
  const sum = {};
  for (const s of on) for (const [k, v] of Object.entries(s.bonus || {})) sum[k] = (sum[k] || 0) + v;
  const totals = Object.entries(sum).filter(([, v]) => v).slice(0, 3);
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 pb-1">
        <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: A.syn }}>SYNERGY</span>
        <b className="text-[12px] text-gray-300">시너지 {on.length}/{synergies.length}</b>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="flex shrink-0 gap-1.5">
        {shown.map((s) => (
          <span key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-0.5" style={{ opacity: s.active ? 1 : 0.5 }} title={`${s.name} · ${s.effect}`}>
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
    </>
  );
}

/** 왼쪽 — 다음 상대 스카우팅: 오늘 상대 선발 · 특징 · 수비 자리 · 타순 */
const SPOT = [[50, 13], [20, 27], [80, 27], [34, 47], [66, 47], [20, 68], [80, 68], [50, 88], [88, 88]];
const avg = (xs, f) => (xs.length ? xs.reduce((s, p) => s + f(p), 0) / xs.length : 0);

function ScoutPanel({ opponent }) {
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
      <p className="mt-lab" style={{ '--a': c }}>Scouting</p>
      <div className="flex shrink-0 items-center gap-2.5">
        {opponent.emblem && <span className="block h-11 w-11 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${opponent.emblem})` }} />}
        <b className="min-w-0 flex-1 truncate text-[17px] font-black text-white">{opponent.name}</b>
        <b className="font-display text-[26px] font-extrabold leading-none" style={{ color: c }}>{ovr}</b>
      </div>

      {ace && (
        <div className="mt-cut relative shrink-0 overflow-hidden" style={{ height: 116, ...cut(12), background: '#0b1220' }}>
          <span className="absolute inset-0 bg-cover" style={{ backgroundPosition: '60% 12%', backgroundImage: `url(cards/${encodeURIComponent(ace.id)}.webp), url(profiles/${encodeURIComponent(ace.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 22%,rgba(5,8,15,.45) 62%,rgba(5,8,15,0))' }} />
          <span className="absolute inset-y-2.5 left-3 flex flex-col justify-center">
            <span className="font-display text-[10px] tracking-[0.22em]" style={{ color: A.pit }}>오늘 상대 선발</span>
            <b className="text-[19px] font-black leading-tight text-white">{ace.name}</b>
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

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 pb-1">
          <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: A.bat }}>LINEUP</span>
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
      <p className="mt-lab">Roster</p>
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

const Delta = ({ v }) => (
  <em className={`font-display text-[12px] not-italic ${v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-gray-500'}`}>{v > 0 ? '+' : ''}{v}</em>
);

/** 오른쪽 — 정비: 합계 셋 · 팀 요약 · 투수 휴식 · 버튼 */
/** 전략 구역 — 프리셋 넷, 기본 세 줄, ⚙ 세부 작전 */
function StrategyBlock({ plan, setPlan, onOpen, canOpen }) {
  const pick = (id) => setPlan(planOf(id));
  const setBase = (k, v) => setPlan((o) => ({ ...o, preset: 'custom', base: { ...o.base, [k]: v } }));
  return (
    <div className="shrink-0">
      <p className="mt-lab pb-1" style={{ '--a': A.syn, fontSize: 10 }}>Strategy</p>
      <div className="grid gap-1.5">
        <span className="flex gap-1">
          {[...PRESETS, { id: 'custom', ko: '맞춤', color: A.syn }].map((p) => {
            const on = plan.preset === p.id;
            return (
              <button key={p.id} type="button" disabled={p.id === 'custom'} onClick={() => pick(p.id)}
                className="mt-cut flex-1 py-1.5 text-[11.5px] font-extrabold disabled:cursor-default"
                style={{ ...cut(5), background: on ? `color-mix(in srgb,${p.color} 18%,transparent)` : 'rgba(255,255,255,.05)',
                  boxShadow: `inset 0 0 0 1px ${on ? p.color : 'rgba(255,255,255,.1)'}`, color: on ? p.color : '#94a3b8' }}>{p.ko}</button>
            );
          })}
        </span>
        {BASE.map((b) => (
          <span key={b.key} className="flex items-center gap-2">
            <small className="w-9 shrink-0 text-[11.5px] text-[#8b97a6]">{b.ko}</small>
            <span className="flex flex-1 gap-1">
              {b.opts.map((o) => {
                const on = plan.base[b.key] === o;
                return (
                  <button key={o} type="button" onClick={() => setBase(b.key, o)} className="mt-cut flex-1 py-1.5 text-[11.5px] font-bold"
                    style={{ ...cut(4), background: on ? `color-mix(in srgb,${b.color} 20%,transparent)` : 'rgba(255,255,255,.05)',
                      boxShadow: `inset 0 0 0 1px ${on ? b.color : 'rgba(255,255,255,.1)'}`, color: on ? b.color : '#94a3b8' }}>{o}</button>
                );
              })}
            </span>
          </span>
        ))}
        <button type="button" onClick={onOpen} disabled={!canOpen}
          className="mt-cut py-1.5 text-[11.5px] font-bold disabled:opacity-40"
          style={{ ...cut(5), background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)', color: '#a8b3c1' }}>
          ⚙ 세부 작전 손보기
        </button>
      </div>
    </div>
  );
}

function TunePanel({ sums, deltas, team, rest, autoFilled, onStart, startLabel, strategy }) {
  const TOT = [['타자', sums.bat, deltas.bat, A.bat], ['수비', sums.def, deltas.def, A.def], ['투수', sums.pit, deltas.pit, A.pit]];
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2.5 p-5" style={{ ...cut(20), '--a': A.main }}>
      <p className="mt-lab">Tune Up</p>
      <h2 className="-mt-1 text-[26px] font-black text-white">정비</h2>
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        {TOT.map(([t, v, d, a]) => (
          <div key={t} className="mt-cut flex flex-col items-center gap-0.5 py-3" style={{ ...cut(8), background: `linear-gradient(180deg,color-mix(in srgb,${a} 14%,transparent),rgba(6,10,19,.4))` }}>
            <span className="font-display text-[10px] tracking-[0.18em] text-gray-400">{t}</span>
            <b className="font-display text-[26px] font-extrabold leading-none" style={{ color: a }}>{v}</b>
            <Delta v={d} />
          </div>
        ))}
      </div>
      <div className="mt-cut shrink-0 px-3 py-1.5" style={{ ...cut(10), background: 'rgba(255,255,255,.04)' }}>
        {[['팀 종합', team.ovr], ['엔트리', `${team.count} / ${team.cap}명`], ['외국인', team.foreign != null ? `${team.foreign} / 3` : '-'],
          ...(autoFilled ? [['퓨처스 유망주', `${autoFilled}명`, '#fcd34d']] : [])].map(([k, v, c]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-white/[0.07] py-1.5 text-[12.5px] text-gray-400 last:border-0">
              <span>{k}</span><b className="font-display text-[15px]" style={{ color: c || '#fff' }}>{v}</b>
            </div>
        ))}
      </div>
      {strategy}
      {!!rest.length && (
        <div className="shrink-0">
          <p className="mt-lab pb-1" style={{ '--a': A.pit, fontSize: 10 }}>Rest</p>
          <div className="flex gap-1.5">
            {rest.map((r) => (
              <div key={r.label} className="mt-cut flex flex-1 flex-col items-center py-1.5" style={{ ...cut(6), background: 'rgba(255,255,255,.04)' }}>
                <span className="truncate text-[11px] text-gray-400">{r.label}</span>
                <b className="font-display text-[15px]" style={{ color: r.rest <= 0 ? '#34d399' : r.rest === 1 ? '#a3e635' : '#fbbf24' }}>{r.rest <= 0 ? '준비됨' : `−${r.rest}`}</b>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto flex flex-col gap-2">
        <Btn lg pri a={A.main} style={{ ...cut(12), minHeight: '3.4rem' }} onClick={onStart}>{startLabel}</Btn>
      </div>
    </aside>
  );
}

export default function ReadyLocker({
  team, squad, bench, sums, deltas, synergies = [], opponent = null, autoFilled = 0, teamInfo,
  onCommit, onAutoLineup, onReset, onStart, onRestart, startLabel = '시즌 시작 ▶', restartLabel = '다시 드래프트',
}) {
  const [sel, setSel] = useState(null);
  /* 경기 전 작전 — 프리셋 · 기본 세 줄 · 세부 여덟. 작전판은 ⚙ 로 연다 */
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [planOpen, setPlanOpen] = useState(false);
  const setFine = (k, v) => setPlan((o) => ({ ...o, preset: 'custom', fine: { ...o.fine, [k]: v } }));
  const applyRec = () => setPlan((o) => ({ ...o, preset: 'custom', fine: { ...o.fine, ...recommend(opponent) } }));
  const byId = new Map(squad.map((p) => [p.id, p]));
  const rest = [...(team.order?.rotation || []).slice(0, 1), ...(team.order?.bullpen || []).slice(0, 2)]
    .map((id) => byId.get(id)).filter((p) => p && p.rest != null)
    .map((p, i) => ({ label: i === 0 ? '선발' : `불펜${i}`, rest: p.rest || 0 }));

  return (
    <div className="grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>
      {/* 라커 문법(잘린 모서리 · 네온 테두리 · Saira 라벨) — 드래프트 화면에는 이 CSS 가 없어서 여기서 함께 올린다 */}
      <UiStyle />
      {opponent ? <ScoutPanel opponent={opponent} /> : <RosterPanel squad={squad} cap={teamInfo.cap} />}

      <SquadBoard team={team} squad={squad} bench={bench} sel={sel} onSelect={setSel} onCommit={onCommit}
        onToggleBench={() => {}} fitSlots footer={<SynergyDockMini synergies={synergies} />} />

      <TunePanel sums={sums} deltas={deltas} team={teamInfo} rest={rest} autoFilled={autoFilled}
        onStart={() => onStart(plan)} startLabel={startLabel}
        strategy={<StrategyBlock plan={plan} setPlan={setPlan} canOpen={!!opponent} onOpen={() => setPlanOpen(true)} />} />
      {planOpen && opponent && (
        <GamePlan opponent={opponent} plan={plan} onFine={setFine} onApply={applyRec} onClose={() => setPlanOpen(false)} />
      )}
    </div>
  );
}
