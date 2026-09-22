/*
 * 증강 POOL 사이드의 제거권 · 강화권 칸 8안 (개발 서버: /mockups/aug-tickets/)
 * 상점에서 쓰는 그림(ui/shop/au-remove · au-upgrade)을 끌어와 등급 단추와 같은 결로 맞춘다.
 * 칸 폭은 실제와 같은 248. 위에 진짜 등급 단추를 한 줄 놓아 결이 맞는지 본다. 화면 1920 × 911.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';

const disp = "'Saira Condensed','IBM Plex Sans KR',sans-serif";
const W = 248;
const cut = (c = 8) => `polygon(${c}px 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,0 100%,0 ${c}px)`;
const RM = { key: 'remove', ko: '제거권', en: 'REMOVE', img: 'ui/shop/au-remove.webp', c: '#fb7185', n: 2, tip: '제외 칸을 하나 연다' };
const UP = { key: 'upgrade', ko: '강화권', en: 'UPGRADE', img: 'ui/shop/au-upgrade.webp', c: '#fbbf24', n: 5, tip: '증강 레벨을 하나 올린다' };
const T = [RM, UP];

/* 실제 등급 단추 — 결을 견주려고 그대로 둔다 */
const NavBtn = ({ on }) => (
  <div className={`mt-nav sm ${on ? 'on' : ''}`} style={{ width: W, '--a': '#cbd5e1' }}>
    <span className="th" style={{ backgroundImage: 'url(ui/aug/silver.webp)' }} />
    <span style={{ display: 'grid', gap: 2 }}>
      <b style={{ fontSize: 14.5, color: '#e8ecf2' }}>실버 증강</b>
    </span>
  </div>
);

