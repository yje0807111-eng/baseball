/*
 * 증강 도감 — 내 증강 풀 관리 (게임 결: 금테 진열장 · 육각 도감)
 *  왼쪽: 고른 증강 진열장 — 육각 그림 · 레벨 보석 · 레벨별 효과(지금 · 다음 칸) · 강화 · 제외 · 즐겨찾기
 *  오른쪽: 육각 도감 — 종류 · 즐겨찾기 · 제외 거르기, 제외 도장 · 즐겨찾기 별 · 레벨 보석
 *  위 줄: 강화권 · 제외 칸
 */
import React, { useMemo, useState } from 'react';
import { AUGMENTS, augDescAt } from '../KboAugmentDraft.jsx';
import { loadAccount, saveAug, AUG_TIERS, AUG_LEVEL_MAX } from './store.js';
import { UiStyle, GlassBg, TopBar } from './ui.jsx';

const cut = (n) => ({ '--c': `${n}px` });
const TYPE_ORDER = [['build', '키우기'], ['defense', '수비'], ['extreme', '맞바꾸기'], ['balance', '약점 보강'], ['fire', '경기 중'], ['situ', '상황']];
const TYPE_KO = Object.fromEntries(TYPE_ORDER);
const RED = '#f87171';

/** 육각 틀 — 금 · 보라 테 안에 증강 그림 */
const HEX_CSS = `
  .ag-hexf { position:relative; flex:none; display:grid; place-items:center; clip-path:polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%); background:linear-gradient(135deg,#f5d27a,#8a6a25 40%,#a78bfa 70%,#f5d27a); }
  .ag-hexf > i { position:absolute; inset:3px; clip-path:inherit; background:#0b1220 center 22%/cover no-repeat; }
  .ag-slot { position:relative; display:flex; flex-direction:column; align-items:center; gap:7px; padding:10px 4px 9px; border-radius:14px; cursor:pointer; transition:background .2s, transform .2s; }
  .ag-slot:hover { background:rgba(196,181,253,.08); transform:translateY(-2px); }
  .ag-slot.on { background:radial-gradient(60% 60% at 50% 35%,rgba(167,139,250,.3),transparent 72%); }
  .ag-slot.on .ag-hexf { filter:drop-shadow(0 0 14px #a78bfa); }
  .ag-slot.ban .ag-hexf { filter:grayscale(1) brightness(.45); }
  .ag-pill { height:32px; padding:0 13px; border-radius:999px; font-size:12px; font-weight:700; color:#9ca3af; background:rgba(255,255,255,.05); box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
  .ag-pill.on { color:#fff; background:linear-gradient(180deg,rgba(196,181,253,.3),rgba(124,58,237,.2)); box-shadow:inset 0 0 0 1px rgba(196,181,253,.7),0 0 18px -4px #a78bfa; }
  .ag-num { font-family:'Saira Condensed',sans-serif; font-weight:800; color:#e9d5ff; text-shadow:0 0 12px rgba(167,139,250,.7); }
  .ag-shine { position:absolute; inset:0; pointer-events:none; clip-path:inherit; background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.32) 47%,rgba(196,181,253,.25) 52%,transparent 64%) 0 0/220% 100% no-repeat; animation:mtSheen 4.5s ease-in-out infinite; mix-blend-mode:screen; }
`;
const art = (a) => `url(augments/${a.id}.webp)`;
/** 효과 글 속 숫자만 빛나게 */
const Lit = ({ text }) => (
  <>{String(text).split(/([+\-−]?\d+(?:\.\d+)?%?p?)/g).map((t, i) => (i % 2 ? <b key={i} className="ag-num">{t}</b> : t))}</>
);
const Gems = ({ lv, sm = false }) => (
  <span className={`flex ${sm ? 'gap-[5px]' : 'gap-2'}`}>
    {Array.from({ length: AUG_LEVEL_MAX }, (_, i) => <i key={i} className={`mt-gem ${i < lv ? '' : 'off'}`} style={sm ? { width: 8, height: 8, borderRadius: 2 } : undefined} />)}
  </span>
);
const FILTERS = [['all', '전체'], ['fav', '★ 즐겨찾기'], ...TYPE_ORDER, ['ban', '제외']];

