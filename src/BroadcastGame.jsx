/*
 * 중계형 경기 화면: 공 하나 단위 엔진(pitchSim)을 그대로 보여 준다.
 * 화면은 칸 셋이다 — 왼쪽에 점수판과 타순, 가운데에 구장과 작전 버튼,
 * 오른쪽에 지금 던지는 투수 · 내 불펜 · 해설. 타석에 선 선수는 점수판과 타순 사이에 둔다.
 * 승부처에는 멈추고 지시를 받는다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UiStyle, Portrait, GlassBg, Pop } from './myteam/ui.jsx';
import { teamFlag, flagByKey } from './myteam/teamArt.js';
import { statBandColor } from './myteam/teamColor.js';
import { myBanner } from './myteam/store.js';
import PlayView from './play/PlayView.jsx';
import { pitchTarget, ZONE, pitchArrival } from './play/playScript.js';
import { winProb } from './engine/winProb.js';
import { playsFor } from './engine/plays.js';
import { FORM_OF } from './myteam/form.js';
import { SIDES, DEFAULT_SIDES, planOfSides, sideOpt } from './myteam/strategy.js';
import { tacticOrders } from './engine/tactics.js';
import { seeded } from './engine/rng.js';
import { artId } from './data/artAlias.js';
import {
  createGame, pitch, stealOdds, pitchMix, staminaOf, batterOf, pitcherOf, offenseOf, defenseOf, RESULT_LABEL, PITCHES, replaceTeam, aiPitchingChange, playOut, DEFAULT_USAGE, dirName, isClutch, leverage, CLUTCH_LIMIT } from './engine/pitchSim.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** 이 타석에 지나간 공 — 존 반폭 · 반높이를 1 로 잰 자리 */
const shotOf = (e) => {
  const t = pitchTarget(e) || [0, 0];
  return { x: t[0] / ZONE.w, y: t[1] / ZONE.h, tone: CALL_TONE[e.call] || '#fff', ev: e };
};
const shotsOf = (g) => atBatPitches(g.events).map(shotOf);
const tint = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;
/* 담아 둔 지시를 사람 말로 — 눌렀다는 것이 보이게 */
const ORDER_KO = { steal: '도루', bunt: '번트', hitAndRun: '히트앤런', ibb: '고의사구', changePitcher: '투수 교체' };
const PITCH_NAME = { fast: '직구', slider: '변화구', change: '변화구' };
const orderKo = (o = {}) => Object.entries(o).map(([k, v]) => {
  if (k === 'zone') return v === 'chase' ? '유인구' : '코스 승부';
  if (k === 'guess') return `${PITCH_NAME[v] || ''} 노림`;
  if (k === 'pitchType') return `${PITCH_NAME[v] || ''} 승부`;
  return ORDER_KO[k];
}).filter(Boolean);
/* 승부처에 화면을 한 번 붙잡는 빛 */
const CLUTCH_CSS = `
@keyframes halfSwipe { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.86); letter-spacing: .4em; }
  18% { opacity: 1; transform: translate(-50%,-50%) scale(1); letter-spacing: .12em; }
  76% { opacity: 1; transform: translate(-50%,-50%) scale(1); letter-spacing: .12em; }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(1.06); letter-spacing: .2em; } }
@keyframes halfWipe { 0% { transform: scaleX(0); opacity: .9; } 55% { transform: scaleX(1); opacity: .55; } 100% { transform: scaleX(1); opacity: 0; } }
@keyframes sidePop { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes rushBlink { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
@keyframes outPop { 0% { transform: scale(1); } 32% { transform: scale(1.5); } 100% { transform: scale(1); } }
@keyframes batterIn { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: none; } }
@keyframes clutchPulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.14); } }
@keyframes clutchEdge { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
`;
const st = (p, k, d = 70) => p?.stats?.[k] ?? d;
/* 스코어보드 — 중계 자막처럼 짧게 부르고, 팀 줄에는 대진표와 같은 깃발을 깐다 */
export const SB_MASK = 'linear-gradient(90deg,transparent 8%,#000 88%)';
const SB_SHORT = { kia: 'KIA', doosan: '두산', samsung: '삼성', hanwha: '한화', lg: 'LG', lotte: '롯데', nc: 'NC', kt: 'KT', hyundai: '현대', sk: 'SSG', kiwoom: '키움', korea: '한국', legend: '레전드' };
/** 내 팀은 앞의 '나의'를 떼고 네 글자까지, 상대는 구단 약칭 */
export function shortTeam(name = '', mine = false) {
  if (mine) return name.replace(/^나의\s*/, '').slice(0, 4);
  const f = teamFlag(name);
  return (f && SB_SHORT[f.key]) || name.replace(/^\d{4}\s*/, '').split(' ')[0];
}

/** 타순 줄의 오늘 성적 — 중계 자막처럼 한 마디로 (홈런 · 2루타 · 2안타 · 볼넷 · 삼진 · 무안타) */
function todayKo(g, batter) {
  let pa = 0, h = 0, hr = 0, tri = 0, dbl = 0, bb = 0, k = 0;
  for (const ev of g.events) {
    if (ev.batter !== batter || !ev.result) continue;
    pa += 1;
    const r = ev.result;
    if (r === 'HR') { hr += 1; h += 1; } else if (r === '3B') { tri += 1; h += 1; } else if (r === '2B') { dbl += 1; h += 1; } else if (r === '1B' || r === 'BH') h += 1;
    else if (r === 'BB' || r === 'IBB') bb += 1;
    else if (r === 'K') k += 1;
  }
  if (!pa) return '-';
  if (hr) return hr > 1 ? `홈런 ${hr}` : '홈런';
  if (h) return h > 1 ? `${h}안타` : tri ? '3루타' : dbl ? '2루타' : '1안타';
  if (bb) return '볼넷';
  if (k) return '삼진';
  return '무안타';
}
/** 어두운 유리판 위 성적 글자색 — 장타는 노랑, 안타는 연초록, 볼넷은 하늘, 못 친 날은 흐리게 */
/** 선수 그림 — 카드가 있으면 카드, 없으면 프로필, 그것도 없으면 실루엣 */
const faceArt = (p) => (p?.id
  ? `url(cards/${encodeURIComponent(artId(p.id))}.webp), url(profiles/${encodeURIComponent(artId(p.id))}.webp), url(ui/mt/silhouette-player.webp)`
  : 'url(ui/mt/silhouette-player.webp)');

/** 체력 색 — 0 은 붉고 100 은 초록. 사이는 주황 · 노랑 · 연두로 건너간다 */
const STAMINA_HUE = [[0, 0], [35, 22], [60, 46], [80, 88], [100, 152]];
function staminaTone(v) {
  const x = Math.max(0, Math.min(100, v));
  let h = 152;
  for (let i = 1; i < STAMINA_HUE.length; i += 1) {
    const [p0, h0] = STAMINA_HUE[i - 1]; const [p1, h1] = STAMINA_HUE[i];
    if (x <= p1) { h = h0 + (h1 - h0) * ((x - p0) / (p1 - p0)); break; }
  }
  return { ink: `hsl(${h.toFixed(0)} 80% 58%)`, bar: `linear-gradient(90deg, hsl(${h.toFixed(0)} 72% 42%), hsl(${h.toFixed(0)} 86% 58%))` };
}

const koDark = (ko) => (/홈런|루타/.test(ko) ? '#fde047' : /안타/.test(ko) && !/무/.test(ko) ? '#a7f3d0' : /볼넷/.test(ko) ? '#93c5fd' : 'rgba(255,255,255,.5)');

/** 지금 던지는 투수의 오늘 기록 */
function pitcherLine(g, pitcher) {
  let k = 0, h = 0, bb = 0, r = 0;
  for (const ev of g.events) {
    if (ev.pitcher !== pitcher || !ev.result) continue;
    if (ev.result === 'K') k += 1;
    if (['1B', '2B', '3B', 'HR', 'BH'].includes(ev.result)) h += 1;
    if (['BB', 'IBB'].includes(ev.result)) bb += 1;
    r += ev.runs || 0;
  }
  return { k, h, bb, r };
}

/**
 * 효과형 증강의 투수 운용(buildTeam usage 플래그)을 엔진 AI 감독 usage 로 옮긴다. 이닝 ≈ 투구 15개
 *  completeGame 완투 · extraInnings 선발 +n이닝 · aceMax 선발 상한 · noTired 지침 늦춤 · bullpenAce 가장 강한 불펜이 길게
 */
const PITCHES_PER_INNING = 15;
export function engineUsage(u) {
  if (!u) return null;
  const out = { ...u };
  const starter = () => out.starterPitches ?? DEFAULT_USAGE.starterPitches;
  if (u.extraInnings) out.starterPitches = starter() + PITCHES_PER_INNING * u.extraInnings;
  if (u.completeGame) Object.assign(out, { starterPitches: 9 * PITCHES_PER_INNING + 20, quickHook: 0, fatigueGrace: 45 });
  if (u.aceMax) out.starterPitches = Math.min(starter(), u.aceMax * PITCHES_PER_INNING);
  if (u.noTired) out.fatigueGrace = Math.max(out.fatigueGrace || 0, 15);
  if (u.bullpenAce) out.relieverPitches = 45;
  return out;
}

/** 드래프트 팀(roster)에서 엔진용 팀을 만든다: 타순 9명 + 투수(선발 → 불펜) */
export function engineTeam(team) {
  const roster = team.roster || [];
  const batters = (team.batters?.length ? team.batters : roster.filter((p) => p.type === 'batter')).slice(0, 9);
  // 등판 순서: 정비 화면 선발 자리 → (자리 없는 팀은) 선발 포지션 → 불펜 자리 순서(롱릴리프·중간·셋업·마무리). 같으면 덜 지친 투수, 종합 높은 투수
  const RELIEF = ['LR', 'MR', 'SU', 'CL'];
  const tier = (p) => (p.slot === 'SP' ? 0 : !p.slot && p.position === 'SP' ? 1 : 2);
  // AI 시리즈 팀은 등판 순서(pitchOrder)를 직접 들고 온다
  const byId = new Map(roster.map((p) => [p.id, p]));
  let pitchers = team.pitchOrder ? team.pitchOrder.map((id) => byId.get(id)).filter(Boolean) : roster.filter((p) => p.type === 'pitcher' && !String(p.slot || '').startsWith('BN'))
    .sort((a, b) => tier(a) - tier(b) || (a.rest || 0) - (b.rest || 0) || (RELIEF.indexOf(a.slot) - RELIEF.indexOf(b.slot)) || b.overall - a.overall);
  const usage = engineUsage(team.usage);
  let closerId = team.closerId || null;
  if (team.usage?.bullpenAce && pitchers.length > 2) { // 선발 다음에 가장 강한 불펜이 나와 길게 던진다
    const pv = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75) + st(p, 'stability', 75)) / 3;
    const [ace, ...pen] = pitchers;
    pitchers = [ace, ...pen.sort((a, b) => pv(b) - pv(a))];
    closerId = null;
  }
  return { name: team.name, batters, pitchers: pitchers.length ? pitchers : batters.slice(0, 1), catcher: roster.find((p) => p.position === 'C'), usage, closerId, buff: team.buff || 0, edge: team.edge || null };
}

