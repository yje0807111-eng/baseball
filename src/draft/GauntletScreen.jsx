/*
 * 도장깨기 화면 (전체 화면) — 왼쪽: 여덟 구단이 전력 순으로 쌓인 탑(맨 아래 0번이 나) · 오른쪽: 바로 윗 칸 상대와의 수치 비교.
 * 이기면 그 칸을 빼앗아 한 칸 올라서고, 진 구단은 내 아래로 내려온다.
 * 칸의 '자세히'를 누르면 다른 칸은 한 줄로 접히고, 그 칸 아래로 구단의 수비 배치 · 투수진 · 벤치가 열린다.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { FIELD_SLOTS, PITCH_SLOTS, fillRoster, POS_LABEL } from '../KboAugmentDraft.jsx';
import { GRADES, emblemOf, bannerEmblem } from './live.js';
import { currentRung, isCleared, myPos, record } from './gauntlet.js';
import { artId } from '../data/artAlias.js';

const GRADE_COLOR = { weak: '#4b5563', plain: '#0ea5e9', solid: '#f59e0b', ace: '#ef4444' };
const TRAIT_KO = { power: '한 방', mound: '마운드', value: '가성비', defense: '수비', balance: '균형', me: '나' };
const KEYS = [['bat', '타격'], ['pit', '마운드'], ['def', '수비'], ['str', '전력']];
const pct = (v, min = 62, max = 88) => Math.max(4, Math.min(100, ((v - min) / (max - min)) * 100));
const show = (k, v) => (k === 'str' ? v.toFixed(1) : v);
/* 구장 위 자리 (%) — 라커(SquadBoard)와 같은 좌표를 쓴다 */
const XY = { OF2: [50, 13], OF1: [17, 26], OF3: [83, 26], SS: [34, 47], '2B': [66, 47], '3B': [16, 66], '1B': [84, 66], C: [50, 88], DH: [90, 88] };
const SKEW = (n) => `polygon(${n}px 0,100% 0,calc(100% - ${n}px) 100%,0 100%)`;
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const face = (p) => `url(profiles/${encodeURIComponent(artId(p.id))}.webp), url(ui/mt/silhouette-player.webp)`;
/* 칸 높이와 펼친 판 높이 — 판은 접힌 일곱 칸이 내준 만큼만 쓴다(84−46)×7. 그래서 탑 전체 높이가 늘 같고 칸이 오르내리지 않는다 */
const FLOOR_H = 92, FOLD_H = 38, PANEL_H = (FLOOR_H - FOLD_H) * 7;   // 판 378 — 접힌 일곱 칸이 내준 높이 그대로
const TOWER_H = FLOOR_H * 8 + 46;   // 여덟 칸 + 이름표와 바닥 — 이 높이는 여닫아도 바뀌지 않는다
/* 야수 자리 — KboAugmentDraft 와 서로 불러오는 사이라 모듈을 읽는 때가 아니라 그릴 때 센다 */
const batSlots = () => FIELD_SLOTS.filter((s) => !PITCH_SLOTS.includes(s.id)).map((s) => s.id);

const Grade = ({ g, className = '' }) => (
  <span className={`ui-cut px-1.5 py-px text-t4 font-bold ${className}`}
    style={{ '--c': '4px', background: `${GRADE_COLOR[g]}2e`, boxShadow: `inset 0 0 0 1px ${GRADE_COLOR[g]}77`, color: GRADE_COLOR[g] }}>
    {GRADES[g]?.ko || '평범'}
  </span>
);
const Emb = ({ src, size, className = '', style }) => (
  <span className={`ui-cut shrink-0 bg-[#0b1220] bg-cover ${className}`}
    style={{ '--c': `${Math.round(size * 0.16)}px`, width: size, height: size, backgroundImage: `url(${src})`, backgroundPosition: 'center 26%', ...style }} />
);

