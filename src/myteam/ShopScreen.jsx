/* 상점 — 드래프트 화면 문법(선반 · 사선 카드 · PICK 패널), 배치는 D2: 왼쪽 분류 / 가운데 선반 / 오른쪽 PICK */
import React, { useMemo, useState } from 'react';
import { CATEGORIES, SHOP_ITEMS, needsPlayer, needsStaff, applyToPlayer } from './shop.js';
import { staffByRole } from './staff.js';
import { STAFF_SLOTS } from './rules.js';
import { saveTeam, addGold } from './store.js';
import { UiStyle, Bg, TopBar, Btn } from './ui.jsx';

const cut = (n) => ({ '--c': `${n}px` });
const catColor = { training: '#7dd3fc', boost: '#34d399', ops: '#f87171', staff: '#c4b5fd' };
const catLabel = { training: '훈련', boost: '부스트', ops: '운영', staff: '감독' };
const catSub = { training: '영구 상승', boost: '경기 한정', ops: '팀 단위', staff: 'CP 면제' };

/** 상품 카드 — 드래프트 선수 카드와 같은 모양 */
function ItemCard({ it, on, onClick }) {
  const n = catColor[it.cat];
  return (
    <button type="button" onClick={onClick} className="mt-pk block w-full text-left"
      style={{ '--n': n, aspectRatio: '3 / 4.1', boxShadow: on ? `0 0 0 2px ${n}, 0 0 40px -12px ${n}` : undefined }}>
      <span className="in"><img className="art" src={`ui/mt/${it.img}.webp`} alt="" /><span className="sh" /></span>
      <span className="fr" /><span className="tb" />
      <span className="ov">{it.price}<small>G</small></span>
      <span className="meta">{catLabel[it.cat]}</span>
      <span className="pos"><em>{catLabel[it.cat]}</em><span>{catSub[it.cat]}</span></span>
      <span className="nm">{it.name}</span>
      <span className="ds">{it.desc}</span>
      <span className="ft"><b>{it.price} G</b><span>{on ? '선택됨' : '고르기'}</span></span>
    </button>
  );
}

