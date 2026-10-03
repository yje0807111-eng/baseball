/*
 * 정비 2단계(경기 흐름) 왼쪽 상대 판 — 다시 8안 (/mockups/scout-flow2/?p=1 → 1~4안, ?p=2 → 5~8안, 실제 크기 340 × 806)
 * flow2-sim(엔진 조정 뒤, 6,000경기)에서 상대에 따라 답이 갈린 넷만:
 *  상대 선발 구위 — 약하면 강공 · 초반 힘(+0.24점), 세면 짧게 치기(+2.3%p)
 *  상대 선발 제구 — 약하면 기다리기(+2.7%p), 세면 기다리기 손해(−1.8)
 *  상대 불펜 구위 — 약하면 후반 힘(+0.11점)
 *  상대 포수 수비 — 약하면 도루 본전, 세면 도루 손해(−4.2)
 * 띠(약함 · 보통 · 셈)는 AI 시리즈 팀 3등분 문턱: 선발 구위 74 · 83, 제구 79 · 89, 불펜 구위 76 · 81, 포수 수비 85 · 87.
 * 상대가 약한 곳 = 우리 기회(초록), 센 곳 = 상대 색.
 *  1 네 줄 막대   — 줄마다 값 · 3등분 막대 · 띠
 *  2 2 × 2 타일   — 큰 숫자 · 띠
 *  3 짝 표        — 상대 정보 · 값 · 맞는 고르기
 *  4 사람 카드    — 상대 선발(구위 · 제구) · 상대 불펜 · 상대 포수, 얼굴과 함께
 *  5 이닝 띠      — 1~9회 상대 마운드를 구위 띠 색으로 + 제구 · 포수 줄
 *  6 눈금 넷      — 반원 눈금 넷
 *  7 기회 칩      — 맨 위에 '노릴 것' 칩, 아래 값 넷
 *  8 약한 곳 · 센 곳 — 두 칸으로 나눔
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
const C = TEAM_NEON[club] || '#a78bfa', MY = '#34d399', DIM = '#9ca3af', GOLD = '#fbbf24';
const PAGE = Number(new URLSearchParams(location.search).get('p') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const OSP = OP.pitchers[0], PENS = pen3(OP), CAT = OP.catcher || OP.batters.find((b) => b.position === 'C');
const penStuff = Math.round(OP.pitchers.slice(1).reduce((n, p) => n + st(p, 'stuff', 80), 0) / Math.max(1, OP.pitchers.length - 1));
/* 넷 — [이름, 값, 문턱(약 ≤ lo, 셈 ≥ hi), 약할 때 노릴 것, 셀 때 노릴 것, 사람] */
const INFO = [
  { k: 'sp', ko: '선발 구위', v: st(OSP, 'stuff', 80), lo: 74, hi: 83, weak: '강공 · 초반 힘', strong: '짧게 치기', who: OSP },
  { k: 'ctl', ko: '선발 제구', v: st(OSP, 'control', 75), lo: 79, hi: 89, weak: '기다리기', strong: null, who: OSP },
  { k: 'pen', ko: '불펜 구위', v: penStuff, lo: 76, hi: 81, weak: '후반 힘', strong: null, who: PENS[0] },
  { k: 'cat', ko: '포수 수비', v: st(CAT, 'defense', 85), lo: 84, hi: 87, weak: '도루', strong: null, who: CAT },
].map((x) => ({ ...x, band: x.v <= x.lo ? 0 : x.v >= x.hi ? 2 : 1 }));
const BAND = ['약함', '보통', '셈'];
const bandC = (b) => (b === 0 ? MY : b === 2 ? C : DIM);
const aim = (x) => (x.band === 0 ? x.weak : x.band === 2 ? x.strong : null);
const AIMS = INFO.map(aim).filter(Boolean);

/* ───── 머리(5안 칸 막대) ───── */
const mk = (ko, t, u) => ({ ko, t, u, d: u - t });
const ROWS = [mk('타선', avg(OP.batters, bat), avg(ME.batters, bat)), mk('선발', Math.round(arm(OSP)), Math.round(arm(ME.pitchers[0]))), mk('불펜', avg(PENS, arm), avg(pen3(ME), arm))];
const Rule = () => <span className="block h-px shrink-0 bg-white/[0.08]" />;
const Sub = ({ children, right }) => <span className="flex items-baseline justify-between"><span className="text-t3 font-bold text-gray-300">{children}</span>{right}</span>;
const Emb = ({ s = 32 }) => <span className="grid shrink-0 place-items-center rounded-full font-display font-extrabold" style={{ width: s, height: s, fontSize: s * 0.36, color: C, background: `${C}1a`, boxShadow: `inset 0 0 0 1px ${C}66` }}>{club || 'OB'}</span>;
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

