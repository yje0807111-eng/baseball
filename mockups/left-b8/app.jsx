/* 타석 판 · 오른쪽 칸 8안.
   1~4 안: 왼쪽은 점수판 → 간략한 타석 판 → 타순, 오른쪽은 투수 상태 → 불펜 → 해설.
   5~8 안: 같은 뼈대에서 타석 판을 다르게 놓아 본 것.
   판·버튼·초상·수치 묶음은 src/myteam/ui.jsx, 점수판은 경기 화면 것을 그대로 쓴다. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, Panel as UiPanel, Btn, Chip, Portrait, Hero, KV, Stats, SegBar } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';
import { teamFlag } from '/src/myteam/teamArt.js';
import PlayView from '/src/play/PlayView.jsx';
import { FIELD_BGS } from '/src/play/backgrounds.js';
import { Diamond, Bso, shortTeam, SB_MASK } from '/src/BroadcastGame.jsx';

/* 판 — ui.jsx 의 Panel 에 라벨 여백과 세로 칸만 얹는다 */
const Panel = ({ label, right, a = '#10b981', c = 14, glass, className = '', style, children }) => (
  <UiPanel a={a} c={c} glass={glass} className={`flex min-h-0 flex-col ${className}`} style={style}>
    {label ? (
      <>
        <div className="flex shrink-0 items-center gap-2 px-3.5 pb-1 pt-2.5">
          <p className="mt-lab" style={{ '--a': a }}>{label}</p>
          {right && <span className="ml-auto font-display text-[11px] tracking-[0.14em] text-gray-500">{right}</span>}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </>
    ) : children}
  </UiPanel>
);

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

/* ── 머리칸 · 구장 · 작전 (여덟 안 공통) ───────────────────────── */
const Head = () => (
  <header className="relative flex items-center gap-5 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
    <Btn sm>←</Btn>
    <div className="leading-none">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Manager Mode</p>
      <h1 className="mt-1 text-xl font-black leading-none text-white">감독 모드</h1>
    </div>
    <Chip a="#f87171">● LIVE</Chip>
    <span className="ml-6 font-display text-[12px] tracking-[0.2em] text-gray-500">화면을 꾹 누르면 빨리감기</span>
    <div className="ml-auto flex gap-2">{['보통', '자동', '스킵'].map((n, i) => <Btn key={n} sm pri={i === 0}>{n}</Btn>)}</div>
    <Btn sm>일시정지</Btn>
  </header>
);

