/* 존 판 글자 8안 — 판 폭은 어떤 판정이 와도 고정, 지난 공은 가라앉고, 존 밖 공도 판 안에 담긴다.
   판정 버튼으로 '볼'(1자) 과 '인플레이'(4자) 를 바꿔 보며 폭이 흔들리지 않는지 본다. */
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

/* 이 타석에 지나간 공 — 존 반폭 · 반높이가 1. 마지막 공은 바깥으로 크게 빠진 것 */
const SHOTS = [
  { x: -0.35, y: -0.6, tone: '#34d399' },
  { x: 0.2, y: 0.15, tone: '#fde047' },
  { x: 1.48, y: 0.92, tone: '#fde047' },
];
const CALLS = [['볼', '#34d399'], ['스트라이크', '#fde047'], ['헛스윙', '#fde047'], ['인플레이', '#fff']];

/* ── 존 상자 — 존 밖으로 빠진 공도 담기도록 여유를 넓혔다 ────────── */
const CLAMP = 1.55;
const Zone = ({ w = 150, call }) => {
  const pad = 0.42;
  const V = 100;
  const box = V / (1 + pad * 2);
  const o = (V - box) / 2;
  const at = (x, y) => {
    const cx = Math.max(-CLAMP, Math.min(CLAMP, x)); const cy = Math.max(-CLAMP, Math.min(CLAMP, y));
    return [o + box / 2 + (cx * box) / 2, o + box / 2 + (cy * box) / 2];
  };
  const now = { ...SHOTS[SHOTS.length - 1], tone: call[1] };
  return (
    <svg width={w} height={w} viewBox={`0 0 ${V} ${V}`} className="shrink-0">
      <rect x={o} y={o} width={box} height={box} fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" />
      {[1, 2].map((i) => (
        <g key={i} stroke="rgba(255,255,255,.2)" strokeWidth="1">
          <line x1={o + (box / 3) * i} y1={o} x2={o + (box / 3) * i} y2={o + box} />
          <line x1={o} y1={o + (box / 3) * i} x2={o + box} y2={o + (box / 3) * i} />
        </g>
      ))}
      {/* 지난 공 — 테두리만 남기고 가라앉힌다 */}
      {SHOTS.slice(0, -1).map((p, i) => {
        const [cx, cy] = at(p.x, p.y);
        return (
          <g key={i} opacity="0.4">
            <circle cx={cx} cy={cy} r="6" fill="rgba(5,8,15,.4)" stroke="rgba(255,255,255,.55)" strokeWidth="1.3" />
            <text x={cx} y={cy + 2.6} textAnchor="middle" fontSize="7" fontWeight="700" fill="rgba(255,255,255,.7)">{i + 1}</text>
          </g>
        );
      })}
      {(() => {
        const [cx, cy] = at(now.x, now.y);
        return <g><circle cx={cx} cy={cy} r="12" fill={`${now.tone}2e`} /><circle cx={cx} cy={cy} r="7" fill="#fff" stroke={now.tone} strokeWidth="2.4" /></g>;
      })()}
    </svg>
  );
};

const glass = (extra = {}) => ({
  clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',
  background: 'rgba(8,12,20,.62)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)', backdropFilter: 'blur(3px)', ...extra,
});
const Badge = ({ call, size = 12 }) => (
  <span className="mt-cut inline-block text-center font-extrabold text-[#05080f]" style={{ '--c': '4px', background: call[1], fontSize: size, padding: '2px 7px' }}>{call[0]}</span>
);

/* ── 여덟 가지 — 글자 칸 폭은 모두 고정 ───────────────────────── */
const T1 = ({ call }) => ( /* 1 · 오른쪽 세로 — 판정 · 구종 · 구속 · 코스 */
  <div className="absolute bottom-3 right-3 flex items-stretch gap-2.5 p-2.5" style={glass()}>
    <Zone w={150} call={call} />
    <div className="flex w-[92px] shrink-0 flex-col justify-center gap-1">
      <span><Badge call={call} /></span>
      <b className="text-[13px] font-bold text-white">체인지업</b>
      <em className="font-display text-[24px] font-extrabold leading-none not-italic" style={{ color: call[1] }}>127<span className="ml-0.5 text-[11px] text-white/60">km</span></em>
      <span className="text-[11px] font-semibold text-gray-400">바깥쪽 낮게</span>
    </div>
  </div>
);

