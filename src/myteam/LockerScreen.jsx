/*
 * 내 라커 — 위 탭(영입 · 내 선수 · 보관함 · 감독·코치 · 아이템) · 넓은 목록 · 오른쪽 상세(유리 결)
 *  영입(L1): 검색 + 후보 리스트 + 오른쪽 상세
 *  내 선수(L2): 포지션 그룹 목록 + 오른쪽 상세(방출)
 *  감독·코치(L6): 네 자리 슬롯 + 후보 리스트 + 효과 합계
 *  아이템: 상점에서 산 훈련 · 계약서 — 고른 뒤 선수 · 감독/코치에게 사용 (준비 카드는 경기 전 정비에서)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { SQUAD_CAP, CAP_LOUD, BASE_LIMITS, POS_RULES, STAFF_SLOTS, squadCost, foreignCount, freeUsed, addBlockReason, swapCandidates, swapBlockReason, squadIssues, limitsOf, CLUB_MAX } from './rules.js';
import { staffByRole, staffEffect, staffEffectOf, staffReserve, STAFF_LEVEL_MAX } from './staff.js';
import { saveTeam, recruitPlayer, releasePlayer, swapPlayer, storePlayer, enterFromClub, releaseFromClub, bumpWeek, savePreset, loadPreset } from './store.js';
import { presetCount, presetIssue, PRESET_BASE, PRESET_EXTRA_MAX } from './presets.js';
import { priceOf, refundOf, isFreeFill, dailyDeals, todayKey, marketPriceOf, quoteOf, dayIndex } from './market.js';
import { SHOP_ITEMS, itemArt, needsStaff, fitsItem, recommendTargets, consumeItem, STAT_KO, teamWeakness, WEAK_KO, WEAK_COLOR } from './shop.js';
import { playingIds } from './match.js';
import { posColor, statColor, statOf, statPct, teamNeon } from './teamColor.js';
import { UiStyle, GlassBg, TopBar, TopTabs, Btn, Portrait, Hero, KV, FlipFaces, Pop } from './ui.jsx';
import { Count, Burst, flyGhost, useListIntro, navTo } from '../ui/motion.jsx';

/**
 * 빈 보관함 — 아이템 탭 빈 화면(사진 한 장 · 제목 · 단추)과 같은 모양.
 * 채울 자리 20칸을 옅게 보여 주고(카드 앨범처럼), 보관함이 채워지는 두 길로 바로 잇는다: 내 선수 '보관' · 드래프트 기념 카드
 */
