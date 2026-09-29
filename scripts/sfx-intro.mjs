// 경기 인트로 — 직접 설계해 합성한 한 벌(2.1초). 라이브러리에서 고르지 않고 화면 움직임에 맞춰 만든다.
// 화면(MatchIntro.jsx): 0 원정 이름(왼쪽 위) · 0.11 홈 이름(오른쪽 아래)이 흐린 1.5배 → 또렷(0.5초, 빠르게 들어와 부드럽게 멈춤)
//   0.30 VS 윤곽선 글자 · 0.30/0.38 구단 색 밑줄 · 1.75 흐려짐 → 2.05 사라짐. 뒤에는 경기 곡(G장조 · 128 BPM)이 흐른다.
// 원칙: 다가옴 = 거꾸로 튼 울림이 차올라 글자가 또렷해지는 때(≈0.3초)에 멎음, 원정은 왼쪽 · 홈은 오른쪽
//       VS = 초저음 쿵 + 짧은 타격 + G장조 화음 + 울림 꼬리 · 밑줄 = 아주 작은 스침(좌 · 우)
// node scripts/sfx-intro.mjs → public/_sfxlib/intro2/J01.mp3 … (들어 보기용 · git 밖). 게임에는 J02 를 public/audio/sfx/intro.mp3 로 넣었다
// 재료: 관중 함성 · 화음 타격만 Sonniss GDC 2026 묶음(C:/Users/Home/Desktop/sfx-src — git 밖), 나머지는 모두 합성
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
const SR = 44100; const LIB = 'public/_sfxlib'; const OUT = `${LIB}/intro2`; const P3 = 'C:/Users/Home/Desktop/sfx-src/pick3'; const P1 = 'C:/Users/Home/Desktop/sfx-src/pick';
fs.mkdirSync(OUT, { recursive: true });
const DUR = 2.15; const N = Math.round(DUR * SR);
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const G = { G1: 31, D2: 38, G2: 43, B2: 47, D3: 50, G3: 55, B3: 59, D4: 62, G4: 67, B4: 71, D5: 74, G5: 79, B5: 83, D6: 86 };

