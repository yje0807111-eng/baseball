/*
 * 스페셜 모드 — 다른 구단 없이 나 혼자, 캡도 없이 원하는 선수를 채운다.
 * 상대는 사람이 없을 때 AI 가 대신 꾸리는데, **내가 뽑은 것과 같은 방식**으로 뽑는다:
 * 라운드마다 시리즈 하나가 열리고 그 안에서 한 명씩 — 스무 라운드로 엔트리를 채운다.
 * (내 판과 다른 점은 새로고침을 쓰지 않는다는 것뿐)
 */
import { ROSTER_SIZE, SLOTS, FOREIGN_LIMIT, personKey, freeSlot } from '../KboAugmentDraft.jsx';

/** 캡 없음 — 화면과 규칙이 같은 값을 본다 */
export const NO_CAP = Infinity;
export const isNoCap = (cap) => !Number.isFinite(cap);

const shuffle = (a, rng) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** 아직 못 채운 자리의 포지션 (앞에서부터) */
const openSlots = (roster) => {
  const used = new Set(roster.map((p) => p.slot).filter(Boolean));
  return SLOTS.filter((s) => !used.has(s.id));
};

/**
 * 상대 팀 하나 — 시리즈를 스무 번 굴려 자리를 채운다.
 *  · 한 시리즈에서 한 명만 (내가 라운드마다 한 명 뽑는 것과 같다)
 *  · 아직 빈 자리를 먼저 채우고, 그중 종합이 높은 쪽을 고른다
 *  · 같은 사람 · 외국인 세 명 제한은 내 판과 같은 규칙
 */
export function specialAiRoster({ series = [], rng = Math.random } = {}) {
  const roster = [];
  const ids = new Set();
  const persons = new Set();
  let foreign = 0;
  const pool = series.filter((s) => s.players?.length);
  if (!pool.length) return roster;

  let bag = shuffle(pool, rng);
  for (let round = 0; round < ROSTER_SIZE && roster.length < ROSTER_SIZE; round++) {
    if (!bag.length) bag = shuffle(pool, rng);      // 시리즈를 다 돌면 다시 섞어 이어 간다
    const s = bag.pop();
    const open = openSlots(roster);
    const wanted = new Set(open.filter((x) => x.pos).map((x) => x.pos));
    const can = s.players.filter((p) => !ids.has(p.id) && !persons.has(personKey(p)) && !(p.isForeign && foreign >= FOREIGN_LIMIT));
    if (!can.length) continue;
    // 빈 자리를 채우는 선수를 먼저, 없으면 아무나 — 그중 종합이 가장 높은 쪽
    const need = can.filter((p) => wanted.has(p.position));
    const from = need.length ? need : can;
    const pick = from.reduce((m, p) => (p.overall > m.overall ? p : m), from[0]);
    ids.add(pick.id);
    persons.add(personKey(pick));
    if (pick.isForeign) foreign += 1;
    roster.push({ ...pick, slot: freeSlot(roster, pick.position)?.id || null });
  }
  return roster;
}

/** 이 팀이 어느 시즌 · 구단에서 왔는지 (상대 이름에 쓴다) */
export function rosterOrigin(roster = []) {
  const count = new Map();
  roster.forEach((p) => { const k = `${p.year} ${p.team}`; count.set(k, (count.get(k) || 0) + 1); });
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : '올스타';
}

/** 주전 자리가 얼마나 찼는지 — 팀이 제대로 꾸려졌는지 보는 데 쓴다 */
export const filledStarters = (roster = []) => {
  const used = new Set(roster.map((p) => p.slot).filter(Boolean));
  return SLOTS.filter((s) => !s.bench && used.has(s.id)).length;
};