export default function ShopScreen({ account, onChange, onBack }) {
  const [gold, setGold] = useState(account.gold ?? 0);
  const [team, setTeam] = useState(account.team);
  const [cat, setCat] = useState('all');
  const [picked, setPicked] = useState(SHOP_ITEMS[0]);
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState('');

  const squad = team.squad || [];
  const items = useMemo(() => SHOP_ITEMS.filter((it) => cat === 'all' || it.cat === cat), [cat]);
  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.key, c.key === 'all' ? SHOP_ITEMS.length : SHOP_ITEMS.filter((i) => i.cat === c.key).length])), []);
  const targets = useMemo(() => {
    if (!picked) return [];
    if (needsPlayer(picked)) return squad.filter((p) => (picked.target === 'pitcher' ? p.type === 'pitcher' : p.type === 'batter')).sort((a, b) => b.overall - a.overall);
    if (needsStaff(picked)) return picked.staffRole === 'manager' ? staffByRole('manager') : [...staffByRole('head'), ...staffByRole('batting'), ...staffByRole('pitching')];
    return [];
  }, [picked, squad]);

  const push = (nextTeam, nextGold, msg) => {
    setTeam(nextTeam); setGold(nextGold);
    saveTeam(nextTeam); addGold(nextGold - gold);
    onChange?.({ team: nextTeam, gold: nextGold });
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };
  const buy = () => {
    if (!picked || picked.price > gold) return;
    if (needsPlayer(picked)) {
      if (!target) return;
      push(applyToPlayer(team, picked, target), gold - picked.price, `${target.name} — ${picked.name} 적용`);
      setTarget(null); return;
    }
    if (needsStaff(picked)) {
      if (!target) return;
      const slot = target.role === 'manager' ? 'manager' : STAFF_SLOTS.find((s) => s.role === target.role)?.key;
      push({ ...team, staff: { ...(team.staff || {}), [slot]: { ...target, cost: 0, contracted: true } } }, gold - picked.price, `${target.name} 선임 (CP 면제)`);
      setTarget(null); return;
    }
    if (picked.cap) push({ ...team, cap: (team.cap || 2000) + picked.cap }, gold - picked.price, `샐러리 캡 +${picked.cap}`);
  };

  const needTarget = picked && (needsPlayer(picked) || needsStaff(picked));
  const ready = picked && picked.price <= gold && (!needTarget || target);
  const n = picked ? catColor[picked.cat] : '#34d399';
  const after = picked?.stat && target?.stats ? Math.min(99, (target.stats[picked.stat] ?? 70) + picked.amount) : null;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg opacity={0.5} grad="linear-gradient(180deg,rgba(3,5,10,.95),rgba(3,5,10,.92))" />
      <TopBar section="상점" team={team} account={{ ...account, gold }} onBack={onBack} />

      <div className="relative grid min-h-0 flex-1 gap-3.5 overflow-hidden px-6 py-3.5"
        style={{ gridTemplateColumns: '200px minmax(0,1fr) 380px', gridTemplateRows: 'minmax(0,1fr)' }}>

        {/* 분류 */}
        <section className="mt-cut mt-frame mt-glass flex flex-col p-3.5 px-3" style={cut(14)}>
          <p className="mt-lab" style={{ '--a': '#fde047' }}>Category</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {CATEGORIES.map((c) => {
              const on = cat === c.key;
              return (
                <button key={c.key} type="button" onClick={() => { setCat(c.key); setTarget(null); }}
                  className={`mt-cut ${on ? 'mt-frame hot' : ''} flex items-center justify-between px-3 py-2.5`}
                  style={{ ...cut(8), '--a': '#10b981', background: on ? 'rgba(16,185,129,.14)' : 'rgba(5,8,15,.55)' }}>
                  <b className={`text-sm ${on ? 'text-white' : 'text-gray-400'}`}>{c.label}</b>
                  <span className="font-display text-xs" style={{ color: on ? '#34d399' : '#4b5563' }}>{counts[c.key]}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-auto text-[11px] leading-relaxed text-gray-500">훈련은 영구, 부스트는 정해진 경기 수만큼.<br />골드는 경기에서 법니다.</p>
        </section>

        {/* 선반 */}
        <section className="mt-cut mt-frame mt-glass relative min-h-0 p-3.5 px-[18px]" style={cut(16)}>
          <span className="mt-wm">SHOP</span>
          <div className="relative flex items-center gap-3.5 whitespace-nowrap pl-[132px]">
            <p className="mt-lab absolute left-0 top-0">Shop</p>
            <b className="text-[26px] font-black text-white">오늘의 상품</b>
            <span className="text-[13px] text-gray-400">{items.length}개 · 매일 09시 갱신</span>
            <span className="mt-rf ml-auto">⟳ 갱신까지 06:12</span>
          </div>
          <div className="mt-scroll mt-3.5 grid grid-cols-4 content-start gap-3 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100% - 3.2rem)' }}>
            {items.map((it) => <ItemCard key={it.id} it={it} on={picked?.id === it.id} onClick={() => { setPicked(it); setTarget(null); }} />)}
          </div>
        </section>

        {/* PICK */}
        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-3.5 px-4" style={cut(16)}>
          <p className="mt-lab" style={{ '--a': n }}>Pick</p>
          {!picked ? <p className="mt-3 text-sm text-gray-500">상품을 고르세요.</p> : (
            <>
              <div className="mt-3 flex justify-center"><span style={{ width: 196 }}><ItemCard it={picked} on /></span></div>
              <h2 className="mt-3 text-[24px] font-black text-white">{picked.name}</h2>
              <p className="mt-1 text-[13px] text-gray-300">{picked.desc}</p>

              {needTarget && (
                <>
                  <p className="mt-lab mt-3" style={{ '--a': '#7dd3fc' }}>적용 대상</p>
                  <div className="mt-scroll mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1.5">
                    {targets.length === 0 && <p className="text-sm text-gray-500">대상이 없습니다. 라커에서 먼저 영입하세요.</p>}
                    {targets.map((t) => {
                      const on = target?.id === t.id;
                      return (
                        <button key={t.id} type="button" onClick={() => setTarget(t)}
                          className={`mt-cut ${on ? 'mt-frame hot' : ''} grid grid-cols-[auto_1fr] items-center gap-3 px-3 py-2 text-left`}
                          style={{ ...cut(8), '--a': '#7dd3fc', background: on ? 'rgba(125,211,252,.14)' : 'rgba(5,8,15,.6)' }}>
                          <b className="font-display text-xl text-sky-300">{t.overall ?? '—'}</b>
                          <span className="min-w-0">
                            <b className="block truncate text-sm text-white">{t.name}</b>
                            <span className="text-[11px] text-gray-400">
                              {t.position ? `${t.position} · ${t.year} ${t.team}` : `${t.role === 'manager' ? '감독' : '코치'} · ${t.note}`}
                              {picked.stat && t.stats ? ` · ${t.stats[picked.stat] ?? '-'} → ${Math.min(99, (t.stats[picked.stat] ?? 70) + picked.amount)}` : ''}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {target && after != null && (
                <div className="mt-cut mt-2.5 bg-[#05080f]/70 p-2.5 px-3" style={cut(10)}>
                  <span className="flex justify-between text-[13px] text-gray-400">{target.name}
                    <b className="font-display text-lg text-white">{target.stats[picked.stat]} → <span style={{ color: n }}>{after}</span></b></span>
                </div>
              )}

              <div className="mt-auto pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-400">가격</span>
                  <b className="font-display text-[26px]" style={{ color: picked.price > gold ? '#f87171' : '#fde047' }}>{picked.price} G</b>
                </div>
                <Btn pri lg className="mt-2 w-full" style={cut(12)} disabled={!ready} onClick={buy}>
                  {picked.price > gold ? '골드 부족' : needTarget && !target ? '대상을 고르세요' : `${picked.price} G 로 구매`}
                </Btn>
                {toast && <p className="mt-2 text-center text-sm text-emerald-300">{toast}</p>}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
