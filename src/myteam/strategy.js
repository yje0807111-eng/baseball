/*
 * 경기 전 작전 — 전략실(정비 화면 오른쪽 판)에서 고른다.
 *  공격 · 마운드 · 수비에서 하나씩 고르면 큰 틀이 잡히고, 갈래마다 성향 축 몇 개로 세부를 손본다.
 *  성향 축은 한 타석 단위 지시가 아니라 한 경기 내내 쓰는 기울기다 — 왼쪽이 소극, 오른쪽이 적극.
 *  상대 스카우팅에서 뽑은 약점으로 추천(★)을 만든다.
 */


/** 큰 갈래 세 줄 — 전략실의 세 섹션이 잡아 주는 값 */
export const BASE = [
  { key: 'bat', ko: '타선', color: '#34d399', opts: ['강공', '기동력', '짜내기'] },
  { key: 'pit', ko: '마운드', color: '#f87171', opts: ['길게', '빠른 계투', '아끼기'] },
  { key: 'run', ko: '주루', color: '#fbbf24', opts: ['적극', '보통', '신중'] },
];
/**
 * 성향 축 — 경기가 알아서 판단하는 자리의 기울기다. 왼쪽이 소극, 가운데가 보통, 오른쪽이 적극.
 * 번트 · 히트앤런 · 도루처럼 플레이어가 그때그때 누르는 작전은 여기 없다.
 * 대타 · 대주자도 없다 — 예비 선수는 경기에 나서지 않고 타순 아홉이 끝까지 간다.
 */
export const FINE = [
  { g: '타격', color: '#34d399', key: 'swing', ko: '스윙', opts: ['신중', '보통', '과감'] },
  { g: '타격', color: '#34d399', key: 'take', ko: '주루', opts: ['안전', '보통', '과감'] },
  { g: '마운드', color: '#f87171', key: 'hook', ko: '투수 교체', opts: ['늦게', '보통', '빠르게'] },
  { g: '마운드', color: '#f87171', key: 'duel', ko: '승부', opts: ['회피', '보통', '정면'] },
  { g: '마운드', color: '#f87171', key: 'mix', ko: '볼 배합', opts: ['안전', '보통', '공격'] },
  { g: '수비', color: '#60a5fa', key: 'guard', ko: '수비 위치', opts: ['깊게', '정석', '전진'] },
  { g: '수비', color: '#60a5fa', key: 'hold', ko: '주자 견제', opts: ['느슨', '보통', '바짝'] },
];
export const GROUPS = [['타격', '#34d399'], ['마운드', '#f87171'], ['수비', '#60a5fa']];
/** 아무것도 손대지 않았을 때 */
export const DEFAULT_PLAN = {
  base: { bat: '기동력', pit: '길게', run: '보통' },
  fine: { swing: '보통', take: '보통', hook: '보통', duel: '보통', mix: '보통', guard: '정석', hold: '보통' },
};
const avg = (a, f) => (a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : 0);
/**
 * 상대 약점 태그 — 정비 왼쪽 스카우팅 판과 같은 잣대(그 판도 이 함수를 쓴다).
 * 넷까지만 보여 준다.
 */
export function scoutTags(opponent) {
  const ros = opponent?.roster || [];
  const bats = ros.filter((p) => p.type === 'batter');
  const pits = ros.filter((p) => p.type === 'pitcher');
  const st = (p, k, d = 78) => p?.stats?.[k] ?? d;
  /* 붙는 기준은 구단 시즌 373개의 팀 평균에서 위아래 20% 자리 — 어느 팀에나 붙으면 알려 줄 게 없다 */
  return [
    { on: avg(bats, (p) => st(p, 'power')) >= 82, label: '장타 위험', c: '#f87171' },
    { on: avg(bats, (p) => st(p, 'speed')) >= 81, label: '발 빠른 타선', c: '#fbbf24' },
    { on: avg(bats, (p) => st(p, 'contact')) >= 82, label: '컨택 강함', c: '#fb923c' },
    { on: avg(bats, (p) => st(p, 'defense')) >= 80, label: '수비 탄탄', c: '#60a5fa' },
    { on: bats.filter((p) => p.hand === 'L').length / Math.max(1, bats.length) >= 0.35, label: '좌타 다수', c: '#a78bfa' },
    { on: avg(pits.filter((p) => p.position === 'RP'), (p) => p.overall ?? 78) < 73, label: '불펜 얇음', c: '#34d399' },
    { on: avg(pits.filter((p) => p.position === 'SP'), (p) => st(p, 'stamina')) < 74, label: '선발 이닝 짧음', c: '#34d399' },
    { on: avg(bats, (p) => st(p, 'power')) < 74, label: '한 방 없음', c: '#34d399' },
    { on: (() => { const c = ros.find((x) => x.position === 'C'); return c ? st(c, 'defense') < 84 : false; })(), label: '도루 저지 약함', c: '#fb923c' },
  ].filter((x) => x.on).slice(0, 4);
}

