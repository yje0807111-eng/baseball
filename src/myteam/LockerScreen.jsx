/*
 * 내 라커 — 사이드 네비(영입 · 내 선수 · 감독·코치)와 드래프트 '선수 평점' 문법의 리스트
 *  영입(L1): 검색 + 후보 리스트 + 오른쪽 상세
 *  내 선수(L2): 포지션 그룹 목록 + 오른쪽 상세(방출)
 *  감독·코치(L6): 네 자리 슬롯 + 후보 리스트 + 효과 합계
 *  아이템: 상점에서 산 훈련·부스트·계약서 — 고른 뒤 아무 선수·감독/코치에게 사용
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { SQUAD_CAP, BASE_LIMITS, POS_RULES, STAFF_SLOTS, squadCost, foreignCount, freeUsed, addBlockReason, squadIssues, limitsOf } from './rules.js';
import { staffByRole, staffEffect, staffEffectOf, staffReserve, STAFF_LEVEL_MAX } from './staff.js';
import { saveTeam } from './store.js';
import { SHOP_ITEMS, itemArt, needsStaff, fitsItem, recommendTargets, consumeItem, STAT_KO, teamWeakness, WEAK_KO, WEAK_COLOR } from './shop.js';
import { playingIds } from './match.js';
import { posColor, statColor, statOf, statPct, teamNeon } from './teamColor.js';
import { UiStyle, Bg, TopBar, Btn, Portrait, SideNav, Hero, KV, Stats, FlipFaces } from './ui.jsx';
import SquadBoard from './SquadBoard.jsx';
import { KEYFRAMES, PlayerCard, PK_SKELETON } from '../KboAugmentDraft.jsx';
import { playerTraits, recordCells, HAND_LABEL, traitIconStyle } from './traits.js';

// 영입 풀은 구단 시즌 기록만 (국가대표 대회 버전은 뺀다)
const ALL = SERIES.filter((s) => s.kind !== 'national').flatMap((s) => s.players);
const YEARS = [...new Set(ALL.map((p) => p.year))].sort((a, b) => b - a);
const TEAMS = [...new Set(ALL.map((p) => p.team))].sort();
const cut = (n) => ({ '--c': `${n}px` });
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const KEYS = { pitcher: [['구위', 'stuff'], ['제구', 'control'], ['체력', 'stamina'], ['안정', 'stability']], batter: [['파워', 'power'], ['컨택', 'contact'], ['주루', 'speed'], ['수비', 'defense']] };
const EFF_LABEL = { bat: '타격', field: '수비', pitch: '구위', stamina: '체력', steal: '도루', clutch: '승부처' };
/* 코치 효과: 한 줄 문장 "타격 +2 · 승부처 +1" — 숫자만 효과 색 · 굵게 */
const EFF_COLOR = { bat: '#34d399', field: '#60a5fa', pitch: '#f87171', stamina: '#fbbf24', steal: '#fb923c', clutch: '#e879f9' };
const ROLE_EN = { manager: 'MANAGER', head: 'HEAD COACH', batting: 'BATTING COACH', pitching: 'PITCHING COACH' };
const effTags = (e) => Object.entries(e).map(([k, v]) => ({ k, c: EFF_COLOR[k], label: EFF_LABEL[k], n: `+${k === 'steal' ? `${Math.round(v * 100)}%p` : v}` }));
const POS_FULL = { SP: 'STARTING PITCHER', RP: 'RELIEF PITCHER', C: 'CATCHER', '1B': 'FIRST BASE', '2B': 'SECOND BASE', '3B': 'THIRD BASE', SS: 'SHORTSTOP', OF: 'OUTFIELDER', DH: 'DESIGNATED HITTER' };
const ROW_COLS = '48px 50px minmax(0,1.3fr) repeat(4,minmax(0,1fr)) 60px 76px';

/*
 * 선수 카드 그림(cards/ → profiles/ → 실루엣)을 미리 받아 둔다: 목록에서 마우스를 올리면(preloadCard) 상세 판 카드가 누르는 순간 바로 뜬다.
 */
const cardCache = new Map(); // id → Promise<url>
function preloadCard(p) {
  if (!p || cardCache.has(p.id)) return cardCache.get(p?.id);
  const tryLoad = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(src); im.onerror = no; im.src = src; });
  const id = encodeURIComponent(p.id);
  const job = tryLoad(`cards/${id}.webp`).catch(() => tryLoad(`profiles/${id}.webp`)).catch(() => 'ui/mt/silhouette-player.webp');
  cardCache.set(p.id, job);
  return job;
}

