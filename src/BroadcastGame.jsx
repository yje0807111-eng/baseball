/*
 * 중계형 경기 화면: 공 하나 단위 엔진(pitchSim)을 그대로 보여 준다.
 * 위 가운데 점수 · 이닝별 전광판 / 좌우에 지금 던지는 투수 · 타석 타자 카드 /
 * 가운데 아래 작전 버튼과 실시간 해설 / 승부처에는 멈추고 지시를 받는다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UiStyle } from './myteam/ui.jsx';
import InningRecap from './InningRecap.jsx';
import { statColor, statOf, teamNeon } from './myteam/teamColor.js';
import { teamFlag, flagByKey } from './myteam/teamArt.js';
import { myBanner } from './myteam/store.js';
import PlayView from './play/PlayView.jsx';
import {
  createGame, pitch, isClutch, stealOdds, pitchMix, batterOf, pitcherOf, offenseOf, defenseOf, RESULT_LABEL, PITCHES, replaceTeam, aiPitchingChange, DEFAULT_USAGE, dirName } from './engine/pitchSim.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const st = (p, k, d = 70) => p?.stats?.[k] ?? d;
/* 스코어보드 — 중계 자막처럼 짧게 부르고, 팀 줄에는 대진표와 같은 깃발을 깐다 */
const SB_W = 212;
const SB_MASK = 'linear-gradient(90deg,transparent 8%,#000 88%)';
const SB_SHORT = { kia: 'KIA', doosan: '두산', samsung: '삼성', hanwha: '한화', lg: 'LG', lotte: '롯데', nc: 'NC', kt: 'KT', hyundai: '현대', sk: 'SSG', kiwoom: '키움', korea: '한국', legend: '레전드' };
/** 전광판에 보일 회 — 9회까지, 연장에 들어가면 그만큼 늘린다 */
const innList = (g) => Array.from({ length: Math.max(9, Math.min(12, g.inning)) }, (_, i) => i + 1);
/** 그 회 점수 — 아직 치르지 않은 회는 null */
const innAt = (g, side, i) => side.line[i] ?? ((i + 1 < g.inning || (i + 1 === g.inning && (side === g.home ? !g.top : true))) ? 0 : null);
/** 내 팀은 앞의 '나의'를 떼고 네 글자까지, 상대는 구단 약칭 */
function shortTeam(name = '', mine = false) {
  if (mine) return name.replace(/^나의\s*/, '').slice(0, 4);
  const f = teamFlag(name);
  return (f && SB_SHORT[f.key]) || name.replace(/^\d{4}\s*/, '').split(' ')[0];
}

/** 지금 던지는 투수의 오늘 기록 */
function pitcherLine(g, pitcher) {
  let k = 0, h = 0, bb = 0, r = 0;
  for (const ev of g.events) {
    if (ev.pitcher !== pitcher || !ev.result) continue;
    if (ev.result === 'K') k += 1;
    if (['1B', '2B', '3B', 'HR', 'BH'].includes(ev.result)) h += 1;
    if (['BB', 'IBB'].includes(ev.result)) bb += 1;
    r += ev.runs || 0;
  }
  return { k, h, bb, r };
}

/**
 * 효과형 증강의 투수 운용(buildTeam usage 플래그)을 엔진 AI 감독 usage 로 옮긴다. 이닝 ≈ 투구 15개
 *  completeGame 완투 · extraInnings 선발 +n이닝 · aceMax 선발 상한 · noTired 지침 늦춤 · bullpenAce 가장 강한 불펜이 길게
 */
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
  return { name: team.name, batters, pitchers: pitchers.length ? pitchers : batters.slice(0, 1), catcher: roster.find((p) => p.position === 'C'), usage, closerId, buff: team.buff || 0, edge: team.edge || null };
}

/* 속도는 셋뿐이다 — 보통 · 자동(안 묻고 끝까지) · 스킵. 그 위에 "꾹 누르는 동안만" 빨리감기가 얹힌다 */
const PLAY = 1;
const AUTO = 3.5; // 자동 진행 — 지시를 묻지 않는다
const SKIP = 0; // 배속이 아니라 "남은 경기를 목표 시간 안에 끝내기" — skipSpeed 가 공마다 배속을 다시 잡는다
const HOLD = 5; // 화면을 꾹 누르거나 스페이스바를 누르고 있는 동안
const MODES = [['보통', PLAY], ['자동', AUTO], ['스킵', SKIP]];
const COUNT_MS = 400; // 공 하나 사이 — 볼카운트는 촤르륵 넘어간다
const RESULT_MS = 2000; // 타석이 끝나는 공 — 여기에 시간을 몰아준다
const BIG_MS = 2800; // 홈런 · 병살 · 삼진처럼 큰 결과
const BIG = ['HR', '3B', '2B', 'K', 'DP']; // 시간을 더 주는 결과
const RESIST_MS = 800; // 꾹 누르는 중에 승부처가 오면 잠깐 저항한다 (손을 떼면 만날 수 있게)
const SKIP_MS = 8500; // SKIP 을 누른 뒤 경기가 끝나기까지 — 종료 자막까지 더해 10초 안쪽
const MS_PER_OUT = 4500; // 1X 기준 아웃 하나에 드는 시간 — 남은 경기 길이를 어림잡는 데 쓴다

/**
 * SKIP 배속: 남은 아웃카운트로 남은 길이를 어림잡아 목표 시각(endAt)에 맞춘다.
 * 공마다 다시 재니 어림이 빗나가도 스스로 따라잡는다.
 * 남은 아웃은 9이닝이 아니라 **연장까지 간 가장 긴 경기**(maxInnings)로 잡는다 — 늘 일정보다 조금 앞서 달려서
 * 끝에서 굼떠지지 않고, 연장에 들어가도 목표 시간을 넘기지 않는다. 하한 3.5 는 AUTO — SKIP 이 AUTO 보다 느릴 일은 없다.
 */
