/*
 * 수싸움 판 — 승부처 한 타석을 공마다 직접 고른다 (목업 duel-look 1안 · 시제품 game-proto 에서 옮김).
 *
 * 조사(MLB 더 쇼 · 9이닝스 · 매든 · 레트로 볼)로 정한 배치:
 *  - 경기 화면이 주인공 — 중계 시점 사진 위에 점수는 왼쪽 위, 고르는 판은 오른쪽 아래 하나, 존은 가운데.
 *  - 수비: 구종 → 코스(3 × 3 칸 + 바깥 네 띠 = 유인구) → 던지기 (더 쇼 클래식 투구의 세 박자)
 *  - 공격: 작전(타격 · 번트 · 주루 탭 — 매든의 분류 → 카드) → 노림(구종 · 4칸 코스 — 9이닝스 노림 존) → 이 작전으로
 *  - 글자 16px 이상 · 선택지 22px 이상 · 버튼 높이 64px 이상 · 강조색은 금색 하나.
 * 판은 고르기만 한다 — 공을 던지는 것은 중계 루프(BroadcastGame)가 엔진 pitch() 로 하고, 결과(reveal)를 돌려준다.
 * 결과 알림은 0.3초 안에 떠서 1초 머문다(자주 보는 것 — 짧게). 아무 데나 누르면 바로 걷힌다.
 */
import React, { useEffect, useState } from 'react';
import { pitchMix, stealOdds, PITCHES, offenseOf, staminaOf } from '../engine/pitchSim.js';
import { artId } from '../data/artAlias.js';
import { pitchTarget, ZONE } from './playScript.js';

/** 공격 · 수비 색 — 우리(초록) · 상대(빨강)와 겹치지 않게 */
const SIDE_C = { off: '#fb923c', def: '#38bdf8' };
const GOLD = '#fbbf24', BLUE = '#60a5fa', RED = '#f87171', WIN = '#34d399', MUTE = '#94a3b8';
export const DUEL_PITCH = { fast: { ko: '직구', c: '#f87171' }, slider: { ko: '슬라이더', c: '#a78bfa' }, change: { ko: '체인지업', c: '#34d399' } };
const CHASE = { hi: '높은 볼', lo: '낮은 볼', in: '몸쪽 볼', out: '바깥 볼' };
const QUAD = { ih: '몸쪽 높게', oh: '바깥 높게', il: '몸쪽 낮게', ol: '바깥 낮게' };
const ROW = ['높게', '가운데', '낮게'], COL = ['몸쪽', '가운데', '바깥'];
/** 칸 번호(0~8, 열 = 몸쪽 → 바깥, 행 = 높게 → 낮게) · 띠 · 4칸을 사람 말로 */
export const zoneKo = (z) => {
  if (z == null) return '';
  if (CHASE[z]) return CHASE[z];
  if (QUAD[z]) return QUAD[z];
  const r = Math.floor(z / 3), c = z % 3;
  if (z === 4) return '한가운데';
  return r === 1 ? COL[c] : c === 1 ? ROW[r] : `${COL[c]} ${ROW[r]}`;
};
const face = (p) => (p?.id
  ? `url(cards/${encodeURIComponent(artId(p.id))}.webp), url(profiles/${encodeURIComponent(artId(p.id))}.webp), url(ui/mt/silhouette-player.webp)`
  : 'url(ui/mt/silhouette-player.webp)');
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;

/*
 * 공격 작전 — 엔진 지시로 바로 옮긴다. ok(g): 이 자리에서 되는가.
 * 스퀴즈는 3루 주자가 있을 때의 번트(엔진의 희생번트가 3루 주자를 홈으로 보낸다).
 */
