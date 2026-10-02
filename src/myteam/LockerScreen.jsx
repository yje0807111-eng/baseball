/*
 * 내 라커 — 위 탭(영입 · 내 선수 · 보관함 · 감독·코치 · 아이템) · 넓은 목록 · 오른쪽 상세(유리 결)
 *  영입(L1): 검색 + 후보 리스트 + 오른쪽 상세
 *  내 선수(L2): 포지션 그룹 목록 + 오른쪽 상세(방출)
 *  감독·코치(L6): 네 자리 슬롯 + 후보 리스트 + 효과 합계
 *  아이템: 상점에서 산 훈련 · 계약서 — 고른 뒤 선수 · 감독/코치에게 사용 (준비 카드는 경기 전 정비에서)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { SQUAD_CAP, CAP_LOUD, BASE_LIMITS, POS_RULES, STAFF_SLOTS, squadCost, foreignCount, freeUsed, addBlockReason, swapCandidates, swapPick, swapBlockReason, clubAddReason, clubMax, squadIssues, limitsOf, CLUB_MAX } from './rules.js';
import { STAFF, staffByRole, staffRules, staffReserve, styleOf, ruleText, ruleDesc, ruleValue, ruleCat, levelMul, STAFF_LEVEL_MAX } from './staff.js';
import { saveTeam, recruitPlayer, releasePlayer, swapPlayer, storePlayer, enterFromClub, releaseFromClub, bumpWeek, savePreset, loadPreset } from './store.js';
import { presetCount, presetIssue, PRESET_BASE, PRESET_EXTRA_MAX } from './presets.js';
import { priceOf, refundOf, isFreeFill, dailyDeals, todayKey, marketPriceOf, quoteOf, dayIndex } from './market.js';
import { SHOP_ITEMS, itemArt, needsStaff, fitsItem, recommendTargets, consumeItem, trainLevel, trainRate, trainHit, TRAIN_MAX, STAT_KO, teamWeakness, WEAK_KO, WEAK_COLOR } from './shop.js';
import { playingIds } from './match.js';
import { posColor, statColor, statOf, statPct, teamNeon } from './teamColor.js';
import { createPortal } from 'react-dom';
import { UiStyle, GlassBg, TopBar, TopTabs, Btn, Portrait, Hero, KV, Pop } from './ui.jsx';
import { Count, Burst, flyGhost, useListIntro, navTo } from '../ui/motion.jsx';

/**
 * 빈 보관함 — 아이템 탭 빈 화면(사진 한 장 · 제목 · 단추 하나 '상점 가기')과 같은 모양.
 * 채울 자리 20칸을 옅게 보여 주고(카드 앨범처럼), 단추는 영입 하나 — 엔트리가 꽉 찬 뒤 산 선수가 보관함으로 온다.
 * (내 선수 '보관' · 드래프트 기념 카드도 보관함으로 오지만, 빈 화면에서 고를 일은 아니라 단추로 두지 않음)
 */
function ClubEmpty({ max, onScout }) {
  return (
    <div className="mt-cut mt-3 grid min-h-0 flex-1 place-items-center bg-cover"
      style={{ '--c': '16px', backgroundImage: 'linear-gradient(180deg, rgba(52,211,153,.12), rgba(5,8,15,.95) 62%), url(ui/mt/tile-locker.webp)', backgroundPosition: 'center 35%' }}>
      <div className="fx-rise flex flex-col items-center rounded-[28px] px-10 py-7 text-center" style={{ background: 'radial-gradient(closest-side, rgba(5,8,15,.82), rgba(5,8,15,.55) 70%, transparent)' }}>
        {/* 밝은 유니폼 위에서도 글자가 읽히게 뒤에 옅은 어둠 */}
        <b className="text-t1 font-black text-white [text-shadow:0_2px_12px_rgba(0,0,0,.9)]">보관함 비어 있음</b>
        <span className="mt-3 flex items-baseline gap-2">
          <b className="font-display text-t1 text-[#34d399]">0</b><small className="text-t3 text-gray-400">/ {max}명</small>
        </span>
        <span className="mt-4 grid grid-cols-10 gap-1.5" aria-hidden="true">
          {Array.from({ length: max }, (_, i) => (
            <i key={i} className="block h-8 w-6 rounded-[5px]" style={{ background: 'rgba(52,211,153,.05)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,.32)' }} />
          ))}
        </span>
        <Btn pri lg data-sfx="navTab" className="mx-auto mt-6 w-[260px]" style={cut(12)} onClick={onScout}>영입 가기 ▶</Btn>
      </div>
    </div>
  );
}
import SquadBoard from './SquadBoard.jsx';
import { KEYFRAMES } from '../KboAugmentDraft.jsx';
import { playerTraits, HAND_LABEL } from './traits.js';
import { artId } from '../data/artAlias.js';

// 영입 풀은 구단 시즌 기록만 (국가대표 대회 버전은 뺀다)
/* 같은 선수 · 같은 시즌이 구단 시즌과 레전드 묶음(2000년대 · 에이스 · MVP …)에 겹쳐 들어 있다 — 능력치가 같아 시장엔 한 장만.
   그림이 붙은 구단 시즌 쪽을 남긴다(레전드 묶음 id 에는 그림이 없다). sort 는 안정 정렬이라 나머지 순서는 그대로 */
const ALL = [...SERIES.filter((s) => s.kind !== 'national')
  .sort((a, b) => (a.kind === 'team' ? 0 : 1) - (b.kind === 'team' ? 0 : 1))
  .flatMap((s) => s.players)
  .reduce((m, p) => (m.has(`${p.personId}|${p.year}`) ? m : m.set(`${p.personId}|${p.year}`, p)), new Map())
  .values()];
const YEARS = [...new Set(ALL.map((p) => p.year))].sort((a, b) => b - a);
const TEAMS = [...new Set(ALL.map((p) => p.team))].sort();
const cut = (n) => ({ '--c': `${n}px` });
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const KEYS = { pitcher: [['구위', 'stuff'], ['제구', 'control'], ['체력', 'stamina'], ['안정', 'stability']], batter: [['파워', 'power'], ['컨택', 'contact'], ['주루', 'speed'], ['수비', 'defense']] };
/* 코치진 효과 갈래(staff.js ruleCat) — 이름 · 색. 효과 한 줄 "타자 컨택 +6" 은 숫자만 갈래 색 */
const EFF_COLOR = { bat: '#34d399', field: '#60a5fa', pitch: '#f87171', run: '#fb923c', ops: '#fbbf24', all: '#c4b5fd' };
/* 감독 색깔 표 색(staff.js STYLES) */
const STYLE_COLOR = { attack: '#f87171', defense: '#60a5fa', starter: '#f472b6', bullpen: '#a78bfa', care: '#fbbf24', trust: '#34d399', develop: '#a3e635', foreign: '#22d3ee', run: '#fb923c', data: '#94a3b8' };
/** 감독 · 코치 동그라미 사진 — 자리 카드(800×600, 얼굴 가로 59% · 세로 42% · 폭 17%)를 얼굴이 동그라미 60% 차게 */
function StaffFace({ m, size = 50 }) {
  const w = size * 3.5;
  return (
    <span className="block shrink-0 rounded-full bg-[#0b1220] bg-no-repeat" style={{ width: size, height: size, boxShadow: `0 0 0 2px #0b1220, 0 0 0 3px ${m ? STYLE_COLOR[m.style] || '#c4b5fd' : 'rgba(196,181,253,.3)'}`,
      backgroundImage: m ? `url(staff/${encodeURIComponent(m.id)}.webp)` : 'url(ui/mt/silhouette-coach.webp)', backgroundSize: m ? `${w}px auto` : 'cover',
      backgroundPosition: m ? `${size / 2 - 0.59 * w}px ${size / 2 - 0.42 * w * 0.75}px` : 'center', opacity: m ? 1 : 0.4 }} />
  );
}
const effTags = (rules) => rules.map((x, i) => ({ k: `${x.who || x.team}-${x.stat || ''}-${i}`, c: EFF_COLOR[ruleCat(x)], desc: ruleDesc(x), ...ruleText(x) }));
const POS_FULL = { SP: '선발 투수', RP: '불펜 투수', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', OF: '외야수', DH: '지명타자' };
const ROW_COLS = '56px 64px 230px repeat(4,minmax(0,1fr)) 84px 124px 92px';
const GOLD = '#fde047';
const WARN = '#fbbf24';

/*
 * 선수 카드 그림(cards/ → profiles/ → 실루엣)을 미리 받아 둔다: 목록에서 마우스를 올리면(preloadCard) 상세 판 카드가 누르는 순간 바로 뜬다.
 */
const cardCache = new Map(); // id → Promise<url>
function preloadCard(p) {
  if (!p || cardCache.has(p.id)) return cardCache.get(p?.id);
  const tryLoad = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(src); im.onerror = no; im.src = src; });
  const id = encodeURIComponent(artId(p.id)); // 그림이 없는 시즌은 같은 구단 다른 시즌 것을 빌린다
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
        className={`relative flex h-7 w-full shrink-0 items-center justify-between pl-3 pr-2 text-left text-t3 leading-none ${on ? 'text-emerald-300' : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'}`}
        style={{ background: on ? 'rgba(16,185,129,.12)' : undefined, boxShadow: on ? 'inset 2px 0 0 #10b981' : undefined, fontWeight: on ? 700 : 500 }}>
        {label}{on && <span aria-hidden="true" className="text-t4">✓</span>}
      </button>
    );
  };
  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={`mt-cut flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2.5 text-t3 ${value ? 'text-white' : 'text-gray-300'}`}
        style={{ ...cut(6), background: open ? 'rgba(16,185,129,.16)' : 'rgba(255,255,255,.06)', boxShadow: open || value ? 'inset 0 0 0 1px rgba(16,185,129,.55)' : undefined }}>
        <span className="truncate">{value || all}</span>
        <span className="font-display text-t4 text-emerald-400 transition" style={{ transform: open ? 'rotate(180deg)' : undefined }}>▼</span>
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

