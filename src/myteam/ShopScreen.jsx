/* 상점 — 모드 화면 문법: 왼쪽 사이드 분류 / 가운데 상품 카드 / 오른쪽 PICK */
import React, { useMemo, useState } from 'react';
import { CATEGORIES, SHOP_ITEMS, isStorable, addToInventory, recommendTargets } from './shop.js';
import { saveTeam, addGold, saveAug, loadAccount } from './store.js';
import { UiStyle, Bg, TopBar, Btn, SideNav, Hero, KV, Portrait } from './ui.jsx';

const cut = (n) => ({ '--c': `${n}px` });
const catColor = { training: '#7dd3fc', boost: '#34d399', ops: '#f87171', staff: '#c4b5fd', aug: '#e879f9' };
const catLabel = { training: '훈련', boost: '부스트', ops: '운영', staff: '감독', aug: '증강' };
const catSub = { training: '영구 상승', boost: '경기 한정', ops: '팀 단위', staff: 'CP 면제', aug: '풀 관리' };

/** 상품 카드 — 모드 화면 시리즈 카드와 같은 틀: 큰 사진 · 오른쪽 위 배지 · 아래 이름 · 가격 */
function ItemCard({ it, on, onClick }) {
  const n = catColor[it.cat];
  return (
    <button type="button" onClick={onClick}
      className={`mt-cut ${on ? 'mt-frame' : ''} relative h-full w-full overflow-hidden bg-[#0b1220] bg-cover bg-center text-left transition hover:brightness-110`}
      style={{ '--c': '12px', '--a': n, backgroundImage: `url(ui/mt/${it.img}.webp)` }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.5),rgba(5,8,15,0) 30%,rgba(5,8,15,.92) 68%,#05080f)' }} />
      <span className="absolute left-3 top-2 font-display text-[15px] font-extrabold tracking-[0.14em]" style={{ color: n, textShadow: `0 0 14px ${n}88,0 2px 4px #000` }}>{catLabel[it.cat]}</span>
      <span className="mt-cut absolute right-2.5 top-2.5 px-2 font-display text-[11px] font-extrabold tracking-[0.14em] text-[#05080f]" style={{ '--c': '5px', background: n }}>{catSub[it.cat]}</span>
      <span className="absolute inset-x-3 bottom-2.5 block">
        <span className="flex items-end gap-2">
          <b className="min-w-0 flex-1 truncate text-base font-black text-white">{it.name}</b>
          <b className="font-display text-lg text-amber-300">{it.price.toLocaleString()} G</b>
        </span>
        <span className="block truncate text-[11px] text-gray-400">{it.desc}</span>
      </span>
    </button>
  );
}

