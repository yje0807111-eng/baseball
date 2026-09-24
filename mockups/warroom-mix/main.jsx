/*
 * 전략실 — 1안(세 갈래)과 4안(상대 맞춤)을 섞은 4가지 (개발 서버: /mockups/warroom-mix/)
 * 넷 모두 같은 재료를 쓴다. 이름은 지금 코드(strategy.js)에 있는 그대로 —
 *   큰 갈래 셋: 타선(강공 · 기동력 · 짜내기) · 마운드(길게 · 빠른 계투 · 아끼기) · 주루(적극 · 보통 · 신중)
 *   상대 약점: scoutTags 가 뽑는 아홉 중 넷까지 (장타 위험 · 좌타 다수 · 불펜 얇음 · 도루 저지 약함 …)
 *   되치기: COUNTER 표가 이미 약점마다 어떤 작전이 듣는지 정해 두었다.
 * 다른 것은 약점과 선택을 화면에서 어떻게 맞물리게 하느냐.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const PW = 384, PH = 823;
const cut = (c = 10) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const A = { main: '#10b981', bat: '#34d399', pit: '#f87171', run: '#fbbf24', def: '#60a5fa', foe: '#f472b6', vio: '#a78bfa', gray: '#64748b' };
const mix = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;

/* ───────── 공통 조각 ───────── */
const Lab = ({ children, color = A.main, size = 10.5 }) => (
  <p style={{ margin: 0, fontFamily: disp, fontSize: size, fontWeight: 700, letterSpacing: '.28em', color, textTransform: 'uppercase' }}>{children}</p>
);
const Head = ({ en, ko, color = A.main, right }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexShrink: 0 }}>
    <Lab color={color} size={10}>{en}</Lab>
    <b style={{ fontSize: 12.5, color: '#e8ecf2' }}>{ko}</b>
    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
    {right}
  </div>
);
const Chip = ({ children, color = A.gray, on }) => (
  <span style={{ padding: '2px 7px', clipPath: cut(3), background: mix(color, on ? 26 : 9),
    boxShadow: `inset 0 0 0 1px ${mix(color, on ? 60 : 22)}`, fontSize: 9.5, fontWeight: 700, color: on ? '#fff' : color, whiteSpace: 'nowrap' }}>{children}</span>
);
const Start = () => (
  <button style={{ height: 44, border: 0, background: A.main, clipPath: cut(10), fontSize: 15, fontWeight: 800, color: '#05080f', cursor: 'pointer', flexShrink: 0 }}>
    경기 시작 ▶
  </button>
);
const Panel = ({ children }) => (
  <div style={{ width: PW, height: PH, display: 'flex', flexDirection: 'column', gap: 8, padding: 14,
    background: 'rgba(6,10,19,.85)', clipPath: cut(18), boxShadow: `inset 0 0 0 1px ${mix(A.main, 30)}`,
    fontFamily: "'IBM Plex Sans KR',sans-serif", color: '#e8ecf2', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', flexShrink: 0 }}>
      <Lab size={11}>War Room</Lab>
      <small style={{ marginLeft: 'auto', fontSize: 10, color: '#7d8a9c' }}>팀 종합</small>
      <b style={{ marginLeft: 5, fontFamily: disp, fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>75</b>
    </div>
    {children}
  </div>
);

/* 상대 약점 넷 — scoutTags 가 뽑는 것과 같은 말 */
const WEAK = [
  { t: '불펜 얇음', why: '불펜 평균 71', c: A.bat, hits: ['짜내기', '아끼기'] },
  { t: '도루 저지 약함', why: '포수 수비 69', c: A.run, hits: ['기동력', '적극'] },
  { t: '장타 위험', why: '타선 파워 84', c: A.pit, hits: ['아끼기', '신중'] },
  { t: '좌타 다수', why: '좌타 5명', c: A.vio, hits: ['빠른 계투'] },
];
/* 큰 갈래 셋 (strategy.js 의 BASE) */
const BASE = [
  { key: 'bat', en: 'Offense', ko: '타선', c: A.bat, opts: [['강공', '장타 노림'], ['기동력', '치고 달린다'], ['짜내기', '공을 많이 본다']] },
  { key: 'pit', en: 'Mound', ko: '마운드', c: A.pit, opts: [['길게', '선발 완주'], ['빠른 계투', '위기면 바로'], ['아끼기', '불펜 보존']] },
  { key: 'run', en: 'Run', ko: '주루', c: A.run, opts: [['적극', '뛴다'], ['보통', '상황봐서'], ['신중', '묶어 둔다']] },
];
const PICKED = { bat: '짜내기', pit: '빠른 계투', run: '적극' };
/* 고른 값이 어느 약점을 찌르는지 */
const hitsOf = (v) => WEAK.filter((w) => w.hits.includes(v));

/* ───────── 안 넷 ───────── */
/* A · 약점을 위에 펼치고 세 갈래를 아래에 — 되치는 선택지에 ★ */
const MA = () => (
  <Panel>
    <Head en="Scout" ko="상대 약점 4" color={A.foe} />
    <div style={{ display: 'grid', gap: 4 }}>
      {WEAK.map((w) => {
        const done = w.hits.some((h) => Object.values(PICKED).includes(h));
        return (
          <span key={w.t} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 10px', clipPath: cut(4),
            background: done ? mix(w.c, 14) : 'rgba(255,255,255,.035)', boxShadow: `inset 3px 0 0 ${done ? w.c : mix(w.c, 40)}` }}>
            <b style={{ fontSize: 11.5, color: done ? '#fff' : '#cbd5e1' }}>{w.t}</b>
            <small style={{ fontSize: 9.5, color: '#7d8a9c' }}>{w.why}</small>
            <b style={{ marginLeft: 'auto', fontSize: 11, color: done ? w.c : '#55606f' }}>{done ? '되치는 중' : '—'}</b>
          </span>
        );
      })}
    </div>
    {BASE.map((g) => (
      <React.Fragment key={g.key}>
        <Head en={g.en} ko={g.ko} color={g.c} />
        <div style={{ display: 'grid', gap: 4 }}>
          {g.opts.map(([ko, t]) => {
            const on = PICKED[g.key] === ko;
            const star = hitsOf(ko);
            return (
              <span key={ko} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 10px', clipPath: cut(5),
                background: on ? mix(g.c, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? g.c : 'rgba(255,255,255,.08)'}` }}>
                {!!star.length && <b style={{ fontSize: 11, color: '#fbbf24' }}>★</b>}
                <b style={{ fontSize: 12.5, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
                <small style={{ marginLeft: 'auto', fontSize: 10, color: '#8b97a6' }}>{star.length ? star[0].t : t}</small>
              </span>
            );
          })}
        </div>
      </React.Fragment>
    ))}
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);
/* B · 약점 구역을 없애고 갈래 안에 칩으로 — 가장 좁게 */
const MB = () => (
  <Panel>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', clipPath: cut(5), background: mix(A.foe, 10),
      boxShadow: `inset 3px 0 0 ${A.foe}` }}>
      <b style={{ fontSize: 11.5, color: '#fff' }}>2026 KT 위즈</b>
      <small style={{ fontSize: 10, color: '#cbd5e1' }}>약점 4 · 되치는 중 3</small>
      <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 17, fontWeight: 800, color: A.foe }}>80</b>
    </div>
    {BASE.map((g) => (
      <React.Fragment key={g.key}>
        <Head en={g.en} ko={g.ko} color={g.c} />
        <div style={{ display: 'grid', gap: 4 }}>
          {g.opts.map(([ko, t]) => {
            const on = PICKED[g.key] === ko;
            const star = hitsOf(ko);
            return (
              <span key={ko} style={{ display: 'grid', alignContent: 'center', gap: 3, minHeight: 44, padding: '5px 10px', clipPath: cut(5),
                background: on ? mix(g.c, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? g.c : 'rgba(255,255,255,.08)'}` }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <b style={{ fontSize: 12.5, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
                  <small style={{ marginLeft: 'auto', fontSize: 10, color: '#8b97a6' }}>{t}</small>
                </span>
                {!!star.length && (
                  <span style={{ display: 'flex', gap: 4 }}>
                    {star.map((w) => <Chip key={w.t} color={w.c} on={on}>{w.t} 되침</Chip>)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </React.Fragment>
    ))}
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);
/* C · 맞불 게이지 — 약점을 몇 개나 찔렀는지가 곧 보너스 */
const MC = () => {
  const done = WEAK.filter((w) => w.hits.some((h) => Object.values(PICKED).includes(h)));
  return (
    <Panel>
      <Head en="Counter" ko={`맞불 ${done.length} / 4`} color={A.foe} />
      <div style={{ display: 'flex', gap: 4 }}>
        {WEAK.map((w) => {
          const on = done.includes(w);
          return (
            <span key={w.t} style={{ flex: 1, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 3, height: 62, padding: 5, clipPath: cut(5),
              background: on ? mix(w.c, 20) : 'rgba(255,255,255,.035)', boxShadow: `inset 0 0 0 1px ${mix(w.c, on ? 55 : 16)}` }}>
              <b style={{ fontSize: 14, color: on ? w.c : '#55606f' }}>{on ? '●' : '○'}</b>
              <small style={{ fontSize: 9, color: on ? '#e8ecf2' : '#55606f', textAlign: 'center', lineHeight: 1.2 }}>{w.t}</small>
            </span>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', clipPath: cut(5), background: mix(A.main, 13) }}>
        <b style={{ fontFamily: disp, fontSize: 18, fontWeight: 800, color: A.main }}>+{done.length * 2}</b>
        <small style={{ fontSize: 10.5, color: '#cbd5e1' }}>되친 약점 하나당 팀 능력치 +2</small>
      </div>
      {BASE.map((g) => (
        <React.Fragment key={g.key}>
          <Head en={g.en} ko={g.ko} color={g.c} />
          <div style={{ display: 'flex', gap: 4 }}>
            {g.opts.map(([ko]) => {
              const on = PICKED[g.key] === ko;
              const star = hitsOf(ko);
              return (
                <span key={ko} style={{ flex: 1, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 2, height: 52, clipPath: cut(5),
                  background: on ? mix(g.c, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? g.c : 'rgba(255,255,255,.08)'}` }}>
                  <b style={{ fontSize: 12, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
                  {!!star.length && <b style={{ fontSize: 9, color: '#fbbf24' }}>★ {star.length}</b>}
                </span>
              );
            })}
          </div>
        </React.Fragment>
      ))}
      <div style={{ marginTop: 'auto', display: 'grid', gap: 6 }}>
        <small style={{ fontSize: 10.5, color: '#7d8a9c' }}>★ 이 붙은 쪽을 고르면 그 약점을 되친다</small>
        <Start />
      </div>
    </Panel>
  );
};
/* D · 브리핑 — 코치가 한 세트를 통째로 권하고, 펼쳐 고칠 수 있다 */
const MD = () => (
  <Panel>
    <div style={{ display: 'grid', gap: 5, padding: '10px 11px', clipPath: cut(6), background: mix(A.foe, 10), boxShadow: `inset 3px 0 0 ${A.foe}` }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <b style={{ fontSize: 12.5, color: '#fff' }}>2026 KT 위즈</b>
        <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 17, fontWeight: 800, color: A.foe }}>80</b>
      </span>
      <small style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.45 }}>불펜이 얇고 포수 저지가 무르다 · 대신 타선 파워가 높다</small>
      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {WEAK.map((w) => <Chip key={w.t} color={w.c}>{w.t}</Chip>)}
      </span>
    </div>
    <Head en="Recommend" ko="코치가 권하는 한 세트" color={A.main} />
    <div style={{ display: 'grid', gap: 4 }}>
      {BASE.map((g) => (
        <span key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 11px', clipPath: cut(5),
          background: mix(g.c, 18), boxShadow: `inset 0 0 0 1px ${mix(g.c, 50)}` }}>
          <small style={{ fontFamily: disp, fontSize: 10, letterSpacing: '.16em', color: g.c, width: 42 }}>{g.ko}</small>
          <b style={{ fontSize: 13, color: '#fff' }}>{PICKED[g.key]}</b>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {hitsOf(PICKED[g.key]).map((w) => <Chip key={w.t} color={w.c} on>{w.t}</Chip>)}
          </span>
        </span>
      ))}
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <button style={{ flex: 1.5, height: 42, border: 0, background: A.main, clipPath: cut(8), fontSize: 13, fontWeight: 800, color: '#05080f', cursor: 'pointer' }}>그대로 간다</button>
      <button style={{ flex: 1, height: 42, border: 0, background: 'rgba(255,255,255,.06)', clipPath: cut(8), boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)', fontSize: 13, fontWeight: 700, color: '#e8ecf2', cursor: 'pointer' }}>직접 고른다</button>
    </div>
    <Head en="Detail" ko="펼쳐 고치기" color={A.gray} />
    <div style={{ display: 'grid', gap: 3 }}>
      {[['초구 스윙', '참는다'], ['작전 · 번트', '상황봐서'], ['선발 교체', '조기 교체'], ['수비 시프트', '외야 깊게'], ['도루 시도', '자주']].map(([k, v]) => (
        <span key={k} style={{ display: 'flex', alignItems: 'center', height: 30, padding: '0 10px', clipPath: cut(4), background: 'rgba(255,255,255,.035)' }}>
          <small style={{ fontSize: 11, color: '#8b97a6' }}>{k}</small>
          <b style={{ marginLeft: 'auto', fontSize: 11.5, color: '#e8ecf2' }}>{v}</b>
        </span>
      ))}
    </div>
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);

const PLANS = [
  ['A · 약점 먼저', '약점 넷을 위에 펼치고 아래 세 갈래 · 되치는 쪽에 ★', MA],
  ['B · 갈래 안에', '약점 구역 없이 선택지마다 "무엇을 되치는지" 칩으로', MB],
  ['C · 맞불 게이지', '되친 약점 수가 곧 보너스 · 갈래는 가로 세 칸으로 줄임', MC],
  ['D · 브리핑', '코치가 한 세트를 통째로 권하고, 펼쳐 고친다', MD],
];

function App() {
  const [only, setOnly] = useState(null);
  const list = only == null ? PLANS : [PLANS[only]];
  return (
    <div style={{ padding: 20, fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <b style={{ fontSize: 19, color: '#fff' }}>전략실 — 세 갈래 × 상대 맞춤</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>384 × 823 · 이름은 지금 코드(strategy.js) 그대로</small>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {PLANS.map(([t], i) => (
            <button key={t} onClick={() => setOnly(only === i ? null : i)} style={{ padding: '4px 9px', border: 0, cursor: 'pointer', clipPath: cut(4),
              background: only === i ? A.main : 'rgba(255,255,255,.06)', color: only === i ? '#05080f' : '#cbd5e1', fontSize: 11, fontWeight: 700 }}>{t}</button>
          ))}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
        {list.map(([title, desc, Body]) => (
          <div key={title}>
            <div style={{ width: PW, marginBottom: 5 }}>
              <b style={{ fontSize: 13.5, color: '#fff' }}>{title}</b>
              <small style={{ display: 'block', fontSize: 11, color: '#8b97a6' }}>{desc}</small>
            </div>
            <Body />
          </div>
        ))}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
