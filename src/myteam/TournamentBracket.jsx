/*
 * 토너먼트 대진표 (전체 화면) — 왼쪽: 첫 라운드 → 결승으로 흐르는 트리(16 · 32 · 64강) · 오른쪽: 이번 내 경기와 상대 분석.
 * 처음 입장하면 팀 이름이 칸마다 차례로 채워진다. 경기를 마치면 여기로 돌아와 다른 라인에서 올라온 상대를 확인한다.
 * 일반 대결(내 라커 팀)과 드래프트 모드(그 판의 드래프트 팀)가 함께 쓴다.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { KEYFRAMES } from '../KboAugmentDraft.jsx';
import { roundsOf, finishOf, myOpponent, meIndex, teamOf } from './tournament.js';
import { Faces, Versus, Axes, Row, keyPlayersOf, ME, OPP } from './MatchPreview.jsx';
import { teamFlag, flagByKey } from './teamArt.js';
import { myBanner } from './store.js';

/* 팀 칸 배경: 구단 색 깃발이 오른쪽에서 왼쪽으로 스러진다 */
const FLAG_MASK = 'linear-gradient(90deg,transparent 18%,#000 78%)';

const A = '#fbbf24';
const GEO = {
  16: { ROW: 44, SLOT_W: 250, SLOT_H: 30, COL: 300, font: 15 },
  32: { ROW: 23.4, SLOT_W: 204, SLOT_H: 20, COL: 236, font: 12.5 },
  64: { ROW: 23.4, SLOT_W: 176, SLOT_H: 20, COL: 200, font: 12 },
};
const TOP = 18, LEFT = 22;