/** 탑 한 칸 — 구단 하나(맨 아래는 나). 다른 칸이 펼쳐져 있으면 한 줄로 접힌다 */
function Floor({ r, index, now, mine, cleared, top, width, open, folded, onMore }) {
  const lit = now || mine || open;
  const big = !folded;
  return (
    <div data-rung={r.club} className="relative mx-auto flex items-center transition-[opacity,box-shadow,width,height] duration-300 ease-out"
      style={{ width, height: big ? FLOOR_H : FOLD_H, gap: big ? 12 : 10, padding: top ? '14px 16px 0' : '0 16px', opacity: cleared ? 0.5 : 1,
        background: lit ? `linear-gradient(180deg,${r.color}44,${r.color}18)` : cleared ? 'rgba(52,211,153,.07)' : 'rgba(255,255,255,.04)',
        boxShadow: lit ? `inset 0 0 0 2px ${r.color},0 0 40px -14px ${r.color}` : 'inset 0 0 0 1px rgba(255,255,255,.08)',
        clipPath: top ? 'polygon(50% 0,100% 24%,100% 100%,0 100%,0 24%)' : undefined }}>
      <b className="w-5 font-display transition-all duration-300 ease-out" style={{ fontSize: big ? 21 : 14, color: lit ? r.color : '#54606f' }}>{index}</b>
      <Emb src={r.key ? emblemOf(r.key) : bannerEmblem(null)} size={big ? 52 : 26} className="transition-all duration-300 ease-out" style={{ opacity: cleared ? 0.45 : 1 }} />
      <span className="grid gap-[3px] transition-all duration-300 ease-out" style={{ width: big ? 184 : 92 }}>
        <b className="truncate transition-all duration-300 ease-out" style={{ fontSize: big ? 16.5 : 12.5, color: mine ? r.color : '#e8ecf2' }}>{r.short}</b>
        {/* 간판 선수 — 구단 색 세로선을 달아 이름 줄과 나눈다 */}
        {big && r.star && (
          <span className="flex items-center gap-1.5 pl-[7px]" style={{ boxShadow: `inset 2px 0 0 ${r.color}` }}>
            <b className="truncate text-t4 text-[#cbd5e1]">{r.star.name}</b>
            <b className="font-display text-t4" style={{ color: tone(r.star.overall) }}>{r.star.overall}</b>
          </span>
        )}
      </span>
      <span className="ml-auto flex items-center" style={{ gap: big ? 12 : 9 }}>
        {KEYS.slice(0, 3).map(([k, ko]) => (
          <span key={k} className="ui-cut grid justify-items-center gap-px transition-all duration-300 ease-out"
            style={{ '--c': '4px', width: big ? 58 : 42, padding: big ? '4px 0' : 0, background: big ? 'rgba(255,255,255,.05)' : 'transparent' }}>
            {big && <small className="text-t4 text-[#6b7787]">{ko}</small>}
            <b className="font-display transition-all duration-300 ease-out" style={{ fontSize: big ? 17 : 12.5, color: r[k] >= 78 ? '#fbbf24' : '#cbd5e1' }}>{r[k]}</b>
          </span>
        ))}
        <b className="w-14 text-right font-display transition-all duration-300 ease-out" style={{ fontSize: big ? 23 : 15, color: lit ? '#e8ecf2' : '#93a0af' }}>{r.str.toFixed(1)}</b>
        <b className="w-[2.6rem] text-right font-display text-t4 tracking-[0.12em]"
          style={{ color: mine ? r.color : cleared ? '#34d399' : now ? r.color : '#4b5563' }}>
          {mine ? '나' : cleared ? '통과' : now ? '지금' : ''}
        </b>
        <button type="button" onClick={onMore} className="ui-cut whitespace-nowrap px-2.5 py-1 text-t4 font-bold"
          style={{ '--c': '5px', background: open ? `${r.color}2e` : 'rgba(255,255,255,.06)',
            boxShadow: `inset 0 0 0 1px ${open ? r.color : 'rgba(255,255,255,.14)'}`, color: open ? r.color : '#a8b3c1' }}>
          {open ? '닫기 ▲' : '자세히 ▼'}
        </button>
      </span>
    </div>
  );
}

