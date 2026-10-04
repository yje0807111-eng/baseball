/*
 * 전술 눈금 → 공 하나에 실릴 지시.
 *
 * 정비 화면 전략실(myteam/strategy.js)에서 고른 성향은 지금까지 저장만 되고
 * 경기에는 닿지 않았다. 여기서 그 눈금을 매 공 pitchSim 이 알아듣는 orders 로 옮긴다.
 *
 * 성향이니 매 공 똑같이 내지 않는다 — 눈금이 센 쪽일수록 자주 낸다.
 */
import { penCallsLeft, batterOf, staminaOf } from './pitchSim.js';

/** 눈금 세 단계를 -1 · 0 · +1 로 */
const LEVEL = {
  swing: { 신중: -1, 보통: 0, 과감: 1 },
  take: { 안전: -1, 보통: 0, 과감: 1 },
  hook: { 늦게: -1, 보통: 0, 빠르게: 1 },
  duel: { 회피: -1, 보통: 0, 정면: 1 },
  mix: { 안전: -1, 보통: 0, 공격: 1 },
  guard: { 깊게: -1, 정석: 0, 전진: 1 },
  hold: { 느슨: -1, 보통: 0, 바짝: 1 },
};
export const levelOf = (fine = {}, key) => LEVEL[key]?.[fine[key]] ?? 0;

/** 볼 배합 설계가 공에 실리는 비율 — plan-sim(2026-10-03)과 같은 35% */
export const MIX_SHARE = 0.35;

/*
 * 상황 대응(정비 3단계 · ROADMAP 13) — 정비에서 상황마다 대응을 골라 두면 그 상황에 경기가 알아서(Football Manager 매치 플랜 · OOTP 처럼).
 * flow-sim 4,000경기: 7회 이후 리드면 센 불펜 +3.4(늘) · 지친 선발 교체는 우리 선발이 약하면 +2.1 · 강하면 −1.9 ·
 *  득점권 상대 강타자 유인구 · 거르기는 우리 타선이 약하면 + · 강하면 − · 무사 1루 히트앤런 +0.5.
 * ctx: { stars: 상대 장타 상위 셋 id Set }
 */
