/*
 * 강화 단추 — 카드 아래 '지금 레벨 · 필요 강화권' 두 줄을 없애고 단추 하나로 말하는 4안
 * (개발 서버: /mockups/aug-upbtn/) 단추 크기는 실제와 같은 336 × 62. 화면 1920 × 911.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const GREEN = '#34d399';
const W = 336;
const cut = (c = 9) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;

/* 세 가지 형편 — 강화할 수 있을 때 · 강화권이 모자랄 때 · 최대일 때 */
const CASES = [
  { key: 'ok', ko: '강화할 수 있을 때', lv: 2, have: 5 },
  { key: 'short', ko: '강화권이 모자랄 때', lv: 3, have: 2 },
  { key: 'max', ko: '최대 레벨일 때', lv: 5, have: 9 },
];
const need = (lv) => lv + 1;

/* 실제 단추 틀 (mt-btn pri lg) */
const Btn = ({ on = true, children, style }) => (
  <button type="button" disabled={!on}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: W, minHeight: 62, padding: '0 20px',
      border: 0, clipPath: cut(9), background: GREEN, color: '#05080f', fontFamily: "'IBM Plex Sans KR',sans-serif",
      fontSize: 19, fontWeight: 800, opacity: on ? 1 : .4, cursor: on ? 'pointer' : 'not-allowed', ...style }}>
    {children}
  </button>
);
/* 단추 위에 그대로 남는 카드 밑동 — 이름과 효과 칸까지만 보인다 */
const CardTail = () => (
  <div style={{ width: W, padding: '14px 16px 16px', clipPath: cut(14), background: 'linear-gradient(180deg,rgba(255,255,255,.05),rgba(7,11,20,.9))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
    <b style={{ display: 'block', fontSize: 22, fontWeight: 900, color: '#fff' }}>근력 운동 <span style={{ fontFamily: disp, color: '#cbd5e1' }}>+2</span></b>
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 9, padding: '7px 12px',
      clipPath: cut(6), background: 'rgba(255,255,255,.06)', boxShadow: 'inset 2px 0 0 #cbd5e1' }}>
      <small style={{ fontSize: 13, color: '#cbd5e1' }}>타자 파워</small>
      <b style={{ fontFamily: disp, fontSize: 21, color: '#cbd5e1' }}>+8</b>
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
      <small style={{ fontFamily: disp, fontSize: 11, fontWeight: 700, letterSpacing: '.2em', color: '#6b7787' }}>LEVEL</small>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} style={{ display: 'block', width: 12, height: 6, marginLeft: i ? -7 : 0, transform: 'skewX(-24deg)', background: i < 2 ? '#cbd5e1' : 'rgba(255,255,255,.1)' }} />
      ))}
    </span>
  </div>
);

/* ── 네 안 ── */
const V = [
  ['A · 한 줄로 말한다', '할 일과 값을 가운뎃점으로 이어 붙인다', (c) => (
    c.key === 'max' ? <Btn on={false}>최대 레벨 +5</Btn>
      : c.have < need(c.lv) ? <Btn on={false}>강화권 {need(c.lv) - c.have}장 부족</Btn>
        : <Btn>+{need(c.lv)} 강화하기 · 강화권 {need(c.lv)}장 ▶</Btn>
  )],

  ['B · 값을 칸으로 떼어 낸다', '왼쪽은 할 일, 오른쪽 칸에 드는 강화권', (c) => (
    c.key === 'max' ? <Btn on={false}>최대 레벨 +5</Btn>
      : (
        <Btn on={c.have >= need(c.lv)} style={{ justifyContent: 'space-between', paddingRight: 8 }}>
          <span>+{need(c.lv)} 강화하기</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', clipPath: cut(5), background: 'rgba(5,8,15,.22)', fontSize: 14, fontWeight: 800 }}>
            강화권 <b style={{ fontFamily: disp, fontSize: 18 }}>{need(c.lv)}</b>
            {c.have < need(c.lv) && <small style={{ fontSize: 12, fontWeight: 700, opacity: .75 }}>/ 보유 {c.have}</small>}
          </span>
        </Btn>
      )
  )],

  ['C · 두 줄로 나눈다', '위는 할 일, 아래 작은 줄에 드는 값과 보유', (c) => (
    c.key === 'max' ? <Btn on={false}>최대 레벨 +5</Btn>
      : (
        <Btn on={c.have >= need(c.lv)} style={{ flexDirection: 'column', gap: 1, lineHeight: 1.15 }}>
          <span style={{ fontSize: 19 }}>+{need(c.lv)} 강화하기</span>
          <small style={{ fontSize: 12.5, fontWeight: 700, opacity: .72 }}>
            강화권 {need(c.lv)}장 소모 · 보유 {c.have}장
          </small>
        </Btn>
      )
  )],

  ['D · 드는 값을 앞세운다', '무엇을 내는지 먼저, 오른쪽에 올라갈 레벨', (c) => (
    c.key === 'max' ? <Btn on={false}>최대 레벨 +5</Btn>
      : (
        <Btn on={c.have >= need(c.lv)} style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            강화권 <b style={{ fontFamily: disp, fontSize: 26 }}>{need(c.lv)}</b>장 소모
          </span>
          <span style={{ fontFamily: disp, fontSize: 20 }}>+{c.lv} → +{c.lv + 1} ▶</span>
        </Btn>
      )
  )],
];

const App = () => (
  <div style={{ minHeight: '100vh', padding: '26px 0 60px', background: 'radial-gradient(120% 90% at 50% 0%,#132033 0%,#0a0e15 62%)', color: '#e8ecf2', fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
    <div style={{ width: 1560, margin: '0 auto 18px' }}>
      <b style={{ fontFamily: disp, fontSize: 22 }}>강화 단추 4안</b>
      <span style={{ marginLeft: 12, fontSize: 13.5, color: '#94a3b8' }}>카드 아래 '지금 레벨 · 필요 강화권' 두 줄은 빠지고 단추만 남는다 · 실제 크기 336 × 62</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(4,${W}px)`, justifyContent: 'center', gap: '0 48px' }}>
      {V.map(([title, note]) => (
        <div key={title} style={{ marginBottom: 10 }}>
          <b style={{ fontFamily: disp, fontSize: 17 }}>{title}</b>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#8b97a6' }}>{note}</p>
        </div>
      ))}
      {V.map(([title, , render]) => (
        <div key={title + 'card'}>
          <CardTail />
          <div style={{ marginTop: 14 }}>{render(CASES[0])}</div>
        </div>
      ))}
      {CASES.slice(1).map((c) => (
        <React.Fragment key={c.key}>
          {V.map(([title, , render]) => (
            <div key={title + c.key} style={{ marginTop: 22 }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6b7787' }}>{c.ko} — 레벨 +{c.lv} · 보유 {c.have}장</p>
              {render(c)}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  </div>
);
createRoot(document.getElementById('root')).render(<App />);
