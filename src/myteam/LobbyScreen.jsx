/* 메인 — 메트로 타일 배치: 큰 플레이 타일(모드 선택 화면으로) + 라커·상점·증강·기록 타일 + 아래 랭크 판 */
import React from 'react';
import { SQUAD_SIZE, SQUAD_CAP, squadCost, squadIssues } from './rules.js';
import { UiStyle, Bg, TopBar, teamStats } from './ui.jsx';
import { rankOf, rankSummary } from './rank.js';


/** 메트로 타일 */
function Tile({ img, a, label, title, desc, style, onClick, disabled, children, big }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`mt-cut mt-frame group relative overflow-hidden text-left transition ${disabled ? 'opacity-50' : 'hover:brightness-110'}`}
      style={{
        '--c': big ? '20px' : '14px', '--a': a, ...style,
        background: `linear-gradient(180deg, rgba(5,8,15,.25), rgba(5,8,15,.94)), url(${img}) center/cover`,
      }}>
      <span className="absolute inset-0" style={{ background: `radial-gradient(90% 70% at 20% 100%, ${a}22, transparent 70%)` }} />
      <div className="absolute inset-x-5 bottom-4">
        {label && <p className="mt-lab" style={{ '--a': a, fontSize: 10 }}>{label}</p>}
        <b className={`mt-1 block font-extrabold text-white ${big ? 'text-[44px] leading-tight' : 'text-[24px]'}`}>{title}</b>
        {desc && <span className="text-[13px]" style={{ color: a }}>{desc}</span>}
        {children}
      </div>
    </button>
  );
}

