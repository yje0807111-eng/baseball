/*
 * 내 라커 — 사이드 네비(영입 · 내 선수 · 감독·코치)와 드래프트 '선수 평점' 문법의 리스트
 *  영입(L1): 검색 + 후보 리스트 + 오른쪽 상세
 *  내 선수(L2): 포지션 그룹 목록 + 오른쪽 상세(방출)
 *  감독·코치(L6): 네 자리 슬롯 + 후보 리스트 + 효과 합계
 *  아이템: 상점에서 산 훈련·부스트·계약서 — 고른 뒤 아무 선수·감독/코치에게 사용
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { SQUAD_SIZE, SQUAD_CAP, FOREIGN_MAX, POS_RULES, FREE_SLOTS, STAFF_SLOTS, squadCost, foreignCount, freeUsed, addBlockReason, squadIssues } from './rules.js';
import { staffByRole, staffEffect, staffEffectOf, STAFF_LEVEL_MAX } from './staff.js';
import { saveTeam } from './store.js';
import { SHOP_ITEMS, needsStaff, fitsItem, recommendTargets, consumeItem } from './shop.js';
import { playingIds } from './match.js';
import { posColor, statColor } from './teamColor.js';
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
const effText = (e) => Object.entries(e).map(([k, v]) => `${EFF_LABEL[k]} +${k === 'steal' ? `${Math.round(v * 100)}%p` : v}`).join(' · ');
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
function PlayerRow({ p, on, action, blocked, onPick, onAct, showNote = true, bench, onBench }) {
  const n = tone(p.overall);
  const keys = KEYS[p.type] || KEYS.batter;
  return (
    <div role="button" onClick={() => onPick(p)} onPointerEnter={() => preloadCard(p)} className={`mt-row mt-cut cursor-pointer ${on ? 'on' : ''}`} style={{ gridTemplateColumns: ROW_COLS, '--a': n }}>
      <Portrait player={p} w={46} h={54} color={n} />
      <b className="font-display text-[30px] font-extrabold leading-none" style={{ color: n, textShadow: `0 0 14px ${n}88` }}>{p.overall}</b>
      <span className="min-w-0">
        <b className="block truncate text-base font-black text-white">
          {p.name}
          <em className="ml-1.5 px-1.5 py-px text-[11px] not-italic text-[#05080f]" style={{ background: n }}>{p.position}</em>
          {p.isForeign && <em className="ml-1.5 text-[10px] not-italic text-amber-300">외국인</em>}
          {onBench && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onBench(p); }} title={bench ? '눌러서 출전 선수로' : '눌러서 벤치로'}
              className={`mt-cut ml-2 px-2 py-px align-middle text-[11px] font-bold ${bench ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35'}`} style={{ '--c': '4px' }}>
              {bench ? '벤치 ↑' : '출전 ●'}
            </button>
          )}
        </b>
        <small className="block truncate text-[11px] text-gray-500">
          {p.year} {p.team}{showNote && p.note ? ` · ${p.note}` : ''}
        </small>
      </span>
      {keys.map(([label, k]) => {
        const v = p.stats?.[k] ?? 0;
        return (
          <span key={k} className="min-w-0">
            <span className="flex items-baseline justify-between text-[12px] font-semibold text-gray-300">{label}<b className="font-display text-[15px]" style={{ color: statColor(v, posColor(p)).num }}>{v}</b></span>
            <span className="relative mt-[4px] block h-[6px] bg-white/[0.08]">
              <b className="absolute inset-y-0 left-0 block" style={{ width: `${v}%`, background: statColor(v, posColor(p)).bar }} />
            </span>
          </span>
        );
      })}
      <b className="text-right font-display text-lg text-amber-300">{p.cost}</b>
      <Btn sm pri={on} a={n} disabled={!!blocked} title={blocked || ''} onClick={(e) => { e.stopPropagation(); onAct(p); }}>{action}</Btn>
    </div>
  );
}

/** 선수를 고르기 전 오른쪽 상세: 실제 상세 판과 같은 자리에 스켈레톤 블록 (드래프트 빈 PICK 과 같은 대기 움직임) */
function EmptyDetail() {
  let i = 0;
  const sk = (style, cls = '') => <span className={`mt-sk ${cls}`} style={{ ...style, '--i': i++ }} />;
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3 p-5" style={cut(20)} aria-label="선수를 고르면 여기에 표시됩니다">
      <p className="mt-lab" style={{ '--a': '#64748b' }}>Player</p>
      {/* 드래프트 빈 PICK 카드 그대로: 카드 모양 스켈레톤 · 둘레 도는 빛 */}
      <div className="flex min-h-0 flex-1 justify-center">
        <div className="aspect-[2/3] h-full max-w-full">
          <div className="pk-empty aspect-[2/3] w-full">
            {PK_SKELETON.map((st, k) => <span key={k} className="pk-sk" style={{ ...st, '--i': k }} />)}
            <span className="pk-fr" />
          </div>
        </div>
      </div>
      <div className="mt-cut grid grid-cols-6 gap-2 bg-white/[0.03] px-3 py-2" style={cut(8)}>
        {[0, 1, 2, 3, 4, 5].map((k) => <div key={k} className="flex flex-col items-center gap-1.5">{sk({ width: '70%', height: 7 })}{sk({ width: '55%', height: 13 })}</div>)}
      </div>
      <div className="flex flex-col gap-1">
        {sk({ height: 26, '--c': '6px', boxShadow: 'inset 3px 0 0 rgba(52,211,153,.25)' }, 'mt-cut')}
        {sk({ height: 26, '--c': '6px', boxShadow: 'inset 3px 0 0 rgba(248,113,113,.2)' }, 'mt-cut')}
      </div>
      <div className="flex flex-col">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center justify-between border-b border-white/10 py-3">{sk({ width: 70, height: 10 })}{sk({ width: 96, height: 14 })}</div>
        ))}
      </div>
      <div>
        <div className="mt-cut mt-skbtn h-[54px] w-full" style={cut(12)} />
      </div>
    </aside>
  );
}