/* ── 조각 ── */
const mono = (sec) => new Float32Array(Math.round(sec * SR));
/** 크기 곡선 — 빠른 올라감 a · 지수 줄어듦 d(초) */
const envAD = (n, a, d) => { const e = new Float32Array(n); const na = Math.max(1, Math.round(a * SR)); for (let i = 0; i < n; i++) e[i] = i < na ? i / na : Math.exp(-(i - na) / (d * SR)); return e; };
/** 사인/톱니 — f(t) 로 음높이가 바뀜. 톱니는 PolyBLEP 로 거친 고음을 덜어 냄 */
function osc(sec, f, type = 'sine') {
  const n = Math.round(sec * SR); const o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const fr = typeof f === 'function' ? f(i / SR) : f; const dt = fr / SR; ph += dt; if (ph >= 1) ph -= 1;
    if (type === 'sine') o[i] = Math.sin(2 * Math.PI * ph);
    else { let v = 2 * ph - 1; if (ph < dt) { const t = ph / dt; v -= t + t - t * t - 1; } else if (ph > 1 - dt) { const t = (ph - 1) / dt; v -= t * t + t + t + 1; } o[i] = v; }
  }
  return o;
}
const noise = (sec) => { const o = mono(sec); for (let i = 0; i < o.length; i++) o[i] = Math.random() * 2 - 1; return o; };
/** RBJ 이차 필터 — 주파수 f(t) 가 움직여도 되게 32표본마다 계수를 다시 */
function biquad(x, type, f, q = 0.707) {
  const o = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; let b0, b1, b2, a1, a2;
  const coef = (fr) => { const w = 2 * Math.PI * Math.min(fr, SR * 0.45) / SR; const c = Math.cos(w), s = Math.sin(w), al = s / (2 * q); let B0, B1, B2; if (type === 'lp') { B0 = (1 - c) / 2; B1 = 1 - c; B2 = (1 - c) / 2; } else if (type === 'hp') { B0 = (1 + c) / 2; B1 = -(1 + c); B2 = (1 + c) / 2; } else { B0 = al; B1 = 0; B2 = -al; } const A0 = 1 + al; b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = (-2 * c) / A0; a2 = (1 - al) / A0; };
  for (let i = 0; i < x.length; i++) { if (i % 32 === 0) coef(typeof f === 'function' ? f(i / SR) : f); const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; o[i] = y; }
  return o;
}
const mul = (x, e) => x.map((v, i) => v * (e[i] ?? 0));
const gain = (x, g) => x.map((v) => v * g);
const sat = (x, drive = 2) => { const k = Math.tanh(drive); return x.map((v) => Math.tanh(v * drive) / k); };
const rev = (x) => x.slice().reverse();
const norm1 = (x) => { let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v)); return x.map((v) => v / (pk || 1)); };
/** 울림(Freeverb 짜임) — 빗살 8 · 통과 4, 좌우 조금 다르게. room 0~1, damp 0~1 */
function reverb(x, { room = 0.82, damp = 0.35, tail = 1.6 } = {}) {
  const n = x.length + Math.round(tail * SR); const out = [new Float32Array(n), new Float32Array(n)];
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]; const alls = [556, 441, 341, 225];
  for (let ch = 0; ch < 2; ch++) {
    const sp = ch ? 23 : 0; const cb = combs.map((d) => ({ b: new Float32Array(d + sp), i: 0, s: 0 })); const ab = alls.map((d) => ({ b: new Float32Array(d + sp), i: 0 }));
    for (let t = 0; t < n; t++) {
      const inp = (x[t] || 0) * 0.015; let acc = 0;
      for (const c of cb) { const y = c.b[c.i]; c.s = y * (1 - damp) + c.s * damp; c.b[c.i] = inp + c.s * room; c.i = (c.i + 1) % c.b.length; acc += y; }
      for (const a of ab) { const bo = a.b[a.i]; const y = -acc + bo; a.b[a.i] = acc + bo * 0.5; a.i = (a.i + 1) % a.b.length; acc = y; }
      out[ch][t] = acc;
    }
  }
  return out;
}
/* ── 한 벌을 쌓는 판 ── */
function Mix() { const L = new Float32Array(N), R = new Float32Array(N);
  /** at 초에 mono 를 크기 g · 좌우 pan(-1 왼쪽 ~ 1 오른쪽)로 */
  const put = (x, at, g = 1, pan = 0) => { const off = Math.round(at * SR); const gl = Math.cos((pan + 1) * Math.PI / 4) * g; const gr = Math.sin((pan + 1) * Math.PI / 4) * g; for (let i = 0; i < x.length && off + i < N; i++) { if (off + i < 0) continue; L[off + i] += x[i] * gl; R[off + i] += x[i] * gr; } };
  const putST = ([a, b], at, g = 1) => { const off = Math.round(at * SR); for (let i = 0; i < a.length && off + i < N; i++) { if (off + i < 0) continue; L[off + i] += a[i] * g; R[off + i] += b[i] * g; } };
  return { L, R, put, putST };
}
/* ── 소리 부품 ── */
/** 다가옴: 짧은 소리를 울림에 넣고 그 꼬리를 거꾸로 — 차오르다 end 초에 멎음(거꾸로 튼 울림) */
function swell(src, len = 0.32, opt) { const [a] = reverb(src, opt); const tail = a.slice(0, Math.round(len * SR)); const r = norm1(rev(tail)); const f = Math.round(0.004 * SR); for (let i = 0; i < f; i++) r[r.length - 1 - i] *= i / f; return r; }
/** 공기 휙 — 걸러 낸 잡음이 lo → hi 로 쓸리며 끝으로 갈수록 커짐(다가옴) */
const whoosh = (sec, lo, hi, q = 0.9) => { const x = biquad(noise(sec), 'bp', (t) => lo * (hi / lo) ** (t / sec), q); const e = x.map((_, i) => (i / x.length) ** 2.2); const f = Math.round(0.01 * SR); for (let i = 0; i < f; i++) e[e.length - 1 - i] *= i / f; return norm1(mul(x, e)); };
/** 초저음 쿵 — f0 에서 f1 로 떨어지는 사인 + 살짝 찌그러뜨림 */
const sub = (f0, f1, d = 0.55) => { const x = osc(1.2, (t) => f1 + (f0 - f1) * Math.exp(-t / 0.05)); return sat(mul(x, envAD(x.length, 0.002, d)), 1.6); };
/** 타격 머리 — 짧은 잡음 + 몸통(낮은 사인 튕김) */
const click = (hp = 1200, d = 0.02) => { const x = biquad(noise(0.08), 'hp', hp); return mul(x, envAD(x.length, 0.0008, d)); };
const body = (f = 180, d = 0.07) => { const x = osc(0.3, (t) => f * (0.6 + 0.4 * Math.exp(-t / 0.02))); return mul(x, envAD(x.length, 0.001, d)); };
/** 화음 치기 — 톱니 여럿을 아래로 닫히는 저역 통과로(현악 · 신스 스탭) */
function chordStab(notes, { d = 0.6, bright = 5000, closeTo = 600, det = 0.004 } = {}) { const len = d * 2.2; let x = mono(len); for (const m of notes) for (const dd of [-det, det]) { const o = osc(len, hz(m) * (1 + dd), 'saw'); for (let i = 0; i < x.length; i++) x[i] += o[i]; } x = biquad(x, 'lp', (t) => closeTo + (bright - closeTo) * Math.exp(-t / (d * 0.35)), 0.9); return norm1(mul(x, envAD(x.length, 0.003, d))); }
/** 맑은 금속 · 유리 울림 — 어긋난 배음 */
const ring = (f, d = 0.9, ratios = [1, 2.76, 5.4, 8.93]) => { let x = mono(d * 2.5); ratios.forEach((r, k) => { const o = osc(d * 2.5, f * r); const e = envAD(o.length, 0.001, d / (1 + k * 0.7)); for (let i = 0; i < x.length; i++) x[i] += o[i] * e[i] / (1 + k * 0.8); }); return norm1(x); };
/** 밑줄 스침 — 아주 짧은 고음 잡음 쓸림 */
const swipe = () => { const x = biquad(noise(0.12), 'bp', (t) => 3000 + 7000 * (t / 0.12), 1.2); return norm1(mul(x, envAD(x.length, 0.03, 0.03))); };
/** 라이브러리 재료(필요할 때만) */
const lib = (file, { len = 2 } = {}) => { const b = execFileSync(ffmpeg, ['-v', 'error', '-t', String(len), '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-']); return norm1(new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length))); };
const find = (dir, pre) => path.join(dir, fs.readdirSync(dir).find((x) => x.startsWith(pre)));

