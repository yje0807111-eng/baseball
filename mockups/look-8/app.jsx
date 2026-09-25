/* 경기장 · 선수 디자인 8안 — 좌표계와 상황은 모두 같고 겉모습만 다르다.
   장면: 좌중간 2루타. 좌익수가 쫓고, 유격수가 중계, 주자 둘이 돈다. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';

/* ── 좌표 (play-field 와 같은 규칙) ─────────────────────────────────── */
const W = 900, H = 470;
const CAM = { back: 28, high: 40, focal: 412 };
const TIL = Math.atan2(CAM.high, CAM.back + 58);
const CT = Math.cos(TIL), ST = Math.sin(TIL);
const CX = W / 2, CY = 176;
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
const fence = (deg) => 100 + 22 * Math.cos(Math.min(45, Math.abs(deg)) * 2 * RAD);
const BASE = { 1: at(45, 27.4), 2: at(0, 38.8), 3: at(-45, 27.4), 4: [0, 0] };
const MOUND = at(0, 18.44);
const OFF = '#34d399', DEF = '#f87171';

/* 이 장면의 배치 — 좌중간 2루타 */
const SPOT = {
  P: [0, 18.4, '투', 1, '오원석'], C: [0, -1.6, '포', 2, '박동원'],
  '1B': [38, 33, '1', 3, '오재일'], '2B': [20, 43, '2', 4, '김선빈'],
  SS: [-20, 43, '유', 6, '박찬호'], '3B': [-38, 33, '3', 5, '최정'],
  LF: [-27, 88, '좌', 7, '김재환'], CF: [0, 95, '중', 8, '이정후'], RF: [27, 88, '우', 9, '나성범'],
};
const LAND = at(-19, 92);                      // 타구가 떨어진 자리
const CHASE = at(-22, 99);                     // 좌익수가 쫓아간 자리
const CUT = at(-12, 46);                       // 유격수 중계 자리
const COVER2 = BASE[2];                        // 2루수가 2루 커버
const RUN1 = [BASE[4], BASE[1], BASE[2]];      // 타자 → 2루
const RUN2 = [BASE[2], BASE[3], BASE[4]];      // 2루 주자 → 홈
const HITPATH = (n = 16) => {
  const out = [];
  for (let i = 0; i <= n; i += 1) {
    const u = i / n, p = [LAND[0] * u, LAND[1] * u], h = 26 * 4 * u * (1 - u);
    out.push(px(p, h));
  }
  return out;
};
const poly = (pts) => pts.map((p) => px(p).join(',')).join(' ');
const arc = (r, a, b, step = 3) => { const o = []; for (let d = a; d <= b; d += step) o.push(at(d, typeof r === 'function' ? r(d) : r)); return o; };
const ring = (c, r) => { const o = []; for (let d = 0; d < 360; d += 14) o.push([c[0] + Math.sin(d * RAD) * r, c[1] + Math.cos(d * RAD) * r]); return o; };
const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${px(p)[0]} ${px(p)[1]}`).join(' ');
const dpath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');

/* 선수가 서는 자리 — 안에서 쓰는 목록 */
const CAST = Object.entries(SPOT).map(([k, [d, r, ko, no, name]]) => ({
  k, ko, no, name,
  p: k === 'LF' ? CHASE : k === 'SS' ? CUT : k === '2B' ? COVER2 : at(d, r),
  on: k === 'LF',
}));

/* ── 그라운드 8가지 ────────────────────────────────────────────────── */
const Turf = ({ id }) => {
  const grass = [[0, 0], ...arc((d) => fence(d), -45, 45), [0, 0]];
  const dirt = [[0, 0], ...arc(29, -47, 47), [0, 0]];
  const foul = [[0, -6], ...arc((d) => fence(d) + 7, -58, 58, 3), [0, -6]];
  const paths = [[4, 1], [1, 2], [2, 3], [3, 4]];
  if (id === 0) {                                  /* ① 실사 잔디 — 줄무늬와 흙결 */
    return (
      <svg className="absolute inset-0" width={W} height={H}>
        <defs>
          <radialGradient id="g0" cx="50%" cy="88%" r="88%">
            <stop offset="0%" stopColor="#3a8a4b" /><stop offset="60%" stopColor="#276b38" /><stop offset="100%" stopColor="#164426" />
          </radialGradient>
          <linearGradient id="d0" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a5643a" /><stop offset="100%" stopColor="#7d4726" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="#0a1410" />
        <polygon points={poly(foul)} fill="url(#d0)" />
        <polygon points={poly(grass)} fill="url(#g0)" />
        {[...Array(13)].map((_, i) => (
          <polygon key={i} points={poly([[0, 0], ...arc((d) => fence(d), -45 + i * 7.5, -45 + i * 7.5 + 3.8, 1.2), [0, 0]])} fill="#fff" opacity={i % 2 ? 0.055 : 0} />
        ))}
        <polygon points={poly(dirt)} fill="url(#d0)" />
        <polygon points={poly([BASE[4], BASE[1], BASE[2], BASE[3]].map((p) => [p[0] * 0.82, p[1] * 0.82 + 3.4]))} fill="#2d7a3e" />
        {paths.map(([a, b], i) => <line key={i} x1={px(BASE[a])[0]} y1={px(BASE[a])[1]} x2={px(BASE[b])[0]} y2={px(BASE[b])[1]} stroke="#a5643a" strokeWidth={2.9 * (sc(BASE[a]) + sc(BASE[b])) / 2} strokeLinecap="round" />)}
        <polygon points={poly(ring(MOUND, 5.5))} fill="url(#d0)" />
        <polygon points={poly(ring([0, 0], 4.6))} fill="url(#d0)" />
        {[-45, 45].map((d) => <line key={d} x1={px([0, 0])[0]} y1={px([0, 0])[1]} x2={px(at(d, fence(d) + 5))[0]} y2={px(at(d, fence(d) + 5))[1]} stroke="#f6f2ea" strokeWidth="2" opacity="0.85" />)}
        <polyline points={poly(arc((d) => fence(d), -45, 45, 2))} fill="none" stroke="#16323f" strokeWidth="6" />
        {[1, 2, 3].map((b) => { const c = px(BASE[b]), w = Math.max(4, 0.85 * sc(BASE[b])); return <rect key={b} x={c[0] - w} y={c[1] - w} width={w * 2} height={w * 2} fill="#fffdf7" transform={`rotate(45 ${c[0]} ${c[1]})`} />; })}
      </svg>
    );
  }
  if (id === 1) {                                  /* ② 중계 트래킹 — 선만 빛난다 */
    return (
      <svg className="absolute inset-0" width={W} height={H}>
        <rect width={W} height={H} fill="#05080e" />
        <polygon points={poly(grass)} fill="#0c1a22" />
        <polygon points={poly(dirt)} fill="#111f28" />
        <polyline points={poly(arc((d) => fence(d), -45, 45, 2))} fill="none" stroke="#38bdf8" strokeWidth="1.6" opacity="0.8" style={{ filter: 'drop-shadow(0 0 6px #38bdf8)' }} />
        {[-45, 45].map((d) => <line key={d} x1={px([0, 0])[0]} y1={px([0, 0])[1]} x2={px(at(d, fence(d)))[0]} y2={px(at(d, fence(d)))[1]} stroke="#38bdf8" strokeWidth="1.4" opacity="0.65" />)}
        <polygon points={poly([BASE[4], BASE[1], BASE[2], BASE[3]])} fill="none" stroke="#38bdf8" strokeWidth="1.4" opacity="0.7" />
        {[...Array(5)].map((_, i) => <polyline key={i} points={poly(arc(22 + i * 20, -45, 45, 4))} fill="none" stroke="#38bdf8" strokeWidth="0.7" opacity="0.18" />)}
        <polygon points={poly(ring(MOUND, 5.5))} fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.5" />
        {[1, 2, 3].map((b) => { const c = px(BASE[b]); return <rect key={b} x={c[0] - 4} y={c[1] - 4} width="8" height="8" fill="#38bdf8" transform={`rotate(45 ${c[0]} ${c[1]})`} opacity="0.9" />; })}
      </svg>
    );
  }
  if (id === 2) {                                  /* ③ 디오라마 — 두꺼운 테두리와 낮은 채도 */
    return (
      <svg className="absolute inset-0" width={W} height={H}>
        <rect width={W} height={H} fill="#1b2430" />
        <polygon points={poly(foul)} fill="#b98b62" stroke="#0f1620" strokeWidth="3" strokeLinejoin="round" />
        <polygon points={poly(grass)} fill="#6fae6a" stroke="#0f1620" strokeWidth="3" strokeLinejoin="round" />
        <polygon points={poly(dirt)} fill="#c79a6d" stroke="#0f1620" strokeWidth="2.5" strokeLinejoin="round" />
        <polygon points={poly([BASE[4], BASE[1], BASE[2], BASE[3]].map((p) => [p[0] * 0.8, p[1] * 0.8 + 3]))} fill="#6fae6a" stroke="#0f1620" strokeWidth="2.5" />
        <polygon points={poly(ring(MOUND, 5.2))} fill="#c79a6d" stroke="#0f1620" strokeWidth="2.5" />
        {[1, 2, 3].map((b) => { const c = px(BASE[b]); return <rect key={b} x={c[0] - 5} y={c[1] - 5} width="10" height="10" fill="#fff" stroke="#0f1620" strokeWidth="2" transform={`rotate(45 ${c[0]} ${c[1]})`} />; })}
      </svg>
    );
  }
  if (id === 3) {                                  /* ④ 야간 조명 — 빛 웅덩이 */
    return (
      <svg className="absolute inset-0" width={W} height={H}>
        <defs>
          <radialGradient id="lamp" cx="50%" cy="46%" r="62%">
            <stop offset="0%" stopColor="#4c9b5c" /><stop offset="55%" stopColor="#24603a" /><stop offset="100%" stopColor="#0d2a1b" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="#050a08" />
        <polygon points={poly(foul)} fill="#5e4028" />
        <polygon points={poly(grass)} fill="url(#lamp)" />
        {[[-34, 108], [34, 108], [0, 116]].map((c, i) => {
          const q = px(at(c[0], c[1]));
          return <ellipse key={i} cx={q[0]} cy={q[1] + 40} rx={150} ry={60} fill="#fff8d8" opacity="0.07" />;
        })}
        <polygon points={poly(dirt)} fill="#6b4a2c" />
        <polygon points={poly([BASE[4], BASE[1], BASE[2], BASE[3]].map((p) => [p[0] * 0.82, p[1] * 0.82 + 3.4]))} fill="#2f6f40" />
        <polygon points={poly(ring(MOUND, 5.5))} fill="#6b4a2c" />
        {[-45, 45].map((d) => <line key={d} x1={px([0, 0])[0]} y1={px([0, 0])[1]} x2={px(at(d, fence(d) + 4))[0]} y2={px(at(d, fence(d) + 4))[1]} stroke="#fff6df" strokeWidth="1.8" opacity="0.75" />)}
        <polyline points={poly(arc((d) => fence(d), -45, 45, 2))} fill="none" stroke="#1a2b24" strokeWidth="6" />
        {[1, 2, 3].map((b) => { const c = px(BASE[b]); return <rect key={b} x={c[0] - 4} y={c[1] - 4} width="8" height="8" fill="#fff6df" transform={`rotate(45 ${c[0]} ${c[1]})`} />; })}
      </svg>
    );
  }
  if (id === 4) {                                  /* ⑤ 도면 — 종이 위 설계도 */
    return (
      <svg className="absolute inset-0" width={W} height={H}>
        <rect width={W} height={H} fill="#f3eee2" />
        <polygon points={poly(grass)} fill="#dfe6d2" />
        <polygon points={poly(dirt)} fill="#e6d8c2" />
        {[...Array(6)].map((_, i) => <polyline key={i} points={poly(arc(20 + i * 18, -45, 45, 4))} fill="none" stroke="#9aa68f" strokeWidth="0.6" strokeDasharray="3 4" />)}
        <polygon points={poly([BASE[4], BASE[1], BASE[2], BASE[3]])} fill="none" stroke="#2f3a2c" strokeWidth="1.6" />
        {[-45, 45].map((d) => <line key={d} x1={px([0, 0])[0]} y1={px([0, 0])[1]} x2={px(at(d, fence(d)))[0]} y2={px(at(d, fence(d)))[1]} stroke="#2f3a2c" strokeWidth="1.2" />)}
        <polyline points={poly(arc((d) => fence(d), -45, 45, 2))} fill="none" stroke="#2f3a2c" strokeWidth="1.6" />
        <polygon points={poly(ring(MOUND, 5.5))} fill="none" stroke="#2f3a2c" strokeWidth="1.2" />
        {[1, 2, 3].map((b) => { const c = px(BASE[b]); return <rect key={b} x={c[0] - 4} y={c[1] - 4} width="8" height="8" fill="none" stroke="#2f3a2c" strokeWidth="1.4" transform={`rotate(45 ${c[0]} ${c[1]})`} />; })}
      </svg>
    );
  }
  if (id === 5) {                                  /* ⑥ 관중석까지 — 그릇 모양 구장 */
    return (
      <svg className="absolute inset-0" width={W} height={H}>
        <rect width={W} height={H} fill="#0a0f16" />
        <polygon points={poly([[0, -14], ...arc((d) => fence(d) + 26, -68, 68, 4), [0, -14]])} fill="#1d2735" />
        {[...Array(4)].map((_, i) => (
          <polyline key={i} points={poly(arc((d) => fence(d) + 8 + i * 5, -66, 66, 4))} fill="none" stroke="#2c3a4d" strokeWidth="3.4" />
        ))}
        <polygon points={poly(foul)} fill="#6d4226" />
        <polygon points={poly(grass)} fill="#276b38" />
        {[...Array(11)].map((_, i) => <polygon key={i} points={poly([[0, 0], ...arc((d) => fence(d), -45 + i * 9, -45 + i * 9 + 4.5, 1.5), [0, 0]])} fill="#fff" opacity={i % 2 ? 0.05 : 0} />)}
        <polygon points={poly(dirt)} fill="#8a5330" />
        <polygon points={poly([BASE[4], BASE[1], BASE[2], BASE[3]].map((p) => [p[0] * 0.82, p[1] * 0.82 + 3.4]))} fill="#2f7a3f" />
        <polygon points={poly(ring(MOUND, 5.5))} fill="#8a5330" />
        <polyline points={poly(arc((d) => fence(d), -45, 45, 2))} fill="none" stroke="#14202b" strokeWidth="6" />
        {[1, 2, 3].map((b) => { const c = px(BASE[b]); return <rect key={b} x={c[0] - 4} y={c[1] - 4} width="8" height="8" fill="#f8f5ef" transform={`rotate(45 ${c[0]} ${c[1]})`} />; })}
      </svg>
    );
  }
  if (id === 6) {                                  /* ⑦ 픽셀 — 레트로 야구 게임 */
    const cell = 10;
    return (
      <svg className="absolute inset-0" width={W} height={H} shapeRendering="crispEdges">
        <rect width={W} height={H} fill="#0b1a12" />
        <polygon points={poly(foul)} fill="#7a4b2a" />
        <polygon points={poly(grass)} fill="#2f8a43" />
        {[...Array(Math.ceil(H / cell))].map((_, r) => (r % 2 ? <rect key={r} x="0" y={r * cell} width={W} height={cell / 2} fill="#000" opacity="0.07" /> : null))}
        <polygon points={poly(dirt)} fill="#a9713f" />
        <polygon points={poly([BASE[4], BASE[1], BASE[2], BASE[3]].map((p) => [p[0] * 0.8, p[1] * 0.8 + 3]))} fill="#2f8a43" />
        {[1, 2, 3].map((b) => { const c = px(BASE[b]); return <rect key={b} x={Math.round(c[0] / 4) * 4 - 5} y={Math.round(c[1] / 4) * 4 - 5} width="10" height="10" fill="#fff" />; })}
        <polygon points={poly(ring(MOUND, 5))} fill="#a9713f" />
      </svg>
    );
  }
  /* ⑧ 사진 배경 — 찍어 둔 구장 사진을 깔고 라인만 얹는다 */
  return (
    <div className="absolute inset-0">
      <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/act/field-top.webp)', filter: 'saturate(.9) brightness(.82)' }} />
      <svg className="absolute inset-0" width={W} height={H}>
        <polygon points={poly([BASE[4], BASE[1], BASE[2], BASE[3]])} fill="none" stroke="#7dd3fc" strokeWidth="1.2" opacity="0.5" strokeDasharray="4 4" />
        <polyline points={poly(arc((d) => fence(d), -45, 45, 3))} fill="none" stroke="#7dd3fc" strokeWidth="1.2" opacity="0.4" strokeDasharray="4 4" />
        {[1, 2, 3].map((b) => { const c = px(BASE[b]); return <rect key={b} x={c[0] - 4} y={c[1] - 4} width="8" height="8" fill="#e8f6ff" opacity="0.9" transform={`rotate(45 ${c[0]} ${c[1]})`} />; })}
      </svg>
    </div>
  );
};

/* ── 선수 8가지 ────────────────────────────────────────────────────── */
const Guy = ({ id, c }) => {
  const [x, y] = px(c.p);
  const s = sc(c.p);
  const r = Math.max(6, 1.85 * s);
  const col = c.on ? '#fecaca' : DEF;
  const base = { position: 'absolute', pointerEvents: 'none' };
  if (id === 0) {                                  /* ① 그림자 위 유니폼 점 */
    return (
      <>
        <i style={{ ...base, left: x - r * 1.15, top: y - r * 0.28, width: r * 2.3, height: r * 0.9, borderRadius: '50%', background: 'rgba(0,0,0,.45)', filter: 'blur(2px)' }} />
        <span style={{ ...base, left: x - r, top: y - r * 1.5, width: r * 2, height: r * 2, borderRadius: '50%', background: col, boxShadow: `0 2px 6px rgba(0,0,0,.6)${c.on ? `, 0 0 14px ${col}` : ''}`, display: 'grid', placeItems: 'center', color: '#0a0f0c', fontSize: r * 1.05, fontWeight: 800 }}>{c.no}</span>
      </>
    );
  }
  if (id === 1) {                                  /* ② 트래킹 링 + 이름표 */
    return (
      <>
        <span style={{ ...base, left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `2px solid ${c.on ? '#fde047' : '#38bdf8'}`, boxShadow: `0 0 10px ${c.on ? '#fde047' : '#38bdf8'}` }} />
        <span style={{ ...base, left: x + r + 3, top: y - 7, fontSize: 10, fontWeight: 700, color: c.on ? '#fde047' : 'rgba(125,211,252,.9)', letterSpacing: '.02em' }}>{c.ko}</span>
      </>
    );
  }
  if (id === 2) {                                  /* ③ 디오라마 캡슐 */
    return (
      <span style={{ ...base, left: x - r * 0.8, top: y - r * 1.9, width: r * 1.6, height: r * 2.4, borderRadius: r, background: c.on ? '#f0a8a8' : '#e06b6b', border: '2.5px solid #0f1620', display: 'grid', placeItems: 'center', color: '#0f1620', fontSize: r * 0.95, fontWeight: 800 }}>{c.no}</span>
    );
  }
  if (id === 3) {                                  /* ④ 위에서 본 사람 — 머리와 어깨 */
    return (
      <>
        <i style={{ ...base, left: x - r * 1.2, top: y - r * 0.2, width: r * 2.4, height: r * 0.8, borderRadius: '50%', background: 'rgba(0,0,0,.5)', filter: 'blur(2px)' }} />
        <i style={{ ...base, left: x - r * 1.05, top: y - r * 1.25, width: r * 2.1, height: r * 1.35, borderRadius: `${r}px ${r}px ${r * 0.5}px ${r * 0.5}px`, background: col }} />
        <i style={{ ...base, left: x - r * 0.52, top: y - r * 1.75, width: r * 1.04, height: r * 1.04, borderRadius: '50%', background: '#f5d9b8', boxShadow: `0 0 0 ${r * 0.22}px #1f2937` }} />
      </>
    );
  }
  if (id === 4) {                                  /* ⑤ 저지 — 등번호 유니폼 */
    return (
      <>
        <i style={{ ...base, left: x - r, top: y - r * 0.2, width: r * 2, height: r * 0.7, borderRadius: '50%', background: 'rgba(0,0,0,.4)', filter: 'blur(2px)' }} />
        <span style={{ ...base, left: x - r * 0.95, top: y - r * 1.9, width: r * 1.9, height: r * 2.1, borderRadius: r * 0.45, background: c.on ? '#fff1f1' : '#f1f5f9', border: `2px solid ${col}`, display: 'grid', placeItems: 'center', color: '#0f172a', fontSize: r * 1.15, fontWeight: 900, fontFamily: 'Saira Condensed' }}>{c.no}</span>
      </>
    );
  }
  if (id === 5) {                                  /* ⑥ 핀 — 지도처럼 꽂는다 */
    return (
      <>
        <i style={{ ...base, left: x - r * 0.8, top: y - r * 0.25, width: r * 1.6, height: r * 0.6, borderRadius: '50%', background: 'rgba(0,0,0,.5)', filter: 'blur(1.5px)' }} />
        <span style={{ ...base, left: x - r * 0.85, top: y - r * 2.6, width: r * 1.7, height: r * 1.7, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: col, boxShadow: '0 2px 5px rgba(0,0,0,.5)' }} />
        <span style={{ ...base, left: x - r * 0.38, top: y - r * 2.22, width: r * 0.76, height: r * 0.76, borderRadius: '50%', background: '#0f172a', opacity: 0.75 }} />
      </>
    );
  }
  if (id === 6) {                                  /* ⑦ 픽셀 선수 */
    const u = Math.max(2, Math.round(r * 0.5));
    return (
      <>
        <i style={{ ...base, left: Math.round(x - u * 1.5), top: Math.round(y - u * 0.5), width: u * 3, height: u, background: 'rgba(0,0,0,.45)' }} />
        <i style={{ ...base, left: Math.round(x - u), top: Math.round(y - u * 2.5), width: u * 2, height: u * 2, background: col }} />
        <i style={{ ...base, left: Math.round(x - u * 0.5), top: Math.round(y - u * 3.5), width: u, height: u, background: '#f5d9b8' }} />
      </>
    );
  }
  /* ⑧ 사진 위 — 반투명 원판에 이름 */
  return (
    <span style={{ ...base, left: x - r * 1.3, top: y - r * 1.3, width: r * 2.6, height: r * 2.6, borderRadius: '50%', background: c.on ? 'rgba(254,202,202,.92)' : 'rgba(15,23,42,.72)', border: `1.5px solid ${c.on ? '#fff' : 'rgba(255,255,255,.55)'}`, display: 'grid', placeItems: 'center', color: c.on ? '#0f172a' : '#e2e8f0', fontSize: r * 0.95, fontWeight: 700, backdropFilter: 'blur(2px)' }}>{c.ko}</span>
  );
};

