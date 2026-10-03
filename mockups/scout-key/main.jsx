/*
 * 정비 3단계 왼쪽 상대 판 — 아래 '상대 핵심 인물' 8안 (/mockups/scout-key/?p=1 · ?p=2, 실제 크기 340 × 806)
 * 3단계 상황에 나오는 사람만: 장타자(파워 위 셋 → 외야 후진) · 빠른 주자(주력 위 둘 → 견제) · 포수(어깨 → 도루). 답은 주지 않는다
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { TEAM_NEON } from '../../src/myteam/teamColor.js';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const MYT = seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)), OPT = seriesTeam(pick(/^1997-ob/) || SERIES[9], seeded(3));
const ME = engineTeam(MYT), OP = engineTeam(OPT);
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;
const bat = (b) => (st(b, 'contact') + st(b, 'power')) / 2;
const avg = (l, f) => Math.round(l.reduce((n, x) => n + f(x), 0) / (l.length || 1));
const pen3 = (e) => e.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a)).slice(0, 3);
const club = Object.keys(TEAM_NEON).find((k) => OPT.name.includes(k));
const C = TEAM_NEON[club] || '#a78bfa', MY = '#34d399', DIM = '#9ca3af', GOLD = '#fbbf24', US = '#10b981';
const V = Number(new URLSearchParams(location.search).get('v') || 1);
const cut = (c) => ({ '--c': `${c}px` });

/* 상대 핵심 인물 */
const SLUG = [...OP.batters].sort((a, b) => st(b, 'power') - st(a, 'power')).slice(0, 3);
const FAST = [...OP.batters].sort((a, b) => st(b, 'speed') - st(a, 'speed')).slice(0, 2);
const CAT = OP.catcher || OP.batters.find((b) => b.position === 'C');
const OURFAST = [...ME.batters].filter((b) => st(b, 'speed') >= 80).sort((a, b) => st(b, 'speed') - st(a, 'speed')).slice(0, 2);
/* 상황 — [id, 이름, 쪽, 등장 인물, 고르는 칸, 지금 고른 칸] */
/* ───── 공통 조각 ───── */
const Rule = () => <span className="block h-px shrink-0 bg-white/[0.08]" />;
const Sub = ({ children, right }) => <span className="flex items-baseline justify-between"><span className="text-t3 font-bold text-gray-300">{children}</span>{right}</span>;
const Emb = ({ s = 32 }) => <span className="grid shrink-0 place-items-center rounded-full font-display font-extrabold" style={{ width: s, height: s, fontSize: s * 0.36, color: C, background: `${C}1a`, boxShadow: `inset 0 0 0 1px ${C}66` }}>{club || 'OB'}</span>;
/* 머리(5안 칸 막대) */
const mk = (ko, t, u) => ({ ko, t, u, d: u - t });
const ROWS = [mk('타선', avg(OP.batters, bat), avg(ME.batters, bat)), mk('선발', Math.round(arm(OP.pitchers[0])), Math.round(arm(ME.pitchers[0]))), mk('불펜', avg(pen3(OP), arm), avg(pen3(ME), arm))];
function Head() {
  return (
    <>
      <div className="flex shrink-0 items-center gap-2.5"><Emb /><b className="min-w-0 flex-1 truncate text-t2 font-black text-white">{OPT.name}</b><b className="font-display text-t1 font-extrabold leading-none" style={{ color: C }}>{avg(OPT.roster, (p) => p.overall)}</b></div>
      <Rule />
      <div className="flex flex-col gap-3">
        <span className="flex justify-between text-t4 font-bold"><span style={{ color: C }}>상대</span><span style={{ color: MY }}>우리</span></span>
        {ROWS.map((r) => {
          const n = Math.min(5, Math.ceil(Math.abs(r.d) / 2));
          const cells = (side) => Array.from({ length: 5 }, (_, i) => { const on = side === 'L' ? r.d < 0 && 4 - i < n : r.d > 0 && i < n; return <i key={i} className="block h-2 flex-1 rounded-[2px]" style={{ background: on ? (side === 'L' ? C : MY) : 'rgba(255,255,255,.06)' }} />; });
          return (
            <div key={r.ko} className="grid items-center gap-2" style={{ gridTemplateColumns: '2rem 1fr 2.6rem 1fr 2rem' }}>
              <b className="font-display text-t2 leading-none" style={{ color: r.d < 0 ? C : DIM }}>{r.t}</b><span className="flex gap-[3px]">{cells('L')}</span>
              <span className="text-center text-t4 text-gray-300">{r.ko}</span><span className="flex gap-[3px]">{cells('R')}</span>
              <b className="text-right font-display text-t2 leading-none" style={{ color: r.d > 0 ? MY : DIM }}>{r.u}</b>
            </div>
          );
        })}
      </div>
    </>
  );
}
/* 상대 핵심 인물 — 양끝 막대(2단계 2안 결) */
const Bar = ({ v, lo, hi }) => { const at = Math.max(4, Math.min(96, ((v - lo) / (hi - lo)) * 100)); return <span className="relative block h-1.5 flex-1 rounded-full bg-white/[0.08]"><i className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${at}%`, background: '#e5e7eb', boxShadow: `0 0 0 2px #0b0f1a, 0 0 8px ${C}` }} /></span>; };

/* ───── 아래 '상대 핵심 인물' 8안 — 3단계 상황(외야 후진 · 견제 · 도루)에 나오는 사람만 ───── */
const PEOPLE = [
  { k: 'slug', ko: '장타자', stat: 'power', sk: '파워', list: SLUG, lo: 60, hi: 110, c: '#f87171' },
  { k: 'fast', ko: '빠른 주자', stat: 'speed', sk: '주력', list: FAST, lo: 60, hi: 110, c: '#38bdf8' },
  { k: 'cat', ko: '포수', stat: 'defense', sk: '어깨', list: [CAT], lo: 75, hi: 100, c: '#fbbf24' },
];
const order = (p) => OP.batters.indexOf(p) + 1;
const Mark = ({ g, sm }) => <b className={`whitespace-nowrap rounded-full px-2 ${sm ? 'text-[11px] leading-4' : 'py-0.5 text-t4'}`} style={{ color: g.c, background: `${g.c}1a`, boxShadow: `inset 0 0 0 1px ${g.c}55` }}>{g.ko}</b>;
const tagOf = (p) => PEOPLE.find((g) => g.list.includes(p));

const LOW = {
  1: ['양끝 막대', () => (
    <div className="flex flex-col gap-4">
      {PEOPLE.map((g) => (
        <div key={g.k} className="flex flex-col gap-2">
          <Sub>{g.ko} · {g.sk}</Sub>
          {g.list.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5">
              <Portrait player={p} w={26} h={34} color={g.c} />
              <b className="w-[4.2rem] truncate text-t3 text-white">{p.name}</b>
              <Bar v={st(p, g.stat)} lo={g.lo} hi={g.hi} />
              <b className="w-7 text-right font-display text-t3 text-gray-200">{st(p, g.stat)}</b>
            </div>
          ))}
        </div>
      ))}
    </div>
  )],
  2: ['얼굴 카드 셋', () => (
    <div className="flex flex-col gap-2">
      {PEOPLE.map((g) => { const p = g.list[0]; return (
        <div key={g.k} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: `linear-gradient(90deg, ${g.c}1c, transparent 75%)`, boxShadow: `inset 0 0 0 1px ${g.c}44` }}>
          <Portrait player={p} w={50} h={64} color={g.c} />
          <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5"><Mark g={g} sm /><b className="truncate text-t2 text-white">{p.name}</b><span className="text-t4 text-gray-400">{g.k === 'cat' ? '포수' : `${order(p)}번`}{g.list.length > 1 ? ` · 외 ${g.list.slice(1).map((x) => x.name).join(' · ')}` : ''}</span></span>
          <span className="flex flex-col items-end"><span className="text-t4 text-gray-400">{g.sk}</span><b className="font-display text-t1 leading-none" style={{ color: g.c }}>{st(p, g.stat)}</b></span>
        </div>
      ); })}
    </div>
  )],
  3: ['타순 위 표시', () => (
    <div className="flex flex-col gap-2">
      <Sub>상대 타순</Sub>
      {OP.batters.map((b, i) => { const g = tagOf(b); return (
        <div key={b.id} className="flex items-center gap-2.5" style={{ opacity: g ? 1 : 0.55 }}>
          <b className="w-4 font-display text-t3 text-gray-500">{i + 1}</b>
          <b className="min-w-0 flex-1 truncate text-t3 text-white">{b.name}</b>
          {g && <Mark g={g} />}
          {g && <b className="w-7 text-right font-display text-t3" style={{ color: g.c }}>{st(b, g.stat)}</b>}
        </div>
      ); })}
    </div>
  )],
  4: ['묶음 칩', () => (
    <div className="flex flex-col gap-3">
      {PEOPLE.map((g) => (
        <div key={g.k} className="flex flex-col gap-1.5">
          <span className="text-t4 font-bold" style={{ color: g.c }}>{g.ko}</span>
          <span className="flex flex-wrap gap-1.5">{g.list.map((p) => <span key={p.id} className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5" style={{ background: `${g.c}14`, boxShadow: `inset 0 0 0 1px ${g.c}44` }}><Portrait player={p} w={22} h={22} round color={g.c} /><b className="text-t4 text-white">{p.name}</b><b className="font-display text-t4" style={{ color: g.c }}>{st(p, g.stat)}</b></span>)}</span>
        </div>
      ))}
    </div>
  )],
  5: ['경계 순위', () => {
    const all = PEOPLE.flatMap((g) => g.list.map((p) => ({ g, p, z: (st(p, g.stat) - g.lo) / (g.hi - g.lo) }))).sort((a, b) => b.z - a.z);
    return (
      <div className="flex flex-col gap-1.5">
        {all.map(({ g, p }, i) => (
          <div key={g.k + p.id} className="grid items-center gap-2.5 rounded-lg px-2.5 py-2" style={{ gridTemplateColumns: '1.2rem 1.9rem 1fr auto 2rem', background: i < 2 ? `${g.c}14` : 'rgba(255,255,255,.025)' }}>
            <b className="font-display text-t3" style={{ color: i < 2 ? GOLD : '#6b7280' }}>{i + 1}</b>
            <Portrait player={p} w={28} h={36} color={g.c} />
            <b className="truncate text-t3 text-white">{p.name}</b>
            <Mark g={g} sm />
            <b className="text-right font-display text-t3" style={{ color: g.c }}>{st(p, g.stat)}</b>
          </div>
        ))}
      </div>
    );
  }],
  6: ['세로 막대', () => (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2" style={{ height: 150 }}>
        {PEOPLE.flatMap((g) => g.list.map((p) => ({ g, p }))).map(({ g, p }) => { const h = Math.max(10, ((st(p, g.stat) - g.lo) / (g.hi - g.lo)) * 100); return (
          <span key={g.k + p.id} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: '100%' }}>
            <b className="font-display text-t4" style={{ color: g.c }}>{st(p, g.stat)}</b>
            <i className="block w-full rounded-t-md" style={{ height: `${h}%`, background: `linear-gradient(180deg, ${g.c}, ${g.c}33)` }} />
          </span>
        ); })}
      </div>
      <div className="flex gap-2">{PEOPLE.flatMap((g) => g.list.map((p) => ({ g, p }))).map(({ g, p }) => <span key={g.k + p.id} className="flex flex-1 flex-col items-center gap-0.5"><span className="text-[11px] font-bold" style={{ color: g.c }}>{g.sk}</span><b className="w-full truncate text-center text-[11px] text-gray-200">{p.name}</b></span>)}</div>
    </div>
  )],
  7: ['2 × 2 타일', () => {
    const tiles = [[PEOPLE[0], SLUG[0]], [PEOPLE[0], SLUG[1]], [PEOPLE[1], FAST[0]], [PEOPLE[2], CAT]];
    return (
      <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {tiles.map(([g, p]) => (
          <span key={g.k + p.id} className="flex flex-col items-center gap-1.5 rounded-xl py-3" style={{ background: `${g.c}10`, boxShadow: `inset 0 0 0 1px ${g.c}44` }}>
            <Portrait player={p} w={44} h={56} color={g.c} />
            <b className="text-t3 text-white">{p.name}</b>
            <span className="flex items-baseline gap-1.5"><span className="text-t4" style={{ color: g.c }}>{g.sk}</span><b className="font-display text-t2" style={{ color: g.c }}>{st(p, g.stat)}</b></span>
          </span>
        ))}
      </div>
    );
  }],
  8: ['한 줄 리포트', () => (
    <div className="flex flex-col gap-2.5">
      {PEOPLE.map((g) => (
        <div key={g.k} className="flex items-baseline gap-2.5">
          <b className="w-[4.2rem] shrink-0 text-t4" style={{ color: g.c }}>{g.ko}</b>
          <span className="min-w-0 flex-1 text-t3 leading-relaxed text-gray-200">{g.list.map((p, i) => <React.Fragment key={p.id}>{i > 0 && <span className="text-gray-600"> · </span>}<b className="text-white">{p.name}</b> <span className="font-display text-gray-400">{st(p, g.stat)}</span></React.Fragment>)}</span>
        </div>
      ))}
    </div>
  )],
};

