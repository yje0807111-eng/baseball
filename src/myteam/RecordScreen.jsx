/*
 * 기록 — 치른 경기 목록 (최근 50경기). 라커·상점과 같은 문법: 왼쪽 사이드 분류 / 가운데 경기 줄 / 오른쪽 상세
 *  분류: 전체 · 단판 · 토너먼트 · 랭크
 *  사이드 아래: 전적 · 승률 · 최근 10경기 흐름 · 경기 MVP TOP 3
 *  줄 오른쪽 ▾: 그 경기 상세(gameDetail.js 가 남긴 것) — 라인 스코어 / 타순 · 등판 투수 / 시너지 · 작전 · 아이템 / 승률 흐름 · 지시 · 득점
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { rankSummary } from './rank.js';
import { UiStyle, Bg, TopBar, SideNav, Hero, KV, Stats, Portrait } from './ui.jsx';
import { artId } from '../data/artAlias.js';
import { SynIcon } from './ReadyLocker.jsx';
import { SIDES } from './strategy.js';
import { FORM_OF } from './form.js';

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

const STYLE = `
  @keyframes recOpen { from { opacity:0; transform:translateY(-6px); clip-path:inset(0 0 100% 0); } to { opacity:1; transform:none; clip-path:inset(0 0 0 0); } }
  .rec-open { animation: recOpen .28s cubic-bezier(.2,.8,.2,1) both; }
  .rec-more { display:grid; place-items:center; width:40px; flex:none; background:rgba(255,255,255,.035); color:#9ca3af; transition:background .15s,color .15s; }
  .rec-more:hover:not(:disabled) { background:rgba(255,255,255,.07); color:#fff; }
  .rec-more.on { background:color-mix(in srgb,var(--a) 22%,transparent); color:var(--a); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 60%,transparent); }
  .rec-more:disabled { opacity:.25; cursor:default; }
  .rec-more svg { transition: transform .22s ease; }
  .rec-more.on svg { transform: rotate(180deg); }
`;
const lab = (a) => ({ fontSize: 10, '--a': a });
const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`;
const half = (x) => `${x.inning}회${x.top ? '초' : '말'}`;
/** 같은 반 이닝의 득점은 한 줄로 */
const byHalf = (plays) => plays.reduce((out, p) => {
  const last = out[out.length - 1];
  if (last && last.inning === p.inning && last.top === p.top) { last.text.push(p.text); last.runs += p.runs; } else out.push({ ...p, text: [p.text] });
  return out;
}, []);

/** 라인 스코어 — 1~9회(연장이면 더) · R · H. 이긴 홈 팀이 치지 않은 마지막 말은 X */
function LineScore({ h, d }) {
  const rows = [['my', h.my, d.board.my, h.myRuns, d.hits?.my], ['opp', h.opp, d.board.opp, h.oppRuns, d.hits?.opp]];
  const n = Math.max(9, d.board.my.length, d.board.opp.length);
  const cols = `132px repeat(${n},minmax(0,1fr)) 44px 44px`;
  return (
    <div className="mt-cut min-w-0 bg-white/[0.035] px-3 py-2" style={cut(8)}>
      <div className="grid items-center gap-1 pb-1 text-center font-display text-[11px] text-gray-500" style={{ gridTemplateColumns: cols }}>
        <span />
        {Array.from({ length: n }, (_, i) => <span key={i}>{i + 1}</span>)}
        <span className="text-gray-300">R</span><span>H</span>
      </div>
      {rows.map(([k, name, line, r, hits]) => (
        <div key={k} className="grid items-center gap-1 border-t border-white/10 py-1 text-center font-display tabular-nums" style={{ gridTemplateColumns: cols }}>
          <b className="truncate text-left font-sans text-[13px]" style={{ color: k === 'my' ? '#6ee7b7' : '#fca5a5' }}>{name}</b>
          {Array.from({ length: n }, (_, i) => {
            const v = line[i];
            const x = v == null && k === 'my' && i === n - 1 && h.winner === 'my';
            return <span key={i} className={`text-[15px] ${v ? 'font-bold text-white' : 'text-gray-500'}`}>{x ? 'X' : v ?? '-'}</span>;
          })}
          <b className="text-[18px] font-extrabold text-white">{r}</b>
          <span className="text-[15px] text-gray-300">{hits ?? '-'}</span>
        </div>
      ))}
    </div>
  );
}

