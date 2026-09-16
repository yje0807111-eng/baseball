/* 앱 입구: 로그인 → 메인 로비 → 라커 / 상점 / 경기 / 추가 모드 */
import React, { useState } from 'react';
import KboAugmentDraft from './KboAugmentDraft.jsx';
import LoginScreen from './myteam/LoginScreen.jsx';
import LobbyScreen from './myteam/LobbyScreen.jsx';
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
  if (view === 'locker') return <Soon title="내 라커는 다음 단계입니다" desc="연도·구단 검색으로 26인 엔트리와 코치진을 꾸미는 화면을 준비 중입니다." onBack={() => setView('lobby')} />;
  if (view === 'shop') return <Soon title="상점은 다음 단계입니다" desc="부스트·훈련·팩·감독 계약을 살 수 있는 화면을 준비 중입니다." onBack={() => setView('lobby')} />;
  if (view === 'play') return <Soon title="내 팀 경기는 라커를 채운 뒤에" desc="엔트리 26명을 채우면 중계 화면으로 바로 경기할 수 있습니다." onBack={() => setView('lobby')} />;

  return (
    <LobbyScreen account={account}
      onLocker={() => setView('locker')} onPlay={() => setView('play')} onShop={() => setView('shop')} onModes={() => setView('modes')}
      onSignOut={() => { signOut(); setAccount(null); }} />
  );
}
