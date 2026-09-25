/* 작전 판때기 8안 — 버튼 판 자체의 재질만 다르다. 짜임(아이콘 · 이름 · 한 마디)은 모두 같다.
   판때기는 Higgsfield 로 뽑은 평면 텍스처 여덟 장. 치는 회 · 막는 회를 오가며 본다. */
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

/* ── 선 아이콘 — 24×24, 굵기 1.8 ────────────────────────────── */
const I = ({ d, fill, r }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d.map((p, i) => <path key={i} d={p} />)}
    {r && r.map(([cx, cy, rr], i) => <circle key={`c${i}`} cx={cx} cy={cy} r={rr} fill={fill || 'currentColor'} stroke="none" />)}
  </svg>
);
const ICON = {
  steal: <I d={['M4 18h10', 'M11 15l3 3-3 3', 'M8 5.5l3.5 4.5L9 14']} r={[[14, 4, 1.8]]} />,          // 달려 나가는 주자
  bunt: <I d={['M6 17l7-7', 'M14 6l4 4-3 3-4-4z', 'M4 19l2-2']} />,                                    // 짧게 댄 배트
  hnr: <I d={['M3 16h7', 'M8 13l3 3-3 3', 'M13 8h7', 'M18 5l3 3-3 3']} />,                             // 둘이 동시에 뛴다
  fast: <I d={['M3 12h14', 'M14 8l4 4-4 4']} />,                                                        // 곧게 오는 공
  slider: <I d={['M3 15c5 0 6-9 11-9', 'M12 3l3 3-3 3']} />,                                            // 휘어 오는 공
  inside: <I d={['M4 5h16v14H4z', 'M4 9.7h16M4 14.3h16M9.3 5v14M14.7 5v14']} r={[[6.6, 16.6, 2.2]]} />,  // 존 안쪽 낮게
  chase: <I d={['M5 6h14v12H5z']} r={[[21, 19.5, 2]]} />,                                                // 존 밖으로 빼는 공
  ibb: <I d={['M6 20l3-6 3 2 3-6', 'M18 7h3']} r={[[18, 4, 1.6]]} />,                                    // 그냥 걸어 나간다
};

const ATT = [
  ['steal', '도루', '62%', true], ['bunt', '번트', '주자 진루', true], ['hnr', '히트앤런', '주자 먼저 뛴다', true],
  ['fast', '직구 노리기', '35%', true], ['slider', '변화구 노리기', '65%', true],
];
const DEFEND = [
  ['inside', '몸쪽 승부', '헛스윙 유도', true], ['chase', '유인구', '참으면 볼', true], ['fast', '직구 승부', '35%', true],
  ['slider', '변화구 승부', '65%', true], ['ibb', '고의사구', '1루 채우기', true],
];

/* ── 여덟 가지 판때기 ─────────────────────────────────────────── */
const cut = (c) => ({ '--c': c });
/* 버튼 판때기 — 재질만 다르고 짜임은 같다 (Higgsfield · recraft 로 뽑은 평면 텍스처) */
const PLATE = [
  ['pl-steel', '강철', 0.42],
  ['pl-carbon', '카본', 0.38],
  ['pl-glass', '유리', 0.34],
  ['pl-rivet', '리벳 철판', 0.46],
  ['pl-leather', '가죽', 0.4],
  ['pl-stone', '석판', 0.46],
  ['pl-holo', '홀로', 0.5],
  ['pl-oak', '참나무', 0.44],
];

