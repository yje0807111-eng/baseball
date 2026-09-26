/*
 * 게임 화면 묶음 — 로비에서 어딘가로 들어갈 때 받아 온다.
 * 시즌 로스터 412개와 경기 엔진이 여기에 딸려 있어, 로그인·로비와 떼어 두었다.
 * 상태 중 account · view · playTab 은 App 이 들고 있고 나머지는 여기서 갖는다.
 */
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { tickBoosts, itemById, spendCard, applyCard, TEAM_BOOST_KO } from './myteam/shop.js';
import { addHistory, addGold, saveTeam, saveTournament, claimTournament, saveRanked, claimRanked, loadAccount as reload, augShopTickets, spendAugTicket, bumpWeek } from './myteam/store.js';
import { normalPanels } from './myteam/NormalPlay.jsx';
import { rankedPanels } from './myteam/RankedPlay.jsx';
import { matchTeamOf } from './myteam/prep.js';
import { afterGame } from './myteam/fatigue.js';
import { randomSeriesTeam } from './myteam/aiTeam.js';
import { makeTournament, myOpponent, teamOf, advance, roundsOf, finishOf, hashKey, newKey } from './myteam/tournament.js';
import * as ranked from './myteam/ranked.js';
import { findGhosts, uploadDefense, recordBattle } from './net/pvp.js';
import { oppSeed, applyFormTeam } from './myteam/form.js';
import { gameDetail } from './myteam/gameDetail.js';
import { MATCH_AUG_INNINGS, envOf, augOptions, augsForHistory } from './myteam/matchAug.js';
import { ChoiceOverlay, KEYFRAMES, FREE_REROLL, makeAugmentRuntime } from './KboAugmentDraft.jsx';
import { cupOf, cupIssue } from './myteam/cups.js';
import MatchResult from './play/MatchResult.jsx';
import { missionState } from './myteam/missions.js';

/* 화면마다 또 나눠 싣는다 — 드래프트 판과 경기 중계가 특히 무겁다 */
import { KboAugmentDraft, LockerScreen, ShopScreen, RecordScreen, AugmentScreen, BroadcastGame, TournamentBracket, RankedHub, PrepScreen } from './screens.jsx';

/** 화면이 오는 동안 잠깐 놓이는 자리 — 배경색만 같게 둔다 */
const Loading = () => <div className="min-h-screen" style={{ background: '#05080f' }} />;
const screen = (node) => <Suspense fallback={<Loading />}>{node}</Suspense>;

