/*
 * 선택 경기 화면(mockups/choice-game 3안 '대결 무대') — 옛 중계(BroadcastGame)와 같은 자리 · 같은 props · 같은 결과(buildResult).
 * 흐름: 진행(이닝 점수판 + 지나간 일 한 줄씩, 타석마다 PA_MS) → 결정(두 선수 카드가 마주 보고 아래 2×2 카드, 15초)
 *   → 구종 · 코스가 필요한 작전이면 그 자리에서 펼침(+10초) → 그 타석을 계획대로 한 번에 → 결과 카드(RESULT_MS, 누르면 넘김) → 다시 진행.
 * 시간이 다 되면 정비 작전. 창이 가려지면 시간도 멈춘다. 판단(멈출 자리 · 카드 · 타석 계획)은 play/choice.js.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UiStyle, GlassBg, Pop, Portrait } from '../myteam/ui.jsx';
import MatchIntro from '../MatchIntro.jsx';
import { teamFlag, flagByKey } from '../myteam/teamArt.js';
import { myBanner } from '../myteam/store.js';
import { artId } from '../data/artAlias.js';
import { winProb as stateWin, simWinProb, withPrior } from '../engine/winProb.js';
import { tacticOrders } from '../engine/tactics.js';
import { seeded } from '../engine/rng.js';
import { DEFAULT_SIDES, planOfSides, sideOpt } from '../myteam/strategy.js';
import {
  createGame, pitch, weatherOf, batterOf, pitcherOf, offenseOf, defenseOf, staminaOf, replaceTeam, aiPitchingChange, playOut, RESULT_LABEL, PITCHES, hitChanceAt, penCallsLeft, PEN_CALLS,
} from '../engine/pitchSim.js';
import { engineTeam, buildResult, Scoreboard, shortTeam } from '../BroadcastGame.jsx';
import { situationOf, zoneKo, locOf, batSide } from './DuelPanel.jsx';
import { wantsChoice, choiceCards, planOrder, pitchesFor, CHOICES, CHOICE_MS, DETAIL_MS } from './choice.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MY = '#34d399', OPP = '#f87171', GOLD = '#fbbf24', SKY = '#38bdf8';
const TONE = { good: MY, bad: OPP, info: '#94a3b8' };
/* 진행 박자 — 타석 하나 0.15초, 점수 · 홈런 · 교체 같은 줄은 0.5초 머문다(눈에 걸리게). 결과 카드 2.2초(누르면 넘김) */
const PA_MS = 150, NOTE_MS = 500, RESULT_MS = 2200;
const face = (p) => `url(cards/${encodeURIComponent(artId(p?.id || ''))}.webp), url(profiles/${encodeURIComponent(artId(p?.id || ''))}.webp), url(ui/mt/silhouette-player.webp)`;
const HIT = new Set(['1B', '2B', '3B', 'HR', 'BH']);

