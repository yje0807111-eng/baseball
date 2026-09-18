/* 내 팀 화면들이 함께 쓰는 조각 — 드래프트 화면과 같은 문법(잘린 모서리 · 네온 테두리 · Saira 라벨) */
import React, { useEffect, useState } from 'react';
import ProfileBadge from './ProfileBadge.jsx';

export const UiStyle = () => (
  <style>{`
    .mt-cut { --c:14px; clip-path:polygon(var(--c) 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,0 100%,0 var(--c)); }
    .mt-glass { background:rgba(6,10,19,.74); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); }
    .mt-frame { position:relative; }
    .mt-frame::after { content:''; position:absolute; inset:0; pointer-events:none; background: linear-gradient(135deg,transparent calc(50% - 1px),var(--a,#10b981) calc(50% - 1px),var(--a,#10b981) calc(50% + 1px),transparent calc(50% + 1px)) left top/var(--c) var(--c) no-repeat, linear-gradient(135deg,transparent calc(50% - 1px),var(--a,#10b981) calc(50% - 1px),var(--a,#10b981) calc(50% + 1px),transparent calc(50% + 1px)) right bottom/var(--c) var(--c) no-repeat, linear-gradient(var(--a,#10b981),var(--a,#10b981)) left var(--c) top 0/56px 2px no-repeat, linear-gradient(var(--a,#10b981),var(--a,#10b981)) left 0 top var(--c)/2px 30px no-repeat, linear-gradient(var(--a,#10b981),var(--a,#10b981)) right var(--c) bottom 0/56px 2px no-repeat, linear-gradient(var(--a,#10b981),var(--a,#10b981)) right 0 bottom var(--c)/2px 30px no-repeat; box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a,#10b981) 32%,transparent); }
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
    /* 빈 상세 판 대기 모습 (드래프트 빈 PICK 문법): 블록이 위→아래 차례로 밝아졌다 가라앉고, 사진 틀 둘레를 초록 빛 한 점이 돈다 */
    @property --skr { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
    .mt-skring { position:relative; padding:1.5px; background:conic-gradient(from var(--skr), transparent 0 75%, rgba(52,211,153,.9) 88%, transparent 100%); animation:mtSkRing 4.5s linear infinite; }
    .mt-skring > div { position:relative; height:100%; background:linear-gradient(180deg,#0a1120,#070c16); clip-path:inherit; }
    .mt-sk { display:block; background:rgba(148,163,184,.09); animation:mtSkBreath 2.4s ease-in-out infinite; animation-delay:calc(var(--i, 0) * .09s); }
    .mt-skbtn { background:rgba(255,255,255,.03); box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); animation:mtSkBtn 2.4s ease-in-out 1.6s infinite; }
    @keyframes mtSkRing { to { --skr: 360deg; } }
    @keyframes mtSkBreath { 0%, 100% { filter:brightness(1); } 30% { filter:brightness(2.1); } }
    @keyframes mtSkBtn { 0%, 100% { box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); } 30% { box-shadow:inset 0 0 0 1px rgba(110,231,183,.35); } }
    /* 스크롤바: 얇은 네온 바 + 어두운 홈 */
    .mt-scroll { scrollbar-width: thin; scrollbar-color: rgba(52,211,153,.55) rgba(255,255,255,.04); }
    .mt-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
    .mt-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,.035); border-radius: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); }
    .mt-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(52,211,153,.75), rgba(16,185,129,.45)); border: 2px solid transparent; background-clip: padding-box; box-shadow: 0 0 10px rgba(16,185,129,.35); }
    .mt-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(110,231,183,.95), rgba(16,185,129,.7)); background-clip: padding-box; }
    .mt-scroll::-webkit-scrollbar-thumb:active { background: linear-gradient(180deg, #6ee7b7, #10b981); background-clip: padding-box; }
    .mt-scroll::-webkit-scrollbar-corner { background: transparent; }
    /* 노란 계열 패널 안에서는 스크롤바도 노랗게 */
    /* 드롭다운 목록처럼 좁은 곳: 가는 스크롤바 */
    /* 크롬은 scrollbar-width/color 가 있으면 ::-webkit-scrollbar 를 무시해서 auto 로 되돌린다 */
    .mt-scroll.slim { scrollbar-width: auto; scrollbar-color: auto; }
    .mt-scroll.slim::-webkit-scrollbar { width: 2px; }
    .mt-scroll.slim::-webkit-scrollbar-track { background: transparent; box-shadow: none; }
    .mt-scroll.slim::-webkit-scrollbar-thumb, .mt-scroll.slim::-webkit-scrollbar-thumb:hover, .mt-scroll.slim::-webkit-scrollbar-thumb:active { border: 0; border-radius: 1px; background: rgba(255,255,255,.28); box-shadow: none; }
    .mt-scroll.gold { scrollbar-color: rgba(253,224,71,.55) rgba(255,255,255,.04); }
    .mt-scroll.gold::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(253,224,71,.8), rgba(202,138,4,.5)); background-clip: padding-box; box-shadow: 0 0 10px rgba(253,224,71,.3); }
    /* 드래프트 화면 카드 문법 (상점 상품·선수 공용) */
    .mt-pk { position:relative; container-type:inline-size; background:#05080f; clip-path:polygon(7% 0,100% 0,100% 95.3%,93% 100%,0 100%,0 4.7%); }
    .mt-pk .in { position:absolute; inset:0; overflow:hidden; }
    .mt-pk .art { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .5s; }
    .mt-pk:hover .art { transform:scale(1.04); }
    .mt-pk .sh { position:absolute; inset:0; background:linear-gradient(180deg,rgba(5,8,15,.55) 0,rgba(5,8,15,0) 24%,rgba(5,8,15,0) 44%,rgba(5,8,15,.9) 70%,#05080f 100%),linear-gradient(90deg,rgba(5,8,15,.5) 0,rgba(5,8,15,0) 50%); }
    .mt-pk .fr { position:absolute; inset:1.6cqw; border:1px solid color-mix(in srgb, var(--n) 45%, transparent); pointer-events:none; }
    .mt-pk .tb { position:absolute; left:6cqw; right:1.6cqw; top:1.6cqw; height:1.3cqw; background:var(--n); box-shadow:0 0 5px color-mix(in srgb,var(--n) 70%,transparent); }
    .mt-pk .ov { position:absolute; left:6cqw; top:5cqw; font-family:'Saira Condensed',sans-serif; font-size:22cqw; font-weight:800; line-height:.85; color:var(--n); text-shadow:0 0 2px #000,0 2px 10px #000; }
    .mt-pk .ov small { font-size:.34em; color:#9ca3af; margin-left:1cqw; }
    .mt-pk .meta { position:absolute; left:6.5cqw; top:27cqw; font-size:4.2cqw; font-weight:600; letter-spacing:.08em; color:rgba(255,255,255,.75); text-shadow:0 1px 4px #000; }
    .mt-pk .pos { position:absolute; left:6cqw; right:6cqw; bottom:31cqw; display:flex; align-items:center; gap:1.8cqw; line-height:1; }
    .mt-pk .pos em { flex:none; padding:.8cqw 1.6cqw; font-style:normal; font-size:4.4cqw; font-weight:800; color:#05080f; background:var(--n); }
    .mt-pk .pos span { font-size:4.4cqw; font-weight:500; letter-spacing:.06em; color:#e5e7eb; }
    .mt-pk .nm { position:absolute; left:6cqw; right:6cqw; bottom:19cqw; font-size:8.4cqw; font-weight:800; color:#fff; text-shadow:0 2px 8px #000; }
    .mt-pk .ds { position:absolute; left:6cqw; right:6cqw; bottom:12.5cqw; font-size:4cqw; color:#cbd5e1; text-shadow:0 1px 4px #000; }
    .mt-pk .ft { position:absolute; left:6cqw; right:6cqw; bottom:6cqw; display:flex; align-items:center; justify-content:space-between; }
    .mt-pk .ft b { font-family:'Saira Condensed',sans-serif; font-size:7.4cqw; color:var(--n); }
    .mt-pk .ft span { padding:1cqw 2.4cqw; font-size:4cqw; font-weight:700; color:#05080f; background:var(--n); }
    .mt-wm { position:absolute; left:14px; top:2px; font-family:'Saira Condensed',sans-serif; font-size:58px; font-weight:800; color:rgba(16,185,129,.16); line-height:1; pointer-events:none; }
    .mt-rf { display:inline-flex; align-items:center; gap:8px; padding:9px 16px; font-size:13px; font-weight:700; color:#6ee7b7; background:rgba(16,185,129,.08); box-shadow:inset 0 0 0 1px rgba(16,185,129,.5); clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px); }
    .mt-por { position:relative; flex:none; background-color:#0b1220; background-size:cover; background-position:50% 0%; clip-path:polygon(12% 0,100% 0,100% 88%,88% 100%,0 100%,0 12%); }
    .mt-row { display:grid; flex:none; align-items:center; gap:12px; padding:6px 12px; background:rgba(255,255,255,.035); clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px); text-align:left; width:100%; }
    .mt-row:hover { background:rgba(255,255,255,.05); }
    /* 구단 색 줄 (영입 목록): 왼쪽에서 구단 색이 은은하게 번지고 왼쪽 네온 줄 · 옅은 구단색 테두리 */
    .mt-row.team { background:linear-gradient(90deg,color-mix(in srgb,var(--t) 16%,transparent),rgba(255,255,255,.03) 38%); box-shadow:inset 2px 0 0 color-mix(in srgb,var(--t) 70%,transparent), inset 0 0 0 1px color-mix(in srgb,var(--t) 16%,transparent); }
    .mt-row.team:hover { background:linear-gradient(90deg,color-mix(in srgb,var(--t) 24%,transparent),rgba(255,255,255,.05) 45%); }
    .mt-staff-in { animation: mtStaffIn .32s cubic-bezier(.2,.8,.2,1) backwards; }
    /* 드래프트 PICK 카드와 같은 뒤집기: 나가는 면은 앞 반(0→90°), 들어오는 면은 뒤 반(−90°→0) · 옆면일 때 4% 들어 올림 */
    .mt-flip { position:relative; perspective:1000px; }
    .mt-flip > .mt-face { position:absolute; inset:0; backface-visibility:hidden; }
    .mt-flip > .mt-face.in { animation: mtFlipIn .26s ease-in-out both; }
    .mt-flip > .mt-face.out { animation: mtFlipOut .26s ease-in-out both; pointer-events:none; }
    @keyframes mtFlipIn { 0%, 50% { transform: rotateY(-90deg) scale(1.04); } 100% { transform: rotateY(0) scale(1); } }
    @keyframes mtFlipOut { 0% { transform: rotateY(0) scale(1); } 50%, 100% { transform: rotateY(90deg) scale(1.04); } }
    @keyframes mtStaffIn { from { opacity:0; transform:translateY(18px) scale(1.06); } to { opacity:1; transform:none; } }
    .mt-row.on { background:linear-gradient(90deg,color-mix(in srgb,var(--a,#10b981) 20%,transparent),rgba(6,10,19,.6)); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a,#10b981) 60%,transparent), inset 3px 0 0 var(--a,#10b981); }
    .mt-sb { display:block; height:4px; background:rgba(255,255,255,.1); }
    .mt-sb > b { display:block; height:100%; }
    .mt-grp { display:flex; align-items:center; gap:10px; margin:14px 0 8px; font-family:'Saira Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:.2em; color:#9ca3af; }
    .mt-grp::after { content:''; flex:1; height:1px; background:rgba(255,255,255,.08); }
    .mt-nav { position:relative; display:flex; height:4.4rem; flex:none; align-items:center; gap:12px; overflow:hidden; padding:0 14px; text-align:left; background:rgba(255,255,255,.03); clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px); transition:filter .15s; }
    .mt-nav:hover { filter:brightness(1.25); }
    .mt-nav .th { width:44px; height:3.2rem; flex:none; background-size:cover; background-position:center; filter:saturate(.7) brightness(.75); clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px); }
    .mt-nav.on { background:linear-gradient(90deg,color-mix(in srgb,var(--a) 24%,transparent),rgba(6,10,19,.92)); }
    .mt-nav.on .th { filter:none; }
    .mt-nav.sm { height:62px; gap:12px; }
    .mt-nav.sm .th { width:40px; height:44px; }
    .mt-nav.on::after { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:var(--a); box-shadow:0 0 12px var(--a); }
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

/** 선수 초상 — public/profiles/<id>.webp 가 있으면 그것, 없으면 실루엣 */
export const Portrait = ({ player, w = 36, h = 46, color = '#334155', staff }) => (
  <span className="mt-por" style={{
    width: w, height: h,
    backgroundImage: `url(profiles/${encodeURIComponent(player?.id || '')}.webp), url(ui/mt/silhouette-${staff ? 'coach' : 'player'}.webp)`,
    boxShadow: `inset 0 0 0 1px ${color}99`,
  }} />
);

export const Bg = ({ img = 'ui/mt/mt-bg.webp', opacity = 0.9 }) => (
  <div className="fixed inset-0 bg-[#05080f] bg-cover bg-center" style={{ backgroundImage: `url(${img})` }}>
    <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 38%, rgba(5,8,15,${(1 - opacity * 0.6).toFixed(2)}), rgba(5,8,15,.95) 78%), repeating-linear-gradient(0deg, rgba(255,255,255,.022) 0 1px, transparent 1px 3px)` }} />
  </div>
);

