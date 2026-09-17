/*
 * 선수 강점 · 약점 — 시즌 기록(source 문자열)이 있으면 기록으로, 없으면(레전드 카드 등) 능력치로 판정한다.
 * 아이콘: public/ui/traits/<id>.png (흰 문양, CSS mask 로 색을 입힌다)
 */

const num = (re, s) => { const m = s?.match(re); return m ? Number(m[1]) : null; };

/** source 예: ".300/.393 153안타 5HR 49타점 33SB 51BB" · "26G 149.1IP ERA2.53 138K 35BB WHIP1.27 12승" */
export function seasonRecord(p) {
  const s = p?.source || '';
  if (p?.type === 'pitcher') {
    const ipRaw = num(/([\d.]+)\s?IP/, s);
    const ip = ipRaw == null ? null : Math.floor(ipRaw) + (Math.round((ipRaw % 1) * 10)) / 3;
    return { g: num(/(\d+)G/, s), ip, era: num(/ERA\s?([\d.]+)/, s), k: num(/(\d+)K\b/, s), bb: num(/(\d+)BB/, s), whip: num(/WHIP\s?([\d.]+)/, s), w: num(/(\d+)승/, s), sv: num(/(\d+)\s?SV/, s), hld: num(/(\d+)\s?HLD/, s) };
  }
  const avg = num(/(?:^|\s)\.(\d{3})/, s);
  const obp = num(/\.\d{3}\/\.(\d{3})/, s);
  return { g: num(/(\d+)G/, s), avg: avg == null ? null : avg / 1000, obp: obp == null ? null : obp / 1000, hr: num(/(\d+)HR/, s), sb: num(/(\d+)SB/, s), bb: num(/(\d+)BB/, s), rbi: num(/(\d+)(?:타점|RBI)/, s) };
}

const per144 = (v, g) => (v == null || !g ? null : Math.round((v / g) * 144));
const rate = (v) => (v == null ? null : v.toFixed(3).slice(1));

/** { good: [{ id, name, why }], bad: [...], record } */
export function playerTraits(p) {
  const st = p?.stats || {};
  const r = seasonRecord(p);
  const good = [];
  const bad = [];
  const add = (list, id, name, why) => list.push({ id, name, why });
  if (p?.type === 'pitcher') {
    const k9 = r.k != null && r.ip ? (r.k * 9) / r.ip : null;
    const bb9 = r.bb != null && r.ip ? (r.bb * 9) / r.ip : null;
    const ipg = r.ip && r.g ? r.ip / r.g : null;
    if ((k9 ?? 0) >= 9 || st.stuff >= 88) add(good, 'strikeout', '탈삼진', k9 != null ? `9이닝 ${k9.toFixed(1)}K` : `구위 ${st.stuff}`);
    if ((bb9 != null && bb9 <= 2.5) || st.control >= 88) add(good, 'control', '제구', bb9 != null ? `9이닝 볼넷 ${bb9.toFixed(1)}` : `제구 ${st.control}`);
    if ((p.position === 'SP' && (ipg ?? 0) >= 6) || st.stamina >= 88) add(good, 'innings', '이닝이터', ipg != null && p.position === 'SP' ? `경기당 ${ipg.toFixed(1)}이닝` : `체력 ${st.stamina}`);
    if ((r.era != null && r.era <= 2.8) || (r.whip != null && r.whip <= 1.1)) add(good, 'stingy', '짠물', r.era != null ? `ERA ${r.era.toFixed(2)}` : `WHIP ${r.whip}`);
    if (st.stability >= 88) add(good, 'nerve', '강심장', `안정 ${st.stability}`);
    if ((bb9 ?? 0) >= 4.5 || st.control <= 60) add(bad, 'walks', '볼넷 많음', bb9 != null ? `9이닝 볼넷 ${bb9.toFixed(1)}` : `제구 ${st.control}`);
    if ((r.era ?? 0) >= 5) add(bad, 'runs', '실점 많음', `ERA ${r.era.toFixed(2)}`);
    if (p.position === 'SP' && st.stamina <= 60) add(bad, 'short', '짧은 이닝', `체력 ${st.stamina}`);
    if (st.stuff <= 60) add(bad, 'weakstuff', '구위 약함', `구위 ${st.stuff}`);
  } else {
    const sb = per144(r.sb, r.g);
    const hr = per144(r.hr, r.g);
    if ((sb ?? 0) >= 25 || st.speed >= 85) add(good, 'steal', '도루', sb != null ? `144경기 ${sb}도루` : `주루 ${st.speed}`);
    if ((hr ?? 0) >= 25 || st.power >= 88) add(good, 'power', '장타', hr != null ? `144경기 ${hr}홈런` : `파워 ${st.power}`);
    if ((r.avg ?? 0) >= 0.31 || st.contact >= 88) add(good, 'contact', '정교함', r.avg != null ? `타율 ${rate(r.avg)}` : `컨택 ${st.contact}`);
    if (r.obp != null && r.avg != null && r.obp - r.avg >= 0.08) add(good, 'eye', '선구안', `출루 ${rate(r.obp)}`);
    if (st.contact >= 75 && st.power < 65 && st.speed >= 70) add(good, 'smallball', '작전', `컨택 ${st.contact} · 주루 ${st.speed}`);
    if (st.defense >= 88) add(good, 'glove', '수비', `수비 ${st.defense}`);
    if (st.speed <= 45) add(bad, 'slow', '발 느림', `주루 ${st.speed}`);
    if (st.power <= 50) add(bad, 'nopower', '장타 없음', hr != null ? `144경기 ${hr}홈런` : `파워 ${st.power}`);
    if ((r.avg != null && r.avg < 0.25) || st.contact <= 60) add(bad, 'nocontact', '정교함 부족', r.avg != null ? `타율 ${rate(r.avg)}` : `컨택 ${st.contact}`);
    if (st.defense <= 60) add(bad, 'error', '수비 불안', `수비 ${st.defense}`);
  }
  return { good, bad, record: r };
}

/** 오른쪽 카드 · 줄에 쓰는 시즌 기록 칸 */
export function recordCells(p) {
  const r = seasonRecord(p);
  if (p?.type === 'pitcher') {
    return [['ERA', r.era?.toFixed(2)], ['이닝', r.ip ? Math.round(r.ip) : null], ['탈삼진', r.k], ['볼넷', r.bb], ['승', r.w], ['S/H', r.sv != null || r.hld != null ? `${r.sv ?? 0}/${r.hld ?? 0}` : null]];
  }
  return [['타율', rate(r.avg)], ['출루', rate(r.obp)], ['홈런', r.hr], ['도루', r.sb], ['타점', r.rbi], ['경기', r.g]];
}

export const HAND_LABEL = (p) => {
  const h = p?.hand === 'L' ? '좌' : p?.hand === 'S' ? '양' : '우';
  return { short: h, long: `${h}${p?.type === 'pitcher' ? '완' : '타'}`, color: p?.hand === 'L' ? '#f9a8d4' : p?.hand === 'S' ? '#c4b5fd' : '#7dd3fc' };
};

/** 아이콘 (흰 문양 PNG 를 mask 로 · color 로 칠한다) */
export const traitIconStyle = (id, color) => ({
  display: 'inline-block', flex: 'none', background: color,
  WebkitMaskImage: `url(ui/traits/${id}.png)`, maskImage: `url(ui/traits/${id}.png)`,
  WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center',
});
