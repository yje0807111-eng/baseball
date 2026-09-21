/*
 * 도장깨기 화면 (전체 화면) — 왼쪽: 일곱 구단이 약한 순서로 쌓인 탑 · 오른쪽: 나와 지금 상대의 수치 비교.
 * 아래층(1단 약체)부터 깨고 올라가며, 꼭대기(7단 강호)가 마지막 상대다.
 */
import React, { useLayoutEffect, useRef } from 'react';
import { GRADES, emblemOf, bannerEmblem } from './live.js';
import { currentRung, isCleared, myPos, record } from './gauntlet.js';

const GRADE_COLOR = { weak: '#4b5563', plain: '#0ea5e9', solid: '#f59e0b', ace: '#ef4444' };
const TRAIT_KO = { power: '한 방', mound: '마운드', value: '가성비', defense: '수비', balance: '균형', me: '나' };
const KEYS = [['bat', '타격'], ['pit', '마운드'], ['def', '수비'], ['str', '전력']];
const pct = (v, min = 62, max = 88) => Math.max(4, Math.min(100, ((v - min) / (max - min)) * 100));
const show = (k, v) => (k === 'str' ? v.toFixed(1) : v);

const Grade = ({ g, className = '' }) => (
  <span className={`ui-cut px-1.5 py-px text-[0.68rem] font-bold ${className}`}
    style={{ '--c': '4px', background: `${GRADE_COLOR[g]}2e`, boxShadow: `inset 0 0 0 1px ${GRADE_COLOR[g]}77`, color: GRADE_COLOR[g] }}>
    {GRADES[g]?.ko || '평범'}
  </span>
);
const Emb = ({ src, size, className = '', style }) => (
  <span className={`ui-cut shrink-0 bg-[#0b1220] bg-cover ${className}`}
    style={{ '--c': `${Math.round(size * 0.16)}px`, width: size, height: size, backgroundImage: `url(${src})`, backgroundPosition: 'center 26%', ...style }} />
);

/** 탑 한 칸 — 구단 하나(맨 아래는 나). 지나온 칸은 흐려지고, 다음 상대 칸과 내 칸만 빛난다 */
function Floor({ r, index, now, mine, cleared, top, width }) {
  const lit = now || mine;
  return (
    <div data-rung={r.club} className="relative mx-auto flex items-center gap-3 px-4 transition-[opacity,box-shadow,width,clip-path] duration-500"
      style={{ width, height: 84, paddingTop: top ? 14 : 0, opacity: cleared ? 0.5 : 1,
        background: lit ? `linear-gradient(180deg,${r.color}44,${r.color}18)` : cleared ? 'rgba(52,211,153,.07)' : 'rgba(255,255,255,.04)',
        boxShadow: lit ? `inset 0 0 0 2px ${r.color},0 0 40px -14px ${r.color}` : 'inset 0 0 0 1px rgba(255,255,255,.08)',
        clipPath: top ? 'polygon(50% 0,100% 24%,100% 100%,0 100%,0 24%)' : undefined }}>
      <b className="w-4 font-display text-xl" style={{ color: lit ? r.color : '#54606f' }}>{index}</b>
      <Emb src={r.key ? emblemOf(r.key) : bannerEmblem(null)} size={46} style={{ opacity: cleared ? 0.45 : 1 }} />
      <span className="grid w-[6.5rem] gap-0.5">
        <b className="truncate text-[0.95rem]" style={{ color: mine ? r.color : '#e8ecf2' }}>{r.short}</b>
        <small className="text-[0.7rem] text-[#8b97a6]">{TRAIT_KO[r.trait] || ''}</small>
      </span>
      <span className="ml-auto flex items-center gap-3">
        {KEYS.slice(0, 3).map(([k, ko]) => (
          <span key={k} className="ui-cut grid w-[3.4rem] justify-items-center gap-px py-1" style={{ '--c': '4px', background: 'rgba(255,255,255,.05)' }}>
            <small className="text-[0.6rem] text-[#6b7787]">{ko}</small>
            <b className="font-display text-base" style={{ color: r[k] >= 78 ? '#fbbf24' : '#cbd5e1' }}>{r[k]}</b>
          </span>
        ))}
        <b className="w-12 text-right font-display text-[1.35rem]" style={{ color: lit ? '#e8ecf2' : '#93a0af' }}>{r.str.toFixed(1)}</b>
        <b className="w-[3.6rem] text-right font-display text-[0.8rem] tracking-[0.14em]"
          style={{ color: mine ? r.color : cleared ? '#34d399' : now ? r.color : '#4b5563' }}>
          {mine ? 'ME' : cleared ? 'CLEAR' : now ? '▶ NOW' : ''}
        </b>
      </span>
    </div>
  );
}

