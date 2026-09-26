/* 내 팀 화면들이 함께 쓰는 조각 — 유리 · 깊이 결(둥근 유리 판 · 윗선 빛 · 그림자 · Saira 숫자) */
import React, { useEffect, useRef, useState } from 'react';
import { SQUAD_CAP, CAP_LOUD } from './rules.js';
import ProfileBadge from './ProfileBadge.jsx';
import { artId } from '../data/artAlias.js';
import { navTo, useExitGhost } from '../ui/motion.jsx';

export const UiStyle = () => (
  <style>{`
    /* 둥근 모서리 — --c 가 곧 둥글기(예전 잘린 모서리 크기 그대로). 안쪽 그림은 둥글기 밖으로 나가지 않게(우선순위 0 이라 스크롤 칸은 그대로) */
    .mt-cut { --c:14px; border-radius:min(var(--c),22px); }
    :where(.mt-cut) { overflow:hidden; }
    /* 유리 판 — 위가 조금 밝은 반투명 · 윗선 빛 · 아래 그림자 */
    /* 판 — 보랏빛 짙은 남색 · 윗선 빛 · 아래 그림자 */
    .mt-glass { background:linear-gradient(180deg,rgba(30,26,56,.74),rgba(10,9,22,.86)); -webkit-backdrop-filter:blur(18px); backdrop-filter:blur(18px);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 30px 60px -30px rgba(0,0,0,.9); }
    @keyframes prism { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
    .mt-frame { position:relative; }
    /* 판 테두리 — 옅은 흰 선에 판 색(--a)을 조금. 고른 판(hot)은 판 색 선 · 안쪽 빛 */
    /* 판 테두리 — 금빛 가는 선. 큰 판(유리 판)은 왼쪽 위 · 오른쪽 아래에 금빛 모서리 장식 */
    .mt-frame::after { content:''; position:absolute; inset:0; pointer-events:none; border-radius:inherit; box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a,#10b981) 12%,rgba(245,210,122,.3)); }
    .mt-frame.mt-glass::before { content:''; position:absolute; inset:7px; pointer-events:none; border-radius:max(0px,calc(min(var(--c),22px) - 7px)); border:2px solid #f5d27a; opacity:.85; filter:drop-shadow(0 0 5px rgba(245,210,122,.6));
      -webkit-mask:linear-gradient(#000,#000) left top/30px 30px no-repeat,linear-gradient(#000,#000) right bottom/30px 30px no-repeat; mask:linear-gradient(#000,#000) left top/30px 30px no-repeat,linear-gradient(#000,#000) right bottom/30px 30px no-repeat; }
    .mt-frame.hot::after { box-shadow:inset 0 0 0 1.5px var(--a,#10b981), inset 0 0 36px color-mix(in srgb, var(--a,#10b981) 22%, transparent); }
    .mt-lab { display:inline-flex; align-items:center; gap:8px; font-family:'IBM Plex Sans KR','Malgun Gothic',sans-serif; font-size:14px !important; font-weight:800; letter-spacing:.02em; color:var(--a,#10b981); margin:0; }
    @keyframes mt-dim { from { opacity:0 } to { opacity:1 } }
    @keyframes mt-pop { from { opacity:0; transform:translateY(18px) scale(.97) } to { opacity:1; transform:none } }
    .mt-pop-bg { animation: mt-dim .15s ease-out both; }
    .mt-pop { animation: mt-pop .22s ease-out both; }
    .mt-lab::before { content:''; width:6px; height:6px; border-radius:50%; background:currentColor; box-shadow:0 0 8px currentColor; }
    .mt-btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; min-height:46px; padding:0 22px; border-radius:12px; font-size:14px; font-weight:700; color:#e8ecf2; background:rgba(255,255,255,.07); box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 1px rgba(255,255,255,.06); transition:background .15s, box-shadow .15s, filter .15s, transform .15s; }
    .mt-btn:not(.pri):hover:not(:disabled) { color:#fff; background:rgba(245,210,122,.1); box-shadow:inset 0 1px 0 rgba(255,255,255,.12), inset 0 0 0 1px rgba(245,210,122,.5), 0 8px 20px -10px rgba(245,210,122,.5); }
    .mt-btn:disabled { opacity:.4; cursor:not-allowed; }
    /* 주 단추 — 판 색 그라데이션 · 윗선 빛 · 판 색 그림자 */
    /* 주 단추 — 금빛(게임의 '누르는 곳'). 판 색(--a)은 상태 색으로만 쓴다 */
    .mt-btn.pri { color:#1a1408; font-weight:800; background:linear-gradient(180deg,#fbe7a8,#e3b24a 55%,#b7832a); box-shadow:0 10px 26px -8px rgba(227,178,74,.65), inset 0 1px 0 rgba(255,255,255,.7), inset 0 -2px 0 rgba(0,0,0,.2); }
    .mt-btn.pri:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); }
    .mt-btn.lg { min-height:62px; border-radius:16px; font-size:18px; }
    /* 게임 결 조각 — 장식 머리줄(양옆 금빛 선) · 레벨 보석 · 빛줄기 · 빛 알갱이 · 도장 */
    .mt-hd { display:flex; align-items:center; gap:12px; font-size:12px; font-weight:800; color:#f5d27a; }
    .mt-hd::before, .mt-hd::after { content:''; height:1px; flex:1; background:linear-gradient(90deg,transparent,rgba(245,210,122,.6)); }
    .mt-hd::after { background:linear-gradient(90deg,rgba(245,210,122,.6),transparent); }
    .mt-gem { display:inline-block; width:12px; height:12px; flex:none; border-radius:3px; transform:rotate(45deg); background:linear-gradient(135deg,#ede9fe,#a78bfa 45%,#7c3aed); box-shadow:0 0 10px #a78bfa, inset 0 0 0 1px rgba(255,255,255,.5); }
    .mt-gem.off { background:linear-gradient(135deg,#374151,#1f2937); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12); }
    @keyframes mtSpin { to { transform:rotate(360deg); } }
    @keyframes mtDrift { to { transform:translateY(-18px); } }
    .mt-rays { position:absolute; left:50%; top:40%; width:1700px; height:1700px; margin:-850px 0 0 -850px; border-radius:50%; pointer-events:none; background:repeating-conic-gradient(from 0deg,rgba(196,181,253,.06) 0 4deg,transparent 4deg 14deg); animation:mtSpin 90s linear infinite; -webkit-mask:radial-gradient(circle,#000 8%,transparent 60%); mask:radial-gradient(circle,#000 8%,transparent 60%); }
    .mt-dust { position:absolute; inset:0; pointer-events:none; animation:mtDrift 14s ease-in-out infinite alternate; background-image:radial-gradient(1.5px 1.5px at 12% 20%,#fff8,transparent),radial-gradient(1px 1px at 30% 70%,#fff6,transparent),radial-gradient(1.5px 1.5px at 55% 30%,#c4b5fd99,transparent),radial-gradient(1px 1px at 72% 80%,#fff5,transparent),radial-gradient(2px 2px at 85% 45%,#c4b5fdaa,transparent),radial-gradient(1px 1px at 44% 88%,#fff6,transparent),radial-gradient(1.5px 1.5px at 92% 18%,#fff7,transparent),radial-gradient(1px 1px at 6% 60%,#c4b5fd88,transparent); }
    @media (prefers-reduced-motion: reduce) { .mt-rays, .mt-dust { animation:none; } }
    .mt-stamp { position:absolute; padding:3px 10px; border-radius:6px; border:2px solid #f87171; color:#f87171; font-weight:900; font-size:11px; letter-spacing:.1em; transform:rotate(-12deg); background:rgba(20,5,8,.72); pointer-events:none; }
    .mt-btn.sm { min-height:34px; padding:0 14px; border-radius:10px; font-size:14px; }
    .mt-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; color:#cbd5e1; background:rgba(255,255,255,.05); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a,#94a3b8) 40%,transparent); }
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
    /* 스크롤바: 드래프트 플레이 화면(.syn-scroll)과 같은 얇은 알약 — 6px · 옅은 홈 · 초록 손잡이.
       크롬은 scrollbar-width/color 가 있으면 ::-webkit-scrollbar 를 무시하므로, 그 속성은 웹킷 스크롤바가 없는 브라우저에서만 쓴다 */
    .mt-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .mt-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,.035); border-radius: 99px; margin: 4px 0; }
    .mt-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(52,211,153,.55), rgba(16,185,129,.35)); border-radius: 99px; border: 1px solid rgba(5,8,15,.6); }
    .mt-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(110,231,183,.85), rgba(52,211,153,.6)); }
    .mt-scroll::-webkit-scrollbar-corner { background: transparent; }
    @supports not selector(::-webkit-scrollbar) { .mt-scroll { scrollbar-width: thin; scrollbar-color: rgba(52,211,153,.5) transparent; } }
    /* 드롭다운 목록처럼 좁은 곳: 더 가는 흰 스크롤바 */
    .mt-scroll.slim::-webkit-scrollbar { width: 2px; }
    .mt-scroll.slim::-webkit-scrollbar-track { background: transparent; margin: 0; }
    .mt-scroll.slim::-webkit-scrollbar-thumb, .mt-scroll.slim::-webkit-scrollbar-thumb:hover { border: 0; border-radius: 1px; background: rgba(255,255,255,.28); }
    /* 노란 계열 패널 안에서는 손잡이도 노랗게 */
    .mt-scroll.gold::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(253,224,71,.6), rgba(202,138,4,.4)); }
    .mt-scroll.gold::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(253,224,71,.9), rgba(202,138,4,.6)); }
    /* 드래프트 화면 카드 문법 (상점 상품·선수 공용) */
    .mt-pk { position:relative; container-type:inline-size; background:#05080f; clip-path:inset(0 round 6% / 4%); }
    .mt-pk .in { position:absolute; inset:0; overflow:hidden; }
    .mt-pk .art { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .5s; }
    .mt-pk:hover .art { transform:scale(1.04); }
    .mt-pk .sh { position:absolute; inset:0; background:linear-gradient(180deg,rgba(5,8,15,.55) 0,rgba(5,8,15,0) 24%,rgba(5,8,15,0) 44%,rgba(5,8,15,.9) 70%,#05080f 100%),linear-gradient(90deg,rgba(5,8,15,.5) 0,rgba(5,8,15,0) 50%); }
    .mt-pk .fr { position:absolute; inset:1.6cqw; border:1px solid color-mix(in srgb, var(--n) 45%, transparent); pointer-events:none; }
    .mt-pk .tb { position:absolute; left:6cqw; right:1.6cqw; top:1.6cqw; height:1.3cqw; background:var(--n); box-shadow:0 0 5px color-mix(in srgb,var(--n) 70%,transparent); }
    .mt-pk .ov { position:absolute; left:6cqw; top:5cqw; font-family:'Saira Condensed',sans-serif; font-size:22cqw; font-weight:800; line-height:.85; color:var(--n); text-shadow:0 0 2px #000,0 2px 10px #000; }
    .mt-pk .ov small { font-size:.34em; color:#9ca3af; margin-left:1cqw; }
    .mt-pk .meta { position:absolute; left:6.5cqw; top:27cqw; font-size:max(12px, 4.2cqw); font-weight:600; letter-spacing:.08em; color:rgba(255,255,255,.75); text-shadow:0 1px 4px #000; }
    .mt-pk .pos { position:absolute; left:6cqw; right:6cqw; bottom:31cqw; display:flex; align-items:center; gap:1.8cqw; line-height:1; }
    .mt-pk .pos em { flex:none; padding:.8cqw 1.6cqw; font-style:normal; font-size:max(12px, 4.4cqw); font-weight:800; color:#05080f; background:var(--n); }
    .mt-pk .pos span { font-size:max(12px, 4.4cqw); font-weight:500; letter-spacing:.06em; color:#e5e7eb; }
    .mt-pk .nm { position:absolute; left:6cqw; right:6cqw; bottom:19cqw; font-size:max(12px, 8.4cqw); font-weight:800; color:#fff; text-shadow:0 2px 8px #000; }
    .mt-pk .ds { position:absolute; left:6cqw; right:6cqw; bottom:12.5cqw; font-size:max(12px, 4cqw); color:#cbd5e1; text-shadow:0 1px 4px #000; }
    .mt-pk .ft { position:absolute; left:6cqw; right:6cqw; bottom:6cqw; display:flex; align-items:center; justify-content:space-between; }
    .mt-pk .ft b { font-family:'Saira Condensed',sans-serif; font-size:max(12px, 7.4cqw); color:var(--n); }
    .mt-pk .ft span { padding:1cqw 2.4cqw; font-size:max(12px, 4cqw); font-weight:700; color:#05080f; background:var(--n); }
    .mt-wm { position:absolute; left:14px; top:2px; font-family:'Saira Condensed',sans-serif; font-size:58px; font-weight:800; color:rgba(16,185,129,.16); line-height:1; pointer-events:none; }
    .mt-rf { display:inline-flex; align-items:center; gap:8px; padding:9px 16px; border-radius:12px; font-size:14px; font-weight:700; color:#6ee7b7; background:rgba(16,185,129,.08); box-shadow:inset 0 0 0 1px rgba(16,185,129,.5); }
    .mt-por { position:relative; flex:none; background-color:#0b1220; background-size:cover; background-position:50% 0%; border-radius:10px; }
    /* 동그란 얼굴 — 구단 색 테(--t) */
    .mt-por.round { border-radius:50%; background-position:50% 12%; box-shadow:0 0 0 2px #05080f,0 0 0 3.5px var(--t,#334155) !important; }
    .mt-row { display:grid; flex:none; align-items:center; gap:12px; padding:6px 12px; border-radius:14px; background:transparent; text-align:left; width:100%; transition:background .2s, box-shadow .2s; }
    .mt-row:hover { background:rgba(255,255,255,.045); }
    .mt-row.team { background:transparent; }
    .mt-row.team:hover { background:rgba(255,255,255,.045); }
    .mt-staff-in { animation: mtStaffIn .32s cubic-bezier(.2,.8,.2,1) backwards; }
    /* 드래프트 PICK 카드와 같은 뒤집기: 나가는 면은 앞 반(0→90°), 들어오는 면은 뒤 반(−90°→0) · 옆면일 때 4% 들어 올림 */
    .mt-flip { position:relative; perspective:1000px; }
    .mt-flip > .mt-flipface { position:absolute; inset:0; backface-visibility:hidden; }
    .mt-flip > .mt-flipface.in { animation: mtFlipIn .26s ease-in-out both; }
    .mt-flip > .mt-flipface.out { animation: mtFlipOut .26s ease-in-out both; pointer-events:none; }
    /* 존 판 — 공이 위에서 날아와 꽂히고, 판이 판정 색으로 한 번 번쩍인다 */
    @keyframes mtZoneHit { 0% { transform: translateY(-22px) scale(2.6); opacity: 0; } 45% { opacity: 1; } 100% { transform: none; opacity: 1; } }
    @keyframes mtZonePulse { 0% { transform: scale(.35); opacity: .85; } 100% { transform: scale(2.1); opacity: 0; } }
    @keyframes mtZoneFlash { 0% { box-shadow: inset 0 0 0 2px var(--f,#fff), 0 0 26px -6px var(--f,#fff); } 100% { box-shadow: inset 0 0 0 1px rgba(255,255,255,.16); } }
    .mt-zhit { transform-box: fill-box; transform-origin: center; animation: mtZoneHit .3s cubic-bezier(.2,.9,.3,1) both; }
    .mt-zpulse { transform-box: fill-box; transform-origin: center; animation: mtZonePulse .55s ease-out both; }
    @keyframes mtFlipIn { 0%, 50% { transform: rotateY(-90deg) scale(1.04); } 100% { transform: rotateY(0) scale(1); } }
    @keyframes mtFlipOut { 0% { transform: rotateY(0) scale(1); } 50%, 100% { transform: rotateY(90deg) scale(1.04); } }
    @keyframes mtStaffIn { from { opacity:0; transform:translateY(18px) scale(1.06); } to { opacity:1; transform:none; } }
    /* 고른 줄 — 초록으로 물들고 떠오른다 */
    .mt-row.on, .mt-row.team.on { background:linear-gradient(90deg,rgba(16,185,129,.16),rgba(16,185,129,.03)); box-shadow:inset 0 0 0 1px rgba(16,185,129,.45),0 10px 30px -12px rgba(16,185,129,.5); }
    /* 종합 숫자 — 위가 밝은 은빛 */
    .mt-ovr { background:linear-gradient(180deg,#fff,#b6c2d1); -webkit-background-clip:text; background-clip:text; color:transparent; }
    /* 반짝이 카드 — 빛줄기가 지나가고, 마우스를 따라 기울어진다(--rx · --ry) */
    @keyframes mtSheen { 0% { background-position:-160% 0; } 100% { background-position:260% 0; } }
    .mt-holo { position:relative; overflow:hidden; border-radius:18px; background:#0b1220 center 15%/cover no-repeat; transition:transform .25s ease-out;
      transform:perspective(900px) rotateY(var(--ry,-6deg)) rotateX(var(--rx,2deg));
      box-shadow:0 30px 50px -20px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.12),0 0 60px -10px color-mix(in srgb,var(--t,#10b981) 55%,transparent); }
    .mt-holo::before { content:''; position:absolute; inset:0; z-index:1; pointer-events:none; mix-blend-mode:screen; background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.35) 47%,rgba(125,211,252,.25) 52%,transparent 64%) 0 0/220% 100% no-repeat; animation:mtSheen 4.5s ease-in-out infinite; }
    .mt-holo::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg,transparent 50%,rgba(5,8,15,.94)); }
    .mt-holo > * { position:absolute; z-index:2; }
    /* 작은 수치 칸 */
    .mt-tile { border-radius:14px; padding:10px 12px; background:rgba(255,255,255,.05); box-shadow:inset 0 1px 0 rgba(255,255,255,.06); }
    .mt-sb { display:block; height:4px; background:rgba(255,255,255,.1); }
    .mt-sb > b { display:block; height:100%; }
    .mt-grp { display:flex; align-items:center; gap:10px; margin:14px 0 8px; font-size:12px; font-weight:700; color:#9ca3af; }
    .mt-grp::after { content:''; flex:1; height:1px; background:rgba(255,255,255,.08); }
    /* 위 탭 — 알약 틀 안에 고른 탭만 떠오른다 */
    .mt-tabs { display:flex; align-items:stretch; gap:2px; height:100%; }
    .mt-tab { position:relative; display:flex; align-items:center; padding:0 22px; font-size:18px; font-weight:800; color:#8b93a4; transition:color .2s; }
    .mt-tab:hover { color:#e5e7eb; }
    .mt-tab .n { margin-left:7px; font-family:'Saira Condensed',sans-serif; font-size:14px; font-weight:700; color:#6b7280; }
    .mt-tab.on .n { color:#fbe7a8; }
    .mt-tab .bd { margin-left:7px; display:grid; place-items:center; min-width:20px; height:20px; padding:0 5px; border-radius:10px; font-size:12px; font-weight:900; color:#1c1203; background:linear-gradient(180deg,#fde68a,#f5b93a); box-shadow:0 0 10px rgba(245,185,58,.55); }
    .mt-tab.on { color:#fff; text-shadow:0 0 18px rgba(245,210,122,.35); background:radial-gradient(70% 90% at 50% 100%,rgba(245,210,122,.16),transparent 70%); }
    .mt-tab-ink { view-transition-name: mt-tab-ink; }
    .mt-tab-ink { content:''; position:absolute; left:14px; right:14px; bottom:0; height:3px; border-radius:3px 3px 0 0; background:linear-gradient(90deg,#b7832a,#fbe7a8,#b7832a); box-shadow:0 0 12px rgba(245,210,122,.8); }
    /* 알약 고르기(배속 등) — 작은 알약 틀 */
    .mt-seg { display:flex; gap:4px; padding:4px; border-radius:12px; background:rgba(255,255,255,.05); box-shadow:inset 0 1px 0 rgba(255,255,255,.08); }
    .mt-segb { height:32px; padding:0 14px; border-radius:8px; font-size:14px; font-weight:700; color:#9ca3af; }
    .mt-segb.on { color:#fff; background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06)); box-shadow:inset 0 1px 0 rgba(255,255,255,.2); }
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

/**
 * 팝업 틀 — 드래프트 창(Modal)과 같은 모양: 어둡게 · 흐리게 깐 배경, 위 제목 줄(분류 · 제목 · 닫기),
 * 본문 스크롤, 아래 단추 줄(오른쪽 끝이 주 단추). Esc · 바깥 누르기로 닫기
 */
export function Pop({ eyebrow, title, sub, a = '#10b981', width = 560, onClose, actions, label, children }) {
  const rootRef = useRef(null);
  useExitGhost(rootRef);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div ref={rootRef} className="mt-pop-bg fixed inset-0 z-50 grid place-items-center bg-[#03050a]/70 px-4 py-10 backdrop-blur-[5px]" onClick={onClose} role="presentation">
      <section role="dialog" aria-modal="true" aria-label={label || (typeof title === 'string' ? title : eyebrow)} onClick={(e) => e.stopPropagation()}
        className="mt-pop mt-cut mt-frame mt-glass flex max-h-[88vh] w-full flex-col shadow-[0_24px_60px_-12px_rgba(0,0,0,.8)]" style={{ '--c': '18px', '--a': a, maxWidth: width }}>
        <header className="flex items-start gap-4 border-b border-white/10 px-7 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="mt-lab">{eyebrow}</p>}
            <h2 className="mt-1 text-t1 font-black text-white">{title}</h2>
            {sub && <p className="mt-1 text-t3 text-gray-400">{sub}</p>}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="닫기" className="-mr-2 grid h-9 w-9 place-items-center text-gray-400 hover:text-white">
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          )}
        </header>
        <div className="mt-scroll min-h-0 flex-1 overflow-y-auto px-7 py-5">{children}</div>
        {actions && <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-7 py-4">{actions}</footer>}
      </section>
    </div>
  );
}

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
      <span className="absolute left-2.5 top-2 font-display text-t1 font-extrabold leading-none" style={{ color: a, textShadow: `0 0 18px ${a}80` }}>{player.overall}</span>
      <span className="absolute right-2.5 top-2.5 px-1.5 py-0.5 font-display text-t4 font-extrabold tracking-wider text-[#05080f]" style={{ background: a }}>{player.position}</span>
      {badge}
      <span className="absolute inset-x-2.5 bottom-[26px] truncate text-t3 font-bold text-white [text-shadow:0_2px_8px_#000]">{player.name}</span>
      <span className="absolute inset-x-2.5 bottom-2 truncate font-display text-t4 font-semibold tracking-wide text-gray-400">{player.year} {player.team} · {player.cost} CP</span>
    </div>
  );
};

/** 선수 초상 — public/profiles/<id>.webp 가 있으면 그것, 없으면 실루엣 */
export const Portrait = ({ player, w = 36, h = 46, color = '#334155', staff, round = false, t }) => (
  <span className={`mt-por ${round ? 'round' : ''}`} style={{ '--t': t,
    width: w, height: h,
    backgroundImage: `url(profiles/${encodeURIComponent(artId(player?.id || ''))}.webp), url(ui/mt/silhouette-${staff ? 'coach' : 'player'}.webp)`,
    boxShadow: `inset 0 0 0 1px ${color}99`,
  }} />
);

export const Bg = ({ img = 'ui/mt/mt-bg.webp', opacity = 0.9 }) => (
  <div className="fixed inset-0 overflow-hidden bg-[#05080f] bg-cover bg-center" style={{ backgroundImage: `url(${img})` }}>
    <div className="absolute inset-0" style={{ background: `radial-gradient(60% 50% at 50% 40%, rgba(124,58,237,.22), transparent 70%), radial-gradient(120% 90% at 50% 38%, rgba(7,9,19,${(1 - opacity * 0.6).toFixed(2)}), rgba(5,6,14,.95) 78%)` }} />
    <div className="mt-rays" /><div className="mt-dust" />
  </div>
);

/** 유리 결 배경 — 오른쪽 위에 tint(고른 선수 구단 색) 빛, 왼쪽 아래 초록 빛, 옅은 입자 */
const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";
export const GlassBg = ({ tint = '#10b981' }) => (
  <div className="fixed inset-0 overflow-hidden" style={{ background: `radial-gradient(60% 50% at 50% 42%,rgba(124,58,237,.24),transparent 70%),radial-gradient(900px 600px at 80% 12%,color-mix(in srgb,${tint} 26%,transparent),transparent 60%),radial-gradient(800px 700px at 10% 100%,rgba(16,185,129,.12),transparent 60%),linear-gradient(180deg,#080a16,#04060c)` }}>
    <div className="mt-rays" /><div className="mt-dust" />
    <div className="absolute inset-0 opacity-[0.14] mix-blend-overlay" style={{ backgroundImage: NOISE }} />
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
/* 칸 색 — 왼쪽 찬 물빛에서 오른쪽 금빛까지. 멀리 갈수록 진해지고 밝아진다 */
const CELL_HUE = [[0, 198], [0.26, 160], [0.46, 104], [0.64, 62], [0.82, 38], [1, 20]];
const cellTone = (t) => {
  let h = 36;
  for (let i = 1; i < CELL_HUE.length; i += 1) {
    const [p0, h0] = CELL_HUE[i - 1]; const [p1, h1] = CELL_HUE[i];
    if (t <= p1) { h = h0 + (h1 - h0) * ((t - p0) / (p1 - p0)); break; }
  }
  return `hsl(${h.toFixed(0)} ${(64 + 30 * t).toFixed(0)}% ${(45 + 12 * t).toFixed(0)}%)`;
};

/**
 * 능력치 칸 막대 — 칸 폭과 사이가 늘 정수라 눈금이 삐뚤어지지 않는다.
 * 40 이하는 빈 칸, 120 이면 꽉 참 — 70 과 90 의 차이가 한눈에 갈린다.
 * 색을 주지 않으면 칸마다 물빛 → 금빛으로 달아오르고, 끝 칸은 빛을 낸다.
 */
export const StatCells = ({ v, width = 202, cell = 10, gap = 2, lo = 40, hi = 120, color = null, h = 11 }) => {
  const n = Math.max(1, Math.floor((width + gap) / (cell + gap)));
  const on = Math.round(Math.max(0, Math.min(1, ((v ?? lo) - lo) / (hi - lo))) * n);
  return (
    <span className="flex" style={{ width: n * cell + (n - 1) * gap, height: h, gap }}>
      {Array.from({ length: n }, (_, i) => {
        if (i >= on) return <i key={i} style={{ width: cell, background: 'rgba(255,255,255,.07)' }} />;
        const tone = color || cellTone((i + 0.5) / n);
        const last = i === on - 1;
        return <i key={i} style={{ width: cell, background: tone, boxShadow: last ? `0 0 7px ${tone}` : undefined }} />;
      })}
    </span>
  );
};

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
export const TopBar = ({ section = '메인', eyebrow = '레전드 드래프트', team, account, onBack, right, steps, onSignOut }) => {
  const squad = team?.squad || [];
  const cap = team?.cap || SQUAD_CAP;
  const cost = squad.reduce((s, p) => s + (p.cost || 0), 0) + Object.values(team?.staff || {}).reduce((s, x) => s + (x?.cost || 0), 0);
  const over = cost > cap;
  return (
    <header className="relative z-10 flex h-[4.75rem] shrink-0 items-center gap-5 bg-[linear-gradient(180deg,rgba(5,8,15,.8),rgba(5,8,15,0))] px-7" style={{ viewTransitionName: 'mt-topbar' }}>
      {onBack && (
        <button type="button" onClick={onBack} aria-label="메인으로"
          className="mt-cut grid h-10 w-10 place-items-center bg-white/[0.07] text-t2 text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,.1)] hover:bg-white/[0.12]" style={{ '--c': '12px' }}>←</button>
      )}
      <div className="shrink-0 leading-none">
        <p className="text-t4 font-bold text-gray-400">{eyebrow}</p>
        <h1 className="mt-1 whitespace-nowrap text-t1 font-black leading-none text-white">{section}</h1>
      </div>
      {steps && <span className="h-9 w-px shrink-0 bg-white/10" aria-hidden="true" />}
      {steps && <div className="flex h-full min-w-0 items-stretch">{steps}</div>}
      <div className="ml-auto flex items-center gap-6">
        {team && (
          <div className="mt-cut mt-glass w-64 px-4 py-2" style={{ '--c': '14px', opacity: !over && cost < cap * CAP_LOUD ? 0.7 : 1 }}>
            <div className="flex items-baseline justify-between">
              <span className="text-t4 font-bold text-gray-400">남은 캡</span>
              {/* 남은 캡: 처음엔 가득 차 있고 영입할수록 줄어든다 */}
              <span className="font-display"><b className="text-t2" style={{ color: over ? '#f87171' : '#fff' }}>{(cap - cost).toLocaleString()}</b><small className="text-t4 text-gray-400"> / {cap.toLocaleString()}</small></span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <i className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, ((cap - cost) / cap) * 100))}%`, background: over ? '#f87171' : cost < cap * CAP_LOUD ? '#6b7280' : '#10b981', boxShadow: cost < cap * CAP_LOUD && !over ? 'none' : `0 0 8px ${over ? '#f87171' : '#10b981'}` }} />
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
      {st.flip && <div key={`o${st.n}`} className="mt-flipface out">{render(st.out)}</div>}
      <div key={`i${st.n}`} className={`mt-flipface ${st.flip ? 'in' : ''}`}>{render(value)}</div>
    </div>
  );
}

/** 사이드 네비 — 모드 탭을 세로로 세운 판. items: [{ key, label, sub, img }] */
/**
 * 위 탭 — 라커 · 상점 · 기록이 같이 쓰는 화면 안 메뉴(상단 바 steps 자리). 금빛 밑줄이 고른 탭.
 * items: [{ key, label, n?(옆 작은 숫자), badge?(금빛 알림 숫자) }]
 */
/** 위 탭 — 누르면 본문이 누른 쪽으로 밀리며 바뀌고, 금빛 밑줄은 옛 탭에서 새 탭으로 미끄러진다(TFT · FC 온라인 탭) */
export const TopTabs = ({ items, value, onChange, label = '메뉴' }) => {
  const cur = items.findIndex((it) => it.key === value);
  const pick = (it, i) => {
    if (it.key === value) return;
    navTo(() => onChange(it.key), i > cur ? 'tab-r' : 'tab-l');
  };
  return (
    <nav className="mt-tabs ml-2" aria-label={label}>
      {items.map((it, i) => (
        <button key={it.key} type="button" className={`mt-tab ${value === it.key ? 'on' : ''}`} aria-pressed={value === it.key} onClick={() => pick(it, i)}>
          {it.label}
          {it.n != null && <small className="n">{it.n}</small>}
          {!!it.badge && <b className="bd">{it.badge}</b>}
          {value === it.key && <i className="mt-tab-ink" aria-hidden="true" />}
        </button>
      ))}
    </nav>
  );
};

/** 큰 사진 머리 (오른쪽 상세 패널 위) — 시리즈 카드 문법 */
export const Hero = ({ img, ovr, name, color = '#10b981', h = 176, pos = '60% 18%' }) => (
  <div className="mt-cut relative shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '12px', height: h, backgroundImage: img, backgroundPosition: pos }}>
    <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.35),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,#05080f)' }} />
    {ovr != null && <span className="absolute left-3 top-2 font-display text-4xl font-extrabold" style={{ color, textShadow: `0 0 16px ${color}88,0 2px 4px #000` }}>{ovr}</span>}
    <b className="absolute bottom-2 left-3 right-3 truncate text-t1 font-black text-white">{name}</b>
  </div>
);

/** 오른쪽 패널의 키-값 줄 */
export const KV = ({ k, v, color = '#fff', sm = false }) => (
  <div className={`flex items-center justify-between border-b border-white/10 text-gray-300 ${sm ? 'py-1.5 text-t3' : 'py-2.5 text-t3'}`}>
    <span>{k}</span><b className={`font-display ${sm ? 'text-t3' : 'text-t2'}`} style={{ color }}>{v}</b>
  </div>
);

/** 작은 수치 칸 묶음 (모드 설명 패널의 시리즈·선수·난이도) */
export const Stats = ({ items }) => (
  <dl className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${items.length},1fr)` }}>
    {items.map(([k, v]) => (
      <div key={k} className="mt-cut bg-white/[0.045] px-3 py-1.5" style={{ '--c': '7px' }}>
        <dt className="text-t4 text-gray-400">{k}</dt>
        <dd className="font-display text-t2 font-bold leading-tight text-white">{v}</dd>
      </div>
    ))}
  </dl>
);