/* 펼친 판 — 구장 위 수비 아홉(라커와 같은 그림) · 선발과 불펜 · 벤치 */
const Cap = ({ children }) => <b className="text-t4 text-[#6b7787]">{children}</b>;
function Detail({ r, width }) {
  const full = fillRoster(r.roster || []);
  const by = {};
  full.forEach((p) => { if (p.slot) by[p.slot] = p; });
  const arms = PITCH_SLOTS.map((id) => ({ ...by[id], slot: id, label: FIELD_SLOTS.find((s) => s.id === id)?.label })).filter((p) => p.id);
  const bench = full.filter((p) => p.slot && p.slot.startsWith('BN'));
  return (
    <div className="ui-cut mx-auto flex gap-4 p-4" style={{ width, height: PANEL_H, '--c': '14px',
      background: 'linear-gradient(180deg,rgba(8,12,20,.94),rgba(8,12,20,.82))', boxShadow: `inset 0 0 0 1px ${r.color}44, inset 0 2px 0 ${r.color}` }}>
      {/* 구장 위 수비 배치 */}
      <div className="ui-cut relative h-full w-[26.5rem] shrink-0 overflow-hidden bg-cover"
        style={{ '--c': '10px', backgroundImage: 'url(ui/field.webp)', backgroundPosition: 'center 40%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,9,15,.35),rgba(5,9,15,.6))' }} />
        {batSlots().map((slot) => {
          const p = by[slot];
          const at = XY[slot];
          if (!p || !at) return null;
          return (
            <span key={slot} className="absolute flex items-center" style={{ left: `${at[0]}%`, top: `${at[1]}%`, transform: 'translate(-50%,-50%)' }}>
              <span className="h-[2.6rem] w-[2.1rem] shrink-0 bg-[#0b1220] bg-cover"
                style={{ clipPath: SKEW(7), backgroundPosition: 'center 8%', backgroundImage: face(p) }} />
              <span className="-ml-[4px] grid">
                <b className="whitespace-nowrap px-2 py-0.5 text-t4 text-white" style={{ clipPath: SKEW(6), background: 'rgba(6,10,19,.95)' }}>{p.name}</b>
                <b className="ml-1.5 whitespace-nowrap px-2 font-display text-t4 text-[#05080f]" style={{ clipPath: SKEW(5), background: r.color }}>
                  {POS_LABEL[p.position] || p.position} {p.overall}
                </b>
              </span>
            </span>
          );
        })}
      </div>
      {/* 투수진과 벤치 */}
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <Cap>투수진</Cap>
        <div className="grid grid-cols-2 gap-2">
          {arms.map((p) => (
            <span key={p.slot} className="ui-cut flex h-[3rem] items-center gap-2.5 px-2.5"
              style={{ '--c': '5px', background: 'rgba(255,255,255,.045)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
              <span className="ui-cut h-10 w-8 shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '5px', backgroundImage: face(p), backgroundPosition: 'center 6%' }} />
              <span className="grid min-w-0 flex-1 gap-px">
                <b className="truncate text-t3 text-[#e8ecf2]">{p.name}</b>
                <small className="text-t4 text-[#7c8797]">{p.label}</small>
              </span>
              <b className="font-display text-t2" style={{ color: tone(p.overall) }}>{p.overall}</b>
            </span>
          ))}
        </div>
        <span className="mt-1"><Cap>벤치</Cap></span>
        <div className="flex flex-wrap gap-1.5">
          {bench.length ? bench.map((p) => (
            <span key={p.slot} className="ui-cut flex items-center gap-2 px-2.5 py-1" style={{ '--c': '5px', background: 'rgba(255,255,255,.05)' }}>
              <small className="text-t4 text-[#8b97a6]">{POS_LABEL[p.position] || p.position}</small>
              <b className="text-t3 text-[#e8ecf2]">{p.name}</b>
              <b className="font-display text-t3" style={{ color: tone(p.overall) }}>{p.overall}</b>
            </span>
          )) : <small className="text-t4 text-[#6b7787]">예비 선수 없음</small>}
        </div>
      </div>
    </div>
  );
}

export default function GauntletScreen({ gaunt, me, onPlay, onBack }) {
  const cur = currentRung(gaunt);
  const rec = record(gaunt);
  const base = 700, grow = 26;
  const myEmb = me.emblem || bannerEmblem(null);
  /* 펼쳐 둔 구단(한 번에 하나)과, 화면에 그리는 판들(접히는 중인 것도 잠시 남는다) */
  const [openClub, setOpenClub] = useState(null);
  const [draw, setDraw] = useState([]);
  const timer = useRef(null);
  /*
   * 여닫는 동안 탑 전체 높이가 늘 같아야 칸이 오르내리지 않는다.
   * 판은 접힌 일곱 칸이 내준 높이(PANEL_H)만 쓰고, 칸을 바꿀 때는 옛 판이 접히는 만큼 새 판이 펼쳐진다.
   * 판을 높이 0 으로 한 번 그린 뒤(setTimeout 0)에 펼쳐야 칸이 접히는 것과 박자가 맞는다.
   */
  const toggle = (club) => {
    clearTimeout(timer.current);
    if (openClub === club) {                      // 닫기 — 판이 다 접힌 뒤에 치운다
      setOpenClub(null);
      timer.current = setTimeout(() => setDraw([]), 320);
      return;
    }
    setDraw((d) => (d.includes(club) ? d : [...d, club]));
    timer.current = setTimeout(() => {
      setOpenClub(club);
      timer.current = setTimeout(() => setDraw([club]), 340);  // 접힌 옛 판은 나중에 치운다
    }, 0);
  };

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
        <button type="button" className="ui-btn ui-cut px-3 py-1.5 text-t3" style={{ '--c': '6px' }} onClick={onBack}>← 정비</button>
        <b className="text-t1 font-black text-white">도장깨기</b>
        <span className="ml-auto flex items-center gap-2.5">
          <Emb src={myEmb} size={30} />
          <b className="text-t3 text-[#e8ecf2]">{me.name}</b>
          <b className="font-display text-t3 text-[#fbbf24]">{rec.w}승 {rec.l}패</b>
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* 왼쪽: 탑 */}
        <div className="grid min-w-0 flex-1 place-content-center overflow-hidden px-5 py-2">
        <div ref={towerRef} style={{ height: TOWER_H }}>
          <p className="mb-2.5 flex items-center gap-3 text-t3 font-extrabold text-[#f5d27a] before:h-px before:flex-1 before:bg-[#f5d27a]/40 before:content-[''] after:h-px after:flex-1 after:bg-[#f5d27a]/40 after:content-['']">도장 {gaunt.tower.length}곳</p>
          {gaunt.tower.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => {
            const open = openClub === r.club;
            const width = base + (gaunt.tower.length - 1 - i) * grow;
            const shown = r.me ? { ...r, ...me.stats } : r;
            return (
              <React.Fragment key={r.club}>
                <Floor r={shown} index={i} now={cur?.club === r.club} mine={!!r.me} cleared={isCleared(gaunt, i)}
                  top={i === gaunt.tower.length - 1} width={width} open={open} folded={openClub != null && !open}
                  onMore={() => toggle(r.club)} />
                {/* 펼친 판: 접힌 칸들이 내준 만큼만 자리를 쓴다(탑 전체 높이가 그대로라 다른 칸이 튀지 않는다) */}
                {draw.includes(r.club) && (
                  <div className="overflow-hidden transition-[height,opacity] duration-300 ease-out"
                    style={{ height: open ? PANEL_H : 0, opacity: open ? 1 : 0 }}>
                    <Detail r={shown} width={base + (gaunt.tower.length - 1) * grow + 60} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
          <div className="mx-auto h-4" style={{ width: base + (gaunt.tower.length - 1) * grow, background: 'rgba(255,255,255,.1)' }} />
        </div>
        </div>

        {/* 오른쪽: 지금 상대와 수치 비교 */}
        <div className="grid w-[37.5rem] shrink-0 content-center justify-items-center gap-4 px-9 py-5" style={{ borderLeft: '1px solid rgba(255,255,255,.07)' }}>
          {cur ? (
            <>
              <b className="font-display text-t4 tracking-[0.3em] text-[#7c8797]">{myPos(gaunt)} → {myPos(gaunt) + 1} 칸 · 지금 상대</b>
              <span className="flex items-center gap-5">
                <span className="grid justify-items-center gap-1.5"><Emb src={myEmb} size={104} /><b className="max-w-[7rem] truncate text-t3 text-[#e8ecf2]">{me.name}</b></span>
                <b className="font-display text-t1 text-[#7c8797]">VS</b>
                <span className="grid justify-items-center gap-1.5">
                  <Emb src={cur.key ? emblemOf(cur.key) : bannerEmblem(null)} size={104} />
                  <b className="text-t3 text-[#e8ecf2]">{cur.short}</b>
                </span>
              </span>
              <span className="flex items-center gap-2.5">
                <Grade g={cur.grade} />
                <small className="text-t4 text-[#8b97a6]">{TRAIT_KO[cur.trait] || ''} · {cur.name}</small>
              </span>
              {/* 항목마다 몇 점 앞서는지 */}
              <span className="grid w-full gap-2.5">
                {KEYS.map(([k, ko]) => {
                  const d = Math.round((me.stats[k] - cur[k]) * 10) / 10;
                  const up = d >= 0;
                  return (
                    <span key={k} className="ui-cut flex h-[3.4rem] items-center gap-3 px-4"
                      style={{ '--c': '6px', background: 'rgba(255,255,255,.04)', boxShadow: `inset ${up ? 3 : -3}px 0 0 ${up ? '#34d399' : '#f87171'}` }}>
                      <small className="w-11 text-t4 text-[#8b97a6]">{ko}</small>
                      <b className="w-12 font-display text-t2 text-[#e8ecf2]">{show(k, me.stats[k])}</b>
                      <span className="relative h-2 flex-1" style={{ background: 'rgba(255,255,255,.07)' }}>
                        <i className="absolute bottom-0 top-0" style={{ left: '50%', width: `${Math.min(50, Math.abs(d) * 6)}%`,
                          transform: up ? 'none' : 'translateX(-100%)', background: up ? '#34d399' : '#f87171' }} />
                        <i className="absolute -bottom-1 -top-1 w-px" style={{ left: '50%', background: 'rgba(255,255,255,.25)' }} />
                      </span>
                      <b className="w-12 text-right font-display text-t2 text-[#93a0af]">{show(k, cur[k])}</b>
                      <b className="w-11 text-right font-display text-t3" style={{ color: up ? '#34d399' : '#f87171' }}>{up ? '+' : ''}{d}</b>
                    </span>
                  );
                })}
              </span>
              <button type="button" className="ui-btn ui-cut pri mt-1 min-h-[3.2rem] px-12 text-t2" style={{ '--c': '9px' }} onClick={onPlay}>경기 시작</button>
            </>
          ) : (
            <>
              <b className="text-t1 font-black text-[#fbbf24]">탑 완주</b>
              <p className="text-center text-t3 text-[#b8c2ce]">탑 꼭대기에 올라섰다 · {rec.w}승 {rec.l}패</p>
              <button type="button" className="ui-btn ui-cut pri mt-2 min-h-[3.2rem] px-12 text-t2" style={{ '--c': '9px' }} onClick={onBack}>정비로</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
