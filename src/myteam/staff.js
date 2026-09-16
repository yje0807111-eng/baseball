/*
 * 코치진: 감독 1 · 수석 1 · 타격 1 · 수비(투수) 1
 * effect 는 경기 엔진에 그대로 얹히는 작은 보정값이다.
 *   bat: 타자 컨택·파워 +   field: 야수 수비 +   pitch: 투수 구위·제구 +
 *   stamina: 투수 체력 +    steal: 도루 성공률 +  clutch: 승부처 지시 횟수 +
 */
const mk = (id, name, role, era, cost, effect, note) => ({ id, name, role, era, cost, effect, note, isStaff: true });

export const STAFF = [
  // 감독
  mk('mg-kimeungyong', '김응용', 'manager', '1983-2004', 70, { bat: 2, clutch: 1 }, '한국시리즈 10회 우승'),
  mk('mg-kimsunggeun', '김성근', 'manager', '1984-2017', 68, { field: 2, pitch: 1 }, '벼랑 끝 관리 야구'),
  mk('mg-kiminsik', '김인식', 'manager', '1995-2009', 60, { pitch: 2 }, 'WBC 대표팀 지휘'),
  mk('mg-ryujungil', '류중일', 'manager', '2011-2020', 62, { bat: 1, field: 1, steal: 0.03 }, '삼성 4년 연속 통합 우승'),
  mk('mg-kimtaehyung', '김태형', 'manager', '2015-2024', 64, { clutch: 1, field: 1 }, '두산 7년 연속 한국시리즈'),
  mk('mg-yeomgyeongyeop', '염경엽', 'manager', '2013-', 56, { steal: 0.05, bat: 1 }, '발야구와 데이터'),
  mk('mg-leegangchul', '이강철', 'manager', '2019-', 54, { pitch: 1, stamina: 8 }, 'KT 창단 첫 우승'),
  // 수석코치
  mk('hc-kimwonhyung', '김원형', 'head', '수석', 34, { stamina: 12 }, '투수 운영'),
  mk('hc-sonhyeokdae', '손혁', 'head', '수석', 30, { stamina: 8, pitch: 1 }, '투수 파트 조율'),
  mk('hc-jeongkyungbae', '정경배', 'head', '수석', 28, { bat: 1, field: 1 }, '기본기 중시'),
  // 타격코치
  mk('bc-kimyongdal', '김용달', 'batting', '타격', 36, { bat: 3 }, '타격 교과서'),
  mk('bc-leesungyeol', '이순철', 'batting', '타격', 30, { bat: 2, steal: 0.03 }, '주루까지 함께'),
  mk('bc-parkheungsik', '박흥식', 'batting', '타격', 28, { bat: 2 }, '컨택 중심'),
  // 수비·투수코치
  mk('pc-yangsanghun', '양상문', 'pitching', '투수', 36, { pitch: 3 }, '제구 교정'),
  mk('pc-jeongminchul', '정민철', 'pitching', '투수', 32, { pitch: 2, stamina: 6 }, '선발 관리'),
  mk('pc-parkjinman', '박진만', 'pitching', '수비', 30, { field: 3 }, '내야 수비 정비'),
];

export const staffByRole = (role) => STAFF.filter((s) => s.role === role);

/** 코치진 효과 합계 */
export function staffEffect(staff = {}) {
  const sum = { bat: 0, field: 0, pitch: 0, stamina: 0, steal: 0, clutch: 0 };
  for (const s of Object.values(staff)) {
    if (!s?.effect) continue;
    for (const k of Object.keys(sum)) sum[k] += s.effect[k] || 0;
  }
  return sum;
}
