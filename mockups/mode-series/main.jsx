/*
 * 모드 화면 왼쪽 판의 '이 모드에 열리는 시리즈' 목록 8안 (개발 서버: /mockups/mode-series/)
 * 지금은 115 × 66 그림 카드가 스무 칸 넘게 깔려 시선을 다 가져간다. 같은 자리(478 × 354)에서
 * 존재감을 낮추는 여덟 가지. 화면 1920 × 911.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const W = 478, H = 354;            // 지금 목록이 차지하는 자리
const ACC = '#10b981';
const cut = (c = 8) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const emb = (k) => `url(ui/clubs/${k}.webp)`;
const tone = { KIA: '#ea0029', 삼성: '#0d47a1', LG: '#c30452', 두산: '#131230', SSG: '#ce0e2d', 롯데: '#041e42', 한화: '#fc4e00', NC: '#315288', KT: '#000000', 키움: '#820024' };

/* 보기 표본 — 전체 믹스 묶음 그대로 */
const GROUPS = [
  ['레전드', [
    { y: null, t: 'KBO 올타임 레전드', k: 'legend' }, { y: null, t: '1980년대 레전드', k: 'legend' },
    { y: null, t: '1990년대 레전드', k: 'legend' }, { y: null, t: '2000년대 레전드', k: 'legend' },
    { y: null, t: '2010년대 레전드', k: 'legend' }, { y: null, t: '2020년대 레전드', k: 'legend' },
    { y: null, t: '에이스 레전드', k: 'legend' }, { y: null, t: 'OB·두산 레전드', k: 'doosan' },
  ]],
  ['구단 시즌', [
    { y: 2025, t: '삼성 라이온즈', k: 'samsung' }, { y: 2025, t: 'LG 트윈스', k: 'lg' },
    { y: 2025, t: '한화 이글스', k: 'hanwha' }, { y: 2024, t: 'KIA 타이거즈', k: 'kia' },
    { y: 2024, t: 'KT 위즈', k: 'kt' }, { y: 2023, t: 'NC 다이노스', k: 'nc' },
    { y: 2022, t: 'SSG 랜더스', k: 'sk' }, { y: 2021, t: '롯데 자이언츠', k: 'lotte' },
    { y: 2017, t: '넥센 히어로즈', k: 'kiwoom' }, { y: 1993, t: '해태 타이거즈', k: 'kia' },
  ]],
  ['국가대표', [
    { y: 2008, t: '베이징 올림픽', k: 'korea' }, { y: 2009, t: 'WBC 국가대표', k: 'korea' },
    { y: 2015, t: '프리미어12', k: 'korea' }, { y: 2023, t: '항저우 아시안게임', k: 'korea' },
  ]],
];
const ALL = GROUPS.flatMap(([, l]) => l);
const short = (t) => t.replace(/ (타이거즈|라이온즈|트윈스|베어스|이글스|자이언츠|다이노스|위즈|랜더스|히어로즈)$/, '');

