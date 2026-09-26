/*
 * 기록 — 치른 경기 목록 (최근 50경기). 라커 · 상점과 같은 문법: 위 탭 분류 / 가운데 경기 줄 / 오른쪽 상세
 *  탭: 전체 · 단판 · 토너먼트 · 랭크(옆 숫자 = 경기 수) · 도감 · 주간 과제(받을 보상이 있으면 금빛 숫자)
 *  목록 위 한 줄: 통산 전적 · 승률 · 연승 · 최근 10경기 흐름 / 오른쪽 아래: 경기 MVP TOP 3
 *  줄 오른쪽 ▾: 그 경기 상세(gameDetail.js 가 남긴 것) — 라인 스코어 / 시너지 · 작전 · 아이템 칩 / 박스 스코어 | 승률 흐름 · 지시 · 득점
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { rankSummary } from './rank.js';
import { UiStyle, Bg, TopBar, TopTabs, Hero, KV, Stats, Portrait } from './ui.jsx';
import { artId } from '../data/artAlias.js';
import { SynIcon } from './ReadyLocker.jsx';
import { SIDES } from './strategy.js';
import { FORM_OF } from './form.js';
import { DexView, WeekView } from './ProgressPanels.jsx';
import { loadAccount } from './store.js';
import { missionState } from './missions.js';

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
  .rec-more { display:grid; place-items:center; width:52px; flex:none; background:rgba(255,255,255,.06); color:#d1d5db; box-shadow:inset 0 0 0 1px rgba(255,255,255,.14); transition:background .15s,color .15s,box-shadow .15s; }
  .rec-more:hover:not(:disabled) { background:rgba(255,255,255,.12); color:#fff; box-shadow:inset 0 0 0 1px rgba(255,255,255,.3); }
  .rec-more.on { background:color-mix(in srgb,var(--a) 22%,transparent); color:var(--a); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 60%,transparent); }
  .rec-more:disabled { opacity:.4; cursor:default; }
  .rec-more svg { transition: transform .22s ease; }
  .rec-more.on svg { transform: rotate(180deg); }
`;
const lab = (a) => ({ fontSize: 12, '--a': a });
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
  const cols = `150px repeat(${n},minmax(0,1fr)) 50px 50px`;
  return (
    <div className="mt-cut min-w-0 bg-white/[0.035] px-3 py-2" style={cut(8)}>
      <div className="grid items-center gap-1 pb-1 text-center font-display text-t4 text-gray-400" style={{ gridTemplateColumns: cols }}>
        <span />
        {Array.from({ length: n }, (_, i) => <span key={i}>{i + 1}</span>)}
        <span className="text-gray-300">R</span><span>H</span>
      </div>
      {rows.map(([k, name, line, r, hits]) => (
        <div key={k} className="grid items-center gap-1 border-t border-white/10 py-1 text-center font-display tabular-nums" style={{ gridTemplateColumns: cols }}>
          <b className="truncate text-left font-sans text-t3" style={{ color: k === 'my' ? '#6ee7b7' : '#fca5a5' }}>{name}</b>
          {Array.from({ length: n }, (_, i) => {
            const v = line[i];
            const x = v == null && k === 'my' && i === n - 1 && h.winner === 'my';
            return <span key={i} className={`text-t2 ${v ? 'font-bold text-white' : 'text-gray-400'}`}>{x ? 'X' : v ?? '-'}</span>;
          })}
          <b className="text-t2 font-extrabold text-white">{r}</b>
          <span className="text-t2 text-gray-300">{hits ?? '-'}</span>
        </div>
      ))}
    </div>
  );
}

/** 컨디션 — 글자만. 보통은 흐리게 */
const FormText = ({ form }) => {
  const f = FORM_OF[form] || FORM_OF.flat;
  return <b className="text-t3" style={{ color: f.swing ? f.color : '#4b5563' }}>{f.ko}</b>;
};
/* 박스 스코어 — 머리글과 줄이 같은 칸을 쓴다 */
const BOX_COLS = '20px 36px minmax(0,1fr) 52px repeat(5,50px)';
const Num = ({ v, c = '#fff', dim = true }) => (
  <b className="text-center font-display text-t2 tabular-nums" style={{ color: dim && !v ? '#4b5563' : c }}>{v}</b>
);
const BoxHead = ({ label, a, cols }) => (
  <div className="grid items-end gap-2 pb-1" style={{ gridTemplateColumns: BOX_COLS }}>
    <p className="mt-lab" style={{ ...lab(a), gridColumn: 'span 3' }}>{label}</p>
    {cols.map((k) => <span key={k} className="text-center text-t4 text-gray-400">{k}</span>)}
  </div>
);
/** 타순 · 등판 투수 표 */
function BoxScore({ d }) {
  const row = 'grid items-center gap-2 border-b border-white/[0.06] py-1 text-t3';
  return (
    <div className="flex min-w-0 flex-col">
      <BoxHead label="타격 기록" a="#34d399" cols={['컨디션', '타수', '안타', '홈런', '타점', '볼넷']} />
      {d.lineup.map((b, i) => (
        <div key={b.id} className={row} style={{ gridTemplateColumns: BOX_COLS }}>
          <b className="font-display text-gray-400">{i + 1}</b>
          <span className="font-display text-t4 text-gray-400">{b.pos}</span>
          <b className="truncate text-white">{b.name}</b>
          <span className="text-center"><FormText form={b.form} /></span>
          <Num v={b.ab} dim={false} c="#d1d5db" />
          <Num v={b.h} />
          <Num v={b.hr} c="#fbbf24" />
          <Num v={b.rbi} c="#6ee7b7" />
          <Num v={b.bb} c="#93c5fd" />
        </div>
      ))}
      <div className="h-4" />
      <BoxHead label="투구 기록" a="#f87171" cols={['컨디션', '투구', '타자', '피안타', '삼진', '실점']} />
      {d.arms.length === 0 && <small className="text-t4 text-gray-400">등판 기록 없음</small>}
      {d.arms.map((p) => (
        <div key={p.id} className={row} style={{ gridTemplateColumns: BOX_COLS }}>
          <span className="col-span-2 font-display text-t4" style={{ color: p.sp ? '#fca5a5' : '#9ca3af' }}>{p.sp ? '선발' : '구원'}</span>
          <b className="truncate text-white">{p.name}</b>
          <span className="text-center"><FormText form={p.form} /></span>
          <Num v={p.pc} dim={false} c="#d1d5db" />
          <Num v={p.bf} dim={false} c="#d1d5db" />
          <Num v={p.h} dim={false} />
          <Num v={p.k} />
          <Num v={p.r} c="#fca5a5" />
        </div>
      ))}
    </div>
  );
}

