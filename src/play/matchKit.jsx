/*
 * 경기 공용 조각 — 엔진용 팀 만들기(engineTeam · engineUsage) · 경기 결과(buildResult) · 점수판(Scoreboard · Diamond · Bso) · 구단 약칭(shortTeam).
 * 옛 중계 화면(BroadcastGame)에 있던 것을 화면을 지우며 옮겼다(2026-10-02). 경기 화면은 play/ChoiceGame.jsx
 */
import { teamFlag, flagByKey } from '../myteam/teamArt.js';
import { myBanner } from '../myteam/store.js';
import { RESULT_LABEL, DEFAULT_USAGE } from '../engine/pitchSim.js';

const st = (p, k, d = 70) => p?.stats?.[k] ?? d;
/* 스코어보드 — 중계 자막처럼 짧게 부르고, 팀 줄에는 대진표와 같은 깃발을 깐다 */
export const SB_MASK = 'linear-gradient(90deg,transparent 8%,#000 88%)';
const SB_SHORT = { kia: 'KIA', doosan: '두산', samsung: '삼성', hanwha: '한화', lg: 'LG', lotte: '롯데', nc: 'NC', kt: 'KT', hyundai: '현대', sk: 'SSG', kiwoom: '키움', korea: '한국', legend: '레전드' };
/** 내 팀은 앞의 '나의'를 떼고 네 글자까지, 상대는 그 시절 구단 이름(1989 MBC 청룡 → MBC · 2010 SK → SK). 대표 · 레전드만 약칭 */
export function shortTeam(name = '', mine = false) {
  if (mine) return name.replace(/^나의\s*/, '').slice(0, 4);
  const f = teamFlag(name);
  if (f && (f.key === 'korea' || f.key === 'legend')) return SB_SHORT[f.key];
  return name.replace(/^\d{4}\s*/, '').split(' ')[0] || (f && SB_SHORT[f.key]) || name;
}


const PITCHES_PER_INNING = 15;
export function engineUsage(u) {
  if (!u) return null;
  const out = { ...u };
  const starter = () => out.starterPitches ?? DEFAULT_USAGE.starterPitches;
  if (u.extraInnings) out.starterPitches = starter() + PITCHES_PER_INNING * u.extraInnings;
  if (u.completeGame) Object.assign(out, { starterPitches: 9 * PITCHES_PER_INNING + 20, quickHook: 0, fatigueGrace: 45 });
  if (u.aceMax) out.starterPitches = Math.min(starter(), u.aceMax * PITCHES_PER_INNING);
  if (u.noTired) out.fatigueGrace = Math.max(out.fatigueGrace || 0, 15);
  if (u.bullpenAce) out.relieverPitches = 45;
  return out;
}

/** 드래프트 팀(roster)에서 엔진용 팀을 만든다: 타순 9명 + 투수(선발 → 불펜) */
export function engineTeam(team) {
  const roster = team.roster || [];
  const batters = (team.batters?.length ? team.batters : roster.filter((p) => p.type === 'batter')).slice(0, 9);
  // 등판 순서: 정비 화면 선발 자리 → (자리 없는 팀은) 선발 포지션 → 불펜 자리 순서(롱릴리프·중간·셋업·마무리). 같으면 덜 지친 투수, 종합 높은 투수
  const RELIEF = ['LR', 'MR', 'SU', 'CL'];
  const tier = (p) => (p.slot === 'SP' ? 0 : !p.slot && p.position === 'SP' ? 1 : 2);
  // AI 시리즈 팀은 등판 순서(pitchOrder)를 직접 들고 온다
  const byId = new Map(roster.map((p) => [p.id, p]));
  let pitchers = team.pitchOrder ? team.pitchOrder.map((id) => byId.get(id)).filter(Boolean) : roster.filter((p) => p.type === 'pitcher' && !String(p.slot || '').startsWith('BN'))
    .sort((a, b) => tier(a) - tier(b) || (a.rest || 0) - (b.rest || 0) || (RELIEF.indexOf(a.slot) - RELIEF.indexOf(b.slot)) || b.overall - a.overall);
  const usage = engineUsage(team.usage);
  let closerId = team.closerId || null;
  if (team.usage?.bullpenAce && pitchers.length > 2) { // 선발 다음에 가장 강한 불펜이 나와 길게 던진다
    const pv = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75) + st(p, 'stability', 75)) / 3;
    const [ace, ...pen] = pitchers;
    pitchers = [ace, ...pen.sort((a, b) => pv(b) - pv(a))];
    closerId = null;
  }
  /* 벤치 타자 — 대타 · 대주자로 나온다(엔진이 꺼내 쓰며 줄인다) */
  const inLineup = new Set(batters.map((p) => p.id));
  const bench = roster.filter((p) => p.type === 'batter' && !inLineup.has(p.id) && !p.isReplacement);
  return { name: team.name, batters, bench, pitchers: pitchers.length ? pitchers : batters.slice(0, 1), catcher: roster.find((p) => p.position === 'C'), usage, closerId, buff: team.buff || 0, edge: team.edge || null };
}