/** 드롭다운 — 유리 판 + 모서리 네온 목록 (기본 select 창 대신) */
function Select({ value, onChange, options, all }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', esc); };
  }, [open]);
  const pick = (v) => { onChange(v); setOpen(false); };
  const item = (v, label) => {
    const on = String(value) === String(v);
    return (
      <button key={v || 'all'} type="button" role="option" aria-selected={on} onClick={() => pick(v)}
        className={`relative flex h-7 w-full shrink-0 items-center justify-between pl-3 pr-2 text-left text-[13px] leading-none ${on ? 'text-emerald-300' : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'}`}
        style={{ background: on ? 'rgba(16,185,129,.12)' : undefined, boxShadow: on ? 'inset 2px 0 0 #10b981' : undefined, fontWeight: on ? 700 : 500 }}>
        {label}{on && <span aria-hidden="true" className="text-[11px]">✓</span>}
      </button>
    );
  };
  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={`mt-cut flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2.5 text-[13px] ${value ? 'text-white' : 'text-gray-300'}`}
        style={{ ...cut(6), background: open ? 'rgba(16,185,129,.16)' : 'rgba(255,255,255,.06)', boxShadow: open || value ? 'inset 0 0 0 1px rgba(16,185,129,.55)' : undefined }}>
        <span className="truncate">{value || all}</span>
        <span className="font-display text-[10px] text-emerald-400 transition" style={{ transform: open ? 'rotate(180deg)' : undefined }}>▼</span>
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 animate-[fade_.15s_ease-out_both] p-1"
          style={{ background: 'rgba(8,12,22,.97)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 18px 40px -12px rgba(0,0,0,.9)' }}>
          <div className="mt-scroll slim flex max-h-[300px] flex-col overflow-y-auto pr-1">
            {item('', all)}
            {options.map((o) => item(o, o))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 선수 한 줄 (드래프트 선수 평점 문법) */
/** 드래프트 카드 종합 숫자와 같은 등급 색: 100 이상 무지개 · 85 이상 초록 · 그 밖은 흰색 */
const statTier = (v) => (v >= 100 ? 't90' : v >= 85 ? 't75' : '');
/** 능력치 구간 색(신호등): 70 미만 빨강 · 80 미만 주황 · 90 미만 노랑 · 100 미만 초록 · 100 이상 금색(움직임 없음) */
const statBand = (v) => (v >= 100 ? 'b90' : v >= 90 ? 'b80' : v >= 80 ? 'b70' : v >= 70 ? 'b60' : 'b0');

/** teamTint: 드래프트 선반 카드처럼 구단 색 — 줄 왼쪽 은은한 색 · 네온 줄 · 포지션 칩 · 선택 테두리 */
function PlayerRow({ p, on, action, blocked, onPick, onAct, showNote = true, bench, onBench, teamTint = false }) {
  const n = tone(p.overall);
  const neon = teamNeon(p);
  const keys = KEYS[p.type] || KEYS.batter;
  return (
    <div role="button" onClick={() => onPick(p)} onPointerEnter={() => preloadCard(p)} className={`mt-row mt-cut cursor-pointer ${teamTint ? 'team' : ''} ${on ? 'on' : ''}`} style={{ gridTemplateColumns: ROW_COLS, '--a': teamTint ? neon : n, '--t': neon }}>
      <Portrait player={p} w={46} h={54} color={teamTint ? neon : n} />
      {teamTint
        ? <b className={`st-v ${statTier(p.overall)} font-display text-[30px] font-extrabold leading-none`}>{p.overall}</b>
        : <b className="font-display text-[30px] font-extrabold leading-none" style={{ color: n, textShadow: `0 0 14px ${n}88` }}>{p.overall}</b>}
      <span className="min-w-0">
        {/* 영입 목록: 포지션은 칩 대신 이름 위 작은 구단색 영문 라벨 */}
        {teamTint && <small className="block truncate font-display text-[11px] font-bold leading-tight tracking-[0.16em]" style={{ color: neon }}>{POS_FULL[p.position]}</small>}
        <b className="block truncate text-base font-black text-white">
          {p.name}
          {!teamTint && <em className="ml-1.5 px-1.5 py-px text-[11px] not-italic text-[#05080f]" style={{ background: n }}>{p.position}</em>}
          {teamTint && <span className="ml-2 text-xs font-medium text-gray-500">{p.year} {p.team}</span>}
          {p.isForeign && <em className="ml-1.5 text-[10px] not-italic text-amber-300">외국인</em>}
          {onBench && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onBench(p); }} title={bench ? '눌러서 출전 선수로' : '눌러서 벤치로'}
              className={`mt-cut ml-2 px-2 py-px align-middle text-[11px] font-bold ${bench ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35'}`} style={{ '--c': '4px' }}>
              {bench ? '벤치 ↑' : '출전 ●'}
            </button>
          )}
        </b>
        {!teamTint && (
          <small className="block truncate text-[11px] text-gray-500">
            {p.year} {p.team}{showNote && p.note ? ` · ${p.note}` : ''}
          </small>
        )}
      </span>
      {keys.map(([label, k]) => {
        const v = p.stats?.[k] ?? 0;
        return (
          <span key={k} className="min-w-0">
            <span className="flex items-baseline justify-between text-[12px] font-semibold text-gray-300">{label}<b className="font-display text-[15px]" style={{ color: statOf(k, v).num }}>{v}</b></span>
            <span className="relative mt-[5px] block h-[3px] bg-white/[0.08]">
              <b className="absolute inset-y-0 left-0 block" style={{ width: `${statPct(v)}%`, background: statOf(k, v).bar }} />
            </span>
          </span>
        );
      })}
      <b className="text-right font-display text-lg text-amber-300">{p.cost}</b>
      <Btn sm pri={on} a={teamTint ? '#10b981' : n} disabled={!!blocked} title={blocked || ''} onClick={(e) => { e.stopPropagation(); onAct(p); }}>{action}</Btn>
    </div>
  );
}

/** 선수를 고르기 전 오른쪽 상세: 실제 상세 판과 같은 자리에 스켈레톤 블록 (드래프트 빈 PICK 과 같은 대기 움직임) */
function EmptyDetail() {
  let i = 0;
  const sk = (style, cls = '') => <span className={`mt-sk ${cls}`} style={{ ...style, '--i': i++ }} />;
  // 선수를 골랐을 때의 한 장짜리 긴 카드와 같은 틀: 판에서 남은 높이를 재서 카드 크기를 정한다
  const box = useRef(null);
  const baseRef = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setW(Math.max(0, Math.floor(Math.min(el.clientWidth, ((el.clientHeight - (baseRef.current?.offsetHeight || 0)) * 2) / 3))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const inset = Math.round(w * 0.016 * 10) / 10;
  const corner = Math.round(w * 0.07);
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2 p-4" style={cut(20)} aria-label="선수를 고르면 여기에 표시됩니다">
      <p className="mt-lab" style={{ '--a': '#64748b' }}>Player</p>
      <div ref={box} className="flex min-h-0 flex-1 flex-col items-center">
        {/* 긴 카드 모양 스켈레톤: 둘레를 빛이 돌고(mt-skring) · 위는 드래프트 빈 PICK 카드 블록 · 아래 받침은 실적 칸 · 태그 자리 */}
        <div className="mt-skring" style={{ width: w, clipPath: `polygon(${corner}px 0,100% 0,100% calc(100% - ${corner}px),calc(100% - ${corner}px) 100%,0 100%,0 ${corner}px)` }}>
          <div>
            <div className="relative aspect-[2/3] w-full" style={{ containerType: 'inline-size' }}>
              {PK_SKELETON.map((st, k) => <span key={k} className="pk-sk" style={{ ...st, '--i': k }} />)}
            </div>
            <div ref={baseRef} style={{ padding: `2px ${inset + 10}px ${inset + 12}px` }}>
              <span className="mb-2 block h-px bg-emerald-400/20" />
              <div className="grid grid-cols-6 gap-2 py-1.5">
                {[0, 1, 2, 3, 4, 5].map((k) => <div key={k} className="flex flex-col items-center gap-1.5">{sk({ width: '70%', height: 7 })}{sk({ width: '60%', height: 15 })}</div>)}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[92, 110, 80, 104].map((tw) => <span key={tw}>{sk({ width: tw, height: 26, boxShadow: 'inset 3px 0 0 rgba(148,163,184,.25)' })}</span>)}
              </div>
            </div>
            <span className="pointer-events-none absolute" style={{ inset, border: '1px solid rgba(148,163,184,.14)' }} />
          </div>
        </div>
      </div>
      {/* 캡 · 팀 종합 한 줄 · 버튼 자리 */}
      <div className="flex items-center justify-between border-y border-white/10 py-2.5">{sk({ width: 130, height: 12 })}{sk({ width: 110, height: 12 })}</div>
      <div className="mt-cut mt-skbtn h-[46px] w-full" style={cut(10)} />
    </aside>
  );
}

/** 오른쪽 상세 — 모드 설명 패널 문법: 큰 사진 · 수치 칸 · 막대 · 키-값 · 아래 큰 버튼 */
function DetailPanel({ p, squad, staff, cap, lim = BASE_LIMITS, onAdd, onRelease, playing, onUpgrade, itemsFit = 0 }) {
  if (!p) return <EmptyDetail />;
  const owned = squad.some((x) => x.id === p.id);
  const n = tone(p.overall);
  const cost = squadCost(squad, staff);
  const after = owned ? cost - p.cost : cost + p.cost;
  const blocked = owned ? null : addBlockReason(p, squad, staff, cap, lim);
  const sum = squad.reduce((s, x) => s + x.overall, 0);
  const now = squad.length ? Math.round(sum / squad.length) : 0;
  const next = owned
    ? (squad.length > 1 ? Math.round((sum - p.overall) / (squad.length - 1)) : 0)
    : Math.round((sum + p.overall) / (squad.length + 1));
  const keys = KEYS[p.type] || KEYS.batter;
  const tr = playerTraits(p);
  const hand = HAND_LABEL(p);
  return <DetailBody p={p} squad={squad} staff={staff} cap={cap} onAdd={onAdd} onRelease={onRelease} playing={playing} onUpgrade={onUpgrade} itemsFit={itemsFit}
    owned={owned} n={n} after={after} blocked={blocked} now={now} next={next} keys={keys} tr={tr} hand={hand} />;
}

