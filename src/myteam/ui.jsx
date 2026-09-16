/* 내 팀 화면들이 함께 쓰는 조각 — 드래프트 화면과 같은 문법(잘린 모서리 · 네온 테두리 · Saira 라벨) */
import React from 'react';

export const UiStyle = () => (
  <style>{`
    .mt-cut { --c:14px; clip-path:polygon(var(--c) 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,0 100%,0 var(--c)); }
    .mt-glass { background:rgba(6,10,19,.74); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); }
    .mt-frame { position:relative; }
    .mt-frame::after { content:''; position:absolute; inset:0; pointer-events:none; box-shadow:inset 0 0 0 1px rgba(255,255,255,.10); clip-path:inherit; }
    .mt-frame.hot::after { box-shadow:inset 0 0 0 2px var(--a,#10b981), inset 0 0 36px color-mix(in srgb, var(--a,#10b981) 26%, transparent); }
    .mt-lab { display:inline-flex; align-items:center; gap:8px; font-family:'Saira Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:.32em; text-transform:uppercase; color:var(--a,#10b981); margin:0; }
    .mt-lab::before { content:''; width:14px; height:10px; background:currentColor; clip-path:polygon(0 0,60% 0,100% 100%,40% 100%); }
    .mt-btn { --c:9px; display:inline-flex; align-items:center; justify-content:center; gap:10px; min-height:46px; padding:0 22px; font-size:15px; font-weight:700; color:#e8ecf2; background:rgba(255,255,255,.06); box-shadow:inset 0 0 0 1px rgba(255,255,255,.22); clip-path:polygon(var(--c) 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,0 100%,0 var(--c)); transition:background .15s, box-shadow .15s, filter .15s; }
    .mt-btn:hover:not(:disabled) { background:rgba(255,255,255,.1); box-shadow:inset 0 0 0 1px rgba(255,255,255,.42); }
    .mt-btn:disabled { opacity:.4; cursor:not-allowed; }
    .mt-btn.pri { background:var(--a,#10b981); color:#05080f; font-weight:800; box-shadow:none; }
    .mt-btn.pri:hover:not(:disabled) { filter:brightness(1.12); box-shadow:none; }
    .mt-btn.lg { min-height:62px; font-size:19px; }
    .mt-btn.sm { --c:7px; min-height:34px; padding:0 14px; font-size:13px; }
    .mt-chip { --c:6px; display:inline-flex; align-items:center; gap:6px; padding:4px 10px; font-size:12px; font-weight:600; color:#cbd5e1; background:rgba(5,8,15,.6); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a,#94a3b8) 45%,transparent); clip-path:polygon(var(--c) 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,0 100%,0 var(--c)); }
    .mt-scan { background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 1px,transparent 1px 3px); }
    .mt-bar { height:6px; background:rgba(255,255,255,.08); } .mt-bar > i { display:block; height:100%; }
    .mt-card { position:relative; width:150px; height:200px; overflow:hidden; background:linear-gradient(180deg,#0e1726,#05080f); }
    @keyframes mtPulse { 50% { opacity:.5; } }
  `}</style>
);

export const Panel = ({ label, a = '#10b981', c = 14, hot, glass = true, className = '', style, children }) => (
  <section className={`mt-cut mt-frame ${hot ? 'hot' : ''} ${glass ? 'mt-glass' : ''} ${className}`} style={{ '--c': `${c}px`, '--a': a, ...style }}>
    {label && <p className="mt-lab" style={{ '--a': a }}>{label}</p>}
    {children}
  </section>
);

export const Btn = ({ pri, lg, sm, a = '#10b981', className = '', style, ...rest }) => (
  <button type="button" className={`mt-btn ${pri ? 'pri' : ''} ${lg ? 'lg' : ''} ${sm ? 'sm' : ''} ${className}`} style={{ '--a': a, ...style }} {...rest} />
);

export const Chip = ({ a = '#94a3b8', children }) => <span className="mt-chip" style={{ '--a': a }}>{children}</span>;

const tone = (ovr) => (ovr >= 92 ? '#fde047' : ovr >= 85 ? '#34d399' : ovr >= 78 ? '#7dd3fc' : '#94a3b8');

/** 선수 카드 (로비·라커 공용) */
export const PlayerTile = ({ player, img = 'ui/mt/mt-card.webp', onClick, width = 150, height = 200, badge }) => {
  const a = tone(player.overall);
  return (
    <div role={onClick ? 'button' : undefined} onClick={onClick}
      className="mt-card mt-cut mt-frame" style={{ '--c': '12px', '--a': a, width, height, cursor: onClick ? 'pointer' : undefined }}>
      <div className="absolute inset-x-0" style={{ top: 34, bottom: 52, background: `url(${img}) center/cover`, opacity: 0.5 }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.1) 40%,rgba(5,8,15,.95))' }} />
      <div className="mt-scan absolute inset-0 opacity-50" />
      <span className="absolute left-2.5 top-2 font-display text-[30px] font-extrabold leading-none" style={{ color: a, textShadow: `0 0 18px ${a}80` }}>{player.overall}</span>
      <span className="absolute right-2.5 top-2.5 px-1.5 py-0.5 font-display text-[11px] font-extrabold tracking-wider text-[#05080f]" style={{ background: a }}>{player.position}</span>
      {badge}
      <span className="absolute inset-x-2.5 bottom-[26px] truncate text-base font-bold text-white [text-shadow:0_2px_8px_#000]">{player.name}</span>
      <span className="absolute inset-x-2.5 bottom-2 truncate font-display text-[11px] font-semibold tracking-wide text-gray-400">{player.year} {player.team} · {player.cost} CP</span>
    </div>
  );
};

export const Bg = ({ img = 'ui/mt/mt-bg.webp', grad = 'linear-gradient(180deg,rgba(3,5,10,.92) 0,rgba(3,5,10,.82) 40%,rgba(3,5,10,.95) 100%)', opacity = 0.9 }) => (
  <>
    <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${img})`, opacity }} />
    <div className="fixed inset-0" style={{ background: grad }} />
  </>
);

/** 화면 위쪽 바 (로비·라커·상점 공통) */
export const TopBar = ({ title, sub, left, children }) => (
  <header className="relative flex h-[66px] shrink-0 items-center gap-5 border-b border-emerald-500/25 bg-[linear-gradient(180deg,rgba(5,8,15,.96),rgba(5,8,15,.4))] px-6">
    {left}
    <div>
      <p className="mt-lab" style={{ fontSize: 9 }}>Legend Draft</p>
      <b className="mt-0.5 block text-[19px] font-extrabold text-white">{title}</b>
    </div>
    {sub}
    <div className="ml-auto flex items-center gap-3">{children}</div>
  </header>
);
