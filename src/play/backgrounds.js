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

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_39ErNZtLqOHQ4UYgpsHczWHwg7Y/';
const url = (id) => `${CDN}hf_20260917_084935_${id}.png`;
const url2 = (id) => `${CDN}hf_20260917_090701_${id}.png`;

/** 우리 화면 기준으로 뽑은 사진의 기본 베이스 자리 — 사진마다 조금씩 다르면 보정 자로 맞춘다 */
const SPEC = { homeY: 731, sideY: 548, secondY: 450, halfW: 324 };

export const FIELD_BGS = [
  { id: 'field-now', name: '지금 배경', src: 'ui/broadcast-field.webp', marks: marksFrom(SPEC) },
  { id: 'field-a', name: 'A · 정통 중계 부감', src: url('3564cd84-d6a7-4aaf-b4d1-6d00fe87b827'), marks: marksFrom(SPEC), remote: true },
  { id: 'field-b', name: 'B · 높은 전술 부감', src: url('28964324-b915-40a2-a7d8-f48073e82778'), marks: marksFrom(SPEC), remote: true },
  { id: 'field-c', name: 'C · 조명 강한 드라마틱', src: url('82723653-2002-455d-aa0f-6b88852c0372'), marks: marksFrom(SPEC), remote: true },
  { id: 'field-d', name: 'D · 안개 낀 차분한 밤', src: url('99595426-3d99-40be-a9cc-561def4b8f0a'), marks: marksFrom(SPEC), remote: true },
];

/* 존 뷰 기준: 배경에는 아무도 없고 빈 마운드만. 투수는 PlayView 가 그려서 올린다
   (타석마다 투수가 바뀌고, 와인드업도 움직여야 하니 사진에 박아 두면 안 된다) */
const ZSPEC = {
  mound: [800, 470],                                // 마운드에 선 투수의 발자리
  pitcherH: 150,                                    // 그려 올릴 투수 키
  zone: { cx: 810, cy: 608, hw: 158, hh: 196 },     // 스트라이크존 상자
};

export const ZONE_BGS = [
  // 임시 배경만 투수가 사진에 박혀 있다 — 그 경우 우리 투수는 그리지 않는다
  { id: 'zone-now', name: '지금 배경(임시·투수 있음)', src: 'ui/plate-view.webp', hasPitcher: true, release: [820, 272], zone: { cx: 812, cy: 552, hw: 150, hh: 186 } },
  { id: 'zone-a', name: 'A · 빈 마운드, 포수 눈높이', src: url2('ff28145e-9776-4010-b059-e30783eae655'), ...ZSPEC, remote: true },
  { id: 'zone-b', name: 'B · 빈 마운드, 조금 높게', src: url2('e7cb94b0-e44a-4259-8898-61eb0d36d8ba'), ...ZSPEC, remote: true },
  { id: 'zone-c', name: 'C · 빈 마운드, 아웃포커스', src: url2('156f6a35-7b66-4a4c-8a2d-27c0729170c3'), ...ZSPEC, remote: true },
  { id: 'zone-d', name: 'D · 빈 마운드, 안개·역광', src: url2('f2e9f091-85ea-431d-a886-1d8898cf84a2'), ...ZSPEC, remote: true },
];

export const DEFAULT_BG = { field: FIELD_BGS[0], zone: ZONE_BGS[0] };