export const CONDITIONS = [
  { id: 'close', ko: '7회 이후 1~2점 리드', act: '가장 센 불펜' },
  { id: 'tired', ko: '선발 체력 30 아래 · 주자 있음', act: '교체' },
  { id: 'chase', ko: '득점권 · 상대 강타자', act: '유인구' },
  { id: 'walk', ko: '득점권 · 상대 강타자', act: '거르기' },
  { id: 'hnr', ko: '무사 1루', act: '히트앤런' },
  { id: 'swing', ko: '8회 이후 뒤짐', act: '풀스윙' },
  { id: 'steal', ko: '1루 주자 주력 80+', act: '도루' },
  /* 3단계 '우선' 고르기(2026-10-04, sit-sim) — 상대에 따라 갈린 것만 */
  { id: 'rispPow', ko: '득점권 기회', act: '홈런 우선' }, // 풀스윙 — 상대 선발 구위 약하면 +1.0 · 강하면 −1.6
  { id: 'rispCon', ko: '득점권 기회', act: '안타 우선' }, // 짧은 스윙 — 구위 약하면 −0.2 · 강하면 +1.7
  { id: 'rispPat', ko: '득점권 기회', act: '출루 우선' }, // 신중한 스윙 — 제구 좋으면 −0.8
  { id: 'pitchZone', ko: '경기 운영', act: '맞혀 잡기' }, // 존 안 35% — 상대 파워 낮으면 +1.9 · 높으면 −0.6
  /* 세분화(2026-10-04, sit2-sim): 도루 문턱 85 · 90(위험 다이얼), 맞혀 잡기 '교타자만'(Con · 파워 80 아래) · '초반만'(E · 1~3회) — 둘은 겹쳐 붙음(pitchZoneConE) */
  { id: 'steal85', ko: '1루 주자 주력 85+', act: '도루' }, { id: 'steal90', ko: '1루 주자 주력 90+', act: '도루' },
  { id: 'pitchZoneCon', ko: '경기 운영', act: '맞혀 잡기 · 교타자만' }, { id: 'pitchZoneE', ko: '경기 운영', act: '맞혀 잡기 · 초반만' }, { id: 'pitchZoneConE', ko: '경기 운영', act: '맞혀 잡기 · 교타자만 · 초반만' },
];
const stOf = (p, k, d = 75) => p?.stats?.[k] ?? d;
const armOf = (p) => stOf(p, 'stuff', 80) + stOf(p, 'control', 75);
export function condOrders(g, conds = [], ctx = {}) {
  if (!conds.length) return null;
  const out = {}; // 걸린 대응을 모두 합침(같은 지시는 앞에 고른 것) — 득점권 타격 · 도루처럼 한 타석에 둘이 걸릴 수 있다
  for (const c of conds) { const x = condOne(g, c, ctx); if (x) for (const k of Object.keys(x)) if (!(k in out)) out[k] = x[k]; }
  return Object.keys(out).length ? out : null;
}
function condOne(g, c, ctx) {
  const fresh = !g.balls && !g.strikes, mineBat = !g.top, risp = !g.bases[0] && (g.bases[1] || g.bases[2]);
  const star = ctx.stars ? ctx.stars.has(batterOf(g)?.id) : batterOf(g)?.id === ctx.star;
  {
    if (c === 'close' && !mineBat && fresh && g.inning >= 7) {
      const lead = g.home.runs - g.away.runs;
      if (lead < 1 || lead > 2 || penCallsLeft(g.home) <= 0) return null;
      const pen = g.home.team.pitchers.slice(g.home.pitcherIdx + 1);
      const best = pen.reduce((x, y) => (!x || armOf(y) > armOf(x) ? y : x), null);
      if (best && armOf(best) > armOf(g.home.pitcher)) return { changePitcher: best.id, call: true };
    }
    if (c === 'tired' && !mineBat && fresh && g.home.pitcherIdx === 0 && staminaOf(g.home) < 30 && g.bases.some(Boolean) && g.home.team.pitchers[1]) return { changePitcher: true };
    if (c === 'walk' && !mineBat && fresh && risp && star) return { ibb: true };
    if (c === 'chase' && !mineBat && risp && star && g.rng() < 0.6) return { zone: 'chase' };
    if (c === 'hnr' && mineBat && fresh && g.outs === 0 && g.bases[0] && !g.bases[1]) return { hitAndRun: true };
    if (c === 'swing' && mineBat && g.inning >= 8 && g.home.runs < g.away.runs) return { approach: 'sellout' };
    const stealMin = c === 'steal' ? 80 : c === 'steal85' ? 85 : c === 'steal90' ? 90 : 0;
    if (stealMin && mineBat && fresh && g.bases[0] && !g.bases[1] && stOf(g.bases[0], 'speed') >= stealMin) return { steal: 0 };
    const rispAny = g.bases[1] || g.bases[2];
    if (c === 'rispPow' && mineBat && rispAny) return { approach: 'power' };
    if (c === 'rispCon' && mineBat && rispAny) return { approach: 'contact' };
    if (c === 'rispPat' && mineBat && rispAny) return { patience: 1 };
    if (c.startsWith('pitchZone') && !mineBat) {
      if (c.includes('Con') && stOf(batterOf(g), 'power') >= 80) return null; // 교타자만 — 장타자에겐 존 안으로 안 넣음
      if (c.endsWith('E') && g.inning > 3) return null; // 초반만
      if (g.rng() < 0.35) return { zone: [4, 1, 3, 5, 7][Math.floor(g.rng() * 5)] };
    }
  }
  return null;
}
/** 상대 강타자 — 장타 상위 셋(상황 대응 '유인구 · 거르기'의 대상) */
export const starsOf = (team) => new Set([...(team?.batters || [])].sort((x, y) => stOf(y, 'power') - stOf(x, 'power')).slice(0, 3).map((p) => p.id));
export const starOf = (team) => [...(team?.batters || [])].sort((x, y) => stOf(y, 'power') - stOf(x, 'power'))[0]?.id || null;
/*
 * 필승조(정비 2단계) — 7 · 8 · 9회에 던질 투수를 정해 두면 그 이닝 첫 타석에 그 투수로(아직 안 던졌으면). 감독 호출 수엔 안 셈.
 */
