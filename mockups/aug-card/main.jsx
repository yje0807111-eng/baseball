/*
 * 증강 PICK 카드 — 이름 · 효과 · 레벨을 보기 쉽게 놓는 여덟 안 (개발 서버: /mockups/aug-card/)
 * 실제 판의 카드 칸(336 × 536)과 그 아래 여백을 그대로 쓴다. 화면 1920 × 911.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const CW = 336, CH = 536;
const cut = (c = 10) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const art = (id) => `url(augments/${id}.webp)`;
const LVMAX = 5;

/* 보기 표본 — 골드 증강, +2 강화 */
const A = { id: 'cleanupUp', name: '클린업 강화', tier: 'GOLD', ko: '빌드', c: '#fbbf24',
  head: '파워 상위 3명 파워 +35, 컨택', num: '+18', desc: '파워 상위 3명 파워 +35, 컨택 +18', lv: 2 };

const Pips = ({ lv = A.lv, c = A.c, w = 12, h = 6, gap = 3 }) => (
  <span style={{ display: 'flex', gap }}>
    {Array.from({ length: LVMAX }, (_, i) => (
      <i key={i} style={{ display: 'block', width: w, height: h, transform: 'skewX(-24deg)', background: i < lv ? c : 'rgba(255,255,255,.1)' }} />
    ))}
  </span>
);
/* 카드 틀 — 그림 · 위 띠 · 위 배지는 모든 안이 같다 */
const Shell = ({ children, h = CH, fade = 44 }) => (
  <div style={{ position: 'relative', width: CW, height: h, overflow: 'hidden', background: '#070b14',
    clipPath: cut(18), boxShadow: `inset 0 0 0 1px ${A.c}55` }}>
    <span style={{ position: 'absolute', inset: 0, backgroundImage: art(A.id), backgroundSize: 'cover', backgroundPosition: 'top' }} />
    <span style={{ position: 'absolute', insetInline: 0, bottom: 0, height: `${fade}%`, background: 'linear-gradient(transparent,#070b14 92%)' }} />
    <span style={{ position: 'absolute', insetInline: 0, top: 0, height: 3, background: A.c, boxShadow: `0 0 14px ${A.c}` }} />
    <div style={{ position: 'absolute', left: 16, right: 16, top: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ padding: '0 8px', clipPath: cut(4), background: A.c, fontFamily: disp, fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: '#05080f' }}>{A.tier}</span>
      <span style={{ fontSize: 12, color: '#d1d5db' }}>{A.ko}</span>
    </div>
    {children}
  </div>
);
const Name = ({ size = 30, lv = true }) => (
  <b style={{ display: 'block', fontSize: size, fontWeight: 900, lineHeight: 1.1, color: '#fff' }}>
    {A.name}{lv && <span style={{ fontFamily: disp, color: A.c }}> +{A.lv}</span>}
  </b>
);

