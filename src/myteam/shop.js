/*
 * 상점 — 재화는 골드 하나.
 *  훈련: 선수 능력치 영구 상승 (CP 영입가는 그대로 → 돈으로 가성비를 산다)
 *  준비 카드: 사 두면 team.cards 에 쌓이고, 경기 전 정비에서 한 장 골라 그 경기에만 쓴다(타선 미팅 · 마운드 미팅 · 불펜 데이)
 *   — 옛 부스트(team.boosts, 다음 N경기)는 남은 수명만큼 계속 먹는다. 새로 사는 길은 없다
 *   — 재활 트레이너는 운영 쪽 — 투수진 피로(team.pitchFatigue)를 바로 지운다
 *  운영: 샐러리 캡 확장 등 팀 단위
 *  감독 계약: 감독을 CP 없이 선임
 */
import { overallOf } from '../data/ratings.js';
import { EXTRA_SLOT_MAX, EXTRA_FOREIGN_MAX } from './rules.js';
import { PRESET_EXTRA_MAX } from './presets.js';

export const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'training', label: '훈련' },
  { key: 'boost', label: '준비 카드' },
  { key: 'ops', label: '운영' },
  { key: 'staff', label: '감독' },
  { key: 'aug', label: '증강' },
  { key: 'draft', label: '드래프트' },
];

const item = (id, cat, name, desc, price, opt) => ({ id, cat, name, desc, price, ...opt });

export const SHOP_ITEMS = [
  // 드래프트 (판을 흔드는 권 — 계정에 쌓아 두고 그 판에서 쓴다)
  item('dr-reroll', 'draft', '스카우트 리포트', '드래프트 새로고침 +3회 · 판에서 쓴다', 220, { draftTicket: 'reroll', img: 'mt-pack' }),
  item('dr-series', 'draft', '시리즈 지정권', '다음 보드에 열릴 시리즈를 내가 고른다', 480, { draftTicket: 'series', img: 'mt-pack' }),
  // 훈련 (영구)
  item('tr-contact', 'training', '타격 특훈', '타자 1명 컨택 +3 · 영구', 300, { target: 'batter', stat: 'contact', amount: 3, img: 'mt-boost' }),
  item('tr-power', 'training', '파워 훈련', '타자 1명 파워 +3 · 영구', 320, { target: 'batter', stat: 'power', amount: 3, img: 'mt-boost' }),
  item('tr-speed', 'training', '주루 훈련', '타자 1명 주루 +4 · 영구', 240, { target: 'batter', stat: 'speed', amount: 4, img: 'mt-boost' }),
  item('tr-control', 'training', '제구 교정', '투수 1명 제구 +3 · 영구', 300, { target: 'pitcher', stat: 'control', amount: 3, img: 'mt-boost' }),
  item('tr-stuff', 'training', '구위 강화', '투수 1명 구위 +3 · 영구', 340, { target: 'pitcher', stat: 'stuff', amount: 3, img: 'mt-boost' }),
  // 준비 카드 (경기 전 정비에서 한 장 · 그 경기만)
  item('bo-meeting', 'boost', '타선 미팅', '타자 전원 컨택 +3 · 경기 전 한 장', 380, { card: true, teamBoost: 'batter', stat: 'contact', amount: 3, img: 'mt-boost' }),
  item('bo-mound', 'boost', '마운드 미팅', '투수 전원 제구 +3 · 경기 전 한 장', 400, { card: true, teamBoost: 'pitcher', stat: 'control', amount: 3, img: 'mt-boost' }),
  item('bo-bullpen', 'boost', '불펜 데이', '불펜 투수 전원 체력 +20 · 경기 전 한 장', 320, { card: true, teamBoost: 'rp', stat: 'stamina', amount: 20, img: 'mt-boost' }),
  item('bo-medic', 'ops', '재활 트레이너', '투수진에 쌓인 피로를 모두 지운다', 350, { medic: true, img: 'mt-boost' }),
  // 운영
  item('op-bench', 'ops', '벤치 확장', '엔트리 자리 +1 · 영구 (최대 2번)', 1200, { expand: 'slot', img: 'mt-pack' }),
  item('op-foreign', 'ops', '외국인 쿼터 +1', '외국인 한도 3 → 4명 · 영구 (한 번만)', 1600, { expand: 'foreign', img: 'mt-pack' }),
  item('op-preset', 'ops', '프리셋 칸 +1', '엔트리 조합 저장 칸 +1 · 영구 (최대 2번)', 600, { expand: 'preset', img: 'mt-pack' }),
  item('op-cap40', 'ops', 'CP 확장 +40', '샐러리 캡 한도 +40 · 영구', 800, { cap: 40, img: 'mt-pack' }),
  item('op-cap100', 'ops', 'CP 확장 +100', '샐러리 캡 한도 +100 · 영구', 1800, { cap: 100, img: 'mt-pack' }),
  // 감독 계약 (CP 없이 선임)
  item('st-manager', 'staff', '감독 계약서', '감독 1명을 CP 없이 선임', 520, { staffRole: 'manager', img: 'mt-card' }),
  // 증강 (풀 관리)
  item('au-reroll', 'aug', '증강 리롤권', '경기 중 증강 선택지를 다시 굴린다', 260, { augShop: 'reroll', img: 'mt-pack' }),
  item('au-upgrade3', 'aug', '증강 강화권 3장 묶음', '강화권 3장 · 낱장보다 싸다', 1600, { augTicket: 'upgradeTickets', bulk: 3, img: 'mt-boost' }),
  item('au-upgrade', 'aug', '증강 강화권', '증강 강화에 쓰는 권 1장', 600, { augTicket: 'upgradeTickets', img: 'mt-boost' }),
  item('st-coach', 'staff', '코치 계약서', '코치 1명을 CP 없이 선임', 340, { staffRole: 'coach', img: 'mt-card' }),
  item('st-upgrade', 'staff', '코치 강화권', '감독 · 코치 1명 레벨 +1 (내 라커에서 사용 · 최대 Lv.5)', 450, { staffTicket: true, img: 'mt-boost' }),
];

