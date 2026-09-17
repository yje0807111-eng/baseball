/* 플레이 화면의 토너먼트 — 오늘의 32강 대진 (가운데: 라운드 진행 · 다음 상대 · 대진표 / 오른쪽: 보상 · 경기 시작) */
import React, { useMemo, useState } from 'react';
import { squadIssues, SQUAD_CAP } from './rules.js';
import { KV, Stats, teamStats } from './ui.jsx';
import { teamRating } from './match.js';
import { ROUNDS, FINISH, pairsOf, myOpponent, meIndex, teamOf } from './tournament.js';

const A = '#fbbf24'; // 토너먼트 강조색
const dateLabel = (key) => { const [, m, d] = key.split('-'); return `${Number(m)}월 ${Number(d)}일`; };

/** 선수 얼굴 줄 (상위 n명) */
function Faces({ roster, n = 5, align = 'left' }) {
  const top = [...roster].sort((a, b) => b.overall - a.overall).slice(0, n);
  return (
    <div className={`flex gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
      {top.map((p) => (
        <span key={p.id} title={`${p.name} ${p.overall}`} className="ui-cut relative h-14 w-11 overflow-hidden bg-[#0b1220] bg-cover"
          style={{ '--c': '6px', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`, backgroundPosition: '50% 10%' }}>
          <b className="absolute inset-x-0 bottom-0 bg-[#05080f]/80 text-center font-display text-[11px] leading-4 text-white">{p.overall}</b>
        </span>
      ))}
    </div>
  );
}