export default function AugmentScreen({ account, onBack }) {
  const [aug, setAug] = useState(() => loadAccount()?.aug || account.aug);
  const [filter, setFilter] = useState('all');
  const [selId, setSelId] = useState(null);
  const [msg, setMsg] = useState('');
  const tier = AUG_TIERS[0];
  const pool = useMemo(() => AUGMENTS.filter((a) => a.tier === tier), [tier]);
  const bans = aug.bans[tier] || [];
  const slots = aug.slots[tier];
  const favs = aug.favs || [];
  const levelOf = (a) => aug.levels[a.id] || 0;

  const commit = (next, text) => { setAug(next); saveAug(next); if (text) { setMsg(text); setTimeout(() => setMsg(''), 2400); } };
  const toggleFav = (a) => commit({ ...aug, favs: favs.includes(a.id) ? favs.filter((x) => x !== a.id) : [...favs, a.id] });
  const toggleBan = (a) => {
    const cur = aug.bans[a.tier] || [];
    if (cur.includes(a.id)) { commit({ ...aug, bans: { ...aug.bans, [a.tier]: cur.filter((x) => x !== a.id) } }); return; }
    if (cur.length >= aug.slots[a.tier]) { setMsg(`제외 칸 최대 ${aug.slots[a.tier]}칸`); return; }
    commit({ ...aug, bans: { ...aug.bans, [a.tier]: [...cur, a.id] } });
  };
  const upgrade = (a) => {
    const lv = levelOf(a); const need = lv + 1;
    if (lv >= AUG_LEVEL_MAX) return;
    if (aug.upgradeTickets < need) { setMsg(`강화권 ${need - aug.upgradeTickets}장 부족`); return; }
    commit({ ...aug, upgradeTickets: aug.upgradeTickets - need, levels: { ...aug.levels, [a.id]: need } }, `${a.name} +${need}`);
  };

  const list = pool.filter((a) => (filter === 'all' ? true : filter === 'fav' ? favs.includes(a.id) : filter === 'ban' ? bans.includes(a.id) : a.type === filter));
  const picked = pool.find((a) => a.id === selId) || list[0] || pool[0];
  const lv = picked ? levelOf(picked) : 0;
  const isBan = picked && bans.includes(picked.id);
  const isFav = picked && favs.includes(picked.id);
  const upCount = pool.filter((a) => levelOf(a) > 0).length;
  const maxCount = pool.filter((a) => levelOf(a) >= AUG_LEVEL_MAX).length;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <style>{HEX_CSS}</style>
      <GlassBg tint="#a78bfa" />
      <TopBar eyebrow="메인" section="증강 도감" account={account} onBack={onBack}
        right={(
          <>
            <span className="mt-cut mt-glass flex h-11 items-center gap-2.5 px-4" style={cut(14)}>
              <i className="block h-7 w-7 rounded-lg bg-cover bg-center" style={{ backgroundImage: 'url(ui/shop/au-upgrade.webp)' }} />
              <small className="text-t4 text-gray-400">강화권</small>
              <b className="font-display text-t2 text-[#f5d27a]">{aug.upgradeTickets}</b>
            </span>
            <span className="mt-cut mt-glass flex h-11 items-center gap-2 px-4" style={cut(14)} title="제외한 증강은 경기에 나오지 않음">
              <small className="mr-1 text-t4 text-gray-400">제외 칸</small>
              {Array.from({ length: slots }, (_, i) => (
                <i key={i} className="block h-3.5 w-3.5 rounded" style={i < bans.length ? { background: RED, boxShadow: `0 0 8px ${RED}` } : { boxShadow: 'inset 0 0 0 1.5px rgba(248,113,113,.5)' }} />
              ))}
            </span>
          </>
        )} />

      <div className="relative grid min-h-0 flex-1 gap-5 px-7 pb-6 pt-1" style={{ gridTemplateColumns: 'minmax(0,1fr) 580px', gridTemplateRows: 'minmax(0,1fr)' }}>
        {/* 오른쪽 — 진열장: 육각 그림 · 이름 · 레벨 보석 · 레벨별 효과(지금 · 다음) · 강화 · 제외 · 즐겨찾기 */}
        {picked && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={{ ...cut(22), order: 2 }}>
            <div key={picked.id} className="flex items-center gap-5" style={{ animation: 'mtStaffIn .35s cubic-bezier(.2,.8,.2,1) both' }}>
              <span className="ag-hexf h-[138px] w-[156px]" style={{ filter: isBan ? 'grayscale(1) brightness(.5)' : 'drop-shadow(0 0 22px rgba(167,139,250,.7))' }}>
                <i style={{ backgroundImage: art(picked) }} /><span className="ag-shine" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="self-start rounded-full bg-[#c4b5fd]/15 px-2.5 py-0.5 text-t4 font-bold text-[#c4b5fd]">{TYPE_KO[picked.type] || '증강'}</span>
                <b className={`text-[32px] font-black leading-tight ${isBan ? 'text-gray-400 line-through' : 'text-white'}`}>{picked.name}</b>
                <Gems lv={lv} />
                {picked.note && <small className="text-t4 text-gray-400">{picked.note}</small>}
              </div>
            </div>
            <p className="mt-hd">레벨별 효과</p>
            <div className="mt-scroll flex min-h-0 flex-col gap-1 overflow-y-auto pr-1">
              {Array.from({ length: AUG_LEVEL_MAX + 1 }, (_, k) => {
                const now = k === lv; const next = k === lv + 1;
                return (
                  <div key={k} className="flex items-center gap-3 rounded-[10px] px-3 py-2"
                    style={{ opacity: k < lv ? 0.45 : 1, ...(now ? { background: 'linear-gradient(90deg,rgba(167,139,250,.28),rgba(167,139,250,.05))', boxShadow: 'inset 0 0 0 1px rgba(196,181,253,.55)' } : next ? { background: 'rgba(245,210,122,.08)', boxShadow: 'inset 0 0 0 1px rgba(245,210,122,.35)' } : null) }}>
                    <b className="w-9 font-display text-t3" style={{ color: now ? '#e9d5ff' : next ? '#f5d27a' : '#6b7280' }}>{k ? `+${k}` : '기본'}</b>
                    <span className="min-w-0 flex-1 truncate text-t4" style={{ color: now || next ? '#e5e7eb' : '#9ca3af' }}><Lit text={augDescAt(picked, k)} /></span>
                    {now && <span className="rounded-full bg-[#a78bfa]/25 px-2 py-0.5 text-t4 font-bold text-[#e9d5ff]">지금</span>}
                    {next && <span className="rounded-full bg-[#f5d27a]/15 px-2 py-0.5 text-t4 font-bold text-[#f5d27a]">다음</span>}
                  </div>
                );
              })}
            </div>
            <div className="mt-auto flex flex-col gap-2.5">
              {msg && <p className="text-center text-t3 text-amber-200">{msg}</p>}
              <button type="button" className="mt-btn pri lg w-full" disabled={lv >= AUG_LEVEL_MAX || aug.upgradeTickets < lv + 1} onClick={() => upgrade(picked)}>
                {lv >= AUG_LEVEL_MAX ? `최대 레벨 +${AUG_LEVEL_MAX}` : <>+{lv + 1} 강화 <span className="text-t3 opacity-70">· 강화권 {lv + 1}장</span></>}
              </button>
              <div className="flex gap-2">
                <button type="button" className="mt-btn min-w-0 flex-1" style={{ color: isBan ? '#e8ecf2' : '#fda4af' }}
                  disabled={!isBan && bans.length >= slots} onClick={() => toggleBan(picked)}>
                  {isBan ? '제외 풀기 ↺' : bans.length >= slots ? `제외 칸 가득 · ${slots}칸` : '이 증강 제외'}
                </button>
                <button type="button" className="mt-btn shrink-0 px-5" aria-pressed={isFav} onClick={() => toggleFav(picked)}
                  style={{ color: isFav ? '#f5d27a' : '#94a3b8', boxShadow: isFav ? 'inset 0 0 0 1px rgba(245,210,122,.55)' : undefined }}>
                  {isFav ? '★' : '☆'} 즐겨찾기
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 왼쪽 — 도감: 육각 아이콘 · 이름 · 레벨 보석, 제외 도장 · 즐겨찾기 별 */}
        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={cut(22)}>
          <div className="flex items-center gap-3">
            <b className="text-t2 font-black text-white">증강 {pool.length}</b>
            <small className="text-t4 text-gray-400">강화 {upCount} · 최대 {maxCount}</small>
            <div className="ml-auto flex flex-wrap justify-end gap-1.5">
              {FILTERS.map(([k, n]) => (
                <button key={k} type="button" className={`ag-pill ${filter === k ? 'on' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="mt-scroll grid min-h-0 flex-1 content-start gap-x-1.5 gap-y-1 overflow-y-auto pr-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(112px,1fr))' }}>
            {list.map((a) => {
              const b = bans.includes(a.id);
              return (
                <button key={a.id} type="button" className={`ag-slot ${picked?.id === a.id ? 'on' : ''} ${b ? 'ban' : ''}`} onClick={() => setSelId(a.id)} aria-pressed={picked?.id === a.id}>
                  <span className="ag-hexf h-[76px] w-[86px]"><i style={{ backgroundImage: art(a) }} /></span>
                  {favs.includes(a.id) && <span className="absolute right-4 top-2 text-[#f5d27a] [text-shadow:0_0_8px_#f5d27a]">★</span>}
                  {b && <span className="mt-stamp" style={{ top: 34 }}>제외</span>}
                  <b className="max-w-full truncate text-t4 text-white">{a.name}</b>
                  <Gems lv={levelOf(a)} sm />
                </button>
              );
            })}
            {list.length === 0 && <p className="col-span-full py-10 text-center text-t3 text-gray-400">{filter === 'fav' ? '즐겨찾기한 증강 없음' : filter === 'ban' ? '제외한 증강 없음' : '증강 없음'}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
