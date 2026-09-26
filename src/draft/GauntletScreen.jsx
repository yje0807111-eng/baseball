/*
 * 구단 정복 화면 (전체 화면) — 라이브 드래프트를 마친 판에서 나머지 일곱 구단을 약한 순서로 하나씩 꺾는다.
 *  위: 원정길 — 왼쪽(약함)부터 오른쪽(강함)으로 여덟 구단 + 끝의 정복 보상. 금빛 선이 내 자리까지 차오른다.
 *      이기면 그 칸을 빼앗아 한 칸 오른쪽으로, 진 구단은 내 왼쪽으로 내려온다(칸이 좌우로 미끄러진다).
 *  아래 왼쪽: 고른 구단 전력 — 넓은 구장 위 수비 아홉 · 좁은 투수진 · 벤치(원정길에서 누르면 바뀐다)
 *  아래 오른쪽: 다음 상대와 수치 비교 · 상대 핵심 셋(간판 · 에이스 · 중심 타자) · 정비하기 — 결정 단추는 다른 화면처럼 오른쪽 아래
 * 아래 판 배치는 목업 넷(mockups/conquest-4) 중 4안.
 * 배치를 고른 까닭(2026-09-26): 옛 탑은 여덟 칸마다 수치 다섯을 반복해 숫자 40개가 한꺼번에 보였고, 다음 상대 · 진행도 · 보상이 묻혔다.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { FIELD_SLOTS, PITCH_SLOTS, fillRoster, POS_LABEL } from '../KboAugmentDraft.jsx';
import { GRADES, emblemOf, bannerEmblem } from './live.js';
import { currentRung, isCleared, myPos, record } from './gauntlet.js';
import { GAUNTLET_MEMENTO } from './memento.js';
import { artId } from '../data/artAlias.js';

const GOLD = '#f5d27a';
const WIN = '#34d399', LOSE = '#f87171';
const GRADE_COLOR = { weak: '#94a3b8', plain: '#38bdf8', solid: '#f59e0b', ace: '#ef4444' };
const TRAIT_KO = { power: '한 방', mound: '마운드', value: '가성비', defense: '수비', balance: '균형' };
const KEYS = [['bat', '타격'], ['pit', '마운드'], ['def', '수비'], ['str', '전력']];
const show = (k, v) => (k === 'str' ? Number(v).toFixed(1) : v);
/* 막대 — 62~90 을 0~100% 로(팀 수치가 모이는 폭) */
const pct = (v) => Math.max(6, Math.min(100, ((v - 62) / 28) * 100));
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const face = (p) => `url(profiles/${encodeURIComponent(artId(p.id))}.webp), url(ui/mt/silhouette-player.webp)`;
/* 구장 위 자리 (%) — 넓은 구장 그림(field-wide, 2.36:1)을 약 1.9:1 칸에 덮었을 때 */
const XY = { OF2: [50, 16], OF1: [27, 28], OF3: [73, 28], SS: [42, 46], '2B': [58, 46], '3B': [34, 60], '1B': [66, 60], C: [50, 85], DH: [66, 85] };
const BENCH_SHOW = 4;
/** 오늘 경기에 나서는 선수(벤치 뺀) 중 가장 센 셋 — 간판 · 에이스(투수) · 중심 타자, 한 선수는 한 번만 */
function keysOf(roster) {
  const on = fillRoster(roster || []).filter((p) => p.slot && !p.slot.startsWith('BN') && !p.isReplacement);
  const best = (list) => list.reduce((m, p) => (!m || p.overall > m.overall ? p : m), null);
  const star = best(on);
  const ace = best(on.filter((p) => p.type === 'pitcher' && p !== star));
  const bat = best(on.filter((p) => p.type === 'batter' && p !== star));
  return [['간판', star, '#fde047'], ['에이스', ace, '#f87171'], ['중심 타자', bat, '#7dd3fc']].filter(([, p]) => p);
}
/* 야수 자리 — KboAugmentDraft 와 서로 불러오는 사이라 모듈을 읽는 때가 아니라 그릴 때 센다 */
const batSlots = () => FIELD_SLOTS.filter((s) => !PITCH_SLOTS.includes(s.id)).map((s) => s.id);

