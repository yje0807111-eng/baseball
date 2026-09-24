/*
 * 경기 전 정비 화면 넓히기 4안 (개발 서버: /mockups/prep-wide/)
 * 넷 모두 같은 전제 — SCOUTING 을 화면 왼쪽 끝까지, TUNE UP 을 오른쪽 끝까지 밀고
 * 그만큼 MY SQUAD 구장을 가로로 넓힌다. 바깥 여백 22px → 0, 판 사이 간격 10 → 8.
 * 다른 것은 로테이션 · 불펜 · 벤치를 어디에 앉히느냐 (지금은 그 아래가 빈다).
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const W = 1920, H = 911, SCALE = 0.455;
const cut = (c = 10) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const A = { main: '#10b981', bat: '#34d399', def: '#60a5fa', pit: '#f87171', warn: '#fbbf24', foe: '#f472b6', gray: '#64748b' };
const mix = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;
const GAP = 8;          // 판 사이 (지금 10)
const EDGE = 0;         // 화면 좌우 여백 (지금 22)

/* ───────── 공통 조각 ───────── */
const Lab = ({ children, color = A.main, size = 11 }) => (
  <p style={{ margin: 0, fontFamily: disp, fontSize: size, fontWeight: 700, letterSpacing: '.3em', color, textTransform: 'uppercase' }}>{children}</p>
);
const Panel = ({ children, a = A.main, pad = 10, style }) => (
  <div style={{ position: 'relative', background: 'rgba(6,10,19,.74)', clipPath: cut(14), padding: pad,
    boxShadow: `inset 0 0 0 1px ${mix(a, 32)}`, display: 'flex', flexDirection: 'column', minHeight: 0, ...style }}>{children}</div>
);
const Row = ({ pos, name, sub, v, a = A.main, h = 26 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: h, padding: '0 8px', background: 'rgba(255,255,255,.035)',
    clipPath: cut(4), boxShadow: `inset 2px 0 0 ${a}` }}>
    {pos && <b style={{ fontFamily: disp, fontSize: 10, fontWeight: 800, color: a, width: 22 }}>{pos}</b>}
    <b style={{ fontSize: 12, color: '#e8ecf2', whiteSpace: 'nowrap' }}>{name}</b>
    {sub && <small style={{ fontFamily: disp, fontSize: 9.5, color: '#7d8a9c', whiteSpace: 'nowrap' }}>{sub}</small>}
    <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 13, fontWeight: 800, color: '#e8ecf2' }}>{v}</b>
  </div>
);

/* 왼쪽 스카우팅 — 상대 팀 판. 속은 지금 화면 그대로 두고 자리만 왼쪽 끝으로 */
const FOE_LINEUP = [['CF', '최원준', 90], ['LF', '럴리어드', 89], ['RF', '안현민', 84], ['3B', '허경민', 84], ['CF', '김민혁', 74],
  ['SS', '권동진', 73], ['2B', '김상수', 75], ['1B', '김현수', 70], ['C', '장성우', 72]];
const MY_ORDER = [['C', '강민호', '.311', 77], ['DH', '양의지', '.326', 76], ['LF', '최정', '.297', 77], ['LF', '김재현', '.289', 77],
  ['CF', '이진영', '.350', 77], ['RF', '김강민', '.298', 77], ['SS', '브리또', '.320', 77], ['2B', '정근우', '.314', 77], ['1B', '오재열', '.316', 73]];
const ROT = [['1SP', '유희관', 'ERA 3.94', 79], ['CL', '조규제', 'ERA 4.18', 71], ['SU', '이상군', 'ERA 4.42', 71], ['SU', '김웅동', 'ERA 4.59', 71],
  ['MR1', '안영명', 'ERA 3.29', 70], ['MR2', '진해중', 'ERA 3.21', 70], ['MR3', '권준현', 'ERA 5.10', 68], ['MR4', '애킨스', 'ERA 3.83', 68]];
const BENCH = [['김재호', 72], ['이종운', 71], ['김재환', 68]];