const T2 = ({ call }) => ( /* 2 · 아래 한 줄 */
  <div className="absolute bottom-3 right-3 flex w-[210px] flex-col gap-2 p-2.5" style={glass()}>
    <Zone w={190} call={call} />
    <div className="flex items-center gap-2">
      <Badge call={call} />
      <b className="text-[13px] font-bold text-white">체인지업</b>
      <em className="ml-auto font-display text-[20px] font-extrabold leading-none not-italic" style={{ color: call[1] }}>127</em>
      <span className="text-[11px] font-semibold text-gray-500">km</span>
    </div>
  </div>
);

const T3 = ({ call }) => ( /* 3 · 판정은 존 위 띠, 오른쪽은 구종 · 구속 */
  <div className="absolute bottom-3 right-3 p-2.5" style={glass()}>
    <div className="mb-2 flex items-center justify-between gap-2" style={{ width: 150 + 10 + 92 }}>
      <Badge call={call} size={13} />
      <span className="text-[11px] font-semibold text-gray-400">바깥쪽 낮게</span>
    </div>
    <div className="flex items-stretch gap-2.5">
      <Zone w={150} call={call} />
      <div className="flex w-[92px] shrink-0 flex-col justify-center">
        <b className="text-[13px] font-bold text-white">체인지업</b>
        <em className="font-display text-[30px] font-extrabold leading-none not-italic" style={{ color: call[1] }}>127</em>
        <span className="font-display text-[11px] text-white/60">km/h</span>
      </div>
    </div>
  </div>
);

const T4 = ({ call }) => ( /* 4 · 구속이 주역 */
  <div className="absolute bottom-3 right-3 flex items-stretch gap-2.5 p-2.5" style={glass()}>
    <Zone w={150} call={call} />
    <div className="flex w-[92px] shrink-0 flex-col items-start justify-center">
      <em className="font-display text-[40px] font-extrabold leading-[0.85] not-italic text-white">127</em>
      <span className="font-display text-[11px] tracking-wide text-white/55">km/h · 체인지업</span>
      <span className="mt-1.5"><Badge call={call} size={13} /></span>
    </div>
  </div>
);

const T5 = ({ call }) => ( /* 5 · 글자가 왼쪽, 존이 오른쪽 */
  <div className="absolute bottom-3 right-3 flex items-stretch gap-2.5 p-2.5" style={glass()}>
    <div className="flex w-[92px] shrink-0 flex-col justify-center gap-1 text-right">
      <span><Badge call={call} /></span>
      <b className="text-[13px] font-bold text-white">체인지업</b>
      <em className="font-display text-[24px] font-extrabold leading-none not-italic" style={{ color: call[1] }}>127</em>
      <span className="text-[11px] font-semibold text-gray-400">바깥쪽 낮게</span>
    </div>
    <Zone w={150} call={call} />
  </div>
);

const T6 = ({ call }) => ( /* 6 · 판정 배지를 존 안 위쪽에 얹는다 */
  <div className="absolute bottom-3 right-3 flex items-stretch gap-2.5 p-2.5" style={glass()}>
    <div className="relative shrink-0">
      <Zone w={150} call={call} />
      <span className="absolute left-1/2 top-1 -translate-x-1/2"><Badge call={call} size={12} /></span>
    </div>
    <div className="flex w-[92px] shrink-0 flex-col justify-center">
      <b className="text-[13px] font-bold text-white">체인지업</b>
      <em className="font-display text-[30px] font-extrabold leading-none not-italic" style={{ color: call[1] }}>127</em>
      <span className="font-display text-[11px] text-white/60">km/h</span>
      <span className="mt-1.5 text-[11px] font-semibold text-gray-400">바깥쪽 낮게</span>
    </div>
  </div>
);

