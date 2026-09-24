/*
 * 전략실 — 세 갈래 + 더보기 4안 (개발 서버: /mockups/warroom-fold/)
 * 고른 것: 1안(공격 · 마운드 · 수비에서 하나씩). 거기에 섹션마다 더보기를 달아
 * 펼치면 2안의 성향 축(OOTP 식 대립 눈금)으로 세부를 잡는다.
 * 세부 축 이름은 지금 코드(strategy.js) 의 FINE 여덟 그대로.
 * 다른 것은 "어떻게 펼치느냐" 넷.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const PW = 384, PH = 823;
const cut = (c = 10) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const A = { main: '#10b981', bat: '#34d399', pit: '#f87171', def: '#60a5fa', run: '#fbbf24', gray: '#64748b' };
const mix = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;

/* 세 갈래 — 고른 화면 그대로 */
const G = [
  { key: 'bat', en: 'Offense', ko: '공격', c: A.bat, pick: '빅볼',
    opts: [['빅볼', '장타 위주'], ['스몰볼', '번트와 작전'], ['발야구', '도루와 주루'], ['출루', '공을 많이 본다']],
    fine: [
      { ko: '초구 스윙', opts: ['참는다', '보통', '노린다'], v: 2 },
      { ko: '작전 · 번트', opts: ['안 함', '상황봐서', '자주'], v: 0 },
      { ko: '대타 기용', opts: ['소극적', '보통', '과감히'], v: 1 },
    ] },
  { key: 'pit', en: 'Mound', ko: '마운드', c: A.pit, pick: '빠른 교체',
    opts: [['선발 완주', '7회까지 맡긴다'], ['빠른 교체', '위기면 바로'], ['총력전', '불펜 총동원'], ['마무리 대기', '리드 지키기']],
    fine: [
      { ko: '선발 교체', opts: ['실점 시', '체력 소진', '조기 교체'], v: 2 },
      { ko: '위기 대응', opts: ['정면승부', '보통', '피한다'], v: 1 },
      { ko: '포수 리드', opts: ['직구 위주', '밸런스', '변화구 위주'], v: 1 },
    ] },
  { key: 'def', en: 'Defense', ko: '수비', c: A.def, pick: '정석 수비',
    opts: [['정석 수비', '제자리'], ['시프트', '당겨치기 대비'], ['내야 전진', '홈 승부'], ['라인 지킴', '장타 방지']],
    fine: [
      { ko: '수비 시프트', opts: ['정위치', '내야 전진', '외야 깊게'], v: 0 },
      { ko: '도루 시도', opts: ['거의 안 함', '보통', '자주'], v: 1 },
      { ko: '주자 묶기', opts: ['느슨히', '보통', '바짝'], v: 1 },
    ] },
];