/** 오른쪽 상세 — 모드 설명 패널 문법: 큰 사진 · 수치 칸 · 막대 · 키-값 · 아래 큰 버튼 */
function DetailPanel({ p, squad, staff, cap, onAdd, onRelease, playing, onBench }) {
  if (!p) return <EmptyDetail />;
  const owned = squad.some((x) => x.id === p.id);
  const n = tone(p.overall);
  const cost = squadCost(squad, staff);
  const after = owned ? cost - p.cost : cost + p.cost;
  const blocked = owned ? null : addBlockReason(p, squad, staff, cap);
  const sum = squad.reduce((s, x) => s + x.overall, 0);
  const now = squad.length ? Math.round(sum / squad.length) : 0;
  const next = owned
    ? (squad.length > 1 ? Math.round((sum - p.overall) / (squad.length - 1)) : 0)
    : Math.round((sum + p.overall) / (squad.length + 1));
  const keys = KEYS[p.type] || KEYS.batter;
  const tr = playerTraits(p);
  const hand = HAND_LABEL(p);
  return <DetailBody p={p} squad={squad} staff={staff} cap={cap} onAdd={onAdd} onRelease={onRelease} playing={playing} onBench={onBench}
    owned={owned} n={n} after={after} blocked={blocked} now={now} next={next} keys={keys} tr={tr} hand={hand} />;
}

