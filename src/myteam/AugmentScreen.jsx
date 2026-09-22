/*
 * 증강 — 내 증강 풀 관리 (W1·W2·W3·W7·W8)
 *  사이드: 실버 · 골드 · 프리즘(제외 칸 눈금) + 강화 + 제거권·강화권
 *  가운데: 종류별 묶음 · 두 줄 줄 · 제외한 증강은 맨 아래 묶음
 *  오른쪽: 고른 증강이 있으면 PICK 카드, 없으면 제외 칸 목록(+ 칸 열기, 최대 8)
 */
import React, { useMemo, useState } from 'react';
import { AUGMENTS } from '../KboAugmentDraft.jsx';
import { loadAccount, saveAug, AUG_TIERS, AUG_SLOT_MAX, AUG_LEVEL_MAX } from './store.js';
import { UiStyle, Bg, TopBar, KV } from './ui.jsx';

const cut = (n) => ({ '--c': `${n}px` });
const TIER = {
  silver: { c: '#cbd5e1', en: 'SILVER', ko: '실버' },
  gold: { c: '#fbbf24', en: 'GOLD', ko: '골드' },
  prismatic: { c: '#e879f9', en: 'PRISM', ko: '프리즘' },
};
const TYPE_ORDER = [['build', '빌드'], ['play', '운영'], ['balance', '밸런스'], ['extreme', '극단'], ['luck', '운']];
const TYPE_KO = Object.fromEntries(TYPE_ORDER);
const RED = '#f87171';
const GREEN = '#34d399';

/** 효과 문장에서 맨 뒤 수치 한 개를 떼어 [앞 글, 수치] 로 — 수치가 둘 이상이면 떼지 않는다 */
function splitEffect(desc = '') {
  const nums = desc.match(/[+−-]\d+(?:\.\d+)?/g) || [];
  const m = desc.match(/^(.*?)\s*([+−-]\d+(?:\.\d+)?)$/);
  return nums.length === 1 && m ? [m[1], m[2]] : [desc, null];
}

const Pips = ({ lv, c }) => (
  <span className="flex gap-[3px]">
    {Array.from({ length: AUG_LEVEL_MAX }, (_, i) => (
      <i key={i} className="block h-1.5 w-3 -skew-x-[24deg]" style={{ background: i < lv ? c : 'rgba(255,255,255,.1)' }} />
    ))}
  </span>
);

const GroupHead = ({ label, n, c }) => (
  <div className="flex items-center gap-3 pb-1.5 pt-3">
    <p className="mt-lab" style={{ '--a': c, fontSize: 11 }}>{label}</p>
    <span className="font-display text-xs text-gray-500">{n}</span>
    <span className="h-px flex-1" style={{ background: c === RED ? 'rgba(248,113,113,.3)' : 'rgba(255,255,255,.1)' }} />
  </div>
);

/** 두 줄 줄: 글자 아이콘 · 이름 + 레벨 · 효과 · 끝 버튼 */
function Row({ a, lv, banned, on, upgrade, onPick, onAct, fav = false, onFav = null }) {
  const c = TIER[a.tier].c;
  const tone = banned ? '#6b7280' : c;
  /* 제외 · 풀기는 오른쪽 PICK 카드에서 한다 — 줄에는 강화 탭의 강화 단추만 둔다 */
  const btn = !upgrade ? null
    : lv >= AUG_LEVEL_MAX
      ? <span className="mt-cut grid h-9 place-items-center bg-white/[0.06] font-display text-xs text-gray-500" style={cut(6)}>MAX</span>
      : <button type="button" onClick={(e) => { e.stopPropagation(); onAct(a); }} className="mt-cut h-9 font-display text-xs font-bold text-[#34d399] shadow-[inset_0_0_0_1px_rgba(52,211,153,.5)] hover:bg-emerald-400/10" style={cut(6)}>+{lv + 1} · {lv + 1}장</button>;
  return (
    <div role="button" tabIndex={0} onClick={() => onPick(a)} onKeyDown={(e) => e.key === 'Enter' && onPick(a)}
      className={`mt-cut ${on ? 'mt-frame' : ''} grid shrink-0 cursor-pointer items-center gap-4 px-4 py-2.5 transition hover:brightness-125`}
      style={{ ...cut(10), '--a': c, gridTemplateColumns: upgrade ? '48px minmax(0,1fr) 92px' : '48px minmax(0,1fr)',
        background: on ? `linear-gradient(90deg,${c}2e,rgba(6,10,19,.6))` : banned ? 'rgba(248,113,113,.07)' : 'rgba(255,255,255,.035)' }}>
      {/* 칸 그림: public/augments/<id>.webp (scripts/augment-art.mjs 로 만든다) */}
      <span className="mt-cut h-12 bg-[#0b1220] bg-cover" style={{ ...cut(8), backgroundImage: `url(augments/${a.id}.webp)`, backgroundPosition: 'center 22%', boxShadow: `inset 0 0 0 1px ${tone}59`, filter: banned ? 'grayscale(1) brightness(.6)' : undefined }} />
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <b className={`truncate text-base font-black ${banned ? 'text-gray-500 line-through' : 'text-white'}`}>{a.name}</b>
          {lv > 0 && <span className="font-display text-sm" style={{ color: tone }}>+{lv}</span>}
          <Pips lv={lv} c={banned ? '#4b5563' : c} />
          {onFav && (
            <button type="button" title={fav ? '즐겨찾기 해제' : '즐겨찾기'} aria-pressed={fav}
              onClick={(e) => { e.stopPropagation(); onFav(a); }}
              className="ml-auto shrink-0 px-1 text-base leading-none transition-[color,transform] duration-150 hover:scale-110"
              style={{ color: fav ? '#fbbf24' : 'rgba(148,163,184,.45)', textShadow: fav ? '0 0 10px rgba(251,191,36,.55)' : 'none' }}>
              {fav ? '★' : '☆'}
            </button>
          )}
        </div>
        <p className={`mt-0.5 truncate text-[13px] ${banned ? 'text-gray-600' : 'text-gray-300'}`}>{a.desc}</p>
      </div>
      {btn}
    </div>
  );
}