export default function GauntletScreen({ gaunt, me, onPlay, onBack }) {
  const cur = currentRung(gaunt);
  const rec = record(gaunt);
  const base = 540, grow = 40;
  const myEmb = me.emblem || bannerEmblem(null);

  /* 자리가 바뀌면 칸이 미끄러져 오간다 — 새 자리에 그린 뒤 옛 자리에서 출발시킨다(FLIP) */
  const towerRef = useRef(null);
  const seatRef = useRef(new Map());
  useLayoutEffect(() => {
    const prev = seatRef.current;
    const now = new Map();
    towerRef.current?.querySelectorAll('[data-rung]').forEach((el) => {
      const id = el.dataset.rung;
      const top = el.getBoundingClientRect().top;
      now.set(id, top);
      const was = prev.get(id);
      if (was == null || Math.abs(was - top) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${was - top}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform .5s cubic-bezier(.2,.7,.3,1)';
        el.style.transform = '';
      });
    });
    seatRef.current = now;
  }, [gaunt]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col">
      <div className="ui-bg" style={{ backgroundImage: 'url(ui/gauntlet.webp)' }} aria-hidden="true" />
      {/* 머리 줄 */}
      <div className="relative flex h-14 items-center gap-3.5 px-7" style={{ background: 'rgba(6,10,19,.7)', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,.08)' }}>
        <button type="button" className="ui-btn ui-cut px-3 py-1.5 text-sm" style={{ '--c': '6px' }} onClick={onBack}>← 정비</button>
        <b className="font-display text-[0.95rem] tracking-[0.22em] text-[#7c8797]">도장깨기</b>
        <span className="ml-auto flex items-center gap-2.5">
          <Emb src={myEmb} size={30} />
          <b className="text-sm text-[#e8ecf2]">{me.name}</b>
          <b className="font-display text-sm text-[#fbbf24]">{rec.w}승 {rec.l}패</b>
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* 왼쪽: 탑 */}
        <div ref={towerRef} className="grid flex-1 place-content-center px-5 py-2">
          <b className="mb-2.5 text-center font-display text-[0.8rem] tracking-[0.3em] text-[#6b7787]">TOWER OF {gaunt.tower.length}</b>
          {gaunt.tower.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => (
            <Floor key={r.club} r={r.me ? { ...r, ...me.stats } : r} index={i} now={cur?.club === r.club} mine={!!r.me}
              cleared={isCleared(gaunt, i)} top={i === gaunt.tower.length - 1} width={base + (gaunt.tower.length - 1 - i) * grow} />
          ))}
          <div className="mx-auto h-4" style={{ width: base + (gaunt.tower.length - 1) * grow, background: 'rgba(255,255,255,.1)' }} />
        </div>

        {/* 오른쪽: 지금 상대와 수치 비교 */}
        <div className="grid w-[37.5rem] shrink-0 content-center justify-items-center gap-4 px-9 py-5" style={{ borderLeft: '1px solid rgba(255,255,255,.07)' }}>
          {cur ? (
            <>
              <b className="font-display text-[0.8rem] tracking-[0.3em] text-[#7c8797]">{myPos(gaunt)} → {myPos(gaunt) + 1} 칸 · 지금 상대</b>
              <span className="flex items-center gap-5">
                <span className="grid justify-items-center gap-1.5"><Emb src={myEmb} size={104} /><b className="max-w-[7rem] truncate text-sm text-[#e8ecf2]">{me.name}</b></span>
                <b className="font-display text-3xl text-[#7c8797]">VS</b>
                <span className="grid justify-items-center gap-1.5">
                  <Emb src={cur.key ? emblemOf(cur.key) : bannerEmblem(null)} size={104} />
                  <b className="text-sm text-[#e8ecf2]">{cur.short}</b>
                </span>
              </span>
              <span className="flex items-center gap-2.5">
                <Grade g={cur.grade} />
                <small className="text-[0.8rem] text-[#8b97a6]">{TRAIT_KO[cur.trait] || ''} · {cur.name}</small>
              </span>
              {/* 항목마다 몇 점 앞서는지 */}
              <span className="grid w-full gap-2.5">
                {KEYS.map(([k, ko]) => {
                  const d = Math.round((me.stats[k] - cur[k]) * 10) / 10;
                  const up = d >= 0;
                  return (
                    <span key={k} className="ui-cut flex h-[3.4rem] items-center gap-3 px-4"
                      style={{ '--c': '6px', background: 'rgba(255,255,255,.04)', boxShadow: `inset ${up ? 3 : -3}px 0 0 ${up ? '#34d399' : '#f87171'}` }}>
                      <small className="w-11 text-[0.78rem] text-[#8b97a6]">{ko}</small>
                      <b className="w-12 font-display text-[1.15rem] text-[#e8ecf2]">{show(k, me.stats[k])}</b>
                      <span className="relative h-2 flex-1" style={{ background: 'rgba(255,255,255,.07)' }}>
                        <i className="absolute bottom-0 top-0" style={{ left: '50%', width: `${Math.min(50, Math.abs(d) * 6)}%`,
                          transform: up ? 'none' : 'translateX(-100%)', background: up ? '#34d399' : '#f87171' }} />
                        <i className="absolute -bottom-1 -top-1 w-px" style={{ left: '50%', background: 'rgba(255,255,255,.25)' }} />
                      </span>
                      <b className="w-12 text-right font-display text-[1.15rem] text-[#93a0af]">{show(k, cur[k])}</b>
                      <b className="w-11 text-right font-display text-[0.95rem]" style={{ color: up ? '#34d399' : '#f87171' }}>{up ? '+' : ''}{d}</b>
                    </span>
                  );
                })}
              </span>
              <button type="button" className="ui-btn ui-cut pri mt-1 min-h-[3.2rem] px-12 text-lg" style={{ '--c': '9px' }} onClick={onPlay}>경기 시작</button>
            </>
          ) : (
            <>
              <b className="font-display text-2xl tracking-[0.2em] text-[#fbbf24]">ALL CLEAR</b>
              <p className="text-center text-sm text-[#b8c2ce]">탑 꼭대기에 올라섰다 · {rec.w}승 {rec.l}패</p>
              <button type="button" className="ui-btn ui-cut pri mt-2 min-h-[3.2rem] px-12 text-lg" style={{ '--c': '9px' }} onClick={onBack}>정비로</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