/* 속도는 셋뿐이다 — 보통 · 자동(안 묻고 끝까지) · 스킵. 그 위에 "꾹 누르는 동안만" 빨리감기가 얹힌다 */
const PLAY = 1;
const SKIP = 0; // 배속이 아니라 "남은 경기를 목표 시간 안에 끝내기" — skipSpeed 가 공마다 배속을 다시 잡는다
const HOLD = 5; // 화면을 꾹 누르거나 스페이스바를 누르고 있는 동안
const MODES = [['1×', PLAY], ['2×', 2], ['3×', 3], ['스킵', SKIP]];
const COUNT_MS = 750; // 공 하나 사이 — 투구가 늘 같은 속도라 이만큼은 있어야 공이 다 온다
const RESULT_MS = 2400; // 타석이 끝나는 공 — 여기에 시간을 몰아준다
const BIG_MS = 3200; // 홈런 · 병살 · 삼진처럼 큰 결과
const BIG = ['HR', '3B', '2B', 'K', 'DP']; // 시간을 더 주는 결과
const OURS = '#10b981';   // 우리 쪽 구역 테두리
const THEIRS = '#f87171'; // 상대 쪽 구역 테두리
const WATCH_MARK = 0.09; // 이 무게부터는 공마다 본다 — 경기당 22 타석쯤
const BRIEF_MS = 1800;   // 볼거리 있는 타석 — 타구만 한 번
const FLASH_MS = 620;    // 그 밖 — 결과 한 줄
const RUSH_MS = 80;     // 접은 타석에서 공 하나가 지나가는 간격
const WORTH = ['HR', '3B', '2B', 'DP', 'E']; // 접어도 타구는 보여 주는 결과
const SKIP_MS = 8500; // SKIP 을 누른 뒤 경기가 끝나기까지 — 종료 자막까지 더해 10초 안쪽
const MS_PER_OUT = 4500; // 1X 기준 아웃 하나에 드는 시간 — 남은 경기 길이를 어림잡는 데 쓴다

/**
 * SKIP 배속: 남은 아웃카운트로 남은 길이를 어림잡아 목표 시각(endAt)에 맞춘다.
 * 공마다 다시 재니 어림이 빗나가도 스스로 따라잡는다.
 * 남은 아웃은 9이닝이 아니라 **연장까지 간 가장 긴 경기**(maxInnings)로 잡는다 — 늘 일정보다 조금 앞서 달려서
 * 끝에서 굼떠지지 않고, 연장에 들어가도 목표 시간을 넘기지 않는다. 하한 3.5 아래로는 내려가지 않는다.
 */
function skipSpeed(g, endAt) {
  const outsDone = ((g.inning - 1) * 2 + (g.top ? 0 : 1)) * 3 + g.outs;
  const outsLeft = Math.max(1, g.maxInnings * 6 - outsDone);
  const left = Math.max(250, endAt - Date.now());
  return Math.min(400, Math.max(3.5, (outsLeft * MS_PER_OUT) / left));
}

/* ───────── 해설 문장 ───────── */
const FIELD_KO = { P: '투수', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', LF: '좌익수', CF: '중견수', RF: '우익수' };
/** 줄의 결 — 득점 · 장타 · 아웃 · 그 밖. 색과 굵기가 여기서 갈린다 */
const KIND_TONE = { run: '#fde047', hit: '#34d399', out: '#94a3b8', note: '#60a5fa', plain: '#cbd5e1' };
function kindOf(ev) {
  if (!ev) return 'note';
  if (ev.runs > 0 || ev.result === 'HR') return 'run';
  if (['1B', '2B', '3B', 'BB', 'E'].includes(ev.result)) return 'hit';
  if (['K', 'GO', 'FO', 'LO', 'DP', 'SF', 'SAC', 'BH'].includes(ev.result)) return 'out';
  return 'plain';
}
let lineSeq = 0;
/** 화면에 쌓을 한 줄 */
const lineOf = (text, kind = 'plain', g = null) => ({
  id: (lineSeq += 1), text, kind,
  at: g ? `${g.inning}${g.top ? '초' : '말'}` : '',
});
const KEEP = 14; // 남겨 두는 줄 수
export const TACTIC_CHANGES = 3; // 경기 중 전술을 바꿀 수 있는 횟수 (공수 교대 때 먹는다)

function commentary(ev) {
  const b = ev.batter?.name || '타자';
  const p = ev.pitch ? `${PITCHES[ev.pitch.type].name} ${ev.pitch.velo}km` : '';
  const out = [];
  if (ev.swapped) out.push(`${ev.swapped.out.name} 체력 한계 — ${ev.swapped.in.name} 교체`);
  if (ev.steal) out.push(`${ev.steal.runner.name}, ${ev.steal.from + 2}루 도루 ${ev.steal.ok ? '성공' : '실패'}`);
  if (!ev.result) {
    const call = { ball: '볼', called: '루킹 스트라이크', swinging: '헛스윙!', foul: '파울' }[ev.call];
    if (call) out.push(`${p} — ${call}. ${ev.after.balls}볼 ${ev.after.strikes}스트라이크`);
    return out;
  }
  const r = ev.result;
  // 실제 타구가 간 곳을 그대로 부른다 (ev.hit)
  const dir = ev.hit ? dirName(ev.hit.dir) : null;
  const by = ev.hit?.by ? FIELD_KO[ev.hit.by] : null;
  if (r === 'HR') out.push(`${b}, ${dir ? `${dir} ` : ''}담장 밖으로 · ${ev.runs}점 홈런`);
  else if (r === '3B') out.push(`${b}, ${dir ? `${dir} ` : ''}가르는 3루타`);
  else if (r === '2B') out.push(`${b}, ${dir ? `${dir} ` : ''}2루타${ev.runs ? ` · ${ev.runs}명 득점` : ''}`);
  else if (r === '1B') out.push(`${b}, ${by ? `${by} 앞 ` : '깨끗한 '}안타${ev.runs ? ` · ${ev.runs}점` : ''}`);
  else if (r === 'BB') out.push(`${b}, 볼넷${ev.runs ? ' · 밀어내기 득점' : ''}`);
  else if (r === 'IBB') out.push(`${b}, 고의사구 · 1루 채움`);
  else if (r === 'K') out.push(`${p} — ${b} 삼진`);
  else if (r === 'DP') out.push(`${b}, 병살타 · 이닝 종료`);
  else if (r === 'SF') out.push(`${b}, 희생플라이 · 3루 주자 득점`);
  else if (r === 'SAC') out.push(`${b}, 희생번트 · 주자 진루`);
  else if (r === 'BH') out.push(`${b}, 기습 번트 안타!`);
  else if (r === 'E') out.push(`${b}, 평범한 타구 · 수비 실책으로 출루`);
  else if (r === 'CS') out.push('도루 실패 · 이닝 종료');
  else if (r === 'GO') out.push(`${b}, ${by ? `${by} 앞 ` : ''}땅볼 아웃`);
  else if (r === 'FO') out.push(`${b}, ${by ? `${by} ` : ''}뜬공 아웃`);
  else if (r === 'LO') out.push(`${b}, ${by ? `${by} 정면 ` : ''}직선타 아웃`);
  else out.push(`${b}, ${RESULT_LABEL[r]}`);
  return out;
}

/* ───────── 작은 부품 ───────── */

/** 지금 타석에서 지나간 공들 — 뒤에서부터 앞 타석의 마지막 공을 만날 때까지 */
function atBatPitches(events) {
  const out = [];
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (out.length && e.result) break;
    if (e.pitch) out.unshift(e);
  }
  return out;
}

const PITCH_KO = { fast: '직구', slider: '슬라이더', change: '체인지업' };
const CALL_KO = { ball: '볼', called: '스트라이크', swinging: '헛스윙', foul: '파울', inplay: '인플레이', ibb: '고의사구' };
const CALL_TONE = { ball: '#34d399', called: '#fde047', swinging: '#fde047', foul: '#94a3b8', inplay: '#fff', ibb: '#34d399' };
/** 코스 한 마디 — 존 반폭·반높이를 1 로 잰 자리에서 */
function courseKo(x, y) {
  const lr = x < -0.55 ? '몸쪽' : x > 0.55 ? '바깥쪽' : '가운데';
  const ud = y < -0.55 ? '높게' : y > 0.55 ? '낮게' : '';
  return ud ? `${lr} ${ud}` : lr;
}

