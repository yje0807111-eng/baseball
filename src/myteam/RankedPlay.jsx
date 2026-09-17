/* 플레이 화면의 랭크전 — 가운데: 시즌 순위표(없으면 시즌 방식 소개) · 오른쪽: 내 등급과 다음 경기 */
import React from 'react';
import { squadIssues, SQUAD_CAP } from './rules.js';
import { UiStyle, KV, Stats, teamStats } from './ui.jsx';
import { rankOf } from './rank.js';
import { standings, myOpponent, meOf, postMatch, GAMES, STAGES, PLACE_REWARD, LEAGUE_SIZE, POST_TEAMS } from './ranked.js';
import { StandingsTable, RK } from './RankedHub.jsx';

function Intro() {
  const steps = [
    { k: '정규 시즌', v: `${LEAGUE_SIZE}팀 · ${GAMES}경기` },
    { k: '와일드카드', v: '4위 vs 5위' },
    { k: '준플레이오프', v: 'vs 3위' },
    { k: '플레이오프', v: 'vs 2위' },
    { k: '한국시리즈', v: 'vs 1위' },
  ];
  return (
    <>
      <div className="mt-auto grid grid-cols-5 items-end gap-2.5" style={{ height: '46%' }}>
        {steps.map((s, i) => (
          <div key={s.k} className="ui-cut flex flex-col justify-end p-4"
            style={{ '--c': '12px', height: `${34 + i * 16}%`, background: `linear-gradient(180deg, rgba(167,139,250,${0.06 + i * 0.05}), rgba(5,8,15,.6))`, boxShadow: `inset 0 2px 0 ${i === 4 ? '#fbbf24' : 'rgba(167,139,250,.4)'}` }}>
            {i === 4 && <span className="mb-auto text-center text-6xl leading-none">🏆</span>}
            <b className="text-2xl font-black" style={{ color: i === 4 ? '#fbbf24' : '#fff' }}>{s.k}</b>
            <span className="font-display text-base text-gray-300">{s.v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** onOpen: 시즌 화면으로(없으면 새 시즌을 열고) */
export function rankedPanels({ account, onOpen, onLocker }) {
  const team = account.team || {};
  const squad = team.squad || [];
  const issues = squadIssues(squad, team.staff, team.cap || SQUAD_CAP);
  const ready = issues.length === 0;
  const s = account.ranked || null;
  const rp = account.rank?.rp || 0;
  const rank = rankOf(rp);
  const me = s ? meOf(s) : -1;
  const row = s ? standings(s).find((r) => r.idx === me) : null;
  const opp = s ? myOpponent(s) : null;
  const pm = s ? postMatch(s) : null;
  const state = !s ? '시즌 전' : s.done ? PLACE_REWARD[s.place - 1].ko : s.post ? STAGES[pm.stage].ko : `정규 ${s.round + 1}차전`;

  const main = (
    <section className="ui-cut ui-frame ui-glass relative flex min-h-0 flex-col overflow-hidden p-7 animate-[fade_.25s_ease-out_both]" style={{ '--c': '20px', '--a': RK }}>
      <UiStyle />
      <span className="absolute inset-0 bg-cover opacity-25" style={{ backgroundImage: 'url(ui/stadium.webp)', backgroundPosition: 'center 40%' }} />
      <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 20%,rgba(5,8,15,.55))' }} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <p className="ui-lab font-display" style={{ '--a': RK }}>Ranked · {s ? `Season ${s.season}` : 'Season'}</p>
        <h1 className="mt-2 text-6xl font-black text-white">랭크전</h1>
        <p className="mt-3 text-lg text-gray-300">{LEAGUE_SIZE}팀 리그 {GAMES}경기, 상위 {POST_TEAMS}팀 가을야구. 최종 순위로 랭크 승점이 오르내립니다.</p>
        {s ? (
          <div className="ui-cut mt-auto bg-[#05080f]/60 px-4 py-3" style={{ '--c': '12px' }}>
            <StandingsTable s={s} />
          </div>
        ) : <Intro />}
      </div>
    </section>
  );

  const aside = (
    <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6" style={{ '--c': '20px', '--a': RK }}>
      <p className="ui-lab font-display" style={{ '--a': RK }}>Ranked</p>
      <h2 className="-mt-2 text-3xl font-black text-white">랭크전</h2>
      <div className="ui-cut bg-white/[0.05] px-4 py-3" style={{ '--c': '10px' }}>
        <div className="flex items-baseline gap-2">
          <b className="font-display text-2xl font-extrabold" style={{ color: rank.tier.c }}>{rank.tier.ko} {rank.div}</b>
          <b className="ml-auto font-display text-xl text-white">{rp} RP</b>
        </div>
        <span className="mt-2 block h-1.5 bg-white/10"><i className="block h-full" style={{ width: `${rank.inDiv}%`, background: rank.tier.c }} /></span>
      </div>
      <Stats items={[['팀 OVR', teamStats(squad).ovr || '-'], ['시즌', s ? s.season : '-'], ['순위', row && s.games.length ? `${row.rank}위` : '-']]} />
      <div>
        <KV k="진행" v={state} color={RK} />
        {row && <KV k="시즌 성적" v={`${row.w}승 ${row.l}패 ${row.d}무`} />}
        {opp && <KV k="다음 상대" v={opp.name} />}
        <KV k="우승 보상" v={`+${PLACE_REWARD[0].rp} RP · ${PLACE_REWARD[0].gold} G`} color="#fde047" />
      </div>
      {!ready && <p className="text-sm text-amber-300">{issues[0]}</p>}
      <div className="mt-auto">
        {ready || s
          ? <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': RK }} onClick={onOpen}>
            {!s ? '시즌 1 시작 ▶' : s.done ? (s.claimed ? '시즌 결과 · 새 시즌 ▶' : '결과 · 보상 받기 ▶') : '순위표 · 다음 경기 ▶'}
          </button>
          : <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" onClick={onLocker}>라커에서 채우기 ›</button>}
      </div>
    </aside>
  );

  return { key: 'ranked', label: '랭크전', sub: s ? `시즌 ${s.season} · ${state}` : `${rank.tier.ko} ${rank.div} · ${rp} RP`, img: 'ui/stadium.webp', neon: RK, main, aside };
}
