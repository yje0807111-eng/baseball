/* 소리 단추 — 모든 화면 위쪽 바의 오른쪽 끝에 같은 모양(40px · 모서리 12px)으로 놓인다.
   누르면 아래로 배경음악 · 효과음 크기 · 음소거 판이 열린다(오른쪽 정렬, 프로필 창 소리 칸과 같은 설정). 화면마다 모양을 바꾸지 않는다 */
import { useEffect, useRef, useState } from 'react';
import { getSettings, onSettings, setSettings } from './bgm.js';
import { play as playSfx } from './sfx.js';

export function Speaker({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
      {off ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></>}
    </svg>
  );
}

/** 채널 하나 끄기 · 켜기 — 크기 막대 오른쪽. 끈 채널은 붉은 스피커, 켜진 채널은 흰 스피커 */
export function ChannelMute({ on, label, onToggle, size = 30 }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={!on} aria-label={`${label} ${on ? '끄기' : '켜기'}`} title={`${label} ${on ? '끄기' : '켜기'}`}
      className={`grid shrink-0 place-items-center rounded-lg transition ${on ? 'bg-white/[0.07] text-gray-200 hover:bg-white/[0.14]' : 'bg-red-500/15 text-[#f87171] shadow-[inset_0_0_0_1px_rgba(248,113,113,.45)] hover:bg-red-500/25'}`}
      style={{ width: size, height: size }}>
      <Speaker off={!on} />
    </button>
  );
}
/** 채널 설정 이름 — 크기 키 → 끄기 키 */
export const OFF_KEY = { vol: 'bgmOff', sfx: 'sfxOff' };
/** 이 채널이 켜져 있나(전체 음소거 · 채널 끄기 둘 다 아니면) — 단추 모양 */
export const channelOn = (s, key) => !s.muted && !s[OFF_KEY[key]];
/**
 * 채널 하나 끄기 · 켜기. 전체 음소거 중에 한 채널을 켜면 전체 음소거를 풀되 다른 채널은 꺼 둔다 — 누른 것만 들리게.
 * 크기가 0 이었으면 50 으로(켰는데 안 들리지 않게)
 */
export function toggleChannel(s, key) {
  const off = OFF_KEY[key];
  const other = OFF_KEY[key === 'vol' ? 'sfx' : 'vol'];
  if (channelOn(s, key)) { setSettings({ [off]: true }); return; }
  setSettings({ [off]: false, ...(s.muted ? { muted: false, [other]: true } : {}), ...((s[key] ?? 0) === 0 ? { [key]: 0.5 } : {}) });
}

export default function BgmButton({ className = '' }) {
  const [s, setS] = useState(getSettings);
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => onSettings(setS), []);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  const chOn = (key) => !s.muted && !s[OFF_KEY[key]] && (s[key] ?? 0) > 0; // 이 채널이 지금 들리나
  const off = !chOn('vol') && !chOn('sfx');
  const row = (key, label, onUp) => {
    const v = s[key] ?? 0;
    return (
      <>
        <div className="mt-2.5 flex items-center justify-between text-t4 text-gray-300 first:mt-0">
          <b className="font-bold">{label}</b>
          <span className="font-display text-t3" style={{ color: chOn(key) ? '#fff' : '#f87171' }}>{chOn(key) ? Math.round(v * 100) : '끔'}</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5">
          {/* 막대를 움직이면 그 채널을 다시 켠다 */}
          <input type="range" min="0" max="100" value={Math.round(v * 100)} aria-label={`${label} 크기`}
            onChange={(e) => setSettings({ [key]: Number(e.target.value) / 100, muted: false, [OFF_KEY[key]]: false })} onPointerUp={onUp}
            className="min-w-0 flex-1 accent-emerald-400" />
          <ChannelMute on={channelOn(s, key)} label={label} onToggle={() => toggleChannel(s, key)} />
        </div>
      </>
    );
  };
  return (
    <div ref={box} className={`relative shrink-0 ${className}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="소리" aria-expanded={open} title="소리 (M)"
        className={`grid h-10 w-10 place-items-center bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,.1),inset_0_0_0_1px_rgba(255,255,255,.08)] transition hover:bg-white/[0.12] ${off ? 'text-gray-500' : 'text-gray-200'}`}
        style={{ clipPath: 'inset(0 round 12px)' }}>
        <Speaker off={off} />
      </button>
      {open && (
        <div className={`absolute top-full z-50 mt-2 w-64 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(30,38,58,.92),rgba(8,12,22,.96))] px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-md right-0`}>
          {row('vol', '배경음악')}
          {row('sfx', '효과음', () => playSfx('goldIn'))}
          <button type="button" onClick={() => setSettings({ muted: !s.muted })}
            className="mt-3 w-full rounded-lg border border-white/15 py-1.5 text-t4 font-bold text-gray-200 hover:bg-white/10">
            {s.muted ? '전체 소리 켜기' : '전체 음소거 · M'}
          </button>
        </div>
      )}
    </div>
  );
}
