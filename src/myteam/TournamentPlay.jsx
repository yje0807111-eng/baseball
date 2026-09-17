/* 플레이 화면의 토너먼트 — 대진은 보이지 않고 오늘의 토너먼트 소개만: 가운데 보상 계단 · 오른쪽 입장 */
import React from 'react';
import { squadIssues, SQUAD_CAP } from './rules.js';
import { KV, Stats, teamStats } from './ui.jsx';
import { ROUNDS, FINISH, meIndex } from './tournament.js';

const A = '#fbbf24'; // 토너먼트 강조색
const dateLabel = (key) => { const [, m, d] = key.split('-'); return `${Number(m)}월 ${Number(d)}일`; };

function Hero({ t, entered, team, squad }) {
  const steps = FINISH.map((f, i) => ({ ...f, label: i === 5 ? '우승' : i === 4 ? '준우승' : ROUNDS[i].ko }));
  const reached = t && entered ? (t.done ? t.place : t.round) : -1;
  const top = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 6);
  return (
    <section className="ui-cut ui-frame ui-glass relative flex min-h-0 flex-col overflow-hidden p-7" style={{ '--c': '20px', '--a': A }}>
      <span className="absolute inset-0 bg-cover opacity-30" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', backgroundPosition: 'center 60%' }} />
      <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 18%,rgba(5,8,15,.45))' }} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <p className="ui-lab font-display" style={{ '--a': A }}>Today&apos;s Tournament · {t ? dateLabel(t.date) : ''}</p>
        <h1 className="mt-2 text-6xl font-black text-white">오늘의 32강 토너먼트</h1>
        <p className="mt-3 text-lg text-gray-300">다섯 번 이기면 우승. 한 번 지면 오늘은 끝.</p>
        <div className="mt-auto grid min-h-0 grid-cols-6 items-end gap-2.5" style={{ height: '52%' }}>
          {steps.map((s, i) => {
            const champ = i === 5;
            const mine = reached === i;
            return (
              <div key={s.ko} className="ui-cut flex flex-col justify-end p-3.5"
                style={{ '--c': '12px', height: `${30 + i * 14}%`, background: `linear-gradient(180deg, rgba(251,191,36,${0.05 + i * 0.05}), rgba(5,8,15,.6))`,
                  boxShadow: mine ? `inset 0 0 0 2px ${A}` : `inset 0 2px 0 ${champ ? A : 'rgba(251,191,36,.35)'}` }}>
                {champ && <span className="mb-auto text-center text-6xl leading-none">🏆</span>}
                {mine && <span className="mb-1 font-display text-xs font-bold tracking-[0.2em]" style={{ color: A }}>{t.done ? 'TODAY' : 'NOW'}</span>}
                <b className="font-display font-extrabold" style={{ fontSize: champ ? 34 : 24, color: champ ? A : '#fff' }}>{s.label}</b>
                <span className="font-display text-base text-gray-300">{s.gold} G{s.rp ? ` · +${s.rp} RP` : ''}</span>
              </div>
            );
          })}
        </div>
        <div className="ui-cut mt-4 flex items-center gap-5 bg-white/[0.04] px-4 py-3" style={{ '--c': '10px' }}>
          <span className="ui-lab font-display" style={{ '--a': '#34d399' }}>My Team</span>
          <b className="text-xl text-white">{team.name || '나의 드림팀'}</b>
          <span className="text-gray-400">팀 종합 <b className="font-display text-xl text-white">{teamStats(squad).ovr || '-'}</b></span>
          <span className="ml-auto flex gap-1.5">
            {top.map((p) => (
              <span key={p.id} title={`${p.name} ${p.overall}`} className="ui-cut h-12 w-9 bg-[#0b1220] bg-cover"
                style={{ '--c': '5px', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`, backgroundPosition: '50% 10%' }} />
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}

export function tournamentPanels({ account, tournament: t, onEnter, onLocker }) {
  const team = account.team || {};
  const squad = team.squad || [];
  const issues = squadIssues(squad, team.staff, team.cap || SQUAD_CAP);
  const ready = issues.length === 0;
  const st = teamStats(squad);
  const entered = !!account.tournament && account.tournament.date === t?.date;
  const wins = t ? t.results.filter((rs) => rs.some((x) => x.winner === meIndex(t))).length : 0;
  const state = !t || !entered ? '미입장' : t.done ? FINISH[t.place].ko : ROUNDS[t.round].ko;
  const label = !entered ? '토너먼트 입장 ▶' : t.done ? (t.claimed ? '오늘 대진표 보기 ›' : '결과 · 보상 받기 ▶') : `${ROUNDS[t.round].ko} 대진표로 ▶`;

  const aside = (
    <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6" style={{ '--c': '20px', '--a': A }}>
      <p className="ui-lab font-display" style={{ '--a': A }}>Today</p>
      <h2 className="-mt-2 text-3xl font-black text-white">토너먼트</h2>
      <p className="text-sm leading-relaxed text-gray-300">31팀과 32강부터 결승까지 겨룹니다. 하루에 한 번, 지면 그날은 끝납니다.</p>
      <Stats items={[['팀 OVR', st.ovr || '-'], ['오늘', state], ['승리', `${wins}/5`]]} />
      <div>
        <KV k="경기 수" v="최대 5" />
        <KV k="참가" v="32팀" />
        <KV k="동점이면" v="팀 종합 높은 쪽" />
      </div>
      {!ready && <p className="text-sm text-amber-300">{issues[0]}</p>}
      <div className="mt-auto">
        {ready
          ? <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={onEnter}>{label}</button>
          : <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" onClick={onLocker}>라커에서 채우기 ›</button>}
      </div>
    </aside>
  );

  return { key: 'tourney', label: '토너먼트', sub: entered ? `오늘의 32강 · ${state}` : '오늘의 32강', img: 'ui/broadcast-field.webp', neon: A, main: <Hero t={t} entered={entered} team={team} squad={squad} />, aside };
}
