/* 세로로 든 태블릿·휴대폰에 "가로로 돌리면 제대로 보인다"고 한 번 알려준다.
   배치가 가로 기준이라 세로로는 위아래로 길게 늘어난다 — 막지는 않고, 닫으면 그대로 볼 수 있다. */
import React, { useEffect, useState } from 'react';

const PORTRAIT = '(orientation: portrait) and (pointer: coarse)';
const CUT = { clipPath: 'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)' };

export default function RotateHint() {
  const [portrait, setPortrait] = useState(() => !!window.matchMedia?.(PORTRAIT).matches);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.(PORTRAIT);
    if (!mq) return undefined;
    const on = (e) => { setPortrait(e.matches); if (e.matches) setClosed(false); };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  if (!portrait || closed) return null;

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-[#05080f]/95 px-8 backdrop-blur-sm">
      <div className="flex max-w-[26rem] flex-col items-center text-center">
        <svg viewBox="0 0 64 64" className="h-16 w-16 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <rect x="21" y="6" width="22" height="38" rx="3" />
          <rect x="20" y="44" width="40" height="22" rx="3" className="text-emerald-400/35" />
          <path d="M14 22a18 18 0 0 0 4 20" strokeLinecap="round" />
          <path d="M12 14v8h8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <b className="mt-5 font-display text-xs tracking-[0.35em] text-emerald-400">ROTATE</b>
        <p className="mt-1.5 text-[22px] font-bold text-white">가로로 돌려 주세요</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          라커·드래프트·경기 화면이 모두 가로에 맞춰 있습니다.
          기기를 눕히면 화면 크기에 맞게 알아서 맞춰 보여 드립니다.
        </p>
        <button type="button" onClick={() => setClosed(true)} style={CUT}
          className="mt-6 bg-white/[0.07] px-5 py-2.5 text-sm text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.2)]">
          세로로 그냥 보기
        </button>
      </div>
    </div>
  );
}
