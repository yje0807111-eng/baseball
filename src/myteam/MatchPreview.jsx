/* 경기 전 상대 분석 조각 — 토너먼트 대진표 · 랭크전 순위표 화면이 함께 쓴다 */
import React from 'react';
import { teamRating } from './match.js';

export const ME = '#34d399', OPP = '#f87171';

/** 여섯 축: 타자 넷(상위 9명 기준) · 선발 · 불펜 평균 */
export function axesOf(roster) {
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);
  const bats = roster.filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall).slice(0, 9);
  const top = (pos, n) => roster.filter((p) => p.position === pos).sort((a, b) => b.overall - a.overall).slice(0, n);
  return [
    ['파워', avg(bats.map((p) => p.stats.power))], ['컨택', avg(bats.map((p) => p.stats.contact))],
    ['주루', avg(bats.map((p) => p.stats.speed))], ['수비', avg(bats.map((p) => p.stats.defense))],
    ['선발', avg(top('SP', 5).map((p) => p.overall))], ['불펜', avg(top('RP', 8).map((p) => p.overall))],
  ];
}

export function Faces({ roster, n = 3, align }) {
  const top = [...roster].sort((a, b) => b.overall - a.overall).slice(0, n);
  return (
    <div className={`flex gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
      {top.map((p) => (
        <span key={p.id} title={`${p.name} ${p.overall}`} className="ui-cut relative h-16 w-12 overflow-hidden bg-[#0b1220] bg-cover"
          style={{ '--c': '6px', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`, backgroundPosition: '50% 10%' }}>
          <b className="absolute inset-x-0 bottom-0 bg-[#05080f]/80 text-center font-display text-[11px] leading-4 text-white">{p.overall}</b>
        </span>
      ))}
    </div>
  );
}

/** 내 팀 VS 상대 팀 판 */
export function Versus({ mine, opp, owner, className = 'h-56' }) {
  return (
    <div className={`ui-cut relative shrink-0 overflow-hidden bg-cover ${className}`} style={{ '--c': '14px', backgroundImage: 'url(ui/broadcast-field.webp)', backgroundPosition: 'center 60%' }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(5,8,15,.94),rgba(5,8,15,.6) 50%,rgba(5,8,15,.94))' }} />
      <div className="absolute left-5 top-4">
        <p className="ui-lab font-display" style={{ '--a': ME }}>My Team</p>
        <b className="block text-2xl font-black text-white">{mine.name}</b>
        <span className="text-sm text-gray-400">팀 종합 <b className="font-display text-lg text-white">{teamRating(mine.roster)}</b></span>
        <div className="mt-2"><Faces roster={mine.roster} /></div>
      </div>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-6xl font-extrabold italic text-white">VS</span>
      <div className="absolute right-5 top-4 text-right">
        <p className="ui-lab font-display justify-end" style={{ '--a': OPP }}>Opponent</p>
        <b className="block text-2xl font-black text-white">{opp.name}</b>
        <span className="text-sm text-gray-400">{owner ? `${owner} · ` : ''}<b className="font-display text-lg text-white">{teamRating(opp.roster)}</b></span>
        <div className="mt-2"><Faces roster={opp.roster} align="right" /></div>
      </div>
    </div>
  );
}

/** 여섯 축 맞대기 */
export function Axes({ mine, opp }) {
  const a1 = axesOf(mine.roster), a2 = axesOf(opp.roster);
  return (
    <div className="ui-cut grid shrink-0 items-center gap-x-2.5 gap-y-1.5 bg-white/[0.04] px-4 py-3 text-[13px]" style={{ '--c': '10px', gridTemplateColumns: '44px 1fr 34px 1fr 34px' }}>
      {a1.map(([k, a], i) => {
        const b = a2[i][1];
        return (
          <React.Fragment key={k}>
            <span className="text-gray-300">{k}</span>
            <span className="h-2 bg-white/[0.07]"><i className="block h-full" style={{ width: `${a}%`, background: a >= b ? ME : 'rgba(52,211,153,.35)' }} /></span>
            <b className="text-center font-display" style={{ color: a >= b ? ME : '#94a3b8' }}>{a}</b>
            <span className="h-2 bg-white/[0.07]"><i className="block h-full" style={{ width: `${b}%`, background: b > a ? OPP : 'rgba(248,113,113,.35)' }} /></span>
            <b className="text-center font-display" style={{ color: b > a ? OPP : '#94a3b8' }}>{b}</b>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export const keyPlayersOf = (roster) => [
  [...roster].filter((p) => p.type === 'pitcher').sort((a, b) => b.overall - a.overall)[0],
  [...roster].filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall)[0],
].filter(Boolean);

export const Row = ({ k, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 text-sm text-gray-300">
    <span className="shrink-0">{k}</span>{children}
  </div>
);