/* ── 여덟 안 ── */
const V = [
  ['A · 지금 모습', '글자만 두 줄', (
    <div style={{ width: W, padding: 12, clipPath: cut(8), background: 'rgba(255,255,255,.045)' }}>
      {T.map((t) => (
        <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#9ca3af' }}>
          <span>{t.ko}</span><b style={{ fontFamily: disp, fontSize: 18, color: t.c }}>{t.n}</b>
        </div>
      ))}
    </div>
  )],

  ['B · 등급 단추와 같은 결', '그림 썸네일 · 이름 · 수 — 위 단추와 같은 꼴', (
    <div style={{ width: W, display: 'grid', gap: 6 }}>
      {T.map((t) => (
        <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 12px 0 0',
          clipPath: cut(8), background: 'rgba(255,255,255,.04)', boxShadow: `inset 3px 0 0 ${t.c}66` }}>
          <span style={{ width: 40, height: 44, flex: 'none', backgroundImage: `url(${t.img})`, backgroundSize: 'cover', backgroundPosition: 'center 30%', clipPath: cut(7) }} />
          <b style={{ flex: 1, fontSize: 14, color: '#cbd5e1' }}>{t.ko}</b>
          <b style={{ fontFamily: disp, fontSize: 22, color: t.c }}>{t.n}</b>
        </div>
      ))}
    </div>
  )],

  ['C · 그림을 바탕으로', '그림이 칸을 채우고 그 위에 이름과 수', (
    <div style={{ width: W, display: 'grid', gap: 6 }}>
      {T.map((t) => (
        <div key={t.key} style={{ position: 'relative', height: 58, overflow: 'hidden', clipPath: cut(8), background: '#070b14' }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: `url(${t.img})`, backgroundSize: 'cover', backgroundPosition: 'center 35%', opacity: .55 }} />
          <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg,rgba(7,11,20,.9),rgba(7,11,20,.35))` }} />
          <span style={{ position: 'absolute', insetInline: '12px 12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            <b style={{ flex: 1, fontSize: 14.5, color: '#e8ecf2' }}>{t.ko}</b>
            <b style={{ fontFamily: disp, fontSize: 24, color: t.c, textShadow: `0 0 14px ${t.c}66` }}>{t.n}</b>
          </span>
          <span style={{ position: 'absolute', insetBlock: 0, left: 0, width: 3, background: t.c }} />
        </div>
      ))}
    </div>
  )],

  ['D · 나란히 두 장', '가로로 반씩 — 그림 위에 큰 수', (
    <div style={{ width: W, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {T.map((t) => (
        <div key={t.key} style={{ position: 'relative', height: 96, overflow: 'hidden', clipPath: cut(8), background: '#070b14', boxShadow: `inset 0 0 0 1px ${t.c}3d` }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: `url(${t.img})`, backgroundSize: 'cover', backgroundPosition: 'center 28%', opacity: .7 }} />
          <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(7,11,20,.1),#070b14 88%)' }} />
          <span style={{ position: 'absolute', insetInline: 0, bottom: 8, display: 'grid', justifyItems: 'center', gap: 1 }}>
            <b style={{ fontFamily: disp, fontSize: 26, lineHeight: 1, color: t.c }}>{t.n}</b>
            <small style={{ fontSize: 12, color: '#cbd5e1' }}>{t.ko}</small>
          </span>
        </div>
      ))}
    </div>
  )],

  ['E · 쓰임까지 한 줄', '수 옆에 이 권이 무엇을 하는지', (
    <div style={{ width: W, display: 'grid', gap: 6 }}>
      {T.map((t) => (
        <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 11, height: 62, padding: '0 12px 0 0', clipPath: cut(8), background: 'rgba(255,255,255,.04)' }}>
          <span style={{ width: 44, height: 50, flex: 'none', backgroundImage: `url(${t.img})`, backgroundSize: 'cover', backgroundPosition: 'center 30%', clipPath: cut(7), boxShadow: `inset 0 0 0 1px ${t.c}59` }} />
          <span style={{ display: 'grid', gap: 1, minWidth: 0, flex: 1 }}>
            <b style={{ fontSize: 13.5, color: '#e8ecf2' }}>{t.ko}</b>
            <small style={{ fontSize: 11.5, color: '#7c8797', whiteSpace: 'nowrap' }}>{t.tip}</small>
          </span>
          <b style={{ fontFamily: disp, fontSize: 23, color: t.c }}>{t.n}</b>
        </div>
      ))}
    </div>
  )],

  ['F · 한 장으로 묶기', '머리글 아래 두 줄 — 칸 하나로 모은다', (
    <div style={{ width: W, overflow: 'hidden', clipPath: cut(10), background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      <div style={{ padding: '8px 12px 6px', fontFamily: disp, fontSize: 11, fontWeight: 700, letterSpacing: '.2em', color: '#6b7787' }}>TICKETS</div>
      {T.map((t, i) => (
        <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', boxShadow: i ? 'inset 0 1px 0 rgba(255,255,255,.06)' : undefined }}>
          <span style={{ width: 34, height: 38, flex: 'none', backgroundImage: `url(${t.img})`, backgroundSize: 'cover', backgroundPosition: 'center 30%', clipPath: cut(6) }} />
          <b style={{ flex: 1, fontSize: 13.5, color: '#cbd5e1' }}>{t.ko}</b>
          <b style={{ fontFamily: disp, fontSize: 21, color: t.c }}>{t.n}</b>
        </div>
      ))}
    </div>
  )],

  ['G · 상점으로 가는 길까지', '수 옆에 + 단추, 맨 아래 상점 줄', (
    <div style={{ width: W, display: 'grid', gap: 6 }}>
      {T.map((t) => (
        <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 11, height: 56, padding: '0 8px 0 0', clipPath: cut(8), background: 'rgba(255,255,255,.04)' }}>
          <span style={{ width: 40, height: 44, flex: 'none', backgroundImage: `url(${t.img})`, backgroundSize: 'cover', backgroundPosition: 'center 30%', clipPath: cut(7) }} />
          <b style={{ flex: 1, fontSize: 13.5, color: '#cbd5e1' }}>{t.ko}</b>
          <b style={{ fontFamily: disp, fontSize: 21, color: t.c }}>{t.n}</b>
          <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, clipPath: cut(5), background: 'rgba(255,255,255,.07)', fontSize: 15, color: '#cbd5e1' }}>+</span>
        </div>
      ))}
      <div style={{ padding: '6px 0', textAlign: 'center', clipPath: cut(6), background: 'rgba(255,255,255,.03)', fontSize: 12, color: '#7c8797' }}>상점에서 더 사기 ▶</div>
    </div>
  )],

  ['H · 큰 배너 한 장', '두 그림을 반씩 깔고 수를 크게', (
    <div style={{ position: 'relative', width: W, height: 104, overflow: 'hidden', clipPath: cut(10), background: '#070b14' }}>
      {T.map((t, i) => (
        <span key={t.key} style={{ position: 'absolute', insetBlock: 0, left: i ? '50%' : 0, width: '50%',
          backgroundImage: `url(${t.img})`, backgroundSize: 'cover', backgroundPosition: 'center 28%', opacity: .5 }} />
      ))}
      <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(7,11,20,.35),#070b14 92%)' }} />
      <span style={{ position: 'absolute', insetInline: 0, top: 10, textAlign: 'center', fontFamily: disp, fontSize: 11, fontWeight: 700, letterSpacing: '.24em', color: '#8b97a6' }}>TICKETS</span>
      <span style={{ position: 'absolute', insetInline: 0, bottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {T.map((t) => (
          <span key={t.key} style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
            <b style={{ fontFamily: disp, fontSize: 30, lineHeight: 1, color: t.c, textShadow: `0 0 16px ${t.c}55` }}>{t.n}</b>
            <small style={{ fontSize: 11.5, color: '#cbd5e1' }}>{t.ko}</small>
          </span>
        ))}
      </span>
    </div>
  )],
];

const App = () => (
  <div style={{ minHeight: '100vh', padding: '26px 0 60px', background: 'radial-gradient(120% 90% at 50% 0%,#132033 0%,#0a0e15 62%)', color: '#e8ecf2', fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
    <div style={{ width: 1520, margin: '0 auto 18px' }}>
      <b style={{ fontFamily: disp, fontSize: 22 }}>제거권 · 강화권 칸 8안</b>
      <span style={{ marginLeft: 12, fontSize: 13.5, color: '#94a3b8' }}>상점 그림을 끌어온다 · 칸 폭은 실제와 같은 248 (위 회색 줄은 지금 등급 단추)</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(4,${W + 24}px)`, justifyContent: 'center', gap: '30px 52px' }}>
      {V.map(([title, note, node]) => (
        <div key={title}>
          <div style={{ marginBottom: 8 }}>
            <b style={{ fontFamily: disp, fontSize: 16.5 }}>{title}</b>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#8b97a6' }}>{note}</p>
          </div>
          <div style={{ width: W + 24, padding: 12, clipPath: cut(14), background: 'rgba(8,12,20,.6)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
            <NavBtn on />
            <div style={{ height: 14 }} />
            {node}
          </div>
        </div>
      ))}
    </div>
  </div>
);
createRoot(document.getElementById('root')).render(<App />);
