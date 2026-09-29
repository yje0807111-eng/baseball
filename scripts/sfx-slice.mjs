/* 효과음 원본 자르기 — 한 파일에 여러 버전이 이어 붙은 라이브러리 원본을 한 컷씩 떼어 들어 보기용으로.
   node scripts/sfx-slice.mjs <원본 폴더> <출력 폴더> [한 파일 최대 컷 수=6]
   · 소리가 난 곳(최고 크기 −45dB 위)이 120ms 넘게 끊기면 다른 컷
   · 컷마다 앞 5ms 여유 · 끝 30ms 페이드 · 최고 −3dBFS 로 맞춤 · 2.5초 넘으면 자름
   · 출력: <출력>/<번호>-<컷>.mp3 + manifest.json(원본 이름 · 길이 · 밝기) */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const [src, out, maxArg] = process.argv.slice(2);
if (!src || !out) { console.error('사용법: node scripts/sfx-slice.mjs <원본 폴더> <출력 폴더> [최대 컷 수]'); process.exit(1); }
const MAX = Number(maxArg) || 6;
const SR = 44100; const CH = 2;
fs.mkdirSync(out, { recursive: true });

const decode = (f) => { const b = execFileSync(ffmpeg, ['-v', 'error', '-t', '90', '-i', f, '-f', 'f32le', '-ac', String(CH), '-ar', String(SR), '-'], { maxBuffer: 2 ** 31 - 1 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const encode = (pcm, f) => execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'f32le', '-ac', String(CH), '-ar', String(SR), '-i', '-', '-b:a', '160k', f], { input: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength) });

/** 밝기 — 영점 교차 수로 대충(높을수록 고음 · 잡음) */
const bright = (x) => { let z = 0; for (let i = CH; i < x.length; i += CH) if ((x[i] >= 0) !== (x[i - CH] >= 0)) z++; return Math.round((z / (x.length / CH)) * SR / 2); };

const files = fs.readdirSync(src).filter((f) => /\.(wav|flac|aiff?)$/i.test(f)).sort();
const manifest = [];
files.forEach((name, fi) => {
  const pcm = decode(path.join(src, name));
  const n = pcm.length / CH; const hop = SR / 100; // 10ms 창
  const lv = []; let peak = 0;
  for (let i = 0; i + hop <= n; i += hop) { let m = 0; for (let j = i; j < i + hop; j++) m = Math.max(m, Math.abs(pcm[j * CH]), Math.abs(pcm[j * CH + 1])); lv.push(m); peak = Math.max(peak, m); }
  const th = peak * 10 ** (-45 / 20); const gap = 12; // 120ms
  const segs = []; let s = -1; let quiet = 0;
  lv.forEach((v, k) => { if (v > th) { if (s < 0) s = k; quiet = 0; } else if (s >= 0 && ++quiet >= gap) { segs.push([s, k - quiet + 1]); s = -1; quiet = 0; } });
  if (s >= 0) segs.push([s, lv.length]);
  const keep = segs.filter(([a, b]) => b - a >= 3).slice(0, MAX); // 30ms 넘는 것만
  keep.forEach(([a, b], ci) => {
    const from = Math.round(Math.max(0, a * hop - SR * 0.005)); const to = Math.round(Math.min(n, b * hop + SR * 0.02, from + SR * 2.5));
    const cut = pcm.slice(from * CH, to * CH);
    let pk = 0; for (const v of cut) pk = Math.max(pk, Math.abs(v));
    const g = pk ? 10 ** (-3 / 20) / pk : 1; const fade = Math.min(SR * 0.03, (to - from) / 4);
    for (let i = 0; i < to - from; i++) { const e = i > to - from - fade ? (to - from - i) / fade : 1; cut[i * CH] *= g * e; cut[i * CH + 1] *= g * e; }
    const id = `${String(fi).padStart(2, '0')}-${ci}`;
    encode(cut, path.join(out, `${id}.mp3`));
    manifest.push({ id, src: name, ms: Math.round(((to - from) / SR) * 1000), bright: bright(cut) });
  });
  console.log(`${String(fi).padStart(2, '0')} ${keep.length}/${segs.length}컷 · ${name}`);
});
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`컷 ${manifest.length}개 → ${out}`);