function skipSpeed(g, endAt) {
  const outsDone = ((g.inning - 1) * 2 + (g.top ? 0 : 1)) * 3 + g.outs;
  const outsLeft = Math.max(1, g.maxInnings * 6 - outsDone);
  const left = Math.max(250, endAt - Date.now());
  return Math.min(400, Math.max(3.5, (outsLeft * MS_PER_OUT) / left));
}

/* ───────── 해설 문장 ───────── */
const FIELD_KO = { P: '투수', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', LF: '좌익수', CF: '중견수', RF: '우익수' };
function commentary(ev) {
  const b = ev.batter?.name || '타자';
  const p = ev.pitch ? `${PITCHES[ev.pitch.type].name} ${ev.pitch.velo}km` : '';
  const out = [];
  if (ev.steal) out.push(`${ev.steal.runner.name}, ${ev.steal.from + 2}루로 뜁니다 — ${ev.steal.ok ? '세이프! 도루 성공!' : '아웃! 잡혔습니다'}`);
  if (!ev.result) {
    const call = { ball: '볼', called: '스트라이크, 루킹입니다', swinging: '헛스윙!', foul: '파울' }[ev.call];
    if (call) out.push(`${p} — ${call}. ${ev.after.balls}볼 ${ev.after.strikes}스트라이크`);
    return out;
  }
  const r = ev.result;
  // 실제 타구가 간 곳을 그대로 부른다 (ev.hit)
  const dir = ev.hit ? dirName(ev.hit.dir) : null;
  const by = ev.hit?.by ? FIELD_KO[ev.hit.by] : null;
  if (r === 'HR') out.push(`${b}, 쳤습니다! ${dir ? `${dir}으로 ` : ''}크게 뻗습니다… 넘어갑니다! ${ev.runs}점 홈런!`);
  else if (r === '3B') out.push(`${b}, ${dir ? `${dir}을 ` : ''}완전히 가릅니다! 3루까지!`);
  else if (r === '2B') out.push(`${b}, ${dir ? `${dir} ` : ''}2루타!${ev.runs ? ` 주자 ${ev.runs}명 홈으로!` : ''}`);
  else if (r === '1B') out.push(`${b}, ${by ? `${by} 앞으로 빠지는 ` : '깨끗한 '}안타.${ev.runs ? ` ${ev.runs}점!` : ''}`);
  else if (r === 'BB') out.push(`${b}, 볼넷으로 걸어 나갑니다.${ev.runs ? ' 밀어내기 득점!' : ''}`);
  else if (r === 'IBB') out.push(`${b}, 고의사구. 1루가 채워집니다.`);
  else if (r === 'K') out.push(`${p} — 삼진! ${b}, 돌아섭니다.`);
  else if (r === 'DP') out.push(`${b}의 타구, 병살입니다! 이닝 종료 분위기`);
  else if (r === 'SF') out.push(`${b} 희생플라이. 3루 주자 여유 있게 득점!`);
  else if (r === 'SAC') out.push(`${b}, 번트를 댑니다. 주자 진루 성공`);
  else if (r === 'BH') out.push(`${b}, 기습 번트 안타!`);
  else if (r === 'E') out.push(`${b}의 평범한 타구… 수비 실책! 주자 살아 나갑니다`);
  else if (r === 'CS') out.push('도루 실패로 이닝이 끝납니다');
  else if (r === 'GO') out.push(`${b}, ${by ? `${by} 앞 ` : ''}땅볼 아웃.`);
  else if (r === 'FO') out.push(`${b}, ${by ? `${by} ` : ''}뜬공 아웃.`);
  else if (r === 'LO') out.push(`${b}, ${by ? `${by} 정면 ` : ''}직선타 아웃.`);
  else out.push(`${b}, ${RESULT_LABEL[r]}.`);
  return out;
}

/* ───────── 작은 부품 ───────── */
const Diamond = ({ bases, size = 68 }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    <path d="M50 88 L86 52 L50 16 L14 52 Z" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
    {[[86, 52], [50, 16], [14, 52]].map(([x, y], i) => (
      <rect key={i} x={x - 8} y={y - 8} width="16" height="16" transform={`rotate(45 ${x} ${y})`}
        fill={bases[i] ? '#fde047' : 'rgba(255,255,255,.14)'} style={bases[i] ? { filter: 'drop-shadow(0 0 7px #fde047)' } : undefined} />
    ))}
    <rect x="45" y="83" width="10" height="10" transform="rotate(45 50 88)" fill="#fff" />
  </svg>
);
/** 볼 · 스트라이크 · 아웃 세 줄. label 을 끄면 점만 남는다 (색으로 구분) */
const Bso = ({ b, s, o, label = true, dot = 11 }) => (
  <div className="grid items-center font-display text-[12px] font-extrabold"
    style={{ gridTemplateColumns: `${label ? 14 : 0}px repeat(3, ${dot}px)`, gap: 5 }}>
    {label ? <span className="text-emerald-400">B</span> : <span />}
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < b ? '#34d399' : 'rgba(255,255,255,.14)', boxShadow: i < b ? '0 0 7px #34d399' : 'none' }} />)}
    {label ? <span className="text-yellow-300">S</span> : <span />}
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < s ? '#fde047' : 'rgba(255,255,255,.14)', boxShadow: i < s ? '0 0 7px #fde047' : 'none' }} />)}<span />
    {label ? <span className="text-red-400">O</span> : <span />}
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < o ? '#ef4444' : 'rgba(255,255,255,.14)', boxShadow: i < o ? '0 0 7px #ef4444' : 'none' }} />)}<span />
  </div>
);
/** 능력치 줄 — 내 라커와 같은 규칙: 6px 막대 · 낮으면 푸른 회색 → 높을수록 구단 색, 빛 번짐 없음 */
const Stat = ({ k, v }) => (
  <div className="relative mt-2 grid grid-cols-[38px_1fr_30px] items-center gap-2 text-[12px] font-semibold text-gray-300">
    {k}<i className="block h-[6px] bg-white/[0.08]"><b className="block h-full" style={{ width: `${Math.min(100, v)}%`, background: statOf(k, v).bar }} /></i>
    <em className="text-right font-display text-[15px] font-extrabold not-italic" style={{ color: statOf(k, v).num }}>{v}</em>
  </div>
);