/* ───────── 조각 ───────── */
const Lab = ({ children, color = A.gray, size = 10 }) => (
  <p style={{ margin: 0, fontFamily: disp, fontSize: size, fontWeight: 700, letterSpacing: '.26em', color, textTransform: 'uppercase' }}>{children}</p>
);
const Panel = ({ children, gap = 10 }) => (
  <div style={{ width: PW, height: PH, display: 'flex', flexDirection: 'column', gap, padding: 16,
    background: 'rgba(6,10,19,.85)', clipPath: cut(18), boxShadow: `inset 0 0 0 1px ${mix(A.main, 26)}`,
    fontFamily: "'IBM Plex Sans KR',sans-serif", color: '#e8ecf2', overflow: 'hidden' }}>{children}</div>
);
const Title = () => (
  <div style={{ display: 'flex', alignItems: 'baseline', flexShrink: 0 }}>
    <Lab color={A.main} size={11}>War Room</Lab>
    <small style={{ marginLeft: 'auto', fontSize: 10, color: '#7d8a9c' }}>팀 종합</small>
    <b style={{ marginLeft: 5, fontFamily: disp, fontSize: 20, fontWeight: 800, color: A.run }}>75</b>
  </div>
);
/* 섹션 머리: 이름 + 더보기 */
const SecHead = ({ g, open, more = true }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexShrink: 0 }}>
    <Lab color={g.c}>{g.en}</Lab>
    <b style={{ fontSize: 12.5, color: '#e8ecf2' }}>{g.ko}</b>
    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
    {more && <b style={{ fontSize: 11, color: open ? g.c : '#7d8a9c' }}>{open ? '접기 ▴' : '더보기 ▾'}</b>}
  </div>
);
/* 네 칸 선택지 (지금 화면 그대로) */
const Four = ({ g }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
    {g.opts.map(([ko, t]) => {
      const on = ko === g.pick;
      return (
        <span key={ko} style={{ display: 'grid', alignContent: 'center', gap: 2, height: 46, padding: '0 11px', clipPath: cut(5),
          background: on ? mix(g.c, 20) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? g.c : 'rgba(255,255,255,.09)'}` }}>
          <b style={{ fontSize: 13, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
          <small style={{ fontSize: 10, color: '#8b97a6' }}>{t}</small>
        </span>
      );
    })}
  </div>
);
/* 성향 눈금 한 줄 (2안 문법) — 3단 */
const Dial = ({ f, c, size = 'md' }) => (
  <div style={{ display: 'grid', gap: size === 'sm' ? 4 : 6 }}>
    <span style={{ display: 'flex', alignItems: 'baseline' }}>
      <small style={{ fontSize: 11, color: '#93a1b1' }}>{f.ko}</small>
      <b style={{ marginLeft: 'auto', fontSize: size === 'sm' ? 12 : 13.5, fontWeight: 800, color: '#fff' }}>{f.opts[f.v]}</b>
    </span>
    <span style={{ display: 'flex', gap: 4 }}>
      {f.opts.map((o, i) => <i key={o} style={{ flex: 1, height: size === 'sm' ? 5 : 7, background: i === f.v ? c : 'rgba(255,255,255,.1)' }} />)}
    </span>
    {size !== 'sm' && (
      <span style={{ display: 'flex', fontSize: 10, color: '#7d8a9c' }}>
        <span>{f.opts[0]}</span><span style={{ marginLeft: 'auto' }}>{f.opts[2]}</span>
      </span>
    )}
  </div>
);
const Chips = () => (
  <div style={{ display: 'flex', gap: 5 }}>
    {G.map((g) => (
      <span key={g.key} style={{ padding: '3px 9px', clipPath: cut(3), background: mix(g.c, 22), boxShadow: `inset 0 0 0 1px ${mix(g.c, 55)}`,
        fontSize: 10.5, fontWeight: 700, color: '#fff' }}>{g.pick}</span>
    ))}
  </div>
);
const Start = ({ label = '경기 시작 ▶' }) => (
  <button style={{ height: 46, border: 0, background: A.main, clipPath: cut(10), fontSize: 15, fontWeight: 800, color: '#05080f', cursor: 'pointer', flexShrink: 0 }}>{label}</button>
);

/* ───────── 1 · 아래로 펼침 — 한 번에 한 섹션만 ───────── */
const F1 = () => (
  <Panel gap={9}>
    <Title />
    {G.map((g) => {
      const open = g.key === 'pit';
      return (
        <React.Fragment key={g.key}>
          <SecHead g={g} open={open} />
          <Four g={g} />
          {open && (
            <div style={{ display: 'grid', gap: 12, padding: '13px 13px', clipPath: cut(7),
              background: mix(g.c, 7), boxShadow: `inset 0 0 0 1px ${mix(g.c, 22)}` }}>
              {g.fine.map((f) => <Dial key={f.ko} f={f} c={g.c} />)}
            </div>
          )}
        </React.Fragment>
      );
    })}
    <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
      <Chips />
      <Start />
    </div>
  </Panel>
);

/* ───────── 2 · 고른 칸 아래로 — 어느 선택의 세부인지 분명 ───────── */
const F2 = () => (
  <Panel gap={9}>
    <Title />
    {G.map((g) => {
      const open = g.key === 'bat';
      return (
        <React.Fragment key={g.key}>
          <SecHead g={g} open={open} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {g.opts.map(([ko, t]) => {
              const on = ko === g.pick;
              return (
                <span key={ko} style={{ display: 'grid', alignContent: 'center', gap: 2, height: 46, padding: '0 11px', clipPath: cut(5),
                  background: on ? mix(g.c, 20) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? g.c : 'rgba(255,255,255,.09)'}` }}>
                  <b style={{ fontSize: 13, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
                  <small style={{ fontSize: 10, color: '#8b97a6' }}>{t}</small>
                </span>
              );
            })}
          </div>
          {open && (
            /* 고른 칸에서 이어지는 꼬리 — 이 선택을 어떻게 굴릴지 */
            <div style={{ display: 'grid', gap: 11, marginTop: -3, padding: '13px 13px 13px 15px', clipPath: cut(7),
              background: mix(g.c, 8), boxShadow: `inset 3px 0 0 ${g.c}` }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <b style={{ fontSize: 12, color: g.c }}>{g.pick}</b>
                <small style={{ fontSize: 10.5, color: '#93a1b1' }}>를 이렇게 굴린다</small>
              </span>
              {g.fine.map((f) => <Dial key={f.ko} f={f} c={g.c} size="sm" />)}
            </div>
          )}
        </React.Fragment>
      );
    })}
    <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
      <Chips />
      <Start />
    </div>
  </Panel>
);