/** 시너지 · 작전 · 증강과 아이템 — 칩 한 줄 */
function TeamChips({ d }) {
  const chip = 'mt-cut inline-flex items-center gap-1.5 bg-white/[0.05] px-2.5 py-1 text-t3 font-bold';
  const ring = (a) => ({ ...cut(6), color: a, boxShadow: `inset 0 0 0 1px ${a}80` });
  const items = [...(d.augs || []).map((a) => ({ k: `a-${a.id}`, name: a.name, who: '증강', c: '#c4b5fd' })),
    ...(d.boosts || []).map((b) => ({ k: `b-${b.id}`, name: b.name, who: b.who, c: '#fbbf24' }))];
  const groups = [
    d.synergies.map((s) => (
      <span key={s.id} className={chip} style={ring('#fde68a')}>
        <SynIcon s={{ ...s, tiers: Array(s.tiers) }} w={22} />{s.name}<small className="font-display font-medium text-gray-400">{s.level}/{s.tiers}</small>
      </span>
    )),
    d.sides ? SIDES.map((s) => {
      const o = s.opts.find((x) => x.id === d.sides[s.key]);
      return o ? <span key={s.key} className={chip} style={ring(s.color)}><small className="font-medium text-gray-400">{s.ko}</small>{o.ko}</span> : null;
    }) : [],
    items.map((it) => <span key={it.k} className={chip} style={ring(it.c)}>{it.name}<small className="font-medium text-gray-400">{it.who}</small></span>),
  ].filter((g) => g.some(Boolean));
  if (!groups.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups.map((g, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="mx-1 h-5 w-px bg-white/15" />}
          {g}
        </React.Fragment>
      ))}
    </div>
  );
}

