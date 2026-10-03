/*
 * 상대 판 공통 머리 — 맞대결 세 줄 목업 (/mockups/scout-matchup/?p=1 → 1~4안, ?p=2 → 5~8안, 실제 크기 340 × 806)
 * (10-03 고침) 같은 것끼리 맞댄다 — 타선 vs 타선 · 선발 vs 선발 · 불펜 vs 불펜(눈금이 같아 그대로 견줄 수 있다).
 * 머리 = 구단 한 줄 + 맞대결 세 줄. 세 단계의 결정이 모두 이 셋 가운데 하나에 달려 있다(plan-sim · flow-sim):
 *  우리 타선 vs 상대 선발   → 1 라인업(타순)
 *  우리 선발 vs 상대 타선   → 2 선발 운용 · 볼 배합
 *  우리 불펜 vs 상대 불펜   → 2 필승조 · 3 리드 지키기
 * 값: 타선 = 9명 (컨택 + 파워) / 2 평균, 선발 = (구위 + 제구) / 2, 불펜 = 선발 빼고 센 셋 평균. 앞선 쪽만 제 색.
 * ponytail: 타격 · 투구 눈금을 그대로 맞댄다 — 넣을 때 시뮬 득실(점수)로 눈금 맞추기
 *  1 줄다리기   — 상대는 늘 왼쪽 · 우리는 늘 오른쪽, 가운데 기준에서 앞선 쪽으로 막대가 뻗음
 *  2 숫자 · 차이 — 우리 숫자 | 이름 | 상대 숫자, 가운데 차이 칩
 *  3 세 카드    — 맞대결마다 작은 카드, 앞선 쪽 테두리 · 쓰는 단계 번호
 *  4 우세 문구  — 줄마다 '우세 +9' · '열세 −3' 한 마디
 *  5 거울 막대  — 우리 막대는 왼쪽으로, 상대 막대는 오른쪽으로
 *  6 얼굴 대 얼굴 — 줄 양끝에 대표 선수 얼굴(타선 = 가장 센 타자)
 *  7 단계 강조  — 지금 단계에 쓰는 줄만 크게(그림은 2단계)
 *  8 요약 + 점  — '우세 2 · 열세 1' 한 줄 + 점 세 줄
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
const ovrOf = (t) => avg(t.roster || [], (p) => p.overall);
const pen3 = (e) => e.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a)).slice(0, 3);
const topBat = (e) => [...e.batters].sort((a, b) => bat(b) - bat(a))[0];
const club = Object.keys(TEAM_NEON).find((k) => OPT.name.includes(k));
const C = TEAM_NEON[club] || '#a78bfa', MY = '#34d399';
const PAGE = Number(new URLSearchParams(location.search).get('p') || 1);
const cut = (c) => ({ '--c': `${c}px` });
/* 맞대결 세 줄 — [우리 이름, 우리 값, 상대 이름, 상대 값, 쓰는 단계, 우리 얼굴, 상대 얼굴] */
const ROWS = [
  { us: '우리 타선', u: avg(ME.batters, bat), them: '상대 타선', t: avg(OP.batters, bat), step: '1', up: topBat(ME), tp: topBat(OP), ko: '타선' },
  { us: '우리 선발', u: Math.round(arm(ME.pitchers[0])), them: '상대 선발', t: Math.round(arm(OP.pitchers[0])), step: '2', up: ME.pitchers[0], tp: OP.pitchers[0], ko: '선발' },
  { us: '우리 불펜', u: avg(pen3(ME), arm), them: '상대 불펜', t: avg(pen3(OP), arm), step: '2 · 3', up: pen3(ME)[0], tp: pen3(OP)[0], ko: '불펜' },
].map((r) => ({ ...r, d: r.u - r.t }));
const sign = (d) => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}`;
const tone = (d) => (d > 0 ? MY : d < 0 ? C : '#94a3b8');

/* ───── 조각 ───── */
const Rule = () => <span className="block h-px shrink-0 bg-white/[0.08]" />;
const Emb = ({ s = 32 }) => <span className="grid shrink-0 place-items-center rounded-full font-display font-extrabold" style={{ width: s, height: s, fontSize: s * 0.36, color: C, background: `${C}1a`, boxShadow: `inset 0 0 0 1px ${C}66` }}>{club || 'OB'}</span>;
const TeamLine = () => (
  <div className="flex shrink-0 items-center gap-2.5">
    <Emb /><b className="min-w-0 flex-1 truncate text-t2 font-black text-white">{OPT.name}</b>
    <b className="font-display text-t1 font-extrabold leading-none" style={{ color: C }}>{ovrOf(OPT)}</b>
  </div>
);
const Num = ({ v, on, c, big }) => <b className={`font-display ${big ? 'text-t1' : 'text-t2'} leading-none`} style={{ color: on ? c : '#9ca3af' }}>{v}</b>;

/* ───── 8안 ───── */
const V = {
  1: ['줄다리기', () => (
    <div className="flex flex-col gap-3.5">
      <span className="flex justify-between text-t4 font-bold"><span style={{ color: C }}>상대</span><span style={{ color: MY }}>우리</span></span>
      {ROWS.map((r) => {
        const w = Math.min(50, Math.abs(r.d) * 4);
        return (
          <div key={r.us} className="flex flex-col gap-1.5">
            <span className="grid items-baseline" style={{ gridTemplateColumns: '1fr auto 1fr' }}><Num v={r.t} on={r.d < 0} c={C} /><span className="text-t3 font-bold text-gray-300">{r.ko}</span><span className="text-right"><Num v={r.u} on={r.d > 0} c={MY} /></span></span>
            <span className="relative h-2 rounded-full bg-white/[0.06]">
              <i className="absolute inset-y-[-3px] left-1/2 w-px bg-white/40" />
              <i className="absolute inset-y-0 rounded-full" style={{ [r.d >= 0 ? 'left' : 'right']: '50%', width: `${w}%`, background: tone(r.d) }} />
            </span>
          </div>
        );
      })}
    </div>
  )],
  2: ['숫자 · 차이', () => (
    <div className="flex flex-col gap-1">
      {ROWS.map((r) => (
        <div key={r.us} className="grid items-center gap-2 rounded-lg px-2 py-2" style={{ gridTemplateColumns: '2.5rem 1fr auto 1fr 2.5rem', background: 'rgba(255,255,255,.03)' }}>
          <Num v={r.u} on={r.d > 0} c={MY} big />
          <span className="truncate text-t4 text-gray-400">{r.us.replace('우리 ', '')}</span>
          <b className="rounded-full px-2 font-display text-t3" style={{ color: tone(r.d), background: `${tone(r.d)}1f` }}>{sign(r.d)}</b>
          <span className="truncate text-right text-t4 text-gray-400">{r.them.replace('상대 ', '')}</span>
          <span className="text-right"><Num v={r.t} on={r.d < 0} c={C} big /></span>
        </div>
      ))}
    </div>
  )],
  3: ['세 카드', () => (
    <div className="flex flex-col gap-2">
      {ROWS.map((r) => (
        <div key={r.us} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: `${tone(r.d)}10`, boxShadow: `inset 0 0 0 1px ${tone(r.d)}55` }}>
          <b className="grid h-7 min-w-7 place-items-center rounded-md px-1 font-display text-t4" style={{ color: '#fbbf24', boxShadow: 'inset 0 0 0 1px #fbbf2466' }}>{r.step}</b>
          <span className="flex min-w-0 flex-1 flex-col"><span className="text-t4 text-gray-400">{r.us} · {r.them}</span><span className="flex items-baseline gap-1.5"><Num v={r.u} on={r.d > 0} c={MY} /><span className="text-t4 text-gray-500">:</span><Num v={r.t} on={r.d < 0} c={C} /></span></span>
          <b className="font-display text-t1 leading-none" style={{ color: tone(r.d) }}>{sign(r.d)}</b>
        </div>
      ))}
    </div>
  )],
  4: ['우세 문구', () => (
    <div className="flex flex-col">
      {ROWS.map((r, i) => (
        <React.Fragment key={r.us}>
          {i > 0 && <Rule />}
          <div className="flex items-center gap-3 py-3">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5"><b className="text-t3 text-white">{r.us} <span className="text-gray-500">vs</span> {r.them}</b><span className="font-display text-t4 text-gray-400">{r.u} : {r.t}</span></span>
            <b className="whitespace-nowrap text-t2" style={{ color: tone(r.d) }}>{r.d > 0 ? '우세' : r.d < 0 ? '열세' : '팽팽'} {sign(r.d)}</b>
          </div>
        </React.Fragment>
      ))}
    </div>
  )],
  5: ['거울 막대', () => {
    const lo = 60, hi = 95, w = (v) => `${Math.max(4, ((v - lo) / (hi - lo)) * 100)}%`;
    return (
      <div className="flex flex-col gap-3">
        <span className="flex justify-between text-t4 font-bold"><span style={{ color: MY }}>우리</span><span style={{ color: C }}>상대</span></span>
        {ROWS.map((r) => (
          <div key={r.us} className="grid items-center gap-2" style={{ gridTemplateColumns: '1.8rem 1fr 4.2rem 1fr 1.8rem' }}>
            <Num v={r.u} on={r.d > 0} c={MY} />
            <span className="flex h-2.5 justify-end rounded-l-full bg-white/[0.05]"><i className="block h-full rounded-l-full" style={{ width: w(r.u), background: r.d > 0 ? MY : `${MY}55` }} /></span>
            <span className="text-center text-t4 leading-tight text-gray-300">{r.us.replace('우리 ', '')}<br /><span className="text-gray-500">{r.them.replace('상대 ', '')}</span></span>
            <span className="flex h-2.5 rounded-r-full bg-white/[0.05]"><i className="block h-full rounded-r-full" style={{ width: w(r.t), background: r.d < 0 ? C : `${C}55` }} /></span>
            <span className="text-right"><Num v={r.t} on={r.d < 0} c={C} /></span>
          </div>
        ))}
      </div>
    );
  }],
  6: ['얼굴 대 얼굴', () => (
    <div className="flex flex-col gap-2">
      {ROWS.map((r) => (
        <div key={r.us} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,.03)' }}>
          <Portrait player={r.up} w={34} h={44} color={MY} />
          <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-t4 text-gray-400">{r.us}</span><Num v={r.u} on={r.d > 0} c={MY} /></span>
          <b className="font-display text-t3" style={{ color: tone(r.d) }}>{sign(r.d)}</b>
          <span className="flex min-w-0 flex-1 flex-col items-end"><span className="truncate text-t4 text-gray-400">{r.them}</span><Num v={r.t} on={r.d < 0} c={C} /></span>
          <Portrait player={r.tp} w={34} h={44} color={C} />
        </div>
      ))}
    </div>
  )],
  7: ['단계 강조', () => (
    <div className="flex flex-col gap-2">
      {ROWS.map((r) => {
        const on = r.step.includes('2'); // 그림은 2단계 — 선발 · 불펜 줄이 크게
        return on ? (
          <div key={r.us} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ background: `${tone(r.d)}12`, boxShadow: `inset 3px 0 0 ${tone(r.d)}` }}>
            <span className="flex min-w-0 flex-1 flex-col"><b className="text-t3 text-white">{r.us} vs {r.them}</b><span className="flex items-baseline gap-1.5"><Num v={r.u} on={r.d > 0} c={MY} big /><span className="text-gray-500">:</span><Num v={r.t} on={r.d < 0} c={C} big /></span></span>
            <b className="font-display text-t1 leading-none" style={{ color: tone(r.d) }}>{sign(r.d)}</b>
          </div>
        ) : (
          <div key={r.us} className="flex items-center gap-2 px-3 text-t4 text-gray-500"><span className="flex-1">{r.us} vs {r.them}</span><span className="font-display">{r.u} : {r.t}</span><b className="font-display" style={{ color: tone(r.d) }}>{sign(r.d)}</b></div>
        );
      })}
    </div>
  )],
  8: ['요약 + 점', () => {
    const win = ROWS.filter((r) => r.d > 0).length, lose = ROWS.filter((r) => r.d < 0).length;
    return (
      <div className="flex flex-col gap-3">
        <span className="flex items-baseline gap-3"><b className="font-display text-t1 leading-none" style={{ color: MY }}>우세 {win}</b><b className="font-display text-t1 leading-none" style={{ color: C }}>열세 {lose}</b></span>
        {ROWS.map((r) => (
          <div key={r.us} className="flex items-center gap-2.5 text-t3">
            <i className="block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tone(r.d), boxShadow: `0 0 8px ${tone(r.d)}` }} />
            <span className="min-w-0 flex-1 truncate text-gray-300">{r.us} vs {r.them}</span>
            <span className="font-display text-gray-400">{r.u}:{r.t}</span>
          </div>
        ))}
      </div>
    );
  }],
};

function Panel({ n }) {
  const [t, Body] = V[n];
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <b className="text-t3 text-white"><span className="mr-2 font-display" style={{ color: '#fbbf24' }}>{n}</span>{t}<span className="ml-2 text-t4 font-normal text-gray-500" data-h={n} /></b>
      <aside className="mt-cut mt-frame mt-glass flex flex-col gap-3.5 overflow-hidden p-5" style={{ ...cut(20), '--a': C, width: 340, height: 806 }}>
        <div className="flex shrink-0 flex-col gap-3.5" data-head={n}><p className="mt-lab" style={{ '--a': C }}>오늘 상대</p><TeamLine /><Rule /><Body /></div>
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