/* ── 한 벌들 ── */
const VS = 0.30; const IN_AWAY = 0.30; const IN_HOME = 0.41; // 이름이 또렷해지는 때(0.5초 모션의 앞 60%)
const V = [];
/* 1) 중계 타이틀 — MLB 더 쇼 · KBO 중계 그래픽. 맑고 단단하게, 화음은 G장조 */
V.push(['중계 타이틀 — 거꾸로 울림 좌우 · VS 에 초저음 쿵 + G장조 스탭 + 울림', () => { const m = Mix();
  const s1 = swell(ring(hz(G.D5), 0.5), 0.3, { room: 0.84 }); m.put(s1, IN_AWAY - 0.3, 0.35, -0.6); m.put(whoosh(0.3, 500, 4000), IN_AWAY - 0.3, 0.25, -0.7);
  const s2 = swell(ring(hz(G.G5), 0.5), 0.3, { room: 0.84 }); m.put(s2, IN_HOME - 0.3, 0.3, 0.6); m.put(whoosh(0.3, 600, 4500), IN_HOME - 0.3, 0.22, 0.7);
  m.put(sub(90, 45, 0.6), VS, 0.9); m.put(click(1500, 0.015), VS, 0.35); m.put(body(170, 0.08), VS, 0.5);
  const st = chordStab([G.G3, G.D4, G.G4, G.B4], { d: 0.5 }); m.put(st, VS, 0.32); m.putST(reverb(gain(st, 0.6), { room: 0.86, damp: 0.4, tail: 1.4 }), VS, 0.9);
  m.put(swipe(), 0.30, 0.12, -0.8); m.put(swipe(), 0.38, 0.12, 0.8);
  return m; }]);
/* 2) 묵직한 스타디움 — 더 낮게 · 금속 울림 · 먼 관중 웅성 */
V.push(['묵직한 스타디움 — 낮은 공기 차오름 · VS 에 큰 초저음 + 낮은 북 + 금속 울림 · 먼 관중', () => { const m = Mix();
  m.put(whoosh(0.32, 150, 1500, 0.7), IN_AWAY - 0.32, 0.45, -0.6); m.put(whoosh(0.32, 180, 1700, 0.7), IN_HOME - 0.32, 0.4, 0.6);
  m.put(sub(70, 36, 0.9), VS, 1); m.put(body(110, 0.16), VS, 0.7); m.put(click(900, 0.02), VS, 0.3);
  const r = ring(hz(G.G2) * 2, 1.1, [1, 2.0, 2.76, 4.1]); m.putST(reverb(gain(r, 0.8), { room: 0.88, damp: 0.5, tail: 1.5 }), VS, 0.6); m.put(r, VS, 0.18);
  const crowd = biquad(lib(find(P3, 'CRWDCheer_Small Club'), { len: 2.2 }), 'lp', 1400); const e = crowd.map((_, i) => Math.sin(Math.PI * Math.min(1, i / crowd.length))); m.put(mul(crowd, e), 0, 0.14);
  return m; }]);
