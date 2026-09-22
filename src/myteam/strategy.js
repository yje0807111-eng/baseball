/*
 * 경기 전 작전 — 정비 화면에서 고른다.
 *  기본 세 줄(타선 · 마운드 · 주루)은 큰 갈래, 세부 여덟은 상대를 되치는 손질이다.
 *  프리셋(공격형 · 균형 · 수비형)으로 한 번에 잡을 수 있고, 무엇이든 손대면 '맞춤'이 된다.
 *  상대 스카우팅에서 뽑은 약점으로 추천(★)을 만들고, [추천 적용]이 그 값들을 한 번에 넣는다.
 */

/** 큰 갈래 세 줄 */
export const BASE = [
  { key: 'bat', ko: '타선', color: '#34d399', opts: ['강공', '기동력', '짜내기'] },
  { key: 'pit', ko: '마운드', color: '#f87171', opts: ['길게', '빠른 계투', '아끼기'] },
  { key: 'run', ko: '주루', color: '#fbbf24', opts: ['적극', '보통', '신중'] },
];
/** 세부 여덟 — 갈래별로 묶는다 */
export const FINE = [
  { g: '타격', color: '#34d399', key: 'first', ko: '초구 스윙', opts: ['참는다', '보통', '노린다'] },
  { g: '타격', color: '#34d399', key: 'bunt', ko: '작전 · 번트', opts: ['안 함', '상황봐서', '자주'] },
  { g: '타격', color: '#34d399', key: 'ph', ko: '대타 기용', opts: ['소극적', '보통', '과감히'] },
  { g: '마운드', color: '#f87171', key: 'hook', ko: '선발 교체', opts: ['실점 시', '체력 소진', '조기 교체'] },
  { g: '마운드', color: '#f87171', key: 'crisis', ko: '위기 대응', opts: ['정면승부', '보통', '피한다'] },
  { g: '마운드', color: '#f87171', key: 'lead', ko: '포수 리드', opts: ['직구 위주', '밸런스', '변화구 위주'] },
  { g: '수비 · 주루', color: '#60a5fa', key: 'shift', ko: '수비 시프트', opts: ['정위치', '내야 전진', '외야 깊게'] },
  { g: '수비 · 주루', color: '#60a5fa', key: 'steal', ko: '도루 시도', opts: ['거의 안 함', '보통', '자주'] },
];
export const GROUPS = [['타격', '#34d399'], ['마운드', '#f87171'], ['수비 · 주루', '#60a5fa']];

export const PRESETS = [
  { id: 'attack', ko: '공격형', color: '#34d399',
    base: { bat: '강공', pit: '빠른 계투', run: '적극' },
    fine: { first: '노린다', bunt: '안 함', ph: '과감히', hook: '조기 교체', crisis: '정면승부', lead: '직구 위주', shift: '정위치', steal: '자주' } },
  { id: 'balance', ko: '균형', color: '#10b981',
    base: { bat: '기동력', pit: '길게', run: '보통' },
    fine: { first: '보통', bunt: '상황봐서', ph: '보통', hook: '체력 소진', crisis: '보통', lead: '밸런스', shift: '정위치', steal: '보통' } },
  { id: 'defense', ko: '수비형', color: '#60a5fa',
    base: { bat: '짜내기', pit: '아끼기', run: '신중' },
    fine: { first: '참는다', bunt: '자주', ph: '소극적', hook: '실점 시', crisis: '피한다', lead: '변화구 위주', shift: '내야 전진', steal: '거의 안 함' } },
];
export const DEFAULT_PLAN = { preset: 'balance', base: { ...PRESETS[1].base }, fine: { ...PRESETS[1].fine } };
export const planOf = (id) => {
  const p = PRESETS.find((x) => x.id === id) || PRESETS[1];
  return { preset: p.id, base: { ...p.base }, fine: { ...p.fine } };
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
  const st = (p, k, d = 70) => p?.stats?.[k] ?? d;
  return [
    { on: avg(bats, (p) => st(p, 'power')) >= 72, label: '장타 위험', c: '#f87171' },
    { on: avg(bats, (p) => st(p, 'speed')) >= 70, label: '발 빠른 타선', c: '#fbbf24' },
    { on: avg(bats, (p) => st(p, 'contact')) >= 74, label: '컨택 강함', c: '#fb923c' },
    { on: avg(bats, (p) => st(p, 'defense')) >= 72, label: '수비 탄탄', c: '#60a5fa' },
    { on: bats.filter((p) => p.hand === 'L').length / Math.max(1, bats.length) >= 0.35, label: '좌타 다수', c: '#a78bfa' },
    { on: avg(pits.filter((p) => p.position === 'RP'), (p) => p.overall ?? 70) < 74, label: '불펜 얇음', c: '#34d399' },
    { on: avg(pits.filter((p) => p.position === 'SP'), (p) => st(p, 'stamina')) < 70, label: '선발 이닝 짧음', c: '#34d399' },
    { on: avg(bats, (p) => st(p, 'power')) < 66, label: '한 방 없음', c: '#34d399' },
  ].filter((x) => x.on).slice(0, 4);
}

/** 약점 태그 → 되치는 세부 작전 (★ 로 표시하고 [추천 적용] 이 한 번에 넣는다) */
const COUNTER = {
  '장타 위험': { lead: '변화구 위주', shift: '외야 깊게', crisis: '피한다' },
  '발 빠른 타선': { lead: '직구 위주', shift: '내야 전진' },
  '컨택 강함': { lead: '변화구 위주' },
  '수비 탄탄': { bunt: '안 함' },
  '좌타 다수': { ph: '과감히' },
  '불펜 얇음': { first: '참는다', ph: '과감히' },
  '선발 이닝 짧음': { first: '참는다' },
  '한 방 없음': { crisis: '정면승부', shift: '정위치' },
};
/** 이 상대에게 추천하는 세부 작전 */
export function recommend(opponent) {
  const out = {};
  scoutTags(opponent).forEach((t) => Object.assign(out, COUNTER[t.label] || {}));
  // 상대 포수 수비가 무르면 뛴다
  const c = (opponent?.roster || []).find((p) => p.position === 'C');
  const cd = c?.stats?.defense;
  if (cd != null) out.steal = cd < 72 ? '자주' : cd > 80 ? '거의 안 함' : out.steal || '보통';
  return out;
}
