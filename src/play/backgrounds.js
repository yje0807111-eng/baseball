/*
 * 플레이 뷰 배경 후보.
 *
 * kind 'field' 는 위에서 본 그라운드(타구·주자), 'zone' 은 타석 시점(투구).
 * marks  — 사진에서 잰 홈·1루·2루·3루 픽셀 자리 (필드 배경만). play-lab 의 보정 자로 맞춘다.
 * zone   — 스트라이크존 상자를 놓을 자리, release — 투수가 공을 놓는 자리 (존 배경만).
 *
 * remote: true 는 아직 저장소에 없는 후보다. 생성 CDN 에서 바로 불러오므로 개발 중 비교용으로만 쓰고,
 * 고른 뒤 `node scripts/fetch-ui-art.mjs` 로 public/ui 에 받아서 src 를 로컬 파일로 바꾼다.
 */
import { marksFrom } from './fieldMap.js';

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_39ErNZtLqOHQ4UYgpsHczWHwg7Y/hf_20260917_084935_';
const url = (id) => `${CDN}${id}.png`;

/** 우리 화면 기준으로 뽑은 사진의 기본 베이스 자리 — 사진마다 조금씩 다르면 보정 자로 맞춘다 */
const SPEC = { homeY: 731, sideY: 548, secondY: 450, halfW: 324 };

export const FIELD_BGS = [
  { id: 'field-now', name: '지금 배경', src: 'ui/broadcast-field.webp', marks: marksFrom(SPEC) },
  { id: 'field-a', name: 'A · 정통 중계 부감', src: url('3564cd84-d6a7-4aaf-b4d1-6d00fe87b827'), marks: marksFrom(SPEC), remote: true },
  { id: 'field-b', name: 'B · 높은 전술 부감', src: url('28964324-b915-40a2-a7d8-f48073e82778'), marks: marksFrom(SPEC), remote: true },
  { id: 'field-c', name: 'C · 조명 강한 드라마틱', src: url('82723653-2002-455d-aa0f-6b88852c0372'), marks: marksFrom(SPEC), remote: true },
  { id: 'field-d', name: 'D · 안개 낀 차분한 밤', src: url('99595426-3d99-40be-a9cc-561def4b8f0a'), marks: marksFrom(SPEC), remote: true },
];

const ZSPEC = { zone: { cx: 812, cy: 552, hw: 150, hh: 186 }, release: [806, 300] };

export const ZONE_BGS = [
  { id: 'zone-now', name: '지금 배경(임시)', src: 'ui/plate-view.webp', ...ZSPEC, release: [820, 272] },
  { id: 'zone-a', name: 'A · 투수 전신, 앞 비움', src: url('c6a361e1-71c9-45ce-9c5d-0c9fcee2a15e'), ...ZSPEC, remote: true },
  { id: 'zone-b', name: 'B · 포수 어깨 너머', src: url('2a6255c6-f575-4b8c-8937-3b41ad1f968c'), ...ZSPEC, remote: true },
  { id: 'zone-c', name: 'C · 투수 클로즈업(아웃포커스)', src: url('e89e6f0b-24ee-44cb-85e9-f619cbba75df'), ...ZSPEC, remote: true },
  { id: 'zone-d', name: 'D · 로우앵글 역광', src: url('8cd7372e-761f-42f7-9e5f-abce7011947c'), ...ZSPEC, remote: true },
];

export const DEFAULT_BG = { field: FIELD_BGS[0], zone: ZONE_BGS[0] };