const SIDES = [[OFF.title, 0, OFF_C, false], ['드림팀', 0, DEF_C, true]];
const Scoreboard = () => (
  <div className="mt-cut shrink-0 overflow-hidden backdrop-blur-[3px]"
    style={{ '--c': '12px', background: 'rgba(8,12,20,.55)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14), inset 0 1px 0 rgba(255,255,255,.28)' }}>
    {SIDES.map(([name, runs, c, mine], i) => {
      const flag = teamFlag(name);
      const atBat = !mine;
      return (
        <div key={name} className={`relative flex items-center gap-2.5 overflow-hidden px-3 ${i ? 'border-t border-white/10' : ''}`}
          style={{ height: 50, background: atBat ? `linear-gradient(90deg, ${c}e0, ${c}40 72%, transparent)` : `linear-gradient(90deg, ${c}4d, transparent 60%)` }}>
          {flag && <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${flag.src})`, opacity: atBat ? 0.3 : 0.16, WebkitMaskImage: SB_MASK, maskImage: SB_MASK }} />}
          <b className="relative truncate text-[21px] font-extrabold text-white" style={{ textShadow: '0 1px 5px rgba(0,0,0,.6)', opacity: atBat ? 1 : 0.85 }}>{shortTeam(name, mine)}</b>
          {atBat && <span className="relative font-display text-[12px] font-extrabold tracking-[0.18em] text-white/80">AT BAT</span>}
          <b className="relative ml-auto font-display text-[32px] font-extrabold leading-none text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,.6)', opacity: atBat ? 1 : 0.85 }}>{runs}</b>
        </div>
      );
    })}
    <div className="flex items-stretch border-t border-white/10">
      <span className="grid shrink-0 place-items-center px-3" style={{ background: 'rgba(255,255,255,.07)' }}>
        <b className="font-display text-[21px] font-extrabold leading-none text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,.75)' }}>4<i className="ml-0.5 not-italic text-[#f87171]">▼</i></b>
      </span>
      <span className="w-px shrink-0 bg-white/12" />
      <span className="grid flex-1 place-items-center py-1"><Bso b={2} s={1} o={1} dot={14} font={13} lab="text-white/90" /></span>
      <span className="w-px shrink-0 bg-white/12" />
      <span className="grid place-items-center px-1.5"><Diamond bases={[LINEUP[4], null, LINEUP[6]]} size={70} note={38} off="rgba(255,255,255,.45)" ink="rgba(255,255,255,.92)" /></span>
    </div>
  </div>
);

const BG = { ...FIELD_BGS[0], stage: { dy: 0, zoom: 0.98 } };
const Ground = ({ children }) => (
  <UiPanel c={16} glass={false} className="relative min-h-0 overflow-hidden bg-[#060c16]">
    <PlayView event={null} bases={[LINEUP[4], null, LINEUP[6]]} defense={DEF9} batter={NOW} offColor={OFF_C} defColor={DEF_C} bg={BG} />
    {children}
  </UiPanel>
);

const ACTS = [['도루', '주자 없음'], ['번트', '내 공격 아님'], ['작전 지시', '5가지'], ['선수 교체', '벤치 4'], ['투수 교체', '불펜에서 고르기']];
const Acts = () => (
  <div className="flex h-full gap-3">
    {ACTS.map(([n, s], i) => {
      const on = i === ACTS.length - 1;
      return (
        <UiPanel key={n} a={on ? '#0b8f68' : '#10b981'} c={12} glass={!on}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 ${on ? 'bg-[#10b981] text-[#05080f]' : 'text-gray-300'}`}>
          <b className="text-[15px] font-extrabold">{n}</b>
          <span className={`font-display text-[11px] ${on ? 'text-[#05080f]/70' : 'text-gray-500'}`}>{s}</span>
        </UiPanel>
      );
    })}
  </div>
);

/* ── 타순 줄 — 라커 영입 목록과 같은 구단 색 줄 ──────────────────── */
const Row = ({ p, i, por, tall }) => (
  <li className={`mt-row mt-cut team ${i === 0 ? 'on' : ''}`}
    style={{ gridTemplateColumns: por ? `14px ${por}px minmax(0,1fr) auto 24px 34px` : '14px minmax(0,1fr) auto 24px 34px',
      gap: 8, padding: tall ? '6px 9px' : '4px 9px', '--c': '5px', '--a': OFF_C, '--t': OFF_C }}>
    <em className="text-right font-display text-[12px] font-bold not-italic text-gray-500">{i + 1}</em>
    {por && <Portrait player={p} w={por} h={Math.round(por * 1.28)} color={i === 0 ? OFF_C : '#334155'} />}
    <b className="truncate text-[13px] font-semibold text-gray-100">{p.name}</b>
    <span>{i === 0 && <Chip a={OFF_C}>타석</Chip>}</span>
    <span className="font-display text-[11px] text-gray-500">{p.position}</span>
    <em className="text-right font-display text-[12px] font-bold not-italic text-gray-300">{AVG(i)}</em>
  </li>
);
const Order = ({ por, tall, from = 0 }) => (
  <ul className="space-y-1 px-2 pb-2">
    {LINEUP.slice(from).map((p, i) => <Row key={p.id} p={p} i={i + from} por={por} tall={tall} />)}
  </ul>
);

/* ── 오른쪽 칸 — 투수 상태 · 불펜 · 해설 (여덟 안 공통) ──────────── */
const MIX = [['체인지업', 119, 35], ['슬라이더', 125, 25], ['커브', 118, 20], ['직구', 138, 20]];
const Arm = () => (
  <div className="px-3.5 pb-3 pt-0.5">
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
        <div key={k} className="flex items-center gap-2">
          <span className="w-8 font-display text-[11px] tracking-[0.12em] text-gray-400">{k}</span>
          <SegBar pct={v} width={196} ticks={20} />
          <em className="ml-auto font-display text-[13px] font-bold not-italic text-gray-200">{v}</em>
        </div>
      ))}
    </div>
    <ul className="mt-2.5 space-y-1">
      {MIX.map(([n, km, pct]) => (
        <li key={n} className="flex items-center gap-2">
          <b className="w-16 text-[12px] font-semibold text-gray-200">{n}</b>
          <em className="font-display text-[12px] not-italic text-gray-500">{km}km</em>
          <i className="ml-auto block h-[5px] w-24 bg-white/[0.08]"><b className="block h-full" style={{ width: `${pct * 2.6}%`, background: DEF_C }} /></i>
          <em className="w-8 text-right font-display text-[12px] font-bold not-italic text-gray-300">{pct}%</em>
        </li>
      ))}
    </ul>
  </div>
);

