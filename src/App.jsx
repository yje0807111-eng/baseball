/* 앱 입구: 로그인 → 홈(내 팀) → 팀 편성 / 경기 / 추가 모드(레전드 드래프트) */
import React, { useState } from 'react';
import KboAugmentDraft from './KboAugmentDraft.jsx';
import LoginScreen from './myteam/LoginScreen.jsx';
import HomeScreen from './myteam/HomeScreen.jsx';
import { loadAccount, signOut } from './myteam/store.js';

export default function App() {
  const [account, setAccount] = useState(() => loadAccount());
  const [view, setView] = useState('home'); // home | modes | squad

  if (!account) return <LoginScreen onDone={setAccount} />;
  if (view === 'modes') {
    return (
      <>
        <KboAugmentDraft />
        <button type="button" onClick={() => setView('home')}
          className="fixed bottom-4 left-4 z-[60] bg-[#05080f]/90 px-4 py-2 text-sm font-bold text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.2)]"
          style={{ clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)' }}>← 내 팀으로</button>
      </>
    );
  }
  if (view === 'squad') {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#05080f] p-8 text-center text-gray-300">
        <div>
          <h2 className="text-2xl font-black text-white">팀 편성 화면은 준비 중입니다</h2>
          <p className="mt-2 text-sm text-gray-400">다음 단계에서 연도·구단 검색으로 26인 엔트리와 코치진을 꾸미게 됩니다.</p>
          <button type="button" onClick={() => setView('home')} className="mt-5 bg-white/10 px-5 py-2.5 font-bold text-white">돌아가기</button>
        </div>
      </div>
    );
  }
  return (
    <HomeScreen account={account} onEdit={() => setView('squad')} onPlay={() => setView('squad')} onModes={() => setView('modes')}
      onSignOut={() => { signOut(); setAccount(null); }} />
  );
}