/** 승률 흐름 — 50% 점선 위는 우리 쪽. 회차 눈금 · 득점한 곳에 점 */
function Curve({ d, tone }) {
  const id = useId().replace(/:/g, '');
  const w = 1000;
  const hh = 96;
  const xs = d.flow.length > 1 ? d.flow : [...d.flow, ...d.flow];
  const step = w / (xs.length - 1);
  const path = xs.map((v, i) => `${i ? 'L' : 'M'} ${(i * step).toFixed(1)} ${(hh - v * hh).toFixed(1)}`).join(' ');
  const ticks = d.ticks || [];
  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${hh}`} preserveAspectRatio="none" className="block w-full" style={{ height: hh }}>
          <rect width={w} height={hh} fill="rgba(255,255,255,.035)" />
          <clipPath id={id}><path d={`${path} L ${w} 0 L 0 0 Z`} /></clipPath>
          <rect width={w} height={hh} fill={tone} opacity=".16" clipPath={`url(#${id})`} />
          {ticks.map((x, i) => i > 0 && <line key={i} x1={x * w} y1="0" x2={x * w} y2={hh} stroke="rgba(255,255,255,.08)" vectorEffect="non-scaling-stroke" />)}
          <line x1="0" y1={hh / 2} x2={w} y2={hh / 2} stroke="rgba(255,255,255,.28)" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
          <path d={path} fill="none" stroke={tone} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* 점은 SVG 밖에 — 늘어난 좌표계에서도 동그랗게 */}
        {(d.dots || []).map((p, i) => (
          <i key={i} className="absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${p.x * 100}%`, top: `${(1 - p.v) * 100}%`, background: p.top ? '#f87171' : '#34d399', boxShadow: '0 0 0 2px #05080f' }} />
        ))}
      </div>
      {ticks.length > 0 && (
        <div className="relative h-4 font-display text-t4 text-gray-400">
          {ticks.map((x, i) => <span key={i} className="absolute top-0.5" style={{ left: `calc(${x * 100}% + 3px)` }}>{i + 1}</span>)}
        </div>
      )}
    </div>
  );
}
function FlowSide({ d, tone }) {
  return (
    <div className="flex min-w-0 flex-col">
      <p className="mt-lab pb-2" style={lab(tone)}>승률 흐름</p>
      {d.flow ? <Curve d={d} tone={tone} /> : <small className="text-t4 text-gray-400">흐름 기록 없음</small>}
      <p className="mt-lab pb-1 pt-3" style={lab('#34d399')}>승부처 지시</p>
      {d.calls.length === 0 && <small className="text-t4 text-gray-400">지시 없이 끝난 경기</small>}
      {d.calls.map((c, i) => (
        <div key={i} className="grid items-center gap-2 border-b border-white/10 py-1 text-t3" style={{ gridTemplateColumns: '62px minmax(0,1fr) 40px' }}>
          <span className="font-display text-t3 text-gray-400">{half(c)}</span>
          <span className="truncate text-gray-100">{c.ko}</span>
          <b className="text-right font-display text-t2" style={{ color: c.delta > 0 ? '#34d399' : '#f87171' }}>{pct(c.delta)}</b>
        </div>
      ))}
      <p className="mt-lab pb-1 pt-4" style={lab('#fbbf24')}>득점 장면</p>
      {d.plays.length === 0 && <small className="text-t4 text-gray-400">득점 없음</small>}
      {byHalf(d.plays).map((p, i) => (
        <div key={i} className="grid items-start gap-2 border-b border-white/[0.06] py-1 text-t3" style={{ gridTemplateColumns: '62px minmax(0,1fr) 34px' }}>
          <span className="font-display text-t3 leading-[1.45] text-gray-400">{half(p)}</span>
          <span className="leading-[1.45] text-gray-200">{p.text.join(' · ')}</span>
          <b className="text-right font-display text-t2 leading-[1.35]" style={{ color: p.top ? '#f87171' : '#34d399' }}>+{p.runs}</b>
        </div>
      ))}
    </div>
  );
}

/** 펼친 상세 — 라인 스코어 · 칩 한 줄 · 박스 스코어 | 흐름 */
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
      <TeamChips d={d} />
      <div className="grid gap-7" style={{ gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)' }}>
        <BoxScore d={d} />
        <FlowSide d={d} tone={c} />
      </div>
    </div>
  );
}

