/*
 * 기록 화면의 세 칸 — 선수 기록(career.js) · 선수 도감(dex.js) · 주간 과제(missions.js).
 * 기록 화면의 가운데 · 오른쪽 자리를 그대로 쓴다(왼쪽 사이드는 기록 화면 것).
 */
import React, { useMemo, useState } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { seriesName } from './aiTeam.js';
import { Btn, KV, Portrait, Stats } from './ui.jsx';
import { DEX_STEPS, seriesProgress, claimableSteps } from './dex.js';
import { missionState, weekKey, WEEK_COUNT, rewardKo, BONUS_KO } from './missions.js';
import { claimDex, claimMission, claimWeekBonus } from './store.js';
import { GrowBar, Burst } from '../ui/motion.jsx';
import { careerOf, avgOf, raOf, ipOf, fmtAvg, fmtRa, QUAL_AB, QUAL_OUTS } from './career.js';

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
  const [took, setTook] = useState(null); // 방금 받은 과제(도장) · 'bonus'
  const take = (id) => { const next = claimMission(id); if (next) { onAccount(next); setTook(id); } };
  const bonus = () => { const next = claimWeekBonus(); if (next) { onAccount(next); setTook('bonus'); } };
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
            <div key={m.id} className="mt-cut relative grid items-center gap-5 p-5" style={{ ...cut(12), gridTemplateColumns: 'minmax(0,1fr) 260px 170px',
              background: done ? 'linear-gradient(90deg,rgba(251,191,36,.14),rgba(255,255,255,.03))' : 'rgba(255,255,255,.04)', boxShadow: done && !claimed ? `inset 0 0 0 1px ${WEEK}` : undefined }}>
              <span className="min-w-0">
                <b className="block truncate text-t2 font-black text-white">{m.ko}</b>
                <small className="font-display text-t3 text-amber-300">{rewardKo(m)}</small>
              </span>
              <span>
                <span className="flex justify-between text-t4 text-gray-400"><span>진행</span><b className="font-display text-t3 text-white">{n} / {m.goal}</b></span>
                <span className="relative mt-1.5 block h-2 bg-white/[0.07]"><GrowBar k={`week:${m.id}`} pct={(n / m.goal) * 100} className="absolute inset-y-0 left-0" style={{ background: WEEK }} /></span>
              </span>
              <span className="relative grid">
                <Btn pri={done && !claimed} a={WEEK} disabled={!done || claimed} onClick={() => take(m.id)}>{claimed ? '받음 ✓' : done ? '받기' : '진행 중'}</Btn>
                {took === m.id && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center">
                    <b className="fx-stamp -rotate-6 rounded-md px-3 py-0.5 font-display text-t2 font-extrabold" style={{ '--d': '40ms', color: '#1c1203', background: 'linear-gradient(180deg,#fde68a,#e3b24a)', boxShadow: '0 0 24px rgba(245,210,122,.7)' }}>+{rewardKo(m)}</b>
                    <Burst n={14} spread={90} size={5} delay={160} sfx="rewardS" />
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={{ ...cut(20), '--a': WEEK }}>
        <p className="mt-lab" style={{ '--a': WEEK }}>주간 보너스</p>
        <h2 className="relative -mt-2 text-t1 font-black text-white">
          <span key={took === 'bonus' ? 'b' : 'n'} className={`inline-block ${took === 'bonus' ? 'fx-stamp' : ''}`}>{BONUS_KO}</span>
          {took === 'bonus' && <Burst n={22} spread={140} delay={200} sfx="rewardS" />}
        </h2>
        <Stats items={[['끝낸 과제', `${doneN}/${WEEK_COUNT}`], ['받은 과제', `${list.filter((x) => x.claimed).length}/${WEEK_COUNT}`]]} />
        <div>
          <KV k="새 과제" v={`${next.getMonth() + 1}월 ${next.getDate()}일`} />
          <KV k="과제 보상 합" v={rewardKo({ gold: list.reduce((s, x) => s + (x.m.gold || 0), 0), ticket: list.reduce((s, x) => s + (x.m.ticket || 0), 0) })} color={WEEK} />
        </div>
        <Btn pri={allTaken && !bonusTaken} a={WEEK} className="mt-auto w-full" disabled={!allTaken || bonusTaken} onClick={bonus}>
          {bonusTaken ? '보너스 받음 ✓' : allTaken ? `보너스 받기 · ${BONUS_KO}` : `잠김 · 과제 ${WEEK_COUNT}개 받기`}
        </Btn>
      </aside>
    </>
  );
}