const Scout = ({ w = 272 }) => (
  <Panel a={A.foe} style={{ width: w, gap: 8 }}>
    <Lab color={A.foe}>Scouting</Lab>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <b style={{ fontSize: 15, color: '#fff' }}>2026 KT 위즈</b>
      <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 22, fontWeight: 800, color: A.foe }}>80</b>
    </div>
    <div style={{ height: 96, background: 'linear-gradient(180deg,#132033,#0a1120)', clipPath: cut(8), display: 'grid', placeItems: 'center' }}>
      <span style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
        <small style={{ fontFamily: disp, fontSize: 9, letterSpacing: '.2em', color: '#7d8a9c' }}>오늘 상대 선발</small>
        <b style={{ fontSize: 14, color: '#fff' }}>보설리</b>
        <b style={{ fontFamily: disp, fontSize: 17, color: A.foe }}>87</b>
      </span>
    </div>
    <div style={{ height: 118, background: 'rgba(16,185,129,.07)', clipPath: cut(8), boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)',
      display: 'grid', placeItems: 'center' }}>
      <small style={{ fontFamily: disp, fontSize: 9.5, letterSpacing: '.2em', color: '#55606f' }}>상대 수비 배치</small>
    </div>
    <Lab size={10} color={A.foe}>Lineup 상대 타순 9</Lab>
    <div style={{ display: 'grid', gap: 3, flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {FOE_LINEUP.map(([p, n, v], i) => <Row key={i} pos={p} name={n} v={v} a={A.foe} h={24} />)}
    </div>
  </Panel>
);
/* 가운데 구장 — 안마다 폭이 다르다 */
const Field = ({ overlay = null }) => (
  <div style={{ position: 'relative', flex: 1, minWidth: 0, background: '#050a12', clipPath: cut(12), overflow: 'hidden' }}>
    <i style={{ position: 'absolute', inset: 0, backgroundImage: 'url(ui/field/park-16.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
    <i style={{ position: 'absolute', inset: 0, background: 'radial-gradient(62% 52% at 50% 46%,transparent,rgba(5,8,15,.5))' }} />
    <span style={{ position: 'absolute', left: 12, top: 10 }}><Lab size={10}>My Squad</Lab></span>
    <span style={{ position: 'absolute', right: 12, top: 8, padding: '4px 10px', clipPath: cut(5),
      background: 'rgba(6,10,19,.8)', boxShadow: `inset 0 0 0 1px ${mix(A.main, 40)}`, fontSize: 11, color: '#cbd5e1' }}>자동 배치</span>
    {overlay}
  </div>
);
/* 투수진 기둥 — 세로 */
const RotCol = ({ w = 280, children, a = A.pit }) => (
  <div style={{ width: w, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
    <Lab size={10}>Rotation 선발 1</Lab>
    <Row pos={ROT[0][0]} name={ROT[0][1]} sub={ROT[0][2]} v={ROT[0][3]} a={a} />
    <Lab size={10}>Bullpen 불펜 7</Lab>
    <div style={{ display: 'grid', gap: 3 }}>
      {ROT.slice(1).map(([p, n, s, v], i) => <Row key={i} pos={p} name={n} sub={s} v={v} a={a} />)}
    </div>
    <Lab size={10}>Bench 벤치 3</Lab>
    <div style={{ display: 'flex', gap: 3 }}>
      {BENCH.map(([n, v], i) => <span key={i} style={{ flex: 1 }}><Row name={n} v={v} a={A.gray} h={22} /></span>)}
    </div>
    {children}
  </div>
);
/* 투수진 가로줄 — 구장 아래에 눕힌다 */
const RotBar = ({ h = 112, a = A.pit }) => (
  <Panel pad={8} a={a} style={{ height: h, gap: 5, flexShrink: 0 }}>
    <Lab size={10} color={a}>Rotation · Bullpen · Bench</Lab>
    <div style={{ display: 'flex', gap: 5, flex: 1 }}>
      {[...ROT.map((r) => [r[0], r[1], r[3], 0]), ...BENCH.map(([n, v]) => ['BN', n, v, 1])].map(([p, n, v, bn], i) => (
        <span key={i} style={{ flex: 1, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 2,
          background: 'rgba(255,255,255,.04)', clipPath: cut(5), boxShadow: `inset 0 2px 0 ${bn ? A.gray : a}` }}>
          <small style={{ fontFamily: disp, fontSize: 9, color: bn ? A.gray : a }}>{p}</small>
          <b style={{ fontSize: 11, color: '#e8ecf2' }}>{n}</b>
          <b style={{ fontFamily: disp, fontSize: 13, fontWeight: 800, color: '#e8ecf2' }}>{v}</b>
        </span>
      ))}
    </div>
  </Panel>
);
/* 오른쪽 TUNE UP — 속은 지금 화면 그대로, 자리만 오른쪽 끝으로 */
const Tune = ({ w = 384 }) => (
  <Panel a={A.main} style={{ width: w, gap: 7 }}>
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <Lab>Tune Up</Lab>
      <small style={{ marginLeft: 'auto', fontSize: 10, color: '#7d8a9c' }}>팀 종합</small>
      <b style={{ marginLeft: 5, fontFamily: disp, fontSize: 21, fontWeight: 800, color: A.warn }}>75</b>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
      {[['타자', 694, A.bat], ['수비', 730, A.def], ['투수', 365, A.pit]].map(([k, v, c]) => (
        <span key={k} style={{ display: 'grid', justifyItems: 'center', gap: 2, padding: '5px 0', background: mix(c, 9), clipPath: cut(5),
          boxShadow: `inset 0 0 0 1px ${mix(c, 26)}` }}>
          <small style={{ fontSize: 9.5, color: '#8b97a6' }}>{k}</small>
          <b style={{ fontFamily: disp, fontSize: 17, fontWeight: 800, color: c }}>{v}</b>
        </span>
      ))}
    </div>
    <Lab size={10} color={A.warn}>Play Style</Lab>
    <div style={{ display: 'grid', gap: 4, flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {[['빅볼', '장타 위주'], ['스몰볼', '번트와 작전'], ['발야구', '도루와 주루'], ['출루', '공을 많이 본다'],
        ['마운드', '선발을 길게'], ['총력전', '불펜 총동원'], ['실점 최소', '시프트와 유인구'], ['균형', '무리 없이']].map(([s, tip], i) => (
        <span key={s} style={{ display: 'flex', alignItems: 'center', padding: '0 10px', height: 34, clipPath: cut(5),
          background: i === 7 ? mix(A.main, 22) : 'rgba(255,255,255,.04)',
          boxShadow: `inset 0 0 0 1px ${i === 7 ? A.main : 'rgba(255,255,255,.08)'}` }}>
          <b style={{ fontSize: 12, color: i === 7 ? '#fff' : '#cbd5e1' }}>{s}</b>
          <small style={{ marginLeft: 'auto', fontSize: 10.5, color: '#8b97a6' }}>{tip}</small>
        </span>
      ))}
    </div>
    <Lab size={10} color={A.def}>Rest 휴식</Lab>
    <div style={{ display: 'flex', gap: 5 }}>
      {[['선발', '준비됨'], ['불펜1', '준비됨'], ['불펜2', '준비됨']].map(([k, v]) => (
        <span key={k} style={{ flex: 1, display: 'grid', justifyItems: 'center', gap: 1, padding: '5px 0', clipPath: cut(4),
          background: 'rgba(255,255,255,.04)' }}>
          <small style={{ fontSize: 9, color: '#8b97a6' }}>{k}</small>
          <b style={{ fontSize: 10.5, color: A.bat }}>{v}</b>
        </span>
      ))}
    </div>
    <button style={{ height: 40, border: 0, background: A.main, clipPath: cut(9), fontSize: 14, fontWeight: 800, color: '#05080f', cursor: 'pointer' }}>
      경기 시작 ▶
    </button>
  </Panel>
);
/* 아래 내 타순 — 좌우가 붙은 만큼 함께 넓어진다 */
const Order = ({ h = 96, synergy = true }) => (
  <div style={{ display: 'flex', gap: GAP, height: h }}>
    <Panel pad={8} style={{ flex: 1, gap: 5 }}>
      <Lab size={10}>Batting Order 내 타순 9</Lab>
      <div style={{ display: 'flex', gap: 5, flex: 1 }}>
        {MY_ORDER.map(([p, n, avg, v], i) => (
          <span key={i} style={{ flex: 1, position: 'relative', background: 'linear-gradient(180deg,#14243c,#080e1a)', clipPath: cut(5),
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)', display: 'grid', alignContent: 'end', justifyItems: 'center', padding: 4, gap: 1 }}>
            <b style={{ position: 'absolute', left: 5, top: 3, fontFamily: disp, fontSize: 12, fontWeight: 800, color: '#fff' }}>{i + 1}</b>
            <b style={{ position: 'absolute', right: 5, top: 3, fontFamily: disp, fontSize: 11, fontWeight: 800, color: A.bat }}>{v}</b>
            <b style={{ fontSize: 11, color: '#e8ecf2' }}>{n}</b>
            <small style={{ fontFamily: disp, fontSize: 9, color: '#7d8a9c' }}>{avg}</small>
          </span>
        ))}
      </div>
    </Panel>
    {synergy && (
      <Panel pad={8} a={A.warn} style={{ width: 330, gap: 5 }}>
        <Lab size={10} color={A.warn}>Synergy 시너지 3/21</Lab>
        <div style={{ display: 'flex', gap: 5, flex: 1 }}>
          {['프리미어', '용병 트리오', '프랜차이즈', '메이저 9', '국민 테이'].map((s, i) => (
            <span key={s} style={{ flex: 1, display: 'grid', placeItems: 'center', background: mix(A.warn, i < 3 ? 14 : 5), clipPath: cut(5),
              boxShadow: `inset 0 0 0 1px ${mix(A.warn, i < 3 ? 40 : 14)}`, fontSize: 9, color: i < 3 ? '#e8ecf2' : '#55606f', textAlign: 'center' }}>{s}</span>
          ))}
        </div>
      </Panel>
    )}
  </div>
);

/* ───────── 안 넷 ───────── */
/* 9 · 투수진을 구장 아래 가로줄로 — 구장이 가운데를 통째로 */
const P9 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: GAP, minWidth: 0 }}>
      <Field />
      <RotBar />
    </div>
    <Tune />
  </>
);
/* 10 · 투수진을 구장 위 오른쪽에 반투명으로 얹기 — 구장이 끝에서 끝까지 */
const P10 = () => (
  <>
    <Scout />
    <Field overlay={
      <span style={{ position: 'absolute', right: 10, top: 40, bottom: 10, width: 262, display: 'flex', flexDirection: 'column', gap: 5,
        padding: 9, clipPath: cut(10), background: 'rgba(5,8,15,.72)', boxShadow: `inset 0 0 0 1px ${mix(A.pit, 34)}`,
        backdropFilter: 'blur(6px)' }}>
        <Lab size={9} color={A.pit}>Rotation 선발 1</Lab>
        <Row pos={ROT[0][0]} name={ROT[0][1]} sub={ROT[0][2]} v={ROT[0][3]} a={A.pit} h={24} />
        <Lab size={9} color={A.pit}>Bullpen 불펜 7</Lab>
        <span style={{ display: 'grid', gap: 3 }}>
          {ROT.slice(1).map(([p, n, s, v], i) => <Row key={i} pos={p} name={n} v={v} a={A.pit} h={24} />)}
        </span>
        <Lab size={9} color={A.gray}>Bench 벤치 3</Lab>
        <span style={{ display: 'flex', gap: 3 }}>
          {BENCH.map(([n, v], i) => <span key={i} style={{ flex: 1 }}><Row name={n} v={v} a={A.gray} h={22} /></span>)}
        </span>
      </span>
    } />
    <Tune />
  </>
);
/* 11 · 투수진을 왼쪽 스카우팅 옆 기둥으로 — 상대는 왼쪽, 내 투수는 그 옆, 가운데는 구장만 */
const P11 = () => (
  <>
    <Scout w={244} />
    <Panel a={A.pit} pad={9} style={{ width: 244, gap: 6 }}>
      <Lab size={10} color={A.pit}>My Pitchers 내 투수진</Lab>
      <RotCol w="100%" />
    </Panel>
    <Field />
    <Tune />
  </>
);
/* 12 · 기둥은 그대로 두고 좁혀, 빈 아래를 맞대결로 채우기 */
const P12 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: GAP, minWidth: 0 }}>
      <Field />
      <RotCol w={248}>
        <Lab size={10} color={A.warn}>Head to Head 맞대결</Lab>
        <Panel pad={9} a={A.warn} style={{ flex: 1, gap: 10, justifyContent: 'center' }}>
          {[['타자', 694, 641, A.bat], ['수비', 730, 688, A.def], ['투수', 365, 402, A.pit], ['종합', 75, 80, A.warn]].map(([ko, mine, foe, c]) => (
            <span key={ko} style={{ display: 'grid', gap: 3 }}>
              <span style={{ display: 'flex', fontSize: 10.5 }}>
                <b style={{ fontFamily: disp, fontSize: 12, color: c, width: 40 }}>{mine}</b>
                <span style={{ margin: '0 auto', color: '#8b97a6' }}>{ko}</span>
                <b style={{ fontFamily: disp, fontSize: 12, color: A.foe, width: 40, textAlign: 'right' }}>{foe}</b>
              </span>
              <span style={{ display: 'flex', height: 5, background: 'rgba(255,255,255,.07)' }}>
                <i style={{ width: `${(mine / (mine + foe)) * 100}%`, background: c }} />
                <i style={{ flex: 1, background: mix(A.foe, 65) }} />
              </span>
            </span>
          ))}
        </Panel>
      </RotCol>
    </div>
    <Tune />
  </>
);

/* 견주기용 — 지금 화면 (바깥 여백 22 · 간격 10 · 기둥 아래가 빔) */
const P0 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
      <Field />
      <RotCol>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', border: `2px dashed ${mix(A.warn, 55)}` }}>
          <b style={{ fontFamily: disp, fontSize: 12, letterSpacing: '.2em', color: A.warn }}>지금 비는 자리</b>
        </div>
      </RotCol>
    </div>
    <Tune />
  </>
);

const PLANS = [
  ['지금', '바깥 여백 22 · 기둥 아래가 빔', P0, 22, 10],
  ['9 · 아래 가로줄', '투수진 · 벤치를 구장 아래 한 줄로 · 구장이 가운데를 통째로', P9, EDGE, GAP],
  ['10 · 구장 위에 얹기', '투수진을 구장 오른쪽에 반투명으로 · 구장이 끝에서 끝까지', P10, EDGE, GAP],
  ['11 · 왼쪽으로 합류', '상대 옆에 내 투수진 기둥 · 가운데는 구장만', P11, EDGE, GAP],
  ['12 · 기둥 좁히고 채우기', '기둥을 248로 좁히고 빈 아래는 맞대결 막대', P12, EDGE, GAP],
];

const Screen = ({ Body, edge, gap }) => (
  <div style={{ width: W, height: H, background: 'linear-gradient(180deg,#070b12,#0a0e15)', display: 'flex', flexDirection: 'column',
    fontFamily: "'IBM Plex Sans KR',sans-serif", color: '#e8ecf2', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 56, padding: `0 ${Math.max(edge, 14)}px`, flexShrink: 0 }}>
      <span style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', clipPath: cut(7),
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)', color: '#8b97a6' }}>←</span>
      <span>
        <Lab size={9} color="#7d8a9c">Single Game</Lab>
        <b style={{ fontSize: 17, color: '#fff' }}>단판 경기 전 정비</b>
      </span>
    </div>
    <div style={{ flex: 1, display: 'flex', gap, padding: `0 ${edge}px 8px`, minHeight: 0 }}><Body /></div>
    <div style={{ padding: `0 ${edge}px 12px` }}><Order /></div>
  </div>
);

