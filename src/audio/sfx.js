/* 효과음 — 파일 없이 브라우저에서 바로 합성한다(Web Audio).
   · 음높이는 배경음악 넷(D · A · G · G장조)에 모두 맞는 D장조 5음(D E F# A B) 안에서만
   · 자주 나는 소리(탭 · 틱)는 짧고 작게, 부를 때마다 음높이 · 크기를 살짝 흔들어 귀가 지치지 않게
   · 좋은 일은 오르는 음, 나쁜 일은 내리는 음
   레시피(RECIPES)는 순간마다 하나 — 게임에서는 play('tab') 처럼 부른다. */

import { getSettings, onSettings } from './bgm.js';

const A4 = 440;
/** D장조 5음 — 반음 수(D=0) */
const PENTA = [0, 2, 4, 7, 9];
/** D4 기준 5음 음계의 n번째 음 → Hz (n 은 음수 · 옥타브 넘어도 됨) */
export function note(n, octave = 4) {
  const o = Math.floor(n / 5); const step = PENTA[((n % 5) + 5) % 5];
  const semi = (octave - 4 + o) * 12 + step + 2 - 9; // D4 = A4 - 7
  return A4 * 2 ** (semi / 12);
}

let ctx = null; let bus = null; let noiseBuf = null;
/* 크기 · 음소거는 배경음악과 같은 설정(프로필 창 · M 키) */
let level = getSettings().sfx ?? 0.6; let muted = getSettings().muted;
onSettings((st) => { level = st.sfx ?? 0.6; muted = st.muted; });

export function sfxContext() {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  ctx = new AC();
  bus = ctx.createDynamicsCompressor(); // 여러 소리가 겹쳐도 튀지 않게
  bus.threshold.value = -14; bus.ratio.value = 4; bus.attack.value = 0.002; bus.release.value = 0.12;
  const out = ctx.createGain(); out.gain.value = 1;
  bus.connect(out).connect(ctx.destination);
  bus._out = out;
  const n = ctx.sampleRate; noiseBuf = ctx.createBuffer(1, n, n);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  loadFiles();
  return ctx;
}

/* 녹음 소리(파일) — 라이브러리 원본을 다듬어 public/audio/sfx 에 둔 것. 처음 소리를 낼 때 한꺼번에 받아 풀어 둔다 */
const buffers = new Map();
let filesAsked = false;
function loadFiles() {
  if (filesAsked || !ctx) return; filesAsked = true;
  if (import.meta.env?.DEV) window.__sfxBufs = buffers; // 개발 모드 확인용
  for (const r of Object.values(RECIPES)) if (r.file && !buffers.has(r.file)) {
    buffers.set(r.file, null);
    fetch(r.file).then((x) => x.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((b) => buffers.set(r.file, b)).catch(() => {});
  }
}
/** 파일 소리 한 번 — 부를 때마다 빠르기를 살짝 흔들어(vary) 같은 소리가 기계처럼 반복되지 않게 */
function sample(t, out, r) {
  const buf = buffers.get(r.file); if (!buf) return;
  const s = ctx.createBufferSource(); s.buffer = buf;
  if (r.vary) s.playbackRate.value = 1 + (Math.random() * 2 - 1) * r.vary;
  const g = ctx.createGain(); g.gain.value = r.gain ?? 1;
  s.connect(g).connect(out); s.start(t);
}
export function setSfxLevel(v, m = muted) { level = v; muted = m; }

/* ── 조각 ─ (크기 노드는 만들 때 0 으로 — 기본값 1 이 시작 직전 한 순간 새어 틱 소리가 났다) ─────────────────────────────────────────── */
/** 음 하나: 파형 · 주파수(끝 주파수로 미끄러짐) · 올라감/내려옴 · 크기 */
function tone(t, { type = 'sine', f, f2 = f, a = 0.002, d = 0.12, g = 0.3, dest }) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f, t); if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  const e = ctx.createGain(); e.gain.value = 0; e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  o.connect(e).connect(dest); o.start(t); o.stop(t + a + d + 0.02);
}
/** FM 종소리: 반송파 f, 변조비 ratio, 변조 깊이 idx 가 줄며 맑아진다 */
function bell(t, { f, ratio = 3.5, idx = 2.5, d = 0.6, g = 0.25, dest }) {
  const c = ctx.createOscillator(); c.frequency.value = f;
  const m = ctx.createOscillator(); m.frequency.value = f * ratio;
  const mg = ctx.createGain(); mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + d);
  m.connect(mg).connect(c.frequency);
  const e = ctx.createGain(); e.gain.value = 0; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.003); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
  c.connect(e).connect(dest); c.start(t); m.start(t); c.stop(t + d + 0.02); m.stop(t + d + 0.02);
}
/** 걸러 낸 잡음: 필터 종류 · 중심 주파수(끝으로 미끄러짐) · Q · 올라감/내려옴 */
function noise(t, { type = 'bandpass', f = 2000, f2 = f, q = 1, a = 0.005, d = 0.1, g = 0.3, dest }) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t); if (f2 !== f) fl.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  const e = ctx.createGain(); e.gain.value = 0; e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  s.connect(fl).connect(e).connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.02);
}

