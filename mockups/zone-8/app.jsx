/* 존 표시 8안 — 들어온 공이 존의 어디였는지 보여 주는 자리와 모양.
   나머지 화면은 지금 경기 화면 그대로. 장면은 3구째, 바깥쪽 낮은 슬라이더. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, Btn, Chip, Portrait, StatCells } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';
import { teamFlag } from '/src/myteam/teamArt.js';
import { statBandColor } from '/src/myteam/teamColor.js';
import PlayView from '/src/play/PlayView.jsx';
import { FIELD_BGS } from '/src/play/backgrounds.js';
import { Diamond, Bso, shortTeam, SB_MASK } from '/src/BroadcastGame.jsx';

/* ── 데이터 ──────────────────────────────────────────────────── */
const pick = (id) => SERIES.find((s) => s.id === id) || SERIES[0];
const OFF = pick('2010-lotte');
const DEF = pick('2020-nc');
const bats = (s) => s.players.filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall);
const arms = (s) => s.players.filter((p) => p.type === 'pitcher').sort((a, b) => b.overall - a.overall);
const LINEUP = bats(OFF).slice(0, 9);
const NOW = LINEUP[0];
const PEN = arms(DEF).filter((p) => p.position === 'RP').slice(0, 4);
const FOE = arms(DEF)[0];
const DEF9 = (() => {
  const men = bats(DEF); const of = men.filter((p) => p.position === 'OF');
  const one = (k) => men.find((p) => p.position === k) || men[0];
  return { P: FOE, C: one('C'), '1B': one('1B'), '2B': one('2B'), '3B': one('3B'), SS: one('SS'), LF: of[0], CF: of[1], RF: of[2] };
})();
const OFF_C = teamFlag(OFF.title)?.color || '#f87171';
const DEF_C = teamFlag(DEF.title)?.color || '#34d399';
const faceArt = (p) => `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`;
const BASES = [LINEUP[4], null, LINEUP[6]];
const S = (k) => NOW.stats?.[k] ?? 70;

/* 이 타석에 지나간 공 — [x, y, 판정]. x 는 오른쪽(+) · y 는 위(+), 1 이 존 경계 */
const PITCHES = [
  [-0.42, 0.55, 'ball'],   // 1구 높은 바깥
  [0.28, -0.1, 'strike'],  // 2구 한가운데 낮게
  [0.86, -0.78, 'now'],    // 3구 바깥쪽 낮은 슬라이더
];
const TONE = { ball: '#34d399', strike: '#fde047', now: '#fff' };

