/* 배경음악 후처리.
   node scripts/music-process.mjs song <입력.mp3> <출력 이름>   돌려 트는 곡: 앞 무음 자르기 · 끝이 뚝 끊기면 3초 페이드아웃 · 크기 맞추기
   node scripts/music-process.mjs loop <입력.mp3> <출력 이름>   계속 도는 곡: 박자를 찾아 마디가 맞는 구간을 잘라 끝과 처음을 겹쳐 끊김 없는 반복으로
   결과: <출력 이름>.wav (무손실 원본) · <출력 이름>.mp3 (들어 보기용 — loop 는 세 바퀴 이어 붙여 이음새를 들을 수 있게)
   크기는 −18 LUFS · 최고 −1.5 dBTP 로 맞춘다 (두 번 재서 선형으로) */
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const [mode, input, outName] = process.argv.slice(2);
if (!['song', 'loop'].includes(mode) || !input || !outName) { console.error('사용법: node scripts/music-process.mjs song|loop <입력> <출력 이름>'); process.exit(1); }

const SR = 44100; const CH = 2;
const LUFS = -18; const TP = -1.5;

/** 파일 → 교차 배열된 float32 스테레오 */
function decode(file) {
  const buf = execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', String(CH), '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}
/** float32 → 파일 (확장자로 형식이 정해진다) */
function encode(pcm, file, extra = []) {
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'f32le', '-ac', String(CH), '-ar', String(SR), '-i', '-', ...extra, file], { input: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength), maxBuffer: 1 << 30 });
}
/** 크기 맞추기 — loudnorm 로 한 번 재고, 잰 값으로 선형 보정 */
function normalize(src, dst, extra = []) {
  const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', src, '-af', `loudnorm=I=${LUFS}:TP=${TP}:LRA=11:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const m = JSON.parse(probe.slice(probe.lastIndexOf('{'), probe.lastIndexOf('}') + 1));
  const af = `loudnorm=I=${LUFS}:TP=${TP}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', src, '-af', af, '-ar', String(SR), ...extra, dst]);
  return Number(m.input_i);
}
const frames = (pcm) => pcm.length / CH;
const dbAt = (pcm, from, len) => { let s = 0; const a = Math.max(0, from) * CH; const b = Math.min(frames(pcm), from + len) * CH; for (let i = a; i < b; i++) s += pcm[i] * pcm[i]; return 10 * Math.log10(s / Math.max(1, b - a) + 1e-12); };

let pcm = decode(input);
const tmp = `${outName}.tmp.wav`;

if (mode === 'song') {
  // 앞 무음: 20ms 창이 −50dB 를 넘는 첫 자리에서 10ms 앞
  const win = SR * 0.02; let start = 0;
  while (start < frames(pcm) && dbAt(pcm, start, win) < -50) start += win;
  start = Math.max(0, start - SR * 0.01);
  pcm = pcm.subarray(start * CH);
  // 마지막 1초가 −40dB 보다 크면 곡이 끝맺지 않고 끊긴 것 — 3초 페이드아웃
  const cut = dbAt(pcm, frames(pcm) - SR, SR) > -40;
  if (cut) { const n = SR * 3; const s = frames(pcm) - n; const out = new Float32Array(pcm); for (let i = 0; i < n; i++) { const g = Math.cos((i / n) * Math.PI / 2); for (let c = 0; c < CH; c++) out[(s + i) * CH + c] *= g; } pcm = out; }
  encode(pcm, tmp);
  const was = normalize(tmp, `${outName}.wav`);
  normalize(tmp, `${outName}.mp3`, ['-b:a', '192k']);
  fs.unlinkSync(tmp);
  console.log(`${outName}: 앞 무음 ${(start / SR).toFixed(2)}초 자름${cut ? ' · 끝이 끊겨 3초 페이드아웃' : ''} · 크기 ${was.toFixed(1)} → ${LUFS} LUFS · 길이 ${(frames(pcm) / SR).toFixed(1)}초`);
} else {
  // 1) 박자: 10ms 에너지 증가분(온셋)의 자기상관으로 한 박 길이를 찾는다 (60~180 BPM)
  const hop = SR / 100; const n = Math.floor(frames(pcm) / hop);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = i * hop; j < (i + 1) * hop; j++) { const v = (pcm[j * CH] + pcm[j * CH + 1]) / 2; s += v * v; } env[i] = Math.log(s + 1e-9); }
  const on = env.map((v, i) => (i && v > env[i - 1] ? v - env[i - 1] : 0));
  let best = 0; let beat = 60;
  for (let lag = 33; lag <= 100; lag++) { let s = 0; for (let i = 0; i + lag < n; i++) s += on[i] * on[i + lag]; if (s > best) { best = s; beat = lag; } }
  // 1-1) 박 길이를 10ms 보다 곱게: 64박 떨어진 자리의 자기상관 봉우리로 (10ms / 64 ≈ 0.16ms 정밀)
  let far = beat * 64; let farBest = 0;
  for (let lag = beat * 64 - 64; lag <= beat * 64 + 64; lag++) { let s = 0; for (let i = 0; i + lag < n; i++) s += on[i] * on[i + lag]; if (s > farBest) { farBest = s; far = lag; } }
  const bar = (far / 64) * 4; // 10ms 단위 · 소수
  // 2) 구간: 도입부(처음 10%)와 끝맺음(마지막 12%)을 피하고, 시작과 끝의 에너지 모양이 가장 닮은 곳 — 마디 단위로만 자른다
  const X = Math.round(0.35 * SR); // 겹치는 길이 350ms
  const cmp = 300; // 3초 창으로 닮은 정도를 본다
  const lo = Math.round(n * 0.10); const hi = Math.round(n * 0.88);
  // 소리 결: 10ms 마다 2048 표본 FFT 를 40Hz~8kHz 로그 띠 48개로 — 끝과 처음의 화음 · 악기가 같은 자리를 고르려고
  const NB = 48; const FN = 2048; const band = new Float32Array(n * NB);
  {
    const re = new Float64Array(FN); const im = new Float64Array(FN);
    const win = Float64Array.from({ length: FN }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FN));
    const edge = Array.from({ length: NB + 1 }, (_, b) => Math.round((40 * (8000 / 40) ** (b / NB)) / (SR / FN)));
    const rev = new Uint32Array(FN); for (let i = 0, bits = Math.log2(FN); i < FN; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
    for (let f = 0; f < n; f++) {
      for (let i = 0; i < FN; i++) { const j = f * hop + i; re[rev[i]] = (j < frames(pcm) ? (pcm[j * CH] + pcm[j * CH + 1]) / 2 : 0) * win[i]; im[rev[i]] = 0; }
      for (let size = 2; size <= FN; size *= 2) { const h = size / 2; const a = (-2 * Math.PI) / size; for (let i = 0; i < FN; i += size) for (let k = 0; k < h; k++) { const c = Math.cos(a * k); const s = Math.sin(a * k); const tr = re[i + k + h] * c - im[i + k + h] * s; const ti = re[i + k + h] * s + im[i + k + h] * c; re[i + k + h] = re[i + k] - tr; im[i + k + h] = im[i + k] - ti; re[i + k] += tr; im[i + k] += ti; } }
      for (let b = 0; b < NB; b++) { let s = 0; for (let k = edge[b]; k <= Math.max(edge[b], edge[b + 1] - 1); k++) s += re[k] * re[k] + im[k] * im[k]; band[f * NB + b] = Math.log(s + 1e-9); }
    }
  }
  const tone = (a, b) => { let d = 0; for (let k = 0; k < cmp; k += 10) for (let q = 0; q < NB; q++) d += (band[(a + k) * NB + q] - band[(b + k) * NB + q]) ** 2; return d / ((cmp / 10) * NB); };
  let pick = null;
  for (let s = lo; s < lo + bar * 4; s += 1) for (let bars = 8; s + bars * bar + cmp < hi; bars++) {
    const e = s + Math.round(bars * bar);
    let d = 0; for (let k = 0; k < cmp; k++) d += (env[s + k] - env[e + k]) ** 2;
    const score = d / cmp + tone(s, e) * 0.5 - bars * 0.002; // 에너지 모양 + 소리 결 · 길수록 조금 낫게
    if (!pick || score < pick.score) pick = { s, e, bars, score };
  }
  console.log(`구간 고르기: 소리 결 차이 ${tone(pick.s, pick.e).toFixed(2)} (앞 3초 끼리)`);
  const S = pick.s * hop;
  // 2-1) 길이 다듬기: 박 길이를 10ms 단위로 재서 마디가 쌓이면 수십 ms 어긋난다 — 파형을 직접 맞춰 표본 단위로
  const mono = (i) => { i = Math.round(i); return (pcm[i * CH] + pcm[i * CH + 1]) / 2; };
  const corr = (a, b, len, step) => { let ab = 0, aa = 0, bb = 0; for (let k = 0; k < len; k += step) { const x = mono(a + k); const y = mono(b + k); ab += x * y; aa += x * x; bb += y * y; } return ab / Math.sqrt(aa * bb + 1e-12); };
  const rough = (pick.e - pick.s) * hop;
  const ms = SR / 1000; const env1 = (i) => { let s = 0; for (let j = 0; j < ms; j++) { const v = mono(i + j); s += v * v; } return s; };
  // 거칠게: 1ms 에너지 모양을 4초 창으로 ±60ms 안에서
  const W1 = 4000; const a1 = Array.from({ length: W1 }, (_, k) => env1(S + k * ms));
  let coarse = rough; let cBest = -Infinity;
  for (let d = -60; d <= 60; d++) {
    const b0 = S + rough + d * ms; let ab = 0, aa = 0, bb = 0;
    for (let k = 0; k < W1; k++) { const x = a1[k]; const y = env1(b0 + k * ms); ab += x * y; aa += x * x; bb += y * y; }
    const c = ab / Math.sqrt(aa * bb + 1e-12); if (c > cBest) { cBest = c; coarse = rough + d * ms; }
  }
  // 곱게: 저음(킥 · 베이스 — 2ms 평균으로 고음을 걸러 낸 파형)을 2초 창으로 ±3ms 안에서 표본 단위. 닮지 않으면(0.5 밑) 거칠게 찾은 자리 그대로
  coarse = Math.round(coarse); let L = coarse; let fBest = -Infinity;
  const LP = Math.round(2 * ms); const low = (from, len) => { const out = new Float32Array(len); let acc = 0; for (let k = -LP; k < len; k++) { acc += mono(from + k); if (k >= 0) { acc -= mono(from + k - LP); out[k] = acc; } } return out; };
  const la = low(S, 2 * SR); const lb = low(S + coarse - Math.round(3 * ms), 2 * SR + Math.round(6 * ms));
  for (let d = 0; d <= Math.round(6 * ms); d++) { let ab = 0, aa = 0, bb = 0; for (let k = 0; k < la.length; k++) { const x = la[k]; const y = lb[k + d]; ab += x * y; aa += x * x; bb += y * y; } const c = ab / Math.sqrt(aa * bb + 1e-12); if (c > fBest) { fBest = c; L = coarse - Math.round(3 * ms) + d; } }
  if (fBest < 0.5) L = coarse;
  console.log(`길이 다듬기: ${(rough / SR).toFixed(3)} → ${(L / SR).toFixed(4)}초 (${((L - rough) / ms).toFixed(1)}ms) · 에너지 닮음 ${cBest.toFixed(3)} · 저음 닮음 ${fBest.toFixed(3)}`);
  // 3) 겹치기: 끝의 X 만큼을 처음 X 와 같은 힘 곡선으로 섞어, 끝에서 처음으로 넘어갈 때 이음새가 없게
  const loop = new Float32Array(L * CH);
  for (let t = 0; t < L; t++) for (let c = 0; c < CH; c++) {
    const a = pcm[(S + X + t) * CH + c] || 0;
    if (t < L - X) { loop[t * CH + c] = a; continue; }
    const u = (t - (L - X)) / X; const b = pcm[(S + t - (L - X)) * CH + c] || 0;
    loop[t * CH + c] = a * Math.cos(u * Math.PI / 2) + b * Math.sin(u * Math.PI / 2);
  }
  encode(loop, tmp);
  const was = normalize(tmp, `${outName}.wav`, ['-c:a', 'pcm_s16le']);
  fs.unlinkSync(tmp);
  // 들어 보기: 세 바퀴를 한 파일로 (압축 이음새 없이 이음새만 들리게)
  const one = decode(`${outName}.wav`); const three = new Float32Array(one.length * 3); three.set(one, 0); three.set(one, one.length); three.set(one, one.length * 2);
  encode(three, `${outName}.x3.mp3`, ['-b:a', '192k']);
  // 게임에 넣을 파일: [한 바퀴][처음 2초] — 압축의 앞뒤 여백을 피해 1초 ~ 1초+한 바퀴 사이를 돈다 (bgm.js 의 LOOP)
  const web = new Float32Array(one.length + SR * 2 * CH); web.set(one, 0); web.set(one.subarray(0, SR * 2 * CH), one.length);
  encode(web, `${outName}.web.mp3`, ['-b:a', '192k']);
  console.log(`게임용 ${outName}.web.mp3 · 한 바퀴 ${one.length / CH} 표본`);
  console.log(`${outName}: 한 박 ${(bar / 400).toFixed(4)}초 (${(24000 / bar).toFixed(2)} BPM) · 구간 ${(S / SR).toFixed(2)}~${((S + L) / SR).toFixed(2)}초 = ${pick.bars}마디 ${(L / SR).toFixed(1)}초 · 겹침 ${(X / SR * 1000).toFixed(0)}ms · 크기 ${was.toFixed(1)} → ${LUFS} LUFS`);
}