/** 스트라이크존 — 지나간 공은 번호 붙은 테, 지금 공은 흰 점. x · y 는 존 반폭 · 반높이가 1 */
const ZONE_CLAMP = 1.55; // 존 반폭의 이만큼까지만 — 더 빠진 공도 판 안에 그린다
const ZoneBox = ({ shots, w = 150 }) => {
  const pad = 0.42; // 존 밖으로 빠진 공이 담길 여유
  const V = 100;
  const box = V / (1 + pad * 2);
  const o = (V - box) / 2;
  const plate = 0;
  const at = (x, y) => {
    const cx = Math.max(-ZONE_CLAMP, Math.min(ZONE_CLAMP, x));
    const cy = Math.max(-ZONE_CLAMP, Math.min(ZONE_CLAMP, y));
    return [o + box / 2 + (cx * box) / 2, o + box / 2 + (cy * box) / 2];
  };
  const now = shots[shots.length - 1];
  return (
    <svg width={w} height={Math.round((w * (V + plate)) / V)} viewBox={`0 0 ${V} ${V + plate}`}>
      <rect x={o} y={o} width={box} height={box} fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" />
      {[1, 2].map((i) => (
        <g key={i} stroke="rgba(255,255,255,.2)" strokeWidth="1">
          <line x1={o + (box / 3) * i} y1={o} x2={o + (box / 3) * i} y2={o + box} />
          <line x1={o} y1={o + (box / 3) * i} x2={o + box} y2={o + (box / 3) * i} />
        </g>
      ))}
      {shots.slice(0, -1).map((p, i) => {
        const [cx, cy] = at(p.x, p.y);
        return (
          <g key={i} opacity="0.4">
            <circle cx={cx} cy={cy} r="4.3" fill="rgba(5,8,15,.4)" stroke="rgba(255,255,255,.55)" strokeWidth="1.1" />
            <text x={cx} y={cy + 2} textAnchor="middle" fontSize="5.4" fontWeight="700" fill="rgba(255,255,255,.7)">{i + 1}</text>
          </g>
        );
      })}
      {now && (() => {
        const [cx, cy] = at(now.x, now.y);
        return (
          <g key={shots.length}>
            <circle className="mt-zpulse" cx={cx} cy={cy} r="9" fill="none" stroke={now.tone} strokeWidth="2" />
            <g className="mt-zhit">
              <circle cx={cx} cy={cy} r="9" fill={`${now.tone}33`} />
              <circle cx={cx} cy={cy} r="4.6" fill="#fff" stroke={now.tone} strokeWidth="1.9" />
            </g>
          </g>
        );
      })()}
    </svg>
  );
};

/** 승률 알약 — 구장 위 가운데. 왼쪽이 우리(% · 움직임), 오른쪽이 상대 */
const WinBar = ({ p, prev, mine, opp }) => {
  const pct = Math.round(p * 100);
  const move = Math.round((p - prev) * 100);
  return (
    <div className="mt-cut mt-glass pointer-events-none absolute left-1/2 top-4 flex w-[460px] -translate-x-1/2 items-center gap-3 px-4 py-2.5" style={{ '--c': '16px' }}>
      <span className="text-t4 text-gray-300">우리</span>
      <b className="font-display text-t2 font-black leading-none" style={{ color: mine }}>{pct}%</b>
      {move !== 0 && (
        <b className="font-display text-t3 font-extrabold" style={{ color: move > 0 ? '#34d399' : '#f87171' }}>{move > 0 ? '▲' : '▼'}{Math.abs(move)}</b>
      )}
      <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <i className="block h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: mine }} />
        <i className="block h-full flex-1" style={{ background: tint(opp, 70) }} />
      </span>
      <b className="font-display text-t2 font-extrabold leading-none text-white/70">{100 - pct}%</b>
    </div>
  );
};