/** 약점 태그 → 그 약점을 되치는 성향 (★ 로 표시한다) */
const COUNTER = {
  '장타 위험': { mix: '안전', guard: '깊게', duel: '회피' },
  '발 빠른 타선': { hold: '바짝', guard: '전진' },
  '컨택 강함': { mix: '안전' },
  '수비 탄탄': { swing: '과감' },
  '좌타 다수': { mix: '공격' },
  '불펜 얇음': { swing: '신중' },
  '선발 이닝 짧음': { swing: '신중' },
  '한 방 없음': { duel: '정면', guard: '정석' },
  '도루 저지 약함': { take: '과감' },
};
/** 이 상대에게 추천하는 세부 작전 */
export function recommend(opponent) {
  const out = {};
  scoutTags(opponent).forEach((t) => Object.assign(out, COUNTER[t.label] || {}));
  // 상대 포수 수비가 무르면 뛴다
  const c = (opponent?.roster || []).find((p) => p.position === 'C');
  const cd = c?.stats?.defense;
  if (cd != null) out.take = cd < 76 ? '과감' : cd > 86 ? '안전' : out.take || '보통';
  return out;
}

/* ───────────── 전략실: 세 갈래 ─────────────
 * 공격 · 마운드 · 수비에서 하나씩 고르면 큰 틀이 잡히고, 갈래마다 눈금 몇 개로 세부를 손본다.
 * 갈래를 고르면 그 갈래의 눈금이 기본값으로 잡히고, 손댄 눈금은 그대로 남는다.
 */
/*
 * 이름은 중계에서 쓰는 말(강공 · 짧게 치기 · 빠른 계투 · 외야 후진 …). main 은 대표 효과 한 마디(안 고른 칸), fx 는 고른 칸의 칩 — up 초록(얻음) · dn 빨강(대가).
 * 칩은 경기 화면과 같은 흐름(상대 AI 투수 교체) 3,000판 시뮬(tacsim2)에서 기준 대비 실제로 움직인 것만.
 * 균형 — 같은 갈래끼리 득 · 실점 차이가 비슷하게: 공격 득점 +0.20 ~ +0.33 · 마운드 실점 −0.03 ~ +0.06 · 수비 실점 −0.03 ~ 0.
 *  기다리기 볼넷 10.8 → 16.6% · 삼진 19.5 → 23.8% · 장타 .082 → .072 / 선발 길게 투수 3.9 → 3.5명 · 빠른 계투 4.6명 ·
 *  불펜 총력전 상대 볼넷 11 → 10.1% · 불펜 아끼기 11 → 11.7% / 외야 후진 상대 장타 .083 → .056 · 출루 .358 → .367 ·
 *  전진 수비 출루 .348 · 장타 .108 / 주자 견제 도루 성공률 ↓ · 득점권 쇄도 ↓ · 주자 있을 때 맞히기 +0.012
 */
