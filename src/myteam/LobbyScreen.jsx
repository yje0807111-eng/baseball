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

/** 아래 줄: 랭크 판 (R2) — 엠블럼 · 등급/RP · 단계 막대 · 시즌 MVP | 팀 스탯 */
function RankPanel({ account, team, onRecord }) {
  const rp = account.rank?.rp || 0;
  const r = rankOf(rp);
  const sum = rankSummary(account.history || []);
  const last = account.rank?.seasons?.[0] || null; // 지난 랭크전 시즌
  const st = teamStats(team.squad || []);
  const c = r.tier.c;
  const STATS = [['타선', st.bat, '#34d399', '#0e7490'], ['선발', st.sp, '#7dd3fc', '#6366f1'], ['불펜', st.rp, '#f87171', '#a21caf'], ['수비', st.def, '#fde047', '#ea580c']];
  const segs = 40;
  const on = Math.round((r.inDiv / 100) * segs);
  // 바로 다음 단계(III → II → I → 다음 등급 III)와 남은 RP
  const nextStep = r.next ? (r.div === 'I' ? `${r.next.ko} III` : `${r.tier.ko} ${r.div === 'III' ? 'II' : 'I'}`) : '';
  const toStep = r.next ? 100 - r.inDiv : 0;
  return (
    <section className="mt-cut mt-frame mt-glass relative min-h-0 overflow-hidden" style={{ '--c': '16px', '--a': c, gridColumn: '1 / span 4' }}>
      {/* 배경: 관중석 휴대폰 불빛 띠(판 비율 1920×200) — 오른쪽 팀 스탯 뒤는 어둡게 */}
      <div className="absolute inset-0 bg-cover opacity-45" style={{ backgroundImage: 'url(ui/rank/crowd.webp)', backgroundPosition: 'center' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(5,8,15,.6), rgba(5,8,15,.3) 30%, rgba(5,8,15,.4) 60%, rgba(5,8,15,.9) 80%)' }} />
      <div className="relative grid h-full items-center gap-6 px-6 py-2" style={{ gridTemplateColumns: '150px minmax(0,1fr) 340px', gridTemplateRows: 'minmax(0,1fr)' }}>
        {/* 엠블럼 */}
        <div className="relative h-[150px] w-[150px] shrink-0">
          <span className="absolute inset-[18%] rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${c}40, transparent 70%)` }} />
          <img src={`ui/rank/${r.tier.key}.webp`} alt={`${r.tier.ko} 엠블럼`} className="relative h-full w-full object-contain" style={{ filter: `drop-shadow(0 0 14px ${c}55)` }} />
        </div>

        {/* 등급 · 막대 · 요약 */}
        <div className="flex min-w-0 flex-col justify-center gap-2.5">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <p className="mt-lab" style={{ '--a': c }}>Rank</p>
            <b className="text-[34px] font-black leading-none text-white">{r.tier.ko} {r.div}</b>
            <span className="font-display text-xl" style={{ color: c }}>{rp.toLocaleString()} RP</span>
            <span className="text-sm text-gray-400">{r.next ? `${nextStep}까지 ${toStep} RP` : '최고 등급'}</span>
            {last && <span className={`ml-auto font-display text-sm ${last.rp >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>시즌 {last.season} {last.place}위 {last.rp >= 0 ? '+' : ''}{last.rp}</span>}
          </div>
          <div>
            <div className="mb-1 flex justify-between font-display text-xs text-gray-300">
              <span>{r.tier.ko} {r.div}</span><span>{r.inDiv} / 100</span><span>{nextStep}</span>
            </div>
            {/* 단계 막대: 어두운 홈 위에 눈금 — 배경 사진에 묻히지 않게 */}
            <div className="mt-cut grid gap-[3px] bg-[#03060c]/90 p-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ '--c': '4px', gridTemplateColumns: `repeat(${segs},1fr)`, height: 18 }}>
              {Array.from({ length: segs }, (_, i) => (
                <i key={i} className="block -skew-x-[24deg]" style={{ background: i < on ? c : 'rgba(255,255,255,.16)', boxShadow: i < on ? `0 0 6px ${c}` : undefined }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6 border-t border-white/10 pt-2.5">
            <button type="button" onClick={onRecord} className="flex min-w-0 items-center gap-3 text-left">
              {sum.mvp && <span className="mt-cut h-11 w-9 shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '5px', backgroundImage: `url(profiles/${encodeURIComponent(sum.mvp.id)}.webp), url(ui/mt/silhouette-player.webp)`, backgroundPosition: '50% 0' }} />}
              <div className="min-w-0">
                <p className="font-display text-[10px] tracking-[0.25em] text-amber-300">SEASON MVP</p>
                <b className="block truncate text-base text-white">{sum.mvp ? `${sum.mvp.name}` : '—'}</b>
                {sum.mvp && <small className="text-xs text-gray-400">경기 MVP {sum.mvp.n}회</small>}
              </div>
            </button>
          </div>
        </div>

        {/* 팀 스탯 (오른쪽 아래) */}
        <div className="flex h-full flex-col justify-center gap-1.5 border-l border-white/10 pl-5">
          <div className="flex items-baseline gap-2">
            <p className="mt-lab" style={{ '--a': '#10b981' }}>Team</p>
            <b className="ml-auto font-display text-3xl font-extrabold leading-none text-white">{st.ovr || '-'}</b><small className="text-xs text-gray-500">OVR</small>
          </div>
          {/* 가로 막대 4줄: 얇은 선 · 두 색 그라데이션 + 끝 불빛 */}
          <div className="flex flex-col gap-2">
            {STATS.map(([k, v, col, col2]) => (
              <div key={k} className="grid items-center gap-3" style={{ gridTemplateColumns: '40px 1fr 36px' }}>
                <span className="text-[14px] font-bold text-white">{k}</span>
                <div className="relative h-[3px] bg-white/[0.08]">
                  <i className="absolute inset-y-0 left-0" style={{ width: `${v || 0}%`, background: `linear-gradient(90deg, ${col2}, ${col})`, boxShadow: `0 0 8px ${col}88` }} />
                  {v > 0 && <i className="absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45" style={{ left: `${v}%`, background: '#fff', boxShadow: `0 0 8px ${col}, 0 0 2px ${col}` }} />}
                </div>
                <b className="text-right font-display text-[22px] font-extrabold leading-none" style={{ color: v ? col : '#4b5563' }}>{v || '-'}</b>
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
        <Tile big img="ui/broadcast-field.webp" a="#10b981" label="Match Day" title="오늘의 경기장"
          desc={ready ? '내 팀으로 경기하거나, 드래프트 모드로 새 팀을 뽑아 붙어 보세요' : `내 팀 경기 전에: ${issues[0]}`}
          style={{ gridColumn: '1 / span 2', gridRow: '1 / span 2' }} onClick={onPlay}>
          {/* 들어가면 고를 수 있는 모드 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ['일반 모드', `내 팀 ${squad.length}/${SQUAD_SIZE}인 · 팀 종합 ${rating || '-'}`, '#10b981'],
              ['기본 모드', '전체 믹스 · 최근 시즌 · 연도별', '#38e1ff'],
              ['특별 모드', '올타임 레전드 · 가을의 왕조 · 태극마크', '#fbbf24'],
            ].map(([t, sub, col]) => (
              <span key={t} className="mt-cut bg-[#05080f]/75 px-3 py-1.5" style={{ '--c': '6px', boxShadow: `inset 3px 0 0 ${col}` }}>
                <b className="block text-[14px] text-white">{t}</b>
                <small className="text-[12px] text-gray-300">{sub}</small>
              </span>
            ))}
          </div>
          <div className="mt-5">
            <span className="mt-btn pri" style={{ '--c': '14px', minHeight: 78, fontSize: 25, padding: '0 56px', boxShadow: '0 0 56px -10px rgba(16,185,129,.95)' }}>
              플레이 ▶
            </span>
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
