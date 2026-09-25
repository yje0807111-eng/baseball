/*
 * 랭크전 시즌 화면 (전체 화면) — 왼쪽: 10팀 순위표 · 최근 라운드 결과 · 포스트시즌 사다리 / 오른쪽: 다음 내 경기 분석 또는 시즌 결과.
 * 경기가 끝나면 여기로 돌아와 다른 팀들의 성적과 순위 변화를 본다.
 */
import React, { useMemo } from 'react';
import { KEYFRAMES } from '../KboAugmentDraft.jsx';
import { teamOf } from './tournament.js';
import { standings, myOpponent, meOf, postMatch, GAMES, POST_TEAMS, STAGES, PLACE_REWARD } from './ranked.js';
import { Faces, Versus, Axes, Row, keyPlayersOf, ME, OPP } from './MatchPreview.jsx';
import { rankOf } from './rank.js';

export const RK = '#a78bfa'; // 랭크전 강조색
const fmtPct = (r) => (r.w + r.l ? (r.w / (r.w + r.l)).toFixed(3).replace(/^0/, '') : '-');
const fmtGb = (gb) => (gb === 0 ? '-' : gb.toFixed(1));

/** 순위표 */
export function StandingsTable({ s, big = false, lastMoves = null }) {
  const rows = standings(s);
  const me = meOf(s);
  const cell = big ? 'py-[7px]' : 'py-1';
  return (
    <table className="w-full table-fixed border-collapse text-right tabular-nums text-t3">
      {/* 팀 이름 칸이 넓고 숫자 칸은 좁게 — 이름이 잘리지 않게 */}
      <colgroup><col style={{ width: 52 }} /><col /><col style={{ width: 52 }} /><col style={{ width: 44 }} /><col style={{ width: 44 }} /><col style={{ width: 44 }} /><col style={{ width: 64 }} /><col style={{ width: 60 }} />{big && <><col style={{ width: 52 }} /><col style={{ width: 52 }} /></>}<col style={{ width: 96 }} /></colgroup>
      <thead>
        <tr className="text-t4 font-bold text-gray-400">
          <th className="w-10 text-center">순위</th><th className="pl-2 text-left">팀</th><th>경기</th><th>승</th><th>패</th><th>무</th><th>승률</th><th>게임차</th>
          {big && <><th>득점</th><th>실점</th></>}<th className="pr-3">최근</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const mine = r.idx === me;
          const move = lastMoves?.get(r.idx) || 0;
          return (
            <tr key={r.idx} className={`${cell} ${r.rank === POST_TEAMS ? 'border-b-2 border-dashed border-amber-300/50' : 'border-b border-white/[0.06]'}`}
              style={{ background: mine ? 'rgba(52,211,153,.12)' : undefined }}>
              <td className={`${cell} text-center font-display text-t2 font-extrabold`} style={{ color: r.rank <= POST_TEAMS ? '#fbbf24' : '#64748b' }}>{r.rank}</td>
              <td className={`${cell} max-w-0 pl-2 text-left`}>
                <span className="flex items-center gap-2">
                  <b className={`truncate text-t3 font-bold ${mine ? 'text-[#34d399]' : 'text-white'}`}>{r.team.name}</b>
                  {move !== 0 && <em className="shrink-0 font-display text-t4 not-italic" style={{ color: move > 0 ? ME : OPP }}>{move > 0 ? `▲${move}` : `▼${-move}`}</em>}
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
  const rank = rankOf(account.rank?.rp || 0);
  const keyPlayers = oppTeam ? keyPlayersOf(oppTeam.roster) : [];

  return (
    <div className="min-h-screen bg-[#05080f] font-sans text-gray-100 antialiased lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <style>{KEYFRAMES}</style>
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
                    const side = (idx, score, other) => (
                      <span className={`flex min-w-0 flex-1 items-baseline gap-2 ${idx === g.b ? 'flex-row-reverse text-right' : ''}`} style={{ opacity: score < other ? 0.55 : 1 }}>
                        <b className={`min-w-0 truncate text-t3 ${idx === me ? 'text-[#34d399]' : 'text-white'}`}>{s.teams[idx].name}</b>
                        <b className="font-display text-t2 text-white">{score}</b>
                      </span>
                    );
                    return (
                      <div key={`${g.a}-${g.b}`} className="ui-cut flex items-center gap-3 px-3 py-1.5" style={{ '--c': '7px', background: mineG ? 'rgba(52,211,153,.1)' : 'rgba(255,255,255,.03)' }}>
                        {side(g.a, g.as, g.bs)}<span className="font-display text-t4 text-gray-400">:</span>{side(g.b, g.bs, g.as)}
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
                <span className="font-display text-t3 font-bold" style={{ color: rank.tier.c }}>{rank.tier.ko} {rank.div}</span>
                <b className="ml-auto font-display text-t2 text-white">{account.rank?.rp || 0} RP</b>
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
