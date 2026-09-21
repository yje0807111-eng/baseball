/*
 * 상점 — 재화는 골드 하나.
 *  훈련: 선수 능력치 영구 상승 (CP 영입가는 그대로 → 돈으로 가성비를 산다)
 *  부스트: 다음 N경기 동안만 붙는 소모품
 *  운영: 샐러리 캡 확장 등 팀 단위
 *  감독 계약: 감독을 CP 없이 선임
 */
import { overallOf } from '../data/seriesPlayers.js';

export const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'training', label: '훈련' },
  { key: 'boost', label: '부스트' },
  { key: 'ops', label: '운영' },
  { key: 'staff', label: '감독' },
  { key: 'aug', label: '증강' },
];

const item = (id, cat, name, desc, price, opt) => ({ id, cat, name, desc, price, ...opt });

export const SHOP_ITEMS = [
  // 훈련 (영구)
  item('tr-contact', 'training', '타격 특훈', '타자 1명 컨택 +3 · 영구', 300, { target: 'batter', stat: 'contact', amount: 3, img: 'mt-boost' }),
  item('tr-power', 'training', '파워 훈련', '타자 1명 파워 +3 · 영구', 320, { target: 'batter', stat: 'power', amount: 3, img: 'mt-boost' }),
  item('tr-speed', 'training', '주루 훈련', '타자 1명 주루 +4 · 영구', 240, { target: 'batter', stat: 'speed', amount: 4, img: 'mt-boost' }),
  item('tr-control', 'training', '제구 교정', '투수 1명 제구 +3 · 영구', 300, { target: 'pitcher', stat: 'control', amount: 3, img: 'mt-boost' }),
  item('tr-stuff', 'training', '구위 강화', '투수 1명 구위 +3 · 영구', 340, { target: 'pitcher', stat: 'stuff', amount: 3, img: 'mt-boost' }),
  // 부스트 (경기 한정)
  item('bo-stamina', 'boost', '에너지 드링크', '투수 1명 체력 +15 · 3경기', 120, { target: 'pitcher', stat: 'stamina', amount: 15, games: 3, img: 'mt-boost' }),
  item('bo-focus', 'boost', '집중력 강화', '타자 1명 컨택 +5 · 1경기', 90, { target: 'batter', stat: 'contact', amount: 5, games: 1, img: 'mt-boost' }),
  item('bo-power', 'boost', '파워 스윙', '타자 1명 파워 +6 · 1경기', 110, { target: 'batter', stat: 'power', amount: 6, games: 1, img: 'mt-boost' }),
  // 운영
  item('op-cap40', 'ops', 'CP 확장 +40', '샐러리 캡 한도 +40 · 영구', 800, { cap: 40, img: 'mt-pack' }),
  item('op-cap100', 'ops', 'CP 확장 +100', '샐러리 캡 한도 +100 · 영구', 1800, { cap: 100, img: 'mt-pack' }),
  // 감독 계약 (CP 없이 선임)
  item('st-manager', 'staff', '감독 계약서', '감독 1명을 CP 없이 선임', 520, { staffRole: 'manager', img: 'mt-card' }),
  // 증강 (풀 관리)
  item('au-remove', 'aug', '증강 제거권', '등급 하나의 제외 칸 +1 (최대 8칸)', 400, { augTicket: 'removeTickets', img: 'mt-pack' }),
  item('au-upgrade', 'aug', '증강 강화권', '증강 강화에 쓰는 권 1장', 600, { augTicket: 'upgradeTickets', img: 'mt-boost' }),
  item('st-coach', 'staff', '코치 계약서', '코치 1명을 CP 없이 선임', 340, { staffRole: 'coach', img: 'mt-card' }),
  item('st-upgrade', 'staff', '코치 강화권', '감독 · 코치 1명 레벨 +1 (내 라커에서 사용 · 최대 Lv.5)', 450, { staffTicket: true, img: 'mt-boost' }),
];

/** 상품 그림 (public/ui/shop/<상품 id>.webp — scripts/shop-art.mjs 로 만든다. 장면은 상품마다, 빛 색은 분류마다) */
export const itemArt = (it) => `ui/shop/${it.id}.webp`;

/** 상품이 올려 주는 값 — [이름, 오르는 값, 같은 종류 최대치(게이지 기준)] */
export function itemEffect(it) {
  if (it.stat) return { label: STAT_KO[it.stat] || it.stat, amount: it.amount, max: it.stat === 'stamina' ? 15 : 6 };
  if (it.cap) return { label: '샐러리 캡', amount: it.cap, max: 100 };
  if (it.staffRole) return { label: it.staffRole === 'manager' ? '감독 선임' : '코치 선임', amount: null, max: 1 };
  if (it.staffTicket) return { label: '코치 레벨', amount: 1, max: 1 };
  if (it.augTicket) return { label: it.augTicket === 'removeTickets' ? '제외 칸' : '증강 강화', amount: 1, max: 1 };
  return { label: it.name, amount: null, max: 1 };
}

export const STAT_KO = { power: '파워', contact: '컨택', speed: '주루', control: '제구', stuff: '구위', stamina: '체력' };

