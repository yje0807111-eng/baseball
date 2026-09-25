/* 플레이 화면의 랭크전 — 가운데: 시즌 순위표(없으면 시즌 방식 소개) · 오른쪽: 내 등급과 다음 경기 */
import React from 'react';
import { squadIssues, SQUAD_CAP, limitsOf } from './rules.js';
import CapBar from './CapBar.jsx';
import { UiStyle, KV, Stats, teamStats } from './ui.jsx';
import { statColor, statPct } from './teamColor.js';
import { rankOf } from './rank.js';
import { standings, myOpponent, meOf, postMatch, GAMES, STAGES, PLACE_REWARD, LEAGUE_SIZE, POST_TEAMS } from './ranked.js';
import { StandingsTable, RK } from './RankedHub.jsx';

/* 시즌 흐름: 정규 시즌 → 가을야구 네 단계 */
const FLOW = [
  ['정규 시즌', `${LEAGUE_SIZE}팀 · ${GAMES}경기`],
  ...STAGES.map((st, i) => [st.ko, i === 0 ? '4위 vs 5위' : `vs ${STAGES[i].hi}위`]),
];
/** 시즌 전 소개 — 무엇을 하는 모드인지(카드 셋) · 어떻게 흘러가는지(칩) · 무엇을 받는지(승점) */
function Intro() {
  return (
    <div className="mt-auto grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1.2fr) 320px' }}>
      <div className="flex flex-col gap-3">
        <p className="ui-lab font-display" style={{ '--a': RK }}>시즌 진행</p>
        <div className="flex flex-wrap items-center gap-2">
          {FLOW.map(([k], i) => (
            <React.Fragment key={k}>
              <span className="ui-cut px-4 py-1.5 font-display text-t3 font-bold"
                style={{ '--c': '6px', color: i === FLOW.length - 1 ? '#05080f' : '#e5e7eb', background: i === FLOW.length - 1 ? '#fbbf24' : 'rgba(255,255,255,.08)' }}>{k}</span>
              {i < FLOW.length - 1 && <span className="font-display text-gray-500">›</span>}
            </React.Fragment>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[['1', '정규 시즌', `${LEAGUE_SIZE}팀과 ${GAMES}경기`], ['2', '가을야구', `상위 ${POST_TEAMS}팀 단판 승부`], ['3', '랭크 승점', '최종 순위로 RP가 오르내림']].map(([n, t, d]) => (
            <div key={n} className="ui-cut px-4 py-3" style={{ '--c': '10px', background: 'rgba(255,255,255,.05)' }}>
              <span className="ui-chip font-display" style={{ '--a': RK }}>{n}</span>
              <b className="mt-2 block text-t2 font-black text-white">{t}</b>
              <span className="text-t3 text-gray-400">{d}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="ui-lab font-display" style={{ '--a': RK }}>순위 보상</p>
        <div className="mt-2">
          {PLACE_REWARD.slice(0, 5).map((r, i) => (
            <KV key={r.ko} k={r.ko} v={`${r.rp >= 0 ? '+' : ''}${r.rp} RP · ${r.gold} G`} color={i === 0 ? '#fbbf24' : '#fff'} sm />
          ))}
        </div>
      </div>
    </div>
  );
}

const RESULT = { my: ['승', '#34d399'], opp: ['패', '#f87171'], draw: ['무', '#94a3b8'] };
const avgOf = (xs, g) => (xs.length ? Math.round(xs.reduce((n, p) => n + g(p), 0) / xs.length) : 0);
/** 내 팀 전력 네 부문 — 타선 · 수비 · 선발 · 불펜 */
function teamParts(squad) {
  const bats = squad.filter((p) => p.type === 'batter');
  const sp = squad.filter((p) => p.position === 'SP').sort((a, b) => b.overall - a.overall).slice(0, 5);
  const rp = squad.filter((p) => p.position === 'RP').sort((a, b) => b.overall - a.overall).slice(0, 8);
  // 색은 다른 화면(정비 · 단판 판)과 같은 부문 색
  return [['타선', avgOf(bats, (p) => p.overall), '#34d399'], ['수비', avgOf(bats, (p) => p.stats.defense), '#60a5fa'],
    ['선발', avgOf(sp, (p) => p.overall), '#7dd3fc'], ['불펜', avgOf(rp, (p) => p.overall), '#f87171']];
}

/** 최근 랭크전 10경기 — 승패 칸 한 줄 (성적은 제목 옆에) */
function FormRow({ games }) {
  if (!games.length) return <p className="text-t3 text-gray-400">치른 랭크전 없음</p>;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${games.length},1fr)` }}>
      {games.map((g, i) => {
        const [ko, c] = RESULT[g.winner] || RESULT.draw;
        return (
          <span key={i} className="ui-cut py-1 text-center font-display text-t4 font-extrabold"
            style={{ '--c': '4px', color: g.winner === 'my' ? '#05080f' : c, background: g.winner === 'my' ? c : 'rgba(255,255,255,.06)' }}>{ko}</span>
        );
      })}
    </div>
  );
}

/** onOpen: 시즌 화면으로(없으면 새 시즌을 열고) */
export function rankedPanels({ account, onOpen, onLocker }) {
  const team = account.team || {};
  const squad = team.squad || [];
  const issues = squadIssues(squad, team.staff, team.cap || SQUAD_CAP, limitsOf(team));
  const ready = issues.length === 0;
  const s = account.ranked || null;
  const rp = account.rank?.rp || 0;
  const rank = rankOf(rp);
  const me = s ? meOf(s) : -1;
  const row = s ? standings(s).find((r) => r.idx === me) : null;
  const opp = s ? myOpponent(s) : null;
  const pm = s ? postMatch(s) : null;
  const state = !s ? '시즌 전' : s.done ? PLACE_REWARD[s.place - 1].ko : s.post ? STAGES[pm.stage].ko : `정규 ${s.round + 1}차전`;
  const form = (account.history || []).filter((h) => h.mode === 'ranked').slice(0, 10);
  const fw = form.filter((h) => h.winner === 'my').length;
  const fl = form.filter((h) => h.winner === 'opp').length;
  const fd = form.length - fw - fl;
  const streak = (() => { let n = 0; for (const h of form) { if (h.winner === 'my') n += 1; else break; } return n; })();
  const past = (account.rank?.seasons || []).slice(0, 3);

  const main = (
    <section className="ui-cut ui-frame ui-glass relative flex min-h-0 flex-col overflow-hidden p-7 animate-[swap_.35s_ease-out_both]" style={{ '--c': '20px', '--a': RK }}>
      <UiStyle />
      <span className="absolute inset-0 bg-cover" style={{ backgroundImage: 'url(ui/rank2/dusk.webp)', backgroundPosition: 'center 45%' }} />
      <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 18%,rgba(5,8,15,.6))' }} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <p className="ui-lab font-display" style={{ '--a': RK }}>{s ? `시즌 ${s.season}` : '새 시즌'}</p>
        <h1 className="mt-2 text-6xl font-black text-white">랭크전</h1>
        <p className="mt-3 text-t2 text-gray-300">정규 시즌 · 가을야구 성적으로 랭크 승점</p>
        {s ? (
          <div className="ui-cut mt-auto bg-[#05080f]/60 px-4 py-3" style={{ '--c': '12px' }}>
            <StandingsTable s={s} />
          </div>
        ) : <Intro />}
      </div>
    </section>
  );

  const aside = (
    <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6 animate-[swap_.35s_ease-out_both]" style={{ '--c': '20px', '--a': RK }}>
      <p className="ui-lab font-display" style={{ '--a': RK }}>랭크 현황</p>
      <h2 className="-mt-2 text-t1 font-black text-white">랭크전</h2>
      <div className="ui-cut bg-white/[0.05] px-4 py-3" style={{ '--c': '10px' }}>
        <div className="flex items-baseline gap-2">
          <b className="font-display text-t1 font-extrabold" style={{ color: rank.tier.c }}>{rank.tier.ko} {rank.div}</b>
          <b className="ml-auto font-display text-t2 text-white">{rp} RP</b>
        </div>
        <span className="mt-2 block h-1.5 bg-white/10"><i className="block h-full" style={{ width: `${rank.inDiv}%`, background: rank.tier.c }} /></span>
        <div className="mt-2 flex justify-between font-display text-t4 text-gray-400">
          <span>{rank.next ? `다음 등급까지 ${rank.toNext} RP` : '최고 등급'}</span>
          <span>최고 {account.rank?.best || rp} RP</span>
        </div>
      </div>
      {s && (
        <div>
          <KV k="진행" v={state} color={RK} />
          {row && <KV k="시즌 성적" v={`${row.w}승 ${row.l}패 ${row.d}무`} />}
          {opp && <KV k="다음 상대" v={opp.name} />}
        </div>
      )}

      {/* 최근 랭크전 흐름 — 성적은 제목 옆에 붙여 한 줄로 */}
      <div className="flex items-baseline gap-2">
        <p className="ui-lab font-display" style={{ '--a': RK }}>최근 {form.length || 10}경기</p>
        {!!form.length && <span className="ml-auto font-display text-t4 text-gray-400">{fw}승 {fd}무 {fl}패</span>}
      </div>
      <FormRow games={form} />
      {!!form.length && <Stats items={[['승률', `${Math.round((fw / form.length) * 100)}%`], ['연승', streak]]} />}

      {/* 지난 시즌 */}
      <p className="ui-lab font-display" style={{ '--a': RK }}>지난 시즌</p>
      {past.length ? (
        <div>
          {past.map((h) => (
            <KV key={h.season} k={`시즌 ${h.season} · ${PLACE_REWARD[h.place - 1]?.ko || '-'}`}
              v={`${h.rp >= 0 ? '+' : ''}${h.rp} RP`} color={h.rp >= 0 ? '#34d399' : '#f87171'} sm />
          ))}
        </div>
      ) : <p className="text-t3 text-gray-400">마친 시즌 없음</p>}

      {/* 내 팀 전력 */}
      <p className="ui-lab font-display" style={{ '--a': RK }}>우리 팀</p>
      <div className="flex flex-col gap-2">
        {teamParts(squad).map(([k, v, c]) => (
          <div key={k} className="grid items-center gap-2.5 text-t3 text-gray-300" style={{ gridTemplateColumns: '34px 1fr 28px' }}>
            <span>{k}</span>
            <span className="relative bg-white/[0.07]" style={{ height: 7 }}>
              {/* 드래프트 선수 카드와 같은 막대: 낮으면 푸른 회색, 높을수록 그 부문 색으로 짙어진다 */}
              <i className="absolute inset-y-0 left-0" style={{ width: `${statPct(v)}%`, background: statColor(v, c).bar }} />
            </span>
            <b className="text-right font-display text-t3" style={{ color: statColor(v, c).num }}>{v}</b>
          </div>
        ))}
      </div>
      {!ready && (
        <ul className="flex flex-col gap-1">
          {issues.slice(0, 4).map((x) => <li key={x} className="text-t3 text-amber-300">· {x}</li>)}
        </ul>
      )}
      <CapBar team={team} sm />
      <div className="mt-auto">
        {ready || s
          ? <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-t2" style={{ '--a': RK }} onClick={onOpen}>
            {!s ? '시즌 1 시작 ▶' : s.done ? '시즌 결과 · 새 시즌 ▶' : '순위표 · 다음 경기 ▶'}
          </button>
          : <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-t2" onClick={onLocker}>라커에서 채우기 ›</button>}
      </div>
    </aside>
  );

  return { key: 'ranked', label: '랭크전', sub: s ? `시즌 ${s.season} · ${state}` : `${rank.tier.ko} ${rank.div} · ${rp} RP`, img: 'ui/stadium.webp', neon: RK, main, aside };
}
