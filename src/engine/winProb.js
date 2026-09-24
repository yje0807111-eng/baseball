/*
 * 승률 — 지금 이 자리에서 홈(내 팀)이 이길 확률.
 *
 * 몬테카를로를 매 타석 돌릴 수는 없어서, 야구 승률 표가 그리는 모양을 식으로 옮겼다.
 *   1. 점수차에 "이 반 이닝에 낼 기대 득점"(주자 · 아웃으로 정해지는 값)을 얹고
 *   2. 남은 이닝 수로 앞으로 벌어질 점수의 흔들림(표준편차)을 잡아
 *   3. 둘을 정규분포에 넣는다.
 * scripts/win-prob.test.mjs 가 실제 시뮬 결과와 견줘 어긋나지 않는지 지킨다.
 */

/** 주자 · 아웃별 그 반 이닝 기대 득점 — 키는 1·2·3루 순서 */
const RUN_EXP = {
  '000': [0.48, 0.25, 0.10], '100': [0.85, 0.50, 0.22], '010': [1.10, 0.66, 0.32], '001': [1.35, 0.95, 0.38],
  '110': [1.44, 0.88, 0.42], '101': [1.75, 1.14, 0.50], '011': [1.96, 1.38, 0.58], '111': [2.30, 1.54, 0.75],
};
/** 그 반 이닝에 1점이라도 낼 확률 — 끝내기 자리에서는 기대 득점이 아니라 이쪽이 맞다 */
const SCORE_ODDS = {
  '000': [0.26, 0.16, 0.07], '100': [0.42, 0.27, 0.13], '010': [0.62, 0.41, 0.22], '001': [0.84, 0.66, 0.26],
  '110': [0.63, 0.42, 0.23], '101': [0.86, 0.66, 0.27], '011': [0.86, 0.68, 0.28], '111': [0.87, 0.67, 0.32],
};
const INN_VAR = 1.45; // 한 이닝 득점의 분산
const HOME_EDGE = 0.22; // 마지막 공격이 홈이라는 이점 — 점수로 환산

/** 표준정규 누적분포 — erf 근사 */
function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** 이 반 이닝에 공격 팀이 낼 기대 득점 */
export function runExp(bases = [], outs = 0) {
  const key = bases.map((b) => (b ? 1 : 0)).join('') || '000';
  return (RUN_EXP[key] || RUN_EXP['000'])[Math.min(2, outs)];
}

/**
 * 홈이 이길 확률 0~1.
 * g 는 pitchSim 의 경기 상태 — inning · top · outs · bases · home.runs · away.runs · final
 */
export function winProb(g) {
  const lead = g.home.runs - g.away.runs;
  if (g.final) return lead > 0 ? 1 : lead < 0 ? 0 : 0.5;

  const inn = g.inning;
  const last = inn >= 9 && !g.top; // 홈의 마지막 공격 — 여기서는 셈이 달라진다
  if (last) {
    if (lead > 0) return 0.99; // 앞선 채 마지막 공격이면 사실상 끝났다
    const key = g.bases.map((b) => (b ? 1 : 0)).join('') || '000';
    const odds = (SCORE_ODDS[key] || SCORE_ODDS['000'])[Math.min(2, g.outs)];
    if (lead === 0) return Math.min(0.99, odds + (1 - odds) * 0.5); // 한 점이면 끝 · 못 내면 연장
    /* 뒤진 채 마지막 공격 — 따라붙으면 연장, 넘어서면 끝내기 */
    const over = (k) => odds * 0.55 ** (k - 1); // k 점 이상 낼 확률
    const n = -lead;
    return Math.max(0.005, over(n + 1) + (over(n) - over(n + 1)) * 0.5);
  }

  const left = Math.max(0, 9 - inn); // 온전히 남은 이닝 (양 팀 공통)
  const awayLeft = left;
  /* 홈이 앞서 있으면 마지막 공격은 치지 않는다 — 그 이닝은 세지 않는다 */
  const homeLeft = Math.max(0, (g.top ? left + 1 : left) - (lead > 0 ? 1 : 0));

  /* 지금 반 이닝의 기대 득점을 점수차에 먼저 얹는다 */
  const re = runExp(g.bases, g.outs);
  let mu = lead + (g.top ? -re : re);

  /* 마지막 공격이 홈이라는 이점 — 경기가 끝나 갈수록 또렷해진다 */
  mu += HOME_EDGE * (homeLeft > awayLeft ? 1 : 0.35);

  /* 앞으로 벌어질 점수의 흔들림 — 남은 이닝이 적을수록 뒤집기 어렵다.
     지금 반 이닝은 아웃이 찬 만큼 덜 흔들리고, 실제 득점은 정규분포보다 꼬리가 두꺼워 조금 넓힌다 */
  const now = (INN_VAR * (3 - Math.min(3, g.outs))) / 3;
  const sd = Math.sqrt(INN_VAR * (awayLeft + homeLeft) + now) * 1.12;

  const p = phi(mu / sd);
  return Math.min(0.99, Math.max(0.01, p));
}

/** 백분율 정수로 */
export const winPct = (g) => Math.round(winProb(g) * 100);