export default function GameApp({ account, setAccount, view, setView, playTab, setPlayTab, recordTab = 'all' }) {
  const [match, setMatch] = useState(null); // 경기 중인 두 팀 { my, opp, kind: 'duel' | 'tourney' | 'ranked' }
  const [after, setAfter] = useState(null); // 경기 결과 화면 { res, my, opp, context, tally, next, nextLabel }
  const [prep, setPrep] = useState(null); // 경기 전 정비 { kind, sub, title, startLabel, back }
  const [cup, setCup] = useState('open'); // 새 토너먼트에 걸 조건 (cups.js)
  const [augPick, setAugPick] = useState(null); // 증강 고르기 창 { options, free, inning, onPick }
  const ownedRef = useRef([]); // 이번 경기에서 고른 증강 (정비 끝 1장 + 7회 1장)
  const [format, setFormat] = useState(() => (account?.tournament?.size && !account.tournament.claimed ? account.tournament.size : 'single')); // 일반 대결 형식
  const tournament = account?.tournament?.size ? account.tournament : null;
  const season = account?.ranked || null;
  const refresh = () => setAccount(reload());
  const toModes = (tab) => { setPlayTab(tab); setView('modes'); };

  /* 단판: 정비 화면 → 무작위 팀과 한 경기 */
  const openDuel = () => {
    setPrep({ kind: 'duel', sub: '단판 승부', title: '단판 경기 전 정비', startLabel: '경기 시작 ▶', back: () => toModes('duel') });
    setView('prep');
  };
  /* 토너먼트: fresh 면 새 대진을 열어 저장, 아니면 진행 중인 대진표로 */
  const openTourney = (size, fresh) => {
    if (fresh || !tournament || tournament.size !== size) {
      saveTournament(makeTournament({ size, myName: account.team?.name, cup }));
      if (cup !== 'open') bumpWeek('cup'); // 주간 과제: 조건부 대회 열기
    }
    refresh();
    setView('bracket');
  };
  const openTourneyPrep = () => {
    const r = roundsOf(tournament.size)[tournament.round];
    const c = cupOf(tournament.cup);
    setPrep({ kind: 'tourney', sub: `토너먼트 · ${r.ko}${c.id !== 'open' ? ` · ${c.ko}` : ''}`, title: `${r.ko} 경기 전 정비`, startLabel: `${r.ko} 경기 시작 ▶`, back: () => setView('bracket'),
      block: cupIssue(tournament.cup, account.team) });
    setView('prep');
  };
  const claimTourney = () => {
    if (!tournament?.done) return;
    claimTournament(finishOf(tournament.size, tournament.cup)[tournament.place]);
    refresh();
  };

  /*
   * 랭크전: 시즌이 없으면 새로 열고 시즌 화면으로.
   * 새 시즌은 내 방어 팀을 올리고 RP 가까운 다른 감독 팀을 받아 상대로 앉힌다(서버가 없으면 모두 AI — 기다리지 않는다)
   */
  const opening = useRef(false);
  const makeRankedSeason = async (n) => {
    if (opening.current) return;
    opening.current = true;
    const rp = account.rank?.rp || 0;
    uploadDefense(account.team, rp).catch(() => {});
    const ghosts = await findGhosts(rp);
    saveRanked(ranked.makeSeason({ season: n, myName: account.team?.name, ghosts, rp }));
    opening.current = false;
    refresh();
  };
  const openRanked = async () => {
    if (!season) await makeRankedSeason(1);
    else refresh();
    setView('ranked');
  };
  const newSeason = () => makeRankedSeason((season?.season || 0) + 1);
  /* 끊긴 랭크전 — 경기 도중 창을 닫았다 돌아오면 그 판은 엔진이 끝까지 계산해 결과를 확정한다 */
  useEffect(() => {
    if (!season?.live || match || season.done) return;
    const auto = ranked.autoScore(season, account.team);
    if (!auto) { saveRanked({ ...season, live: null }); refresh(); return; }
    const pm = ranked.postMatch(season);
    const round = pm ? ranked.STAGES[pm.stage].ko : `정규 ${season.round + 1}차전`;
    const { my, opp } = auto.score;
    const winner = my > opp ? 'my' : my < opp ? 'opp' : 'draw';
    saveRanked(ranked.play({ ...season, live: null }, auto.score, account.team));
    addHistory({ my: account.team.name, opp: auto.opp.name, myRuns: my, oppRuns: opp, winner, mode: 'ranked', round, auto: true });
    if (auto.opp.ghost) recordBattle({ ghost: auto.opp.ghost, seed: auto.seed, myRuns: my, oppRuns: opp });
    refresh();
  }, [season?.live, match]); // eslint-disable-line react-hooks/exhaustive-deps
  const openRankedPrep = () => {
    const pm = ranked.postMatch(season);
    const label = pm ? ranked.STAGES[pm.stage].ko : `정규 ${season.round + 1}차전`;
    setPrep({ kind: 'ranked', sub: `랭크전 · 시즌 ${season.season}`, title: `${label} 경기 전 정비`, startLabel: `${label} 시작 ▶`, back: () => setView('ranked') });
    setView('prep');
  };
  const claimSeason = () => {
    if (!season?.done) return;
    claimRanked(ranked.PLACE_REWARD[season.place - 1]);
    refresh();
  };

  /* 정비 화면에서 시작: 바꾼 자리·타순을 저장하고, 정비 결과 그대로 상대와 경기 */
  const startFromPrep = (ready0, rest, plan, cardId = null) => {
    /* 전략실에서 고른 작전은 팀에 남겨 다음 경기에도 그대로 이어 쓴다 */
    /* 배치는 정비 화면이 라커 배치(team.order)에 바로 저장한다 — 여기서는 작전만 */
    let team = { ...(reload()?.team || account.team), ...(plan ? { plan } : {}) };
    /* 준비 카드: 한 장 쓰고 이 경기 로스터에만 얹는다 */
    const card = cardId ? itemById(cardId) : null;
    const spent = card ? spendCard(team, card.id) : null;
    if (spent) team = spent;
    const ready = spent ? applyCard(ready0, card) : ready0;
    let opp = null;
    if (prep.kind === 'duel') opp = randomSeriesTeam();
    else if (prep.kind === 'tourney') { const e = myOpponent(tournament); opp = e && teamOf(e, team); }
    let ghost = null; // 상대가 다른 감독 팀이면 { uid, teamId } — 끝나고 대전 기록으로
    if (prep.kind === 'ranked') { const e = ranked.myOpponent(season); opp = e && teamOf(e, team); ghost = (e?.ghost && opp?.ghost) ? e.ghost : null; }
    if (!opp) return;
    /* 상대도 오늘 몸 상태를 안고 나온다 — 정비 화면 스카우팅에서 본 그대로 */
    opp = applyFormTeam(opp, oppSeed(opp.name, prep.sub || ''));
    saveTeam(team);
    refresh();
    /* 랭크전은 방금 정비한 배치를 내 방어 팀으로 올린다 — 다른 감독이 만날 내 팀 */
    if (prep.kind === 'ranked') uploadDefense(team, account.rank?.rp || 0).catch(() => {});
    /* 정비를 마치며 증강 1장 — 고르면 그 증강을 얹은 팀으로 경기에 들어간다 */
    const record = team.record || { w: 0, l: 0, d: 0 };
    const env = envOf(opp, record);
    const makeMy = (augs) => matchTeamOf(team, ready, rest, augs, env);
    /* 내 경기 시드 — 판마다 새로 뽑아 대전 기록에 남긴다(같은 라운드를 다시 해도 흐름을 미리 알 수 없게) */
    const seed = hashKey(newKey());
    const go = (owned) => {
      ownedRef.current = owned;
      const my = makeMy(owned);
      setAugPick(null);
      /* 랭크전: 경기가 시작됐다고 시즌에 적어 둔다 — 도중에 창을 닫아도 다음에 이 시드로 결과를 확정한다(경기 화면과 같은 틱에 — 끊긴 경기 정리가 헷갈리지 않게) */
      if (prep.kind === 'ranked') { saveRanked({ ...season, live: { seed, at: new Date().toISOString() } }); refresh(); }
      setMatch({ my, opp, kind: prep.kind, makeMy, seed, ghost, card: spent ? card.id : null, aug: makeAugmentRuntime({ augments: owned, my, opp, record }) });
      setView('play');
    };
    const options = augOptions([]);
    if (!options.length) { go([]); return; }
    setAugPick({ options, free: FREE_REROLL, onPick: (a) => go([a]) });
  };

  /* 증강 다시 굴리기 — 거저 한 번, 그다음은 리롤권 */
  const rerollAug = () => {
    if (!augPick) return;
    if ((augPick.free || 0) <= 0 && !spendAugTicket('reroll')) return;
    setAugPick({ ...augPick, free: Math.max(0, (augPick.free || 0) - 1), options: augOptions(ownedRef.current) });
  };
  /* 7회 증강: 중계 화면이 기다린다 — 고르면 지금까지 고른 증강 전부를 넘긴다 */
  const midPick = (inning) => {
    const options = augOptions(ownedRef.current);
    if (!options.length) return null;
    return new Promise((resolve) => {
      setAugPick({ inning, options, free: FREE_REROLL, onPick: (a) => { const owned = [...ownedRef.current, a]; ownedRef.current = owned; setAugPick(null); resolve(owned); } });
    });
  };
  const augOverlay = augPick && (
    <>
      <style>{KEYFRAMES}</style>
      <ChoiceOverlay choice={{ kind: 'augment', ...augPick }} onChoose={(a) => augPick.onPick(a)} total={1} picksLeft={1}
        rerolls={augShopTickets().reroll || 0} onReroll={rerollAug} eyebrow="경기 증강" heading="경기 증강 고르기" />
    </>
  );

  /* 경기가 끝나면 전적·부스트 수명·투수 피로를 정리하고 각 모드 화면으로 */
  const finishMatch = (res) => {
    const weekBefore = missionState(account.week);
    const played = reload()?.team || account.team; // 정비 화면에서 저장한 배치까지 포함
    const pitcherIds = (played.squad || []).filter((p) => p.type === 'pitcher').map((p) => p.id);
    saveTeam({ ...tickBoosts(played), pitchFatigue: afterGame(played.pitchFatigue, pitcherIds, res.pitchCounts || {}, res.starterId) });
    const mvp = res.mvpPlayer ? { id: res.mvpPlayer.id, name: res.mvpPlayer.name } : null;
    /* 주간 과제: 경기 · 승리 · 내 지시 +10%p · 고른 증강 */
    bumpWeek('game');
    if (res.winner === 'my') bumpWeek('win');
    if ((res.gain || 0) >= 0.1) bumpWeek('gain10');
    bumpWeek('aug', ownedRef.current.length);
    const augs = augsForHistory(ownedRef.current);
    /* 기록에 남길 아이템: 살아 있던 옛 부스트 + 이번 경기에 쓴 준비 카드 */
    const cardUsed = match.card ? itemById(match.card) : null;
    const used = [...(played.boosts || []), ...(cardUsed ? [{ itemId: cardUsed.id, playerName: TEAM_BOOST_KO[cardUsed.teamBoost], gamesLeft: 1 }] : [])];
    const detail = gameDetail({ ...res, augs }, match.my, match.opp, used);
    const base = { my: account.team.name, opp: match.opp.name, myRuns: res.score.my, oppRuns: res.score.opp, winner: res.winner, mvp, detail, ...(augs.length ? { augs } : {}) };
    setMatch(null);
    /* 결과 화면으로 — 무엇이 바뀌었나(보상 · 순위 · 과제)를 모드마다 채우고, '계속'을 누르면 원래 가던 화면으로 */
    const show = (context, tally, next, nextLabel) => {
      const now = reload();
      const weekAfter = missionState(now?.week);
      const was = new Map(weekBefore.map((y) => [y.m.id, y.n]));
      const quests = weekAfter.filter((x) => x.n > (was.get(x.m.id) ?? 0))
        .map((x) => ({ k: `주간 과제 · ${x.m.ko}`, v: x.done ? '완료' : `${x.n} / ${x.m.goal}`, c: x.done ? '#f5d27a' : undefined }));
      refresh();
      setAfter({ res, my: account.team.name, opp: match.opp.name, context, tally: [...tally, ...quests], next, nextLabel });
      setView('result');
    };
    if (match.kind === 'tourney') {
      // 토너먼트 경기는 경기마다 골드 대신, 끝난 뒤 성적 보상을 한 번에 받는다
      const round = roundsOf(tournament.size)[tournament.round]?.ko;
      const nt = advance(tournament, res.score, account.team);
      saveTournament(nt);
      if (nt.done && nt.place >= roundsOf(nt.size).length - 3) bumpWeek('tour8'); // 주간 과제: 8강 이상에서 끝
      addHistory({ ...base, mode: 'tournament', round });
      const alive = !nt.done || nt.place === roundsOf(nt.size).length;
      const nextRound = roundsOf(nt.size)[nt.round]?.ko;
      show(`토너먼트 · ${round}`, [
        { k: '토너먼트', v: nt.done ? (alive ? '우승' : `${round} 탈락`) : `${nextRound} 진출`, c: nt.done && !alive ? '#f87171' : '#34d399' },
        ...(nt.done ? [{ k: '성적 보상', v: '대진표에서 받기', c: '#f5d27a' }] : []),
      ], () => setView('bracket'), '대진표로 ▶');
      return;
    }
    if (match.kind === 'ranked') {
      const pm = ranked.postMatch(season);
      const round = pm ? ranked.STAGES[pm.stage].ko : `정규 ${season.round + 1}차전`;
      const before = season;
      const ns = ranked.play({ ...season, live: null }, res.score, account.team);
      saveRanked(ns);
      addHistory({ ...base, mode: 'ranked', round });
      if (match.ghost) recordBattle({ ghost: match.ghost, seed: match.seed, myRuns: res.score.my, oppRuns: res.score.opp });
      const rankOf = (s0) => ranked.standings(s0).find((x) => x.idx === ranked.meOf(s0));
      const a = rankOf(before), b = rankOf(ns);
      const move = a && b ? a.rank - b.rank : 0;
      show(`랭크전 · ${round}`, [
        ...(ns.done ? [{ k: '시즌 최종', v: ranked.PLACE_REWARD[ns.place - 1]?.ko || '-', c: '#f5d27a' }, { k: '시즌 보상', v: '순위표에서 받기', c: '#f5d27a' }]
          : ns.post ? [{ k: '가을야구', v: ranked.postMatch(ns) ? ranked.STAGES[ranked.postMatch(ns).stage].ko : '진행 중', c: '#34d399' }]
            : [{ k: '순위', v: `${b?.rank ?? '-'}위${move > 0 ? ` ▲${move}` : move < 0 ? ` ▼${-move}` : ''}`, c: move > 0 ? '#34d399' : move < 0 ? '#f87171' : undefined }]),
        ...(b ? [{ k: '시즌 성적', v: `${b.w}승 ${b.l}패${b.d ? ` ${b.d}무` : ''}` }] : []),
      ], () => setView('ranked'), '순위표로 ▶');
      return;
    }
    addHistory(base);
    const gold = res.winner === 'my' ? 300 : res.winner === 'draw' ? 180 : 120;
    addGold(gold);
    const rec = reload()?.team?.record || { w: 0, l: 0, d: 0 };
    show('일반 대결 · 단판', [
      { k: '골드', v: `+${gold} G`, c: '#f5d27a' },
      { k: '통산 전적', v: `${rec.w}승 ${rec.l}패${rec.d ? ` ${rec.d}무` : ''}` },
    ], () => toModes('duel'), '계속 ▶');
  };

  if (view === 'result' && after) {
    const go = () => { const next = after.next; setAfter(null); next(); };
    return screen(
      <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-100">
        <style>{KEYFRAMES}</style>
        <div className="ui-bg" style={{ backgroundImage: 'url(ui/stadium.webp)' }} aria-hidden="true" />
        <div className="relative flex min-h-0 flex-1 flex-col px-7 py-6">
          <MatchResult result={after.res} myName={after.my} oppName={after.opp} context={after.context} tally={after.tally}
            actions={[{ label: after.nextLabel, onClick: go, pri: true }]} />
        </div>
      </div>,
    );
  }
  if (view === 'modes') {
    return screen(
      <KboAugmentDraft onExit={() => { setPlayTab(null); setView('lobby'); }} normalView={playTab} onNormalView={setPlayTab}
        normal={[
          normalPanels({ account, format, onFormat: setFormat, cup, onCup: setCup, onPlay: openDuel, onTourney: openTourney, onLocker: () => setView('locker') }),
          rankedPanels({ account, onOpen: openRanked, onLocker: () => setView('locker') }),
        ]} />,
    );
  }
  if (view === 'augments') return screen(<AugmentScreen account={account} onBack={() => { refresh(); setView('lobby'); }} />);
  if (view === 'locker') return screen(<LockerScreen account={account} onSave={(team, gold) => setAccount((a) => ({ ...a, team, ...(gold != null ? { gold } : {}) }))} onBack={() => setView('lobby')} onShop={() => setView('shop')} onDraft={() => toModes('mix')} />);
  if (view === 'record') return screen(<RecordScreen account={account} initialMode={recordTab} onBack={() => setView('lobby')} onAccount={() => refresh()} />);
  if (view === 'shop') return screen(<ShopScreen account={account} onChange={({ team, gold }) => setAccount((a) => ({ ...a, team, gold }))} onBack={() => setView('lobby')} />);
  if (view === 'bracket' && tournament) {
    return screen(<TournamentBracket t={tournament} myTeam={account.team} onBack={() => toModes('duel')} onPlay={openTourneyPrep} onClaim={claimTourney}
      onRestart={() => openTourney(tournament.size, true)} />);
  }
  if (view === 'ranked' && season) {
    return screen(<RankedHub s={season} account={account} onBack={() => toModes('ranked')} onPlay={openRankedPrep} onClaim={claimSeason} onNewSeason={newSeason} />);
  }
  if (view === 'prep' && prep) {
    return screen(<>{augOverlay}<PrepScreen team={account.team} onSaved={refresh} sub={prep.sub} title={prep.title} startLabel={prep.startLabel} block={prep.block} onStart={startFromPrep} onBack={prep.back}
      backLabel={prep.kind === 'duel' ? '플레이로' : prep.kind === 'ranked' ? '순위표로' : '대진표로'} /></>);
  }
  if (view === 'play' && match) {
    return screen(<>{augOverlay}<BroadcastGame my={match.my} opp={match.opp} seed={match.seed} autoOnExit={match.kind === 'ranked'} onFinish={finishMatch}
      aug={match.aug} rebuildMy={match.makeMy} midPickInnings={match.aug ? MATCH_AUG_INNINGS : []} onMidPick={midPick}
      onExit={() => { const kind = match.kind; setMatch(null); if (kind === 'tourney') setView('bracket'); else if (kind === 'ranked') setView('ranked'); else toModes('duel'); }} /></>);
  }
  /* 갈 곳이 없으면(대진표·시즌이 없는데 그 화면을 불렀다면) 로비로 */
  return <Loading />;
}
