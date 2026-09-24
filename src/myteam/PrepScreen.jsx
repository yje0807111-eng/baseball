/* 경기 전 정비 (내 팀) — 드래프트와 같은 정비 화면(ReadyScreen)에 내 팀 20자리를 올려 타순 · 수비 · 투수를 맞춘 뒤 경기로 */
import React, { useMemo, useState } from 'react';
import { KEYFRAMES, ReadyScreen } from '../KboAugmentDraft.jsx';
import { readyRoster } from './prep.js';
import { loadAccount } from './store.js';
import { myOpponent as tourOpponent, teamOf } from './tournament.js';
import { myOpponent as rankedOpponent } from './ranked.js';
import { AI_SERIES, seriesTeam, seriesName } from './aiTeam.js';
import { peekNextDuel } from './store.js';

const emblemOf = (name = '') => (/레전드/.test(name) ? 'ui/clubs/legend.webp' : /대표|코리아|프리미어|WBC|올림픽/.test(name) ? 'ui/clubs/korea.webp' : null);
/** 경기 전 정비 왼쪽 스카우팅에 넘길 상대 — 랭크전 · 토너먼트는 대진에서, 단판은 미리 뽑아 둔 상대에서 */
function opponentOf(sub, myTeam) {
  const a = loadAccount();
  if (!a) return null;
  let t = null;
  if (/^RANKED/.test(sub)) {
    const e = a.ranked ? rankedOpponent(a.ranked) : null;
    t = e ? teamOf(e, myTeam) : null;
  } else if (/^TOURNAMENT/.test(sub)) {
    const e = a.tournament ? tourOpponent(a.tournament) : null;
    t = e ? teamOf(e, myTeam) : null;
  } else {
    const series = AI_SERIES.find((x) => x.id === peekNextDuel());
    t = series ? { ...seriesTeam(series, () => 0.4), name: seriesName(series) } : null;
  }
  if (!t?.roster?.length) return null;
  const byId = new Map(t.roster.map((p) => [p.id, p]));
  const starter = (t.pitchOrder || []).map((id) => byId.get(id)).find(Boolean)
    || [...t.roster].filter((p) => p.type === 'pitcher').sort((x, y) => y.overall - x.overall)[0];
  return { name: t.name, roster: t.roster, batters: t.batters, starter, emblem: emblemOf(t.name), color: '#a78bfa' };
}


export default function PrepScreen({ team, title, sub, startLabel, onStart, onBack, backLabel = '대진표로', opponent = null }) {
  const init = useMemo(() => readyRoster(team), [team]);
  const opp = useMemo(() => opponent || opponentOf(sub || '', team), [opponent, sub, team]);
  const [ready, setReady] = useState(init.ready);
  const onMove = (from, to) => setReady((r) => r.map((p) => (p.slot === from ? { ...p, slot: to } : p.slot === to ? { ...p, slot: from } : p)));
  const onOrder = (ids) => setReady((r) => r.map((p) => (ids.includes(p.id) ? { ...p, batOrder: ids.indexOf(p.id) } : p)));

  return (
    <div className="min-h-screen bg-[#05080f] font-sans text-gray-100 antialiased lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <style>{KEYFRAMES}</style>
      <div className="ui-bg" style={{ backgroundImage: 'url(ui/ready.webp)' }} aria-hidden="true" />
      <header className="relative z-10 flex h-16 shrink-0 items-center gap-5 border-b border-[#10b981]/25 px-6" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))' }}>
        <button type="button" onClick={onBack} className="ui-cut grid h-10 w-10 place-items-center bg-white/[0.06] text-lg" style={{ '--c': '8px' }} aria-label={`${backLabel} 돌아가기`}>←</button>
        <div>
          <p className="font-display text-[10px] font-bold tracking-[0.3em] text-gray-500">{sub}</p>
          <b className="text-xl font-extrabold text-white">{title}</b>
        </div>
      </header>
      <main className="relative mx-auto grid w-full max-w-[1920px] gap-3 px-1.5 py-3 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5 lg:min-h-0">
          <ReadyScreen roster={ready} opponent={opp} onMove={onMove} onOrder={onOrder} onReplace={setReady}
            onStart={() => onStart(ready, init.rest)} onRestart={onBack} startLabel={startLabel} restartLabel={backLabel} />
        </div>
      </main>
    </div>
  );
}