/* ── 존 조각 — 상자 하나에 지나간 공과 지금 공 ──────────────────── */
const Zone = ({ w = 72, pad = 0.42, trail = true, label = true, thick = 1 }) => {
  const h = Math.round(w * 1.2);
  const V = 100; // 뷰박스 한 변
  const box = V / (1 + pad * 2); // 존 상자 크기
  const o = (V - box) / 2; // 상자 왼쪽·위 여백
  const at = ([x, y]) => [o + box / 2 + (x * box) / 2, o + box / 2 - (y * box) / 2];
  const now = PITCHES[PITCHES.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${V} ${V * 1.2}`} style={{ overflow: 'visible' }}>
      <g transform={`translate(0 ${V * 0.1})`}>
        <rect x={o} y={o} width={box} height={box} fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.55)" strokeWidth={1.6 * thick} />
        {[1, 2].map((i) => (
          <g key={i} stroke="rgba(255,255,255,.2)" strokeWidth={1 * thick}>
            <line x1={o + (box / 3) * i} y1={o} x2={o + (box / 3) * i} y2={o + box} />
            <line x1={o} y1={o + (box / 3) * i} x2={o + box} y2={o + (box / 3) * i} />
          </g>
        ))}
        {/* 홈플레이트 — 존 아래에 오각형으로, 좌우가 어디인지 알려 준다 */}
        {label && <path d={`M ${o + box * 0.3} ${o + box + 7} L ${o + box * 0.7} ${o + box + 7} L ${o + box * 0.7} ${o + box + 12} L ${o + box / 2} ${o + box + 17} L ${o + box * 0.3} ${o + box + 12} Z`}
          fill="rgba(255,255,255,.25)" stroke="rgba(255,255,255,.45)" strokeWidth="1" />}
        {trail && PITCHES.slice(0, -1).map((p, i) => {
          const [cx, cy] = at(p);
          return <g key={i} opacity="0.8">
            <circle cx={cx} cy={cy} r="7" fill="rgba(5,8,15,.5)" stroke={TONE[p[2]]} strokeWidth="1.8" />
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize="8" fontWeight="800" fill={TONE[p[2]]}>{i + 1}</text>
          </g>;
        })}
        {(() => {
          const [cx, cy] = at(now);
          return <g>
            <circle cx={cx} cy={cy} r="13" fill="rgba(253,224,71,.18)" />
            <circle cx={cx} cy={cy} r="7" fill="#fff" stroke="#fde047" strokeWidth="2.4" />
          </g>;
        })()}
      </g>
    </svg>
  );
};

const glass = {
  clipPath: 'polygon(11px 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%,0 11px)',
  background: 'rgba(8,12,20,.62)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)', backdropFilter: 'blur(3px)',
};

/* ── 왼쪽 위 판 (주루 · 볼카운트) — 안에 존을 넣는 안도 있다 ──────── */
const Corner = ({ zone }) => (
  <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-4 px-4 py-3.5" style={glass}>
    <Diamond bases={BASES} size={zone ? 108 : 76} off="rgba(255,255,255,.45)" />
    <span className="w-px bg-white/15" style={{ height: zone ? 116 : 62 }} />
    <Bso b={2} s={1} o={1} dot={zone ? 19 : 15} font={zone ? 19 : 15} gap={zone ? 8 : 6} rowGap={zone ? 7 : 5} off="rgba(255,255,255,.45)" lab="text-white/85" />
    {zone && <><span className="w-px bg-white/15" style={{ height: 116 }} /><Zone w={132} /></>}
  </div>
);

/* ── 여덟 가지 ────────────────────────────────────────────────── */
const Z1 = () => <Corner zone />; /* 1 · 왼쪽 위 판에 나란히 */

const Z2 = () => ( /* 2 · 오른쪽 위에 따로 */
  <>
    <Corner />
    <div className="pointer-events-none absolute right-3 top-3 px-3.5 py-3" style={glass}><Zone w={168} /></div>
  </>
);

const Z3 = () => ( /* 3 · 홈플레이트 위에 얹기 — 포수 바로 뒤 */
  <>
    <Corner />
    <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-3" style={glass}><Zone w={150} label={false} /></div>
  </>
);

const Z4 = () => ( /* 4 · 오른쪽 아래 */
  <>
    <Corner />
    <div className="pointer-events-none absolute bottom-3 right-3 px-3.5 py-3" style={glass}><Zone w={168} /></div>
  </>
);

const Z5 = () => ( /* 5 · 구종 이름까지 함께 */
  <>
    <Corner />
    <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-4 px-4 py-3.5" style={glass}>
      <Zone w={156} />
      <div className="leading-tight">
        <b className="block text-[18px] font-extrabold text-white">슬라이더</b>
        <em className="font-display text-[32px] font-extrabold not-italic text-[#fde047]">131<span className="ml-1 text-[14px] text-white/60">km/h</span></em>
        <span className="mt-1 block text-[14px] font-semibold text-[#34d399]">바깥쪽 낮게 · 볼</span>
      </div>
    </div>
  </>
);

const Z6 = () => ( /* 6 · 자취 없이 지금 공만, 아주 작게 */
  <>
    <Corner />
    <div className="pointer-events-none absolute right-3 top-3 px-3.5 py-3" style={glass}><Zone w={124} trail={false} label={false} /></div>
  </>
);

const Z7 = () => ( /* 7 · 왼쪽 위 판 아래에 이어 붙이기 */
  <>
    <Corner />
    <div className="pointer-events-none absolute left-3 px-3.5 py-3" style={{ ...glass, top: 128 }}><Zone w={168} /></div>
  </>
);

const Z8 = () => ( /* 8 · 크게, 오른쪽 가운데 */
  <>
    <Corner />
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 px-4 py-4" style={glass}><Zone w={224} thick={1.2} /></div>
  </>
);

/* ── 나머지 화면 ──────────────────────────────────────────────── */
const Lab = ({ children, a = '#10b981', right }) => (
  <div className="flex shrink-0 items-center gap-2 px-3.5 pb-1 pt-2.5">
    <p className="mt-lab" style={{ '--a': a }}>{children}</p>
    {right && <span className="ml-auto truncate text-[12px] font-semibold text-gray-400">{right}</span>}
  </div>
);
const Box = ({ a = '#10b981', className = '', children }) => (
  <section className={`mt-cut mt-frame mt-glass flex flex-col ${className}`} style={{ '--c': '14px', '--a': a }}>{children}</section>
);
const SIDES = [[OFF.title, 3, OFF_C, false], ['드림팀', 2, DEF_C, true]];
const Scoreboard = () => (
  <div className="mt-cut flex shrink-0 overflow-hidden backdrop-blur-[3px]"
    style={{ '--c': '12px', background: 'rgba(8,12,20,.55)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14), inset 0 1px 0 rgba(255,255,255,.28)' }}>
    <span className="flex shrink-0 flex-col items-center justify-center px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,.07)' }}>
      <b className="font-display text-[32px] font-extrabold leading-[0.8] text-white">4</b>
      <svg width="20" height="14" viewBox="0 0 20 14" className="mt-1"><path d="M0 0 L20 0 L10 14 Z" fill="#f87171" /></svg>
    </span>
    <div className="min-w-0 flex-1">
      {SIDES.map(([name, runs, c, mine], i) => {
        const flag = teamFlag(name); const atBat = !mine;
        return (
          <div key={name} className={`relative flex items-center gap-2.5 overflow-hidden px-3 ${i ? 'border-t border-white/10' : ''}`}
            style={{ height: 50, background: atBat ? `linear-gradient(90deg, ${c}e0, ${c}40 72%, transparent)` : `linear-gradient(90deg, ${c}4d, transparent 60%)` }}>
            {flag && <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${flag.src})`, opacity: atBat ? 0.3 : 0.16, WebkitMaskImage: SB_MASK, maskImage: SB_MASK }} />}
            <b className="relative truncate text-[21px] font-extrabold text-white">{shortTeam(name, mine)}</b>
            {atBat && <span className="relative font-display text-[12px] font-extrabold tracking-[0.18em] text-white/80">AT BAT</span>}
            <b className="relative ml-auto font-display text-[32px] font-extrabold leading-none text-white">{runs}</b>
          </div>
        );
      })}
    </div>
  </div>
);
const Bat = () => (
  <Box a={OFF_C} className="shrink-0 overflow-hidden">
    <div className="relative shrink-0 bg-[#0b1220] bg-cover" style={{ height: 152, backgroundImage: faceArt(NOW), backgroundPosition: '50% 16%' }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.25),rgba(5,8,15,0) 40%,#05080f)' }} />
      <em className="absolute left-3 top-2 font-display text-[30px] font-extrabold leading-none not-italic" style={{ color: OFF_C, textShadow: `0 0 16px ${OFF_C}88, 0 2px 4px #000` }}>{NOW.overall}</em>
      <span className="absolute right-3 top-2.5 text-[12px] font-bold text-[#a7f3d0] [text-shadow:0_1px_4px_#000]">1안타 1볼넷</span>
      <b className="absolute bottom-1 left-3 right-3 truncate text-[22px] font-black text-white [text-shadow:0_2px_8px_#000]">{NOW.name}</b>
      <span className="absolute bottom-1.5 right-3 text-[12px] font-semibold text-gray-300 [text-shadow:0_1px_4px_#000]">{NOW.position} · {NOW.hand}타</span>
    </div>
    <div className="shrink-0 space-y-1 px-3.5 pb-3 pt-2.5">
      {[['파워', S('power')], ['컨택', S('contact')], ['주력', S('speed')], ['수비', S('defense')]].map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-[32px] shrink-0 text-[12px] font-bold text-gray-200">{k}</span>
          <StatCells v={v} width={202} />
          <em className="ml-auto font-display text-[12px] font-bold not-italic text-gray-300">{v}</em>
        </div>
      ))}
    </div>
  </Box>
);
const Order = () => (
  <Box a={OFF_C} className="min-h-0">
    <Lab a={OFF_C} right={`${shortTeam(OFF.title)} 공격`}>타순</Lab>
    <ul className="flex min-h-0 flex-1 flex-col gap-[3px] overflow-hidden px-2 pb-2">
      {LINEUP.map((p, i) => (
        <li key={p.id} className={`mt-row mt-cut team ${i === 0 ? 'on' : ''}`}
          style={{ flex: '1 1 0', gridTemplateColumns: '14px minmax(0,1fr) auto auto 30px', gap: 8, padding: '2px 9px', opacity: i === 0 || i === 4 || i === 6 ? 1 : 0.62, '--c': '4px', '--a': OFF_C, '--t': OFF_C }}>
          <em className="text-right font-display text-[12px] font-bold not-italic text-gray-500">{i + 1}</em>
          <b className="truncate text-[13px] font-semibold text-gray-100">{p.name}</b>
          <span>{i === 0 ? <Chip a={OFF_C}>타석</Chip> : i === 4 || i === 6 ? <i className="inline-block" style={{ width: 8, height: 8, background: '#f97316', transform: 'rotate(45deg)', borderRadius: 2 }} /> : null}</span>
          <span className="truncate text-right text-[12px] font-semibold text-white/50">{i === 1 ? '2루타' : i === 3 ? '삼진' : '-'}</span>
          <em className="text-right font-display text-[12px] font-bold not-italic" style={{ color: statBandColor(p.overall) }}>{p.overall}</em>
        </li>
      ))}
    </ul>
  </Box>
);
const ACTS = [['🏃', '도루', '주자 1루'], ['🪃', '번트', '주자 진루'], ['🎯', '직구 노리기', '35%'], ['🌀', '변화구 노리기', '65%'], ['🔁', '투수 교체', '불펜에서 고르기']];
const MIX = [['직구', 0.35], ['슬라이더', 0.39], ['체인지업', 0.26]];
const BG = { ...FIELD_BGS[0] };