function Tree({ t, oppIdx, reveal }) {
  const size = t.size || 32;
  const { ROW, SLOT_W, SLOT_H, COL, font } = GEO[size] || GEO[32];
  const rounds = roundsOf(size).length;
  const me = meIndex(t);
  const cols = [t.entrants.map((_, i) => i), ...t.winners];
  const lines = [], slots = [];
  for (let c = 0; c < rounds; c++) {
    const n = size >> c;
    const list = cols[c];
    const res = t.results[c] || [];
    for (let k = 0; k < n; k++) {
      const yc = TOP + (k + 0.5) * ROW * (1 << c);
      const x = LEFT + c * COL;
      const i = list ? list[k] : null;
      if (i != null) {
        const r = res[Math.floor(k / 2)];
        const won = r ? r.winner === i : null;
        const score = r ? (r.a === i ? r.as : r.bs) : null;
        const mine = i === me, opp = i === oppIdx;
        const flag = t.entrants[i].me ? flagByKey(myBanner()) : teamFlag(t.entrants[i].name); // 내 칸은 프로필 배너
        slots.push(
          <div key={`${c}-${k}`} data-me={mine && c === t.round ? '' : undefined} className="ui-cut absolute flex items-center gap-1.5 overflow-hidden px-2"
            style={{ '--c': '5px', left: x, top: yc - SLOT_H / 2, width: SLOT_W, height: SLOT_H,
              background: mine ? 'rgba(52,211,153,.16)' : opp ? 'rgba(248,113,113,.14)' : 'rgba(255,255,255,.045)',
              boxShadow: `inset 0 0 0 1px ${mine ? ME : opp ? OPP : flag ? `${flag.color}4d` : 'rgba(255,255,255,.08)'}`,
              opacity: won === false ? 0.38 : 1, animation: reveal && c === 0 ? `tbIn .38s ${k * (1.1 / size)}s both` : undefined }}>
            {flag && <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${flag.src})`, opacity: 0.62, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />}
            <span className={`relative min-w-0 flex-1 truncate ${mine ? 'font-black' : 'font-semibold'}`} style={{ fontSize: font, color: mine ? ME : opp ? '#fecaca' : '#e5e7eb', textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{t.entrants[i].name}</span>
            {score != null && <b className="relative font-display text-sm text-white">{score}</b>}
          </div>,
        );
      } else {
        slots.push(<div key={`${c}-${k}`} className="ui-cut absolute" style={{ '--c': '5px', left: x, top: yc - SLOT_H / 2, width: SLOT_W, height: SLOT_H, background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.05)' }} />);
      }
      if (c < rounds - 1 && k % 2 === 0) {
        const y2 = TOP + (k + 1.5) * ROW * (1 << c), yn = (yc + y2) / 2;
        const pair = list ? [list[k], list[k + 1]] : [];
        const color = pair.includes(me) ? A : oppIdx != null && pair.includes(oppIdx) ? OPP : 'rgba(148,163,184,.25)';
        const w = color === A || color === OPP ? 2.4 : 1.2;
        const mx = x + SLOT_W + (COL - SLOT_W) / 2;
        lines.push(<path key={`l${c}-${k}`} d={`M${x + SLOT_W} ${yc} H${mx} V${y2} H${x + SLOT_W} M${mx} ${yn} H${x + COL}`} fill="none" stroke={color} strokeWidth={w} />);
      }
    }
  }
  const champ = t.winners[rounds - 1]?.[0];
  return (
    <div className="relative" style={{ width: LEFT + (rounds - 1) * COL + SLOT_W + 40, height: TOP * 2 + size * ROW }}>
      <svg className="absolute inset-0" width="100%" height="100%">{lines}</svg>
      {slots}
      <div className="absolute text-center" style={{ left: LEFT + (rounds - 1) * COL, top: TOP + (size / 2) * ROW - 96, width: SLOT_W }}>
        <div className="text-5xl">🏆</div>
        <p className="ui-lab font-display justify-center" style={{ '--a': A }}>Champion</p>
        {champ != null && <b className="block truncate text-base" style={{ color: champ === me ? ME : '#fff' }}>{t.entrants[champ].name}</b>}
      </div>
    </div>
  );
}

/** rewards: 골드 보상 표시 (드래프트 모드 토너먼트는 보상 없음) */
export default function TournamentBracket({ t, myTeam, title, onBack, onPlay, onClaim, onRestart, rewards = true }) {
  const size = t.size || 32;
  const ROUNDS = roundsOf(size), FINISH = finishOf(size);
  const { COL } = GEO[size] || GEO[32];
  const me = meIndex(t);
  const opp = myOpponent(t);
  const oppIdx = opp ? t.entrants.indexOf(opp) : null;
  const mine = useMemo(() => teamOf(t.entrants[me], myTeam), [t, me, myTeam]);
  const oppTeam = useMemo(() => (opp ? teamOf(opp, myTeam) : null), [opp, myTeam]);
  const reveal = t.round === 0 && t.results.length === 0;
  const past = t.results.length;
  // 상대가 올라온 길: 지난 라운드마다 상대가 이긴 경기
  const road = oppIdx == null ? [] : t.results.map((rs, r) => {
    const x = rs.find((m) => m.a === oppIdx || m.b === oppIdx);
    if (!x) return null;
    const other = x.a === oppIdx ? x.b : x.a;
    return `${ROUNDS[r].ko} ${x.a === oppIdx ? x.as : x.bs}:${x.a === oppIdx ? x.bs : x.as} ${t.entrants[other].name}`;
  }).filter(Boolean);
  const myLast = past ? t.results[past - 1].find((m) => m.a === me || m.b === me) : null;
  const finish = t.done ? FINISH[t.place] : null;
  const champion = t.done && t.place === ROUNDS.length;
  const keyPlayers = oppTeam ? keyPlayersOf(oppTeam.roster) : [];

  // 64강처럼 트리가 길면 내 칸이 보이게 스크롤
  const scroller = useRef(null);
  useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector('[data-me]');
    if (box && el && box.scrollHeight > box.clientHeight) box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 2);
  }, [t.round, t.key]);

  return (
    <div className="min-h-screen bg-[#05080f] font-sans text-gray-100 antialiased lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <style>{`${KEYFRAMES}
        @keyframes tbIn { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }`}</style>
      <div className="ui-bg" style={{ backgroundImage: 'url(ui/stadium.webp)' }} aria-hidden="true" />
      <header className="relative z-10 flex h-16 shrink-0 items-center gap-5 border-b px-6" style={{ borderColor: 'rgba(251,191,36,.25)', background: 'linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))' }}>
        <button type="button" onClick={onBack} className="ui-cut grid h-10 w-10 place-items-center bg-white/[0.06] text-lg" style={{ '--c': '8px' }} aria-label="플레이로 돌아가기">←</button>
        <div>
          <p className="font-display text-[10px] font-bold tracking-[0.3em] text-gray-500">TOURNAMENT · {size}</p>
          <b className="text-xl font-extrabold text-white">{title || `${size}강 토너먼트`} · {t.done ? finish.ko : ROUNDS[t.round].ko}</b>
        </div>
        <div className="ml-auto flex gap-1.5">
          {ROUNDS.map((r, i) => {
            const out = t.done && t.place === i;
            const cur = !t.done && t.round === i;
            const done = i < past && !out;
            return (
              <span key={r.key} className="ui-cut px-3 py-1.5 font-display text-sm font-bold"
                style={{ '--c': '7px', color: cur ? '#05080f' : out ? OPP : done ? ME : '#475569', background: cur ? A : 'rgba(255,255,255,.05)', boxShadow: cur ? 'none' : `inset 0 0 0 1px ${out ? OPP : done ? 'rgba(52,211,153,.5)' : 'rgba(255,255,255,.1)'}` }}>
                {done ? '✓ ' : ''}{r.ko}
              </span>
            );
          })}
        </div>
      </header>

      <main className="relative z-10 grid min-h-0 flex-1 gap-3 p-3" style={{ gridTemplateColumns: 'minmax(0,1fr) 560px' }}>
        <section className="ui-cut ui-frame ui-glass relative flex min-h-0 flex-col overflow-hidden" style={{ '--c': '18px', '--a': A }}>
          <div className="flex shrink-0 px-6 pt-3" style={{ gap: COL - 60 }}>
            {ROUNDS.map((r) => <p key={r.key} className="ui-lab font-display" style={{ '--a': A, width: 60 }}>{r.ko}</p>)}
          </div>
          <div ref={scroller} className="syn-scroll min-h-0 flex-1 overflow-auto">
            <Tree t={t} oppIdx={oppIdx} reveal={reveal} />
          </div>
        </section>

        <aside className="ui-cut ui-frame ui-glass flex min-h-0 flex-col gap-3.5 p-6" style={{ '--c': '18px', '--a': oppTeam ? OPP : A }}>
          {oppTeam ? (
            <>
              <p className="ui-lab font-display" style={{ '--a': A }}>{ROUNDS[t.round].en}{myLast ? ` · 지난 경기 ${myLast.a === me ? myLast.as : myLast.bs}:${myLast.a === me ? myLast.bs : myLast.as} 승리` : ''}</p>
              <h2 className="-mt-1 text-3xl font-black text-white">{past ? `${ROUNDS[t.round].ko} 상대 분석` : `내 ${ROUNDS[t.round].ko} 경기`}</h2>
              <Versus mine={mine} opp={oppTeam} owner={opp.owner} />
              <Axes mine={mine} opp={oppTeam} />
              <div>
                {road.length > 0 && <Row k="상대가 올라온 길"><b className="truncate text-right text-white">{road.join(' · ')}</b></Row>}
                <Row k="경계 선수"><b className="truncate text-right" style={{ color: OPP }}>{keyPlayers.map((p) => `${p.name} ${p.position} ${p.overall}`).join(' · ')}</b></Row>
                <Row k="이기면"><b className="font-display text-lg text-white">{t.round === ROUNDS.length - 1 ? '우승' : `${ROUNDS[t.round + 1].ko} 진출`}{rewards ? ` · ${FINISH[t.round + 1].gold} G 확보` : ''}</b></Row>
              </div>
              <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={onPlay}>{ROUNDS[t.round].ko} 경기 시작 ▶</button>
            </>
          ) : (
            <>
              <p className="ui-lab font-display" style={{ '--a': champion ? A : OPP }}>Result</p>
              <h2 className="-mt-1 text-6xl font-black" style={{ color: champion ? A : '#fff' }}>{finish.ko}</h2>
              {myLast && (
                <p className="text-base text-gray-300">
                  {ROUNDS[past - 1].ko} · {t.entrants[myLast.a].name} <b className="font-display text-xl text-white">{myLast.as} : {myLast.bs}</b> {t.entrants[myLast.b].name}
                  {myLast.tiebreak ? ' · 동점, 팀 종합으로 결정' : ''}
                </p>
              )}
              <Faces roster={mine.roster} n={6} />
              <div className="mt-2">
                {rewards && FINISH.slice().reverse().map((f) => (
                  <div key={f.ko} className="flex items-baseline justify-between border-b border-white/10 py-2 text-sm text-gray-300">
                    <span style={{ color: f === finish ? A : undefined }}>{f.ko}</span>
                    <b className="font-display text-lg" style={{ color: f === finish ? A : '#94a3b8' }}>{f.gold} G</b>
                  </div>
                ))}
              </div>
              {t.claimed || !onClaim || !rewards
                ? onRestart && <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={onRestart}>새 {size}강 시작 ▶</button>
                : <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={onClaim}>보상 받기 · {finish.gold} G</button>}
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