/* ───── 조각 ───── */
const Band = ({ b }) => <b className="whitespace-nowrap rounded-full px-2 py-0.5 text-t4" style={{ color: bandC(b), background: `${bandC(b)}1a`, boxShadow: `inset 0 0 0 1px ${bandC(b)}55` }}>{BAND[b]}</b>;
const Aim = ({ t }) => <b className="whitespace-nowrap rounded-full px-2.5 py-1 text-t3" style={{ color: '#0b0f1a', background: MY }}>{t}</b>;
/* 3등분 막대 — 60~100 눈금에 약 · 보통 · 셈 구간, 값 자리에 점 */
const Tri = ({ x }) => {
  const at = (v) => `${Math.max(0, Math.min(100, ((v - 60) / 40) * 100))}%`;
  return (
    <span className="relative block h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${MY}40 0 ${at(x.lo)}, rgba(255,255,255,.08) ${at(x.lo)} ${at(x.hi)}, ${C}40 ${at(x.hi)} 100%)` }}>
      <i className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: at(x.v), background: bandC(x.band), boxShadow: `0 0 0 2px #0b0f1a, 0 0 10px ${bandC(x.band)}` }} />
    </span>
  );
};

/* ───── 8안 ───── */
const V = {
  1: ['네 줄 막대', () => (
    <div className="flex flex-col gap-4">
      {INFO.map((x) => (
        <div key={x.k} className="flex flex-col gap-2">
          <span className="flex items-center gap-2"><b className="flex-1 text-t3 text-white">{x.ko}</b><b className="font-display text-t2" style={{ color: bandC(x.band) }}>{x.v}</b><Band b={x.band} /></span>
          <Tri x={x} />
        </div>
      ))}
    </div>
  )],
  2: ['2 × 2 타일', () => (
    <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {INFO.map((x) => (
        <span key={x.k} className="flex flex-col items-center gap-1.5 rounded-xl py-4" style={{ background: `${bandC(x.band)}12`, boxShadow: `inset 0 0 0 1px ${bandC(x.band)}55` }}>
          <span className="text-t4 text-gray-300">{x.ko}</span>
          <b className="font-display leading-none" style={{ fontSize: 36, color: bandC(x.band) }}>{x.v}</b>
          <Band b={x.band} />
        </span>
      ))}
    </div>
  )],
  3: ['짝 표', () => (
    <div className="flex flex-col">
      {INFO.map((x, i) => (
        <React.Fragment key={x.k}>
          {i > 0 && <Rule />}
          <div className="grid items-center gap-2 py-3" style={{ gridTemplateColumns: '1fr 2.2rem 5.5rem' }}>
            <span className="flex flex-col"><b className="text-t3 text-white">{x.ko}</b><span className="text-t4" style={{ color: bandC(x.band) }}>{BAND[x.band]}</span></span>
            <b className="text-right font-display text-t2" style={{ color: bandC(x.band) }}>{x.v}</b>
            <span className="text-right text-t4 font-bold" style={{ color: aim(x) ? MY : '#4b5563' }}>{aim(x) || '—'}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  )],
  4: ['사람 카드', () => {
    const card = (who, label, rows) => (
      <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="flex items-center gap-2.5"><Portrait player={who} w={30} h={38} color={C} /><span className="flex min-w-0 flex-col"><span className="text-t4 text-gray-400">{label}</span><b className="truncate text-t3 text-white">{who?.name}</b></span></span>
        {rows.map((x) => <span key={x.k} className="flex items-center gap-2 text-t3"><span className="flex-1 text-gray-300">{x.ko.split(' ')[1]}</span><b className="font-display" style={{ color: bandC(x.band) }}>{x.v}</b><Band b={x.band} /></span>)}
      </div>
    );
    return (
      <div className="flex flex-col gap-2">
        {card(OSP, '상대 선발', INFO.slice(0, 2))}
        {card(PENS[0], '상대 불펜', [INFO[2]])}
        {card(CAT, '상대 포수', [INFO[3]])}
      </div>
    );
  }],
  5: ['이닝 띠', () => {
    const spB = INFO[0].band, penB = INFO[2].band;
    return (
      <div className="flex flex-col gap-3">
        <Sub>상대 마운드 구위</Sub>
        <div className="flex flex-col gap-1">
          <div className="grid text-center text-[11px] text-gray-500" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{Array.from({ length: 9 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
            {Array.from({ length: 9 }, (_, i) => { const b = i < 5 ? spB : penB; return <span key={i} className="h-8 rounded-[4px]" style={{ background: `${bandC(b)}30`, boxShadow: `inset 0 -2px 0 ${bandC(b)}` }} />; })}
          </div>
          <span className="grid text-t4" style={{ gridTemplateColumns: '5fr 4fr' }}><span className="text-gray-400">선발 <b style={{ color: bandC(spB) }}>{INFO[0].v} {BAND[spB]}</b></span><span className="text-right text-gray-400">불펜 <b style={{ color: bandC(penB) }}>{INFO[2].v} {BAND[penB]}</b></span></span>
        </div>
        <Rule />
        {[INFO[1], INFO[3]].map((x) => <span key={x.k} className="flex items-center gap-2 text-t3"><b className="flex-1 text-white">{x.ko}</b><b className="font-display text-t2" style={{ color: bandC(x.band) }}>{x.v}</b><Band b={x.band} /></span>)}
      </div>
    );
  }],
  6: ['눈금 넷', () => (
    <div className="grid gap-x-2 gap-y-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {INFO.map((x) => {
        const t = Math.max(0, Math.min(1, (x.v - 60) / 40)), R = 52, L = Math.PI * R;
        return (
          <span key={x.k} className="flex flex-col items-center">
            <span className="relative" style={{ width: 128, height: 70 }}>
              <svg width="128" height="70" className="absolute inset-0">
                <path d="M 12 64 A 52 52 0 0 1 116 64" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" strokeLinecap="round" />
                <path d="M 12 64 A 52 52 0 0 1 116 64" fill="none" stroke={bandC(x.band)} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${t * L} ${L}`} />
              </svg>
              <b className="absolute inset-x-0 bottom-0 text-center font-display text-t1 leading-none" style={{ color: bandC(x.band) }}>{x.v}</b>
            </span>
            <span className="mt-1.5 text-t4 text-gray-300">{x.ko}</span>
            <span className="text-t4" style={{ color: bandC(x.band) }}>{BAND[x.band]}</span>
          </span>
        );
      })}
    </div>
  )],
  7: ['기회 칩', () => (
    <div className="flex flex-col gap-3">
      <Sub>노릴 것</Sub>
      <span className="flex flex-wrap gap-1.5">{AIMS.length ? AIMS.map((t) => <Aim key={t} t={t} />) : <span className="text-t4 text-gray-500">없음</span>}</span>
      <Rule />
      {INFO.map((x) => (
        <span key={x.k} className="flex items-center gap-2 text-t3">
          <i className="block h-2 w-2 rounded-full" style={{ background: bandC(x.band) }} />
          <span className="flex-1 text-gray-300">{x.ko}</span>
          <b className="font-display text-t2" style={{ color: bandC(x.band) }}>{x.v}</b>
        </span>
      ))}
    </div>
  )],
  8: ['약한 곳 · 센 곳', () => {
    const col = (b, title, c) => (
      <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: `${c}10`, boxShadow: `inset 0 0 0 1px ${c}44` }}>
        <b className="text-t3" style={{ color: c }}>{title}</b>
        {INFO.filter((x) => (b === 0 ? x.band === 0 : x.band === 2)).length === 0 && <span className="text-t4 text-gray-500">없음</span>}
        {INFO.filter((x) => (b === 0 ? x.band === 0 : x.band === 2)).map((x) => <span key={x.k} className="flex flex-col"><span className="text-t4 text-gray-400">{x.ko}</span><b className="font-display text-t1 leading-tight text-white">{x.v}</b></span>)}
      </div>
    );
    const mid = INFO.filter((x) => x.band === 1);
    return (
      <div className="flex flex-col gap-2">
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>{col(0, '약한 곳', MY)}{col(2, '센 곳', C)}</div>
        {mid.length > 0 && <span className="text-t4 text-gray-400">보통 · {mid.map((x) => `${x.ko} ${x.v}`).join(' · ')}</span>}
      </div>
    );
  }],
};

function Panel({ n }) {
  const [t, Body] = V[n];
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