/* ── 순간마다 레시피 — (t, out, r) r: 흔들기용 0~1 ── */
const jitter = (base, cents) => base * 2 ** (((Math.random() * 2 - 1) * cents) / 1200);

/* 음 이름 — 5음 순번: 0 D · 1 E · 2 F# · 3 A · 4 B */
export const RECIPES = {
  /* ② 기본 누름 — 화면 안 단추 · 요소. 아날로그 UI 단추 딸깍(ESM Board Game · GDC 2026 묶음) 64ms. 가장 자주 나서 가장 작게 */
  tab: { file: 'audio/sfx/tap.mp3', gain: 0.4, vary: 0.04, len: 0.1 },
  /* ① 화면 이동 — 메인 구역 · 플레이 · 왼쪽 네비 · 경기 시작 · 위 네비 · 뒤로 가기가 모두 이 소리 하나.
     깊은 걸쇠 딸깍(ESM Lock & Mechanism) + 광택지 책장 넘김(Cinematic Sound Design Paper Foley)을 겹쳐 음 2칸 내림, 0.5초.
     단추에서 먼저 울리면(pointerdown) 뒤따르는 화면 전환(navTo · opts.auto)은 0.5초 안이면 다시 내지 않는다 */
  nav: { file: 'audio/sfx/nav.mp3', gain: 0.42, vary: 0.02, covers: ['tab'], len: 0.6 },
  /* ③ 확정 — 구매 · 영입 · 강화 · 저장 · 받기(주 단추 .pri)와 플레이 구역 오른쪽 아래 시작 단추. ② 딸깍 + 옛 시계 째깍(344 Audio Antique Clocks), 음 3칸 올려 밝게 0.14초.
     뒤따르는 화면 전환 소리(①)는 잠깐 막는다 — 누른 소리 하나만 */
  press: { file: 'audio/sfx/press.mp3', gain: 0.38, vary: 0.03, covers: ['tab', 'nav'], len: 0.2 },
  /* 화면 들어감 — 잡음이 위로 쓸려 올라감 / 돌아옴 — 아래로 */
  navIn: { alias: 'nav' }, navBack: { alias: 'nav' }, // 화면 들어감 · 돌아옴도 ① 화면 이동 소리
  /* 팝업 열림 — 두 음이 오름(A → D) / 닫힘 — 내림, 더 작게 */
  popOpen: { len: 0.2, fn(t, o, { tone, note }) {
    tone(t, { type: 'triangle', f: note(3, 5), d: 0.07, g: 0.12, dest: o });
    tone(t + 0.045, { type: 'triangle', f: note(0, 6), d: 0.1, g: 0.12, dest: o });
  } },
  popClose: { len: 0.2, fn(t, o, { tone, note }) {
    tone(t, { type: 'triangle', f: note(0, 6), d: 0.05, g: 0.08, dest: o });
    tone(t + 0.04, { type: 'triangle', f: note(3, 5), d: 0.07, g: 0.08, dest: o });
  } },
  /* 숫자 세기 — 틱마다 5음을 한 칸씩 오름(step), 다 세면 pop */
  countTick: { len: 0.06, fn(t, o, { tone, note, step = 0 }) { tone(t, { type: 'square', f: note(step, 5), d: 0.025, g: 0.055, dest: o }); } },
  countPop: { len: 0.4, fn(t, o, { tone, bell, note }) {
    tone(t, { f: note(3, 5), f2: note(0, 7), d: 0.08, g: 0.14, dest: o });
    bell(t + 0.05, { f: note(0, 6), ratio: 4, idx: 1.2, d: 0.3, g: 0.14, dest: o });
  } },
  /* 초읽기 — 남은 초(sec 5 → 1)가 줄수록 높고 크게. 1초는 한 칸 더 */
  tick: { len: 0.1, fn(t, o, { tone, noise, note, sec = 5 }) {
    const k = 5 - sec;
    tone(t, { f: note(k, 5), d: 0.05, g: 0.1 + k * 0.03, dest: o });
    noise(t, { f: 3200, q: 3, d: 0.02, g: 0.05 + k * 0.01, dest: o });
  } },
  /* 카드 날아가기 — 휙(잡음이 쓸려 올라감) 뒤 착지 쿵 */
  fly: { len: 0.7, fn(t, o, { tone, noise, land = 0.26 }) { // land: 도착하는 때(초)
    noise(t, { f: 700, f2: 3200, q: 1.2, a: Math.min(0.2, land * 0.4), d: Math.max(0.14, land * 0.5), g: 0.1, dest: o });
    tone(t + land, { f: 190, f2: 90, d: 0.08, g: 0.3, dest: o });
    noise(t + land, { type: 'lowpass', f: 1500, d: 0.03, g: 0.1, dest: o });
  } },
  /* ⑤ 드래프트 지명 — 내가 · AI 가 뽑을 때 같은 소리. 카드 뒤집어 던짐(ESM Board Game) 한 장, 음 2칸 내림 0.19초.
     1초에 최대 4번 나서 다른 소리보다 작게 */
  draftPick: { file: 'audio/sfx/card.mp3', gain: 0.26, vary: 0.04, len: 0.25 },
  /* 카드 뒤집기 — 카드 튕김 두 번(종이 결 잡음) + 맑은 음 하나 */
  flip: { vary: true, len: 0.5, fn(t, o, { noise, bell, note, jitter }) {
    noise(t, { type: 'highpass', f: 2800, d: 0.035, g: 0.13, dest: o });
    noise(t + 0.05, { type: 'bandpass', f: 1800, q: 0.7, d: 0.05, g: 0.1, dest: o });
    bell(t + 0.08, { f: jitter(note(2, 5), 10), ratio: 2, idx: 0.8, d: 0.35, g: 0.1, dest: o });
  } },
  /* 영입 도장 — 낮은 쿵 + 눌리는 잡음 + 끝 딸깍 */
  stamp: { len: 0.35, fn(t, o, { tone, noise }) {
    tone(t, { f: 150, f2: 55, d: 0.14, g: 0.36, dest: o });
    noise(t, { type: 'lowpass', f: 900, d: 0.09, g: 0.2, dest: o });
    noise(t + 0.004, { f: 2600, q: 2, d: 0.02, g: 0.12, dest: o });
  } },
  /* 보상 빛 가루 — 종소리 아르페지오 D F# A D + 고음 반짝이 잡음. 드문 순간이라 가장 크게 */
  reward: { len: 1.2, fn(t, o, { bell, noise, note }) {
    [note(0, 6), note(2, 6), note(3, 6), note(0, 7)].forEach((f, i) => bell(t + i * 0.065, { f, ratio: 3.01, idx: 1.6, d: 0.7, g: 0.16, dest: o }));
    noise(t + 0.1, { type: 'highpass', f: 7000, a: 0.08, d: 0.5, g: 0.035, dest: o });
  } },
  /* 골드 들어옴 — 동전 두 번(B → E, 금속 결) / 나감 — 내려가는 두 음, 더 작고 짧게 */
  goldIn: { vary: true, len: 0.4, fn(t, o, { bell, note, jitter }) {
    bell(t, { f: jitter(note(4, 6), 10), ratio: 5.4, idx: 1, d: 0.22, g: 0.12, dest: o });
    bell(t + 0.07, { f: jitter(note(1, 7), 10), ratio: 5.4, idx: 1, d: 0.3, g: 0.12, dest: o });
  } },
  goldOut: { vary: true, len: 0.3, fn(t, o, { tone, note }) {
    tone(t, { type: 'triangle', f: note(3, 5), d: 0.06, g: 0.09, dest: o });
    tone(t + 0.055, { type: 'triangle', f: note(1, 5), d: 0.09, g: 0.09, dest: o });
  } },
  /* 순위 오름 — 한 옥타브 미끄러져 오르고 끝에 맑은 음 / 내림 — 짧게 내려감(과장 없이) */
  rankUp: { len: 0.45, fn(t, o, { tone, bell, note }) {
    tone(t, { type: 'triangle', f: note(0, 5), f2: note(0, 6), a: 0.01, d: 0.16, g: 0.12, dest: o });
    bell(t + 0.15, { f: note(3, 6), ratio: 3, idx: 1, d: 0.25, g: 0.08, dest: o });
  } },
  rankDown: { len: 0.3, fn(t, o, { tone, note }) {
    tone(t, { type: 'triangle', f: note(3, 5), f2: note(3, 4), a: 0.01, d: 0.18, g: 0.09, dest: o });
  } },
  /* 내 차례 — 알림 종 두 번(A → D). 다른 UI 소리보다 조금 크게 */
  turn: { len: 0.7, fn(t, o, { bell, note }) {
    bell(t, { f: note(3, 5), ratio: 2, idx: 1.5, d: 0.45, g: 0.2, dest: o });
    bell(t + 0.11, { f: note(0, 6), ratio: 2, idx: 1.5, d: 0.55, g: 0.2, dest: o });
  } },

  enter: { alias: 'nav' }, section: { alias: 'nav' }, // 예전 이름 — ① 화면 이동 소리로

  /* ── 증강 ── */
  /* 증강 고르기 창이 뜸 — 반짝이가 차오르고 카드가 놓이는 박자(120ms + 110ms 씩)에 맞춰 종이 한 음씩 오름. n: 카드 수 */
  augReveal: { len: 1.4, fn(t, o, { bell, noise, tone, note, n = 3 }) {
    noise(t, { type: 'highpass', f: 1800, f2: 7500, a: 0.3, d: 0.45, g: 0.045, dest: o });
    tone(t, { type: 'triangle', f: note(0, 3), f2: note(0, 4), a: 0.25, d: 0.3, g: 0.08, dest: o });
    for (let i = 0; i < n; i++) bell(t + 0.12 + i * 0.11, { f: note(i * 2, 5), ratio: 3.01, idx: 0.9, d: 0.55, g: 0.1, dest: o });
  } },
  /* 증강 고름 — 한 옥타브 치켜 오르며 D · A 화음 종 + 아래 쿵 + 반짝이. 고르기 창에서 가장 큰 소리 */
  augPick: { len: 1.1, fn(t, o, { bell, noise, tone, note }) {
    tone(t, { f: 130, f2: 60, d: 0.12, g: 0.3, dest: o });
    tone(t, { type: 'triangle', f: note(0, 5), f2: note(0, 6), a: 0.005, d: 0.1, g: 0.12, dest: o });
    bell(t + 0.06, { f: note(0, 6), ratio: 2.01, idx: 1.4, d: 0.8, g: 0.14, dest: o });
    bell(t + 0.06, { f: note(3, 6), ratio: 3.01, idx: 1, d: 0.7, g: 0.1, dest: o });
    noise(t + 0.08, { type: 'highpass', f: 6500, a: 0.02, d: 0.4, g: 0.04, dest: o });
  } },
  /* 다시 굴리기 — 카드가 섞이는 파닥임 셋 + 짧게 치켜 오름 (새 카드가 뜨는 소리는 augReveal) */
  augReroll: { len: 0.4, fn(t, o, { noise, tone, note }) {
    for (let i = 0; i < 3; i++) noise(t + i * 0.055, { f: 1400 + i * 700, f2: 3200 + i * 700, q: 1.4, d: 0.045, g: 0.15, dest: o });
    tone(t + 0.1, { type: 'triangle', f: note(3, 5), f2: note(0, 6), d: 0.09, g: 0.08, dest: o });
  } },
  /* 증강 강화 — 강화할 레벨(lv)만큼 종이 5음으로 한 칸씩 오르고 끝 음에 반짝이. 높은 레벨일수록 길고 높게 */
  augUpgrade: { len: 1.6, fn(t, o, { bell, noise, tone, note, lv = 1 }) {
    tone(t, { f: 150, f2: 70, d: 0.1, g: 0.18, dest: o });
    const k = 2 + lv; const step = 0.07;
    for (let i = 0; i < k; i++) bell(t + i * step, { f: note(i, 5), ratio: 3.01, idx: 1.1, d: i === k - 1 ? 0.9 : 0.3, g: i === k - 1 ? 0.15 : 0.1, dest: o });
    bell(t + (k - 1) * step, { f: note(k - 1 + 5, 5), ratio: 2.01, idx: 0.8, d: 0.9, g: 0.075, dest: o }); // 끝 음 옥타브 위를 겹쳐 밝게
    noise(t + (k - 1) * step, { type: 'highpass', f: 7000, a: 0.03, d: 0.5, g: 0.045, dest: o });
  } },
};

