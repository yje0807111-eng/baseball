/*
 * 랭크전 시즌 화면 (전체 화면) — 왼쪽: 10팀 순위표 · 최근 라운드 결과 · 포스트시즌 사다리 / 오른쪽: 다음 내 경기 분석 또는 시즌 결과.
 * 경기가 끝나면 여기로 돌아와 다른 팀들의 성적과 순위 변화를 본다.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { KEYFRAMES } from '../KboAugmentDraft.jsx';
import { teamOf } from './tournament.js';
import { standings, myOpponent, meOf, postMatch, GAMES, POST_TEAMS, STAGES, PLACE_REWARD } from './ranked.js';
import { Faces, Versus, Axes, Row, keyPlayersOf, ME, OPP } from './MatchPreview.jsx';
import { rankOf } from './rank.js';
import { Count, Burst, reducedMotion } from '../ui/motion.jsx';

/**
 * 등급 오름 — 시즌 보상을 받아 등급이 바뀌는 순간(가장 드문 순간이라 가장 크게, 롤 · 클래시 로얄 승급처럼)
 *  0.0 어두워짐 · 옛 배지 → 0.35 옛 배지가 작아지며 사라짐 → 0.5 새 배지가 크게 찍힘 · 빛줄기 · 빛 가루
 *  0.8 '등급 상승' · 새 등급 이름 → 1.2 확인 단추. 아무 데나 누르면 닫힘(0.6초 뒤부터)
 */
function TierUp({ from, to, onClose }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 600); return () => clearTimeout(t); }, []);
  return (
    <div className="fx-fade fixed inset-0 z-[70] grid place-items-center bg-[#03050a]/85 backdrop-blur-[4px]" role="dialog" aria-modal="true" aria-label="등급 상승"
      onClick={() => ready && onClose()}>
      <div className="relative flex flex-col items-center gap-4 text-center">
        <span className="relative grid h-[220px] w-[220px] place-items-center">
          <span className="rk-rays absolute inset-[-60px] rounded-full" style={{ '--t': to.tier.c }} aria-hidden="true" />
          <img src={`ui/rank/${from.tier.key}.webp`} alt="" className="rk-old absolute h-[150px] w-[150px] object-contain" />
          <img src={`ui/rank/${to.tier.key}.webp`} alt={`${to.tier.ko} 엠블럼`} className="fx-stamp relative h-[190px] w-[190px] object-contain"
            style={{ '--d': '500ms', filter: `drop-shadow(0 0 28px ${to.tier.c})` }} />
          <Burst n={30} spread={200} colors={[to.tier.c, '#fff', '#f5d27a']} delay={620} />
        </span>
        <p className="fx-rise ui-lab font-display" style={{ '--a': to.tier.c, animationDelay: '800ms' }}>등급 상승</p>
        <b className="fx-rise -mt-2 text-[56px] font-black leading-none" style={{ color: to.tier.c, animationDelay: '880ms', textShadow: `0 0 30px ${to.tier.c}88` }}>{to.tier.ko} {to.div}</b>
        <span className="fx-rise text-t3 text-gray-300" style={{ animationDelay: '960ms' }}>{from.tier.ko} {from.div} → {to.tier.ko} {to.div}</span>
        <button type="button" className="fx-fade ui-btn ui-cut pri mt-2 min-w-[220px] text-t2" style={{ '--d': '1200ms' }} onClick={onClose}>확인</button>
      </div>
    </div>
  );
}
const RK_CSS = `
.rk-rays { background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--t) 38%, transparent) 0 8deg, transparent 8deg 22deg);
  -webkit-mask: radial-gradient(closest-side, #000 30%, transparent 100%); mask: radial-gradient(closest-side, #000 30%, transparent 100%);
  animation: rk-rays-in .6s var(--fx-out) .5s both, rk-spin 14s linear .5s infinite; }
@keyframes rk-rays-in { from { opacity: 0; transform: scale(.6); } }
@keyframes rk-spin { to { rotate: 1turn; } }
.rk-old { animation: rk-old .45s var(--fx-in) .15s both; }
@keyframes rk-old { to { opacity: 0; transform: scale(.55); filter: brightness(2); } }
@media (prefers-reduced-motion: reduce) { .rk-rays, .rk-old { animation: none; } .rk-old { opacity: 0; } }
`;