function PlayerCard({ side, label, player, color, img, stats, rec, bottom }) {
  const photo = player?.id ? `url(cards/${encodeURIComponent(player.id)}.webp), url(profiles/${encodeURIComponent(player.id)}.webp), url(${img})` : `url(${img})`;
  return (
    <section className="mt-cut mt-frame mt-glass relative mt-4 self-start overflow-hidden p-4"
      style={{ '--c': '20px', '--a': color, boxShadow: `0 26px 60px -22px rgba(0,0,0,.95)` }}>
      <p className="mt-lab mb-2.5" style={{ '--a': color }}>{label}</p>
      <div className="mt-cut pointer-events-none absolute right-3 top-3 h-[150px] w-[120px] bg-[#0b1220] bg-cover"
        style={{ '--c': '10px', backgroundImage: photo, backgroundPosition: '60% 18%', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 45%)', maskImage: 'linear-gradient(90deg,transparent,#000 45%)' }} />
      <div className="relative flex items-baseline gap-2">
        <b className="font-display text-[40px] font-extrabold leading-none" style={{ color, textShadow: `0 0 16px ${color}88` }}>{player?.overall ?? '-'}</b>
        <span className="mt-cut font-display text-[11px] font-extrabold tracking-wider text-[#05080f]" style={{ '--c': '5px', background: color, padding: '2px 8px' }}>{player?.position || side}</span>
      </div>
      <p className="relative mt-0.5 text-[22px] font-black text-white">{player?.name || '-'}</p>
      <p className="relative m-0 text-xs text-gray-400">{player?.year ? `${player.year} ${player.team || ''}` : ''}</p>
      {stats.map(([k, v]) => <Stat key={k} k={k} v={v} c={player ? teamNeon(player) : color} />)}
      {rec && (
        <div className="relative mt-3 grid grid-cols-4 gap-1.5 pt-1 text-center">
          {rec.map(([v, k]) => <div key={k} className="mt-cut bg-white/[0.045] py-1" style={{ '--c': '6px' }}><b className="block font-display text-[19px] font-extrabold text-white">{v}</b><span className="text-[10px] text-gray-400">{k}</span></div>)}
        </div>
      )}
      {bottom}
    </section>
  );
}

const panel = 'mt-cut mt-frame mt-glass p-3.5 px-4';
const cut = { clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' };

function TeamPanel({ team, side, color, pitcher, pitches, pitcherIdx = 0 }) {
  const bull = team.pitchers.slice(pitcherIdx + 1, pitcherIdx + 4);
  const stamina = Math.max(0, Math.min(100, 100 - (pitches / (70 + (st(pitcher, 'stability', 75) - 70) * 1.2)) * 100));
  return (
    <section className={`self-end ${panel}`} style={{ '--c': '16px', '--a': color, gridColumn: side, gridRow: '4 / span 2' }}>
      <p className="mt-lab mb-2" style={{ '--a': color }}>{team.name}</p>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 py-1 text-[13px]"><b className="text-white">투수 {pitcher?.name}</b><em className="font-display not-italic" style={{ color }}>{pitcher?.overall}</em></div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-1 text-[13px] text-gray-400">체력
        <i className="block h-1.5 bg-white/10"><b className="block h-full" style={{ width: `${stamina}%`, background: stamina > 40 ? color : '#f87171' }} /></i>
        <em className="font-display not-italic" style={{ color }}>{Math.round(stamina)}</em>
      </div>
      <p className="mt-lab mb-1 mt-2" style={{ '--a': color, fontSize: 10 }}>Bullpen</p>
      {bull.map((p) => (
        <div key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-2 py-0.5 text-[13px]">
          <b className="truncate text-white">{p.name} <span className="text-gray-500">{p.position}</span></b>
          <em className="font-display not-italic" style={{ color }}>{p.overall}</em>
        </div>
      ))}
    </section>
  );
}

/** 지금 타석에서 지나간 공들 — 뒤에서부터 앞 타석의 마지막 공을 만날 때까지 */
function atBatPitches(events) {
  const out = [];
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (out.length && e.result) break;
    if (e.pitch) out.unshift(e);
  }
  return out;
}

/* ───────── 본체 ───────── */
export default function BroadcastGame({ my, opp, onFinish, onExit, aug = null, rebuildMy = null, midPickInnings = [], onMidPick = null, bg = undefined }) {
  const home = useMemo(() => engineTeam(my), [my]);
  const away = useMemo(() => engineTeam(opp), [opp]);
  const gameRef = useRef(null);
  if (!gameRef.current) gameRef.current = createGame({ home, away });
  const g = gameRef.current;

  const [, force] = useState(0);
  const redraw = () => force((v) => v + 1);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [lines, setLines] = useState(['플레이볼!']);
  const [flash, setFlash] = useState(null); // 큰 결과 자막
  const [play, setPlay] = useState(null); // 지금 화면에서 재생 중인 공 { ev, ms }
  const [orders, setOrders] = useState(null); // 승부처 지시 대기
  const ordersRef = useRef(null);
  const pendingRef = useRef({}); // 다음 공에 실릴 지시
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  const [picker, setPicker] = useState(null); // 투수 고르기: 'order' 작전 버튼 · 'clutch' 승부처 지시
  const pickerRef = useRef(null);
  pickerRef.current = picker;
  const aliveRef = useRef(true);
  speedRef.current = speed;
  pausedRef.current = paused;
  const skipEndRef = useRef(0); // SKIP 을 누른 시각 + SKIP_MS — 이 시각에 맞춰 배속을 잡는다
  const holdRef = useRef(false); // 꾹 누르고 있는 중
  const [holding, setHolding] = useState(false);
  const resistRef = useRef(0); // 저항이 끝나는 시각 — 그때까지는 꾹 눌러도 느리게 간다
  const [recap, setRecap] = useState(null); // 이닝 정리 화면
  const recapRef = useRef(null);
  const planRef = useRef('balanced'); // 이번 이닝 기조
  const curSpeed = () => {
    if (speedRef.current === SKIP) return skipSpeed(g, skipEndRef.current);
    if (holdRef.current) return Date.now() < resistRef.current ? 1.5 : HOLD;
    return speedRef.current;
  };
  /** 지금 지시를 묻지 않는 상태인가 — 자동 · 스킵 · 꾹 누르는 중 */
  const quiet = () => speedRef.current !== PLAY || holdRef.current;
  const flashMs = () => (quiet() ? 300 : 1400); // 몰아서 넘길 땐 자막도 짧게
  /** 속도 고르기. SKIP 은 목표 시각을 새로 잡고, 지시를 기다리던 중이면 정면 승부로 넘긴다 */
  const pickSpeed = (v) => {
    if (v === SKIP) skipEndRef.current = Date.now() + SKIP_MS;
    if (v !== PLAY && ordersRef.current) { ordersRef.current({}); ordersRef.current = null; setOrders(null); }
    setSpeed(v);
  };
  /* 꾹 누르기 — 누르는 동안만 5배속 + 자동. 버튼 위에서는 안 잡고, 창을 벗어나면 반드시 풀린다 */
  const hold = (on) => {
    if (holdRef.current === on) return;
    holdRef.current = on;
    setHolding(on);
    if (on && ordersRef.current) { ordersRef.current({}); ordersRef.current = null; setOrders(null); }
  };
  useEffect(() => {
    const off = () => hold(false);
    const down = (e) => { if (e.code === 'Space' && !e.repeat && !recapRef.current) { e.preventDefault(); hold(true); } };
    const up = (e) => { if (e.code === 'Space') { e.preventDefault(); hold(false); } };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', off);
    document.addEventListener('visibilitychange', off);
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', off); document.removeEventListener('visibilitychange', off);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // StrictMode 로 두 번 마운트돼도 살아 있게 (마운트마다 다시 켠다)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  // 경기 루프
  useEffect(() => {
    let stop = false;
    aliveRef.current = true;
    (async () => {
      await sleep(600);
      let half = { inning: g.inning, top: g.top, home: g.home.runs, away: g.away.runs };
      let inningNo = g.inning; // 지금 진행 중인 이닝
      let evAt = 0; // 이 이닝이 시작된 시점의 events 인덱스
      aug?.beforeHalf(g);
      while (!g.final && !stop && aliveRef.current) {
        while ((pausedRef.current || ordersRef.current || pickerRef.current || recapRef.current) && !stop) await sleep(100);
        if (stop || g.final) break;
        // 승부처면 멈추고 지시를 받는다 (내 공격·수비 모두)
        if (isClutch(g) && g.balls === 0 && g.strikes === 0 && !g.clutchAsked) {
          g.clutchAsked = g.inning;
          // 꾹 누르는 중이면 잠깐 저항한다 — 손을 떼면 이 승부처를 만날 수 있게
          if (holdRef.current) { resistRef.current = Date.now() + RESIST_MS; setFlash({ text: '승부처', key: Date.now() }); setTimeout(() => setFlash(null), RESIST_MS); }
          if (!quiet()) { // 자동 · 스킵 · 꾹 누르는 중이면 멈춰 세우지 않고 정면 승부로 간다
            const picked = await new Promise((resolve) => {
              ordersRef.current = resolve;
              setOrders({ offense: !g.top, resolve });
            });
            ordersRef.current = null;
            setOrders(null);
            pendingRef.current = { ...pendingRef.current, ...picked };
          }
        }
        if (g.inning !== g.clutchAsked) g.clutchAsked = null;
        // 적 수비(내 공격) 중이면 AI 감독이 투수를 바꾼다
        if (!g.top) {
          const change = aiPitchingChange(g, g.away);
          if (change) {
            pendingRef.current = { ...pendingRef.current, changePitcher: change };
            const next = typeof change === 'string' ? g.away.team.pitchers.find((p) => p.id === change) : g.away.team.pitchers[g.away.pitcherIdx + 1];
            const text = next && `${away.name} 투수 교체 — ${g.away.pitcher?.name} → ${next.name}`; // 교체 전에 글을 만들어 둔다
            if (text) setLines((l) => [...l, text].slice(-4));
          }
        }
        // 이번 이닝 기조를 지시에 얹는다 — 공격적이면 뛰고, 지키기면 유인구를 섞는다
        if (planRef.current === 'aggressive' && !g.top && g.bases[0] && !g.bases[1]
            && pendingRef.current.steal == null && g.rng() < 0.3) pendingRef.current.steal = 0;
        if (planRef.current === 'protect' && g.top && pendingRef.current.zone == null && g.rng() < 0.4) pendingRef.current.zone = 'chase';
        let ev; try { ev = pitch(g, pendingRef.current); } catch (err) { console.error('pitch 실패', err); break; }
        pendingRef.current = pendingRef.current.guess ? { guess: pendingRef.current.guess } : {};
        if (!ev) break;
        setLines((l) => [...l, ...commentary(ev)].slice(-4));
        const beat = (ev.result ? (BIG.includes(ev.result) ? BIG_MS : RESULT_MS) : COUNT_MS) / curSpeed();
        setPlay({ ev, ms: beat }); // 플레이 뷰가 이 공을 그 시간 동안 재생한다
        if (ev.result && BIG.includes(ev.result)) {
          // 맞아 나간 공은 타구가 다 지나간 뒤에 자막을 띄운다
          const wait = ev.call === 'inplay' ? beat * 0.66 : 0;
          setTimeout(() => { if (aliveRef.current) { setFlash({ text: ev.result === 'HR' ? 'HOME RUN!' : RESULT_LABEL[ev.result], key: Date.now() }); setTimeout(() => setFlash(null), flashMs()); } }, wait);
        }
        redraw();
        await sleep(beat);

        // 반 이닝이 넘어갔으면: 증강의 이닝 점수 보정 → 경기 중 증강 선택 → 다음 반 이닝 보정
        if (aug && (g.inning !== half.inning || g.top !== half.top || g.final)) {
          const before = half.top ? half.away : half.home;
          const scored = (half.top ? g.away.runs : g.home.runs) - before;
          const res = aug.afterHalf(g, scored, half.inning, half.top);
          if (res.texts.length) {
            setLines((l) => [...l, ...res.texts.map((t) => `[증강: ${t.name}] ${t.text}`)].slice(-4));
            const t = res.texts[res.texts.length - 1];
            setFlash({ text: t.name, key: Date.now() });
            setTimeout(() => setFlash(null), flashMs());
            redraw();
            await sleep(900 / curSpeed());
          }
          if (g.final) g.winner = g.home.runs > g.away.runs ? 'home' : g.away.runs > g.home.runs ? 'away' : 'draw';
          // 새 이닝이 시작될 때 그 경기에서만 쓰는 증강을 하나 더
          if (!g.final && g.top && g.inning !== half.inning && midPickInnings.includes(g.inning) && onMidPick) {
            const picked = await onMidPick(g.inning);
            if (picked && aliveRef.current) {
              const nextMy = rebuildMy?.(picked);
              if (nextMy) replaceTeam(g.home, engineTeam(nextMy));
              aug.update(picked, nextMy);
              redraw();
            }
          }
          half = { inning: g.inning, top: g.top, home: g.home.runs, away: g.away.runs };
          aug.beforeHalf(g);
        }

        // 이닝 하나(초·말)가 다 끝났으면 정리 화면 — 조용히 넘기는 중이면 건너뛴다
        if (g.inning !== inningNo || g.final) {
          const evs = g.events.slice(evAt);
          const shown = inningNo;
          evAt = g.events.length;
          inningNo = g.inning;
          if (!quiet() || g.final) {
            const data = buildInningRecap(g, evs, shown);
            if (g.final) {
              const mineWon = g.home.runs > g.away.runs;
              data.final = {
                head: `${home.name} ${g.home.runs} : ${g.away.runs} ${away.name}`,
                text: mineWon ? '승리' : g.home.runs === g.away.runs ? '무승부' : '패배',
              };
            }
            const plan = await new Promise((resolve) => { recapRef.current = resolve; setRecap({ ...data, resolve }); });
            recapRef.current = null;
            setRecap(null);
            planRef.current = plan || 'balanced';
          }
        }
      }
      if (g.final && aliveRef.current) {
        redraw();
        setLines((l) => [...l, `경기 종료 — ${home.name} ${g.home.runs} : ${g.away.runs} ${away.name}`].slice(-4));
        await sleep(quiet() ? 300 : 700);
        onFinish?.(buildResult(g, my));
      }
    })();
    return () => { stop = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const off = offenseOf(g);
  const def = defenseOf(g);
  const batter = batterOf(g);
  const pitcher = pitcherOf(g);
  const myIsHome = true;
  const cMy = '#34d399';
  const cOpp = '#f87171';
  const battingColor = g.top ? cOpp : cMy;
  const pitchingColor = g.top ? cMy : cOpp;
  const mix = pitchMix(pitcher);
  const steal0 = stealOdds(g, 0);
  const atBat = atBatPitches(g.events); // 이 타석에 지나간 공 (존 뷰 자취)

  const give = (o) => { pendingRef.current = { ...pendingRef.current, ...o }; redraw(); };
  const answer = (o) => { const r = ordersRef.current; ordersRef.current = null; setOrders(null); r?.(o); };


  return (
    <div className="fixed inset-0 z-40 select-none overflow-hidden bg-[#05080f] text-gray-200"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { if (!e.target.closest('button') && !recap) hold(true); }}
      onPointerUp={() => hold(false)}
      onPointerCancel={() => hold(false)}
      onPointerLeave={() => hold(false)}
      onContextMenu={(e) => e.preventDefault()}>
      <UiStyle />
      {recap && <InningRecap {...recap} onPick={(k) => recap.resolve(k)} />}
      {/* 경기장 사진이 곧 배경이다 — 플레이는 화면 전체에서 벌어지고, UI 는 그 위에 얹힌다 */}
      <div className="absolute inset-0">
        <PlayView event={play?.ev || null} atBat={atBat} beatMs={play?.ms || 1200} paused={paused} bg={bg}
          bases={g.bases} offColor={battingColor} defColor={pitchingColor} />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.9) 0,rgba(3,5,10,.2) 22%,rgba(3,5,10,.12) 78%,rgba(3,5,10,.9) 100%), linear-gradient(180deg,rgba(3,5,10,.86) 0,rgba(3,5,10,0) 24%,rgba(3,5,10,0) 62%,rgba(3,5,10,.88) 100%)' }} />

      <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: '63px auto 1fr auto auto' }}>
        {/* 헤더 */}
        <header className="relative col-span-3 -mx-5 flex items-center gap-6 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
          <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#10b981] to-transparent" />
          <button type="button" onClick={onExit} aria-label="나가기"
            className="mt-cut grid h-9 w-9 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] hover:bg-white/10" style={{ '--c': '7px' }}>←</button>
          <div className="leading-none">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Manager Mode</p>
            <h1 className="mt-1 text-xl font-black leading-none text-white">감독 모드</h1>
          </div>
          <span className="mt-cut bg-red-500 px-2 py-0.5 font-display text-xs font-bold tracking-[0.2em] text-[#05080f]" style={{ '--c': '4px' }}><i className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#05080f] align-middle" />LIVE</span>
          {holding && (
            <span className="mt-cut ml-auto flex items-center gap-2 bg-[#fde047] px-3 py-1 font-display text-sm font-extrabold text-[#05080f]" style={{ '--c': '5px' }}>
              ▶▶ 빨리감기
            </span>
          )}
          <div className={`mt-cut mt-glass flex gap-1 p-1 ${holding ? '' : 'ml-auto'}`} style={{ '--c': '8px' }}>
            {MODES.map(([label, v]) => (
              <button key={label} type="button" onClick={() => pickSpeed(v)} aria-pressed={speed === v}
                title={v === SKIP ? '남은 경기를 10초 안에 몰아서 끝냅니다' : v === AUTO ? '지시를 묻지 않고 끝까지 진행합니다' : '보통 속도 — 화면을 꾹 누르면 빨리감기'}
                className={`mt-cut px-3.5 py-1 font-display text-sm font-bold ${speed === v ? (v === SKIP ? 'bg-[#fde047] text-[#05080f]' : 'bg-[#10b981] text-[#05080f]') : 'text-gray-400 hover:text-white'}`} style={{ '--c': '5px' }}>{label}</button>
            ))}
          </div>
          <span className="hidden font-display text-[11px] tracking-[.18em] text-gray-500 xl:block">화면을 꾹 누르면 빨리감기</span>
          <button type="button" onClick={() => setPaused((p) => !p)} className="mt-btn sm">{paused ? '계속 ▶' : '일시정지'}</button>
        </header>


        {/* 왼쪽 위: 중계 스코어보드 — 회 · 점수 카드 / 볼카운트 · 주자 · 투구 수 카드 */}
        <div className="relative z-10 col-start-1 row-start-2 self-start">
          <div className="flex flex-col gap-2" style={{ width: SB_W, filter: 'drop-shadow(0 12px 26px rgba(0,0,0,.6))' }}>
            <div className="mt-cut overflow-hidden" style={{ '--c': '9px', background: 'rgba(8,12,20,.92)', boxShadow: 'inset 0 0 0 1px rgba(253,224,71,.3)' }}>
              <div className="flex items-center justify-between bg-[#fde047]/[0.12] px-2.5 py-1">
                <b className="font-display text-[12px] font-extrabold text-yellow-300">
                  {g.final ? 'FINAL' : <>{g.inning}<i className="not-italic">{g.top ? '▲' : '▼'}</i></>}
                </b>
                <span className="font-display text-[10px] tracking-[0.22em] text-gray-500">SCORE</span>
              </div>
              {[[away, g.away, cOpp, false], [home, g.home, cMy, true]].map(([t, side, color, mine], i) => {
                const flag = mine ? flagByKey(myBanner()) : teamFlag(t.name);
                return (
                  <div key={t.name} className={`relative flex items-stretch ${i === 0 ? 'border-b border-white/[0.09]' : ''}`} style={{ height: 38 }}>
                    <span className="relative flex flex-1 items-center gap-2 overflow-hidden px-2.5">
                      {flag && <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${flag.src})`, opacity: 0.62, WebkitMaskImage: SB_MASK, maskImage: SB_MASK }} />}
                      <span className="relative block h-4 w-1 shrink-0" style={{ background: flag?.color || color }} />
                      <b className="relative truncate text-[15px] font-extrabold text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{shortTeam(t.name, mine)}</b>
                    </span>
                    <span className="grid w-12 shrink-0 place-items-center border-l border-white/[0.09] font-display text-[24px] font-extrabold"
                      style={{ background: mine ? 'rgba(253,224,71,.12)' : 'rgba(0,0,0,.3)', color: mine ? '#fde047' : '#fff' }}>{side.runs}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-cut overflow-hidden" style={{ '--c': '9px', background: 'rgba(8,12,20,.92)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>
              <div className="flex items-stretch">
                <span className="grid flex-1 place-items-center gap-1 py-1.5">
                  <small className="font-display text-[9.5px] tracking-[0.22em] text-gray-500">COUNT</small>
                  <Bso b={g.balls} s={g.strikes} o={g.outs} label={false} />
                </span>
                <span className="grid place-items-center border-l border-white/[0.09] px-1.5 py-1"><Diamond bases={g.bases} /></span>
                <span className="grid w-12 place-items-center border-l border-white/[0.09]">
                  <span className="text-center leading-tight">
                    <b className="block font-display text-[17px] font-extrabold text-white">{def.pitches}</b>
                    <small className="font-display text-[10px] tracking-[0.12em] text-gray-500">PITCH</small>
                  </span>
                </span>
              </div>
            </div>
            {/* 회차별 전광판 — 작게, 지금 이닝만 밝게 */}
            <div className="mt-cut overflow-hidden" style={{ '--c': '9px', background: 'rgba(8,12,20,.92)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>
              <table className="w-full border-collapse text-center font-display">
                <thead>
                  <tr className="text-[8.5px] font-semibold text-gray-600">
                    <th className="w-[34px] py-0.5" />
                    {innList(g).map((n) => <th key={n} className="py-0.5 font-normal">{n}</th>)}
                    <th className="w-[17px] py-0.5 text-yellow-300/70">R</th>
                  </tr>
                </thead>
                <tbody>
                  {[[away, g.away, false], [home, g.home, true]].map(([t, side, mine]) => (
                    <tr key={t.name} className="border-t border-white/[0.07]">
                      <td className="w-[34px] truncate py-0.5 pl-1.5 text-left text-[10px] font-extrabold text-gray-300">{shortTeam(t.name, mine)}</td>
                      {innList(g).map((n) => {
                        const v = innAt(g, side, n - 1);
                        const live = !g.final && n === g.inning && (mine ? !g.top : g.top);
                        return <td key={n} className={`py-0.5 text-[11px] ${live ? 'bg-yellow-300/15 text-white' : 'text-gray-400'}`}>{v ?? '·'}</td>;
                      })}
                      <td className="py-0.5 text-[11px] font-extrabold text-yellow-300">{side.runs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 오른쪽: 타석 */}
        <div className="col-start-3 row-start-2">
          <PlayerCard side="B" label="AT BAT" player={batter} color={battingColor} img="ui/clutch-bat.webp"
            stats={[['컨택', st(batter, 'contact')], ['파워', st(batter, 'power')], ['주력', st(batter, 'speed')]]}
            rec={[[off.hits, '팀 안타'], [off.runs, '팀 득점'], [`${off.idx % 9 + 1}번`, '타순'], [g.outs, '아웃']]}
            bottom={(
              <div className="relative mt-3 border-t border-white/10 pt-2.5">
                <p className="mt-lab mb-1.5" style={{ fontSize: 10 }}>Next Batter</p>
                {[1, 2].map((n) => {
                  const p = off.team.batters[(off.idx + n) % off.team.batters.length];
                  return (
                    <div key={n} className="grid grid-cols-[1fr_auto] items-center gap-2 py-0.5 text-[13px]">
                      <b className="truncate text-white"><span className="mr-2 font-display text-gray-500">{(off.idx + n) % 9 + 1}</span>{p?.name}</b>
                      <em className="font-display not-italic text-white">{p?.overall}</em>
                    </div>
                  );
                })}
              </div>
            )} />
        </div>

        {/* 결과 자막 */}
        {flash && (
          <div key={flash.key} className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 animate-[rise_.4s_ease-out_both] font-display text-[70px] font-black text-yellow-300 [text-shadow:0_0_40px_rgba(253,224,71,.8)]">{flash.text}</div>
        )}

        {/* 승부처 지시 */}
        {orders && !picker && (
          <div className="col-start-2 row-start-3 z-10 self-end pb-2.5">
            <p className="mt-lab mb-2.5 w-full justify-center" style={{ '--a': '#fde047' }}>Clutch · 지시를 내리세요</p>
            <div className="flex justify-center gap-3">
              {(orders.offense
                ? [['⚔', '정면 승부', '자동 진행', {}], ['🎯', '직구 노리기', '적중 시 유리', { guess: 'fast' }], ['🏃', '도루', `${Math.round(steal0 * 100)}%`, { steal: 0 }], ['🪃', '번트', '주자 진루', { bunt: true }]]
                : [['⚔', '정면 승부', '자동 진행', {}], ['🎯', '몸쪽 승부', '헛스윙 유도', { zone: 0 }], ['🧊', '유인구', '참으면 볼', { zone: 'chase' }], ['🔁', '투수 교체', '불펜에서 고르기', 'pick']]
              ).map(([ic, t, s, o]) => (
                <button key={t} type="button" onClick={() => (o === 'pick' ? setPicker('clutch') : answer(o))}
                  className="mt-cut mt-frame mt-glass w-[186px] p-3.5 text-left hover:brightness-125" style={{ '--c': '12px', '--a': '#fde047' }}>
                  <span className="text-2xl">{ic}</span>
                  <b className="mt-1 block text-lg text-white">{t}</b>
                  <small className="text-xs text-gray-400">{s}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 투수 교체: 아직 안 나온 투수 중에서 고르기 */}
        {picker && (
          <div className="col-start-2 row-start-3 z-20 self-end pb-2.5">
            <p className="mt-lab mb-2.5 w-full justify-center" style={{ '--a': cMy }}>Pitching Change · 현재 {g.home.pitcher?.name} {g.home.pitches}구</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {g.home.team.pitchers.slice(g.home.pitcherIdx + 1).map((p) => {
                const tired = p.condition != null && p.condition < 100;
                return (
                  <button key={p.id} type="button"
                    onClick={() => { const o = { changePitcher: p.id }; setPicker(null); if (picker === 'clutch') answer(o); else give(o); }}
                    className="mt-cut mt-frame mt-glass w-[176px] p-3 text-left hover:brightness-125" style={{ '--c': '12px', '--a': cMy }}>
                    <span className="flex items-baseline gap-1.5">
                      <em className="font-display text-xs font-bold not-italic" style={{ color: cMy }}>{p.slot && !String(p.slot).startsWith('BN') ? p.slot : p.position}</em>
                      <b className="font-display ml-auto text-xl text-white">{p.overall}</b>
                    </span>
                    <b className="mt-0.5 block truncate text-lg text-white">{p.name}</b>
                    <small className="block text-xs text-gray-400">구위 {st(p, 'stuff')} · 제구 {st(p, 'control')}</small>
                    {tired && <small className="block text-xs font-bold text-orange-400">컨디션 {p.condition}% · 휴식 {p.rest}</small>}
                  </button>
                );
              })}
              <button type="button" onClick={() => setPicker(null)}
                className="mt-cut mt-glass w-[110px] p-3 text-center text-sm text-gray-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,.2)] hover:brightness-125" style={{ '--c': '12px' }}>
                그대로<small className="mt-1 block text-xs text-gray-500">교체 안 함</small>
              </button>
            </div>
          </div>
        )}

        {/* 팀 패널 */}
        <TeamPanel team={away} side={1} color={cOpp} pitcher={g.away.pitcher} pitches={g.away.pitches} pitcherIdx={g.away.pitcherIdx} />
        <TeamPanel team={home} side={3} color={cMy} pitcher={g.home.pitcher} pitches={g.home.pitches} pitcherIdx={g.home.pitcherIdx} />

        {/* 작전 버튼 */}
        <div className="col-start-2 row-start-4 flex items-center justify-center gap-2.5">
          {[
            ['🏃', '도루', g.bases[0] && !g.top ? `${Math.round(steal0 * 100)}%` : '주자 없음', () => give({ steal: 0 }), !!(g.bases[0] && !g.top)],
            ['🪃', '번트', !g.top ? '주자 진루' : '내 공격 아님', () => give({ bunt: true }), !g.top],
            ['🎯', '직구 노리기', `${Math.round(mix.fast * 100)}%`, () => give({ guess: 'fast' }), !g.top],
            ['🌀', '변화구 노리기', `${Math.round((1 - mix.fast) * 100)}%`, () => give({ guess: 'slider' }), !g.top],
            ['🔁', '투수 교체', !g.top ? '내 수비 아님' : g.home.team.pitchers[g.home.pitcherIdx + 1] ? '불펜에서 고르기' : '남은 투수 없음', () => setPicker('order'), g.top && !!g.home.team.pitchers[g.home.pitcherIdx + 1]],
          ].map(([ic, t, s, fn, on]) => (
            <button key={t} type="button" disabled={!on} onClick={fn}
              className={`mt-cut flex min-w-[112px] flex-col items-center gap-0.5 px-3.5 py-2 text-[13px] ${on ? 'mt-frame mt-glass text-gray-100 hover:brightness-125' : 'bg-[#05080f]/60 text-gray-600'}`}
              style={{ '--c': '9px', '--a': '#10b981' }}>
              <b className="text-lg">{ic}</b>{t}<small className="font-display text-[11px] text-gray-500">{s}</small>
            </button>
          ))}
        </div>

        {/* 해설 */}
        <div className="mt-cut mt-frame mt-glass col-start-2 row-start-5 grid grid-cols-[48px_1fr] items-center gap-4 px-5 py-2.5" style={{ '--c': '16px', '--a': '#10b981' }}>
          <span className="mt-cut grid h-12 w-12 place-items-center bg-emerald-500/10 text-2xl" style={{ '--c': '8px' }}>🎙</span>
          <div>
            <p className="mt-lab mb-1.5">Play-by-Play</p>
            {lines.map((t, i) => (
              <p key={`${i}${t}`} className={`m-0 leading-snug ${i === lines.length - 1 ? 'text-base font-bold text-white' : 'text-sm text-gray-400'}`}>{t}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 엔진 경기를 기존 결과 화면(ResultPanel)이 쓰는 모양으로 바꾼다 */
/** 타점이 붙은 결과를 사람 말로 — "쓰리런 홈런" · "2타점 적시타" */
function actText(ev) {
  const r = ev.runs || 0;
  if (ev.result === 'HR') return r >= 4 ? '만루 홈런' : r === 3 ? '쓰리런 홈런' : r === 2 ? '투런 홈런' : '솔로 홈런';
  const label = RESULT_LABEL[ev.result] || ev.result;
  return r > 0 ? `${r}타점 ${label}` : label;
}

/**
 * 한 반이닝을 정리 카드 한 칸으로 — 득점 · 주인공 · 사건 목록.
 * 점수가 났으면 가장 크게 기여한 타자가, 안 났으면 막아낸 투수가 주인공이다.
 * mine=true 면 우리 공격(말)이라 타자가 우리 편 · 투수가 상대 편이다.
 */
function halfSummary(evs, top, mine) {
  const list = evs.filter((e) => e.top === top);
  const done = list.filter((e) => e.result);
  const runs = list.reduce((s, e) => s + (e.runs || 0), 0);
  const events = done.map((e) => ({
    name: e.batter?.name || '타자',
    text: actText(e),
    rt: e.runs ? `+${e.runs}` : '',
    hot: !!e.runs,
  })).slice(-5);

  let hero = null;
  if (runs > 0) {
    const PTS = { '1B': 2, '2B': 3, '3B': 4, HR: 6, BB: 1, IBB: 0, SF: 1, SAC: 1, BH: 2, E: 1 };
    const credit = new Map();
    for (const e of done) {
      if (!e.batter) continue;
      const pts = (PTS[e.result] || 0) + (e.runs || 0) * 3;
      if (pts <= 0) continue;
      const c = credit.get(e.batter.id) || { p: e.batter, pts: 0, best: null };
      c.pts += pts;
      if (!c.best || (e.runs || 0) >= (c.best.runs || 0)) c.best = e;
      credit.set(e.batter.id, c);
    }
    const top1 = [...credit.values()].sort((a, b) => b.pts - a.pts)[0];
    if (top1) {
      hero = {
        id: top1.p.id, name: top1.p.name, pos: `${top1.p.position} · ${top1.p.overall ?? ''}`.trim(),
        act: actText(top1.best), side: mine ? 'my' : 'opp',
        sub: `이 이닝 ${done.filter((e) => e.batter?.id === top1.p.id).length}타석`,
      };
    }
  } else {
    const pitcher = done.find((e) => e.pitcher)?.pitcher || list.find((e) => e.pitcher)?.pitcher;
    const ks = done.filter((e) => e.result === 'K').length;
    if (pitcher) {
      hero = {
        id: pitcher.id, name: pitcher.name, pos: `${pitcher.position} · ${pitcher.overall ?? ''}`.trim(),
        act: done.length <= 3 ? '삼자범퇴' : '무실점으로 막았다',
        sub: `${done.length}타자 · ${list.length}구${ks ? ` · 탈삼진 ${ks}` : ''}`,
        side: mine ? 'opp' : 'my', // 우리 공격인데 무득점이면 상대 투수가 주인공
      };
    }
  }
  return { runs, batters: done.length, events, hero };
}

/** 이닝 하나(초·말)를 정리 화면에 넘길 모양으로 */
export function buildInningRecap(g, evs, inning) {
  return {
    inning,
    mine: halfSummary(evs, false, true), // 말 = 우리 공격
    theirs: halfSummary(evs, true, false), // 초 = 상대 공격
    board: {
      home: Array.from({ length: 9 }, (_, i) => g.home.line[i] ?? null),
      away: Array.from({ length: 9 }, (_, i) => g.away.line[i] ?? null),
    },
    score: { home: g.home.runs, away: g.away.runs },
  };
}

export function buildResult(g, myTeam) {
  const board = {
    home: Array.from({ length: 9 }, (_, i) => g.home.line[i] ?? null),
    away: Array.from({ length: 9 }, (_, i) => g.away.line[i] ?? null),
  };
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
      text: `${ev.batter?.name} ${RESULT_LABEL[ev.result] || ''}`, hero: ev.batter, pitcher: ev.pitcher,
    });
  }
  const ranked = [...credit.values()].sort((a, b) => b.pts - a.pts);
  const fallback = (myTeam.roster || []).filter((p) => !p.isReplacement).sort((a, b) => b.overall - a.overall)[0];
  const mvp = ranked[0] || { player: fallback, pts: 0, runs: 0, zero: 0, fires: 0 };
  // 투수 피로 계산용: 내 팀(홈) 투수별 투구 수와 선발
  const myPitcherIds = new Set(g.home.team.pitchers.map((p) => p.id));
  const pitchCounts = {};
  for (const ev of g.events) if (ev.pitcher && myPitcherIds.has(ev.pitcher.id)) pitchCounts[ev.pitcher.id] = (pitchCounts[ev.pitcher.id] || 0) + 1;
  return {
    board,
    pitchCounts, starterId: g.home.team.pitchers[0]?.id || null,
    score: { my: g.home.runs, opp: g.away.runs },
    winner: g.winner === 'home' ? 'my' : g.winner === 'away' ? 'opp' : 'draw',
    logs, used: {}, mvpPlayer: mvp.player, mvp, credits: ranked,
  };
}
