/*
 * 증강 — 내 증강 풀 관리 (W1·W2·W3·W7·W8)
 *  사이드: 증강 풀(제외 칸 눈금) + 강화 + 제거권·강화권
 *  가운데: 종류별 묶음 · 두 줄 줄 · 제외한 증강은 맨 아래 묶음
 *  오른쪽: 고른 증강이 있으면 PICK 카드, 없으면 제외 칸 목록(+ 칸 열기, 최대 8)
 */
import React, { useMemo, useState } from 'react';
import { AUGMENTS, augDescAt } from '../KboAugmentDraft.jsx';
import { loadAccount, saveAug, augShopTickets, spendAugTicket, pledgedAugId, setPledgedAug, AUG_TIERS, AUG_SLOT_MAX, AUG_LEVEL_MAX } from './store.js';
import { UiStyle, Bg, TopBar } from './ui.jsx';

const cut = (n) => ({ '--c': `${n}px` });
/* 증강 등급은 하나로 합쳤다 — 어느 이름으로 물어도 같은 것이 나온다 */
const AUG_LOOK = { c: '#cbd5e1', en: 'AUGMENT', ko: '증강' };
const TIER = new Proxy({}, { get: () => AUG_LOOK });
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

/** 효과 문장 → 칸 여럿. ', ' 와 ' · ' 에서 끊되 괄호 안은 그대로 두고, 칸마다 끝 수치를 뗀다 */
function effectRows(desc = '') {
  const open = (t) => (t.match(/\(/g) || []).length > (t.match(/\)/g) || []).length;
  const parts = [];
  desc.split(/,\s*|\s+·\s+/).forEach((t) => {
    const last = parts.length - 1;
    if (last >= 0 && open(parts[last])) parts[last] = `${parts[last]}, ${t}`;
    else parts.push(t);
  });
  return parts.map(splitEffect);
}