/** 아래 줄: 랭크 판 (R2) — 엠블럼 · 등급/RP · 단계 막대 · 최근 10경기 · 시즌 MVP · 자주 쓴 증강 | 팀 스탯 */
function RankPanel({ account, team, onRecord }) {
  const rp = account.rank?.rp || 0;
  const r = rankOf(rp);
  const sum = rankSummary(account.history || []);
  const st = teamStats(team.squad || []);
  const c = r.tier.c;
  const STATS = [['타선', st.bat, '#34d399'], ['선발', st.sp, '#7dd3fc'], ['불펜', st.rp, '#f87171'], ['수비', st.def, '#fde047']];
  const segs = 40;
  const on = Math.round((r.inDiv / 100) * segs);
  return (
    <section className="mt-cut mt-frame mt-glass relative min-h-0 overflow-hidden" style={{ '--c': '16px', '--a': c, gridColumn: '1 / span 4' }}>
      <div className="absolute inset-y-0 right-0 w-[62%] bg-cover bg-right opacity-45" style={{ backgroundImage: 'url(ui/rank/room.webp)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 45%)', maskImage: 'linear-gradient(90deg,transparent,#000 45%)' }} />
      <div className="relative grid h-full items-center gap-6 px-6 py-2" style={{ gridTemplateColumns: '150px minmax(0,1fr) 300px', gridTemplateRows: 'minmax(0,1fr)' }}>
        {/* 엠블럼 */}
        <div className="relative h-[150px] w-[150px] shrink-0">
          <span className="absolute inset-[12%] rounded-full" style={{ background: `radial-gradient(circle, ${c}55, transparent 70%)` }} />
          <img src={`ui/rank/${r.tier.key}.webp`} alt={`${r.tier.ko} 엠블럼`} className="relative h-full w-full object-contain"
            style={{ WebkitMaskImage: 'radial-gradient(circle, #000 52%, transparent 70%)', maskImage: 'radial-gradient(circle, #000 52%, transparent 70%)' }} />
        </div>

        {/* 등급 · 막대 · 요약 */}
        <div className="flex min-w-0 flex-col justify-center gap-2.5">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <p className="mt-lab" style={{ '--a': c }}>Rank</p>
            <b className="text-[34px] font-black leading-none text-white">{r.tier.ko} {r.div}</b>
            <span className="font-display text-xl" style={{ color: c }}>{rp.toLocaleString()} RP</span>
            <span className="text-sm text-gray-400">{r.next ? `${r.next.ko}까지 ${r.toNext} RP · 약 ${Math.ceil(r.toNext / 20)}승` : '최고 등급'}</span>
            {sum.lastDelta != null && <span className={`ml-auto font-display text-sm ${sum.lastDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>최근 경기 {sum.lastDelta >= 0 ? '+' : ''}{sum.lastDelta}</span>}
          </div>
          <div>
            <div className="mb-1 flex justify-between font-display text-xs text-gray-400">
              <span>{r.tier.ko} {r.div}</span><span>{r.inDiv} / 100</span><span>{r.next ? (r.div === 'I' ? r.next.ko + ' III' : `${r.tier.ko} ${r.div === 'III' ? 'II' : 'I'}`) : ''}</span>
            </div>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${segs},1fr)`, height: 12 }}>
              {Array.from({ length: segs }, (_, i) => (
                <i key={i} className="block -skew-x-[24deg]" style={{ background: i < on ? c : 'rgba(255,255,255,.07)', boxShadow: i < on ? `0 0 6px ${c}` : undefined }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6 border-t border-white/10 pt-2.5">
            <button type="button" onClick={onRecord} className="text-left">
              <p className="font-display text-[10px] tracking-[0.25em] text-gray-400">최근 10경기{sum.winRate != null ? ` · ${sum.winRate}%` : ''}{sum.streak > 1 ? ` · ${sum.streak}연승` : ''}</p>
              <span className="mt-1 flex gap-1">
                {sum.form.length ? sum.form.map((x, i) => (
                  <i key={i} className="mt-cut grid h-5 w-5 place-items-center font-display text-[10px] font-extrabold not-italic text-[#05080f]" style={{ '--c': '3px', background: x === 'W' ? '#10b981' : x === 'L' ? '#f87171' : '#94a3b8' }}>{x}</i>
                )) : <span className="text-xs text-gray-500">아직 경기가 없습니다</span>}
              </span>
            </button>
            <div className="flex min-w-0 items-center gap-3">
              {sum.mvp && <span className="mt-cut h-11 w-9 shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '5px', backgroundImage: `url(profiles/${encodeURIComponent(sum.mvp.id)}.webp), url(ui/mt/silhouette-player.webp)`, backgroundPosition: '50% 0' }} />}
              <div className="min-w-0">
                <p className="font-display text-[10px] tracking-[0.25em] text-amber-300">SEASON MVP</p>
                <b className="block truncate text-base text-white">{sum.mvp ? `${sum.mvp.name}` : '—'}</b>
                {sum.mvp && <small className="text-xs text-gray-400">경기 MVP {sum.mvp.n}회</small>}
              </div>
            </div>
            <div className="min-w-0">
              <p className="mb-1 font-display text-[10px] tracking-[0.25em] text-gray-400">자주 쓴 증강</p>
              <div className="flex flex-wrap gap-1.5">
                {sum.augs.length ? sum.augs.map((a) => (
                  <span key={a.id} className="mt-cut bg-white/[0.05] px-2.5 py-0.5 text-sm text-white" style={{ '--c': '5px' }}>{a.name} <small className="font-display text-gray-500">{a.n}회</small></span>
                )) : <span className="text-xs text-gray-500">증강 기록 없음</span>}
              </div>
            </div>
          </div>
        </div>

        {/* 팀 스탯 (오른쪽 아래) */}
        <div className="flex h-full flex-col justify-center gap-1.5 border-l border-white/10 pl-5">
          <div className="flex items-baseline gap-2">
            <p className="mt-lab" style={{ '--a': '#10b981' }}>Team</p>
            <b className="ml-auto font-display text-3xl font-extrabold leading-none text-white">{st.ovr || '-'}</b><small className="text-xs text-gray-500">OVR</small>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {STATS.map(([k, v, col]) => (
              <div key={k} className="mt-cut flex items-baseline justify-between bg-white/[0.045] px-3 py-1" style={{ '--c': '6px', boxShadow: `inset 0 -2px 0 ${col}` }}>
                <small className="text-xs text-gray-400">{k}</small><b className="font-display text-xl" style={{ color: v ? col : '#4b5563' }}>{v || '-'}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LobbyScreen({ account, onLocker, onPlay, onShop, onAugments, onSignOut }) {
  const team = account.team;
  const squad = team.squad || [];
  const cap = team.cap || SQUAD_CAP;
  const cost = squadCost(squad, team.staff);
  const issues = squadIssues(squad, team.staff, cap);
  const ready = issues.length === 0;
  const rec = team.record || { w: 0, l: 0, d: 0 };
  const rating = squad.length ? Math.round(squad.reduce((s, p) => s + p.overall, 0) / squad.length) : 0;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg opacity={0.55} grad="linear-gradient(180deg,rgba(3,5,10,.94),rgba(3,5,10,.9))" />
      <TopBar section="메인" team={team} account={account} onSignOut={onSignOut} />

      <div className="relative grid min-h-0 flex-1 gap-3.5 px-6 py-4"
        style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr) minmax(0,0.62fr)' }}>

        {/* 경기 — 가장 큰 타일 */}
        <Tile big img="ui/broadcast-field.webp" a="#10b981" label="Play" title="플레이"
          desc={ready ? '일반 모드 · 기본 모드 · 특별 모드' : `일반 모드: ${issues[0]}`}
          style={{ gridColumn: '1 / span 2', gridRow: '1 / span 2' }} onClick={onPlay}>
          <div className="mt-5 flex items-center gap-4">
            <span className="mt-btn pri" style={{ '--c': '14px', minHeight: 78, fontSize: 25, padding: '0 56px', boxShadow: '0 0 56px -10px rgba(16,185,129,.95)' }}>
              플레이 ▶
            </span>
            <span className="text-[13px] text-gray-300">엔트리 {squad.length}/{SQUAD_SIZE} · 팀 종합 {rating || '-'}</span>
          </div>
        </Tile>

        <Tile img="ui/mt/tile-locker.webp" a="#34d399" label="My Locker" title="내 라커"
          desc={`${squad.length}/${SQUAD_SIZE} · ${cost.toLocaleString()}/${cap.toLocaleString()} CP`} onClick={onLocker} />

        <Tile img="ui/mt/tile-shop.webp" a="#fde047" label="Shop" title="상점"
          desc="훈련 · 부스트 · 계약서" onClick={onShop} />

        <Tile img="ui/mt/mt-boost.webp" a="#c4b5fd" label="Augments" title="증강"
          desc="증강 풀 · 제외 · 강화" onClick={onAugments} />

        <Tile img="ui/mt/tile-record.webp" a="#7dd3fc" label="Record" title="기록"
          desc={account.history?.length ? `최근 ${account.history[0].myRuns} : ${account.history[0].oppRuns}` : '아직 경기가 없습니다'} disabled />

        <RankPanel account={account} team={team} />
      </div>
    </div>
  );
}
