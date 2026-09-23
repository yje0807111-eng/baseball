/* 메인 — 메트로 타일 배치: 큰 플레이 타일(모드 선택 화면으로) + 라커·상점·증강·기록 타일 + 아래 랭크 판 */
import React from 'react';
import { UiStyle, Bg, TopBar, teamStats } from './ui.jsx';
import { rankOf, rankSummary } from './rank.js';
import { AI_SERIES } from './aiTeam.js';

/** 리그 평균: 적으로 나오는 시리즈 팀(구단 시즌 · 국가대표 · 레전드) 전체의 팀 수치 평균 — 한 번만 계산 */
let leagueCache = null;
export function leagueAverage() {
  if (leagueCache) return leagueCache;
  const all = AI_SERIES.map((x) => teamStats(x.players));
  const mean = (k) => Math.round(all.reduce((n, t) => n + t[k], 0) / Math.max(1, all.length));
  leagueCache = { ovr: mean('ovr'), bat: mean('bat'), sp: mean('sp'), rp: mean('rp'), def: mean('def') };
  return leagueCache;
}


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

/** 오늘의 경기장: 모드 카드 넷 — 사진 · 이름 · 한 줄 */
function MatchDay({ onPlay }) {
  const modes = [
    { tab: 'duel', name: '일반 대결', sub: '단판 · 토너먼트', c: '#10b981', img: 'ui/broadcast-field.webp' },
    { tab: 'ranked', name: '랭크전', sub: '정규시즌 · 등급', c: '#a78bfa', img: 'ui/stadium.webp' },
    { tab: 'mix', name: '드래프트', sub: '특정 시즌 · 전체 믹스', c: '#38e1ff', img: 'modes/mix.webp' },
    { tab: 'special', name: '특별 모드', sub: '규칙이 다른 세 모드', c: '#fbbf24', img: 'modes/legend.webp' },
  ];
  return (
    <section className="mt-cut mt-frame relative overflow-hidden" style={{ '--c': '20px', '--a': '#10b981', gridColumn: '1 / span 2', gridRow: '1 / span 2',
      background: 'linear-gradient(180deg, rgba(5,8,15,.2), rgba(5,8,15,.55) 45%, rgba(5,8,15,.96)), url(ui/broadcast-field.webp) center/cover' }}>
      <div className="absolute inset-x-7 bottom-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="mt-lab" style={{ '--a': '#10b981' }}>Match Day</p>
            <b className="mt-1 block text-[52px] font-black leading-tight text-white">오늘의 경기장</b>
          </div>
          <button type="button" onClick={() => onPlay()} className="mt-btn pri" style={{ '--c': '14px', minHeight: 78, fontSize: 25, padding: '0 56px', boxShadow: '0 0 56px -10px rgba(16,185,129,.95)' }}>
            플레이 ▶
          </button>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {modes.map((m) => (
            <button key={m.tab} type="button" onClick={() => onPlay(m.tab)}
              className="mt-cut relative h-[120px] overflow-hidden bg-cover bg-center text-left transition hover:brightness-125"
              style={{ '--c': '10px', backgroundImage: `url(${m.img})`, boxShadow: `inset 0 -3px 0 ${m.c}` }}>
              <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,8,15,.1), rgba(5,8,15,.92))' }} />
              <span className="absolute inset-x-3 bottom-2.5">
                <b className="block text-[17px] font-extrabold text-white">{m.name}</b>
                <small className="block truncate text-[13px] text-gray-300">{m.sub}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 아래 줄: 랭크 판 (R2) — 엠블럼 · 등급 · RP / 다음 등급 RP · 남은 RP · 긴 막대(끝에 다음 등급 엠블럼) · 경기 MVP TOP 3 | 팀 스탯 */
function RankPanel({ account, team, onRecord }) {
  const rp = account.rank?.rp || 0;
  const r = rankOf(rp);
  const sum = rankSummary(account.history || []);
  const st = teamStats(team.squad || []);
  const c = r.tier.c;
  const lg = leagueAverage();
  const STATS = [['타선', st.bat, lg.bat, '#34d399', '#0e7490'], ['선발', st.sp, lg.sp, '#7dd3fc', '#6366f1'], ['불펜', st.rp, lg.rp, '#f87171', '#a21caf'], ['수비', st.def, lg.def, '#fde047', '#ea580c']];
  // 이번 등급 안 진행: 등급 시작 RP → 다음 등급 RP (단계 III · II · I 는 눈금)
  const goal = r.next ? r.next.min : rp;
  const tierPct = r.next ? Math.min(100, ((rp - r.tier.min) / (r.next.min - r.tier.min)) * 100) : 100;
  const MEDAL = ['#fbbf24', '#cbd5e1', '#d97706'];
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

        {/* 등급 · 분수형 목표 막대 · 경기 MVP TOP 3 */}
        <div className="flex min-w-0 flex-col justify-center gap-2.5">
          <div className="flex items-end gap-5">
            <div>
              <p className="mt-lab" style={{ '--a': c }}>Rank</p>
              <b className="text-[26px] font-black leading-tight text-white">{r.tier.ko} {r.div}</b>
            </div>
            <span className="font-display leading-none">
              <b className="text-[40px] font-extrabold" style={{ color: c, textShadow: `0 0 18px ${c}44` }}>{rp.toLocaleString()}</b>
              {r.next && <b className="text-xl font-extrabold text-slate-500"> / {goal.toLocaleString()}</b>}
            </span>
            {r.next && (
              <span className="ml-auto mr-[60px] text-right leading-none">
                <b className="font-display text-2xl font-extrabold text-white">{(goal - rp).toLocaleString()}</b>
                <small className="mt-0.5 block font-display text-[11px] font-bold tracking-[0.2em] text-gray-400">RP TO {r.next.ko}</small>
              </span>
            )}
          </div>
          {/* 다음 등급까지 긴 막대 — 단계 III · II · I 는 가는 눈금, 끝에 다음 등급 엠블럼 */}
          <div className="relative mr-[48px] h-1.5 bg-white/[0.08]">
            <i className="absolute inset-y-0 left-0" style={{ width: `${tierPct}%`, background: `linear-gradient(90deg, ${c}44, ${c})`, boxShadow: `0 0 10px ${c}` }} />
            {r.next && [1 / 3, 2 / 3].map((x) => <i key={x} className="absolute -inset-y-[3px] w-px bg-white/35" style={{ left: `${x * 100}%` }} />)}
            {r.next && (
              /* 엠블럼 그림이 세로로 길어 정사각 틀 안에 크게 넣고 가운데 맞춤 */
              <span className="absolute -right-[52px] top-1/2 h-11 w-11 -translate-y-1/2 overflow-hidden">
                {/* 다음 등급 색 빛 대신 배경에 묻히는 어두운 그림자 · 살짝 누른 채도 */}
                <img src={`ui/rank/${r.next.key}.webp`} alt={`${r.next.ko} 엠블럼`} className="absolute left-1/2 top-1/2 h-[68px] w-[68px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-85"
                  style={{ filter: 'saturate(.75) brightness(.9) drop-shadow(0 2px 6px rgba(0,0,0,.7))' }} />
              </span>
            )}
          </div>
          {/* 경기 MVP TOP 3: 얼굴 뒤에 큰 반투명 순위 숫자 */}
          <button type="button" onClick={onRecord} className="flex min-w-0 items-center gap-7 pt-1 text-left">
            {sum.mvps.length ? sum.mvps.map((m, i) => (
              <span key={m.id} className="relative flex items-center gap-2.5 pl-[18px]">
                <b className="absolute -left-1 top-1/2 -translate-y-1/2 font-display text-[52px] font-extrabold leading-none" style={{ color: `${MEDAL[i]}33` }}>{i + 1}</b>
                <span className="mt-cut relative h-10 w-8 shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '5px', backgroundImage: `url(profiles/${encodeURIComponent(m.id)}.webp), url(ui/mt/silhouette-player.webp)`, backgroundPosition: '50% 0' }} />
                <span className="relative leading-tight">
                  <b className="block whitespace-nowrap text-sm text-white">{m.name}</b>
                  <small className="font-display text-[11px]" style={{ color: MEDAL[i] }}>MVP {m.n}회</small>
                </span>
              </span>
            )) : <span className="font-display text-xs tracking-[0.24em] text-gray-500">MVP TOP 3 —</span>}
          </button>
        </div>

        {/* 팀 스탯 (오른쪽 아래) — 리그 평균이 가운데 세로선: 높으면 오른쪽 구단 색, 낮으면 왼쪽 붉게 */}
        <div className="flex h-full flex-col justify-center gap-2.5 border-l border-white/10 pl-5">
          <div className="flex items-baseline gap-2">
            <p className="mt-lab" style={{ '--a': '#10b981' }}>Team</p>
            <b className="ml-auto font-display text-3xl font-extrabold leading-none text-white">{st.ovr || '-'}</b><small className="text-xs text-gray-500">OVR</small>
          </div>
          <div className="flex flex-col gap-[9px]">
            {STATS.map(([k, v, avg, col, col2]) => {
              const d = v ? v - avg : 0;
              const up = d >= 0;
              return (
                <div key={k} className="grid items-center gap-2" style={{ gridTemplateColumns: '38px 1fr 30px 32px' }}>
                  <span className="text-[13px] font-bold text-white">{k}</span>
                  <div className="relative h-2.5 bg-white/[0.05]">
                    <i className="absolute -inset-y-[5px] left-1/2 w-px bg-white/45" />
                    {v > 0 && d !== 0 && (
                      <i className="absolute inset-y-0" style={{ [up ? 'left' : 'right']: '50%', width: `${Math.min(50, Math.abs(d) * 4.5)}%`,
                        background: up ? `linear-gradient(90deg, ${col2}, ${col})` : 'linear-gradient(270deg, #7f1d1d, #f87171)', boxShadow: `0 0 8px ${up ? col : '#f87171'}66` }} />
                    )}
                  </div>
                  <b className="text-right font-display text-[19px] font-extrabold leading-none" style={{ color: v ? '#fff' : '#4b5563' }}>{v || '-'}</b>
                  <b className="text-right font-display text-sm font-extrabold leading-none" style={{ color: !v ? '#4b5563' : up ? '#34d399' : '#f87171' }}>{v ? `${up ? '+' : ''}${d}` : ''}</b>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LobbyScreen({ account, onLocker, onPlay, onShop, onAugments, onRecord, onSignOut }) {
  const team = account.team;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg opacity={0.55} grad="linear-gradient(180deg,rgba(3,5,10,.94),rgba(3,5,10,.9))" />
      <TopBar section="메인" account={account} onSignOut={onSignOut} />

      <div className="relative grid min-h-0 flex-1 gap-3.5 px-6 py-4"
        style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr) minmax(0,0.62fr)' }}>

        {/* 경기 — 가장 큰 타일: 제목 · 플레이 버튼 + 모드 사진 카드 넷(누르면 그 모드 탭으로) */}
        <MatchDay onPlay={onPlay} />

        <Tile img="ui/mt/tile-locker.webp" a="#34d399" label="My Locker" title="내 라커"
          desc="선수 영입 · 타순 · 코치" onClick={onLocker} />

        <Tile img="ui/mt/tile-shop.webp" a="#fde047" label="Shop" title="상점"
          desc="선수 능력치 · 캡 늘리기" onClick={onShop} />

        <Tile img="ui/mt/mt-boost.webp" a="#c4b5fd" label="Augments" title="증강"
          desc="나올 증강 고르고 강화하기" onClick={onAugments} />

        <Tile img="ui/mt/tile-record.webp" a="#7dd3fc" label="Record" title="기록"
          desc="치른 경기 · 전적 · MVP" onClick={onRecord} />

        <RankPanel account={account} team={team} onRecord={onRecord} />
      </div>
    </div>
  );
}
