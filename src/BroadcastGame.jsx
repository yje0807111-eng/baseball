/*
 * 중계형 경기 화면: 공 하나 단위 엔진(pitchSim)을 그대로 보여 준다.
 * 위 가운데 점수 · 이닝별 전광판 / 좌우에 지금 던지는 투수 · 타석 타자 카드 /
 * 가운데 아래 작전 버튼과 실시간 해설 / 승부처에는 멈추고 지시를 받는다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UiStyle } from './myteam/ui.jsx';
import { statColor, teamNeon } from './myteam/teamColor.js';
import PlayView from './play/PlayView.jsx';
import {
  createGame, pitch, isClutch, stealOdds, pitchMix, batterOf, pitcherOf, offenseOf, defenseOf, RESULT_LABEL, PITCHES, replaceTeam, aiPitchingChange, DEFAULT_USAGE, dirName } from './engine/pitchSim.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const st = (p, k, d = 70) => p?.stats?.[k] ?? d;

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

const SPEEDS = [['AUTO', 3.5], ['1X', 1], ['2X', 2], ['3X', 3]];
const COUNT_MS = 620; // 공 하나 사이 (1X 기준)
const RESULT_MS = 1500; // 타석이 끝나는 공
const INPLAY_MS = 2300; // 맞아 나간 공 — 타구·수비·주자가 다 지나갈 시간
const beatOf = (ev) => (ev.call === 'inplay' ? INPLAY_MS : ev.result ? RESULT_MS : COUNT_MS);

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
const Diamond = ({ bases }) => (
  <svg viewBox="0 0 100 100" className="h-[92px] w-[92px]">
    <path d="M50 88 L86 52 L50 16 L14 52 Z" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
    {[[86, 52], [50, 16], [14, 52]].map(([x, y], i) => (
      <rect key={i} x={x - 8} y={y - 8} width="16" height="16" transform={`rotate(45 ${x} ${y})`}
        fill={bases[i] ? '#fde047' : 'rgba(255,255,255,.14)'} style={bases[i] ? { filter: 'drop-shadow(0 0 7px #fde047)' } : undefined} />
    ))}
    <rect x="45" y="83" width="10" height="10" transform="rotate(45 50 88)" fill="#fff" />
  </svg>
);
const Bso = ({ b, s, o }) => (
  <div className="grid grid-cols-[16px_repeat(3,14px)] items-center gap-1.5 font-display text-[13px] font-extrabold">
    <span className="text-emerald-400">B</span>
    {[0, 1, 2].map((i) => <i key={i} className={`h-3.5 w-3.5 rounded-full ${i < b ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/15'}`} />)}
    <span className="text-yellow-300">S</span>
    {[0, 1].map((i) => <i key={i} className={`h-3.5 w-3.5 rounded-full ${i < s ? 'bg-yellow-300 shadow-[0_0_8px_#fde047]' : 'bg-white/15'}`} />)}<span />
    <span className="text-red-400">O</span>
    {[0, 1].map((i) => <i key={i} className={`h-3.5 w-3.5 rounded-full ${i < o ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-white/15'}`} />)}<span />
  </div>
);
/** 능력치 줄 — 내 라커와 같은 규칙: 6px 막대 · 낮으면 푸른 회색 → 높을수록 구단 색, 빛 번짐 없음 */
const Stat = ({ k, v, c }) => (
  <div className="relative mt-2 grid grid-cols-[38px_1fr_30px] items-center gap-2 text-[12px] font-semibold text-gray-300">
    {k}<i className="block h-[6px] bg-white/[0.08]"><b className="block h-full" style={{ width: `${Math.min(100, v)}%`, background: statColor(v, c).bar }} /></i>
    <em className="text-right font-display text-[15px] font-extrabold not-italic" style={{ color: statColor(v, c).num }}>{v}</em>
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
  const scoreRef = useRef(null);
  const [scoreH, setScoreH] = useState(0); // 점수판이 덮는 높이 — 플레이 뷰는 그 아래만 쓴다
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

  // 점수판 높이를 재 둔다 (화면 크기에 따라 달라진다)
  useEffect(() => {
    const el = scoreRef.current;
    if (!el) return undefined;
    const read = () => setScoreH(el.offsetHeight);
    read();
    if (!window.ResizeObserver) return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // StrictMode 로 두 번 마운트돼도 살아 있게 (마운트마다 다시 켠다)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  // 경기 루프
  useEffect(() => {
    let stop = false;
    aliveRef.current = true;
    (async () => {
      await sleep(600);
      let half = { inning: g.inning, top: g.top, home: g.home.runs, away: g.away.runs };
      aug?.beforeHalf(g);
      while (!g.final && !stop && aliveRef.current) {
        while ((pausedRef.current || ordersRef.current || pickerRef.current) && !stop) await sleep(100);
        if (stop || g.final) break;
        // 승부처면 멈추고 지시를 받는다 (내 공격·수비 모두)
        if (isClutch(g) && g.balls === 0 && g.strikes === 0 && !g.clutchAsked) {
          g.clutchAsked = g.inning;
          const picked = await new Promise((resolve) => {
            ordersRef.current = resolve;
            setOrders({ offense: !g.top, resolve });
          });
          ordersRef.current = null;
          setOrders(null);
          pendingRef.current = { ...pendingRef.current, ...picked };
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
        let ev; try { ev = pitch(g, pendingRef.current); } catch (err) { console.error('pitch 실패', err); break; }
        pendingRef.current = pendingRef.current.guess ? { guess: pendingRef.current.guess } : {};
        if (!ev) break;
        setLines((l) => [...l, ...commentary(ev)].slice(-4));
        const beat = beatOf(ev) / speedRef.current;
        setPlay({ ev, ms: beat });
        if (ev.result && ['HR', '3B', '2B', 'K', 'DP'].includes(ev.result)) {
          // 큰 결과 자막은 플레이가 끝나 갈 때쯤 띄운다
          const wait = ev.call === 'inplay' ? beat * 0.66 : 0;
          setTimeout(() => { if (aliveRef.current) { setFlash({ text: ev.result === 'HR' ? 'HOME RUN!' : RESULT_LABEL[ev.result], key: Date.now() }); setTimeout(() => setFlash(null), 1400); } }, wait);
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
            setTimeout(() => setFlash(null), 1400);
            redraw();
            await sleep(900 / speedRef.current);
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
      }
      if (g.final && aliveRef.current) {
        redraw();
        setLines((l) => [...l, `경기 종료 — ${home.name} ${g.home.runs} : ${g.away.runs} ${away.name}`].slice(-4));
        await sleep(1200);
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
  const line = pitcherLine(g, pitcher);
  const steal0 = stealOdds(g, 0);
  const atBat = atBatPitches(g.events); // 이 타석에 지나간 공 (존 뷰 자취)

  const give = (o) => { pendingRef.current = { ...pendingRef.current, ...o }; redraw(); };
  const answer = (o) => { const r = ordersRef.current; ordersRef.current = null; setOrders(null); r?.(o); };

  const innCells = (side) => Array.from({ length: 12 }, (_, i) => (side.line[i] ?? (i + 1 < g.inning || (i + 1 === g.inning && (side === g.home ? !g.top : true)) ? 0 : null)));

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/broadcast-field.webp)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.92) 0,rgba(3,5,10,.25) 24%,rgba(3,5,10,.15) 76%,rgba(3,5,10,.92) 100%), linear-gradient(180deg,rgba(3,5,10,.92) 0,rgba(3,5,10,0) 26%,rgba(3,5,10,0) 56%,rgba(3,5,10,.92) 100%)' }} />

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
          <div className="mt-cut mt-glass ml-auto flex gap-1 p-1" style={{ '--c': '8px' }}>
            {SPEEDS.map(([label, v]) => (
              <button key={label} type="button" onClick={() => setSpeed(v)}
                className={`mt-cut px-3.5 py-1 font-display text-sm font-bold ${speed === v ? 'bg-[#10b981] text-[#05080f]' : 'text-gray-400 hover:text-white'}`} style={{ '--c': '5px' }}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={() => setPaused((p) => !p)} className="mt-btn sm">{paused ? '계속 ▶' : '일시정지'}</button>
        </header>

        {/* 점수 + 이닝별 — 중계 자막처럼 플레이 뷰 위에 뜬다 */}
        <div ref={scoreRef} className="relative z-10 col-start-2 row-start-2 self-start text-center">
          <div className="mt-cut mt-frame mt-glass relative inline-block px-8 pb-2 pt-2.5" style={{ '--c': '20px', '--a': '#fde047' }}>
            <div className="flex items-center justify-center gap-6">
              <span className="grid h-[62px] w-14 place-items-center font-display text-sm font-extrabold text-[#05080f]" style={{ background: cOpp, clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)' }}>AI</span>
              <span className="text-[26px] font-extrabold text-white">{away.name}<small className="block font-display text-[10px] tracking-[0.3em] text-gray-400">AWAY</small></span>
              <span className="font-display text-[64px] font-extrabold leading-none text-white [text-shadow:0_2px_18px_rgba(0,0,0,.85)]">{g.away.runs}<span className="mx-3.5 text-gray-600">-</span>{g.home.runs}</span>
              <span className="text-right text-[26px] font-extrabold text-white">{home.name}<small className="block font-display text-[10px] tracking-[0.3em] text-gray-400">HOME</small></span>
              <span className="grid h-[62px] w-14 place-items-center font-display text-sm font-extrabold text-[#05080f]" style={{ background: cMy, clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)' }}>MY</span>
            </div>
            <p className="m-0 mt-1 font-display text-[15px] font-extrabold tracking-[0.2em] text-yellow-300">{g.final ? '경기 종료' : `${g.inning}회${g.top ? '초' : '말'}`}</p>
          </div>
          <table className="mt-cut mt-glass mt-2.5 w-full border-collapse text-center font-display" style={{ '--c': '12px' }}>
            <thead><tr className="text-xs font-semibold text-gray-500"><th className="w-[200px] py-1 pl-4 text-left">TEAM</th>{Array.from({ length: 12 }, (_, i) => <th key={i} className="py-1">{i + 1}</th>)}<th>R</th><th>H</th><th>E</th></tr></thead>
            <tbody>
              {[[away, g.away, g.top], [home, g.home, !g.top]].map(([t, side, live]) => (
                <tr key={t.name} className="border-t border-white/[0.07]">
                  <td className="w-[200px] py-1 pl-4 text-left text-[15px] font-extrabold text-white">{t.name}</td>
                  {innCells(side).map((v, i) => (
                    <td key={i} className={`py-1 text-[22px] text-gray-300 ${live && i + 1 === g.inning ? 'bg-yellow-300/15 text-white' : ''}`}>{v ?? '-'}</td>
                  ))}
                  <td className="text-[22px] font-extrabold text-yellow-300">{side.runs}</td>
                  <td className="text-[22px] text-gray-300">{side.hits}</td>
                  <td className="text-[22px] text-gray-300">{side.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 왼쪽: 지금 던지는 투수 */}
        <div className="col-start-1 row-start-2">
          <PlayerCard side="P" label="NOW PITCHING" player={pitcher} color={pitchingColor} img="ui/clutch-mound.webp"
            stats={[['구위', st(pitcher, 'stuff', 80)], ['제구', st(pitcher, 'control', 75)], ['안정', st(pitcher, 'stability', 75)]]}
            rec={[[def.pitches, '투구수'], [line.k, '탈삼진'], [line.h, '피안타'], [line.r, '실점']]}
            bottom={(
              <div className="relative mt-3 grid grid-cols-[1fr_96px] items-center gap-3 bg-[#05080f]/60 p-2.5">
                <Bso b={g.balls} s={g.strikes} o={g.outs} />
                <Diamond bases={g.bases} />
              </div>
            )} />
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

        {/* 플레이 뷰 — 투구는 포수 뒤 존, 맞으면 위에서 본 필드. 점수판 아래로 깔린다 */}
        <div className="relative col-start-2 row-start-2 row-span-2 -mb-1 min-h-0" style={{ paddingTop: scoreH + 8 }}>
          <PlayView event={play?.ev || null} atBat={atBat} beatMs={play?.ms || 1200} paused={paused} bg={bg}
            bases={g.bases} offColor={battingColor} defColor={pitchingColor} />
        </div>

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
