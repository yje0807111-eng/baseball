/*
 * 타석 읽기 조각 — 선택 경기의 상황 한 줄 · 펼침 판(칸 이름 · 좌우 · 상대 투수가 던지는 곳)이 쓴다.
 * 옛 수싸움 판(DuelPanel)에서 쓰는 것만 옮겼다(2026-10-02).
 */
import { pitchMix, PITCHES, TEMPO_MAX, tempoOf, styleOf } from '../engine/pitchSim.js';

const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
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

/*
 * 좌우 — 엔진은 타자 기준(칸 열 0 = 몸쪽)이고, 화면은 보는 자리에 따라 몸쪽이 타자 쪽으로 간다.
 * 공격 판 = 포수 뒤(우타는 왼쪽에 선다), 수비 판 = 중견수 쪽(우타는 오른쪽에 선다). 스위치 타자는 투수 반대 손으로 선다
 */
export const batSide = (b, p) => (b?.hand === 'S' ? (p?.hand === 'L' ? 'R' : 'L') : b?.hand === 'L' ? 'L' : 'R');

/** 그 투수의 그 구종 구속(구위로 구종 속도 폭 안에서) */
export const veloOfP = (pitcher, t) => { const [lo, hi] = PITCHES[t].speed; return Math.round(lo + (hi - lo) * Math.max(0, Math.min(1, (st(pitcher, 'stuff', 79) - 60) / 45))); };

/*
 * 상대 투수가 이번 공을 어디로 — 구종 비율(볼카운트 반영) × 구종별 높이(직구 높게 · 변화구 낮게) × 투수 코스 성향.
 * 코스 성향은 선수 id 로 정해진다(몸쪽 선호 · 바깥 선호 · 고르게) — 같은 투수는 늘 같은 버릇.
 */
const ROW_BY = { fast: [0.45, 0.35, 0.2], sinker: [0.2, 0.4, 0.4], cutter: [0.35, 0.4, 0.25], slider: [0.15, 0.3, 0.55], curve: [0.1, 0.3, 0.6], change: [0.12, 0.33, 0.55], fork: [0.05, 0.25, 0.7] };
const COL_BIAS = [[0.46, 0.3, 0.24], [0.24, 0.3, 0.46], [0.34, 0.33, 0.33]];
const colBias = (p) => { let h = 0; for (const ch of String(p?.id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COL_BIAS[h % 3]; };
/*
 * 상대 투수가 이번에 던질 공 비율 — 실제 경기 배합 버릇(MLB 카운트 · 순서 연구):
 *  초구(0-0)엔 직구를 더(+0.15) · 몰리면 직구 계열 · 2스트라이크엔 직구 계열 아닌 공 ·
 *  방금 공에 헛스윙이 나오면 같은 공을 한 번 더(+0.3) · 직구 아닌 같은 공은 세 번 연달아 잘 안 던짐(× 0.5) ·
 *  완급 — 앞 공과 구속 차이 큰 공을 더(최대 +0.35 × 투수 성향).
 */
export function pitchWeights(g) {
  const p = g.away.pitcher, w = { ...pitchMix(p) }, ks = Object.keys(w), sty = styleOf(p);
  const last = g.lastVelo != null ? g.events?.[g.events.length - 1] : null, prev = g.events?.[g.events.length - 2];
  const lastT = last?.pitch?.type, twice = lastT && lastT !== 'fast' && prev?.pitch?.type === lastT && prev?.batter === last?.batter;
  for (const t of ks) {
    if (!g.balls && !g.strikes && t === 'fast') w[t] += 0.15;
    if (g.balls - g.strikes >= 2 || g.balls === 3) { if (PITCHES[t].fam === 'F') w[t] += t === 'fast' ? 0.3 : 0.12; }
    else if (g.strikes === 2 && PITCHES[t].fam !== 'F') w[t] += 0.25 / Math.max(1, ks.filter((k) => PITCHES[k].fam !== 'F').length);
    if (t === 'fast') w[t] += sty.selFast;
    if (last?.call === 'swinging' && t === lastT) w[t] += 0.3;
    if (twice && t === lastT) w[t] *= 0.5;
    w[t] += (tempoOf(g.lastVelo, veloOfP(p, t)) / TEMPO_MAX) * 0.35 * sty.selTempo;
  }
  const tot = Object.values(w).reduce((a, b) => a + b, 0);
  return Object.fromEntries(ks.map((k) => [k, w[k] / tot]));
}
/** 9칸(0~8) 확률 — 합이 1 */
export function locOf(g) {
  const w = pitchWeights(g), col = colBias(g.away.pitcher);
  return Array.from({ length: 9 }, (_, z) => Object.keys(w).reduce((n, t) => n + w[t] * ROW_BY[t][Math.floor(z / 3)] * col[z % 3], 0));
}
