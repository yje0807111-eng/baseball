/* 실제 ReadyScreen 을 띄워 보는 확인용 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { ReadyScreen, KEYFRAMES, withSlots, SLOTS } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';
import { seriesTeam, AI_SERIES } from '/src/myteam/aiTeam.js';

const ALL = SERIES.filter((s) => s.kind !== 'national').flatMap((s) => s.players);
const used = new Set();
const take = (pos, n) => ALL.filter((p) => p.position === pos && !used.has(p.id)).sort((a, b) => b.overall - a.overall).slice(0, n).map((p) => { used.add(p.id); return p; });
const ROSTER = withSlots([
  ...take('C', 1), ...take('1B', 1), ...take('2B', 1), ...take('3B', 1), ...take('SS', 1), ...take('OF', 3), ...take('DH', 1),
  ...take('SP', 1), ...take('RP', 4), ...take('OF', 2), ...take('C', 1), ...take('SS', 1), ...take('SP', 1), ...take('RP', 1),
]);
const OPP = seriesTeam(AI_SERIES[3], () => 0.4);

function Demo() {
  const [roster, setRoster] = useState(ROSTER);
  const opp = new URLSearchParams(location.search).get('opp') === '0' ? null
    : { name: OPP.name, roster: OPP.roster, batters: OPP.batters, emblem: 'ui/clubs/legend.webp', color: '#60a5fa' };
  return (
    <div className="relative flex flex-col overflow-hidden bg-[#05080f] font-sans text-gray-100" style={{ width: 1920, height: 911 }}>
      <style>{KEYFRAMES}</style>
      <div className="ui-bg" style={{ backgroundImage: 'url(ui/ready.webp)' }} aria-hidden="true" />
      <header className="relative z-10 flex shrink-0 items-center gap-5 border-b border-[#10b981]/25 px-6" style={{ height: 64, background: 'linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))' }}>
        <b className="text-xl font-extrabold text-white">레전드 드래프트 · 정비</b>
      </header>
      <main className="relative z-[1] flex min-h-0 flex-1 flex-col px-6 pb-6 pt-4">
        <ReadyScreen roster={roster} autoFilled={2} opponent={opp}
          onMove={() => {}} onOrder={() => {}} onReplace={setRoster}
          onStart={() => {}} onRestart={() => {}} />
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<Demo />);
