/*
 * 플레이 뷰 배경.
 *
 * kind 'field' 는 위에서 본 그라운드(타구·주자), 'zone' 은 타석 시점(투구).
 * 사진에는 아무도 없다 — 투수·야수·주자는 전부 PlayView 가 그려서 올린다.
 *
 * src        저장소 안 파일. 아직 없으면 remoteSrc 로 떨어진다(개발 중 비교용).
 * remoteSrc  생성 원본. `node scripts/fetch-ui-art.mjs <id>` 로 src 자리에 받는다.
 * marks      사진에서 잰 홈·1루·2루·3루 픽셀 자리 (필드). play-lab 의 '다이아몬드 자'로 맞춘다.
 * mound·zone 투수 발자리와 스트라이크존 상자 (존). play-lab 의 '존 보정'으로 맞춘다.
 */
import { marksFrom } from './fieldMap.js';

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_39ErNZtLqOHQ4UYgpsHczWHwg7Y/';
const gen1 = (id) => `${CDN}hf_20260917_084935_${id}.png`;
const gen2 = (id) => `${CDN}hf_20260917_090701_${id}.png`;

/* 지금 배경(broadcast-field.webp)에서 실제로 잰 값 — 마운드·파울폴까지 맞는 것을 확인했다 */
const MEASURED = marksFrom({ homeY: 731, sideY: 548, secondY: 450, halfW: 324 });
/* 화면을 꽉 채우면 홈플레이트가 아래 작전 버튼에 가린다 — 사진을 조금 위로 민다 */
const STAGE = { dy: -54 };
/* 높은 전술 부감(field-b)은 각도가 더 서 있어 홈이 내려오고 2루가 올라간다.
   아직 눈으로 맞추지 못한 어림값이다 — play-lab 의 '다이아몬드 자'로 확인해야 한다 */
const STEEP = marksFrom({ homeY: 790, sideY: 565, secondY: 395, halfW: 340 });

export const FIELD_BGS = [
  { id: 'field-b', stage: STAGE, name: '이전 B · 높은 전술 부감(지금 기본)', src: 'ui/field-b.webp', remoteSrc: gen1('28964324-b915-40a2-a7d8-f48073e82778'), marks: STEEP },
  { id: 'field-now', stage: STAGE, name: '지금 배경', src: 'ui/broadcast-field.webp', marks: MEASURED },
  // 존 뷰와 색을 맞춰 다시 뽑은 넉 장 — 에메랄드 잔디 · 테라코타 흙 · 거의 검은 관중석 (푸른 기 없음)
  { id: 'field-n1', stage: STAGE, name: '새 1 · 정통 부감', src: 'ui/field-n1.webp', remoteSrc: `${CDN}hf_20260917_094834_f5f3c9f0-281f-4d2f-8c76-0446e9dd982b.png`, marks: STEEP },
  { id: 'field-n2', stage: STAGE, name: '새 2 · 잔디 줄무늬 강조', src: 'ui/field-n2.webp', remoteSrc: `${CDN}hf_20260917_094835_73a8f60c-3422-4cd1-99c0-6b162e1639ef.png`, marks: STEEP },
  { id: 'field-n3', stage: STAGE, name: '새 3 · 옅은 안개', src: 'ui/field-n3.webp', remoteSrc: `${CDN}hf_20260917_094835_1435eac7-bf6d-4def-ba5d-249101014cff.png`, marks: STEEP },
  { id: 'field-n4', stage: STAGE, name: '새 4 · 조금 낮은 각도', src: 'ui/field-n4.webp', remoteSrc: `${CDN}hf_20260917_094835_ab483a53-c4b8-4271-ac81-90929aac1f51.png`, marks: MEASURED },
  { id: 'field-a', stage: STAGE, name: '이전 A · 정통 중계 부감', src: 'ui/field-a.webp', remoteSrc: gen1('3564cd84-d6a7-4aaf-b4d1-6d00fe87b827'), marks: MEASURED },
  { id: 'field-c', stage: STAGE, name: '이전 C · 조명 강한', src: 'ui/field-c.webp', remoteSrc: gen1('82723653-2002-455d-aa0f-6b88852c0372'), marks: MEASURED },
  { id: 'field-d', stage: STAGE, name: '이전 D · 안개', src: 'ui/field-d.webp', remoteSrc: gen1('99595426-3d99-40be-a9cc-561def4b8f0a'), marks: MEASURED },
  // 저장소에 이미 있던 야간 도심 구장 — 베이스를 직접 재서 맞춰 뒀다 (마운드 예측 800,603 / 실측 799,608)
  { id: 'field-stadium', stage: STAGE, name: '야간 도심 구장(기존 아트)', src: 'ui/stadium.webp', marks: marksFrom({ homeY: 712, sideY: 599, secondY: 533, halfW: 303 }) },
];

/* 존 뷰 기준: 배경은 빈 마운드, 투수는 PlayView 가 그린다. 아직 눈으로 맞추지 못한 어림값 */
/* 화면을 꽉 채우면 위는 점수판, 아래는 작전 버튼이 가린다 — 투수와 존이 그 사이(아트 y 270~690)에
   들어가야 한다. 투수 머리 ≈280 · 발 374 · 존 상자 404~674 */
const ZSPEC = {
  mound: [800, 374],                            // 마운드에 선 투수의 발자리
  pitcherH: 100,                                // 그려 올릴 투수 키
  zone: { cx: 806, cy: 539, hw: 122, hh: 135 }, // 스트라이크존 상자
};

export const ZONE_BGS = [
  { id: 'zone-a', name: 'A · 빈 마운드, 포수 눈높이 ★', src: 'ui/zone-a.webp', remoteSrc: gen2('ff28145e-9776-4010-b059-e30783eae655'), ...ZSPEC },
  { id: 'zone-b', name: 'B · 빈 마운드, 조금 높게', src: 'ui/zone-b.webp', remoteSrc: gen2('e7cb94b0-e44a-4259-8898-61eb0d36d8ba'), ...ZSPEC },
  { id: 'zone-c', name: 'C · 빈 마운드, 아웃포커스', src: 'ui/zone-c.webp', remoteSrc: gen2('156f6a35-7b66-4a4c-8a2d-27c0729170c3'), ...ZSPEC },
  { id: 'zone-d', name: 'D · 빈 마운드, 안개·역광', src: 'ui/zone-d.webp', remoteSrc: gen2('f2e9f091-85ea-431d-a886-1d8898cf84a2'), ...ZSPEC },
  // 사진에 투수가 박힌 예전 배경 — 우리 투수를 겹쳐 그리지 않는다
  { id: 'zone-old', name: '예전 배경(투수 있음)', src: 'ui/plate-view.webp', hasPitcher: true, release: [820, 200], zone: { cx: 806, cy: 539, hw: 122, hh: 135 } },
];

export const DEFAULT_BG = { field: FIELD_BGS[0], zone: ZONE_BGS[0] };