/* ───────── 3 · 서랍 — 판이 통째로 그 갈래의 세부로 바뀐다 ───────── */
const F3 = () => {
  const g = G[1];
  return (
    <Panel gap={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <b style={{ fontSize: 15, color: '#8b97a6' }}>◀</b>
        <span style={{ display: 'grid', gap: 2 }}>
          <Lab color={g.c}>{g.en}</Lab>
          <b style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>마운드 세부</b>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px', clipPath: cut(7),
        background: mix(g.c, 16), boxShadow: `inset 0 0 0 1px ${mix(g.c, 45)}` }}>
        <small style={{ fontSize: 11, color: '#93a1b1' }}>고른 갈래</small>
        <b style={{ marginLeft: 'auto', fontSize: 17, fontWeight: 800, color: '#fff' }}>{g.pick}</b>
      </div>
      <div style={{ display: 'grid', gap: 20 }}>
        {g.fine.map((f) => <Dial key={f.ko} f={f} c={g.c} />)}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <Lab>이 갈래가 정한 값</Lab>
        <small style={{ fontSize: 11.5, color: '#93a1b1', lineHeight: 1.6 }}>
          빠른 교체는 <b style={{ color: '#fff' }}>조기 교체</b>를 기본으로 잡는다. 눈금을 옮기면 그만큼만 달라진다.
        </small>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <button style={{ width: 110, height: 46, border: 0, background: 'rgba(255,255,255,.06)', clipPath: cut(9),
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)', fontSize: 13.5, color: '#e8ecf2', cursor: 'pointer' }}>기본값으로</button>
        <span style={{ flex: 1 }}><Start label="전략실로 ▶" /></span>
      </div>
    </Panel>
  );
};

/* ───────── 4 · 접힌 줄 — 평소엔 세부를 한 줄로 요약해 보여 준다 ───────── */
const F4 = () => (
  <Panel gap={9}>
    <Title />
    {G.map((g) => {
      const open = g.key === 'def';
      const sum = g.fine.map((f) => f.opts[f.v]).join(' · ');
      return (
        <React.Fragment key={g.key}>
          <SecHead g={g} open={open} more={false} />
          <Four g={g} />
          {open ? (
            <div style={{ display: 'grid', gap: 12, padding: '13px 13px', clipPath: cut(7),
              background: mix(g.c, 7), boxShadow: `inset 0 0 0 1px ${mix(g.c, 22)}` }}>
              {g.fine.map((f) => <Dial key={f.ko} f={f} c={g.c} />)}
              <b style={{ fontSize: 11, color: g.c, textAlign: 'center' }}>접기 ▴</b>
            </div>
          ) : (
            /* 접혀 있을 때도 무엇으로 잡혀 있는지는 보인다 */
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', clipPath: cut(4),
              background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
              <small style={{ fontSize: 10.5, color: '#93a1b1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sum}</small>
              <b style={{ marginLeft: 'auto', fontSize: 10.5, color: '#7d8a9c', whiteSpace: 'nowrap' }}>더보기 ▾</b>
            </span>
          )}
        </React.Fragment>
      );
    })}
    <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
      <Chips />
      <Start />
    </div>
  </Panel>
);

const PLANS = [
  ['1 · 아래로 펼침', '더보기를 누르면 그 섹션 아래로 눈금이 나온다 · 한 번에 한 섹션', F1],
  ['2 · 고른 칸에서', '고른 칸에 이어 붙는 꼬리 — 무엇의 세부인지 분명하다', F2],
  ['3 · 서랍', '판이 통째로 그 갈래의 세부 화면으로 · 돌아가기로 복귀', F3],
  ['4 · 접힌 줄', '접혀 있어도 "정위치 · 보통 · 보통" 처럼 요약이 보인다', F4],
];

function App() {
  const [only, setOnly] = useState(null);
  const list = only == null ? PLANS : [PLANS[only]];
  return (
    <div style={{ padding: 20, fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <b style={{ fontSize: 19, color: '#fff' }}>전략실 — 세 갈래 + 더보기</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>384 × 823 · 펼치면 성향 눈금 · 세부 이름은 strategy.js 그대로</small>
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
