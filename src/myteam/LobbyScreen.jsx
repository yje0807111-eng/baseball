/* 메인 — 세 칸: 왼쪽 내 팀 에이스(반짝이 카드 · 팀 요약 · 등급) · 가운데 오늘의 경기장(플레이 · 모드 넷) · 오른쪽 메뉴 넷 · 주간 과제 */
import React, { useEffect, useRef, useState } from 'react';
import { UiStyle, GlassBg, TopBar, KV, Btn, Portrait, Stats, teamStats, Pop } from './ui.jsx';
import { rankOf } from './rank.js';
import { teamNeon } from './teamColor.js';
import { teamFlag } from './teamArt.js';
import { SQUAD_CAP, squadCost, limitsOf } from './rules.js';
import { missionState, WEEK_BONUS, weekKey } from './missions.js';
import LEAGUE from '../data/leagueAverage.json';
import { artId } from '../data/artAlias.js';

/** 리그 평균: 적으로 나오는 시리즈 팀(구단 시즌 · 국가대표 · 레전드) 전체의 팀 수치 평균 — 한 번만 계산 */
/* 리그 평균은 미리 세어 둔 값을 읽는다 — 로비를 열자고 시즌 로스터 412개를 받지 않도록.
   데이터가 바뀌면 node scripts/league-average.mjs 로 다시 만든다 */
export const leagueAverage = () => LEAGUE;


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
      <div className="absolute inset-x-4 bottom-3">
        {label && <p className="mt-lab" style={{ '--a': a, fontSize: 12 }}>{label}</p>}
        <b className={`mt-1 block font-extrabold text-white ${big ? 'text-[44px] leading-tight' : 'text-t2'}`}>{title}</b>
        {desc && <span className="block truncate text-t4" style={{ color: a }}>{desc}</span>}
        {children}
      </div>
    </button>
  );
}