const stealFrom = (g) => (g.bases[0] && !g.bases[1] ? 0 : g.bases[1] && !g.bases[2] ? 1 : null);
export const DUEL_PLAYS = {
  hit: [
    { k: 'power', ico: '💥', ko: '강공', sub: '장타 노림', order: { approach: 'power' } },
    { k: 'contact', ico: '↗', ko: '밀어치기', sub: '삼진 · 병살 줄이기', order: { approach: 'contact' } },
    { k: 'wait', ico: '👁', ko: '기다리기', sub: '볼 고르기', order: { patience: 1 } },
  ],
  bunt: [
    { k: 'sac', ico: '⬇', ko: '희생번트', sub: '주자 한 칸씩', order: { bunt: true }, ok: (g) => (g.bases[0] || g.bases[1]) && !g.bases[2] && g.outs < 2 },
    { k: 'squeeze', ico: '🏠', ko: '스퀴즈', sub: '3루 주자 홈으로', order: { bunt: true }, ok: (g) => g.bases[2] && g.outs < 2 },
    { k: 'drag', ico: '⚡', ko: '기습번트', sub: '타자도 1루로', order: { bunt: true, drag: true } },
  ],
  run: [
    { k: 'steal', ico: '🏃', ko: '도루', order: (g) => ({ steal: stealFrom(g) }), ok: (g) => stealFrom(g) != null },
    { k: 'hnr', ico: '🔁', ko: '히트앤런', sub: '주자 출발 · 무조건 스윙', order: { hitAndRun: true }, ok: (g) => g.bases[0] && g.outs < 2 },
    { k: 'dash', ico: '⏩', ko: '적극 주루', sub: '한 루 더 · 병살 줄이기', order: { dash: 1 }, ok: (g) => g.bases.some(Boolean) },
  ],
};
const CATS = [['hit', '타격'], ['bunt', '번트'], ['run', '주루']];
const AIM_T = [['fast', '직구'], ['slider', '슬라이더'], ['change', '체인지업'], [null, '안 노림']];
const okOf = (p, g) => !p.ok || !!p.ok(g);
const playOf = (k) => Object.values(DUEL_PLAYS).flat().find((p) => p.k === k);
const catOf = (k) => CATS.find(([c]) => DUEL_PLAYS[c].some((p) => p.k === k))[0];

/*
 * 지금 상황 한 줄 — 중계 자막처럼 두세 마디(만루 위기 · 득점 찬스 · 승리까지 아웃 2개). 우리 = 홈.
 * 위에서부터 먼저 걸리는 것 하나만: 가장 급한 것(끝내기 · 만루)이 먼저, 그다음 점수에 닿는 주자, 없으면 아웃 · 선두 타자.
 */
export function situationOf(g, side) {
  const lead = g.home.runs - g.away.runs, [b1, b2, b3] = g.bases, o = g.outs, risp = !!(b2 || b3);
  if (side === 'off') {
    if (g.inning >= 9 && lead === 0 && (risp || (b1 && b2 && b3))) return '끝내기 찬스';
    if (b1 && b2 && b3) return '만루 찬스';
    if (risp) return lead === -1 ? '동점 찬스' : lead === 0 ? '역전 찬스' : lead < 0 ? '추격 찬스' : '추가점 찬스';
    if (b1) return '진루 찬스';
    return o === 0 ? '선두 타자 출루' : '출루 먼저';
  }
  if (b1 && b2 && b3) return '만루 위기';
  if (risp) return lead === 1 ? '동점 위기' : lead === 0 ? '실점 위기' : lead < 0 ? '추가 실점 위기' : '실점 위기';
  if (g.inning >= 9 && lead > 0) return `승리까지 아웃 ${3 - o}개`;
  if (b1 && o < 2) return '병살 찬스';
  if (o === 2) return '이닝 마무리';
  return o === 0 ? '선두 타자 막기' : '타자 잡기';
}

const CSS = `
.dl { position: fixed; inset: 0; z-index: 45; color: #fff; font-family: 'IBM Plex Sans KR', sans-serif; }
.dl .disp { font-family: 'Saira Condensed','IBM Plex Sans KR',sans-serif; }
.dl .pn { background: rgba(7,10,18,.8); backdrop-filter: blur(14px); border-radius: 22px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.09), 0 24px 60px rgba(0,0,0,.5); }
.dl .opt { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 0 16px; border-radius: 14px; color: #fff;
  background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); transition: background .15s, box-shadow .15s; }
.dl .opt:hover { background: rgba(255,255,255,.1); }
.dl .opt.on { background: rgba(251,191,36,.16); box-shadow: inset 0 0 0 2.5px ${GOLD}; }
.dl .opt:disabled { opacity: .32; cursor: default; }
.dl .lbl { font-size: 16px; font-weight: 700; color: ${MUTE}; letter-spacing: .06em; }
.dl .go { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 18px; font-weight: 900; color: #1c1203;
  background: linear-gradient(180deg,#fde68a,#f59e0b); box-shadow: 0 12px 34px -10px rgba(245,158,11,.85); }
.dl .go:hover { filter: brightness(1.06); }
.dl .go:disabled { background: rgba(255,255,255,.1); color: ${MUTE}; box-shadow: none; cursor: default; }
.dl .sub { all: unset; box-sizing: border-box; cursor: pointer; display: grid; place-items: center; border-radius: 14px; font-size: 17px; font-weight: 800; color: #e2e8f0; background: rgba(255,255,255,.07); }
.dl .sub:disabled { opacity: .35; cursor: default; }
.dl .zc { cursor: pointer; transition: fill .15s; }
.dl .zc:hover { fill: rgba(255,255,255,.16); }
.dl .tab { all: unset; cursor: pointer; padding: 7px 16px; border-radius: 10px; font-size: 17px; font-weight: 800; color: ${MUTE}; }
.dl .tab.on { color: #1c1203; background: ${GOLD}; }
.dl .tab:disabled { opacity: .3; cursor: default; }
@keyframes dlIn { from { opacity: 0; } }
@keyframes dlPop { 0% { transform: scale(.7); opacity: 0; } 70% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); } }
@keyframes dlPing { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .dl, .dl * { animation: none !important; } }
`;

