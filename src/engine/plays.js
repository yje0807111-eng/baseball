/*
 * 승부처에 내놓을 선택지.
 *
 * 늘 같은 버튼 다섯 개가 아니라, 그 자리에서만 말이 되는 세 장을 고른다.
 * 각 장에는 "고르면 승률이 어디로 가는지"를 붙인다 — 갈래마다 잘 됐을 때와
 * 어긋났을 때의 자리를 세우고 winProb 로 재서 확률로 섞는다.
 */
import { winProb } from './winProb.js';
import { stealOdds } from './pitchSim.js';

/** 그 자리의 승률 — 아웃이 셋이면 다음 반 이닝으로 넘겨서 잰다 */
function wpAt(g, { bases = g.bases, outs = g.outs, add = 0 } = {}) {
  const home = { runs: g.home.runs + (g.top ? 0 : add) };
  const away = { runs: g.away.runs + (g.top ? add : 0) };
  if (outs >= 3) {
    const top = !g.top;
    return winProb({ inning: g.top ? g.inning : g.inning + 1, top, outs: 0, bases: [null, null, null], home, away, final: false });
  }
  return winProb({ inning: g.inning, top: g.top, outs, bases, home, away, final: false });
}
const put = (bases, spots) => { const b = [null, null, null]; spots.forEach((i) => { b[i] = bases[i] || { id: `r${i}` }; }); return b; };

/** 잘 됐을 때 · 어긋났을 때를 확률로 섞은 승률 */
const mix = (p, good, bad) => p * good + (1 - p) * bad;

/**
 * 이 자리에서 내놓을 선택지 세 장.
 * 돌려주는 것: { key, icon, title, note, order, wp } — order 는 pitchSim 에 넘길 지시
 */
export function playsFor(g, { mine, tired = 0 } = {}) {
  const [on1, on2, on3] = g.bases.map((b) => !!b);
  const outs = g.outs;
  const now = winProb(g);
  const out = [];
  const card = (key, icon, title, note, order, wp) => out.push({ key, icon, title, note, order, wp });

  if (mine) {
    /* ── 우리 공격 ── */
    if (on3 && outs < 2) {
      const ok = wpAt(g, { bases: put(g.bases, [on1 ? 0 : -1].filter((i) => i >= 0)), outs: outs + 1, add: 1 });
      card('squeeze', '🎯', '스퀴즈', '3루 주자를 밀어 넣는다', { bunt: true }, mix(0.62, ok, wpAt(g, { outs: outs + 1 })));
      card('deep', '💪', '강공', '큰 것 한 방을 노린다', {}, now);
      card('guessF', '🔥', '직구 노림', '맞히면 주자가 돈다', { guess: 'fast' }, now);
    } else if (on1 && !on2 && outs < 2) {
      const sp = stealOdds(g, 0);
      card('steal', '🏃', '도루', `성공 ${Math.round(sp * 100)}% · 득점권으로`, { steal: 0 },
        mix(sp, wpAt(g, { bases: put(g.bases, [1]) }), wpAt(g, { bases: [null, null, null], outs: outs + 1 })));
      card('hnr', '↗️', '히트앤런', '병살을 피하고 한 루 더', { hitAndRun: true },
        mix(0.38, wpAt(g, { bases: put(g.bases, [0, 1]) }), wpAt(g, { bases: [null, null, null], outs: outs + 1 })));
      card('bunt', '🥎', '번트', '하나 죽고 득점권으로', { bunt: true },
        mix(0.74, wpAt(g, { bases: put(g.bases, [1]), outs: outs + 1 }), wpAt(g, { outs: outs + 1 })));
    } else if ((on1 || on2) && outs < 2) {
      card('bunt', '🥎', '번트', '주자를 한 루씩 민다', { bunt: true },
        mix(0.72, wpAt(g, { bases: put(g.bases, [on1 ? 1 : 2, on2 ? 2 : -1].filter((i) => i >= 0)), outs: outs + 1 }), wpAt(g, { outs: outs + 1 })));
      card('deep', '💪', '강공', '터지면 한 번에 뒤집는다', {}, now);
      card('guessS', '🌀', '변화구 노림', '떨어지는 공을 기다린다', { guess: 'slider' }, now);
    } else {
      card('guessF', '🔥', '직구 노림', '빠른 공 하나만 본다', { guess: 'fast' }, now);
      card('guessS', '🌀', '변화구 노림', '변화구 하나만 본다', { guess: 'slider' }, now);
      if (on1 && !on2) {
        const sp = stealOdds(g, 0);
        card('steal', '🏃', '도루', `성공 ${Math.round(sp * 100)}%`, { steal: 0 },
          mix(sp, wpAt(g, { bases: put(g.bases, [1]) }), wpAt(g, { bases: [null, null, null], outs: outs + 1 })));
      } else card('deep', '💪', '강공', '맡기고 지켜본다', {}, now);
    }
  } else {
    /* ── 우리 수비 ── */
    const base1Free = !on1 && (on2 || on3);
    if (base1Free && outs < 2) {
      card('ibb', '🚶', '고의사구', '1루 채우고 병살을 노린다', { ibb: true },
        wpAt(g, { bases: put(g.bases, [0, on2 ? 1 : -1, on3 ? 2 : -1].filter((i) => i >= 0)) }));
      card('duel', '🎯', '몸쪽 승부', '삼진으로 끊는다', { zone: 0 }, mix(0.34, wpAt(g, { outs: outs + 1 }), now));
      card('chase', '🧊', '유인구', '볼넷을 각오하고 피한다', { zone: 'chase' }, now);
    } else if (tired > 0.5) {
      card('swap', '🔁', '투수 교체', '지친 팔을 내린다', { changePitcher: true }, Math.min(0.99, now + 0.04));
      card('hold', '🧊', '유인구로 버틴다', '한 타자만 더', { zone: 'chase' }, now - 0.01);
      card('duel', '🎯', '몸쪽 승부', '정면으로 간다', { zone: 0 }, mix(0.3, wpAt(g, { outs: outs + 1 }), now - 0.03));
    } else if (on2 || on3) {
      card('duel', '🎯', '몸쪽 승부', '삼진으로 끊는다', { zone: 0 }, mix(0.34, wpAt(g, { outs: outs + 1 }), now));
      card('chase', '🧊', '유인구', '한 점을 아낀다', { zone: 'chase' }, now);
      card('fast', '🔥', '직구 승부', '힘으로 맞선다', { pitchType: 'fast' }, mix(0.3, wpAt(g, { outs: outs + 1 }), now));
    } else {
      card('fast', '🔥', '직구 승부', '힘으로 맞선다', { pitchType: 'fast' }, mix(0.3, wpAt(g, { outs: outs + 1 }), now));
      card('slider', '🌀', '변화구 승부', '방망이를 헛돌린다', { pitchType: 'slider' }, mix(0.32, wpAt(g, { outs: outs + 1 }), now));
      card('duel', '🎯', '몸쪽 승부', '삼진으로 끊는다', { zone: 0 }, mix(0.34, wpAt(g, { outs: outs + 1 }), now));
    }
  }
  return out.slice(0, 3).map((c) => ({ ...c, move: Math.round((c.wp - now) * 100) }));
}