export function lateOrders(g, late) {
  if (!late || !g.top || g.balls || g.strikes || g.inning < 7 || g.inning > 9) return null;
  const id = late[g.inning - 7];
  if (!id || g.home.pitcher?.id === id) return null;
  return g.home.team.pitchers.slice(g.home.pitcherIdx + 1).some((p) => p.id === id) ? { changePitcher: id } : null;
}
/*
 * 이닝별 계획(정비 2단계 '경기 흐름', 2026-10-03) — plan.inn = { atk: [9], limit: { mode, value }, pens: { 회: 투수 id } }
 *  공격: 우리 공격 회(말)마다 'power' 강공 · 'contact' 짧게 · 'patience' 기다리기 · 'base' 보통(성향 그대로)
 *  선발: mode 'inn'(그 회까지) · 'pitch'(투구 수) · 'bf'(상대한 타자 수)에 닿으면 새 타석에서 교체 — 다음 투수는 그 회에 정해 둔 불펜(없으면 순서대로)
 *  불펜: 선발이 내려간 뒤 회마다 정해 둔 투수로(그 회 첫 타석부터, 아직 안 던졌으면). 감독 호출 수엔 안 셈
 *  slots = [[아웃, 투수 id], ...] 가 있으면 회 대신 아웃 단위 — 지금 자리(아웃 = (회−1)×3 + 아웃 수)에 닿은 마지막 투수(8회 1아웃부터 마무리 등)
 */
/*
 * 공격 높이(정비 2단계 그래프) — 0 강공 · 1 보통 · 2 짧게 · 3 기다리기, 칸 사이 값은 타석마다 섞음(2.3 = 짧게 70% · 기다리기 30%)
 *  어느 쪽인지는 타석 번호로 정함(황금비 수열 — 고르게 퍼지고 한 타석 안에선 바뀌지 않음, 경기 난수는 안 씀)
 *  예전 계획(이름)도 그대로 읽음
 */
const ATK_LV = ['power', 'base', 'contact', 'patience'];
export function atkAt(v, u) {
  if (typeof v !== 'number') return v;
  const lo = Math.floor(v + 1e-9), f = v - lo;
  return ATK_LV[Math.min(3, f > 1e-6 && u < f ? lo + 1 : lo)];
}
const slotAt = (slots, g) => { const pos = (Math.min(9, g.inning) - 1) * 3 + (g.outs || 0); let id = null; for (const [from, pid] of slots) if (from <= pos) id = pid; return id; };
const availOf = (side, id) => side.team.pitchers.slice(side.pitcherIdx + 1).some((p) => p.id === id);
export function innOrders(g, inn) {
  if (!inn) return null;
  const out = {};
  if (!g.top && g.inning <= 9) {
    const v = atkAt(inn.atk?.[g.inning - 1], ((g.home.idx || 0) * 0.6180339887 + g.inning * 0.137) % 1);
    if (v === 'power' || v === 'contact') out.approach = v;
    else if (v === 'patience') out.patience = 1;
  }
  if (g.top && !g.balls && !g.strikes) {
    const side = g.home, lim = inn.limit, id = inn.slots ? slotAt(inn.slots, g) : inn.pens?.[Math.min(9, g.inning)];
    if (side.pitcherIdx === 0) {
      const over = lim && (lim.mode === 'inn' ? g.inning > lim.value : lim.mode === 'pitch' ? side.pitches >= lim.value : (side.bf || 0) >= lim.value);
      if (over) out.changePitcher = id && availOf(side, id) ? id : true;
    } else if (id && side.pitcher?.id !== id && availOf(side, id)) out.changePitcher = id;
  }
  return out;
}
/** 정비 설계 한 번에 — 성향(공격 · 선발 운용 · 볼 배합) + 상황 대응 + 필승조(또는 이닝별 계획). 경기 화면 · 미리보기가 같은 셈을 쓴다 */
export function planOrders(g, plan = {}, ctx = {}) {
  const base = tacticOrders(plan.fine || {}, !g.top, g.rng);
  if (plan.inn) { delete base.hookBf; return { ...base, ...(innOrders(g, plan.inn) || {}), ...(condOrders(g, plan.conds || [], ctx) || {}) }; } // 상황 대응이 이닝 계획 위(득점권 타격 · 지친 선발 교체)
  return { ...base, ...(condOrders(g, plan.conds || [], ctx) || {}), ...(lateOrders(g, plan.late) || {}) };
}

