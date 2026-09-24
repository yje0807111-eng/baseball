/*
 * 이닝 정리 — 지난 이닝 결산 대신 "다음 이닝을 어떻게 칠까" 로 (개발 서버: /mockups/recap-next/)
 * 앞 넷(A~D)은 구조를 통째로 바꾼 안, 뒤 넷(E~H)은 그중 밀고 싶은 쪽이다.
 * 상황은 모두 같다 — 3회 종료, 우리 4 : 0 앞섬, 다음은 4회초(상대 공격) → 4회말 우리 5·6·7번.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const W = 1920, H = 911, SCALE = 0.455;
const cut = (c = 10) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const A = { my: '#34d399', foe: '#f87171', warn: '#fbbf24', def: '#60a5fa', vio: '#a78bfa', gray: '#64748b', main: '#10b981' };
const mix = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;
const SIL = 'url(ui/mt/silhouette-player.webp)';

/* 다음 이닝에 나올 사람들 */
const MY_NEXT = [
  { n: '5', nm: '양세종', pos: '3B', ovr: 82, note: '오늘 1안타', hot: true },
  { n: '6', nm: '박진만', pos: 'SS', ovr: 82, note: '삼진 2개', hot: false },
  { n: '7', nm: '최형우', pos: 'LF', ovr: 82, note: '타율 .342', hot: true },
];
const FOE_NEXT = [
  { n: '4', nm: '최정', pos: '3B', ovr: 89, note: '장타 위험', hot: true },
  { n: '5', nm: '오태곤', pos: '1B', ovr: 78, note: '−', hot: false },
  { n: '6', nm: '김성현', pos: '2B', ovr: 82, note: '−', hot: false },
];

