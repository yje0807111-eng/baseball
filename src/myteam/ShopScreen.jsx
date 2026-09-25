/* 상점 — 모드 화면 문법: 왼쪽 사이드 분류 / 가운데 상품 카드 / 오른쪽 PICK */
import React, { useMemo, useState } from 'react';
import { SQUAD_CAP } from './rules.js';
import { withDraftTickets, withAugTickets, addAugTicket, AUG_TICKET_KO, addCard, cardCount, clearFatigue, expandTeam, expandLeft, EXPAND_MAX } from './shop.js';
import { CATEGORIES, SHOP_ITEMS, itemArt, itemById, itemEffect, isStorable, addToInventory, addDraftTicket, recommendTargets, teamWeakness, STAT_KO } from './shop.js';
import { saveTeam, addGold, saveAug, loadAccount, draftTickets, saveDraftTickets, augShopTickets, saveAugShopTickets } from './store.js';
import { UiStyle, Bg, TopBar, Btn, SideNav, Portrait } from './ui.jsx';
import { POS_COLOR, statBarStyle, statNumStyle } from './teamColor.js';

const cut = (n) => ({ '--c': `${n}px` });
/* 종합 등급 색 — 드래프트 카드와 같은 규칙 (100 이상 무지개 · 85 이상 초록) */
const PRISM = 'linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc)';
const ovrStyle = (v) => (v >= 100
  ? { background: `${PRISM} 0 50% / 200% 100%`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', animation: 'prism 3s linear infinite' }
  : { color: v >= 85 ? '#34d399' : '#f3f4f6' });
const catColor = { training: '#7dd3fc', boost: '#34d399', ops: '#f87171', staff: '#c4b5fd', aug: '#e879f9', draft: '#fbbf24' };
const catLabel = { training: '훈련', boost: '준비 카드', ops: '운영', staff: '감독', aug: '증강', draft: '드래프트' };
const catSub = { training: '영구 상승', boost: '경기 전 한 장', ops: '팀 단위', staff: 'CP 면제', aug: '풀 관리', draft: '판에서 쓴다' };

/** 상품 카드 — 세로로 긴 카드: 분류 사진(분류 색으로 통일) · 분류 색 테두리 · 오른쪽 위 배지 · 아래 이름 · 가격 */
function ItemCard({ it, on, onClick, cap = SQUAD_CAP }) {
  const n = catColor[it.cat];
  return (
    <button type="button" onClick={onClick}
      className={`mt-cut ${on ? 'mt-frame' : ''} relative h-full w-full overflow-hidden bg-[#0b1220] bg-cover bg-center text-left transition hover:brightness-110`}
      style={{ '--c': '12px', '--a': n, backgroundImage: `url(${itemArt(it)})`, boxShadow: on ? undefined : `inset 0 0 0 1px ${n}59` }}>
      <span className="absolute inset-0" style={{ background: `linear-gradient(rgba(5,8,15,.45), color-mix(in srgb, ${n} 10%, transparent) 34%, rgba(5,8,15,.9) 70%, #05080f 92%)` }} />
      {/* 분류 · 꼬리표를 왼쪽 위 한 줄로 (오른쪽 위는 비운다) */}
      <span className="absolute left-3 top-2 inline-flex items-center gap-1.5">
        <b className="font-display text-[15px] font-extrabold tracking-[0.14em]" style={{ color: n, textShadow: `0 0 14px ${n}88,0 2px 4px #000` }}>{catLabel[it.cat]}</b>
        <i className="h-3 w-px" style={{ background: `${n}88` }} />
        <small className="text-[11px] text-gray-300" style={{ textShadow: '0 2px 4px #000' }}>{catSub[it.cat]}</small>
      </span>
      {/* 아래: 이름 먼저 · 5칸 게이지 · 오르는 값과 가격을 좌우로 (이름과 수치가 붙어 보이지 않게) */}
      <span className="absolute inset-x-3 bottom-2.5 block">
        {(() => {
          const e = itemEffect(it);
          const on5 = e.amount == null ? 5 : Math.max(1, Math.round((e.amount / e.max) * 5));
          const mid = it.stat ? (
            /* 능력치: 같은 종류 최대치 대비 5칸 */
            <span className="mb-1.5 grid h-[6px] grid-cols-5 gap-[3px]">
              {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ background: i < on5 ? n : 'rgba(255,255,255,.1)', boxShadow: i < on5 ? `0 0 6px ${n}66` : 'none' }} />)}
            </span>
          ) : it.cap ? (
            /* 캡 확장: 지금 캡에서 얼마나 늘어나는지 */
            <span className="mb-1.5 block">
              <span className="mb-[2px] flex justify-between font-display text-[10.5px] text-gray-400">
                <span>{cap.toLocaleString()}</span><span style={{ color: n }}>{(cap + it.cap).toLocaleString()}</span>
              </span>
              <span className="relative block h-[6px] bg-white/10">
                <i className="absolute inset-y-0 left-0 bg-slate-500" style={{ width: `${(cap / (cap + it.cap)) * 100}%` }} />
                <i className="absolute inset-y-0" style={{ left: `${(cap / (cap + it.cap)) * 100}%`, right: 0, background: n, boxShadow: `0 0 6px ${n}66` }} />
              </span>
            </span>
          ) : (
            /* 계약서 · 권: 한 장(한 명)을 점으로 */
            <span className="mb-[9px] flex h-[8px] items-center gap-1">
              {[0, 1, 2].map((i) => <i key={i} className="h-[8px] w-[8px] rounded-full" style={{ background: i === 0 ? n : 'rgba(255,255,255,.12)' }} />)}
              <small className="ml-1 text-[11px] text-gray-400">{it.staffRole ? '1명' : '1장'}</small>
            </span>
          );
          return (
            <>
              <b className="mb-1 block truncate text-base font-black text-white">{it.name}</b>
              {mid}
              <span className="flex items-baseline justify-between">
                <b className="text-[12px] text-gray-200">{e.label}{e.amount != null && it.stat && <span className="ml-1 font-display text-[14px]" style={{ color: n }}>+{e.amount}</span>}{it.cap && <span className="ml-1 font-display text-[14px]" style={{ color: n }}>+{it.cap}</span>}</b>
                <b className="font-display text-base text-amber-300">{it.price.toLocaleString()} G</b>
              </span>
            </>
          );
        })()}
      </span>
    </button>
  );
}