const Emb = ({ src, size, ring = null, dim = false }) => (
  <span className="relative block shrink-0 rounded-full bg-[#0b1220] bg-cover"
    style={{ width: size, height: size, backgroundImage: `url(${src})`, backgroundPosition: 'center 26%', opacity: dim ? 0.45 : 1,
      boxShadow: ring ? `0 0 0 3px ${ring}, 0 0 26px -2px ${ring}` : 'inset 0 0 0 1px rgba(255,255,255,.14)' }} />
);
const Cup = ({ size = 30, lit = false }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={lit ? '#1c1203' : GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4M8.5 20h7M10 17h4" />
  </svg>
);

/** 원정길 한 칸 — 구단 하나(내 칸 포함) */
function Stop({ r, i, mine, now, cleared, sel, res, emblem, onPick }) {
  const size = now ? 84 : mine ? 76 : 64;
  const tag = mine ? ['나', r.color] : cleared ? ['통과', WIN] : now ? ['다음', GOLD] : null;
  const last = res.filter((x) => x.win).slice(-1)[0];
  const losses = res.filter((x) => !x.win).length;
  return (
    <button type="button" data-rung={r.club} onClick={onPick} aria-pressed={sel}
      className="relative z-[1] flex w-[10.5rem] flex-col items-center gap-1.5 pt-1 transition-[transform,opacity] duration-200 hover:-translate-y-0.5">
      <span className="grid h-[92px] place-items-center">
        <Emb src={emblem} size={size} dim={cleared && !sel} ring={now ? GOLD : mine ? r.color : sel ? '#e8ecf2' : null} />
      </span>
      <b className="max-w-full truncate text-t3 font-black" style={{ color: mine ? r.color : cleared ? '#9aa6b5' : '#e8ecf2' }}>{r.short}</b>
      <span className="flex items-center gap-1.5">
        <b className="font-display text-t3 font-bold" style={{ color: now ? GOLD : '#93a0af' }}>{show('str', r.str)}</b>
        {tag && <b className="rounded px-1.5 text-t4 font-extrabold" style={{ color: tag[1], background: `${tag[1]}22`, boxShadow: `inset 0 0 0 1px ${tag[1]}66` }}>{tag[0]}</b>}
      </span>
      {/* 통과한 칸은 이긴 점수, 지금 칸은 진 횟수 */}
      <small className="h-4 font-display text-t4 text-[#7c8797]">
        {cleared && last ? `${last.my ?? '-'}:${last.opp ?? '-'}` : now && losses ? `${losses}패 · 재도전` : ''}
      </small>
      {sel && !mine && <i className="absolute -bottom-2 h-[3px] w-10 rounded-full" style={{ background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />}
    </button>
  );
}

/** 고른 구단의 전력 판 — 넓은 구장 위 수비 아홉 · 좁은 투수진 · 벤치 */
function Scout({ r, label }) {
  const full = fillRoster(r.roster || []);
  const by = {};
  full.forEach((p) => { if (p.slot) by[p.slot] = p; });
  const arms = PITCH_SLOTS.map((id) => ({ ...by[id], slot: id, label: FIELD_SLOTS.find((x) => x.id === id)?.label })).filter((p) => p.id);
  const bench = full.filter((p) => p.slot && p.slot.startsWith('BN'));
  return (
    <section className="ui-cut ui-frame ui-glass flex min-h-0 min-w-0 flex-col gap-3 p-5" style={{ '--c': '20px', '--a': r.color }}>
      <div className="flex items-baseline gap-3">
        <p className="ui-lab font-display" style={{ '--a': r.color }}>{label}</p>
        <b className="text-t2 font-black text-white">{r.name}</b>
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        {/* 구장 위 수비 배치 — 판의 대부분 */}
        <div className="ui-cut relative h-full w-[63rem] max-w-[74%] shrink-0 overflow-hidden bg-cover bg-center" style={{ '--c': '12px', backgroundImage: 'url(ui/field-wide.webp)' }}>
          <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,9,15,.25),rgba(5,9,15,.55))' }} />
          {batSlots().map((slot) => {
            const p = by[slot];
            const at = XY[slot];
            if (!p || !at) return null;
            return (
              <span key={slot} className="absolute flex items-center gap-1.5" style={{ left: `${at[0]}%`, top: `${at[1]}%`, transform: 'translate(-50%,-50%)' }}>
                <span className="h-11 w-11 shrink-0 rounded-full bg-[#0b1220] bg-cover" style={{ backgroundPosition: 'center 8%', backgroundImage: face(p), boxShadow: `0 0 0 2px ${r.color}` }} />
                <span className="grid rounded-md px-2 py-0.5 leading-tight" style={{ background: 'rgba(6,10,19,.9)' }}>
                  <b className="whitespace-nowrap text-t3 text-white">{p.name}</b>
                  <b className="whitespace-nowrap font-display text-t3" style={{ color: tone(p.overall) }}>{POS_LABEL[p.position] || p.position} {p.overall}</b>
                </span>
              </span>
            );
          })}
        </div>
        {/* 투수진 · 벤치 — 이름과 종합만 짧게 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="ui-lab font-display" style={{ '--a': '#f87171' }}>투수진</p>
          {arms.map((p) => (
            <span key={p.slot} className="ui-cut flex h-[2.6rem] items-center gap-2 px-3" style={{ '--c': '8px', background: 'rgba(255,255,255,.045)' }}>
              <small className="shrink-0 text-t4 text-[#8b97a6]">{p.label}</small>
              <b className="min-w-0 flex-1 truncate text-t3 text-[#e8ecf2]">{p.name}</b>
              <b className="font-display text-t2" style={{ color: tone(p.overall) }}>{p.overall}</b>
            </span>
          ))}
          <p className="ui-lab mt-2 font-display" style={{ '--a': '#94a3b8' }}>벤치</p>
          {bench.length ? bench.slice(0, BENCH_SHOW).map((p) => (
            <span key={p.slot} className="ui-cut flex h-[2.15rem] items-center gap-2 px-3" style={{ '--c': '7px', background: 'rgba(255,255,255,.035)' }}>
              <small className="shrink-0 text-t4 text-[#8b97a6]">{POS_LABEL[p.position] || p.position}</small>
              <b className="min-w-0 flex-1 truncate text-t3 text-[#e8ecf2]">{p.name}</b>
              <b className="font-display text-t3" style={{ color: tone(p.overall) }}>{p.overall}</b>
            </span>
          )) : <small className="text-t4 text-[#6b7787]">예비 선수 없음</small>}
          {bench.length > BENCH_SHOW && <small className="px-1 text-t4 text-[#6b7787]">외 {bench.length - BENCH_SHOW}명</small>}
        </div>
      </div>
    </section>
  );
}

/** 다음 상대와 수치 비교 — 가운데에서 양쪽으로 뻗는 막대, 큰 쪽만 밝게 */
function Versus({ me, myEmb, cur, res, onPlay }) {
  const d = Math.round((me.stats.str - cur.str) * 10) / 10;
  const verdict = d >= 1.5 ? ['우세', WIN] : d <= -1.5 ? ['열세', LOSE] : ['접전', GOLD];
  const losses = res.filter((x) => !x.win).length;
  return (
    <section className="ui-cut ui-frame ui-glass flex min-h-0 flex-col gap-3 p-6" style={{ '--c': '20px', '--a': GOLD }}>
      <div className="flex items-baseline gap-3">
        <p className="ui-lab font-display" style={{ '--a': GOLD }}>다음 상대</p>
        {losses > 0 && <small className="ml-auto text-t4 font-bold text-[#fca5a5]">{losses}패 · 재도전</small>}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="grid justify-items-center gap-2">
          <Emb src={myEmb} size={76} ring={me.color || '#e879f9'} />
          <b className="max-w-full truncate text-t2 font-black text-white">{me.short || me.name}</b>
        </span>
        <span className="grid justify-items-center gap-1">
          <b className="font-display text-t1 italic text-[#7c8797]">VS</b>
          <b className="rounded-md px-2.5 py-0.5 text-t3 font-black" style={{ color: verdict[1], background: `${verdict[1]}1f`, boxShadow: `inset 0 0 0 1px ${verdict[1]}88` }}>
            {verdict[0]} {d > 0 ? '+' : ''}{d}
          </b>
        </span>
        <span className="grid justify-items-center gap-2">
          <Emb src={cur.key ? emblemOf(cur.key) : bannerEmblem(null)} size={76} ring={cur.color} />
          <b className="max-w-full truncate text-t2 font-black text-white">{cur.short}</b>
        </span>
      </div>
      <div className="flex justify-center gap-2">
        {cur.grade && <b className="rounded px-2 text-t4 font-bold" style={{ color: GRADE_COLOR[cur.grade], boxShadow: `inset 0 0 0 1px ${GRADE_COLOR[cur.grade]}88` }}>{GRADES[cur.grade]?.ko}</b>}
        {TRAIT_KO[cur.trait] && <b className="rounded px-2 text-t4 font-bold text-[#cbd5e1]" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)' }}>{TRAIT_KO[cur.trait]}</b>}
      </div>
      <div className="grid gap-2">
        {KEYS.map(([k, ko]) => {
          const a = me.stats[k], b = cur[k];
          const lead = a > b ? 'me' : a < b ? 'opp' : null;
          return (
            <div key={k} className="grid grid-cols-[3.2rem_minmax(0,1fr)_3.4rem_minmax(0,1fr)_3.2rem] items-center gap-2">
              <b className="text-right font-display text-t2" style={{ color: lead === 'me' ? WIN : '#cbd5e1' }}>{show(k, a)}</b>
              <span className="flex h-2.5 justify-end rounded-l-full bg-white/[0.06]">
                <i className="block h-full rounded-l-full" style={{ width: `${pct(a)}%`, background: lead === 'me' ? WIN : 'rgba(203,213,225,.35)' }} />
              </span>
              <small className="text-center text-t4 font-bold text-[#8b97a6]">{ko}</small>
              <span className="flex h-2.5 rounded-r-full bg-white/[0.06]">
                <i className="block h-full rounded-r-full" style={{ width: `${pct(b)}%`, background: lead === 'opp' ? LOSE : 'rgba(203,213,225,.35)' }} />
              </span>
              <b className="font-display text-t2" style={{ color: lead === 'opp' ? LOSE : '#cbd5e1' }}>{show(k, b)}</b>
            </div>
          );
        })}
      </div>
      {/* 상대 핵심 셋 — 오늘 나서는 선수 중에서 */}
      <div className="grid gap-1.5">
        <p className="ui-lab font-display" style={{ '--a': cur.color }}>상대 핵심</p>
        {keysOf(cur.roster).map(([ko, p, c]) => (
          <span key={ko} className="ui-cut grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-1.5" style={{ '--c': '10px', background: 'rgba(255,255,255,.045)' }}>
            <span className="h-[2.4rem] w-[2.4rem] rounded-full bg-[#0b1220] bg-cover" style={{ backgroundImage: face(p), backgroundPosition: 'center 8%', boxShadow: `0 0 0 2px ${c}` }} />
            <span className="grid min-w-0 leading-tight">
              <small className="text-t4 font-extrabold" style={{ color: c }}>{ko}</small>
              <b className="truncate text-t3 text-[#e8ecf2]">{p.name} <small className="text-t4 font-medium text-[#6b7787]">{POS_LABEL[p.position] || p.position}</small></b>
            </span>
            <b className="font-display text-t1" style={{ color: tone(p.overall) }}>{p.overall}</b>
          </span>
        ))}
      </div>
      <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[4rem] w-full shrink-0 text-t2 font-black" style={{ '--c': '12px' }} onClick={onPlay}>정비하기 ▶</button>
    </section>
  );
}

export default function GauntletScreen({ gaunt, me, onPlay, onBack, onExit = onBack }) {
  const cur = currentRung(gaunt);
  const rec = record(gaunt);
  const at = myPos(gaunt);
  const rivals = gaunt.tower.length - 1;
  const myEmb = me.emblem || bannerEmblem(null);
  const [selClub, setSelClub] = useState(null);
  const shown = (r) => (r.me ? { ...r, ...me.stats, short: me.short || r.short, name: me.name || r.name } : r);
  const sel = gaunt.tower.find((r) => r.club === selClub) || cur || gaunt.tower[at];
  const resOf = (club) => gaunt.results.filter((x) => x.club === club);
  /* 금빛 선 — 첫 칸 가운데에서 내 칸 가운데까지(끝까지 가면 보상 칸까지) */
  const stops = gaunt.tower.length + 1;
  const fill = gaunt.done ? 100 : (at / (stops - 1)) * 100;

  /* 자리가 바뀌면 칸이 좌우로 미끄러져 오간다 — 새 자리에 그린 뒤 옛 자리에서 출발시킨다(FLIP) */
  const roadRef = useRef(null);
  const seatRef = useRef(new Map());
  useLayoutEffect(() => {
    const prev = seatRef.current;
    const now = new Map();
    roadRef.current?.querySelectorAll('[data-rung]').forEach((el) => {
      const id = el.dataset.rung;
      const left = el.getBoundingClientRect().left;
      now.set(id, left);
      const was = prev.get(id);
      if (was == null || Math.abs(was - left) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translateX(${was - left}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform .55s cubic-bezier(.2,.7,.3,1)';
        el.style.transform = '';
      });
    });
    seatRef.current = now;
  }, [gaunt]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col">
      <div className="ui-bg" style={{ backgroundImage: 'url(ui/gauntlet.webp)' }} aria-hidden="true" />
      {/* 머리 줄 — 정비로 · 이름 · 진행도 · 내 전적 */}
      <div className="relative flex h-16 shrink-0 items-center gap-4 px-8" style={{ background: 'rgba(6,10,19,.72)', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,.08)' }}>
        <button type="button" className="ui-btn ui-cut px-3.5 py-1.5 text-t3" style={{ '--c': '6px' }} onClick={onBack}>← 정비</button>
        <b className="text-t1 font-black text-white">구단 정복</b>
        <span className="flex items-baseline gap-1.5 border-l border-white/15 pl-4">
          <b className="font-display text-t1 font-extrabold" style={{ color: GOLD }}>{gaunt.done ? rivals : at}</b>
          <small className="font-display text-t3 text-[#8b97a6]">/ {rivals} 구단</small>
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Emb src={myEmb} size={34} />
          <b className="text-t3 text-[#e8ecf2]">{me.name}</b>
          <b className="font-display text-t2 text-[#e8ecf2]"><span style={{ color: WIN }}>{rec.w}승</span> <span style={{ color: LOSE }}>{rec.l}패</span></b>
        </span>
      </div>

      {/* 원정길 — 왼쪽 약함 → 오른쪽 강함 · 끝은 정복 보상 */}
      <div className="relative shrink-0 px-12 pb-3 pt-5">
        <div ref={roadRef} className="relative flex items-start justify-between">
          {/* 길: 회색 바탕 위로 금빛이 내 칸까지 */}
          <span className="absolute left-[5.25rem] right-[5.25rem] top-[3.4rem] h-1 rounded-full bg-white/10" aria-hidden="true">
            <i className="block h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${fill}%`, background: `linear-gradient(90deg,#b7832a,${GOLD})`, boxShadow: `0 0 12px ${GOLD}` }} />
          </span>
          {gaunt.tower.map((r0, i) => {
            const r = shown(r0);
            return (
              <Stop key={r.club} r={r} i={i} mine={!!r.me} now={cur?.club === r.club} cleared={isCleared(gaunt, i)} sel={sel?.club === r.club}
                res={resOf(r.club)} emblem={r.me ? myEmb : r.key ? emblemOf(r.key) : bannerEmblem(null)}
                onPick={() => setSelClub(r.club === selClub ? null : r.club)} />
            );
          })}
          {/* 정복 보상 */}
          <span className="relative z-[1] flex w-[10.5rem] flex-col items-center gap-1.5 pt-1">
            <span className="grid h-[92px] place-items-center">
              <span className="grid h-[72px] w-[72px] place-items-center rounded-full"
                style={gaunt.done ? { background: `linear-gradient(180deg,#fde68a,#d69e2e)`, boxShadow: `0 0 30px ${GOLD}` } : { background: 'rgba(245,210,122,.08)', boxShadow: `inset 0 0 0 2px ${GOLD}66` }}>
                <Cup size={34} lit={gaunt.done} />
              </span>
            </span>
            <b className="text-t3 font-black" style={{ color: GOLD }}>정복 보상</b>
            <small className="text-t4 text-[#9aa6b5]">기념 카드 {GAUNTLET_MEMENTO.n}장 중 1장</small>
          </span>
        </div>
      </div>

      {/* 매치업 — 왼쪽 고른 구단 전력 · 오른쪽 다음 상대 비교와 정비하기 */}
      <div className="relative grid min-h-0 flex-1 gap-5 px-12 pb-6 pt-2" style={{ gridTemplateColumns: 'minmax(0,1fr) 27.5rem', gridTemplateRows: 'minmax(0,1fr)' }}>
        {sel && <Scout r={shown(sel)} label={sel.me ? '내 구단' : sel.club === cur?.club ? '다음 상대 전력' : isCleared(gaunt, gaunt.tower.indexOf(sel)) ? '통과한 구단' : '남은 구단'} />}
        {cur ? (
          <Versus me={me} myEmb={myEmb} cur={cur} res={resOf(cur.club)} onPlay={onPlay} />
        ) : (
          <section className="ui-cut ui-frame ui-glass flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ '--c': '20px', '--a': GOLD }}>
            <span className="grid h-24 w-24 place-items-center rounded-full" style={{ background: 'linear-gradient(180deg,#fde68a,#d69e2e)', boxShadow: `0 0 40px ${GOLD}` }}><Cup size={48} lit /></span>
            <b className="text-t1 font-black" style={{ color: GOLD }}>정복 완료</b>
            <b className="font-display text-t2 text-[#e8ecf2]">{rec.w}승 {rec.l}패</b>
            <button type="button" className="ui-btn ui-cut pri mt-2 min-h-[3.4rem] px-12 text-t2" style={{ '--c': '10px' }} onClick={onExit}>모드 고르기</button>
          </section>
        )}
      </div>
    </div>
  );
}