const FormMark = ({ form }) => {
  const f = form && form !== 'flat' ? FORM_OF[form] : null;
  return f ? <b className="font-display text-[10px] leading-none" style={{ color: f.color }}>{f.mark}</b> : <span />;
};
/** 타순 · 등판 투수 — 오늘 친 것 · 던진 것 */
function Box({ d }) {
  const tag = (n, k, c) => (n ? <span key={k} className="whitespace-nowrap" style={{ color: c }}>{k}{n > 1 ? ` ${n}` : ''}</span> : null);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="mt-lab pb-1" style={lab('#34d399')}>Lineup</p>
      {d.lineup.map((b, i) => (
        <div key={b.id} className="grid items-center gap-2 border-b border-white/[0.06] py-[3px] text-[12.5px]"
          style={{ gridTemplateColumns: '14px 30px minmax(0,1fr) 20px 40px 104px' }}>
          <b className="font-display text-gray-500">{i + 1}</b>
          <span className="font-display text-[11px] text-gray-400">{b.pos}</span>
          <b className="truncate text-white">{b.name}</b>
          <FormMark form={b.form} />
          <b className="text-right font-display text-[14px] tabular-nums" style={{ color: b.h ? '#fff' : '#6b7280' }}>{b.h}<span className="text-gray-600">/</span>{b.ab}</b>
          <span className="flex gap-1.5 text-[11px] text-gray-400">
            {[tag(b.hr, '홈런', '#fbbf24'), tag(b.rbi, '타점', '#6ee7b7'), tag(b.bb, '볼넷', '#93c5fd')]}
          </span>
        </div>
      ))}
      <p className="mt-lab pb-1 pt-3" style={lab('#f87171')}>Mound</p>
      {d.arms.length === 0 && <small className="text-[11px] text-gray-500">등판 기록 없음</small>}
      {d.arms.map((p) => (
        <div key={p.id} className="grid items-center gap-2 border-b border-white/[0.06] py-[3px] text-[12.5px]"
          style={{ gridTemplateColumns: '30px minmax(0,1fr) 20px 52px 44px 44px' }}>
          <span className="font-display text-[11px]" style={{ color: p.sp ? '#fca5a5' : '#9ca3af' }}>{p.sp ? '선발' : '구원'}</span>
          <b className="truncate text-white">{p.name}</b>
          <FormMark form={p.form} />
          <span className="text-right text-[11px] text-gray-400">투구 <b className="font-display text-[13px] text-white">{p.pc}</b></span>
          <span className="text-right text-[11px] text-gray-400">삼진 <b className="font-display text-[13px] text-white">{p.k}</b></span>
          <span className="text-right text-[11px] text-gray-400">실점 <b className="font-display text-[13px]" style={{ color: p.r ? '#fca5a5' : '#fff' }}>{p.r}</b></span>
        </div>
      ))}
    </div>
  );
}

/** 시너지 · 작전 · 증강과 아이템 */
function TeamSide({ d }) {
  const side = (s) => {
    const o = s.opts.find((x) => x.id === d.sides?.[s.key]);
    return o ? (
      <div key={s.key} className="flex items-center justify-between border-b border-white/10 py-1.5 text-[13px]">
        <span className="text-gray-400">{s.ko}</span><b style={{ color: s.color }}>{o.ko}</b>
      </div>
    ) : null;
  };
  const items = [...(d.augs || []).map((a) => ({ k: `a-${a.id}`, name: a.name, who: '증강', c: '#c4b5fd' })),
    ...(d.boosts || []).map((b) => ({ k: `b-${b.id}`, name: b.name, who: b.who, c: '#fbbf24' }))];
  return (
    <div className="flex min-w-0 flex-col">
      <p className="mt-lab pb-2" style={lab('#fbbf24')}>Synergy</p>
      {d.synergies.length === 0 && <small className="pb-1 text-[11px] text-gray-500">켜진 시너지 없음</small>}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {d.synergies.map((s) => (
          <div key={s.id} className="flex min-w-0 items-center gap-2">
            <SynIcon s={{ ...s, tiers: Array(s.tiers) }} w={28} />
            <span className="min-w-0">
              <b className="block truncate text-[12.5px] text-white">{s.name}</b>
              <small className="block font-display text-[10px] text-gray-500">{s.level}/{s.tiers}단계</small>
            </span>
          </div>
        ))}
      </div>
      {d.sides && <>
        <p className="mt-lab pb-1 pt-4" style={lab('#60a5fa')}>Tactics</p>
        {SIDES.map(side)}
      </>}
      <p className="mt-lab pb-1 pt-4" style={lab('#c4b5fd')}>Items</p>
      {items.length === 0 && <small className="text-[11px] text-gray-500">쓴 증강 · 아이템 없음</small>}
      {items.map((it) => (
        <div key={it.k} className="flex items-center justify-between gap-2 border-b border-white/10 py-1.5 text-[13px]">
          <b className="min-w-0 truncate" style={{ color: it.c }}>{it.name}</b><span className="shrink-0 text-[11px] text-gray-400">{it.who}</span>
        </div>
      ))}
    </div>
  );
}

