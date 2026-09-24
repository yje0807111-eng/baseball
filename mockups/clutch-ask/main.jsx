/*
 * 승부처 팝업 16안 (개발 서버: /mockups/clutch-ask/)
 * 상황은 모두 같다 — 8회초 1사 2·3루, 우리가 4:3 한 점 앞섬, 상대 4번 최정 타석.
 * 담는 것: 미니맵(주자 · 수비) · 타자와 투수 · 상대 투수 상태(투구 수 · 체력) · 남은 지시 · 선택지 셋.
 * 기존 문법 그대로 — 잘린 모서리(ui-cut) · 네온 테두리(ui-frame) · Saira 영문 라벨 · 유리판.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const cut = (c = 10) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const A = { foe: '#f87171', my: '#34d399', warn: '#fbbf24', def: '#60a5fa', vio: '#a78bfa', gray: '#64748b' };
const mix = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;
const SIL = 'url(ui/mt/silhouette-player.webp)';

/* 이 자리의 상황 */
const S = {
  head: '8회초 1사 2 · 3루', lead: '1점 앞선다', score: [3, 4], left: 2, weight: 0.42,
  bases: [0, 1, 1],
  batter: { nm: '최정', pos: '3B', ovr: 89, today: '2타수 1안타', power: 92, contact: 81, speed: 64 },
  pitcher: { nm: '이길환', pos: 'SP', ovr: 82, pitch: 96, hp: 34, era: 3.61, today: '7이닝 3실점', stuff: 78, control: 84 },
  pen: [['조규제', 'CL', 84, 100], ['이상군', 'SU', 79, 100], ['김웅동', 'SU', 77, 86]],
  opts: [
    { ko: '정면 승부', tip: '피하지 않고 붙는다', risk: '장타 위험', odds: 48, c: A.foe },
    { ko: '거른다', tip: '만루로 채우고 5번과', risk: '밀어내기', odds: 55, c: A.def },
    { ko: '투수 교체', tip: '조규제를 올린다', risk: '불펜 소모', odds: 61, c: A.vio },
  ],
};

