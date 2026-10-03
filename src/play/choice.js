/*
 * 선택 경기(ROADMAP 11단계 · mockups/choice-game 3안) — 경기는 빠르게 흐르다 결정 약 10번에서 멈춘다.
 * 이 파일은 화면 없이: 어디서 멈출지(wantsChoice) · 무엇을 내밀지(choiceCards) · 고른 것을 타석 계획으로(planOrder).
 * 카드의 숫자는 지어낸 값이 아니라 지금 상태를 그 지시로 n번 굴린 엔진 값(oddsOf) — 화면과 경기가 같은 셈을 쓴다.
 */
import {
  leverage, offenseOf, defenseOf, batterOf, stealOdds, staminaOf, platoonOf, penCallsLeft, pitch, repertoireOf, pitchMix, PITCHES,
} from '../engine/pitchSim.js';
import { seeded } from '../engine/rng.js';
import { winProb } from '../engine/winProb.js';
import { penCostOf } from '../myteam/fatigue.js';

/* 결정은 진짜 승부처 몇 번만(ROADMAP 12, 2026-10-03) — 흐름은 정비 설계가 맡고, 경기 중엔 가장 무거운 순간에만 묻는다. 전엔 10번 */
export const CHOICES = 4; // 한 경기 결정 수(목표)
export const CHOICE_LATE = 2; // 7회 이후 몫 — 6회까지는 CHOICES − CHOICE_LATE 번까지
export const CHOICE_MS = 15000; // 작전 고르기
export const DETAIL_MS = 10000; // 구종 · 코스(펼침)
export const DECIDED = 0.06; // 승률이 이 밖(6% 아래 · 94% 위)이면 기운 경기 — 묻지 않는다
export const CHOICE_MARK = 0.16; // 승부처 무게 문턱(일정보다 앞서면 1.6배 · 뒤처지면 0.6배 · 한 번 넘게 뒤처지면 0.35배)

const st = (p, k, d = 70) => p?.stats?.[k] ?? d;
const pct = (x) => `${Math.round(x * 100)}%`;
/** 'a → b' 칩 — 같으면 빼고(보여 줄 차이가 없다) */
const delta = (ko, a, b, tone) => (Math.round(a * 100) === Math.round(b * 100) ? [] : [[`${ko} ${pct(a)} → ${pct(b)}`, tone]]);
const handKo = (h) => (h === 'L' ? '좌' : h === 'S' ? '양' : '우');

/**
 * 여기서 멈출까 — 새 타석 · 반 이닝에 한 번 · 무게가 문턱 이상. 문턱은 일정(한 반 이닝마다 10/18)보다 앞서면 올리고
 * 뒤처지면 내린다. 6회까지 7번(7회 이후 3번 몫). 9회부터는 남은 몫을 쓰게 문턱을 더 낮춘다.
 * asked: 이미 멈춘 자리 [{ inning, top }]
 */
export function wantsChoice(g, asked = [], max = CHOICES) {
  if (g.final || g.balls || g.strikes || asked.length >= max) return false;
  if (asked.some((a) => a.inning === g.inning && a.top === g.top)) return false;
  if (g.inning <= 6 && asked.length >= max - CHOICE_LATE) return false;
  /* 기운 경기 — 승률 6% 아래 · 94% 위면 고를 것이 승패를 바꾸지 못한다. 10번을 채우려 묻지 않는다(2026-10-02) */
  const wp = winProb(g);
  if (wp < DECIDED || wp > 1 - DECIDED) return false;
  const half = (g.inning - 1) * 2 + (g.top ? 0 : 1);
  const ahead = asked.length - (max * half) / 18;
  const mark = CHOICE_MARK * (ahead > 0.5 ? 1.6 : ahead < -1 ? 0.35 : ahead < -0.5 ? 0.6 : 1) * (g.inning >= 9 ? 0.6 : 1);
  return leverage(g) >= mark;
}

/* 상태 복사 — 굴려 보기용. 팀 배열(대타 · 불펜이 고친다)까지 따로 */
const sideCopy = (s) => ({ ...s, line: [...s.line], mod: { ...s.mod }, team: { ...s.team, batters: [...s.team.batters], pitchers: [...s.team.pitchers], bench: [...(s.team.bench || [])] } });
export const cloneGame = (g, rng) => ({ ...g, rng, home: sideCopy(g.home), away: sideCopy(g.away), bases: [...g.bases], events: [] });

const HIT = new Set(['1B', '2B', '3B', 'HR', 'BH']);
/**
 * 이 타석을 그 지시로 n번 — 결과 비율. 같은 시드라 카드끼리 견줄 수 있다.
 * { hit, hr, k, bb, dp, run(이 타석에 1점 이상), adv(주자가 한 루 이상 나아감) }
 */