/* ───────── 조각 ───────── */
const Lab = ({ children, color = A.gray, size = 10 }) => (
  <p style={{ margin: 0, fontFamily: disp, fontSize: size, fontWeight: 700, letterSpacing: '.28em', color, textTransform: 'uppercase' }}>{children}</p>
);
const Face = ({ w = 54, h = 68, c = A.my }) => (
  <span style={{ width: w, height: h, flexShrink: 0, clipPath: cut(5), backgroundImage: SIL, backgroundSize: 'cover',
    backgroundPosition: 'center 12%', boxShadow: `inset 0 0 0 1px ${mix(c, 45)}` }} />
);
/* 화면 틀 — 위 띠와 아래 선택 줄은 모든 안이 같다 */
const Screen = ({ children, foot, inning = '4회', sub = '다음 이닝 기조 고르기' }) => (
  <div style={{ width: W, height: H, position: 'relative', background: '#070b12', display: 'flex', flexDirection: 'column',
    fontFamily: "'IBM Plex Sans KR',sans-serif", color: '#e8ecf2', overflow: 'hidden' }}>
    <i style={{ position: 'absolute', inset: 0, backgroundImage: 'url(ui/field/park-16.webp)', backgroundSize: 'cover', opacity: 0.16 }} />
    <i style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(7,11,18,.82),rgba(7,11,18,.96))' }} />
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18, padding: '18px 30px 0', flexShrink: 0 }}>
      <span style={{ display: 'grid', gap: 2 }}>
        <Lab size={9}>Inning Recap</Lab>
        <b style={{ fontSize: 19, color: '#fff' }}>3회 종료</b>
      </span>
      <span style={{ display: 'flex', gap: 3, marginLeft: 8 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} style={{ width: 30, height: 5, background: i < 3 ? (i === 2 ? A.warn : A.my) : 'rgba(255,255,255,.12)' }} />
        ))}
      </span>
      <small style={{ fontSize: 11, color: '#7d8a9c' }}>3 / 9 이닝</small>
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <small style={{ fontSize: 12, color: '#93a1b1' }}>AI 올스타</small>
        <b style={{ fontFamily: disp, fontSize: 26, fontWeight: 800, color: '#93a1b1' }}>0</b>
        <b style={{ fontFamily: disp, fontSize: 26, fontWeight: 800, color: A.my }}>4</b>
        <small style={{ fontSize: 12, color: '#e8ecf2' }}>나의 드림팀</small>
      </span>
    </div>
    <div style={{ position: 'relative', flex: 1, minHeight: 0, padding: '14px 30px' }}>{children}</div>
    <div style={{ position: 'relative', padding: '0 30px 20px', flexShrink: 0 }}>{foot}</div>
  </div>
);
/* 아래 선택 줄 — 기조 셋 (안마다 내용이 달라진다) */
const Foot = ({ items, note, count = 3 }) => (
  <div style={{ display: 'grid', gap: 8 }}>
    {note && <small style={{ fontSize: 12, color: '#93a1b1' }}>{note}</small>}
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {items.map(([ko, t, c, on], i) => (
        <span key={i} style={{ flex: 1, display: 'grid', alignContent: 'center', gap: 3, height: 62, padding: '0 18px', clipPath: cut(8),
          background: on ? mix(c, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? c : 'rgba(255,255,255,.1)'}` }}>
          <b style={{ fontSize: 15, fontWeight: 800, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
          <small style={{ fontSize: 11, color: '#93a1b1' }}>{t}</small>
        </span>
      ))}
      <span style={{ width: 56, height: 56, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%',
        boxShadow: `inset 0 0 0 2px ${mix(A.my, 55)}`, fontFamily: disp, fontSize: 21, fontWeight: 800, color: A.my }}>{count}</span>
    </div>
  </div>
);
/* 다음 타자 카드 한 장 */
const Bat = ({ p, c = A.my, big = false }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 11, padding: big ? '12px 14px' : '9px 12px', clipPath: cut(6),
    background: p.hot ? mix(c, 12) : 'rgba(255,255,255,.04)', boxShadow: `inset 3px 0 0 ${p.hot ? c : 'rgba(255,255,255,.14)'}` }}>
    <b style={{ fontFamily: disp, fontSize: 13, color: '#7d8a9c', width: 14 }}>{p.n}</b>
    <Face w={big ? 48 : 38} h={big ? 60 : 46} c={c} />
    <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <b style={{ fontSize: big ? 16 : 14, color: '#fff' }}>{p.nm}</b>
      <small style={{ fontSize: 10.5, color: '#93a1b1' }}>{p.pos} · {p.note}</small>
    </span>
    <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: big ? 22 : 18, fontWeight: 800, color: '#e8ecf2' }}>{p.ovr}</b>
  </span>
);
/* 투수 상태 — 투구 수와 체력 */
const Arm = ({ nm, tag, pitch, max, hp, c }) => (
  <div style={{ display: 'grid', gap: 7, padding: '13px 15px', clipPath: cut(7), background: 'rgba(255,255,255,.04)', boxShadow: `inset 3px 0 0 ${c}` }}>
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <b style={{ fontSize: 15, color: '#fff' }}>{nm}</b>
      <small style={{ fontSize: 10.5, color: '#93a1b1' }}>{tag}</small>
      <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 19, fontWeight: 800, color: c }}>{pitch}<small style={{ fontSize: 11, color: '#7d8a9c' }}>구</small></b>
    </span>
    <span style={{ display: 'flex', height: 7, background: 'rgba(255,255,255,.08)' }}>
      <i style={{ width: `${hp}%`, background: hp > 60 ? A.my : hp > 35 ? A.warn : A.foe }} />
    </span>
    <span style={{ display: 'flex', fontSize: 10.5, color: '#7d8a9c' }}>
      <span>체력 {hp}%</span><span style={{ marginLeft: 'auto' }}>{max}</span>
    </span>
  </div>
);

/* ───────── A · 다음 이닝 브리핑 ───────── */
const RA = () => (
  <Screen foot={<Foot note="4회초 — 상대 4번부터. 최정 한 방을 조심할 자리" count={3}
    items={[['정면 승부', '최정과도 붙는다', A.foe, 0], ['피해 간다', '4번은 거르고 5번 승부', A.def, 1], ['교체 준비', '불펜을 미리 세운다', A.vio, 0]]} />}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: '100%' }}>
      <div style={{ display: 'grid', alignContent: 'start', gap: 10, padding: 18, clipPath: cut(12), background: mix(A.foe, 7), boxShadow: `inset 0 0 0 1px ${mix(A.foe, 22)}` }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <Lab color={A.foe} size={11}>Top 4th</Lab>
          <b style={{ fontSize: 17, color: '#fff' }}>막아야 할 타자</b>
          <b style={{ marginLeft: 'auto', fontSize: 12, color: A.foe }}>상대 4 · 5 · 6번</b>
        </span>
        {FOE_NEXT.map((p) => <Bat key={p.n} p={p} c={A.foe} big />)}
        <div style={{ marginTop: 6 }}><Arm nm="이길환" tag="우리 선발 · SP 82" pitch={44} max="목표 100구" hp={78} c={A.my} /></div>
      </div>
      <div style={{ display: 'grid', alignContent: 'start', gap: 10, padding: 18, clipPath: cut(12), background: mix(A.my, 7), boxShadow: `inset 0 0 0 1px ${mix(A.my, 22)}` }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <Lab color={A.my} size={11}>Bottom 4th</Lab>
          <b style={{ fontSize: 17, color: '#fff' }}>우리 차례</b>
          <b style={{ marginLeft: 'auto', fontSize: 12, color: A.my }}>5 · 6 · 7번</b>
        </span>
        {MY_NEXT.map((p) => <Bat key={p.n} p={p} c={A.my} big />)}
        <div style={{ marginTop: 6 }}><Arm nm="박종훈" tag="상대 선발 · SP 78" pitch={61} max="한계 90구 안팎" hp={46} c={A.foe} /></div>
      </div>
    </div>
  </Screen>
);

/* ───────── B · 갈림길 — 큰 선택 세 장 ───────── */
const RB = () => (
  <Screen foot={<Foot note="고른 길은 이번 이닝에만 쓰인다" count={3}
    items={[['그대로', '지금 흐름 유지', A.main, 1]]} />}>
    <div style={{ display: 'grid', gap: 14, height: '100%', gridTemplateRows: 'auto 1fr' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <b style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>4점 앞선 4회 — 어떻게 갈까</b>
        <small style={{ fontSize: 13, color: '#93a1b1' }}>상대 선발은 61구 · 우리 불펜은 모두 준비됨</small>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, minHeight: 0 }}>
        {[['밀어붙인다', A.my, ['상대 선발을 끌어내린다', '스윙 과감 · 주루 과감', '실점 위험은 그대로'], '상대 선발 조기 강판 확률 ▲'],
          ['지킨다', A.def, ['불펜을 일찍 올린다', '수비 위치 과감 · 승부 회피', '점수는 덜 난다'], '대량 실점 확률 ▼'],
          ['아낀다', A.vio, ['선발을 길게 끌고 간다', '투수 교체 늦게', '다음 경기까지 본다'], '불펜 소모 ▼'],
        ].map(([ko, c, lines, out], i) => (
          <div key={ko} style={{ display: 'grid', alignContent: 'start', gap: 12, padding: 20, clipPath: cut(12),
            background: i === 0 ? mix(c, 16) : 'rgba(255,255,255,.035)', boxShadow: `inset 0 0 0 ${i === 0 ? 2 : 1}px ${i === 0 ? c : 'rgba(255,255,255,.09)'}` }}>
            <b style={{ fontSize: 26, fontWeight: 800, color: i === 0 ? '#fff' : '#cbd5e1' }}>{ko}</b>
            <span style={{ display: 'grid', gap: 6 }}>
              {lines.map((l) => (
                <span key={l} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#93a1b1' }}>
                  <b style={{ color: c }}>·</b>{l}
                </span>
              ))}
            </span>
            <span style={{ marginTop: 'auto', padding: '8px 11px', clipPath: cut(5), background: mix(c, 12), fontSize: 11.5, color: c }}>{out}</span>
          </div>
        ))}
      </div>
    </div>
  </Screen>
);

/* ───────── C · 마운드 시계 ───────── */
const RC = () => (
  <Screen foot={<Foot note="상대 선발이 90구에 닿으면 불펜이 올라온다 — 그전에 끌어내릴지" count={3}
    items={[['버틴다', '이길환에게 맡긴다', A.my, 1], ['몸 푼다', '불펜 준비만', A.warn, 0], ['바꾼다', '4회부터 계투', A.vio, 0]]} />}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: '100%' }}>
      {[['우리 마운드', A.my, '이길환', 'SP 82 · 3이닝 무실점', 44, 78, [['4회', 0], ['5회', 0], ['6회', 1], ['7회', 2]]],
        ['상대 마운드', A.foe, '박종훈', 'SP 78 · 3이닝 4실점', 61, 46, [['4회', 1], ['5회', 2], ['6회', 2], ['7회', 2]]],
      ].map(([title, c, nm, tag, pitch, hp, rows]) => (
        <div key={title} style={{ display: 'grid', alignContent: 'start', gap: 14, padding: 20, clipPath: cut(12),
          background: mix(c, 6), boxShadow: `inset 0 0 0 1px ${mix(c, 22)}` }}>
          <Lab color={c} size={11}>{title}</Lab>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Face w={72} h={90} c={c} />
            <span style={{ display: 'grid', gap: 4 }}>
              <b style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{nm}</b>
              <small style={{ fontSize: 12, color: '#93a1b1' }}>{tag}</small>
            </span>
            <span style={{ marginLeft: 'auto', display: 'grid', justifyItems: 'end' }}>
              <b style={{ fontFamily: disp, fontSize: 40, fontWeight: 800, color: c, lineHeight: 1 }}>{pitch}</b>
              <small style={{ fontSize: 11, color: '#7d8a9c' }}>투구 수</small>
            </span>
          </div>
          <span style={{ display: 'flex', height: 10, background: 'rgba(255,255,255,.08)' }}>
            <i style={{ width: `${hp}%`, background: hp > 60 ? A.my : hp > 35 ? A.warn : A.foe }} />
          </span>
          <span style={{ display: 'grid', gap: 5, marginTop: 4 }}>
            <Lab size={9}>앞으로</Lab>
            {rows.map(([ko, risk]) => (
              <span key={ko} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 34, padding: '0 12px', clipPath: cut(4),
                background: 'rgba(255,255,255,.035)' }}>
                <b style={{ fontFamily: disp, fontSize: 12, color: '#cbd5e1', width: 30 }}>{ko}</b>
                <span style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map((k) => <i key={k} style={{ width: 22, height: 5, background: k <= risk ? [A.my, A.warn, A.foe][risk] : 'rgba(255,255,255,.1)' }} />)}
                </span>
                <small style={{ marginLeft: 'auto', fontSize: 11, color: '#7d8a9c' }}>{['여유', '지침', '한계'][risk]}</small>
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  </Screen>
);

/* ───────── D · 매치업 격자 ───────── */
const RD = () => (
  <Screen foot={<Foot note="우리 5 · 6 · 7번과 상대 투수의 상성" count={3}
    items={[['좌투 공략', '우타 위주로', A.my, 1], ['기다린다', '공을 많이 본다', A.def, 0], ['과감히', '초구부터 노린다', A.warn, 0]]} />}>
    <div style={{ display: 'grid', gap: 14, height: '100%', gridTemplateRows: 'auto 1fr' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <b style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>4회말 — 우리가 붙을 자리</b>
        <small style={{ fontSize: 13, color: '#93a1b1' }}>상대 선발 박종훈 · 우완 · 61구</small>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '150px repeat(4,1fr)', gap: 8, alignContent: 'start' }}>
        <span />
        {['구위 73', '제구 84', '체력 46%', '상성'].map((h) => (
          <small key={h} style={{ fontSize: 11, color: '#7d8a9c', textAlign: 'center', alignSelf: 'end', paddingBottom: 4 }}>{h}</small>
        ))}
        {MY_NEXT.map((p) => (
          <React.Fragment key={p.n}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', clipPath: cut(5), background: 'rgba(255,255,255,.04)' }}>
              <b style={{ fontFamily: disp, fontSize: 12, color: '#7d8a9c' }}>{p.n}</b>
              <b style={{ fontSize: 14, color: '#fff' }}>{p.nm}</b>
            </span>
            {[['파워', 88, A.my], ['컨택', 76, A.warn], ['주력', 71, A.def]].map(([k, v, c]) => (
              <span key={k} style={{ display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 4, height: 62, clipPath: cut(5),
                background: 'rgba(255,255,255,.035)' }}>
                <small style={{ fontSize: 10, color: '#7d8a9c' }}>{k}</small>
                <b style={{ fontFamily: disp, fontSize: 17, fontWeight: 800, color: c }}>{v}</b>
              </span>
            ))}
            <span style={{ display: 'grid', placeItems: 'center', height: 62, clipPath: cut(5),
              background: p.hot ? mix(A.my, 18) : 'rgba(255,255,255,.035)', boxShadow: p.hot ? `inset 0 0 0 1px ${mix(A.my, 45)}` : 'none' }}>
              <b style={{ fontSize: 13, color: p.hot ? A.my : '#7d8a9c' }}>{p.hot ? '유리' : '보통'}</b>
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  </Screen>
);

/* ───────── E · 한 줄 판단 + 축 미세조정 (추천) ───────── */
const RE = () => (
  <Screen foot={<Foot note="고친 축은 이번 이닝부터 바로 쓰인다" count={3}
    items={[['그대로 간다', '전략실에서 정한 대로', A.main, 1], ['바꾼 대로', '위에서 고친 값으로', A.warn, 0]]} />}>
    <div style={{ display: 'grid', gap: 16, height: '100%', gridTemplateRows: 'auto auto 1fr' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', clipPath: cut(12),
        background: mix(A.warn, 10), boxShadow: `inset 4px 0 0 ${A.warn}` }}>
        <span style={{ display: 'grid', gap: 5 }}>
          <Lab color={A.warn} size={10}>Read</Lab>
          <b style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>4점 앞섰다 — 이제 지킬 때</b>
          <small style={{ fontSize: 13, color: '#cbd5e1' }}>상대 4번부터 시작하고, 우리 선발은 44구로 아직 여유가 있다</small>
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[['스윙', '과감', '신중', A.my], ['투수 교체', '늦게', '빠르게', A.foe], ['수비 위치', '정석', '과감', A.def]].map(([ko, now, to, c]) => (
          <div key={ko} style={{ display: 'grid', gap: 9, padding: '16px 18px', clipPath: cut(9), background: 'rgba(255,255,255,.04)' }}>
            <span style={{ display: 'flex', alignItems: 'baseline' }}>
              <small style={{ fontSize: 12, color: '#93a1b1' }}>{ko}</small>
              <b style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 800, color: '#fff' }}>{now}</b>
            </span>
            <span style={{ display: 'flex', gap: 5 }}>
              {[0, 1, 2].map((i) => <i key={i} style={{ flex: 1, height: 8, background: i === 0 ? c : 'rgba(255,255,255,.1)' }} />)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: A.warn }}>
              <b>권함</b><span style={{ color: '#93a1b1' }}>{to} 쪽으로</span>
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, minHeight: 0 }}>
        {[['막아야 할 타자', A.foe, FOE_NEXT], ['우리 차례', A.my, MY_NEXT]].map(([t, c, list]) => (
          <div key={t} style={{ display: 'grid', alignContent: 'start', gap: 8, padding: 16, clipPath: cut(10), background: 'rgba(255,255,255,.03)' }}>
            <Lab color={c} size={10}>{t}</Lab>
            {list.map((p) => <Bat key={p.n} p={p} c={c} />)}
          </div>
        ))}
      </div>
    </div>
  </Screen>
);

/* ───────── F · 기회 창 (추천) ───────── */
const RF = () => (
  <Screen foot={<Foot note="남은 기회는 여섯 번 — 이번 이닝을 어떻게 쓸지" count={3}
    items={[['승부처로 본다', '이번에 쏟는다', A.warn, 0], ['평소대로', '흐름을 지킨다', A.main, 1], ['넘긴다', '뒤를 노린다', A.def, 0]]} />}>
    <div style={{ display: 'grid', gap: 18, height: '100%', gridTemplateRows: 'auto auto 1fr' }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <b style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>남은 기회 6번</b>
        <small style={{ fontSize: 13, color: '#93a1b1' }}>4 · 7회는 중심 타선이 도는 자리다</small>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[['1회', '지남', 0], ['2회', '지남', 0], ['3회', '+1', 1], ['4회', '5 · 6 · 7번', 2], ['5회', '8 · 9 · 1번', 0],
          ['6회', '2 · 3 · 4번', 0], ['7회', '5 · 6 · 7번', 2], ['8회', '8 · 9 · 1번', 0], ['9회', '2 · 3 · 4번', 0]].map(([ko, t, k], i) => (
          <span key={ko} style={{ flex: k === 2 ? 1.4 : 1, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 6, height: 104, clipPath: cut(7),
            background: k === 2 ? mix(A.warn, 15) : k === 1 ? mix(A.my, 15) : 'rgba(255,255,255,.035)',
            boxShadow: `inset 0 0 0 ${i === 3 ? 2 : 1}px ${i === 3 ? A.warn : 'rgba(255,255,255,.08)'}` }}>
            <b style={{ fontFamily: disp, fontSize: 17, fontWeight: 800, color: k ? '#fff' : '#55606f' }}>{ko}</b>
            <small style={{ fontSize: 10.5, color: k === 2 ? A.warn : k === 1 ? A.my : '#55606f', textAlign: 'center' }}>{t}</small>
          </span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, minHeight: 0 }}>
        <div style={{ display: 'grid', alignContent: 'start', gap: 9, padding: 18, clipPath: cut(11), background: mix(A.warn, 8), boxShadow: `inset 0 0 0 1px ${mix(A.warn, 26)}` }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <Lab color={A.warn} size={10}>Next Up</Lab>
            <b style={{ fontSize: 17, color: '#fff' }}>4회말 — 중심이 돈다</b>
          </span>
          {MY_NEXT.map((p) => <Bat key={p.n} p={p} c={A.warn} big />)}
        </div>
        <div style={{ display: 'grid', alignContent: 'start', gap: 12, padding: 18, clipPath: cut(11), background: 'rgba(255,255,255,.03)' }}>
          <Lab size={10}>상대 마운드</Lab>
          <Arm nm="박종훈" tag="선발 · 61구" pitch={61} max="90구 안팎에서 교체" hp={46} c={A.foe} />
          <small style={{ fontSize: 12, color: '#93a1b1', lineHeight: 1.6 }}>
            한 이닝만 더 끌면 불펜이 올라온다. 상대 불펜 평균 <b style={{ color: A.my }}>71</b> — 선발보다 무르다.
          </small>
        </div>
      </div>
    </div>
  </Screen>
);

/* ───────── G · 신호등 (추천) ───────── */
const RG = () => (
  <Screen foot={<Foot note="켜진 신호에 맞춰 기조를 고른다" count={3}
    items={[['불펜 준비', '노란 신호에 맞춘다', A.warn, 1], ['그대로', '아직 여유 있다', A.main, 0]]} />}>
    <div style={{ display: 'grid', gap: 16, height: '100%', gridTemplateRows: 'auto 1fr' }}>
      <b style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>지금 경기가 말해 주는 것</b>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, minHeight: 0 }}>
        {[['우리 선발', A.my, '여유', '44구 · 체력 78% · 3이닝 무실점', '7회까지 갈 수 있다'],
          ['상대 선발', A.warn, '지침', '61구 · 체력 46% · 4실점', '한 이닝만 더 끌면 불펜'],
          ['우리 불펜', A.my, '여유', '7명 모두 준비됨', '언제든 올릴 수 있다'],
        ].map(([t, c, state, detail, say]) => (
          <div key={t} style={{ display: 'grid', alignContent: 'start', gap: 14, padding: 22, clipPath: cut(12),
            background: mix(c, 8), boxShadow: `inset 0 0 0 1px ${mix(c, 26)}` }}>
            <Lab color={c} size={10}>{t}</Lab>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: c, boxShadow: `0 0 18px ${mix(c, 70)}` }} />
              <b style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{state}</b>
            </span>
            <small style={{ fontSize: 12.5, color: '#93a1b1' }}>{detail}</small>
            <span style={{ marginTop: 'auto', padding: '10px 12px', clipPath: cut(5), background: 'rgba(255,255,255,.05)', fontSize: 12.5, color: '#e8ecf2' }}>{say}</span>
          </div>
        ))}
      </div>
    </div>
  </Screen>
);

/* ───────── H · 감독 노트 (추천) ───────── */
const RH = () => (
  <Screen foot={<Foot note="적어 둔 것은 다음 이닝 정리에서 다시 보여 준다" count={3}
    items={[['최정 승부 피함', '거르고 간다', A.def, 1], ['정면 승부', '붙는다', A.foe, 0], ['그때 정한다', '맡긴다', A.main, 0]]} />}>
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, height: '100%' }}>
      <div style={{ display: 'grid', alignContent: 'start', gap: 10, padding: 18, clipPath: cut(11), background: 'rgba(255,255,255,.03)' }}>
        <Lab size={10}>지난 이닝에 적은 것</Lab>
        {[['1회', '상대 1번이 빠르다 — 견제 바짝', 1], ['2회', '박종훈 변화구가 안 들어온다', 1], ['3회', '오재일 솔로 홈런 · 흐름 우리 쪽', 0]].map(([n, t, done]) => (
          <span key={n} style={{ display: 'grid', gap: 4, padding: '12px 13px', clipPath: cut(5), background: 'rgba(255,255,255,.04)',
            boxShadow: `inset 3px 0 0 ${done ? A.my : 'rgba(255,255,255,.14)'}` }}>
            <b style={{ fontFamily: disp, fontSize: 11, color: '#7d8a9c' }}>{n}</b>
            <small style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{t}</small>
          </span>
        ))}
      </div>
      <div style={{ display: 'grid', alignContent: 'start', gap: 14, padding: 22, clipPath: cut(12), background: mix(A.vio, 7), boxShadow: `inset 0 0 0 1px ${mix(A.vio, 22)}` }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <Lab color={A.vio} size={11}>4th Inning</Lab>
          <b style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>이번엔 무엇을 볼까</b>
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[['상대 4번 최정', '오늘 2타석 무안타 · 파워 89', A.foe],
            ['우리 5 · 6 · 7번', '중심이 한 바퀴 돌았다', A.my],
            ['박종훈 61구', '90구 안팎이 한계', A.warn],
            ['불펜 7명', '아직 한 명도 안 썼다', A.def]].map(([t, d, c]) => (
            <span key={t} style={{ display: 'grid', gap: 5, padding: '15px 16px', clipPath: cut(7), background: 'rgba(255,255,255,.04)', boxShadow: `inset 3px 0 0 ${c}` }}>
              <b style={{ fontSize: 14.5, color: '#fff' }}>{t}</b>
              <small style={{ fontSize: 11.5, color: '#93a1b1' }}>{d}</small>
            </span>
          ))}
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, padding: '14px 16px', clipPath: cut(7),
          background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
          <small style={{ fontSize: 12.5, color: '#7d8a9c' }}>이번 이닝에 적어 둘 것</small>
          <b style={{ marginLeft: 'auto', fontSize: 12.5, color: A.vio }}>고르면 여기 적힌다</b>
        </span>
      </div>
    </div>
  </Screen>
);

const PLANS = [
  ['A · 다음 이닝 브리핑', '막아야 할 타자 · 우리 차례 · 양 팀 마운드를 좌우로', RA],
  ['B · 갈림길', '밀어붙인다 / 지킨다 / 아낀다 — 고르면 무엇이 달라지는지까지', RB],
  ['C · 마운드 시계', '양 팀 투구 수와 앞으로 몇 회까지 갈지', RC],
  ['D · 매치업 격자', '우리 타자 셋 × 상대 투수 상성표', RD],
  ['E · 한 줄 판단 + 축 (추천)', '"이제 지킬 때" 한 줄 + 성향 축 셋을 즉석에서', RE],
  ['F · 기회 창 (추천)', '남은 이닝을 기회로 — 중심 타선이 도는 회를 짚는다', RF],
  ['G · 신호등 (추천)', '우리 선발 · 상대 선발 · 불펜 세 신호', RG],
  ['H · 감독 노트 (추천)', '이닝마다 쌓이는 메모 + 이번에 볼 것', RH],
];

function App() {
  const [only, setOnly] = useState(null);
  const list = only == null ? PLANS : [PLANS[only]];
  return (
    <div style={{ padding: 20, fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <b style={{ fontSize: 19, color: '#fff' }}>이닝 정리 — 앞을 보는 8안</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>1920 × 911 · 3회 종료 · 4 : 0 앞섬 · 이름을 누르면 그것만 크게</small>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {PLANS.map(([t], i) => (
            <button key={t} onClick={() => setOnly(only === i ? null : i)} style={{ padding: '4px 9px', border: 0, cursor: 'pointer', clipPath: cut(4),
              background: only === i ? A.main : 'rgba(255,255,255,.06)', color: only === i ? '#05080f' : '#cbd5e1', fontSize: 11, fontWeight: 700 }}>{t.split(' · ')[0]}</button>
          ))}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: only == null ? '1fr 1fr' : '1fr', gap: 18 }}>
        {list.map(([title, desc, Body]) => {
          const s = only == null ? SCALE : 0.9;
          return (
            <div key={title}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                <b style={{ fontSize: 14, color: '#fff' }}>{title}</b>
                <small style={{ fontSize: 11.5, color: '#8b97a6' }}>{desc}</small>
              </div>
              <div style={{ width: W * s, height: H * s, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,.08)' }}>
                <div style={{ transform: `scale(${s})`, transformOrigin: '0 0' }}><Body /></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