/** 상품 그림 (public/ui/shop/<상품 id>.webp — scripts/shop-art.mjs 로 만든다. 장면은 상품마다, 빛 색은 분류마다) */
export const itemArt = (it) => `ui/shop/${it.id}.webp`;

/* ───── 드래프트 권: 사 두면 계정에 쌓이고, 드래프트 판에서 한 장씩 쓴다 ───── */
export const DRAFT_TICKETS = ['reroll', 'series'];
export const DRAFT_TICKET_KO = { reroll: '스카우트 리포트', series: '시리즈 지정권' };
export const DRAFT_TICKET_TIP = { reroll: '새로고침 +3회', series: '다음 보드 고르기' };
/* ───── 증강 권: 경기에서 쓰는 리롤 ───── */
export const AUG_SHOP_TICKETS = ['reroll'];
export const AUG_TICKET_KO = { reroll: '증강 리롤권' };
export const emptyAugTickets = () => Object.fromEntries(AUG_SHOP_TICKETS.map((k) => [k, 0]));
export const withAugTickets = (t) => ({ ...emptyAugTickets(), ...(t || {}) });
export const addAugTicket = (t, key, n = 1) => { const d = withAugTickets(t); return { ...d, [key]: Math.max(0, d[key] + n) }; };

export const emptyDraftTickets = () => Object.fromEntries(DRAFT_TICKETS.map((k) => [k, 0]));
/** 계정에 저장된 권 수 (없는 칸은 0) */
export const withDraftTickets = (t) => ({ ...emptyDraftTickets(), ...(t || {}) });
/** 한 장 넣기 · 한 장 쓰기 — 둘 다 새 객체를 돌려준다 */
export const addDraftTicket = (t, key, n = 1) => { const d = withDraftTickets(t); return { ...d, [key]: Math.max(0, d[key] + n) }; };
export const useDraftTicket = (t, key) => { const d = withDraftTickets(t); return d[key] > 0 ? { ...d, [key]: d[key] - 1 } : null; };

