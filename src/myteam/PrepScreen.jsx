/*
 * 경기 전 정비 (내 팀) — 라커 배치 한 벌(team.order)을 그대로 펼친다: 타순 9 · 선발 로테이션 5 · 불펜 8 · 벤치.
 * 여기서 바꾼 배치는 라커에 바로 저장된다(라커 · 정비가 같은 배치). 드래프트 정비(20자리)와는 따로 돈다.
 */
import React, { useMemo, useState } from 'react';
import { KEYFRAMES, readyStats, oppTeamFor, winPct } from '../KboAugmentDraft.jsx';
import ReadyLocker from './ReadyLocker.jsx';
import { readyRoster, todaySquad } from './prep.js';
import { loadAccount, saveTeam } from './store.js';
import { myOpponent as tourOpponent, teamOf } from './tournament.js';
import { myOpponent as rankedOpponent } from './ranked.js';
import { AI_SERIES, seriesTeam, seriesName } from './aiTeam.js';
import { peekNextDuel } from './store.js';
import { formSeed, oppSeed, applyFormTeam } from './form.js';
import CapBar from './CapBar.jsx';
import { capUse } from './rules.js';
import { CARD_ITEMS, TEAM_BOOST_KO, STAT_KO, cardCount } from './shop.js';
import BgmButton from '../audio/BgmButton.jsx';

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
  /* 상대도 오늘 몸 상태를 안고 나온다 — 경기에서 쓰는 씨앗과 같다 */
  const w = applyFormTeam({ name: t.name, roster: t.roster, batters: t.batters, starter }, oppSeed(t.name, sub));
  return { ...w, emblem: emblemOf(t.name), color: '#a78bfa' };
}


export default function PrepScreen({ team, title, sub, startLabel, onStart, onBack, backLabel = '대진표로', opponent = null, block = null, onSaved = null }) {
  const opp = useMemo(() => opponent || opponentOf(sub || '', team), [opponent, sub, team]);
  /* 오늘 몸 상태 — 상대와 내 엔트리로 씨를 심어, 같은 경기에서는 다시 굴러가지 않는다 */
  const seed = useMemo(() => formSeed(opp?.name || '', sub || '', String((team.roster || []).length)), [opp, sub, team]);
  /* 배치만 바뀌는 내 팀 — 능력치(컨디션 · 코치 · 피로)는 화면에만 얹고, 저장은 배치(order) · 벤치만 */
  const [mine, setMine] = useState(team);
  const shown = useMemo(() => todaySquad(mine, seed), [mine, seed]);
  const { ready } = useMemo(() => readyRoster(mine, seed), [mine, seed]);
  const stats = useMemo(() => readyStats(ready, 0), [ready]);
  const commit = (next) => {
    const t = { ...mine, order: next.order || mine.order, bench: next.bench || mine.bench || [] };
    setMine(t);
    saveTeam(t); // 라커 배치에 바로
    onSaved?.(); // 앱이 들고 있는 계정도 새로 — 정비에서 돌아가 라커를 열면 바꾼 배치 그대로
  };
  const win = useMemo(() => (opp ? winPct(stats.t, oppTeamFor(opp, 0)) : null), [opp, stats]);
  const on = ready.filter((p) => !String(p.slot).startsWith('BN'));
  const teamInfo = {
    ovr: on.length ? Math.round(on.reduce((n, p) => n + p.overall, 0) / on.length) : 0,
    count: shown.length, cap: shown.length, foreign: shown.filter((p) => p.isForeign).length,
  };

  return (
    <div className="min-h-screen bg-[#05080f] font-sans text-gray-100 antialiased lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <style>{KEYFRAMES}</style>
      <div className="ui-bg" style={{ backgroundImage: 'url(ui/ready.webp)' }} aria-hidden="true" />
      <header className="relative z-10 flex h-[4.75rem] shrink-0 items-center gap-5 border-b border-[#f5d27a]/20 px-7" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))' }}>
        <button type="button" onClick={onBack} className="ui-cut grid h-10 w-10 place-items-center bg-white/[0.06] text-t2" style={{ '--c': '8px' }} aria-label={`${backLabel} 돌아가기`}>←</button>
        <div>
          <p className="text-t4 font-bold tracking-[0.04em] text-gray-400">{sub}</p>
          <b className="text-t1 font-black text-white">{title}</b>
        </div>
        <CapBar team={team} sm className="ml-auto w-[248px]" />
        <BgmButton />
      </header>
      <main className="relative grid w-full gap-3 px-1.5 py-3 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5 lg:min-h-0">
          <ReadyLocker full team={{ ...mine, squad: shown }} squad={shown} bench={mine.bench || []} opponent={opp} win={win}
            sums={{ bat: stats.batSum, def: stats.defSum, pit: stats.pitSum }} synergies={stats.t.synergies} teamInfo={teamInfo}
            onCommit={commit}
            startBlock={capUse(team).over ? `CP ${capUse(team).over.toLocaleString()} 초과 — 라커에서 정리` : block ? `조건 불충족 · ${block}` : null}
            cards={CARD_ITEMS.map((it) => ({ id: it.id, name: it.name, effect: `${TEAM_BOOST_KO[it.teamBoost]} ${STAT_KO[it.stat]} +${it.amount}`, n: cardCount(team, it.id) }))}
            onStart={(plan, card) => onStart(ready, [], plan, card)} startLabel={startLabel} />
        </div>
      </main>
    </div>
  );
}
