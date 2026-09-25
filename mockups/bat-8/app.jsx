/* 타석 판 8안 — 왼쪽 칸에서 타석 판이 차지하는 크기와 짜임만 다르다.
   점수판 · 타순 · 구장 · 오른쪽 칸은 지금 경기 화면 그대로. 남는 높이는 늘 타순이 갖는다. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, Btn, Chip, Portrait, Hero, SegBar, Stats } from '/src/myteam/ui.jsx';
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
  const men = bats(DEF);
  const of = men.filter((p) => p.position === 'OF');
  const one = (k) => men.find((p) => p.position === k) || men[0];
  return { P: FOE, C: one('C'), '1B': one('1B'), '2B': one('2B'), '3B': one('3B'), SS: one('SS'), LF: of[0], CF: of[1], RF: of[2] };
})();
const OFF_C = teamFlag(OFF.title)?.color || '#f87171';
const DEF_C = teamFlag(DEF.title)?.color || '#34d399';
const art = (p) => `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`;
const AVG = (i) => `.${240 + i * 7}`;
const TODAY = '1안타 1볼넷';
const S = (k) => NOW.stats?.[k] ?? 70;

/* ── 공통 조각 ────────────────────────────────────────────────── */
const Lab = ({ children, a = '#10b981', right, rightColor }) => (
  <div className="flex shrink-0 items-center gap-2 px-3.5 pb-1 pt-2.5">
    <p className="mt-lab" style={{ '--a': a }}>{children}</p>
    {right && <span className="ml-auto truncate text-[11px]" style={{ color: rightColor || '#94a3b8' }}>{right}</span>}
  </div>
);
const Box = ({ a = '#10b981', className = '', style, children }) => (
  <section className={`mt-cut mt-frame mt-glass flex flex-col ${className}`} style={{ '--c': '14px', '--a': a, ...style }}>{children}</section>
);
const Bars = ({ items, w = 202, ticks = 22 }) => (
  <div className="shrink-0 space-y-1 px-3.5 pb-3 pt-2">
    {items.map(([k, v]) => (
      <div key={k} className="grid grid-cols-[30px_1fr_24px] items-center gap-2">
        <span className="font-display text-[10px] tracking-[0.12em] text-gray-400">{k}</span>
        <SegBar pct={v} width={w} ticks={ticks} />
        <em className="text-right font-display text-[12px] font-bold not-italic text-gray-300">{v}</em>
      </div>
    ))}
  </div>
);
const FOUR = [['파워', S('power')], ['컨택', S('contact')], ['주력', S('speed')], ['수비', S('defense')]];
const TWO = [['파워', S('power')], ['컨택', S('contact')]];

/* ── 여덟 가지 타석 판 ────────────────────────────────────────── */
/* 1 · 한 줄 */
const T1 = () => (
  <Box a={OFF_C} className="shrink-0">
    <div className="flex items-center gap-2.5 px-3.5 py-2.5">
      <Portrait player={NOW} w={38} h={48} color={OFF_C} />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[16px] font-extrabold leading-tight text-white">{NOW.name}</b>
        <span className="font-display text-[10px] tracking-[0.14em] text-gray-500">{NOW.position} · {TODAY}</span>
      </div>
      <em className="font-display text-[22px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
    </div>
  </Box>
);

/* 2 · 얼굴에 막대 둘 */
const T2 = () => (
  <Box a={OFF_C} className="shrink-0">
    <Lab a={OFF_C} right={TODAY}>타석</Lab>
    <div className="flex gap-2.5 px-3.5 pb-1">
      <Portrait player={NOW} w={52} h={66} color={OFF_C} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <b className="truncate text-[17px] font-extrabold text-white">{NOW.name}</b>
          <em className="ml-auto font-display text-[20px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
        </div>
        <span className="font-display text-[10px] tracking-[0.14em] text-gray-500">{NOW.position} · {NOW.hand}타</span>
      </div>
    </div>
    <Bars items={TWO} />
  </Box>
);

/* 3 · 얼굴 크게, 막대 없이 */
const T3 = () => (
  <Box a={OFF_C} className="shrink-0">
    <Lab a={OFF_C} right={TODAY}>타석</Lab>
    <div className="flex gap-3 px-3.5 pb-3">
      <Portrait player={NOW} w={96} h={128} color={OFF_C} />
      <div className="flex min-w-0 flex-1 flex-col">
        <b className="truncate text-[19px] font-extrabold leading-tight text-white">{NOW.name}</b>
        <span className="font-display text-[11px] tracking-[0.14em] text-gray-500">{NOW.position} · {NOW.hand}타</span>
        <span className="mt-1 font-display text-[12px] text-gray-400">타율 {AVG(0)}</span>
        <em className="mt-auto font-display text-[32px] font-extrabold leading-none not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
      </div>
    </div>
  </Box>
);

