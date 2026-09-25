/*
 * 게임 화면 묶음 — 로비에서 어딘가로 들어갈 때 받아 온다.
 * 시즌 로스터 412개와 경기 엔진이 여기에 딸려 있어, 로그인·로비와 떼어 두었다.
 * 상태 중 account · view · playTab 은 App 이 들고 있고 나머지는 여기서 갖는다.
 */
import React, { useState, lazy, Suspense } from 'react';
import { tickBoosts } from './myteam/shop.js';
import { addHistory, addGold, saveTeam, saveTournament, claimTournament, saveRanked, claimRanked, loadAccount as reload } from './myteam/store.js';
import { normalPanels } from './myteam/NormalPlay.jsx';
import { rankedPanels } from './myteam/RankedPlay.jsx';
import { prepOf, matchTeamOf } from './myteam/prep.js';
import { afterGame } from './myteam/fatigue.js';
import { randomSeriesTeam } from './myteam/aiTeam.js';
import { makeTournament, myOpponent, teamOf, advance, roundsOf, finishOf } from './myteam/tournament.js';
import * as ranked from './myteam/ranked.js';
import { oppSeed, applyFormTeam } from './myteam/form.js';
import { gameDetail } from './myteam/gameDetail.js';

/* 화면마다 또 나눠 싣는다 — 드래프트 판과 경기 중계가 특히 무겁다 */
const KboAugmentDraft = lazy(() => import('./KboAugmentDraft.jsx'));
const LockerScreen = lazy(() => import('./myteam/LockerScreen.jsx'));
const ShopScreen = lazy(() => import('./myteam/ShopScreen.jsx'));
const RecordScreen = lazy(() => import('./myteam/RecordScreen.jsx'));
const AugmentScreen = lazy(() => import('./myteam/AugmentScreen.jsx'));
const BroadcastGame = lazy(() => import('./BroadcastGame.jsx'));
const TournamentBracket = lazy(() => import('./myteam/TournamentBracket.jsx'));
const RankedHub = lazy(() => import('./myteam/RankedHub.jsx'));
const PrepScreen = lazy(() => import('./myteam/PrepScreen.jsx'));

/** 화면이 오는 동안 잠깐 놓이는 자리 — 배경색만 같게 둔다 */
const Loading = () => <div className="min-h-screen" style={{ background: '#05080f' }} />;
const screen = (node) => <Suspense fallback={<Loading />}>{node}</Suspense>;

