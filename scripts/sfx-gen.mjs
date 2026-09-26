/* 일레븐랩스 효과음 생성기.
   node scripts/sfx-gen.mjs <spec.json> <출력 폴더>
   spec.json: [{ "id": "a-click", "text": "...", "duration": 1.0, "influence": 0.8, "takes": 3, "loop": false }]
   · 키는 .env.local 의 ELEVENLABS_API_KEY (VITE_ 를 붙이면 브라우저로 새므로 붙이지 않는다)
   · 무손실(pcm 44.1kHz)로 받아 WAV 로 저장한다 — mp3 는 짧은 소리의 어택을 뭉갠다. 플랜이 막으면 mp3 192k 로 받는다
   · 이미 있는 파일은 다시 뽑지 않는다 — 크레딧이 두 번 나가지 않게
   · 결과: <출력 폴더>/<id>-<n>.wav */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const [specPath, outDir] = process.argv.slice(2);
if (!specPath || !outDir) { console.error('사용법: node scripts/sfx-gen.mjs <spec.json> <출력 폴더>'); process.exit(1); }

const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const KEY = process.env.ELEVENLABS_API_KEY || env.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(\S+)/m)?.[1];
if (!KEY) { console.error('.env.local 에 ELEVENLABS_API_KEY 가 없다'); process.exit(1); }

const API = 'https://api.elevenlabs.io/v1/sound-generation';
const CONCURRENCY = 3;
let format = 'pcm_44100';
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const jobs = spec.flatMap((s) => Array.from({ length: s.takes || 1 }, (_, i) => ({ ...s, file: path.join(outDir, `${s.id}-${i + 1}.wav`) })))
  .filter((j) => !fs.existsSync(j.file));
console.log(`뽑을 것 ${jobs.length}개 (이미 있는 것은 건너뜀)`);

/** 받은 소리를 WAV 로 — pcm 은 머리가 없는 16bit 모노라 ffmpeg 로 감싼다 */
function toWav(bytes, fmt, file) {
  const tmp = `${file}.${fmt.startsWith('pcm') ? 'pcm' : 'mp3'}`;
  fs.writeFileSync(tmp, bytes);
  const input = fmt.startsWith('pcm') ? ['-f', 's16le', '-ar', fmt.split('_')[1], '-ac', '1', '-i', tmp] : ['-i', tmp];
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', ...input, file]);
  fs.unlinkSync(tmp);
}

let done = 0; let seconds = 0; const failed = [];
async function run(j) {
  const body = { text: j.text, model_id: 'eleven_text_to_sound_v2', prompt_influence: j.influence ?? 0.6 };
  if (j.duration) body.duration_seconds = j.duration;
  if (j.loop) body.loop = true;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${API}?output_format=${format}`, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      toWav(Buffer.from(await res.arrayBuffer()), format, j.file);
      done++; seconds += j.duration || 0;
      console.log(`  ${done}/${jobs.length} ${path.basename(j.file)}`);
      return;
    }
    const msg = (await res.text()).slice(0, 200);
    if (format !== 'mp3_44100_192' && (res.status === 403 || /output_format|tier|subscription/i.test(msg))) { format = 'mp3_44100_192'; console.log('  무손실은 플랜이 막아 mp3 192k 로 받는다'); attempt--; continue; }
    if (res.status === 429 && attempt < 3) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; }
    failed.push(`${path.basename(j.file)} — ${res.status} ${msg}`);
    return;
  }
}
const queue = [...jobs];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (queue.length) await run(queue.shift()); }));
console.log(`끝 — 성공 ${done} · 실패 ${failed.length} · 소리 길이 합 약 ${seconds.toFixed(1)}초 · 형식 ${format}`);
failed.forEach((f) => console.log('  실패', f));
if (failed.length) process.exit(2);