/** 선수 한 줄 — 동그란 얼굴(구단 색 테) · 은빛 종합 · 이름 · 능력 넷 · CP · 값(특가면 표시) · 단추. 고르면 초록으로 떠오른다 */
function PlayerRow({ p, on, action, blocked, onPick, onAct, bench, onBench, stored = false, price = null, capQuiet = false, more = null, className = '', style = null }) {
  const keys = KEYS[p.type] || KEYS.batter;
  const q = stored ? null : quoteOf(p);
  const deal = q && price != null && price < q.price;
  return (
    <div role="button" onClick={() => onPick(p)} onPointerEnter={() => preloadCard(p)} className={`mt-row h-[72px] cursor-pointer ${on ? 'on' : ''} ${className}`} style={{ gridTemplateColumns: ROW_COLS, gap: 14, padding: '0 14px 0 8px', ...style }}>
      <Portrait player={p} w={52} h={52} round t={teamNeon(p)} />
      <b className="mt-ovr text-center font-display text-t1 font-extrabold leading-none">{p.overall}</b>
      <span className="min-w-0">
        <b className="block truncate text-t2 font-black text-white">
          {p.name}
          {p.isForeign && <em className="ml-2 align-middle text-t4 not-italic" style={{ color: WARN }}>외국인</em>}
          {trainLevel(p) > 0 && <em className="ml-2 align-middle font-display text-t3 not-italic text-amber-300">+{trainLevel(p)}</em>}
          {more && (
            <em className="ml-2 rounded-full px-2 py-px align-middle text-t4 font-bold not-italic"
              style={{ color: more.deal ? WARN : '#a7f3d0', background: more.deal ? 'rgba(251,191,36,.14)' : 'rgba(52,211,153,.12)' }}>
              다른 시즌 {more.n}{more.deal ? ' · 특가' : ''} {more.open ? '▴' : '▾'}
            </em>
          )}
          {onBench && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onBench(p); }} title={bench ? '눌러서 출전 선수로' : '눌러서 벤치로'}
              className={`ml-2 rounded-full px-2 py-px align-middle text-t4 font-bold ${bench ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35'}`}>
              {bench ? '벤치 ↑' : '출전 ●'}
            </button>
          )}
        </b>
        <small className="mt-0.5 block truncate text-t4 text-gray-400">{POS_FULL[p.position]} · {p.year} {p.team}</small>
      </span>
      {/* 능력치 넷 — 칸마다 이름 · 큰 숫자 · 막대 */}
      {keys.map(([label, k]) => {
        const v = p.stats?.[k] ?? 0;
        const c = statOf(k, v);
        return (
          <span key={k} className="flex min-w-0 flex-col gap-1 rounded-xl bg-white/[0.04] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
            <span className="flex items-baseline justify-between">
              <span className="text-t4 text-gray-400">{label}</span>
              <b className="font-display text-t2 leading-none" style={{ color: c.num }}>{v}</b>
            </span>
            <i className="relative block h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <b className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${statPct(v)}%`, background: c.bar }} />
            </i>
          </span>
        );
      })}
      {/* CP — 캡에 여유가 있을 때(90% 전)는 흐리게: 초반엔 골드가 막는다 */}
      <span className={`justify-self-center rounded-full px-2.5 py-1 font-display text-t3 font-bold ${capQuiet ? 'bg-white/[0.04] text-gray-400' : 'bg-amber-400/10 text-amber-300 shadow-[inset_0_0_0_1px_rgba(251,191,36,.35)]'}`}>{p.cost} CP</span>
      {stored /* 보관함 선수는 이미 가진 선수 — 영입가 대신 */
        ? <b className="text-right text-t3 text-gray-400">{p.memento ? '기념 카드' : '보유'}</b>
        : (
          <span className="flex flex-col items-end leading-tight">
            {deal && <small className="rounded-full bg-amber-400/15 px-2 text-t4 font-bold" style={{ color: WARN }}>특가</small>}
            <b className="font-display text-t2" style={{ color: GOLD }}>{(deal ? price : q.price).toLocaleString()}<small className="ml-0.5 text-t4 text-gray-400">G</small></b>
          </span>
        )}
      <Btn pri={on} disabled={!!blocked} title={blocked || ''} onClick={(e) => { e.stopPropagation(); onAct(p); }} style={{ minHeight: 42, padding: '0 16px' }}>{action}</Btn>
    </div>
  );
}

/** 강화 확률 색 — 높으면 초록, 낮을수록 노랑 → 주황 */
const rateColor = (r) => (r >= 90 ? '#34d399' : r >= 70 ? '#fde047' : '#fb923c');

/** 선수를 고르기 전 오른쪽 상세 — 고른 뒤와 같은 자리에 숨 쉬는 블록 */
function EmptyDetail() {
  let i = 0;
  const sk = (style, cls = '') => <span className={`mt-sk ${cls}`} style={{ ...style, '--i': i++ }} />;
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={cut(22)} aria-label="고른 선수">
      <p className="mt-lab" style={{ '--a': '#64748b' }}>선수 정보</p>
      {sk({ flex: 1, minHeight: 0, borderRadius: 18 })}
      <div className="grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((k) => <span key={k}>{sk({ height: 52, borderRadius: 14 })}</span>)}</div>
      <div className="flex flex-col gap-2.5">{[0, 1, 2].map((k) => <span key={k} className="flex justify-between">{sk({ width: 80, height: 12, borderRadius: 6 })}{sk({ width: 70, height: 12, borderRadius: 6 })}</span>)}</div>
      <div className="mt-skbtn h-[62px] w-full rounded-2xl" />
    </aside>
  );
}

/** 오른쪽 상세 — 모드 설명 패널 문법: 큰 사진 · 수치 칸 · 막대 · 키-값 · 아래 큰 버튼 */
function DetailPanel({ p, squad, club = [], clubCap = CLUB_MAX, staff, cap, lim = BASE_LIMITS, gold = 0, priceFor = priceOf, outId = null, onOut, onAdd, onSwap, onRelease, onStore, onEnter, playing, onUpgrade, itemsFit = 0, fresh = null }) {
  if (!p) return <EmptyDetail />;
  const owned = squad.some((x) => x.id === p.id);
  const stored = !owned && club.some((x) => x.id === p.id); // 보관함 선수 — 엔트리로 들이는 데 골드가 들지 않는다
  const n = tone(p.overall);
  const cost = squadCost(squad, staff);
  const pay = stored ? null : gold; // 보관함 선수는 골드를 따지지 않는다
  const price = stored ? 0 : priceFor(p); // 오늘의 특가면 그 값
  /* 엔트리가 꽉 찼으면 한 명을 내보내며 들인다 — 엔트리 전원이 후보(같은 포지션 → 같은 투타 → 나머지, 약한 순).
     오른쪽엔 막히지 않는 앞 셋만 추천으로, 전원은 '더보기' 팝업에서. 기본 선택 = 막히지 않는 첫 후보 */
  const toClub = !owned && !stored && squad.length >= lim.size && club.length < clubCap;
  const swap = !owned && !toClub && squad.length >= lim.size;
  const pool = swap ? swapCandidates(p, squad).map((x) => ({ x, why: swapBlockReason(p, x, squad, staff, cap, lim, pay, price) })) : [];
  const out = swap ? (pool.find((o) => o.x.id === outId) || pool.find((o) => !o.why) || pool[0])?.x || null : null;
  const ok = pool.filter((o) => !o.why).map((o) => o.x);
  const cands = [...new Set([out, ...(ok.length ? ok : pool.map((o) => o.x))].filter(Boolean))].slice(0, 3); // 팝업에서 고른 선수는 맨 앞에
  const after = owned ? cost - p.cost : cost + p.cost - (out?.cost || 0);
  const blocked = owned ? null : toClub ? clubAddReason(p, squad, club, pay, price, clubCap) : swap ? swapBlockReason(p, out, squad, staff, cap, lim, pay, price) : addBlockReason(p, squad, staff, cap, lim, pay, price);
  const mine = owned ? squad.find((x) => x.id === p.id) : stored ? club.find((x) => x.id === p.id) : null;
  /* 환급: 엔트리 · 보관함 선수는 그 선수 몫, 영입 교체면 내보내는 선수 몫(보관함으로 들이는 교체는 나가는 선수가 보관함으로 가니 없음) */
  const refund = mine ? refundOf(mine) : out && !stored ? refundOf(out) : 0;
  const sum = squad.reduce((s, x) => s + x.overall, 0);
  const now = squad.length ? Math.round(sum / squad.length) : 0;
  const next = owned
    ? (squad.length > 1 ? Math.round((sum - p.overall) / (squad.length - 1)) : 0)
    : out ? Math.round((sum - out.overall + p.overall) / squad.length)
      : Math.round((sum + p.overall) / (squad.length + 1));
  const keys = KEYS[p.type] || KEYS.batter;
  const tr = playerTraits(p);
  const hand = HAND_LABEL(p);
  return <DetailBody p={p} squad={squad} staff={staff} cap={cap} onAdd={onAdd} onRelease={onRelease} playing={playing} onUpgrade={onUpgrade} itemsFit={itemsFit}
    owned={owned} n={n} after={after} blocked={blocked} now={now} next={next} keys={keys} tr={tr} hand={hand}
    gold={gold} price={price} refund={refund} cands={cands} pool={pool} out={out} onOut={onOut} onSwap={onSwap}
    stored={stored} clubFull={club.length >= clubCap} clubN={club.length} clubCap={clubCap} toClub={toClub} onStore={onStore} onEnter={onEnter} fresh={fresh} />;
}

