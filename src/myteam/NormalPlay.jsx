/* 플레이 화면의 일반 대결 — 내 라커 26인으로: 단판 한 경기 또는 16 · 32 · 64강 토너먼트 (언제든 새로 열 수 있다) */
import React from 'react';
import { SQUAD_SIZE, SQUAD_CAP, squadCost, squadIssues, limitsOf } from './rules.js';
import { UiStyle, Btn, KV, Stats, teamStats } from './ui.jsx';
import { roundsOf, finishOf, meIndex } from './tournament.js';

const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const G = '#10b981', A = '#fbbf24';
export const FORMATS = ['single', 16, 32, 64];
export const FORMAT_LABEL = { single: '단판', 16: '16강', 32: '32강', 64: '64강' };

/** 형식 고르기 (단판 · 16강 · 32강 · 64강) */
export function FormatPicker({ value, onChange, a = G }) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="경기 방식">
      {FORMATS.map((f) => {
        const on = value === f;
        return (
          <button key={f} type="button" role="radio" aria-checked={on} onClick={() => onChange(f)}
            className={`ui-cut py-2 text-center font-display text-lg font-extrabold ${on ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400 hover:text-white'}`}
            style={{ '--c': '7px', background: on ? (f === 'single' ? a : A) : undefined }}>
            {FORMAT_LABEL[f]}
          </button>
        );
      })}
    </div>
  );
}

function SingleHero({ team, squad, ready, issues, onLocker }) {
  const st = teamStats(squad);
  const top = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 8);
  return (
    <section className="ui-cut ui-frame ui-glass flex min-h-0 flex-col p-5" style={{ '--c': '20px', '--a': G }}>
      <UiStyle />
      <div className="ui-cut relative min-h-0 flex-1 overflow-hidden bg-cover" style={{ '--c': '14px', backgroundImage: 'url(ui/broadcast-field.webp)', backgroundPosition: 'center 60%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f,rgba(5,8,15,.55) 45%,rgba(5,8,15,.1))' }} />
        <div className="absolute bottom-6 left-7">
          <p className="ui-lab font-display">Next Match</p>
          <p className="mt-1 text-5xl font-black text-white">{team.name || '나의 드림팀'} <span className="font-display text-gray-500">vs</span> 무작위 팀</p>
          <p className="mt-2 font-display text-lg" style={{ color: ready ? G : '#fde047' }}>
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
}

