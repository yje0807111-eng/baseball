import { useMemo, useState } from 'react';
import { aiDraft } from '../game/draft';
import { buildTeam, toSetup } from '../game/lineup';
import type { Pick } from '../game/roster';
import { inningsPitched, simulateGame, type GameResult, type TeamBox } from '../game/sim';
import { RosterPanel } from './RosterPanel';

function Scoreboard({ r }: { r: GameResult }) {
  const n = Math.max(r.away.line.length, r.home.line.length, 9);
  const row = (t: TeamBox) => (
    <tr>
      <td>{t.name}</td>
      {Array.from({ length: n }, (_, i) => <td key={i}>{t.line[i] === undefined ? '' : t.line[i] === null ? 'X' : t.line[i]}</td>)}
      <td className="total">{t.runs}</td>
      <td>{t.hits}</td>
      <td>{t.bb}</td>
    </tr>
  );
  return (
    <table className="scoreboard">
      <thead>
        <tr><th></th>{Array.from({ length: n }, (_, i) => <th key={i}>{i + 1}</th>)}<th>R</th><th>H</th><th>BB</th></tr>
      </thead>
      <tbody>{row(r.away)}{row(r.home)}</tbody>
    </table>
  );
}

function BoxScore({ t }: { t: TeamBox }) {
  return (
    <div>
      <h4 style={{ margin: '8px 0 4px' }}>{t.name}</h4>
      <table className="box">
        <thead><tr><th>타자</th><th>타수</th><th>안타</th><th>홈런</th><th>타점</th><th>득점</th><th>볼넷</th><th>삼진</th><th>도루</th></tr></thead>
        <tbody>
          {t.bat.map((b) => <tr key={b.name}><td>{b.name}</td><td>{b.ab}</td><td>{b.h}</td><td>{b.hr}</td><td>{b.rbi}</td><td>{b.r}</td><td>{b.bb}</td><td>{b.k}</td><td>{b.sb}</td></tr>)}
        </tbody>
      </table>
      <table className="box" style={{ marginTop: 8 }}>
        <thead><tr><th>투수</th><th>이닝</th><th>타자</th><th>피안타</th><th>실점</th><th>볼넷</th><th>삼진</th><th>피홈런</th></tr></thead>
        <tbody>
          {t.pitch.filter((p) => p.bf > 0).map((p) => <tr key={p.name}><td>{p.name}</td><td>{inningsPitched(p.outs)}</td><td>{p.bf}</td><td>{p.h}</td><td>{p.r}</td><td>{p.bb}</td><td>{p.k}</td><td>{p.hr}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function GameScreen({ myPicks, onRestart }: { myPicks: Pick[]; onRestart: () => void }) {
  const aiPicks = useMemo(() => aiDraft(), []);
  const me = useMemo(() => buildTeam('내 팀', myPicks), [myPicks]);
  const ai = useMemo(() => buildTeam('AI 팀', aiPicks), [aiPicks]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [tab, setTab] = useState<'log' | 'box' | 'teams'>('log');
  const [record, setRecord] = useState({ w: 0, l: 0, t: 0 });

  const play = () => {
    const r = simulateGame(toSetup(ai), toSetup(me));
    setResult(r);
    setRecord((x) => ({ w: x.w + (r.winner === 'home' ? 1 : 0), l: x.l + (r.winner === 'away' ? 1 : 0), t: x.t + (r.winner === 'tie' ? 1 : 0) }));
    setTab('log');
  };

  if (!result) {
    return (
      <div>
        <div className="two-col">
          <RosterPanel title="AI 팀" picks={aiPicks} />
          <RosterPanel title="내 팀" picks={myPicks} />
        </div>
        <div className="actions" style={{ justifyContent: 'center' }}>
          <button className="primary" onClick={play}>플레이볼 ⚾</button>
          <button className="ghost" onClick={onRestart}>다시 드래프트</button>
        </div>
      </div>
    );
  }

  const cls = result.winner === 'home' ? 'win' : result.winner === 'away' ? 'lose' : 'tie';
  const msg = result.winner === 'home' ? '승리!' : result.winner === 'away' ? '패배' : '무승부';

  return (
    <div>
      <div className={`result-banner ${cls}`}>
        {msg} <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 12 }}>{result.home.runs} : {result.away.runs}</span>
        <div className="muted" style={{ marginTop: 4 }}>통산 {record.w}승 {record.l}패 {record.t}무</div>
      </div>
      <div className="panel">
        <Scoreboard r={result} />
        <div className="tabs">
          <button className={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>중계</button>
          <button className={tab === 'box' ? 'active' : ''} onClick={() => setTab('box')}>기록</button>
          <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>라인업</button>
        </div>
        {tab === 'log' && (
          <div className="log">
            {result.halves.map((h, i) => (
              <div key={i} className={`half${h.runs ? ' scored' : ''}`}>
                <h4>{h.inning}회 {h.top ? '초' : '말'} · {h.top ? result.away.name : result.home.name} 공격{h.runs ? <span>{h.runs}득점</span> : null}</h4>
                <ul>{h.events.map((e, j) => <li key={j} className={e.runs || e.kind === 'hr' || e.kind === 'walkoff' || e.kind === 'change' || e.kind === 'sb' ? 'hl' : ''}>{e.who ? `${e.who} — ` : ''}{e.text}{e.runs ? ` · ${e.runs}득점` : ''}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
        {tab === 'box' && <div className="two-col"><BoxScore t={result.away} /><BoxScore t={result.home} /></div>}
        {tab === 'teams' && <div className="two-col"><RosterPanel title="AI 팀" picks={aiPicks} /><RosterPanel title="내 팀" picks={myPicks} /></div>}
      </div>
      <div className="actions" style={{ justifyContent: 'center' }}>
        <button className="primary" onClick={play}>한 경기 더</button>
        <button className="ghost" onClick={onRestart}>다시 드래프트</button>
      </div>
    </div>
  );
}