/** 반짝이 카드 — 선수 카드 그림 · 이름 · 은빛 종합. 빛줄기가 지나가고 마우스를 따라 기울어진다 */
function HoloCard({ p }) {
  const ref = useRef(null);
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let live = true;
    setSrc(null);
    preloadCard(p).then((u) => { if (live) setSrc(u); });
    return () => { live = false; };
  }, [p.id]);
  useEffect(() => {
    const move = (e) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      const near = Math.abs(x) < 1.2 && Math.abs(y) < 1.2;
      el.style.setProperty('--ry', `${near ? x * 16 : -6}deg`);
      el.style.setProperty('--rx', `${near ? -y * 12 : 2}deg`);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return (
    /* 떠오르는 움직임은 바깥 틀에 — 카드 자체의 기울기(transform)와 겹치지 않게 */
    <div key={p.id} className="flex min-h-0 flex-1 animate-[rise_.35s_ease-out_both] flex-col">
      <div ref={ref} className="mt-holo min-h-0 flex-1" style={{ '--t': teamNeon(p), backgroundImage: src ? `url(${src})` : undefined }}>
        <span className="bottom-3.5 left-4 flex flex-col">
          <small className="text-t4 text-gray-300">{POS_FULL[p.position]} · {p.year} {p.team}</small>
          <b className="text-t1 font-black leading-tight text-white">{p.name}</b>
        </span>
        <b className="mt-ovr bottom-1.5 right-4 font-display text-[52px] font-extrabold leading-none">{p.overall}</b>
      </div>
    </div>
  );
}

/**
 * 내보낼 선수 전원 — 같은 포지션 · 같은 투타 · 그 밖 세 묶음, 묶음마다 약한 순.
 * 막히는 선수(필수 포지션 최소 · 캡 · 골드 등)는 이유를 달고 흐리게. 고르면 닫히고 오른쪽 추천 맨 앞에 선다
 */
function OutPicker({ p, pool, out, stored, onPick, onClose }) {
  const kind = p.type === 'pitcher' ? '투수' : '타자';
  const groups = [
    ['같은 포지션', pool.filter((o) => o.x.position === p.position)],
    [`다른 ${kind}`, pool.filter((o) => o.x.position !== p.position && o.x.type === p.type)],
    [p.type === 'pitcher' ? '타자' : '투수', pool.filter((o) => o.x.type !== p.type)],
  ].filter(([, g]) => g.length);
  /* 포털로 — 오른쪽 유리 판(backdrop-filter)이 fixed 의 기준이 되어 판 안에 갇히지 않게 */
  return createPortal(
    <Pop eyebrow="교체 영입" title="내보낼 선수" sub={`${POS_FULL[p.position]} · ${p.year} ${p.name}`} a="#f87171" width={880} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {groups.map(([label, g]) => (
          <div key={label}>
            <p className="pb-1.5 text-t4 font-bold text-gray-400">{label} <span className="font-display text-gray-500">{g.length}</span></p>
            <div className="grid grid-cols-2 gap-1.5">
              {g.map(({ x, why }) => {
                const on = x.id === out?.id;
                const back = stored ? 0 : refundOf(x);
                return (
                  <button key={x.id} type="button" disabled={!!why} onClick={() => onPick(x.id)} aria-pressed={on} title={why || ''}
                    className="mt-cut grid items-center gap-3 px-2.5 py-2 text-left transition enabled:hover:bg-white/[0.09] disabled:cursor-not-allowed"
                    style={{ ...cut(10), gridTemplateColumns: '40px 34px minmax(0,1fr) auto', opacity: why ? 0.45 : 1, background: on ? 'rgba(248,113,113,.16)' : 'rgba(255,255,255,.04)', boxShadow: on ? 'inset 0 0 0 1px rgba(248,113,113,.7)' : 'inset 0 1px 0 rgba(255,255,255,.06)' }}>
                    <Portrait player={x} w={40} h={40} round t={teamNeon(x)} />
                    <b className="mt-ovr text-center font-display text-t2 font-extrabold leading-none">{x.overall}</b>
                    <span className="min-w-0">
                      <b className="block truncate text-t3" style={{ color: on ? '#fecaca' : '#fff' }}>{x.name}</b>
                      <small className="block truncate text-t4 text-gray-400">{POS_FULL[x.position]} · {x.year} {x.team}</small>
                    </span>
                    <span className="flex flex-col items-end leading-tight">
                      <b className="font-display text-t4 text-amber-300">{x.cost} CP</b>
                      <small className="text-t4" style={{ color: why ? '#fca5a5' : '#9ca3af' }}>{why || (back ? `+${back.toLocaleString()} G` : '환급 없음')}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Pop>,
    document.body,
  );
}

function DetailBody({ p, cap, onAdd, onRelease, playing, onUpgrade, itemsFit = 0, owned, n, after, blocked, now, next, keys, tr, hand, gold = 0, price = 0, refund = 0, cands = [], pool = [], out = null, onOut, onSwap,
  stored = false, clubFull = false, clubN = 0, clubCap = CLUB_MAX, toClub = false, onStore, onEnter, fresh = null }) {
  const [outAll, setOutAll] = useState(false); // 내보낼 선수 전원 팝업
  const goldAfter = owned || stored ? gold + (stored ? 0 : refund) : gold + refund - price;
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3.5 p-5" style={cut(22)}>
      <p className="mt-lab">{owned ? '내 선수 정보' : stored ? '보관함 선수' : '영입 후보 정보'}</p>
      {fresh ? (
        <div key={fresh} className="relative">
          <HoloCard p={p} />
          <span className="lk-ring pointer-events-none absolute inset-0" aria-hidden="true" />
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <b className="fx-stamp -rotate-12 rounded-md px-4 py-1 font-display text-t1 font-extrabold" style={{ '--d': '120ms', color: '#1c1203', background: 'linear-gradient(180deg,#fde68a,#e3b24a)', boxShadow: '0 0 28px rgba(245,210,122,.8)' }}>영입</b>
            <Burst n={18} spread={130} delay={260} sfx="rewardS" />
          </span>
        </div>
      ) : <HoloCard p={p} />}
      {/* 능력 넷 — 2×2 칸 · 숫자 · 가는 막대 */}
      <div className="grid shrink-0 grid-cols-2 gap-2">
        {keys.map(([label, k]) => {
          const v = p.stats?.[k] ?? 0;
          return (
            <div key={k} className="mt-tile flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between"><span className="text-t4 text-gray-400">{label}</span><b className="font-display text-t2 leading-none text-white">{v}</b></span>
              <span className="block h-1 overflow-hidden rounded-full bg-white/[0.08]"><i className="block h-full rounded-full" style={{ width: `${statPct(v)}%`, background: statOf(k, v).bar }} /></span>
            </div>
          );
        })}
      </div>
      {/* 강점 · 약점 */}
      {(tr.good.length + tr.bad.length > 0) && (
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {[...tr.good.map((t) => [t, true]), ...tr.bad.map((t) => [t, false])].slice(0, 4).map(([t, good]) => (
            <span key={t.id} className="mt-chip" style={{ '--a': good ? '#34d399' : '#f87171' }} title={t.why}>
              <b style={{ color: good ? '#34d399' : '#f87171' }}>{good ? '▲' : '▼'}</b>{t.name}
            </span>
          ))}
        </div>
      )}
      {/* 교체 영입: 내보낼 선수 — 추천 셋 · 전원은 더보기 팝업 */}
      {out && (
        <div>
          <p className="flex items-baseline pb-1 text-t4 text-gray-400">
            내보낼 선수 · 추천
            {pool.length > cands.length && (
              <button type="button" onClick={() => setOutAll(true)} className="ml-auto font-bold text-gray-300 hover:text-white">더보기 {pool.length} ›</button>
            )}
          </p>
          <div className="grid grid-cols-3 gap-1">
            {cands.map((x) => {
              const on = x.id === out.id;
              const back = stored ? 0 : refundOf(x); // 보관함에서 들이면 나가는 선수는 보관함으로
              return (
                <button key={x.id} type="button" onClick={() => onOut?.(x.id)} aria-pressed={on}
                  className="mt-cut min-w-0 px-2.5 py-1.5 text-left"
                  style={{ ...cut(10), background: on ? 'rgba(248,113,113,.16)' : 'rgba(255,255,255,.05)', boxShadow: on ? 'inset 0 0 0 1px rgba(248,113,113,.7)' : 'inset 0 1px 0 rgba(255,255,255,.06)' }}>
                  <b className="block truncate text-t4" style={{ color: on ? '#fecaca' : '#e5e7eb' }}>{x.name}</b>
                  <small className="block truncate font-display text-t4 text-gray-400">{x.position} · {x.overall}{back ? ` · +${back} G` : ''}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {outAll && <OutPicker p={p} pool={pool} out={out} stored={stored} onPick={(id) => { onOut?.(id); setOutAll(false); }} onClose={() => setOutAll(false)} />}
      {/* 맨 아래: 남는 캡 · 남는 골드 · 팀 종합 을 버튼 바로 위에 붙이고, 영입할 수 없는 이유는 버튼 글자로 */}
      <div className="shrink-0">
        {!owned && !stored && <KV sm k="영입가" v={`${price.toLocaleString()} G`} color={GOLD} />}
        <KV sm k="남는 골드" v={goldAfter.toLocaleString()} color={goldAfter < 0 ? '#f87171' : '#fff'} />
        {toClub /* 보관함으로 사면 엔트리 · 캡은 그대로 — 보관함 칸만 */
          ? <KV sm k="보관함" v={`${clubN} → ${clubN + 1} / ${clubCap}`} />
          : (
            <>
              <KV sm k="남는 캡" v={(cap - after).toLocaleString()} color={after > cap ? '#f87171' : '#fff'} />
              <KV sm k="팀 종합" v={`${now || '-'} → ${next || '-'}`} color={next >= now ? '#34d399' : '#f87171'} />
            </>
          )}
      </div>
      <div>
        {owned
          ? (
            /* 코치진 강화 단추와 같은 모양: 강화 · 보관 · 방출 · 아래 작은 글씨에 쓸 수 있는 아이템 수 */
            <div className={`grid gap-2 ${onUpgrade ? 'grid-cols-[1.3fr_1fr_1fr]' : 'grid-cols-2'}`}>
              {onUpgrade && (
                <Btn lg a={n} pri={itemsFit > 0 && trainLevel(p) < TRAIN_MAX} disabled={!itemsFit || trainLevel(p) >= TRAIN_MAX} style={cut(12)} onClick={() => onUpgrade(p)}>
                  <span className="flex flex-col items-center leading-tight">{trainLevel(p) >= TRAIN_MAX ? `강화 +${TRAIN_MAX}` : `+${trainLevel(p) + 1} 강화 ▲`}<small className="text-t4 opacity-75">{trainLevel(p) >= TRAIN_MAX ? '최대' : itemsFit ? `${trainRate(p)}% · 아이템 ${itemsFit}개` : '아이템 없음'}</small></span>
                </Btn>
              )}
              <Btn lg disabled={clubFull || !onStore} style={cut(12)} onClick={() => onStore?.(p)}>
                <span className="flex flex-col items-center leading-tight">보관<small className="text-t4 opacity-75">{clubFull ? '보관함 가득' : '엔트리에서 빼 두기'}</small></span>
              </Btn>
              <Btn lg className="text-[#ff5a67]" style={cut(12)} onClick={() => onRelease(p)}>
                <span className="flex flex-col items-center leading-tight">방출<small className="text-t4 opacity-75">{refund ? `+${refund.toLocaleString()} G` : '환급 없음'}</small></span>
              </Btn>
            </div>
          )
          : stored ? (
            <div className="grid grid-cols-[1.6fr_1fr] gap-2">
              <Btn lg pri={!blocked} a={n} className={blocked ? 'text-t3 !text-red-300' : ''} disabled={!!blocked} style={cut(12)} onClick={() => onEnter?.(p, out)}>
                {blocked || (out ? '교체 · 엔트리로 ▶' : '엔트리로 ▶')}
              </Btn>
              <Btn lg className="text-[#ff5a67]" style={cut(12)} onClick={() => onRelease(p)}>
                <span className="flex flex-col items-center leading-tight">방출<small className="text-t4 opacity-75">{refund ? `+${refund.toLocaleString()} G` : '환급 없음'}</small></span>
              </Btn>
            </div>
          )
          : <Btn pri={!blocked} a={n} className={`w-full ${blocked ? 'text-t3 !text-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,.45)]' : ''}`} style={cut(10)} disabled={!!blocked} onClick={() => (out ? onSwap(p, out) : onAdd(p))}>{blocked || `${out ? '교체 영입' : toClub ? '보관함으로 영입' : '영입'} · ${price.toLocaleString()} G ▶`}</Btn>}
      </div>
    </aside>
  );
}

/** 라커 규칙 — 골드와 CP 가 무엇을 막는지, 영입 · 방출 · 보관함 · 프리셋 · 시세 */
const LOCKER_RULES = [
  ['골드', '선수를 사는 값 · 영입가 · 시세 · 특가', GOLD],
  ['CP', '한 팀에 담는 한도 · 엔트리 + 코치진', '#34d399'],
  ['둘의 차례', '초반엔 골드 · 선수가 좋아지면 CP', '#e5e7eb'],
  ['꽉 찬 엔트리', '보관함으로 영입 · 보관함도 차면 교체 영입', '#e5e7eb'],
  ['방출', '산 값의 절반 환급', '#fca5a5'],
  ['보관함', '엔트리 밖 20명 · 확장 최대 40명 · CP 에 안 셈', '#e5e7eb'],
  ['프리셋', '엔트리 조합 저장 · 최대 3', '#e5e7eb'],
  ['시세', '영입가 × 인기(수상) × 그날 흐름', '#e5e7eb'],
  ['오늘의 특가', '매일 12명 · 30% 할인', '#fb923c'],
];
function LockerRules({ onClose }) {
  return (
    <Pop eyebrow="도움말" title="라커 규칙" onClose={onClose}>
      {LOCKER_RULES.map(([k, v, c]) => <KV key={k} sm k={k} v={v} color={c} />)}
    </Pop>
  );
}

const ITEM_COLOR = { training: '#7dd3fc', boost: '#34d399', ops: '#f87171', staff: '#c4b5fd', aug: '#e879f9' };

/** 아이템 탭 — 가운데 보유 아이템 카드 · 오른쪽 대상 고르기(추천 대상은 위에 ★) + 사용 */

function ItemsTab({ team, gold = 0, onShop, itemId, target, onPick, onTarget, onUse, fx = null }) {
  const listFx = useListIntro('items', 700, { sfx: false }); // 아이템 탭은 탭을 바꿔야 그려져서 — 소리는 라커에 들어갈 때 한 번만
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
  const train = it?.cat === 'training';
  return (
    <>
      <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#fde047' }}>
        <div className="flex items-baseline gap-3">
          <p className="mt-lab" style={{ '--a': '#fde047' }}>보유 아이템</p>
        </div>
        {groups.length === 0 ? (
          /* 가진 아이템이 없을 때: 사진 한 장 · 보유 골드 · 상점 버튼 (C안) */
          <div className="mt-cut mt-3 grid min-h-0 flex-1 place-items-center bg-cover" style={{ '--c': '16px', backgroundImage: 'linear-gradient(180deg, rgba(253,224,71,.12), rgba(5,8,15,.95) 60%), url(ui/mt/mt-pack.webp)', backgroundPosition: 'center 30%' }}>
            <div className="text-center">
              <b className="mb-1.5 mt-2 block text-t1 font-black text-white">아이템 없음</b>
              <div className="mt-5 flex items-center justify-center gap-2.5">
                <b className="font-display text-t1 text-[#fde047]">{gold.toLocaleString()}</b><small className="text-t3 text-gray-400">G 보유</small>
              </div>
              <Btn pri lg a="#fde047" className="mx-auto mt-5 w-[260px]" style={cut(12)} onClick={onShop}>상점 가기 ▶</Btn>
            </div>
          </div>
        ) : (
        <div className={`mt-scroll mt-3 grid min-h-0 flex-1 grid-cols-4 content-start gap-3 overflow-y-auto pr-2 ${listFx}`} style={{ gridAutoRows: '12.5rem' }}>
          {groups.map(({ it: x, keys }) => {
            const c = ITEM_COLOR[x.cat] || '#fde047';
            const on = it?.id === x.id;
            return (
              <button key={x.id} type="button" data-item={x.id} onClick={() => onPick(x.id)}
                className={`mt-cut ${on ? 'mt-frame' : ''} relative h-full w-full overflow-hidden bg-[#0b1220] bg-cover bg-center text-left transition hover:brightness-110`}
                style={{ '--c': '12px', '--a': c, backgroundImage: `url(${itemArt(x)})`, boxShadow: on ? undefined : `inset 0 0 0 1px ${c}59` }}>
                <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.5),rgba(5,8,15,0) 30%,rgba(5,8,15,.92) 68%,#05080f)' }} />
                <span className="mt-cut absolute right-2.5 top-2.5 px-2 font-display text-t2 font-extrabold text-[#05080f]" style={{ '--c': '5px', background: c }}>×{keys.length}</span>
                <span className="absolute inset-x-3 bottom-2.5 block">
                  <b className="block truncate text-t3 font-black text-white">{x.name}</b>
                  <span className="block truncate text-t4 text-gray-400">{x.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        )}
      </section>

      <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={{ ...cut(20), '--a': n }}>
        <p className="mt-lab" style={{ '--a': n }}>아이템 사용</p>
        {/* 방금 쓴 결과(마지막 한 개를 써서 목록이 비어도 보이게 맨 위에) — 대상 이름 · 능력치가 세어 오르고 +값이 톡 */}
        {fx && (
          <div key={fx.k} data-item-fx="" className="fx-rise mt-cut flex items-baseline gap-2 px-3 py-2"
            style={{ ...cut(8), background: fx.fail ? 'rgba(248,113,113,.1)' : 'rgba(52,211,153,.1)', boxShadow: fx.fail ? 'inset 0 0 0 1px rgba(248,113,113,.5)' : 'inset 0 0 0 1px rgba(52,211,153,.45)' }}>
            <b className="min-w-0 truncate text-t3 text-white">{fx.name}</b>
            <span className="text-t4 text-gray-300">{fx.lv != null ? `+${fx.lv} 강화 · ${fx.label}` : fx.label}</span>
            {fx.fail ? (
              /* 실패 — 카드가 날아가 닿는 때(0.42초)에 붉은 글씨 · 낮은 소리. 단계 · 능력치는 그대로 */
              <b className="fx-bump ml-auto text-t3 text-[#f87171]" style={{ '--d': '420ms' }}>강화 실패<SfxAt name="upFail" delay={420} /></b>
            ) : fx.to != null ? (
              <span className="ml-auto flex items-baseline gap-1.5 font-display">
                <Count sfx value={fx.to} from={fx.from} delay={420} dur={520} className="text-t2 font-extrabold text-white" />
                <b className="fx-bump text-t3 text-[#34d399]" style={{ '--d': '940ms' }}>▲{fx.to - fx.from}</b>
                {/* 강화 성공 — 증강 강화 성공과 같은 소리(작은 보상). 숫자 세기가 끝나 ▲ 가 톡 튀는 때 */}
                {fx.lv != null && <SfxAt name="augUpgrade" delay={960} />}
              </span>
            ) : <b className="fx-bump ml-auto text-t3 text-[#34d399]" style={{ '--d': '420ms' }}>사용 완료</b>}
          </div>
        )}
        {!it ? (() => {
          /* 아이템을 고르지 않았을 때: 우리 팀에서 가장 약한 곳과 그걸 올리는 훈련 (E안) */
          const { rows, weak, item: buy } = teamWeakness(squad);
          return (
            <>
              <b className="-mb-1 text-t2 font-black text-white">우리 팀 약한 곳</b>
              {rows.map((r) => (
                <div key={r.k} className="-my-1 grid items-center gap-2 text-t3 text-gray-300" style={{ gridTemplateColumns: '44px 1fr 34px' }}>
                  {WEAK_KO[r.k]}
                  <span className="relative block h-[5px] bg-white/[0.08]">
                    <b className="absolute inset-y-0 left-0 block" style={{ width: `${statPct(r.v)}%`, background: statColor(r.v, WEAK_COLOR[r.k]).bar }} />
                  </span>
                  <b className="text-right font-display text-t3" style={{ color: statColor(r.v, WEAK_COLOR[r.k]).num }}>{r.v || '-'}</b>
                </div>
              ))}
              {/* 추천 표(A안): 머리글 · 약한 곳(그 칸 색) · 추천 아이템 · 가격(금색) · 상점 버튼 */}
              {weak && buy && (
                <div className="mt-cut mt-2 px-3.5 pb-3.5 pt-2.5" style={{ '--c': '12px', background: 'rgba(5,8,15,.5)', boxShadow: `inset 0 0 0 1px ${WEAK_COLOR[weak.k]}40` }}>
                  <small className="mb-1 block font-display text-t4 tracking-[0.2em]" style={{ color: WEAK_COLOR[weak.k] }}>추천</small>
                  {[['약한 곳', `${WEAK_KO[weak.k]} ${weak.v}`, WEAK_COLOR[weak.k]], ['추천 아이템', buy.name, '#fff'], ['가격', `${buy.price} G`, '#fde047']].map(([k, v, c], i) => (
                    <span key={k} className={`flex items-baseline justify-between py-[7px] text-t4 text-gray-400 ${i < 2 ? 'border-b border-white/[0.07]' : ''}`}>
                      {k}<b className="text-t3" style={{ color: c }}>{v}</b>
                    </span>
                  ))}
                  <Btn pri a="#fde047" className="mt-2.5 w-full" style={cut(10)} onClick={onShop}>상점 가기 ▶</Btn>
                </div>
              )}
              {!weak && <p className="text-t3 text-gray-400">먼저 선수 영입하기</p>}
            </>
          );
        })() : (
          <>
            <Hero img={`url(${itemArt(it)})`} name={it.name} color={n} h={130} pos="center 30%" />
            <p className="-mt-1 text-t3 leading-relaxed text-gray-300">{it.desc}</p>
            <p className="mt-grp !mt-0">적용 대상</p>
            <div className="mt-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1.5">
              {list.length === 0 && <p className="text-t3 text-gray-400">대상 없음 · 먼저 영입하기</p>}
              {list.map((t) => {
                const on = target?.id === t.id;
                const rec = recIds.has(t.id);
                const cur = !t.position && staffNow[slotOf(t)]?.id === t.id;
                const lv = train ? trainLevel(t) : 0;
                const max = train && lv >= TRAIN_MAX;
                return (
                  <button key={t.id} type="button" data-target={t.id} disabled={max} onClick={() => onTarget(t)} className={`mt-row mt-cut ${on ? 'on' : ''} ${fx?.id === t.id ? 'lk-hit' : ''}`}
                    style={{ gridTemplateColumns: train ? '40px 38px minmax(0,1fr) auto' : '40px 38px minmax(0,1fr)', '--a': n, opacity: max ? 0.45 : 1 }}>
                    <Portrait player={t} staff={!t.position} w={38} h={46} color={n} />
                    <b className="font-display text-t1 font-extrabold" style={{ color: n }}>{t.overall ?? '—'}</b>
                    <span className="min-w-0">
                      <b className="block truncate text-t3 font-black text-white">
                        {t.name}
                        {rec && <em className="ml-1.5 text-t4 not-italic text-amber-300">★ 추천</em>}
                        {cur && <em className="ml-1.5 text-t4 not-italic text-gray-400">선임 중</em>}
                      </b>
                      <span className="block truncate text-t4 text-gray-400">
                        {t.position ? `${t.position} · ${t.year} ${t.team}` : `${t.role === 'manager' ? '감독' : '코치'} · ${t.note}`}
                        {it.stat && t.stats && !max ? ` · ${t.stats[it.stat] ?? '-'} →${Math.min(110, (t.stats[it.stat] ?? 78) + it.amount)}` : ''}
                      </span>
                    </span>
                    {train && (
                      /* 강화 단계 · 다음 성공 확률 — 오른쪽 끝 */
                      <span className="flex flex-col items-end leading-tight">
                        <b className="font-display text-t3 text-amber-300">+{lv}</b>
                        <small className="font-display text-t4" style={{ color: max ? '#6b7280' : rateColor(trainRate(t)) }}>{max ? '최대' : `${trainRate(t)}%`}</small>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div>
              {target && after != null && <KV k={`${target.name} ${STAT_KO[it.stat] || it.stat}`} v={`${target.stats[it.stat] ?? "-"} → ${after}`} color="#34d399" />}
              {target && train && <KV k={`강화 +${trainLevel(target)} → +${trainLevel(target) + 1}`} v={`성공 ${trainRate(target)}%`} color={rateColor(trainRate(target))} />}
              <KV k="남는 수량" v={`${g.keys.length} → ${g.keys.length - 1}`} color="#fde047" />
            </div>
            <Btn pri lg a={n} className="w-full" style={cut(12)} disabled={!target || (train && trainLevel(target) >= TRAIN_MAX)} onClick={() => onUse(g.keys[0], target, slotOf(target))}>
              {target ? `${target.name}에게 ${train ? '강화' : '사용'} ▶` : '대상 고르기'}
            </Btn>
          </>
        )}
      </aside>
    </>
  );
}

/** 상단 바 — 엔트리 · 외국인 요약. 누르면 포지션별 구성 창 */
function EntryBox({ squad, lim, issues }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  const pos = Object.fromEntries(POS_RULES.map((r) => [r.key, r]));
  // 인원/필수 — 필수 부족 빨강 · 필수만큼 초록 · 넘기면(자유 자리를 씀) 하늘 · 필수 0 인데 없으면 회색
  const tint = (n, min) => (n < min ? '#f87171' : n > min ? '#7dd3fc' : min ? '#34d399' : '#6b7280');
  const frac = (n, d, color) => <span className="whitespace-nowrap font-display"><b className="text-t3" style={{ color }}>{n}</b><small className="text-t4 text-gray-400">/{d}</small></span>;
  const cell = (key) => {
    const r = pos[key];
    const n = squad.filter((p) => p.position === key).length;
    return (
      <div key={key} className="flex h-[34px] items-center justify-between border-b border-white/[0.07] px-1">
        <span className="text-t3 text-gray-400">{r.label}</span>{frac(n, r.min, tint(n, r.min))}
      </div>
    );
  };
  const used = freeUsed(squad);
  const fc = foreignCount(squad);
  const ok = squad.length === lim.size && !issues.length;
  const ec = ok ? '#34d399' : squad.length > lim.size || issues.length ? '#f87171' : '#e5e7eb';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="mt-cut flex items-center gap-5 px-4 py-1.5 hover:bg-white/[0.06]" style={{ ...cut(12), background: open ? 'rgba(255,255,255,.08)' : undefined }}>
        <span className="flex flex-col items-end leading-tight"><small className="text-t4 text-gray-400">엔트리</small><b className="font-display text-t2" style={{ color: ec }}>{squad.length} / {lim.size}</b></span>
        <span className="flex flex-col items-end leading-tight"><small className="text-t4 text-gray-400">외국인</small><b className="font-display text-t2 text-white">{fc} / {lim.foreign}</b></span>
      </button>
      {open && (
        <div className="mt-cut mt-glass absolute right-0 top-[calc(100%+8px)] z-40 w-[320px] p-4" style={{ ...cut(18), background: 'rgba(10,15,26,.96)' }}>
          <p className="mt-lab pb-2">엔트리 구성</p>
          <div className="grid grid-cols-2 gap-x-3">
            <div>{['SP', 'RP', 'C', 'OF', 'DH'].map(cell)}</div>
            <div>{['1B', '2B', '3B', 'SS'].map(cell)}</div>
          </div>
          <div className="mt-3 flex justify-between px-1 text-t3 text-gray-300">
            <span>자유 자리 {frac(used, lim.free, used > lim.free ? '#f87171' : used === lim.free ? '#34d399' : '#e5e7eb')}</span>
            <span>외국인 {frac(fc, lim.foreign, fc > lim.foreign ? '#f87171' : '#e5e7eb')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** 엔트리 프리셋 — 저장 · 불러오기 (칸은 상점). 내 선수 탭 위 한 줄 */
function PresetBar({ team, squad, onSave, onLoad }) {
  return (
    <div className="mt-cut mt-glass flex items-center gap-3 px-4 py-2.5" style={cut(18)}>
      <p className="mt-lab shrink-0">프리셋</p>
      {Array.from({ length: PRESET_BASE + PRESET_EXTRA_MAX }, (_, i) => {
        const open = i < presetCount(team);
        const ps = team.presets?.[i];
        const why = open && ps ? presetIssue(team, ps) : null;
        const on = team.presetOn === i && !!ps;
        const ovr = ps ? Math.round(ps.ids.map((id) => [...squad, ...(team.club || [])].find((x) => x.id === id)).filter(Boolean).reduce((n, x, _, l) => n + x.overall / l.length, 0)) : 0;
        return (
          <div key={i} className="mt-cut flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5" style={{ ...cut(12), opacity: open ? 1 : 0.4, background: on ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.04)', boxShadow: on ? 'inset 0 0 0 1px rgba(16,185,129,.45)' : undefined }}>
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block truncate text-t3" style={{ color: on ? '#34d399' : '#e5e7eb' }}>{ps?.name || `프리셋 ${i + 1}`}</b>
              <small className="block truncate text-t4" style={{ color: why && ps ? '#fca5a5' : '#6b7280' }}>
                {!open ? '상점에서 열기' : !ps ? '비어 있음' : why || `${ps.ids.length}명 · 종합 ${ovr || '-'}`}
              </small>
            </span>
            <Btn sm disabled={!open} onClick={() => onSave(i)}>저장</Btn>
            <Btn sm pri disabled={!open || !ps || !!why} onClick={() => onLoad(i)}>불러오기</Btn>
          </div>
        );
      })}
    </div>
  );
}

export default function LockerScreen({ account, onSave, onBack, onShop, initialTab = null }) {
  const [team, setTeam] = useState(account.team);
  const [gold, setGold] = useState(account.gold || 0);
  const [canOnly, setCanOnly] = useState(false); // 지금 영입할 수 있는 선수만
  const [rulesOpen, setRulesOpen] = useState(false); // 라커 규칙 팝업
  const [dealOnly, setDealOnly] = useState(false); // 오늘의 특가만
  const deals = useMemo(() => dailyDeals(ALL, todayKey()), []); // 하루 한 번 바뀐다 (라커를 다시 열면 새 날짜)
  const today = useMemo(() => dayIndex(), []);
  const priceFor = (p) => deals.get(p.id) ?? marketPriceOf(p, today); // 특가가 아니면 오늘 시세
  const [outId, setOutId] = useState(null); // 교체 영입에서 내보낼 선수 (없으면 첫 후보)
  const [tab, setTab] = useState(initialTab || 'scout'); // 상점에서 오면 산 것을 쓰는 탭으로
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [club, setClub] = useState('');
  const [pos, setPos] = useState('');
  const [filterOpen, setFilterOpen] = useState(false); // 연도 · 구단 · 포지션 칸
  const [sel, setSel] = useState(null);
  const [staffSlot, setStaffSlot] = useState(null); // 고른 자리(null = 빈 자리 먼저, 없으면 감독)
  const [staffSel, setStaffSel] = useState(null); // 오른쪽 상세에 띄운 후보 id(null = 그 자리에 앉은 사람 · 없으면 첫 후보)
  const [staffSort, setStaffSort] = useState('');
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
  /* 영입 · 방출은 골드와 엔트리를 한 번에 저장한다 (store.recruitPlayer · releasePlayer) */
  const settle = (next) => { if (!next) return; setTeam(next.team); setGold(next.gold); onSave?.(next.team, next.gold); };
  const clubList = team.club || [];
  const inClub = (p) => clubList.some((x) => x.id === p.id);
  const dealBump = (p, next) => { if (next && deals.has(p.id)) bumpWeek('deal'); return next; }; // 주간 과제: 특가 영입
  /* 막 영입한 선수(상세 판 도장) · 막 쓴 아이템 결과 — 잠깐 보였다 사라진다 */
  const [fresh, setFresh] = useState(null);
  const listFx = useListIntro(tab); // 탭을 바꾸면 목록 줄이 차례로
  const [itemFx, setItemFx] = useState(null);
  /* 이 선수에게 쓸 수 있는 보유 훈련 아이템(종류별 하나씩 아닌 장 수 그대로) — 상세 강화 단추 · 아이템 탭 첫 선택 */
  const fitTraining = (p) => (!p ? [] : (team.items || []).map((x) => SHOP_ITEMS.find((i) => i.id === x.itemId)).filter((it) => it?.cat === 'training' && fitsItem(it, p)));
  useEffect(() => { if (!fresh) return undefined; const t = setTimeout(() => setFresh(null), 1800); return () => clearTimeout(t); }, [fresh]);
  useEffect(() => { if (!itemFx) return undefined; const t = setTimeout(() => setItemFx(null), 2600); return () => clearTimeout(t); }, [itemFx]);
  /* 영입 — 엔트리가 꽉 찼으면 보관함으로 산다(FC 온라인: 산 선수는 보유 선수로 → 스쿼드엔 따로 넣기). 보관함도 차면 교체 영입만 */
  const toClub = squad.length >= lim.size;
  const add = (p) => {
    const why = toClub ? clubAddReason(p, squad, clubList, gold, priceFor(p), clubMax(team)) : addBlockReason(p, squad, staff, cap, lim, gold, priceFor(p));
    if (!why) { settle(dealBump(p, recruitPlayer(team, p, priceFor(p), toClub ? 'club' : 'squad'))); setFresh({ id: p.id, k: `${Date.now()}` }); }
  };
  const release = (p) => { settle(inClub(p) ? releaseFromClub(team, p.id) : releasePlayer(team, p.id)); setSel(null); };
  /* 보관함: 엔트리에서 빼 두기 · 엔트리로 들이기(꽉 찼으면 out 과 자리 바꿈 — out 은 보관함으로) */
  const store = (p) => { settle(storePlayer(team, p.id)); setSel(null); };
  const enter = (p, out) => {
    const why = out ? swapBlockReason(p, out, squad, staff, cap, lim, null) : addBlockReason(p, squad, staff, cap, lim, null);
    if (!why) { settle(enterFromClub(team, p.id, out?.id || null)); setOutId(null); setSel(null); }
  };
  const swap = (p, out) => { if (!swapBlockReason(p, out, squad, staff, cap, lim, gold, priceFor(p))) { settle(dealBump(p, swapPlayer(team, p, priceFor(p), out.id))); setOutId(null); setFresh({ id: p.id, k: `${Date.now()}` }); } };
  /* 목록 한 줄의 막는 이유 — 꽉 찼으면 첫 교체 후보로 따진다 */
  const full = squad.length >= lim.size;
  const clubCap = clubMax(team); // 상점 보관함 확장으로 20 → 40
  const clubFullNow = clubList.length >= clubCap;
  const swapOnly = full && clubFullNow; // 엔트리 · 보관함 둘 다 차면 목록 단추는 '교체'(오른쪽에서 내보낼 선수 고르기)
  const rowBlock = (p) => (full && !clubFullNow ? clubAddReason(p, squad, clubList, gold, priceFor(p), clubCap) : full ? (swapPick(p, squad, staff, cap, lim, gold, priceFor(p)) ? null : swapBlockReason(p, swapCandidates(p, squad)[0], squad, staff, cap, lim, gold, priceFor(p))) : addBlockReason(p, squad, staff, cap, lim, gold, priceFor(p)));
  useEffect(() => { setOutId(null); }, [sel?.id]);
  const setStaff = (slot, person) => commit({ ...team, staff: { ...staff, [slot]: person } });
  /* 교체 · 해임 — 강화한 레벨 · 계약서가 있으면 사라진다고 먼저 묻는다 */
  const [staffAsk, setStaffAsk] = useState(null); // { slot, person }
  const askStaff = (slot, person) => {
    const cur = staff[slot];
    if (cur && ((cur.level || 1) > 1 || cur.contracted)) setStaffAsk({ slot, person });
    else setStaff(slot, person);
  };
  /* 이 사람을 앉히면 캡을 넘는가 — 넘으면 버튼을 잠그고 얼마가 모자란지 알린다 */
  const staffOver = (slot, person) => {
    if (!person) return 0;
    const over = squadCost(squad, { ...staff, [slot]: person }) - cap;
    return over > 0 ? over : 0;
  };

  /* 빈 자리 채우기: 싼 국내 선수(isFreeFill)로 무상 — 골드가 없어도 엔트리를 맞출 수 있게. 산 값 0 이라 방출해도 환급 없음 */
  const autoFill = () => {
    let next = [...squad];
    /* 아직 안 앉힌 감독·코치 몫은 남겨 둔다 — 선수로 캡을 다 쓰면 코치진을 못 채운다 */
    const reserve = staffReserve(staff);
    const tryAdd = (want) => {
      const slots = lim.size - next.length;
      const budget = Math.max(40, Math.floor((cap - reserve - squadCost(next, staff)) / Math.max(1, slots)));
      const pool = ALL.filter((p) => isFreeFill(p) && (!want || p.position === want) && p.cost <= budget && !addBlockReason(p, next, staff, cap - reserve, lim)).sort((a, b) => b.overall - a.overall);
      if (!pool.length) return false;
      next = [...next, { ...pool[0], paid: 0 }];
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
    const owned = new Set([...squad, ...(team.club || [])].map((p) => p.personId || p.name)); // 보관함에 있는 사람도
    // 드롭다운 값은 숫자(연도)일 수 있어 문자열로 맞춰 비교
    const list = ALL.filter((p) => !owned.has(p.personId || p.name)
      && (!year || String(p.year) === String(year)) && (!club || p.team === club) && (!pos || p.position === pos)
      && (!kw || p.name.includes(kw) || String(p.year).includes(kw) || p.team.includes(kw))
      && (!dealOnly || deals.has(p.id))
      && (!canOnly || !rowBlock(p)));
    const by = {
      '스탯 높은 순': (a, b) => b.overall - a.overall || a.cost - b.cost,
      '스탯 낮은 순': (a, b) => a.overall - b.overall || a.cost - b.cost,
      'CP 높은 순': (a, b) => b.cost - a.cost || b.overall - a.overall,
      'CP 낮은 순': (a, b) => a.cost - b.cost || b.overall - a.overall,
      '영입가 낮은 순': (a, b) => priceFor(a) - priceFor(b) || b.overall - a.overall,
      '시세 내린 순': (a, b) => quoteOf(a, today).pct - quoteOf(b, today).pct || b.overall - a.overall,
    }[sort || SORT_DEFAULT];
    /* 같은 사람의 다른 시즌 · 구단은 한 줄로 묶는다(FC 온라인 선수 검색: 이름 한 줄 → 누르면 시즌 목록).
       대표 = 기본 정렬이면 가장 비싼 카드, 정렬을 고르면 그 정렬의 첫 카드 — 고른 정렬이 대표 줄에서 깨지지 않게.
       나머지는 연도순으로 대표 줄 아래에 펼친다 */
    const groups = new Map();
    for (const p of list) { const k = p.personId || p.name; groups.set(k, [...(groups.get(k) || []), p]); }
    return [...groups.values()].map((vs) => {
      const rep = sort ? [...vs].sort(by)[0] : vs.reduce((a, b) => (priceFor(b) > priceFor(a) ? b : a));
      return { rep, rest: vs.filter((v) => v !== rep).sort((a, b) => a.year - b.year) };
    }).sort((a, b) => by(a.rep, b.rep));
  }, [q, year, club, pos, sort, squad, team.club, canOnly, dealOnly, gold, staff, cap, lim.size, lim.free, lim.foreign]);
  const results = matched.slice(0, limit);
  const [openP, setOpenP] = useState(null); // 다른 시즌을 펼친 사람
  /* 오른쪽 상세에 보일 선수 — 고른 선수, 없으면 지금 탭 목록의 첫 선수 */
  const shown = sel || (tab === 'scout' ? results[0]?.rep : tab === 'club' ? (team.club || [])[0] : tab === 'squad' ? [...squad].sort((x, y) => y.overall - x.overall)[0] : null) || null;

  const NAV = [
    { key: 'scout', label: '영입', img: 'ui/nav/locker-scout.webp' },
    { key: 'squad', label: '내 선수', img: 'ui/nav/locker-squad.webp' },
    { key: 'club', label: '보관함', img: 'ui/nav/locker-squad.webp' },
    { key: 'staff', label: '감독·코치', img: 'ui/nav/locker-staff.webp' },
    { key: 'items', label: '아이템', img: 'ui/nav/locker-items.webp' },
  ];
  const listSlot = staffSlot || STAFF_SLOTS.find((x) => !staff[x.key])?.key || 'manager';
  const staffShown = STAFF.find((m) => m.id === staffSel && m.role === STAFF_SLOTS.find((x) => x.key === listSlot)?.role)
    || staff[listSlot] || staffByRole(STAFF_SLOTS.find((x) => x.key === listSlot)?.role).sort((x, y) => y.cost - x.cost)[0] || null;
  const head = (label, sub, a, extra) => (
    <div className="flex items-baseline gap-3">
      <p className="mt-lab" style={{ '--a': a }}>{label}</p>
      {sub && <p className="text-t3 text-gray-400">{sub}</p>}
      <div className="ml-auto flex gap-2">{extra}</div>
    </div>
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <style>{`${KEYFRAMES}
        /* 다른 시즌 줄 — 들여쓰지 않고 왼쪽 줄 · 옅은 바탕(들여쓰면 능력치 칸이 대표 줄과 어긋난다). 고르면 .on 이 이긴다 */
        .mt-row.lk-sub:not(.on) { background: rgba(52,211,153,.045); box-shadow: inset 3px 0 0 rgba(52,211,153,.55); }
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
      <GlassBg tint={sel ? teamNeon(sel) : '#10b981'} />
      <TopBar eyebrow="메인" section="내 라커" team={team} account={account} onBack={onBack}
        steps={(
          <TopTabs items={NAV} value={tab} label="라커 메뉴" onChange={(k) => { setTab(k); setSel(null); setItemTarget(null); }} />
        )}
        right={(
          <>
            <EntryBox squad={squad} lim={lim} issues={issues} />
            <button type="button" onClick={() => setRulesOpen(true)} aria-label="라커 규칙"
              className="mt-cut grid h-10 w-10 place-items-center bg-white/[0.07] text-t3 font-black text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,.1)] hover:bg-white/[0.12]" style={cut(12)}>?</button>
          </>
        )} />
      {rulesOpen && <LockerRules onClose={() => setRulesOpen(false)} />}

      <div className="relative grid min-h-0 flex-1 gap-5 px-7 pb-6 pt-2"
        style={{ gridTemplateColumns: 'minmax(0,1fr) 460px', gridTemplateRows: 'minmax(0,1fr)' }}>

        {tab === 'scout' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={cut(22)}>
            <div className="flex items-center gap-2">
              <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} placeholder="선수 이름 · 연도 · 구단 검색"
                className="mt-cut h-10 min-w-0 flex-1 bg-white/[0.05] px-4 text-t3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.07)] outline-none placeholder:text-gray-400 focus:shadow-[inset_0_0_0_1.5px_#10b981]" style={cut(12)} />
              {(() => {
                const n = [year, club, pos].filter(Boolean).length;
                const chip = (on, label, color, onClick) => (
                  <button type="button" aria-pressed={on} onClick={onClick}
                    className="mt-cut h-10 px-4 text-t3 font-bold transition"
                    style={{ ...cut(12), color: on ? '#03140c' : color, background: on ? 'linear-gradient(180deg,#34d399,#0e9f6e)' : 'rgba(255,255,255,.05)', boxShadow: on ? '0 8px 20px -8px rgba(16,185,129,.7)' : 'inset 0 1px 0 rgba(255,255,255,.07)' }}>{label}</button>
                );
                return (
                  <>
                    {chip(filterOpen || n > 0, n ? `필터 ${n}` : '필터', '#9ca3af', () => setFilterOpen((v) => !v))}
                    {chip(dealOnly, `오늘의 특가 ${deals.size}`, WARN, () => { setDealOnly((v) => !v); setLimit(60); })}
                    {chip(canOnly, '영입 가능만', '#9ca3af', () => { setCanOnly((v) => !v); setLimit(60); })}
                  </>
                );
              })()}
              <div className="w-40">
                <Select value={sort} onChange={(v) => { setSort(v); setLimit(60); }} options={['스탯 낮은 순', 'CP 높은 순', 'CP 낮은 순', '영입가 낮은 순', '시세 내린 순']} all={SORT_DEFAULT} />
              </div>
            </div>
            {filterOpen && (
              <div className="mt-2 grid items-center gap-2" style={{ gridTemplateColumns: 'repeat(3,180px) auto' }}>
                <Select value={year} onChange={(v) => { setYear(v); setLimit(60); }} options={YEARS} all="연도 전체" />
                <Select value={club} onChange={(v) => { setClub(v); setLimit(60); }} options={TEAMS} all="구단 전체" />
                <Select value={pos} onChange={(v) => { setPos(v); setLimit(60); }} options={POS_RULES.map((r) => r.key)} all="포지션" />
                {(year || club || pos) && <button type="button" onClick={() => { setYear(''); setClub(''); setPos(''); }} className="justify-self-start px-2 text-t3 text-gray-400 hover:text-white">초기화</button>}
              </div>
            )}
            <div className={`mt-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-2 ${listFx}`}>
              {results.map(({ rep, rest }) => {
                const k = rep.personId || rep.name;
                const open = openP === k;
                const row = (p, i = null) => (
                  <PlayerRow key={p.id} p={p} on={shown?.id === p.id} action={swapOnly ? '교체' : '영입'} blocked={rowBlock(p)} showNote={false} teamTint price={priceFor(p)} capQuiet={cost < cap * CAP_LOUD}
                    more={i == null && rest.length ? { n: rest.length, open, deal: rest.some((v) => deals.has(v.id)) } : null}
                    className={i == null ? '' : 'fx-rise lk-sub'} style={i == null ? null : { '--i': i }}
                    onPick={i == null && rest.length ? (p2) => { setSel(p2); setOpenP(open ? null : k); } : setSel} onAct={swapOnly ? setSel : add} />
                );
                return [row(rep), ...(open ? rest.map((p, i) => row(p, i)) : [])];
              })}
              {results.length === 0 && <p className="text-t3 text-gray-400">조건에 맞는 선수 없음</p>}
              {matched.length > results.length && (
                <button type="button" onClick={() => setLimit((n) => n + 60)} className="mt-btn sm mx-auto my-2">
                  {matched.length - results.length}명 더 보기
                </button>
              )}
            </div>
          </section>
        )}

        {tab === 'squad' && (
          <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto minmax(0,1fr)' }}>
            <PresetBar team={team} squad={squad} onSave={(i) => settle(savePreset(team, i))}
              onLoad={(i) => { const next = loadPreset(team, i); if (next) { settle(next); setSel(null); } }} />
            <SquadBoard team={team} squad={squad} bench={bench}
              sel={sel} onSelect={setSel} onCommit={commit} onToggleBench={toggleBench} onRelease={release}
              onAutoFill={autoFill} autoDisabled={squad.length >= lim.size} />
          </div>
        )}

        {tab === 'club' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={cut(22)}>
            {head('보관함', `${clubList.length} / ${clubCap}`)}
            {clubList.length === 0 ? (
              <ClubEmpty max={clubCap} onScout={() => navTo(() => setTab('scout'), 'tab-l')} />
            ) : (
            <div className={`mt-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-2 ${listFx}`}>
              {clubList.map((p) => {
                const full = squad.length >= lim.size;
                const why = full ? (swapPick(p, squad, staff, cap, lim) ? null : swapBlockReason(p, swapCandidates(p, squad)[0], squad, staff, cap, lim, null)) : addBlockReason(p, squad, staff, cap, lim, null);
                return (
                  <PlayerRow key={p.id} p={p} on={shown?.id === p.id} action={full ? '교체' : '넣기'} blocked={why} showNote={false} teamTint stored
                    onPick={setSel} onAct={full ? setSel : (x) => enter(x, null)} />
                );
              })}
            </div>
            )}
          </section>
        )}

        {tab === 'staff' && (() => {
          /* 영입 탭 문법(mockups/staff-tab V2) — 위 지금 코치진 띠(누르면 그 자리 후보) · 아래 후보 행: 사진 · CP · 이름 + 색깔(오른쪽) / 시대 · 경력 한 줄 · 효과 칸 · CP · 단추 */
          const role = STAFF_SLOTS.find((x) => x.key === listSlot)?.role;
          const cands = staffByRole(role).sort((x, y) => (staffSort === 'CP 낮은 순' ? x.cost - y.cost : y.cost - x.cost));
          const maxV = Math.max(...cands.map((m) => ruleValue(staffRules(m)[0] || {})), 0.01);
          return (
            <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#c4b5fd' }}>
              <div className="grid shrink-0 grid-cols-4 gap-2.5">
                {STAFF_SLOTS.map((x) => {
                  const m = staff[x.key];
                  const on = listSlot === x.key;
                  const e = m ? effTags(staffRules(m))[0] : null;
                  return (
                    <button key={x.key} type="button" onClick={() => { setStaffSlot(x.key); setStaffSel(null); }} aria-pressed={on}
                      className="mt-cut flex h-[78px] items-center gap-3 px-3 text-left transition hover:brightness-125"
                      style={{ ...cut(14), background: on ? 'rgba(196,181,253,.12)' : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 ${on ? 1.5 : 1}px ${on ? '#c4b5fd' : 'rgba(196,181,253,.25)'}` }}>
                      <StaffFace m={m} size={50} />
                      <span className="min-w-0">
                        <small className="block font-display text-t4 font-bold tracking-[0.12em] text-[#c4b5fd]">{x.label}</small>
                        <b className={`block truncate text-t2 font-black ${m ? 'text-white' : 'text-gray-500'}`}>{m ? m.name : '비어 있음'}</b>
                        <span className="block truncate text-t4 text-gray-400">{e ? <>{e.label} <b className="font-display text-t3" style={{ color: e.c }}>{e.n}</b></> : '-'}</span>
                      </span>
                      {m && <b className="ml-auto self-start pt-2 font-display text-t4 text-amber-300">Lv.{m.level || 1}</b>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-3">
                {head(`${STAFF_SLOTS.find((x) => x.key === listSlot)?.label} 후보`, `${cands.length}명`, '#c4b5fd')}
                <div className="ml-auto w-40"><Select value={staffSort} onChange={setStaffSort} options={['CP 낮은 순']} all="CP 높은 순" /></div>
              </div>
              <div className={`mt-scroll mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-2 ${listFx}`}>
                {cands.map((m) => {
                  const mine = staff[listSlot]?.id === m.id;
                  const over = staffOver(listSlot, m);
                  const x = staffRules(m)[0];
                  const e = effTags([x])[0];
                  return (
                    <div key={m.id} role="button" onClick={() => setStaffSel(m.id)} className={`mt-row h-[68px] cursor-pointer ${staffShown?.id === m.id ? 'on' : ''}`}
                      style={{ gridTemplateColumns: '54px 56px minmax(0,1fr) 340px 78px 104px', gap: 14, padding: '0 14px 0 8px' }}>
                      <StaffFace m={m} size={50} />
                      <b className="mt-ovr text-center font-display text-t1 font-extrabold leading-none">{m.cost}</b>
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <b className="truncate text-t2 font-black text-white">{m.name}</b>
                          {styleOf(m) && <em className="shrink-0 rounded-full px-2 py-px text-t4 font-bold not-italic" style={{ color: STYLE_COLOR[m.style], background: `${STYLE_COLOR[m.style]}22` }}>{styleOf(m).ko}</em>}
                          {mine && <em className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-px text-t4 font-bold not-italic text-emerald-300">선임 중</em>}
                        </span>
                        <small className="mt-0.5 block truncate text-t4 text-gray-400">{m.era} · {m.note}</small>
                      </span>
                      <span className="flex min-w-0 flex-col gap-1 rounded-xl bg-white/[0.04] px-3 py-1.5">
                        <span className="flex items-baseline gap-2"><span className="shrink-0 text-t4 font-bold text-gray-300">{e.label}</span><span className="min-w-0 flex-1 truncate text-t4 text-gray-500">{e.desc}</span><b className="shrink-0 font-display text-t2 leading-none" style={{ color: e.c }}>{e.n}</b></span>
                        <i className="relative block h-1 overflow-hidden rounded-full bg-white/[0.08]"><b className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (ruleValue(x) / maxV) * 100)}%`, background: e.c }} /></i>
                      </span>
                      <span className="justify-self-center rounded-full bg-amber-400/10 px-2.5 py-1 font-display text-t3 font-bold text-amber-300 shadow-[inset_0_0_0_1px_rgba(251,191,36,.35)]">{m.cost} CP</span>
                      <Btn pri={staffShown?.id === m.id && !mine && !over} disabled={mine || over > 0} onClick={(ev) => { ev.stopPropagation(); askStaff(listSlot, m); }} style={{ minHeight: 42, padding: '0 14px' }}>
                        {mine ? '선임 중' : over > 0 ? `CP ${over} 부족` : staff[listSlot] ? '교체' : '선임'}
                      </Btn>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {tab === 'items' && (
          <ItemsTab team={team} gold={gold} onShop={onShop} itemId={itemId} target={itemTarget} onPick={(id) => { const it = SHOP_ITEMS.find((x) => x.id === id); setItemId(id); setItemTarget((t) => (t && it && fitsItem(it, t) ? t : null)); }} onTarget={setItemTarget}
            fx={itemFx}
            onUse={(key, t, slot) => {
              /* 고른 아이템 카드가 대상 줄로 날아가 들어가고, 결과 줄에 능력치가 세어 오른다 */
              const it = SHOP_ITEMS.find((x) => x.id === (team.items || []).find((y) => y.key === key)?.itemId);
              flyGhost(document.querySelector(`[data-item="${it?.id}"]`), () => document.querySelector(`[data-target="${CSS.escape(String(t.id))}"]`) || document.querySelector('[data-item-fx]'), { dur: 520, lift: 36 });
              const from = it?.stat ? t.stats?.[it.stat] ?? null : null;
              /* 굴림은 여기서 한 번 — 결과 줄과 저장이 같은 값을 쓴다 */
              const roll = Math.random();
              const train = it?.cat === 'training';
              const fail = train && !trainHit(t, roll);
              setItemFx({ k: `${Date.now()}`, id: t.id, name: t.name, label: it?.stat ? STAT_KO[it.stat] || it.stat : it?.name || '아이템', from, to: from != null ? Math.min(110, from + it.amount) : null,
                fail, lv: train ? trainLevel(t) + (fail ? 0 : 1) : null });
              commit(consumeItem(team, key, t, slot, roll));
              setItemTarget(null);
            }} />
        )}

        {tab === 'items' ? null : tab === 'staff' ? (() => {
          /* 오른쪽 상세 — 영입 DetailPanel 문법: 큰 카드 · 효과 칸 · 키-값 · 아래 단추. 고른 후보가 없으면 그 자리에 앉은 사람 */
          const VIO = '#c4b5fd';
          const slotLabel = STAFF_SLOTS.find((x) => x.key === listSlot)?.label;
          const cur = staff[listSlot];
          const m = staffShown;
          if (!m) return <EmptyDetail />;
          const isCur = cur?.id === m.id;
          const lv = cur?.level || 1;
          const tickets = team.staffTickets || 0;
          const e = effTags(staffRules(m))[0];
          const over = staffOver(listSlot, m);
          const left = cap - squadCost(squad, isCur ? staff : { ...staff, [listSlot]: m });
          const upgrade = () => {
            if (!cur || tickets <= 0 || lv >= STAFF_LEVEL_MAX) return;
            commit({ ...team, staffTickets: tickets - 1, staff: { ...staff, [listSlot]: { ...cur, level: lv + 1 } } });
          };
          return (
            <aside key={m.id} className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(22), '--a': VIO }}>
              <p className="mt-lab" style={{ '--a': VIO }}>{slotLabel} {isCur ? '' : '후보 '}정보</p>
              <div className="mt-holo min-h-0 flex-1 animate-[rise_.35s_ease-out_both]" style={{ '--t': STYLE_COLOR[m.style] || VIO, backgroundImage: `url(staff/${encodeURIComponent(m.id)}.webp), url(ui/mt/silhouette-coach.webp)`, backgroundPosition: '60% 30%' }}>
                <span className="bottom-3.5 left-4 flex flex-col">
                  <small className="text-t4 text-gray-300">{slotLabel} · {m.era}</small>
                  <b className="text-t1 font-black leading-tight text-white">{m.name}</b>
                  {styleOf(m) && <em className="mt-1 self-start rounded-full px-2 py-px text-t4 font-bold not-italic" style={{ color: STYLE_COLOR[m.style], background: `${STYLE_COLOR[m.style]}2a` }}>{styleOf(m).ko}</em>}
                </span>
                <b className="mt-ovr bottom-1.5 right-4 font-display text-[52px] font-extrabold leading-none">{m.cost}<small className="ml-1 text-t3">CP</small></b>
              </div>
              <span className="flex flex-col gap-1.5 rounded-xl bg-white/[0.04] px-4 py-3">
                <span className="flex items-baseline gap-3"><span className="shrink-0 text-t3 font-bold text-gray-200">{e.label}</span><span className="min-w-0 flex-1 truncate text-t3 text-gray-400">{e.desc}</span><b className="shrink-0 font-display text-t1 leading-none" style={{ color: e.c }}>{e.n}</b></span>
                {isCur && lv > 1 && <small className="font-display text-t4 text-emerald-300">Lv.{lv} ×{levelMul(m).toFixed(1)}</small>}
              </span>
              <div className="flex flex-col gap-1.5">
                <KV k="경력" v={m.note} />
                <KV k="CP" v={isCur || !cur ? `${m.cost}` : `${m.cost} (${m.cost - cur.cost > 0 ? '+' : ''}${m.cost - cur.cost})`} color="#fcd34d" />
                <KV k="남는 캡" v={left.toLocaleString()} color={left < 0 ? '#f87171' : undefined} />
                {isCur && <KV k="계약" v={m.contracted ? '계약서' : 'CP'} />}
              </div>
              {isCur ? (
                <div className="grid grid-cols-[1.4fr_1fr] gap-2">
                  <Btn lg a={VIO} pri={tickets > 0 && lv < STAFF_LEVEL_MAX} disabled={tickets <= 0 || lv >= STAFF_LEVEL_MAX} style={cut(12)} onClick={upgrade}>
                    <span className="flex flex-col items-center leading-tight">강화 ▲<small className="text-t4 opacity-75">{lv >= STAFF_LEVEL_MAX ? 'MAX' : `강화권 ${tickets}장`}</small></span>
                  </Btn>
                  <Btn lg className="text-[#ff5a67]" style={cut(12)} onClick={() => askStaff(listSlot, null)}>해임</Btn>
                </div>
              ) : (
                <Btn pri lg disabled={over > 0} style={cut(16)} onClick={() => askStaff(listSlot, m)}>
                  {over > 0 ? `CP ${over} 부족` : cur ? `${cur.name} → ${m.name} 교체` : `${slotLabel} 선임`}
                </Btn>
              )}
            </aside>
          );
        })()
          : (
          <DetailPanel fresh={fresh && shown && fresh.id === shown.id ? fresh.k : null} p={shown} squad={squad} club={clubList} clubCap={clubCap} staff={staff} cap={cap} lim={lim} gold={gold} priceFor={priceFor} outId={outId} onOut={setOutId} onSwap={swap} onAdd={add} onRelease={release}
            onStore={store} onEnter={enter} playing={playing}
            itemsFit={fitTraining(shown).length /* 고르지 않고 기본으로 떠 있는 선수도 — sel 이 아니라 보이는 선수 기준 */}
            onUpgrade={(x) => { setItemTarget(x); setItemId(fitTraining(x)[0]?.id || null); setTab('items'); }} />
        )}
      </div>
      {staffAsk && (() => {
        const was = staff[staffAsk.slot];
        const lost = [(was?.level || 1) > 1 && `Lv.${was.level}`, was?.contracted && '계약서'].filter(Boolean).join(' · ');
        const close = () => setStaffAsk(null);
        return createPortal(
          <Pop eyebrow="감독·코치" title={staffAsk.person ? `${was?.name} → ${staffAsk.person.name}` : `${was?.name} 해임`} sub={`${lost} 사라짐`} a="#f87171" width={480} onClose={close}
            actions={<><Btn onClick={close}>취소</Btn><Btn pri a="#f87171" onClick={() => { setStaff(staffAsk.slot, staffAsk.person); close(); }}>{staffAsk.person ? '교체' : '해임'}</Btn></>}>
            <p className="text-t3 text-gray-300">강화 레벨 · 계약서는 다음 사람에게 넘어가지 않음</p>
          </Pop>,
          document.body,
        );
      })()}
    </div>
  );
}