/** 판때기 한 장 위에 아이콘과 글자 — 재질과 어둡기만 갈아 끼운다 */
const Plate = ({ file, dim, list, tone }) => (
  <div className="flex items-stretch gap-2.5">
    {list.map(([ic, t, s, on]) => (
      <button key={t} type="button" disabled={!on}
        className="mt-cut group relative flex flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden"
        style={{ ...cut('11px'), boxShadow: `inset 0 0 0 1px ${tone}4d, inset 0 1px 0 rgba(255,255,255,.14)` }}>
        <i className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(ui/act/${file}.webp)` }} />
        <i className="absolute inset-0" style={{ background: `rgba(5,8,15,${dim})` }} />
        {/* 위쪽에서 떨어지는 빛 한 겹 — 판이 도드라진다 */}
        <i className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.1),transparent 46%)' }} />
        <span className="relative" style={{ color: tone }}>{ICON[ic]}</span>
        <b className="relative text-[14px] font-bold text-white">{t}</b>
        <small className="relative text-[12px] font-semibold text-gray-300">{s}</small>
      </button>
    ))}
  </div>
);

const A1 = (p) => <Plate file="pl-steel" dim={0.42} {...p} />;
const A2 = (p) => <Plate file="pl-carbon" dim={0.38} {...p} />;
const A3 = (p) => <Plate file="pl-glass" dim={0.34} {...p} />;
const A4 = (p) => <Plate file="pl-rivet" dim={0.46} {...p} />;
const A5 = (p) => <Plate file="pl-leather" dim={0.4} {...p} />;
const A6 = (p) => <Plate file="pl-stone" dim={0.46} {...p} />;
const A7 = (p) => <Plate file="pl-holo" dim={0.5} {...p} />;
const A8 = (p) => <Plate file="pl-oak" dim={0.44} {...p} />;

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
const glass = {
  clipPath: 'polygon(11px 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%,0 11px)',
  background: 'rgba(8,12,20,.62)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)', backdropFilter: 'blur(3px)',
};
const Scoreboard = ({ mineBat }) => {
  const sides = [[OFF.title, 3, OFF_C, false], ['드림팀', 2, DEF_C, true]];
  return (
    <div className="mt-cut flex shrink-0 overflow-hidden backdrop-blur-[3px]"
      style={{ '--c': '12px', background: 'rgba(8,12,20,.55)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14), inset 0 1px 0 rgba(255,255,255,.28)' }}>
      <span className="flex shrink-0 flex-col items-center justify-center px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,.07)' }}>
        <b className="font-display text-[32px] font-extrabold leading-[0.8] text-white">4</b>
        <svg width="20" height="14" viewBox="0 0 20 14" className="mt-1"><path d={mineBat ? 'M0 0 L20 0 L10 14 Z' : 'M10 0 L20 14 L0 14 Z'} fill="#f87171" /></svg>
      </span>
      <div className="min-w-0 flex-1">
        {sides.map(([name, runs, c, mine], i) => {
          const flag = teamFlag(name); const atBat = mineBat ? mine : !mine;
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
};
const Bat = () => (
  <Box a={OFF_C} className="shrink-0 overflow-hidden">
    <div className="relative shrink-0 bg-[#0b1220] bg-cover" style={{ height: 152, backgroundImage: faceArt(NOW), backgroundPosition: '50% 16%' }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.25),rgba(5,8,15,0) 40%,#05080f)' }} />
      <em className="absolute left-3 top-2 font-display text-[30px] font-extrabold leading-none not-italic" style={{ color: OFF_C, textShadow: `0 0 16px ${OFF_C}88, 0 2px 4px #000` }}>{NOW.overall}</em>
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
          <span>{i === 0 ? <Chip a={OFF_C}>타석</Chip> : null}</span>
          <span className="truncate text-right text-[12px] font-semibold text-white/50">{i === 1 ? '2루타' : '-'}</span>
          <em className="text-right font-display text-[12px] font-bold not-italic" style={{ color: statBandColor(p.overall) }}>{p.overall}</em>
        </li>
      ))}
    </ul>
  </Box>
);
const MIX = [['직구', 0.35], ['슬라이더', 0.39], ['체인지업', 0.26]];
const BG = { ...FIELD_BGS[0] };

