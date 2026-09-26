/*
 * 앱 입구: 로그인 → 메인 로비 → (그 밖의 화면은 GameApp 이 맡는다)
 * 로비까지는 가볍게 뜨도록, 시즌 로스터·경기 엔진이 딸린 화면들은 GameApp 으로 떼어
 * 로비에서 어딘가로 들어갈 때 받아 온다.
 */
import React, { useState, useEffect, lazy, Suspense } from 'react';
import LoginScreen from './myteam/LoginScreen.jsx';
import LobbyScreen from './myteam/LobbyScreen.jsx';
import { loadAccount, signOut, needsStarter, grantStarter, dismissNotice } from './myteam/store.js';
import { online } from './net/supabase.js';
import { resume, logOut } from './net/account.js';
import { startSync } from './net/sync.js';

const GameApp = lazy(() => import('./GameApp.jsx'));

/** 화면이 오는 동안 잠깐 놓이는 자리 — 배경색만 같게 둔다 */
const Loading = () => <div className="min-h-screen" style={{ background: '#05080f' }} />;

export default function App() {
  /* 서버 키가 있으면 남은 로그인부터 확인하고(boot) 그 계정 저장을 받아 연다 — 이 브라우저 사본이 다른 계정 것일 수 있다 */
  const [account, setAccount] = useState(() => (online ? null : loadAccount()));
  const [boot, setBoot] = useState(online);
  const enter = (uid) => {
    startSync(uid, () => setAccount(loadAccount())); // 다른 기기 저장을 받아 깔면 화면도 다시 읽는다
    setAccount(loadAccount());
  };
  useEffect(() => {
    if (!online) return;
    resume().then((uid) => uid && enter(uid)).catch(() => {}).finally(() => setBoot(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState(() => (import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') ? 'modes' : 'lobby'));
  const [playTab, setPlayTab] = useState(null); // 경기를 마치고 돌아올 플레이 탭
  const [recordTab, setRecordTab] = useState('all'); // 기록 화면을 열 칸 (메인 주간 과제에서 오면 'week')

  /* 메인으로 돌아올 때 저장본을 다시 읽는다 — 라커 · 드래프트에서 바로 저장한 값(과제 진행 등)을 메인 판에 */
  useEffect(() => { if (view === 'lobby' && account) setAccount(loadAccount()); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 빈 라커로 시작하는 계정에는 스타터 26명을 한 번 준다 — 선수 데이터가 무거워 로비와 떼어 필요할 때만 받아 온다 */
  const starterDue = needsStarter(account);
  useEffect(() => {
    if (!starterDue) return undefined;
    let alive = true;
    import('./myteam/starter.js').then(({ starterSquad }) => {
      if (alive && grantStarter(starterSquad(account.nick))) setAccount(loadAccount());
    });
    return () => { alive = false; };
  }, [starterDue, account?.nick]);

  if (boot) return <Loading />;
  if (!account) return <LoginScreen onDone={(a) => { if (online) enter(a); else setAccount(a); setView('lobby'); }} />;
  if (view !== 'lobby') {
    return (
      <Suspense fallback={<Loading />}>
        <GameApp account={account} setAccount={setAccount} view={view} setView={setView} playTab={playTab} setPlayTab={setPlayTab} recordTab={recordTab} />
      </Suspense>
    );
  }
  return (
    <LobbyScreen account={account}
      onLocker={() => setView('locker')} onPlay={(tab) => { setPlayTab(tab || null); setView('modes'); }} onShop={() => setView('shop')}
      onAugments={() => setView('augments')} onRecord={() => { setRecordTab('all'); setView('record'); }} onWeek={() => { setRecordTab('week'); setView('record'); }}
      onNotice={(go) => { dismissNotice(); setAccount(loadAccount()); if (go) setView('locker'); }}
      onSignOut={() => { if (online) logOut().finally(() => setAccount(null)); else { signOut(); setAccount(null); } }} />
  );
}
