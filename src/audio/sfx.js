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
let level = getSettings().sfx ?? 0.6; let muted = getSettings().muted || getSettings().sfxOff;
onSettings((st) => { level = st.sfx ?? 0.6; muted = st.muted || st.sfxOff; }); // 전체 음소거 · 효과음만 끄기 둘 다

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
function sample(t, out, r, seq = [{ at: 0, g: 1 }]) {
  const buf = buffers.get(r.file); if (!buf) return;
  /* seq: 같은 소리를 여러 번(at 초 뒤 · 크기 g) — 대진표 칸처럼 박자에 맞춘 한 줄기 */
  for (const { at = 0, g: sg = 1 } of seq) {
    const s = ctx.createBufferSource(); s.buffer = buf;
    if (r.vary) s.playbackRate.value = 1 + (Math.random() * 2 - 1) * r.vary;
    const g = ctx.createGain(); g.gain.value = (r.gain ?? 1) * sg;
    s.connect(g).connect(out); s.start(t + at);
  }
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
  /* 네비 바 이동 — 위 탭 · 플레이 왼쪽 네비. ① 화면 이동의 앞 0.22초만(걸쇠 딸깍 + 책장 앞머리) — 같은 가족의 짧은 판 */
  navTab: { file: 'audio/sfx/nav-tab.mp3', gain: 0.4, vary: 0.02, covers: ['tab'], len: 0.3 },
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
  /* 숫자 세기 — 경기 결과 내 점수 · 아이템 사용 능력치 · 랭크 RP. 세는 동안 계수기 기계 톡(ESM HD Lock & Mechanism) 60ms 를 같은 음으로,
     다 세면 ③ 확정(딸깍 + 째깍)으로 걸림. 틱은 45ms 에 한 번까지라 작게 */
  countTick: { file: 'audio/sfx/count-tick.mp3', gain: 0.22, vary: 0.02, len: 0.08 },
  countPop: { alias: 'press' },
  /* 남은 5초 — 드래프트 내 차례 마지막 5초, 1초마다. 5~2초는 옛 괘종시계 째깍(344 Audio Antique Clocks) 같은 크기로,
     마지막 1초는 ③ 확정(딸깍 + 째깍)으로 걸림 — 곧바로 자동 지명 */
  tick: { file: 'audio/sfx/clock.mp3', gain: 0.32, len: 0.2 },
  tickLast: { alias: 'press' },
  /* 카드 날아가기 — 휙(잡음이 쓸려 올라감) 뒤 착지 쿵 */
  fly: { len: 0.7, fn(t, o, { tone, noise, land = 0.26 }) { // land: 도착하는 때(초)
    noise(t, { f: 700, f2: 3200, q: 1.2, a: Math.min(0.2, land * 0.4), d: Math.max(0.14, land * 0.5), g: 0.1, dest: o });
    tone(t + land, { f: 190, f2: 90, d: 0.08, g: 0.3, dest: o });
    noise(t + land, { type: 'lowpass', f: 1500, d: 0.03, g: 0.1, dest: o });
  } },
  /* ⑥ 작은 보상 — 영입 · 주간 과제 받기 · 한 구단 이김. 성공 스팅어 앞부분(ESM Anime Game Power Up) 0.65초 */
  rewardS: { file: 'audio/sfx/reward-s.mp3', gain: 0.34, len: 0.7 },
  /* 대진표 칸 톡 — 카지노 딜링 한 장 앞머리(344 Audio Casino Cards) 45ms. 칸이 밀려 들어오는 박자대로 seq 로 이어 '파라락' 한 줄기(TournamentBracket) */
  deal: { file: 'audio/sfx/deal.mp3', gain: 0.34, vary: 0.03, len: 0.1 },
  /* 목록 첫 등장 — 타자기 캐리지 톡(344 Audio Antique Typewriter) 45ms 를 줄 박자대로 6번(두 줄마다) — 명단이 찍히듯. ① 화면 이동과 같이 나니 옅게 */
  type: { file: 'audio/sfx/type.mp3', gain: 0.22, vary: 0.04, len: 0.1 },
  /* 로비 첫 등장 — 로그인 뒤 · 앱을 연 뒤 한 번, 판들이 올라올 때 광택지 책장 스르륵(음 2칸 내림 · 먹먹하게) 0.45초. ① 화면 이동 뒤라 옅게 */
  lobbyIn: { file: 'audio/sfx/lobby.mp3', gain: 0.24, len: 0.55 },
  /* ⑤ 드래프트 지명 — 내가 · AI 가 뽑을 때 같은 소리. 카드 뒤집어 던짐(ESM Board Game) 한 장, 음 2칸 내림 0.19초.
     1초에 최대 4번 나서 다른 소리보다 작게 */
  draftPick: { file: 'audio/sfx/card.mp3', gain: 0.26, vary: 0.04, len: 0.25 },
  /* 카드 뒤집기 — 경기 결과 MVP 카드 · 드래프트 기념 카드(여러 장 0.14초 간격). 쓸림(인포그래픽 휙, 음 2칸 올림) + 카드 탁(⑤ 와 같은 재료) 0.27초 */
  flip: { file: 'audio/sfx/flip.mp3', gain: 0.32, vary: 0.03, len: 0.35 },
  /* 경기 인트로 — 한 벌(2.1초)을 직접 설계해 합성: 0 · 0.11초 두 구단 이름이 다가올 때 낮은 공기 차오름(원정 왼쪽 · 홈 오른쪽),
     0.3초 VS 에 큰 초저음 쿵 + 낮은 북 + 금속 울림(G), 아래에 먼 관중 웅성(Sonniss 함성을 먹먹하게) — scripts/sfx-intro.mjs '묵직한 스타디움'(J02) */
  introFull: { file: 'audio/sfx/intro.mp3', gain: 0.45, len: 2.2 },
  /* ⑥ 큰 보상 — 경기 승리 · 랭크 등급 오름 · 구단 정복 완료. 성공 스팅어 전체(ESM Anime Game Power Up) 1.5초 — 작은 보상은 같은 소리의 앞부분 */
  reward: { file: 'audio/sfx/reward.mp3', gain: 0.4, len: 1.6 },
  /* 골드 들어옴 — 동전 두 번(B → E, 금속 결) / 나감 — 내려가는 두 음, 더 작고 짧게 */
  goldIn: { vary: true, len: 0.4, fn(t, o, { bell, note, jitter }) {
    bell(t, { f: jitter(note(4, 6), 10), ratio: 5.4, idx: 1, d: 0.22, g: 0.12, dest: o });
    bell(t + 0.07, { f: jitter(note(1, 7), 10), ratio: 5.4, idx: 1, d: 0.3, g: 0.12, dest: o });
  } },
  goldOut: { vary: true, len: 0.3, fn(t, o, { tone, note }) {
    tone(t, { type: 'triangle', f: note(3, 5), d: 0.06, g: 0.09, dest: o });
    tone(t + 0.055, { type: 'triangle', f: note(1, 5), d: 0.09, g: 0.09, dest: o });
  } },
  /* 순위 — 랭크전 순위표에서 내 줄이 0.6초 미끄러져 새 자리에 닿음(0.55초에 착지). 레일 미끄러짐(ESM 줄자 되감김) → 걸쇠(① 과 한 가족),
     내려감은 같은 짝을 음 4칸 내려 어둡게. 같은 화면의 RP 세기(계수기 톡 → ③ 확정, 1.1초)와 재료 · 때가 겹치지 않게 */
  rankUp: { file: 'audio/sfx/rank-up.mp3', gain: 0.34, len: 0.8 },
  rankDown: { file: 'audio/sfx/rank-down.mp3', gain: 0.3, len: 0.9 },

  enter: { alias: 'nav' }, section: { alias: 'nav' }, // 예전 이름 — ① 화면 이동 소리로

  /* ── 증강 ── */
  /* ⑨ 증강 창 뜸 · 다시 굴리기 — 같은 소리: 카드 여러 장 집기(344 Audio Casino Cards) 0.22초.
     다시 굴리기 단추는 소리 없이(data-sfx="none") 새 카드가 뜰 때 한 번만 — 누름과 뜸이 0.1초 넘게 벌어져 두 번 나지 않게 */
  augReveal: { file: 'audio/sfx/aug-cards.mp3', gain: 0.36, vary: 0.03, len: 0.3 },
  augReroll: { alias: 'augReveal' },
  /* ⑨ 증강 고름 — 큰 보상(성공 스팅어) 앞 1초. 이 창에서 가장 큰 소리 */
  augPick: { file: 'audio/sfx/aug-pick.mp3', gain: 0.4, len: 1.1, covers: ['nav'], coverMs: 1100 }, // 고른 뒤 0.62초에 경기로 넘어가도 화면 이동 소리는 겹치지 않게
  /* 강화 — 단추 누름은 ③ 확정(주 단추), 성공은 ⑥ 작은 보상, 실패는 작은 보상을 음 7칸 내려 어둡게(성공음의 그림자) 0.8초.
     실패는 라커 아이템 사용의 강화 실패에서(카드가 닿는 0.42초) */
  augUpgrade: { alias: 'rewardS' },
  upFail: { file: 'audio/sfx/up-fail.mp3', gain: 0.36, len: 0.9 },
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
  /* 같은 소리가 40ms 안에 또 오면 한 번만(개발 모드 이중 실행 · 같은 화면에 같은 조각이 둘) */
  const now = performance.now(); if (now - (lastAt.get(name) ?? -1e9) < (opts.auto ? 500 : 40)) return; lastAt.set(name, now);
  if ((hushUntil.get(name) ?? 0) > now) return; // 더 큰 소리가 이 소리를 대신했다(covers)
  r.covers?.forEach((c) => hushUntil.set(c, now + (r.coverMs ?? 450))); // 눌림 → 화면 전환까지 겹치는 기본 소리를 잠깐 막는다
  if (import.meta.env?.DEV) (window.__sfx ||= []).push([name, Math.round(performance.now()), document.hidden ? '가림' : '']); // 개발 모드 확인용 — 실제로 낼 소리(창이 가려져 안 난 것은 '가림')
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!sfxContext()) return;
  if (ctx.state === 'suspended') ctx.resume();
  const out = ctx.createGain(); out.gain.value = level * (opts.gain ?? 1) * (r.vary && !r.file ? 1 - Math.random() * 0.15 : 1);
  out.connect(bus);
  const t = ctx.currentTime + 0.005;
  if (r.file) sample(t, out, r, opts.seq);
  else r.fn(t, out, { tone, bell, noise, note, jitter: r.vary ? jitter : (f) => f, ...opts });
  const tail = opts.seq ? Math.max(...opts.seq.map((q) => q.at || 0)) : 0;
  setTimeout(() => out.disconnect(), ((r.len ?? 1.5) + tail) * 1000 + 200);
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