export const RK = '#a78bfa'; // 랭크전 강조색
const fmtPct = (r) => (r.w + r.l ? (r.w / (r.w + r.l)).toFixed(3).replace(/^0/, '') : '-');
const fmtGb = (gb) => (gb === 0 ? '-' : gb.toFixed(1));

/** 순위표 */
/* 순위표를 마지막으로 본 순위(시즌별) — 결과 화면을 거쳐 다시 열려도 바뀐 줄이 움직이게 */
let seenRanks = null;
const MOVE_WAIT = 320;

export function StandingsTable({ s, big = false, lastMoves = null }) {
  const rows = standings(s);
  const me = meOf(s);
  const bodyRef = useRef(null);
  /* 지난번 본 순위 — 화면이 뜰 때 한 번만 잡는다(개발 모드에서 효과가 두 번 돌아도 같은 값) */
  const [prevRanks] = useState(() => (big && seenRanks && seenRanks.key === `${s.key}` ? seenRanks.ranks : null));
  useLayoutEffect(() => {
    if (!big) return undefined;
    const now = new Map(rows.map((r) => [r.idx, r.rank]));
    seenRanks = { key: `${s.key}`, ranks: now };
    const trs = [...(bodyRef.current?.querySelectorAll('tr[data-idx]') || [])];
    trs.forEach((tr) => { tr.style.transition = 'none'; tr.style.transform = ''; }); // 앞 실행에서 걸어 둔 자리는 먼저 지운다
    if (!prevRanks || trs.length < 2 || reducedMotion()) return undefined;
    const pitch = trs[1].getBoundingClientRect().top - trs[0].getBoundingClientRect().top;
    const moved = trs.filter((tr) => { const was = prevRanks.get(Number(tr.dataset.idx)); return was != null && was !== now.get(Number(tr.dataset.idx)); });
    moved.forEach((tr) => {
      const idx = Number(tr.dataset.idx);
      tr.style.transform = `translateY(${(prevRanks.get(idx) - now.get(idx)) * pitch}px)`;
      tr.style.position = 'relative';
      tr.style.zIndex = idx === me ? '2' : '1';
    });
    const t = setTimeout(() => moved.forEach((tr) => {
      tr.style.transition = 'transform .6s cubic-bezier(.2,.7,.3,1)';
      tr.style.transform = '';
    }), MOVE_WAIT);
    return () => clearTimeout(t);
  }, [rows.map((r) => r.idx).join()]); // 순위가 바뀔 때만 — 같은 순위로 다시 그려지는 것은 무시 // eslint-disable-line react-hooks/exhaustive-deps
  const cell = big ? 'py-[7px]' : 'py-1';
  /* 큰 판: 숫자 칸을 넓혀 이름과 숫자 사이 빈 곳을 줄이고, 줄마다 옅은 띠로 눈이 가로로 따라가게(KBO 순위표 방식) */
  const w = big ? [60, 72, 64, 64, 64, 88, 80, 72, 72, 124] : [52, 52, 44, 44, 44, 64, 60, 0, 0, 96];
  return (
    <table className={`w-full table-fixed border-collapse text-right tabular-nums ${big ? 'text-t2' : 'text-t3'}`}>
      <colgroup><col style={{ width: w[0] }} /><col />{w.slice(1, 7).map((x, i) => <col key={i} style={{ width: x }} />)}{big && <><col style={{ width: w[7] }} /><col style={{ width: w[8] }} /></>}<col style={{ width: w[9] }} /></colgroup>
      <thead>
        <tr className="text-t4 font-bold text-gray-400">
          <th className="w-10 text-center">순위</th><th className="pl-2 text-left">팀</th><th>경기</th><th>승</th><th>패</th><th>무</th><th>승률</th><th>게임차</th>
          {big && <><th>득점</th><th>실점</th></>}<th className="pr-3">최근</th>
        </tr>
      </thead>
      <tbody ref={bodyRef}>
        {rows.map((r, ri) => {
          const mine = r.idx === me;
          const move = lastMoves?.get(r.idx) || 0;
          return (
            <tr key={r.idx} data-idx={r.idx} className={`${cell} ${r.rank === POST_TEAMS ? 'border-b-2 border-dashed border-amber-300/50' : 'border-b border-white/[0.06]'}`}
              style={{ background: mine ? 'rgba(52,211,153,.12)' : big && ri % 2 ? 'rgba(255,255,255,.035)' : undefined }}>
              <td className={`${cell} text-center font-display text-t2 font-extrabold`} style={{ color: r.rank <= POST_TEAMS ? '#fbbf24' : '#64748b' }}>{r.rank}</td>
              <td className={`${cell} max-w-0 pl-2 text-left`}>
                <span className="flex items-center gap-2">
                  <b className={`truncate font-bold ${big ? 'text-t2' : 'text-t3'} ${mine ? 'text-[#34d399]' : 'text-white'}`}>{r.team.name}</b>
                  {/* 다른 감독 팀 — 감독 이름. 구단 이름을 짓지 않아 감독 이름과 같으면 '감독' 만 */}
                  {r.team.ghost && <span className="shrink-0 rounded bg-sky-400/15 px-1.5 text-t4 font-bold text-sky-300" title="다른 감독 팀">{r.team.name === r.team.owner ? '감독' : r.team.owner}</span>}
                  {move !== 0 && <em className="fx-bump shrink-0 font-display text-t4 not-italic" style={{ color: move > 0 ? ME : OPP, '--d': '900ms' }}>{move > 0 ? `▲${move}` : `▼${-move}`}</em>}
                </span>
              </td>
              <td className={cell}>{r.g}</td><td className={`${cell} text-white`}>{r.w}</td><td className={cell}>{r.l}</td><td className={cell}>{r.d}</td>
              <td className={`${cell} font-display font-bold text-white`}>{fmtPct(r)}</td><td className={cell}>{fmtGb(r.gb)}</td>
              {big && <><td className={cell}>{r.rs}</td><td className={cell}>{r.ra}</td></>}
              <td className={`${cell} pr-3`}>
                <span className="inline-flex gap-[3px]">
                  {r.form.slice(-5).map((f, i) => (
                    <i key={i} className="inline-block h-2.5 w-2.5" style={{ background: f === 'W' ? ME : f === 'L' ? OPP : '#64748b' }} />
                  ))}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** 포스트시즌 사다리: 5위 → 4위 → 3위 → 2위 → 1위 */
function PostLadder({ s }) {
  const seeds = s.post?.seeds || []; // 정규 시즌이 끝나야 시드가 정해진다
  const me = meOf(s);
  const now = postMatch(s);
  return (
    <div className="grid min-h-0 flex-1 grid-cols-4 items-end gap-2">
      {STAGES.map((st, i) => {
        const res = s.post?.results[i];
        const hi = seeds[st.hi - 1];
        const lo = res ? res.lo : i === 0 ? seeds[4] : s.post?.results[i - 1]?.winner;
        const live = now?.stage === i;
        const name = (idx, seedNo) => (idx == null ? <span className="text-gray-400">{seedNo ? '-' : '승자'}</span>
          : <span className={idx === me ? 'text-[#34d399]' : 'text-white'}>{s.teams[idx].name}</span>);
        const line = (idx, score, seedNo) => (
          <div className="flex items-baseline gap-2" style={{ opacity: res && res.winner !== idx ? 0.45 : 1 }}>
            <em className="w-7 shrink-0 font-display text-t4 not-italic text-amber-300">{seedNo ? `${seedNo}위` : ''}</em>
            <b className="min-w-0 flex-1 truncate text-t3">{name(idx, seedNo)}</b>
            {score != null && <b className="font-display text-t3 text-white">{score}</b>}
          </div>
        );
        return (
          <div key={st.key} className="ui-cut flex flex-col gap-1 p-3"
            style={{ '--c': '10px', minHeight: `${52 + i * 16}%`, background: `linear-gradient(180deg, rgba(251,191,36,${0.05 + i * 0.05}), rgba(5,8,15,.5))`, boxShadow: live ? 'inset 0 0 0 2px #fbbf24' : 'inset 0 2px 0 rgba(251,191,36,.35)' }}>
            <b className="mb-auto text-t2 font-black text-white">{st.ko}{i === 3 ? ' 🏆' : ''}</b>
            {line(hi, res?.hs, st.hi)}
            {line(lo, res?.ls, i === 0 ? 5 : null)}
          </div>
        );
      })}
    </div>
  );
}

export default function RankedHub({ s, account, onBack, onPlay, onClaim, onNewSeason }) {
  const myTeam = account.team;
  const me = meOf(s);
  const opp = myOpponent(s);
  const oppIdx = opp ? s.teams.indexOf(opp) : null;
  const mine = useMemo(() => teamOf(s.teams[me], myTeam), [s, me, myTeam]);
  const oppTeam = useMemo(() => (opp ? teamOf(opp, myTeam) : null), [opp, myTeam]);
  const table = standings(s);
  const myRow = table.find((r) => r.idx === me);
  const oppRow = oppIdx != null ? table.find((r) => r.idx === oppIdx) : null;
  // 지난 라운드 대비 순위 변화
  const moves = useMemo(() => {
    if (s.games.length < 2) return null;
    const before = standings({ ...s, games: s.games.slice(0, -1) });
    return new Map(standings(s).map((r) => [r.idx, before.find((b) => b.idx === r.idx).rank - r.rank]));
  }, [s]);
  const lastRound = s.games[s.games.length - 1] || [];
  const inPost = !!s.post;
  const pm = postMatch(s);
  const stage = pm ? STAGES[pm.stage] : null;
  const reward = s.done ? PLACE_REWARD[s.place - 1] : null;
  const rp = account.rank?.rp || 0;
  const rank = rankOf(rp);
  /* 보상을 받아 RP 가 바뀌면 — RP 는 세어 오르고, 등급(루키 → 퓨처스 …)이 바뀌면 등급 오름 연출 */
  const prevRp = useRef(rp);
  const [rpFrom, setRpFrom] = useState(null);
  const [tierUp, setTierUp] = useState(null);
  useEffect(() => {
    const a = prevRp.current;
    prevRp.current = rp;
    if (a === rp) return;
    setRpFrom(a);
    const A = rankOf(a);
    if (rank.index > A.index) setTierUp({ from: A, to: rank });
  }, [rp]); // eslint-disable-line react-hooks/exhaustive-deps
  const keyPlayers = oppTeam ? keyPlayersOf(oppTeam.roster) : [];

  return (
    <div className="min-h-screen bg-[#05080f] font-sans text-gray-100 antialiased lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <style>{KEYFRAMES + RK_CSS}</style>
      {tierUp && <TierUp from={tierUp.from} to={tierUp.to} onClose={() => setTierUp(null)} />}
      <div className="ui-bg" style={{ backgroundImage: 'url(ui/stadium.webp)' }} aria-hidden="true" />
      <header className="relative z-10 flex h-16 shrink-0 items-center gap-5 border-b px-6" style={{ borderColor: 'rgba(167,139,250,.3)', background: 'linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))' }}>
        <button type="button" onClick={onBack} className="ui-cut grid h-10 w-10 place-items-center bg-white/[0.06] text-t2" style={{ '--c': '8px' }} aria-label="플레이로 돌아가기">←</button>
        <div>
          <p className="text-t4 font-bold tracking-[0.04em] text-gray-400">플레이</p>
          <b className="text-t2 font-extrabold text-white">랭크전 시즌 {s.season} · {s.done ? reward.ko : inPost ? stage.ko : `정규 ${s.round + 1}차전`}</b>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {Array.from({ length: GAMES }, (_, i) => {
            const g = s.games[i]?.find((x) => x.a === me || x.b === me);
            const res = g ? ((g.a === me ? g.as - g.bs : g.bs - g.as) > 0 ? 'W' : (g.a === me ? g.as - g.bs : g.bs - g.as) < 0 ? 'L' : 'D') : null;
            const cur = !inPost && !s.done && i === s.round;
            return (
              <span key={i} className="ui-cut grid h-8 w-8 place-items-center font-display text-t3 font-bold"
                style={{ '--c': '5px', color: cur ? '#05080f' : res === 'W' ? ME : res === 'L' ? OPP : '#64748b', background: cur ? RK : 'rgba(255,255,255,.05)' }}>
                {res || i + 1}
              </span>
            );
          })}
          <span className="mx-2 h-6 w-px bg-white/15" />
          {STAGES.map((st, i) => {
            const res = s.post?.results[i];
            const cur = pm?.stage === i;
            const meIn = res && (res.hi === me || res.lo === me);
            return (
              <span key={st.key} className="ui-cut px-2.5 py-1.5 font-display text-t3 font-bold"
                style={{ '--c': '6px', color: cur ? '#05080f' : meIn ? (res.winner === me ? ME : OPP) : res ? '#94a3b8' : '#475569', background: cur ? '#fbbf24' : 'rgba(255,255,255,.05)' }}>
                {st.ko}
              </span>
            );
          })}
        </div>
      </header>

      <main className="relative z-10 grid min-h-0 flex-1 gap-3 p-3" style={{ gridTemplateColumns: 'minmax(0,1fr) 560px' }}>
        <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto minmax(0,1fr)' }}>
          <section className="ui-cut ui-frame ui-glass px-5 pb-3 pt-4" style={{ '--c': '18px', '--a': RK }}>
            <div className="mb-1 flex items-baseline gap-3">
              <p className="ui-lab font-display" style={{ '--a': RK }}>순위표</p>
              <b className="text-t2 text-white">정규 시즌 순위</b>
              <span className="ml-auto font-display text-t3 text-gray-400">{Math.min(s.round, GAMES)} / {GAMES} 라운드</span>
            </div>
            <StandingsTable s={s} big lastMoves={moves} />
          </section>
          <div className="grid min-h-0 gap-3" style={{ gridTemplateColumns: '0.9fr 1.1fr' }}>
            <section className="ui-cut ui-frame ui-glass flex min-h-0 flex-col px-5 py-4" style={{ '--c': '18px', '--a': RK }}>
              <p className="ui-lab font-display" style={{ '--a': RK }}>{lastRound.length ? `${s.games.length}라운드 결과` : '라운드 결과'}</p>
              {lastRound.length ? (
                <div className="mt-1 flex min-h-0 flex-1 flex-col justify-around">
                  {lastRound.map((g) => {
                    const mineG = g.a === me || g.b === me;
                    /* 전광판 한 줄 — 이름은 양 끝, 점수는 가운데 칸에 따로. 이긴 쪽 이름 · 점수만 밝게 */
                    const name = (idx, score, other) => (
                      <b className={`min-w-0 truncate text-t3 ${idx === g.b ? 'text-right' : ''}`}
                        style={{ color: idx === me ? '#34d399' : score > other ? '#fff' : '#8b93a3', fontWeight: score > other ? 800 : 600 }}>{s.teams[idx].name}</b>
                    );
                    const run = (score, other) => (
                      <b className="w-7 text-center font-display text-t2 tabular-nums" style={{ color: score > other ? '#fff' : '#6b7280' }}>{score}</b>
                    );
                    return (
                      <div key={`${g.a}-${g.b}`} className="ui-cut grid items-center gap-3 px-3 py-1.5"
                        style={{ '--c': '7px', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', background: mineG ? 'rgba(52,211,153,.1)' : 'rgba(255,255,255,.03)', boxShadow: mineG ? 'inset 3px 0 0 #34d399' : undefined }}>
                        {name(g.a, g.as, g.bs)}
                        <span className="flex h-8 items-center rounded-md bg-black/40 px-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]">
                          {run(g.as, g.bs)}<i className="px-0.5 font-display text-t4 not-italic text-gray-500">:</i>{run(g.bs, g.as)}
                        </span>
                        {name(g.b, g.bs, g.as)}
                      </div>
                    );
                  })}
                </div>
              ) : <p className="mt-2 text-t3 text-gray-400">개막 전</p>}
            </section>
            <section className="ui-cut ui-frame ui-glass flex min-h-0 flex-col px-5 py-4" style={{ '--c': '18px', '--a': '#fbbf24' }}>
              <p className="ui-lab font-display" style={{ '--a': '#fbbf24' }}>가을야구</p>
              <PostLadder s={s} />
            </section>
          </div>
        </div>

        <aside className="ui-cut ui-frame ui-glass flex min-h-0 flex-col gap-3.5 p-6" style={{ '--c': '18px', '--a': oppTeam ? OPP : RK }}>
          {oppTeam ? (
            <>
              <p className="ui-lab font-display" style={{ '--a': inPost ? '#fbbf24' : RK }}>다음 경기</p>
              <h2 className="-mt-1 text-t1 font-black text-white">{inPost ? `${stage.ko} 상대 분석` : `정규 ${s.round + 1}차전 상대 분석`}</h2>
              <Versus mine={mine} opp={oppTeam} owner={opp.owner} />
              <Axes mine={mine} opp={oppTeam} />
              <div>
                <Row k="시즌 성적"><b className="text-right text-white">{!s.games.length ? '개막전' : <>나 {myRow.rank}위 {myRow.w}승 {myRow.l}패{myRow.d ? ` ${myRow.d}무` : ''} · 상대 {oppRow.rank}위 {oppRow.w}승 {oppRow.l}패{oppRow.d ? ` ${oppRow.d}무` : ''}</>}</b></Row>
                <Row k="경계 선수"><b className="truncate text-right" style={{ color: OPP }}>{keyPlayers.map((p) => `${p.name} ${p.position} ${p.overall}`).join(' · ')}</b></Row>
                {inPost && <Row k="비기면"><b className="text-right text-white">{s.teams[pm.hi].name} 진출</b></Row>}
              </div>
              <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-t2" style={{ '--a': inPost ? '#fbbf24' : RK }} onClick={onPlay}>
                {inPost ? `${stage.ko} 시작 ▶` : `정규 ${s.round + 1}차전 시작 ▶`}
              </button>
            </>
          ) : s.done ? (
            <>
              <p className="ui-lab font-display" style={{ '--a': s.place === 1 ? '#fbbf24' : RK }}>시즌 {s.season} 결과</p>
              <h2 className="-mt-1 text-6xl font-black" style={{ color: s.place === 1 ? '#fbbf24' : '#fff' }}>{reward.ko}</h2>
              <p className="text-t3 text-gray-300">정규 {myRow.rank}위 · {myRow.w}승 {myRow.l}패{myRow.d ? ` ${myRow.d}무` : ''}</p>
              <Faces roster={mine.roster} n={6} />
              <div className="syn-scroll min-h-0 overflow-y-auto">
                {PLACE_REWARD.map((f, i) => {
                  const on = i === s.place - 1;
                  return (
                    <div key={f.ko} className="flex items-baseline justify-between border-b border-white/10 py-1.5 text-t3 text-gray-300">
                      <span style={{ color: on ? '#fbbf24' : undefined }}>{i + 1}. {f.ko}</span>
                      <b className="font-display text-t3" style={{ color: on ? '#fbbf24' : '#94a3b8' }}>{f.rp >= 0 ? '+' : ''}{f.rp} RP · {f.gold} G</b>
                    </div>
                  );
                })}
              </div>
              <div className="ui-cut flex items-center gap-3 bg-white/[0.05] px-4 py-2.5" style={{ '--c': '10px' }}>
                <span key={`${rank.tier.key}${rank.div}`} className={`font-display text-t3 font-bold ${rpFrom != null && rankOf(rpFrom).div !== rank.div ? 'fx-bump' : ''}`} style={{ color: rank.tier.c, '--d': '900ms' }}>{rank.tier.ko} {rank.div}</span>
                <b className="ml-auto font-display text-t2 text-white"><Count value={rp} from={rpFrom ?? rp} delay={200} dur={900} /> RP</b>
              </div>
              {s.claimed && (() => {
                const got = s.reward || { rp: reward.rp, gold: reward.gold };
                return (
                  <div className="ui-cut flex items-center gap-3 px-4 py-2.5" style={{ '--c': '10px', background: 'rgba(251,191,36,.1)' }}>
                    <span className="text-t3 text-gray-300">받은 보상</span>
                    <b className="ml-auto font-display text-t2" style={{ color: '#fbbf24' }}>{got.rp >= 0 ? '+' : ''}{got.rp} RP · {got.gold} G</b>
                  </div>
                );
              })()}
              {s.claimed
                ? <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-t2" style={{ '--a': RK }} onClick={onNewSeason}>시즌 {s.season + 1} 시작 ▶</button>
                : <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-t2" style={{ '--a': RK }} onClick={onClaim}>보상 받기 · {reward.rp >= 0 ? '+' : ''}{reward.rp} RP · {reward.gold} G</button>}
            </>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
