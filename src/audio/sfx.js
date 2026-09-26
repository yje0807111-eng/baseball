/* 효과음 — 파일 없이 브라우저에서 바로 합성한다(Web Audio).
   · 음높이는 배경음악 넷(D · A · G · G장조)에 모두 맞는 D장조 5음(D E F# A B) 안에서만
   · 자주 나는 소리(탭 · 틱)는 짧고 작게, 부를 때마다 음높이 · 크기를 살짝 흔들어 귀가 지치지 않게
   · 좋은 일은 오르는 음, 나쁜 일은 내리는 음
   레시피(RECIPES)는 순간마다 하나 — 게임에서는 play('tab') 처럼 부른다. */

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
let level = 0.6; let muted = false;

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
  return ctx;
}
export function setSfxLevel(v, m = muted) { level = v; muted = m; }

/* ── 조각 ─────────────────────────────────────────── */
/** 음 하나: 파형 · 주파수(끝 주파수로 미끄러짐) · 올라감/내려옴 · 크기 */
function tone(t, { type = 'sine', f, f2 = f, a = 0.002, d = 0.12, g = 0.3, dest }) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f, t); if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  o.connect(e).connect(dest); o.start(t); o.stop(t + a + d + 0.02);
}
/** FM 종소리: 반송파 f, 변조비 ratio, 변조 깊이 idx 가 줄며 맑아진다 */
function bell(t, { f, ratio = 3.5, idx = 2.5, d = 0.6, g = 0.25, dest }) {
  const c = ctx.createOscillator(); c.frequency.value = f;
  const m = ctx.createOscillator(); m.frequency.value = f * ratio;
  const mg = ctx.createGain(); mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + d);
  m.connect(mg).connect(c.frequency);
  const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.003); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
  c.connect(e).connect(dest); c.start(t); m.start(t); c.stop(t + d + 0.02); m.stop(t + d + 0.02);
}
/** 걸러 낸 잡음: 필터 종류 · 중심 주파수(끝으로 미끄러짐) · Q · 올라감/내려옴 */
function noise(t, { type = 'bandpass', f = 2000, f2 = f, q = 1, a = 0.005, d = 0.1, g = 0.3, dest }) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t); if (f2 !== f) fl.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  s.connect(fl).connect(e).connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.02);
}

/* ── 순간마다 레시피 — (t, out, r) r: 흔들기용 0~1 ── */
const jitter = (base, cents) => base * 2 ** (((Math.random() * 2 - 1) * cents) / 1200);

/* 음 이름 — 5음 순번: 0 D · 1 E · 2 F# · 3 A · 4 B */
export const RECIPES = {
  /* 탭 전환 · 보조 단추 — 나무 조각을 톡: 짧은 사인 + 아주 짧은 고음 잡음. 가장 자주 나서 가장 작게 */
  tab: { vary: true, len: 0.1, fn(t, o, { tone, noise, note, jitter }) {
    tone(t, { f: jitter(note(3, 5), 25), f2: jitter(note(3, 5), 25) * 0.9, d: 0.055, g: 0.16, dest: o });
    noise(t, { type: 'highpass', f: 5000, d: 0.012, g: 0.04, dest: o });
  } },
  /* 주 단추 — 톡 + 아래 옥타브 두께 */
  press: { vary: true, len: 0.15, fn(t, o, { tone, note, jitter }) {
    tone(t, { type: 'triangle', f: jitter(note(0, 5), 15), d: 0.09, g: 0.2, dest: o });
    tone(t, { f: note(0, 6), d: 0.06, g: 0.08, dest: o });
    tone(t, { f: 170, f2: 85, d: 0.06, g: 0.22, dest: o });
  } },
  /* 화면 들어감 — 잡음이 위로 쓸려 올라감 / 돌아옴 — 아래로 */
  navIn: { len: 0.3, fn(t, o, { noise }) { noise(t, { f: 450, f2: 2600, q: 0.9, a: 0.07, d: 0.15, g: 0.24, dest: o }); } },
  navBack: { len: 0.3, fn(t, o, { noise }) { noise(t, { f: 2400, f2: 420, q: 0.9, a: 0.05, d: 0.15, g: 0.2, dest: o }); } },
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
  fly: { len: 0.45, fn(t, o, { tone, noise }) {
    noise(t, { f: 700, f2: 3200, q: 1.2, a: 0.1, d: 0.14, g: 0.1, dest: o });
    tone(t + 0.26, { f: 190, f2: 90, d: 0.08, g: 0.3, dest: o });
    noise(t + 0.26, { type: 'lowpass', f: 1500, d: 0.03, g: 0.1, dest: o });
  } },
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
};

/** 확인용 — 소리 하나를 소리 없이 그려 최고 · 평균 크기(dB)를 잰다 */
export async function measure(name, opts = {}) {
  if (!sfxContext()) return null;
  const r = RECIPES[name]; const live = ctx; const sr = live.sampleRate;
  const off = new OfflineAudioContext(1, Math.ceil(((r.len ?? 1.5) + 0.3) * sr), sr);
  ctx = off; const out = off.createGain(); out.gain.value = 1; out.connect(off.destination);
  try { r.fn(0.01, out, { tone, bell, noise, note, jitter: (f) => f, ...opts }); } finally { ctx = live; }
  const d = (await off.startRendering()).getChannelData(0);
  let pk = 0; let sum = 0; let on = 0;
  for (const v of d) { pk = Math.max(pk, Math.abs(v)); if (Math.abs(v) > 0.003) { sum += v * v; on++; } }
  return { peak: +(20 * Math.log10(pk)).toFixed(1), rms: +(10 * Math.log10(sum / Math.max(1, on))).toFixed(1), ms: Math.round((on / sr) * 1000) };
}

/** 효과음 내기 — name: RECIPES 의 이름, opts.gain 으로 이번만 크기 조절 */
export function play(name, opts = {}) {
  const r = RECIPES[name]; if (!r || muted || level <= 0) return;
  if (!sfxContext()) return;
  if (ctx.state === 'suspended') ctx.resume();
  const out = ctx.createGain(); out.gain.value = level * (opts.gain ?? 1) * (r.vary ? 1 - Math.random() * 0.15 : 1);
  out.connect(bus);
  const t = ctx.currentTime + 0.005;
  r.fn(t, out, { tone, bell, noise, note, jitter: r.vary ? jitter : (f) => f, ...opts });
  setTimeout(() => out.disconnect(), (r.len ?? 1.5) * 1000 + 200);
}