function Screen({ Acts, mineBat }) {
  const tone = mineBat ? OFF_C : DEF_C;
  return (
    <div className="grid h-full" style={{ gridTemplateRows: '63px 1fr' }}>
      <header className="relative flex items-center gap-6 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
        <Btn sm>←</Btn>
        <div className="leading-none">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Manager Mode</p>
          <h1 className="mt-1 text-xl font-black leading-none text-white">감독 모드</h1>
        </div>
        <Chip a="#f87171">● LIVE</Chip>
        <div className="ml-auto flex gap-2">{['1×', '2×', '3×', '스킵'].map((n, i) => <Btn key={n} sm pri={i === 0}>{n}</Btn>)}</div>
        <Btn sm>일시정지</Btn>
      </header>
      <div className="grid min-h-0 gap-3 p-3" style={{ gridTemplateColumns: '300px 1fr 320px' }}>
        <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto auto minmax(0,1fr)' }}>
          <Scoreboard mineBat={mineBat} /><Bat /><Order />
        </div>
        <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: '1fr 84px' }}>
          <section className="mt-cut mt-frame relative min-h-0 overflow-hidden bg-[#060c16]" style={{ '--c': '16px', '--a': '#10b981' }}>
            <PlayView event={null} bases={BASES} defense={DEF9} batter={NOW} offColor={OFF_C} defColor={DEF_C} bg={BG} />
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-3.5 px-3.5 py-3" style={glass}>
              <Diamond bases={BASES} size={76} off="rgba(255,255,255,.45)" />
              <span className="h-[62px] w-px bg-white/15" />
              <Bso b={2} s={1} o={1} dot={15} font={15} gap={6} rowGap={5} off="rgba(255,255,255,.45)" lab="text-white/85" />
            </div>
          </section>
          <Acts list={mineBat ? ATT : DEFEND} tone={tone} />
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
              <p className="m-0 text-[14px] font-bold leading-snug text-white">체인지업 127km — 바깥쪽 낮게.</p>
              <p className="m-0 text-[12.5px] font-medium leading-snug text-gray-400">직구 145km — 스트라이크.</p>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}

const PLANS = [
  ['1 · 강철', A1], ['2 · 카본 ★', A2], ['3 · 유리', A3], ['4 · 리벳 철판',A4],
  ['5 · 가죽', A5], ['6 · 석판', A6], ['7 · 홀로', A7], ['8 · 참나무', A8],
];
const Z = Math.min(1, (window.innerWidth - 40) / 1920);

function App() {
  const [i, setI] = useState(1);
  const [bat, setBat] = useState(true);
  const Acts = PLANS[i][1];
  return (
    <div className="min-h-dvh bg-[#06080c] p-4 text-gray-200">
      <UiStyle />
      <style>{KEYFRAMES}</style>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {PLANS.map(([n], k) => (
          <button key={n} type="button" onClick={() => setI(k)}
            className={`mt-cut px-3 py-1.5 font-display text-[13px] font-bold ${k === i ? 'bg-emerald-400 text-[#05080f]' : 'bg-white/[0.07] text-gray-300'}`} style={{ '--c': '6px' }}>{n}</button>
        ))}
      </div>
      <div className="mb-3 flex items-center gap-2">
        <span className="font-display text-[12px] tracking-[0.14em] text-gray-500">회 바꿔 보기 —</span>
        {[['치는 회', true], ['막는 회', false]].map(([n, v]) => (
          <button key={n} type="button" onClick={() => setBat(v)}
            className={`mt-cut px-2.5 py-1 text-[12px] font-bold ${bat === v ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-gray-400'}`} style={{ '--c': '5px' }}>{n}</button>
        ))}
      </div>
      <div style={{ width: 1920 * Z, height: 911 * Z }}>
        <div className="relative select-none overflow-hidden bg-[#05080f] text-gray-200"
          style={{ width: 1920, height: 911, transform: `scale(${Z})`, transformOrigin: 'top left' }}>
          <Screen Acts={Acts} mineBat={bat} />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
