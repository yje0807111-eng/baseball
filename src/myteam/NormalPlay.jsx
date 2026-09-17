/* 플레이 화면의 일반 모드 — 내 라커 26인으로 치르는 오늘의 경기 (가운데 배너 + 내 선수 / 오른쪽 경기 정보) */
import React from 'react';
import { SQUAD_SIZE, SQUAD_CAP, squadCost, squadIssues } from './rules.js';
import { UiStyle, Btn, KV, Stats, teamStats } from './ui.jsx';

const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');

export function normalPanels({ account, onPlay, onLocker }) {
  const team = account.team || {};
  const squad = team.squad || [];
  const cap = team.cap || SQUAD_CAP;
  const issues = squadIssues(squad, team.staff, cap);
  const ready = issues.length === 0;
  const st = teamStats(squad);
  const rec = team.record || { w: 0, l: 0, d: 0 };
  const top = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 8);
  const sp = squad.filter((p) => p.position === 'SP').sort((a, b) => b.overall - a.overall).slice(0, 2);

  const main = (
    <section className="ui-cut ui-frame ui-glass flex min-h-0 flex-col p-5" style={{ '--c': '20px', '--a': '#10b981' }}>
      <UiStyle />
      <div className="ui-cut relative min-h-0 flex-1 overflow-hidden bg-cover" style={{ '--c': '14px', backgroundImage: 'url(ui/broadcast-field.webp)', backgroundPosition: 'center 60%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f,rgba(5,8,15,.55) 45%,rgba(5,8,15,.1))' }} />
        <div className="absolute bottom-6 left-7">
          <p className="ui-lab font-display">Next Match</p>
          <p className="mt-1 text-5xl font-black text-white">{team.name || '나의 드림팀'} <span className="font-display text-gray-500">vs</span> AI 올스타</p>
          <p className="mt-2 font-display text-lg" style={{ color: ready ? '#10b981' : '#fde047' }}>
            {ready ? `팀 종합 ${st.ovr} · 승리 보상 300 G` : issues[0]}
          </p>
        </div>
      </div>
      <div className="flex items-baseline gap-3 pt-4">
        <p className="ui-lab font-display">My Squad</p>
        <p className="text-sm text-gray-400">{squad.length} / {SQUAD_SIZE} · 종합 상위 8명</p>
        <Btn sm className="ml-auto" onClick={onLocker}>내 라커 ›</Btn>
      </div>
      <div className="mt-2 grid h-40 shrink-0 grid-cols-8 gap-2">
        {top.map((p) => {
          const c = tone(p.overall);
          return (
            <div key={p.id} className="ui-cut relative h-full overflow-hidden bg-[#0b1220] bg-cover"
              style={{ '--c': '10px', backgroundImage: `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`, backgroundPosition: '60% 18%' }}>
              <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.4),rgba(5,8,15,0) 30%,rgba(5,8,15,.92) 70%)' }} />
              <span className="absolute left-2 top-1 font-display text-2xl font-extrabold" style={{ color: c, textShadow: `0 0 12px ${c}88` }}>{p.overall}</span>
              <span className="ui-cut absolute right-2 top-2 px-1.5 font-display text-[10px] font-extrabold text-[#05080f]" style={{ '--c': '4px', background: c }}>{p.position}</span>
              <b className="absolute bottom-1.5 left-2 right-2 truncate text-sm text-white">{p.name}</b>
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, 8 - top.length) }, (_, i) => (
          <button key={`e${i}`} type="button" onClick={onLocker} className="ui-cut grid place-items-center bg-white/[0.03] text-xs text-gray-500 shadow-[inset_0_0_0_1px_rgba(148,163,184,.18)]" style={{ '--c': '10px' }}>+ 영입</button>
        ))}
      </div>
    </section>
  );

  const aside = (
    <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6" style={{ '--c': '20px', '--a': '#10b981' }}>
      <p className="ui-lab font-display">Today</p>
      <h2 className="-mt-2 text-3xl font-black text-white">오늘의 경기</h2>
      <p className="text-sm leading-relaxed text-gray-300">내 라커의 26인과 코치진으로 AI 올스타와 한 경기를 치릅니다.</p>
      <Stats items={[['팀 OVR', st.ovr || '-'], ['엔트리', `${squad.length}/${SQUAD_SIZE}`], ['CP', squadCost(squad, team.staff)]]} />
      <div>
        <KV k="선발" v={sp.map((p) => p.name).join(' · ') || '-'} color="#10b981" />
        <KV k="승 / 무 / 패 보상" v="300 · 180 · 120 G" color="#fde047" />
        <KV k="내 전적" v={`${rec.w}승 ${rec.l}패 ${rec.d}무`} />
      </div>
      {!ready && <p className="text-sm text-amber-300">{issues[0]}</p>}
      <div className="mt-auto">
        {ready
          ? <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" onClick={onPlay}>경기 시작 ▶</button>
          : <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" onClick={onLocker}>라커에서 채우기 ›</button>}
      </div>
    </aside>
  );

  return { key: 'duel', label: '일반 대결', sub: `${squad.length}/${SQUAD_SIZE} · AI 올스타와 한 경기`, img: 'ui/broadcast-field.webp', neon: '#10b981', main, aside };
}