/** 경기 한 줄 — 결과 · 점수 · 상대(왼쪽에 모아 한눈에) / 모드 · 날짜 · MVP · 펼치기 */
function GameRow({ h, on, open, onPick, onOpen }) {
  const [, c] = resultOf(h);
  return (
    <div className="flex flex-none flex-col">
      <div className="flex items-stretch gap-1">
        <GameLine h={h} on={on} onPick={onPick} />
        <button type="button" className={`rec-more mt-cut ${open ? 'on' : ''}`} style={{ ...cut(7), '--a': c }} disabled={!h.detail}
          aria-expanded={open} aria-label="경기 상세" onClick={() => onOpen(h)}>
          <svg width="20" height="20" viewBox="0 0 14 14" fill="none"><path d="M3 5.2 7 9l4-3.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
    <button type="button" onClick={() => onPick(h)} className={`mt-row mt-cut min-w-0 ${on ? 'on' : ''}`}
      style={{ flex: '1 1 0%', gridTemplateColumns: '44px 112px minmax(0,1fr) 88px 104px 152px', '--a': c }}>
      <b className="mt-cut grid h-9 place-items-center font-display text-t2 font-extrabold text-[#05080f]" style={{ ...cut(5), background: c }}>{ko}</b>
      <b className="flex h-9 items-center justify-center rounded-md bg-black/35 font-display text-t1 font-extrabold tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]">
        <span className={h.myRuns >= h.oppRuns ? 'text-white' : 'text-gray-500'}>{h.myRuns}</span>
        <span className="px-1.5 text-t3 text-gray-500">:</span>
        <span className={h.oppRuns >= h.myRuns ? 'text-white' : 'text-gray-500'}>{h.oppRuns}</span>
      </b>
      <span className="min-w-0">
        <b className="block truncate text-t2 font-black text-white"><small className="mr-1.5 text-t4 font-bold text-gray-400">vs</small>{h.opp}</b>
        <small className="block truncate text-t4 text-gray-400">{h.round || '단판 승부'}</small>
      </span>
      <span className="mt-cut px-2 py-0.5 text-center text-t4 font-bold" style={{ ...cut(4), color: m.c, boxShadow: `inset 0 0 0 1px ${m.c}66` }}>{m.ko}</span>
      <span className="text-center font-display text-t3 text-gray-400">{fmtDate(h.at)}</span>
      <span className="flex min-w-0 items-center gap-2">
        {h.mvp ? (
          <>
            <Portrait player={h.mvp} w={32} h={38} color="#fbbf24" />
            <span className="min-w-0"><small className="block text-t4 text-gray-400">MVP</small><b className="block truncate text-t3 text-white">{h.mvp.name}</b></span>
          </>
        ) : <small className="text-t4 text-gray-500">MVP 없음</small>}
      </span>
    </button>
  );
}

