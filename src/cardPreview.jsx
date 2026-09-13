// 개발용: 선수 카드만 나란히 렌더링 (그림 스타일 검수용). card-preview.html?ids=lsy03,ljb94,thm15 또는 ?ids=all
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PLAYERS, PlayerCard, preloadArt } from './KboAugmentDraft.jsx';
import './index.css';

const param = new URLSearchParams(location.search).get('ids') || 'lsy03,ljb94,thm15';
const players = param === 'all' ? PLAYERS : param.split(',').map((id) => PLAYERS.find((p) => p.id === id)).filter(Boolean);

preloadArt(players).then(() => {
  createRoot(document.getElementById('root')).render(
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 32, background: '#111827', minHeight: '100vh' }}>
      {players.map((p) => (
        <div key={p.id} style={{ width: 300 }}>
          <PlayerCard player={p} reason={null} onSelect={() => {}} />
        </div>
      ))}
    </div>,
  );
});
