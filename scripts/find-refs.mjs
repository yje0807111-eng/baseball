// 선수별 얼굴 참고 사진 자동 수집 (Wikidata 대표 이미지 P18 → Wikimedia Commons)
// 사용법: node scripts/find-refs.mjs  → art-src/refs.json, art-src/refs-auto/<key>.jpg, art-src/refs-sheet-<n>.png
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'art-src', 'refs-auto');
mkdirSync(outDir, { recursive: true });
const UA = { 'User-Agent': 'kbo-card-dev/0.1 (personal non-commercial project)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 게임 내장 레전드 카드 이름 (시리즈 JSON에 없는 선수 포함)
const LEGEND_NAMES = ['류현진', '김광현', '최동원', '윤석민', '양현종', '니퍼트', '린드블럼', '알칸타라', '루친스키', '유희관', '장원삼', '송승준', '선동열', '오승환', '구대성', '정대현', '정우람', '양의지', '박경완', '진갑용', '김태군', '이승엽', '테임즈', '박병호', '오재일', '서건창', '나바로', '정근우', '고영민', '김선빈', '이대호', '김도영', '김동주', '허경민', '이종범', '강정호', '박진만', '박찬호(유격수)', '이정후', '로하스', '김현수', '이종욱', '이용규', '박해민', '최형우', '우즈', '홍성흔'];

const people = new Map(); // key → { key, name, pitcher, foreign, years: [] }
const add = (key, name, pitcher, foreign, year) => {
  const p = people.get(key) || { key, name, pitcher, foreign, years: [] };
  if (year) p.years.push(year);
  people.set(key, p);
};
for (const f of readdirSync(join(root, 'src', 'data', 'series')).filter((x) => x.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(join(root, 'src', 'data', 'series', f), 'utf8'));
  for (const p of s.players) add(p.personId, p.name, p.position === 'SP' || p.position === 'RP', p.isForeign, p.year);
}
for (const key of LEGEND_NAMES) add(key, key.replace(/\(.*\)/, ''), null, null, null);

const api = async (params) => {
  const url = `https://www.wikidata.org/w/api.php?format=json&${new URLSearchParams(params)}`;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res.json();
    await sleep(3000 * (i + 1)); // 429 등 요청 제한 시 점점 길게 대기
  }
  throw new Error(`Wikidata ${params.action} 실패`);
};
const BASEBALL_PLAYER = 'Q10871364';
const claimIds = (e, p) => (e.claims?.[p] || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const birthYear = (e) => Number((e.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time || '').slice(1, 5)) || null;
// Wikimedia 썸네일은 표준 너비(960 등)만 허용한다
const thumbUrl = (file, width = 960) => {
  const name = file.replace(/ /g, '_');
  const md5 = createHash('md5').update(name).digest('hex');
  const enc = encodeURIComponent(name);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${md5[0]}/${md5.slice(0, 2)}/${enc}/${width}px-${enc}${/\.(tif|tiff|svg)$/i.test(name) ? '.jpg' : ''}`;
};

const existing = existsSync(join(root, 'art-src', 'refs.json')) ? JSON.parse(readFileSync(join(root, 'art-src', 'refs.json'), 'utf8')) : {};
const result = { ...existing };
for (const p of people.values()) {
  const prev = result[p.key];
  if (prev?.local || ['대표 사진 없음', '야구선수 항목 없음', '검색 결과 없음'].includes(prev?.reason)) continue;
  try {
    const search = await api({ action: 'wbsearchentities', search: p.name, language: 'ko', uselang: 'ko', type: 'item', limit: '10' });
    const ids = (search.search || []).map((x) => x.id);
    if (!ids.length) { result[p.key] = { name: p.name, reason: '검색 결과 없음' }; continue; }
    const ents = Object.values((await api({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims|descriptions', languages: 'ko|en' })).entities || {});
    const season = p.years.length ? Math.min(...p.years) : null;
    const cands = ents.filter((e) => claimIds(e, 'P106').includes(BASEBALL_PLAYER) || claimIds(e, 'P641').includes('Q5369'))
      .filter((e) => !season || !birthYear(e) || (season - birthYear(e) >= 16 && season - birthYear(e) <= 45))
      .filter((e) => (p.key === '박찬호(유격수)' ? birthYear(e) >= 1990 : p.key === '박찬호(투수)' ? birthYear(e) < 1980 : true));
    const withImg = cands.find((e) => e.claims?.P18);
    if (!withImg) { result[p.key] = { name: p.name, reason: cands.length ? '대표 사진 없음' : '야구선수 항목 없음', qid: cands[0]?.id }; continue; }
    const file = withImg.claims.P18[0].mainsnak.datavalue.value;
    const url = thumbUrl(file);
    const res = await fetch(url, { headers: UA });
    if (!res.ok) { result[p.key] = { name: p.name, reason: `사진 내려받기 실패 ${res.status}`, qid: withImg.id, file }; continue; }
    const safe = p.key.replace(/[^\p{L}\p{N}-]/gu, '');
    writeFileSync(join(outDir, `${safe}.jpg`), Buffer.from(await res.arrayBuffer()));
    result[p.key] = { name: p.name, qid: withImg.id, file, url, local: `art-src/refs-auto/${safe}.jpg` };
  } catch (e) {
    result[p.key] = { name: p.name, reason: e.message };
  }
  await sleep(1200);
}
writeFileSync(join(root, 'art-src', 'refs.json'), JSON.stringify(result, null, 1));

// 검수용 시트 (얼굴 확인)
const found = Object.entries(result).filter(([, v]) => v.local);
const W = 150, H = 190, COLS = 10, PER = 60;
for (let s = 0; s * PER < found.length; s++) {
  const chunk = found.slice(s * PER, (s + 1) * PER);
  const parts = [];
  for (const [i, [key, v]] of chunk.entries()) {
    const left = (i % COLS) * W, top = Math.floor(i / COLS) * H;
    parts.push({ input: await sharp(join(root, v.local)).resize(W, H - 22, { fit: 'cover', position: 'attention' }).toBuffer(), left, top });
    parts.push({ input: Buffer.from(`<svg width="${W}" height="22"><rect width="${W}" height="22" fill="#000"/><text x="4" y="16" font-size="13" font-family="Malgun Gothic, sans-serif" fill="#fff">${s * PER + i} ${key}</text></svg>`), left, top: top + H - 22 });
  }
  await sharp({ create: { width: COLS * W, height: Math.ceil(chunk.length / COLS) * H, channels: 3, background: '#111' } })
    .composite(parts).png().toFile(join(root, 'art-src', `refs-sheet-${s + 1}.png`));
}
const missing = Object.entries(result).filter(([, v]) => !v.local);
console.log(`선수 ${people.size}명 · 사진 ${found.length}명 · 없음 ${missing.length}명`);
console.log(missing.map(([k, v]) => `${k}(${v.reason})`).join(', '));