export default function RecordScreen({ account: first, initialMode = 'all', onBack, onAccount }) {
  /* 도감 · 과제 값은 다른 화면(라커 · 드래프트)에서 바로 저장되니 들어올 때 새로 읽는다 */
  const [account, setAccount] = useState(() => loadAccount() || first);
  const takeAccount = (next) => { setAccount(next); onAccount?.(next); };
  const history = account.history || [];
  const [mode, setMode] = useState(initialMode);
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
  const n = MODES.find((m) => m.key === mode)?.c || '#7dd3fc';
  const weekLeft = missionState(account.week).filter((x) => x.done && !x.claimed).length;
  const NAV = [
    ...MODES.map((m) => ({ key: m.key, label: m.label, n: counts[m.key] })),
    { key: 'dex', label: '도감', n: (account.dex || []).length },
    { key: 'week', label: '주간 과제', badge: weekLeft },
  ];

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <style>{STYLE}</style>
      <Bg img="ui/mt/tile-record.webp" opacity={0.55} />
      <TopBar eyebrow="메인" section="기록" team={account.team} account={account} onBack={onBack}
        steps={<TopTabs items={NAV} value={mode} label="기록 메뉴" onChange={(k) => { setMode(k); setSel((k === 'all' ? history : history.filter((h) => modeKey(h) === k))[0] || null); setOpen(null); }} />} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4"
        style={{ gridTemplateColumns: 'minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>


        {mode === 'dex' ? <DexView account={account} onAccount={takeAccount} />
          : mode === 'week' ? <WeekView account={account} onAccount={takeAccount} />
          : (
        <>
        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': n }}>
          <div className="flex items-baseline gap-3">
            <p className="mt-lab" style={{ '--a': n }}>치른 경기</p>
            <p className="ml-auto text-t3 text-gray-400">평균 득점 <b className="font-display text-t3 text-white">{avg(runs)}</b> · 실점 <b className="font-display text-t3 text-white">{avg(given)}</b></p>
          </div>
          {/* 통산 요약 한 줄 — 옛 왼쪽 칸에 있던 것 */}
          <div className="mt-cut mt-3 flex items-center gap-5 bg-white/[0.045] px-4 py-2.5" style={cut(10)}>
            <span className="text-t4 font-bold text-gray-400">통산</span>
            <b className="font-display text-t2 text-white">{all.w}승 {all.d}무 {all.l}패</b>
            <span className="text-t3 text-gray-400">승률 <b className="font-display text-t3 text-white">{rate == null ? '—' : `${rate}%`}</b></span>
            {sum.streak > 1 && <span className="text-t3 font-bold text-emerald-300">{sum.streak}연승</span>}
            <span className="ml-auto flex items-center gap-2">
              <span className="text-t4 font-bold text-gray-400">최근 10경기</span>
              {sum.form.length === 0 && <small className="text-t4 text-gray-400">경기 없음</small>}
              {sum.form.map((f, i) => {
                const c = f === 'W' ? '#34d399' : f === 'L' ? '#f87171' : '#94a3b8';
                return <b key={`${f}${i}`} className="mt-cut grid h-6 w-6 place-items-center font-display text-t4 font-extrabold"
                  style={{ ...cut(4), color: c, boxShadow: `inset 0 0 0 1px ${c}66` }}>{f === 'W' ? '승' : f === 'L' ? '패' : '무'}</b>;
              })}
            </span>
          </div>
          <div className="mt-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
            {list.map((h) => <GameRow key={h.at + h.opp} h={h} on={sel?.at === h.at} open={open === h.at} onPick={setSel}
              onOpen={(x) => { setSel(x); setOpen((v) => (v === x.at ? null : x.at)); }} />)}
            {list.length === 0 && <p className="text-t3 text-gray-400">치른 경기 없음</p>}
          </div>
        </section>

        <aside className="mt-cut mt-frame mt-glass mt-scroll flex min-h-0 flex-col gap-4 overflow-y-auto p-6" style={{ ...cut(20), '--a': sel ? resultOf(sel)[1] : n }}>
          <p className="mt-lab" style={{ '--a': sel ? resultOf(sel)[1] : n }}>경기 요약</p>
          {!sel ? <p className="text-t3 text-gray-400">{list.length ? '목록에서 경기 고르기' : '치른 경기 없음'}</p> : (() => {
            const [ko, c] = resultOf(sel);
            const m = modeOf(sel);
            return (
              <>
                <Hero img={sel.mvp ? `url(cards/${encodeURIComponent(artId(sel.mvp.id))}.webp), url(profiles/${encodeURIComponent(artId(sel.mvp.id))}.webp), url(ui/mt/tile-record.webp)` : 'url(ui/mt/tile-record.webp)'}
                  name={sel.opp} color={c} h={150} pos="60% 12%" />
                <div className="flex items-end justify-between">
                  <span>
                    <small className="block text-t4 text-gray-400">{sel.my === '나의 드림팀' ? account.team?.name || sel.my : sel.my}</small>
                    <b className="font-display text-4xl font-extrabold text-white">{sel.myRuns}</b>
                  </span>
                  <b className="font-display text-t1 font-extrabold" style={{ color: c }}>{ko}</b>
                  <span className="text-right">
                    <small className="block text-t4 text-gray-400">{sel.opp}</small>
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
          {/* MVP 순위 — 옛 왼쪽 칸에 있던 것, 경기 요약 아래로 */}
          <div className="mt-auto">
            <p className="mt-lab pb-2" style={{ '--a': '#fbbf24' }}>MVP 순위</p>
            {sum.mvps.length === 0 && <small className="text-t4 text-gray-400">MVP 기록 없음</small>}
            {sum.mvps.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2 border-b border-white/10 py-1.5">
                <b className="w-3 font-display text-t3 text-gray-400">{i + 1}</b>
                <Portrait player={m} w={26} h={32} color="#fbbf24" />
                <b className="min-w-0 flex-1 truncate text-t3 text-white">{m.name}</b>
                <b className="font-display text-t3 text-amber-300">{m.n}회</b>
              </div>
            ))}
          </div>
        </aside>
        </>
          )}
      </div>
    </div>
  );
}