export default function GameApp({ account, setAccount, view, setView, playTab, setPlayTab }) {
  const [match, setMatch] = useState(null); // 경기 중인 두 팀 { my, opp, kind: 'duel' | 'tourney' | 'ranked' }
  const [prep, setPrep] = useState(null); // 경기 전 정비 { kind, sub, title, startLabel, back }
  const [format, setFormat] = useState(() => (account?.tournament?.size && !account.tournament.claimed ? account.tournament.size : 'single')); // 일반 대결 형식
  const tournament = account?.tournament?.size ? account.tournament : null;
  const season = account?.ranked || null;
  const refresh = () => setAccount(reload());
  const toModes = (tab) => { setPlayTab(tab); setView('modes'); };

  /* 단판: 정비 화면 → 무작위 팀과 한 경기 */
  const openDuel = () => {
    setPrep({ kind: 'duel', sub: 'SINGLE GAME', title: '단판 경기 전 정비', startLabel: '경기 시작 ▶', back: () => toModes('duel') });
    setView('prep');
  };
  /* 토너먼트: fresh 면 새 대진을 열어 저장, 아니면 진행 중인 대진표로 */
  const openTourney = (size, fresh) => {
    if (fresh || !tournament || tournament.size !== size) saveTournament(makeTournament({ size, myName: account.team?.name }));
    refresh();
    setView('bracket');
  };
  const openTourneyPrep = () => {
    const r = roundsOf(tournament.size)[tournament.round];
    setPrep({ kind: 'tourney', sub: `TOURNAMENT · ${r.en}`, title: `${r.ko} 경기 전 정비`, startLabel: `${r.ko} 경기 시작 ▶`, back: () => setView('bracket') });
    setView('prep');
  };
  const claimTourney = () => {
    if (!tournament?.done) return;
    claimTournament(finishOf(tournament.size)[tournament.place]);
    refresh();
  };

  /* 랭크전: 시즌이 없으면 새로 열고 시즌 화면으로 */
  const openRanked = () => {
    if (!season) saveRanked(ranked.makeSeason({ season: 1, myName: account.team?.name }));
    refresh();
    setView('ranked');
  };
  const newSeason = () => {
    saveRanked(ranked.makeSeason({ season: (season?.season || 0) + 1, myName: account.team?.name }));
    refresh();
  };
  const openRankedPrep = () => {
    const pm = ranked.postMatch(season);
    const label = pm ? ranked.STAGES[pm.stage].ko : `정규 ${season.round + 1}차전`;
    setPrep({ kind: 'ranked', sub: `RANKED · SEASON ${season.season}`, title: `${label} 경기 전 정비`, startLabel: `${label} 시작 ▶`, back: () => setView('ranked') });
    setView('prep');
  };
  const claimSeason = () => {
    if (!season?.done) return;
    claimRanked(ranked.PLACE_REWARD[season.place - 1]);
    refresh();
  };

  /* 정비 화면에서 시작: 바꾼 자리·타순을 저장하고, 정비 결과 그대로 상대와 경기 */
  const startFromPrep = (ready, rest, plan) => {
    /* 전략실에서 고른 작전은 팀에 남겨 다음 경기에도 그대로 이어 쓴다 */
    const team = { ...account.team, prep: prepOf(ready), ...(plan ? { plan } : {}) };
    let opp = null;
    if (prep.kind === 'duel') opp = randomSeriesTeam();
    else if (prep.kind === 'tourney') { const e = myOpponent(tournament); opp = e && teamOf(e, team); }
    else if (prep.kind === 'ranked') { const e = ranked.myOpponent(season); opp = e && teamOf(e, team); }
    if (!opp) return;
    /* 상대도 오늘 몸 상태를 안고 나온다 — 정비 화면 스카우팅에서 본 그대로 */
    opp = applyFormTeam(opp, oppSeed(opp.name, prep.sub || ''));
    saveTeam(team);
    refresh();
    setMatch({ my: matchTeamOf(team, ready, rest), opp, kind: prep.kind });
    setView('play');
  };

  /* 경기가 끝나면 전적·부스트 수명·투수 피로를 정리하고 각 모드 화면으로 */
  const finishMatch = (res) => {
    const played = reload()?.team || account.team; // 정비 화면에서 저장한 배치까지 포함
    const pitcherIds = (played.squad || []).filter((p) => p.type === 'pitcher').map((p) => p.id);
    saveTeam({ ...tickBoosts(played), pitchFatigue: afterGame(played.pitchFatigue, pitcherIds, res.pitchCounts || {}, res.starterId) });
    const mvp = res.mvpPlayer ? { id: res.mvpPlayer.id, name: res.mvpPlayer.name } : null;
    const detail = gameDetail(res, match.my, match.opp, played.boosts);
    const base = { my: account.team.name, opp: match.opp.name, myRuns: res.score.my, oppRuns: res.score.opp, winner: res.winner, mvp, detail };
    setMatch(null);
    if (match.kind === 'tourney') {
      // 토너먼트 경기는 경기마다 골드 대신, 끝난 뒤 성적 보상을 한 번에 받는다
      const round = roundsOf(tournament.size)[tournament.round]?.ko;
      saveTournament(advance(tournament, res.score, account.team));
      addHistory({ ...base, mode: 'tournament', round });
      refresh();
      setView('bracket');
      return;
    }
    if (match.kind === 'ranked') {
      const pm = ranked.postMatch(season);
      const round = pm ? ranked.STAGES[pm.stage].ko : `정규 ${season.round + 1}차전`;
      saveRanked(ranked.play(season, res.score, account.team));
      addHistory({ ...base, mode: 'ranked', round });
      refresh();
      setView('ranked');
      return;
    }
    addHistory(base);
    addGold(res.winner === 'my' ? 300 : res.winner === 'draw' ? 180 : 120);
    refresh();
    toModes('duel');
  };

  if (view === 'modes') {
    return screen(
      <KboAugmentDraft onExit={() => { setPlayTab(null); setView('lobby'); }} normalView={playTab} onNormalView={setPlayTab}
        normal={[
          normalPanels({ account, format, onFormat: setFormat, onPlay: openDuel, onTourney: openTourney, onLocker: () => setView('locker') }),
          rankedPanels({ account, onOpen: openRanked, onLocker: () => setView('locker') }),
        ]} />,
    );
  }
  if (view === 'augments') return screen(<AugmentScreen account={account} onBack={() => { refresh(); setView('lobby'); }} />);
  if (view === 'locker') return screen(<LockerScreen account={account} onSave={(team, gold) => setAccount((a) => ({ ...a, team, ...(gold != null ? { gold } : {}) }))} onBack={() => setView('lobby')} onShop={() => setView('shop')} />);
  if (view === 'record') return screen(<RecordScreen account={account} onBack={() => setView('lobby')} />);
  if (view === 'shop') return screen(<ShopScreen account={account} onChange={({ team, gold }) => setAccount((a) => ({ ...a, team, gold }))} onBack={() => setView('lobby')} />);
  if (view === 'bracket' && tournament) {
    return screen(<TournamentBracket t={tournament} myTeam={account.team} onBack={() => toModes('duel')} onPlay={openTourneyPrep} onClaim={claimTourney}
      onRestart={() => openTourney(tournament.size, true)} />);
  }
  if (view === 'ranked' && season) {
    return screen(<RankedHub s={season} account={account} onBack={() => toModes('ranked')} onPlay={openRankedPrep} onClaim={claimSeason} onNewSeason={newSeason} />);
  }
  if (view === 'prep' && prep) {
    return screen(<PrepScreen team={account.team} sub={prep.sub} title={prep.title} startLabel={prep.startLabel} onStart={startFromPrep} onBack={prep.back}
      backLabel={prep.kind === 'duel' ? '플레이로' : prep.kind === 'ranked' ? '순위표로' : '대진표로'} />);
  }
  if (view === 'play' && match) {
    return screen(<BroadcastGame my={match.my} opp={match.opp} onFinish={finishMatch}
      onExit={() => { const kind = match.kind; setMatch(null); if (kind === 'tourney') setView('bracket'); else if (kind === 'ranked') setView('ranked'); else toModes('duel'); }} />);
  }
  /* 갈 곳이 없으면(대진표·시즌이 없는데 그 화면을 불렀다면) 로비로 */
  return <Loading />;
}
