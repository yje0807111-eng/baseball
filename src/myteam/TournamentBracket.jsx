/*
 * 오늘의 토너먼트 대진표 (전체 화면) — 왼쪽: 32강 → 결승으로 흐르는 트리 · 오른쪽: 이번 내 경기와 상대 분석.
 * 처음 입장하면 팀 이름이 칸마다 차례로 채워진다. 경기를 마치면 여기로 돌아와 다른 라인에서 올라온 상대를 확인한다.
 */
import React, { useMemo } from 'react';
import { KEYFRAMES } from '../KboAugmentDraft.jsx';
import { teamRating } from './match.js';
import { ROUNDS, FINISH, myOpponent, meIndex, teamOf } from './tournament.js';

const A = '#fbbf24', ME = '#34d399', OPP = '#f87171';
const ROW = 23.4, SLOT_W = 204, SLOT_H = 20, COL = 236, TOP = 18, LEFT = 22;

/** 여섯 축: 타자 넷(경기 타순 기준) · 선발 · 불펜 평균 */
function axesOf(roster) {
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);
  const bats = roster.filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall).slice(0, 9);
  const top = (pos, n) => roster.filter((p) => p.position === pos).sort((a, b) => b.overall - a.overall).slice(0, n);
  return [
    ['파워', avg(bats.map((p) => p.stats.power))], ['컨택', avg(bats.map((p) => p.stats.contact))],
    ['주루', avg(bats.map((p) => p.stats.speed))], ['수비', avg(bats.map((p) => p.stats.defense))],
    ['선발', avg(top('SP', 5).map((p) => p.overall))], ['불펜', avg(top('RP', 8).map((p) => p.overall))],
  ];
}

function Tree({ t, oppIdx, reveal }) {
  const me = meIndex(t);
  const cols = [t.entrants.map((_, i) => i), ...t.winners];
  const lines = [], slots = [];
  for (let c = 0; c < 5; c++) {
    const n = 32 >> c;
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
        slots.push(
          <div key={`${c}-${k}`} className="ui-cut absolute flex items-center gap-1.5 px-2"
            style={{ '--c': '5px', left: x, top: yc - SLOT_H / 2, width: SLOT_W, height: SLOT_H,
              background: mine ? 'rgba(52,211,153,.16)' : opp ? 'rgba(248,113,113,.14)' : 'rgba(255,255,255,.045)',
              boxShadow: `inset 0 0 0 1px ${mine ? ME : opp ? OPP : 'rgba(255,255,255,.08)'}`,
              opacity: won === false ? 0.38 : 1, animation: reveal && c === 0 ? `tbIn .38s ${k * 0.035}s both` : undefined }}>
            <span className={`min-w-0 flex-1 truncate text-[12.5px] ${mine ? 'font-black' : 'font-semibold'}`} style={{ color: mine ? ME : opp ? '#fecaca' : '#e5e7eb' }}>{t.entrants[i].name}</span>
            {score != null && <b className="font-display text-sm text-white">{score}</b>}
          </div>,
        );
      } else {
        slots.push(<div key={`${c}-${k}`} className="ui-cut absolute" style={{ '--c': '5px', left: x, top: yc - SLOT_H / 2, width: SLOT_W, height: SLOT_H, background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.05)' }} />);
      }
      if (c < 4 && k % 2 === 0) {
        const y2 = TOP + (k + 1.5) * ROW * (1 << c), yn = (yc + y2) / 2;
        const pair = list ? [list[k], list[k + 1]] : [];
        const color = pair.includes(me) ? A : oppIdx != null && pair.includes(oppIdx) ? OPP : 'rgba(148,163,184,.25)';
        const w = color === A || color === OPP ? 2.4 : 1.2;
        const mx = x + SLOT_W + (COL - SLOT_W) / 2;
        lines.push(<path key={`l${c}-${k}`} d={`M${x + SLOT_W} ${yc} H${mx} V${y2} H${x + SLOT_W} M${mx} ${yn} H${x + COL}`} fill="none" stroke={color} strokeWidth={w} />);
      }
    }
  }
  const champ = t.winners[4]?.[0];
  return (
    <div className="relative" style={{ width: LEFT + 4 * COL + SLOT_W + 40, height: TOP * 2 + 32 * ROW }}>
      <svg className="absolute inset-0" width="100%" height="100%">{lines}</svg>
      {slots}
      <div className="absolute text-center" style={{ left: LEFT + 4 * COL, top: TOP + 16 * ROW - 96, width: SLOT_W }}>
        <div className="text-5xl">🏆</div>
        <p className="ui-lab font-display justify-center" style={{ '--a': A }}>Champion</p>
        {champ != null && <b className="block truncate text-base" style={{ color: champ === me ? ME : '#fff' }}>{t.entrants[champ].name}</b>}
      </div>
    </div>
  );
}

