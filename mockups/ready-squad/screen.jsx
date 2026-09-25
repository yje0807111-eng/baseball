/* 정비 화면 = 라커 MY SQUAD 판을 그대로 + TUNE UP 을 라커 오른쪽 PLAYER 판 자리에
   진짜 화면 조각(SquadBoard · ui.jsx)을 그대로 불러다 쓴다 — 목업이지만 실제 컴포넌트 */
import React, { useState } from 'react';
import '/src/index.css';
import { SERIES } from '/src/data/seriesPlayers.js';
import SquadBoard, { squadOrder, autoArrange } from '/src/myteam/SquadBoard.jsx';
import { UiStyle, Bg, Btn } from '/src/myteam/ui.jsx';
import { AI_SERIES, seriesTeam } from '/src/myteam/aiTeam.js';
import { posColor } from '/src/myteam/teamColor.js';

export const cut = (c) => ({ '--c': `${c}px` });
const ALL = SERIES.filter((s) => s.kind !== 'national').flatMap((s) => s.players);
const byOvr = (a, b) => b.overall - a.overall;
const take = (pos, n, used) => ALL.filter((p) => p.position === pos && !used.has(p.id)).sort(byOvr).slice(0, n).map((p) => { used.add(p.id); return p; });
/* 드래프트 한 판 = 20명: 야수 9 · 투수 5 · 예비 6 */
const used = new Set();
const ROSTER = [
  ...take('C', 1, used), ...take('1B', 1, used), ...take('2B', 1, used), ...take('3B', 1, used), ...take('SS', 1, used),
  ...take('OF', 3, used), ...take('DH', 1, used),
  ...take('SP', 1, used), ...take('RP', 4, used),
  ...take('OF', 2, used), ...take('C', 1, used), ...take('SS', 1, used), ...take('SP', 1, used), ...take('RP', 1, used),
];
const BENCH = ROSTER.slice(14).map((p) => p.id);

export const A = { bat: '#34d399', def: '#60a5fa', pit: '#f87171', syn: '#fbbf24', main: '#10b981' };
const SYN = [
  { n: '베이징 9전 전승', e: '능력치 +1', c: '베이징 금메달 멤버', m: 3, on: true },
  { n: 'LG 29년의 한', e: '컨택 +3', c: '오지환 · 김현수 · 박해민 · 홍창기 · 오스틴', m: 2, on: true },
  { n: '용병 트리오', e: '능력치 +3', c: '외국인 선수', m: 3, on: true },
  { n: '프랜차이즈의 기억', e: '능력치 +1', c: '최다 구단: 부산 · LG 3명', m: 6, on: true },
  { n: '클린업 트리오', e: '파워 +2', c: '3 · 4 · 5번 타자 장타력 80 이상', m: 2, need: 3, on: false },
];

/* 상단 바 — 드래프트 정비 그대로 */
const TopBar = () => (
  <header className="relative z-[2] flex flex-none items-center gap-6 border-b border-[#10b98140] px-6"
    style={{ height: 64, background: 'linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))' }}>
    <Btn style={{ ...cut(7), width: 36, minHeight: 36, padding: 0 }}>←</Btn>
    <div className="leading-none">
      <p className="m-0 font-display text-[10px] tracking-[0.38em] text-gray-500">LEGEND DRAFT</p>
      <h1 className="mt-1 text-[20px] font-black text-white">레전드 드래프트</h1>
    </div>
    <div className="leading-none">
      <p className="m-0 font-display text-[10px] tracking-[0.3em] text-gray-500">MODE</p>
      <b className="text-[15px]" style={{ color: A.main }}>전체 믹스</b>
    </div>
    <div className="flex items-baseline gap-2 font-display">
      <span className="text-[11px] tracking-[0.3em] text-gray-500">ROUND</span>
      <b className="text-[26px] text-white">20</b><span className="text-gray-500">/ 20</span>
    </div>
    <div className="ml-auto flex items-center gap-5">
      <div className="w-[220px]">
        <div className="flex justify-between font-display text-[11px] text-gray-500"><span>샐러리 캡 잔여</span><b className="text-white">26 <small className="text-gray-500">/ 1330 CP</small></b></div>
        <div className="mt-1 h-1.5 bg-white/10"><i className="block h-full" style={{ width: '97%', background: A.main, boxShadow: `0 0 8px ${A.main}` }} /></div>
      </div>
      <span className="mt-cut bg-white/[0.06] px-3 py-1 text-[13px] text-gray-300" style={cut(6)}>외국인 <b className="text-white">3/3</b></span>
      <Btn style={cut(7)}>? 드래프트 규칙</Btn>
    </div>
  </header>
);

