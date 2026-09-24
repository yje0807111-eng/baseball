/*
 * 경기 전 정비 화면의 빈 자리를 채우는 8안 (개발 서버: /mockups/prep-space/)
 * 지금 비는 곳은 둘 — 벤치 3칸 아래 오른쪽 기둥(약 280×300)과 구장 그림 좌우.
 * 여덟 안 모두 화면 크기(1920 × 911)와 바깥 뼈대는 그대로 두고, 그 자리에 무엇을 넣는지만 다르다.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const W = 1920, H = 911, SCALE = 0.455;
const cut = (c = 10) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const A = { main: '#10b981', bat: '#34d399', def: '#60a5fa', pit: '#f87171', warn: '#fbbf24', foe: '#f472b6', gray: '#64748b' };
const mix = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;

/* ───────── 공통 조각 ───────── */
const Lab = ({ children, color = A.main, size = 11 }) => (
  <p style={{ margin: 0, fontFamily: disp, fontSize: size, fontWeight: 700, letterSpacing: '.3em', color, textTransform: 'uppercase' }}>{children}</p>
);
const Panel = ({ children, a = A.main, pad = 10, style }) => (
  <div style={{ position: 'relative', background: 'rgba(6,10,19,.74)', clipPath: cut(14), padding: pad,
    boxShadow: `inset 0 0 0 1px ${mix(a, 32)}`, display: 'flex', flexDirection: 'column', minHeight: 0, ...style }}>{children}</div>
);
/* 선수 한 줄 — 등번호 자리 · 이름 · 수치 */
const Row = ({ n, pos, name, sub, v, a = A.main, h = 26 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: h, padding: '0 8px', background: 'rgba(255,255,255,.035)',
    clipPath: cut(4), boxShadow: `inset 2px 0 0 ${a}` }}>
    {pos && <b style={{ fontFamily: disp, fontSize: 10, fontWeight: 800, color: a, width: 22 }}>{pos}</b>}
    <b style={{ fontSize: 12, color: '#e8ecf2', whiteSpace: 'nowrap' }}>{name}</b>
    {sub && <small style={{ fontFamily: disp, fontSize: 9.5, color: '#7d8a9c', whiteSpace: 'nowrap' }}>{sub}</small>}
    <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 13, fontWeight: 800, color: '#e8ecf2' }}>{v}</b>
    {n != null && <span style={{ fontFamily: disp, fontSize: 9, color: '#55606f' }}>{n}</span>}
  </div>
);
const Bar = ({ ko, mine, foe, a }) => {
  const t = mine + foe;
  return (
    <div style={{ display: 'grid', gap: 3 }}>
      <div style={{ display: 'flex', fontSize: 10.5 }}>
        <b style={{ fontFamily: disp, fontSize: 12, color: a, width: 40 }}>{mine}</b>
        <span style={{ margin: '0 auto', color: '#8b97a6' }}>{ko}</span>
        <b style={{ fontFamily: disp, fontSize: 12, color: A.foe, width: 40, textAlign: 'right' }}>{foe}</b>
      </div>
      <div style={{ display: 'flex', height: 5, background: 'rgba(255,255,255,.07)' }}>
        <i style={{ width: `${(mine / t) * 100}%`, background: a }} />
        <i style={{ flex: 1, background: mix(A.foe, 65) }} />
      </div>
    </div>
  );
};

/* ───────── 화면 뼈대 (모든 안이 공유) ───────── */
const LINEUP = [['CF', '최원준', 90], ['LF', '럴리어드', 89], ['RF', '안현민', 84], ['3B', '허경민', 84], ['CF', '김민혁', 74],
  ['SS', '권동진', 73], ['2B', '김상수', 75], ['1B', '김현수', 70], ['C', '장성우', 72]];
const ROT = [['1SP', '유희관', 79], ['CL', '조규제', 71], ['SU', '이상군', 71], ['SU', '김웅동', 71],
  ['MR1', '안영명', 70], ['MR2', '진해중', 70], ['MR3', '권준현', 68], ['MR4', '애킨스', 68]];