/** 시간 막대 — 창이 가려진 동안은 줄지 않는다. 다 되면 onEnd 한 번 */
function Timer({ ms, onEnd, w = 320, extra = false, k }) {
  const [left, setLeft] = useState(ms);
  const done = useRef(false);
  useEffect(() => {
    done.current = false; setLeft(ms);
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now(), dt = now - last; last = now;
      if (document.hidden) return;
      setLeft((v) => {
        const n = Math.max(0, v - dt);
        if (n === 0 && !done.current) { done.current = true; setTimeout(onEnd, 0); }
        return n;
      });
    }, 100);
    return () => clearInterval(id);
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const low = left < 5000;
  return (
    <span className="flex items-center gap-3">
      <span className="relative h-2.5 overflow-hidden rounded-full bg-white/10" style={{ width: w }}>
        <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${(left / ms) * 100}%`, background: low ? OPP : GOLD, boxShadow: `0 0 12px ${low ? OPP : GOLD}`, transition: 'width .1s linear' }} />
      </span>
      <b className="w-10 font-display text-t2 tabular-nums" style={{ color: low ? OPP : '#fde68a' }}>{(left / 1000).toFixed(1)}</b>
      {extra && <b className="rounded-full bg-sky-400/15 px-2 py-0.5 font-display text-t3 text-sky-300">+10</b>}
    </span>
  );
}
const Chip = ({ t, c }) => <span className="rounded-full px-2.5 py-0.5 text-t4 font-bold" style={{ color: c, background: `${c}1f`, boxShadow: `inset 0 0 0 1px ${c}55` }}>{t}</span>;

/** 선택 카드 — 이름 · 큰 숫자 · 이유 칩 · 대가(빨강). 정비 작전엔 '시간 끝' */
function Card({ c, i, on, dim, onPick }) {
  return (
    <button type="button" onClick={onPick} disabled={dim}
      className="relative flex flex-col gap-3 rounded-[20px] p-5 text-left transition"
      style={{ background: on ? 'linear-gradient(180deg,rgba(251,191,36,.16),rgba(251,191,36,.04))' : 'rgba(10,14,24,.8)', backdropFilter: 'blur(14px)',
        boxShadow: on ? `inset 0 0 0 2px ${GOLD}, 0 18px 40px -16px rgba(251,191,36,.6)` : 'inset 0 0 0 1px rgba(255,255,255,.1), 0 14px 34px -18px rgba(0,0,0,.9)', opacity: dim ? 0.35 : 1 }}>
      <span className="flex items-center gap-3">
        <b className="font-display text-t3 text-gray-500">{i + 1}</b>
        {c.who && <Portrait player={c.who} w={40} h={40} round t={c.arm ? MY : MY} />}
        <span className="min-w-0">
          <b className="block truncate text-t2 font-black text-white">{c.ko}</b>
          <small className="block truncate text-t4 text-gray-400">{c.sub}</small>
        </span>
        {c.plan && <small className="rounded-full bg-white/[0.06] px-2 py-0.5 text-t4 text-gray-400">시간 끝</small>}
        {c.odds && <span className="ml-auto shrink-0 text-right"><small className="block text-t4 text-gray-400">{c.odds[0]}</small><b className="font-display text-t1 leading-none" style={{ color: '#fde68a' }}>{c.odds[1]}</b></span>}
      </span>
      {(c.chips.length > 0 || c.cost) && (
        <span className="flex flex-wrap gap-1.5">
          {c.chips.map(([t, tone]) => <Chip key={t} t={t} c={TONE[tone] || TONE.info} />)}
          {c.cost && <Chip t={c.cost} c={OPP} />}
        </span>
      )}
    </button>
  );
}

/** 펼침 — 구종 예측 · 노림 코스(공격) / 결정구 · 코스(수비). 칸 색 = 상대 투수가 던지는 곳(공격) · 맞을 확률(수비) */
function Detail({ g, card, pick, setPick, onGo, timer }) {
  const bat = card.detail === 'bat', list = pitchesFor(g);
  const heat = bat ? locOf(g) : Array.from({ length: 9 }, (_, z) => hitChanceAt(g, z));
  const lo = Math.min(...heat), hi = Math.max(...heat);
  /* 몸쪽이 타자 쪽 — 공격 판(포수 뒤)은 좌타면 오른쪽, 수비 판(중견수 쪽)은 우타면 오른쪽(DuelPanel 과 같은 규칙) */
  const right = batSide(batterOf(g), pitcherOf(g)) === 'R';
  const flip = bat ? !right : right;
  const cells = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => r * 3 + (flip ? 2 - c : c)));
  return (
    <div className="flex w-[560px] flex-col gap-4 rounded-[22px] p-5 fx-rise" style={{ background: 'rgba(8,12,22,.9)', backdropFilter: 'blur(16px)', boxShadow: `inset 0 0 0 1.5px ${SKY}88, 0 20px 50px -18px rgba(56,189,248,.5)` }}>
      <div className="flex items-center gap-3"><b className="text-t2 text-white">{bat ? '구종 예측 · 노림 코스' : '결정구 · 코스'}</b><span className="ml-auto">{timer}</span></div>
      <div className="flex gap-2">
        {[...list, ...(bat ? [{ t: null, ko: '예측 안 함', pct: null }] : [])].slice(0, 5).map((p) => {
          const on = pick.t === p.t;
          return (
            <button key={p.t || 'none'} type="button" onClick={() => setPick({ ...pick, t: p.t })} className="flex flex-1 flex-col items-center rounded-xl py-2"
              style={{ background: on ? 'rgba(251,191,36,.14)' : 'rgba(255,255,255,.05)', boxShadow: on ? `inset 0 0 0 2px ${GOLD}` : 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
              <b className="text-t3" style={{ color: on ? '#fde68a' : '#e2e8f0' }}>{p.ko}</b>{p.pct != null && <small className="font-display text-t4 text-gray-400">{p.pct}%</small>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-5">
        <div className="grid grid-cols-3 gap-1.5 rounded-xl p-1.5" style={{ width: 252, background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.55)' }}>
          {cells.map((z) => {
            const on = pick.zone === z, t = hi > lo ? (heat[z] - lo) / (hi - lo) : 0.5;
            return (
              <button key={z} type="button" onClick={() => setPick({ ...pick, zone: on ? null : z })} className="grid h-[76px] place-items-center rounded-lg text-t4 font-bold text-gray-200"
                style={{ background: on ? 'rgba(251,191,36,.25)' : `rgba(249,115,22,${(0.06 + t * 0.4).toFixed(2)})`, boxShadow: on ? `inset 0 0 0 2.5px ${GOLD}` : 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>{zoneKo(z)}</button>
            );
          })}
        </div>
        <div className="flex flex-1 flex-col gap-2 text-t3 text-gray-300">
          <span className="flex justify-between"><span>{bat ? '노림' : '결정구'}</span><b className="text-white">{pick.t ? PITCHES[pick.t].name : '없음'}</b></span>
          <span className="flex justify-between"><span>코스</span><b className="text-white">{pick.zone != null ? zoneKo(pick.zone) : '없음'}</b></span>
          <span className="flex justify-between"><span>2스트라이크</span><b className="text-white">{bat ? (card.k === 'sellout' ? '그대로' : '맞히기') : '결정구'}</b></span>
          <button type="button" className="mt-btn pri mt-2" style={{ '--a': GOLD }} onClick={onGo}>이 작전으로</button>
        </div>
      </div>
    </div>
  );
}

export default function ChoiceGame({ my, opp, onFinish, onExit, fatigue = {}, aug = null, rebuildMy = null, rebuildOpp = null, midPickInnings = [], onMidPick = null, seed = null, autoOnExit = false, intro = null }) {
  const home = useMemo(() => engineTeam(my), [my]);
  const away = useMemo(() => engineTeam(opp), [opp]);
  const gameRef = useRef(null);
  if (!gameRef.current) {
    const rng = seed != null ? seeded(seed) : Math.random;
    gameRef.current = createGame({ home, away, rng, weather: weatherOf(seed != null ? seeded(seed + 17) : Math.random) });
  }
  const g = gameRef.current;
  const [, force] = useState(0);
  const redraw = () => force((v) => v + 1);
  const sides = my?.plan?.sides || DEFAULT_SIDES;
  const fine = planOfSides(sides).fine;
  const tac = (gg) => tacticOrders(fine, !gg.top, gg.rng);
  const prior = useMemo(() => simWinProb(home, away), [home, away]);
  const winProb = (gg) => withPrior(stateWin(gg), gg, prior);
  const wpRef = useRef([prior]);
  const wpAtRef = useRef([{ i: 1, t: true, r: 0 }]);
  const gainRef = useRef(0);
  const callsRef = useRef([]);

  const [introOn, setIntroOn] = useState(!!intro);
  const introDone = useRef(!intro);
  const introWait = useRef(null);
  const introTeam = (t, mine) => {
    const f = (mine ? flagByKey(myBanner()) : teamFlag(t.name)) || null;
    const all = [...(t.batters || []), t.pitchers?.[0]].filter(Boolean);
    return { name: t.name, color: f?.color || (mine ? '#10b981' : '#94a3b8'), ovr: all.length ? Math.round(all.reduce((n, p) => n + (p.overall || 0), 0) / all.length) : '-', starter: t.pitchers?.[0]?.name || null };
  };

  /* 화면 단계 — run: 진행 · choice: 카드 · detail: 펼침 · result: 결과 카드 */
  const [phase, setPhase] = useState('run');
  const [cards, setCards] = useState([]);
  const [picked, setPicked] = useState(null); // 펼친 카드
  const [pick, setPick] = useState({ t: null, zone: null });
  const [result, setResult] = useState(null);
  const [feed, setFeed] = useState([]);
  const [asked, setAsked] = useState(0);
  const waitRef = useRef(null); // 고르기를 기다리는 약속
  const resultWait = useRef(null);
  const aliveRef = useRef(true);
  const endedRef = useRef(false);
  const note = (inn, text, tone = '#e2e8f0') => setFeed((f) => [...f, { id: `${Date.now()}${Math.random()}`, inn, text, tone }].slice(-6));
  const halfKo = (gg) => `${gg.inning}회${gg.top ? '초' : '말'}`;

  const handOver = () => {
    if (endedRef.current) return false;
    endedRef.current = true;
    onFinish?.(buildResult(g, my, { flow: wpRef.current, flowAt: wpAtRef.current, calls: callsRef.current, gain: gainRef.current, sides }));
    return true;
  };
  const autoFinish = () => {
    aliveRef.current = false;
    waitRef.current?.(null); resultWait.current?.();
    playOut(g, tac);
    redraw(); handOver();
  };
  const [leaving, setLeaving] = useState(false);
  const leave = () => {
    if (g.final) { if (!handOver()) onExit?.(); return; }
    if (autoOnExit) { setLeaving(true); return; }
    onExit?.();
  };

  /* 고르기 — 카드(정비 작전이면 바로) · 펼침이 필요하면 펼친 뒤 '이 작전으로'. 시간이 다 되면 정비 작전 */
  const choose = (c) => {
    if (phase !== 'choice') return;
    if (!c.detail) { const done = waitRef.current; waitRef.current = null; done?.({ card: c }); return; }
    setPicked(c); setPick({ t: null, zone: null }); setPhase('detail');
  };
  const confirm = () => { const done = waitRef.current; waitRef.current = null; done?.({ card: picked, detail: pick }); };
  /* 시간 막대는 처음 그린 때의 함수를 부른다 — 그때가 아니라 끝난 때의 값을 보도록 ref 로 */
  const now = useRef({}); now.current = { phase, picked, pick };
  const timeout = () => { const done = waitRef.current; waitRef.current = null; const n = now.current; done?.(n.phase === 'detail' && n.picked ? { card: n.picked, detail: n.pick } : null); };
  useEffect(() => {
    const key = (e) => {
      if (phase === 'choice') { const c = cards[Number(e.key) - 1]; if (c) choose(c); }
      if (phase === 'detail' && e.key === 'Enter') confirm();
      if (phase === 'result' && (e.key === 'Enter' || e.key === ' ')) resultWait.current?.();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  /* 경기 루프 — 개발 모드 두 번 마운트에도 하나만 돈다(stop) */
  useEffect(() => {
    let stop = false;
    const alive = () => !stop && aliveRef.current;
    (async () => {
      if (!introDone.current) await new Promise((res) => { introWait.current = res; });
      else await sleep(600);
      if (!alive()) return;
      const askedAt = aug ? (aug.askedAt || (aug.askedAt = new Set())) : new Set();
      if (midPickInnings.includes(1) && onMidPick && !askedAt.has(1)) {
        askedAt.add(1);
        const first = await onMidPick(1);
        if (first && alive()) { const nextMy = rebuildMy?.(first); if (nextMy) replaceTeam(g.home, engineTeam(nextMy)); aug.update(first, nextMy); }
      }
      if (g.wx.key !== 'clear') note('경기 전', `날씨 · ${g.wx.ko}`, SKY);
      const stops = [];
      let half = { inning: g.inning, top: g.top, home: g.home.runs, away: g.away.runs };
      aug?.beforeHalf(g);
      while (!g.final && alive()) {
        let pending = {};
        if (!g.top) {
          const change = aiPitchingChange(g, g.away);
          if (change) {
            const next = typeof change === 'string' ? g.away.team.pitchers.find((p) => p.id === change) : g.away.team.pitchers[g.away.pitcherIdx + 1];
            pending = { changePitcher: change };
            if (next) note(halfKo(g), `상대 투수 교체 · ${next.name}`, OPP);
          }
        }
        const fresh = !g.balls && !g.strikes;
        const wpBefore = winProb(g);
        let plan = tac, card = null, detail = null;
        if (fresh && wantsChoice(g, stops)) {
          stops.push({ inning: g.inning, top: g.top });
          setAsked(stops.length);
          const cs = choiceCards(g, { plan: tac, planKo: (g.top ? [sideOpt('mound', sides.mound)?.ko, sideOpt('def', sides.def)?.ko] : [sideOpt('off', sides.off)?.ko]).filter(Boolean).join(' · '), fatigue });
          setCards(cs); setPicked(null); setPhase('choice'); redraw();
          const got = await new Promise((res) => { waitRef.current = res; });
          if (!alive()) return;
          card = got?.card || cs[0]; detail = got?.detail || null;
          plan = planOrder(card, detail);
          setPhase('run');
        }
        /* 한 타석 — 고른 계획(없으면 정비 작전)으로 끝까지 */
        const top = g.top, idx = offenseOf(g).idx, side = top ? 'away' : 'home', runs0 = g[side].runs;
        let ev; let guard = 0; const evs = [];
        do { ev = pitch(g, { ...plan(g), ...pending }); pending = {}; if (ev) evs.push(ev); } while (ev && !ev.result && !g.final && g.top === top && offenseOf(g).idx === idx && guard++ < 40);
        if (!ev) break;
        const scored = g[side].runs - runs0;
        const wpNow = winProb(g);
        if (ev.result) {
          wpRef.current = [...wpRef.current, wpNow].slice(-200);
          wpAtRef.current = [...wpAtRef.current, { i: ev.inning, t: !!ev.top, r: ev.runs || 0 }].slice(-200);
        }
        evs.filter((e) => e.swapped).forEach((e) => note(halfKo(g), `투수 교체 · ${e.swapped.out.name} → ${e.swapped.in.name}`, e.top ? MY : OPP));
        if (card) {
          /* 도루는 타석 결과보다 먼저 — '도루 성공 · 안타'처럼 */
          const stl = evs.find((e) => e.steal), stlKo = stl ? `도루 ${stl.steal.ok ? '성공' : '실패'}` : null;
          const res = [stlKo, ev.result && ev.result !== 'CS' ? RESULT_LABEL[ev.result] : null].filter(Boolean).join(' · ') || (ev.call === 'inplay' ? '인플레이' : '타석 계속');
          const dk = detail?.t ? ` · ${PITCHES[detail.t].name}${detail.zone != null ? ` · ${zoneKo(detail.zone)}` : ''}` : '';
          const delta = wpNow - wpBefore;
          gainRef.current += delta;
          callsRef.current.push({ inning: ev.inning, top: ev.top, sit: situationOf({ ...g, bases: evs[0].before.bases, outs: evs[0].before.outs, inning: ev.inning, top: ev.top }, ev.top ? 'def' : 'off'), ko: `${card.ko}${dk}`, res, delta });
          const read = detail?.t && evs.some((e) => e.pitch?.type === detail.t && (card.detail === 'arm' ? e.result === 'K' || !HIT.has(e.result) : HIT.has(e.result)));
          setResult({ text: `${res}${scored ? ` · ${scored}점` : ''}`, who: `${ev.batter?.name || ''} · ${card.ko}${dk}`, before: wpBefore, after: wpNow, good: delta >= 0,
            chips: [...(read ? [[card.detail === 'arm' ? '결정구 적중' : '노림 적중', GOLD]] : []), ...(ev.result === 'HR' && g.wx.hr > 1 ? [[g.wx.ko, SKY]] : [])] });
          setPhase('result'); redraw();
          await Promise.race([sleep(RESULT_MS), new Promise((res) => { resultWait.current = res; })]);
          resultWait.current = null;
          if (!alive()) return;
          setResult(null); setPhase('run');
        } else {
          const big = scored > 0 || ev.result === 'HR';
          if (big) note(halfKo({ inning: ev.inning, top: ev.top }), `${ev.batter?.name || ''} ${RESULT_LABEL[ev.result] || ''}${scored ? ` · ${scored}점` : ''} · ${g.away.runs} : ${g.home.runs}`, ev.top ? OPP : MY);
          redraw();
          await sleep(big ? NOTE_MS : PA_MS);
        }
        /* 반 이닝이 넘어갔으면: 증강 보정 → 7회 증강 → 다음 반 이닝 보정 */
        if (g.inning !== half.inning || g.top !== half.top || g.final) {
          if (aug) {
            const before = half.top ? half.away : half.home;
            const res = aug.afterHalf(g, (half.top ? g.away.runs : g.home.runs) - before, half.inning, half.top);
            res.texts.forEach((t) => note(`${half.inning}회`, `증강 · ${t.name} · ${t.text}`, t.mine ? MY : OPP));
            if (g.final) g.winner = g.home.runs > g.away.runs ? 'home' : g.away.runs > g.home.runs ? 'away' : 'draw';
            if (!g.final && g.top && g.inning !== half.inning && midPickInnings.includes(g.inning) && onMidPick && !askedAt.has(g.inning)) {
              askedAt.add(g.inning);
              const p = await onMidPick(g.inning);
              if (p && alive()) {
                const nextMy = rebuildMy?.(p); if (nextMy) replaceTeam(g.home, engineTeam(nextMy)); aug.update(p, nextMy);
                const o = rebuildOpp?.(); if (o) { replaceTeam(g.away, engineTeam(o.team)); aug.updateOpp(o.list, o.team); note(`${g.inning}회`, `상대 증강 · ${o.list[o.list.length - 1].name}`, OPP); }
              }
            }
            aug.beforeHalf(g);
          }
          half = { inning: g.inning, top: g.top, home: g.home.runs, away: g.away.runs };
          redraw();
        }
      }
      if (g.final && alive()) { redraw(); await sleep(800); handOver(); }
    })();
    return () => { stop = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bat = batterOf(g), pit = pitcherOf(g), mineBat = !g.top;
  const deciding = phase === 'choice' || phase === 'detail';
  const playerCard = (p, mine, role) => (
    <div className="relative h-[300px] w-[230px] overflow-hidden rounded-[22px]"
      style={{ backgroundImage: face(p), backgroundSize: 'cover', backgroundPosition: 'center 22%', boxShadow: `inset 0 0 0 2px ${mine ? MY : OPP}, 0 0 40px -10px ${mine ? MY : OPP}` }}>
      <div className="absolute inset-x-0 bottom-0 p-4" style={{ background: 'linear-gradient(transparent, rgba(5,8,15,.95))' }}>
        <small className="text-t4" style={{ color: mine ? MY : OPP }}>{mine ? '우리' : '상대'} {role}</small>
        <b className="block truncate text-t2 text-white">{p?.name}</b>
        <small className="text-t4 text-gray-300">{role === '타자' ? `컨택 ${p?.stats?.contact ?? '-'} · 파워 ${p?.stats?.power ?? '-'}` : `구위 ${p?.stats?.stuff ?? '-'} · 체력 ${Math.round(staminaOf(defenseOf(g)))}`}</small>
      </div>
    </div>
  );
  const timer = (ms, extra, k) => <Timer ms={ms} extra={extra} onEnd={timeout} k={k} />;

  return (
    <div className="fixed inset-0 z-40 select-none overflow-hidden bg-[#05080f] text-gray-200" onContextMenu={(e) => e.preventDefault()}>
      <UiStyle />
      <GlassBg tint={MY} />
      <div className="absolute inset-0" style={{ background: 'url(ui/plate-view.webp) center/cover' }} />
      <div className="absolute inset-0 bg-[#05080f]/70" />
      {introOn && <MatchIntro away={introTeam(away, false)} home={introTeam(home, true)} tag={intro?.tag} onHandoff={() => { introDone.current = true; introWait.current?.(); }} onDone={() => setIntroOn(false)} />}
      {leaving && (
        <Pop eyebrow="나가기" title="남은 경기 자동 진행" a={GOLD} width={460} onClose={() => setLeaving(false)}
          actions={<><button type="button" className="mt-btn" onClick={() => setLeaving(false)}>계속</button><button type="button" className="mt-btn pri min-w-[180px]" style={{ '--a': GOLD }} onClick={() => { setLeaving(false); autoFinish(); }}>자동으로 끝내기</button></>}>
          <p className="text-t3 text-gray-300">지금 점수에서 끝까지 · 결과 확정</p>
        </Pop>
      )}

      <div className="relative flex h-full flex-col px-10 pb-8 pt-6">
        <header className="flex items-center gap-4">
          <button type="button" onClick={leave} aria-label="나가기" className="mt-cut grid h-10 w-10 place-items-center bg-white/[0.07] text-t2 text-gray-200 hover:bg-white/[0.12]" style={{ '--c': '12px' }}>←</button>
          <b className="rounded-full px-3 py-1 font-display text-t3" style={{ background: 'rgba(251,191,36,.14)', color: '#fde68a', boxShadow: 'inset 0 0 0 1px rgba(251,191,36,.4)' }}>결정 {asked} / {CHOICES}</b>
          <Chip t={g.wx.ko} c={SKY} />
          <Chip t={`불펜 호출 ${penCallsLeft(g.home)} / ${PEN_CALLS}`} c="#94a3b8" />
          <span className="ml-auto">
            {phase === 'choice' && timer(CHOICE_MS, false, `c${asked}`)}
            {phase === 'detail' && timer(DETAIL_MS, true, `d${asked}`)}
            {phase === 'run' && <b className="rounded-full px-3 py-1 font-display text-t3" style={{ background: 'rgba(56,189,248,.14)', color: '#7dd3fc' }}>▶▶ 진행</b>}
          </span>
        </header>

        {deciding ? (
          <>
            <div className="mt-4 flex items-center justify-center gap-10">
              {playerCard(bat, mineBat, '타자')}
              <div className="flex flex-col items-center gap-3">
                <Scoreboard g={g} home={home} away={away} />
                <b className="text-t2 text-white">{situationOf(g, mineBat ? 'off' : 'def')}</b>
                <b className="font-display text-t1 text-gray-400">VS</b>
              </div>
              {playerCard(pit, !mineBat, '투수')}
            </div>
            <div className="mt-auto flex items-end gap-4">
              <div className="grid flex-1 grid-cols-2 gap-3">
                {(phase === 'detail' ? [picked, cards[0]] : cards).map((c, i) => (
                  <Card key={c.k} c={c} i={cards.indexOf(c)} on={phase === 'detail' && c === picked} dim={phase === 'detail' && c !== picked} onPick={() => choose(c)} />
                ))}
              </div>
              {phase === 'detail' && picked && <Detail g={g} card={picked} pick={pick} setPick={setPick} onGo={confirm} timer={null} />}
            </div>
          </>
        ) : (
          <div className="m-auto flex w-[1100px] flex-col gap-6">
            <div className="mt-glass grid items-center gap-1 rounded-2xl p-5" style={{ gridTemplateColumns: '120px repeat(9,1fr) 70px' }}>
              <span />{Array.from({ length: 9 }, (_, i) => <b key={i} className="text-center font-display text-t3" style={{ color: i === Math.min(8, g.inning - 1) ? GOLD : '#64748b' }}>{i + 1}</b>)}<b className="text-center font-display text-t3 text-gray-400">R</b>
              {[[shortTeam(away.name), g.away, OPP], [shortTeam(home.name, true), g.home, MY]].map(([ko, sd, c]) => (
                <React.Fragment key={ko}>
                  <b className="truncate text-t2" style={{ color: c }}>{ko}</b>
                  {Array.from({ length: 9 }, (_, i) => { const v = i < 8 ? sd.line[i] : sd.line.slice(8).reduce((n, x) => (x == null ? n : (n ?? 0) + x), null); return <b key={i} className="text-center font-display text-t1" style={{ color: v == null ? '#334155' : v ? '#fff' : '#64748b' }}>{v ?? '·'}</b>; })}
                  <b className="text-center font-display text-t1" style={{ color: c }}>{sd.runs}</b>
                </React.Fragment>
              ))}
            </div>
            <div className="flex min-h-[300px] flex-col justify-end gap-2">
              {feed.map((f, i) => (
                <div key={f.id} className="flex items-center gap-4 rounded-xl px-5 py-3 fx-rise" style={{ background: i === feed.length - 1 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.03)', opacity: 0.45 + ((i + 1) / feed.length) * 0.55 }}>
                  <b className="w-20 font-display text-t3 text-gray-400">{f.inn}</b><b className="text-t2" style={{ color: f.tone }}>{f.text}</b>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {phase === 'result' && result && (
        <button type="button" className="absolute inset-0 grid place-items-center bg-[#05080f]/60" onClick={() => resultWait.current?.()}>
          <div className="flex w-[760px] flex-col items-center gap-5 rounded-[26px] p-8 fx-rise" style={{ background: 'rgba(8,12,22,.92)', backdropFilter: 'blur(18px)', boxShadow: `inset 0 0 0 2px ${result.good ? GOLD : OPP}, 0 30px 80px -20px ${result.good ? 'rgba(251,191,36,.45)' : 'rgba(248,113,113,.4)'}` }}>
            <small className="text-t3 text-gray-400">결정 {asked} · {result.who}</small>
            <b className="text-white" style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-.02em' }}>{result.text}</b>
            {result.chips.length > 0 && <div className="flex gap-2">{result.chips.map(([t, c]) => <Chip key={t} t={t} c={c} />)}</div>}
            <div className="flex w-full items-center gap-4">
              <b className="font-display text-t2 text-gray-400">{Math.round(result.before * 100)}%</b>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <i className="absolute inset-y-0 left-0 block rounded-full bg-white/30" style={{ width: `${Math.min(result.before, result.after) * 100}%` }} />
                <i className="absolute inset-y-0 block rounded-full" style={{ left: `${Math.min(result.before, result.after) * 100}%`, width: `${Math.abs(result.after - result.before) * 100}%`, background: result.good ? MY : OPP }} />
              </div>
              <b className="font-display text-t1" style={{ color: result.good ? MY : OPP }}>{Math.round(result.after * 100)}%</b>
            </div>
            <span className="flex w-full justify-between text-t3 text-gray-400">
              <span>{shortTeam(home.name, true)} {g.home.runs} : {g.away.runs} {shortTeam(away.name)}</span>
              <b className="font-display text-t2" style={{ color: result.good ? MY : OPP }}>{result.after >= result.before ? '+' : ''}{Math.round((result.after - result.before) * 100)}%p</b>
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