/* 오른쪽 판 = 라커 PLAYER 자리에 TUNE UP */
export function SynergyList({ compact = false }) {
  return (
    <>
      <p className="mt-lab" style={{ '--a': A.syn }}>Synergy</p>
      <div className="mt-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {SYN.map((s, i) => {
          const tone = ['#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#60a5fa'][i % 5];
          return (
            <div key={s.n} className="mt-cut grid items-center gap-2.5 px-2.5 py-1.5" style={{ ...cut(8), opacity: s.on ? 1 : 0.55, gridTemplateColumns: `${compact ? 22 : 28}px minmax(0,1fr) auto`, background: `linear-gradient(90deg,color-mix(in srgb,${tone} 16%,transparent),rgba(6,10,19,.45))`, boxShadow: `inset 0 0 0 1px color-mix(in srgb,${tone} 35%,transparent)` }}>
              <span className="grid place-items-center font-display font-extrabold text-[#05080f]" style={{ height: compact ? 22 : 28, fontSize: compact ? 13 : 15, background: tone }}>{s.on ? s.n[0] : '🔒'}</span>
              <span className="min-w-0">
                <b className="block truncate font-extrabold text-white" style={{ fontSize: compact ? 12.5 : 13.5 }}>{s.n}</b>
                <span className="block font-bold" style={{ color: tone, fontSize: compact ? 11 : 12 }}>{s.e}</span>
                {!compact && <small className="block truncate text-[10.5px] text-gray-500">{s.c}</small>}
              </span>
              <span className="font-display text-[11.5px] text-gray-300">{s.on ? `${s.m}명` : `${s.m}/${s.need}`}</span>
            </div>
          );
        })}
      </div>

    </>
  );
}

function TunePanel({ sums }) {
  const TOT = [['타자 OVR 합계', sums.bat, +6, A.bat, 9 * 99], ['수비 OVR 합계', sums.def, +2, A.def, 8 * 99], ['투수 OVR 합계', sums.pit, 0, A.pit, 5 * 99]];
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3 p-5" style={{ ...cut(20), '--a': A.main }}>
      <p className="mt-lab">Tune Up</p>
      <h2 className="-mt-1 text-[26px] font-black text-white">정비</h2>
      {TOT.map(([t, v, d, a, max]) => (
        <div key={t} className="mt-cut relative px-3 pb-3 pt-2" style={{ ...cut(10), background: 'rgba(255,255,255,.04)' }}>
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] text-gray-400">{t}</span>
            <span className="flex items-baseline gap-1.5">
              <b className="font-display text-[24px] leading-none" style={{ color: a }}>{v}</b>
              <em className={`font-display text-[12px] not-italic ${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-rose-400' : 'text-gray-500'}`}>{d > 0 ? '+' : ''}{d}</em>
            </span>
          </div>
          <i className="absolute bottom-0 left-0 h-[3px]" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: a }} />
        </div>
      ))}
      <span className="mt-cut px-2.5 py-1 text-[12.5px] text-amber-300" style={{ ...cut(6), background: 'rgba(251,191,36,.12)', boxShadow: 'inset 0 0 0 1px rgba(251,191,36,.4)' }}>퓨처스 유망주 4명</span>

      <div className="mt-auto flex flex-col gap-2">
        <Btn style={cut(10)}>자동 라인업</Btn>
        <Btn style={cut(10)}>처음 배치로</Btn>
        <Btn style={cut(10)}>다시 드래프트</Btn>
        <Btn lg pri a={A.main} style={{ ...cut(12), minHeight: '3.5rem' }}>시즌 시작 ▶</Btn>
      </div>
    </aside>
  );
}

