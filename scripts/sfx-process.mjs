/* 효과음 후처리 — 따로 뽑은 소리를 한 게임처럼 들리게 한 줄로 통과시킨다.
   node scripts/sfx-process.mjs <입력 폴더> <출력 폴더>
   파일 이름 <결>-<종류>-<번호>.wav 의 종류로 설정을 고른다.
   찢어진 파형 복원(일레븐랩스는 최대치까지 밀어 클리핑된 채로 준다) → 앞 무음 자르기 → 저음 정리
   → 가벼운 압축(뭉치기) → 길이 자르기 · 끝 페이드 → 크기 맞추기 · 리미터.
   원본 최고 음량이 −20dB 보다 작으면 '약함' 으로 걸러 report.json 에 적는다 (AI 가 가끔 거의 무음을 낸다). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const [inDir, outDir] = process.argv.slice(2);
if (!inDir || !outDir) { console.error('사용법: node scripts/sfx-process.mjs <입력 폴더> <출력 폴더>'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

/* 종류별: 저음 컷(Hz) · 최대 길이(초) · 끝 페이드(초) · 목표 크기(짧은 구간 최대 RMS, dB) · 압축
   크기는 최고 음량이 아니라 짧은 구간의 최대 평균 크기로 맞춘다 — 최고 음량으로 맞추면 체감 크기가 15dB 까지 벌어졌다 */
const CEIL = -1; // 리미터 천장 dBFS
const KIND = {
  click: { hp: 150, max: 0.6, fade: 0.04, loud: -16, comp: 'acompressor=threshold=-24dB:ratio=3:attack=1:release=40' },
  card: { hp: 100, max: 1.0, fade: 0.08, loud: -14, comp: 'acompressor=threshold=-22dB:ratio=2.5:attack=2:release=60' },
  reveal: { hp: 80, max: 2.5, fade: 0.25, loud: -13, comp: 'acompressor=threshold=-20dB:ratio=2:attack=5:release=120' },
  bat: { hp: 50, max: 1.6, fade: 0.25, loud: -9, comp: 'acompressor=threshold=-18dB:ratio=2.5:attack=2:release=80' },
  crowd: { hp: 70, max: 4.0, fade: 0.4, loud: -14, comp: 'acompressor=threshold=-20dB:ratio=1.8:attack=20:release=250' },
};

const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-nostats', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });

/** 최고 음량 · 짧은 구간(50ms) 최대 RMS (dB) — astats 는 결과를 stderr 로 적는다 */
function measure(file) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-af', 'astats=metadata=0:length=0.05', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const all = r.slice(r.lastIndexOf('Overall'));
  const num = (key) => Number((all.match(new RegExp(`${key}: (-?[\\d.]+)`)) || [])[1]);
  return { peak: num('Peak level dB'), loud: num('RMS peak dB') };
}

const report = [];
for (const f of fs.readdirSync(inDir).filter((x) => x.endsWith('.wav')).sort()) {
  const kind = f.split('-')[1];
  const k = KIND[kind];
  if (!k) continue;
  const src = path.join(inDir, f); const tmp = path.join(outDir, `_${f}`); const dst = path.join(outDir, f);
  const raw = measure(src);
  // 1차: 모양 잡기 — 중간 파일은 32bit 실수로 (16bit 로 두면 복원한 봉우리가 다시 잘린다). 끝 페이드는 뒤집어 앞에 넣고 다시 뒤집는다
  run(['-y', '-i', src, '-af', [
    'adeclip',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.004',
    `highpass=f=${k.hp}`,
    k.comp,
    `atrim=0:${k.max}`,
    'areverse', `afade=t=in:d=${k.fade}`, 'areverse',
  ].join(','), '-ar', '44100', '-c:a', 'pcm_f32le', tmp]);
  // 2차: 크기를 목표로 맞추고 리미터로 찢어짐 막기 (level=0 — 켜 두면 리미터가 결과를 다시 0dB 로 끌어올린다)
  const now = measure(tmp).loud;
  const gain = Number.isFinite(now) ? k.loud - now : 0;
  run(['-y', '-i', tmp, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=${(10 ** (CEIL / 20)).toFixed(3)}:attack=1:release=30:level=0`, '-c:a', 'pcm_s16le', dst]);
  fs.unlinkSync(tmp);
  const out = measure(dst);
  const weak = !(raw.peak > -20);
  report.push({ file: f, kind, rawPeakDb: raw.peak, outPeakDb: out.peak, outLoudDb: out.loud, weak });
  console.log(`${f.padEnd(18)} 원본 최고 ${raw.peak.toFixed(1)} → 결과 최고 ${out.peak.toFixed(1)} · 크기 ${out.loud.toFixed(1)} dB${weak ? '  ← 약함' : ''}`);
}
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
