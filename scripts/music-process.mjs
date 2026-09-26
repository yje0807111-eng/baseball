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
  const bar = beat * 4; // 10ms 단위
  // 2) 구간: 도입부(처음 10%)와 끝맺음(마지막 12%)을 피하고, 시작과 끝의 에너지 모양이 가장 닮은 곳 — 마디 단위로만 자른다
  const X = Math.round(0.35 * SR); // 겹치는 길이 350ms
  const cmp = 300; // 3초 창으로 닮은 정도를 본다
  const lo = Math.round(n * 0.10); const hi = Math.round(n * 0.88);
  let pick = null;
  for (let s = lo; s < lo + bar * 4; s += 1) for (let bars = 8; s + bars * bar + cmp < hi; bars++) {
    const e = s + bars * bar;
    let d = 0; for (let k = 0; k < cmp; k++) d += (env[s + k] - env[e + k]) ** 2;
    const score = d / cmp - bars * 0.002; // 길수록 조금 낫게
    if (!pick || score < pick.score) pick = { s, e, bars, score };
  }
  const S = pick.s * hop; const L = (pick.e - pick.s) * hop;
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
  console.log(`${outName}: 한 박 ${(beat / 100).toFixed(2)}초 (약 ${Math.round(6000 / beat)} BPM) · 구간 ${(S / SR).toFixed(2)}~${((S + L) / SR).toFixed(2)}초 = ${pick.bars}마디 ${(L / SR).toFixed(1)}초 · 겹침 ${(X / SR * 1000).toFixed(0)}ms · 크기 ${was.toFixed(1)} → ${LUFS} LUFS`);
}
