/* 배경음악 단추 — 위쪽 바에 놓인다. 누르면 아래로 크기 조절 · 음소거 판이 열린다
   cut: 깎은 모서리 조각 — 메인 계열 위쪽 바는 mt-cut, 드래프트 위쪽 바는 ui-cut */
import { useEffect, useRef, useState } from 'react';
import { getSettings, onSettings, setSettings } from './bgm.js';

function Speaker({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
      {off ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></>}
    </svg>
  );
}

export default function BgmButton({ cut = 'mt-cut', size = 'h-10 w-10', edge = '12px', align = 'right' }) {
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
  const off = s.muted || s.vol === 0;
  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="배경음악" aria-expanded={open} title="배경음악 (M)"
        className={`${cut} grid ${size} place-items-center bg-white/[0.07] text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,.1)] hover:bg-white/[0.12] ${off ? 'text-gray-500' : ''}`} style={{ '--c': edge }}>
        <Speaker off={off} />
      </button>
      {open && (
        <div className={`absolute top-full z-50 mt-2 w-56 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(30,38,58,.92),rgba(8,12,22,.96))] px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-md ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="flex items-center justify-between text-t4 text-gray-300">
            <b className="font-bold">배경음악</b>
            <span className="font-display text-t3 text-white">{off ? '끔' : Math.round(s.vol * 100)}</span>
          </div>
          <input type="range" min="0" max="100" value={Math.round(s.vol * 100)} aria-label="배경음악 크기"
            onChange={(e) => setSettings({ vol: Number(e.target.value) / 100, muted: false })}
            className="mt-2 w-full accent-emerald-400" />
          <button type="button" onClick={() => setSettings({ muted: !s.muted })}
            className="mt-2 w-full rounded-lg border border-white/15 py-1.5 text-t4 font-bold text-gray-200 hover:bg-white/10">
            {s.muted ? '소리 켜기' : '음소거 · M'}
          </button>
        </div>
      )}
    </div>
  );
}