export function oddsOf(g, order, n = 200) {
  const o = { hit: 0, hr: 0, k: 0, bb: 0, dp: 0, run: 0, adv: 0 };
  const lead = g.bases.reduce((m, b, i) => (b ? i : m), -1);
  for (let i = 0; i < n; i += 1) {
    const c = cloneGame(g, seeded(9001 + i));
    const top = c.top, side = top ? 'away' : 'home', runs0 = c[side].runs;
    let ev; let guard = 0;
    do { ev = pitch(c, order(c)); } while (ev && !ev.result && guard++ < 40 && c.top === top && !c.final);
    const r = ev?.result;
    if (HIT.has(r)) o.hit += 1;
    if (r === 'HR') o.hr += 1;
    if (r === 'K') o.k += 1;
    if (r === 'BB' || r === 'IBB') o.bb += 1;
    if (r === 'DP') o.dp += 1;
    if (c[side].runs > runs0) o.run += 1;
    if (lead >= 0 && (c[side].runs > runs0 || c.bases.slice(lead + 1).some(Boolean))) o.adv += 1;
  }
  for (const k of Object.keys(o)) o[k] /= n;
  return o;
}

const first = (o) => (gg) => (gg.balls + gg.strikes === 0 ? (typeof o === 'function' ? o(gg) : o) : {});
const batVal = (b, p) => (st(b, 'contact') + st(b, 'power')) / 2 + platoonOf(b, p);
const armVal = (p, b) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2 - platoonOf(b, p);
const WX_HR = { windOut: 1, hot: 1, windIn: -1, cold: -1 };
const wxChip = (g, good) => (g.wx && g.wx.key !== 'clear' ? [[g.wx.ko, good ? 'good' : 'bad']] : []);

/**
 * 카드 — 정비 작전(시간이 다 되면 이것) + 그 자리에서 되는 작전 셋. 상황 작전(대타 · 스퀴즈 · 도루 · 불펜 …) 둘까지,
 * 나머지는 타격 · 투구 접근(노림수 · 밀어치기 · 기다리기 / 정면 승부 · 유인구)을 맞대결에 맞는 순서로 채운다.
 * 카드: { k, ko, sub, order(gg), odds: [이름, 값], chips: [[글, 'good'|'bad'|'info']], cost, detail: 'bat'|'arm'|null, who }
 * ctx: { plan(gg) 정비 작전 지시, planKo, fatigue(내 팀 투수 피로) }
 */
