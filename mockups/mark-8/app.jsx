/* 수비 표시 8안 — 경기장 사진과 좌표는 그대로, 선수를 어떻게 보여줄지만 다르다.
   장면: 좌중간 2루타. 좌익수가 쫓고, 유격수가 중계 자리, 2루수가 2루 커버, 주자 둘이 돈다. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';

/* ── 좌표 — play-field 와 같은 카메라를 패널 크기로 줄인 것 ─────────── */
const W = 900, H = 470;
const K = W / 1400;                                  // 1400×764 기준값을 줄인다
const CAM = { back: 25.65, high: 17.65, focal: 961.4 * K };
const TIL = Math.atan2(CAM.high, CAM.back + 58);
const CT = Math.cos(TIL), ST = Math.sin(TIL);
const CX = W / 2, CY = 269 * K - (764 * K - H) / 2;
const cam = (p, h = 0) => {
  const y = p[1] + CAM.back, z = CAM.high - h;
  const far = Math.max(9, y * CT + z * ST);
  const up = -y * ST + z * CT;
  const s = CAM.focal / far;
  return { x: CX + p[0] * s, y: CY + up * s, s };
};
const px = (p, h = 0) => { const c = cam(p, h); return [c.x, c.y]; };
const sc = (p) => cam(p, 0).s;
const RAD = Math.PI / 180;
const at = (deg, d) => [Math.sin(deg * RAD) * d, Math.cos(deg * RAD) * d];
const BASE = { 1: at(45, 27.4), 2: at(0, 38.8), 3: at(-45, 27.4), 4: [0, 0] };
const OFF = '#34d399';
const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${px(p)[0]} ${px(p)[1]}`).join(' ');

/* ── 실제 팀에서 수비 아홉을 뽑는다 ────────────────────────────────── */
const PLACE = {
  P: [0, 18.4, '투', 'P'], C: [0, -1.6, '포', 'C'],
  '1B': [38, 33, '1', '1B'], '2B': [20, 43, '2', '2B'],
  SS: [-20, 43, '유', 'SS'], '3B': [-38, 33, '3', '3B'],
  LF: [-27, 88, '좌', 'LF'], CF: [0, 95, '중', 'CF'], RF: [27, 88, '우', 'RF'],
};
const LAND = at(-19, 92), CHASE = at(-22, 99), CUT = at(-12, 46);
const pickTeam = () => {
  const pool = SERIES.filter((s) => s.players.filter((p) => p.type === 'batter').length >= 9
    && s.players.some((p) => p.type === 'pitcher'));
  const s = pool.find((x) => /삼성|두산|기아|KIA|롯데/.test(x.title || '')) || pool[0];
  const bats = s.players.filter((p) => p.type === 'batter');
  const arms = s.players.filter((p) => p.type === 'pitcher').sort((a, b) => b.overall - a.overall);
  const used = new Set();
  const take = (pos) => {
    const c = bats.filter((p) => !used.has(p.id) && (pos === 'OF' ? p.position === 'OF' : p.position === pos))
      .sort((a, b) => b.overall - a.overall)[0] || bats.filter((p) => !used.has(p.id)).sort((a, b) => b.overall - a.overall)[0];
    if (c) used.add(c.id);
    return c;
  };
  const of = [take('OF'), take('OF'), take('OF')];
  return {
    title: s.title || s.franchise, year: s.year,
    who: {
      P: arms[0], C: take('C'), '1B': take('1B'), '2B': take('2B'), SS: take('SS'), '3B': take('3B'),
      LF: of[0], CF: of[1], RF: of[2],
    },
  };
};
const TEAM = pickTeam();
const NO = { P: 1, C: 2, '1B': 3, '2B': 4, '3B': 5, SS: 6, LF: 7, CF: 8, RF: 9 };
const CAST = Object.entries(PLACE).map(([k, [d, r, ko, en]]) => {
  const p = TEAM.who[k];
  return {
    k, ko, en, no: NO[k],
    name: p ? p.name : '—',
    id: p ? p.id : null,
    ovr: p ? p.overall : 0,
    p: k === 'LF' ? CHASE : k === 'SS' ? CUT : k === '2B' ? BASE[2] : at(d, r),
    on: k === 'LF',
  };
});
const face = (id) => (id
  ? `url(profiles/${encodeURIComponent(id)}.webp), url(cards/${encodeURIComponent(id)}.webp), url(ui/mt/silhouette-player.webp)`
  : 'url(ui/mt/silhouette-player.webp)');

/* ── 표시 8가지 ────────────────────────────────────────────────────── */
const Mark = ({ id, c }) => {
  const [x, y] = px(c.p);
  const s = sc(c.p);
  const r = Math.max(8, Math.min(17, 1.95 * s));
  const mine = false;
  const B = { position: 'absolute', pointerEvents: 'none' };
  const shade = (
    <i style={{ ...B, left: x - r * 1.05, top: y + r * 0.45, width: r * 2.1, height: r * 0.7, borderRadius: '50%', background: 'rgba(0,0,0,.5)', filter: 'blur(2.5px)' }} />
  );
  const disc = (txt, size = 1) => (
    <span style={{
      ...B, left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%',
      background: c.on ? '#fff1f1' : 'rgba(10,16,26,.74)', color: c.on ? '#0b1220' : '#e6edf6',
      border: `1.5px solid ${c.on ? 'rgba(255,255,255,.9)' : 'rgba(226,232,240,.5)'}`,
      display: 'grid', placeItems: 'center', fontSize: r * size, fontWeight: 700,
      backdropFilter: 'blur(2px)', boxShadow: c.on ? '0 0 16px #fecaca' : '0 2px 6px rgba(0,0,0,.5)',
    }}>{txt}</span>
  );
  if (id === 0) return <>{shade}{disc(c.ko)}</>;                       /* ① 포지션 한 글자 */
  if (id === 1) return <>{shade}{disc(c.no, 1.15)}</>;                 /* ② 등번호 */
  if (id === 2) {                                                      /* ③ 이름만 */
    return (
      <>{shade}
        <span style={{
          ...B, left: x - r * 2.2, top: y - r * 0.95, width: r * 4.4, height: r * 1.9, borderRadius: r,
          background: c.on ? 'rgba(255,241,241,.94)' : 'rgba(10,16,26,.78)', color: c.on ? '#0b1220' : '#e6edf6',
          border: `1.3px solid ${c.on ? '#fff' : 'rgba(226,232,240,.45)'}`,
          display: 'grid', placeItems: 'center', fontSize: r * 0.92, fontWeight: 700, backdropFilter: 'blur(2px)',
        }}>{c.name}</span>
      </>
    );
  }
  if (id === 3) {                                                      /* ④ 원판 + 아래 이름표 */
    return (
      <>{shade}{disc(c.ko)}
        <span style={{
          ...B, left: x - r * 2.1, top: y + r * 1.15, width: r * 4.2, textAlign: 'center',
          fontSize: r * 0.8, fontWeight: 700, color: c.on ? '#fff' : 'rgba(226,232,240,.92)',
          textShadow: '0 1px 4px rgba(0,0,0,.95)', letterSpacing: '-.02em',
        }}>{c.name}</span>
      </>
    );
  }
  if (id === 4) {                                                      /* ⑤ 얼굴만 */
    return (
      <>{shade}
        <span style={{
          ...B, left: x - r * 1.15, top: y - r * 1.15, width: r * 2.3, height: r * 2.3, borderRadius: '50%',
          backgroundImage: face(c.id), backgroundSize: 'cover', backgroundPosition: '50% 12%',
          border: `2px solid ${c.on ? '#fff' : 'rgba(226,232,240,.62)'}`,
          boxShadow: c.on ? '0 0 16px #fecaca' : '0 2px 7px rgba(0,0,0,.6)',
        }} />
      </>
    );
  }
  if (id === 5) {                                                      /* ⑥ 얼굴 + 등번호 + 이름 */
    return (
      <>{shade}
        <span style={{
          ...B, left: x - r * 1.2, top: y - r * 1.3, width: r * 2.4, height: r * 2.4, borderRadius: '50%',
          backgroundImage: face(c.id), backgroundSize: 'cover', backgroundPosition: '50% 12%',
          border: `2px solid ${c.on ? '#fff' : 'rgba(226,232,240,.6)'}`, boxShadow: '0 2px 7px rgba(0,0,0,.6)',
        }} />
        <span style={{
          ...B, left: x + r * 0.5, top: y - r * 1.75, minWidth: r * 1.25, height: r * 1.25, padding: '0 2px',
          borderRadius: r, background: c.on ? '#fecaca' : '#0b1220', color: c.on ? '#0b1220' : '#e6edf6',
          border: '1px solid rgba(255,255,255,.7)', display: 'grid', placeItems: 'center',
          fontSize: r * 0.78, fontWeight: 800, fontFamily: 'Saira Condensed',
        }}>{c.no}</span>
        <span style={{
          ...B, left: x - r * 2.2, top: y + r * 1.3, width: r * 4.4, textAlign: 'center',
          fontSize: r * 0.78, fontWeight: 700, color: 'rgba(233,240,248,.95)', textShadow: '0 1px 4px rgba(0,0,0,.95)',
        }}>{c.name}</span>
      </>
    );
  }
  if (id === 6) {                                                      /* ⑦ 영문 약어 */
    return (
      <>{shade}
        <span style={{
          ...B, left: x - r * 1.35, top: y - r * 0.85, width: r * 2.7, height: r * 1.7, borderRadius: r * 0.35,
          background: c.on ? 'rgba(255,241,241,.95)' : 'rgba(9,14,22,.8)', color: c.on ? '#0b1220' : '#dbe6f2',
          border: `1.2px solid ${c.on ? '#fff' : 'rgba(219,230,242,.4)'}`,
          display: 'grid', placeItems: 'center', fontSize: r * 0.9, fontWeight: 800,
          fontFamily: 'Saira Condensed', letterSpacing: '.04em', backdropFilter: 'blur(2px)',
        }}>{c.en}</span>
      </>
    );
  }
  /* ⑧ 최소 — 점만, 공에 관여하는 선수만 이름 카드 */
  return (
    <>
      <i style={{ ...B, left: x - r * 0.42, top: y - r * 0.42, width: r * 0.84, height: r * 0.84, borderRadius: '50%', background: c.on ? '#fff' : 'rgba(226,232,240,.8)', boxShadow: c.on ? '0 0 12px #fff' : '0 1px 4px rgba(0,0,0,.8)' }} />
      {c.on && (
        <span style={{
          ...B, left: x - r * 2.6, top: y - r * 3.1, width: r * 5.2, padding: `${r * 0.22}px 0`,
          borderRadius: r * 0.3, background: 'rgba(8,13,20,.86)', border: '1px solid rgba(255,255,255,.35)',
          textAlign: 'center', color: '#fff', fontSize: r * 0.82, fontWeight: 700, backdropFilter: 'blur(3px)',
        }}>{c.name}<small style={{ display: 'block', opacity: 0.6, fontSize: r * 0.66 }}>{c.en} · OVR {c.ovr}</small></span>
      )}
    </>
  );
};

const NOTE = [
  ['포지션 한 글자', '지금 쓰는 방식. 가장 가볍고 어디에 누가 있는지 바로 읽힌다'],
  ['등번호', '숫자만. 수비 위치 감각이 있는 사람에게 익숙하다'],
  ['이름표', '이름을 알약 모양에 넣는다. 누가 잡는지 분명하다'],
  ['한 글자 + 이름', '포지션으로 빠르게 읽고, 아래 이름으로 확인한다'],
  ['얼굴', '실제 선수 사진. 내 선수라는 느낌이 가장 강하다'],
  ['얼굴 + 번호 + 이름', '중계 화면에 가깝다. 정보가 가장 많다'],
  ['영문 약어', 'P · C · 1B · SS … 야구 중계 표기 그대로'],
  ['점 + 관여 선수만', '평소엔 점만, 공에 닿는 선수만 이름 카드가 뜬다'],
];

function Panel({ id }) {
  return (
    <div className="ui-cut relative overflow-hidden" style={{ width: W, height: H, '--c': '10px', background: '#05080c' }}>
      <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/field/park-night.webp)' }} />
      <span className="absolute inset-0" style={{ background: 'radial-gradient(78% 62% at 50% 62%, transparent, rgba(4,8,14,.5) 92%)' }} />
      <svg className="absolute inset-0" width={W} height={H} style={{ pointerEvents: 'none' }}>
        <polygon points={[BASE[4], BASE[1], BASE[2], BASE[3]].map((p) => px(p).join(',')).join(' ')}
          fill="none" stroke="#eaf6ff" strokeWidth="1.3" opacity="0.42" strokeDasharray="6 6" />
        <path d={line([[0, 0], LAND])} fill="none" stroke="#fff" strokeWidth="2" opacity="0.6" />
        <path d={line([CHASE, CUT, BASE[2]])} fill="none" stroke="#fca5a5" strokeWidth="1.7" strokeDasharray="5 5" opacity="0.85" />
        <path d={line([BASE[4], BASE[1], BASE[2]])} fill="none" stroke={OFF} strokeWidth="1.9" opacity="0.65" />
      </svg>
      {CAST.map((c) => <Mark key={c.k} id={id} c={c} />)}
      {[BASE[1], BASE[3]].map((b, i) => {
        const [x, y] = px(b); const r = Math.max(7, 1.7 * sc(b));
        return (
          <span key={i} className="absolute grid place-items-center rounded-full font-bold"
            style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, background: 'rgba(16,52,36,.85)', color: '#a7f3d0', border: '1.5px solid rgba(52,211,153,.8)', fontSize: r, backdropFilter: 'blur(2px)' }}>주</span>
        );
      })}
      <b className="absolute font-display text-[13px] tracking-[0.2em] text-white/80" style={{ left: 14, top: 10 }}>
        {String(id + 1).padStart(2, '0')} {NOTE[id][0]}
      </b>
    </div>
  );
}

function Gallery() {
  return (
    <div style={{ width: 1920, background: '#06080c', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">수비 표시 8안</b>
        <span>{TEAM.year} {TEAM.title} 수비 아홉 — 좌중간 2루타에서 좌익수가 쫓고 유격수가 중계, 2루수가 2루 커버</span>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(2, ${W}px)` }}>
        {NOTE.map((n, i) => (
          <div key={i}>
            <Panel id={i} />
            <p className="mt-1.5 text-[12.5px] text-gray-500">{n[1]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
