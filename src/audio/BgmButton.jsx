/* 소리 단추 — 모든 화면 위쪽 바의 오른쪽 끝에 같은 모양(40px · 모서리 12px)으로 놓인다.
   누르면 아래로 배경음악 · 효과음 크기 · 음소거 판이 열린다(오른쪽 정렬, 프로필 창 소리 칸과 같은 설정). 화면마다 모양을 바꾸지 않는다 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/** 채널 표시 — 배경음악은 보라 음표, 효과음은 금빛 반짝임(설정 창의 아이콘 칸) */
export const CHANNEL = {
  vol: { label: '배경음악', c: '#a78bfa', icon: <path d="M9 17.5V6l10-2v11.5M9 17.5a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 9 17.5zm10-2a2.5 2.5 0 1 1-2.5-2.5 2.5 2.5 0 0 1 2.5 2.5z" /> },
  sfx: { label: '효과음', c: '#fbbf24', icon: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9zM18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /> },
};
/** 크기 막대 — 채운 만큼 채널 색, 흰 손잡이(index.css .snd-range). 끈 채널은 회색 */
export function VolRange({ k, value, on, label, onChange, onUp, className = '' }) {
  return (
    <input type="range" min="0" max="100" value={value} aria-label={`${label} 크기`} onChange={onChange} onPointerUp={onUp}
      className={`snd-range min-w-0 flex-1 ${className}`} style={{ '--p': `${value}%`, '--c': on ? CHANNEL[k].c : '#4b5563' }} />
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
  const panel = useRef(null);
  /* 판은 body 맨 위 층(포털)에 단추 바로 아래로 — 위 바 안에 두면 뒤따르는 유리 판(backdrop-filter · 쌓임 맥락)이 판을 덮었다(토너먼트 대진표) */
  const [at, setAt] = useState(null);
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const b = box.current?.getBoundingClientRect();
    if (b) setAt({ top: b.bottom + 8, right: Math.max(8, window.innerWidth - b.right) });
    setOpen(true);
  };
  useEffect(() => onSettings(setS), []);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target) && !panel.current?.contains(e.target)) setOpen(false); };
    const shut = () => setOpen(false); // 창 크기가 바뀌면 자리가 어긋나니 닫는다
    window.addEventListener('pointerdown', close);
    window.addEventListener('resize', shut);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('resize', shut); };
  }, [open]);
  const chOn = (key) => !s.muted && !s[OFF_KEY[key]] && (s[key] ?? 0) > 0; // 이 채널이 지금 들리나
  const off = !chOn('vol') && !chOn('sfx');
  /* 채널 칸 — 위: 색 아이콘 · 이름 · 값 / 아래: 크기 막대 · 끄기 단추. 끈 채널은 아이콘 · 막대가 회색 */
  const row = (key, onUp) => {
    const v = Math.round((s[key] ?? 0) * 100);
    const { label, c, icon } = CHANNEL[key];
    const on = chOn(key);
    return (
      <div className="rounded-xl bg-white/[0.045] px-3 pb-3 pt-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg transition" style={{ color: on ? c : '#6b7280', background: on ? `${c}22` : 'rgba(255,255,255,.05)', boxShadow: on ? `inset 0 0 0 1px ${c}55` : 'none' }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill={key === 'sfx' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
          </span>
          <b className="text-t3 font-bold text-gray-100">{label}</b>
          <span className="ml-auto font-display text-t2 tabular-nums" style={{ color: on ? '#fff' : '#f87171' }}>{on ? v : '끔'}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          {/* 막대를 움직이면 그 채널을 다시 켠다 */}
          <VolRange k={key} value={v} on={on} label={label} onUp={onUp}
            onChange={(e) => setSettings({ [key]: Number(e.target.value) / 100, muted: false, [OFF_KEY[key]]: false })} />
          <ChannelMute on={channelOn(s, key)} label={label} onToggle={() => toggleChannel(s, key)} size={28} />
        </div>
      </div>
    );
  };
  return (
    <div ref={box} className={`relative shrink-0 ${className}`}>
      <button type="button" onClick={toggle} aria-label="소리" aria-expanded={open} title="소리 (M)"
        className={`grid h-10 w-10 place-items-center bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,.1),inset_0_0_0_1px_rgba(255,255,255,.08)] transition hover:bg-white/[0.12] ${off ? 'text-gray-500' : 'text-gray-200'}`}
        style={{ clipPath: 'inset(0 round 12px)' }}>
        <Speaker off={off} />
      </button>
      {open && at && createPortal(
        /* 유리 판 — 단추 아래 오른쪽 정렬, 0.18초 살짝 내려오며(자주 여는 것이라 짧게) */
        <div ref={panel} style={{ top: at.top, right: at.right }} className="snd-in fixed z-[85] flex w-72 flex-col gap-2 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(30,38,58,.94),rgba(8,12,22,.97))] p-3 shadow-[0_16px_40px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-md">
          <div className="flex items-center px-1 pb-0.5">
            <b className="font-display text-t4 font-bold tracking-[0.24em] text-gray-400">소리</b>
          </div>
          {row('vol')}
          {row('sfx', () => playSfx('goldIn'))}
          <button type="button" onClick={() => setSettings({ muted: !s.muted })} aria-pressed={s.muted}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-t3 font-bold transition ${s.muted ? 'bg-red-500/15 text-[#fca5a5] shadow-[inset_0_0_0_1px_rgba(248,113,113,.45)] hover:bg-red-500/25' : 'bg-white/[0.06] text-gray-200 hover:bg-white/[0.11]'}`}>
            <Speaker off={!s.muted} />
            {s.muted ? '전체 소리 켜기' : '전체 음소거'}
            <kbd className="rounded-md bg-white/10 px-1.5 font-display text-t4 text-gray-300">M</kbd>
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