/** 승률 흐름 — 50% 점선 위는 우리 쪽 */
function Curve({ flow, tone }) {
  const id = useId().replace(/:/g, '');
  const w = 1000;
  const hh = 72;
  const xs = flow.length > 1 ? flow : [...flow, ...flow];
  const step = w / (xs.length - 1);
  const d = xs.map((v, i) => `${i ? 'L' : 'M'} ${(i * step).toFixed(1)} ${(hh - v * hh).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${hh}`} preserveAspectRatio="none" className="block h-[72px] w-full">
      <rect width={w} height={hh} fill="rgba(255,255,255,.035)" />
      <clipPath id={id}><path d={`${d} L ${w} 0 L 0 0 Z`} /></clipPath>
      <rect width={w} height={hh} fill={tone} opacity=".16" clipPath={`url(#${id})`} />
      <line x1="0" y1={hh / 2} x2={w} y2={hh / 2} stroke="rgba(255,255,255,.28)" strokeDasharray="6 5" />
      <path d={d} fill="none" stroke={tone} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
function FlowSide({ d, tone }) {
  return (
    <div className="flex min-w-0 flex-col">
      <p className="mt-lab pb-2" style={lab(tone)}>Win Flow</p>
      {d.flow ? <Curve flow={d.flow} tone={tone} /> : <small className="text-[11px] text-gray-500">흐름 기록 없음</small>}
      <p className="mt-lab pb-1 pt-4" style={lab('#34d399')}>Calls</p>
      {d.calls.length === 0 && <small className="text-[11px] text-gray-500">지시 없이 끝난 경기</small>}
      {d.calls.map((c, i) => (
        <div key={i} className="grid items-center gap-2 border-b border-white/10 py-1 text-[12.5px]" style={{ gridTemplateColumns: '52px minmax(0,1fr) 36px' }}>
          <span className="font-display text-[12px] text-gray-400">{half(c)}</span>
          <span className="truncate text-gray-100">{c.ko}</span>
          <b className="text-right font-display text-[14px]" style={{ color: c.delta > 0 ? '#34d399' : '#f87171' }}>{pct(c.delta)}</b>
        </div>
      ))}
      <p className="mt-lab pb-1 pt-4" style={lab('#fbbf24')}>Scoring</p>
      {d.plays.length === 0 && <small className="text-[11px] text-gray-500">득점 없음</small>}
      {byHalf(d.plays).map((p, i) => (
        <div key={i} className="grid items-center gap-2 border-b border-white/[0.06] py-[3px] text-[12.5px]" style={{ gridTemplateColumns: '52px minmax(0,1fr) 28px' }}>
          <span className="font-display text-[12px] text-gray-400">{half(p)}</span>
          <span className="truncate text-gray-200">{p.text.join(' · ')}</span>
          <b className="text-right font-display text-[14px]" style={{ color: p.top ? '#f87171' : '#34d399' }}>+{p.runs}</b>
        </div>
      ))}
    </div>
  );
}

/** 펼친 상세 — 라인 스코어 + 세 칸 */
function GameDetail({ h }) {
  const d = h.detail;
  const [, c] = resultOf(h);
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, []);
  return (
    <div ref={ref} className="rec-open mt-cut mt-1 flex flex-col gap-4 bg-[#070b14]/80 p-4" style={{ ...cut(10), boxShadow: `inset 0 2px 0 ${c}` }}>
      <div className="grid items-stretch gap-3" style={{ gridTemplateColumns: 'minmax(0,1fr) 330px' }}>
        <LineScore h={h} d={d} />
        <Stats items={[['우리 종합', d.ovr.my ?? '—'], ['상대 종합', d.ovr.opp ?? '—'], ['내 지시', d.flow ? `${pct(d.gain)}%p` : '—']]} />
      </div>
      <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)' }}>
        <Box d={d} />
        <TeamSide d={d} />
        <FlowSide d={d} tone={c} />
      </div>
    </div>
  );
}

