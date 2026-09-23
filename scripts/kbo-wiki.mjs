/*
 * 위키백과에서 선수 문서를 읽어 좌우(투구 · 타석)와 자리를 알아낸다.
 * kbo-hands.mjs · kbo-positions.mjs 가 같이 쓰는 조각이라 따로 두었다.
 */
const API = 'https://ko.wikipedia.org/w/api.php';
const UA = { 'user-agent': 'kbo-draft-data/1.0 (local dataset build)' };

export const nap = (ms) => new Promise((r) => setTimeout(r, ms));

/** 위키가 요청을 막으면 조금씩 더 쉬었다 다시 — 끝내 안 되면 null */
export async function getJson(url) {
  for (let i = 0; i < 5; i += 1) {
    const r = await fetch(url, { headers: UA });
    const t = await r.text();
    if (t.startsWith('{')) return JSON.parse(t);
    await nap(2000 * (i + 1));
  }
  return null;
}

const HAND = { 우: 'R', 좌: 'L', 양: 'S' };
const POS = { 포수: 'C', '1루수': '1B', '2루수': '2B', '3루수': '3B', 유격수: 'SS', 좌익수: 'OF', 중견수: 'OF', 우익수: 'OF', 외야수: 'OF', 지명타자: 'DH' };
const clean = (s) => s.split('[').join('').split(']').join('').split("'").join('').split('{').join('')
  .split('}').join('').trim();

/** 인포박스에서 `|투구 = 우` 같은 줄 하나 */
function field(text, key) {
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    if (t.slice(1, eq).trim() !== key) continue;
    return clean(t.slice(eq + 1));
  }
  return null;
}
/** 인포박스에 자리가 없으면 본문에서 가장 많이 나온 자리를 쓴다 */
function guessPos(text) {
  const count = (w) => text.split(w).length - 1;
  const best = [['1루수', '1B'], ['2루수', '2B'], ['3루수', '3B'], ['유격수', 'SS'], ['포수', 'C'], ['좌익수', 'OF'], ['중견수', 'OF'], ['우익수', 'OF'], ['외야수', 'OF']]
    .map(([w, p]) => [count(w), p])
    .filter(([n]) => n >= 2)
    .sort((a, b) => b[0] - a[0]);
  return best.length ? best[0][1] : null;
}
const parse = (text) => {
  const p = field(text, '투구'), b = field(text, '타석'), pos = field(text, '포지션');
  return {
    hand: p && b ? (HAND[p[0]] || 'R') + (HAND[b[0]] || 'R') : null,
    pos: (pos ? POS[pos.split(',')[0].split('·')[0].trim()] : null) || guessPos(text),
    text,
  };
};

/** 문서 제목들 → { 제목: { hand, pos, text } } — 야구 문서가 아니면 뺀다 */
export async function pages(titles) {
  const u = `${API}?action=query&prop=revisions&rvslots=main&rvprop=content&format=json&redirects=1&formatversion=2&titles=${encodeURIComponent(titles.join('|'))}`;
  const j = await getJson(u);
  const out = {};
  if (!j) return out;
  for (const p of j.query?.pages || []) {
    if (p.missing) continue;
    const text = p.revisions?.[0]?.slots?.main?.content || '';
    if (!text.includes('야구')) continue;
    out[p.title] = parse(text);
  }
  /* 넘겨주기·정규화된 제목도 원래 이름으로 찾을 수 있게 */
  for (const r of [...(j.query?.redirects || []), ...(j.query?.normalized || [])]) {
    if (out[r.to] && !out[r.from]) out[r.from] = out[r.to];
  }
  return out;
}

/** 이름으로 찾기 — 제목에 그 이름이 들어간 문서만 (엉뚱한 사람을 잡지 않도록) */
export async function search(name) {
  const j = await getJson(`${API}?action=query&list=search&srsearch=${encodeURIComponent(`${name} 야구 선수`)}&srlimit=6&format=json&formatversion=2`);
  return (j?.query?.search || []).map((s) => s.title).filter((t) => t.includes(name));
}

/** 후보 문서 중 그 시절 팀 이름이 본문에 있는 쪽 — 동명이인을 가른다 */
export function bestOf(found, name, teams) {
  const cands = Object.entries(found).filter(([t]) => t === name || t.startsWith(`${name} (`));
  const list = cands.length ? cands : Object.entries(found);
  return list.find(([, v]) => teams.some((t) => v.text.includes(t)))?.[1]
    || (cands.length === 1 ? cands[0][1] : null);
}