export function choiceCards(g, ctx = {}) {
  const plan = ctx.plan || (() => ({})), off = offenseOf(g), def = defenseOf(g), bat = batterOf(g), pit = def.pitcher;
  const [b1, b2, b3] = g.bases, outs = g.outs;
  const with_ = (o) => (gg) => ({ ...plan(gg), ...(typeof o === 'function' ? o(gg) : o) });
  const base = { k: 'plan', ko: '정비 작전', sub: ctx.planKo || '기본', order: plan, plan: true, chips: [], cost: null, detail: g.top ? null : null };
  const baseOdds = oddsOf(g, plan);
  if (!g.top) {
    base.odds = ['안타', pct(baseOdds.hit)];
    const sit = [];
    /* 대타 — 지금 타자보다 나은(좌우 상성 포함) 벤치만 */
    const ph = (off.team.bench || []).map((p) => [p, batVal(p, pit)]).filter(([, v]) => v > batVal(bat, pit) + 1).sort((a, b) => b[1] - a[1])[0];
    if (ph) {
      const [p] = ph, o = oddsOf(g, with_(first({ pinchHit: p.id })));
      sit.push({ k: 'ph', ko: `대타 ${p.name}`, sub: `${handKo(p.hand)}타 · ${handKo(pit.hand)}투 상대`, order: with_(first({ pinchHit: p.id })), odds: ['안타', pct(o.hit)],
        chips: [[`컨택 ${st(p, 'contact')}`, 'good'], ...(platoonOf(p, pit) > 0 ? [['좌우 상성', 'good']] : [])], cost: `${bat.name} 교체 · 복귀 없음`, detail: 'bat', who: p });
    }
    if (b3 && outs < 2) {
      const o = oddsOf(g, with_(first({ bunt: true })));
      sit.push({ k: 'squeeze', ko: '스퀴즈', sub: '3루 주자 홈', order: with_(first({ bunt: true })), odds: ['득점', pct(o.run)],
        chips: [[`3루 주자 주력 ${st(b3, 'speed')}`, st(b3, 'speed') >= 80 ? 'good' : 'bad'], [`컨택 ${st(bat, 'contact')}`, st(bat, 'contact') >= 80 ? 'good' : 'bad'], ...(g.wx?.key === 'rain' ? wxChip(g, true) : [])], cost: '타자 아웃' });
    }
    const from = b2 && !b3 ? 1 : b1 && !b2 ? 0 : null;
    if (from != null) {
      const runner = g.bases[from], catcher = def.team.catcher || def.team.batters.find((p) => p.position === 'C');
      sit.push({ k: 'steal', ko: '도루', sub: `${from + 1}루 → ${from + 2}루`, order: with_(first({ steal: from })), odds: ['성공', pct(stealOdds(g, from))],
        chips: [[`주력 ${st(runner, 'speed')}`, st(runner, 'speed') >= 85 ? 'good' : 'bad'], [`포수 수비 ${st(catcher, 'defense')}`, st(catcher, 'defense') >= 85 ? 'bad' : 'good'], ...(g.wx?.key === 'rain' ? wxChip(g, true) : [])], cost: '실패 시 주자 아웃' });
    }
    if ((b1 || b2) && !b3 && outs < 2) {
      const o = oddsOf(g, with_(first({ bunt: true })));
      sit.push({ k: 'sac', ko: '희생번트', sub: '주자 한 루씩', order: with_(first({ bunt: true })), odds: ['진루', pct(o.adv)], chips: [[`컨택 ${st(bat, 'contact')}`, st(bat, 'contact') >= 80 ? 'good' : 'bad']], cost: '타자 아웃' });
    }
    if (b1 && outs < 2) {
      const o = oddsOf(g, with_(first({ hitAndRun: true })));
      sit.push({ k: 'hnr', ko: '히트앤런', sub: '주자 출발 · 스윙', order: with_(first({ hitAndRun: true })), odds: ['병살', pct(o.dp)], chips: delta('병살', baseOdds.dp, o.dp, 'good'), cost: '헛스윙 시 주자 위험' });
    }
    const pe = st(bat, 'power') - st(pit, 'stuff', 80), ce = st(bat, 'contact') - 80, cl = st(pit, 'control', 75) - 80, tired = staminaOf(def) < 40;
    const appr = [
      { score: pe + (WX_HR[g.wx?.key] || 0) * 6, mk: () => { const o = oddsOf(g, with_({ approach: 'sellout' })); return { k: 'sellout', ko: '노림수', sub: '한 방', order: with_({ approach: 'sellout' }), odds: ['홈런', pct(o.hr)], chips: [[`파워 ${st(bat, 'power')}`, pe >= 0 ? 'good' : 'bad'], [`구위 ${st(pit, 'stuff', 80)}`, pe >= 0 ? 'good' : 'bad'], ...(WX_HR[g.wx?.key] ? wxChip(g, WX_HR[g.wx.key] > 0) : [])], cost: `삼진 ${pct(o.k)}`, detail: 'bat' }; } },
      { score: ce, mk: () => { const o = oddsOf(g, with_({ approach: 'contact' })); return { k: 'contact', ko: '밀어치기', sub: '맞히기', order: with_({ approach: 'contact' }), odds: ['안타', pct(o.hit)], chips: [[`컨택 ${st(bat, 'contact')}`, ce >= 0 ? 'good' : 'bad'], ...delta('삼진', baseOdds.k, o.k, 'info')], cost: '장타 ↓', detail: 'bat' }; } },
      { score: -cl + (tired ? 10 : 0), mk: () => { const o = oddsOf(g, with_({ patience: true })); return { k: 'wait', ko: '기다리기', sub: '공 고르기', order: with_({ patience: true }), odds: ['볼넷', pct(o.bb)], chips: [[`제구 ${st(pit, 'control', 75)}`, cl <= 0 ? 'good' : 'bad'], ...(tired ? [[`투수 체력 ${Math.round(staminaOf(def))}`, 'good']] : [])], cost: '루킹 삼진 ↑' }; } },
    ].sort((a, b) => b.score - a.score);
    const picks = sit.slice(0, 2);
    for (const a of appr) { if (picks.length >= 3) break; picks.push(a.mk()); }
    return [base, ...picks];
  }
  /* 우리 수비 */
  base.odds = ['피안타', pct(baseOdds.hit)];
  const sit = [];
  const calls = penCallsLeft(def);
  if (calls > 0 && (g.inning >= 6 || staminaOf(def) < 50)) {
    const pen = def.team.pitchers.slice(def.pitcherIdx + 1).map((p) => [p, armVal(p, bat)]).sort((a, b) => b[1] - a[1]).slice(0, 2);
    for (const [p] of pen) {
      const order = with_(first({ changePitcher: p.id, call: true })), o = oddsOf(g, order);
      sit.push({ k: `pen-${p.id}`, ko: `불펜 ${p.name}`, sub: `${handKo(p.hand)}투 · ${handKo(bat.hand)}타 상대`, order, odds: ['피안타', pct(o.hit)],
        chips: [[`구위 ${st(p, 'stuff', 80)}`, st(p, 'stuff', 80) >= st(pit, 'stuff', 80) ? 'good' : 'bad'], [`지금 투수 체력 ${Math.round(staminaOf(def))}`, staminaOf(def) < 40 ? 'good' : 'info'],
          ...(platoonOf(bat, p) < 0 ? [['좌우 상성', 'good']] : [])],
        cost: `호출 ${calls}/2 · 내일 컨디션 ${penCostOf(p.id, ctx.fatigue)}`, who: p, arm: true });
    }
  }
  if ((b2 || b3) && !b1) {
    const nb = off.team.batters[(off.idx + 1) % off.team.batters.length];
    sit.push({ k: 'ibb', ko: '고의사구', sub: `다음 ${nb?.name || ''}`, order: with_(first({ ibb: true })), odds: ['다음 타자', `${nb?.overall ?? '-'}`],
      chips: [[`${bat.name} ${bat.overall}`, 'info'], [`${nb?.name || ''} ${nb?.overall ?? ''}`, (nb?.overall ?? 99) < bat.overall ? 'good' : 'bad']], cost: '주자 하나 더' });
  }
  if (b3 && outs < 2) {
    const o = oddsOf(g, with_({ guard: 1 }));
    sit.push({ k: 'infield', ko: '전진 수비', sub: '3루 주자 묶기', order: with_({ guard: 1 }), odds: ['실점', pct(o.run)], chips: [[`3루 주자 주력 ${st(b3, 'speed')}`, 'info'], ...delta('실점', baseOdds.run, o.run, 'good')], cost: '빠진 타구 멀리' });
  }
  const ct = st(bat, 'contact'), po = st(bat, 'power');
  const zoneOrder = (gg) => (gg.rng() < 0.5 ? { zone: [4, 1, 3, 5, 7][Math.floor(gg.rng() * 5)] } : {});
  const chaseOrder = (gg) => (gg.rng() < 0.45 ? { zone: 'chase' } : {});
  const appr = [
    { score: 80 - ct, mk: () => { const o = oddsOf(g, with_(chaseOrder)); return { k: 'chase', ko: '유인구', sub: '빼는 공', order: with_(chaseOrder), odds: ['볼넷', pct(o.bb)], chips: [[`컨택 ${ct}`, ct < 80 ? 'good' : 'bad'], ...delta('피안타', baseOdds.hit, o.hit, 'info')], cost: '볼넷 ↑', detail: 'arm' }; } },
    { score: 85 - po, mk: () => { const o = oddsOf(g, with_(zoneOrder)); return { k: 'attack', ko: '정면 승부', sub: '존 안으로', order: with_(zoneOrder), odds: ['볼넷', pct(o.bb)], chips: [[`파워 ${po}`, po < 85 ? 'good' : 'bad'], [`제구 ${st(pit, 'control', 75)}`, st(pit, 'control', 75) >= 80 ? 'good' : 'bad']], cost: `피안타 ${pct(o.hit)}`, detail: 'arm' }; } },
  ].sort((a, b) => b.score - a.score);
  const picks = sit.slice(0, 2);
  for (const a of appr) { if (picks.length >= 3) break; picks.push(a.mk()); }
  return [base, ...picks];
}

