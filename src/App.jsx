/* 앱 입구: 로그인 → 메인 로비 → 라커 / 상점 / 경기 / 추가 모드 */
import React, { useMemo, useState } from 'react';
import KboAugmentDraft from './KboAugmentDraft.jsx';
import LoginScreen from './myteam/LoginScreen.jsx';
import LobbyScreen from './myteam/LobbyScreen.jsx';
import LockerScreen from './myteam/LockerScreen.jsx';
import ShopScreen from './myteam/ShopScreen.jsx';
import AugmentScreen from './myteam/AugmentScreen.jsx';
import BroadcastGame from './BroadcastGame.jsx';
import { buildMyTeam, buildAiTeam } from './myteam/match.js';
import { tickBoosts } from './myteam/shop.js';
import { addHistory, addGold, saveTeam, saveTournament, claimTournament, loadAccount as reload } from './myteam/store.js';
import { loadAccount, signOut } from './myteam/store.js';
import { normalPanels } from './myteam/NormalPlay.jsx';
import { tournamentPanels } from './myteam/TournamentPlay.jsx';
import TournamentBracket from './myteam/TournamentBracket.jsx';
import PrepScreen from './myteam/PrepScreen.jsx';
import { prepOf, matchTeamOf } from './myteam/prep.js';
import { afterGame } from './myteam/fatigue.js';
import { todayKey, makeTournament, myOpponent, teamOf, advance, ROUNDS, FINISH } from './myteam/tournament.js';

/** 오늘 날짜의 토너먼트: 저장된 게 오늘 것이면 그대로, 아니면 새 대진 */
const todayTournament = (account) => {
  const today = todayKey();
  return account?.tournament?.date === today ? account.tournament : makeTournament(today, account?.team?.name);
};

const Soon = ({ title, desc, onBack }) => (
  <div className="grid min-h-dvh place-items-center bg-[#05080f] p-8 text-center text-gray-300">
    <div>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-400">{desc}</p>
      <button type="button" onClick={onBack} className="mt-5 bg-white/10 px-5 py-2.5 font-bold text-white">메인으로</button>
    </div>
  </div>
);

export default function App() {
  const [account, setAccount] = useState(() => loadAccount());
  const [view, setView] = useState(() => (import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') ? 'modes' : 'lobby'));
  const [match, setMatch] = useState(null); // 경기 중인 두 팀 { my, opp, kind: 'duel' | 'tourney' }
  const [playTab, setPlayTab] = useState(null); // 경기를 마치고 돌아올 일반 모드 탭
  const tournament = useMemo(() => (account ? todayTournament(account) : null), [account]);

  const startMatch = () => {
    const my = buildMyTeam(account.team);
    const opp = buildAiTeam(account.team.cap || 2000);
    setMatch({ my, opp, kind: 'duel' });
    setView('play');
  };

  /* 토너먼트 입장: 오늘 대진을 이때 확정해 저장하고 대진표로 */
  const enterTourney = () => {
    if (account.tournament?.date !== tournament.date) saveTournament(tournament);
    setAccount(reload());
    setView('bracket');
  };
  /* 정비 화면에서 시작: 바꾼 자리·타순을 저장하고, 정비 결과 그대로 이번 라운드 상대와 경기 */
  const startTourney = (ready, rest) => {
    const t = tournament;
    const entry = myOpponent(t);
    if (!entry) return;
    const team = { ...account.team, prep: prepOf(ready) };
    saveTeam(team);
    setAccount(reload());
    setMatch({ my: matchTeamOf(team, ready, rest), opp: teamOf(entry, team), kind: 'tourney', round: t.round });
    setView('play');
  };
  const claimTourney = () => {
    const t = account.tournament;
    if (!t?.done) return;
    claimTournament(FINISH[t.place]);
    setAccount(reload());
  };

  /* 경기가 끝나면 전적·골드·부스트 수명을 정리하고 메인으로 */
  const finishMatch = (res) => {
    const played = reload()?.team || account.team; // 정비 화면에서 저장한 배치까지 포함
    const pitcherIds = (played.squad || []).filter((p) => p.type === 'pitcher').map((p) => p.id);
    saveTeam({ ...tickBoosts(played), pitchFatigue: afterGame(played.pitchFatigue, pitcherIds, res.pitchCounts || {}, res.starterId) });
    const mvp = res.mvpPlayer ? { id: res.mvpPlayer.id, name: res.mvpPlayer.name } : null;
    if (match?.kind === 'tourney') {
      // 토너먼트 경기는 경기마다 골드 대신, 끝난 뒤 성적 보상을 한 번에 받는다
      const t = advance(tournament, res.score, account.team);
      saveTournament(t);
      addHistory({ my: account.team.name, opp: match.opp.name, myRuns: res.score.my, oppRuns: res.score.opp, winner: res.winner, mvp, mode: 'tournament', round: ROUNDS[match.round]?.ko });
      setAccount(reload());
      setMatch(null);
      setView('bracket');
      return;
    }
    const reward = res.winner === 'my' ? 300 : res.winner === 'draw' ? 180 : 120;
    addHistory({ my: account.team.name, opp: 'AI 올스타', myRuns: res.score.my, oppRuns: res.score.opp, winner: res.winner, mvp });
    addGold(reward);
    setAccount(reload());
    setMatch(null);
    setView('lobby');
  };

  if (!account) return <LoginScreen onDone={(a) => { setAccount(a); setView('lobby'); }} />;
  if (view === 'modes') {
    return (
      <KboAugmentDraft onExit={() => { setPlayTab(null); setView('lobby'); }} normalView={playTab}
        normal={[
          normalPanels({ account, onPlay: startMatch, onLocker: () => setView('locker') }),
          tournamentPanels({ account, tournament, onEnter: enterTourney, onLocker: () => setView('locker') }),
        ]} />
    );
  }
  if (view === 'augments') return <AugmentScreen account={account} onBack={() => { setAccount(reload()); setView('lobby'); }} />;
  if (view === 'locker') return <LockerScreen account={account} onSave={(team) => setAccount((a) => ({ ...a, team }))} onBack={() => setView('lobby')} />;
  if (view === 'shop') return <ShopScreen account={account} onChange={({ team, gold }) => setAccount((a) => ({ ...a, team, gold }))} onBack={() => setView('lobby')} />;
  if (view === 'bracket' && tournament) {
    return <TournamentBracket t={tournament} myTeam={account.team} onBack={() => { setPlayTab('tourney'); setView('modes'); }} onPlay={() => setView('prep')} onClaim={claimTourney} />;
  }
  if (view === 'prep' && tournament && !tournament.done) {
    return <PrepScreen team={account.team} sub={`TOURNAMENT · ${ROUNDS[tournament.round].en}`} title={`${ROUNDS[tournament.round].ko} 경기 전 정비`}
      startLabel={`${ROUNDS[tournament.round].ko} 경기 시작 ▶`} onStart={startTourney} onBack={() => setView('bracket')} />;
  }
  if (view === 'play' && match) {
    return <BroadcastGame my={match.my} opp={match.opp} onFinish={finishMatch}
      onExit={() => { const back = match.kind === 'tourney' ? 'bracket' : 'lobby'; setMatch(null); setView(back); }} />;
  }

  return (
    <LobbyScreen account={account}
      onLocker={() => setView('locker')} onPlay={() => setView('modes')} onShop={() => setView('shop')} onAugments={() => setView('augments')}
      onSignOut={() => { signOut(); setAccount(null); }} />
  );
}