/* 3) 깔끔한 모던 — 가볍고 세련되게. 공기 두 번 · VS 에 부드러운 쿵 + 맑은 종 화음 짧게 */
V.push(['깔끔한 모던 — 가벼운 공기 두 번 · VS 에 부드러운 쿵 + 맑은 G장조 종 화음', () => { const m = Mix();
  m.put(whoosh(0.26, 1500, 7000, 1.1), IN_AWAY - 0.26, 0.2, -0.7); m.put(whoosh(0.26, 1800, 8000, 1.1), IN_HOME - 0.26, 0.18, 0.7);
  m.put(sub(110, 60, 0.35), VS, 0.6); m.put(click(3000, 0.01), VS, 0.2);
  const bell = mono(1.6); for (const n of [G.G4, G.B4, G.D5]) { const r = ring(hz(n), 0.8, [1, 2.0, 3.01]); for (let i = 0; i < bell.length; i++) bell[i] += r[i] || 0; }
  m.put(norm1(bell), VS + 0.01, 0.22); m.putST(reverb(gain(norm1(bell), 0.5), { room: 0.8, damp: 0.3, tail: 1.2 }), VS, 0.7);
  m.put(swipe(), 0.30, 0.1, -0.8); m.put(swipe(), 0.38, 0.1, 0.8);
  return m; }]);
/* 4) 경기 곡과 맞춤 — 128 BPM. 신스 차오름이 VS 로 모여 킥 + 박수 + 베이스 스탭, 꼬리는 8분 메아리(234ms) */
V.push(['경기 곡과 맞춤 — 신스 차오름 → VS 에 킥 + 박수 + 베이스 스탭 · 8분 메아리', () => { const m = Mix();
  const riseLen = VS; const pad = biquad((() => { const x = mono(riseLen); for (const n of [G.G3, G.D4, G.G4]) { const o = osc(riseLen, hz(n), 'saw'); for (let i = 0; i < x.length; i++) x[i] += o[i]; } return x; })(), 'lp', (t) => 300 + 5000 * (t / riseLen) ** 2, 1.4);
  const pe = pad.map((_, i) => (i / pad.length) ** 1.5); m.put(norm1(mul(pad, pe)), 0, 0.22, -0.2); m.put(whoosh(riseLen, 400, 6000), 0, 0.18, 0.2);
  const kick = sat(mul(osc(0.5, (t) => 50 + 110 * Math.exp(-t / 0.03)), envAD(Math.round(0.5 * SR), 0.001, 0.25)), 2.2);
  const clap = (() => { let x = mono(0.25); for (const d of [0, 0.008, 0.017]) { const b = biquad(noise(0.25), 'bp', 1400, 1.2); const e = envAD(b.length, 0.0008, 0.05); const off = Math.round(d * SR); for (let i = 0; i + off < x.length; i++) x[i + off] += b[i] * e[i]; } return norm1(x); })();
  const bass = mul(biquad(osc(0.6, hz(G.G2), 'saw'), 'lp', (t) => 200 + 1800 * Math.exp(-t / 0.08), 1.1), envAD(Math.round(0.6 * SR), 0.003, 0.25));
  const hit = mono(0.8); [[kick, 0.9], [clap, 0.35], [norm1(bass), 0.5]].forEach(([x, g]) => { for (let i = 0; i < x.length && i < hit.length; i++) hit[i] += x[i] * g; });
  [0, 0.234, 0.468, 0.702].forEach((d, k) => m.put(k ? biquad(hit, 'hp', 250 + k * 200) : hit, VS + d, k ? 0.45 / k : 0.8, k % 2 ? 0.5 : -0.5 * (k ? 1 : 0)));
  m.put(swipe(), 0.30, 0.1, -0.8); m.put(swipe(), 0.38, 0.1, 0.8);
  return m; }]);