function ClubEmpty({ max, onSquad, onDraft }) {
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
        <span className={`mt-6 grid w-[520px] gap-3 ${onDraft ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Btn lg style={cut(12)} onClick={onSquad}>
            <span className="flex flex-col items-center leading-tight">내 선수에서 보관<small className="text-t4 opacity-75">엔트리에서 빼 두기</small></span>
          </Btn>
          {onDraft && (
            <Btn pri lg style={cut(12)} onClick={onDraft}>
              <span className="flex flex-col items-center leading-tight">드래프트 기념 카드 ▶<small className="text-t4 opacity-75">드래프트 보상</small></span>
            </Btn>
          )}
        </span>
      </div>
    </div>
  );
}
import SquadBoard from './SquadBoard.jsx';
import { KEYFRAMES } from '../KboAugmentDraft.jsx';
import { playerTraits, HAND_LABEL } from './traits.js';
import { artId } from '../data/artAlias.js';

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
const ROLE_EN = { manager: '감독', head: '수석 코치', batting: '타격 코치', pitching: '투수 코치' };
const effTags = (e) => Object.entries(e).map(([k, v]) => ({ k, c: EFF_COLOR[k], label: EFF_LABEL[k], n: `+${k === 'steal' ? `${Math.round(v * 100)}%p` : v}` }));
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
function PlayerRow({ p, on, action, blocked, onPick, onAct, bench, onBench, stored = false, price = null, capQuiet = false }) {
  const keys = KEYS[p.type] || KEYS.batter;
  const q = stored ? null : quoteOf(p);
  const deal = q && price != null && price < q.price;
  return (
    <div role="button" onClick={() => onPick(p)} onPointerEnter={() => preloadCard(p)} className={`mt-row h-[72px] cursor-pointer ${on ? 'on' : ''}`} style={{ gridTemplateColumns: ROW_COLS, gap: 14, padding: '0 14px 0 8px' }}>
      <Portrait player={p} w={52} h={52} round t={teamNeon(p)} />
      <b className="mt-ovr text-center font-display text-t1 font-extrabold leading-none">{p.overall}</b>
      <span className="min-w-0">
        <b className="block truncate text-t2 font-black text-white">
          {p.name}
          {p.isForeign && <em className="ml-2 align-middle text-t4 not-italic" style={{ color: WARN }}>외국인</em>}
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
function DetailPanel({ p, squad, club = [], staff, cap, lim = BASE_LIMITS, gold = 0, priceFor = priceOf, outId = null, onOut, onAdd, onSwap, onRelease, onStore, onEnter, playing, onUpgrade, itemsFit = 0, fresh = null }) {
  if (!p) return <EmptyDetail />;
  const owned = squad.some((x) => x.id === p.id);
  const stored = !owned && club.some((x) => x.id === p.id); // 보관함 선수 — 엔트리로 들이는 데 골드가 들지 않는다
  const n = tone(p.overall);
  const cost = squadCost(squad, staff);
  /* 엔트리가 꽉 찼으면 한 명을 내보내며 들인다 — 후보는 같은 포지션 약한 순 */
  const swap = !owned && squad.length >= lim.size;
  const cands = swap ? swapCandidates(p, squad).slice(0, 6) : [];
  const out = swap ? cands.find((x) => x.id === outId) || cands[0] || null : null;
  const after = owned ? cost - p.cost : cost + p.cost - (out?.cost || 0);
  const pay = stored ? null : gold; // 보관함 선수는 골드를 따지지 않는다
  const price = stored ? 0 : priceFor(p); // 오늘의 특가면 그 값
  const blocked = owned ? null : swap ? swapBlockReason(p, out, squad, staff, cap, lim, pay, price) : addBlockReason(p, squad, staff, cap, lim, pay, price);
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
    gold={gold} price={price} refund={refund} cands={cands} out={out} onOut={onOut} onSwap={onSwap}
    stored={stored} clubFull={club.length >= CLUB_MAX} onStore={onStore} onEnter={onEnter} fresh={fresh} />;
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

function DetailBody({ p, cap, onAdd, onRelease, playing, onUpgrade, itemsFit = 0, owned, n, after, blocked, now, next, keys, tr, hand, gold = 0, price = 0, refund = 0, cands = [], out = null, onOut, onSwap,
  stored = false, clubFull = false, onStore, onEnter, fresh = null }) {
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
            <Burst n={18} spread={130} delay={260} />
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
      {/* 교체 영입: 내보낼 선수 고르기 (같은 포지션 약한 순) */}
      {out && (
        <div>
          <p className="pb-1 text-t4 text-gray-400">내보낼 선수</p>
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
      {/* 맨 아래: 남는 캡 · 남는 골드 · 팀 종합 을 버튼 바로 위에 붙이고, 영입할 수 없는 이유는 버튼 글자로 */}
      <div className="shrink-0">
        {!owned && !stored && <KV sm k="영입가" v={`${price.toLocaleString()} G`} color={GOLD} />}
        <KV sm k="남는 골드" v={goldAfter.toLocaleString()} color={goldAfter < 0 ? '#f87171' : '#fff'} />
        <KV sm k="남는 캡" v={(cap - after).toLocaleString()} color={after > cap ? '#f87171' : '#fff'} />
        <KV sm k="팀 종합" v={`${now || '-'} → ${next || '-'}`} color={next >= now ? '#34d399' : '#f87171'} />
      </div>
      <div>
        {owned
          ? (
            /* 코치진 강화 단추와 같은 모양: 강화 · 보관 · 방출 · 아래 작은 글씨에 쓸 수 있는 아이템 수 */
            <div className={`grid gap-2 ${onUpgrade ? 'grid-cols-[1.3fr_1fr_1fr]' : 'grid-cols-2'}`}>
              {onUpgrade && (
                <Btn lg a={n} pri={itemsFit > 0} disabled={!itemsFit} style={cut(12)} onClick={() => onUpgrade(p)}>
                  <span className="flex flex-col items-center leading-tight">강화 ▲<small className="text-t4 opacity-75">{itemsFit ? `아이템 ${itemsFit}개` : '아이템 없음'}</small></span>
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
          : <Btn pri={!blocked} a={n} className={`w-full ${blocked ? 'text-t3 !text-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,.45)]' : ''}`} style={cut(10)} disabled={!!blocked} onClick={() => (out ? onSwap(p, out) : onAdd(p))}>{blocked || `${out ? '교체 영입' : '영입'} · ${price.toLocaleString()} G ▶`}</Btn>}
      </div>
    </aside>
  );
}

/** 라커 규칙 — 골드와 CP 가 무엇을 막는지, 영입 · 방출 · 보관함 · 프리셋 · 시세 */
const LOCKER_RULES = [
  ['골드', '선수를 사는 값 · 영입가 · 시세 · 특가', GOLD],
  ['CP', '한 팀에 담는 한도 · 엔트리 + 코치진', '#34d399'],
  ['둘의 차례', '초반엔 골드 · 선수가 좋아지면 CP', '#e5e7eb'],
  ['교체 영입', '엔트리가 꽉 차면 한 명 내보내며', '#e5e7eb'],
  ['방출', '산 값의 절반 환급', '#fca5a5'],
  ['보관함', '엔트리 밖 20명 · CP 에 안 셈', '#e5e7eb'],
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
  const listFx = useListIntro('items');
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
          <div key={fx.k} data-item-fx="" className="fx-rise mt-cut flex items-baseline gap-2 px-3 py-2" style={{ ...cut(8), background: 'rgba(52,211,153,.1)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,.45)' }}>
            <b className="min-w-0 truncate text-t3 text-white">{fx.name}</b>
            <span className="text-t4 text-gray-300">{fx.label}</span>
            {fx.to != null ? (
              <span className="ml-auto flex items-baseline gap-1.5 font-display">
                <Count value={fx.to} from={fx.from} delay={420} dur={520} className="text-t2 font-extrabold text-white" />
                <b className="fx-bump text-t3 text-[#34d399]" style={{ '--d': '940ms' }}>▲{fx.to - fx.from}</b>
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
                return (
                  <button key={t.id} type="button" data-target={t.id} onClick={() => onTarget(t)} className={`mt-row mt-cut ${on ? 'on' : ''} ${fx?.id === t.id ? 'lk-hit' : ''}`}
                    style={{ gridTemplateColumns: '40px 38px minmax(0,1fr)', '--a': n }}>
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
              {target ? `${target.name}에게 사용 ▶` : '대상 고르기'}
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

export default function LockerScreen({ account, onSave, onBack, onShop, onDraft = null }) {
  const [team, setTeam] = useState(account.team);
  const [gold, setGold] = useState(account.gold || 0);
  const [canOnly, setCanOnly] = useState(false); // 지금 영입할 수 있는 선수만
  const [rulesOpen, setRulesOpen] = useState(false); // 라커 규칙 팝업
  const [dealOnly, setDealOnly] = useState(false); // 오늘의 특가만
  const deals = useMemo(() => dailyDeals(ALL, todayKey()), []); // 하루 한 번 바뀐다 (라커를 다시 열면 새 날짜)
  const today = useMemo(() => dayIndex(), []);
  const priceFor = (p) => deals.get(p.id) ?? marketPriceOf(p, today); // 특가가 아니면 오늘 시세
  const [outId, setOutId] = useState(null); // 교체 영입에서 내보낼 선수 (없으면 첫 후보)
  const [tab, setTab] = useState('scout');
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [club, setClub] = useState('');
  const [pos, setPos] = useState('');
  const [filterOpen, setFilterOpen] = useState(false); // 연도 · 구단 · 포지션 칸
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
  /* 영입 · 방출은 골드와 엔트리를 한 번에 저장한다 (store.recruitPlayer · releasePlayer) */
  const settle = (next) => { if (!next) return; setTeam(next.team); setGold(next.gold); onSave?.(next.team, next.gold); };
  const clubList = team.club || [];
  const inClub = (p) => clubList.some((x) => x.id === p.id);
  const dealBump = (p, next) => { if (next && deals.has(p.id)) bumpWeek('deal'); return next; }; // 주간 과제: 특가 영입
  /* 막 영입한 선수(상세 판 도장) · 막 쓴 아이템 결과 — 잠깐 보였다 사라진다 */
  const [fresh, setFresh] = useState(null);
  const listFx = useListIntro(tab); // 탭을 바꾸면 목록 줄이 차례로
  const [itemFx, setItemFx] = useState(null);
  useEffect(() => { if (!fresh) return undefined; const t = setTimeout(() => setFresh(null), 1800); return () => clearTimeout(t); }, [fresh]);
  useEffect(() => { if (!itemFx) return undefined; const t = setTimeout(() => setItemFx(null), 2600); return () => clearTimeout(t); }, [itemFx]);
  const add = (p) => { if (!addBlockReason(p, squad, staff, cap, lim, gold, priceFor(p))) { settle(dealBump(p, recruitPlayer(team, p, priceFor(p)))); setFresh({ id: p.id, k: `${Date.now()}` }); } };
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
  const rowBlock = (p) => (full ? swapBlockReason(p, swapCandidates(p, squad)[0], squad, staff, cap, lim, gold, priceFor(p)) : addBlockReason(p, squad, staff, cap, lim, gold, priceFor(p)));
  useEffect(() => { setOutId(null); }, [sel?.id]);
  const setStaff = (slot, person) => commit({ ...team, staff: { ...staff, [slot]: person } });
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
    return list.sort(by);
  }, [q, year, club, pos, sort, squad, team.club, canOnly, dealOnly, gold, staff, cap, lim.size, lim.free, lim.foreign]);
  const results = matched.slice(0, limit);
  /* 오른쪽 상세에 보일 선수 — 고른 선수, 없으면 지금 탭 목록의 첫 선수 */
  const shown = sel || (tab === 'scout' ? results[0] : tab === 'club' ? (team.club || [])[0] : tab === 'squad' ? [...squad].sort((x, y) => y.overall - x.overall)[0] : null) || null;

  const NAV = [
    { key: 'scout', label: '영입', img: 'ui/nav/locker-scout.webp' },
    { key: 'squad', label: '내 선수', img: 'ui/nav/locker-squad.webp' },
    { key: 'club', label: '보관함', img: 'ui/nav/locker-squad.webp' },
    { key: 'staff', label: '감독·코치', img: 'ui/nav/locker-staff.webp' },
    { key: 'items', label: '아이템', img: 'ui/nav/locker-items.webp' },
  ];
  const eff = staffEffect(staff);
  const listSlot = staffSlot || STAFF_SLOTS.find((x) => !staff[x.key])?.key || 'manager';
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
              {results.map((p) => (
                <PlayerRow key={p.id} p={p} on={shown?.id === p.id} action={full ? '교체' : '영입'} blocked={rowBlock(p)} showNote={false} teamTint price={priceFor(p)} capQuiet={cost < cap * CAP_LOUD}
                  onPick={setSel} onAct={full ? setSel : add} />
              ))}
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
            {head('보관함', `${clubList.length} / ${CLUB_MAX}`)}
            {clubList.length === 0 ? (
              <ClubEmpty max={CLUB_MAX} onSquad={() => navTo(() => setTab('squad'), 'tab-l')} onDraft={onDraft} />
            ) : (
            <div className={`mt-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-2 ${listFx}`}>
              {clubList.map((p) => {
                const full = squad.length >= lim.size;
                const why = full ? swapBlockReason(p, swapCandidates(p, squad)[0], squad, staff, cap, lim, null) : addBlockReason(p, squad, staff, cap, lim, null);
                return (
                  <PlayerRow key={p.id} p={p} on={shown?.id === p.id} action={full ? '교체' : '넣기'} blocked={why} showNote={false} teamTint stored
                    onPick={setSel} onAct={full ? setSel : (x) => enter(x, null)} />
                );
              })}
            </div>
            )}
          </section>
        )}

        {tab === 'staff' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#c4b5fd' }}>
            {head('코치진 구성', null, '#c4b5fd')}
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
                            style={{ transform: 'translateX(-59%)', backgroundSize: 'auto 256px', backgroundPosition: 'center top', backgroundImage: `url(staff/${encodeURIComponent(m.id)}.webp), url(profiles/${encodeURIComponent(artId(m.id))}.webp), url(ui/mt/silhouette-coach.webp)` }} />
                        )}
                        <span className="absolute inset-x-0 top-0 -bottom-0.5" style={{ background: `linear-gradient(rgba(5,8,15,.35),rgba(5,8,15,${m ? 0 : 0.6}) 30%,rgba(5,8,15,.9) 72%,#05080f 94%)` }} />
                        <span className="absolute left-3.5 top-2.5 font-display text-t2 font-extrabold leading-none text-[#c4b5fd]" style={{ textShadow: '0 0 12px #c4b5fd88' }}>{s.label}</span>
                        {m && <b className="absolute right-3.5 top-3 font-display text-t3 text-amber-300">Lv.{m.level || 1}</b>}
                        <span className="absolute inset-x-3.5 bottom-3">
                          <b className={`block truncate text-t2 font-black ${m ? 'text-white' : 'text-gray-400'}`}>{m?.name || '비어 있음'}</b>
                          {m ? (
                            <span className="block truncate text-t4 font-semibold text-slate-300">
                              {effTags(staffEffectOf(m)).map((e, i) => (
                                <span key={e.k}>{i > 0 && <span className="mx-1.5 text-slate-500">·</span>}{e.label} <b className="font-display text-t3" style={{ color: e.c }}>{e.n}</b></span>
                              ))}
                            </span>
                          ) : <span className="block text-t4 text-gray-500">-</span>}
                        </span>
                      </span>
                    )} />
                  </button>
                );
              })}
            </div>
            <p className="mt-hd !text-t3 pb-1 pt-4">{STAFF_SLOTS.find((s) => s.key === listSlot)?.label} 후보</p>
            {/* 후보 명함: 두 열 · 왼쪽 큰 사진(인물이 가운데 오게) · 오른쪽 직함 · 이름 · 시대 · 경력 · 효과 태그 · 가격 · 선임 */}
            <div className="mt-scroll grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-2" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
              {staffByRole(STAFF_SLOTS.find((s) => s.key === listSlot)?.role).filter((m) => staff[listSlot]?.id !== m.id).map((m) => (
                <div key={m.id} className="mt-cut relative grid h-[120px] bg-[#131c2e]" style={{ ...cut(12), gridTemplateColumns: '120px minmax(0,1fr)', boxShadow: 'inset 0 0 0 1px rgba(196,181,253,.45)' }}>
                  {/* 사진 800×600 을 높이 180 으로 · 인물(가로 59%)이 칸 가운데 오게 가로 -82px */}
                  <span className="bg-no-repeat" style={{ backgroundImage: `url(staff/${encodeURIComponent(m.id)}.webp), url(ui/mt/silhouette-coach.webp)`, backgroundSize: 'auto 180px, auto 100%', backgroundPosition: '-82px -12px, center',
                    maskImage: 'linear-gradient(90deg,#000 72%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,#000 72%,transparent)' }} />
                  <span className="flex min-w-0 flex-col gap-1.5 py-3 pl-1 pr-3.5">
                    <span className="min-w-0 pr-[130px]">
                      <small className="block font-display text-t4 font-bold leading-tight tracking-[0.16em] text-[#c4b5fd]">{ROLE_EN[m.role]}</small>
                      <b className="text-t2 font-black text-white">{m.name}</b><small className="ml-2 text-t4 text-gray-400">{m.era}</small>
                    </span>
                    <small className="truncate text-t4 text-gray-400">{m.note}</small>
                    <span className="text-t3 font-semibold text-slate-300">
                      {effTags(m.effect).map((e, i) => (
                        <span key={e.k} className="whitespace-nowrap">{i > 0 && <span className="mx-[7px] text-slate-500">·</span>}{e.label} <b className="font-display text-t2" style={{ color: e.c }}>{e.n}</b></span>
                      ))}
                    </span>
                  </span>
                  <span className="absolute right-3 top-3 flex items-center gap-2">
                    <b className="font-display text-t2 text-amber-300">{m.cost}<small className="ml-0.5 text-t4 text-gray-400">CP</small></b>
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
          <ItemsTab team={team} gold={gold} onShop={onShop} itemId={itemId} target={itemTarget} onPick={(id) => { const it = SHOP_ITEMS.find((x) => x.id === id); setItemId(id); setItemTarget((t) => (t && it && fitsItem(it, t) ? t : null)); }} onTarget={setItemTarget}
            fx={itemFx}
            onUse={(key, t, slot) => {
              /* 고른 아이템 카드가 대상 줄로 날아가 들어가고, 결과 줄에 능력치가 세어 오른다 */
              const it = SHOP_ITEMS.find((x) => x.id === (team.items || []).find((y) => y.key === key)?.itemId);
              flyGhost(document.querySelector(`[data-item="${it?.id}"]`), () => document.querySelector(`[data-target="${CSS.escape(String(t.id))}"]`) || document.querySelector('[data-item-fx]'), { dur: 520, lift: 36 });
              const from = it?.stat ? t.stats?.[it.stat] ?? null : null;
              setItemFx({ k: `${Date.now()}`, id: t.id, name: t.name, label: it?.stat ? STAT_KO[it.stat] || it.stat : it?.name || '아이템', from, to: from != null ? Math.min(110, from + it.amount) : null });
              commit(consumeItem(team, key, t, slot));
              setItemTarget(null);
            }} />
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
              <p className="mt-lab" style={{ '--a': VIO }}>팀 보정</p>
              <h2 className="-mt-1 text-t1 font-black text-white">코치진 효과</h2>
              {/* 기여도 막대: 전체 효과 중 선택한 코치 몫을 밝게 */}
              <div className="flex flex-col gap-2">
                {shown.map(([k, v]) => (
                  <div key={k} className="grid items-center gap-2.5 text-t3 text-gray-300" style={{ gridTemplateColumns: '50px 1fr 50px' }}>
                    <span>{EFF_LABEL[k]}</span>
                    <span className="relative block h-[5px] bg-white/[0.08]">
                      <i className="absolute inset-y-0 left-0 block" style={{ width: `${(size(k, v) / maxV) * 100}%`, background: statColor((size(k, v) / maxV) * 100, EFF_COLOR[k]).bar, opacity: 0.45 }} />
                      <i className="absolute inset-y-0 left-0 block transition-[width] duration-300" style={{ width: `${(size(k, mine[k] || 0) / maxV) * 100}%`, background: statColor((size(k, mine[k] || 0) / maxV) * 100, EFF_COLOR[k]).bar }} />
                    </span>
                    <b className="text-right font-display text-t3 text-white">+{k === 'steal' ? `${Math.round(v * 100)}%p` : v}</b>
                  </div>
                ))}
                {!shown.length && <span className="text-t3 text-gray-500">-</span>}
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
                          <span className="block font-display text-t4 tracking-[0.2em]" style={{ color: VIO }}>{x.label}</span>
                          <b className={`block truncate text-t2 font-black ${m ? 'text-white' : 'text-gray-500'}`}>{m ? m.name : '비어 있음'}</b>
                          {m && <span className="block truncate text-t4 text-gray-400">{m.era} · {m.contracted ? '계약서' : `${m.cost} CP`}</span>}
                        </span>
                        {m && <b className="self-start font-display text-t3 text-amber-300">Lv.{m.level || 1}</b>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                (() => {
                  const m = cur;
                  if (!m) return <div className="mt-cut grid h-[230px] shrink-0 place-items-center text-t3 text-gray-500" style={{ ...cut(14), background: 'rgba(255,255,255,.03)' }}>{slotInfo?.label} -</div>;
                  const mLv = m.level || 1;
                  return (
                    <div className="mt-cut relative h-[230px] shrink-0 overflow-hidden" style={{ ...cut(14), background: '#140f24', boxShadow: 'inset 0 0 0 1px rgba(196,181,253,.35)' }}>
                      <span className="absolute inset-y-0 right-0 w-[62%] bg-cover" style={{ backgroundPosition: '60% 20%', backgroundImage: `url(staff/${encodeURIComponent(m.id)}.webp), url(ui/mt/silhouette-coach.webp)` }} />
                      <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#140f24 40%,rgba(20,15,36,.85) 52%,rgba(20,15,36,0) 74%)' }} />
                      <div className="absolute inset-y-3.5 left-4 flex w-[60%] flex-col gap-0.5">
                        <span className="font-display text-t4 tracking-[0.24em]" style={{ color: VIO }}>{slotInfo?.label}</span>
                        <b className="text-t1 font-black leading-tight text-white">{m.name}</b>
                        <span className="text-t4 text-gray-400">{m.era}{m.contracted ? ' · 계약서' : ` · ${m.cost} CP`}</span>
                        <span className="mt-0.5 text-t4 leading-snug text-gray-300">{m.note}</span>
                        <div className="mt-auto flex flex-col gap-0.5">
                          {Object.entries(staffEffectOf(m)).map(([k, v]) => (
                            <span key={k} className="flex items-baseline gap-1.5 text-t3 text-gray-300">
                              {EFF_LABEL[k]}<b className="font-display text-t2" style={{ color: VIO }}>+{k === 'steal' ? `${Math.round(v * 100)}%p` : v}</b>
                              {mLv > 1 && <small className="font-display text-t4 text-emerald-300">▲{k === 'steal' ? `${mLv - 1}%p` : mLv - 1}</small>}
                            </span>
                          ))}
                        </div>
                      </div>
                      <b className="absolute right-3 top-3 bg-[#05080f]/70 px-2 font-display text-t3 text-amber-300">Lv.{mLv}</b>
                    </div>
                  );
                })()
              )}

              {staffSlot && <div className="mt-auto grid grid-cols-[1.4fr_1fr] gap-2">
                <Btn lg a={VIO} pri={!!cur && tickets > 0 && lv < STAFF_LEVEL_MAX} disabled={!cur || tickets <= 0 || lv >= STAFF_LEVEL_MAX} style={cut(12)} onClick={upgrade}>
                  <span className="flex flex-col items-center leading-tight">강화 ▲<small className="text-t4 opacity-75">{lv >= STAFF_LEVEL_MAX ? 'MAX' : `강화권 ${tickets}장`}</small></span>
                </Btn>
                <Btn lg className="text-[#ff5a67]" style={cut(12)} disabled={!cur} onClick={() => cur && setStaff(staffSlot, null)}>해임</Btn>
              </div>}
            </aside>
          );
        })()
          : (
          <DetailPanel fresh={fresh && shown && fresh.id === shown.id ? fresh.k : null} p={shown} squad={squad} club={clubList} staff={staff} cap={cap} lim={lim} gold={gold} priceFor={priceFor} outId={outId} onOut={setOutId} onSwap={swap} onAdd={add} onRelease={release}
            onStore={store} onEnter={enter} playing={playing}
            itemsFit={!sel ? 0 : (team.items || []).filter((x) => { const it = SHOP_ITEMS.find((i) => i.id === x.itemId); return it?.stat && fitsItem(it, sel); }).length}
            onUpgrade={(x) => { setItemTarget(x); setItemId(null); setTab('items'); }} />
        )}
      </div>
    </div>
  );
}