/** 상품이 올려 주는 값 — [이름, 오르는 값, 같은 종류 최대치(게이지 기준)] */
export function itemEffect(it) {
  if (it.stat) return { label: STAT_KO[it.stat] || it.stat, amount: it.amount, max: it.stat === 'stamina' ? 15 : 6 };
  if (it.cap) return { label: '샐러리 캡', amount: it.cap, max: 100 };
  if (it.staffRole) return { label: it.staffRole === 'manager' ? '감독 선임' : '코치 선임', amount: null, max: 1 };
  if (it.staffTicket) return { label: '코치 레벨', amount: 1, max: 1 };
  if (it.augTicket) return { label: '증강 강화', amount: it.bulk || 1, max: it.bulk || 1 };
  if (it.draftTicket) return { label: DRAFT_TICKET_KO[it.draftTicket] || '드래프트', amount: 1, max: 1 };
  if (it.augShop) return { label: AUG_TICKET_KO[it.augShop] || '증강', amount: 1, max: 1 };
  if (it.teamBoost) return { label: TEAM_BOOST_KO[it.teamBoost] || '팀', amount: it.amount, max: 20 };
  if (it.medic) return { label: '피로 회복', amount: null, max: 1 };
  if (it.expand) return { label: EXPAND_KO[it.expand] || '확장', amount: 1, max: 1 };
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

/* ───── 경기 운영: 팀 단위 부스트 · 피로 회복 ───── */
export const TEAM_BOOST_KO = { rp: '불펜 투수', batter: '타자 전원', pitcher: '투수 전원' };
/** 이 상품이 닿는 선수들 */
export const teamBoostTargets = (squad = [], key) => squad.filter((p) => (key === 'rp' ? p.position === 'RP' : key === 'pitcher' ? p.type === 'pitcher' : p.type === 'batter'));
/* ───── 준비 카드: 사면 쌓이고(team.cards), 정비에서 한 장 골라 그 경기 로스터에만 얹는다 ───── */
export const CARD_ITEMS = SHOP_ITEMS.filter((it) => it.card);
/** 한 장 넣기 */
export const addCard = (team, it) => ({ ...team, cards: { ...(team.cards || {}), [it.id]: (team.cards?.[it.id] || 0) + 1 } });
/** 가진 장 수 */
export const cardCount = (team, id) => team?.cards?.[id] || 0;
/** 한 장 쓰기 — 없으면 null */
export function spendCard(team, id) {
  const n = cardCount(team, id);
  if (!n) return null;
  return { ...team, cards: { ...team.cards, [id]: n - 1 } };
}
/** 정비를 마친 로스터에 카드 효과를 얹는다 (그 경기만 — 저장되는 선수 능력치는 그대로) */
export function applyCard(roster = [], it) {
  if (!it?.card) return roster;
  const hit = new Set(teamBoostTargets(roster, it.teamBoost).map((p) => p.id));
  return roster.map((p) => {
    if (!hit.has(p.id)) return p;
    const stats = { ...p.stats, [it.stat]: Math.min(110, (p.stats?.[it.stat] ?? 78) + it.amount) };
    return { ...p, stats, overall: overallOf(p.position, stats), boosted: true };
  });
}

/** 투수진 피로를 지운다 */
export const clearFatigue = (team) => ({ ...team, pitchFatigue: {} });
/** 지금 쉬고 있는(피로가 남은) 투수 수 */
export const tiredCount = (team) => Object.values(team?.pitchFatigue || {}).filter((f) => (f?.rest || 0) > 0).length;

/* ───── 팀 틀 확장: 엔트리 한 자리 · 외국인 한 명 (영구, 횟수 제한) ───── */
export const EXPAND_KEY = { slot: 'extraSlots', foreign: 'extraForeign', preset: 'presetSlots' };
export const EXPAND_MAX = { slot: EXTRA_SLOT_MAX, foreign: EXTRA_FOREIGN_MAX, preset: PRESET_EXTRA_MAX };
export const EXPAND_KO = { slot: '엔트리 자리', foreign: '외국인 한도', preset: '프리셋 칸' };
/** 몇 번 더 살 수 있나 */
export const expandLeft = (team, kind) => Math.max(0, EXPAND_MAX[kind] - (team?.[EXPAND_KEY[kind]] || 0));
/** 한 번 넓힌 팀 — 한도를 넘으면 그대로 */
export function expandTeam(team, kind) {
  if (!EXPAND_KEY[kind] || expandLeft(team, kind) < 1) return team;
  const key = EXPAND_KEY[kind];
  return { ...team, [key]: (team[key] || 0) + 1 };
}

export const needsPlayer = (it) => !!it.target;
export const needsStaff = (it) => !!it.staffRole;

/** 훈련·부스트를 선수에게 적용한 새 팀을 돌려준다 */
export function applyToPlayer(team, it, player) {
  if (it.cat === 'training') {
    const squad = (team.squad || []).map((p) => {
      if (p.id !== player.id) return p;
      const stats = { ...p.stats, [it.stat]: Math.min(110, (p.stats?.[it.stat] ?? 78) + it.amount) };
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
    for (const b of mine) stats[b.stat] = Math.min(110, (stats[b.stat] ?? 78) + b.amount);
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
export const fitsItem = (it, p) => (!it || !p ? false : it.target === 'pitcher' ? p.type === 'pitcher' : p.type === 'batter');

/** 추천 대상 — 효과가 맞는 쪽(타자/투수)에서 종합이 가장 많이 오르는 순 */
export function recommendTargets(team, it, n = 5) {
  if (!needsPlayer(it)) return [];
  return (team.squad || []).filter((p) => fitsItem(it, p))
    .map((p) => ({ p, gain: overallOf(p.position, { ...p.stats, [it.stat]: Math.min(110, (p.stats?.[it.stat] ?? 78) + it.amount) }) - p.overall }))
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
