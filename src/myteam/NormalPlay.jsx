/* 플레이 화면의 일반 대결 — 내 라커 26인으로: 단판 한 경기 또는 16 · 32 · 64강 토너먼트 (언제든 새로 열 수 있다) */
import React from 'react';
import { SQUAD_SIZE, SQUAD_CAP, squadCost, squadIssues, foreignCount } from './rules.js';
import { UiStyle, Btn, KV, Stats, teamStats } from './ui.jsx';
import { roundsOf, finishOf, meIndex } from './tournament.js';
import { AI_SERIES, seriesTeam, seriesName } from './aiTeam.js';
import { saveNextDuel, peekNextDuel } from './store.js';



const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const G = '#10b981', A = '#fbbf24';
export const FORMATS = ['single', 16, 32, 64];
export const FORMAT_LABEL = { single: '단판', 16: '16강', 32: '32강', 64: '64강' };

/* ───── 단판: 오늘 상대 + 최근 5경기 ───── */
/** 승패 칸 — 형식 고르개와 같은 생김새 */
const RESULT = { my: ['승', G], opp: ['패', '#f87171'], draw: ['무', '#94a3b8'] };

/** 오늘 상대 — 라벨 · 이름 · 네 부문 칸 · 상대 선발 줄 */
function OppPreview({ opp }) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        {opp.emblem && <span className="block h-9 w-9 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(ui/clubs/${opp.emblem}.webp)` }} />}
        <b className="min-w-0 flex-1 truncate text-xl font-black text-white">{opp.name}</b>
        <b className="font-display text-2xl" style={{ color: G }}>{opp.ovr}</b>
      </div>
      <Stats items={opp.parts} />
      {opp.starter && (
        <div>
          <KV k="상대 선발" v={`${opp.starter.name} ${opp.starter.overall}`} color="#f87171" />
        </div>
      )}
    </>
  );
}