/* 5) 1 과 같되 VS 는 화음 대신 맑은 금속 울림(음이 덜 도드라져 곡과 부딪히지 않음) */
V.push(['중계 타이틀 · 금속 울림판 — 1 에서 화음 대신 맑은 금속 울림', () => { const m = Mix();
  m.put(swell(ring(hz(G.D5), 0.5), 0.3), IN_AWAY - 0.3, 0.35, -0.6); m.put(whoosh(0.3, 500, 4000), IN_AWAY - 0.3, 0.25, -0.7);
  m.put(swell(ring(hz(G.G5), 0.5), 0.3), IN_HOME - 0.3, 0.3, 0.6); m.put(whoosh(0.3, 600, 4500), IN_HOME - 0.3, 0.22, 0.7);
  m.put(sub(90, 45, 0.6), VS, 0.9); m.put(click(1500, 0.015), VS, 0.35); m.put(body(170, 0.08), VS, 0.5);
  const r = ring(hz(G.G3), 1.2); m.put(r, VS, 0.2); m.putST(reverb(gain(r, 0.6), { room: 0.87, damp: 0.35, tail: 1.5 }), VS, 0.8);
  m.put(swipe(), 0.30, 0.12, -0.8); m.put(swipe(), 0.38, 0.12, 0.8);
  return m; }]);
/* 6) 1 을 더 짧고 작게 — 인트로가 자주 나니 부담 없이(울림 꼬리 짧게 · 초저음 가볍게) */
V.push(['중계 타이틀 · 가벼운판 — 1 을 짧고 작게(자주 봐도 부담 없게)', () => { const m = Mix();
  m.put(whoosh(0.28, 700, 5000), IN_AWAY - 0.28, 0.22, -0.7); m.put(whoosh(0.28, 800, 5500), IN_HOME - 0.28, 0.2, 0.7);
  m.put(sub(100, 55, 0.3), VS, 0.6); m.put(click(1800, 0.012), VS, 0.3);
  const st = chordStab([G.G3, G.D4, G.G4, G.B4], { d: 0.3 }); m.put(st, VS, 0.26); m.putST(reverb(gain(st, 0.4), { room: 0.75, damp: 0.45, tail: 0.9 }), VS, 0.7);
  return m; }]);
/* 7) 하이브리드 — 1 의 뼈대 + VS 에 라이브러리 화음 타격(녹음 질감)을 옅게 겹침 */
V.push(['하이브리드 — 1 의 뼈대 + VS 에 녹음 화음 타격을 옅게', () => { const m = Mix();
  m.put(swell(ring(hz(G.D5), 0.5), 0.3), IN_AWAY - 0.3, 0.35, -0.6); m.put(whoosh(0.3, 500, 4000), IN_AWAY - 0.3, 0.25, -0.7);
  m.put(swell(ring(hz(G.G5), 0.5), 0.3), IN_HOME - 0.3, 0.3, 0.6); m.put(whoosh(0.3, 600, 4500), IN_HOME - 0.3, 0.22, 0.7);
  m.put(sub(90, 45, 0.6), VS, 0.9); m.put(body(170, 0.08), VS, 0.45);
  const rec = lib(find(P1, 'Impact Hit Rapid Chord'), { len: 1.6 }); m.put(rec, VS, 0.3);
  const st = chordStab([G.G3, G.D4, G.G4, G.B4], { d: 0.45 }); m.put(st, VS, 0.18);
  m.put(swipe(), 0.30, 0.12, -0.8); m.put(swipe(), 0.38, 0.12, 0.8);
  return m; }]);

const list = V.map(([desc, make], i) => {
  const id = `J${String(i + 1).padStart(2, '0')}`; const { L, R } = make();
  let pk = 0; for (let t = 0; t < N; t++) pk = Math.max(pk, Math.abs(L[t]), Math.abs(R[t]));
  const g = pk ? 10 ** (-3 / 20) / pk : 1; const fo = Math.round(0.3 * SR); const inter = new Float32Array(N * 2);
  for (let t = 0; t < N; t++) { const e = t > N - fo ? (N - t) / fo : 1; inter[t * 2] = Math.tanh(L[t] * g * 1.05) * e; inter[t * 2 + 1] = Math.tanh(R[t] * g * 1.05) * e; }
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-i', '-', '-b:a', '192k', `${OUT}/${id}.mp3`], { input: Buffer.from(inter.buffer) });
  return { id, part: 'full', desc, ms: Math.round(DUR * 1000) };
});
fs.writeFileSync(`${OUT}/intro2.json`, JSON.stringify(list, null, 1));
console.log(list.map((c) => `${c.id} ${c.desc}`).join('\n'));
