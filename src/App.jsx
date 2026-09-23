/*
 * 앱 입구: 로그인 → 메인 로비 → (그 밖의 화면은 GameApp 이 맡는다)
 * 로비까지는 가볍게 뜨도록, 시즌 로스터·경기 엔진이 딸린 화면들은 GameApp 으로 떼어
 * 로비에서 어딘가로 들어갈 때 받아 온다.
 */
import React, { useState, lazy, Suspense } from 'react';
import LoginScreen from './myteam/LoginScreen.jsx';
import LobbyScreen from './myteam/LobbyScreen.jsx';
import { loadAccount, signOut } from './myteam/store.js';

const GameApp = lazy(() => import('./GameApp.jsx'));

/** 화면이 오는 동안 잠깐 놓이는 자리 — 배경색만 같게 둔다 */
const Loading = () => <div className="min-h-screen" style={{ background: '#05080f' }} />;

export default function App() {
  const [account, setAccount] = useState(() => loadAccount());
  const [view, setView] = useState(() => (import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') ? 'modes' : 'lobby'));
  const [playTab, setPlayTab] = useState(null); // 경기를 마치고 돌아올 플레이 탭

  if (!account) return <LoginScreen onDone={(a) => { setAccount(a); setView('lobby'); }} />;
  if (view !== 'lobby') {
    return (
      <Suspense fallback={<Loading />}>
        <GameApp account={account} setAccount={setAccount} view={view} setView={setView} playTab={playTab} setPlayTab={setPlayTab} />
      </Suspense>
    );
  }
  return (
    <LobbyScreen account={account}
      onLocker={() => setView('locker')} onPlay={(tab) => { setPlayTab(tab || null); setView('modes'); }} onShop={() => setView('shop')}
      onAugments={() => setView('augments')} onRecord={() => setView('record')}
      onSignOut={() => { signOut(); setAccount(null); }} />
  );
}
