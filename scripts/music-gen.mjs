/* 일레븐랩스 배경음악 생성기.
   node scripts/music-gen.mjs <spec.json> <출력 폴더> [--max <크레딧>]
   spec.json: [{ "id": "lobby", "prompt": "...", "seconds": 60, "takes": 2 }]
   · 연주곡만 (force_instrumental). 키는 .env.local 의 ELEVENLABS_API_KEY
   · 뽑기 전후로 계정 사용량을 읽어 이번에 쓴 크레딧을 적는다 (키에 User 읽기 권한이 필요)
   · --max 를 주면, 지금까지 잰 초당 비용(music-rate.json)으로 예상치를 내고 넘으면 뽑지 않는다
   · 이미 있는 파일은 다시 뽑지 않는다 — 결과: <출력 폴더>/<id>-<n>.mp3 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const [specPath, outDir] = args;
const maxAt = args.indexOf('--max'); const MAX = maxAt >= 0 ? Number(args[maxAt + 1]) : null;
if (!specPath || !outDir) { console.error('사용법: node scripts/music-gen.mjs <spec.json> <출력 폴더> [--max <크레딧>]'); process.exit(1); }

const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const KEY = process.env.ELEVENLABS_API_KEY || env.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(\S+)/m)?.[1];
if (!KEY) { console.error('.env.local 에 ELEVENLABS_API_KEY 가 없다'); process.exit(1); }
const RATE_FILE = 'scripts/music-rate.json'; // 저장소 맨 위에서 돌린다

async function used() {
  const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': KEY } });
  return r.ok ? (await r.json()).character_count : null;
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const jobs = spec.flatMap((s) => Array.from({ length: s.takes || 1 }, (_, i) => ({ ...s, file: path.join(outDir, `${s.id}-${i + 1}.mp3`) })))
  .filter((j) => !fs.existsSync(j.file));
const seconds = jobs.reduce((a, j) => a + j.seconds, 0);
const rate = fs.existsSync(RATE_FILE) ? JSON.parse(fs.readFileSync(RATE_FILE, 'utf8')).perSecond : null;
console.log(`뽑을 것 ${jobs.length}곡 · 합 ${seconds}초${rate ? ` · 예상 약 ${Math.round(seconds * rate)} 크레딧 (초당 ${rate.toFixed(1)})` : ' · 초당 비용 아직 모름'}`);
if (MAX != null && rate && seconds * rate > MAX) { console.error(`예상치가 상한 ${MAX} 을 넘어 멈춘다`); process.exit(3); }
if (MAX != null && !rate && seconds > 40) { console.error('초당 비용을 모를 때는 40초 이하로만 뽑는다 — 시험곡부터'); process.exit(3); }

const before = await used();
const failed = [];
for (const j of jobs) { // 한 곡씩 — 비용이 커서 동시에 돌리지 않는다
  const body = { prompt: j.prompt, music_length_ms: Math.round(j.seconds * 1000), model_id: 'music_v1', force_instrumental: true };
  const res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { failed.push(`${path.basename(j.file)} — ${res.status} ${(await res.text()).slice(0, 200)}`); continue; }
  fs.writeFileSync(j.file, Buffer.from(await res.arrayBuffer()));
  console.log(`  ${path.basename(j.file)} (${j.seconds}초)`);
}
const after = await used();
if (before != null && after != null) {
  const spent = after - before;
  console.log(`이번에 쓴 크레딧 ${spent}`);
  if (spent > 0 && !failed.length) fs.writeFileSync(RATE_FILE, JSON.stringify({ perSecond: spent / seconds, measured: new Date().toISOString() }));
}
failed.forEach((f) => console.log('  실패', f));
if (failed.length) process.exit(2);
