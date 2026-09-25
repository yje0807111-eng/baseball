/* 볼카운트와 주루를 구장 안으로 — 자리와 모양 8안.
   점수판은 회차를 팀 이름 왼쪽으로 옮겨 두 줄만 남긴다. 나머지 화면은 지금 경기 화면 그대로. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, Btn, Chip, Portrait, StatCells } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';
import { teamFlag } from '/src/myteam/teamArt.js';
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
const CNT = { b: 2, s: 1, o: 1 };

/* ── 점수판 — 회차를 이름 왼쪽으로, 아래 칸은 비운다 ─────────────── */
const SIDES = [[OFF.title, 3, OFF_C, false], ['드림팀', 2, DEF_C, true]];
const Scoreboard = () => (
  <div className="mt-cut flex shrink-0 overflow-hidden backdrop-blur-[3px]"
    style={{ '--c': '12px', background: 'rgba(8,12,20,.55)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14), inset 0 1px 0 rgba(255,255,255,.28)' }}>
    {/* 회 — 두 줄 높이를 세로로 차지한다 */}
    <span className="grid shrink-0 place-items-center px-3.5" style={{ background: 'rgba(255,255,255,.07)' }}>
      <b className="font-display text-[30px] font-extrabold leading-none text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,.75)' }}>4</b>
      <i className="not-italic text-[15px] leading-none text-[#f87171]">▼</i>
    </span>
    <div className="min-w-0 flex-1">
      {SIDES.map(([name, runs, c, mine], i) => {
        const flag = teamFlag(name); const atBat = !mine;
        return (
          <div key={name} className={`relative flex items-center gap-2.5 overflow-hidden px-3 ${i ? 'border-t border-white/10' : ''}`}
            style={{ height: 50, background: atBat ? `linear-gradient(90deg, ${c}e0, ${c}40 72%, transparent)` : `linear-gradient(90deg, ${c}4d, transparent 60%)` }}>
            {flag && <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${flag.src})`, opacity: atBat ? 0.3 : 0.16, WebkitMaskImage: SB_MASK, maskImage: SB_MASK }} />}
            <b className="relative truncate text-[21px] font-extrabold text-white" style={{ textShadow: '0 1px 5px rgba(0,0,0,.6)' }}>{shortTeam(name, mine)}</b>
            {atBat && <span className="relative font-display text-[12px] font-extrabold tracking-[0.18em] text-white/80">AT BAT</span>}
            <b className="relative ml-auto font-display text-[32px] font-extrabold leading-none text-white">{runs}</b>
          </div>
        );
      })}
    </div>
  </div>
);

/* ── 구장 위에 얹는 조각들 ────────────────────────────────────── */
const glass = (extra = {}) => ({
  clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',
  background: 'rgba(8,12,20,.62)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)', ...extra,
});

/* 점 한 줄 — B · S · O 를 가로로 */
const DotRow = ({ k, n, max, tone }) => (
  <div className="flex items-center gap-1.5">
    <b className="w-3 font-display text-[12px] font-extrabold text-white/85">{k}</b>
    {Array.from({ length: max }, (_, i) => (
      <i key={i} className="rounded-full" style={{ width: 11, height: 11, background: i < n ? tone : 'transparent', border: i < n ? 'none' : '1.5px solid rgba(255,255,255,.45)', boxSizing: 'border-box' }} />
    ))}
  </div>
);
const Count = ({ gap = 3 }) => (
  <div className="flex flex-col" style={{ gap }}>
    <DotRow k="B" n={CNT.b} max={3} tone="#22c55e" />
    <DotRow k="S" n={CNT.s} max={2} tone="#facc15" />
    <DotRow k="O" n={CNT.o} max={2} tone="#ef4444" />
  </div>
);

/* ── 여덟 가지 ────────────────────────────────────────────────── */
const P1 = () => ( /* 1 · 오른쪽 위 — 중계 정석 */
  <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-3 px-3 py-2.5" style={glass()}>
    <Count />
    <span className="h-[52px] w-px bg-white/15" />
    <Diamond bases={BASES} size={62} off="rgba(255,255,255,.45)" />
  </div>
);

const P2 = () => ( /* 2 · 오른쪽 위 가로 띠 */
  <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-3 px-3 py-2" style={glass()}>
    <Diamond bases={BASES} size={46} off="rgba(255,255,255,.45)" />
    <span className="h-7 w-px bg-white/15" />
    <div className="flex items-center gap-3">
      {[['B', CNT.b, 3, '#22c55e'], ['S', CNT.s, 2, '#facc15'], ['O', CNT.o, 2, '#ef4444']].map(([k, n, max, tone]) => (
        <DotRow key={k} k={k} n={n} max={max} tone={tone} />
      ))}
    </div>
  </div>
);

const P3 = () => ( /* 3 · 왼쪽 위 */
  <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-3 px-3 py-2.5" style={glass()}>
    <Diamond bases={BASES} size={62} off="rgba(255,255,255,.45)" />
    <span className="h-[52px] w-px bg-white/15" />
    <Count />
  </div>
);

const P4 = () => ( /* 4 · 아래 가운데 띠 */
  <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-4 px-4 py-2" style={glass()}>
    <Diamond bases={BASES} size={44} off="rgba(255,255,255,.45)" />
    <span className="h-7 w-px bg-white/15" />
    {[['B', CNT.b, 3, '#22c55e'], ['S', CNT.s, 2, '#facc15'], ['O', CNT.o, 2, '#ef4444']].map(([k, n, max, tone]) => (
      <DotRow key={k} k={k} n={n} max={max} tone={tone} />
    ))}
  </div>
);

const P5 = () => ( /* 5 · 내야에 겹치기 — 주루는 진짜 베이스 자리, 볼카운트만 오른쪽 위 */
  <>
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <Diamond bases={BASES} size={230} off="rgba(255,255,255,.22)" edge="rgba(255,255,255,.3)" />
    </div>
    <div className="pointer-events-none absolute right-3 top-3 px-3 py-2.5" style={glass()}><Count /></div>
  </>
);

const P6 = () => ( /* 6 · 오른쪽 위 세로 — 주루가 위, 볼카운트가 아래 */
  <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-center gap-2 px-3 py-2.5" style={glass()}>
    <Diamond bases={BASES} size={58} off="rgba(255,255,255,.45)" />
    <span className="h-px w-full bg-white/15" />
    <Count gap={4} />
  </div>
);

const P7 = () => ( /* 7 · 오른쪽 아래 */
  <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-3 px-3 py-2.5" style={glass()}>
    <Count />
    <span className="h-[52px] w-px bg-white/15" />
    <Diamond bases={BASES} size={62} off="rgba(255,255,255,.45)" />
  </div>
);

const P8 = () => ( /* 8 · 아웃은 크게 따로, 볼·스트라이크는 점으로 */
  <div className="pointer-events-none absolute right-3 top-3 flex items-stretch gap-3 px-3 py-2.5" style={glass()}>
    <div className="flex flex-col gap-1.5">
      <DotRow k="B" n={CNT.b} max={3} tone="#22c55e" />
      <DotRow k="S" n={CNT.s} max={2} tone="#facc15" />
    </div>
    <span className="w-px bg-white/15" />
    <div className="grid place-items-center px-0.5">
      <b className="font-display text-[26px] font-extrabold leading-none text-[#ef4444]">{CNT.o}</b>
      <span className="text-[11px] font-bold text-white/70">아웃</span>
    </div>
    <span className="w-px bg-white/15" />
    <Diamond bases={BASES} size={58} off="rgba(255,255,255,.45)" />
  </div>
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
const S = (k) => NOW.stats?.[k] ?? 70;

const Bat = () => (
  <Box a={OFF_C} className="shrink-0 overflow-hidden">
    <div className="relative shrink-0 bg-[#0b1220] bg-cover" style={{ height: 152, backgroundImage: faceArt(NOW), backgroundPosition: '50% 16%' }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.25),rgba(5,8,15,0) 40%,#05080f)' }} />
      <em className="absolute left-3 top-2 font-display text-[30px] font-extrabold leading-none not-italic" style={{ color: OFF_C, textShadow: `0 0 16px ${OFF_C}88, 0 2px 4px #000` }}>{NOW.overall}</em>
      <span className="absolute right-3 top-2.5 truncate text-[12px] font-bold" style={{ color: '#a7f3d0', textShadow: '0 1px 4px #000' }}>1안타 1볼넷</span>
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
          <em className="text-right font-display text-[12px] font-bold not-italic text-gray-300">{p.overall}</em>
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
          <Scoreboard />
          <Bat />
          <Order />
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
              <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
                {[[3, '탈삼진'], [2, '피안타'], [1, '볼넷'], [0, '실점']].map(([v, k]) => (
                  <div key={k} className="mt-cut bg-white/[0.045] py-1" style={{ '--c': '6px' }}>
                    <b className="block font-display text-[17px] font-extrabold leading-tight text-white">{v}</b>
                    <span className="text-[11px] font-semibold text-gray-300">{k}</span>
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
                <li key={p.id} className="mt-row mt-cut" style={{ gridTemplateColumns: '22px minmax(0,1fr) auto 28px', gap: 8, padding: '4px 9px', '--c': '5px', '--a': '#34d399' }}>
                  <Portrait player={p} w={22} h={28} color="#34d399" />
                  <b className="truncate text-[13px] font-semibold text-gray-100">{p.name}</b>
                  <Chip a="#34d399">대기</Chip>
                  <em className="text-right font-display text-[12px] font-bold not-italic text-gray-300">{p.overall}</em>
                </li>
              ))}
            </ul>
          </Box>

          <Box className="min-h-0">
            <Lab right="🎙">해설</Lab>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden px-3.5 pb-3">
              <p className="m-0 text-[14px] font-bold leading-snug text-white">{NOW.name}, 타석에 들어섭니다.</p>
              <p className="m-0 text-[12.5px] font-medium leading-snug text-gray-400">고승민, 좌익수 앞 안타.</p>
              <p className="m-0 text-[12.5px] font-medium leading-snug text-gray-400">손성빈, 유격수 앞 땅볼. 1아웃.</p>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}

const PLANS = [
  ['1 · 오른쪽 위 ★', P1], ['2 · 오른쪽 위 가로', P2], ['3 · 왼쪽 위', P3], ['4 · 아래 가운데', P4],
  ['5 · 내야에 겹치기', P5], ['6 · 오른쪽 위 세로', P6], ['7 · 오른쪽 아래', P7], ['8 · 아웃 크게', P8],
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