/** 오늘의 경기장: 제목 · 플레이 단추 · 모드 카드 넷(누르면 그 모드 탭으로) */
function MatchDay({ onPlay }) {
  const modes = [
    { tab: 'duel', name: '일반 대결', sub: '단판 · 토너먼트', c: '#10b981', img: 'ui/broadcast-field.webp' },
    { tab: 'ranked', name: '랭크전', sub: '정규시즌 · 등급', c: '#a78bfa', img: 'ui/stadium.webp' },
    { tab: 'mix', name: '드래프트', sub: '특정 시즌 · 전체 믹스', c: '#38e1ff', img: 'modes/mix.webp' },
    { tab: 'special', name: '특별 모드', sub: '규칙이 다른 세 모드', c: '#fbbf24', img: 'modes/legend.webp' },
  ];
  return (
    <section className="mt-cut mt-frame relative min-h-0 overflow-hidden" style={{ '--c': '22px', '--a': '#10b981',
      background: 'linear-gradient(180deg, rgba(5,8,15,.05), rgba(5,8,15,.35) 45%, rgba(5,8,15,.94)), url(ui/broadcast-field.webp) center/cover' }}>
      <div className="absolute inset-x-7 bottom-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="mt-lab">경기 모드</p>
            <b className="mt-1 block text-[52px] font-black leading-tight text-white">오늘의 경기장</b>
          </div>
          <button type="button" onClick={() => onPlay()} className="mt-btn pri" style={{ minHeight: 78, fontSize: 26, padding: '0 50px', borderRadius: 18 }}>
            플레이 ▶
          </button>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {modes.map((m) => (
            <button key={m.tab} type="button" onClick={() => onPlay(m.tab)}
              className="mt-cut relative h-[120px] overflow-hidden bg-cover bg-center text-left transition hover:-translate-y-0.5 hover:brightness-110"
              style={{ '--c': '16px', backgroundImage: `url(${m.img})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.14), inset 0 -3px 0 ${m.c}` }}>
              <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,8,15,.1), rgba(5,8,15,.9))' }} />
              <span className="absolute inset-x-3.5 bottom-3">
                <b className="block text-t2 font-extrabold text-white">{m.name}</b>
                <small className="block truncate text-t4 text-gray-300">{m.sub}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 이번 주 과제 셋 — 진행 막대 · 받을 보상. 누르면 기록 화면의 주간 과제로 */
function WeekCard({ account, onOpen }) {
  const list = missionState(account.week);
  const ready = list.filter((x) => x.done && !x.claimed).length;
  const bonusTaken = account.week?.key === weekKey() && account.week?.bonus;
  const A = '#fbbf24';
  return (
    <button type="button" onClick={onOpen} className="mt-cut mt-glass flex shrink-0 flex-col gap-3 px-5 py-4 text-left transition hover:brightness-125" style={{ '--c': '22px' }}>
      <div className="flex items-baseline gap-2">
        <p className="mt-lab" style={{ '--a': A }}>주간 과제</p>
        <small className="ml-auto text-t4 font-bold" style={{ color: ready ? A : '#6b7280' }}>
          {ready ? `받을 보상 ${ready}` : bonusTaken ? '보너스 받음 ✓' : <>보너스 <b style={{ color: A }}>{WEEK_BONUS} G</b></>}
        </small>
      </div>
      {list.map(({ m, n, done, claimed }) => (
        <div key={m.id} className="min-w-0">
          <span className="flex items-baseline gap-2 text-t3">
            <span className="min-w-0 flex-1 truncate" style={{ color: claimed ? '#6b7280' : '#e5e7eb' }}>{m.ko}</span>
            <b className="shrink-0 font-display text-t3" style={{ color: claimed ? '#6b7280' : done ? A : '#9ca3af' }}>{claimed ? '✓' : done ? '받기' : `${n}/${m.goal}`}</b>
          </span>
          <span className="relative mt-1.5 block h-1 overflow-hidden rounded-full bg-white/[0.08]"><i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(n / m.goal) * 100}%`, background: claimed ? '#4b5563' : A }} /></span>
        </div>
      ))}
    </button>
  );
}

/** 에이스 고르기 — 카드 그림이 있는 선수 가운데 종합이 가장 높은 선수(그림이 없으면 다음 선수) */
function useAce(squad) {
  const [ace, setAce] = useState(null);
  useEffect(() => {
    let live = true;
    const sorted = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 12);
    const tryOne = (i) => {
      if (!live) return;
      if (i >= sorted.length) { setAce(sorted[0] ? { p: sorted[0], art: null } : null); return; }
      const src = `cards/${encodeURIComponent(artId(sorted[i].id))}.webp`;
      const im = new Image();
      im.onload = () => { if (live) setAce({ p: sorted[i], art: src }); };
      im.onerror = () => tryOne(i + 1);
      im.src = src;
    };
    tryOne(0);
    return () => { live = false; };
  }, [squad.map((p) => p.id).join()]);
  return ace;
}

const POS_KO = { SP: '선발 투수', RP: '불펜 투수', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', OF: '외야수', DH: '지명타자' };

/** 왼쪽 — 내 팀 에이스: 구단 그림이 번지는 판 위에 반짝이 카드(마우스를 따라 기울어짐) · 팀 요약 세 칸 · 내 등급 */
function AcePanel({ account, team, onLocker }) {
  const squad = team.squad || [];
  const ace = useAce(squad);
  const p = ace?.p;
  const c = p ? teamNeon(p) : '#10b981';
  const flag = p ? teamFlag(p.team) : null;
  const ref = useRef(null);
  useEffect(() => {
    const move = (e) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      const near = Math.abs(x) < 1.1 && Math.abs(y) < 1.1;
      el.style.setProperty('--ry', `${near ? x * 14 : -6}deg`);
      el.style.setProperty('--rx', `${near ? -y * 10 : 2}deg`);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);
  const lim = limitsOf(team);
  const left = (team.cap || SQUAD_CAP) - squadCost(squad, team.staff || {});
  const ovr = squad.length ? Math.round(squad.reduce((n, x) => n + x.overall, 0) / squad.length) : 0;
  const rp = account.rank?.rp || 0;
  const r = rankOf(rp);
  const tierPct = r.next ? Math.min(100, ((rp - r.tier.min) / (r.next.min - r.tier.min)) * 100) : 100;
  return (
    <section className="mt-cut mt-glass relative flex min-h-0 flex-col overflow-hidden" style={{ '--c': '22px' }}>
      {/* 판 위쪽에 에이스 구단 그림이 흐리게 번지고, 카드 뒤로 구단 색 빛 */}
      {flag && <span className="pointer-events-none absolute inset-x-0 top-0 h-[62%] bg-cover bg-center opacity-35" style={{ backgroundImage: `url(ui/teams/bg-${flag.key}.webp)`, WebkitMaskImage: 'linear-gradient(#000 20%,transparent)', maskImage: 'linear-gradient(#000 20%,transparent)' }} />}
      <span className="pointer-events-none absolute left-1/2 top-[34%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${c}55, transparent 70%)` }} />

      <div className="relative flex items-center gap-2 px-6 pt-5">
        <p className="mt-lab" style={{ '--a': c }}>내 팀 에이스</p>
        <button type="button" onClick={onLocker} className="ml-auto rounded-full bg-white/[0.07] px-3 py-1 text-t4 font-bold text-gray-300 hover:bg-white/[0.12] hover:text-white">라커 ›</button>
      </div>

      {/* 반짝이 카드 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-8 py-4">
        {p ? (
          <div key={p.id} className="aspect-[2/3] h-full max-h-[440px] animate-[mtStaffIn_.45s_cubic-bezier(.2,.8,.2,1)_both]">
          <div ref={ref} className="mt-holo h-full w-full" style={{ '--t': c, backgroundImage: ace.art ? `url(${ace.art})` : 'url(ui/mt/silhouette-player.webp)' }}>
            <span className="bottom-3.5 left-4 flex flex-col">
              <small className="text-t4 text-gray-300">{POS_KO[p.position] || p.position} · {p.year} {p.team}</small>
              <b className="text-t1 font-black leading-tight text-white">{p.name}</b>
            </span>
            <b className="mt-ovr bottom-1.5 right-4 font-display text-[56px] font-extrabold leading-none">{p.overall}</b>
          </div>
          </div>
        ) : <div className="mt-sk aspect-[2/3] h-full max-h-[440px] rounded-[18px]" />}
      </div>

      {/* 팀 요약 세 칸 */}
      <div className="relative mx-5 grid grid-cols-3 gap-2">
        {[['팀 종합', ovr || '-', '#34d399'], ['엔트리', `${squad.length}/${lim.size}`, squad.length >= lim.size ? '#fff' : '#fbbf24'], ['남은 캡', left.toLocaleString(), left < 0 ? '#f87171' : '#fff']].map(([k, v, col]) => (
          <div key={k} className="mt-tile flex flex-col items-center gap-1 !px-2 !py-2.5">
            <span className="text-t4 text-gray-400">{k}</span>
            <b className="font-display text-t2 leading-none" style={{ color: col }}>{v}</b>
          </div>
        ))}
      </div>

      {/* 내 등급 */}
      <div className="relative mx-5 mb-5 mt-3 flex items-center gap-4 border-t border-white/[0.08] pt-4">
        <img src={`ui/rank/${r.tier.key}.webp`} alt={`${r.tier.ko} 엠블럼`} className="h-16 w-16 shrink-0 object-contain" style={{ filter: `drop-shadow(0 0 12px ${r.tier.c}66)` }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <b className="text-t2 font-black text-white">{r.tier.ko} {r.div}</b>
            <b className="ml-auto font-display text-t2" style={{ color: r.tier.c }}>{rp.toLocaleString()}</b>
            {r.next && <small className="font-display text-t4 text-gray-400">/ {r.next.min.toLocaleString()} RP</small>}
          </div>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><i className="block h-full rounded-full" style={{ width: `${Math.max(2, tierPct)}%`, background: `linear-gradient(90deg, ${r.tier.c}66, ${r.tier.c})`, boxShadow: `0 0 10px ${r.tier.c}` }} /></span>
          {r.next && <small className="mt-1.5 block text-t4 text-gray-400">{r.next.ko}까지 <b className="font-display text-t3 text-white">{(r.next.min - rp).toLocaleString()}</b> RP</small>}
        </div>
      </div>
    </section>
  );
}

function StarterNotice({ team, gold, onClose }) {
  const squad = team.squad || [];
  const top = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 4);
  return (
    <Pop eyebrow="스타터 스쿼드" title={`선수 ${squad.length}명 지급`} width={640} onClose={() => onClose(false)}
      actions={<><Btn onClick={() => onClose(false)}>닫기</Btn><Btn pri className="min-w-[200px]" onClick={() => onClose(true)}>내 라커로 ▶</Btn></>}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-2">
          {top.map((p) => (
            <div key={p.id} className="mt-cut flex items-center gap-2 bg-white/[0.045] p-2" style={{ '--c': '8px' }}>
              <Portrait player={p} w={34} h={42} color="#34d399" />
              <span className="min-w-0">
                <b className="block truncate text-t3 text-white">{p.name}</b>
                <small className="font-display text-t4 text-gray-400">{p.position} · {p.overall}</small>
              </span>
            </div>
          ))}
        </div>
        <Stats items={[['선수', `${squad.length}명`], ['팀 종합', teamStats(squad).ovr || '-'], ['보유 골드', `${(gold || 0).toLocaleString()} G`]]} />
        <div>
          <KV sm k="더 좋은 선수" v="골드로 영입" color="#fde047" />
          <KV sm k="CP" v="한 팀에 담는 한도" color="#34d399" />
          <KV sm k="경기 보상" v="승 300 · 무 180 · 패 120 G" />
          <KV sm k="방출" v="산 값의 절반 환급" />
        </div>
      </div>
    </Pop>
  );
}

/** 상점 정리 환급 — 없어진 권 · 부스트를 산 값만큼 돌려받은 내역 (한 번) */
function RefundNotice({ refund, onClose }) {
  return (
    <Pop eyebrow="상점 정리" a="#fde047" label="상점 정리 환급" onClose={() => onClose(false)}
      title={<>환급 <span className="font-display text-[#fde047]">{refund.gold.toLocaleString()} G</span></>}
      actions={<Btn pri a="#fde047" className="min-w-[200px]" onClick={() => onClose(false)}>받기</Btn>}>
      {refund.lines.map((l) => <KV key={l.name} sm k={`${l.name} · ${l.n}장`} v={`${l.gold.toLocaleString()} G`} color="#fde047" />)}
    </Pop>
  );
}

export default function LobbyScreen({ account, onLocker, onPlay, onShop, onAugments, onRecord, onWeek, onSignOut, onNotice }) {
  const team = account.team;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <GlassBg tint="#6366f1" />
      <TopBar section="메인" account={account} onSignOut={onSignOut} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-7 pb-6 pt-1"
        style={{ gridTemplateColumns: '380px minmax(0,1fr) 360px', gridTemplateRows: 'minmax(0,1fr)' }}>
        <AcePanel account={account} team={team} onLocker={onLocker} />

        {/* 경기 — 가장 큰 판: 제목 · 플레이 단추 + 모드 사진 카드 넷(누르면 그 모드 탭으로) */}
        <MatchDay onPlay={onPlay} />

        <div className="flex min-h-0 flex-col gap-3">
          <Tile img="ui/mt/tile-locker.webp" a="#34d399" title="내 라커" desc="선수 영입 · 타순 · 코치" onClick={onLocker} style={{ flex: 1 }} />
          <Tile img="ui/mt/tile-shop.webp" a="#fde047" title="상점" desc="선수 능력치 · 캡 늘리기" onClick={onShop} style={{ flex: 1 }} />
          <Tile img="ui/mt/mt-boost.webp" a="#c4b5fd" title="증강" desc="나올 증강 고르고 강화하기" onClick={onAugments} style={{ flex: 1 }} />
          <Tile img="ui/mt/tile-record.webp" a="#7dd3fc" title="기록" desc="경기 기록 · 도감 · 주간 과제" onClick={onRecord} style={{ flex: 1 }} />
          <WeekCard account={account} onOpen={onWeek || onRecord} />
        </div>
      </div>
      {account.notice === 'starter' && (team.squad || []).length > 0 && <StarterNotice team={team} gold={account.gold} onClose={(go) => onNotice?.(go)} />}
      {account.notice === 'refund' && account.refund && <RefundNotice refund={account.refund} onClose={(go) => onNotice?.(go)} />}
    </div>
  );
}