function Side({ team, owner, me, align }) {
  const right = align === 'right';
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2 ${right ? 'items-end text-right' : ''}`}>
      <p className="font-display text-xs font-bold tracking-[0.3em]" style={{ color: me ? '#34d399' : '#fca5a5' }}>{me ? 'MY TEAM' : 'OPPONENT'}</p>
      <b className="block max-w-full truncate text-3xl font-black text-white">{team.name}</b>
      <span className="text-sm text-gray-400">{owner} · 팀 종합 <b className="font-display text-lg text-white">{teamRating(team.roster) || '-'}</b></span>
      <Faces roster={team.roster} align={align} />
    </div>
  );
}

function TournamentMain({ t, myTeam }) {
  const shownRound = t.done ? t.results.length - 1 : t.round;
  const [tab, setTab] = useState(null);
  const r = tab ?? shownRound;
  const me = meIndex(t);
  const opp = myOpponent(t);
  const mine = useMemo(() => teamOf(t.entrants[me], myTeam), [t, me, myTeam]);
  const oppTeam = useMemo(() => (opp ? teamOf(opp, myTeam) : null), [opp, myTeam]);
  const pairs = pairsOf(t, r);
  const res = t.results[r] || [];
  const lastMine = t.done ? (t.results[t.results.length - 1] || []).find((x) => x.a === me || x.b === me) : null;

  return (
    <section className="ui-cut ui-frame ui-glass flex min-h-0 flex-col gap-4 p-5" style={{ '--c': '20px', '--a': A }}>
      {/* 라운드 진행 */}
      <div className="flex items-center gap-2">
        <p className="ui-lab font-display" style={{ '--a': A }}>Tournament · {dateLabel(t.date)}</p>
        <div className="ml-auto flex gap-1.5">
          {ROUNDS.map((x, i) => {
            const past = i < t.results.length;
            const out = t.done && t.place === i;
            const cur = !t.done && i === t.round;
            const color = out ? '#f87171' : cur ? A : past ? '#34d399' : '#475569';
            return (
              <button key={x.key} type="button" disabled={i > shownRound} onClick={() => setTab(i === shownRound ? null : i)}
                className={`ui-cut px-3 py-1.5 text-sm font-bold transition ${i === r ? 'text-[#05080f]' : 'text-gray-300'} disabled:cursor-default disabled:opacity-40`}
                style={{ '--c': '7px', background: i === r ? color : 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${color}` }}>
                {past && !out && !cur ? '✓ ' : ''}{x.ko}
              </button>
            );
          })}
        </div>
      </div>

      {/* 다음 상대 · 결과 */}
      <div className="ui-cut relative flex shrink-0 items-center gap-6 overflow-hidden bg-cover px-7 py-5"
        style={{ '--c': '14px', backgroundImage: 'linear-gradient(90deg,rgba(5,8,15,.94),rgba(5,8,15,.7) 50%,rgba(5,8,15,.94)), url(ui/broadcast-field.webp)', backgroundPosition: 'center 60%' }}>
        {oppTeam ? (
          <>
            <Side team={mine} owner="나" me align="left" />
            <div className="flex flex-col items-center">
              <span className="font-display text-sm font-bold tracking-[0.3em]" style={{ color: A }}>{ROUNDS[t.round].en}</span>
              <span className="font-display text-6xl font-extrabold italic text-white">VS</span>
            </div>
            <Side team={oppTeam} owner={opp.owner} align="right" />
          </>
        ) : (
          <div className="flex w-full items-center gap-6">
            <div>
              <p className="font-display text-sm font-bold tracking-[0.3em]" style={{ color: t.place === ROUNDS.length ? A : '#fca5a5' }}>TODAY&apos;S RESULT</p>
              <b className="block text-5xl font-black text-white">{FINISH[t.place]?.ko}</b>
              {lastMine && (
                <span className="mt-2 block text-base text-gray-300">
                  {ROUNDS[t.results.length - 1].ko} {t.entrants[lastMine.a].name} <b className="font-display text-xl text-white">{lastMine.as} : {lastMine.bs}</b> {t.entrants[lastMine.b].name}
                  {lastMine.tiebreak ? ' · 동점, 팀 종합으로 결정' : ''}
                </span>
              )}
            </div>
            <Faces roster={mine.roster} n={6} align="right" />
          </div>
        )}
      </div>

      {/* 대진표 */}
      <div className="flex items-baseline gap-3">
        <p className="ui-lab font-display" style={{ '--a': A }}>Bracket</p>
        <p className="text-sm text-gray-400">{ROUNDS[r].ko} · {pairs.length}경기</p>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1" style={{ gridTemplateColumns: `repeat(${Math.min(4, pairs.length)}, minmax(0,1fr))` }}>
        {pairs.map(([a, b], k) => {
          const x = res[k];
          const mineHere = a === me || b === me;
          const row = (i, score) => {
            const e = t.entrants[i];
            const win = x && x.winner === i;
            return (
              <div className={`flex items-center gap-2 ${x && !win ? 'opacity-45' : ''}`}>
                <span className={`min-w-0 flex-1 truncate text-sm ${e.me ? 'font-black text-emerald-300' : win ? 'font-bold text-white' : 'text-gray-300'}`}>{e.name}</span>
                <b className="font-display text-lg text-white">{x ? score : ''}</b>
              </div>
            );
          };
          return (
            <div key={`${a}-${b}`} className="ui-cut px-3 py-2" style={{ '--c': '8px', background: mineHere ? 'rgba(251,191,36,.1)' : 'rgba(255,255,255,.04)', boxShadow: mineHere ? `inset 0 0 0 1px ${A}` : 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
              {row(a, x?.as)}
              {row(b, x?.bs)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function tournamentPanels({ account, tournament: t, onPlay, onLocker, onClaim }) {
  const team = account.team || {};
  const squad = team.squad || [];
  const issues = squadIssues(squad, team.staff, team.cap || SQUAD_CAP);
  const ready = issues.length === 0;
  const st = teamStats(squad);
  const finish = t?.done ? FINISH[t.place] : null;
  const wins = t ? t.results.filter((rs) => rs.some((x) => x.winner === meIndex(t))).length : 0;

  const main = ready && t
    ? <TournamentMain t={t} myTeam={team} />
    : (
      <section className="ui-cut ui-frame ui-glass grid min-h-0 place-items-center p-8 text-center" style={{ '--c': '20px', '--a': A }}>
        <div>
          <p className="ui-lab font-display justify-center" style={{ '--a': A }}>Tournament</p>
          <p className="mt-3 text-4xl font-black text-white">오늘의 32강 토너먼트</p>
          <p className="mt-3 text-lg text-amber-300">{issues[0] || '대진을 준비하고 있습니다'}</p>
        </div>
      </section>
    );

  const aside = (
    <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6" style={{ '--c': '20px', '--a': A }}>
      <p className="ui-lab font-display" style={{ '--a': A }}>Today</p>
      <h2 className="-mt-2 text-3xl font-black text-white">토너먼트</h2>
      <p className="text-sm leading-relaxed text-gray-300">31팀과 32강부터 결승까지 겨룹니다. 하루에 한 번, 지면 그날은 끝납니다.</p>
      <Stats items={[['팀 OVR', st.ovr || '-'], ['진행', t ? (t.done ? '종료' : ROUNDS[t.round].ko) : '-'], ['승리', `${wins}/5`]]} />
      <div>
        {FINISH.slice().reverse().map((f, i) => {
          const hit = finish && finish === f;
          return <KV key={f.ko} k={f.ko} v={`${f.gold} G${f.rp ? ` · +${f.rp} RP` : ''}`} color={hit ? A : i === 0 ? '#fde047' : '#94a3b8'} />;
        })}
      </div>
      <div className="mt-auto">
        {!ready ? (
          <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" onClick={onLocker}>라커에서 채우기 ›</button>
        ) : !t ? null : !t.done ? (
          <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={onPlay}>{ROUNDS[t.round].ko} 경기 시작 ▶</button>
        ) : !t.claimed ? (
          <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={onClaim}>보상 받기 · {finish.gold} G{finish.rp ? ` +${finish.rp} RP` : ''}</button>
        ) : (
          <p className="ui-cut bg-white/[0.05] py-4 text-center text-base font-bold text-gray-300" style={{ '--c': '10px' }}>내일 새 대진이 열립니다</p>
        )}
      </div>
    </aside>
  );

  return { key: 'tourney', label: '토너먼트', sub: t ? (t.done ? `오늘 ${finish.ko}` : `오늘의 32강 · ${ROUNDS[t.round].ko}`) : '오늘의 32강', img: 'ui/broadcast-field.webp', neon: A, main, aside };
}