function App() {
  const [only, setOnly] = useState(null);
  const list = only == null ? PLANS : [PLANS[only]];
  return (
    <div style={{ padding: 20, fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <b style={{ fontSize: 19, color: '#fff' }}>정비 화면 넓히기 4안</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>바깥 여백 22 → 0 · 구장 폭 +44 이상 · 이름을 누르면 그 안만 크게</small>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {PLANS.map(([t], i) => (
            <button key={t} onClick={() => setOnly(only === i ? null : i)} style={{ padding: '4px 9px', border: 0, cursor: 'pointer', clipPath: cut(4),
              background: only === i ? A.main : 'rgba(255,255,255,.06)', color: only === i ? '#05080f' : '#cbd5e1', fontSize: 11, fontWeight: 700 }}>{t}</button>
          ))}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: only == null ? '1fr 1fr' : '1fr', gap: 18 }}>
        {list.map(([title, desc, Body, edge, gap]) => {
          const s = only == null ? SCALE : 0.9;
          return (
            <div key={title}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                <b style={{ fontSize: 14, color: '#fff' }}>{title}</b>
                <small style={{ fontSize: 11.5, color: '#8b97a6' }}>{desc}</small>
              </div>
              <div style={{ width: W * s, height: H * s, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,.08)' }}>
                <div style={{ transform: `scale(${s})`, transformOrigin: '0 0' }}><Screen Body={Body} edge={edge} gap={gap} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