/** '+35' 같은 표기를 수로 (−는 유니코드 빼기표도 받는다) */
const numOf = (t) => Number(String(t).replace('−', '-'));
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Number.isInteger(v) ? v : Math.round(v * 100) / 100)}`;
/** 강화 전 수치와 늘어난 몫 — 늘지 않았으면 null */
function gainOf(now, was) {
  if (!now || !was || now === was) return null;
  const a = numOf(now); const b = numOf(was);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  return `${was} ${signed(Math.round((a - b) * 100) / 100)}`;
}

const Pips = ({ lv, c }) => (
  <span className="flex gap-[3px]">
    {Array.from({ length: AUG_LEVEL_MAX }, (_, i) => (
      <i key={i} className="block h-1.5 w-3 -skew-x-[24deg]" style={{ background: i < lv ? c : 'rgba(255,255,255,.1)' }} />
    ))}
  </span>
);

/** 제거권 · 강화권 — 상점에서 파는 그 물건 그대로 */
const TICKETS = [
  { key: 'removeTickets', ko: '제거권', tip: '제외 칸을 하나 연다', img: 'ui/shop/au-remove.webp', c: '#fb7185' },
  { key: 'upgradeTickets', ko: '강화권', tip: '증강 레벨을 하나 올린다', img: 'ui/shop/au-upgrade.webp', c: '#fbbf24' },
];

const GroupHead = ({ label, c }) => (
  <div className="flex items-center gap-3 pb-1.5 pt-3">
    <p className="mt-lab" style={{ '--a': c, fontSize: 11 }}>{label}</p>
    <span className="h-px flex-1" style={{ background: c === RED ? 'rgba(248,113,113,.3)' : 'rgba(255,255,255,.1)' }} />
  </div>
);

/** 두 줄 줄: 글자 아이콘 · 이름 + 레벨 · 효과 · 끝 버튼 */
function Row({ a, lv, banned, on, upgrade, onPick, onAct, fav = false, onFav = null }) {
  const c = TIER[a.tier].c;
  const tone = banned ? '#6b7280' : c;
  /* 제외 · 풀기 · 강화는 오른쪽 PICK 카드에서 한다 — 줄의 단추는 그 카드를 여는 것까지 */
  const btn = !upgrade ? null
    : lv >= AUG_LEVEL_MAX
      ? <span className="mt-cut grid h-9 place-items-center bg-white/[0.06] text-xs font-bold text-gray-500" style={cut(6)}>최대</span>
      : <button type="button" onClick={(e) => { e.stopPropagation(); onPick(a); }} className="mt-cut h-9 text-xs font-bold text-[#34d399] shadow-[inset_0_0_0_1px_rgba(52,211,153,.5)] hover:bg-emerald-400/10" style={cut(6)}>강화</button>;
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
        <p className={`mt-0.5 truncate text-[13px] ${banned ? 'text-gray-600' : 'text-gray-300'}`}>{augDescAt(a, lv)}</p>
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
  /* 증강 지명권 — 한 장 쓰면 그 증강이 다음 판 첫 선택지에 반드시 나온다 */
  const [pledgeLeft, setPledgeLeft] = useState(() => augShopTickets().pledge || 0);
  const [pledged, setPledged] = useState(() => pledgedAugId());
  const doPledge = (a) => {
    if (!a || pledged === a.id) return;
    if (!spendAugTicket('pledge')) { setMsg('증강 지명권 없음 · 상점에서 구입'); setTimeout(() => setMsg(''), 2400); return; }
    setPledgedAug(a.id);
    setPledged(a.id);
    setPledgeLeft(augShopTickets().pledge || 0);
  };

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
    if (cur.includes(a.id)) { commit({ ...aug, bans: { ...aug.bans, [t]: cur.filter((x) => x !== a.id) } }); return; }
    let base = aug;
    if (cur.length >= aug.slots[t]) {
      base = openSlot(t);
      if (!base) { setMsg(aug.slots[t] >= AUG_SLOT_MAX ? `제외 칸 최대 ${AUG_SLOT_MAX}칸` : '제거권 없음 · 상점에서 구입'); return; }
    }
    commit({ ...base, bans: { ...base.bans, [t]: [...cur, a.id] } });
  };
  const addSlot = () => { const n = openSlot(tier); if (n) commit(n, '제외 칸 +1'); else setMsg(slots >= AUG_SLOT_MAX ? `최대 ${AUG_SLOT_MAX}칸` : '제거권 없음'); };
  const upgrade = (a) => {
    const lv = levelOf(a); const need = lv + 1;
    if (lv >= AUG_LEVEL_MAX) return;
    if (aug.upgradeTickets < need) { setMsg(`강화권 ${need - aug.upgradeTickets}장 부족`); return; }
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
    ...AUG_TIERS.map((t) => ({ key: t, label: '증강', c: TIER[t].c, t })),
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
          <div className="mt-auto grid gap-1.5">
            {TICKETS.map((t) => (
              <div key={t.key} className="mt-cut flex h-[62px] items-center gap-[11px] bg-white/[0.04] pr-3" style={cut(8)}>
                <span className="h-[50px] w-11 shrink-0 bg-cover" style={{ ...cut(7), backgroundImage: `url(${t.img})`, backgroundPosition: 'center 30%', boxShadow: `inset 0 0 0 1px ${t.c}59` }} />
                <span className="grid min-w-0 flex-1 gap-px">
                  <b className="text-[13.5px] text-[#e8ecf2]">{t.ko}</b>
                  <small className="whitespace-nowrap text-[11.5px] text-gray-500">{t.tip}</small>
                </span>
                <b className="font-display text-[23px]" style={{ color: t.c }}>{aug[t.key]}</b>
              </div>
            ))}
          </div>
        </nav>

        {/* 가운데: 종류별 묶음 + 제외 묶음 */}
        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': tab === 'upgrade' ? GREEN : T.c }}>
          <div className="flex items-baseline gap-3">
            <p className="mt-lab" style={{ '--a': tab === 'upgrade' ? GREEN : T.c }}>{tab === 'upgrade' ? 'Upgrade' : `${T.en} Pool`}</p>
            {tab === 'upgrade' && AUG_TIERS.length > 1 && (
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
                <GroupHead label={label} c={label === '즐겨찾기' ? '#fbbf24' : tab === 'upgrade' ? GREEN : T.c} />
                <div className="grid grid-cols-2 gap-1.5">
                  {list.map((a) => (
                    <Row key={a.id} a={a} lv={levelOf(a)} banned={bans.includes(a.id) && tab !== 'upgrade'} on={picked?.id === a.id} upgrade={tab === 'upgrade'}
                      fav={favs.includes(a.id)} onFav={toggleFav}
                      onPick={(x) => setSel((s) => (tab === 'upgrade' ? x : s?.id === x.id ? null : x))} onAct={tab === 'upgrade' ? upgrade : toggleBan} />
                  ))}
                </div>
              </div>
            ))}
            {tab !== 'upgrade' && bans.length > 0 && (
              <div>
                <GroupHead label="Excluded · 제외됨" c={RED} />
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
            const pickFav = favs.includes(picked.id);
            const showPledge = pledgeLeft > 0 || pledged === picked.id;   // 지명 단추가 끼면 제외 문구를 줄인다
            return (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="mt-lab" style={{ '--a': c }}>Pick</p>
                  <b className="font-display text-sm" style={{ color: full ? RED : '#7c8797' }}>{bans.length} / {slots}</b>
                </div>
                <div key={picked.id} className="mt-staff-in mt-cut mt-frame relative min-h-0 flex-1 overflow-hidden bg-[#070b14]"
                  style={{ ...cut(18), '--a': c, filter: pickBanned ? 'saturate(.12) brightness(.66)' : 'none', transition: 'filter .38s ease' }}>
                  {/* 증강 그림(public/augments/<id>.webp)이 카드를 꽉 채운다 */}
                  <span className="absolute inset-0 bg-cover bg-top" style={{ backgroundImage: `url(augments/${picked.id}.webp)` }} />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%]" style={{ background: 'linear-gradient(transparent,#070b14 92%)' }} />
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: c, boxShadow: `0 0 14px ${c}` }} />
                  <div className="absolute inset-x-4 top-4 flex items-center gap-2">
                    <span className="mt-cut px-2 font-display text-[11px] font-extrabold tracking-[0.14em] text-[#05080f]" style={{ ...cut(4), background: c }}>{T.en}</span>
                    <span className="text-xs text-gray-300">{TYPE_KO[picked.type] || picked.type}</span>
                    <span aria-hidden={!pickBanned} className="mt-cut ml-auto bg-[#f87171] px-2 font-display text-[11px] font-extrabold text-[#05080f]"
                      style={{ ...cut(4), opacity: pickBanned ? 1 : 0, transform: pickBanned ? 'none' : 'translateY(-4px)', transition: 'opacity .3s ease, transform .3s ease' }}>제외됨</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                    <b className="block text-[27px] font-black leading-tight text-white">{picked.name} {lv > 0 && <span className="font-display" style={{ color: c }}>+{lv}</span>}</b>
                    <div className="mt-2.5 grid gap-[5px]">
                      {(() => { const base = effectRows(picked.desc); return effectRows(augDescAt(picked, lv)).map(([head, num], i) => {
                        const gain = gainOf(num, base[i]?.[1]);
                        return (
                          <span key={i} className="mt-cut flex items-center justify-between gap-2.5 px-3 py-[7px]"
                            style={{ ...cut(6), background: 'rgba(255,255,255,.06)', boxShadow: `inset 2px 0 0 ${c}` }}>
                            <small className="min-w-0 text-[13px] leading-snug text-gray-300">{head}</small>
                            {num && (
                              <span className="flex shrink-0 items-baseline gap-2">
                                {gain && <small className="font-display text-[12px] text-gray-500">{gain}</small>}
                                <b className="font-display text-[21px] leading-none" style={{ color: c }}>{num}</b>
                              </span>
                            )}
                          </span>
                        );
                      }); })()}
                    </div>
                    <span className="mt-3 flex items-center gap-2.5">
                      <small className="font-display text-[11px] font-bold tracking-[0.2em] text-gray-500">LEVEL</small>
                      <Pips lv={lv} c={c} />
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  {tab === 'upgrade' ? (
                    <button type="button" className="mt-btn pri lg w-full" style={{ '--a': GREEN, flexDirection: 'column', gap: 1, lineHeight: 1.15 }}
                      disabled={lv >= AUG_LEVEL_MAX || aug.upgradeTickets < lv + 1} onClick={() => upgrade(picked)}>
                      {lv >= AUG_LEVEL_MAX ? <span>최대 레벨 +{AUG_LEVEL_MAX}</span> : (
                        <>
                          <span>+{lv + 1} 강화하기</span>
                          <small className="text-[12.5px] font-bold opacity-[0.72]">강화권 {lv + 1}장 소모 · 보유 {aug.upgradeTickets}장</small>
                        </>
                      )}
                    </button>
                  ) : (
                    <button type="button" className="mt-btn pri lg w-full" style={{ '--a': GREEN }} disabled={lv >= AUG_LEVEL_MAX}
                      onClick={() => { setUpTier(picked.tier); setTab('upgrade'); }}>
                      {lv >= AUG_LEVEL_MAX ? `최대 레벨 +${AUG_LEVEL_MAX}` : '강화하기 ▶'}
                    </button>
                  )}
                  {tab !== 'upgrade' && (
                  <div className="flex gap-2">
                    <button type="button" className="mt-btn min-w-0 flex-1 px-3 text-[14px]"
                      style={{ color: pickBanned ? '#e8ecf2' : '#fda4af', boxShadow: pickBanned ? undefined : 'inset 0 0 0 1px rgba(248,113,113,.4)' }}
                      disabled={!pickBanned && full && (slots >= AUG_SLOT_MAX || aug.removeTickets < 1)} onClick={() => toggleBan(picked)}>
                      {pickBanned ? '제외 풀기 ↺' : !full ? (showPledge ? '제외하기 ✕' : '이 증강 제외하기 ✕') : slots >= AUG_SLOT_MAX ? '칸 가득 · 최대' : aug.removeTickets < 1 ? '칸 가득 · 제거권 없음' : '칸 열고 제외 · 제거권 1장'}
                    </button>
                    {showPledge && (
                      <button type="button" onClick={() => doPledge(picked)} disabled={pledged === picked.id}
                        className="mt-btn shrink-0 gap-1.5 px-3 text-[14px]"
                        style={{ color: pledged === picked.id ? '#e879f9' : '#c4b5fd', boxShadow: pledged === picked.id ? 'inset 0 0 0 1px rgba(232,121,249,.55)' : undefined }}
                        title={pledged === picked.id ? '다음 판 첫 선택지에 나옵니다' : `증강 지명권 ${pledgeLeft}장 — 다음 판 첫 선택지에 꼭 넣는다`}>
                        {pledged === picked.id ? '지명됨' : '지명하기'}
                      </button>
                    )}
                    <button type="button" onClick={() => toggleFav(picked)} title={pickFav ? '즐겨찾기 해제' : '즐겨찾기'} aria-pressed={pickFav}
                      className="mt-btn shrink-0 gap-1.5 px-4 text-[14px]"
                      style={{ color: pickFav ? '#fbbf24' : '#94a3b8', boxShadow: pickFav ? 'inset 0 0 0 1px rgba(251,191,36,.5)' : undefined }}>
                      <span className="text-base leading-none">{pickFav ? '★' : '☆'}</span>즐겨찾기
                    </button>
                  </div>
                  )}
                </div>
              </>
            );
          })() : tab === 'upgrade' ? (
            <>
              <p className="mt-lab" style={{ '--a': GREEN }}>Upgrade</p>
              <h2 className="-mt-2 text-3xl font-black text-white">증강 강화</h2>
            </>
          ) : (
            <>
              <p className="mt-lab" style={{ '--a': RED }}>Excluded</p>
              <h2 className="-mt-2 text-3xl font-black text-white">증강 제외</h2>
              <p className="text-sm leading-relaxed text-gray-300">제외된 증강은 경기에 나오지 않음</p>
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
            </>
          )}
          {msg && <p className="text-center text-sm text-amber-200">{msg}</p>}
        </aside>
      </div>
    </div>
  );
}