/*
 * 선수 기록 — 통산(career.js)을 타자 · 투수 표로. 머리글을 누르면 그 칸으로 정렬(컴프야 · FC 온라인 데이터센터의 선수 기록).
 * 타율 · 평균실점은 규정(타수 · 아웃)에 못 미치면 흐리게 · 정렬에서 뒤로 — 몇 타석으로 1위가 되지 않게.
 * 오른쪽은 부문 1위. 지금 팀(엔트리 · 보관함)에 없는 선수는 줄을 흐리게.
 */
const PL = '#38bdf8';
const BAT_COLS = [['g', '경기'], ['ab', '타수'], ['h', '안타'], ['hr', '홈런'], ['rbi', '타점'], ['bb', '볼넷'], ['k', '삼진'], ['avg', '타율']];
const ARM_COLS = [['g', '경기'], ['o', '이닝'], ['bf', '타자'], ['h', '피안타'], ['k', '삼진'], ['bb', '볼넷'], ['r', '실점'], ['ra', '평균실점']];
export function PlayersView({ account }) {
  const career = useMemo(() => careerOf(account), [account]);
  const [side, setSide] = useState('bat');
  const [sort, setSort] = useState({ bat: 'avg', arm: 'ra' });
  const mine = useMemo(() => new Set([...(account.team?.squad || []), ...(account.team?.club || [])].map((p) => p.id)), [account]);
  const qAb = QUAL_AB(career.games);
  const qO = QUAL_OUTS(career.games);
  const bat = Object.entries(career.bat).map(([id, s]) => ({ id, ...s, avg: avgOf(s), q: s.ab >= qAb }));
  const arm = Object.entries(career.arm).map(([id, s]) => ({ id, ...s, ra: raOf(s), q: s.o >= qO }));
  const key = sort[side];
  /* 비율 칸(타율 · 평균실점)은 규정을 채운 선수가 먼저, 평균실점은 낮을수록 위 */
  const by = (a, b) => {
    if (key === 'avg' || key === 'ra') {
      if (a.q !== b.q) return a.q ? -1 : 1;
      const x = a[key] ?? (key === 'ra' ? Infinity : -1);
      const y = b[key] ?? (key === 'ra' ? Infinity : -1);
      return key === 'ra' ? x - y : y - x;
    }
    return (b[key] || 0) - (a[key] || 0);
  };
  const rows = (side === 'bat' ? bat : arm).sort(by);
  const cols = side === 'bat' ? BAT_COLS : ARM_COLS;
  const grid = `28px 32px minmax(0,1fr) repeat(${cols.length - 1},64px) 84px`;
  const cell = (r, k) => {
    if (k === 'avg') return <b className="text-right font-display text-t2" style={{ color: r.q ? '#fff' : '#6b7280' }}>{fmtAvg(r.avg)}</b>;
    if (k === 'ra') return <b className="text-right font-display text-t2" style={{ color: r.q ? '#fff' : '#6b7280' }}>{fmtRa(r.ra)}</b>;
    if (k === 'o') return <span className="text-center font-display text-t2 text-gray-200">{r.o ? ipOf(r.o) : '—'}</span>;
    return <span className="text-center font-display text-t2" style={{ color: r[k] ? '#e5e7eb' : '#4b5563' }}>{r[k] || 0}</span>;
  };
  /* 부문 1위 — 비율은 규정 채운 선수 중에서 */
  const top = (list, k, { low = false, need = false } = {}) => {
    const pool = list.filter((r) => (need ? r.q : true) && r[k] != null && (low || r[k] > 0));
    return [...pool].sort((a, b) => (low ? a[k] - b[k] : b[k] - a[k]))[0] || null;
  };
  const leaders = [
    ['타율', top(bat, 'avg', { need: true }), (r) => fmtAvg(r.avg)],
    ['홈런', top(bat, 'hr'), (r) => r.hr],
    ['타점', top(bat, 'rbi'), (r) => r.rbi],
    ['탈삼진', top(arm, 'k'), (r) => r.k],
    ['평균실점', top(arm, 'ra', { low: true, need: true }), (r) => fmtRa(r.ra)],
    ['이닝', top(arm, 'o'), (r) => ipOf(r.o)],
  ];
  return (
    <>
      <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': PL }}>
        <div className="flex items-center gap-3">
          <p className="mt-lab" style={{ '--a': PL }}>선수 기록</p>
          <span className="flex gap-1.5">
            {[['bat', `타자 ${bat.length}`], ['arm', `투수 ${arm.length}`]].map(([k, label]) => (
              <button key={k} type="button" aria-pressed={side === k} onClick={() => setSide(k)} className="mt-cut h-8 px-3.5 text-t3 font-bold"
                style={{ ...cut(8), color: side === k ? '#04121c' : '#9ca3af', background: side === k ? PL : 'rgba(255,255,255,.05)' }}>{label}</button>
            ))}
          </span>
          <p className="ml-auto text-t3 text-gray-400">통산 <b className="font-display text-t3 text-white">{career.games}</b>경기 · 규정 {side === 'bat' ? `${qAb}타수` : `${ipOf(qO)}이닝`}</p>
        </div>
        <div className="mt-3 grid items-end gap-2 border-b border-white/10 pb-1.5 text-t4 text-gray-400" style={{ gridTemplateColumns: grid }}>
          <span /><span /><span>선수</span>
          {cols.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setSort((s) => ({ ...s, [side]: k }))} aria-pressed={key === k}
              className={`${k === 'avg' || k === 'ra' ? 'text-right' : 'text-center'} font-bold hover:text-white`} style={{ color: key === k ? PL : undefined }}>
              {label}{key === k ? (k === 'ra' ? ' ▲' : ' ▼') : ''}
            </button>
          ))}
        </div>
        <div className="mt-scroll flex min-h-0 flex-1 flex-col overflow-y-auto pr-2">
          {rows.length === 0 && <p className="py-10 text-center text-t3 text-gray-400">{career.games ? '상세 기록이 남은 경기 없음' : '치른 경기 없음'}</p>}
          {rows.map((r, i) => (
            <div key={r.id} className="grid items-center gap-2 border-b border-white/[0.06] py-1.5" style={{ gridTemplateColumns: grid, opacity: mine.has(r.id) ? 1 : 0.5 }}
              title={mine.has(r.id) ? '' : '지금 팀에 없는 선수'}>
              <b className="font-display text-t3 text-gray-400">{i + 1}</b>
              <Portrait player={r} w={30} h={36} color={PL} />
              <b className="min-w-0 truncate text-t3 text-white">{r.name}</b>
              {cols.map(([k]) => <React.Fragment key={k}>{cell(r, k)}</React.Fragment>)}
            </div>
          ))}
        </div>
      </section>

      <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3 p-6" style={{ ...cut(20), '--a': PL }}>
        <p className="mt-lab" style={{ '--a': PL }}>부문 1위</p>
        {leaders.map(([label, r, v]) => (
          <div key={label} className="grid items-center gap-3 border-b border-white/10 pb-2.5" style={{ gridTemplateColumns: '64px 34px minmax(0,1fr) auto' }}>
            <span className="text-t4 font-bold text-gray-400">{label}</span>
            {r ? <Portrait player={r} w={34} h={42} color={PL} /> : <span />}
            <b className="min-w-0 truncate text-t3 text-white">{r ? r.name : '—'}</b>
            <b className="font-display text-t1" style={{ color: r ? PL : '#4b5563' }}>{r ? v(r) : '—'}</b>
          </div>
        ))}
        <Stats items={[['통산', `${career.games}경기`], ['승', career.wins], ['승률', career.games ? `${Math.round((career.wins / career.games) * 100)}%` : '—']]} />
      </aside>
    </>
  );
}