const PAGE = Number(new URLSearchParams(location.search).get('p') || 1);
function Panel({ n }) {
  const [t, Body] = LOW[n];
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <b className="text-t3 text-white"><span className="mr-2 font-display" style={{ color: GOLD }}>{n}</span>{t}<span className="ml-2 text-t4 font-normal text-gray-500" data-h={n} /></b>
      <aside className="mt-cut mt-frame mt-glass flex flex-col gap-3.5 overflow-hidden p-5" style={{ ...cut(20), '--a': C, width: 340, height: 806 }}>
        <p className="mt-lab" style={{ '--a': C }}>오늘 상대</p>
        <Head />
        <Rule />
        <div className="flex min-h-0 flex-1 flex-col" data-low={n}><Body /></div>
      </aside>
    </div>
  );
}
function App() {
  React.useEffect(() => {
    document.querySelectorAll('[data-low]').forEach((el) => {
      const h = document.querySelector(`[data-h="${el.dataset.low}"]`);
      if (h) h.textContent = el.scrollHeight > el.clientHeight + 1 ? `넘침 ${el.scrollHeight - el.clientHeight}px` : `여유 ${el.clientHeight - el.firstElementChild.getBoundingClientRect().height | 0}px`;
    });
  });
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative grid h-full" style={{ gridTemplateColumns: 'repeat(4,340px)', columnGap: 48, placeContent: 'center' }}>
        {(PAGE === 2 ? [5, 6, 7, 8] : [1, 2, 3, 4]).map((n) => <Panel key={n} n={n} />)}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
