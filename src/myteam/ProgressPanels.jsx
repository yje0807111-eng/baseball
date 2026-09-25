/*
 * 기록 화면의 두 칸 — 선수 도감(dex.js) · 주간 과제(missions.js).
 * 기록 화면의 가운데 · 오른쪽 자리를 그대로 쓴다(왼쪽 사이드는 기록 화면 것).
 */
import React, { useMemo, useState } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { seriesName } from './aiTeam.js';
import { Btn, KV, Portrait, Stats } from './ui.jsx';
import { DEX_STEPS, seriesProgress, claimableSteps } from './dex.js';
import { missionState, weekKey, WEEK_BONUS, WEEK_COUNT } from './missions.js';
import { claimDex, claimMission, claimWeekBonus } from './store.js';

const cut = (n) => ({ '--c': `${n}px` });
const DEX = '#a3e635';
const WEEK = '#fbbf24';
/** 도감에 드는 시리즈 — 영입 풀과 같은 구단 시즌 · 레전드 */
const DEX_SERIES = SERIES.filter((s) => s.kind !== 'national');
const DEX_TOTAL = DEX_SERIES.reduce((n, s) => n + s.players.length, 0);

/** 단계 칩 6 · 12 · 18 — 닿으면 색, 받았으면 ✓ */
function StepChips({ prog, got }) {
  return (
    <span className="flex gap-1">
      {prog.steps.map((s) => {
        const taken = s.i < got;
        return (
          <b key={s.n} className="mt-cut px-1.5 font-display text-t4"
            style={{ ...cut(3), color: s.reached ? '#05080f' : '#6b7280', background: s.reached ? (taken ? '#4d7c0f' : DEX) : 'rgba(255,255,255,.06)' }}>
            {taken ? '✓' : ''}{s.n}
          </b>
        );
      })}
    </span>
  );
}

export function DexView({ account, onAccount }) {
  const owned = useMemo(() => new Set(account.dex || []), [account.dex]);
  const claimed = account.dexClaimed || {};
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(null);
  const rows = useMemo(() => {
    const kw = q.trim();
    return DEX_SERIES.map((s) => ({ s, name: seriesName(s), prog: seriesProgress(s, owned) }))
      .filter((r) => !kw || r.name.includes(kw))
      .sort((a, b) => b.prog.have - a.prog.have || a.name.localeCompare(b.name));
  }, [owned, q]);
  const have = DEX_SERIES.reduce((n, s) => n + s.players.filter((p) => owned.has(p.id)).length, 0);
  const done = DEX_SERIES.filter((s) => s.players.every((p) => owned.has(p.id))).length;
  const sel = pick ? rows.find((r) => r.s.id === pick) || null : rows[0] || null;
  const can = sel ? claimableSteps(sel.s, owned, claimed) : [];
  const take = () => { const next = sel && claimDex(sel.s); if (next) onAccount(next); };

  return (
    <>
      <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': DEX }}>
        <div className="flex items-baseline gap-3">
          <p className="mt-lab" style={{ '--a': DEX }}>시리즈 도감</p>
          <p className="ml-auto text-t3 text-gray-400">모은 선수 <b className="font-display text-t3 text-white">{have.toLocaleString()}</b> / {DEX_TOTAL.toLocaleString()} · 완성 <b className="font-display text-t3 text-white">{done}</b></p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="시리즈 이름 · 연도 · 구단 검색"
          className="mt-cut mt-3 w-full bg-transparent px-3 py-2.5 text-t3 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.16)] outline-none placeholder:text-gray-400/80 focus:shadow-[inset_0_0_0_1.5px_#a3e635]" style={cut(6)} />
        <div className="mt-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
          {rows.slice(0, 120).map((r) => {
            const on = sel?.s.id === r.s.id;
            const ready = claimableSteps(r.s, owned, claimed).length > 0;
            return (
              <button key={r.s.id} type="button" onClick={() => setPick(r.s.id)} className={`mt-row mt-cut ${on ? 'on' : ''}`}
                style={{ gridTemplateColumns: 'minmax(0,1fr) 220px 110px 52px', '--a': DEX }}>
                <b className="truncate text-t3 text-white">{r.name}</b>
                <span className="relative h-2 bg-white/[0.07]"><i className="absolute inset-y-0 left-0" style={{ width: `${(r.prog.have / r.prog.total) * 100}%`, background: DEX }} /></span>
                <StepChips prog={r.prog} got={claimed[r.s.id] || 0} />
                <b className="text-right font-display text-t3" style={{ color: ready ? DEX : '#9ca3af' }}>{r.prog.have}/{r.prog.total}</b>
              </button>
            );
          })}
          {rows.length > 120 && <p className="py-2 text-center text-t4 text-gray-400">검색으로 더 찾기 · {rows.length - 120}개</p>}
        </div>
      </section>

      <aside className="mt-cut mt-frame mt-glass mt-scroll flex min-h-0 flex-col gap-4 overflow-y-auto p-6" style={{ ...cut(20), '--a': DEX }}>
        <p className="mt-lab" style={{ '--a': DEX }}>시리즈 보상</p>
        {!sel ? <p className="text-t3 text-gray-400">시리즈 고르기</p> : (
          <>
            <h2 className="-mt-2 text-t1 font-black text-white">{sel.name}</h2>
            <Stats items={[['모은 선수', `${sel.prog.have}/${sel.prog.total}`], ...DEX_STEPS.map((s) => [`${s.n}명`, `${s.gold} G`])]} />
            <div className="grid grid-cols-3 gap-1.5">
              {sel.s.players.map((p) => {
                const got = owned.has(p.id);
                return (
                  <div key={p.id} className="mt-cut flex items-center gap-1.5 p-1.5" style={{ ...cut(5), background: got ? 'rgba(163,230,53,.1)' : 'rgba(255,255,255,.03)', opacity: got ? 1 : 0.45 }}>
                    <Portrait player={p} w={24} h={30} color={got ? DEX : '#334155'} />
                    <span className="min-w-0"><b className="block truncate text-t4 text-white">{p.name}</b><small className="font-display text-t4 text-gray-400">{p.position} · {p.overall}</small></span>
                  </div>
                );
              })}
            </div>
            <Btn pri a={DEX} className="mt-auto w-full" disabled={!can.length} onClick={take}>
              {can.length ? `보상 받기 · ${can.reduce((n, s) => n + s.gold, 0).toLocaleString()} G` : '받을 보상 없음'}
            </Btn>
          </>
        )}
      </aside>
    </>
  );
}