/* 판 틀 — 실제 화면의 ui-cut · ui-frame · ui-glass 자리 */
const Panel = ({ title, note, children }) => (
  <div style={{ width: W + 32 }}>
    <div style={{ marginBottom: 8 }}>
      <b style={{ fontFamily: disp, fontSize: 16.5, color: '#e8ecf2' }}>{title}</b>
      <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#8b97a6' }}>{note}</p>
    </div>
    <div style={{ width: W + 32, height: H + 32, padding: 16, clipPath: cut(14), background: 'rgba(8,12,20,.72)', boxShadow: `inset 0 0 0 1px ${ACC}3d`, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);
const Head = ({ ko, n, open = null, onClick }) => (
  <div onClick={onClick} role={onClick ? 'button' : undefined}
    style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 6px', cursor: onClick ? 'pointer' : 'default' }}>
    <span style={{ fontFamily: disp, fontSize: 10, letterSpacing: '.2em', color: ACC }}>SERIES</span>
    <b style={{ fontSize: 12, color: '#cbd5e1' }}>{ko} {n}</b>
    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
    {open != null && <span style={{ fontSize: 11, color: '#7c8797' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>}
  </div>
);

/* ── 여덟 가지 ── */
const V = [
  ['A · 지금 모습', '115 × 66 그림 카드 스무 칸', () => (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {GROUPS.slice(0, 2).map(([ko, list]) => (
        <React.Fragment key={ko}>
          <Head ko={ko} n={list.length} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, gridAutoRows: '66px' }}>
            {list.map((t) => (
              <span key={t.t} style={{ position: 'relative', overflow: 'hidden', clipPath: cut(7), background: '#0b1220' }}>
                <span style={{ position: 'absolute', inset: 0, backgroundImage: emb(t.k), backgroundSize: 'cover', backgroundPosition: 'center 30%', opacity: .85 }} />
                <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%,rgba(5,8,15,.9))' }} />
                <span style={{ position: 'absolute', left: 8, right: 8, bottom: 6 }}>
                  <b style={{ display: 'block', fontSize: 12.5, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{short(t.t)}</b>
                  <small style={{ fontFamily: disp, fontSize: 11, color: '#9aa6b4' }}>{t.y || 'ALL'}</small>
                </span>
              </span>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  )],

  ['B · 글자 칩', '그림 없이 칩 — 구단색은 왼쪽 점 하나로', () => (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {GROUPS.map(([ko, list]) => (
        <React.Fragment key={ko}>
          <Head ko={ko} n={list.length} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {list.map((t) => (
              <span key={t.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px', clipPath: cut(5),
                background: 'rgba(255,255,255,.05)', fontSize: 12, color: '#cbd5e1' }}>
                <i style={{ width: 5, height: 5, borderRadius: 9, background: tone[short(t.t)] || ACC }} />
                {t.y && <b style={{ fontFamily: disp, fontSize: 11.5, color: '#7c8797' }}>{t.y}</b>}
                {short(t.t)}
              </span>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  )],

  ['C · 접었다 편다', '묶음 머리만 보이고 누르면 그 묶음만 펼친다', () => {
    const [open, setOpen] = useState('구단 시즌');
    return (
      <div style={{ height: '100%', overflow: 'hidden' }}>
        {GROUPS.map(([ko, list]) => (
          <React.Fragment key={ko}>
            <Head ko={ko} n={list.length} open={open === ko} onClick={() => setOpen(open === ko ? '' : ko)} />
            {open === ko && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {list.map((t) => (
                  <span key={t.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', clipPath: cut(5), background: 'rgba(255,255,255,.06)', fontSize: 12.5, color: '#e8ecf2' }}>
                    {t.y && <b style={{ fontFamily: disp, fontSize: 12, color: ACC }}>{t.y}</b>}{short(t.t)}
                  </span>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }],

  ['D · 한 줄 목록', '표처럼 한 줄씩 — 연도 · 이름 · 인원', () => (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <Head ko="구단 시즌" n={10} />
      <div style={{ display: 'grid', gap: 1 }}>
        {GROUPS[1][1].map((t, i) => (
          <span key={t.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', background: i % 2 ? 'transparent' : 'rgba(255,255,255,.03)' }}>
            <b style={{ width: 34, fontFamily: disp, fontSize: 12.5, color: ACC }}>{t.y}</b>
            <b style={{ flex: 1, fontSize: 12.5, color: '#e8ecf2' }}>{t.t}</b>
            <small style={{ fontFamily: disp, fontSize: 11.5, color: '#6b7787' }}>18명</small>
          </span>
        ))}
      </div>
      <Head ko="레전드" n={8} />
      <div style={{ display: 'grid', gap: 1 }}>
        {GROUPS[0][1].slice(0, 3).map((t, i) => (
          <span key={t.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', background: i % 2 ? 'transparent' : 'rgba(255,255,255,.03)' }}>
            <b style={{ width: 34, fontFamily: disp, fontSize: 12.5, color: '#6b7787' }}>ALL</b>
            <b style={{ flex: 1, fontSize: 12.5, color: '#e8ecf2' }}>{t.t}</b>
            <small style={{ fontFamily: disp, fontSize: 11.5, color: '#6b7787' }}>18명</small>
          </span>
        ))}
      </div>
    </div>
  )],

  ['E · 연도 줄기', '왼쪽에 연도, 오른쪽에 그해 시리즈만', () => (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <Head ko="연도별" n={16} />
      {[[2025, ['삼성', 'LG', '한화']], [2024, ['KIA', 'KT']], [2023, ['NC']], [2022, ['SSG']], [2021, ['롯데']], [2017, ['넥센']]].map(([y, teams]) => (
        <div key={y} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,.05)' }}>
          <b style={{ width: 44, fontFamily: disp, fontSize: 16, color: '#7c8797' }}>{y}</b>
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {teams.map((t) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', clipPath: cut(4), background: 'rgba(255,255,255,.05)', fontSize: 12, color: '#cbd5e1' }}>
                <i style={{ width: 4, height: 4, borderRadius: 9, background: tone[t] || ACC }} />{t}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )],

  ['F · 엠블럼만', '작은 엠블럼 줄 — 이름은 올렸을 때', () => (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {GROUPS.map(([ko, list]) => (
        <React.Fragment key={ko}>
          <Head ko={ko} n={list.length} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {list.map((t) => (
              <span key={t.t} title={`${t.y || ''} ${t.t}`.trim()}
                style={{ position: 'relative', width: 40, height: 40, clipPath: cut(6), backgroundImage: emb(t.k), backgroundSize: 'cover', backgroundPosition: 'center 28%', filter: 'saturate(.85)' }}>
                {t.y && <b style={{ position: 'absolute', left: 0, right: 0, bottom: 0, fontFamily: disp, fontSize: 10, textAlign: 'center', background: 'rgba(5,8,15,.75)', color: '#cbd5e1' }}>{String(t.y).slice(2)}</b>}
              </span>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  )],

  ['G · 수만 남기고 접기', '묶음별 수만 크게, 전체 목록은 눌러서', () => (
    <div style={{ height: '100%', display: 'grid', alignContent: 'start', gap: 8 }}>
      {[['구단 시즌', 87, '1982 – 2026'], ['레전드', 20, '시대 · 구단 · 테마'], ['국가대표', 20, 'WBC · 올림픽 · 아시안게임']].map(([ko, n, sub]) => (
        <span key={ko} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', clipPath: cut(8), background: 'rgba(255,255,255,.04)' }}>
          <b style={{ width: 52, fontFamily: disp, fontSize: 30, lineHeight: 1, color: ACC }}>{n}</b>
          <span style={{ display: 'grid', gap: 2 }}>
            <b style={{ fontSize: 14, color: '#e8ecf2' }}>{ko}</b>
            <small style={{ fontSize: 11.5, color: '#7c8797' }}>{sub}</small>
          </span>
        </span>
      ))}
      <span style={{ marginTop: 2, padding: '8px 0', textAlign: 'center', clipPath: cut(6), background: 'rgba(255,255,255,.05)', fontSize: 12.5, color: '#cbd5e1' }}>시리즈 127개 모두 보기 ▸</span>
    </div>
  )],

  ['H · 가로 띠', '묶음마다 한 줄, 옆으로 흐른다', () => (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {GROUPS.map(([ko, list]) => (
        <React.Fragment key={ko}>
          <Head ko={ko} n={list.length} />
          <div style={{ display: 'flex', gap: 6, overflow: 'hidden', maskImage: 'linear-gradient(90deg,#000 88%,transparent)' }}>
            {list.map((t) => (
              <span key={t.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flex: 'none', padding: '6px 10px', clipPath: cut(6), background: 'rgba(255,255,255,.05)', boxShadow: `inset 2px 0 0 ${tone[short(t.t)] || ACC}` }}>
                {t.y && <b style={{ fontFamily: disp, fontSize: 12.5, color: '#7c8797' }}>{t.y}</b>}
                <b style={{ fontSize: 12.5, color: '#e8ecf2', whiteSpace: 'nowrap' }}>{short(t.t)}</b>
              </span>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  )],
];

const App = () => (
  <div style={{ minHeight: '100vh', padding: '24px 0 60px', background: 'radial-gradient(120% 90% at 50% 0%,#132033 0%,#0a0e15 62%)', color: '#e8ecf2', fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
    <div style={{ width: 1600, margin: '0 auto 18px' }}>
      <b style={{ fontFamily: disp, fontSize: 22 }}>모드 시리즈 목록 8안</b>
      <span style={{ marginLeft: 12, fontSize: 13.5, color: '#94a3b8' }}>실제 자리와 같은 478 × 354</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(3,${W + 32}px)`, justifyContent: 'center', gap: '28px 36px' }}>
      {V.map(([title, note, Render]) => <Panel key={title} title={title} note={note}><Render /></Panel>)}
    </div>
  </div>
);
createRoot(document.getElementById('root')).render(<App />);