/*
 * 맞붙는 선수 한 줄 — 편은 색으로 못 박는다(중계와 같게): 상대 = 빨강 · 우리 = 초록. 두 줄 모두 구단 배너를 깐다.
 * 고르는 데 쓰는 것만: 투수는 구위 · 제구 · 체력(지치면 공이 몰린다), 타자는 컨택 · 파워 · 오늘 성적.
 */
const OPP = '#f87171', OURS = '#34d399';
const SB_MASK = 'linear-gradient(90deg,transparent 8%,#000 88%)';
/** 오늘 이 타자 — 타수 · 안타(볼넷 · 희생은 타수에서 뺀다) */
function todayOf(g, b) {
  let ab = 0, h = 0, bb = 0;
  for (const ev of g.events) {
    if (ev.batter !== b || ev.top !== g.top || !ev.result) continue;
    if (['BB', 'IBB'].includes(ev.result)) bb += 1;
    else if (!['SAC', 'SF', 'SB', 'CS'].includes(ev.result)) { ab += 1; if (['1B', '2B', '3B', 'HR', 'BH'].includes(ev.result)) h += 1; }
  }
  if (!ab && !bb) return '첫 타석';
  return `${ab}타수 ${h}안타${bb ? ` · 볼넷 ${bb}` : ''}`;
}
/** 체력 색 — 넉넉하면 초록, 바닥이면 빨강 */
const staminaC = (v) => (v > 60 ? OURS : v > 35 ? '#fbbf24' : OPP);
function Who({ p, isP, mine, team, g, side }) {
  const c = mine ? OURS : OPP;
  const stam = isP ? Math.round(staminaOf(side)) : 0;
  return (
    <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 14,
      background: `linear-gradient(90deg, ${c}40, ${c}0f 72%)`, boxShadow: `inset 4px 0 0 ${c}, inset 0 0 0 1px ${c}55` }}>
      {team?.flag && <i aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `url(${team.flag.src})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.32, WebkitMaskImage: SB_MASK, maskImage: SB_MASK, pointerEvents: 'none' }} />}
      <div style={{ position: 'relative', width: 48, height: 48, borderRadius: '50%', flex: 'none', backgroundImage: face(p), backgroundSize: 'cover', backgroundPosition: '50% 12%', backgroundColor: '#0b1220', boxShadow: `0 0 0 2.5px ${c}` }} />
      <div style={{ position: 'relative', display: 'grid', gap: 3, minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
          <b style={{ fontSize: 15, color: c }}>{mine ? '우리' : '상대'} {isP ? '투수' : '타자'}</b>
          {!mine && team?.short && <b style={{ fontSize: 14, padding: '0 7px', borderRadius: 6, color: '#fff', background: `${OPP}cc` }}>{team.short}</b>}
          <b style={{ fontSize: 21, lineHeight: 1.1 }}>{p?.name}</b><b className="disp" style={{ fontSize: 19, color: MUTE }}>{p?.overall}</b>
        </span>
        {isP ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: '#cbd5e1', whiteSpace: 'nowrap' }}>
            구위 {st(p, 'stuff')} · 제구 {st(p, 'control')}
            <i style={{ flex: 1, minWidth: 40, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}><b style={{ display: 'block', width: `${stam}%`, height: '100%', background: staminaC(stam) }} /></i>
            <b className="disp" style={{ fontSize: 16, color: staminaC(stam) }}>{side.pitches}구</b>
          </span>
        ) : (
          <span style={{ fontSize: 15, color: '#cbd5e1', whiteSpace: 'nowrap' }}>컨택 {st(p, 'contact')} · 파워 {st(p, 'power')} · <b style={{ color: '#fff' }}>오늘 {todayOf(g, p)}</b></span>
        )}
      </div>
    </div>
  );
}
/*
 * 존 — grid 3: 칸 0~8(수비 코스) + 바깥 네 띠 · grid 2: 4칸 노림(공격). 몸쪽이 왼쪽(중계 존 판과 같게).
 * marks: 이 타석 공 { x, y (존 반폭 · 반높이 = 1), c }
 */
function Zone({ size, grid = 3, chase = true, sel, onPick, marks = [] }) {
  const B = size, m = chase ? Math.round(B * 0.2) : 0, gap = 8, W = B + m * 2, cell = B / grid;
  const cells = [];
  for (let r = 0; r < grid; r += 1) for (let c = 0; c < grid; c += 1) {
    cells.push({ id: grid === 3 ? r * 3 + c : `${c ? 'o' : 'i'}${r ? 'l' : 'h'}`, x: m + c * cell, y: m + r * cell, w: cell, h: cell });
  }
  const bars = chase ? [
    { id: 'hi', x: m, y: 0, w: B, h: m - gap }, { id: 'lo', x: m, y: m + B + gap, w: B, h: m - gap },
    { id: 'in', x: 0, y: m, w: m - gap, h: B }, { id: 'out', x: m + B + gap, y: m, w: m - gap, h: B },
  ] : [];
  const selBox = [...cells, ...bars].find((z) => z.id === sel);
  const H = W + 34;
  const pick = onPick ? 'zc' : undefined;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {bars.map((z) => (
        <g key={z.id} onClick={() => onPick?.(z.id)}>
          <rect className={pick} x={z.x} y={z.y} width={z.w} height={z.h} rx="12" fill="rgba(8,12,22,.55)" stroke="rgba(255,255,255,.22)" strokeDasharray="7 6" />
          <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 6} textAnchor="middle" fontSize="17" fontWeight="700" fill="#cbd5e1" style={{ pointerEvents: 'none' }}>
            {z.h > z.w ? CHASE[z.id].split(' ').map((t, n) => <tspan key={n} x={z.x + z.w / 2} dy={n ? 22 : -8}>{t}</tspan>) : CHASE[z.id]}</text>
        </g>
      ))}
      <rect x={m - 3} y={m - 3} width={B + 6} height={B + 6} rx="14" fill="rgba(8,12,22,.45)" />
      {cells.map((z) => (
        <g key={z.id} onClick={() => onPick?.(z.id)}>
          <rect className={pick} x={z.x + 4} y={z.y + 4} width={z.w - 8} height={z.h - 8} rx="10" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.2)" />
          {grid === 2 && <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 8} textAnchor="middle" fontSize="22" fontWeight="800" fill="#e2e8f0" style={{ pointerEvents: 'none' }}>{QUAD[z.id]}</text>}
        </g>
      ))}
      <rect x={m} y={m} width={B} height={B} rx="10" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="3" style={{ pointerEvents: 'none' }} />
      {selBox && (
        <g style={{ pointerEvents: 'none' }}>
          <rect x={selBox.x + 3} y={selBox.y + 3} width={selBox.w - 6} height={selBox.h - 6} rx="11" fill="rgba(251,191,36,.22)" stroke={GOLD} strokeWidth="4" />
          {!QUAD[sel] && <><circle cx={selBox.x + selBox.w / 2} cy={selBox.y + selBox.h / 2} r={Math.min(selBox.w, selBox.h) * 0.34} fill="none" stroke={GOLD} strokeWidth="3" /><circle cx={selBox.x + selBox.w / 2} cy={selBox.y + selBox.h / 2} r="6" fill={GOLD} /></>}
        </g>
      )}
      {marks.map((p, i) => {
        const x = m + ((Math.max(-1.45, Math.min(1.45, p.x)) + 1) / 2) * B, y = m + ((Math.max(-1.45, Math.min(1.45, p.y)) + 1) / 2) * B, last = i === marks.length - 1;
        return (
          <g key={i} style={{ pointerEvents: 'none', animation: last ? 'dlPing .3s both' : undefined, transformOrigin: `${x}px ${y}px` }}>
            <circle cx={x} cy={y} r={last ? 18 : 15} fill={p.c} stroke="#05080f" strokeWidth="3" opacity={last ? 1 : 0.75} />
            <text x={x} y={y + 6} textAnchor="middle" fontSize="17" fontWeight="900" fill="#05080f">{i + 1}</text>
          </g>
        );
      })}
      <text x={m} y={W + 26} fontSize="17" fontWeight="700" fill={MUTE}>◀ 몸쪽</text>
      <text x={m + B} y={W + 26} textAnchor="end" fontSize="17" fontWeight="700" fill={MUTE}>바깥 ▶</text>
    </svg>
  );
}

/*
 * 상대가 이번 공에 할 것을 미리 정한다 — 단서가 그걸 가리키게(엔진 g.rng 로, 시드 경기에서도 같은 흐름).
 *  공격(상대 투수): 그 투수의 구종 비율로 한 공 + 자리(직구는 높게 · 변화구는 낮게 쪽) → pitchType · zone(noPick — 찍은 보정 없음).
 *   단서 60%(반은 구종 · 반은 미트 자리) · 맞을 확률 70%.
 *  수비(상대 타자): 55% 로 노리고, 우리 투수가 자주 · 방금 던진 공을 더 노린다 → guess. 단서 75% · 70%.
 *   같은 구종을 거듭 던지면 읽힌다 — 한 가지만 반복하면 진다.
 */
const PITCH_TELL = { fast: '투수가 세트에서 빠르게 끊어 감 · 직구 느낌', slider: '투수가 공을 깊숙이 쥠 · 슬라이더 느낌', change: '투수 팔이 느슨하게 돎 · 체인지업 느낌' };
const SWING_TELL = { fast: '타자가 앞쪽으로 붙어 섬 · 직구 노림', slider: '타자가 뒤로 물러섬 · 슬라이더 노림', change: '타자 발이 늦게 나옴 · 체인지업 노림', none: '타자가 방망이를 짧게 쥠 · 맞히기' };
const draw = (w, r) => { const tot = Object.values(w).reduce((a, b) => a + b, 0); let acc = 0; for (const [k, v] of Object.entries(w)) { acc += v / tot; if (r < acc) return k; } return Object.keys(w).pop(); };
export function duelAi(g, side, seq = []) {
  const rng = g.rng;
  const mix = pitchMix((g.top ? g.home : g.away).pitcher);
  const types = Object.keys(DUEL_PITCH);
  const other = (k) => types.filter((x) => x !== k)[Math.floor(rng() * 2)];
  if (side === 'off') {
    const t = draw(mix, rng());
    const w = t === 'fast' ? [0.45, 0.35] : [0.15, 0.3], x = rng();
    const zone = (x < w[0] ? 0 : x < w[0] + w[1] ? 1 : 2) * 3 + Math.floor(rng() * 3);
    let tell = null;
    if (rng() < 0.6) {
      if (rng() < 0.5) tell = PITCH_TELL[rng() < 0.7 ? t : other(t)];
      else { const z = rng() < 0.7 ? zone : Math.floor(rng() * 9); tell = `포수 미트가 ${zoneKo(z)}`; }
    }
    return { orders: { pitchType: t, zone, noPick: true }, tell };
  }
  const w = { ...mix }, n = seq.length;
  if (n >= 2 && seq[n - 1] === seq[n - 2]) w[seq[n - 1]] += 0.4;
  else if (n >= 1) w[seq[n - 1]] += 0.15;
  const guess = rng() < 0.55 ? draw(w, rng()) : null;
  let tell = null;
  if (rng() < 0.75) {
    const said = rng() < 0.7 ? guess : [...types, null].filter((x) => x !== guess)[Math.floor(rng() * 3)];
    tell = SWING_TELL[said || 'none'];
  }
  return { orders: guess ? { guess } : {}, tell, guess };
}

/** 존 밖으로 빠진 공 — 그림 자리에서 어느 쪽인지 */
const missKo = (ev) => {
  const [x, y] = pitchTarget(ev) || [0, 0];
  return Math.abs(x) / ZONE.w >= Math.abs(y) / ZONE.h ? (x < 0 ? '몸쪽 빠짐' : '바깥 빠짐') : (y < 0 ? '높게 빠짐' : '낮게 빠짐');
};
const CALL_KO = { ball: ['볼', BLUE], called: ['스트라이크', '#fde047'], swinging: ['헛스윙', '#fde047'], foul: ['파울', '#d1d5db'] };

/**
 * props
 *  g · side('off' | 'def') · board: 점수판(중계와 같은 조각) · opp · me: 두 구단 { short, flag }
 *  waiting: 고를 차례인가 · tell: 단서 한 줄(없으면 null) · shots: 이 타석 공 [{ x, y, ev }]
 *  reveal: 방금 공 { ev, guess } · onGo(orders) · onHand() 맡기기
 */
export default function DuelPanel({ g, side, board, opp, me, waiting, tell, shots, reveal, onGo, onHand }) {
  const off = side === 'off';
  const pitcher = (g.top ? g.home : g.away).pitcher;
  const batter = offenseOf(g).team.batters[offenseOf(g).idx % offenseOf(g).team.batters.length];
  const [pk, setPk] = useState('fast');
  const [zone, setZone] = useState(null);
  const [cat, setCat] = useState('hit');
  const [play, setPlay] = useState('power');
  const [guess, setGuess] = useState(null);
  const [aim, setAim] = useState(null);
  const [showRev, setShowRev] = useState(null);
  /* 결과 알림 — 1초 머물고 걷힌다(누르면 바로) */
  useEffect(() => {
    if (!reveal) return undefined;
    setShowRev(reveal);
    const t = setTimeout(() => setShowRev(null), 1000);
    return () => clearTimeout(t);
  }, [reveal]);
  /* 되는 작전이 바뀌면(주자가 움직이면) 타격으로 */
  const cur = playOf(play);
  useEffect(() => { if (!okOf(cur, g)) { setCat('hit'); setPlay('power'); } });

  const mix = pitchMix(pitcher);
  const main = Object.entries(mix).sort((a, b) => b[1] - a[1])[0][0];
  const stuff = st(pitcher, 'stuff', 79);
  const veloOf = (t) => { const [lo, hi] = PITCHES[t].speed; return Math.round(lo + (hi - lo) * Math.max(0, Math.min(1, (stuff - 60) / 45))); };
  const hitting = off && cat === 'hit' && play !== 'wait';
  const canGo = waiting && (off ? okOf(cur, g) : zone != null);
  const go = () => {
    if (!canGo) return;
    if (off) {
      const base = typeof cur.order === 'function' ? cur.order(g) : cur.order;
      onGo({ ...base, ...(hitting && guess ? { guess } : {}), ...(hitting && aim ? { aim } : {}) });
    } else {
      onGo({ pitchType: pk, ...(typeof zone === 'number' ? { zone, exact: true } : { zone: 'chase', band: zone }) });
      setZone(null);
    }
  };
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); go(); return; }
      const i = Number(e.key) - 1;
      if (!(i >= 0)) return;
      if (off) { const p = DUEL_PLAYS[cat][i]; if (p && okOf(p, g)) setPlay(p.k); }
      else { const t = Object.keys(DUEL_PITCH)[i]; if (t) setPk(t); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const marks = shots.map((s) => ({ x: s.x, y: s.y, c: DUEL_PITCH[s.ev.pitch?.type]?.c || '#fff' }));
  const pickKo = off
    ? `${cur.ko}${hitting ? ` · ${AIM_T.find((a) => a[0] === guess)[1]}${aim ? ` · ${QUAD[aim]}` : ''}` : ''}`
    : `${DUEL_PITCH[pk].ko} · ${zone != null ? zoneKo(zone) : '코스 고르기'}`;
  const R = showRev;
  const rp = R?.ev?.pitch;
  const [callKo, callC] = R ? (CALL_KO[R.ev.call] || [R.ev.call === 'inplay' ? '인플레이' : '', '#fff']) : [];
  return (
    <div className="dl" style={{ animation: 'dlIn .25s both' }} onPointerDown={() => showRev && setShowRev(null)}>
      <style>{CSS}</style>
      {/* 배경 — 수비 = 중견수 쪽 중계 카메라, 공격 = 포수 뒤 */}
      <div style={{ position: 'absolute', inset: 0, background: `url(${off ? 'ui/duel-off.webp' : 'ui/duel-def.webp'}) center ${off ? '100%' : '50%'}/cover, #05080f` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(3,5,10,.72), transparent 28%, transparent 64%, rgba(3,5,10,.86))' }} />

      {/* 점수판 — 중계 화면과 같은 판(볼카운트는 빼고 가운데에 크게) */}
      <div style={{ position: 'absolute', left: 32, top: 28 }}>{board}</div>
      {/*
        공격 · 수비 + 목표 한 줄 — 아이콘 · 이름 · 색 세 겹으로 갈린다(더 쇼의 방망이 · 글러브 표시처럼).
        공격 = 주황 방망이, 수비 = 하늘 글러브. 우리 · 상대의 초록 · 빨강과 겹치지 않는 색으로.
      */}
      <div className="pn" style={{ position: 'absolute', left: '50%', top: 20, transform: 'translateX(-50%)', padding: '6px 28px 6px 6px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap',
        background: `linear-gradient(90deg, ${SIDE_C[side]}47, rgba(7,10,18,.84) 58%)`, boxShadow: `inset 0 0 0 2px ${SIDE_C[side]}, 0 0 30px -8px ${SIDE_C[side]}` }}>
        <img src={`ui/nav/duel-${side}.webp`} alt="" style={{ width: 54, height: 54, borderRadius: '50%', display: 'block' }} />
        <b style={{ fontSize: 26, fontWeight: 900, color: SIDE_C[side] }}>{off ? '공격' : '수비'}</b>
        <i style={{ width: 1, height: 26, background: 'rgba(255,255,255,.22)' }} />
        <b style={{ fontSize: 21 }}>{situationOf(g, side)}</b>
      </div>
      {/* 주자 · 볼카운트 — 존 바로 위, 가장 먼저 눈이 가는 자리. 주자판은 세 루가 그려진 폭에 딱 맞춘 viewBox(위아래 · 양옆 여백을 판 안쪽 여백과 같게). 모양 · 색은 중계 점수판과 같게(주자 주황 · B 초록 · S 노랑 · O 빨강) */}
      <div className="pn" style={{ position: 'absolute', left: '50%', top: 98, transform: 'translateX(-50%)', padding: '8px 28px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 26 }}>
        <svg viewBox="7.6 12.6 84.8 60.8" style={{ width: 84, height: 60, display: 'block', overflow: 'visible' }} aria-label="주자">
          {[[74, 55], [50, 31], [26, 55]].map(([x, y], i) => (
            <rect key={`${i}${!!g.bases[i]}`} x={x - 13} y={y - 13} width="26" height="26" rx="3" transform={`rotate(45 ${x} ${y})`}
              fill={g.bases[i] ? '#f97316' : 'transparent'} stroke={g.bases[i] ? 'none' : 'rgba(255,255,255,.5)'} strokeWidth={g.bases[i] ? 0 : 2.4}
              style={g.bases[i] ? { filter: 'drop-shadow(0 0 6px #f97316)' } : null} />
          ))}
        </svg>
        <i style={{ width: 1, height: 40, background: 'rgba(255,255,255,.16)' }} />
        {[['B', g.balls, 3, '#22c55e'], ['S', g.strikes, 2, '#facc15'], ['O', g.outs, 2, '#ef4444']].map(([l, n, m, c]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <b className="disp" style={{ fontSize: 26, color: c, width: 18 }}>{l}</b>
            {Array.from({ length: m }, (_, i) => (
              <i key={`${l}${i}${i < n}`} style={{ width: 24, height: 24, borderRadius: '50%', boxSizing: 'border-box', background: i < n ? c : 'transparent', border: i < n ? 'none' : '2px solid rgba(255,255,255,.35)',
                boxShadow: i < n ? `0 0 14px ${c}` : 'none', animation: i < n ? 'dlPing .3s both' : undefined }} />
            ))}
          </span>
        ))}
      </div>
      {/* 맞붙는 두 선수 — 상대가 위 */}
      <div className="pn" style={{ position: 'absolute', left: 32, bottom: 32, width: 400, padding: 8, display: 'grid', gap: 6, borderRadius: 18 }}>
        {off ? <><Who p={pitcher} isP team={opp} g={g} side={g.away} /><Who p={batter} mine team={me} g={g} /></>
          : <><Who p={batter} team={opp} g={g} /><Who p={pitcher} isP mine team={me} g={g} side={g.home} /></>}
      </div>

      {/* 존 + 단서 */}
      <div style={{ position: 'absolute', left: '50%', top: off ? '44%' : 186, transform: 'translateX(-50%)', display: 'grid', justifyItems: 'center', gap: 12 }}>
        {off ? <Zone size={300} grid={2} chase={false} sel={aim} marks={marks} onPick={hitting ? (z) => setAim(aim === z ? null : z) : undefined} />
          : <Zone size={360} sel={zone} marks={marks} onPick={waiting ? setZone : undefined} />}
        {/* 이 타석 투구 순서 — 존의 번호 점과 같은 번호 · 같은 색 */}
        {shots.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: 560 }}>
            {shots.map((x, i) => {
              const t = DUEL_PITCH[x.ev.pitch?.type];
              const [ko, c] = CALL_KO[x.ev.call] || ['', '#fff'];
              return (
                <span key={i} className="pn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px 4px 5px', borderRadius: 999, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <b style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: t?.c || '#fff', color: '#05080f', fontSize: 13 }}>{i + 1}</b>
                  {t?.ko}<span style={{ color: c }}>{ko}</span>
                </span>
              );
            })}
          </div>
        )}
        <div className="pn" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 999, fontSize: 19, fontWeight: 700 }}>
          🔎 {tell || <span style={{ color: MUTE, fontWeight: 600 }}>단서 없음</span>}
        </div>
      </div>

      {/* 고르는 판 */}
      <div className="pn" style={{ position: 'absolute', right: 32, bottom: 32, width: 400, padding: 18, display: 'grid', gap: 8, opacity: waiting ? 1 : 0.6, transition: 'opacity .2s' }}>
        {!off ? <>
          <span className="lbl">구종</span>
          {Object.entries(DUEL_PITCH).map(([t, p], i) => (
            <button key={t} type="button" className={`opt ${pk === t ? 'on' : ''}`} onClick={() => setPk(t)}>
              <b className="disp" style={{ fontSize: 17, color: MUTE, width: 10 }}>{i + 1}</b>
              <i style={{ width: 16, height: 16, borderRadius: '50%', background: p.c, flex: 'none', boxShadow: `0 0 12px ${p.c}` }} />
              <b style={{ fontSize: 20, flex: 1 }}>{p.ko}</b>
              <span style={{ fontSize: 15, color: t === main ? GOLD : '#cbd5e1', fontWeight: t === main ? 800 : 500 }}>{t === main ? '주무기' : `비중 ${Math.round(mix[t] * 100)}%`}</span>
              <b className="disp" style={{ fontSize: 20, width: 38, textAlign: 'right' }}>{veloOf(t)}</b>
            </button>
          ))}
        </> : <>
          <div style={{ display: 'inline-flex', gap: 4, padding: 5, borderRadius: 16, background: 'rgba(255,255,255,.06)', justifySelf: 'start' }}>
            {CATS.map(([k, ko]) => (
              <button key={k} type="button" className={`tab ${cat === k ? 'on' : ''}`} disabled={!DUEL_PLAYS[k].some((p) => okOf(p, g))}
                onClick={() => { setCat(k); setPlay((DUEL_PLAYS[k].find((p) => okOf(p, g)) || DUEL_PLAYS[k][0]).k); }}>{ko}</button>
            ))}
          </div>
          {DUEL_PLAYS[cat].map((p, i) => (
            <button key={p.k} type="button" className={`opt ${play === p.k ? 'on' : ''}`} disabled={!okOf(p, g)} onClick={() => setPlay(p.k)}>
              <b className="disp" style={{ fontSize: 17, color: MUTE, width: 10 }}>{i + 1}</b>
              <span style={{ fontSize: 19, width: 24, textAlign: 'center' }}>{p.ico}</span>
              <b style={{ fontSize: 20, flex: 1 }}>{p.ko}</b>
              <span style={{ fontSize: 15, color: '#cbd5e1' }}>{p.k === 'steal' ? (okOf(p, g) ? `성공 ${Math.round(stealOdds(g, stealFrom(g)) * 100)}%` : '') : p.sub}</span>
            </button>
          ))}
          {hitting && <>
            <span className="lbl" style={{ marginTop: 2 }}>노림</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {AIM_T.map(([k, ko]) => <button key={ko} type="button" className={`opt ${guess === k ? 'on' : ''}`} onClick={() => setGuess(k)} style={{ minHeight: 44, padding: 0, justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>{ko}</button>)}
            </div>
          </>}
        </>}
        <div style={{ height: 1, background: 'rgba(255,255,255,.1)', margin: '3px 0' }} />
        <div style={{ fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span className="lbl" style={{ marginRight: 12 }}>선택</span><span style={{ color: canGo || off ? '#fff' : MUTE }}>{pickKo}</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: off ? '1fr 88px' : '1fr 88px 88px', gap: 6 }}>
          <button type="button" className="go" disabled={!canGo} onClick={go} style={{ height: 60, fontSize: 21 }}>{off ? '이 작전으로' : '던지기'} ▶</button>
          {!off && <button type="button" className="sub" disabled={!waiting} onClick={() => onGo({ ibb: true })} style={{ height: 60, fontSize: 15 }}>고의사구</button>}
          <button type="button" className="sub" disabled={!waiting} onClick={onHand} style={{ height: 60, fontSize: 15 }}>맡기기</button>
        </div>
      </div>

      {/* 방금 공 — 던진 공 · 코스 · 판정 */}
      {R && rp && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div key={R.k} className="pn" style={{ textAlign: 'center', padding: '20px 44px', animation: 'dlPop .28s both' }}>
            <div style={{ fontSize: 21, color: '#e2e8f0' }}>
              <b style={{ color: DUEL_PITCH[rp.type]?.c }}>{DUEL_PITCH[rp.type]?.ko}</b> <span className="disp">{rp.velo}km</span> · {rp.inZone ? zoneKo(rp.zone) : CHASE[rp.band] || missKo(R.ev)}
              {R.guess !== undefined && <span style={{ color: MUTE }}> — 타자 {R.guess ? `${DUEL_PITCH[R.guess].ko} 노림` : '노림 없음'}</span>}
            </div>
            <b style={{ display: 'block', fontSize: 72, fontWeight: 900, lineHeight: 1.15, color: callC, textShadow: '0 6px 30px rgba(0,0,0,.7)' }}>{callKo}</b>
            {R.ev.steal && <div style={{ fontSize: 24, fontWeight: 800, color: R.ev.steal.ok ? WIN : RED }}>{R.ev.steal.runner?.name} 도루 {R.ev.steal.ok ? '성공' : '실패'}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