const FOE_LINEUP = [['CF', '김민혁', 88], ['SS', '심우준', 82], ['1B', '문상철', 86], ['DH', '강백호', 91], ['LF', '로하스', 89],
  ['3B', '황재균', 80], ['RF', '배정대', 78], ['2B', '오윤석', 74], ['C', '장성우', 76]];

/* 왼쪽 스카우팅 판 — 여덟 안 모두 그대로 */
const Scout = () => (
  <Panel a={A.foe} style={{ width: 272, gap: 8 }}>
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
      {LINEUP.map(([p, n, v], i) => <Row key={i} pos={p} name={n} v={v} a={A.bat} h={24} />)}
    </div>
  </Panel>
);
/* 가운데 구장 — 안에 따라 폭만 달라진다 */
const Field = ({ tall = false }) => (
  <div style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: tall ? 0 : undefined, background: '#050a12', clipPath: cut(12), overflow: 'hidden' }}>
    <i style={{ position: 'absolute', inset: 0, backgroundImage: 'url(ui/field/park-16.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
    <i style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 50% at 50% 46%,transparent,rgba(5,8,15,.55))' }} />
    <span style={{ position: 'absolute', left: 12, top: 10 }}><Lab size={10}>My Squad</Lab></span>
    {!tall && <span style={{ position: 'absolute', right: 12, top: 8, padding: '4px 10px', clipPath: cut(5),
      background: 'rgba(6,10,19,.8)', boxShadow: `inset 0 0 0 1px ${mix(A.main, 40)}`, fontSize: 11, color: '#cbd5e1' }}>자동 배치</span>}
  </div>
);
/* 로테이션 · 불펜 · 벤치 기둥 — 지금은 이 아래가 빈다 */
const RotCol = ({ w = 280, children, benchRow = false }) => (
  <div style={{ width: w, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
    <Lab size={10}>Rotation 선발 1</Lab>
    <div style={{ display: 'grid', gap: 3 }}>
      {ROT.slice(0, 1).map(([p, n, v], i) => <Row key={i} pos={p} name={n} sub="ERA 3.94" v={v} a={A.pit} />)}
    </div>
    <Lab size={10}>Bullpen 불펜 7</Lab>
    <div style={{ display: 'grid', gap: 3 }}>
      {ROT.slice(1).map(([p, n, v], i) => <Row key={i} pos={p} name={n} sub="ERA 4.2" v={v} a={A.pit} />)}
    </div>
    <Lab size={10}>Bench 벤치 3</Lab>
    <div style={{ display: benchRow ? 'flex' : 'grid', gap: 3 }}>
      {[['김재호', 72], ['이종운', 71], ['김재환', 68]].map(([n, v], i) =>
        <span key={i} style={{ flex: 1 }}><Row name={n} v={v} a={A.gray} h={22} /></span>)}
    </div>
    {children}
  </div>
);
/* 오른쪽 TUNE UP 판 — 안에 따라 속이 달라진다 */
const Tune = ({ styles = 8, w = 384, extra = null, compact = false }) => (
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
    {extra}
    {styles > 0 && <>
      <Lab size={10} color={A.warn}>Play Style</Lab>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '1fr', gap: 4, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {['빅볼', '스몰볼', '발야구', '출루', '마운드', '총력전', '실점 최소', '균형'].slice(0, styles).map((s, i) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', padding: '0 9px', height: compact ? 28 : 34, clipPath: cut(5),
            background: i === 7 ? mix(A.main, 22) : 'rgba(255,255,255,.04)',
            boxShadow: `inset 0 0 0 1px ${i === 7 ? A.main : 'rgba(255,255,255,.08)'}` }}>
            <b style={{ fontSize: 12, color: i === 7 ? '#fff' : '#cbd5e1' }}>{s}</b>
          </span>
        ))}
      </div>
    </>}
    <button style={{ height: 40, border: 0, background: A.main, clipPath: cut(9), fontSize: 14, fontWeight: 800, color: '#05080f', cursor: 'pointer' }}>
      경기 시작 ▶
    </button>
  </Panel>
);
/* 아래 타순 줄 — 안에 따라 자리만 달라진다 */
const Order = ({ h = 96, synergy = true }) => (
  <div style={{ display: 'flex', gap: 10, height: h }}>
    <Panel pad={8} style={{ flex: 1, gap: 5 }}>
      <Lab size={10}>Batting Order 내 타순 9</Lab>
      <div style={{ display: 'flex', gap: 5, flex: 1 }}>
        {LINEUP.map(([p, n, v], i) => (
          <span key={i} style={{ flex: 1, position: 'relative', background: 'linear-gradient(180deg,#14243c,#080e1a)', clipPath: cut(5),
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)', display: 'grid', alignContent: 'end', justifyItems: 'center', padding: 4 }}>
            <b style={{ position: 'absolute', left: 5, top: 3, fontFamily: disp, fontSize: 12, fontWeight: 800, color: '#fff' }}>{i + 1}</b>
            <b style={{ position: 'absolute', right: 5, top: 3, fontFamily: disp, fontSize: 11, fontWeight: 800, color: A.bat }}>{v}</b>
            <b style={{ fontSize: 11, color: '#e8ecf2' }}>{n}</b>
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

/* 지금 비어 있는 자리를 짚어 주는 표시 (첫 칸에서만) */
const Hole = ({ children = '지금 비는 자리' }) => (
  <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', border: `2px dashed ${mix(A.warn, 55)}`, borderRadius: 4 }}>
    <b style={{ fontFamily: disp, fontSize: 12, letterSpacing: '.2em', color: A.warn }}>{children}</b>
  </div>
);

/* ───────── 안 여덟 ───────── */
/* 1 · 상대 라인업을 마주 세운다 */
const P1 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
      <Field />
      <RotCol>
        <Lab size={10} color={A.foe}>Opponent 상대 타순</Lab>
        <div style={{ display: 'grid', gap: 3, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {FOE_LINEUP.map(([p, n, v], i) => <Row key={i} pos={p} name={n} v={v} a={A.foe} h={23} />)}
        </div>
      </RotCol>
    </div>
    <Tune />
  </>
);
/* 2 · 맞대결 비교를 세로로 */
const P2 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
      <Field />
      <RotCol>
        <Lab size={10} color={A.warn}>Head to Head 맞대결</Lab>
        <Panel pad={9} a={A.warn} style={{ flex: 1, gap: 11, justifyContent: 'center' }}>
          <Bar ko="타자" mine={694} foe={641} a={A.bat} />
          <Bar ko="수비" mine={730} foe={688} a={A.def} />
          <Bar ko="투수" mine={365} foe={402} a={A.pit} />
          <Bar ko="종합" mine={75} foe={80} a={A.warn} />
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#8b97a6' }}>
            <span>우리</span><b style={{ color: A.foe }}>상대 우세 2</b>
          </span>
        </Panel>
      </RotCol>
    </div>
    <Tune />
  </>
);
/* 3 · 최근 전적과 이 상대 전적 */
const P3 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
      <Field />
      <RotCol>
        <Lab size={10} color={A.def}>Record 전적</Lab>
        <Panel pad={9} a={A.def} style={{ flex: 1, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <b style={{ fontFamily: disp, fontSize: 24, fontWeight: 800, color: '#fff' }}>12<span style={{ fontSize: 13, color: '#55606f' }}>승</span> 7<span style={{ fontSize: 13, color: '#55606f' }}>패</span></b>
            <small style={{ marginLeft: 'auto', fontSize: 10, color: '#8b97a6' }}>승률 .632</small>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['승', '승', '패', '승', '승'].map((r, i) => (
              <span key={i} style={{ flex: 1, height: 26, display: 'grid', placeItems: 'center', clipPath: cut(4),
                background: mix(r === '승' ? A.bat : A.pit, 20), boxShadow: `inset 0 0 0 1px ${mix(r === '승' ? A.bat : A.pit, 50)}`,
                fontSize: 11, fontWeight: 700, color: r === '승' ? A.bat : A.pit }}>{r}</span>
            ))}
          </div>
          <span style={{ height: 1, background: 'rgba(255,255,255,.08)' }} />
          <Lab size={9} color={A.foe}>vs KT 위즈</Lab>
          <div style={{ display: 'grid', gap: 3 }}>
            {[['3 : 5', '패'], ['7 : 2', '승'], ['4 : 4', '무']].map(([s, r], i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 22, padding: '0 8px', clipPath: cut(4),
                background: 'rgba(255,255,255,.035)' }}>
                <b style={{ fontFamily: disp, fontSize: 12, color: '#e8ecf2' }}>{s}</b>
                <b style={{ marginLeft: 'auto', fontSize: 10, color: r === '승' ? A.bat : r === '패' ? A.pit : '#8b97a6' }}>{r}</b>
              </span>
            ))}
          </div>
        </Panel>
      </RotCol>
    </div>
    <Tune />
  </>
);
/* 4 · 시너지를 기둥으로 올린다 (아래 줄은 타순만) */
const P4 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
      <Field />
      <RotCol>
        <Lab size={10} color={A.warn}>Synergy 시너지 3/21</Lab>
        <div style={{ display: 'grid', gap: 4, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {[['프리미어 12', '4/5', 1], ['용병 트리오', '2/3', 1], ['프랜차이즈', '6/7', 1], ['메이저 9', '2/9', 0], ['국민 테이블', '1/2', 0]].map(([n, c, on], i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 9px', clipPath: cut(5),
              background: on ? mix(A.warn, 13) : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${mix(A.warn, on ? 38 : 12)}` }}>
              <b style={{ fontSize: 11.5, color: on ? '#e8ecf2' : '#55606f' }}>{n}</b>
              <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 12, color: on ? A.warn : '#55606f' }}>{c}</b>
            </span>
          ))}
          <span style={{ display: 'flex', gap: 5, marginTop: 2 }}>
            {[['타격', '+4'], ['투구', '+4'], ['수비', '+2']].map(([k, v]) => (
              <span key={k} style={{ flex: 1, display: 'grid', justifyItems: 'center', gap: 1, padding: '5px 0', clipPath: cut(4),
                background: mix(A.warn, 10) }}>
                <small style={{ fontSize: 9, color: '#8b97a6' }}>{k}</small>
                <b style={{ fontFamily: disp, fontSize: 13, color: A.warn }}>{v}</b>
              </span>
            ))}
          </span>
        </div>
      </RotCol>
    </div>
    <Tune />
  </>
);
/* 5 · 구장을 키우고 투수진을 아래로 눕힌다 */
const P5 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <Field tall />
      <Panel pad={8} a={A.pit} style={{ height: 116, gap: 5 }}>
        <Lab size={10} color={A.pit}>Rotation · Bullpen · Bench</Lab>
        <div style={{ display: 'flex', gap: 5, flex: 1 }}>
          {[...ROT, ['BN', '김재호', 72], ['BN', '이종운', 71], ['BN', '김재환', 68]].map(([p, n, v], i) => (
            <span key={i} style={{ flex: 1, position: 'relative', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 2,
              background: 'rgba(255,255,255,.04)', clipPath: cut(5), boxShadow: `inset 0 2px 0 ${i > 7 ? A.gray : A.pit}` }}>
              <small style={{ fontFamily: disp, fontSize: 9, color: i > 7 ? A.gray : A.pit }}>{p}</small>
              <b style={{ fontSize: 11, color: '#e8ecf2' }}>{n}</b>
              <b style={{ fontFamily: disp, fontSize: 13, fontWeight: 800, color: '#e8ecf2' }}>{v}</b>
            </span>
          ))}
        </div>
      </Panel>
    </div>
    <Tune />
  </>
);
/* 6 · 고른 선수의 카드를 오른쪽에 (라커 상세 판 그대로) */
const P6 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
      <Field />
      <RotCol>
        <Lab size={10} color={A.bat}>Player 고른 선수</Lab>
        <Panel pad={8} a={A.bat} style={{ flex: 1, gap: 6 }}>
          <div style={{ flex: 1, minHeight: 0, background: 'linear-gradient(180deg,#14243c,#05080f)', clipPath: cut(10),
            display: 'grid', alignContent: 'end', padding: 9, gap: 2 }}>
            <small style={{ fontFamily: disp, fontSize: 9, letterSpacing: '.16em', color: A.bat }}>CENTER FIELDER</small>
            <b style={{ fontSize: 19, color: '#fff' }}>최원준</b>
            <small style={{ fontSize: 10, color: '#8b97a6' }}>2026 두산 · 좌투좌타</small>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
            {[['AVG', '.311'], ['HR', '12'], ['SB', '35'], ['RBI', '64']].map(([k, v]) => (
              <span key={k} style={{ display: 'grid', justifyItems: 'center', gap: 1, padding: '4px 0', background: 'rgba(255,255,255,.04)', clipPath: cut(4) }}>
                <small style={{ fontFamily: disp, fontSize: 8.5, color: '#7d8a9c' }}>{k}</small>
                <b style={{ fontFamily: disp, fontSize: 12, color: '#e8ecf2' }}>{v}</b>
              </span>
            ))}
          </div>
        </Panel>
      </RotCol>
    </div>
    <Tune />
  </>
);
/* 7 · 경기 예보 — 예상 점수와 승률 */
const P7 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
      <Field />
      <RotCol>
        <Lab size={10} color={A.warn}>Forecast 경기 예보</Lab>
        <Panel pad={10} a={A.warn} style={{ flex: 1, gap: 9, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <b style={{ fontFamily: disp, fontSize: 30, fontWeight: 800, color: A.bat }}>4</b>
            <small style={{ fontSize: 11, color: '#55606f' }}>예상</small>
            <b style={{ fontFamily: disp, fontSize: 30, fontWeight: 800, color: A.foe }}>5</b>
          </div>
          <div style={{ display: 'grid', gap: 3 }}>
            <div style={{ display: 'flex', fontSize: 10.5 }}>
              <b style={{ fontFamily: disp, fontSize: 13, color: A.bat }}>43%</b>
              <span style={{ margin: '0 auto', color: '#8b97a6' }}>승률</span>
              <b style={{ fontFamily: disp, fontSize: 13, color: A.foe }}>57%</b>
            </div>
            <div style={{ display: 'flex', height: 7 }}>
              <i style={{ width: '43%', background: A.bat }} /><i style={{ flex: 1, background: mix(A.foe, 65) }} />
            </div>
          </div>
          <span style={{ height: 1, background: 'rgba(255,255,255,.08)' }} />
          <Lab size={9} color={A.def}>Key Player</Lab>
          <div style={{ display: 'grid', gap: 3 }}>
            <Row pos="CF" name="최원준" sub="주루 90" v="+1.2" a={A.bat} h={24} />
            <Row pos="SP" name="보설리" sub="상대 선발" v="−1.6" a={A.foe} h={24} />
          </div>
        </Panel>
      </RotCol>
    </div>
    <Tune />
  </>
);
/* 8 · 작전을 기둥으로 옮기고 TUNE UP 은 수치만 */
const P8 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
      <Field />
      <RotCol>
        <Lab size={10} color={A.warn}>Play Style 작전</Lab>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {['빅볼', '스몰볼', '발야구', '출루', '마운드', '총력전', '실점 최소', '균형'].map((s, i) => (
            <span key={s} style={{ display: 'grid', alignContent: 'center', gap: 1, padding: '0 9px', clipPath: cut(5),
              background: i === 7 ? mix(A.main, 22) : 'rgba(255,255,255,.04)',
              boxShadow: `inset 0 0 0 1px ${i === 7 ? A.main : 'rgba(255,255,255,.08)'}` }}>
              <b style={{ fontSize: 12, color: i === 7 ? '#fff' : '#cbd5e1' }}>{s}</b>
              <small style={{ fontSize: 9, color: '#7d8a9c' }}>{['장타 위주', '번트와 작전', '도루와 주루', '공을 많이 본다', '선발을 길게', '불펜 총동원', '시프트와 유인구', '무리 없이'][i]}</small>
            </span>
          ))}
        </div>
      </RotCol>
    </div>
    <Tune styles={0} extra={
      <div style={{ display: 'grid', gap: 5, flex: 1, minHeight: 0 }}>
        <Lab size={10} color={A.def}>Rest 휴식</Lab>
        {[['선발', '준비됨'], ['불펜1', '준비됨'], ['불펜2', '−1']].map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', height: 30, padding: '0 10px', clipPath: cut(5), background: 'rgba(255,255,255,.04)' }}>
            <b style={{ fontSize: 11.5, color: '#cbd5e1' }}>{k}</b>
            <b style={{ marginLeft: 'auto', fontSize: 11.5, color: v === '준비됨' ? A.bat : A.warn }}>{v}</b>
          </span>
        ))}
      </div>
    } />
  </>
);

/* 지금 화면 (견주기용) */
const P0 = () => (
  <>
    <Scout />
    <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
      <Field />
      <RotCol><Hole /></RotCol>
    </div>
    <Tune />
  </>
);

const PLANS = [
  ['지금', '벤치 아래 기둥이 비어 있음', P0],
  ['1 · 상대 타순', '⛔ 왼쪽 스카우팅이 이미 상대 타순 — 겹쳐서 버린 안', P1],
  ['2 · 맞대결', '타자 · 수비 · 투수 · 종합을 좌우 막대로 견주기', P2],
  ['3 · 전적', '최근 다섯 경기와 이 상대와의 지난 결과', P3],
  ['4 · 시너지', '아래 작은 줄을 기둥으로 올려 조건과 보탬까지', P4],
  ['5 · 구장 확대', '구장을 세로로 키우고 투수진 · 벤치를 아래 한 줄로', P5],
  ['6 · 선수 카드', '고른 선수의 카드와 시즌 기록 (라커 상세 판 그대로)', P6],
  ['7 · 경기 예보', '예상 점수 · 승률 · 승부를 가를 선수', P7],
  ['8 · 작전 이동', '작전 여덟을 기둥으로 옮기고 TUNE UP 은 수치 · 휴식만', P8],
];

/* ───────── 한 안을 화면 크기로 그린다 ───────── */
const Screen = ({ Body }) => (
  <div style={{ width: W, height: H, background: 'linear-gradient(180deg,#070b12,#0a0e15)', display: 'flex', flexDirection: 'column',
    fontFamily: "'IBM Plex Sans KR',sans-serif", color: '#e8ecf2', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 56, padding: '0 22px', flexShrink: 0 }}>
      <span style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', clipPath: cut(7),
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)', color: '#8b97a6' }}>←</span>
      <span>
        <Lab size={9} color="#7d8a9c">Single Game</Lab>
        <b style={{ fontSize: 17, color: '#fff' }}>단판 경기 전 정비</b>
      </span>
    </div>
    <div style={{ flex: 1, display: 'flex', gap: 10, padding: '0 22px 8px', minHeight: 0 }}><Body /></div>
    <div style={{ padding: '0 22px 14px' }}><Order /></div>
  </div>
);

function App() {
  const [only, setOnly] = useState(null);
  const list = only == null ? PLANS : [PLANS[only]];
  return (
    <div style={{ padding: 20, fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <b style={{ fontSize: 19, color: '#fff' }}>정비 화면 여백 8안</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>1920 × 911 · 이름을 누르면 그 안만 크게</small>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {PLANS.map(([t], i) => (
            <button key={t} onClick={() => setOnly(only === i ? null : i)} style={{ padding: '4px 9px', border: 0, cursor: 'pointer', clipPath: cut(4),
              background: only === i ? A.main : 'rgba(255,255,255,.06)', color: only === i ? '#05080f' : '#cbd5e1', fontSize: 11, fontWeight: 700 }}>{t}</button>
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
                <div style={{ transform: `scale(${s})`, transformOrigin: '0 0' }}><Screen Body={Body} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