/* 4 · 지금 쓰는 것 — 얼굴 112 에 막대 넷 */
const T4 = () => (
  <Box a={OFF_C} className="shrink-0">
    <Lab a={OFF_C} right={TODAY}>타석</Lab>
    <div className="flex gap-3 px-3.5 pb-1">
      <Portrait player={NOW} w={112} h={150} color={OFF_C} />
      <div className="flex min-w-0 flex-1 flex-col">
        <b className="truncate text-[20px] font-extrabold leading-tight text-white">{NOW.name}</b>
        <span className="font-display text-[11px] tracking-[0.14em] text-gray-500">{NOW.position} · {NOW.hand}타</span>
        <em className="mt-auto font-display text-[34px] font-extrabold leading-none not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
      </div>
    </div>
    <Bars items={FOUR} />
  </Box>
);

/* 5 · 카드 그림을 띠로 깔고 막대 둘 */
const T5 = () => (
  <Box a={OFF_C} className="shrink-0 overflow-hidden">
    <Hero img={art(NOW)} ovr={NOW.overall} name={NOW.name} color={OFF_C} h={104} pos="58% 16%" />
    <div className="flex items-center gap-2 px-3.5 pt-2">
      <span className="font-display text-[11px] tracking-[0.14em] text-gray-500">{NOW.position} · {AVG(0)}</span>
      <span className="ml-auto"><Chip a={OFF_C}>{TODAY}</Chip></span>
    </div>
    <Bars items={TWO} />
  </Box>
);

/* 6 · 얼굴 옆에 오늘 수치 넉 칸 */
const T6 = () => (
  <Box a={OFF_C} className="shrink-0">
    <Lab a={OFF_C}>타석</Lab>
    <div className="flex items-center gap-2.5 px-3.5">
      <Portrait player={NOW} w={58} h={74} color={OFF_C} />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[18px] font-extrabold text-white">{NOW.name}</b>
        <span className="font-display text-[11px] tracking-[0.14em] text-gray-500">{NOW.position} · {NOW.hand}타</span>
      </div>
      <em className="font-display text-[26px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
    </div>
    <div className="px-3.5 pb-3 pt-2.5"><Stats items={[['타율', AVG(0)], ['홈런', 9], ['타점', 55], ['오늘', '1안타']]} /></div>
  </Box>
);

/* 7 · 얼굴을 칸 폭 가득, 이름은 그림 위에 */
const T7 = () => (
  <Box a={OFF_C} className="shrink-0 overflow-hidden">
    <div className="relative bg-[#0b1220] bg-cover" style={{ height: 152, backgroundImage: art(NOW), backgroundPosition: '50% 16%' }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.25),rgba(5,8,15,0) 40%,#05080f)' }} />
      <em className="absolute left-3 top-2 font-display text-[30px] font-extrabold not-italic" style={{ color: OFF_C, textShadow: `0 0 16px ${OFF_C}88,0 2px 4px #000` }}>{NOW.overall}</em>
      <span className="absolute right-3 top-2.5"><Chip a={OFF_C}>{TODAY}</Chip></span>
      <b className="absolute bottom-1.5 left-3 right-3 truncate text-[22px] font-black text-white">{NOW.name}</b>
    </div>
    <Bars items={FOUR} w={236} ticks={24} />
  </Box>
);

/* 8 · 맞대결 — 타자와 지금 투수를 마주 놓는다 */
const T8 = () => (
  <Box a={OFF_C} className="shrink-0">
    <Lab a={OFF_C} right="4타수 2안타">맞대결</Lab>
    <div className="flex items-center gap-2 px-3 pb-3">
      {[[NOW, OFF_C], [FOE, DEF_C]].map(([p, c], i) => (
        <React.Fragment key={p.id}>
          {i === 1 && <span className="font-display text-[12px] font-bold tracking-[0.2em] text-gray-600">VS</span>}
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <Portrait player={p} w={62} h={80} color={c} />
            <b className="mt-1 block w-full truncate text-center text-[14px] font-bold text-white">{p.name}</b>
            <em className="font-display text-[19px] font-extrabold not-italic" style={{ color: c }}>{p.overall}</em>
          </div>
        </React.Fragment>
      ))}
    </div>
  </Box>
);