/* 왼쪽 판 = 바로 다음 상대 — 이름 · 종합 · 네 부문 막대(내 팀과 견줌) · 간판 둘 */
export const partsOf = (roster) => {
  const avg = (xs, f = (p) => p.overall) => (xs.length ? Math.round(xs.reduce((s, p) => s + f(p), 0) / xs.length) : 0);
  const bats = roster.filter((p) => p.type === 'batter');
  return {
    ovr: avg(roster),
    bat: avg(bats),
    def: avg(bats, (p) => p.stats.defense),
    sp: avg(roster.filter((p) => p.position === 'SP')),
    rp: avg(roster.filter((p) => p.position === 'RP')),
  };
};
const OPP_SERIES = AI_SERIES[3] || AI_SERIES[0];
export const OPP = seriesTeam(OPP_SERIES, () => 0.4);
export const OPP_CLUB = { key: 'samsung', color: '#60a5fa' };

export function NextOpponent({ mine }) {
  const o = partsOf(OPP.roster);
  const BARS = [['타선', 'bat', A.bat], ['수비', 'def', A.def], ['선발', 'sp', '#7dd3fc'], ['불펜', 'rp', A.pit]];
  const ace = OPP.roster.filter((p) => p.type === 'pitcher').sort((a, b) => b.overall - a.overall)[0];
  const slug = OPP.roster.filter((p) => p.type === 'batter').sort((a, b) => b.stats.power - a.stats.power)[0];
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3 p-5" style={{ ...cut(20), '--a': OPP_CLUB.color }}>
      <p className="mt-lab" style={{ '--a': OPP_CLUB.color }}>Next Opponent</p>
      <div className="flex items-center gap-3">
        <span className="block h-[52px] w-[52px] shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(ui/clubs/${OPP_CLUB.key}.webp)` }} />
        <span className="min-w-0">
          <b className="block truncate text-[19px] font-black text-white">{OPP.name}</b>
          <small className="font-display text-[11px] tracking-[0.2em] text-gray-500">1차전 · 홈</small>
        </span>
        <b className="ml-auto font-display text-[30px] font-extrabold leading-none" style={{ color: OPP_CLUB.color }}>{o.ovr}</b>
      </div>
      <div className="flex flex-col gap-2">
        {BARS.map(([label, key, c]) => {
          const them = o[key];
          const me = mine[key];
          const w = (v) => `${Math.max(0, Math.min(100, ((v - 40) / 55) * 100))}%`;
          return (
            <div key={key} className="grid items-center gap-2" style={{ gridTemplateColumns: '34px minmax(0,1fr) 58px' }}>
              <span className="text-[12.5px] text-gray-400">{label}</span>
              <span className="relative h-2.5 bg-white/[0.07]">
                <i className="absolute inset-y-0 left-0" style={{ width: w(them), background: c, opacity: 0.85 }} />
                <i className="absolute inset-y-[-3px] w-[2px] bg-white" style={{ left: w(me), boxShadow: '0 0 8px #fff' }} />
              </span>
              <b className="text-right font-display text-[15px]" style={{ color: me >= them ? A.bat : '#f87171' }}>{them}<small className="text-gray-500">/{me}</small></b>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex flex-col gap-1.5">
        {[['선발', ace], ['간판', slug]].map(([k, p]) => p && (
          <div key={k} className="mt-cut flex items-center gap-2.5 px-2.5 py-1.5" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
            <span className="mt-cut block h-[38px] w-[32px] shrink-0 bg-[#0b1220] bg-cover" style={{ ...cut(5), backgroundPosition: 'center 12%', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
            <span className="min-w-0">
              <span className="font-display text-[10px] tracking-[0.2em] text-gray-500">{k}</span>
              <b className="block truncate text-[14px] font-extrabold text-white">{p.name}</b>
            </span>
            <b className="ml-auto font-display text-[18px]" style={{ color: posColor(p) }}>{p.overall}</b>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3">
        <span className="text-[12.5px] text-gray-400">예상 승률</span>
        <b className="font-display text-[22px]" style={{ color: A.bat }}>54%</b>
      </div>
    </aside>
  );
}

const ROS = OPP.roster;
const O = partsOf(ROS);
const C = OPP_CLUB.color;
/* 엠블럼: 구단 시리즈면 그 구단, 레전드 · 국가대표면 해당 그림 */
const EMBLEM = /레전드/.test(OPP.name) ? 'legend' : /대표|코리아/.test(OPP.name) ? 'korea' : OPP_CLUB.key;
const avg = (xs, f) => (xs.length ? xs.reduce((s, p) => s + f(p), 0) / xs.length : 0);
const BATS = ROS.filter((p) => p.type === 'batter');
const PITS = [...ROS.filter((p) => p.type === 'pitcher')].sort(byOvr);
const ACE = PITS[0];
const LINEUP = [...BATS].sort(byOvr).slice(0, 9);

/* 조심할 선수: 장타 · 주루 상위 */
const DANGER = new Map();
[...BATS].sort((a, b) => b.stats.power - a.stats.power).slice(0, 2).forEach((p) => DANGER.set(p.id, { t: '장타', c: '#f87171' }));
[...BATS].sort((a, b) => b.stats.speed - a.stats.speed).slice(0, 1).forEach((p) => { if (!DANGER.has(p.id)) DANGER.set(p.id, { t: '주루', c: '#fbbf24' }); });

/* 특징 태그 — 상대 능력치에서 */
const TAGS = [
  { on: avg(BATS, (p) => p.stats.power) >= 72, label: '장타 위험', c: '#f87171' },
  { on: avg(BATS, (p) => p.stats.speed) >= 70, label: '발 빠른 타선', c: '#fbbf24' },
  { on: avg(BATS, (p) => p.stats.contact) >= 74, label: '컨택 강함', c: '#fb923c' },
  { on: avg(BATS, (p) => p.stats.defense) >= 72, label: '수비 탄탄', c: A.def },
  { on: BATS.filter((p) => p.hand === 'L').length / Math.max(1, BATS.length) >= 0.35, label: '좌타 다수', c: '#a78bfa' },
  { on: avg(PITS.filter((p) => p.position === 'RP'), (p) => p.overall) < 74, label: '불펜 얇음', c: A.bat },
  { on: avg(PITS.filter((p) => p.position === 'SP'), (p) => p.stats.stamina) < 70, label: '선발 이닝 짧음', c: A.bat },
  { on: avg(BATS, (p) => p.stats.power) < 66, label: '한 방 없음', c: A.bat },
].filter((x) => x.on);

/* 미니 구장 자리 — 타순 차례가 아니라 수비 위치 */
const SPOT = [[50, 13], [20, 27], [80, 27], [34, 47], [66, 47], [20, 68], [80, 68], [50, 88], [88, 88]];

export function ScoutPanel() {
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2 p-4" style={{ ...cut(20), '--a': C }}>
      <p className="mt-lab" style={{ '--a': C }}>Scouting</p>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="block h-11 w-11 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(ui/clubs/${EMBLEM}.webp)` }} />
        <b className="min-w-0 flex-1 truncate text-[17px] font-black text-white">{OPP.name}</b>
        <b className="ml-auto font-display text-[26px] font-extrabold leading-none" style={{ color: C }}>{O.ovr}</b>
      </div>

      {/* 오늘 상대 선발 */}
      <div className="mt-cut relative shrink-0 overflow-hidden" style={{ height: 116, ...cut(12), background: '#0b1220' }}>
        <span className="absolute inset-0 bg-cover" style={{ backgroundPosition: '60% 12%', backgroundImage: `url(cards/${encodeURIComponent(ACE.id)}.webp), url(profiles/${encodeURIComponent(ACE.id)}.webp), url(ui/mt/silhouette-player.webp)` }} />
        <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 22%,rgba(5,8,15,.45) 62%,rgba(5,8,15,0))' }} />
        <span className="absolute inset-y-2.5 left-3 flex flex-col justify-center">
          <span className="font-display text-[10px] tracking-[0.22em]" style={{ color: A.pit }}>오늘 상대 선발</span>
          <b className="text-[19px] font-black leading-tight text-white">{ACE.name}</b>
          <span className="mt-0.5 flex items-baseline gap-1.5">
            <b className="font-display text-[21px]" style={{ color: C }}>{ACE.overall}</b>
            <small className="text-[10.5px] text-gray-400">구위 {ACE.stats.stuff} · 제구 {ACE.stats.control}</small>
          </span>
        </span>
      </div>

      {/* 특징 */}
      <div className="flex shrink-0 gap-1">
        {TAGS.slice(0, 4).map((x) => (
          <span key={x.label} className="mt-cut min-w-0 flex-1 truncate px-1 py-[3px] text-center text-[10.5px] font-bold" style={{ ...cut(4), color: x.c, background: `color-mix(in srgb,${x.c} 16%,transparent)`, boxShadow: `inset 0 0 0 1px ${x.c}55` }}>{x.label}</span>
        ))}
      </div>

      {/* 미니 구장 — 상대 수비 자리 */}
      <div className="mt-cut relative shrink-0 overflow-hidden bg-[#07130c] bg-cover" style={{ height: 176, ...cut(12), backgroundImage: 'url(ui/field.webp)', backgroundPosition: 'center 58%' }}>
        <span className="absolute inset-0" style={{ background: 'radial-gradient(75% 75% at 50% 55%,rgba(5,8,15,.08),rgba(5,8,15,.72))' }} />
        {LINEUP.map((p, i) => {
          const d = DANGER.get(p.id);
          return (
            <span key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-1 text-[10px] font-bold text-white"
              style={{ left: `${SPOT[i][0]}%`, top: `${SPOT[i][1]}%`, background: 'rgba(5,8,15,.76)', boxShadow: `inset 0 -2px 0 ${d ? d.c : posColor(p)}${d ? `, 0 0 0 1px ${d.c}88` : ''}` }}>
              {p.name}<b className="ml-1 font-display" style={{ color: d ? d.c : C }}>{p.overall}</b>
            </span>
          );
        })}
      </div>

      {/* 타순 */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 pb-1">
          <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: A.bat }}>LINEUP</span>
          <b className="text-[12px] text-gray-300">타순 {LINEUP.length}</b>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-[3px]">
          {LINEUP.map((p, i) => {
            const d = DANGER.get(p.id);
            return (
              <div key={p.id} className="mt-cut flex flex-1 items-center gap-1.5 px-1.5"
                style={{ ...cut(5), background: d ? `color-mix(in srgb,${d.c} 14%,transparent)` : 'rgba(255,255,255,.035)', boxShadow: d ? `inset 0 0 0 1px ${d.c}55` : 'none' }}>
                <b className="w-3 text-center font-display text-[11px] text-gray-500">{i + 1}</b>
                <span className="shrink-0 px-[4px] font-display text-[10.5px] font-extrabold leading-[15px] text-[#05080f]" style={{ background: posColor(p) }}>{p.position}</span>
                <b className="min-w-0 flex-1 truncate text-[12.5px] text-white">{p.name}</b>
                {d && <span className="font-display text-[10px]" style={{ color: d.c }}>{d.t}</span>}
                <b className="font-display text-[13px]" style={{ color: C }}>{p.overall}</b>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}


export function Screen({ left, synergy, tune }) {
  const [team, setTeam] = useState(() => ({ name: '나의 드림팀', squad: ROSTER, bench: BENCH, pitchFatigue: {}, order: squadOrder(ROSTER, BENCH, {}) }));
  const [sel, setSel] = useState(null);
  const squad = team.squad;
  const order = squadOrder(squad, team.bench, team.order);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const sums = {
    bat: order.lineup.reduce((s, x) => s + (byId.get(x.id)?.overall || 0), 0),
    def: order.lineup.filter((x) => x.slot !== 'DH').reduce((s, x) => s + (byId.get(x.id)?.overall || 0), 0),
    pit: [...order.rotation.slice(0, 1), ...order.bullpen.slice(0, 4)].reduce((s, id) => s + (byId.get(id)?.overall || 0), 0),
  };
  const mineParts = partsOf(squad);
  return (
    <div className="relative flex flex-col overflow-hidden bg-[#05080f]" style={{ width: 1920, height: 911 }}>
      <UiStyle />
      <Bg />
      <TopBar />
      <div className="relative z-[1] grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4" style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>
        {left ? left(mineParts) : <ScoutPanel />}

        <SquadBoard team={team} squad={squad} bench={team.bench} sel={sel} onSelect={setSel}
          onCommit={setTeam} onToggleBench={() => {}} fitSlots footer={synergy || <SynergyList compact />} />

        {tune || <TunePanel sums={sums} />}
      </div>
    </div>
  );
}