function Faces({ roster, n = 3, align }) {
  const top = [...roster].sort((a, b) => b.overall - a.overall).slice(0, n);
  return (
    <div className={`flex gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
      {top.map((p) => (
        <span key={p.id} title={`${p.name} ${p.overall}`} className="ui-cut relative h-16 w-12 overflow-hidden bg-[#0b1220] bg-cover"
          style={{ '--c': '6px', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`, backgroundPosition: '50% 10%' }}>
          <b className="absolute inset-x-0 bottom-0 bg-[#05080f]/80 text-center font-display text-[11px] leading-4 text-white">{p.overall}</b>
        </span>
      ))}
    </div>
  );
}

export default function TournamentBracket({ t, myTeam, onBack, onPlay, onClaim }) {
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
  const myAxes = axesOf(mine.roster), oppAxes = oppTeam ? axesOf(oppTeam.roster) : null;
  const keyPlayers = oppTeam ? [
    [...oppTeam.roster].filter((p) => p.type === 'pitcher').sort((a, b) => b.overall - a.overall)[0],
    [...oppTeam.roster].filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall)[0],
  ].filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-[#05080f] font-sans text-gray-100 antialiased lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <style>{`${KEYFRAMES}
        @keyframes tbIn { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }`}</style>
      <div className="ui-bg" style={{ backgroundImage: 'url(ui/stadium.webp)' }} aria-hidden="true" />
      <header className="relative z-10 flex h-16 shrink-0 items-center gap-5 border-b px-6" style={{ borderColor: 'rgba(251,191,36,.25)', background: 'linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))' }}>
        <button type="button" onClick={onBack} className="ui-cut grid h-10 w-10 place-items-center bg-white/[0.06] text-lg" style={{ '--c': '8px' }} aria-label="플레이로 돌아가기">←</button>
        <div>
          <p className="font-display text-[10px] font-bold tracking-[0.3em] text-gray-500">TOURNAMENT</p>
          <b className="text-xl font-extrabold text-white">오늘의 토너먼트 · {t.done ? finish.ko : ROUNDS[t.round].ko}</b>
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
          <div className="min-h-0 flex-1 overflow-auto">
            <Tree t={t} oppIdx={oppIdx} reveal={reveal} />
          </div>
        </section>

        <aside className="ui-cut ui-frame ui-glass flex min-h-0 flex-col gap-3.5 p-6" style={{ '--c': '18px', '--a': oppTeam ? OPP : A }}>
          {oppTeam ? (
            <>
              <p className="ui-lab font-display" style={{ '--a': A }}>{ROUNDS[t.round].en}{myLast ? ` · 지난 경기 ${myLast.a === me ? myLast.as : myLast.bs}:${myLast.a === me ? myLast.bs : myLast.as} 승리` : ''}</p>
              <h2 className="-mt-1 text-3xl font-black text-white">{past ? `${ROUNDS[t.round].ko} 상대 분석` : `내 ${ROUNDS[t.round].ko} 경기`}</h2>
              <div className="ui-cut relative h-56 shrink-0 overflow-hidden bg-cover" style={{ '--c': '14px', backgroundImage: 'url(ui/broadcast-field.webp)', backgroundPosition: 'center 60%' }}>
                <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(5,8,15,.94),rgba(5,8,15,.6) 50%,rgba(5,8,15,.94))' }} />
                <div className="absolute left-5 top-4">
                  <p className="ui-lab font-display" style={{ '--a': ME }}>My Team</p>
                  <b className="block text-2xl font-black text-white">{mine.name}</b>
                  <span className="text-sm text-gray-400">팀 종합 <b className="font-display text-lg text-white">{teamRating(mine.roster)}</b></span>
                  <div className="mt-2"><Faces roster={mine.roster} /></div>
                </div>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-6xl font-extrabold italic text-white">VS</span>
                <div className="absolute right-5 top-4 text-right">
                  <p className="ui-lab font-display justify-end" style={{ '--a': OPP }}>Opponent</p>
                  <b className="block text-2xl font-black text-white">{oppTeam.name}</b>
                  <span className="text-sm text-gray-400">{opp.owner} · <b className="font-display text-lg text-white">{teamRating(oppTeam.roster)}</b></span>
                  <div className="mt-2"><Faces roster={oppTeam.roster} align="right" /></div>
                </div>
              </div>
              <div className="ui-cut grid shrink-0 items-center gap-x-2.5 gap-y-1.5 bg-white/[0.04] px-4 py-3 text-[13px]" style={{ '--c': '10px', gridTemplateColumns: '44px 1fr 34px 1fr 34px' }}>
                {myAxes.map(([k, a], i) => {
                  const b = oppAxes[i][1];
                  return (
                    <React.Fragment key={k}>
                      <span className="text-gray-300">{k}</span>
                      <span className="h-2 bg-white/[0.07]"><i className="block h-full" style={{ width: `${a}%`, background: a >= b ? ME : 'rgba(52,211,153,.35)' }} /></span>
                      <b className="text-center font-display" style={{ color: a >= b ? ME : '#94a3b8' }}>{a}</b>
                      <span className="h-2 bg-white/[0.07]"><i className="block h-full" style={{ width: `${b}%`, background: b > a ? OPP : 'rgba(248,113,113,.35)' }} /></span>
                      <b className="text-center font-display" style={{ color: b > a ? OPP : '#94a3b8' }}>{b}</b>
                    </React.Fragment>
                  );
                })}
              </div>
              <div>
                {road.length > 0 && (
                  <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 text-sm text-gray-300">
                    <span className="shrink-0">상대가 올라온 길</span><b className="truncate text-right text-white">{road.join(' · ')}</b>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 text-sm text-gray-300">
                  <span className="shrink-0">경계 선수</span>
                  <b className="truncate text-right" style={{ color: OPP }}>{keyPlayers.map((p) => `${p.name} ${p.position} ${p.overall}`).join(' · ')}</b>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 text-sm text-gray-300">
                  <span>이기면</span><b className="font-display text-lg text-white">{t.round === ROUNDS.length - 1 ? '우승' : `${ROUNDS[t.round + 1].ko} 진출`} · {FINISH[t.round + 1].gold} G 확보</b>
                </div>
              </div>
              <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={onPlay}>{ROUNDS[t.round].ko} 경기 시작 ▶</button>
            </>
          ) : (
            <>
              <p className="ui-lab font-display" style={{ '--a': t.place === ROUNDS.length ? A : OPP }}>Today&apos;s Result</p>
              <h2 className="-mt-1 text-6xl font-black" style={{ color: t.place === ROUNDS.length ? A : '#fff' }}>{finish.ko}</h2>
              {myLast && (
                <p className="text-base text-gray-300">
                  {ROUNDS[past - 1].ko} · {t.entrants[myLast.a].name} <b className="font-display text-xl text-white">{myLast.as} : {myLast.bs}</b> {t.entrants[myLast.b].name}
                  {myLast.tiebreak ? ' · 동점, 팀 종합으로 결정' : ''}
                </p>
              )}
              <Faces roster={mine.roster} n={6} />
              <div className="mt-2">
                {FINISH.slice().reverse().map((f) => (
                  <div key={f.ko} className="flex items-baseline justify-between border-b border-white/10 py-2 text-sm text-gray-300">
                    <span style={{ color: f === finish ? A : undefined }}>{f.ko}</span>
                    <b className="font-display text-lg" style={{ color: f === finish ? A : '#94a3b8' }}>{f.gold} G{f.rp ? ` · +${f.rp} RP` : ''}</b>
                  </div>
                ))}
              </div>
              {t.claimed
                ? <p className="ui-cut mt-auto bg-white/[0.05] py-4 text-center text-base font-bold text-gray-300" style={{ '--c': '10px' }}>내일 새 대진이 열립니다</p>
                : <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={onClaim}>보상 받기 · {finish.gold} G{finish.rp ? ` +${finish.rp} RP` : ''}</button>}
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