/* ── 나머지 화면 (지금 경기 화면 그대로) ────────────────────────── */
const SIDES = [[OFF.title, 0, OFF_C, false], ['드림팀', 0, DEF_C, true]];
const Scoreboard = () => (
  <div className="mt-cut shrink-0 overflow-hidden backdrop-blur-[3px]"
    style={{ '--c': '12px', background: 'rgba(8,12,20,.55)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14), inset 0 1px 0 rgba(255,255,255,.28)' }}>
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
    <div className="flex items-stretch border-t border-white/10">
      <span className="grid shrink-0 place-items-center px-3" style={{ background: 'rgba(255,255,255,.07)' }}>
        <b className="font-display text-[21px] font-extrabold leading-none text-white">4<i className="ml-0.5 not-italic text-[#f87171]">▼</i></b>
      </span>
      <span className="w-px shrink-0 bg-white/12" />
      <span className="grid flex-1 place-items-center py-1"><Bso b={2} s={1} o={1} dot={14} font={13} lab="text-white/90" /></span>
      <span className="w-px shrink-0 bg-white/12" />
      <span className="grid place-items-center px-1.5"><Diamond bases={[LINEUP[4], null, LINEUP[6]]} size={70} note={38} off="rgba(255,255,255,.45)" ink="rgba(255,255,255,.92)" /></span>
    </div>
  </div>
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
          <span className="truncate text-right text-[11px] text-white/50">{i === 1 ? '2루타' : i === 3 ? '삼진' : '-'}</span>
          <em className="text-right font-display text-[12px] font-bold not-italic text-gray-300">{p.overall}</em>
        </li>
      ))}
    </ul>
  </Box>
);

const BG = { ...FIELD_BGS[0] };
const ACTS = [['🏃', '도루', '주자 없음'], ['🪃', '번트', '내 공격 아님'], ['🎯', '직구 노리기', '35%'], ['🌀', '변화구 노리기', '65%'], ['🔁', '투수 교체', '불펜에서 고르기']];
const MIX = [['직구', 0.35], ['슬라이더', 0.39], ['체인지업', 0.26]];

function Screen({ Card }) {
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
          <Card />
          <Order />
        </div>

        <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: '1fr 84px' }}>
          <section className="mt-cut mt-frame relative min-h-0 overflow-hidden bg-[#060c16]" style={{ '--c': '16px', '--a': '#10b981' }}>
            <PlayView event={null} bases={[LINEUP[4], null, LINEUP[6]]} defense={DEF9} batter={NOW} offColor={OFF_C} defColor={DEF_C} bg={BG} />
          </section>
          <div className="flex items-stretch gap-2.5">
            {ACTS.map(([ic, t, s], i) => (
              <button key={t} type="button"
                className={`mt-cut flex flex-1 flex-col items-center justify-center gap-0.5 text-[13px] ${i > 1 ? 'mt-frame mt-glass text-gray-100' : 'bg-[#05080f]/60 text-gray-600'}`}
                style={{ '--c': '11px', '--a': '#10b981' }}>
                <b className="text-lg leading-none">{ic}</b>{t}<small className="font-display text-[11px] text-gray-500">{s}</small>
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
                  <span className="font-display text-[11px] tracking-[0.16em] text-gray-500">{FOE.position} · 38구</span>
                </div>
                <em className="font-display text-[24px] font-extrabold not-italic" style={{ color: DEF_C }}>{FOE.overall}</em>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {[['체력', 76], ['구위', FOE.stats?.stuff ?? 70], ['제구', FOE.stats?.control ?? 70]].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[30px_1fr_26px] items-center gap-2">
                    <span className="font-display text-[11px] tracking-[0.12em] text-gray-400">{k}</span>
                    <i className="block h-[6px] bg-white/[0.08]"><b className="block h-full" style={{ width: `${v}%`, background: DEF_C }} /></i>
                    <em className="text-right font-display text-[13px] font-bold not-italic text-gray-200">{v}</em>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
                {[[3, '탈삼진'], [2, '피안타'], [1, '볼넷'], [0, '실점']].map(([v, k]) => (
                  <div key={k} className="mt-cut bg-white/[0.045] py-1" style={{ '--c': '6px' }}>
                    <b className="block font-display text-[17px] font-extrabold leading-tight text-white">{v}</b>
                    <span className="font-display text-[10px] text-gray-400">{k}</span>
                  </div>
                ))}
              </div>
              <ul className="mt-2.5 space-y-1">
                {MIX.map(([n, v]) => (
                  <li key={n} className="grid grid-cols-[62px_1fr_34px] items-center gap-2">
                    <b className="text-[12px] font-semibold text-gray-200">{n}</b>
                    <i className="block h-[5px] bg-white/[0.08]"><b className="block h-full" style={{ width: `${v * 160}%`, background: DEF_C }} /></i>
                    <em className="text-right font-display text-[12px] font-bold not-italic text-gray-400">{Math.round(v * 100)}%</em>
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
              <p className="m-0 text-[12px] leading-snug text-gray-500">고승민, 좌익수 앞 안타.</p>
              <p className="m-0 text-[12px] leading-snug text-gray-500">손성빈, 유격수 앞 땅볼. 1아웃.</p>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}

const PLANS = [
  ['1 · 한 줄', T1], ['2 · 막대 둘', T2], ['3 · 얼굴만 크게', T3], ['4 · 지금 것', T4],
  ['5 · 카드 띠', T5], ['6 · 오늘 넉 칸', T6], ['7 · 폭 가득', T7], ['8 · 맞대결', T8],
];
const Z = Math.min(1, (window.innerWidth - 40) / 1920);

function App() {
  const [i, setI] = useState(3);
  const Card = PLANS[i][1];
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
          <Screen Card={Card} />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