/* ───────── 조각 ───────── */
const Lab = ({ children, c = A.gray, size = 10 }) => (
  <p style={{ margin: 0, fontFamily: disp, fontSize: size, fontWeight: 700, letterSpacing: '.26em', color: c, textTransform: 'uppercase' }}>{children}</p>
);
/* 네온 테두리 판 (ui-frame 문법) */
const Frame = ({ children, a = A.foe, w = 820, pad = 26, style }) => (
  <div style={{ position: 'relative', width: w, padding: pad, clipPath: cut(20), background: 'rgba(6,10,19,.9)',
    boxShadow: `inset 0 0 0 1px ${mix(a, 34)}, 0 24px 60px -20px #000`, backdropFilter: 'blur(10px)', ...style }}>
    <i style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `
      linear-gradient(135deg,transparent calc(50% - 1px),${a} calc(50% - 1px),${a} calc(50% + 1px),transparent calc(50% + 1px)) left top/20px 20px no-repeat,
      linear-gradient(135deg,transparent calc(50% - 1px),${a} calc(50% - 1px),${a} calc(50% + 1px),transparent calc(50% + 1px)) right bottom/20px 20px no-repeat,
      linear-gradient(${a},${a}) left 20px top 0/64px 2px no-repeat,
      linear-gradient(${a},${a}) right 20px bottom 0/64px 2px no-repeat` }} />
    {children}
  </div>
);
/* 주자 다이아몬드 */
const Dia = ({ size = 74, bases = S.bases, c = A.warn }) => {
  const b = size * 0.24;
  const at = [[size - b, size / 2 - b / 2], [size / 2 - b / 2, 0], [0, size / 2 - b / 2]];
  return (
    <span style={{ position: 'relative', width: size, height: size * 0.9, flexShrink: 0 }}>
      <i style={{ position: 'absolute', inset: `0 0 ${size * 0.1}px 0`, transform: 'rotate(45deg) scale(.7)',
        boxShadow: `inset 0 0 0 1px ${mix('#fff', 16)}` }} />
      {at.map((p, i) => (
        <i key={i} style={{ position: 'absolute', left: p[0], top: p[1], width: b, height: b, transform: 'rotate(45deg)',
          background: bases[i] ? c : 'transparent', boxShadow: `inset 0 0 0 1px ${bases[i] ? c : mix('#fff', 28)}` }} />
      ))}
      <i style={{ position: 'absolute', left: size / 2 - b / 2, top: size - b - size * 0.1, width: b, height: b,
        transform: 'rotate(45deg)', boxShadow: `inset 0 0 0 1px ${mix('#fff', 28)}` }} />
    </span>
  );
};
/* 구장 미니맵 — 수비 아홉과 주자 */
const Map = ({ w = 220, showDef = true }) => {
  const h = w * 0.86;
  const POS = { P: [50, 58], C: [50, 88], '1B': [72, 52], '2B': [61, 38], SS: [39, 38], '3B': [28, 52], LF: [20, 24], CF: [50, 13], RF: [80, 24] };
  return (
    <span style={{ position: 'relative', width: w, height: h, flexShrink: 0, clipPath: cut(10), overflow: 'hidden',
      background: 'radial-gradient(120% 90% at 50% 100%,#12341f,#0a1a12 62%,#070d14)' }}>
      <i style={{ position: 'absolute', left: '50%', bottom: '6%', width: w * 0.56, height: w * 0.56, transform: 'translateX(-50%) rotate(45deg)',
        boxShadow: `inset 0 0 0 1px ${mix('#fff', 14)}`, background: mix('#c8a06a', 10) }} />
      {showDef && Object.entries(POS).map(([k, [x, y]]) => (
        <i key={k} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 7, height: 7, transform: 'translate(-50%,-50%)',
          background: mix(A.def, 70), clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)' }} />
      ))}
      {[[72, 52], [61, 38], [28, 52]].map(([x, y], i) => S.bases[i] && (
        <i key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 11, height: 11, transform: 'translate(-50%,-50%)',
          background: A.warn, boxShadow: `0 0 12px ${A.warn}`, borderRadius: '50%' }} />
      ))}
      <i style={{ position: 'absolute', left: '50%', top: '88%', width: 9, height: 9, transform: 'translate(-50%,-50%) rotate(45deg)', background: '#fff' }} />
    </span>
  );
};
/* 선수 한 명 */
const Who = ({ p, ko, c, big = false, sub }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: big ? 12 : 9 }}>
    <span style={{ width: big ? 52 : 40, height: big ? 64 : 50, flexShrink: 0, clipPath: cut(5), backgroundImage: SIL,
      backgroundSize: 'cover', backgroundPosition: 'center 12%', boxShadow: `inset 0 0 0 1px ${mix(c, 45)}` }} />
    <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <small style={{ fontSize: 10, color: '#7d8a9c' }}>{ko}</small>
      <b style={{ fontSize: big ? 19 : 15, color: '#fff' }}>{p.nm}</b>
      {sub && <small style={{ fontSize: 10.5, color: '#93a1b1' }}>{sub}</small>}
    </span>
    <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: big ? 30 : 22, fontWeight: 800, color: c }}>{p.ovr}</b>
  </span>
);
/* 투수 체력 */
const Hp = ({ hp = S.pitcher.hp, pitch = S.pitcher.pitch, w = '100%' }) => (
  <span style={{ display: 'grid', gap: 5, width: w }}>
    <span style={{ display: 'flex', alignItems: 'baseline', fontSize: 10.5, color: '#93a1b1' }}>
      <span>투구 {pitch}구</span>
      <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 12, color: hp > 60 ? A.my : hp > 35 ? A.warn : A.foe }}>체력 {hp}%</b>
    </span>
    <span style={{ display: 'flex', height: 6, background: 'rgba(255,255,255,.08)' }}>
      <i style={{ width: `${hp}%`, background: hp > 60 ? A.my : hp > 35 ? A.warn : A.foe }} />
    </span>
  </span>
);
/* 선택지 */
const Opt = ({ o, tall = false, odds = false, wide = false }) => (
  <span style={{ flex: wide ? 1 : 'none', display: 'grid', alignContent: 'center', gap: 4, padding: tall ? '16px 16px' : '12px 14px',
    clipPath: cut(8), background: 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${mix(o.c, 30)}`, cursor: 'pointer' }}>
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
      <b style={{ fontSize: tall ? 19 : 15.5, fontWeight: 800, color: '#fff' }}>{o.ko}</b>
      {odds && <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 15, color: o.c }}>{o.odds}%</b>}
    </span>
    <small style={{ fontSize: 11, color: '#93a1b1' }}>{o.tip}</small>
    {tall && <small style={{ fontSize: 10, color: o.c }}>{o.risk}</small>}
  </span>
);
/* 머리 — 승부처 · 남은 지시 */
const Top = ({ a = A.foe, size = 11 }) => (
  <span style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
    <Lab c={a} size={size}>Crisis</Lab>
    <b style={{ fontSize: 13, color: '#cbd5e1' }}>막아야 한다</b>
    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <small style={{ fontSize: 10.5, color: '#7d8a9c' }}>남은 지시</small>
      <b style={{ fontFamily: disp, fontSize: 18, fontWeight: 800, color: a }}>{S.left}</b>
    </span>
  </span>
);
const Head = ({ size = 34 }) => (
  <span style={{ display: 'grid', gap: 3 }}>
    <b style={{ fontSize: size, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{S.head}</b>
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
      <b style={{ fontFamily: disp, fontSize: 21, fontWeight: 800, color: '#cbd5e1' }}>{S.score[0]} : {S.score[1]}</b>
      <small style={{ fontSize: 12, color: '#93a1b1' }}>{S.lead}</small>
    </span>
  </span>
);
const Row3 = ({ odds = false, tall = false }) => (
  <span style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
    {S.opts.map((o) => <Opt key={o.ko} o={o} odds={odds} tall={tall} />)}
  </span>
);

/* ───────── 16안 ───────── */
const P = [];
/* 1 · 가로 띠 — 지금 것을 다듬은 꼴 */
P.push(['1 · 가로 띠', '지금 판을 다듬고 주자 다이아몬드만 얹는다', () => (
  <Frame w={780}>
    <Top />
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14 }}>
      <Head />
      <span style={{ marginLeft: 'auto' }}><Dia /></span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
      <span style={{ padding: '12px 14px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.batter} ko="상대 타자" c={A.foe} sub={S.batter.today} />
      </span>
      <span style={{ display: 'grid', gap: 8, padding: '12px 14px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.pitcher} ko="우리 투수" c={A.my} sub={S.pitcher.today} />
        <Hp />
      </span>
    </div>
    <div style={{ marginTop: 16 }}><Row3 /></div>
  </Frame>
)]);
/* 2 · 좌우 분할 — 왼쪽 미니맵 */
P.push(['2 · 좌우 분할', '왼쪽에 구장, 오른쪽에 정보와 선택지', () => (
  <Frame w={880}>
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 22 }}>
      <span style={{ display: 'grid', alignContent: 'start', gap: 12 }}>
        <Map w={240} />
        <span style={{ display: 'flex', gap: 8 }}>
          <span style={{ flex: 1, display: 'grid', justifyItems: 'center', gap: 2, padding: '8px 0', clipPath: cut(5), background: 'rgba(255,255,255,.05)' }}>
            <small style={{ fontSize: 9.5, color: '#7d8a9c' }}>아웃</small>
            <b style={{ fontFamily: disp, fontSize: 17, color: '#fff' }}>1</b>
          </span>
          <span style={{ flex: 1, display: 'grid', justifyItems: 'center', gap: 2, padding: '8px 0', clipPath: cut(5), background: 'rgba(255,255,255,.05)' }}>
            <small style={{ fontSize: 9.5, color: '#7d8a9c' }}>주자</small>
            <b style={{ fontFamily: disp, fontSize: 17, color: A.warn }}>2 · 3루</b>
          </span>
        </span>
      </span>
      <span style={{ display: 'grid', alignContent: 'start', gap: 14 }}>
        <Top />
        <Head size={30} />
        <Who p={S.batter} ko="상대 타자" c={A.foe} big sub={`파워 ${S.batter.power} · 컨택 ${S.batter.contact}`} />
        <span style={{ display: 'grid', gap: 8, padding: '12px 14px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
          <Who p={S.pitcher} ko="우리 투수" c={A.my} sub={S.pitcher.today} />
          <Hp />
        </span>
        <Row3 />
      </span>
    </div>
  </Frame>
)]);
/* 3 · 미니맵이 주인공 */
P.push(['3 · 미니맵 크게', '구장을 크게 두고 그 위에 상황을 얹는다', () => (
  <Frame w={760}>
    <Top />
    <div style={{ position: 'relative', marginTop: 14, display: 'grid', placeItems: 'center' }}>
      <Map w={420} />
      <span style={{ position: 'absolute', left: 0, top: 0, display: 'grid', gap: 3 }}>
        <b style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{S.head}</b>
        <b style={{ fontFamily: disp, fontSize: 18, color: '#cbd5e1' }}>{S.score[0]} : {S.score[1]}</b>
      </span>
      <span style={{ position: 'absolute', right: 0, top: 0, display: 'grid', gap: 6, width: 190 }}>
        <Who p={S.batter} ko="상대 타자" c={A.foe} />
        <Who p={S.pitcher} ko="우리 투수" c={A.my} />
        <Hp />
      </span>
    </div>
    <div style={{ marginTop: 16 }}><Row3 /></div>
  </Frame>
)]);
/* 4 · 카드 마주보기 */
P.push(['4 · 마주보기', '타자와 투수를 카드로 맞세운다', () => (
  <Frame w={820}>
    <Top />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 86px 1fr', alignItems: 'center', gap: 14, marginTop: 16 }}>
      {[[S.batter, '상대 타자', A.foe, `${S.batter.today} · 파워 ${S.batter.power}`],
        [S.pitcher, '우리 투수', A.my, `${S.pitcher.today} · ERA ${S.pitcher.era}`]].map(([p, ko, c, sub], i) => (
        <React.Fragment key={ko}>
          {i === 1 && (
            <span style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
              <Dia size={60} />
              <b style={{ fontFamily: disp, fontSize: 20, fontWeight: 800, color: '#cbd5e1' }}>{S.score[0]} : {S.score[1]}</b>
              <small style={{ fontSize: 10, color: '#7d8a9c' }}>1사</small>
            </span>
          )}
          <span style={{ display: 'grid', gap: 10, padding: 16, clipPath: cut(10),
            background: `linear-gradient(180deg,${mix(c, 14)},rgba(6,10,19,.6))`, boxShadow: `inset 0 0 0 1px ${mix(c, 30)}` }}>
            <Who p={p} ko={ko} c={c} big sub={sub} />
            {i === 1 && <Hp />}
          </span>
        </React.Fragment>
      ))}
    </div>
    <b style={{ display: 'block', marginTop: 16, fontSize: 22, fontWeight: 900, color: '#fff', textAlign: 'center' }}>{S.head}</b>
    <div style={{ marginTop: 14 }}><Row3 /></div>
  </Frame>
)]);
/* 5 · 투수 집중 */
P.push(['5 · 투수 집중', '우리 투수 상태와 불펜까지 — 바꿀지 말지', () => (
  <Frame w={800} a={A.my}>
    <Top a={A.my} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
      <Head size={28} />
      <span style={{ marginLeft: 'auto' }}><Dia size={62} /></span>
    </div>
    <div style={{ display: 'grid', gap: 10, marginTop: 16, padding: 16, clipPath: cut(10), background: mix(A.my, 8) }}>
      <Who p={S.pitcher} ko="지금 던지는 투수" c={A.my} big sub={`${S.pitcher.today} · ERA ${S.pitcher.era}`} />
      <Hp />
      <span style={{ display: 'flex', gap: 7, marginTop: 4 }}>
        {S.pen.map(([nm, tag, ovr, hp]) => (
          <span key={nm} style={{ flex: 1, display: 'grid', gap: 3, padding: '9px 10px', clipPath: cut(5), background: 'rgba(255,255,255,.05)' }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <small style={{ fontFamily: disp, fontSize: 9.5, color: A.vio }}>{tag}</small>
              <b style={{ fontSize: 12, color: '#e8ecf2' }}>{nm}</b>
              <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 13, color: '#cbd5e1' }}>{ovr}</b>
            </span>
            <span style={{ display: 'flex', height: 4, background: 'rgba(255,255,255,.1)' }}>
              <i style={{ width: `${hp}%`, background: A.my }} />
            </span>
          </span>
        ))}
      </span>
    </div>
    <div style={{ marginTop: 14 }}><Row3 /></div>
  </Frame>
)]);
/* 6 · 무게 게이지 */
P.push(['6 · 무게 게이지', '이 자리가 얼마나 중요한지를 먼저 보여 준다', () => (
  <Frame w={760}>
    <Top />
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 16 }}>
      <span style={{ position: 'relative', width: 96, height: 96, flexShrink: 0, display: 'grid', placeItems: 'center',
        borderRadius: '50%', background: `conic-gradient(${A.foe} ${S.weight * 360}deg, rgba(255,255,255,.08) 0)` }}>
        <span style={{ width: 76, height: 76, borderRadius: '50%', background: '#0a0f18', display: 'grid', placeItems: 'center' }}>
          <b style={{ fontFamily: disp, fontSize: 24, fontWeight: 800, color: A.foe }}>{Math.round(S.weight * 100)}</b>
        </span>
        <small style={{ position: 'absolute', bottom: -18, fontSize: 10, color: '#7d8a9c' }}>승부처 무게</small>
      </span>
      <Head size={30} />
      <span style={{ marginLeft: 'auto' }}><Dia /></span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
      <span style={{ padding: '12px 14px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.batter} ko="상대 타자" c={A.foe} sub={S.batter.today} />
      </span>
      <span style={{ display: 'grid', gap: 8, padding: '12px 14px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.pitcher} ko="우리 투수" c={A.my} />
        <Hp />
      </span>
    </div>
    <div style={{ marginTop: 14 }}><Row3 /></div>
  </Frame>
)]);
/* 7 · 세로 목록 */
P.push(['7 · 세로 목록', '선택지를 세로로 펼치고 저마다 무엇을 감수하는지', () => (
  <Frame w={680}>
    <Top />
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
      <Head size={28} />
      <span style={{ marginLeft: 'auto' }}><Dia size={62} /></span>
    </div>
    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
      <span style={{ flex: 1, padding: '10px 12px', clipPath: cut(6), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.batter} ko="상대 타자" c={A.foe} />
      </span>
      <span style={{ flex: 1, display: 'grid', gap: 7, padding: '10px 12px', clipPath: cut(6), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.pitcher} ko="우리 투수" c={A.my} />
        <Hp />
      </span>
    </div>
    <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
      {S.opts.map((o) => (
        <span key={o.ko} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', clipPath: cut(8),
          background: 'rgba(255,255,255,.05)', boxShadow: `inset 3px 0 0 ${o.c}`, cursor: 'pointer' }}>
          <b style={{ fontSize: 17, fontWeight: 800, color: '#fff', width: 96 }}>{o.ko}</b>
          <small style={{ fontSize: 12, color: '#93a1b1' }}>{o.tip}</small>
          <small style={{ marginLeft: 'auto', fontSize: 11, color: o.c }}>{o.risk}</small>
        </span>
      ))}
    </div>
  </Frame>
)]);
/* 8 · 다이아몬드 중앙 */
P.push(['8 · 다이아몬드 중앙', '주자 상황을 한가운데 크게', () => (
  <Frame w={720}>
    <Top />
    <div style={{ display: 'grid', justifyItems: 'center', gap: 10, marginTop: 16 }}>
      <Dia size={130} />
      <b style={{ fontSize: 30, fontWeight: 900, color: '#fff' }}>{S.head}</b>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <b style={{ fontFamily: disp, fontSize: 24, fontWeight: 800, color: '#cbd5e1' }}>{S.score[0]} : {S.score[1]}</b>
        <small style={{ fontSize: 12, color: '#93a1b1' }}>{S.lead}</small>
      </span>
    </div>
    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
      <span style={{ flex: 1, padding: '10px 12px', clipPath: cut(6), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.batter} ko="상대 타자" c={A.foe} />
      </span>
      <span style={{ flex: 1, display: 'grid', gap: 7, padding: '10px 12px', clipPath: cut(6), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.pitcher} ko="우리 투수" c={A.my} />
        <Hp />
      </span>
    </div>
    <div style={{ marginTop: 14 }}><Row3 /></div>
  </Frame>
)]);
/* 9 · 전광판 */
P.push(['9 · 전광판', '구장 전광판처럼 — 숫자를 크게', () => (
  <Frame w={840} a={A.warn}>
    <Top a={A.warn} />
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, marginTop: 14 }}>
      {[['이닝', '8회초'], ['아웃', '1'], ['주자', '2 · 3루'], ['점수', `${S.score[0]} : ${S.score[1]}`]].map(([k, v]) => (
        <span key={k} style={{ flex: 1, display: 'grid', justifyItems: 'center', gap: 5, padding: '14px 0', clipPath: cut(7),
          background: 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${mix(A.warn, 18)}` }}>
          <Lab size={9}>{k}</Lab>
          <b style={{ fontFamily: disp, fontSize: 24, fontWeight: 800, color: '#fff' }}>{v}</b>
        </span>
      ))}
      <span style={{ display: 'grid', placeItems: 'center', padding: '0 14px', clipPath: cut(7), background: 'rgba(255,255,255,.04)' }}><Dia size={66} /></span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
      <span style={{ padding: '12px 14px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.batter} ko="상대 타자" c={A.foe} sub={S.batter.today} />
      </span>
      <span style={{ display: 'grid', gap: 8, padding: '12px 14px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.pitcher} ko="우리 투수" c={A.my} />
        <Hp />
      </span>
    </div>
    <div style={{ marginTop: 14 }}><Row3 /></div>
  </Frame>
)]);
/* 10 · 무전 */
P.push(['10 · 무전', '코치가 상황을 읽어 주는 말투로', () => (
  <Frame w={720} a={A.vio}>
    <Top a={A.vio} />
    <div style={{ display: 'grid', gap: 10, marginTop: 14, padding: 16, clipPath: cut(10), background: mix(A.vio, 9),
      boxShadow: `inset 3px 0 0 ${A.vio}` }}>
      <Lab c={A.vio} size={9}>Bench Call</Lab>
      <b style={{ fontSize: 19, color: '#fff', lineHeight: 1.5 }}>
        8회초 1사 2·3루, 한 점 차입니다. 상대 4번 최정이 들어섭니다 — 이길환은 96구를 던졌습니다.
      </b>
    </div>
    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
      <span style={{ flex: 1, padding: '10px 12px', clipPath: cut(6), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.batter} ko="타자" c={A.foe} sub={`파워 ${S.batter.power}`} />
      </span>
      <span style={{ flex: 1, display: 'grid', gap: 7, padding: '10px 12px', clipPath: cut(6), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.pitcher} ko="투수" c={A.my} />
        <Hp />
      </span>
      <span style={{ display: 'grid', placeItems: 'center', padding: '0 12px' }}><Dia size={56} /></span>
    </div>
    <div style={{ marginTop: 14 }}><Row3 /></div>
  </Frame>
)]);
/* 11 · 이닝 흐름 */
P.push(['11 · 이 이닝 흐름', '여기까지 어떻게 왔는지 한 줄로 깔고', () => (
  <Frame w={780}>
    <Top />
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
      <Head size={28} />
      <span style={{ marginLeft: 'auto' }}><Dia size={62} /></span>
    </div>
    <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
      {[['정성훈', '안타', A.foe], ['이대형', '도루', A.warn], ['박용택', '뜬공 아웃', A.gray], ['김현수', '볼넷', A.foe], ['최정', '타석', '#fff']].map(([nm, r, c]) => (
        <span key={nm} style={{ flex: 1, display: 'grid', gap: 3, padding: '9px 10px', clipPath: cut(5),
          background: c === '#fff' ? mix(A.foe, 16) : 'rgba(255,255,255,.04)', boxShadow: c === '#fff' ? `inset 0 0 0 1px ${A.foe}` : 'none' }}>
          <b style={{ fontSize: 11.5, color: c === '#fff' ? '#fff' : '#cbd5e1' }}>{nm}</b>
          <small style={{ fontSize: 10, color: c === '#fff' ? A.foe : '#7d8a9c' }}>{r}</small>
        </span>
      ))}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
      <span style={{ padding: '11px 13px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.batter} ko="상대 타자" c={A.foe} sub={S.batter.today} />
      </span>
      <span style={{ display: 'grid', gap: 7, padding: '11px 13px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.pitcher} ko="우리 투수" c={A.my} />
        <Hp />
      </span>
    </div>
    <div style={{ marginTop: 14 }}><Row3 /></div>
  </Frame>
)]);
/* 12 · 세 띠 */
P.push(['12 · 세 띠', '상황 · 사람 · 선택을 띠 셋으로 또렷이 나눈다', () => (
  <Frame w={800} pad={0}>
    <div style={{ display: 'grid', gap: 2 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 26px', background: mix(A.foe, 10) }}>
        <Head size={26} />
        <span style={{ marginLeft: 'auto' }}><Dia size={58} /></span>
        <span style={{ display: 'grid', justifyItems: 'end', gap: 3 }}>
          <Lab c={A.foe} size={9}>Crisis</Lab>
          <b style={{ fontFamily: disp, fontSize: 20, fontWeight: 800, color: A.foe }}>남은 {S.left}</b>
        </span>
      </span>
      <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <span style={{ padding: '16px 22px', background: 'rgba(255,255,255,.04)' }}>
          <Who p={S.batter} ko="상대 타자" c={A.foe} sub={`${S.batter.today} · 파워 ${S.batter.power}`} />
        </span>
        <span style={{ display: 'grid', gap: 8, padding: '16px 22px', background: 'rgba(255,255,255,.04)' }}>
          <Who p={S.pitcher} ko="우리 투수" c={A.my} sub={S.pitcher.today} />
          <Hp />
        </span>
      </span>
      <span style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
        {S.opts.map((o) => (
          <span key={o.ko} style={{ display: 'grid', gap: 4, padding: '18px 22px', background: 'rgba(255,255,255,.055)', cursor: 'pointer',
            boxShadow: `inset 0 3px 0 ${o.c}` }}>
            <b style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{o.ko}</b>
            <small style={{ fontSize: 11, color: '#93a1b1' }}>{o.tip}</small>
          </span>
        ))}
      </span>
    </div>
  </Frame>
)]);
/* 13 · 수비 배치 */
P.push(['13 · 수비 배치', '야수 아홉이 어디 서 있는지까지 보여 준다', () => (
  <Frame w={860} a={A.def}>
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 22 }}>
      <span style={{ display: 'grid', alignContent: 'start', gap: 10 }}>
        <Lab c={A.def} size={10}>Defense</Lab>
        <Map w={300} />
        <small style={{ fontSize: 10.5, color: '#7d8a9c' }}>파란 점이 야수 · 노란 점이 주자</small>
      </span>
      <span style={{ display: 'grid', alignContent: 'start', gap: 13 }}>
        <Top a={A.def} />
        <Head size={28} />
        <span style={{ padding: '11px 13px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
          <Who p={S.batter} ko="상대 타자" c={A.foe} sub={`파워 ${S.batter.power} · 당겨치는 편`} />
        </span>
        <span style={{ display: 'grid', gap: 7, padding: '11px 13px', clipPath: cut(7), background: 'rgba(255,255,255,.05)' }}>
          <Who p={S.pitcher} ko="우리 투수" c={A.my} />
          <Hp />
        </span>
        <Row3 />
      </span>
    </div>
  </Frame>
)]);
/* 14 · 확률 */
P.push(['14 · 확률', '고르면 막아 낼 확률이 얼마나 되는지', () => (
  <Frame w={780}>
    <Top />
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
      <Head size={28} />
      <span style={{ marginLeft: 'auto' }}><Dia size={62} /></span>
    </div>
    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
      <span style={{ flex: 1, padding: '10px 12px', clipPath: cut(6), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.batter} ko="상대 타자" c={A.foe} />
      </span>
      <span style={{ flex: 1, display: 'grid', gap: 7, padding: '10px 12px', clipPath: cut(6), background: 'rgba(255,255,255,.05)' }}>
        <Who p={S.pitcher} ko="우리 투수" c={A.my} />
        <Hp />
      </span>
    </div>
    <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
      {S.opts.map((o) => (
        <span key={o.ko} style={{ display: 'grid', gap: 7, padding: '13px 16px', clipPath: cut(8), background: 'rgba(255,255,255,.05)', cursor: 'pointer' }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <b style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{o.ko}</b>
            <small style={{ fontSize: 11, color: '#93a1b1' }}>{o.tip}</small>
            <b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 18, fontWeight: 800, color: o.c }}>{o.odds}%</b>
          </span>
          <span style={{ display: 'flex', height: 6, background: 'rgba(255,255,255,.08)' }}>
            <i style={{ width: `${o.odds}%`, background: o.c }} />
          </span>
        </span>
      ))}
    </div>
    <small style={{ display: 'block', marginTop: 10, fontSize: 10.5, color: '#7d8a9c' }}>무실점으로 넘길 확률</small>
  </Frame>
)]);
/* 15 · 최소 */
P.push(['15 · 최소', '정말 필요한 것만 — 가장 빨리 읽힌다', () => (
  <Frame w={620}>
    <Top />
    <b style={{ display: 'block', marginTop: 14, fontSize: 32, fontWeight: 900, color: '#fff' }}>{S.head}</b>
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
      <b style={{ fontFamily: disp, fontSize: 22, fontWeight: 800, color: '#cbd5e1' }}>{S.score[0]} : {S.score[1]}</b>
      <small style={{ fontSize: 12, color: '#93a1b1' }}>{S.lead} · 최정 89 타석 · 이길환 96구</small>
      <span style={{ marginLeft: 'auto' }}><Dia size={52} /></span>
    </span>
    <div style={{ marginTop: 18 }}><Row3 tall /></div>
  </Frame>
)]);
/* 16 · 넓은 판 */
P.push(['16 · 넓은 판', '화면을 거의 다 쓰고 선택지를 큼직하게', () => (
  <Frame w={980}>
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 260px', gap: 20, alignItems: 'start' }}>
      <span style={{ display: 'grid', gap: 10 }}>
        <Lab c={A.foe} size={10}>Batter</Lab>
        <span style={{ display: 'grid', gap: 9, padding: 14, clipPath: cut(9), background: mix(A.foe, 9) }}>
          <Who p={S.batter} ko="상대 4번" c={A.foe} big sub={S.batter.today} />
          {[['파워', S.batter.power], ['컨택', S.batter.contact], ['주력', S.batter.speed]].map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'baseline', fontSize: 11, color: '#93a1b1' }}>
              <span>{k}</span><b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 13, color: '#e8ecf2' }}>{v}</b>
            </span>
          ))}
        </span>
      </span>
      <span style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
        <Top />
        <b style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{S.head}</b>
        <Map w={250} />
        <b style={{ fontFamily: disp, fontSize: 24, fontWeight: 800, color: '#cbd5e1' }}>{S.score[0]} : {S.score[1]}</b>
      </span>
      <span style={{ display: 'grid', gap: 10 }}>
        <Lab c={A.my} size={10}>Pitcher</Lab>
        <span style={{ display: 'grid', gap: 9, padding: 14, clipPath: cut(9), background: mix(A.my, 9) }}>
          <Who p={S.pitcher} ko="우리 선발" c={A.my} big sub={S.pitcher.today} />
          <Hp />
          {[['구위', S.pitcher.stuff], ['제구', S.pitcher.control]].map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'baseline', fontSize: 11, color: '#93a1b1' }}>
              <span>{k}</span><b style={{ marginLeft: 'auto', fontFamily: disp, fontSize: 13, color: '#e8ecf2' }}>{v}</b>
            </span>
          ))}
        </span>
      </span>
    </div>
    <div style={{ marginTop: 18 }}><Row3 tall odds /></div>
  </Frame>
)]);