const Pen = () => (
  <ul className="space-y-1 px-2 pb-2">
    {PEN.map((p) => (
      <li key={p.id} className="mt-row mt-cut" style={{ gridTemplateColumns: '22px minmax(0,1fr) auto 30px', gap: 8, padding: '4px 9px', '--c': '5px', '--a': DEF_C }}>
        <Portrait player={p} w={22} h={28} color={DEF_C} />
        <b className="truncate text-[13px] font-semibold text-gray-100">{p.name}</b>
        <Chip a={p.overall >= 78 ? '#34d399' : '#fbbf24'}>{p.overall >= 78 ? '몸풀기' : '대기'}</Chip>
        <em className="text-right font-display text-[12px] font-bold not-italic text-gray-300">{p.overall}</em>
      </li>
    ))}
  </ul>
);

const LINES = [
  ['지금', `${NOW.name}, 타석에 들어섭니다.`],
  ['4회 말', '고승민, 좌익수 앞 안타.'],
  ['4회 말', '손성빈, 유격수 앞 땅볼. 1아웃.'],
  ['3회 초', '삼진 아웃! 이닝 종료.'],
];
const Talk = ({ rows = 4 }) => (
  <ul className="space-y-1.5 px-3.5 pb-2.5 pt-0.5">
    {LINES.slice(0, rows).map(([t, l], i) => (
      <li key={l} className={i ? 'text-[12px] text-gray-500' : 'text-[14px] font-bold text-white'}>
        <em className="mr-2 font-display not-italic" style={{ color: i ? '#475569' : OFF_C }}>{t}</em>{l}
      </li>
    ))}
  </ul>
);

const Right = () => (
  <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto auto 1fr' }}>
    <Panel label="상대 투수" a={DEF_C}><Arm /></Panel>
    <Panel label="불펜" right="드림팀"><Pen /></Panel>
    <Panel label="해설"><Talk /></Panel>
  </div>
);

/* ── 타석 판 여덟 가지 ─────────────────────────────────────────── */

/* 1 · 한 줄 — 얼굴 · 이름 · 종합, 그 아래 오늘 한 마디 */
const B1 = () => (
  <Panel label="타석" right={TODAY}>
    <div className="flex items-center gap-2.5 px-3.5 pb-3 pt-0.5">
      <Portrait player={NOW} w={46} h={58} color={OFF_C} />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[19px] font-extrabold text-white">{NOW.name}</b>
        <span className="font-display text-[11px] tracking-[0.16em] text-gray-500">{NOW.position} · {NOW.hand} · 타율 {AVG(0)}</span>
      </div>
      <em className="font-display text-[26px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
    </div>
  </Panel>
);

/* 2 · 띠 — 카드 그림을 낮게 깔고 이름만 얹는다 */
const B2 = () => (
  <UiPanel c={14} className="shrink-0 overflow-hidden">
    <Hero img={art(NOW)} ovr={NOW.overall} name={NOW.name} color={OFF_C} h={92} pos="58% 16%" />
    <div className="flex items-center gap-2 px-3.5 py-2">
      <span className="font-display text-[11px] tracking-[0.16em] text-gray-500">{NOW.position} · {NOW.hand}</span>
      <em className="ml-auto font-display text-[13px] font-bold not-italic text-gray-200">{AVG(0)}</em>
      <Chip a={OFF_C}>{TODAY}</Chip>
    </div>
  </UiPanel>
);