/** 팀 스탯 요약 — 상단 바가 쓴다 */
export function teamStats(squad = []) {
  const avg = (arr, f = (p) => p.overall) => (arr.length ? Math.round(arr.reduce((s, p) => s + f(p), 0) / arr.length) : 0);
  const bat = squad.filter((p) => p.type === 'batter');
  return {
    ovr: avg(squad),
    bat: avg(bat),
    sp: avg(squad.filter((p) => p.position === 'SP')),
    rp: avg(squad.filter((p) => p.position === 'RP')),
    def: avg(bat, (p) => p.stats?.defense ?? 70),
  };
}

/** 눈금 게이지 (드래프트 화면 샐러리 캡 바 문법) */
export const SegBar = ({ pct, width = 200, ticks = 20, over }) => (
  <span className="relative block h-2.5 bg-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]" style={{ width }}>
    <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, pct)}%`, background: over ? '#f87171' : 'linear-gradient(90deg,#10b981,#fde047)' }} />
    <span className="absolute inset-0" style={{ background: `repeating-linear-gradient(90deg,transparent 0 ${width / ticks - 2}px,rgba(5,8,15,.9) ${width / ticks - 2}px ${width / ticks}px)` }} />
  </span>
);

const Cell = ({ children, bg, line = true, lc = 'rgba(16,185,129,.4)', grow, px = 18, className = '' }) => (
  <span className={`relative flex h-full items-center gap-2.5 ${grow ? 'min-w-0 flex-1' : ''} ${className}`} style={{ background: bg, padding: `0 ${px}px` }}>
    {children}
    {line && <span className="absolute right-0 top-3.5 bottom-3.5 w-px" style={{ background: `linear-gradient(180deg,transparent,${lc},transparent)` }} />}
  </span>
);

/**
 * 모든 화면이 함께 쓰는 상단 바 — 드래프트 모드 화면 헤더 문법
 *  [← · eyebrow/제목] [steps] ······ [샐러리 캡 게이지(team 을 줄 때만 — 내 라커)] [프로필 · 골드 — 누르면 이름 · 배너 · 로그아웃]
 */
export const TopBar = ({ section = '메인', eyebrow = 'Legend Draft', team, account, onBack, right, steps, onSignOut }) => {
  const squad = team?.squad || [];
  const cap = team?.cap || 2000;
  const cost = squad.reduce((s, p) => s + (p.cost || 0), 0) + Object.values(team?.staff || {}).reduce((s, x) => s + (x?.cost || 0), 0);
  const over = cost > cap;
  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center gap-6 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
      <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#10b981] to-transparent" />
      {onBack && (
        <button type="button" onClick={onBack} aria-label="메인으로"
          className="mt-cut grid h-9 w-9 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] hover:bg-white/10" style={{ '--c': '7px' }}>←</button>
      )}
      <div className="leading-none">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">{eyebrow}</p>
        <h1 className="mt-1 text-xl font-black leading-none text-white">{section}</h1>
      </div>
      {steps}
      <div className="ml-auto flex items-center gap-6">
        {team && (
          <div className="w-60">
            <div className="flex justify-between font-display text-[11px] tracking-[0.2em] text-gray-500">
              <span>SALARY CAP</span>
              {/* 남은 캡: 처음엔 가득 차 있고 영입할수록 줄어든다 */}
              <b style={{ color: over ? '#f87171' : '#fff' }}>{(cap - cost).toLocaleString()} / {cap.toLocaleString()}</b>
            </div>
            <div className="mt-1 h-1.5 bg-white/10">
              <i className="block h-full" style={{ width: `${Math.max(0, Math.min(100, ((cap - cost) / cap) * 100))}%`, background: over ? '#f87171' : '#10b981', boxShadow: `0 0 8px ${over ? '#f87171' : '#10b981'}` }} />
            </div>
          </div>
        )}
        {account && <ProfileBadge account={account} onSignOut={onSignOut} />}
        {right}
      </div>
    </header>
  );
};

/**
 * 값이 바뀌면(keyOf) 카드를 뒤집어 바꾼다 — 선임 · 교체 · 해임(빈 면) 모두. resetKey 가 바뀌면 뒤집지 않고 바로 바꾼다
 * render(value) 는 한 면의 내용(부모 크기를 채우는 요소)
 */
export function FlipFaces({ value, keyOf, render, resetKey, className = '', style }) {
  const k = keyOf(value);
  const [st, setSt] = useState({ k, rk: resetKey, value, out: null, n: 0, flip: false });
  if (st.rk !== resetKey) setSt({ k, rk: resetKey, value, out: null, n: st.n + 1, flip: false });
  else if (st.k !== k) setSt({ k, rk: resetKey, value, out: st.value, n: st.n + 1, flip: true });
  else if (st.value !== value) setSt({ ...st, value });
  useEffect(() => {
    if (!st.flip) return undefined;
    const n = st.n;
    const t = setTimeout(() => setSt((x) => (x.n === n ? { ...x, flip: false, out: null } : x)), 280);
    return () => clearTimeout(t);
  }, [st.n, st.flip]);
  return (
    <div className={`mt-flip ${className}`} style={style}>
      {st.flip && <div key={`o${st.n}`} className="mt-face out">{render(st.out)}</div>}
      <div key={`i${st.n}`} className={`mt-face ${st.flip ? 'in' : ''}`}>{render(value)}</div>
    </div>
  );
}

/** 사이드 네비 — 모드 탭을 세로로 세운 판. items: [{ key, label, sub, img }] */
export const SideNav = ({ items, value, onChange, a = '#10b981', label = 'Menu', compact = false, children }) => (
  <nav className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2 p-3" style={{ '--c': '20px', '--a': a }}>
    <p className="mt-lab px-1 pt-1" style={{ '--a': a }}>{label}</p>
    {items.map((it) => (
      <button key={it.key} type="button" onClick={() => onChange(it.key)} className={`mt-nav ${compact ? 'sm' : ''} ${value === it.key ? 'on' : ''}`} style={{ '--a': a }}>
        <span className="th" style={{ backgroundImage: `url(${it.img})` }} />
        <span className="min-w-0">
          <b className={`block truncate text-base font-black ${value === it.key ? 'text-white' : 'text-gray-300'}`}>{it.label}</b>
          {it.sub && <small className="font-display text-[11px] tracking-[0.12em] text-gray-400">{it.sub}</small>}
        </span>
      </button>
    ))}
    <div className="mt-scroll mt-auto min-h-0 overflow-y-auto">{children}</div>
  </nav>
);

/** 큰 사진 머리 (오른쪽 상세 패널 위) — 시리즈 카드 문법 */
export const Hero = ({ img, ovr, name, color = '#10b981', h = 176, pos = '60% 18%' }) => (
  <div className="mt-cut relative shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '12px', height: h, backgroundImage: img, backgroundPosition: pos }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.35),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,#05080f)' }} />
    {ovr != null && <span className="absolute left-3 top-2 font-display text-4xl font-extrabold" style={{ color, textShadow: `0 0 16px ${color}88,0 2px 4px #000` }}>{ovr}</span>}
    <b className="absolute bottom-2 left-3 right-3 truncate text-3xl font-black text-white">{name}</b>
  </div>
);

/** 오른쪽 패널의 키-값 줄 */
export const KV = ({ k, v, color = '#fff' }) => (
  <div className="flex items-center justify-between border-b border-white/10 py-2.5 text-sm text-gray-300">
    <span>{k}</span><b className="font-display text-lg" style={{ color }}>{v}</b>
  </div>
);

/** 작은 수치 칸 묶음 (모드 설명 패널의 시리즈·선수·난이도) */
export const Stats = ({ items }) => (
  <dl className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${items.length},1fr)` }}>
    {items.map(([k, v]) => (
      <div key={k} className="mt-cut bg-white/[0.045] px-3 py-1.5" style={{ '--c': '7px' }}>
        <dt className="text-[10px] text-gray-400">{k}</dt>
        <dd className="font-display text-xl font-bold leading-tight text-white">{v}</dd>
      </div>
    ))}
  </dl>
);