function App() {
  const [only, setOnly] = useState(null);
  const list = only == null ? P : [P[only]];
  return (
    <div style={{ padding: 20, fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <b style={{ fontSize: 19, color: '#fff' }}>승부처 팝업 16안</b>
        <small style={{ fontSize: 12, color: '#7d8a9c' }}>8회초 1사 2·3루 · 4:3 앞섬 · 상대 4번 타석</small>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {P.map(([t], i) => (
            <button key={t} onClick={() => setOnly(only === i ? null : i)} style={{ padding: '3px 8px', border: 0, cursor: 'pointer', clipPath: cut(3),
              background: only === i ? A.my : 'rgba(255,255,255,.06)', color: only === i ? '#05080f' : '#cbd5e1', fontSize: 11, fontWeight: 700 }}>{i + 1}</button>
          ))}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, alignItems: 'flex-start' }}>
        {list.map(([title, desc, Body]) => (
          <div key={title} style={{ display: 'grid', gap: 7 }}>
            <div>
              <b style={{ fontSize: 13.5, color: '#fff' }}>{title}</b>
              <small style={{ display: 'block', fontSize: 11, color: '#8b97a6' }}>{desc}</small>
            </div>
            {/* 경기 화면 위에 뜨는 판이라 어두운 바탕을 깐다 */}
            <div style={{ padding: 18, background: 'radial-gradient(120% 100% at 50% 0%,#0d1622,#05080f)', clipPath: cut(10) }}><Body /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
