/*
 * 플레이 뷰 실험실 (개발용, 빌드에는 안 들어간다)
 *   npm run dev → /play-lab.html        상황별 플레이를 돌려 가며 본다
 *   npm run dev → /play-lab.html?full   실제 경기 화면을 드래프트 없이 바로 띄운다
 * 선수 그림을 점에서 스프라이트로 바꿀 때 여기서 보면 된다.
 */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import BroadcastGame from './BroadcastGame.jsx';
import PlayView from './play/PlayView.jsx';
import { randomSeriesTeam } from './myteam/aiTeam.js';
import { hitLocation } from './engine/pitchSim.js';
import './index.css';

const P = (id, name) => ({ id, name, overall: 85, position: 'OF', type: 'batter', stats: { contact: 80, power: 85, speed: 75, defense: 75 } });
const bat = P('b', '김하성'); const r1 = P('r1', '이정후'); const r3 = P('r3', '박병호');
const pit = P('p', '류현진');
const seeded = (n) => { let x = n; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };

const base = (over) => ({
  inning: 7, top: false, batter: bat, pitcher: pit,
  pitch: { type: 'fast', zone: 4, inZone: true, velo: 149 },
  before: { outs: 1, balls: 1, strikes: 2, bases: [r1, null, r3] },
  ...over,
});
const CASES = [
  ['홈런 (주자 1·3루)', base({ call: 'inplay', result: 'HR', runs: 3, after: { outs: 1, balls: 0, strikes: 0, bases: [null, null, null] }, hit: hitLocation(seeded(7), 'HR', { power: 92 }) })],
  ['2루타', base({ call: 'inplay', result: '2B', runs: 2, after: { outs: 1, balls: 0, strikes: 0, bases: [null, bat, null] }, hit: hitLocation(seeded(3), '2B', { power: 84 }) })],
  ['땅볼 아웃', base({ call: 'inplay', result: 'GO', runs: 0, after: { outs: 2, balls: 0, strikes: 0, bases: [null, r1, r3] }, hit: hitLocation(seeded(11), 'GO', {}) })],
  ['헛스윙', base({ call: 'swinging', after: { outs: 1, balls: 1, strikes: 3, bases: [r1, null, r3] } })],
  ['볼', base({ call: 'ball', pitch: { type: 'slider', zone: null, inZone: false, velo: 133 }, after: { outs: 1, balls: 2, strikes: 2, bases: [r1, null, r3] } })],
];

function Show() {
  const [i, setI] = useState(0);
  useEffect(() => { const h = setInterval(() => setI((v) => (v + 1) % CASES.length), 2800); return () => clearInterval(h); }, []);
  const [label, ev] = CASES[i];
  return (
    <div className="min-h-dvh bg-[#05080f] p-4">
      <p className="mb-2 font-display text-sm text-emerald-400" data-case>{label}</p>
      <div className="relative bg-[url(ui/broadcast-field.webp)] bg-cover" style={{ width: 816, height: 698 }}>
        <PlayView event={ev} atBat={[ev]} beatMs={2400} bases={ev.before.bases} offColor="#34d399" defColor="#f87171" />
      </div>
    </div>
  );
}

const full = new URLSearchParams(location.search).has('full');
const my = randomSeriesTeam(); const opp = randomSeriesTeam();
createRoot(document.getElementById('root')).render(
  full ? <BroadcastGame my={{ ...my, name: '우리 팀' }} opp={opp} onFinish={() => {}} onExit={() => {}} /> : <Show />,
);