/** 승률 흐름 — 타석마다 찍은 점을 잇는다. 가운데 선이 반반 */
const WinLine = ({ log, mine, w = 268, h = 66 }) => {
  const xs = log.length > 1 ? log : [...log, ...log];
  const step = w / (xs.length - 1);
  const y = (v) => h - v * h;
  const d = xs.map((v, i) => `${i ? 'L' : 'M'} ${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const fill = `${d} L ${w} ${h / 2} L 0 ${h / 2} Z`;
  return (
    <svg width={w} height={h} className="block">
      <rect x="0" y="0" width={w} height={h} fill="rgba(255,255,255,.03)" />
      <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="rgba(255,255,255,.22)" strokeWidth="1" strokeDasharray="3 3" />
      <path d={fill} fill={tint(mine, 18)} />
      <path d={d} fill="none" stroke={mine} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={w} cy={y(xs[xs.length - 1])} r="3.6" fill="#fff" stroke={mine} strokeWidth="2" />
    </svg>
  );
};

/** 주루 — 중계처럼 선도 홈도 없이 1 · 2 · 3루 마름모 셋만. note 를 주면 마름모 아래 안쪽에 작게 적는다 */
export const Diamond = ({ bases, size = 68, off = 'rgba(0,0,0,.16)', note = null, ink = 'rgba(11,18,32,.72)', edge = null }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    {[[74, 55], [50, 31], [26, 55]].map(([x, y], i) => (
      <rect key={i} x={x - 13} y={y - 13} width="26" height="26" rx="3" transform={`rotate(45 ${x} ${y})`}
        fill={bases[i] ? '#f97316' : 'transparent'} stroke={bases[i] ? 'none' : (edge || off)} strokeWidth={bases[i] ? 0 : 1.6} />
    ))}
    {note != null && (
      <text x="50" y="94" textAnchor="middle" fontFamily="'Saira Condensed', sans-serif" fontSize="20" fontWeight="800" fill={ink}>{note}</text>
    )}
  </svg>
);
/** 볼 · 스트라이크 · 아웃 세 줄. label 을 끄면 점만 남는다 (색으로 구분) */
export const Bso = ({ b, s, o, label = true, dot = 11, off = 'rgba(255,255,255,.45)', lab = '', gap = 4, rowGap = 3, font = 11, popOut = -1 }) => (
  <div className="grid items-center font-display font-extrabold"
    style={{ gridTemplateColumns: `${label ? font + 2 : 0}px repeat(3, ${dot}px)`, gap, rowGap, fontSize: font }}>
    {label ? <span className={`flex items-center justify-center leading-none ${lab || 'text-emerald-400'}`} style={{ height: dot }}>B</span> : <span />}
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < b ? '#22c55e' : 'transparent', border: i < b ? 'none' : `1.5px solid ${off}`, boxSizing: 'border-box' }} />)}
    {label ? <span className={`flex items-center justify-center leading-none ${lab || 'text-yellow-300'}`} style={{ height: dot }}>S</span> : <span />}
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < s ? '#facc15' : 'transparent', border: i < s ? 'none' : `1.5px solid ${off}`, boxSizing: 'border-box' }} />)}<span />
    {label ? <span className={`flex items-center justify-center leading-none ${lab || 'text-red-400'}`} style={{ height: dot }}>O</span> : <span />}
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < o ? '#ef4444' : 'transparent', border: i < o ? 'none' : `1.5px solid ${off}`, boxSizing: 'border-box',
      /* 방금 늘어난 아웃은 한 번 크게 튄다 */
      ...(i === popOut ? { animation: 'outPop .5s ease-out', boxShadow: '0 0 14px #ef4444' } : null) }} />)}<span />
  </div>
);
/** 능력치 줄 — 내 라커와 같은 규칙: 6px 막대 · 낮으면 푸른 회색 → 높을수록 구단 색, 빛 번짐 없음 */
/* ───────── 본체 ───────── */
export default function BroadcastGame({ my, opp, onFinish, onExit, aug = null, rebuildMy = null, midPickInnings = [], onMidPick = null, bg = undefined, seed = null, autoOnExit = false }) {
  const home = useMemo(() => engineTeam(my), [my]);
  const away = useMemo(() => engineTeam(opp), [opp]);
  const gameRef = useRef(null);
  // 시드를 주면 같은 시드 · 같은 지시에서 같은 경기 — 대전 기록 · 검증의 바탕
  if (!gameRef.current) gameRef.current = createGame({ home, away, rng: seed != null ? seeded(seed) : Math.random });
  const g = gameRef.current;

  const [, force] = useState(0);
  const redraw = () => force((v) => v + 1);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  /* 승률 — 타석마다 한 점씩 찍어 흐름을 만든다. 내 지시가 얼마나 밀어 올렸는지도 센다 */
  const wpRef = useRef([0.5]);
  const wpAtRef = useRef([{ i: 1, t: true, r: 0 }]); // 승률 점마다 몇 회 · 초말 · 그 타석 득점
  const wpAt = useRef(0.5); // 이번 타석이 시작될 때의 승률
  const gainRef = useRef(0); // 내 지시가 만든 승률 변화의 합
  const callsRef = useRef([]); // 내가 낸 지시 하나하나 — 어디서 얼마나 움직였나
  const spotRef = useRef({ inning: 1, top: true }); // 이번 타석이 선 자리
  /*
   * 전술 — 정비에서 고른 세 갈래로 시작한다. 경기 중에 바꾸면 '다음 공수 교대'에 먹고, 한 번 먹을 때마다 1회를 쓴다(경기당 TACTIC_CHANGES).
   * 공마다 만지는 조작이 아니라, 흐름을 보고 몇 번 크게 트는 선택으로 — 승부처 지시(CLUTCH_LIMIT)와 같은 무게.
   * 첫 공 전에는 정비의 연장이라 바로 먹고 횟수도 쓰지 않는다.
   */
  const [sides, setSides] = useState(my?.plan?.sides || DEFAULT_SIDES);
  const sidesRef = useRef(sides);
  sidesRef.current = sides;
  const fineRef = useRef(planOfSides(sides).fine);
  fineRef.current = planOfSides(sides).fine;
  const [tacQ, setTacQ] = useState({}); // 다음 공수 교대에 먹을 전술 { off?, mound?, def? }
  const queuedRef = useRef(tacQ);
  queuedRef.current = tacQ;
  const [tacticsLeft, setTacticsLeft] = useState(TACTIC_CHANGES);
  const tacticsLeftRef = useRef(tacticsLeft);
  tacticsLeftRef.current = tacticsLeft;
  const pickSide = (key, id) => {
    const g0 = gameRef.current;
    if (!g0.events.length) { setSides((v) => ({ ...v, [key]: id })); return; } // 첫 공 전: 바로
    setTacQ((q) => {
      const next = { ...q };
      if (id === sidesRef.current[key]) delete next[key]; else next[key] = id; // 지금 것으로 되돌리면 예약 취소
      return next;
    });
  };
  /** 공수 교대 — 예약한 전술이 있으면 이제 먹는다 */
  const applyQueued = () => {
    const q = queuedRef.current;
    if (!Object.keys(q).length || tacticsLeftRef.current <= 0) { if (Object.keys(q).length) setTacQ({}); return; }
    const next = { ...sidesRef.current, ...q };
    sidesRef.current = next;
    fineRef.current = planOfSides(next).fine;
    setSides(next);
    setTacQ({});
    setTacticsLeft((n) => n - 1);
  };
  const [openSide, setOpenSide] = useState(null); // 펼쳐 둔 전술 갈래
  const [digest, setDigest] = useState(true); // 요약 — 승부처가 아닌 타석은 접는다
  const digestRef = useRef(true);
  digestRef.current = digest;
  const [zoneShots, setZoneShots] = useState([]); // 존 판에 찍힌 공 — 구장에 공이 닿을 때 함께 찍힌다
  const [count, setCount] = useState({ b: 0, s: 0, o: 0 }); // 볼·스트라이크·아웃 — 공이 꽂힐 때 오른다
  const [lines, setLines] = useState([lineOf('플레이볼!', 'note')]);
  const [flash, setFlash] = useState(null); // 큰 결과 자막
  const [swap, setSwap] = useState(null); // 공수 교대 띠
  const [rush, setRush] = useState(false); // 접은 타석을 흘려보내는 중
  const sideRef = useRef({ inning: 1, top: true }); // 지금 반 이닝 — 바뀌면 교대를 알린다
  const outsRef = useRef(0); // 아웃이 늘면 표시가 한 번 튄다
  const [play, setPlay] = useState(null); // 지금 화면에서 재생 중인 공 { ev, ms }
  const pendingRef = useRef({}); // 다음 공에 실릴 지시
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  const aliveRef = useRef(true);
  const endedRef = useRef(false); // 결과를 한 번만 넘기도록
  speedRef.current = speed;
  pausedRef.current = paused;
  /** 결과를 위로 넘긴다 — 두 번 불러도 한 번만 */
  const handOver = () => {
    if (endedRef.current) return false;
    endedRef.current = true;
    onFinish?.(buildResult(g, my, { flow: wpRef.current, flowAt: wpAtRef.current, calls: callsRef.current, gain: gainRef.current, sides: sidesRef.current }));
    return true;
  };
  /*
   * 남은 경기를 자동으로 끝까지 — 전술판 기울기 · AI 투수 교체만으로 한 번에 계산하고 결과를 넘긴다.
   * 랭크전은 도중에 나가도 결과가 남는다(지는 경기를 버리고 다시 하지 못하게)
   */
  const autoFinish = () => {
    aliveRef.current = false; // 중계 루프를 세운다
    if (clutchRef.current) { const done = clutchRef.current; clutchRef.current = null; setClutch(null); done({}); }
    playOut(g, () => tacticOrders(fineRef.current, !g.top, g.rng));
    redraw();
    handOver();
  };
  const [leaving, setLeaving] = useState(false); // 자동 진행 확인 중
  /* 나가기: 경기가 이미 끝났으면 결과를 넘기고 나간다 (이닝 정리 화면을 안 거쳐도 전적이 남게). 자동 진행 모드는 한 번 묻는다 */
  const leave = () => {
    if (g.final) { if (!handOver()) onExit?.(); return; }
    if (autoOnExit) { setLeaving(true); return; }
    onExit?.();
  };
  const skipEndRef = useRef(0); // SKIP 을 누른 시각 + SKIP_MS — 이 시각에 맞춰 배속을 잡는다
  const beforeSkipRef = useRef(PLAY); // SKIP 을 누르기 전 배속 — 한 번 더 누르면 여기로 돌아온다
  const holdRef = useRef(false); // 꾹 누르고 있는 중
  const [holding, setHolding] = useState(false);
  const [clutch, setClutch] = useState(null); // 승부처 — 경기를 멈추고 아래 작전 줄에서 지시를 받는다
  const clutchColor = '#fbbf24';
  const clutchRef = useRef(null);
  const clutchLeft = useRef(CLUTCH_LIMIT); // 이 경기에 남은 개입 횟수
  const lastAskHalf = useRef(''); // 한 반이닝에 한 번만 묻는다
  const curSpeed = () => {
    if (speedRef.current === SKIP) return skipSpeed(g, skipEndRef.current);
    if (holdRef.current) return HOLD;
    return speedRef.current;
  };
  /** 몰아서 넘기는 중인가 — 스킵 · 꾹 누르는 중 */
  const quiet = () => speedRef.current === SKIP || holdRef.current;
  const flashMs = () => (quiet() ? 300 : 1400); // 몰아서 넘길 땐 자막도 짧게
  /** 속도 고르기. SKIP 은 목표 시각을 새로 잡고, 지시를 기다리던 중이면 정면 승부로 넘긴다.
   *  SKIP 중에 SKIP 을 다시 누르면 누르기 전 배속으로 돌아온다 */
  const pickSpeed = (v) => {
    if (v === SKIP) {
      if (speedRef.current === SKIP) { setSpeed(beforeSkipRef.current); return; }
      beforeSkipRef.current = speedRef.current;
      skipEndRef.current = Date.now() + SKIP_MS;
    }
    setSpeed(v);
  };
  /* 꾹 누르기 — 누르는 동안만 5배속 + 자동. 버튼 위에서는 안 잡고, 창을 벗어나면 반드시 풀린다 */
  const hold = (on) => {
    if (holdRef.current === on) return;
    holdRef.current = on;
    setHolding(on);
  };
  useEffect(() => {
    const off = () => hold(false);
    const down = (e) => { if (e.code === 'Space' && !e.repeat && !clutchRef.current) { e.preventDefault(); hold(true); } };
    const up = (e) => { if (e.code === 'Space') { e.preventDefault(); hold(false); } };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', off);
    document.addEventListener('visibilitychange', off);
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', off); document.removeEventListener('visibilitychange', off);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // StrictMode 로 두 번 마운트돼도 살아 있게 (마운트마다 다시 켠다)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  // 경기 루프
  useEffect(() => {
    let stop = false;
    aliveRef.current = true;
    (async () => {
      await sleep(600);
      /* 한 이닝에 한 번만 묻는다 — 화면이 두 번 올라와도(개발 모드) 증강 판이 겹쳐 뜨지 않게 */
      const askedAt = aug ? (aug.askedAt || (aug.askedAt = new Set())) : new Set();
      /* 플레이볼 직후 한 장 — 아래 이닝 넘김 판정은 1회를 잡지 못한다 */
      if (!stop && aliveRef.current && midPickInnings.includes(1) && onMidPick && !askedAt.has(1)) {
        askedAt.add(1);
        const first = await onMidPick(1);
        if (first && aliveRef.current) {
          const nextMy = rebuildMy?.(first);
          if (nextMy) replaceTeam(g.home, engineTeam(nextMy));
          aug.update(first, nextMy);
          redraw();
        }
      }
      let half = { inning: g.inning, top: g.top, home: g.home.runs, away: g.away.runs };
      let inningNo = g.inning; // 지금 진행 중인 이닝
      let evAt = 0; // 이 이닝이 시작된 시점의 events 인덱스
      aug?.beforeHalf(g);
      while (!g.final && !stop && aliveRef.current) {
        while ((pausedRef.current || clutchRef.current) && !stop) await sleep(100);
        if (stop || g.final) break;
        // 적 수비(내 공격) 중이면 AI 감독이 투수를 바꾼다
        if (!g.top) {
          const change = aiPitchingChange(g, g.away);
          if (change) {
            pendingRef.current = { ...pendingRef.current, changePitcher: change };
            const next = typeof change === 'string' ? g.away.team.pitchers.find((p) => p.id === change) : g.away.team.pitchers[g.away.pitcherIdx + 1];
            const text = next && `${away.name} 투수 교체 — ${g.away.pitcher?.name} → ${next.name}`; // 교체 전에 글을 만들어 둔다
            if (text) setLines((l) => [...l, lineOf(text, 'note', g)].slice(-KEEP));
          }
        }
        /* 승부처에서만 멈춘다 — 한 반이닝에 한 번, 경기당 CLUTCH_LIMIT 번까지 */
        const halfKey = `${g.inning}${g.top ? 'T' : 'B'}`;
        let asked = false; // 물어본 타석은 접지 않고 공마다 본다
        if (!quiet() && clutchLeft.current > 0 && lastAskHalf.current !== halfKey
            && g.balls === 0 && g.strikes === 0 && isClutch(g)) {
          asked = true;
          lastAskHalf.current = halfKey;
          clutchLeft.current -= 1;
          const picked = await new Promise((resolve) => {
            clutchRef.current = resolve;
            setClutch(askOf(g, home, away, clutchLeft.current, resolve));
          });
          clutchRef.current = null;
          setClutch(null);
          if (picked) pendingRef.current = { ...pendingRef.current, ...picked };
          if (stop || !aliveRef.current) break;
        }
        /* 승부처가 아닌 타석은 통째로 돌려 한 컷으로 접는다 — 볼 값어치가 있을 때만 공마다 본다 */
        const fresh = g.balls === 0 && g.strikes === 0;
        if (fresh) { wpAt.current = winProb(g); spotRef.current = { inning: g.inning, top: g.top }; }
        const ordered = Object.keys(pendingRef.current).length > 0;
        const gave = asked || ordered; // 이 타석에 지시를 냈다
        const gaveKo = ordered ? orderKo(pendingRef.current).join(' · ') : null;
        const fold = digestRef.current && fresh && !asked && leverage(g) < WATCH_MARK;
        const wasOn = fold ? [...g.bases] : null; // 접은 타석의 타구는 타석 전 주자 위로 그린다
        let ev;
        const folded = []; // 접은 타석에서 지나간 공 — 빨리 흘려보낼 것들
        try {
          /* 전술 성향은 늘 깔리고, 내가 낸 지시가 그 위에 얹힌다 */
          const tac = () => ({ ...tacticOrders(fineRef.current, !g.top, g.rng), ...pendingRef.current });
          if (fold) { do { ev = pitch(g, tac()); if (ev) folded.push(ev); } while (ev && !ev.result && !g.final); }
          else ev = pitch(g, tac());
        } catch (err) { console.error('pitch 실패', err); break; }
        pendingRef.current = pendingRef.current.guess ? { guess: pendingRef.current.guess } : {};
        if (!ev) break;
        /* 접은 타석: 볼거리가 있으면 타구만, 아니면 결과 한 줄 */
        const worth = fold && (WORTH.includes(ev.result) || ev.runs > 0);
        const beat = (fold ? (worth ? BRIEF_MS : FLASH_MS)
          : ev.result ? (BIG.includes(ev.result) ? BIG_MS : RESULT_MS) : COUNT_MS) / curSpeed();
        /* 결과가 드러나는 때 — 친 공은 타구가 지나간 뒤, 그 밖에는 공이 미트에 꽂힐 때 */
        const told = fold ? (worth ? beat * 0.5 : 0) : beat * (ev.call === 'inplay' ? 0.72 : pitchArrival(beat) + 0.03);
        const swaps = folded.slice(0, -1).filter((e) => e.swapped)
          .map((e) => lineOf(`${e.swapped.out.name} 체력 한계 — ${e.swapped.in.name} 교체`, 'note', g));
        const said = [...swaps, ...commentary(ev).map((t) => lineOf(t, kindOf(ev), g))];
        setTimeout(() => { if (aliveRef.current) setLines((l) => [...l, ...said].slice(-KEEP)); }, told);
        if (fold) {
          /* 결과까지 가는 공들은 빨리감기처럼 흘려보낸다 — 그냥 건너뛰면 넘어간 줄 모른다.
             존 판과 볼카운트도 같이 달려야 공이 지나갔다는 것이 읽힌다 */
          if (folded.length > 1) {
            setRush(true);
            const step = Math.max(35, RUSH_MS / curSpeed());
            for (let i = 0; i < folded.length - 1; i += 1) {
              if (stop || !aliveRef.current) break;
              const e = folded[i];
              setPlay({ ev: e, ms: step * 3, bases: wasOn });
              setZoneShots(folded.slice(0, i + 1).map(shotOf));
              setCount({ b: e.after.balls, s: e.after.strikes, o: e.after.outs });
              await sleep(step);
            }
            setRush(false);
          }
          setPlay({ ev, ms: beat, bases: wasOn });
          setZoneShots(shotsOf(g));
          setCount({ b: 0, s: 0, o: g.outs });
        } else {
          setPlay({ ev, ms: beat }); // 플레이 뷰가 이 공을 그 시간 동안 재생한다
          /* 존 판은 구장에 공이 닿는 때에 함께 찍는다 — 먼저 뜨면 김이 샌다 */
          setTimeout(() => { if (aliveRef.current) setZoneShots(shotsOf(g)); }, beat * pitchArrival(beat));
          /* 볼카운트도 같은 때에 — 친 공은 처리가 끝난 뒤에 아웃이 오른다 */
          setTimeout(() => { if (aliveRef.current) setCount({ b: g.balls, s: g.strikes, o: g.outs }); },
            beat * (ev.call === 'inplay' ? 0.72 : pitchArrival(beat)));

        }
        if (ev.result && BIG.includes(ev.result)) {
          setTimeout(() => { if (aliveRef.current) { setFlash({ text: ev.result === 'HR' ? '홈런!' : RESULT_LABEL[ev.result], key: Date.now() }); setTimeout(() => setFlash(null), flashMs()); } }, told);
        }
        if (ev.result) {
          const wpNow = winProb(g);
          wpRef.current = [...wpRef.current, wpNow].slice(-200);
          wpAtRef.current = [...wpAtRef.current, { i: ev.inning, t: !!ev.top, r: ev.runs || 0 }].slice(-200);
          if (gave) gainRef.current += wpNow - wpAt.current;
          if (gaveKo) callsRef.current.push({ ...spotRef.current, ko: gaveKo, delta: wpNow - wpAt.current });
        }
        redraw();
        await sleep(beat);

        // 반 이닝이 넘어갔으면: 증강의 이닝 점수 보정 → 경기 중 증강 선택 → 다음 반 이닝 보정
        if (aug && (g.inning !== half.inning || g.top !== half.top || g.final)) {
          const before = half.top ? half.away : half.home;
          const scored = (half.top ? g.away.runs : g.home.runs) - before;
          const res = aug.afterHalf(g, scored, half.inning, half.top);
          if (res.texts.length) {
            setLines((l) => [...l, ...res.texts.map((t) => lineOf(`[증강: ${t.name}] ${t.text}`, 'note', g))].slice(-KEEP));
            const t = res.texts[res.texts.length - 1];
            setFlash({ text: t.name, key: Date.now() });
            setTimeout(() => setFlash(null), flashMs());
            redraw();
            await sleep(900 / curSpeed());
          }
          if (g.final) g.winner = g.home.runs > g.away.runs ? 'home' : g.away.runs > g.home.runs ? 'away' : 'draw';
          // 새 이닝이 시작될 때 그 경기에서만 쓰는 증강을 하나 더
          if (!g.final && g.top && g.inning !== half.inning && midPickInnings.includes(g.inning) && onMidPick && !askedAt.has(g.inning)) {
            askedAt.add(g.inning);
            const picked = await onMidPick(g.inning);
            if (picked && aliveRef.current) {
              const nextMy = rebuildMy?.(picked);
              if (nextMy) replaceTeam(g.home, engineTeam(nextMy));
              aug.update(picked, nextMy);
              redraw();
            }
          }
          half = { inning: g.inning, top: g.top, home: g.home.runs, away: g.away.runs };
          aug.beforeHalf(g);
        }

        /* 공수 교대 — 띠가 쓸고 지나가며 이번엔 누가 치는지 알린다 */
        if (!g.final && (g.top !== sideRef.current.top || g.inning !== sideRef.current.inning)) {
          sideRef.current = { inning: g.inning, top: g.top };
          applyQueued();
          setCount({ b: 0, s: 0, o: 0 });
          setLines((l) => [...l, lineOf(`${g.inning}회${g.top ? '초' : '말'} — ${!g.top ? '우리 공격' : '우리 수비'} · ${g.away.runs} : ${g.home.runs}`, 'half', g)].slice(-KEEP));
          setSwap({ key: Date.now(), mine: !g.top, inning: g.inning, top: g.top });
          redraw();
          await sleep(1150 / curSpeed());
          if (aliveRef.current) setSwap(null);
        }

        // 이닝이 넘어가면 자막만 스치고 지나간다 — 멈추는 자리는 승부처뿐이다
        if (g.inning !== inningNo || g.final) {
          const shown = inningNo;
          evAt = g.events.length;
          inningNo = g.inning;
          if (!quiet() && !g.final) {
            setFlash({ text: `${shown}회 종료 · ${g.away.runs} : ${g.home.runs}`, key: Date.now() });
            setTimeout(() => setFlash(null), flashMs());
            await sleep(900 / curSpeed());
          }
        }
      }
      if (g.final && aliveRef.current) {
        redraw();
        setLines((l) => [...l, lineOf(`경기 종료 — ${home.name} ${g.home.runs} : ${g.away.runs} ${away.name}`, 'note')].slice(-KEEP));
        await sleep(quiet() ? 300 : 700);
        handOver();
      }
    })();
    return () => { stop = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const off = offenseOf(g);
  const def = defenseOf(g);
  const fielders = (() => {
    const men = def.team?.batters || [];
    const of = men.filter((p) => p.position === 'OF').sort((a, b) => b.overall - a.overall);
    const one = (pos) => men.find((p) => p.position === pos) || null;
    return {
      P: def.pitcher || null, C: def.team?.catcher || one('C'),
      '1B': one('1B'), '2B': one('2B'), '3B': one('3B'), SS: one('SS'),
      LF: of[0] || null, CF: of[1] || null, RF: of[2] || null,
    };
  })();
  const offFlag = g.top ? teamFlag(away.name) : flagByKey(myBanner()); // 공격 팀 색
  const pitcher = pitcherOf(g);
  const myIsHome = true;
  const cMy = '#34d399';
  const cOpp = '#f87171';
  const battingColor = g.top ? cOpp : cMy;
  const pitchingColor = g.top ? cMy : cOpp;
  const mix = pitchMix(pitcher);
  const steal0 = stealOdds(g, 0);

  const give = (o) => {
    pendingRef.current = { ...pendingRef.current, ...o };
    /* 승부처에서 고른 것이면 그걸로 답하고 경기를 다시 굴린다 */
    if (clutchRef.current) { const done = clutchRef.current; clutchRef.current = null; setClutch(null); done(o); return; }
    redraw();
  };


  const stamina = staminaOf(def);
  // 내 투수가 지쳤는가 — 불펜 쪽으로 눈이 가게 한다
  const mineOnMound = g.top;
  const worn = mineOnMound && stamina <= 55;
  const spent = mineOnMound && stamina <= 35;
  const myPen = g.home.team.pitchers.slice(g.home.pitcherIdx + 1, g.home.pitcherIdx + 5);
  const canSwap = g.top && !g.final; // 내가 수비하는 회에만 마운드를 바꾼다
  const queued = pendingRef.current.changePitcher || null; // 다음 공에 올라갈 투수
  /* 아웃이 늘어난 그 점만 한 번 튀게 — 렌더마다 견주어 둔다 */
  const justOut = count.o > outsRef.current ? count.o - 1 : -1;
  outsRef.current = count.o;
  const mineBat = !g.top; // 내가 치는 회
  /* 구역 테두리는 팀 색이 아니라 우리 · 상대로 갈린다 — 회가 바뀌어도 헷갈리지 않게 */
  const offSide = mineBat ? OURS : THEIRS; // 타순 판 = 지금 치는 팀
  const defSide = mineBat ? THEIRS : OURS; // 투수 · 불펜 판 = 지금 막는 팀
  const pend = pendingRef.current; // 다음 공에 실릴 지시 — 누른 것이 보이게
  const on1 = !!g.bases[0]; const on2 = !!g.bases[1];
  /* 한 점이면 되는 자리인가 — 번트 · 도루는 여기서만 값이 선다 (여러 점을 노릴 땐 점수를 깎는다) */
  const onePoint = g.inning >= 7 && Math.abs(g.home.runs - g.away.runs) <= 1;
  /* 승부처에는 그 자리에서만 말이 되는 세 장으로 갈아 끼운다 */
  const PICKS = clutch ? playsFor(g, { mine: mineBat, tired: 1 - stamina / 100 }) : null;
  const batter = batterOf(g);
  const batterKo = todayKo(g, batter);
  const armLine = pitcherLine(g, pitcher); // 지금 투수의 오늘 기록
  // 이 타석에 지나간 공 — 존 반폭 · 반높이를 1 로 잰 자리
  const shots = zoneShots;
  const lastShot = shots[shots.length - 1];
  /* 승률 — 마지막 두 점으로 지금 값과 직전 값을 잡는다 */
  const wpLog = wpRef.current;
  const wpShow = wpLog[wpLog.length - 1] ?? 0.5;
  const wpWas = wpLog[wpLog.length - 2] ?? wpShow;
  const myGain = Math.round(gainRef.current * 100);

  return (
    <div className="fixed inset-0 z-40 select-none overflow-hidden bg-[#05080f] text-gray-200"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { if (!e.target.closest('button') && !clutch) hold(true); }}
      onPointerUp={() => hold(false)}
      onPointerCancel={() => hold(false)}
      onPointerLeave={() => hold(false)}
      onContextMenu={(e) => e.preventDefault()}>
      <UiStyle />
      <style>{CLUTCH_CSS}</style>
      <GlassBg tint={cOpp} />
      {/* 승부처에는 화면 가장자리에 빛이 돌아 딴 데 보고 있어도 눈에 든다 */}
      {clutch && (
        <span aria-hidden="true" className="pointer-events-none fixed inset-0 z-40"
          style={{ boxShadow: `inset 0 0 0 3px ${clutchColor}, inset 0 0 90px -20px ${clutchColor}`, animation: "clutchEdge 1.5s ease-in-out infinite" }} />
      )}

      <div className="relative grid h-full" style={{ gridTemplateRows: '72px 1fr' }}>
        {/* 헤더 */}
        <header className="relative flex items-center gap-5 px-7">
          <button type="button" onClick={leave} aria-label="나가기"
            className="mt-cut grid h-10 w-10 place-items-center bg-white/[0.07] text-t2 text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,.1)] hover:bg-white/[0.12]" style={{ '--c': '12px' }}>←</button>
          {leaving && (
            <Pop eyebrow="나가기" title="남은 경기 자동 진행" a="#fbbf24" width={460} onClose={() => setLeaving(false)}
              actions={<>
                <button type="button" className="mt-btn" onClick={() => setLeaving(false)}>계속 보기</button>
                <button type="button" className="mt-btn pri min-w-[180px]" style={{ '--a': '#fbbf24' }} onClick={() => { setLeaving(false); autoFinish(); }}>자동으로 끝내기</button>
              </>}>
              <p className="text-t3 text-gray-300">지금 점수에서 끝까지 · 결과 확정</p>
            </Pop>
          )}
          <div className="leading-none">
            <p className="text-t4 font-bold text-gray-400">플레이</p>
            <h1 className="mt-1 text-t2 font-black leading-none text-white">감독 모드</h1>
          </div>
          <span className="flex items-center gap-1.5 text-t4 font-bold text-red-400"><i className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-400 shadow-[0_0_8px_#f87171]" />중계</span>
          {/* 이 경기에 걸린 증강 — 정비 끝 1장 · 7회 1장 */}
          {aug?.list?.length > 0 && (
            <span className="flex min-w-0 items-center gap-1.5">
              {aug.list.map((a) => (
                <span key={a.id} title={a.desc} className="max-w-[200px] truncate rounded-full px-2.5 py-0.5 text-t4 font-bold"
                  style={{ color: '#f0abfc', background: 'rgba(232,121,249,.12)', boxShadow: 'inset 0 0 0 1px rgba(232,121,249,.45)' }}>
                  {a.name}{a.lv ? ` +${a.lv}` : ''}
                </span>
              ))}
            </span>
          )}
          {holding && (
            <span className="ml-auto flex items-center gap-2 rounded-full bg-[#fde047] px-3 py-1 font-display text-t3 font-extrabold text-[#05080f]">▶▶ 빨리감기</span>
          )}
          <div className={`mt-seg ${holding ? '' : 'ml-auto'}`}>
            {MODES.map(([label, v]) => (
              <button key={label} type="button" onClick={() => pickSpeed(v)} aria-pressed={speed === v}
                title={v === SKIP ? (speed === SKIP ? '한 번 더 누르면 원래 배속으로' : '남은 경기 10초 안에 몰아서 끝내기') : `${label} 속도 — 화면을 꾹 누르면 더 빨리감기`}
                className={`mt-segb font-display ${speed === v ? 'on' : ''}`} style={speed === v && v === SKIP ? { color: '#fde047' } : null}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={() => setDigest((v) => !v)} aria-pressed={digest}
            title={digest ? '승부처가 아닌 타석은 접어서 빠르게' : '모든 공을 하나하나 보여 준다'}
            className="mt-btn sm" style={digest ? { color: '#38bdf8', boxShadow: 'inset 0 0 0 1px rgba(56,189,248,.6)' } : null}>요약</button>
          <button type="button" onClick={() => setPaused((p) => !p)} className="mt-btn sm" style={paused ? { color: '#fbbf24' } : null}>{paused ? '계속 ▶' : '일시정지'}</button>
        </header>

        <div className="grid min-h-0 gap-4 px-6 pb-5" style={{ gridTemplateColumns: 'minmax(0,1fr) 440px' }}>
          {/* ── 왼쪽: 큰 구장 — 점수판 · 승률 · 타석 · 존을 겹쳐 올린다 ── */}
          <section className="mt-cut mt-frame relative min-h-0 bg-[#060c16]" style={{ '--c': '24px', '--a': '#10b981' }}>
            <PlayView event={play?.ev || null} beatMs={play?.ms || 1200} bg={bg}
              bases={play?.bases || g.bases} offColor={battingColor} defColor={pitchingColor} defense={fielders} batter={batter} />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.5),transparent 22%,transparent 72%,rgba(5,8,15,.7))' }} />

            {/* 승률 — 구장 위 가운데 */}
            <WinBar p={wpShow} prev={wpWas} mine={cMy} opp={cOpp} />

            {/* 점수판 — 회 · 두 팀 점수 · 주자 · 볼카운트 한 판 */}
            <div className="mt-cut mt-glass pointer-events-none absolute left-4 top-4 flex items-center" style={{ '--c': '18px' }}>
              <span className="flex shrink-0 flex-col items-center justify-center self-stretch px-4" style={{ background: 'rgba(255,255,255,.06)' }}>
                {g.final ? (
                  <b className="text-t3 font-extrabold text-white">경기 끝</b>
                ) : (
                  <>
                    <b className="font-display text-t1 font-extrabold leading-[0.8] text-white">{g.inning}</b>
                    <svg width="18" height="12" viewBox="0 0 20 14" className="mt-1.5" aria-hidden><path d={g.top ? 'M10 0 L20 14 L0 14 Z' : 'M0 0 L20 0 L10 14 Z'} fill="#f87171" /></svg>
                  </>
                )}
              </span>
              <div className="w-[190px]">
                {[[away, g.away, cOpp, false], [home, g.home, cMy, true]].map(([t, side, color, mine], i) => {
                  const flag = mine ? flagByKey(myBanner()) : teamFlag(t.name);
                  const c = flag?.color || color;
                  const atBat = g.top ? !mine : mine; // 지금 치고 있는 쪽 — 그 줄만 색이 진하다
                  return (
                    <div key={t.name} className={`relative flex items-center gap-2.5 overflow-hidden px-3.5 ${i ? 'border-t border-white/10' : ''}`}
                      style={{ height: 44, background: atBat ? `linear-gradient(90deg, ${c}b0, ${c}30 72%, transparent)` : `linear-gradient(90deg, ${c}40, transparent 60%)` }}>
                      {flag && <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${flag.src})`, opacity: atBat ? 0.3 : 0.14, WebkitMaskImage: SB_MASK, maskImage: SB_MASK }} />}
                      <b className="relative truncate text-t3 font-extrabold text-white" style={{ opacity: atBat ? 1 : 0.8 }}>{shortTeam(t.name, mine)}</b>
                      <b className="relative ml-auto font-display text-t1 font-extrabold leading-none text-white" style={{ opacity: atBat ? 1 : 0.8 }}>{side.runs}</b>
                    </div>
                  );
                })}
              </div>
              <span className="flex items-center gap-3 px-4">
                <Diamond bases={g.bases} size={60} off="rgba(255,255,255,.45)" />
                <Bso b={count.b} s={count.s} o={count.o} dot={12} font={12} gap={5} rowGap={4} off="rgba(255,255,255,.4)" lab="text-white/70" popOut={justOut} />
              </span>
            </div>

            {/* 타석 — 동그란 얼굴 · 이름 · 파워 · 컨택 · 종합, 다음 두 타자. 타자가 바뀌면 아래에서 올라온다 */}
            {(() => {
              const n = off.team.batters.length;
              const next = [1, 2].map((k) => off.team.batters[(off.idx + k) % n]).filter(Boolean);
              const f = FORM_OF[batter?.form];
              return (
                <section key={batter?.id} className="mt-cut mt-glass absolute bottom-4 left-4 flex w-[440px] items-center gap-4 p-4"
                  style={{ '--c': '20px', animation: 'batterIn .34s ease-out both' }}>
                  <span className="block h-16 w-16 shrink-0 rounded-full bg-[#0b1220] bg-cover"
                    style={{ backgroundImage: faceArt(batter), backgroundPosition: '50% 14%', boxShadow: `0 0 0 2px #05080f, 0 0 0 3.5px ${battingColor}` }} />
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-t4 text-gray-400">
                      타석 · {batter?.position} {batter?.hand}타
                      {f?.swing ? <b className="font-display" style={{ color: f.color }}>{f.mark} {f.ko}</b> : null}
                      <span className="truncate" style={{ color: koDark(batterKo) }}>{batterKo}</span>
                    </span>
                    <b className="block truncate text-t2 font-black text-white">{batter?.name}</b>
                    <span className="flex items-baseline gap-3 text-t4 text-gray-400">
                      <span>파워 <b className="font-display text-t3 text-white">{st(batter, 'power')}</b></span>
                      <span>컨택 <b className="font-display text-t3 text-white">{st(batter, 'contact')}</b></span>
                      {!!next.length && <span className="truncate text-gray-400">다음 {next.map((p) => p.name).join(' · ')}</span>}
                    </span>
                  </div>
                  <b className="font-display text-[40px] font-extrabold leading-none" style={{ color: battingColor }}>{batter?.overall}</b>
                </section>
              );
            })()}

            {/* 존 — 이 공이 어디로 들어왔나. 늘 떠 있고 새 공이 오면 갈린다 */}
            <div key={rush ? 'rush' : shots.length} className="mt-cut mt-glass pointer-events-none absolute bottom-4 right-4 flex items-stretch gap-3 p-3"
              style={{ '--c': '18px', '--f': lastShot?.tone || '#94a3b8', animation: lastShot && !rush ? 'mtZoneFlash .5s ease-out both' : 'none' }}>
              <ZoneBox shots={shots} w={120} />
              {/* 글자 칸은 폭을 못 박는다 — '볼' 이든 '인플레이' 든 판이 흔들리지 않게 */}
              <div className="flex w-[92px] shrink-0 flex-col justify-center gap-1 leading-tight">
                <span>{lastShot && <span className="inline-block rounded-md px-1.5 py-0.5 text-t4 font-extrabold text-[#05080f]" style={{ background: lastShot.tone }}>{CALL_KO[lastShot.ev.call] || ''}</span>}</span>
                <b className="truncate text-t3 font-bold text-white">{lastShot ? PITCH_KO[lastShot.ev.pitch?.type] || '' : ''}</b>
                <em className="font-display text-t1 font-extrabold leading-none not-italic" style={{ color: lastShot?.tone || '#4b5563' }}>
                  {lastShot?.ev.pitch?.velo ?? '--'}<span className="ml-0.5 text-t4 text-white/60">km</span>
                </em>
                <span className="text-t4 text-gray-400">{lastShot ? courseKo(lastShot.x, lastShot.y) : '투구 대기'}</span>
              </div>
            </div>

            {/* 접은 타석을 흘려보내는 중 — 넘어갔다는 것이 보이게 */}
            {rush && (
              <span className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-t4 font-extrabold text-[#05080f]"
                style={{ background: '#38bdf8', animation: 'rushBlink .5s ease-in-out infinite' }}>▶▶ 요약</span>
            )}

            {/* 결과 자막 */}
            {flash && (
              <div key={flash.key} className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 animate-[rise_.4s_ease-out_both] font-display text-[70px] font-black text-yellow-300 [text-shadow:0_0_40px_rgba(253,224,71,.8)]">{flash.text}</div>
            )}

            {/* 공수 교대 — 띠가 한 번 쓸고 지나가며 이번 반 이닝의 주인을 알린다 */}
            {swap && (
              <div key={swap.key} className="pointer-events-none absolute inset-0 grid place-items-center">
                <i className="absolute inset-x-0 top-1/2 h-[118px] -translate-y-1/2 origin-left"
                  style={{ background: `linear-gradient(90deg,${tint(swap.mine ? battingColor : pitchingColor, 62)},transparent)`,
                    animation: 'halfWipe 1.1s cubic-bezier(.2,.8,.2,1) both' }} />
                <div className="absolute left-1/2 top-1/2 grid justify-items-center gap-1.5"
                  style={{ animation: 'halfSwipe 1.15s ease-out both' }}>
                  <span className="font-display text-t3 font-bold tracking-[0.34em]"
                    style={{ color: swap.mine ? battingColor : pitchingColor }}>{swap.inning}회{swap.top ? '초' : '말'}</span>
                  <b className="font-display text-[62px] font-black leading-none text-white [text-shadow:0_6px_30px_rgba(0,0,0,.85)]">
                    {swap.mine ? '우리 공격' : '우리 수비'}
                  </b>
                </div>
              </div>
            )}
          </section>

          {/* ── 오른쪽 한 줄기: 승부 흐름 · 작전(승부처) · 투수와 불펜 · 해설 ── */}
          <div className="flex min-h-0 flex-col gap-4">
            <section className="mt-cut mt-frame mt-glass flex shrink-0 flex-col gap-2 px-5 py-4" style={{ '--c': '22px', '--a': cMy }}>
              <div className="flex items-center">
                <p className="mt-lab" style={{ '--a': cMy }}>승부 흐름</p>
                <b className="ml-auto font-display text-[40px] font-black leading-none" style={{ color: cMy }}>{Math.round(wpShow * 100)}<small className="ml-0.5 text-t3 text-gray-400">%</small></b>
              </div>
              <WinLine log={wpLog} mine={cMy} w={398} h={60} />
              <div className="flex justify-between text-t4 text-gray-400">
                <span>내 지시 <b className="font-display text-t3" style={{ color: myGain > 0 ? '#34d399' : myGain < 0 ? '#f87171' : '#9ca3af' }}>{myGain > 0 ? '+' : ''}{myGain}%p</b></span>
                <span>남은 개입 <b className="font-display text-t3 text-white">{clutchLeft.current}</b></span>
              </div>
            </section>

            {/* 작전 — 평소에는 세 갈래, 승부처에는 그 자리의 세 장 */}
            {(() => {
              const bandColor = clutch ? clutchColor : cMy;
              const queuedKo = orderKo(pend);
              return (
                <section className="mt-cut mt-frame mt-glass relative flex shrink-0 flex-col gap-2.5 p-5"
                  style={{ '--c': '22px', '--a': bandColor, overflow: 'visible',
                    ...(clutch ? { boxShadow: `inset 0 0 0 1.5px ${clutchColor}, 0 0 44px -10px ${clutchColor}`, animation: 'clutchPulse 1.5s ease-in-out infinite' } : null) }}>
                  <div className="flex items-center gap-2.5">
                    <p className="mt-lab shrink-0" style={{ '--a': bandColor }}>{clutch ? '승부처' : '작전'}</p>
                    <b className="truncate text-t3 text-white">{clutch ? clutch.head : `${mineBat ? '우리 공격' : '우리 수비'} · ${g.inning}회${g.top ? '초' : '말'} ${g.outs}사`}</b>
                    {clutch && <small className="shrink-0 text-t4" style={{ color: clutchColor }}>{clutch.lead}</small>}
                    <span className="ml-auto shrink-0 text-t4 text-gray-400">
                      {clutch ? <>남은 개입 <b className="font-display text-t3" style={{ color: clutchColor }}>{clutch.left}</b></>
                        : g.events.length > 0 ? <>남은 변경 <b className="font-display text-t3" style={{ color: tacticsLeft ? '#fff' : '#f87171' }}>{tacticsLeft}</b></> : null}
                    </span>
                  </div>
                  {/* 담아 둔 지시 — 눌렀다는 것이 여기에도 남는다 */}
                  {!!queuedKo.length && (
                    <div className="flex flex-wrap gap-1.5">
                      {queuedKo.map((k) => <span key={k} className="mt-chip" style={{ '--a': bandColor, color: '#fff' }}>{k} 지시</span>)}
                    </div>
                  )}
                  {/* 승부처 — 그 자리의 세 장. 고르면 승률이 어디로 갈지까지 적는다 */}
                  {PICKS && PICKS.map((c, i) => (
                    <button key={c.key} type="button" onClick={() => give(c.order)}
                      className="mt-cut flex items-center gap-3 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:brightness-110"
                      style={{ '--c': '16px', animation: `batterIn .35s ${i * 0.06}s ease-out both`,
                        background: `linear-gradient(180deg,${tint(clutchColor, 16)},${tint(clutchColor, 4)}),rgba(10,12,18,.7)`,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 1px ${tint(clutchColor, 45)}` }}>
                      <b className="text-t2 leading-none">{c.icon}</b>
                      <span className="min-w-0 flex-1">
                        <b className="block text-t3 font-extrabold text-white">{c.title}</b>
                        <small className="block truncate text-t4 text-gray-400">{c.note}</small>
                      </span>
                      {c.move !== 0 && (
                        <b className="font-display text-t2 font-extrabold" style={{ color: c.move > 0 ? '#34d399' : '#f87171' }}>{c.move > 0 ? '+' : ''}{c.move}</b>
                      )}
                    </button>
                  ))}
                  {clutch && (
                    <button type="button" onClick={() => clutch.resolve(null)} className="mt-btn sm self-stretch">⏭ 맡긴다</button>
                  )}
                  {/* 평소에는 전술 — 갈래를 누르면 왼쪽으로 고를 판이 열린다 */}
                  {!PICKS && SIDES.map((sd) => {
                    const cur = sideOpt(sd.key, sides[sd.key]);
                    const want = tacQ[sd.key] ? sideOpt(sd.key, tacQ[sd.key]) : null; // 다음 공수 교대에 먹을 것
                    const open = openSide === sd.key;
                    const locked = tacticsLeft <= 0 && g.events.length > 0; // 다 쓴 뒤에는 못 바꾼다
                    return (
                      <div key={sd.key} className="relative">
                        {open && (
                          <>
                            <span className="fixed inset-0 z-10" onClick={() => setOpenSide(null)} aria-hidden="true" />
                            <div className="mt-cut mt-glass absolute right-full top-1/2 z-20 mr-3 w-[22rem] -translate-y-1/2 p-3"
                              style={{ '--c': '18px', background: 'rgba(8,12,22,.96)', animation: 'sidePop .22s cubic-bezier(.2,.9,.3,1) both' }}>
                              <p className="mt-lab px-1 pb-2" style={{ '--a': sd.color }}>{sd.ko}</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {sd.opts.map((o) => {
                                  const on = (tacQ[sd.key] || sides[sd.key]) === o.id;
                                  return (
                                    <button key={o.id} type="button" disabled={locked} onClick={() => { pickSide(sd.key, o.id); setOpenSide(null); }}
                                      className="mt-cut px-3 py-2 text-left transition-[background,box-shadow] disabled:opacity-40"
                                      style={{ '--c': '10px',
                                        background: on ? 'rgba(16,185,129,.18)' : 'rgba(255,255,255,.05)',
                                        boxShadow: on ? 'inset 0 0 0 1.5px #10b981' : 'inset 0 1px 0 rgba(255,255,255,.06)' }}>
                                      <b className="block text-t3 font-extrabold" style={{ color: on ? '#fff' : '#e6edf6' }}>{o.ko}</b>
                                      <small className="text-t4 text-gray-400">{o.tip}</small>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                        <button type="button" onClick={() => setOpenSide(open ? null : sd.key)} aria-expanded={open}
                          className="mt-cut flex h-11 w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.1]"
                          style={{ '--c': '12px', background: open ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' }}>
                          <span className="w-14 shrink-0 text-t3 text-gray-300">{sd.ko}</span>
                          <b className="min-w-0 flex-1 truncate text-t2 font-extrabold text-white">
                            {cur?.ko}{want && <span style={{ color: '#fbbf24' }}> → {want.ko}</span>}
                          </b>
                          {want && <small className="shrink-0 text-t4 font-bold text-amber-300">예약</small>}
                          <b className="shrink-0 text-t4 text-gray-400" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>◀</b>
                        </button>
                      </div>
                    );
                  })}
                </section>
              );
            })()}

            {/* 투수 · 불펜 — 지친 팔이면 노랗게 · 빨갛게 */}
            <section className={`mt-cut mt-frame mt-glass flex shrink-0 flex-col gap-2.5 px-5 py-4 ${worn ? 'hot' : ''}`} style={{ '--c': '22px', '--a': worn ? (spent ? '#f87171' : '#fbbf24') : defSide }}>
              <div className="flex items-center gap-3">
                <Portrait player={pitcher} w={44} h={44} round t={pitchingColor} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-t4 text-gray-400">{shortTeam(def.team.name, g.top)} 투수 · {def.pitches}구</span>
                  <span className="flex items-center gap-1.5">
                    <b className="truncate text-t3 font-extrabold text-white">{pitcher?.name}</b>
                    {worn && <span className="shrink-0 rounded-md px-1.5 text-t4 font-extrabold text-[#05080f]" style={{ background: spent ? '#f87171' : '#fbbf24' }}>{spent ? '한계' : '지침'}</span>}
                  </span>
                </div>
                <b className="font-display text-t1 font-extrabold" style={{ color: pitchingColor }}>{pitcher?.overall}</b>
              </div>
              <div className="flex items-center gap-2.5 text-t4 text-gray-400">
                체력
                <i className="block h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.08]"><b className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(stamina)}%`, background: staminaTone(Math.round(stamina)).bar }} /></i>
                <b className="w-7 text-right font-display text-t3" style={{ color: staminaTone(Math.round(stamina)).ink }}>{Math.round(stamina)}</b>
              </div>
              <div className="flex items-center gap-2 border-t border-white/[0.07] pt-2.5">
                <p className="mt-lab" style={{ '--a': worn ? (spent ? '#f87171' : '#fbbf24') : cMy }}>불펜</p>
                <span className="ml-auto truncate text-t4 font-bold" style={{ color: queued ? '#fde047' : worn ? (spent ? '#f87171' : '#fbbf24') : '#6b7280' }}>
                  {queued ? '교체 대기' : worn ? '교체 때' : canSwap ? '' : '내 수비 때 교체'}
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {myPen.length === 0 && <li className="px-1 py-1 text-t4 text-gray-400">남은 투수 없음</li>}
                {myPen.slice(0, clutch ? 2 : 3).map((p) => {
                  const cond = p.condition == null ? 100 : p.condition; // 쉬고 난 몸 상태
                  const tone = staminaTone(cond);
                  const mine = queued === p.id; // 이 투수로 바꾸라고 일러 둔 참이다
                  return (
                    <li key={p.id} className={`mt-row ${mine ? 'on' : ''}`}
                      style={{ gridTemplateColumns: 'minmax(0,1fr) 28px 80px auto', gap: 10, padding: '3px 6px', opacity: queued && !mine ? 0.5 : 1 }}>
                      <b className="truncate text-t3 font-semibold text-gray-100">{p.name}</b>
                      <em className="font-display text-t3 font-bold not-italic text-white">{p.overall}</em>
                      <span className="flex items-center gap-1.5" title={`체력 ${cond}`}>
                        <i className="block h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.08]"><b className="block h-full rounded-full" style={{ width: `${cond}%`, background: tone.bar }} /></i>
                      </span>
                      <button type="button" disabled={!canSwap || !!queued} onClick={() => give({ changePitcher: p.id })}
                        title={mine ? '다음 공에 올라간다' : queued ? '이미 교체를 일러 두었다' : canSwap ? `${p.name} 으로 바꾼다` : '내 수비 때만 바꾼다'}
                        className={`mt-btn sm !min-h-[28px] !px-3 !text-t4 ${mine || (canSwap && !queued) ? 'pri' : ''}`}
                        style={mine ? { '--a': '#fde047' } : null}>{mine ? '대기' : '교체'}</button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* 해설 — 가장 새 줄이 위, 아래로 흐려진다 */}
            <section className="mt-cut mt-glass flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-5 py-4" style={{ '--c': '22px' }}>
              {[...lines].reverse().filter((l) => l.kind !== 'half').slice(0, 4).map((l, i) => (
                <p key={l.id} className="m-0 flex min-w-0 shrink-0 items-baseline gap-2 leading-snug" style={{ opacity: 1 - i * 0.22 }}>
                  {l.at && <em className="shrink-0 font-display text-t4 font-bold not-italic text-gray-400">{l.at}</em>}
                  <span className={`truncate ${i === 0 ? 'text-t3 font-bold' : 'text-t4'}`} style={{ color: i === 0 ? '#fff' : KIND_TONE[l.kind] || '#cbd5e1' }}>{l.text}</span>
                </p>
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 엔진 경기를 기존 결과 화면(ResultPanel)이 쓰는 모양으로 바꾼다 */
/* ───────── 승부처: 멈추고 감독에게 묻는다 ───────── */
/** 주자를 사람 말로 */
const basesKo = (bases) => {
  const on = bases.map((b, i) => (b ? ['1루', '2루', '3루'][i] : null)).filter(Boolean);
  if (!on.length) return '주자 없음';
  if (on.length === 3) return '만루';
  return on.join(' · ');
};
/** 멈춘 자리의 상황을 한 벌로 묶는다 */
function askOf(g, home, away, left, resolve) {
  const myRuns = g.home.runs;
  const oppRuns = g.away.runs;
  const diff = myRuns - oppRuns;
  return {
    resolve,
    left,
    weDefend: g.top,
    head: `${g.inning}회${g.top ? '초' : '말'} ${g.outs}사 ${basesKo(g.bases)}`,
    score: `${oppRuns} : ${myRuns}`,
    lead: diff > 0 ? `${diff}점 앞선다` : diff < 0 ? `${-diff}점 뒤진다` : '동점이다',
    batter: batterOf(g),
    pitcher: pitcherOf(g),
    weight: leverage(g),
    wp: winProb(g),
    pitch: defenseOf(g).pitches ?? 0,
  };
}

export function buildResult(g, myTeam, manager = null) {
  const board = {
    home: Array.from({ length: 9 }, (_, i) => g.home.line[i] ?? null),
    away: Array.from({ length: 9 }, (_, i) => g.away.line[i] ?? null),
  };
  /* 감독이 한 일 — 승률이 그린 선과 내가 낸 지시 */
  const flow = manager?.flow?.length ? [...manager.flow] : null;
  const flowAt = manager?.flowAt?.length ? [...manager.flowAt] : null;
  const calls = manager?.calls?.length ? [...manager.calls].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)) : [];
  const credit = new Map();
  const add = (p, pts, key) => {
    if (!p) return;
    const c = credit.get(p.id) || { player: p, pts: 0, runs: 0, zero: 0, fires: 0 };
    c.pts += pts;
    if (key) c[key] += 1;
    credit.set(p.id, c);
  };
  const logs = [];
  for (const ev of g.events) {
    if (!ev.result) continue;
    const mine = !ev.top; // 홈(내 팀) 공격
    if (mine) {
      if (['1B', '2B', '3B', 'HR'].includes(ev.result)) add(ev.batter, { '1B': 2, '2B': 3, '3B': 4, HR: 6 }[ev.result] + ev.runs * 3, 'runs');
      else if (['BB', 'SF', 'SAC', 'BH'].includes(ev.result)) add(ev.batter, 1 + ev.runs * 3, ev.runs ? 'runs' : null);
    } else {
      if (ev.result === 'K') add(ev.pitcher, 1.2, 'zero');
      if (ev.runs) add(ev.pitcher, -ev.runs, null);
    }
    logs.push({
      id: logs.length, kind: ev.runs ? 'score' : 'normal', inning: ev.inning, isTop: ev.top, runs: ev.runs,
      text: `${ev.batter?.name} ${RESULT_LABEL[ev.result] || ''}`, hero: ev.batter, pitcher: ev.pitcher,
    });
  }
  const ranked = [...credit.values()].sort((a, b) => b.pts - a.pts);
  const fallback = (myTeam.roster || []).filter((p) => !p.isReplacement).sort((a, b) => b.overall - a.overall)[0];
  const mvp = ranked[0] || { player: fallback, pts: 0, runs: 0, zero: 0, fires: 0 };
  // 투수 피로 계산용: 내 팀(홈) 투수별 투구 수와 선발
  const myPitcherIds = new Set(g.home.team.pitchers.map((p) => p.id));
  const pitchCounts = {};
  for (const ev of g.events) if (ev.pitcher && myPitcherIds.has(ev.pitcher.id)) pitchCounts[ev.pitcher.id] = (pitchCounts[ev.pitcher.id] || 0) + 1;
  /* 기록실에 남길 박스 스코어 — 내 타자(말 공격)와 내 투수(초 수비) */
  const bat = {};
  const arm = {};
  const hits = { my: 0, opp: 0 };
  for (const ev of g.events) {
    if (!ev.result || ev.result === 'SB' || ev.result === 'CS') continue;
    const hit = ['1B', '2B', '3B', 'HR', 'BH'].includes(ev.result);
    if (hit) hits[ev.top ? 'opp' : 'my'] += 1;
    if (!ev.top && ev.batter) {
      const b = bat[ev.batter.id] || (bat[ev.batter.id] = { ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0 });
      if (!['BB', 'IBB', 'SF', 'SAC'].includes(ev.result)) b.ab += 1;
      if (hit) b.h += 1;
      if (ev.result === 'HR') b.hr += 1;
      if (ev.result === 'BB' || ev.result === 'IBB') b.bb += 1;
      if (ev.result === 'K') b.k += 1;
      if (ev.result !== 'E') b.rbi += ev.runs || 0;
    }
    if (ev.top && ev.pitcher && myPitcherIds.has(ev.pitcher.id)) {
      const p = arm[ev.pitcher.id] || (arm[ev.pitcher.id] = { at: Object.keys(arm).length, bf: 0, h: 0, k: 0, r: 0 });
      p.bf += 1;
      if (hit) p.h += 1;
      if (ev.result === 'K') p.k += 1;
      p.r += ev.runs || 0;
    }
  }
  return {
    box: { bat, arm }, hits, line: { my: [...g.home.line], opp: [...g.away.line] }, sides: manager?.sides || null,
    board,
    pitchCounts, starterId: g.home.team.pitchers[0]?.id || null,
    score: { my: g.home.runs, opp: g.away.runs },
    winner: g.winner === 'home' ? 'my' : g.winner === 'away' ? 'opp' : 'draw',
    logs, used: {}, mvpPlayer: mvp.player, mvp, credits: ranked,
    flow, flowAt, calls, gain: manager?.gain ?? 0,
  };
}
