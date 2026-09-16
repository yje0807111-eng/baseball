/* 앱 입구: 로그인 → 메인 로비 → 라커 / 상점 / 경기 / 추가 모드 */
import React, { useState } from 'react';
import KboAugmentDraft from './KboAugmentDraft.jsx';
import LoginScreen from './myteam/LoginScreen.jsx';
import LobbyScreen from './myteam/LobbyScreen.jsx';
import LockerScreen from './myteam/LockerScreen.jsx';
import ShopScreen from './myteam/ShopScreen.jsx';
import BroadcastGame from './BroadcastGame.jsx';
import { buildMyTeam, buildAiTeam } from './myteam/match.js';
import { tickBoosts } from './myteam/shop.js';
import { addHistory, addGold, saveTeam, loadAccount as reload } from './myteam/store.js';
import { loadAccount, signOut } from './myteam/store.js';

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
  const [view, setView] = useState('lobby');
  const [match, setMatch] = useState(null); // 경기 중인 두 팀

  const startMatch = () => {
    const my = buildMyTeam(account.team);
    const opp = buildAiTeam(account.team.cap || 2000);
    setMatch({ my, opp });
    setView('play');
  };

  /* 경기가 끝나면 전적·골드·부스트 수명을 정리하고 메인으로 */
  const finishMatch = (res) => {
    const reward = res.winner === 'my' ? 300 : res.winner === 'draw' ? 180 : 120;
    saveTeam(tickBoosts(account.team));
    addHistory({ my: account.team.name, opp: 'AI 올스타', myRuns: res.score.my, oppRuns: res.score.opp, winner: res.winner });
    addGold(reward);
    setAccount(reload());
    setMatch(null);
    setView('lobby');
  };

  if (!account) return <LoginScreen onDone={(a) => { setAccount(a); setView('lobby'); }} />;
  if (view === 'modes') {
    return (
      <>
        <KboAugmentDraft />
        <button type="button" onClick={() => setView('lobby')}
          className="fixed bottom-4 left-4 z-[60] bg-[#05080f]/90 px-4 py-2 text-sm font-bold text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.2)]"
          style={{ clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)' }}>← 메인으로</button>
      </>
    );
  }
  if (view === 'locker') return <LockerScreen account={account} onSave={(team) => setAccount((a) => ({ ...a, team }))} onBack={() => setView('lobby')} />;
  if (view === 'shop') return <ShopScreen account={account} onChange={({ team, gold }) => setAccount((a) => ({ ...a, team, gold }))} onBack={() => setView('lobby')} />;
  if (view === 'play' && match) return <BroadcastGame my={match.my} opp={match.opp} onFinish={finishMatch} onExit={() => { setMatch(null); setView('lobby'); }} />;

  return (
    <LobbyScreen account={account}
      onLocker={() => setView('locker')} onPlay={startMatch} onShop={() => setView('shop')} onModes={() => setView('modes')}
      onSignOut={() => { signOut(); setAccount(null); }} />
  );
}