/* 3 · 수치 — 얼굴 없이 이름과 네 수치만 */
const B3 = () => (
  <Panel label="타석">
    <div className="px-3.5 pb-3 pt-0.5">
      <div className="flex items-baseline gap-2">
        <b className="truncate text-[20px] font-extrabold text-white">{NOW.name}</b>
        <span className="font-display text-[11px] tracking-[0.16em] text-gray-500">{NOW.position}</span>
        <em className="ml-auto font-display text-[24px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
      </div>
      <div className="mt-2"><Stats items={[['타율', AVG(0)], ['홈런', 9], ['타점', 55], ['오늘', '1안타']]} /></div>
    </div>
  </Panel>
);

/* 4 · 막대 — 얼굴에 파워 · 컨택 두 줄만 */
const B4 = () => (
  <Panel label="타석" right={TODAY}>
    <div className="flex gap-2.5 px-3.5 pb-3 pt-0.5">
      <Portrait player={NOW} w={50} h={64} color={OFF_C} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <b className="truncate text-[18px] font-extrabold text-white">{NOW.name}</b>
          <em className="ml-auto font-display text-[20px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
        </div>
        <div className="mt-1.5 space-y-1">
          {[['파워', NOW.stats.power], ['컨택', NOW.stats.contact]].map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-8 font-display text-[10px] tracking-[0.12em] text-gray-400">{k}</span>
              <SegBar pct={v} width={128} ticks={14} />
              <em className="ml-auto font-display text-[12px] font-bold not-italic text-gray-300">{v}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Panel>
);

/* 5 · 타순 안에서 — 첫 줄이 곧 타석 판이다 (판을 따로 두지 않는다) */
const B5 = () => null;

/* 6 · 구장 위로 — 타석 판을 구장 왼쪽 아래에 얹고 왼쪽 칸은 타순만 */
const B6 = () => null;

/* 7 · 맞대결 — 타자와 상대 투수를 한 판에 마주 놓는다 */
const B7 = () => (
  <Panel label="맞대결" right="4타수 2안타">
    <div className="flex items-center gap-2 px-3 pb-2.5 pt-0.5">
      <div className="flex-1 text-center">
        <Portrait player={NOW} w={50} h={64} color={OFF_C} />
        <b className="mt-1 block truncate text-[14px] font-bold text-white">{NOW.name}</b>
        <em className="font-display text-[17px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
      </div>
      <span className="font-display text-[12px] font-bold tracking-[0.2em] text-gray-600">VS</span>
      <div className="flex-1 text-center">
        <Portrait player={FOE} w={50} h={64} color={DEF_C} />
        <b className="mt-1 block truncate text-[14px] font-bold text-white">{FOE.name}</b>
        <em className="font-display text-[17px] font-extrabold not-italic" style={{ color: DEF_C }}>{FOE.overall}</em>
      </div>
    </div>
  </Panel>
);

/* 8 · 오늘 — 이름 한 줄 아래 이 경기 타석 결과를 칸으로 */
const B8 = () => (
  <Panel label="타석">
    <div className="px-3.5 pb-3 pt-0.5">
      <div className="flex items-center gap-2.5">
        <Portrait player={NOW} w={40} h={51} color={OFF_C} />
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[18px] font-extrabold text-white">{NOW.name}</b>
          <span className="font-display text-[11px] tracking-[0.16em] text-gray-500">{NOW.position} · {AVG(0)}</span>
        </div>
        <em className="font-display text-[22px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
      </div>
      <div className="mt-2 flex gap-1">
        {['안타', '삼진', '볼넷', '이번'].map((v, i) => (
          <span key={v} className="mt-cut flex-1 py-1 text-center font-display text-[11px] font-bold"
            style={{ '--c': '5px', background: i === 3 ? `${OFF_C}33` : 'rgba(255,255,255,.05)', color: i === 3 ? '#fff' : '#94a3b8' }}>{v}</span>
        ))}
      </div>
    </div>
  </Panel>
);

/* ── 안 정의 — 왼쪽 칸과 구장 칸을 함께 정한다 ───────────────────── */
const stack = (Card, orderProps = {}) => ({ onGround: null, Left: () => (
  <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto auto 1fr' }}>
    <Scoreboard />
    <Card />
    <Panel label="타순" right={OFF.title}><Order {...orderProps} /></Panel>
  </div>
) });

const PLANS = [
  ['1 · 한 줄', stack(B1)],
  ['2 · 낮은 띠', stack(B2)],
  ['3 · 수치만', stack(B3)],
  ['4 · 얼굴 · 막대 둘', stack(B4)],
  /* 5 — 타석 판 없이 타순 첫 줄을 키워 그 자리를 대신한다 */
  ['5 · 타순 첫 줄이 타석', { onGround: null, Left: () => (
    <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto 1fr' }}>
      <Scoreboard />
      <Panel label="타순" right={OFF.title}>
        <div className="px-2 pb-1.5 pt-0.5">
          <div className="mt-row mt-cut team on" style={{ gridTemplateColumns: '50px minmax(0,1fr) auto', gap: 10, padding: '8px 9px', '--c': '7px', '--a': OFF_C, '--t': OFF_C }}>
            <Portrait player={NOW} w={50} h={64} color={OFF_C} />
            <div className="min-w-0">
              <b className="block truncate text-[17px] font-extrabold text-white">{NOW.name}</b>
              <span className="font-display text-[11px] tracking-[0.14em] text-gray-400">{NOW.position} · {AVG(0)} · {TODAY}</span>
            </div>
            <em className="font-display text-[22px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
          </div>
        </div>
        <Order from={1} por={20} />
      </Panel>
    </div>
  ) }],
  /* 6 — 타석 판을 구장 왼쪽 아래에 얹고 왼쪽 칸은 타순만 길게 */
  ['6 · 타석은 구장 위에', {
    onGround: (
      <div className="pointer-events-none absolute bottom-3 left-3">
        <div className="mt-cut flex items-center gap-2.5 px-3 py-2 backdrop-blur-[3px]"
          style={{ '--c': '10px', background: 'rgba(8,12,20,.62)', boxShadow: `inset 0 0 0 1px ${OFF_C}55` }}>
          <Portrait player={NOW} w={40} h={51} color={OFF_C} />
          <div>
            <b className="block text-[16px] font-extrabold text-white">{NOW.name}</b>
            <span className="font-display text-[11px] tracking-[0.14em] text-gray-400">{NOW.position} · {AVG(0)} · {TODAY}</span>
          </div>
          <em className="ml-1 font-display text-[22px] font-extrabold not-italic" style={{ color: OFF_C }}>{NOW.overall}</em>
        </div>
      </div>
    ),
    Left: () => (
      <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto 1fr' }}>
        <Scoreboard />
        <Panel label="타순" right={OFF.title}><Order por={26} tall /></Panel>
      </div>
    ),
  }],
  ['7 · 맞대결', stack(B7)],
  ['8 · 오늘 기록', stack(B8)],
];

const Z = Math.min(1, (window.innerWidth - 40) / 1920);

function App() {
  const [i, setI] = useState(0);
  const plan = PLANS[i][1];
  const Left = plan.Left;
  return (
    <div className="min-h-dvh bg-[#06080c] p-4 text-gray-200">
      <UiStyle />
      <style>{KEYFRAMES}</style>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PLANS.map(([n], k) => (
          <button key={n} type="button" onClick={() => setI(k)}
            className={`mt-cut px-3 py-1.5 font-display text-[13px] font-bold ${k === i ? 'bg-emerald-400 text-[#05080f]' : 'bg-white/[0.07] text-gray-300'}`} style={{ '--c': '6px' }}>{n}</button>
        ))}
        <span className="ml-2 font-display text-[12px] tracking-[0.14em] text-gray-500">1~4 · 말한 대로 · 5~8 · 더 해 본 것</span>
      </div>
      <div style={{ width: 1920 * Z, height: 911 * Z }}>
        <div className="relative select-none overflow-hidden bg-[#05080f] text-gray-200"
          style={{ width: 1920, height: 911, transform: `scale(${Z})`, transformOrigin: 'top left' }}>
          <div className="grid h-full" style={{ gridTemplateRows: '72px 1fr' }}>
            <Head />
            <div className="grid min-h-0 gap-3 p-3" style={{ gridTemplateColumns: '300px 1fr 320px' }}>
              <Left />
              <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: '1fr 84px' }}>
                <Ground>{plan.onGround}</Ground>
                <Acts />
              </div>
              <Right />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