export const SIDES = [
  { key: 'off', en: 'Offense', ko: '공격', color: '#34d399', dials: ['swing', 'take'],
    opts: [
      { id: 'big', ko: '강공', main: '장타 ↑', fx: { up: ['장타 ↑'], dn: [] }, tip: '한 방 노리기', base: { bat: '강공' }, fine: { swing: '과감', take: '보통' } },
      { id: 'contact', ko: '짧게 치기', main: '삼진 ↓', fx: { up: ['삼진 ↓', '병살 ↓'], dn: [] }, tip: '맞혀 나가기', base: { bat: '기동력' }, fine: { swing: '보통', take: '보통', appr: 'contact' } },
      { id: 'speed', ko: '기동력', main: '진루 ↑', fx: { up: ['진루 ↑', '병살 ↓'], dn: [] }, tip: '한 베이스 더', base: { bat: '기동력' }, fine: { swing: '보통', take: '과감' } },
      { id: 'onbase', ko: '기다리기', main: '볼넷 ↑', fx: { up: ['볼넷 ↑'], dn: ['삼진 ↑', '장타 ↓'] }, tip: '공 많이 보기', base: { bat: '짜내기' }, fine: { swing: '신중', take: '안전' } },
    ] },
  /*
   * 선발 운용(ROADMAP 12 · plan-sim 6,000경기) — 답이 내 팀 구성에 따라 갈린다: 불펜이 선발보다 약하면 길게,
   * 훨씬 세면 빠른 계투(−4.3 ~ +4.7%p). 타순이 돌수록 선발이 맞는다(엔진 ttoOf). 불펜 총력전 · 아끼기는 빠른 계투 · 길게와 겹쳐 뺐다
   */
  { key: 'mound', en: 'Mound', ko: '선발 운용', color: '#f87171', dials: ['hook'],
    opts: [
      { id: 'long', ko: '선발 길게', main: '세 바퀴까지', fx: { up: ['교체 ↓'], dn: [] }, tip: '끝까지 맡기기', base: { pit: '길게' }, fine: { hook: '늦게' } },
      { id: 'two', ko: '두 바퀴 교체', main: '18타자', fx: { up: ['셋째 바퀴 ↓'], dn: ['불펜 소모 ↑'] }, tip: '타순 두 바퀴에서 불펜', base: { pit: '빠른 계투' }, fine: { hook: '보통', hookBf: 18 } },
      { id: 'quick', ko: '빠른 계투', main: '위기면 바로', fx: { up: ['지친 투수 ↓'], dn: ['불펜 소모 ↑'] }, tip: '위기면 바로', base: { pit: '빠른 계투' }, fine: { hook: '빠르게' } },
    ] },
  /* 볼 배합 — 상대 타선이 약한 계열(엔진 batterFam)을 노린다. 우리 선발에게 그 계열 공이 없으면 효과 없음 */
  { key: 'mix', en: 'Mix', ko: '볼 배합', color: '#a78bfa', dials: [],
    opts: [
      { id: 'mix', ko: '섞기', main: '투수 배합대로', fx: { up: [], dn: [] }, tip: '투수 배합대로', base: {}, fine: {} },
      { id: 'F', ko: '직구 위주', main: '직구 ↑', fx: { up: ['직구 ↑'], dn: [] }, tip: '직구 약한 타선', base: {}, fine: { mixFam: 'F' } },
      { id: 'B', ko: '휘는 공 위주', main: '휘는 공 ↑', fx: { up: ['휘는 공 ↑'], dn: [] }, tip: '휘는 공 약한 타선', base: {}, fine: { mixFam: 'B' } },
      { id: 'O', ko: '떨어지는 공 위주', main: '떨어지는 공 ↑', fx: { up: ['떨어지는 공 ↑'], dn: [] }, tip: '떨어지는 공 약한 타선', base: {}, fine: { mixFam: 'O' } },
    ] },
  /* 수비 갈래는 정비에서 뺐다(plan-sim: 승률 변화가 잡음 ±1 안) — 값은 늘 정상 수비 */
  { key: 'def', hidden: true, en: 'Defense', ko: '수비', color: '#60a5fa', dials: ['guard', 'hold'],
    opts: [
      { id: 'std', ko: '정상 수비', main: '', fx: { up: [], dn: [] }, tip: '제자리 수비', base: { run: '보통' }, fine: { guard: '정석', hold: '보통' } },
      { id: 'deep', ko: '외야 후진', main: '장타 ↓', fx: { up: ['장타 ↓'], dn: ['단타 ↑'] }, tip: '장타 방지', base: { run: '신중' }, fine: { guard: '깊게', hold: '느슨' } },
      { id: 'in', ko: '전진 수비', main: '땅볼 아웃 ↑', fx: { up: ['땅볼 아웃 ↑'], dn: ['장타 ↑'] }, tip: '홈 승부', base: { run: '보통' }, fine: { guard: '전진', hold: '보통' } },
      { id: 'tight', ko: '주자 견제', main: '도루 ↓', fx: { up: ['도루 ↓', '진루 ↓'], dn: ['피안타 ↑'] }, tip: '도루 저지', base: { run: '보통' }, fine: { guard: '정석', hold: '바짝' } },
    ] },
];
export const DEFAULT_SIDES = { off: 'big', mound: 'long', mix: 'mix', def: 'std' };
export const sideOpt = (key, id) => {
  const s = SIDES.find((x) => x.key === key);
  return s?.opts.find((o) => o.id === id) || s?.opts[0];
};
/** 세 갈래가 잡아 주는 값. 세부 눈금을 손으로 만지는 판은 없앴다 — 갈래 하나가 눈금 여럿을 함께 정한다 */
export function planOfSides(sides = DEFAULT_SIDES, conds = []) {
  const base = { ...DEFAULT_PLAN.base };
  const fine = { ...DEFAULT_PLAN.fine };
  for (const s of SIDES) {
    const o = sideOpt(s.key, sides[s.key]);
    Object.assign(base, o.base);
    Object.assign(fine, o.fine);
  }
  return { sides: { ...sides }, conds: [...conds], base, fine };
}
/** 상대 약점 → 되치는 갈래 { 갈래id: [약점, ...] } */
const SIDE_COUNTER = {
  '불펜 얇음': ['onbase', 'contact'],
  '선발 이닝 짧음': ['onbase', 'big'],
  '수비 탄탄': ['big'],
  '도루 저지 약함': ['speed'],
  /* 선발 운용 · 볼 배합의 추천은 정비 화면이 엔진으로 잰 승률 변화로 단다(이 표는 공격 갈래만) */
};
export function sideReasons(opponent) {
  const out = {};
  scoutTags(opponent).forEach((t) => (SIDE_COUNTER[t.label] || []).forEach((id) => { (out[id] ||= []).push(t); }));
  return out;
}