/** 최근 5경기 — 승패 칸 한 줄 + 상대 · 점수 줄 */
function RecentGames({ games }) {
  if (!games.length) return <p className="text-sm text-gray-500">아직 치른 경기가 없습니다</p>;
  return (
    <>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${games.length},1fr)` }}>
        {games.map((g, i) => {
          const [ko, c] = RESULT[g.winner] || RESULT.draw;
          return (
            <span key={i} className="ui-cut py-1.5 text-center font-display text-base font-extrabold"
              style={{ '--c': '6px', color: g.winner === 'my' ? '#05080f' : c, background: g.winner === 'my' ? c : 'rgba(255,255,255,.06)' }}>{ko}</span>
          );
        })}
      </div>
      <div>
        {games.map((g, i) => (
          <KV key={i} k={g.opp} v={`${g.myRuns} : ${g.oppRuns}`} color={(RESULT[g.winner] || RESULT.draw)[1]} />
        ))}
      </div>
    </>
  );
}
const WC = { my: G, opp: '#f87171', draw: '#94a3b8' };
const WK = { my: '승', opp: '패', draw: '무' };
const emblemOf = (name) => (/레전드/.test(name) ? 'legend' : /대표|코리아|프리미어|WBC|올림픽/.test(name) ? 'korea' : null);
const avgOf = (xs, g) => (xs.length ? Math.round(xs.reduce((n, p) => n + g(p), 0) / xs.length) : 0);

/** 참가 후보 팀(시리즈) 전력 — 시작 전 토너먼트 판에서 쓴다 */
const POOL = AI_SERIES.map((x) => ({ id: x.id, name: seriesName(x), ovr: avgOf(x.players, (p) => p.overall) })).sort((a1, b1) => b1.ovr - a1.ovr);
const poolRank = (ovr) => POOL.filter((x) => x.ovr > (ovr || 0)).length + 1;
/** 라운드가 올라갈수록 센 팀을 만난다 — 후보 전력 분포에서 위에서부터 잘라 평균 */
function roadOf(size) {
  const rs = roundsOf(size), fin = finishOf(size);
  return rs.map((r, i) => {
    const share = Math.max(1, Math.round(POOL.length / 2 ** (i + 1)));
    const slice = POOL.slice(0, share);
    return { ko: r.ko, ovr: Math.round(slice.reduce((n, x) => n + x.ovr, 0) / slice.length), gold: fin[i + 1].gold };
  });
}

/** 다음 단판 상대 — 한 번 뽑아 두고 경기도 이 상대로 치른다 (경기가 끝나면 다시 뽑힌다) */
function nextDuel() {
  const pinned = AI_SERIES.find((x) => x.id === peekNextDuel()); // 저장된 값을 바로 읽는다 (화면 상태는 늦게 따라오므로)
  const series = pinned || AI_SERIES[Math.floor(Math.random() * AI_SERIES.length)];
  if (!pinned) saveNextDuel(series.id);
  const t = seriesTeam(series, () => 0.4);
  const bats = t.roster.filter((p) => p.type === 'batter');
  const pits = [...t.roster.filter((p) => p.type === 'pitcher')].sort((x, y) => y.overall - x.overall);
  return {
    name: seriesName(series),
    emblem: emblemOf(series.title || ''),
    starter: pits[0],
    ovr: avgOf(t.roster, (p) => p.overall),
    parts: [['타선', avgOf(bats, (p) => p.overall)], ['수비', avgOf(bats, (p) => p.stats.defense)],
      ['선발', avgOf(pits.filter((p) => p.position === 'SP'), (p) => p.overall)], ['불펜', avgOf(pits.filter((p) => p.position === 'RP'), (p) => p.overall)]],
  };
}




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

function SingleHero({ team, squad, ready, issues, onLocker, oppName }) {
  const st = teamStats(squad);
  const top = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 8);
  return (
    <section className="ui-cut ui-frame ui-glass flex min-h-0 flex-col p-5" style={{ '--c': '20px', '--a': G }}>
      <UiStyle />
      <div className="ui-cut relative min-h-0 flex-1 overflow-hidden bg-cover" style={{ '--c': '14px', backgroundImage: 'url(ui/broadcast-field.webp)', backgroundPosition: 'center 60%' }}>
        <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f,rgba(5,8,15,.55) 45%,rgba(5,8,15,.1))' }} />
        <div className="absolute bottom-6 left-7">
          <p className="ui-lab font-display">Next Match</p>
          <p className="mt-1 text-5xl font-black text-white">{team.name || '나의 드림팀'} <span className="font-display text-gray-500">vs</span> {oppName || '무작위 팀'}</p>
          <p className="mt-2 font-display text-lg" style={{ color: ready ? G : '#fde047' }}>
            {ready ? `팀 종합 ${st.ovr}` : issues[0]}
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
  const now = t ? (t.done ? n : t.round) : -1;
  const top = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 6);
  return (
    <section className="ui-cut ui-frame ui-glass relative flex min-h-0 flex-col overflow-hidden p-7 animate-[fade_.25s_ease-out_both]" style={{ '--c': '20px', '--a': A }}>
      <UiStyle />
      {/* 더그아웃에서 그라운드로 나가는 장면 */}
      <span className="absolute inset-0 bg-cover" style={{ backgroundImage: 'url(ui/tour/tunnel.webp)', backgroundPosition: 'center 45%' }} />
      <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.55),rgba(5,8,15,.15) 45%,#05080f)' }} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <p className="ui-lab font-display" style={{ '--a': A }}>Tournament · {size}</p>
        <div className="mt-auto text-center">
          <p className="font-display text-xs font-bold tracking-[0.4em]" style={{ color: A }}>ROAD TO THE TITLE</p>
          <h1 className="mt-2 text-6xl font-black leading-none text-white">{size}강 토너먼트</h1>
          <p className="mt-3 text-lg text-gray-300">{n}번 이기면 우승. 한 번 지면 끝.</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            {rounds.map((r, k) => {
              const done = now > k;
              const here = now === k;
              return (
                <React.Fragment key={r.key}>
                  <span className="ui-cut px-4 py-1.5 font-display text-[15px] font-bold" style={{ '--c': '6px',
                    color: here || (k === n - 1 && now < 0) ? '#05080f' : done ? '#05080f' : '#e5e7eb',
                    background: here ? A : done ? 'rgba(251,191,36,.55)' : k === n - 1 && now < 0 ? A : 'rgba(255,255,255,.08)' }}>{r.ko}</span>
                  {k < n - 1 && <span className="font-display text-gray-600">›</span>}
                </React.Fragment>
              );
            })}
          </div>
          <p className="mt-3 font-display text-base text-gray-400">우승 상금 <b style={{ color: A }}>{finish[n].gold} G</b></p>
        </div>
        {squad && (
          <div className="ui-cut mt-auto flex items-center gap-5 bg-white/[0.04] px-4 py-3" style={{ '--c': '10px' }}>
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
  const issues = squadIssues(squad, team.staff, cap);
  const ready = issues.length === 0;
  const st = teamStats(squad);
  const recent = (account.history || []).filter((h) => !h.mode).slice(0, 5); // 단판 기록만
  const recCount = recent.reduce((n, h) => ({ ...n, [h.winner]: (n[h.winner] || 0) + 1 }), { my: 0, opp: 0, draw: 0 });
  const single = format === 'single';
  const cur = account.tournament?.size ? account.tournament : null; // 저장된 토너먼트 (옛 날짜형은 무시)
  const t = !single && cur && cur.size === format && !(cur.done && cur.claimed) ? cur : null; // 이 크기로 이어서 할 판
  const other = !single && cur && cur.size !== format && !(cur.done && cur.claimed) ? cur : null; // 다른 크기로 진행 중인 판
  const rounds = single ? null : roundsOf(format);
  const wins = t ? t.results.filter((rs) => rs.some((x) => x.winner === meIndex(t))).length : 0;
  const acc = single ? G : A;
  const duel = single ? nextDuel() : null;

  const main = single
    ? <SingleHero team={team} squad={squad} ready={ready} issues={issues} onLocker={onLocker} oppName={duel?.name} />
    : <TourneyHero key={format} size={format} t={t} name={team.name || '나의 드림팀'} squad={squad} />;

  const aside = (
    <aside className="ui-cut ui-frame ui-glass flex min-h-0 flex-col gap-4 p-6" style={{ '--c': '20px', '--a': acc,
      ...(single || t ? null : { backgroundImage: 'linear-gradient(180deg,rgba(6,10,19,.88),rgba(6,10,19,.97)), url(ui/tour/panel-trophy.webp)', backgroundSize: 'cover', backgroundPosition: 'right center' }) }}>
      <p className="ui-lab font-display" style={{ '--a': acc }}>{single ? 'Single Game' : `Tournament · ${format}`}</p>
      <h2 className="-mt-2 text-3xl font-black text-white">일반 대결</h2>
      <FormatPicker value={format} onChange={onFormat} />
      {single ? (
        <>
          <p className="ui-lab font-display" style={{ '--a': G }}>Today</p>
          <OppPreview opp={duel} />
          <p className="ui-lab font-display" style={{ '--a': G }}>Recent {recent.length ? `· ${recCount.my}승 ${recCount.draw}무 ${recCount.opp}패` : ''}</p>
          <RecentGames games={recent} />
        </>
      ) : (
        <>
          {/* 시작 전에는 우승 상금을 아래 큰 칸으로 보여 주므로 여기선 뺀다 */}
          <Stats items={t ? [['참가', `${format}팀`], ['경기', `최대 ${rounds.length}`], ['우승', `${finishOf(format)[rounds.length].gold} G`]]
            : [['참가', `${format}팀`], ['경기', `최대 ${rounds.length}`], ['동점이면', '종합순']]} />
          {t ? (
            <div>
              <KV k="진행" v={t.done ? finishOf(format)[t.place].ko : rounds[t.round].ko} color={A} />
              <KV k="승리" v={`${wins} / ${rounds.length}`} />
              <KV k="팀 종합" v={st.ovr || '-'} />
              <KV k="동점이면" v="팀 종합 높은 쪽" />
            </div>
          ) : (
            <>
              <div className="ui-cut shrink-0 px-4 py-3" style={{ '--c': '10px', background: `linear-gradient(90deg,${A}1f,rgba(255,255,255,.03))` }}>
                <p className="text-[11px] text-gray-400">우승 상금</p>
                <b className="font-display text-3xl" style={{ color: A }}>{finishOf(format)[rounds.length].gold} G</b>
              </div>
              <p className="ui-lab font-display" style={{ '--a': A }}>Prize</p>
              {/* 라운드가 다섯 이상이면(32 · 64강) 두 열로 나눠 스크롤 없이 담는다 */}
              <div className={`min-h-0 flex-1 ${rounds.length > 4 ? 'grid grid-cols-2 gap-x-3 content-start' : ''}`}>
                {rounds.map((r, i2) => (
                  <KV key={r.key} k={<span className="flex items-center gap-2"><span className="ui-chip font-display" style={{ '--a': A }}>R{i2 + 1}</span>{r.ko} 승리</span>}
                    v={`${finishOf(format)[i2 + 1].gold} G`} color={i2 === rounds.length - 1 ? A : '#fff'} />
                ))}
              </div>
              <p className="ui-lab font-display" style={{ '--a': G }}>My Team</p>
              <div className="shrink-0">
                <Stats items={[['팀 종합', st.ovr || '-'], ['엔트리', squad.length], ['외국인', `${foreignCount(squad)}/3`]]} />
              </div>
            </>
          )}
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
