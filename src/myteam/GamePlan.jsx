/*
 * 작전판 — 정비에서 ⚙ 로 연다. 위에 상대 배너(엠블럼 · 이름 · 종합 · 약점 · 추천 적용), 아래 한 열로 작전 여덟 줄.
 * ★ 은 상대 약점을 되치는 쪽이다. 고르는 값은 정비가 들고 있고 이 판은 보여 주기만 한다.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { FINE, GROUPS, scoutTags, recommend } from './strategy.js';

const cut = (c) => ({ '--c': `${c}px` });
const HEX = 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)';
const W = '#fbbf24';
const mix = (c, p) => `color-mix(in srgb,${c} ${p}%,transparent)`;

const Tag = ({ children, color = W }) => (
  <span className="mt-cut px-2 py-0.5 text-[11px] font-bold" style={{ ...cut(4), background: mix(color, 16), boxShadow: `inset 0 0 0 1px ${color}55`, color }}>{children}</span>
);

/** 작전 한 줄 — 이름 + 선택지 셋. 추천 칸에는 별 */
function Row({ f, value, rec, onPick }) {
  return (
    <div className="flex items-center gap-2">
      <small className="w-[5.6rem] shrink-0 text-[11.5px] text-[#8b97a6]">{f.ko}</small>
      <span className="flex flex-1 gap-1">
        {f.opts.map((o) => {
          const on = value === o;
          const star = rec === o;
          return (
            <button key={o} type="button" onClick={() => onPick(o)}
              className="mt-cut relative flex-1 py-1.5 text-[11.5px] font-semibold"
              style={{ ...cut(4), background: on ? mix(f.color, 22) : 'rgba(255,255,255,.045)',
                boxShadow: on ? `inset 0 0 0 1px ${f.color}` : star ? `inset 0 0 0 1px ${W}66` : 'inset 0 0 0 1px rgba(255,255,255,.07)',
                color: on ? f.color : star ? W : '#94a3b8', fontWeight: on ? 800 : 600 }}>
              {star && <i className="absolute left-1 top-0.5 text-[8px] not-italic" style={{ color: W }}>★</i>}
              {o}
            </button>
          );
        })}
      </span>
    </div>
  );
}

export default function GamePlan({ opponent, plan, onFine, onApply, onClose }) {
  const tags = scoutTags(opponent);
  const rec = recommend(opponent);
  const emb = opponent?.emblem;
  const color = opponent?.color || '#60a5fa';
  const ovr = Math.round((opponent?.roster || []).reduce((s, p) => s + (p.overall || 0), 0) / Math.max(1, (opponent?.roster || []).length));

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center px-4" style={{ background: 'rgba(5,8,15,.74)' }} onClick={onClose}>
      <div role="dialog" aria-label="작전판" onClick={(e) => e.stopPropagation()}
        className="mt-cut w-[47.5rem] max-w-full p-6 animate-[rise_.28s_ease-out_both]"
        style={{ ...cut(18), background: 'linear-gradient(180deg,rgba(13,19,30,.97),rgba(6,10,19,.98))', boxShadow: `inset 0 0 0 1px ${W}44, 0 26px 60px -20px rgba(0,0,0,.9)` }}>
        {/* 상대 배너 */}
        <div className="mt-cut flex items-center gap-3.5 px-4 py-3" style={{ ...cut(12),
          background: `linear-gradient(90deg,${mix(color, 20)},rgba(255,255,255,.02) 62%)`, boxShadow: `inset 3px 0 0 ${color}` }}>
          {emb && <span className="mt-cut h-[2.9rem] w-[2.9rem] shrink-0 bg-cover" style={{ ...cut(7), backgroundImage: `url(${emb})`, backgroundPosition: 'center 26%' }} />}
          <span className="grid gap-0.5">
            <p className="mt-lab" style={{ '--a': color, fontSize: 10 }}>Next Opponent</p>
            <b className="text-[17px] text-white">{opponent?.name}</b>
          </span>
          <b className="ml-1 font-display text-[26px]" style={{ color }}>{ovr || '-'}</b>
          <span className="ml-2.5 flex flex-wrap gap-1.5">{tags.map((t) => <Tag key={t.label} color={t.c}>{t.label}</Tag>)}</span>
          <span className="ml-auto flex shrink-0 gap-2">
            <button type="button" onClick={onApply} className="mt-cut px-4 py-1.5 text-xs font-extrabold"
              style={{ ...cut(5), background: `linear-gradient(100deg,${mix(W, 26)},${mix(W, 12)})`, boxShadow: `inset 0 0 0 1px ${W}aa`, color: W }}>추천 적용 ★</button>
            <button type="button" onClick={onClose} className="mt-cut px-3.5 py-1.5 text-xs text-[#cbd5e1]"
              style={{ ...cut(5), background: 'rgba(255,255,255,.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>닫기</button>
          </span>
        </div>

        {/* 제목 */}
        <div className="mt-4 flex items-baseline gap-2.5">
          <p className="mt-lab" style={{ '--a': W }}>Game Plan</p>
          <b className="text-xl font-black text-white">작전판</b>
          <small className="text-[11px] text-[#6b7787]">★ 은 상대 약점을 되치는 쪽</small>
        </div>

        {/* 한 열로 여덟 줄 — 묶음 라벨만 끼운다 */}
        <div className="mt-3 grid gap-2.5">
          {GROUPS.map(([g, c]) => (
            <span key={g} className="grid gap-1.5">
              <span className="flex items-center gap-2">
                <i className="h-2 w-2 shrink-0" style={{ clipPath: HEX, background: c }} />
                <p className="mt-lab" style={{ '--a': c, fontSize: 10 }}>{g}</p>
                <i className="h-px flex-1" style={{ background: `linear-gradient(90deg,${c}44,transparent)` }} />
              </span>
              {FINE.filter((f) => f.g === g).map((f) => (
                <Row key={f.key} f={f} value={plan.fine[f.key]} rec={rec[f.key]} onPick={(o) => onFine(f.key, o)} />
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