export const TACTIC_CHANGES = 3; // 경기 중 전술을 바꿀 수 있는 횟수 (공수 교대 때 먹는다)

export const Diamond = ({ bases, size = 68, off = 'rgba(0,0,0,.16)', note = null, ink = 'rgba(11,18,32,.72)', edge = null }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    {[[74, 55], [50, 31], [26, 55]].map(([x, y], i) => (
      <rect key={i} x={x - 13} y={y - 13} width="26" height="26" rx="3" transform={`rotate(45 ${x} ${y})`}
        fill={bases[i] ? '#f97316' : 'transparent'} stroke={bases[i] ? 'none' : (edge || off)} strokeWidth={bases[i] ? 0 : 1.6} />
    ))}
    {note != null && (
      <text x="50" y="94" textAnchor="middle" fontFamily="'Saira Condensed', sans-serif" fontSize="20" fontWeight="800" fill={ink}>{note}</text>
    )}
  </svg>
);
/** 볼 · 스트라이크 · 아웃 세 줄. label 을 끄면 점만 남는다 (색으로 구분) */
export const Bso = ({ b, s, o, label = true, dot = 11, off = 'rgba(255,255,255,.45)', lab = '', gap = 4, rowGap = 3, font = 11, popOut = -1 }) => (
  <div className="grid items-center font-display font-extrabold"
    style={{ gridTemplateColumns: `${label ? font + 2 : 0}px repeat(3, ${dot}px)`, gap, rowGap, fontSize: font }}>
    {label ? <span className={`flex items-center justify-center leading-none ${lab || 'text-emerald-400'}`} style={{ height: dot }}>B</span> : <span />}
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < b ? '#22c55e' : 'transparent', border: i < b ? 'none' : `1.5px solid ${off}`, boxSizing: 'border-box' }} />)}
    {label ? <span className={`flex items-center justify-center leading-none ${lab || 'text-yellow-300'}`} style={{ height: dot }}>S</span> : <span />}
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < s ? '#facc15' : 'transparent', border: i < s ? 'none' : `1.5px solid ${off}`, boxSizing: 'border-box' }} />)}<span />
    {label ? <span className={`flex items-center justify-center leading-none ${lab || 'text-red-400'}`} style={{ height: dot }}>O</span> : <span />}
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < o ? '#ef4444' : 'transparent', border: i < o ? 'none' : `1.5px solid ${off}`, boxSizing: 'border-box',
      /* 방금 늘어난 아웃은 한 번 크게 튄다 */
      ...(i === popOut ? { animation: 'outPop .5s ease-out', boxShadow: '0 0 14px #ef4444' } : null) }} />)}<span />
  </div>
);
/** 점수판 — 회 · 두 팀 점수 · 주자 · 볼카운트(count 가 없거나 bases 가 false 면 뺀다 — 수싸움 판은 주자 · 볼카운트를 가운데에 크게 둔다) */
export function Scoreboard({ g, home, away, count = null, bases = true, justOut = -1, className = '', hold = null, pop = null }) {
  const cMy = '#34d399', cOpp = '#f87171';
  return (
    <div className={`mt-cut mt-glass pointer-events-none flex items-center ${className}`} style={{ '--c': '18px' }}>
      <span className="flex shrink-0 flex-col items-center justify-center self-stretch px-4" style={{ background: 'rgba(255,255,255,.06)' }}>
        {g.final ? (
          <b className="text-t3 font-extrabold text-white">경기 끝</b>
        ) : (
          <>
            <b className="font-display text-t1 font-extrabold leading-[0.8] text-white">{g.inning}</b>
            <svg width="18" height="12" viewBox="0 0 20 14" className="mt-1.5" aria-hidden><path d={g.top ? 'M10 0 L20 14 L0 14 Z' : 'M0 0 L20 0 L10 14 Z'} fill="#f87171" /></svg>
          </>
        )}
      </span>
      <div className="w-[190px]">
        {[[away, g.away, cOpp, false], [home, g.home, cMy, true]].map(([t, side, color, mine], i) => {
          const flag = mine ? flagByKey(myBanner()) : teamFlag(t.name);
          const c = flag?.color || color;
          const atBat = g.top ? !mine : mine; // 지금 치고 있는 쪽 — 그 줄만 색이 진하다
          return (
            <div key={t.name} className={`relative flex items-center gap-2.5 overflow-hidden px-3.5 ${i ? 'border-t border-white/10' : ''}`}
              style={{ height: 44, background: atBat ? `linear-gradient(90deg, ${c}b0, ${c}30 72%, transparent)` : `linear-gradient(90deg, ${c}40, transparent 60%)` }}>
              {flag && <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${flag.src})`, opacity: atBat ? 0.3 : 0.14, WebkitMaskImage: SB_MASK, maskImage: SB_MASK }} />}
              <b className="relative truncate text-t3 font-extrabold text-white" style={{ opacity: atBat ? 1 : 0.8 }}>{shortTeam(t.name, mine)}</b>
              <b key={pop?.[mine ? 'home' : 'away'] || 'n'} data-score={mine ? 'home' : 'away'} className="relative ml-auto font-display text-t1 font-extrabold leading-none text-white"
                style={{ opacity: atBat ? 1 : 0.8, '--k': c, ...(pop?.[mine ? 'home' : 'away'] ? { animation: 'scorePop .42s cubic-bezier(.2,1.6,.4,1) both' } : null) }}>{side.runs - (hold?.[mine ? 'home' : 'away'] || 0)}</b>
            </div>
          );
        })}
      </div>
      {(bases || count) && (
        <span className="flex items-center gap-3 px-4">
          {bases && <Diamond bases={g.bases} size={60} off="rgba(255,255,255,.45)" />}
          {count && <Bso b={count.b} s={count.s} o={count.o} dot={12} font={12} gap={5} rowGap={4} off="rgba(255,255,255,.4)" lab="text-white/70" popOut={justOut} />}
        </span>
      )}
    </div>
  );
}

/** 경기 결과 — 결과 화면(MatchResult) · 기록실 · 투수 피로가 쓰는 값 */
export function buildResult(g, myTeam, manager = null) {
  const board = {
    home: Array.from({ length: 9 }, (_, i) => g.home.line[i] ?? null),
    away: Array.from({ length: 9 }, (_, i) => g.away.line[i] ?? null),
  };
  /* 감독이 한 일 — 승률이 그린 선과 내가 낸 지시 */
  const flow = manager?.flow?.length ? [...manager.flow] : null;
  const flowAt = manager?.flowAt?.length ? [...manager.flowAt] : null;
  const calls = manager?.calls?.length ? [...manager.calls].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)) : [];
  const credit = new Map();
  const add = (p, pts, key) => {
    if (!p) return;
    const c = credit.get(p.id) || { player: p, pts: 0, runs: 0, zero: 0, fires: 0 };
    c.pts += pts;
    if (key) c[key] += 1;
    credit.set(p.id, c);
  };
  const logs = [];
  for (const ev of g.events) {
    if (!ev.result) continue;
    const mine = !ev.top; // 홈(내 팀) 공격
    if (mine) {
      if (['1B', '2B', '3B', 'HR'].includes(ev.result)) add(ev.batter, { '1B': 2, '2B': 3, '3B': 4, HR: 6 }[ev.result] + ev.runs * 3, 'runs');
      else if (['BB', 'SF', 'SAC', 'BH'].includes(ev.result)) add(ev.batter, 1 + ev.runs * 3, ev.runs ? 'runs' : null);
    } else {
      if (ev.result === 'K') add(ev.pitcher, 1.2, 'zero');
      if (ev.runs) add(ev.pitcher, -ev.runs, null);
    }
    logs.push({
      id: logs.length, kind: ev.runs ? 'score' : 'normal', inning: ev.inning, isTop: ev.top, runs: ev.runs,
      text: `${ev.batter?.name} ${RESULT_LABEL[ev.result] || ''}`, res: ev.result, hero: ev.batter, pitcher: ev.pitcher,
    });
  }
  const ranked = [...credit.values()].sort((a, b) => b.pts - a.pts);
  const fallback = (myTeam.roster || []).filter((p) => !p.isReplacement).sort((a, b) => b.overall - a.overall)[0];
  const mvp = ranked[0] || { player: fallback, pts: 0, runs: 0, zero: 0, fires: 0 };
  // 투수 피로 계산용: 내 팀(홈) 투수별 투구 수와 선발
  const myPitcherIds = new Set(g.home.team.pitchers.map((p) => p.id));
  const pitchCounts = {};
  for (const ev of g.events) if (ev.pitcher && myPitcherIds.has(ev.pitcher.id)) pitchCounts[ev.pitcher.id] = (pitchCounts[ev.pitcher.id] || 0) + 1;
  /* 기록실에 남길 박스 스코어 — 내 타자(말 공격)와 내 투수(초 수비) */
  const bat = {};
  const arm = {};
  const hits = { my: 0, opp: 0 };
  /* 투수가 잡은 아웃 — 통산 이닝 · 평균실점에 쓴다(병살 2, 도루 저지도 그 투수의 아웃) */
  const OUTS = { K: 1, GO: 1, FO: 1, LO: 1, SF: 1, SAC: 1, DP: 2, CS: 1 };
  const armOf = (id) => arm[id] || (arm[id] = { at: Object.keys(arm).length, bf: 0, h: 0, k: 0, r: 0, o: 0, bb: 0 });
  for (const ev of g.events) {
    if (ev.result === 'CS' && ev.top && ev.pitcher && myPitcherIds.has(ev.pitcher.id)) armOf(ev.pitcher.id).o += 1;
    if (!ev.result || ev.result === 'SB' || ev.result === 'CS') continue;
    const hit = ['1B', '2B', '3B', 'HR', 'BH'].includes(ev.result);
    if (hit) hits[ev.top ? 'opp' : 'my'] += 1;
    if (!ev.top && ev.batter) {
      const b = bat[ev.batter.id] || (bat[ev.batter.id] = { ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0 });
      if (!['BB', 'IBB', 'SF', 'SAC'].includes(ev.result)) b.ab += 1;
      if (hit) b.h += 1;
      if (ev.result === 'HR') b.hr += 1;
      if (ev.result === 'BB' || ev.result === 'IBB') b.bb += 1;
      if (ev.result === 'K') b.k += 1;
      if (ev.result !== 'E') b.rbi += ev.runs || 0;
    }
    if (ev.top && ev.pitcher && myPitcherIds.has(ev.pitcher.id)) {
      const p = armOf(ev.pitcher.id);
      p.bf += 1;
      p.o += OUTS[ev.result] || 0;
      if (ev.result === 'BB' || ev.result === 'IBB') p.bb += 1;
      if (hit) p.h += 1;
      if (ev.result === 'K') p.k += 1;
      p.r += ev.runs || 0;
    }
  }
  return {
    box: { bat, arm }, hits, line: { my: [...g.home.line], opp: [...g.away.line] }, sides: manager?.sides || null,
    board,
    pitchCounts, starterId: g.home.team.pitchers[0]?.id || null,
    score: { my: g.home.runs, opp: g.away.runs },
    winner: g.winner === 'home' ? 'my' : g.winner === 'away' ? 'opp' : 'draw',
    logs, used: {}, mvpPlayer: mvp.player, mvp, credits: ranked,
    flow, flowAt, calls, gain: manager?.gain ?? 0,
  };
}

