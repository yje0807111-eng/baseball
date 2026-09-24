/*
 * 전략실 — 읽기 쉬운 8안 (개발 서버: /mockups/warroom-clean/)
 * 앞서 만든 것들이 한 판에 너무 많이 담겨 빽빽했다. 여기서는 셋만 지킨다.
 *   ① 한 번에 보이는 것을 줄인다  ② 고른 값은 크게, 부연은 작게  ③ 빈자리를 남긴다
 * 담는 것은 모두 같다 — 큰 갈래 셋(타선 · 마운드 · 주루)과 상대 약점, 그리고 경기 시작.
 * 이름은 지금 코드(strategy.js)의 BASE · scoutTags 그대로.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const PW = 384, PH = 823;
const cut = (c = 10) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const A = { main: '#10b981', bat: '#34d399', pit: '#f87171', run: '#fbbf24', foe: '#f472b6', gray: '#64748b' };
const mix = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;

const BASE = [
  { key: 'bat', en: 'Offense', ko: '타선', c: A.bat, pick: '짜내기',
    opts: [['강공', '장타를 노린다'], ['기동력', '치고 달린다'], ['짜내기', '공을 많이 본다']] },
  { key: 'pit', en: 'Mound', ko: '마운드', c: A.pit, pick: '빠른 계투',
    opts: [['길게', '선발에게 맡긴다'], ['빠른 계투', '위기면 바로 바꾼다'], ['아끼기', '불펜을 남긴다']] },
  { key: 'run', en: 'Run', ko: '주루', c: A.run, pick: '적극',
    opts: [['적극', '기회를 보면 뛴다'], ['보통', '상황을 본다'], ['신중', '베이스를 지킨다']] },
];
const WEAK = [
  { t: '불펜 얇음', ans: '짜내기', c: A.bat },
  { t: '도루 저지 약함', ans: '적극', c: A.run },
  { t: '좌타 다수', ans: '빠른 계투', c: '#a78bfa' },
  { t: '장타 위험', ans: '아끼기', c: A.pit },
];
const picked = (g) => g.pick;
const hitBy = (v) => WEAK.find((w) => w.ans === v);

/* ───────── 조각 ───────── */
const Lab = ({ children, color = A.gray, size = 10 }) => (
  <p style={{ margin: 0, fontFamily: disp, fontSize: size, fontWeight: 700, letterSpacing: '.26em', color, textTransform: 'uppercase' }}>{children}</p>
);
const Start = ({ label = '경기 시작 ▶' }) => (
  <button style={{ height: 48, border: 0, background: A.main, clipPath: cut(10), fontSize: 15, fontWeight: 800, color: '#05080f', cursor: 'pointer', flexShrink: 0 }}>{label}</button>
);
const Panel = ({ children, gap = 12 }) => (
  <div style={{ width: PW, height: PH, display: 'flex', flexDirection: 'column', gap, padding: 18,
    background: 'rgba(6,10,19,.85)', clipPath: cut(18), boxShadow: `inset 0 0 0 1px ${mix(A.main, 26)}`,
    fontFamily: "'IBM Plex Sans KR',sans-serif", color: '#e8ecf2', overflow: 'hidden' }}>{children}</div>
);
const Title = () => (
  <div style={{ display: 'flex', alignItems: 'baseline', flexShrink: 0 }}>
    <Lab color={A.main} size={11}>War Room</Lab>
    <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 20, fontWeight: 800, color: A.run }}>75</b>
  </div>
);

/* ───────── 1 · 큰 칸 셋 — 고른 값만 크게, 누르면 펼친다 ───────── */
const C1 = () => (
  <Panel gap={14}>
    <Title />
    {BASE.map((g, i) => (
      <div key={g.key} style={{ flex: i === 0 ? 'none' : 'none', display: 'grid', gap: 10, padding: '16px 18px', clipPath: cut(10),
        background: `linear-gradient(135deg,${mix(g.c, 14)},rgba(6,10,19,.5))`, boxShadow: `inset 0 0 0 1px ${mix(g.c, 34)}` }}>
        <Lab color={g.c}>{g.en} · {g.ko}</Lab>
        <b style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{picked(g)}</b>
        <small style={{ fontSize: 12, color: '#93a1b1' }}>{g.opts.find(([k]) => k === g.pick)[1]}</small>
      </div>
    ))}
    <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', clipPath: cut(7), background: mix(A.foe, 10) }}>
        <b style={{ fontSize: 12, color: A.foe }}>상대 약점 4</b>
        <small style={{ marginLeft: 'auto', fontSize: 12, color: '#cbd5e1' }}>그중 <b style={{ color: '#fff' }}>3</b>을 되치는 중</small>
      </div>
      <Start />
    </div>
  </Panel>
);