/** 확인용 — 소리 하나를 소리 없이 그려 최고 · 평균 크기(dB)를 잰다 */
export async function measure(name, opts = {}) {
  if (!sfxContext()) return null;
  const r = RECIPES[RECIPES[name]?.alias || name]; if (!r || r.file) return null; // 파일 소리는 재지 않는다
  const live = ctx; const sr = live.sampleRate;
  const off = new OfflineAudioContext(1, Math.ceil(((r.len ?? 1.5) + 0.3) * sr), sr);
  ctx = off; const out = off.createGain(); out.gain.value = 1; out.connect(off.destination);
  try { r.fn(0.01, out, { tone, bell, noise, note, jitter: (f) => f, ...opts }); } finally { ctx = live; }
  const d = (await off.startRendering()).getChannelData(0);
  let pk = 0; let sum = 0; let on = 0;
  for (const v of d) { pk = Math.max(pk, Math.abs(v)); if (Math.abs(v) > 0.003) { sum += v * v; on++; } }
  return { peak: +(20 * Math.log10(pk)).toFixed(1), rms: +(10 * Math.log10(sum / Math.max(1, on))).toFixed(1), ms: Math.round((on / sr) * 1000) };
}

/** 효과음 내기 — name: RECIPES 의 이름, opts.gain 으로 이번만 크기 조절 */
const lastAt = new Map(); const hushUntil = new Map();
export function play(name, opts = {}) {
  if (RECIPES[name]?.alias) name = RECIPES[name].alias;
  const r = RECIPES[name]; if (!r || muted || level <= 0) return;
  if (import.meta.env?.DEV) (window.__sfx ||= []).push([name, Math.round(performance.now()), document.hidden ? '가림' : '']); // 개발 모드 확인용 — 무엇을 불렀나(창이 가려져 안 난 것은 '가림')
  if (typeof document !== 'undefined' && document.hidden) return;
  /* 같은 소리가 40ms 안에 또 오면 한 번만(개발 모드 이중 실행 · 같은 화면에 같은 조각이 둘) */
  const now = performance.now(); if (now - (lastAt.get(name) ?? -1e9) < (opts.auto ? 500 : 40)) return; lastAt.set(name, now);
  if ((hushUntil.get(name) ?? 0) > now) return; // 더 큰 소리가 이 소리를 대신했다(covers)
  r.covers?.forEach((c) => hushUntil.set(c, now + 450)); // 눌림 → 화면 전환까지 겹치는 기본 소리를 잠깐 막는다
  if (!sfxContext()) return;
  if (ctx.state === 'suspended') ctx.resume();
  const out = ctx.createGain(); out.gain.value = level * (opts.gain ?? 1) * (r.vary && !r.file ? 1 - Math.random() * 0.15 : 1);
  out.connect(bus);
  const t = ctx.currentTime + 0.005;
  if (r.file) sample(t, out, r);
  else r.fn(t, out, { tone, bell, noise, note, jitter: r.vary ? jitter : (f) => f, ...opts });
  setTimeout(() => out.disconnect(), (r.len ?? 1.5) * 1000 + 200);
}

/* 단추 누름 — 모든 단추 · 탭에 한 곳에서. 주 단추(.pri)는 두께 있는 'press', 나머지는 'tab'.
   data-sfx="이름" 으로 바꾸고, data-sfx="none" 이면 소리 없음(제 순간 소리를 따로 내는 단추) */
if (typeof window !== 'undefined') {
  /* 녹음 소리는 받아 풀 시간이 필요하다 — 첫 누름이 빈소리가 되지 않게 미리 연다(소리는 누른 뒤에야 난다) */
  setTimeout(sfxContext, 0);
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const el = e.target.closest?.('button, [role="tab"], [role="button"], a[href]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const set = el.closest('[data-sfx]')?.dataset.sfx;
    if (set === 'none') return;
    play(set || (el.classList.contains('pri') ? 'press' : 'tab'));
  }, true);
}