export function WeekView({ account, onAccount }) {
  const key = weekKey();
  const list = missionState(account.week, key);
  const allTaken = list.every((x) => x.claimed);
  const bonusTaken = account.week?.key === key && account.week?.bonus;
  const end = new Date(`${key}T00:00:00`);
  end.setDate(end.getDate() + 6); // 이번 주 일요일
  const next = new Date(`${key}T00:00:00`);
  next.setDate(next.getDate() + 7); // 다음 주 월요일 — 새 과제
  const take = (id) => { const next = claimMission(id); if (next) onAccount(next); };
  const bonus = () => { const next = claimWeekBonus(); if (next) onAccount(next); };
  const doneN = list.filter((x) => x.done).length;

  return (
    <>
      <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': WEEK }}>
        <div className="flex items-baseline gap-3">
          <p className="mt-lab" style={{ '--a': WEEK }}>이번 주 과제</p>
          <p className="ml-auto text-t3 text-gray-400">{Number(key.slice(5, 7))}월 {Number(key.slice(8))}일 ~ {end.getMonth() + 1}월 {end.getDate()}일</p>
        </div>
        <div className="mt-4 grid gap-3" style={{ gridTemplateRows: `repeat(${WEEK_COUNT}, auto)` }}>
          {list.map(({ m, n, done, claimed }) => (
            <div key={m.id} className="mt-cut grid items-center gap-5 p-5" style={{ ...cut(12), gridTemplateColumns: 'minmax(0,1fr) 260px 170px',
              background: done ? 'linear-gradient(90deg,rgba(251,191,36,.14),rgba(255,255,255,.03))' : 'rgba(255,255,255,.04)', boxShadow: done && !claimed ? `inset 0 0 0 1px ${WEEK}` : undefined }}>
              <span className="min-w-0">
                <b className="block truncate text-t2 font-black text-white">{m.ko}</b>
                <small className="font-display text-t3 text-amber-300">{m.gold} G</small>
              </span>
              <span>
                <span className="flex justify-between text-t4 text-gray-400"><span>진행</span><b className="font-display text-t3 text-white">{n} / {m.goal}</b></span>
                <span className="relative mt-1.5 block h-2 bg-white/[0.07]"><i className="absolute inset-y-0 left-0" style={{ width: `${(n / m.goal) * 100}%`, background: WEEK }} /></span>
              </span>
              <Btn pri={done && !claimed} a={WEEK} disabled={!done || claimed} onClick={() => take(m.id)}>{claimed ? '받음 ✓' : done ? '받기' : '진행 중'}</Btn>
            </div>
          ))}
        </div>
      </section>

      <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={{ ...cut(20), '--a': WEEK }}>
        <p className="mt-lab" style={{ '--a': WEEK }}>주간 보너스</p>
        <h2 className="-mt-2 text-t1 font-black text-white">{WEEK_BONUS} G</h2>
        <Stats items={[['끝낸 과제', `${doneN}/${WEEK_COUNT}`], ['받은 과제', `${list.filter((x) => x.claimed).length}/${WEEK_COUNT}`]]} />
        <div>
          <KV k="새 과제" v={`${next.getMonth() + 1}월 ${next.getDate()}일`} />
          <KV k="과제 보상 합" v={`${list.reduce((s, x) => s + x.m.gold, 0).toLocaleString()} G`} color={WEEK} />
        </div>
        <Btn pri={allTaken && !bonusTaken} a={WEEK} className="mt-auto w-full" disabled={!allTaken || bonusTaken} onClick={bonus}>
          {bonusTaken ? '보너스 받음 ✓' : allTaken ? `보너스 받기 · ${WEEK_BONUS} G` : `과제 ${WEEK_COUNT}개를 받으면 열림`}
        </Btn>
      </aside>
    </>
  );
}
