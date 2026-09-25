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

/* ── 여섯 축 맞대기 ── 모양은 레이더로, 격차는 막대로 ── */
const FLAT = '#94a3b8';
const LOW = 60, HIGH = 120; // 축 눈금 — 이 사이를 0~1 로 편다
const near = (v) => Math.max(0, Math.min(1, (v - LOW) / (HIGH - LOW)));
const sideOf = (a, b) => (a > b ? ME : a < b ? OPP : FLAT);
const angOf = (i, n) => (Math.PI * 2 * i) / n - Math.PI / 2;

/** 두 팀을 겹쳐 그리는 육각 레이더 */
function Hex({ rows, r = 64, pad = 22 }) {
  const n = rows.length;
  const S = (r + pad) * 2, c = S / 2;
  const at = (i, rad) => [c + Math.cos(angOf(i, n)) * rad, c + Math.sin(angOf(i, n)) * rad];
  const poly = (key) => rows.map((x, i) => at(i, r * (0.22 + 0.78 * near(x[key]))).map((v) => v.toFixed(1)).join(',')).join(' ');
  const web = (f) => rows.map((_, i) => at(i, r * f).map((v) => v.toFixed(1)).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="block h-auto w-full" style={{ maxWidth: S }} aria-hidden="true">
      {rows.map((_, i) => { const [x, y] = at(i, r);
        return <line key={`s${i}`} x1={c} y1={c} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="rgba(255,255,255,.09)" />; })}
      {[0.34, 0.67, 1].map((f) => <polygon key={f} points={web(f)} fill="none" stroke="rgba(255,255,255,.13)" />)}
      <polygon points={poly('b')} fill={`${OPP}3a`} stroke={OPP} strokeWidth="2.4" />
      <polygon points={poly('a')} fill={`${ME}3a`} stroke={ME} strokeWidth="2.4" />
      {rows.map((x, i) => { const [lx, ly] = at(i, r + pad * 0.62);
        return <text key={x.k} x={lx.toFixed(0)} y={(ly + 4).toFixed(0)} textAnchor="middle" fontSize="11" fontWeight="700" fill="#cbd5e1">{x.k}</text>; })}
    </svg>
  );
}

/** 여섯 축 맞대기 — 위는 팀 모양, 아래는 앞선 쪽으로만 뻗는 막대 */
export function Axes({ mine, opp }) {
  const a1 = axesOf(mine.roster), a2 = axesOf(opp.roster);
  const rows = a1.map(([k, a], i) => ({ k, a, b: a2[i][1] }));
  return (
    <div className="ui-cut shrink-0 bg-white/[0.04] px-4 py-3" style={{ '--c': '10px' }}>
      <div className="flex justify-between pb-1 font-display text-[10px] font-bold tracking-[0.2em]">
        <span style={{ color: ME }}>MY TEAM</span><span style={{ color: OPP }}>OPPONENT</span>
      </div>
      <div className="grid place-items-center"><Hex rows={rows} /></div>
      <div className="mt-1 grid items-center gap-x-2.5 gap-y-1 text-[12.5px]" style={{ gridTemplateColumns: '40px 1fr 38px' }}>
        {rows.map(({ k, a, b }) => {
          const d = a - b; const c = sideOf(a, b);
          return (
            <React.Fragment key={k}>
              <span className="text-gray-300">{k}</span>
              {/* 가운데가 동점 · 앞선 쪽으로만 뻗는다 */}
              <span className="relative block h-[13px] bg-white/[0.07]">
                <i className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
                <i className="absolute inset-y-0" style={{ [d >= 0 ? 'left' : 'right']: '50%', width: `${Math.min(50, Math.abs(d) * 2.4)}%`, background: c }} />
              </span>
              <b className="text-right font-display" style={{ color: c }}>{d > 0 ? '+' : ''}{d}</b>
            </React.Fragment>
          );
        })}
      </div>
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