/** 투수를 내리는 체력 문턱 — 늦게는 바닥까지, 빠르게는 여유 있을 때 */
export const hookAt = (fine = {}) => [0, 8, 20][levelOf(fine, 'hook') + 1];

/**
 * 이 공에 실을 지시.
 * @param fine   전략실 눈금 { swing, take, hook, duel, mix, guard, hold }
 * @param mineBat 내가 치는 회인가
 * @param rng    0~1
 */
export function tacticOrders(fine = {}, mineBat = true, rng = Math.random) {
  const out = {};
  if (mineBat) {
    /* 공격 — 신중하면 공을 고르고, 과감하면 노리고 들어간다 */
    const swing = levelOf(fine, 'swing');
    if (swing > 0 && rng() < 0.3) out.guess = rng() < 0.55 ? 'fast' : 'slider';
    if (swing < 0) out.patience = 1; // 스윙을 아낀다
    if (fine.appr && rng() < 0.6) out.approach = fine.appr; // 짧게 맞히기(contact) — 삼진 ↓ · 장타 ↓
    const take = levelOf(fine, 'take');
    if (take !== 0) out.dash = take; // 주루를 더 · 덜 본다
  } else {
    /* 마운드 — 승부를 어떻게 걸 것인가 */
    const duel = levelOf(fine, 'duel');
    if (duel > 0 && rng() < 0.15) out.zone = [4, 4, 1, 3, 5, 7][Math.floor(rng() * 6)]; // 정면 · 존 안으로 붙인다(변 · 한가운데 — 볼넷 ↓ 대신 몰린 공도)
    else if (duel < 0 && rng() < 0.05) out.zone = 'chase'; // 유인구로 뺀다 — 장타 ↓ 대신 볼넷 ↑
    const mix = levelOf(fine, 'mix');
    if (mix !== 0 && rng() < 0.3) out.pitchType = mix > 0 ? 'slider' : 'fast';
    /* 수비 — 주자를 얼마나 묶고, 어디에 서나 */
    const hold = levelOf(fine, 'hold');
    if (hold !== 0) out.hold = hold;
    /* 깊게 서면 장타를 막는 대신 앞이 비고, 전진하면 그 반대다. 정석이 기준 */
    const guard = levelOf(fine, 'guard');
    if (guard) out.guard = guard;
    out.hookAt = hookAt(fine); // 내 투수를 언제 내릴지
    if (fine.hookBf) out.hookBf = fine.hookBf; // 선발 두 바퀴 교체
    if (fine.mixFam && rng() < MIX_SHARE) out.mixFam = fine.mixFam; // 볼 배합 — 그 계열 공을 더
  }
  return out;
}
