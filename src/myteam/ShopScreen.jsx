/* 상점 — 왼쪽 분류, 가운데 상품, 오른쪽 선택한 상품 + 적용 대상 */
import React, { useMemo, useState } from 'react';
import { CATEGORIES, SHOP_ITEMS, needsPlayer, needsStaff, applyToPlayer } from './shop.js';
import { staffByRole } from './staff.js';
import { STAFF_SLOTS } from './rules.js';
import { saveTeam, addGold } from './store.js';
import { UiStyle, Bg, TopBar, Panel, Btn, Chip } from './ui.jsx';

const cut = (n) => ({ '--c': `${n}px` });
const catColor = { training: '#7dd3fc', boost: '#34d399', ops: '#f87171', staff: '#c4b5fd' };

export default function ShopScreen({ account, onChange, onBack }) {
  const [gold, setGold] = useState(account.gold ?? 0);
  const [team, setTeam] = useState(account.team);
  const [cat, setCat] = useState('all');
  const [picked, setPicked] = useState(null);
  const [target, setTarget] = useState(null); // 선수 또는 코치
  const [toast, setToast] = useState('');

  const squad = team.squad || [];
  const items = useMemo(() => SHOP_ITEMS.filter((it) => cat === 'all' || it.cat === cat), [cat]);
  const targets = useMemo(() => {
    if (!picked) return [];
    if (needsPlayer(picked)) return squad.filter((p) => (picked.target === 'pitcher' ? p.type === 'pitcher' : p.type === 'batter'));
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
      setTarget(null);
      return;
    }
    if (needsStaff(picked)) {
      if (!target) return;
      const slot = target.role === 'manager' ? 'manager' : STAFF_SLOTS.find((s) => s.role === target.role)?.key;
      push({ ...team, staff: { ...(team.staff || {}), [slot]: { ...target, cost: 0, contracted: true } } }, gold - picked.price, `${target.name} 선임 (CP 면제)`);
      setTarget(null);
      return;
    }
    if (picked.cap) push({ ...team, cap: (team.cap || 2000) + picked.cap }, gold - picked.price, `샐러리 캡 +${picked.cap}`);
  };

  const ready = picked && picked.price <= gold && (!(needsPlayer(picked) || needsStaff(picked)) || target);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg opacity={0.85} grad="linear-gradient(180deg,rgba(3,5,10,.94),rgba(3,5,10,.9))" />
      <TopBar section="상점" team={team} account={{ ...account, gold }} onBack={onBack} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 py-4" style={{ gridTemplateColumns: '200px minmax(0,1fr) 340px' }}>
        <Panel label="Category" a="#fde047" className="p-3.5" c={14}>
          <div className="mt-3 flex flex-col gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.key} type="button" onClick={() => { setCat(c.key); setPicked(null); setTarget(null); }}
                className={`mt-cut px-3 py-2.5 text-left font-bold ${cat === c.key ? 'text-white' : 'text-gray-400'}`}
                style={{ ...cut(8), background: cat === c.key ? 'rgba(253,224,71,.12)' : 'rgba(5,8,15,.6)', boxShadow: cat === c.key ? 'inset 0 0 0 2px #fde047' : 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-gray-500">
            훈련은 능력치를 영구히 올리고, 부스트는 정해진 경기 수만큼만 붙습니다. 골드는 경기에서 법니다.
          </p>
        </Panel>

        <Panel label="Items" a="#fde047" className="min-h-0 p-4 px-[18px]" c={14}>
          <div className="mt-scroll gold mt-3 grid grid-cols-4 gap-3.5 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100% - 2rem)' }}>
            {items.map((it) => {
              const on = picked?.id === it.id;
              const c = catColor[it.cat];
              return (
                <button key={it.id} type="button" onClick={() => { setPicked(it); setTarget(null); }}
                  className={`mt-cut mt-frame ${on ? 'hot' : ''} relative overflow-hidden p-3 text-left`}
                  style={{ ...cut(12), '--a': c, background: 'linear-gradient(180deg,rgba(14,23,38,.9),rgba(5,8,15,.95))' }}>
                  <span className="absolute right-2.5 top-2.5 font-display text-[10px] tracking-[0.2em]" style={{ color: c }}>{CATEGORIES.find((x) => x.key === it.cat)?.label}</span>
                  <div className="mt-cut h-[104px] bg-cover bg-center opacity-90" style={{ ...cut(8), backgroundImage: `url(ui/mt/${it.img}.webp)` }} />
                  <b className="mt-2.5 block text-[15px] text-white">{it.name}</b>
                  <span className="block min-h-[32px] text-xs text-gray-400">{it.desc}</span>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-display text-xl" style={{ color: it.price > gold ? '#f87171' : c }}>{it.price}G</span>
                    {on && <span className="font-display text-[11px] tracking-widest text-emerald-300">선택됨</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="grid min-h-0 gap-4" style={{ gridTemplateRows: 'auto minmax(0,1fr)' }}>
          <Panel label="선택한 상품" a="#fde047" hot glass={false} className="bg-[#060a13]/88 p-4" c={14}>
            {!picked ? <p className="mt-3 text-sm text-gray-500">상품을 고르세요.</p> : (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <div className="mt-cut h-16 w-16 bg-cover bg-center" style={{ ...cut(8), backgroundImage: `url(ui/mt/${picked.img}.webp)` }} />
                  <div><b className="block text-[17px] text-white">{picked.name}</b><span className="text-xs text-gray-400">{picked.desc}</span></div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[13px] text-gray-400">가격</span>
                  <b className="font-display text-[26px]" style={{ color: picked.price > gold ? '#f87171' : '#fde047' }}>{picked.price} G</b>
                </div>
                <Btn pri lg className="mt-3 w-full" style={cut(12)} disabled={!ready} onClick={buy}>
                  {picked.price > gold ? '골드 부족' : (needsPlayer(picked) || needsStaff(picked)) && !target ? '대상을 고르세요' : '구매하기'}
                </Btn>
                {toast && <p className="mt-2 text-center text-sm text-emerald-300">{toast}</p>}
              </>
            )}
          </Panel>

          <Panel label="적용 대상" a="#7dd3fc" className="min-h-0 p-4" c={14}>
            {!picked || (!needsPlayer(picked) && !needsStaff(picked)) ? (
              <p className="mt-3 text-sm text-gray-500">{picked ? '팀 전체에 바로 적용됩니다.' : '상품을 고르면 대상이 나옵니다.'}</p>
            ) : targets.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">대상이 없습니다. 라커에서 선수를 먼저 영입하세요.</p>
            ) : (
              <div className="mt-scroll mt-3 flex min-h-0 flex-col gap-2 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100% - 2rem)' }}>
                {targets.map((t) => {
                  const on = target?.id === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setTarget(t)}
                      className="mt-cut grid grid-cols-[auto_1fr] items-center gap-3 px-3 py-2.5 text-left"
                      style={{ ...cut(8), background: on ? 'rgba(125,211,252,.14)' : 'rgba(5,8,15,.6)', boxShadow: on ? 'inset 0 0 0 2px #7dd3fc' : 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
                      <b className="font-display text-[22px] text-white">{t.overall ?? '—'}</b>
                      <div className="min-w-0">
                        <b className="block truncate text-[15px] text-white">{t.name}</b>
                        <span className="text-xs text-gray-400">
                          {t.position ? `${t.position} · ${t.year} ${t.team}` : `${t.role === 'manager' ? '감독' : '코치'} · ${t.note}`}
                          {picked.stat && t.stats ? ` · ${picked.stat} ${t.stats[picked.stat] ?? '-'} → ${Math.min(99, (t.stats[picked.stat] ?? 70) + picked.amount)}` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