/** 펼침에 내밀 구종 — 공격: 상대 투수 구종(던지는 비율), 수비: 우리 투수 구종 */
export const pitchesFor = (g) => { const p = defenseOf(g).pitcher, mix = pitchMix(p); return repertoireOf(p).map((t) => ({ t, ko: PITCHES[t].name, pct: Math.round((mix[t] || 0) * 100) })).sort((a, b) => b.pct - a.pct); };

/**
 * 타석 계획 — 카드 지시 + 펼침에서 고른 구종 · 코스를 공마다 알맞게(ROADMAP 11 '세부 선택은 타석 계획').
 *  공격: 노림(구종 · 코스)은 타자에게 유리한 카운트(볼 ≥ 스트라이크, 2S 아님)에만 · 2스트라이크면 맞히기
 *  수비: 고른 구종은 결정구 — 2스트라이크엔 반드시(코스까지), 그 전엔 반쯤
 */
export function planOrder(card, detail = null) {
  if (!detail) return card.order;
  return (gg) => {
    const o = card.order(gg);
    if (card.detail === 'bat') {
      if (gg.strikes === 2) return o.approach === 'sellout' ? o : { ...o, approach: 'contact' };
      if (gg.balls >= gg.strikes) return { ...o, ...(detail.t ? { guess: detail.t } : {}), ...(detail.zone != null ? { aim: detail.zone } : {}) };
      return o;
    }
    if (gg.strikes === 2) return { ...o, ...(detail.t ? { pitchType: detail.t } : {}), ...(detail.zone != null ? { zone: detail.zone, exact: true } : {}) };
    return gg.rng() < 0.5 ? { ...o, ...(detail.t ? { pitchType: detail.t } : {}) } : o;
  };
}
