/*
 * 기록 — 치른 경기 목록 (최근 50경기). 라커·상점과 같은 문법: 왼쪽 사이드 분류 / 가운데 경기 줄 / 오른쪽 상세
 *  분류: 전체 · 단판 · 토너먼트 · 랭크
 *  사이드 아래: 전적 · 승률 · 최근 10경기 흐름 · 경기 MVP TOP 3
 */
import React, { useMemo, useState } from 'react';
import { rankSummary } from './rank.js';
import { UiStyle, Bg, TopBar, SideNav, Hero, KV, Stats, Portrait } from './ui.jsx';

const cut = (n) => ({ '--c': `${n}px` });
const MODES = [
  { key: 'all', label: '전체', ko: '전체', c: '#7dd3fc' },
  { key: 'duel', label: '단판', ko: '단판', c: '#34d399' },
  { key: 'tournament', label: '토너먼트', ko: '토너먼트', c: '#fbbf24' },
  { key: 'ranked', label: '랭크', ko: '랭크', c: '#f472b6' },
];
const modeKey = (h) => h.mode || 'duel';
const modeOf = (h) => MODES.find((m) => m.key === modeKey(h)) || MODES[1];
const RESULT = { my: ['승', '#34d399'], opp: ['패', '#f87171'], draw: ['무', '#94a3b8'] };
const resultOf = (h) => RESULT[h.winner] || RESULT.draw;
const fmtDate = (at) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? '—' : `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** 경기 한 줄 — 날짜 · 모드 · 상대 · 점수 · 결과 · MVP */
function GameRow({ h, on, onPick }) {
  const m = modeOf(h);
  const [ko, c] = resultOf(h);
  return (
    <button type="button" onClick={() => onPick(h)} className={`mt-row mt-cut ${on ? 'on' : ''}`}
      style={{ gridTemplateColumns: '104px 88px minmax(0,1.6fr) 120px 40px 152px', '--a': c }}>
      <span className="font-display text-[13px] text-gray-400">{fmtDate(h.at)}</span>
      <span className="mt-cut px-2 py-0.5 text-center text-[11px] font-bold" style={{ ...cut(4), color: m.c, boxShadow: `inset 0 0 0 1px ${m.c}66` }}>{m.ko}</span>
      <span className="min-w-0">
        <b className="block truncate text-base font-black text-white">{h.opp}</b>
        <small className="block truncate text-[11px] text-gray-500">{h.round || '단판 승부'}</small>
      </span>
      <b className="text-center font-display text-2xl font-extrabold tabular-nums text-white">
        {h.myRuns} <span className="text-gray-600">:</span> {h.oppRuns}
      </b>
      <b className="text-center font-display text-xl font-extrabold" style={{ color: c }}>{ko}</b>
      <span className="flex min-w-0 items-center gap-2">
        {h.mvp ? (
          <>
            <Portrait player={h.mvp} w={32} h={38} color="#fbbf24" />
            <span className="min-w-0"><small className="block text-[10px] text-gray-500">MVP</small><b className="block truncate text-[13px] text-white">{h.mvp.name}</b></span>
          </>
        ) : <small className="text-[11px] text-gray-600">MVP 없음</small>}
      </span>
    </button>
  );
}

export default function RecordScreen({ account, onBack }) {
  const history = account.history || [];
  const [mode, setMode] = useState('all');
  const [sel, setSel] = useState(history[0] || null);

  const list = useMemo(() => (mode === 'all' ? history : history.filter((h) => modeKey(h) === mode)), [history, mode]);
  const counts = useMemo(() => Object.fromEntries(MODES.map((m) => [m.key, m.key === 'all' ? history.length : history.filter((h) => modeKey(h) === m.key).length])), [history]);
  const sum = rankSummary(history);
  const tally = (rows) => ({
    w: rows.filter((h) => h.winner === 'my').length,
    l: rows.filter((h) => h.winner === 'opp').length,
    d: rows.filter((h) => h.winner !== 'my' && h.winner !== 'opp').length,
  });
  const all = tally(history);
  const runs = list.reduce((s, h) => s + (h.myRuns || 0), 0);
  const given = list.reduce((s, h) => s + (h.oppRuns || 0), 0);
  const avg = (v) => (list.length ? (v / list.length).toFixed(1) : '—');
  const rate = all.w + all.l + all.d ? Math.round((all.w / (all.w + all.l + all.d)) * 100) : null;
  const n = MODES.find((m) => m.key === mode).c;
  const NAV = MODES.map((m) => ({ key: m.key, label: m.label, sub: `${counts[m.key]}경기`, img: 'ui/mt/tile-record.webp' }));

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg img="ui/mt/tile-record.webp" opacity={0.55} />
      <TopBar eyebrow="Record" section="기록" team={account.team} account={account} onBack={onBack} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4"
        style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>

        <SideNav items={NAV} value={mode} onChange={(k) => { setMode(k); setSel(null); }} a="#7dd3fc" label="Mode">
          <div className="mt-cut bg-white/[0.045] p-3" style={cut(8)}>
            <p className="flex items-baseline justify-between text-[11px] text-gray-400">통산 전적<b className="font-display text-[13px] text-gray-300">{history.length}경기</b></p>
            <b className="font-display text-2xl text-white">{all.w}승 {all.d}무 {all.l}패</b>
            <p className="mt-1 text-[11px] text-gray-500">승률 {rate == null ? '—' : `${rate}%`}{sum.streak > 1 ? ` · ${sum.streak}연승 중` : ''}</p>
          </div>
          <p className="mt-lab px-1 pb-2 pt-3" style={{ fontSize: 10, '--a': '#7dd3fc' }}>Last 10</p>
          <div className="flex flex-wrap gap-1 px-1">
            {sum.form.length === 0 && <small className="text-[11px] text-gray-500">아직 경기가 없습니다</small>}
            {sum.form.map((f, i) => {
              const c = f === 'W' ? '#34d399' : f === 'L' ? '#f87171' : '#94a3b8';
              return <b key={`${f}${i}`} className="mt-cut grid h-6 w-6 place-items-center font-display text-[12px] font-extrabold"
                style={{ ...cut(4), color: c, boxShadow: `inset 0 0 0 1px ${c}66` }}>{f}</b>;
            })}
          </div>
          <p className="mt-lab px-1 pb-2 pt-4" style={{ fontSize: 10, '--a': '#fbbf24' }}>MVP Top 3</p>
          {sum.mvps.length === 0 && <small className="px-1 text-[11px] text-gray-500">MVP 기록이 없습니다</small>}
          {sum.mvps.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2 border-b border-white/10 px-1 py-1.5">
              <b className="w-3 font-display text-[13px] text-gray-500">{i + 1}</b>
              <Portrait player={m} w={26} h={32} color="#fbbf24" />
              <b className="min-w-0 flex-1 truncate text-[13px] text-white">{m.name}</b>
              <b className="font-display text-[13px] text-amber-300">{m.n}회</b>
            </div>
          ))}
        </SideNav>

        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': n }}>
          <div className="flex items-baseline gap-3">
            <p className="mt-lab" style={{ '--a': n }}>Games</p>
            <p className="ml-auto text-sm text-gray-400">평균 득점 <b className="font-display text-base text-white">{avg(runs)}</b> · 실점 <b className="font-display text-base text-white">{avg(given)}</b></p>
          </div>
          <div className="mt-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
            {list.map((h) => <GameRow key={h.at + h.opp} h={h} on={sel?.at === h.at} onPick={setSel} />)}
            {list.length === 0 && <p className="text-sm text-gray-500">아직 치른 경기가 없습니다. 플레이에서 경기를 치르면 여기에 쌓입니다.</p>}
          </div>
        </section>

        <aside className="mt-cut mt-frame mt-glass mt-scroll flex min-h-0 flex-col gap-4 overflow-y-auto p-6" style={{ ...cut(20), '--a': sel ? resultOf(sel)[1] : n }}>
          <p className="mt-lab" style={{ '--a': sel ? resultOf(sel)[1] : n }}>Game</p>
          {!sel ? <p className="text-sm text-gray-500">목록에서 경기를 고르세요.</p> : (() => {
            const [ko, c] = resultOf(sel);
            const m = modeOf(sel);
            return (
              <>
                <Hero img={sel.mvp ? `url(cards/${encodeURIComponent(sel.mvp.id)}.webp), url(profiles/${encodeURIComponent(sel.mvp.id)}.webp), url(ui/mt/tile-record.webp)` : 'url(ui/mt/tile-record.webp)'}
                  name={sel.opp} color={c} h={150} pos="60% 12%" />
                <div className="flex items-end justify-between">
                  <span>
                    <small className="block text-[11px] text-gray-400">{sel.my}</small>
                    <b className="font-display text-4xl font-extrabold text-white">{sel.myRuns}</b>
                  </span>
                  <b className="font-display text-2xl font-extrabold" style={{ color: c }}>{ko}</b>
                  <span className="text-right">
                    <small className="block text-[11px] text-gray-400">{sel.opp}</small>
                    <b className="font-display text-4xl font-extrabold text-white">{sel.oppRuns}</b>
                  </span>
                </div>
                <Stats items={[['모드', m.ko], ['단계', sel.round || '단판'], ['점수 차', Math.abs((sel.myRuns || 0) - (sel.oppRuns || 0))]]} />
                <div>
                  <KV k="치른 날" v={fmtDate(sel.at)} />
                  <KV k="경기 MVP" v={sel.mvp?.name || '없음'} color="#fbbf24" />
                  {Array.isArray(sel.augs) && sel.augs.length > 0 && <KV k="쓴 증강" v={sel.augs.map((a) => a.name).join(' · ')} color="#c4b5fd" />}
                </div>
              </>
            );
          })()}
        </aside>
      </div>
    </div>
  );
}