export default function ShopScreen({ account, onChange, onBack }) {
  const [gold, setGold] = useState(account.gold ?? 0);
  const [team, setTeam] = useState(account.team);
  const [cat, setCat] = useState('all');
  const [picked, setPicked] = useState(SHOP_ITEMS[0]);
  const [toast, setToast] = useState('');

  const squad = team.squad || [];
  const items = useMemo(() => SHOP_ITEMS.filter((it) => cat === 'all' || it.cat === cat), [cat]);
  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.key, c.key === 'all' ? SHOP_ITEMS.length : SHOP_ITEMS.filter((i) => i.cat === c.key).length])), []);
  const recs = useMemo(() => (picked ? recommendTargets(team, picked) : []), [picked, team]);
  const owned = (it) => (team.items || []).filter((x) => x.itemId === it.id).length;

  const push = (nextTeam, nextGold, msg) => {
    setTeam(nextTeam); setGold(nextGold);
    saveTeam(nextTeam); addGold(nextGold - gold);
    onChange?.({ team: nextTeam, gold: nextGold });
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };
  const buy = () => {
    if (!picked || picked.price > gold) return;
    if (isStorable(picked)) {
      push(addToInventory(team, picked), gold - picked.price, `${picked.name} — 라커 아이템에 담김 · 보유 ${owned(picked) + 1}개`);
      return;
    }
    if (picked.staffTicket) {
      const n = (team.staffTickets || 0) + 1;
      push({ ...team, staffTickets: n }, gold - picked.price, `${picked.name} +1 · 보유 ${n}장`);
      return;
    }
    if (picked.augTicket) {
      const aug = loadAccount()?.aug;
      if (!aug) return;
      const n = (aug[picked.augTicket] || 0) + 1;
      saveAug({ ...aug, [picked.augTicket]: n });
      push(team, gold - picked.price, `${picked.name} +1 · 보유 ${n}장`);
      return;
    }
    if (picked.cap) push({ ...team, cap: (team.cap || 2000) + picked.cap }, gold - picked.price, `샐러리 캡 +${picked.cap}`);
  };

  const ready = picked && picked.price <= gold;
  const n = picked ? catColor[picked.cat] : '#34d399';

  const NAV = CATEGORIES.map((c) => ({
    key: c.key, label: c.label, sub: `${counts[c.key]}개${c.key === 'all' ? '' : ` · ${catSub[c.key]}`}`,
    img: `ui/mt/${(SHOP_ITEMS.find((i) => c.key === 'all' || i.cat === c.key) || SHOP_ITEMS[0]).img}.webp`,
  }));

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg img="ui/mt/tile-shop.webp" opacity={0.6} />
      <TopBar eyebrow="Shop" section="상점" team={team} account={{ ...account, gold }} onBack={onBack} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4"
        style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>

        <SideNav items={NAV} value={cat} onChange={(k) => { setCat(k); }} a="#fde047" label="Category">
          <div className="mt-cut bg-white/[0.045] p-3" style={cut(8)}>
            <p className="text-[11px] text-gray-400">보유 골드</p>
            <b className="font-display text-2xl text-amber-300">{gold.toLocaleString()} G</b>
            <p className="mt-1 text-[11px] text-gray-500">승 300 · 무 180 · 패 120</p>
          </div>
        </SideNav>

        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#fde047' }}>
          <div className="flex items-baseline gap-3">
            <p className="mt-lab" style={{ '--a': '#fde047' }}>Shop</p>
            <p className="text-sm text-gray-400">오늘의 상품 {items.length}개 · 매일 09시 갱신</p>
          </div>
          <div className="mt-scroll gold mt-3 grid min-h-0 flex-1 grid-cols-4 content-start gap-3 overflow-y-auto pr-2" style={{ gridAutoRows: '12.5rem' }}>
            {items.map((it) => <ItemCard key={it.id} it={it} on={picked?.id === it.id} onClick={() => { setPicked(it); }} />)}
          </div>
        </section>

        <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={{ ...cut(20), '--a': n }}>
          <p className="mt-lab" style={{ '--a': n }}>Pick</p>
          {!picked ? <p className="text-sm text-gray-500">상품을 고르세요.</p> : (
            <>
              <Hero img={`url(ui/mt/${picked.img}.webp)`} name={picked.name} color={n} h={150} pos="center" />
              <p className="-mt-1 text-sm leading-relaxed text-gray-300">{picked.desc}</p>

              {picked.target && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <p className="mt-grp !mt-0">추천 대상</p>
                  <div className="mt-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1.5">
                    {recs.length === 0 && <p className="text-sm text-gray-500">추천할 선수가 없습니다.</p>}
                    {recs.map((t) => (
                      <div key={t.id} className="mt-row mt-cut" style={{ gridTemplateColumns: '40px 38px minmax(0,1fr)', '--a': n }}>
                        <Portrait player={t} w={38} h={46} color={n} />
                        <b className="font-display text-2xl font-extrabold" style={{ color: n }}>{t.overall}</b>
                        <span className="min-w-0">
                          <b className="block truncate text-sm font-black text-white">{t.name}</b>
                          <span className="block truncate text-[11px] text-gray-400">{t.position} · {t.year} {t.team} · {t.stats?.[picked.stat] ?? '-'} → {Math.min(99, (t.stats?.[picked.stat] ?? 70) + picked.amount)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={picked.target ? '' : 'mt-auto'}>
                {isStorable(picked) && <KV k="보유" v={`${owned(picked)}개 · 라커 › 아이템에서 사용`} color="#fff" />}
                <KV k="보유 골드" v={`${gold.toLocaleString()} → ${(gold - picked.price).toLocaleString()}`} color={picked.price > gold ? '#f87171' : '#fde047'} />
              </div>
              <div>
                <Btn pri lg a="#fde047" className="w-full" style={cut(12)} disabled={!ready} onClick={buy}>
                  {picked.price > gold ? '골드 부족' : `${picked.price.toLocaleString()} G 구매 ▶`}
                </Btn>
                {toast && <p className="mt-2 text-center text-sm text-emerald-300">{toast}</p>}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
