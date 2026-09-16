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
    /* 스크롤바: 얇은 네온 바 + 어두운 홈 */
    .mt-scroll { scrollbar-width: thin; scrollbar-color: rgba(52,211,153,.55) rgba(255,255,255,.04); }
    .mt-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
    .mt-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,.035); border-radius: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); }
    .mt-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(52,211,153,.75), rgba(16,185,129,.45)); border: 2px solid transparent; background-clip: padding-box; box-shadow: 0 0 10px rgba(16,185,129,.35); }
    .mt-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(110,231,183,.95), rgba(16,185,129,.7)); background-clip: padding-box; }
    .mt-scroll::-webkit-scrollbar-thumb:active { background: linear-gradient(180deg, #6ee7b7, #10b981); background-clip: padding-box; }
    .mt-scroll::-webkit-scrollbar-corner { background: transparent; }
    /* 노란 계열 패널 안에서는 스크롤바도 노랗게 */
    .mt-scroll.gold { scrollbar-color: rgba(253,224,71,.55) rgba(255,255,255,.04); }
    .mt-scroll.gold::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(253,224,71,.8), rgba(202,138,4,.5)); background-clip: padding-box; box-shadow: 0 0 10px rgba(253,224,71,.3); }
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
 * 모든 화면이 함께 쓰는 상단 바 (S8 구획 + S5 CP 블록)
 *  [엠블럼·섹션] [팀 종합] [타선·선발·불펜·수비] [CP 게이지] [엔트리·외국인] [골드] [감독]
 */
export const TopBar = ({ section = '메인', team, account, onBack, right, warn }) => {
  const squad = team?.squad || [];
  const st = teamStats(squad);
  const cap = team?.cap || 2000;
  const cost = squad.reduce((s, p) => s + (p.cost || 0), 0) + Object.values(team?.staff || {}).reduce((s, x) => s + (x?.cost || 0), 0);
  const rec = team?.record || { w: 0, l: 0, d: 0 };
  const over = cost > cap;
  return (
    <header className="relative flex h-[78px] shrink-0 items-stretch border-b border-emerald-500/35 bg-[linear-gradient(180deg,rgba(4,7,12,.99),rgba(5,8,15,.7))]">
      <span className="mt-scan pointer-events-none absolute inset-0 opacity-50" />
      <span className="absolute -bottom-px left-0 h-0.5 w-[520px]" style={{ background: 'linear-gradient(90deg,#10b981,transparent)' }} />

      <Cell bg="rgba(16,185,129,.08)">
        {onBack
          ? <button type="button" onClick={onBack} className="mt-cut grid h-[50px] w-11 place-items-center bg-white/[0.06] text-lg text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]" style={{ '--c': '8px' }}>←</button>
          : <span className="mt-cut grid h-[50px] w-11 place-items-center bg-emerald-500 font-display text-[13px] font-extrabold text-[#05080f]" style={{ '--c': '8px' }}>MY</span>}
        <span>
          <p className="mt-lab" style={{ fontSize: 9 }}>Legend Draft</p>
          <b className="block text-[18px] font-extrabold text-white">{section}</b>
        </span>
      </Cell>

      <Cell>
        <b className="font-display text-[40px] font-extrabold leading-none text-white" style={{ textShadow: '0 0 24px rgba(16,185,129,.35)' }}>{st.ovr || '-'}</b>
        <span>
          <small className="block font-display text-[10px] tracking-[0.2em] text-gray-500">TEAM OVR</small>
          <span className="font-display text-[13px] text-emerald-400">{team?.name || '나의 드림팀'}</span>
        </span>
      </Cell>

      <Cell bg="rgba(255,255,255,.02)" px={20}>
        {[['타선', st.bat, '#34d399'], ['선발', st.sp, '#7dd3fc'], ['불펜', st.rp, '#f87171'], ['수비', st.def, '#fde047']].map(([k, v, c]) => (
          <span key={k} className="inline-flex min-w-[56px] flex-col items-center">
            <b className="font-display text-xl leading-none" style={{ color: v ? c : '#4b5563' }}>{v || '-'}</b>
            <small className="mt-1 font-display text-[10px] tracking-[0.14em] text-gray-500">{k}</small>
          </span>
        ))}
      </Cell>

      {/* 가운데 여백 — CP 는 오른쪽에 붙인다 */}
      <Cell grow line={false} px={0}>{warn && <span className="text-[11px] leading-tight text-amber-300">{warn}</span>}</Cell>

      {/* CP (S5 방식: 라벨 줄 + 눈금 게이지) */}
      <Cell px={20}>
        <span>
          <span className="flex items-center justify-between gap-4 font-display text-[11px] tracking-[0.16em] text-gray-500">
            SALARY CAP
            <b className="font-display text-[15px]" style={{ color: over ? '#f87171' : '#fff' }}>{cost.toLocaleString()} <span className="text-gray-600">/ {cap.toLocaleString()}</span></b>
          </span>
          <span className="mt-1.5 block"><SegBar pct={(cost / cap) * 100} width={210} ticks={21} over={over} /></span>
        </span>
      </Cell>

      <Cell bg="rgba(253,224,71,.06)" lc="rgba(253,224,71,.4)">
        <Chip a="#fde047">💰 <b className="font-display text-[15px] text-white">{(account?.gold ?? 0).toLocaleString()}</b> G</Chip>
      </Cell>

      <Cell line={false}>
        <span className="mt-cut h-[46px] w-[46px] bg-cover bg-center" style={{ '--c': '7px', backgroundImage: 'url(ui/mt/mt-card.webp)' }} />
        <span>
          <b className="block text-[13px] text-white">{account?.nick || '감독'}</b>
          <span className="text-[11px] text-gray-400">{rec.w}승 {rec.l}패 {rec.d}무</span>
        </span>
        {right}
      </Cell>
    </header>
  );
};