/* ───────── 2 · 한 번에 하나씩 — 단계로 나눈다 ───────── */
const C2 = () => {
  const g = BASE[1];
  return (
    <Panel gap={16}>
      <Title />
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {BASE.map((x, i) => (
          <span key={x.key} style={{ flex: 1, height: 4, background: i <= 1 ? x.c : 'rgba(255,255,255,.12)' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <Lab color={g.c}>Step 2 / 3</Lab>
        <b style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>마운드를 어떻게 쓸까</b>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {g.opts.map(([ko, t]) => {
          const on = ko === g.pick;
          return (
            <span key={ko} style={{ display: 'grid', gap: 5, padding: '16px 18px', clipPath: cut(8),
              background: on ? mix(g.c, 20) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? g.c : 'rgba(255,255,255,.1)'}` }}>
              <b style={{ fontSize: 19, fontWeight: 800, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
              <small style={{ fontSize: 12, color: '#93a1b1' }}>{t}</small>
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>상대 좌타가 많다 — <b style={{ color: '#a78bfa' }}>빠른 계투</b>가 잘 듣는다</small>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ width: 96, height: 48, border: 0, background: 'rgba(255,255,255,.06)', clipPath: cut(9),
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)', fontSize: 14, color: '#e8ecf2', cursor: 'pointer' }}>◀ 이전</button>
          <span style={{ flex: 1 }}><Start label="다음 ▶" /></span>
        </div>
      </div>
    </Panel>
  );
};

/* ───────── 3 · 마주 보기 — 왼쪽 상대, 오른쪽 내 선택 ───────── */
const C3 = () => (
  <Panel gap={12}>
    <Title />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flexShrink: 0 }}>
      <Lab color={A.foe}>상대</Lab><Lab color={A.main}>우리</Lab>
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {WEAK.slice(0, 3).map((w, i) => (
        <div key={w.t} style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1fr', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'grid', gap: 3, padding: '12px 12px', clipPath: cut(6), background: mix(A.foe, 9) }}>
            <b style={{ fontSize: 13, color: '#e8ecf2' }}>{w.t}</b>
            <small style={{ fontSize: 10.5, color: '#93a1b1' }}>약점</small>
          </span>
          <b style={{ textAlign: 'center', fontSize: 13, color: '#55606f' }}>▶</b>
          <span style={{ display: 'grid', gap: 3, padding: '12px 12px', clipPath: cut(6), background: mix(w.c, 18), boxShadow: `inset 0 0 0 1px ${mix(w.c, 45)}` }}>
            <b style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{w.ans}</b>
            <small style={{ fontSize: 10.5, color: '#93a1b1' }}>{BASE.find((g) => g.opts.some(([k]) => k === w.ans))?.ko}</small>
          </span>
        </div>
      ))}
    </div>
    <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
      <Lab>손대지 않은 갈래</Lab>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px', clipPath: cut(6), background: 'rgba(255,255,255,.04)' }}>
        <small style={{ fontSize: 12, color: '#93a1b1' }}>주루</small>
        <b style={{ marginLeft: 'auto', fontSize: 16, color: '#cbd5e1' }}>보통</b>
      </span>
    </div>
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);

/* ───────── 4 · 요약 한 장 — 평소엔 세 줄, 고칠 때만 펼친다 ───────── */
const C4 = () => (
  <Panel gap={14}>
    <Title />
    <div style={{ display: 'grid', gap: 2 }}>
      <b style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>오늘의 작전</b>
      <small style={{ fontSize: 12, color: '#7d8a9c' }}>2026 KT 위즈 · 약점 4 중 3 되침</small>
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {BASE.map((g) => (
        <span key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 16px', clipPath: cut(8),
          background: 'rgba(255,255,255,.04)', boxShadow: `inset 4px 0 0 ${g.c}` }}>
          <small style={{ fontSize: 12, color: '#93a1b1', width: 46 }}>{g.ko}</small>
          <b style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{picked(g)}</b>
          <b style={{ marginLeft: 'auto', fontSize: 13, color: '#55606f' }}>바꾸기</b>
        </span>
      ))}
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      <Lab>세부 여덟</Lab>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 16px', clipPath: cut(7),
        background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
        <small style={{ fontSize: 12.5, color: '#93a1b1' }}>초구 · 번트 · 대타 · 교체 …</small>
        <b style={{ marginLeft: 'auto', fontSize: 13, color: '#8b97a6' }}>펼치기 ▾</b>
      </span>
    </div>
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);

/* ───────── 5 · 아홉 칸 — 행은 갈래, 열은 성향 ───────── */
const C5 = () => {
  const COL = ['공격적', '중간', '지키기'];
  const GRID = [['강공', '기동력', '짜내기'], ['빠른 계투', '길게', '아끼기'], ['적극', '보통', '신중']];
  return (
    <Panel gap={14}>
      <Title />
      <div style={{ display: 'grid', gap: 2 }}>
        <b style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>줄마다 하나씩</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>왼쪽으로 갈수록 공격적</small>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '46px repeat(3,1fr)', gap: 7, alignItems: 'center' }}>
        <span />
        {COL.map((c) => <small key={c} style={{ fontSize: 10.5, color: '#7d8a9c', textAlign: 'center' }}>{c}</small>)}
        {BASE.map((g, r) => (
          <React.Fragment key={g.key}>
            <small style={{ fontSize: 12, color: g.c }}>{g.ko}</small>
            {GRID[r].map((v) => {
              const on = v === g.pick;
              const hit = hitBy(v);
              return (
                <span key={v} style={{ display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 4, height: 76, clipPath: cut(6),
                  background: on ? mix(g.c, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? g.c : 'rgba(255,255,255,.08)'}` }}>
                  <b style={{ fontSize: 13.5, fontWeight: 800, color: on ? '#fff' : '#cbd5e1', textAlign: 'center' }}>{v}</b>
                  {hit && <b style={{ fontSize: 10, color: A.run }}>★</b>}
                </span>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>★ 은 상대 약점을 되치는 자리</small>
        <Start />
      </div>
    </Panel>
  );
};

/* ───────── 6 · 눈금 셋 — 가장 적은 요소 ───────── */
const C6 = () => {
  const DIAL = [
    { ...BASE[0], v: 2, l: '강공', r: '짜내기' },
    { ...BASE[1], v: 0, l: '빠른 계투', r: '아끼기' },
    { ...BASE[2], v: 0, l: '적극', r: '신중' },
  ];
  return (
    <Panel gap={18}>
      <Title />
      <div style={{ display: 'grid', gap: 2 }}>
        <b style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>세 개만 정한다</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>가운데는 무리하지 않는 쪽</small>
      </div>
      {DIAL.map((g) => (
        <div key={g.key} style={{ display: 'grid', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Lab color={g.c}>{g.ko}</Lab>
            <b style={{ marginLeft: 'auto', fontSize: 17, fontWeight: 800, color: '#fff' }}>{g.opts[g.v][0]}</b>
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
            {g.opts.map(([ko], i) => (
              <span key={ko} style={{ flex: 1, height: 10, background: i === g.v ? g.c : 'rgba(255,255,255,.1)' }} />
            ))}
          </div>
          <span style={{ display: 'flex', fontSize: 11, color: '#7d8a9c' }}>
            <span>{g.l}</span><span style={{ marginLeft: 'auto' }}>{g.r}</span>
          </span>
        </div>
      ))}
      <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', clipPath: cut(7), background: mix(A.foe, 10) }}>
          <b style={{ fontSize: 12, color: A.foe }}>불펜 얇음</b>
          <small style={{ marginLeft: 'auto', fontSize: 12, color: '#cbd5e1' }}>짜내기가 잘 듣는다</small>
        </div>
        <Start />
      </div>
    </Panel>
  );
};

/* ───────── 7 · 한 장씩 넘기기 — 갈래 하나가 화면을 채운다 ───────── */
const C7 = () => {
  const g = BASE[0];
  return (
    <Panel gap={14}>
      <Title />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {BASE.map((x, i) => (
          <span key={x.key} style={{ flex: 1, display: 'grid', justifyItems: 'center', gap: 5 }}>
            <b style={{ fontSize: 12, color: i === 0 ? x.c : '#55606f' }}>{x.ko}</b>
            <span style={{ width: '100%', height: 3, background: i === 0 ? x.c : 'rgba(255,255,255,.1)' }} />
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, clipPath: cut(12), overflow: 'hidden',
        background: `linear-gradient(180deg,${mix(g.c, 18)},rgba(6,10,19,.9))`, boxShadow: `inset 0 0 0 1px ${mix(g.c, 34)}` }}>
        <span style={{ position: 'absolute', inset: 0, backgroundImage: 'url(ui/clutch-bat.webp)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22 }} />
        <span style={{ position: 'absolute', left: 20, right: 20, top: 22, display: 'grid', gap: 6 }}>
          <Lab color={g.c}>{g.en}</Lab>
          <b style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{g.pick}</b>
          <small style={{ fontSize: 13, color: '#cbd5e1' }}>공을 많이 본다 · 상대 불펜을 끌어낸다</small>
        </span>
        <span style={{ position: 'absolute', left: 20, right: 20, bottom: 20, display: 'grid', gap: 7 }}>
          {g.opts.map(([ko]) => (
            <span key={ko} style={{ display: 'flex', alignItems: 'center', height: 42, padding: '0 14px', clipPath: cut(6),
              background: ko === g.pick ? mix(g.c, 26) : 'rgba(5,8,15,.6)', boxShadow: `inset 0 0 0 1px ${ko === g.pick ? g.c : 'rgba(255,255,255,.12)'}` }}>
              <b style={{ fontSize: 14, color: ko === g.pick ? '#fff' : '#cbd5e1' }}>{ko}</b>
              {hitBy(ko) && <b style={{ marginLeft: 'auto', fontSize: 11, color: A.run }}>★ 되침</b>}
            </span>
          ))}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ width: 60, height: 48, border: 0, background: 'rgba(255,255,255,.06)', clipPath: cut(9),
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)', fontSize: 15, color: '#e8ecf2', cursor: 'pointer' }}>◀</button>
        <span style={{ flex: 1 }}><Start label="마운드로 ▶" /></span>
      </div>
    </Panel>
  );
};

/* ───────── 8 · 되치기 목록 — 약점을 켜고 끄면 작전이 따라온다 ───────── */
const C8 = () => (
  <Panel gap={14}>
    <Title />
    <div style={{ display: 'grid', gap: 2 }}>
      <b style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>무엇을 되칠까</b>
      <small style={{ fontSize: 12, color: '#7d8a9c' }}>켜면 그에 맞는 작전이 잡힌다</small>
    </div>
    <div style={{ display: 'grid', gap: 9 }}>
      {WEAK.map((w, i) => {
        const on = i < 3;
        return (
          <span key={w.t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', clipPath: cut(8),
            background: on ? mix(w.c, 13) : 'rgba(255,255,255,.035)', boxShadow: `inset 0 0 0 1px ${mix(w.c, on ? 45 : 12)}` }}>
            <b style={{ fontSize: 15, color: on ? w.c : '#55606f' }}>{on ? '☑' : '☐'}</b>
            <span style={{ display: 'grid', gap: 3 }}>
              <b style={{ fontSize: 14.5, color: on ? '#fff' : '#8b97a6' }}>{w.t}</b>
              <small style={{ fontSize: 11.5, color: '#93a1b1' }}>{w.ans}</small>
            </span>
          </span>
        );
      })}
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      <Lab>이렇게 잡힌다</Lab>
      <div style={{ display: 'grid', gap: 5 }}>
        {BASE.map((g) => (
          <span key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', clipPath: cut(6), background: 'rgba(255,255,255,.04)' }}>
            <small style={{ fontSize: 12, color: '#93a1b1', width: 46 }}>{g.ko}</small>
            <b style={{ fontSize: 15, color: '#fff' }}>{picked(g)}</b>
          </span>
        ))}
      </div>
    </div>
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);

const PLANS = [
  ['1 · 큰 칸 셋', '고른 값만 크게 세 장 · 약점은 아래 한 줄', C1],
  ['2 · 한 번에 하나', '1 / 3 → 2 / 3 → 3 / 3 단계로 · 화면엔 늘 세 선택지만', C2],
  ['3 · 마주 보기', '왼쪽 상대 약점, 오른쪽 그 답 · 짝으로 읽는다', C3],
  ['4 · 요약 한 장', '평소엔 세 줄만 · 고칠 때만 펼친다', C4],
  ['5 · 아홉 칸', '행은 갈래, 열은 공격적 ↔ 지키기 · 한눈에 성향', C5],
  ['6 · 눈금 셋', '세 갈래를 3단 눈금으로 · 요소가 가장 적다', C6],
  ['7 · 한 장씩 넘기기', '갈래 하나가 화면을 채운다 · 사진으로 분위기까지', C7],
  ['8 · 되치기 목록', '약점을 체크하면 작전이 따라 잡힌다', C8],
];

function App() {
  const [only, setOnly] = useState(null);
  const list = only == null ? PLANS : [PLANS[only]];
  return (
    <div style={{ padding: 20, fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <b style={{ fontSize: 19, color: '#fff' }}>전략실 — 읽기 쉬운 8안</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>384 × 823 · 한 번에 보이는 것을 줄였다</small>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
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