/** 토너먼트 소개: 보상 계단 (진행 중이면 지금 라운드 표시) */
export function TourneyHero({ size, t, name, squad }) {
  const rounds = roundsOf(size), finish = finishOf(size);
  const n = rounds.length;
  const steps = finish.map((f, i) => ({ ...f, label: i === n ? '우승' : i === n - 1 ? '준우승' : rounds[i].ko }));
  const reached = t ? (t.done ? t.place : t.round) : -1;
  const top = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 6);
  return (
    <section className="ui-cut ui-frame ui-glass relative flex min-h-0 flex-col overflow-hidden p-7 animate-[fade_.25s_ease-out_both]" style={{ '--c': '20px', '--a': A }}>
      <UiStyle />
      <span className="absolute inset-0 bg-cover opacity-30" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', backgroundPosition: 'center 60%' }} />
      <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 18%,rgba(5,8,15,.45))' }} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <p className="ui-lab font-display" style={{ '--a': A }}>Tournament · {size}</p>
        <h1 className="mt-2 text-6xl font-black text-white">{size}강 토너먼트</h1>
        <p className="mt-3 text-lg text-gray-300">{n}번 이기면 우승. 한 번 지면 끝.</p>
        <div className="mt-auto grid min-h-0 items-end gap-2.5" style={{ height: '52%', gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
          {steps.map((s, i) => {
            const champ = i === n;
            const mine = reached === i;
            return (
              <div key={s.ko} className="ui-cut flex flex-col justify-end p-3.5"
                style={{ '--c': '12px', height: `${30 + (i * 70) / n}%`, background: `linear-gradient(180deg, rgba(251,191,36,${0.05 + (i * 0.25) / n}), rgba(5,8,15,.6))`,
                  boxShadow: mine ? `inset 0 0 0 2px ${A}` : `inset 0 2px 0 ${champ ? A : 'rgba(251,191,36,.35)'}` }}>
                {champ && <span className="mb-auto text-center text-6xl leading-none">🏆</span>}
                {mine && <span className="mb-1 font-display text-xs font-bold tracking-[0.2em]" style={{ color: A }}>{t.done ? 'RESULT' : 'NOW'}</span>}
                <b className="font-display font-extrabold" style={{ fontSize: champ ? 34 : 24, color: champ ? A : '#fff' }}>{s.label}</b>
                <span className="font-display text-base text-gray-300">{s.gold} G</span>
              </div>
            );
          })}
        </div>
        {squad && (
          <div className="ui-cut mt-4 flex items-center gap-5 bg-white/[0.04] px-4 py-3" style={{ '--c': '10px' }}>
            <span className="ui-lab font-display" style={{ '--a': '#34d399' }}>My Team</span>
            <b className="text-xl text-white">{name}</b>
            <span className="text-gray-400">팀 종합 <b className="font-display text-xl text-white">{teamStats(squad).ovr || '-'}</b></span>
            <span className="ml-auto flex gap-1.5">
              {top.map((p) => (
                <span key={p.id} title={`${p.name} ${p.overall}`} className="ui-cut h-12 w-9 bg-[#0b1220] bg-cover"
                  style={{ '--c': '5px', backgroundImage: `url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`, backgroundPosition: '50% 10%' }} />
              ))}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * format: 'single' | 16 | 32 | 64 · onFormat 형식 바꾸기
 * onPlay 단판 시작 · onTourney(size, fresh) 토너먼트 대진표로(fresh 면 새 대진) · onLocker
 */
export function normalPanels({ account, format = 'single', onFormat, onPlay, onTourney, onLocker }) {
  const team = account.team || {};
  const squad = team.squad || [];
  const cap = team.cap || SQUAD_CAP;
  const issues = squadIssues(squad, team.staff, cap, limitsOf(team));
  const ready = issues.length === 0;
  const st = teamStats(squad);
  const rec = team.record || { w: 0, l: 0, d: 0 };
  const sp = squad.filter((p) => p.position === 'SP').sort((a, b) => b.overall - a.overall).slice(0, 2);
  const single = format === 'single';
  const cur = account.tournament?.size ? account.tournament : null; // 저장된 토너먼트 (옛 날짜형은 무시)
  const t = !single && cur && cur.size === format && !(cur.done && cur.claimed) ? cur : null; // 이 크기로 이어서 할 판
  const other = !single && cur && cur.size !== format && !(cur.done && cur.claimed) ? cur : null; // 다른 크기로 진행 중인 판
  const rounds = single ? null : roundsOf(format);
  const wins = t ? t.results.filter((rs) => rs.some((x) => x.winner === meIndex(t))).length : 0;
  const acc = single ? G : A;

  const main = single
    ? <SingleHero team={team} squad={squad} ready={ready} issues={issues} onLocker={onLocker} />
    : <TourneyHero key={format} size={format} t={t} name={team.name || '나의 드림팀'} squad={squad} />;

  const aside = (
    <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6" style={{ '--c': '20px', '--a': acc }}>
      <p className="ui-lab font-display" style={{ '--a': acc }}>{single ? 'Single Game' : `Tournament · ${format}`}</p>
      <h2 className="-mt-2 text-3xl font-black text-white">일반 대결</h2>
      <FormatPicker value={format} onChange={onFormat} />
      {single ? (
        <>
          <Stats items={[['팀 OVR', st.ovr || '-'], ['엔트리', `${squad.length}/${SQUAD_SIZE}`], ['CP', squadCost(squad, team.staff)]]} />
          <div>
            <KV k="선발" v={sp.map((p) => p.name).join(' · ') || '-'} color={G} />
            <KV k="승 / 무 / 패 보상" v="300 · 180 · 120 G" color="#fde047" />
            <KV k="내 전적" v={`${rec.w}승 ${rec.l}패 ${rec.d}무`} />
          </div>
        </>
      ) : (
        <>
          <Stats items={[['팀 OVR', st.ovr || '-'], ['진행', t ? (t.done ? finishOf(format)[t.place].ko : rounds[t.round].ko) : '-'], ['승리', `${wins}/${rounds.length}`]]} />
          <div>
            <KV k="참가" v={`${format}팀`} />
            <KV k="경기 수" v={`최대 ${rounds.length}`} />
            <KV k="우승 보상" v={`${finishOf(format)[rounds.length].gold} G`} color="#fde047" />
            <KV k="동점이면" v="팀 종합 높은 쪽" />
          </div>
          {other && <p className="text-sm text-amber-300">진행 중인 {other.size}강은 새로 시작하면 사라집니다</p>}
        </>
      )}
      {!ready && <p className="text-sm text-amber-300">{issues[0]}</p>}
      <div className="mt-auto flex flex-col gap-2">
        {!ready ? <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" onClick={onLocker}>라커에서 채우기 ›</button>
          : single ? <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" onClick={onPlay}>경기 시작 ▶</button>
            : t ? (
              <>
                <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={() => onTourney(format, false)}>
                  {t.done ? '결과 · 보상 받기 ▶' : `${rounds[t.round].ko} 대진표로 ▶`}
                </button>
                {!t.done && <button type="button" className="ui-btn ui-cut w-full py-2 text-sm" onClick={() => onTourney(format, true)}>새 대진으로 다시 시작</button>}
              </>
            ) : <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': A }} onClick={() => onTourney(format, true)}>{format}강 시작 ▶</button>}
      </div>
    </aside>
  );

  return { key: 'duel', label: '일반 대결', sub: single ? '단판 · 16 · 32 · 64강' : `${format}강 토너먼트${t ? ` · ${t.done ? '결과' : `${t.round + 1}/${rounds.length}`}` : ''}`, img: 'ui/broadcast-field.webp', neon: G, main, aside };
}