export default function AugmentScreen({ account, onBack }) {
  const [aug, setAug] = useState(() => loadAccount()?.aug || account.aug);
  const [tab, setTab] = useState('silver'); // silver | gold | prismatic | upgrade
  const [upTier, setUpTier] = useState('silver');
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState('');

  const tier = tab === 'upgrade' ? upTier : tab;
  const T = TIER[tier];
  const pool = useMemo(() => AUGMENTS.filter((a) => a.tier === tier), [tier]);
  const bans = aug.bans[tier] || [];
  const slots = aug.slots[tier];
  const levelOf = (a) => aug.levels[a.id] || 0;
  const byId = (id) => AUGMENTS.find((a) => a.id === id);

  const commit = (next, text) => { setAug(next); saveAug(next); if (text) { setMsg(text); setTimeout(() => setMsg(''), 2400); } };
  /* 즐겨찾기 — 줄 오른쪽 별을 눌러 담아 둔다 (계정에 저장된다) */
  const favs = aug.favs || [];
  const toggleFav = (a) => {
    const next = favs.includes(a.id) ? favs.filter((x) => x !== a.id) : [...favs, a.id];
    commit({ ...aug, favs: next });
  };
  const openSlot = (t) => {
    if (aug.slots[t] >= AUG_SLOT_MAX || aug.removeTickets < 1) return false;
    return { ...aug, removeTickets: aug.removeTickets - 1, slots: { ...aug.slots, [t]: aug.slots[t] + 1 } };
  };
  const toggleBan = (a) => {
    const t = a.tier; const cur = aug.bans[t] || [];
    if (cur.includes(a.id)) { commit({ ...aug, bans: { ...aug.bans, [t]: cur.filter((x) => x !== a.id) } }, `${a.name} 제외를 풀었습니다`); return; }
    let base = aug;
    if (cur.length >= aug.slots[t]) {
      base = openSlot(t);
      if (!base) { setMsg(aug.slots[t] >= AUG_SLOT_MAX ? `제외 칸은 최대 ${AUG_SLOT_MAX}칸입니다` : '제거권이 없습니다 · 상점에서 살 수 있어요'); return; }
    }
    commit({ ...base, bans: { ...base.bans, [t]: [...cur, a.id] } }, `${a.name} 제외`);
  };
  const addSlot = () => { const n = openSlot(tier); if (n) commit(n, `${T.ko} 제외 칸 +1`); else setMsg(slots >= AUG_SLOT_MAX ? `최대 ${AUG_SLOT_MAX}칸입니다` : '제거권이 없습니다'); };
  const upgrade = (a) => {
    const lv = levelOf(a); const need = lv + 1;
    if (lv >= AUG_LEVEL_MAX) return;
    if (aug.upgradeTickets < need) { setMsg(`강화권이 ${need - aug.upgradeTickets}장 부족합니다`); return; }
    commit({ ...aug, upgradeTickets: aug.upgradeTickets - need, levels: { ...aug.levels, [a.id]: need } }, `${a.name} +${need}`);
  };

  const shown = (a) => tab === 'upgrade' || !bans.includes(a.id);
  const groups = TYPE_ORDER.map(([type, label]) => [label, pool.filter((a) => a.type === type && shown(a) && !favs.includes(a.id))])
    .filter(([, list]) => list.length);
  const others = pool.filter((a) => !TYPE_KO[a.type] && shown(a) && !favs.includes(a.id));
  if (others.length) groups.push(['기타', others]);
  const favList = pool.filter((a) => favs.includes(a.id) && shown(a));
  if (favList.length) groups.unshift(['즐겨찾기', favList]);
  const picked = sel && sel.tier === tier ? sel : null;
  const pickBanned = picked && bans.includes(picked.id);

  const NAV = [
    ...AUG_TIERS.map((t) => ({ key: t, label: `${TIER[t].ko} 증강`, c: TIER[t].c, t })),
    { key: 'upgrade', label: '강화', c: GREEN },
  ];

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg img="ui/mt/mt-boost.webp" opacity={0.6} />
      <TopBar eyebrow="Augments" section="증강" account={account} onBack={onBack} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4" style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>
        {/* 사이드 네비 */}
        <nav className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2 p-3" style={{ ...cut(20), '--a': tab === 'upgrade' ? GREEN : T.c }}>
          {NAV.map((it, k) => {
            const on = tab === it.key;
            return (
              <React.Fragment key={it.key}>
                {k === 0 && <p className="mt-lab px-1 pt-1">Pool</p>}
                {it.key === 'upgrade' && <p className="mt-lab px-1 pt-2" style={{ '--a': GREEN }}>Upgrade</p>}
                <button type="button" onClick={() => { setTab(it.key); setSel(null); if (it.key !== 'upgrade') setUpTier(it.key); }}
                  className={`mt-nav sm ${on ? 'on' : ''}`} style={{ '--a': it.c }}>
                  {/* 칸 그림: public/ui/aug/<키>.webp (scripts/aug-tier-art.mjs 로 만든다 — 등급 색 빛 · 같은 어두운 배경) */}
                  <span className="mt-cut h-[2.75rem] w-10 shrink-0 bg-cover bg-center" style={{ ...cut(8), backgroundImage: `url(ui/aug/${it.key}.webp)`, boxShadow: `inset 0 0 0 1px ${it.c}66`, filter: on ? undefined : 'saturate(.8) brightness(.8)' }} />
                  <span className="min-w-0 flex-1">
                    <b className={`block truncate text-base font-black ${on ? 'text-white' : 'text-gray-300'}`}>{it.label}</b>
                  </span>
                </button>
              </React.Fragment>
            );
          })}
          <div className="mt-cut mt-auto bg-white/[0.045] p-3" style={cut(8)}>
            <div className="flex justify-between text-sm text-gray-400"><span>제거권</span><b className="font-display text-lg text-rose-300">{aug.removeTickets}</b></div>
            <div className="flex justify-between text-sm text-gray-400"><span>강화권</span><b className="font-display text-lg text-amber-300">{aug.upgradeTickets}</b></div>
          </div>
        </nav>

        {/* 가운데: 종류별 묶음 + 제외 묶음 */}
        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': tab === 'upgrade' ? GREEN : T.c }}>
          <div className="flex items-baseline gap-3">
            <p className="mt-lab" style={{ '--a': tab === 'upgrade' ? GREEN : T.c }}>{tab === 'upgrade' ? 'Upgrade' : `${T.en} Pool`}</p>
            <p className="text-sm text-gray-400">{tab === 'upgrade' ? `${T.ko} · 종류별 · 레벨마다 강화권이 1장씩 더 듭니다` : `등장 ${pool.length - bans.length} · 제외 ${bans.length}/${slots} · 종류별`}</p>
            {tab === 'upgrade' && (
              <div className="ml-auto flex gap-1.5">
                {AUG_TIERS.map((t) => (
                  <button key={t} type="button" onClick={() => { setUpTier(t); setSel(null); }}
                    className={`mt-cut px-3 py-1 font-display text-sm font-bold ${upTier === t ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400 hover:text-white'}`}
                    style={{ ...cut(5), background: upTier === t ? GREEN : undefined }}>{TIER[t].ko}</button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-scroll mt-1 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2">
            {groups.map(([label, list]) => (
              <div key={label}>
                <GroupHead label={label} n={list.length} c={label === '즐겨찾기' ? '#fbbf24' : tab === 'upgrade' ? GREEN : T.c} />
                <div className="grid grid-cols-2 gap-1.5">
                  {list.map((a) => (
                    <Row key={a.id} a={a} lv={levelOf(a)} banned={bans.includes(a.id) && tab !== 'upgrade'} on={picked?.id === a.id} upgrade={tab === 'upgrade'}
                      fav={favs.includes(a.id)} onFav={toggleFav}
                      onPick={(x) => setSel((s) => (s?.id === x.id ? null : x))} onAct={tab === 'upgrade' ? upgrade : toggleBan} />
                  ))}
                </div>
              </div>
            ))}
            {tab !== 'upgrade' && bans.length > 0 && (
              <div>
                <GroupHead label="Excluded · 제외됨" n={bans.length} c={RED} />
                <div className="grid grid-cols-2 gap-1.5">
                  {bans.map(byId).filter(Boolean).map((a) => (
                    <Row key={a.id} a={a} lv={levelOf(a)} banned on={picked?.id === a.id} fav={favs.includes(a.id)} onFav={toggleFav}
                      onPick={(x) => setSel((s) => (s?.id === x.id ? null : x))} onAct={toggleBan} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 오른쪽: PICK 카드 / 제외 칸 목록 */}
        <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-6" style={{ ...cut(20), '--a': picked ? T.c : tab === 'upgrade' ? GREEN : RED }}>
          {picked ? (() => {
            const lv = levelOf(picked); const c = T.c;
            const full = bans.length >= slots;
            return (
              <>
                <p className="mt-lab" style={{ '--a': c }}>Pick</p>
                <div className="mt-cut mt-frame relative min-h-0 flex-1 overflow-hidden bg-[#070b14]" style={{ ...cut(18), '--a': c }}>
                  {/* 증강 그림(public/augments/<id>.webp)이 카드를 꽉 채운다 */}
                  <span className="absolute inset-0 bg-cover bg-top" style={{ backgroundImage: `url(augments/${picked.id}.webp)`, filter: pickBanned ? 'grayscale(1) brightness(.6)' : undefined }} />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%]" style={{ background: 'linear-gradient(transparent,#070b14 92%)' }} />
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: c, boxShadow: `0 0 14px ${c}` }} />
                  <div className="absolute inset-x-4 top-4 flex items-center gap-2">
                    <span className="mt-cut px-2 font-display text-[11px] font-extrabold tracking-[0.14em] text-[#05080f]" style={{ ...cut(4), background: c }}>{T.en}</span>
                    <span className="text-xs text-gray-300">{TYPE_KO[picked.type] || picked.type}</span>
                    {pickBanned && <span className="mt-cut ml-auto bg-[#f87171] px-2 font-display text-[11px] font-extrabold text-[#05080f]" style={cut(4)}>제외됨</span>}
                  </div>
                  <div className="absolute inset-x-0 bottom-0">
                    <b className="block px-[18px] pb-3 text-3xl font-black leading-tight text-white">{picked.name} {lv > 0 && <span className="font-display" style={{ color: c }}>+{lv}</span>}</b>
                    {(() => { const [head, num] = splitEffect(picked.desc); return (
                      <span className="flex items-center justify-between gap-3 px-[18px] py-3" style={{ background: `linear-gradient(90deg,${c}2a,transparent)`, boxShadow: `inset 0 1px 0 ${c}59` }}>
                        <b className="min-w-0 text-[15px] leading-snug text-gray-100">{head}</b>
                        {num && <b className="shrink-0 font-display text-[34px] leading-none" style={{ color: c }}>{num}</b>}
                      </span>
                    ); })()}
                    <span className="block px-[18px] pb-4 pt-3"><Pips lv={lv} c={c} /></span>
                  </div>
                </div>
                {tab === 'upgrade' ? (
                  <>
                    <div>
                      <KV k="지금 레벨" v={`+${lv} / ${AUG_LEVEL_MAX}`} color={c} />
                      <KV k="필요 강화권" v={lv >= AUG_LEVEL_MAX ? '—' : `${lv + 1}장 / 보유 ${aug.upgradeTickets}장`} color="#fbbf24" />
                    </div>
                    <button type="button" className="mt-btn pri lg w-full" style={{ '--a': GREEN }} disabled={lv >= AUG_LEVEL_MAX || aug.upgradeTickets < lv + 1} onClick={() => upgrade(picked)}>
                      {lv >= AUG_LEVEL_MAX ? '최대 레벨' : aug.upgradeTickets < lv + 1 ? `강화권 ${lv + 1 - aug.upgradeTickets}장 부족` : `+${lv + 1} 강화하기 ▶`}
                    </button>
                  </>
                ) : (
                  <>
                    <KV k={`${T.ko} 제외 칸`} v={`${bans.length} / ${slots}`} color={RED} />
                    <button type="button" className="mt-btn pri lg w-full" style={{ '--a': pickBanned ? '#94a3b8' : RED }}
                      disabled={!pickBanned && full && (slots >= AUG_SLOT_MAX || aug.removeTickets < 1)} onClick={() => toggleBan(picked)}>
                      {pickBanned ? '제외 풀기 ↺' : !full ? '이 증강 제외하기 ✕' : slots >= AUG_SLOT_MAX ? `최대 ${AUG_SLOT_MAX}칸 · 다른 제외를 푸세요` : aug.removeTickets < 1 ? '칸 가득 · 제거권 없음' : '+ 칸 열고 제외 · 제거권 1장'}
                    </button>
                  </>
                )}
              </>
            );
          })() : tab === 'upgrade' ? (
            <>
              <p className="mt-lab" style={{ '--a': GREEN }}>Upgrade</p>
              <h2 className="-mt-2 text-3xl font-black text-white">증강 강화</h2>
              <p className="text-sm leading-relaxed text-gray-300">자주 쓰는 증강을 골라 강화권으로 레벨을 올립니다. +{AUG_LEVEL_MAX}까지, 레벨마다 강화권이 1장씩 더 듭니다.</p>
              <div>
                <KV k="보유 강화권" v={`${aug.upgradeTickets}장`} color="#fbbf24" />
                <KV k="강화한 증강" v={`${Object.values(aug.levels).filter(Boolean).length}개`} color={GREEN} />
              </div>
              <p className="mt-auto text-sm text-gray-500">목록에서 증강을 누르면 여기에 카드로 올라옵니다.</p>
            </>
          ) : (
            <>
              <p className="mt-lab" style={{ '--a': RED }}>Excluded</p>
              <h2 className="-mt-2 text-3xl font-black text-white">{T.ko} 증강 제외</h2>
              <p className="text-sm leading-relaxed text-gray-300">제외된 증강은 경기에 나오지 않습니다.</p>
              <div className="mt-scroll flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
                {bans.map(byId).filter(Boolean).map((a, k) => (
                  <div key={a.id} className="mt-cut flex items-center gap-3 bg-[#f87171]/10 px-3 py-2" style={cut(6)}>
                    <span className="w-4 font-display text-xs text-gray-500">{k + 1}</span>
                    <span className="font-display text-lg font-extrabold" style={{ color: T.c }}>{a.name[0]}</span>
                    <span className="min-w-0 flex-1"><b className="block truncate text-sm text-white">{a.name}</b><small className="block truncate text-[11px] text-gray-500">{a.desc}</small></span>
                    <button type="button" onClick={() => toggleBan(a)} className="text-xs text-[#f87171] hover:text-white" aria-label={`${a.name} 제외 풀기`}>↺</button>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, slots - bans.length) }, (_, k) => (
                  <div key={`e${k}`} className="mt-cut flex items-center gap-3 px-3 py-2 text-sm text-gray-500 shadow-[inset_0_0_0_1px_rgba(148,163,184,.2)]" style={cut(6)}>
                    <span className="w-4 font-display text-xs">{bans.length + k + 1}</span>빈 제외 칸
                  </div>
                ))}
                {slots < AUG_SLOT_MAX ? (
                  <button type="button" onClick={addSlot} disabled={aug.removeTickets < 1}
                    title={`제외 칸 열기 · 제거권 1장 (보유 ${aug.removeTickets})`} aria-label="제외 칸 열기"
                    className="mt-cut grid place-items-center px-3 py-2 text-base font-extrabold leading-5 text-[#fda4af] shadow-[inset_0_0_0_1px_rgba(148,163,184,.2)] hover:text-white disabled:opacity-40"
                    style={cut(6)}>+</button>
                ) : (
                  <div className="mt-cut py-2 text-center font-display text-xs tracking-[0.2em] text-gray-500 shadow-[inset_0_0_0_1px_rgba(148,163,184,.15)]" style={cut(6)}>최대 {AUG_SLOT_MAX}칸</div>
                )}
              </div>
              <div className="mt-auto">
                <KV k="등장하는 증강" v={`${pool.length - bans.length}개`} color={GREEN} />
              </div>
            </>
          )}
          {msg && <p className="text-center text-sm text-amber-200">{msg}</p>}
        </aside>
      </div>
    </div>
  );
}