function Screen({ Overlay }) {
  return (
    <div className="grid h-full" style={{ gridTemplateRows: '63px 1fr' }}>
      <header className="relative flex items-center gap-6 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
        <Btn sm>←</Btn>
        <div className="leading-none">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Manager Mode</p>
          <h1 className="mt-1 text-xl font-black leading-none text-white">감독 모드</h1>
        </div>
        <Chip a="#f87171">● LIVE</Chip>
        <div className="ml-auto flex gap-2">{['보통', '자동', '스킵'].map((n, i) => <Btn key={n} sm pri={i === 0}>{n}</Btn>)}</div>
        <Btn sm>일시정지</Btn>
      </header>
      <div className="grid min-h-0 gap-3 p-3" style={{ gridTemplateColumns: '300px 1fr 320px' }}>
        <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto auto minmax(0,1fr)' }}>
          <Scoreboard /><Bat /><Order />
        </div>
        <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: '1fr 84px' }}>
          <section className="mt-cut mt-frame relative min-h-0 overflow-hidden bg-[#060c16]" style={{ '--c': '16px', '--a': '#10b981' }}>
            <PlayView event={null} bases={BASES} defense={DEF9} batter={NOW} offColor={OFF_C} defColor={DEF_C} bg={BG} />
            <Overlay />
          </section>
          <div className="flex items-stretch gap-2.5">
            {ACTS.map(([ic, t, s], i) => (
              <button key={t} type="button"
                className={`mt-cut flex flex-1 flex-col items-center justify-center gap-0.5 text-[13px] ${i > 1 ? 'mt-frame mt-glass text-gray-100' : 'bg-[#05080f]/60 text-gray-600'}`}
                style={{ '--c': '11px', '--a': '#10b981' }}>
                <b className="text-lg leading-none">{ic}</b>{t}<small className="text-[12px] font-semibold text-gray-400">{s}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto auto 1fr' }}>
          <Box a={DEF_C}>
            <Lab a={DEF_C} right="드림팀 수비">투수</Lab>
            <div className="px-3.5 pb-3">
              <div className="flex items-center gap-2.5">
                <Portrait player={FOE} w={44} h={56} color={DEF_C} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[17px] font-extrabold text-white">{FOE.name}</b>
                  <span className="text-[12px] font-semibold text-gray-400">{FOE.position} · 38구</span>
                </div>
                <em className="font-display text-[24px] font-extrabold not-italic" style={{ color: DEF_C }}>{FOE.overall}</em>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {[['체력', 76, 0, 100], ['구위', FOE.stats?.stuff ?? 70, 40, 120], ['제구', FOE.stats?.control ?? 70, 40, 120]].map(([k, v, lo, hi]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-[32px] shrink-0 text-[12px] font-bold text-gray-200">{k}</span>
                    <StatCells v={v} lo={lo} hi={hi} width={190} cell={9} />
                    <em className="ml-auto font-display text-[13px] font-bold not-italic text-gray-200">{v}</em>
                  </div>
                ))}
              </div>
              <ul className="mt-2.5 space-y-1">
                {MIX.map(([n, v]) => (
                  <li key={n} className="flex items-center gap-2">
                    <b className="w-[62px] shrink-0 text-[12px] font-semibold text-gray-200">{n}</b>
                    <StatCells v={v * 100} lo={0} hi={60} width={158} cell={8} h={7} color={DEF_C} />
                    <em className="ml-auto font-display text-[12px] font-bold not-italic text-gray-400">{Math.round(v * 100)}%</em>
                  </li>
                ))}
              </ul>
            </div>
          </Box>
          <Box>
            <Lab right="우리 팀">불펜</Lab>
            <ul className="space-y-1 px-2 pb-2">
              {PEN.map((p) => (
                <li key={p.id} className="mt-row mt-cut" style={{ gridTemplateColumns: '22px minmax(0,1fr) 96px auto', gap: 7, padding: '3px 8px', '--c': '5px', '--a': '#34d399' }}>
                  <Portrait player={p} w={22} h={28} color="#34d399" />
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <b className="truncate text-[13px] font-semibold text-gray-100">{p.name}</b>
                    <em className="font-display text-[12px] font-bold not-italic" style={{ color: statBandColor(p.overall) }}>{p.overall}</em>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="block h-[6px] min-w-0 flex-1 bg-white/[0.08]"><b className="block h-full" style={{ width: '100%', background: 'linear-gradient(90deg,hsl(152 72% 42%),hsl(152 86% 58%))' }} /></i>
                    <em className="w-[18px] shrink-0 text-right font-display text-[11px] font-bold not-italic text-[hsl(152_80%_58%)]">100</em>
                  </span>
                  <button type="button" className="mt-cut bg-[#10b981] px-2 py-1 text-[12px] font-bold text-[#05080f]" style={{ '--c': '4px' }}>교체</button>
                </li>
              ))}
            </ul>
          </Box>
          <Box className="min-h-0">
            <Lab right="🎙">해설</Lab>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden px-3.5 pb-3">
              <p className="m-0 text-[14px] font-bold leading-snug text-white">슬라이더 131km — 바깥쪽 낮게, 볼.</p>
              <p className="m-0 text-[12.5px] font-medium leading-snug text-gray-400">직구 145km — 스트라이크. 1볼 1스트라이크</p>
              <p className="m-0 text-[12.5px] font-medium leading-snug text-gray-400">체인지업 128km — 볼. 1볼 0스트라이크</p>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}

const PLANS = [
  ['1 · 왼쪽 위 판에 나란히 ★', Z1], ['2 · 오른쪽 위 따로', Z2], ['3 · 홈플레이트 위', Z3], ['4 · 오른쪽 아래', Z4],
  ['5 · 구종까지 함께', Z5], ['6 · 지금 공만 작게', Z6], ['7 · 왼쪽 위 아래로', Z7], ['8 · 오른쪽 가운데 크게', Z8],
];
const Z = Math.min(1, (window.innerWidth - 40) / 1920);

function App() {
  const [i, setI] = useState(0);
  const Overlay = PLANS[i][1];
  return (
    <div className="min-h-dvh bg-[#06080c] p-4 text-gray-200">
      <UiStyle />
      <style>{KEYFRAMES}</style>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PLANS.map(([n], k) => (
          <button key={n} type="button" onClick={() => setI(k)}
            className={`mt-cut px-3 py-1.5 font-display text-[13px] font-bold ${k === i ? 'bg-emerald-400 text-[#05080f]' : 'bg-white/[0.07] text-gray-300'}`} style={{ '--c': '6px' }}>{n}</button>
        ))}
      </div>
      <div style={{ width: 1920 * Z, height: 911 * Z }}>
        <div className="relative select-none overflow-hidden bg-[#05080f] text-gray-200"
          style={{ width: 1920, height: 911, transform: `scale(${Z})`, transformOrigin: 'top left' }}>
          <Screen Overlay={Overlay} />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
