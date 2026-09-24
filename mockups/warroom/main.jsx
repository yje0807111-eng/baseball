/*
 * 오른쪽 판을 TUNE UP 에서 전략실(WAR ROOM)로 — 8안 (개발 서버: /mockups/warroom/)
 * 공통: 위 수치 총합(타자·수비·투수)과 아래 투수 휴식은 뺐다. 판 크기는 지금 그대로 384 × 823.
 * 담는 것: 지금 있던 플레이스타일 여덟 + 안마다 다른 전략 요소.
 *
 * 밑자료 — OOTP 의 대립 축 슬라이더(피해 가기 · 주자 묶기 · 내야 전진 · 라인 지키기 · 시프트)와
 * 상황(이닝 × 점수차)별 지시, MLB The Show 의 경기 전 스카우팅 리포트와 추천 전략,
 * 컴투스 프로야구 for 매니저의 개인별 작전 설정, 그리고 실제 야구의 번트 · 도루 · 불펜 운용.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const PW = 384, PH = 823;
const cut = (c = 10) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const A = { main: '#10b981', bat: '#34d399', def: '#60a5fa', pit: '#f87171', warn: '#fbbf24', foe: '#f472b6', vio: '#a78bfa', gray: '#64748b' };
const mix = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;

/* ───────── 공통 조각 ───────── */
const Lab = ({ children, color = A.main, size = 10.5 }) => (
  <p style={{ margin: 0, fontFamily: disp, fontSize: size, fontWeight: 700, letterSpacing: '.28em', color, textTransform: 'uppercase' }}>{children}</p>
);
const Head = ({ en, ko, color = A.main }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexShrink: 0 }}>
    <Lab color={color} size={10}>{en}</Lab>
    <b style={{ fontSize: 12.5, color: '#e8ecf2' }}>{ko}</b>
    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
  </div>
);
const Chip = ({ children, color = A.gray, on }) => (
  <span style={{ padding: '2px 7px', clipPath: cut(3), background: mix(color, on ? 26 : 9),
    boxShadow: `inset 0 0 0 1px ${mix(color, on ? 60 : 22)}`, fontSize: 10, fontWeight: 700, color: on ? '#fff' : color, whiteSpace: 'nowrap' }}>{children}</span>
);
const Start = () => (
  <button style={{ height: 44, border: 0, background: A.main, clipPath: cut(10), fontSize: 15, fontWeight: 800, color: '#05080f', cursor: 'pointer', flexShrink: 0 }}>
    경기 시작 ▶
  </button>
);
/* 대립 축 슬라이더 (OOTP 문법) */
const Axis = ({ l, r, v, color = A.main }) => (
  <div style={{ display: 'grid', gap: 3 }}>
    <div style={{ display: 'flex', fontSize: 10.5, color: '#8b97a6' }}>
      <span style={{ color: v < 40 ? color : '#8b97a6' }}>{l}</span>
      <span style={{ marginLeft: 'auto', color: v > 60 ? color : '#8b97a6' }}>{r}</span>
    </div>
    <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,.07)' }}>
      <i style={{ position: 'absolute', inset: 0, left: '50%', width: 1, background: 'rgba(255,255,255,.18)' }} />
      <i style={{ position: 'absolute', top: -3, left: `calc(${v}% - 5px)`, width: 10, height: 12, background: color, clipPath: cut(3) }} />
    </div>
  </div>
);
const STYLES = [
  ['빅볼', '장타 위주', A.bat], ['스몰볼', '번트와 작전', A.warn], ['발야구', '도루와 주루', '#fb923c'], ['출루', '공을 많이 본다', '#a3e635'],
  ['마운드', '선발을 길게', A.pit], ['총력전', '불펜 총동원', A.vio], ['실점 최소', '시프트와 유인구', A.def], ['균형', '무리 없이', A.main],
];
/* 지금 판에 있던 플레이스타일 여덟 — 안마다 크기만 다르다 */
const Styles = ({ cols = 1, h = 34, pick = 7, tip = true }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 4, minHeight: 0 }}>
    {STYLES.map(([ko, t, c], i) => (
      <span key={ko} style={{ display: 'flex', alignItems: 'center', gap: 6, height: h, padding: '0 9px', clipPath: cut(5),
        background: i === pick ? mix(c, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${i === pick ? c : 'rgba(255,255,255,.08)'}` }}>
        <b style={{ fontSize: 12, color: i === pick ? '#fff' : '#cbd5e1' }}>{ko}</b>
        {tip && <small style={{ marginLeft: 'auto', fontSize: 10, color: '#8b97a6', whiteSpace: 'nowrap' }}>{t}</small>}
      </span>
    ))}
  </div>
);
const Panel = ({ children }) => (
  <div style={{ width: PW, height: PH, display: 'flex', flexDirection: 'column', gap: 8, padding: 14,
    background: 'rgba(6,10,19,.85)', clipPath: cut(18), boxShadow: `inset 0 0 0 1px ${mix(A.main, 30)}`,
    fontFamily: "'IBM Plex Sans KR',sans-serif", color: '#e8ecf2', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', flexShrink: 0 }}>
      <Lab size={11}>War Room</Lab>
      <small style={{ marginLeft: 'auto', fontSize: 10, color: '#7d8a9c' }}>팀 종합</small>
      <b style={{ marginLeft: 5, fontFamily: disp, fontSize: 22, fontWeight: 800, color: A.warn }}>75</b>
    </div>
    {children}
  </div>
);

/* ───────── 안 여덟 ───────── */
/* 1 · 세 갈래 — 공격 · 마운드 · 수비에서 하나씩 */
const W1 = () => (
  <Panel>
    <Head en="Offense" ko="공격" color={A.bat} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
      {[['빅볼', '장타 위주', 1], ['스몰볼', '번트와 작전', 0], ['발야구', '도루와 주루', 0], ['출루', '공을 많이 본다', 0]].map(([ko, t, on]) => (
        <span key={ko} style={{ display: 'grid', alignContent: 'center', gap: 1, height: 44, padding: '0 9px', clipPath: cut(5),
          background: on ? mix(A.bat, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? A.bat : 'rgba(255,255,255,.08)'}` }}>
          <b style={{ fontSize: 12.5, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
          <small style={{ fontSize: 9.5, color: '#8b97a6' }}>{t}</small>
        </span>
      ))}
    </div>
    <Head en="Mound" ko="마운드" color={A.pit} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
      {[['선발 완주', '7회까지 맡긴다', 0], ['빠른 교체', '위기면 바로', 1], ['총력전', '불펜 총동원', 0], ['마무리 대기', '리드 지키기', 0]].map(([ko, t, on]) => (
        <span key={ko} style={{ display: 'grid', alignContent: 'center', gap: 1, height: 44, padding: '0 9px', clipPath: cut(5),
          background: on ? mix(A.pit, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? A.pit : 'rgba(255,255,255,.08)'}` }}>
          <b style={{ fontSize: 12.5, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
          <small style={{ fontSize: 9.5, color: '#8b97a6' }}>{t}</small>
        </span>
      ))}
    </div>
    <Head en="Defense" ko="수비" color={A.def} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
      {[['정석 수비', '제자리', 1], ['시프트', '당겨치기 대비', 0], ['내야 전진', '홈 승부', 0], ['라인 지킴', '장타 방지', 0]].map(([ko, t, on]) => (
        <span key={ko} style={{ display: 'grid', alignContent: 'center', gap: 1, height: 44, padding: '0 9px', clipPath: cut(5),
          background: on ? mix(A.def, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? A.def : 'rgba(255,255,255,.08)'}` }}>
          <b style={{ fontSize: 12.5, color: on ? '#fff' : '#cbd5e1' }}>{ko}</b>
          <small style={{ fontSize: 9.5, color: '#8b97a6' }}>{t}</small>
        </span>
      ))}
    </div>
    <div style={{ marginTop: 'auto', display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <Chip color={A.bat} on>빅볼</Chip><Chip color={A.pit} on>빠른 교체</Chip><Chip color={A.def} on>정석 수비</Chip>
      </div>
      <Start />
    </div>
  </Panel>
);
/* 2 · 성향 눈금 — OOTP 대립 축 */
const W2 = () => (
  <Panel>
    <Head en="Tendency" ko="성향" color={A.warn} />
    <div style={{ display: 'grid', gap: 11 }}>
      <Axis l="기다린다" r="초구부터" v={68} color={A.bat} />
      <Axis l="번트 없음" r="번트 많이" v={30} color={A.warn} />
      <Axis l="주자 묶기" r="뛴다" v={74} color="#fb923c" />
      <Axis l="피해 간다" r="정면 승부" v={62} color={A.pit} />
      <Axis l="선발 길게" r="빨리 내린다" v={40} color={A.vio} />
      <Axis l="정석 수비" r="시프트" v={55} color={A.def} />
      <Axis l="라인 지킴" r="내야 전진" v={35} color="#7dd3fc" />
    </div>
    <Head en="Preset" ko="저장된 성향" color={A.gray} />
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      <Chip color={A.main} on>공격형</Chip><Chip color={A.def}>지키기</Chip><Chip color={A.vio}>한 방</Chip><Chip color={A.gray}>+ 새로 저장</Chip>
    </div>
    <div style={{ marginTop: 'auto', display: 'grid', gap: 6 }}>
      <small style={{ fontSize: 10.5, color: '#7d8a9c' }}>일곱 눈금이 경기 중 자동 판단에 그대로 쓰인다</small>
      <Start />
    </div>
  </Panel>
);
/* 3 · 상황별 지시 — OOTP 시나리오 격자 */
const W3 = () => {
  const COL = ['3점+ 뒤', '1~2점 뒤', '동점', '1~2점 앞', '3점+ 앞'];
  const ROW = ['1~3회', '4~6회', '7~8회', '9회+'];
  const PLAN = [
    ['밀', '밀', '밀', '균', '균'],
    ['밀', '밀', '균', '균', '지'],
    ['총', '밀', '밀', '지', '지'],
    ['총', '총', '밀', '지', '지'],
  ];
  const C = { 밀: A.bat, 균: A.main, 지: A.def, 총: A.vio };
  return (
    <Panel>
      <Head en="Situation" ko="상황별 지시" color={A.vio} />
      <div style={{ display: 'grid', gridTemplateColumns: '46px repeat(5,1fr)', gap: 3 }}>
        <span />
        {COL.map((c) => <small key={c} style={{ fontSize: 8.5, color: '#7d8a9c', textAlign: 'center', lineHeight: 1.2 }}>{c}</small>)}
        {ROW.map((r, i) => (
          <React.Fragment key={r}>
            <small style={{ fontFamily: disp, fontSize: 10.5, color: '#cbd5e1', alignSelf: 'center' }}>{r}</small>
            {PLAN[i].map((p, j) => (
              <span key={j} style={{ height: 38, display: 'grid', placeItems: 'center', clipPath: cut(4),
                background: mix(C[p], 20), boxShadow: `inset 0 0 0 1px ${mix(C[p], 45)}`, fontSize: 12, fontWeight: 800, color: C[p] }}>{p}</span>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <Chip color={A.bat} on>밀 · 밀어붙임</Chip><Chip color={A.main} on>균 · 균형</Chip><Chip color={A.def} on>지 · 지킨다</Chip><Chip color={A.vio} on>총 · 총력</Chip>
      </div>
      <Head en="Play Style" ko="기본 작전" />
      <Styles cols={2} h={30} tip={false} />
      <div style={{ marginTop: 'auto', display: 'grid', gap: 6 }}>
        <small style={{ fontSize: 10.5, color: '#7d8a9c' }}>칸을 누르면 그 상황에서 할 일이 바뀐다</small>
        <Start />
      </div>
    </Panel>
  );
};
/* 4 · 상대 맞춤 — 스카우팅 리포트에 대응 카드를 붙인다 */
const W4 = () => (
  <Panel>
    <Head en="Scout" ko="상대 약점" color={A.foe} />
    <div style={{ display: 'grid', gap: 5 }}>
      {[['좌완에 약함', '상대 타선 좌투 피안타 .221', '좌완 선발', A.bat],
        ['불펜 얇음', '7회 이후 실점 1위', '후반 집중', A.warn],
        ['도루 저지 낮음', '저지율 21%', '발야구', '#fb923c'],
        ['장타 위험', '팀 홈런 2위', '외야 깊게', A.pit]].map(([t, why, ans, c]) => (
        <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', clipPath: cut(5),
          background: 'rgba(255,255,255,.04)', boxShadow: `inset 3px 0 0 ${c}` }}>
          <span style={{ minWidth: 0, flex: 1 }}>
            <b style={{ display: 'block', fontSize: 12, color: '#e8ecf2' }}>{t}</b>
            <small style={{ fontSize: 9.5, color: '#7d8a9c' }}>{why}</small>
          </span>
          <Chip color={c} on>{ans}</Chip>
        </span>
      ))}
    </div>
    <Head en="Counter" ko="맞불" color={A.main} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
      {[['좌완 선발', 1], ['발야구', 1], ['외야 깊게', 0], ['후반 집중', 0]].map(([ko, on]) => (
        <span key={ko} style={{ display: 'grid', placeItems: 'center', height: 38, clipPath: cut(5),
          background: on ? mix(A.main, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? A.main : 'rgba(255,255,255,.08)'}`,
          fontSize: 12, fontWeight: 700, color: on ? '#fff' : '#8b97a6' }}>{ko}</span>
      ))}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', clipPath: cut(5), background: mix(A.warn, 12) }}>
      <b style={{ fontSize: 11, color: A.warn }}>맞불 2 / 4</b>
      <small style={{ marginLeft: 'auto', fontSize: 10.5, color: '#cbd5e1' }}>고른 만큼 상대 강점이 깎인다</small>
    </div>
    <Head en="Play Style" ko="기본 작전" />
    <Styles cols={2} h={30} tip={false} />
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);
/* 5 · 선수별 지시 — 컴프야 개인 작전 */
const W5 = () => {
  const LINE = [['1', '최원준', '뛰어라', '#fb923c'], ['2', '럴리어드', '기다려', '#a3e635'], ['3', '안현민', '강공', A.bat], ['4', '허경민', '강공', A.bat],
    ['5', '김민혁', '강공', A.bat], ['6', '권동진', '번트', A.warn], ['7', '김상수', '뛰어라', '#fb923c'], ['8', '김현수', '기다려', '#a3e635'], ['9', '장성우', '맡김', A.gray]];
  return (
    <Panel>
      <Head en="Orders" ko="선수별 지시" color={A.bat} />
      <div style={{ display: 'grid', gap: 3, minHeight: 0, overflow: 'hidden' }}>
        {LINE.map(([n, nm, act, c]) => (
          <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 9px', clipPath: cut(4),
            background: 'rgba(255,255,255,.035)' }}>
            <b style={{ fontFamily: disp, fontSize: 11, color: '#7d8a9c', width: 12 }}>{n}</b>
            <b style={{ fontSize: 12, color: '#e8ecf2' }}>{nm}</b>
            <span style={{ marginLeft: 'auto' }}><Chip color={c} on>{act}</Chip></span>
          </span>
        ))}
      </div>
      <Head en="Preset" ko="한꺼번에" color={A.gray} />
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <Chip color={A.bat}>전원 강공</Chip><Chip color={A.warn}>하위 번트</Chip><Chip color="#fb923c">발 빠른 선수 도루</Chip><Chip color={A.gray} on>감독에게 맡김</Chip>
      </div>
      <Head en="Play Style" ko="기본 작전" />
      <Styles cols={2} h={30} tip={false} />
      <div style={{ marginTop: 'auto' }}><Start /></div>
    </Panel>
  );
};
/* 6 · 작전 카드 덱 — 세 장을 골라 경기 중 쓴다 */
const W6 = () => (
  <Panel>
    <Head en="Deck" ko="작전 카드 3장" color={A.vio} />
    <div style={{ display: 'flex', gap: 5 }}>
      {[['기습 번트', '주자 진루', A.warn], ['히트앤런', '병살 회피', A.bat], ['좌완 스페셜', '좌타 봉쇄', A.def]].map(([ko, t, c]) => (
        <span key={ko} style={{ flex: 1, display: 'grid', alignContent: 'end', gap: 2, height: 96, padding: 8, clipPath: cut(7),
          background: `linear-gradient(180deg,${mix(c, 26)},rgba(6,10,19,.9))`, boxShadow: `inset 0 0 0 1px ${mix(c, 55)}` }}>
          <b style={{ fontSize: 11.5, color: '#fff' }}>{ko}</b>
          <small style={{ fontSize: 9, color: '#a8b3c2' }}>{t}</small>
        </span>
      ))}
    </div>
    <Head en="Pool" ko="가진 카드 12" color={A.gray} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, minHeight: 0, overflow: 'hidden' }}>
      {['스퀴즈', '도루 지시', '대타 기용', '투수 교체', '고의사구', '시프트', '내야 전진', '번트 수비', '대주자'].map((k) => (
        <span key={k} style={{ display: 'grid', placeItems: 'center', height: 34, clipPath: cut(4),
          background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)', fontSize: 10.5, color: '#cbd5e1' }}>{k}</span>
      ))}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', clipPath: cut(5), background: mix(A.vio, 12) }}>
      <b style={{ fontSize: 11, color: A.vio }}>경기당 각 1회</b>
      <small style={{ marginLeft: 'auto', fontSize: 10.5, color: '#cbd5e1' }}>때가 되면 쓸지 묻는다</small>
    </div>
    <Head en="Play Style" ko="기본 작전" />
    <Styles cols={2} h={30} tip={false} />
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);
/* 7 · 마운드 운용판 — 선발 · 불펜 · 교체 기준 */
const W7 = () => (
  <Panel>
    <Head en="Starter" ko="선발 운용" color={A.pit} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', clipPath: cut(6), background: 'rgba(255,255,255,.04)' }}>
      <b style={{ fontSize: 13, color: '#e8ecf2' }}>유희관</b>
      <small style={{ fontFamily: disp, fontSize: 10, color: '#7d8a9c' }}>ERA 3.94</small>
      <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 18, fontWeight: 800, color: A.pit }}>79</b>
    </div>
    <div style={{ display: 'grid', gap: 9 }}>
      <Axis l="5회" r="완투" v={52} color={A.pit} />
      <span style={{ display: 'flex', fontSize: 10.5, color: '#8b97a6' }}>목표 이닝<b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 12, color: '#e8ecf2' }}>7회 · 100구</b></span>
    </div>
    <Head en="Hook" ko="내리는 때" color={A.warn} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
      {[['3실점', 1], ['100구', 1], ['위기 몰림', 0], ['타순 세 바퀴', 0]].map(([ko, on]) => (
        <span key={ko} style={{ display: 'grid', placeItems: 'center', height: 34, clipPath: cut(5),
          background: on ? mix(A.warn, 22) : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${on ? A.warn : 'rgba(255,255,255,.08)'}`,
          fontSize: 11.5, fontWeight: 700, color: on ? '#fff' : '#8b97a6' }}>{ko}</span>
      ))}
    </div>
    <Head en="Bullpen" ko="불펜 순서" color={A.vio} />
    <div style={{ display: 'grid', gap: 3 }}>
      {[['1순위', '조규제', 'CL'], ['2순위', '이상군', 'SU'], ['3순위', '김웅동', 'SU'], ['추격조', '안영명 · 진해중', 'MR']].map(([k, nm, tag]) => (
        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 30, padding: '0 9px', clipPath: cut(4), background: 'rgba(255,255,255,.035)' }}>
          <small style={{ fontFamily: disp, fontSize: 9.5, color: A.vio, width: 34 }}>{k}</small>
          <b style={{ fontSize: 11.5, color: '#e8ecf2' }}>{nm}</b>
          <span style={{ marginLeft: 'auto' }}><Chip color={A.pit}>{tag}</Chip></span>
        </span>
      ))}
    </div>
    <Head en="Play Style" ko="기본 작전" />
    <Styles cols={2} h={30} tip={false} />
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);
/* 8 · 감독 회의 — 코치가 권하고 감독이 고른다 */
const W8 = () => (
  <Panel>
    <Head en="Staff" ko="코치 의견" color={A.warn} />
    <div style={{ display: 'grid', gap: 5 }}>
      {[['타격코치', '상대 선발이 좌완 · 우타 위주로 짜자', '우타 선발', A.bat],
        ['투수코치', '불펜이 이틀 쉬었다 · 길게 쓸 수 있다', '총력전', A.pit],
        ['작전코치', '상대 포수 저지율 21% · 뛸 만하다', '발야구', '#fb923c']].map(([who, say, rec, c]) => (
        <span key={who} style={{ display: 'grid', gap: 4, padding: '9px 10px', clipPath: cut(5), background: 'rgba(255,255,255,.04)', boxShadow: `inset 3px 0 0 ${c}` }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <b style={{ fontSize: 11, color: c }}>{who}</b>
            <span style={{ marginLeft: 'auto' }}><Chip color={c} on>{rec}</Chip></span>
          </span>
          <small style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.4 }}>{say}</small>
        </span>
      ))}
    </div>
    <Head en="Decide" ko="감독의 선택" color={A.main} />
    <Styles cols={2} h={34} tip={false} pick={2} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', clipPath: cut(5), background: mix(A.main, 12) }}>
      <b style={{ fontSize: 11, color: A.main }}>코치 말 따름 +2</b>
      <small style={{ marginLeft: 'auto', fontSize: 10.5, color: '#cbd5e1' }}>권한 것과 같으면 능력치가 오른다</small>
    </div>
    <div style={{ marginTop: 'auto' }}><Start /></div>
  </Panel>
);

const PLANS = [
  ['1 · 세 갈래', '공격 · 마운드 · 수비에서 하나씩 — 조합이 곧 전략', W1],
  ['2 · 성향 눈금', 'OOTP 식 대립 축 일곱 · 저장해 두고 꺼내 쓴다', W2],
  ['3 · 상황별 지시', '이닝 × 점수차 칸마다 할 일 — 밀 · 균 · 지 · 총', W3],
  ['4 · 상대 맞춤', '스카우팅으로 뜬 약점에 맞불 카드를 붙인다', W4],
  ['5 · 선수별 지시', '타순 아홉에 각각 강공 · 번트 · 도루 · 기다림', W5],
  ['6 · 작전 카드', '가진 카드에서 셋을 골라 경기 중 한 번씩', W6],
  ['7 · 마운드 운용', '목표 이닝 · 내리는 때 · 불펜 순서', W7],
  ['8 · 감독 회의', '코치 셋이 권하고 감독이 고른다 · 따르면 보너스', W8],
];

function App() {
  const [only, setOnly] = useState(null);
  const list = only == null ? PLANS : [PLANS[only]];
  return (
    <div style={{ padding: 20, fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <b style={{ fontSize: 19, color: '#fff' }}>전략실 8안</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>384 × 823 · 수치 총합과 투수 휴식은 뺐다 · 이름을 누르면 그것만</small>
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