/* ── 한 장면 ───────────────────────────────────────────────────────── */
const SCENE = [
  ['실사 잔디', '줄무늬 잔디와 흙결. 선수는 그림자 위 등번호'],
  ['중계 트래킹', '선만 빛나는 어두운 판. 선수는 링과 이름표'],
  ['디오라마', '두꺼운 테두리와 낮은 채도. 선수는 캡슐 말'],
  ['야간 조명', '빛 웅덩이가 깔린 밤 경기. 선수는 그림자 위 등번호'],
  ['도면', '종이 위 설계도. 선수는 저지'],
  ['관중석까지', '그릇 모양 구장. 선수는 핀'],
  ['픽셀', '레트로 야구 게임. 선수도 픽셀'],
  ['사진 배경', '찍어 둔 구장 사진 위에 라인. 선수는 반투명 원판'],
];
function Panel({ id }) {
  const hit = HITPATH();
  return (
    <div className="ui-cut relative overflow-hidden" style={{ width: W, height: H, '--c': '10px', background: '#05080c' }}>
      <Turf id={id} />
      <svg className="absolute inset-0" width={W} height={H} style={{ pointerEvents: 'none' }}>
        {/* 타구 */}
        <path d={dpath(hit)} fill="none" stroke={id === 4 ? '#c2410c' : '#fff'} strokeWidth="2.2" opacity={id === 4 ? 0.85 : 0.7} />
        {/* 중계 송구 */}
        <path d={line([CHASE, CUT, BASE[2]])} fill="none" stroke="#fca5a5" strokeWidth="1.8" strokeDasharray="5 5" opacity="0.85" />
        {/* 주루 */}
        <path d={line(RUN1)} fill="none" stroke={OFF} strokeWidth="2" opacity="0.7" />
        <path d={line(RUN2)} fill="none" stroke={OFF} strokeWidth="2" opacity="0.45" strokeDasharray="6 6" />
      </svg>
      {CAST.map((c) => <Guy key={c.k} id={id} c={c} />)}
      {/* 주자 둘 */}
      {[[BASE[1], '주'], [BASE[3], '주']].map((r, i) => {
        const [x, y] = px(r[0]); const s = Math.max(6, 1.7 * sc(r[0]));
        return <span key={i} className="absolute grid place-items-center rounded-full font-bold"
          style={{ left: x - s, top: y - s * 1.3, width: s * 2, height: s * 2, background: OFF, color: '#05140c', fontSize: s, boxShadow: `0 0 12px ${OFF}` }}>{r[1]}</span>;
      })}
      {/* 낙하 지점 */}
      {(() => { const [x, y] = px(LAND); return <span className="absolute rounded-full" style={{ left: x - 11, top: y - 11, width: 22, height: 22, border: '2px solid #fde047' }} />; })()}
      <b className="absolute font-display text-[13px] tracking-[0.2em]" style={{ left: 14, top: 10, color: id === 4 ? '#3f4a38' : 'rgba(255,255,255,.75)' }}>
        {String(id + 1).padStart(2, '0')} {SCENE[id][0]}
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
        <b className="text-[15px] text-white">경기장 · 선수 디자인 8안</b>
        <span>좌표계와 상황은 모두 같습니다 — 좌중간 2루타, 좌익수가 쫓고 유격수가 중계, 주자 둘이 도는 장면</span>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(2, ${W}px)` }}>
        {SCENE.map((s, i) => (
          <div key={i}>
            <Panel id={i} />
            <p className="mt-1.5 text-[12.5px] text-gray-500">{s[1]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