/* ── 여덟 안 ── */
const V = [
  ['A · 지금 모습', '이름 → 효과 띠 → 핍', (
    <Shell>
      <div style={{ position: 'absolute', insetInline: 0, bottom: 0 }}>
        <b style={{ display: 'block', padding: '0 18px 12px', fontSize: 30, fontWeight: 900, lineHeight: 1.1, color: '#fff' }}>
          {A.name}<span style={{ fontFamily: disp, color: A.c }}> +{A.lv}</span></b>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 18px',
          background: `linear-gradient(90deg,${A.c}2a,transparent)`, boxShadow: `inset 0 1px 0 ${A.c}59` }}>
          <b style={{ minWidth: 0, fontSize: 15, lineHeight: 1.35, color: '#f3f4f6' }}>{A.head}</b>
          <b style={{ flex: 'none', fontFamily: disp, fontSize: 34, lineHeight: 1, color: A.c }}>{A.num}</b>
        </span>
        <span style={{ display: 'block', padding: '12px 18px 16px' }}><Pips /></span>
      </div>
    </Shell>
  )],

  ['B · 수치를 앞세운다', '큰 수치 한 개를 왼쪽 기둥에, 이름은 그 위', (
    <Shell>
      <div style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '0 18px 16px' }}>
        <Pips />
        <b style={{ display: 'block', margin: '10px 0 4px', fontSize: 26, fontWeight: 900, color: '#fff' }}>{A.name}</b>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <b style={{ fontFamily: disp, fontSize: 56, lineHeight: .82, color: A.c }}>{A.num}</b>
          <p style={{ margin: 0, paddingBottom: 4, fontSize: 13.5, lineHeight: 1.35, color: '#cbd5e1' }}>{A.head}</p>
        </div>
      </div>
    </Shell>
  )],

  ['C · 효과를 칸으로', '이름 아래 효과를 한 칸씩 끊어 보여 준다', (
    <Shell>
      <div style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '0 16px 16px' }}>
        <Name size={27} />
        <div style={{ display: 'grid', gap: 5, marginTop: 10 }}>
          {[['파워 상위 3명 파워', '+35'], ['컨택', '+18']].map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 12px',
              clipPath: cut(6), background: 'rgba(255,255,255,.06)', boxShadow: `inset 2px 0 0 ${A.c}` }}>
              <small style={{ fontSize: 13, color: '#cbd5e1' }}>{k}</small>
              <b style={{ fontFamily: disp, fontSize: 21, color: A.c }}>{v}</b>
            </span>
          ))}
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <small style={{ fontFamily: disp, fontSize: 11, letterSpacing: '.2em', color: '#6b7787' }}>LEVEL</small>
          <Pips />
        </span>
      </div>
    </Shell>
  )],

  ['D · 레벨을 이름 옆 칩으로', '핍 대신 +2/5 칩 하나, 효과는 아래 한 줄', (
    <Shell>
      <div style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '0 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <b style={{ minWidth: 0, fontSize: 28, fontWeight: 900, color: '#fff' }}>{A.name}</b>
          <span style={{ marginLeft: 'auto', flex: 'none', padding: '3px 10px', clipPath: cut(5), background: A.c,
            fontFamily: disp, fontSize: 15, fontWeight: 800, color: '#05080f' }}>+{A.lv} / {LVMAX}</span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, padding: '12px 14px',
          clipPath: cut(8), background: `linear-gradient(90deg,${A.c}26,rgba(255,255,255,.04))` }}>
          <b style={{ minWidth: 0, fontSize: 14.5, lineHeight: 1.35, color: '#f3f4f6' }}>{A.head}</b>
          <b style={{ flex: 'none', fontFamily: disp, fontSize: 32, lineHeight: 1, color: A.c }}>{A.num}</b>
        </span>
      </div>
    </Shell>
  )],

  ['E · 카드 밖으로 내린다', '카드는 그림 · 이름까지, 효과와 레벨은 아래 판에', (
    <>
      <Shell h={441} fade={54}>
        <b style={{ position: 'absolute', left: 18, right: 18, bottom: 16, fontSize: 30, fontWeight: 900, lineHeight: 1.1, color: '#fff' }}>{A.name}</b>
      </Shell>
      <div style={{ marginTop: 8, padding: '14px 16px', clipPath: cut(12), background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ margin: 0, minWidth: 0, fontSize: 14, lineHeight: 1.35, color: '#e5e7eb' }}>{A.head}</p>
          <b style={{ flex: 'none', fontFamily: disp, fontSize: 34, lineHeight: .9, color: A.c }}>{A.num}</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <small style={{ fontFamily: disp, fontSize: 11, letterSpacing: '.2em', color: '#6b7787' }}>LEVEL {A.lv}</small>
          <span style={{ marginLeft: 'auto' }}><Pips /></span>
        </div>
      </div>
    </>
  )],

  ['F · 레벨 눈금을 띠로', '핍을 카드 폭 가득한 눈금 막대로 바꾼다', (
    <Shell>
      <div style={{ position: 'absolute', insetInline: 0, bottom: 0 }}>
        <b style={{ display: 'block', padding: '0 18px 10px', fontSize: 29, fontWeight: 900, lineHeight: 1.1, color: '#fff' }}>{A.name}</b>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 18px',
          background: `linear-gradient(90deg,${A.c}2a,transparent)`, boxShadow: `inset 0 1px 0 ${A.c}59` }}>
          <b style={{ minWidth: 0, fontSize: 14.5, lineHeight: 1.35, color: '#f3f4f6' }}>{A.head}</b>
          <b style={{ flex: 'none', fontFamily: disp, fontSize: 32, lineHeight: 1, color: A.c }}>{A.num}</b>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 16px' }}>
          <small style={{ fontFamily: disp, fontSize: 12, color: A.c }}>+{A.lv}</small>
          <span style={{ display: 'flex', flex: 1, gap: 3 }}>
            {Array.from({ length: LVMAX }, (_, i) => (
              <i key={i} style={{ flex: 1, height: 7, transform: 'skewX(-24deg)', background: i < A.lv ? A.c : 'rgba(255,255,255,.1)' }} />
            ))}
          </span>
          <small style={{ fontFamily: disp, fontSize: 12, color: '#6b7787' }}>{LVMAX}</small>
        </div>
      </div>
    </Shell>
  )],

  ['G · 이름과 수치 한 줄', '이름 옆에 수치를 붙이고 설명은 그 아래 작게', (
    <Shell>
      <div style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '0 18px 18px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Pips w={14} h={5} /></span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <b style={{ minWidth: 0, fontSize: 27, fontWeight: 900, color: '#fff' }}>{A.name}</b>
          <b style={{ marginLeft: 'auto', flex: 'none', fontFamily: disp, fontSize: 40, lineHeight: 1, color: A.c }}>{A.num}</b>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.4, color: '#9aa6b4' }}>{A.desc}</p>
      </div>
    </Shell>
  )],

  ['H · 가운데 놓기', '이름 · 효과 · 레벨을 가운데로 모은 간판식', (
    <Shell>
      <div style={{ position: 'absolute', insetInline: 0, bottom: 0, display: 'grid', justifyItems: 'center', gap: 10, padding: '0 18px 20px', textAlign: 'center' }}>
        <b style={{ fontFamily: disp, fontSize: 52, lineHeight: .9, color: A.c }}>{A.num}</b>
        <b style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{A.name}</b>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.35, color: '#9aa6b4' }}>{A.head}</p>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, padding: '5px 12px', clipPath: cut(5), background: 'rgba(255,255,255,.06)' }}>
          <small style={{ fontFamily: disp, fontSize: 12, color: '#94a3b8' }}>LV {A.lv}</small><Pips w={10} h={5} />
        </span>
      </div>
    </Shell>
  )],
];

const App = () => (
  <div style={{ minHeight: '100vh', padding: '26px 0 60px', background: 'radial-gradient(120% 90% at 50% 0%,#132033 0%,#0a0e15 62%)', color: '#e8ecf2', fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
    <div style={{ width: 1600, margin: '0 auto 20px' }}>
      <b style={{ fontFamily: disp, fontSize: 22 }}>PICK 카드 — 이름 · 효과 · 레벨 배치 8안</b>
      <span style={{ marginLeft: 12, fontSize: 13.5, color: '#94a3b8' }}>실제 칸과 같은 336 × 536</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,336px)', justifyContent: 'center', gap: '34px 48px' }}>
      {V.map(([title, note, node]) => (
        <div key={title}>
          <div style={{ marginBottom: 8 }}>
            <b style={{ fontFamily: disp, fontSize: 17, color: '#e8ecf2' }}>{title}</b>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#8b97a6' }}>{note}</p>
          </div>
          {node}
        </div>
      ))}
    </div>
  </div>
);
createRoot(document.getElementById('root')).render(<App />);
