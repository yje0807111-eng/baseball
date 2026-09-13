// 사용법: node scripts/validate-series.mjs [파일...]   (인자 없으면 src/data/series/*.json 전체)
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'data', 'series');
const files = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f));

const KINDS = ['team', 'national', 'legend'];
const FRANCHISES = ['KIA', 'SAMSUNG', 'LG', 'DOOSAN', 'SSG', 'LOTTE', 'HANWHA', 'KIWOOM', 'NC', 'KT', 'HYUNDAI'];
const POSITIONS = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'DH'];
const MIN = { SP: 3, RP: 2, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 2 };
const BAT = ['power', 'contact', 'speed', 'defense'];
const PIT = ['stuff', 'control', 'stamina', 'stability'];

let failed = 0;
const seenIds = new Map();

for (const file of files) {
  const errs = [];
  const err = (m) => errs.push(m);
  let s;
  try {
    s = JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    console.log(`FAIL ${basename(file)}: JSON 파싱 실패 — ${e.message}`);
    failed++;
    continue;
  }

  if (typeof s.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) err('id는 소문자-케밥 문자열');
  if (basename(file, '.json') !== s.id) err(`파일명과 id 불일치 (${s.id})`);
  if (seenIds.has(s.id)) err(`id 중복: ${seenIds.get(s.id)}`);
  seenIds.set(s.id, basename(file));
  if (!KINDS.includes(s.kind)) err('kind는 team|national|legend');
  if (s.kind === 'legend' ? s.year !== null : !Number.isInteger(s.year)) err('year: legend는 null, 그 외 정수');
  if (typeof s.title !== 'string' || !s.title) err('title 필요');
  if (s.kind === 'team' ? !FRANCHISES.includes(s.franchise) : s.franchise !== null) err(`franchise: team은 ${FRANCHISES.join('|')}, 그 외 null`);
  if (typeof s.subtitle !== 'string' || !s.subtitle || s.subtitle.length > 30) err('subtitle 1~30자');
  if (typeof s.blurb !== 'string' || !s.blurb || s.blurb.length > 90) err('blurb 1~90자');
  if (!Array.isArray(s.notes)) err('notes 배열 필요');
  if (!Array.isArray(s.players) || s.players.length < 10 || s.players.length > 14) err('players 10~14명');

  const players = Array.isArray(s.players) ? s.players : [];
  const pids = new Set();
  players.forEach((p, i) => {
    const at = `players[${i}] ${p?.name ?? ''}`;
    if (typeof p.personId !== 'string' || !p.personId) err(`${at}: personId 필요`);
    if (pids.has(p.personId)) err(`${at}: 시리즈 안에서 personId 중복`);
    pids.add(p.personId);
    if (typeof p.name !== 'string' || !p.name) err(`${at}: name 필요`);
    if (!Number.isInteger(p.year) || p.year < 1982 || p.year > 2026) err(`${at}: year 1982~2026 정수`);
    if (s.kind !== 'legend' && p.year !== s.year) err(`${at}: year가 시리즈 year와 달라요`);
    if (typeof p.team !== 'string' || !p.team) err(`${at}: team 필요`);
    if (!POSITIONS.includes(p.position)) err(`${at}: position은 ${POSITIONS.join('|')}`);
    if (!['L', 'R', 'S'].includes(p.hand)) err(`${at}: hand는 L|R|S`);
    if (typeof p.isForeign !== 'boolean') err(`${at}: isForeign boolean`);
    const keys = p.position === 'SP' || p.position === 'RP' ? PIT : BAT;
    if (p.position === 'SP' || p.position === 'RP') { if (p.hand === 'S') err(`${at}: 투수 hand는 L|R`); }
    const st = p.stats || {};
    const extra = Object.keys(st).filter((k) => !keys.includes(k));
    if (extra.length) err(`${at}: 필요 없는 stats 키 ${extra.join(',')}`);
    for (const k of keys) if (!Number.isInteger(st[k]) || st[k] < 40 || st[k] > 99) err(`${at}: stats.${k} 40~99 정수`);
    if (typeof p.note !== 'string' || p.note.length > 24) err(`${at}: note 0~24자`);
    if (typeof p.source !== 'string' || !p.source) err(`${at}: source 필요`);
  });

  for (const [pos, n] of Object.entries(MIN)) {
    const c = players.filter((p) => p.position === pos).length;
    if (c < n) err(`${pos} ${c}명 (최소 ${n}명)`);
  }

  if (errs.length) {
    failed++;
    console.log(`FAIL ${basename(file)}\n  - ${errs.join('\n  - ')}`);
  } else {
    console.log(`OK   ${basename(file)} (${players.length}명)`);
  }
}

if (!files.length) console.log('검사할 파일이 없어요.');
process.exit(failed ? 1 : 0);
