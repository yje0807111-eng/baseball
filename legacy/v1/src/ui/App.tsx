import { useState } from 'react';
import type { Pick } from '../game/roster';
import { DraftScreen } from './DraftScreen';
import { GameScreen } from './GameScreen';

export function App() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [key, setKey] = useState(0);
  return (
    <div className="app">
      <header className="topbar">
        <h1>KBO <span>드림 드래프트</span></h1>
        <span className="muted">{picks ? '경기' : '드래프트'}</span>
      </header>
      {picks
        ? <GameScreen myPicks={picks} onRestart={() => { setPicks(null); setKey(key + 1); }} />
        : <DraftScreen key={key} onDone={setPicks} />}
    </div>
  );
}