/**
 * 카드(2:3) + 바로 아래 붙은 받침(실적 줄 · 강점/약점 칩): 받침은 카드와 같은 문법 —
 * 검은 면 · 구단 네온 안쪽 테두리 · 네온 구분선 · Saira 영문 라벨 · 카드 칩 모양. 판에서 남은 높이를 재서 카드 크기를 정한다
 */
function CardWithRecord({ p, tr }) {
  const box = useRef(null);
  const baseRef = useRef(null);
  const [w, setW] = useState(0);
  /* 카드 폭이 받침 높이를 바꾸고 받침 높이가 다시 카드 폭을 바꾼다 — 칩이 한 줄과 두 줄 사이를 오가면
     두 값 사이에서 끝없이 튄다. 같은 폭이 다시 나오면 튀는 중으로 보고 넘치지 않는 작은 쪽에서 멈춘다 */
  const seen = useRef({ box: '', tried: new Set(), fixed: null });
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    seen.current = { box: '', tried: new Set(), fixed: null }; // 선수가 바뀌면 받침도 달라지니 이력을 비운다
    const fit = () => {
      const st = seen.current;
      const room = `${el.clientWidth}x${el.clientHeight}`;
      if (room !== st.box) { st.box = room; st.tried = new Set(); st.fixed = null; } // 판이 실제로 바뀌면 다시 잰다
      if (st.fixed != null) return;
      const baseH = baseRef.current?.offsetHeight || 0;
      const next = Math.max(0, Math.floor(Math.min(el.clientWidth, ((el.clientHeight - baseH) * 2) / 3)));
      if (st.tried.has(next)) { st.fixed = Math.min(...st.tried); setW(st.fixed); return; }
      st.tried.add(next);
      setW(next);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (baseRef.current) ro.observe(baseRef.current);
    return () => ro.disconnect();
  }, [p.id]); // 선수가 바뀌면 받침이 새로 그려지므로 다시 잰다
  const neon = teamNeon(p);
  const chips = [...tr.good.map((t) => [t, true]), ...tr.bad.map((t) => [t, false])];
  const inset = Math.round(w * 0.016 * 10) / 10; // 카드 속 안쪽 테두리(pk-fr)와 같은 1.6%
  const corner = Math.round(w * 0.07); // 카드 잘린 모서리와 같은 7%
  return (
    <div ref={box} className="flex min-h-0 flex-1 flex-col items-center">
      {/* 한 장짜리 긴 카드: 카드 자체 모서리 · 안쪽 테두리는 끄고(pk-long) 카드+받침 전체를 한 번에 자르고 두른다.
          카드 혼자 떠오르면 받침과 어긋나 보여서 등장 움직임도 전체에 */}
      <div key={p.id} className="pk-long relative animate-[rise_.35s_ease-out_both] bg-[#05080f]"
        style={{ width: w, '--n': neon, clipPath: `polygon(${corner}px 0,100% 0,100% calc(100% - ${corner}px),calc(100% - ${corner}px) 100%,0 100%,0 ${corner}px)` }}>
        <div className="aspect-[2/3] w-full">
          <PlayerCard player={p} reason={null} onSelect={() => {}} style={{ animation: 'none', transform: 'none' }} />
        </div>
        <div ref={baseRef} style={{ padding: `2px ${inset + 10}px ${inset + 12}px`, background: 'linear-gradient(180deg,#05080f,#070c16)' }}>
          <span className="mb-2 block h-px" style={{ background: 'linear-gradient(90deg, var(--n), color-mix(in srgb, var(--n) 15%, transparent))' }} />
          {/* 실적: 작은 영문 라벨 + 굵은 숫자 */}
          <div className="grid grid-cols-6">
            {recordCells(p).map(([k, v], i) => (
              <div key={k} className="flex flex-col items-center gap-1 py-1.5 leading-none" style={{ boxShadow: i ? 'inset 1px 0 0 rgba(255,255,255,.07)' : undefined }}>
                <span className="font-display text-[11px] font-semibold tracking-[0.08em] text-gray-400">{k}</span>
                <b className={`font-display text-[19px] font-bold tabular-nums ${v == null ? 'text-gray-600' : 'text-gray-100'}`}>{v ?? '-'}</b>
              </div>
            ))}
          </div>
          {/* 강점 · 약점: 잘린 모서리 태그 · 왼쪽 구단 네온 줄 · ▲ 강점 / ▼ 약점만 색 */}
          {chips.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {chips.map(([t, good]) => (
                <span key={t.id} className="inline-flex h-[26px] items-center gap-1.5 pl-[9px] pr-2.5"
                  style={{ clipPath: 'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)', background: 'linear-gradient(90deg, color-mix(in srgb, var(--n) 22%, transparent), rgba(5,8,15,.7))', boxShadow: 'inset 3px 0 0 var(--n)' }}>
                  <b className="text-[10px]" style={{ color: good ? '#34d399' : '#f87171' }}>{good ? '▲' : '▼'}</b>
                  <span className="text-[12.5px] font-bold text-gray-100">{t.name}</span>
                  <span className="font-display text-xs text-gray-400">{t.why}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {/* 카드+받침 전체에 한 번만: 카드 속 테두리와 같은 간격 · 같은 색 */}
        <span className="pointer-events-none absolute" style={{ inset, border: '1px solid color-mix(in srgb, var(--n) 45%, transparent)' }} />
      </div>
    </div>
  );
}

function DetailBody({ p, cap, onAdd, onRelease, playing, onUpgrade, itemsFit = 0, owned, n, after, blocked, now, next, keys, tr, hand }) {
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2 p-4" style={{ ...cut(20), '--a': n }}>
      <p className="mt-lab" style={{ '--a': n }}>{owned ? 'My Player' : 'Scouting'}</p>
      {/* 드래프트 PICK 카드 그대로 + 바로 아래 같은 폭으로 붙은 실적 줄 — 남은 높이에 맞춰 2:3 */}
      <CardWithRecord p={p} tr={tr} />
      {/* 맨 아래: 캡 · 팀 종합 을 버튼 바로 위에 붙이고, 영입할 수 없는 이유는 버튼 글자로 */}
      <div className="flex items-baseline justify-between border-y border-white/10 py-1.5 text-[12.5px] text-gray-400">
        <span>{owned ? '방출 후 남은 캡' : '영입 후 남은 캡'} <b className="ml-1 font-display text-[15px]" style={{ color: after > cap ? '#f87171' : '#fff' }}>{(cap - after).toLocaleString()} / {cap.toLocaleString()}</b></span>
        <span>팀 종합 <b className="ml-1 font-display text-[15px]" style={{ color: next >= now ? '#34d399' : '#f87171' }}>{now || '-'} → {next || '-'}</b></span>
      </div>
      <div>
        {owned
          ? (
            /* 코치진 강화 단추와 같은 모양: 큰 두 칸(강화 1.4 : 방출 1) · 아래 작은 글씨에 쓸 수 있는 아이템 수 */
            <div className="grid grid-cols-[1.4fr_1fr] gap-2">
              {onUpgrade && (
                <Btn lg a={n} pri={itemsFit > 0} disabled={!itemsFit} style={cut(12)} onClick={() => onUpgrade(p)}>
                  <span className="flex flex-col items-center leading-tight">강화 ▲<small className="text-[11px] opacity-75">{itemsFit ? `아이템 ${itemsFit}개` : '아이템 없음'}</small></span>
                </Btn>
              )}
              <Btn lg className={`text-[#ff5a67] ${onUpgrade ? '' : 'col-span-2'}`} style={cut(12)} onClick={() => onRelease(p)}>방출</Btn>
            </div>
          )
          : <Btn pri={!blocked} a={n} className={`w-full ${blocked ? 'text-[14px] !text-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,.45)]' : ''}`} style={cut(10)} disabled={!!blocked} onClick={() => onAdd(p)}>{blocked || '영입하기 ▶'}</Btn>}
      </div>
    </aside>
  );
}

const ITEM_COLOR = { training: '#7dd3fc', boost: '#34d399', ops: '#f87171', staff: '#c4b5fd', aug: '#e879f9' };

/** 아이템 탭 — 가운데 보유 아이템 카드 · 오른쪽 대상 고르기(추천 대상은 위에 ★) + 사용 */

function ItemsTab({ team, gold = 0, onShop, itemId, target, onPick, onTarget, onUse }) {
  const inv = team.items || [];
  const groups = SHOP_ITEMS.map((it) => ({ it, keys: inv.filter((x) => x.itemId === it.id).map((x) => x.key) })).filter((g) => g.keys.length);
  const g = groups.find((x) => x.it.id === itemId) || groups[0];
  const it = g?.it;
  const n = it ? ITEM_COLOR[it.cat] || '#fde047' : '#fde047';
  const squad = team.squad || [];
  const staffNow = team.staff || {};
  const recIds = it ? new Set(recommendTargets(team, it).map((p) => p.id)) : new Set();
  const list = !it ? [] : needsStaff(it)
    ? (it.staffRole === 'manager' ? staffByRole('manager') : [...staffByRole('head'), ...staffByRole('batting'), ...staffByRole('pitching')])
    : squad.filter((p) => fitsItem(it, p)).sort((a, b) => (recIds.has(b.id) - recIds.has(a.id)) || b.overall - a.overall);
  const slotOf = (t) => (t.role === 'manager' ? 'manager' : STAFF_SLOTS.find((x) => x.role === t.role)?.key);
  const after = it?.stat && target?.stats ? Math.min(110, (target.stats[it.stat] ?? 78) + it.amount) : null;
  return (
    <>
      <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#fde047' }}>
        <div className="flex items-baseline gap-3">
          <p className="mt-lab" style={{ '--a': '#fde047' }}>Items</p>
        </div>
        {groups.length === 0 ? (
          /* 가진 아이템이 없을 때: 사진 한 장 · 보유 골드 · 상점 버튼 (C안) */
          <div className="mt-cut mt-3 grid min-h-0 flex-1 place-items-center bg-cover" style={{ '--c': '16px', backgroundImage: 'linear-gradient(180deg, rgba(253,224,71,.12), rgba(5,8,15,.95) 60%), url(ui/mt/mt-pack.webp)', backgroundPosition: 'center 30%' }}>
            <div className="text-center">
              <b className="font-display text-[13px] tracking-[0.3em] text-[#fde047]">SHOP</b>
              <b className="mb-1.5 mt-2 block text-[34px] font-black text-white">아이템이 없습니다</b>
              <div className="mt-5 flex items-center justify-center gap-2.5">
                <b className="font-display text-[30px] text-[#fde047]">{gold.toLocaleString()}</b><small className="text-[13px] text-gray-400">G 보유</small>
              </div>
              <Btn pri lg a="#fde047" className="mx-auto mt-5 w-[260px]" style={cut(12)} onClick={onShop}>상점 가기 ▶</Btn>
            </div>
          </div>
        ) : (
        <div className="mt-scroll mt-3 grid min-h-0 flex-1 grid-cols-4 content-start gap-3 overflow-y-auto pr-2" style={{ gridAutoRows: '12.5rem' }}>
          {groups.map(({ it: x, keys }) => {
            const c = ITEM_COLOR[x.cat] || '#fde047';
            const on = it?.id === x.id;
            return (
              <button key={x.id} type="button" onClick={() => onPick(x.id)}
                className={`mt-cut ${on ? 'mt-frame' : ''} relative h-full w-full overflow-hidden bg-[#0b1220] bg-cover bg-center text-left transition hover:brightness-110`}
                style={{ '--c': '12px', '--a': c, backgroundImage: `url(${itemArt(x)})`, boxShadow: on ? undefined : `inset 0 0 0 1px ${c}59` }}>
                <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.5),rgba(5,8,15,0) 30%,rgba(5,8,15,.92) 68%,#05080f)' }} />
                <span className="mt-cut absolute right-2.5 top-2.5 px-2 font-display text-lg font-extrabold text-[#05080f]" style={{ '--c': '5px', background: c }}>×{keys.length}</span>
                <span className="absolute inset-x-3 bottom-2.5 block">
                  <b className="block truncate text-base font-black text-white">{x.name}</b>
                  <span className="block truncate text-[11px] text-gray-400">{x.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        )}
      </section>

      <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={{ ...cut(20), '--a': n }}>
        <p className="mt-lab" style={{ '--a': n }}>Use Item</p>
        {!it ? (() => {
          /* 아이템을 고르지 않았을 때: 우리 팀에서 가장 약한 곳과 그걸 올리는 훈련 (E안) */
          const { rows, weak, item: buy } = teamWeakness(squad);
          return (
            <>
              <b className="-mb-1 text-xl font-black text-white">우리 팀 약한 곳</b>
              {rows.map((r) => (
                <div key={r.k} className="-my-1 grid items-center gap-2 text-[13px] text-gray-300" style={{ gridTemplateColumns: '44px 1fr 34px' }}>
                  {WEAK_KO[r.k]}
                  <span className="relative block h-[5px] bg-white/[0.08]">
                    <b className="absolute inset-y-0 left-0 block" style={{ width: `${statPct(r.v)}%`, background: statColor(r.v, WEAK_COLOR[r.k]).bar }} />
                  </span>
                  <b className="text-right font-display text-[15px]" style={{ color: statColor(r.v, WEAK_COLOR[r.k]).num }}>{r.v || '-'}</b>
                </div>
              ))}
              {/* 추천 표(A안): 머리글 · 약한 곳(그 칸 색) · 추천 아이템 · 가격(금색) · 상점 버튼 */}
              {weak && buy && (
                <div className="mt-cut mt-2 px-3.5 pb-3.5 pt-2.5" style={{ '--c': '12px', background: 'rgba(5,8,15,.5)', boxShadow: `inset 0 0 0 1px ${WEAK_COLOR[weak.k]}40` }}>
                  <small className="mb-1 block font-display text-[11px] tracking-[0.2em]" style={{ color: WEAK_COLOR[weak.k] }}>RECOMMEND</small>
                  {[['약한 곳', `${WEAK_KO[weak.k]} ${weak.v}`, WEAK_COLOR[weak.k]], ['추천 아이템', buy.name, '#fff'], ['가격', `${buy.price} G`, '#fde047']].map(([k, v, c], i) => (
                    <span key={k} className={`flex items-baseline justify-between py-[7px] text-[12.5px] text-gray-400 ${i < 2 ? 'border-b border-white/[0.07]' : ''}`}>
                      {k}<b className="text-[13.5px]" style={{ color: c }}>{v}</b>
                    </span>
                  ))}
                  <Btn pri a="#fde047" className="mt-2.5 w-full" style={cut(10)} onClick={onShop}>상점 가기 ▶</Btn>
                </div>
              )}
              {!weak && <p className="text-sm text-gray-500">먼저 선수를 영입하세요.</p>}
            </>
          );
        })() : (
          <>
            <Hero img={`url(${itemArt(it)})`} name={it.name} color={n} h={130} pos="center 30%" />
            <p className="-mt-1 text-sm leading-relaxed text-gray-300">{it.desc}</p>
            <p className="mt-grp !mt-0">적용 대상</p>
            <div className="mt-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1.5">
              {list.length === 0 && <p className="text-sm text-gray-500">대상이 없습니다. 먼저 영입하세요.</p>}
              {list.map((t) => {
                const on = target?.id === t.id;
                const rec = recIds.has(t.id);
                const cur = !t.position && staffNow[slotOf(t)]?.id === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => onTarget(t)} className={`mt-row mt-cut ${on ? 'on' : ''}`}
                    style={{ gridTemplateColumns: '40px 38px minmax(0,1fr)', '--a': n }}>
                    <Portrait player={t} staff={!t.position} w={38} h={46} color={n} />
                    <b className="font-display text-2xl font-extrabold" style={{ color: n }}>{t.overall ?? '—'}</b>
                    <span className="min-w-0">
                      <b className="block truncate text-sm font-black text-white">
                        {t.name}
                        {rec && <em className="ml-1.5 text-[11px] not-italic text-amber-300">★ 추천</em>}
                        {cur && <em className="ml-1.5 text-[11px] not-italic text-gray-400">선임 중</em>}
                      </b>
                      <span className="block truncate text-[11px] text-gray-400">
                        {t.position ? `${t.position} · ${t.year} ${t.team}` : `${t.role === 'manager' ? '감독' : '코치'} · ${t.note}`}
                        {it.stat && t.stats ? ` · ${t.stats[it.stat] ?? '-'} → ${Math.min(110, (t.stats[it.stat] ?? 78) + it.amount)}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div>
              {target && after != null && <KV k={`${target.name} ${STAT_KO[it.stat] || it.stat}`} v={`${target.stats[it.stat] ?? "-"} → ${after}`} color="#34d399" />}
              <KV k="남는 수량" v={`${g.keys.length} → ${g.keys.length - 1}`} color="#fde047" />
            </div>
            <Btn pri lg a={n} className="w-full" style={cut(12)} disabled={!target} onClick={() => onUse(g.keys[0], target, slotOf(target))}>
              {target ? `${target.name}에게 사용 ▶` : '대상을 고르세요'}
            </Btn>
          </>
        )}
      </aside>
    </>
  );
}

export default function LockerScreen({ account, onSave, onBack, onShop }) {
  const [team, setTeam] = useState(account.team);
  const [tab, setTab] = useState('scout');
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [club, setClub] = useState('');
  const [pos, setPos] = useState('');
  const [sel, setSel] = useState(null);
  const [staffSlot, setStaffSlot] = useState(null); // null = 지정 해제(오른쪽에 코치진 한 줄 프로필)
  const [itemId, setItemId] = useState(null);
  const [itemTarget, setItemTarget] = useState(null);

  const squad = team.squad || [];
  const staff = team.staff || {};
  const cap = team.cap || SQUAD_CAP;
  const cost = squadCost(squad, staff);
  const lim = limitsOf(team);                 // 상점에서 넓힌 엔트리 · 외국인 한도
  const issues = squadIssues(squad, staff, cap, lim);
  const bench = team.bench || [];
  const playing = useMemo(() => playingIds(squad, bench), [squad, bench]);
  /** 출전 ↔ 벤치 바꾸기. 출전으로 올리면 같은 묶음에서 가장 약한 출전 선수를 대신 벤치로 */
  const toggleBench = (p) => {
    const set = new Set(bench);
    if (playing.has(p.id)) {
      set.add(p.id);
    } else {
      set.delete(p.id);
      // 타순은 포지션별로 뽑으므로 같은 포지션의 가장 약한 출전 선수와 먼저 바꾸고, 그래도 안 뜨면 타자 전체에서
      const groups = p.type === 'batter' ? [(x) => x.position === p.position, (x) => x.type === 'batter'] : [(x) => x.position === p.position];
      for (const same of groups) {
        const now = playingIds(squad, [...set]);
        if (now.has(p.id)) break;
        const weakest = squad.filter((x) => same(x) && x.id !== p.id && now.has(x.id)).sort((a, b) => a.overall - b.overall)[0];
        if (weakest) set.add(weakest.id);
      }
    }
    commit({ ...team, bench: [...set].filter((id) => squad.some((x) => x.id === id)) });
  };

  const commit = (next) => { setTeam(next); saveTeam(next); onSave?.(next); };
  const add = (p) => { if (!addBlockReason(p, squad, staff, cap, lim)) commit({ ...team, squad: [...squad, p] }); };
  const release = (p) => { commit({ ...team, squad: squad.filter((x) => x.id !== p.id), bench: (team.bench || []).filter((id) => id !== p.id) }); setSel(null); };
  const setStaff = (slot, person) => commit({ ...team, staff: { ...staff, [slot]: person } });
  /* 이 사람을 앉히면 캡을 넘는가 — 넘으면 버튼을 잠그고 얼마가 모자란지 알린다 */
  const staffOver = (slot, person) => {
    if (!person) return 0;
    const over = squadCost(squad, { ...staff, [slot]: person }) - cap;
    return over > 0 ? over : 0;
  };

  const autoFill = () => {
    let next = [...squad];
    /* 아직 안 앉힌 감독·코치 몫은 남겨 둔다 — 선수로 캡을 다 쓰면 코치진을 못 채운다 */
    const reserve = staffReserve(staff);
    const tryAdd = (want) => {
      const slots = lim.size - next.length;
      const budget = Math.max(40, Math.floor((cap - reserve - squadCost(next, staff)) / Math.max(1, slots)));
      const pool = ALL.filter((p) => (!want || p.position === want) && p.cost <= budget && !addBlockReason(p, next, staff, cap - reserve, lim)).sort((a, b) => b.overall - a.overall);
      if (!pool.length) return false;
      next = [...next, pool[0]];
      return true;
    };
    for (const r of POS_RULES) {
      for (let i = next.filter((p) => p.position === r.key).length; i < r.min && next.length < lim.size; i++) tryAdd(r.key);
    }
    // 자유 자리: 경기에 나가는 불펜 8명을 먼저 채우고, 그다음 수비 폭을 넓히는 야수 · 포수 순
    for (const want of ['RP', 'RP', 'OF', 'SS', 'C']) { if (next.length < lim.size) tryAdd(want); }
    while (next.length < lim.size) { if (!tryAdd(null)) break; }
    commit({ ...team, squad: next });
  };

  const SORT_DEFAULT = '스탯 높은 순';
  const [sort, setSort] = useState(''); // '' = 스탯 높은 순
  const [limit, setLimit] = useState(60);
  const matched = useMemo(() => {
    const kw = q.trim();
    // 이미 영입한 선수는 다른 시즌 버전까지 목록에서 뺀다 (같은 선수는 한 팀에 둘 수 없음)
    const owned = new Set(squad.map((p) => p.personId || p.name));
    // 드롭다운 값은 숫자(연도)일 수 있어 문자열로 맞춰 비교
    const list = ALL.filter((p) => !owned.has(p.personId || p.name)
      && (!year || String(p.year) === String(year)) && (!club || p.team === club) && (!pos || p.position === pos)
      && (!kw || p.name.includes(kw) || String(p.year).includes(kw) || p.team.includes(kw)));
    const by = {
      '스탯 높은 순': (a, b) => b.overall - a.overall || a.cost - b.cost,
      '스탯 낮은 순': (a, b) => a.overall - b.overall || a.cost - b.cost,
      'CP 높은 순': (a, b) => b.cost - a.cost || b.overall - a.overall,
      'CP 낮은 순': (a, b) => a.cost - b.cost || b.overall - a.overall,
    }[sort || SORT_DEFAULT];
    return list.sort(by);
  }, [q, year, club, pos, sort, squad]);
  const results = matched.slice(0, limit);

  const NAV = [
    { key: 'scout', label: '영입', img: 'ui/nav/locker-scout.webp' },
    { key: 'squad', label: '내 선수', img: 'ui/nav/locker-squad.webp' },
    { key: 'staff', label: '감독·코치', img: 'ui/nav/locker-staff.webp' },
    { key: 'items', label: '아이템', img: 'ui/nav/locker-items.webp' },
  ];
  const eff = staffEffect(staff);
  const listSlot = staffSlot || STAFF_SLOTS.find((x) => !staff[x.key])?.key || 'manager';
  const head = (label, sub, a, extra) => (
    <div className="flex items-baseline gap-3">
      <p className="mt-lab" style={{ '--a': a }}>{label}</p>
      {sub && <p className="text-sm text-gray-400">{sub}</p>}
      <div className="ml-auto flex gap-2">{extra}</div>
    </div>
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <style>{`${KEYFRAMES}
        .pk-long .pk { clip-path: none !important; }
        .pk-long .pk-fr { display: none; }
        .st-n.b0 { color: #f87171; } .st-n.b60 { color: #fb923c; } .st-n.b70 { color: #fde047; } .st-n.b80 { color: #34d399; }
        .st-n.b90 { color: #fbbf24; text-shadow: 0 0 8px rgba(251,191,36,.45); }
        .st-bar.b0 { background: #f87171; } .st-bar.b60 { background: #fb923c; } .st-bar.b70 { background: #fde047; } .st-bar.b80 { background: #34d399; box-shadow: 0 0 5px rgba(52,211,153,.45); }
        .st-bar.b90 { background: linear-gradient(90deg, #b45309, #fbbf24); }
        .st-v { color: #f3f4f6; text-shadow: 0 0 2px #000, 0 2px 8px #000; }
        .st-v.t75 { color: #34d399; text-shadow: 0 0 2px #000, 0 2px 8px #000, 0 0 12px rgba(52,211,153,.4); }
        .st-v.t90 { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none; -webkit-text-stroke: .6px rgba(0,0,0,.75); paint-order: stroke fill; animation: prism 3s linear infinite; }
`}</style>
      <Bg img="ui/mt/tile-locker.webp" opacity={0.6} />
      <TopBar eyebrow="My Locker" section="내 라커" team={team} account={account} onBack={onBack} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4"
        style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>

        <SideNav items={NAV} value={tab} onChange={(k) => { setTab(k); setSel(null); setItemTarget(null); }} compact>
          {(() => {
            // 인원/필수 — 필수 부족 빨강 · 필수만큼 초록 · 넘기면(자유 자리를 씀) 하늘 · 필수 0 인데 없으면 회색
            const pos = Object.fromEntries(POS_RULES.map((r) => [r.key, r]));
            const tint = (n, min) => (n < min ? '#f87171' : n > min ? '#7dd3fc' : min ? '#34d399' : '#6b7280');
            const frac = (n, d, color) => <span className="whitespace-nowrap font-display"><b className="text-[15px]" style={{ color }}>{n}</b><small className="text-[12px] text-gray-500">/{d}</small></span>;
            const cell = (key) => {
              const r = pos[key];
              const n = squad.filter((p) => p.position === key).length;
              return (
                <div key={key} className="flex h-[34px] items-center justify-between border-b border-white/[0.07] px-[5px]">
                  <span className="text-[13px] text-gray-400">{r.label}</span>{frac(n, r.min, tint(n, r.min))}
                </div>
              );
            };
            const used = freeUsed(squad);
            const fc = foreignCount(squad);
            const entryOk = squad.length === lim.size && !issues.length;
            return (
              <>
                <div className="flex items-center justify-between px-0.5 pb-2.5">
                  <p className="mt-lab" style={{ fontSize: 10 }}>Squad</p>
                  {frac(squad.length, lim.size, entryOk ? '#34d399' : squad.length > lim.size ? '#f87171' : '#e5e7eb')}
                </div>
                <div className="grid grid-cols-2 gap-x-2.5">
                  <div>{['SP', 'RP', 'C', 'OF', 'DH'].map(cell)}</div>
                  <div>{['1B', '2B', '3B', 'SS'].map(cell)}</div>
                </div>
                <div className="mt-3 flex justify-between px-[5px] text-[13px] text-gray-300">
                  <span>자유 자리 {frac(used, lim.free, used > lim.free ? '#f87171' : used === lim.free ? '#34d399' : '#e5e7eb')}</span>
                  <span>외국인 {frac(fc, lim.foreign, fc > lim.foreign ? '#f87171' : '#e5e7eb')}</span>
                </div>
              </>
            );
          })()}
        </SideNav>

        {tab === 'scout' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={cut(20)}>
            {head('Scout', null, undefined, (
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-gray-400">정렬</span>
                <div className="w-40">
                  <Select value={sort} onChange={(v) => { setSort(v); setLimit(60); }} options={['스탯 낮은 순', 'CP 높은 순', 'CP 낮은 순']} all={SORT_DEFAULT} />
                </div>
              </div>
            ))}
            <div className="mt-3 grid items-center gap-2" style={{ gridTemplateColumns: 'minmax(0,1fr) 140px 140px 120px' }}>
              <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} placeholder="선수 이름 · 연도 · 구단 검색"
                className="mt-cut w-full min-w-0 bg-transparent px-3 py-2.5 text-sm text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.16)] outline-none placeholder:font-normal placeholder:text-gray-500/80 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.26)] focus:shadow-[inset_0_0_0_1.5px_#10b981]" style={cut(6)} />
              <Select value={year} onChange={(v) => { setYear(v); setLimit(60); }} options={YEARS} all="연도 전체" />
              <Select value={club} onChange={(v) => { setClub(v); setLimit(60); }} options={TEAMS} all="구단 전체" />
              <Select value={pos} onChange={(v) => { setPos(v); setLimit(60); }} options={POS_RULES.map((r) => r.key)} all="포지션" />            </div>
            <div className="mt-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
              {results.map((p) => (
                <PlayerRow key={p.id} p={p} on={sel?.id === p.id} action="영입" blocked={addBlockReason(p, squad, staff, cap, lim)} showNote={false} teamTint
                  onPick={setSel} onAct={add} />
              ))}
              {results.length === 0 && <p className="text-sm text-gray-500">조건에 맞는 선수가 없습니다.</p>}
              {matched.length > results.length && (
                <button type="button" onClick={() => setLimit((n) => n + 60)} className="mt-btn sm mx-auto my-2">
                  {matched.length - results.length}명 더 보기
                </button>
              )}
            </div>
          </section>
        )}

        {tab === 'squad' && (
          <SquadBoard team={team} squad={squad} bench={bench}
            sel={sel} onSelect={setSel} onCommit={commit} onToggleBench={toggleBench} onRelease={release}
            onAutoFill={autoFill} autoDisabled={squad.length >= lim.size} />
        )}

        {tab === 'staff' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#c4b5fd' }}>
            {head('Staff', null, '#c4b5fd')}
            <div className="mt-3 grid h-[232px] shrink-0 grid-cols-4 gap-3">
              {STAFF_SLOTS.map((s) => {
                const cur = staff[s.key];
                const on = staffSlot === s.key;
                return (
                  <button key={s.key} type="button" onClick={() => setStaffSlot(on ? null : s.key)} aria-pressed={on}
                    aria-label={cur ? `${s.label} ${cur.name}` : `${s.label} 비어 있음`} className="group relative h-full text-left">
                    <FlipFaces value={cur} keyOf={(m) => m?.id || 'empty'} className="h-full" render={(m) => (
                      /* 드래프트 PICK 카드 테두리(.mt-frame: 잘린 모서리에 딱 맞는 대각선 + 네온 괄호) — 고른 자리는 밝게(hot), 나머지는 옅게.
                         빈 자리는 코치 실루엣 그대로 */
                      <span className={`mt-cut mt-frame ${on ? 'hot' : ''} relative block h-full w-full overflow-hidden bg-[#0b1220] bg-cover bg-top`}
                        style={{ ...cut(16), '--a': on ? '#c4b5fd' : 'rgba(196,181,253,.55)', backgroundImage: 'url(ui/mt/silhouette-coach.webp)' }}>
                        {m && (
                          /* 사진 800×600 을 높이 256(폭 341)으로 — 인물(가로 59%)을 카드 가운데 두고도 양옆이 비지 않는 크기. 사진 칸은 카드 아래 끝에서 멈춰 그라데이션 밖으로 삐져나오지 않게 */
                          <span className="absolute bottom-0 left-1/2 top-[-6px] w-[341px] bg-no-repeat transition-transform duration-300 group-hover:scale-105"
                            style={{ transform: 'translateX(-59%)', backgroundSize: 'auto 256px', backgroundPosition: 'center top', backgroundImage: `url(staff/${encodeURIComponent(m.id)}.webp), url(profiles/${encodeURIComponent(m.id)}.webp), url(ui/mt/silhouette-coach.webp)` }} />
                        )}
                        <span className="absolute inset-x-0 top-0 -bottom-0.5" style={{ background: `linear-gradient(rgba(5,8,15,.35),rgba(5,8,15,${m ? 0 : 0.6}) 30%,rgba(5,8,15,.9) 72%,#05080f 94%)` }} />
                        <span className="absolute left-3.5 top-2.5 font-display text-[22px] font-extrabold leading-none text-[#c4b5fd]" style={{ textShadow: '0 0 12px #c4b5fd88' }}>{s.label}</span>
                        {m && <b className="absolute right-3.5 top-3 font-display text-[14px] text-amber-300">Lv.{m.level || 1}</b>}
                        <span className="absolute inset-x-3.5 bottom-3">
                          <b className={`block truncate text-lg font-black ${m ? 'text-white' : 'text-gray-500'}`}>{m?.name || '비어 있음'}</b>
                          {m ? (
                            <span className="block truncate text-[12px] font-semibold text-slate-300">
                              {effTags(staffEffectOf(m)).map((e, i) => (
                                <span key={e.k}>{i > 0 && <span className="mx-1.5 text-slate-600">·</span>}{e.label} <b className="font-display text-[14px]" style={{ color: e.c }}>{e.n}</b></span>
                              ))}
                            </span>
                          ) : <span className="block text-[12px] text-gray-600">-</span>}
                        </span>
                      </span>
                    )} />
                  </button>
                );
              })}
            </div>
            <div className="mt-grp">{STAFF_SLOTS.find((s) => s.key === listSlot)?.label} 후보</div>
            {/* 후보 명함: 두 열 · 왼쪽 큰 사진(인물이 가운데 오게) · 오른쪽 직함 · 이름 · 시대 · 경력 · 효과 태그 · 가격 · 선임 */}
            <div className="mt-scroll grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-2" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
              {staffByRole(STAFF_SLOTS.find((s) => s.key === listSlot)?.role).filter((m) => staff[listSlot]?.id !== m.id).map((m) => (
                <div key={m.id} className="mt-cut relative grid h-[120px] bg-[#131c2e]" style={{ ...cut(12), gridTemplateColumns: '120px minmax(0,1fr)', boxShadow: 'inset 0 0 0 1px rgba(196,181,253,.45)' }}>
                  {/* 사진 800×600 을 높이 180 으로 · 인물(가로 59%)이 칸 가운데 오게 가로 -82px */}
                  <span className="bg-no-repeat" style={{ backgroundImage: `url(staff/${encodeURIComponent(m.id)}.webp), url(ui/mt/silhouette-coach.webp)`, backgroundSize: 'auto 180px, auto 100%', backgroundPosition: '-82px -12px, center',
                    maskImage: 'linear-gradient(90deg,#000 72%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,#000 72%,transparent)' }} />
                  <span className="flex min-w-0 flex-col gap-1.5 py-3 pl-1 pr-3.5">
                    <span className="min-w-0 pr-[130px]">
                      <small className="block font-display text-[11px] font-bold leading-tight tracking-[0.16em] text-[#c4b5fd]">{ROLE_EN[m.role]}</small>
                      <b className="text-lg font-black text-white">{m.name}</b><small className="ml-2 text-[11px] text-gray-500">{m.era}</small>
                    </span>
                    <small className="truncate text-[12px] text-gray-400">{m.note}</small>
                    <span className="text-[13px] font-semibold text-slate-300">
                      {effTags(m.effect).map((e, i) => (
                        <span key={e.k} className="whitespace-nowrap">{i > 0 && <span className="mx-[7px] text-slate-600">·</span>}{e.label} <b className="font-display text-[16px]" style={{ color: e.c }}>{e.n}</b></span>
                      ))}
                    </span>
                  </span>
                  <span className="absolute right-3 top-3 flex items-center gap-2">
                    <b className="font-display text-lg text-amber-300">{m.cost}</b>
                    <Btn sm a="#c4b5fd" disabled={staffOver(listSlot, m) > 0} onClick={() => setStaff(listSlot, m)}>
                      {staffOver(listSlot, m) > 0 ? `CP ${staffOver(listSlot, m)} 부족` : staff[listSlot] ? '교체' : '선임'}
                    </Btn>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'items' && (
          <ItemsTab team={team} gold={account.gold || 0} onShop={onShop} itemId={itemId} target={itemTarget} onPick={(id) => { const it = SHOP_ITEMS.find((x) => x.id === id); setItemId(id); setItemTarget((t) => (t && it && fitsItem(it, t) ? t : null)); }} onTarget={setItemTarget}
            onUse={(key, t, slot) => { commit(consumeItem(team, key, t, slot)); setItemTarget(null); }} />
        )}

        {tab === 'items' ? null : tab === 'staff' ? (() => {
          const VIO = '#c4b5fd';
          const slotInfo = STAFF_SLOTS.find((x) => x.key === staffSlot);
          const cur = staff[staffSlot];
          const mine = cur ? staffEffectOf(cur) : staffSlot ? {} : eff;
          const lv = cur?.level || 1;
          const tickets = team.staffTickets || 0;
          const shown = Object.entries(eff).filter(([, v]) => v);
          const size = (k, v) => (k === 'steal' ? v * 100 : v);
          const maxV = Math.max(1, ...shown.map(([k, v]) => size(k, v)));
          const upgrade = () => {
            if (!cur || tickets <= 0 || lv >= STAFF_LEVEL_MAX) return;
            commit({ ...team, staffTickets: tickets - 1, staff: { ...staff, [staffSlot]: { ...cur, level: lv + 1 } } });
          };
          return (
            <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3 p-5" style={{ ...cut(20), '--a': VIO }}>
              <p className="mt-lab" style={{ '--a': VIO }}>Staff Effect</p>
              <h2 className="-mt-1 text-[26px] font-black text-white">코치진 효과</h2>
              {/* 기여도 막대: 전체 효과 중 선택한 코치 몫을 밝게 */}
              <div className="flex flex-col gap-2">
                {shown.map(([k, v]) => (
                  <div key={k} className="grid items-center gap-2.5 text-[13px] text-gray-300" style={{ gridTemplateColumns: '50px 1fr 50px' }}>
                    <span>{EFF_LABEL[k]}</span>
                    <span className="relative block h-[5px] bg-white/[0.08]">
                      <i className="absolute inset-y-0 left-0 block" style={{ width: `${(size(k, v) / maxV) * 100}%`, background: statColor((size(k, v) / maxV) * 100, EFF_COLOR[k]).bar, opacity: 0.45 }} />
                      <i className="absolute inset-y-0 left-0 block transition-[width] duration-300" style={{ width: `${(size(k, mine[k] || 0) / maxV) * 100}%`, background: statColor((size(k, mine[k] || 0) / maxV) * 100, EFF_COLOR[k]).bar }} />
                    </span>
                    <b className="text-right font-display text-base text-white">+{k === 'steal' ? `${Math.round(v * 100)}%p` : v}</b>
                  </div>
                ))}
                {!shown.length && <span className="text-sm text-gray-600">-</span>}
              </div>
              <div className="h-px shrink-0" style={{ background: `linear-gradient(90deg,${VIO}80,transparent)` }} />

              {/* 명함: 오른쪽 절반은 사진, 왼쪽에 자리 · 이름 · 시대 · 경력 · 효과 수치 */}
              {!staffSlot ? (
                <div className="flex flex-col gap-2">
                  {STAFF_SLOTS.map((x) => {
                    const m = staff[x.key];
                    return (
                      <button key={x.key} type="button" onClick={() => setStaffSlot(x.key)}
                        className="mt-cut grid items-center gap-3 p-2 text-left hover:brightness-125" style={{ ...cut(10), gridTemplateColumns: '56px minmax(0,1fr) auto', background: 'rgba(255,255,255,.04)' }}>
                        <span className="mt-cut block h-[66px] bg-[#0b1220] bg-cover" style={{ ...cut(7), backgroundPosition: '60% 25%', backgroundImage: m ? `url(staff/${encodeURIComponent(m.id)}.webp), url(ui/mt/silhouette-coach.webp)` : 'url(ui/mt/silhouette-coach.webp)', opacity: m ? 1 : 0.35 }} />
                        <span className="min-w-0">
                          <span className="block font-display text-[11px] tracking-[0.2em]" style={{ color: VIO }}>{x.label}</span>
                          <b className={`block truncate text-[19px] font-black ${m ? 'text-white' : 'text-gray-600'}`}>{m ? m.name : '-'}</b>
                          {m && <span className="block truncate text-[12px] text-gray-400">{m.era} · {m.contracted ? '계약서' : `${m.cost} CP`}</span>}
                        </span>
                        {m && <b className="self-start font-display text-[14px] text-amber-300">Lv.{m.level || 1}</b>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                (() => {
                  const m = cur;
                  if (!m) return <div className="mt-cut grid h-[230px] shrink-0 place-items-center text-sm text-gray-600" style={{ ...cut(14), background: 'rgba(255,255,255,.03)' }}>{slotInfo?.label} -</div>;
                  const mLv = m.level || 1;
                  return (
                    <div className="mt-cut relative h-[230px] shrink-0 overflow-hidden" style={{ ...cut(14), background: '#140f24', boxShadow: 'inset 0 0 0 1px rgba(196,181,253,.35)' }}>
                      <span className="absolute inset-y-0 right-0 w-[62%] bg-cover" style={{ backgroundPosition: '60% 20%', backgroundImage: `url(staff/${encodeURIComponent(m.id)}.webp), url(ui/mt/silhouette-coach.webp)` }} />
                      <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#140f24 40%,rgba(20,15,36,.85) 52%,rgba(20,15,36,0) 74%)' }} />
                      <div className="absolute inset-y-3.5 left-4 flex w-[60%] flex-col gap-0.5">
                        <span className="font-display text-[12px] tracking-[0.24em]" style={{ color: VIO }}>{slotInfo?.label}</span>
                        <b className="text-[28px] font-black leading-tight text-white">{m.name}</b>
                        <span className="text-[12px] text-gray-400">{m.era}{m.contracted ? ' · 계약서' : ` · ${m.cost} CP`}</span>
                        <span className="mt-0.5 text-[12.5px] leading-snug text-gray-300">{m.note}</span>
                        <div className="mt-auto flex flex-col gap-0.5">
                          {Object.entries(staffEffectOf(m)).map(([k, v]) => (
                            <span key={k} className="flex items-baseline gap-1.5 text-[13px] text-gray-300">
                              {EFF_LABEL[k]}<b className="font-display text-[17px]" style={{ color: VIO }}>+{k === 'steal' ? `${Math.round(v * 100)}%p` : v}</b>
                              {mLv > 1 && <small className="font-display text-[12px] text-emerald-300">▲{k === 'steal' ? `${mLv - 1}%p` : mLv - 1}</small>}
                            </span>
                          ))}
                        </div>
                      </div>
                      <b className="absolute right-3 top-3 bg-[#05080f]/70 px-2 font-display text-[15px] text-amber-300">Lv.{mLv}</b>
                    </div>
                  );
                })()
              )}

              {staffSlot && <div className="mt-auto grid grid-cols-[1.4fr_1fr] gap-2">
                <Btn lg a={VIO} pri={!!cur && tickets > 0 && lv < STAFF_LEVEL_MAX} disabled={!cur || tickets <= 0 || lv >= STAFF_LEVEL_MAX} style={cut(12)} onClick={upgrade}>
                  <span className="flex flex-col items-center leading-tight">강화 ▲<small className="text-[11px] opacity-75">{lv >= STAFF_LEVEL_MAX ? 'MAX' : `강화권 ${tickets}장`}</small></span>
                </Btn>
                <Btn lg className="text-[#ff5a67]" style={cut(12)} disabled={!cur} onClick={() => cur && setStaff(staffSlot, null)}>해임</Btn>
              </div>}
            </aside>
          );
        })()
          : (
          <DetailPanel p={sel} squad={squad} staff={staff} cap={cap} lim={lim} onAdd={add} onRelease={release} playing={playing}
            itemsFit={!sel ? 0 : (team.items || []).filter((x) => { const it = SHOP_ITEMS.find((i) => i.id === x.itemId); return it?.stat && fitsItem(it, sel); }).length}
            onUpgrade={(x) => { setItemTarget(x); setItemId(null); setTab('items'); }} />
        )}
      </div>
    </div>
  );
}
