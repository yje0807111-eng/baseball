/*
 * 기록실에 남기는 경기 상세 — 경기 끝(buildResult)에서 추려 history 한 줄에 붙인다.
 * 50경기를 로컬에 쌓으니 이름 · 숫자만 짧게: 라인 스코어 · 타순과 타격 · 등판 투수 · 시너지 · 작전 · 아이템 · 승률 흐름 · 지시 · 득점 장면
 */
import { itemById } from './shop.js';

const BENCH = /^BN/;
const avgOvr = (team) => {
  const on = (team?.roster || []).filter((p) => !BENCH.test(String(p.slot || '')) && !p.isReplacement);
  return on.length ? Math.round(on.reduce((s, p) => s + (p.overall || 0), 0) / on.length) : null;
};
/** 승률 곡선을 n 점 이하로 줄이고 소수 둘째 자리까지 */
export function thinFlow(flow, n = 48) {
  if (!Array.isArray(flow) || !flow.length) return null;
  const m = Math.min(n, flow.length);
  const out = m < 2 ? [flow[0]] : Array.from({ length: m }, (_, j) => flow[Math.round((j * (flow.length - 1)) / (m - 1))]);
  return out.map((v) => Math.round(v * 100) / 100);
}
/** 걸려 있던 상점 부스트 — 같은 상품은 하나로 묶는다 */
function boostsOf(boosts = []) {
  const by = new Map();
  for (const b of boosts) {
    if (!(b.gamesLeft > 0)) continue;
    const it = itemById(b.itemId);
    const k = b.itemId;
    const cur = by.get(k) || { id: k, name: it?.name || b.itemId, who: [] };
    cur.who.push(b.playerName);
    by.set(k, cur);
  }
  return [...by.values()].map((b) => ({ id: b.id, name: b.name, who: b.who.length > 1 ? `${b.who.length}명` : b.who[0] }));
}

export function gameDetail(res, my, opp, boosts = []) {
  const box = res.box || { bat: {}, arm: {} };
  const byId = new Map((my?.roster || []).map((p) => [p.id, p]));
  const lineup = (my?.batters || []).slice(0, 9).map((p) => ({
    id: p.id, name: p.name, pos: p.slot && !BENCH.test(p.slot) && !/^OF/.test(p.slot) ? p.slot : p.position, ovr: p.overall, form: p.form || null,
    ...(box.bat[p.id] || { ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0 }),
  }));
  const arms = Object.entries(box.arm).sort((a, b) => a[1].at - b[1].at).map(([id, s]) => {
    const p = byId.get(id);
    return { id, name: p?.name || id, ovr: p?.overall ?? null, form: p?.form || null, sp: id === res.starterId, pc: res.pitchCounts?.[id] || 0, bf: s.bf, h: s.h, k: s.k, r: s.r };
  });
  return {
    v: 1,
    board: res.line || { my: res.board?.home || [], opp: res.board?.away || [] }, // 연장이면 9회를 넘는다
    hits: res.hits || null,
    ovr: { my: avgOvr(my), opp: avgOvr(opp) },
    lineup,
    arms,
    synergies: (my?.synergies || []).filter((s) => s.active).sort((a, b) => b.level - a.level)
      .map((s) => ({ id: s.id, name: s.name, level: s.level, tiers: s.tiers.length })),
    sides: res.sides || null,
    boosts: boostsOf(boosts),
    augs: (res.augs || []).map((a) => ({ id: a.id, name: a.name })),
    flow: thinFlow(res.flow),
    gain: res.gain || 0,
    calls: (res.calls || []).slice(0, 3).map((c) => ({ inning: c.inning, top: !!c.top, ko: c.ko, delta: Math.round(c.delta * 100) / 100 })),
    plays: (res.logs || []).filter((l) => l.kind === 'score').slice(0, 10).map((l) => ({ inning: l.inning, top: !!l.isTop, text: l.text, runs: l.runs })),
  };
}