/* 팀에서 가장 약한 묶음과, 그걸 올려 주는 상품 한 가지 (라커 아이템 탭 · 상점 사이드 공용) */
export const WEAK_KO = { bat: '타선', sp: '선발', rp: '불펜' };
export const WEAK_COLOR = { bat: '#34d399', sp: '#60a5fa', rp: '#f87171' };
const WEAK_ITEM = { bat: 'tr-power', sp: 'tr-stuff', rp: 'tr-stuff' };
export function teamWeakness(squad = []) {
  const avg = (l) => (l.length ? Math.round(l.reduce((s, p) => s + p.overall, 0) / l.length) : 0);
  const groups = { bat: squad.filter((p) => p.type === 'batter'), sp: squad.filter((p) => p.position === 'SP'), rp: squad.filter((p) => p.position === 'RP') };
  const rows = Object.entries(groups).map(([k, l]) => ({ k, v: avg(l), n: l.length, worst: [...l].sort((a, b) => a.overall - b.overall)[0] }));
  const filled = rows.filter((r) => r.n);
  const weak = filled.length ? filled.reduce((a, b) => (b.v < a.v ? b : a)) : null;
  return { rows, weak, item: weak ? SHOP_ITEMS.find((x) => x.id === WEAK_ITEM[weak.k]) : null };
}

export const needsPlayer = (it) => !!it.target;
export const needsStaff = (it) => !!it.staffRole;

/** 훈련·부스트를 선수에게 적용한 새 팀을 돌려준다 */
export function applyToPlayer(team, it, player) {
  if (it.cat === 'training') {
    const squad = (team.squad || []).map((p) => {
      if (p.id !== player.id) return p;
      const stats = { ...p.stats, [it.stat]: Math.min(99, (p.stats?.[it.stat] ?? 70) + it.amount) };
      const trained = [...(p.trained || []), { stat: it.stat, amount: it.amount }];
      return { ...p, stats, trained, overall: overallOf(p.position, stats) };
    });
    return { ...team, squad };
  }
  // 부스트: 경기 수만큼 남는 소모품
  const boosts = [...(team.boosts || []), { key: `${it.id}-${player.id}-${Date.now()}`, itemId: it.id, playerId: player.id, playerName: player.name, stat: it.stat, amount: it.amount, gamesLeft: it.games }];
  return { ...team, boosts };
}

/** 경기 직전: 살아 있는 부스트를 능력치에 얹은 로스터를 만든다 */
export function withBoosts(team) {
  const boosts = team.boosts || [];
  if (!boosts.length) return team.squad || [];
  return (team.squad || []).map((p) => {
    const mine = boosts.filter((b) => b.playerId === p.id && b.gamesLeft > 0);
    if (!mine.length) return p;
    const stats = { ...p.stats };
    for (const b of mine) stats[b.stat] = Math.min(99, (stats[b.stat] ?? 70) + b.amount);
    return { ...p, stats, overall: overallOf(p.position, stats), boosted: true };
  });
}

/** 경기를 한 판 치르면 부스트 수명이 하나 줄어든다 */
export function tickBoosts(team) {
  const boosts = (team.boosts || []).map((b) => ({ ...b, gamesLeft: b.gamesLeft - 1 })).filter((b) => b.gamesLeft > 0);
  return { ...team, boosts };
}

/* ───── 아이템 보관함: 훈련·부스트·계약서는 사서 라커 '아이템'에 담아 두고, 거기서 대상을 골라 쓴다 ───── */
export const isStorable = (it) => needsPlayer(it) || needsStaff(it);
export const itemById = (id) => SHOP_ITEMS.find((i) => i.id === id);

/** 구매: 보관함에 한 장 넣는다 */
export function addToInventory(team, it) {
  const items = [...(team.items || []), { key: `${it.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, itemId: it.id }];
  return { ...team, items };
}

/** 효과가 닿는 선수인가 — 타격 아이템은 타자, 투구 아이템은 투수만 (투수는 타석에 서지 않는다) */
export const fitsItem = (it, p) => (it.target === 'pitcher' ? p.type === 'pitcher' : p.type === 'batter');

/** 추천 대상 — 효과가 맞는 쪽(타자/투수)에서 종합이 가장 많이 오르는 순 */
export function recommendTargets(team, it, n = 5) {
  if (!needsPlayer(it)) return [];
  return (team.squad || []).filter((p) => fitsItem(it, p))
    .map((p) => ({ p, gain: overallOf(p.position, { ...p.stats, [it.stat]: Math.min(99, (p.stats?.[it.stat] ?? 70) + it.amount) }) - p.overall }))
    .sort((a, b) => b.gain - a.gain || b.p.overall - a.p.overall).slice(0, n).map((x) => x.p);
}

/** 사용: 보관함에서 한 장 빼고 대상에게 적용한 새 팀 */
export function consumeItem(team, key, target, staffSlot) {
  const entry = (team.items || []).find((x) => x.key === key);
  const it = entry && itemById(entry.itemId);
  if (!it || !target || (needsPlayer(it) && !fitsItem(it, target))) return team;
  const rest = { ...team, items: team.items.filter((x) => x.key !== key) };
  if (needsStaff(it)) return { ...rest, staff: { ...(rest.staff || {}), [staffSlot]: { ...target, cost: 0, contracted: true } } };
  return applyToPlayer(rest, it, target);
}