/** 카드(2:3)와 그 아래 붙은 실적 줄: 판에서 남은 높이 · 폭을 재서 카드 크기를 정하고, 실적 줄을 카드 폭에 맞춘다 */
function CardWithRecord({ p }) {
  const box = useRef(null);
  const recRef = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => {
      const recH = recRef.current?.offsetHeight || 0;
      setW(Math.max(0, Math.floor(Math.min(el.clientWidth, ((el.clientHeight - recH) * 2) / 3))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="flex min-h-0 flex-1 flex-col items-center">
      <div style={{ width: w }}>
        <div className="aspect-[2/3] w-full">
          <PlayerCard key={p.id} player={p} reason={null} onSelect={() => {}} />
        </div>
        {/* 칸마다 세로 구분선 · 이름은 밝은 회색 영문 서체 · 숫자는 크고 굵게 — 작은 칸에서도 읽히게 */}
        <div ref={recRef} className="grid grid-cols-6 divide-x divide-white/[0.08] bg-[#0b1220] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" style={{ clipPath: 'polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)' }}>
          {recordCells(p).map(([k, v]) => (
            <div key={k} className="flex flex-col items-center justify-center gap-0.5 py-1.5 leading-none">
              <span className="text-[11px] font-semibold text-gray-300">{k}</span>
              <b className={`font-display text-[18px] font-extrabold tabular-nums ${v == null ? 'text-gray-600' : 'text-white'}`}>{v ?? '-'}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailBody({ p, cap, onAdd, onRelease, playing, onBench, owned, n, after, blocked, now, next, keys, tr, hand }) {
  return (
    <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2 p-4" style={{ ...cut(20), '--a': n }}>
      <p className="mt-lab" style={{ '--a': n }}>{owned ? 'My Player' : 'Scouting'}</p>
      {/* 드래프트 PICK 카드 그대로 + 바로 아래 같은 폭으로 붙은 실적 줄 — 남은 높이에 맞춰 2:3 */}
      <CardWithRecord p={p} />
      {/* 실적: 시즌 기록 */}
      {/* 강점 · 약점: 두 줄 격자의 작은 칩 (아이콘 · 이름 · 근거 수치) */}
      {(tr.good.length > 0 || tr.bad.length > 0) && (
        <div className="grid grid-cols-2 gap-1">
          {[...tr.good.map((t) => [t, true]), ...tr.bad.map((t) => [t, false])].map(([t, good]) => (
            <div key={t.id} className="flex h-6 min-w-0 items-center gap-1.5 pl-2 pr-1.5" style={{ background: good ? 'rgba(52,211,153,.07)' : 'rgba(248,113,113,.07)', boxShadow: `inset 2px 0 0 ${good ? '#34d399' : '#f87171'}` }}>
              <span className="h-3.5 w-3.5 shrink-0" style={traitIconStyle(t.id, good ? '#6ee7b7' : '#fca5a5')} />
              <b className="shrink-0 text-[12px] text-white">{t.name}</b>
              <span className={`ml-auto truncate font-display text-[11px] ${good ? 'text-emerald-300' : 'text-red-300'}`}>{t.why}</span>
            </div>
          ))}
        </div>
      )}
      {/* 맨 아래: 캡 · 팀 종합 을 버튼 바로 위에 붙이고, 영입할 수 없는 이유는 버튼 글자로 */}
      <div className="flex items-baseline justify-between border-y border-white/10 py-1.5 text-[12.5px] text-gray-400">
        <span>{owned ? '방출 후 캡' : '영입 후 캡'} <b className="ml-1 font-display text-[15px]" style={{ color: after > cap ? '#f87171' : '#fff' }}>{after.toLocaleString()} / {cap.toLocaleString()}</b></span>
        <span>팀 종합 <b className="ml-1 font-display text-[15px]" style={{ color: next >= now ? '#34d399' : '#f87171' }}>{now || '-'} → {next || '-'}</b></span>
      </div>
      <div>
        {owned
          ? (
            <div className="grid grid-cols-2 gap-2">
              {onBench && <Btn style={cut(10)} onClick={() => onBench(p)}>{playing?.has(p.id) ? '벤치로 ↓' : '출전 ↑'}</Btn>}
              <Btn className={`text-[#ff5a67] ${onBench ? '' : 'col-span-2'}`} style={cut(10)} onClick={() => onRelease(p)}>방출하기</Btn>
            </div>
          )
          : <Btn pri={!blocked} a={n} className={`w-full ${blocked ? 'text-[14px] !text-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,.45)]' : ''}`} style={cut(10)} disabled={!!blocked} onClick={() => onAdd(p)}>{blocked || '영입하기 ▶'}</Btn>}
      </div>
    </aside>
  );
}

const STAT_KO = { power: '파워', contact: '컨택', speed: '주루', control: '제구', stuff: '구위', stamina: '체력' };
const ITEM_COLOR = { training: '#7dd3fc', boost: '#34d399', staff: '#c4b5fd' };

/** 아이템 탭 — 가운데 보유 아이템 카드 · 오른쪽 대상 고르기(추천 대상은 위에 ★) + 사용 */
function ItemsTab({ team, itemId, target, onPick, onTarget, onUse }) {
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
  const after = it?.stat && target?.stats ? Math.min(99, (target.stats[it.stat] ?? 70) + it.amount) : null;
  return (
    <>
      <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#fde047' }}>
        <div className="flex items-baseline gap-3">
          <p className="mt-lab" style={{ '--a': '#fde047' }}>Items</p>
          <p className="text-sm text-gray-400">보유 {inv.length}개 · {groups.length}종</p>
        </div>
        <div className="mt-scroll mt-3 grid min-h-0 flex-1 grid-cols-4 content-start gap-3 overflow-y-auto pr-2" style={{ gridAutoRows: '12.5rem' }}>
          {groups.map(({ it: x, keys }) => {
            const c = ITEM_COLOR[x.cat] || '#fde047';
            const on = it?.id === x.id;
            return (
              <button key={x.id} type="button" onClick={() => onPick(x.id)}
                className={`mt-cut ${on ? 'mt-frame' : ''} relative h-full w-full overflow-hidden bg-[#0b1220] bg-cover bg-center text-left transition hover:brightness-110`}
                style={{ '--c': '12px', '--a': c, backgroundImage: `url(ui/mt/${x.img}.webp)` }}>
                <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.5),rgba(5,8,15,0) 30%,rgba(5,8,15,.92) 68%,#05080f)' }} />
                <span className="mt-cut absolute right-2.5 top-2.5 px-2 font-display text-lg font-extrabold text-[#05080f]" style={{ '--c': '5px', background: c }}>×{keys.length}</span>
                <span className="absolute inset-x-3 bottom-2.5 block">
                  <b className="block truncate text-base font-black text-white">{x.name}</b>
                  <span className="block truncate text-[11px] text-gray-400">{x.desc}</span>
                </span>
              </button>
            );
          })}
          {groups.length === 0 && <p className="col-span-4 text-sm text-gray-500">보유한 아이템이 없습니다. 상점에서 훈련·부스트·계약서를 사 오세요.</p>}
        </div>
      </section>

      <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={{ ...cut(20), '--a': n }}>
        <p className="mt-lab" style={{ '--a': n }}>Use Item</p>
        {!it ? <p className="text-sm text-gray-500">아이템을 고르세요.</p> : (
          <>
            <Hero img={`url(ui/mt/${it.img}.webp)`} name={it.name} color={n} h={130} pos="center" />
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
                        {it.stat && t.stats ? ` · ${t.stats[it.stat] ?? '-'} → ${Math.min(99, (t.stats[it.stat] ?? 70) + it.amount)}` : ''}
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

export default function LockerScreen({ account, onSave, onBack }) {
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
  const issues = squadIssues(squad, staff, cap);
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
  const add = (p) => { if (!addBlockReason(p, squad, staff, cap)) commit({ ...team, squad: [...squad, p] }); };
  const release = (p) => { commit({ ...team, squad: squad.filter((x) => x.id !== p.id), bench: (team.bench || []).filter((id) => id !== p.id) }); setSel(null); };
  const setStaff = (slot, person) => commit({ ...team, staff: { ...staff, [slot]: person } });

  const autoFill = () => {
    let next = [...squad];
    const tryAdd = (want) => {
      const slots = SQUAD_SIZE - next.length;
      const budget = Math.max(40, Math.floor((cap - squadCost(next, staff)) / Math.max(1, slots)));
      const pool = ALL.filter((p) => (!want || p.position === want) && p.cost <= budget && !addBlockReason(p, next, staff, cap)).sort((a, b) => b.overall - a.overall);
      if (!pool.length) return false;
      next = [...next, pool[0]];
      return true;
    };
    for (const r of POS_RULES) {
      for (let i = next.filter((p) => p.position === r.key).length; i < r.min && next.length < SQUAD_SIZE; i++) tryAdd(r.key);
    }
    // 자유 자리: 경기에 나가는 불펜 8명을 먼저 채우고, 그다음 수비 폭을 넓히는 야수 · 포수 순
    for (const want of ['RP', 'RP', 'OF', 'SS', 'C']) { if (next.length < SQUAD_SIZE) tryAdd(want); }
    while (next.length < SQUAD_SIZE) { if (!tryAdd(null)) break; }
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
    { key: 'scout', label: '영입', img: 'ui/mt/tile-locker.webp' },
    { key: 'squad', label: '내 선수', img: 'ui/mt/mt-card.webp' },
    { key: 'staff', label: '감독·코치', img: 'ui/mt/silhouette-coach.webp' },
    { key: 'items', label: '아이템', img: 'ui/mt/mt-boost.webp' },
  ];
  const eff = staffEffect(staff);
  const listSlot = staffSlot || STAFF_SLOTS.find((x) => !staff[x.key])?.key || 'manager';
  const staffCost = Object.values(staff).reduce((s, x) => s + (x?.cost || 0), 0);
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
      <style>{KEYFRAMES}</style>
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
            const entryOk = squad.length === SQUAD_SIZE && !issues.length;
            return (
              <>
                <div className="flex items-center justify-between px-0.5 pb-2.5">
                  <p className="mt-lab" style={{ fontSize: 10 }}>Squad</p>
                  {frac(squad.length, SQUAD_SIZE, entryOk ? '#34d399' : squad.length > SQUAD_SIZE ? '#f87171' : '#e5e7eb')}
                </div>
                <div className="grid grid-cols-2 gap-x-2.5">
                  <div>{['SP', 'RP', 'C', 'OF', 'DH'].map(cell)}</div>
                  <div>{['1B', '2B', '3B', 'SS'].map(cell)}</div>
                </div>
                <div className="mt-3 flex justify-between px-[5px] text-[13px] text-gray-300">
                  <span>자유 자리 {frac(used, FREE_SLOTS, used > FREE_SLOTS ? '#f87171' : used === FREE_SLOTS ? '#34d399' : '#e5e7eb')}</span>
                  <span>외국인 {frac(fc, FOREIGN_MAX, fc > FOREIGN_MAX ? '#f87171' : '#e5e7eb')}</span>
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
                <PlayerRow key={p.id} p={p} on={sel?.id === p.id} action="영입" blocked={addBlockReason(p, squad, staff, cap)}
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
          <SquadBoard team={team} squad={squad} bench={bench} cost={cost} sizeLabel={`${squad.length} / ${SQUAD_SIZE}명`}
            sel={sel} onSelect={setSel} onCommit={commit} onToggleBench={toggleBench}
            onAutoFill={autoFill} autoDisabled={squad.length >= SQUAD_SIZE} />
        )}

        {tab === 'staff' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#c4b5fd' }}>
            {head('Staff', `${Object.values(staff).filter(Boolean).length} / 4 자리 · 코치진 ${staffCost} CP`, '#c4b5fd')}
            <div className="mt-3 grid h-48 shrink-0 grid-cols-4 gap-3">
              {STAFF_SLOTS.map((s) => {
                const cur = staff[s.key];
                const on = staffSlot === s.key;
                return (
                  <button key={s.key} type="button" onClick={() => setStaffSlot(on ? null : s.key)} aria-pressed={on}
                    aria-label={cur ? `${s.label} ${cur.name}` : `${s.label} 비어 있음`} className="group relative h-full text-left">
                    <FlipFaces value={cur} keyOf={(m) => m?.id || 'empty'} className="h-full" render={(m) => (
                      <span className={`mt-cut ${on ? 'mt-frame' : ''} relative block h-full w-full overflow-hidden bg-[#0b1220] bg-cover bg-top`}
                        style={{ ...cut(12), '--a': '#c4b5fd', backgroundImage: 'url(ui/mt/silhouette-coach.webp)', filter: on ? undefined : 'brightness(.82)' }}>
                        {m && (
                          <span className="absolute inset-0 bg-cover transition-transform duration-300 group-hover:scale-105"
                            style={{ backgroundPosition: '60% 30%', backgroundImage: `url(staff/${encodeURIComponent(m.id)}.webp), url(profiles/${encodeURIComponent(m.id)}.webp), url(ui/mt/silhouette-coach.webp)` }} />
                        )}
                        <span className="absolute inset-0" style={{ background: `linear-gradient(rgba(5,8,15,.4),rgba(5,8,15,${m ? 0 : 0.6}) 30%,rgba(5,8,15,.92) 70%,#05080f)` }} />
                        <span className="absolute left-3 top-2 font-display text-2xl font-extrabold text-[#c4b5fd]" style={{ textShadow: '0 0 16px #c4b5fd88' }}>{s.label}</span>
                        {m && <b className="absolute right-3 top-3 font-display text-[14px] text-amber-300">Lv.{m.level || 1}</b>}
                        <span className="absolute inset-x-3 bottom-2.5">
                          <b className={`block truncate text-lg font-black ${m ? 'text-white' : 'text-gray-500'}`}>{m?.name || '비어 있음'}</b>
                          <span className="block truncate text-[12px] text-[#c4b5fd]">{m ? effText(staffEffectOf(m)) : '-'}</span>
                        </span>
                      </span>
                    )} />
                  </button>
                );
              })}
            </div>
            <div className="mt-grp">{STAFF_SLOTS.find((s) => s.key === listSlot)?.label} 후보</div>
            <div className="mt-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
              {staffByRole(STAFF_SLOTS.find((s) => s.key === listSlot)?.role).filter((m) => staff[listSlot]?.id !== m.id).map((m) => {
                return (
                  <div key={m.id} className="mt-row mt-cut" style={{ gridTemplateColumns: '46px minmax(0,1fr) minmax(0,1.2fr) 60px 76px', '--a': '#c4b5fd' }}>
                    <Portrait player={m} staff w={44} h={52} color="#c4b5fd" />
                    <span className="min-w-0"><b className="block truncate text-base font-black text-white">{m.name}</b><small className="text-[11px] text-gray-500">{m.era} · {m.note}</small></span>
                    <span className="text-sm text-[#c4b5fd]">{effText(m.effect)}</span>
                    <b className="text-right font-display text-lg text-amber-300">{m.cost}</b>
                    <Btn sm a="#c4b5fd" onClick={() => setStaff(listSlot, m)}>{staff[listSlot] ? '교체' : '선임'}</Btn>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === 'items' && (
          <ItemsTab team={team} itemId={itemId} target={itemTarget} onPick={(id) => { setItemId(id); setItemTarget(null); }} onTarget={setItemTarget}
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
                    <span className="relative h-2.5 bg-white/[0.07]">
                      <i className="absolute inset-y-0 left-0" style={{ width: `${(size(k, v) / maxV) * 100}%`, background: 'rgba(196,181,253,.35)' }} />
                      <i className="absolute inset-y-0 left-0 transition-[width] duration-300" style={{ width: `${(size(k, mine[k] || 0) / maxV) * 100}%`, background: VIO, boxShadow: `0 0 10px ${VIO}` }} />
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
          <DetailPanel p={sel} squad={squad} staff={staff} cap={cap} onAdd={add} onRelease={release}
            playing={playing} onBench={tab === 'squad' ? toggleBench : null} />
        )}
      </div>
    </div>
  );
}