export default function ShopScreen({ account, onChange, onBack }) {
  const [gold, setGold] = useState(Number.isFinite(account.gold) ? account.gold : 0);
  const [team, setTeam] = useState(account.team);
  const [cat, setCat] = useState('all');
  const [picked, setPicked] = useState(SHOP_ITEMS[0]);
  const [tickets, setTickets] = useState(() => withDraftTickets(draftTickets()));
  const [augTickets, setAugTickets] = useState(() => withAugTickets(augShopTickets()));

  const squad = team.squad || [];
  const items = useMemo(() => SHOP_ITEMS.filter((it) => cat === 'all' || it.cat === cat), [cat]);
  const recs = useMemo(() => (picked ? recommendTargets(team, picked) : []), [picked, team]);
  const owned = (it) => (team.items || []).filter((x) => x.itemId === it.id).length;

  const push = (nextTeam, nextGold) => {
    setTeam(nextTeam); setGold(nextGold);
    saveTeam(nextTeam); addGold(nextGold - gold);
    onChange?.({ team: nextTeam, gold: nextGold });
  };
  const buy = (it) => {
    const picked = itemById(it?.id); // 눌린 상품 하나만 처리 (상품이 아닌 게 넘어오면 아무 일도 없다)
    if (!picked || !Number.isFinite(gold) || picked.price > gold) return;
    if (isStorable(picked)) {
      push(addToInventory(team, picked), gold - picked.price);
      return;
    }
    if (picked.staffTicket) {
      const n = (team.staffTickets || 0) + 1;
      push({ ...team, staffTickets: n }, gold - picked.price);
      return;
    }
    if (picked.draftTicket) {
      const have = draftTickets();
      const next = addDraftTicket(have, picked.draftTicket);
      saveDraftTickets(next);
      setTickets(next);
      push(team, gold - picked.price);
      return;
    }
    if (picked.expand) {
      if (expandLeft(team, picked.expand) < 1) return;
      const next = expandTeam(team, picked.expand);
      push(next, gold - picked.price);
      return;
    }
    if (picked.card) {
      push(addCard(team, picked), gold - picked.price);
      return;
    }
    if (picked.medic) {
      push(clearFatigue(team), gold - picked.price);
      return;
    }
    if (picked.augShop) {
      const next = addAugTicket(augTickets, picked.augShop);
      saveAugShopTickets(next);
      setAugTickets(next);
      push(team, gold - picked.price);
      return;
    }
    if (picked.augTicket) {
      const aug = loadAccount()?.aug;
      if (!aug) return;
      const add = picked.bulk || 1;
      const n = (aug[picked.augTicket] || 0) + add;
      saveAug({ ...aug, [picked.augTicket]: n });
      push(team, gold - picked.price);
      return;
    }
    if (picked.cap) push({ ...team, cap: (team.cap || SQUAD_CAP) + picked.cap }, gold - picked.price);
  };

  // 살 수 없는 상품은 버튼에서 막는다 (구매 뒤 알림 문구는 두지 않는다)
  const soldOut = picked?.expand ? expandLeft(team, picked.expand) < 1 : false;
  const ready = picked && picked.price <= gold && !soldOut;
  const n = picked ? catColor[picked.cat] : '#34d399';

  const NAV = CATEGORIES.map((c) => ({
    key: c.key, label: c.label,
    img: `ui/nav/shop-${c.key}.webp`,
  }));

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg img="ui/mt/tile-shop.webp" opacity={0.6} />
      <TopBar eyebrow="메인" section="상점" account={{ ...account, gold }} onBack={onBack} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4"
        style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>

        <SideNav items={NAV} value={cat} onChange={(k) => { setCat(k); }} a="#fde047" label="상품 종류" compact>
          {/* 추천 상품: 우리 팀에서 가장 약한 묶음을 올려 주는 상품 한 장 */}
          {(() => {
            const { weak, item } = teamWeakness(squad);
            if (!item) return null;
            const c = catColor[item.cat];
            return (
              <div className="mt-cut relative h-[200px] bg-cover" style={{ ...cut(10), backgroundImage: `url(${itemArt(item)})`, backgroundPosition: 'center 25%', boxShadow: `inset 0 0 0 1px ${c}66` }}>
                <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,8,15,.3), #05080f 82%)' }} />
                <span className="absolute left-2.5 top-2 font-display text-[11px] tracking-[0.2em] text-[#fde047]">추천 상품</span>
                <span className="absolute inset-x-2.5 bottom-2.5">
                  <b className="block truncate text-[15px] font-black text-white">{item.name}</b>
                  <small className="mb-1.5 block truncate text-[11px]" style={{ color: c }}>{STAT_KO[item.stat] || item.name} +{item.amount}</small>
                  <Btn pri a="#fde047" className="w-full" style={cut(8)} disabled={item.price > gold} onClick={() => { setPicked(item); buy(item); }}>{item.price.toLocaleString()} G 구매하기</Btn>
                </span>
              </div>
            );
          })()}
        </SideNav>

        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#fde047' }}>
          <div className="flex items-baseline gap-3">
            <p className="mt-lab" style={{ '--a': '#fde047' }}>상품 목록</p>
          </div>
          <div className="mt-scroll gold mt-3 grid min-h-0 flex-1 grid-cols-5 content-start gap-3 overflow-y-auto pr-2" style={{ gridAutoRows: '18.75rem' }}>
            {items.map((it) => <ItemCard key={it.id} it={it} cap={team.cap || 2000} on={picked?.id === it.id} onClick={() => { setPicked(it); }} />)}
          </div>
        </section>

        <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={{ ...cut(20), '--a': n }}>
          <p className="mt-lab" style={{ '--a': n }}>고른 상품</p>
          {!picked ? <p className="text-sm text-gray-500">상품 고르기</p> : (
            <>
              {/* 사진 안에 분류 │ 꼬리표 · 이름 · 오르는 값 · 게이지를 얹는다 (설명 문장 대신) */}
              {(() => {
                const e = itemEffect(picked);
                const on = e.amount == null ? 5 : Math.max(1, Math.round((e.amount / e.max) * 5));
                return (
                  <div className="mt-cut relative h-[190px] shrink-0 bg-cover" style={{ '--c': '12px', backgroundImage: `url(${itemArt(picked)})`, backgroundPosition: 'center 28%' }}>
                    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,8,15,.25), rgba(5,8,15,.92))' }} />
                    <span className="absolute left-3.5 top-2.5 font-display text-[13px] tracking-[0.16em]" style={{ color: n }}>{catLabel[picked.cat]} │ <span className="text-gray-300">{catSub[picked.cat]}</span></span>
                    <span className="absolute inset-x-3.5 bottom-3">
                      <b className="block text-2xl font-black text-white">{picked.name}</b>
                      <span className="mb-1.5 flex items-baseline gap-1.5">
                        <b className="text-[13px] text-gray-200">{e.label}</b>
                        {e.amount != null && <b className="font-display text-xl" style={{ color: n }}>+{e.amount}</b>}
                      </span>
                      <span className="grid h-[6px] grid-cols-5 gap-[3px]">
                        {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ background: i < on ? n : 'rgba(255,255,255,.14)' }} />)}
                      </span>
                    </span>
                  </div>
                );
              })()}

              {picked.target && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <p className="mt-grp !mt-0">추천 대상</p>
                  <div className="mt-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1.5">
                    {recs.length === 0 && <p className="text-sm text-gray-500">추천할 선수 없음</p>}
                    {recs.map((t) => {
                      /* 수치 변화: 막대는 50~110 구간(윗 구간이 뭉치지 않게) · 숫자와 막대 색은 라커와 같은 구간 색 */
                      const cur = t.stats?.[picked.stat] ?? 70;
                      const after = Math.min(110, cur + picked.amount);
                      const pct = (v) => Math.max(0, Math.min(100, ((v - 50) / 60) * 100));
                      const barNow = statBarStyle(cur);
                      const barNext = statBarStyle(after);
                      return (
                        <div key={t.id} className="mt-row mt-cut" style={{ gridTemplateColumns: '38px 34px minmax(0,1fr)', '--a': n }}>
                          <Portrait player={t} w={36} h={44} color={n} />
                          {/* 종합은 사진 옆 자기 열에 크게(등급 색) — 아래 수치 막대와 헷갈리지 않게 */}
                          <b className="text-center font-display text-[22px] font-extrabold" style={ovrStyle(t.overall)}>{t.overall}</b>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <b className="min-w-0 flex-1 truncate text-sm font-black text-white">{t.name}</b>
                              <small className="font-display text-[11px]" style={{ color: POS_COLOR[t.position] }}>{t.position}</small>
                            </span>
                            <span className="mt-1 flex items-center gap-2">
                              <small className="w-7 shrink-0 text-[11px] text-gray-400">{STAT_KO[picked.stat] || picked.stat}</small>
                              <span className="relative h-[7px] flex-1 bg-white/[0.08]">
                                <i className="absolute inset-y-0 left-0 opacity-70" style={{ width: `${pct(cur)}%`, ...barNow }} />
                                <i className="absolute inset-y-0" style={{ left: `${pct(cur)}%`, width: `${pct(after) - pct(cur)}%`, ...barNext }} />
                              </span>
                              <span className="flex shrink-0 items-baseline gap-1 font-display">
                                <small className="text-[11px] opacity-70" style={statNumStyle(cur)}>{cur}</small>
                                <i className="text-[11px] not-italic text-slate-500">›</i>
                                <b className="text-[15px]" style={statNumStyle(after)}>{after}</b>
                              </span>
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={`flex items-baseline justify-between text-[12.5px] text-gray-400 ${picked.target ? '' : 'mt-auto'}`}>
                <span>보유 <b className="text-white">{isStorable(picked) ? `${owned(picked)}개` : picked.card ? `${cardCount(team, picked.id)}장` : picked.draftTicket ? `${tickets[picked.draftTicket] || 0}장` : picked.augShop ? `${augTickets[picked.augShop] || 0}장` : picked.expand ? `${EXPAND_MAX[picked.expand] - expandLeft(team, picked.expand)} / ${EXPAND_MAX[picked.expand]}회` : picked.augTicket ? `${loadAccount()?.aug?.[picked.augTicket] || 0}장` : '-'}</b></span>
                <span>남는 골드 <b className="font-display text-[15px]" style={{ color: picked.price > gold ? '#f87171' : '#fde047' }}>{(gold - picked.price).toLocaleString()} G</b></span>
              </div>
              <div>
                <Btn pri lg a="#fde047" className="w-full" style={cut(12)} disabled={!ready} onClick={() => buy(picked)}>
                  {soldOut ? '더 살 수 없음' : picked.price > gold ? '골드 부족' : `${picked.price.toLocaleString()} G 구매 ▶`}
                </Btn>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