/** 경기 한 줄 — 날짜 · 모드 · 상대 · 점수 · 결과 · MVP · 펼치기 */
function GameRow({ h, on, open, onPick, onOpen }) {
  const [, c] = resultOf(h);
  return (
    <div className="flex flex-none flex-col">
      <div className="flex items-stretch gap-1">
        <GameLine h={h} on={on} onPick={onPick} />
        <button type="button" className={`rec-more mt-cut ${open ? 'on' : ''}`} style={{ ...cut(7), '--a': c }} disabled={!h.detail}
          aria-expanded={open} aria-label="경기 상세" onClick={() => onOpen(h)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5.2 7 9l4-3.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      {open && h.detail && <GameDetail h={h} />}
    </div>
  );
}

function GameLine({ h, on, onPick }) {
  const m = modeOf(h);
  const [ko, c] = resultOf(h);
  return (
    <button type="button" onClick={() => onPick(h)} className={`mt-row mt-cut min-w-0 flex-1 ${on ? 'on' : ''}`}
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
  const [open, setOpen] = useState(null); // 펼친 경기의 at

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
      <style>{STYLE}</style>
      <Bg img="ui/mt/tile-record.webp" opacity={0.55} />
      <TopBar eyebrow="Record" section="기록" team={account.team} account={account} onBack={onBack} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4"
        style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>

        <SideNav items={NAV} value={mode} onChange={(k) => { setMode(k); setSel(null); setOpen(null); }} a="#7dd3fc" label="Mode">
          <div className="mt-cut bg-white/[0.045] p-3" style={cut(8)}>
            <p className="flex items-baseline justify-between text-[11px] text-gray-400">통산 전적<b className="font-display text-[13px] text-gray-300">{history.length}경기</b></p>
            <b className="font-display text-2xl text-white">{all.w}승 {all.d}무 {all.l}패</b>
            <p className="mt-1 text-[11px] text-gray-500">승률 {rate == null ? '—' : `${rate}%`}{sum.streak > 1 ? ` · ${sum.streak}연승 중` : ''}</p>
          </div>
          <p className="mt-lab px-1 pb-2 pt-3" style={{ fontSize: 10, '--a': '#7dd3fc' }}>Last 10</p>
          <div className="flex flex-wrap gap-1 px-1">
            {sum.form.length === 0 && <small className="text-[11px] text-gray-500">경기 없음</small>}
            {sum.form.map((f, i) => {
              const c = f === 'W' ? '#34d399' : f === 'L' ? '#f87171' : '#94a3b8';
              return <b key={`${f}${i}`} className="mt-cut grid h-6 w-6 place-items-center font-display text-[12px] font-extrabold"
                style={{ ...cut(4), color: c, boxShadow: `inset 0 0 0 1px ${c}66` }}>{f}</b>;
            })}
          </div>
          <p className="mt-lab px-1 pb-2 pt-4" style={{ fontSize: 10, '--a': '#fbbf24' }}>MVP Top 3</p>
          {sum.mvps.length === 0 && <small className="px-1 text-[11px] text-gray-500">MVP 기록 없음</small>}
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
            {list.map((h) => <GameRow key={h.at + h.opp} h={h} on={sel?.at === h.at} open={open === h.at} onPick={setSel}
              onOpen={(x) => { setSel(x); setOpen((v) => (v === x.at ? null : x.at)); }} />)}
            {list.length === 0 && <p className="text-sm text-gray-500">치른 경기 없음 · 플레이에서 치르면 여기에 쌓인다</p>}
          </div>
        </section>

        <aside className="mt-cut mt-frame mt-glass mt-scroll flex min-h-0 flex-col gap-4 overflow-y-auto p-6" style={{ ...cut(20), '--a': sel ? resultOf(sel)[1] : n }}>
          <p className="mt-lab" style={{ '--a': sel ? resultOf(sel)[1] : n }}>Game</p>
          {!sel ? <p className="text-sm text-gray-500">목록에서 경기 고르기</p> : (() => {
            const [ko, c] = resultOf(sel);
            const m = modeOf(sel);
            return (
              <>
                <Hero img={sel.mvp ? `url(cards/${encodeURIComponent(artId(sel.mvp.id))}.webp), url(profiles/${encodeURIComponent(artId(sel.mvp.id))}.webp), url(ui/mt/tile-record.webp)` : 'url(ui/mt/tile-record.webp)'}
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
