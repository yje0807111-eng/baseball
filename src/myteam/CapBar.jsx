/* 샐러리 캡 막대 — 로비 · 정비 어디서나 같은 모양으로 쓰는 얇은 조각 */
import React from 'react';
import { capUse } from './rules.js';

/** team 만 주면 알아서 센다. sm 이면 한 줄짜리 작은 판 */
export default function CapBar({ team, sm = false, className = '' }) {
  const { cost, cap, left, over } = capUse(team);
  const c = over ? '#f87171' : left < cap * 0.04 ? '#fbbf24' : '#10b981';
  const w = Math.min(100, (cost / cap) * 100);
  return (
    <div className={`mt-cut ${sm ? 'px-3 py-1.5' : 'px-4 py-2.5'} ${className}`}
      style={{ '--c': '8px', background: 'rgba(255,255,255,.045)', boxShadow: `inset 0 0 0 1px ${c}44` }}>
      <div className="flex items-baseline gap-2">
        <span className={`font-display font-bold tracking-[0.2em] text-gray-500 ${sm ? 'text-[9.5px]' : 'text-[10px]'}`}>CP</span>
        <b className={`font-display font-extrabold tabular-nums ${sm ? 'text-[15px]' : 'text-[19px]'}`} style={{ color: c }}>{cost.toLocaleString()}</b>
        <span className={`text-gray-500 ${sm ? 'text-[11px]' : 'text-[12px]'}`}>/ {cap.toLocaleString()}</span>
        <b className={`ml-auto font-display font-bold tabular-nums ${sm ? 'text-[11.5px]' : 'text-[13px]'}`} style={{ color: over ? '#f87171' : '#9ca3af' }}>
          {over ? `${over.toLocaleString()} 초과` : `${left.toLocaleString()} 남음`}
        </b>
      </div>
      <i className={`mt-1.5 block bg-white/[0.08] ${sm ? 'h-[4px]' : 'h-[6px]'}`}>
        <b className="block h-full transition-[width] duration-300" style={{ width: `${w}%`, background: c }} />
      </i>
    </div>
  );
}