const T7 = ({ call }) => ( /* 7 · 넉 칸 표 */
  <div className="absolute bottom-3 right-3 flex items-stretch gap-2.5 p-2.5" style={glass()}>
    <Zone w={150} call={call} />
    <div className="grid w-[104px] shrink-0 grid-cols-2 gap-1 self-center">
      {[['구종', '체인지업'], ['구속', '127'], ['코스', '바깥 낮'], ['판정', call[0]]].map(([k, v], i) => (
        <div key={k} className="mt-cut min-w-0 bg-white/[0.05] px-1.5 py-1" style={{ '--c': '5px' }}>
          <dt className="text-[10px] font-semibold text-gray-500">{k}</dt>
          <dd className="truncate text-[12px] font-bold" style={{ color: i === 3 ? call[1] : '#e5e7eb' }}>{v}</dd>
        </div>
      ))}
    </div>
  </div>
);

const T8 = ({ call }) => ( /* 8 · 판정만 크게, 나머지는 한 줄 */
  <div className="absolute bottom-3 right-3 flex items-stretch gap-2.5 p-2.5" style={glass()}>
    <Zone w={150} call={call} />
    <div className="flex w-[92px] shrink-0 flex-col justify-center">
      <b className="text-[20px] font-black leading-tight" style={{ color: call[1] }}>{call[0]}</b>
      <span className="mt-1 text-[12px] font-semibold text-gray-300">체인지업 127</span>
      <span className="text-[11px] font-semibold text-gray-500">바깥쪽 낮게</span>
    </div>
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

function Screen({ Panel, call }) {
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
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-3.5 px-3.5 py-3" style={glass()}>
              <Diamond bases={BASES} size={76} off="rgba(255,255,255,.45)" />
              <span className="h-[62px] w-px bg-white/15" />
              <Bso b={2} s={1} o={1} dot={15} font={15} gap={6} rowGap={5} off="rgba(255,255,255,.45)" lab="text-white/85" />
            </div>
            <Panel call={call} />
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
              <p className="m-0 text-[14px] font-bold leading-snug text-white">체인지업 127km — 바깥쪽 낮게.</p>
              <p className="m-0 text-[12.5px] font-medium leading-snug text-gray-400">직구 145km — 스트라이크. 1볼 1스트라이크</p>
              <p className="m-0 text-[12.5px] font-medium leading-snug text-gray-400">슬라이더 131km — 볼. 1볼 0스트라이크</p>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}

const PLANS = [
  ['1 · 오른쪽 세로 ★', T1], ['2 · 존 아래 한 줄', T2], ['3 · 판정은 위 띠', T3], ['4 · 구속이 주역', T4],
  ['5 · 글자가 왼쪽', T5], ['6 · 배지를 존 안에', T6], ['7 · 넉 칸 표', T7], ['8 · 판정만 크게', T8],
];
const Z = Math.min(1, (window.innerWidth - 40) / 1920);

function App() {
  const [i, setI] = useState(0);
  const [c, setC] = useState(0);
  const Panel = PLANS[i][1];
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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-display text-[12px] tracking-[0.14em] text-gray-500">판정 바꿔 보기 —</span>
        {CALLS.map(([n], k) => (
          <button key={n} type="button" onClick={() => setC(k)}
            className={`mt-cut px-2.5 py-1 text-[12px] font-bold ${k === c ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-gray-400'}`} style={{ '--c': '5px' }}>{n}</button>
        ))}
      </div>
      <div style={{ width: 1920 * Z, height: 911 * Z }}>
        <div className="relative select-none overflow-hidden bg-[#05080f] text-gray-200"
          style={{ width: 1920, height: 911, transform: `scale(${Z})`, transformOrigin: 'top left' }}>
          <Screen Panel={Panel} call={CALLS[c]} />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
