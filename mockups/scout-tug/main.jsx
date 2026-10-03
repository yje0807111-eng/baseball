/*
 * 상대 판 공통 머리 — 줄다리기 다듬기 8안 (/mockups/scout-tug/?p=1 → 1~4안, ?p=2 → 5~8안, 실제 크기 340 × 806)
 * 고정 규칙: 상대는 늘 왼쪽 · 우리는 늘 오른쪽, 가운데 이름(타선 · 선발 · 불펜), 앞선 쪽만 제 색.
 * 값: 타선 = 9명 (컨택 + 파워) / 2, 선발 = (구위 + 제구) / 2, 불펜 = 선발 빼고 센 셋 평균 — 같은 것끼리라 눈금이 같다.
 *  1 한 줄 막대  — 값 · 막대 · 값을 한 줄에, 이름은 막대 위 가운데(가장 낮음)
 *  2 이름 품은 막대 — 이름이 막대 가운데 칸에 들어가고 양쪽으로 채움
 *  3 두 색 나눔  — 한 줄 막대를 두 값의 몫으로 나눔(상대 색 | 우리 색), 가운데 눈금에서 얼마나 밀렸나
 *  4 매듭       — 채움 없이 줄 위 점 하나가 앞선 쪽으로 옮겨 감
 *  5 칸 막대     — 양쪽 다섯 칸, 차이만큼 칸이 켜짐(2점 = 1칸)
 *  6 차이 가운데 — 막대 가운데에 차이 숫자, 이름은 위
 *  7 유리 줄     — 줄마다 둥근 유리 판, 앞선 쪽으로 빛이 번짐
 *  8 종합까지   — 구단 줄도 같은 모양: 맨 위 '종합' 줄 + 세 줄, 양쪽 머리에 상대 · 우리 이름
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { UiStyle, GlassBg } from '../../src/myteam/ui.jsx';
import { TEAM_NEON } from '../../src/myteam/teamColor.js';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const MYT = seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)), OPT = seriesTeam(pick(/^1997-ob/) || SERIES[9], seeded(3));
const ME = engineTeam(MYT), OP = engineTeam(OPT);
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;
const bat = (b) => (st(b, 'contact') + st(b, 'power')) / 2;
const avg = (l, f) => Math.round(l.reduce((n, x) => n + f(x), 0) / (l.length || 1));
const ovrOf = (t) => avg(t.roster || [], (p) => p.overall);
const pen3 = (e) => e.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a)).slice(0, 3);
const club = Object.keys(TEAM_NEON).find((k) => OPT.name.includes(k));
const C = TEAM_NEON[club] || '#a78bfa', MY = '#34d399', DIM = '#9ca3af';
const PAGE = Number(new URLSearchParams(location.search).get('p') || 1);
const cut = (c) => ({ '--c': `${c}px` });
/* t = 상대(왼쪽) · u = 우리(오른쪽) · d = 우리 − 상대 */
const mk = (ko, t, u) => ({ ko, t, u, d: u - t });
const ROWS = [mk('타선', avg(OP.batters, bat), avg(ME.batters, bat)), mk('선발', Math.round(arm(OP.pitchers[0])), Math.round(arm(ME.pitchers[0]))), mk('불펜', avg(pen3(OP), arm), avg(pen3(ME), arm))];
const TOTAL = mk('종합', ovrOf(OPT), ovrOf(MYT));
const tone = (d) => (d > 0 ? MY : d < 0 ? C : DIM);
const reach = (d, max = 50) => `${Math.min(max, Math.abs(d) * 5)}%`; // 1점 = 막대 반쪽의 10%, 10점 차이면 끝까지
const sign = (d) => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}`;

/* ───── 조각 ───── */
const Rule = () => <span className="block h-px shrink-0 bg-white/[0.08]" />;
const Emb = ({ s = 32 }) => <span className="grid shrink-0 place-items-center rounded-full font-display font-extrabold" style={{ width: s, height: s, fontSize: s * 0.36, color: C, background: `${C}1a`, boxShadow: `inset 0 0 0 1px ${C}66` }}>{club || 'OB'}</span>;
const TeamLine = () => (
  <div className="flex shrink-0 items-center gap-2.5">
    <Emb /><b className="min-w-0 flex-1 truncate text-t2 font-black text-white">{OPT.name}</b>
    <b className="font-display text-t1 font-extrabold leading-none" style={{ color: C }}>{ovrOf(OPT)}</b>
  </div>
);
const Sides = () => <span className="flex justify-between text-t4 font-bold"><span style={{ color: C }}>상대</span><span style={{ color: MY }}>우리</span></span>;
const L = ({ r, cls = 'text-t2' }) => <b className={`font-display ${cls} leading-none`} style={{ color: r.d < 0 ? C : DIM }}>{r.t}</b>;
const R = ({ r, cls = 'text-t2' }) => <b className={`font-display ${cls} leading-none`} style={{ color: r.d > 0 ? MY : DIM }}>{r.u}</b>;
/* 가운데에서 앞선 쪽으로 채우는 막대 */
const Fill = ({ r, h = 6, glow = false }) => (
  <span className="relative block w-full rounded-full bg-white/[0.06]" style={{ height: h }}>
    <i className="absolute left-1/2 top-[-3px] bottom-[-3px] w-px bg-white/35" />
    {r.d !== 0 && <i className="absolute inset-y-0 rounded-full" style={{ [r.d > 0 ? 'left' : 'right']: '50%', width: reach(r.d), background: tone(r.d), boxShadow: glow ? `0 0 10px ${tone(r.d)}` : undefined }} />}
  </span>
);

/* ───── 8안 ───── */
const V = {
  1: ['한 줄 막대', () => (
    <div className="flex flex-col gap-3">
      <Sides />
      {ROWS.map((r) => (
        <div key={r.ko} className="flex flex-col gap-1">
          <span className="text-center text-t4 text-gray-400">{r.ko}</span>
          <div className="grid items-center gap-3" style={{ gridTemplateColumns: '2rem 1fr 2rem' }}><L r={r} /><Fill r={r} /><span className="text-right"><R r={r} /></span></div>
        </div>
      ))}
    </div>
  )],
  2: ['이름 품은 막대', () => (
    <div className="flex flex-col gap-3">
      <Sides />
      {ROWS.map((r) => (
        <div key={r.ko} className="grid items-center gap-2.5" style={{ gridTemplateColumns: '2rem 1fr 3.2rem 1fr 2rem' }}>
          <L r={r} />
          <span className="flex h-1.5 justify-end rounded-full bg-white/[0.06]">{r.d < 0 && <i className="block h-full rounded-full" style={{ width: `${Math.min(100, -r.d * 10)}%`, background: C }} />}</span>
          <b className="text-center text-t3 text-gray-200">{r.ko}</b>
          <span className="flex h-1.5 rounded-full bg-white/[0.06]">{r.d > 0 && <i className="block h-full rounded-full" style={{ width: `${Math.min(100, r.d * 10)}%`, background: MY }} />}</span>
          <span className="text-right"><R r={r} /></span>
        </div>
      ))}
    </div>
  )],
  3: ['두 색 나눔', () => (
    <div className="flex flex-col gap-3.5">
      <Sides />
      {ROWS.map((r) => {
        const share = (r.t / (r.t + r.u)) * 100, push = (share - 50) * 6 + 50; // 몫 차이를 6배로 키워 보이게
        return (
          <div key={r.ko} className="flex flex-col gap-1.5">
            <span className="grid items-baseline" style={{ gridTemplateColumns: '1fr auto 1fr' }}><L r={r} /><span className="text-t4 text-gray-400">{r.ko}</span><span className="text-right"><R r={r} /></span></span>
            <span className="relative flex h-2 overflow-hidden rounded-full">
              <i className="block h-full" style={{ width: `${push}%`, background: r.d < 0 ? C : `${C}44` }} />
              <i className="block h-full flex-1" style={{ background: r.d > 0 ? MY : `${MY}44` }} />
              <i className="absolute inset-y-0 left-1/2 w-[2px] bg-[#0b0f1a]" />
            </span>
          </div>
        );
      })}
    </div>
  )],
  4: ['매듭', () => (
    <div className="flex flex-col gap-4">
      <Sides />
      {ROWS.map((r) => {
        const x = 50 + Math.max(-45, Math.min(45, r.d * 5));
        return (
          <div key={r.ko} className="grid items-center gap-3" style={{ gridTemplateColumns: '2rem 1fr 2rem' }}>
            <L r={r} />
            <span className="relative block h-7">
              <i className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
              <i className="absolute left-1/2 top-1 bottom-1 w-px bg-white/30" />
              <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 text-t4 font-bold" style={{ left: `${x}%`, color: '#0b0f1a', background: r.d ? tone(r.d) : '#cbd5e1', boxShadow: r.d ? `0 0 10px ${tone(r.d)}88` : undefined }}>{r.ko}</span>
            </span>
            <span className="text-right"><R r={r} /></span>
          </div>
        );
      })}
    </div>
  )],
  5: ['칸 막대', () => (
    <div className="flex flex-col gap-3">
      <Sides />
      {ROWS.map((r) => {
        const n = Math.min(5, Math.ceil(Math.abs(r.d) / 2)); // 2점 = 1칸
        const cells = (side) => Array.from({ length: 5 }, (_, i) => { const on = side === 'L' ? r.d < 0 && 4 - i < n : r.d > 0 && i < n; return <i key={i} className="block h-2 flex-1 rounded-[2px]" style={{ background: on ? (side === 'L' ? C : MY) : 'rgba(255,255,255,.06)' }} />; });
        return (
          <div key={r.ko} className="grid items-center gap-2" style={{ gridTemplateColumns: '2rem 1fr 2.6rem 1fr 2rem' }}>
            <L r={r} /><span className="flex gap-[3px]">{cells('L')}</span><span className="text-center text-t4 text-gray-300">{r.ko}</span><span className="flex gap-[3px]">{cells('R')}</span><span className="text-right"><R r={r} /></span>
          </div>
        );
      })}
    </div>
  )],
  6: ['차이 가운데', () => (
    <div className="flex flex-col gap-3">
      <Sides />
      {ROWS.map((r) => (
        <div key={r.ko} className="flex flex-col gap-3">
          <span className="grid items-end" style={{ gridTemplateColumns: '1fr auto 1fr' }}><L r={r} /><span className="text-t4 text-gray-400">{r.ko}</span><span className="text-right"><R r={r} /></span></span>
          <span className="relative block">
            <Fill r={r} h={4} />
            <b className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-1.5 font-display text-t4" style={{ background: '#161b2e', lineHeight: '18px', zIndex: 1, color: tone(r.d), boxShadow: `inset 0 0 0 1px ${tone(r.d)}66` }}>{sign(r.d)}</b>
          </span>
        </div>
      ))}
    </div>
  )],
  7: ['유리 줄', () => (
    <div className="flex flex-col gap-2">
      <Sides />
      {ROWS.map((r) => (
        <div key={r.ko} className="grid items-center gap-3 rounded-xl px-3 py-2.5" style={{ gridTemplateColumns: '2rem 1fr 2rem', background: r.d ? `linear-gradient(${r.d > 0 ? 90 : 270}deg, transparent 40%, ${tone(r.d)}22)` : 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
          <L r={r} cls="text-t1" />
          <span className="flex flex-col items-center gap-1.5"><span className="text-t4 text-gray-300">{r.ko}</span><Fill r={r} h={4} glow /></span>
          <span className="text-right"><R r={r} cls="text-t1" /></span>
        </div>
      ))}
    </div>
  )],
  8: ['종합까지', () => (
    <div className="flex flex-col gap-3">
      {[TOTAL, ...ROWS].map((r, i) => (
        <React.Fragment key={r.ko}>
          <div className="flex flex-col gap-1">
            <span className="grid items-end" style={{ gridTemplateColumns: '1fr auto 1fr' }}><L r={r} cls={i ? 'text-t2' : 'text-t1'} /><span className={`text-t4 ${i ? 'text-gray-400' : 'font-bold text-gray-200'}`}>{r.ko}</span><span className="text-right"><R r={r} cls={i ? 'text-t2' : 'text-t1'} /></span></span>
            <Fill r={r} h={i ? 6 : 8} />
          </div>
          {i === 0 && <Rule />}
        </React.Fragment>
      ))}
    </div>
  )],
};

function Panel({ n }) {
  const [t, Body] = V[n];
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <b className="text-t3 text-white"><span className="mr-2 font-display" style={{ color: '#fbbf24' }}>{n}</span>{t}<span className="ml-2 text-t4 font-normal text-gray-500" data-h={n} /></b>
      <aside className="mt-cut mt-frame mt-glass flex flex-col gap-3.5 overflow-hidden p-5" style={{ ...cut(20), '--a': C, width: 340, height: 806 }}>
        <div className="flex shrink-0 flex-col gap-3.5" data-head={n}>
          <p className="mt-lab" style={{ '--a': C }}>오늘 상대</p>
          {n === 8 ? (
            <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
              <span className="flex min-w-0 items-center gap-2"><Emb s={28} /><b className="truncate text-t3 font-black text-white">{OPT.name.replace(/^\d+\s*/, '')}</b></span>
              <span className="text-t4 text-gray-500">vs</span>
              <b className="truncate text-right text-t3 font-black text-white">{MYT.name.replace(/^\d+\s*/, '')}</b>
            </div>
          ) : <TeamLine />}
          <Rule />
          <Body />
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg text-t4 text-gray-500" style={{ border: '1px dashed rgba(255,255,255,.15)' }} data-low={n}>페이지마다 바뀌는 구역</div>
      </aside>
    </div>
  );
}

function App() {
  React.useEffect(() => {
    document.querySelectorAll('[data-head]').forEach((el) => {
      const n = el.dataset.head, h = document.querySelector(`[data-h="${n}"]`), lo = document.querySelector(`[data-low="${n}"]`);
      if (h) h.textContent = `머리 ${Math.round(el.getBoundingClientRect().height)}px`;
      if (lo) lo.textContent = `페이지마다 바뀌는 구역 · ${Math.round(lo.getBoundingClientRect().height)}px`;
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
