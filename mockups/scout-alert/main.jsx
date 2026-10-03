/*
 * 정비 3단계 왼쪽 상대 판 — 아래 '경보' 8안 (/mockups/scout-alert/?p=1 · ?p=2, 실제 크기 340 × 806)
 * 대응(답)이 아니라 위험도 · 기회만 — 가운데 상황 카드와 하나씩 짝, 위험도는 우리와 맞대결로 센다
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


/*
 * ───── 아래 '상대 경보' 8안 — 가운데 상황 카드와 하나씩 짝, 상대 혼자가 아니라 맞대결로 위험도 ─────
 *  장타 위험     상대 파워 위 셋 평균 − 우리 선발 구위              ≥ 14 높음 · < 6 낮음         ↔ 상대 장타자 타석
 *  도루 위험     상대 주력 85+(AI 도루 문턱) 가장 빠른 주자 vs 우리 포수 — stealOdds 식 그대로
 *                0.52 + (주력 − 75) × 0.02 − (포수 수비 − 85) × 0.025    ≥ 0.8 높음 · 85+ 없으면 낮음  ↔ 상대 빠른 1루 주자
 *  세 바퀴째 위험 상대 타선 평균 − (우리 선발 (구위+제구)/2 − 5) — 셋째 바퀴 TTO −5, 우리 선발 체력 85 아래면 그 전에 내려가 낮춤
 *                > 2 높음 · < −4 낮음                                                      ↔ 지친 선발
 *  도루 기회     우리 주력 80+ 가장 빠른 주자 vs 상대 포수 — 같은 식   ≥ 0.75 큼 · < 0.65 작음        ↔ 우리 1루 주자
 * ponytail: 문턱은 어림 — 넣을 때 AI 시리즈 팀 3등분으로 맞추기
 */
const MYCAT = ME.catcher || ME.batters.find((b) => b.position === 'C');
const stealP = (runner, catcher) => Math.max(0.08, Math.min(0.95, 0.52 + (st(runner, 'speed') - 75) * 0.02 - (st(catcher, 'defense', 85) - 85) * 0.025));
const SPO = ME.pitchers[0];
const oppFast = [...OP.batters].filter((b) => st(b, 'speed') >= 85).sort((a, b) => st(b, 'speed') - st(a, 'speed'));
const myFast = [...ME.batters].filter((b) => st(b, 'speed') >= 80).sort((a, b) => st(b, 'speed') - st(a, 'speed'));
const powGap = SLUG.reduce((n, p) => n + st(p, 'power'), 0) / 3 - st(SPO, 'stuff', 80);
const ttoGap = OP.batters.reduce((n, b) => n + bat(b), 0) / 9 - (arm(SPO) - 5) - (st(SPO, 'stamina', 90) < 85 ? 3 : 0);
const pOpp = oppFast[0] ? stealP(oppFast[0], MYCAT) : 0, pMy = myFast[0] ? stealP(myFast[0], CAT) : 0;
const lv = (v, lo, hi) => (v >= hi ? 2 : v < lo ? 0 : 1);
/* [이름, 종류(경보 · 기회), 단계 0~2, 근거 사람(상대 쪽), 우리 쪽, 짝 카드] */
const ALERTS = [
  { k: 'hr', ko: '장타 위험', kind: 'risk', lv: lv(powGap, 6, 14), them: SLUG.map((p) => [p, `파워 ${st(p, 'power')}`]), us: [SPO, `구위 ${st(SPO, 'stuff', 80)}`], card: '상대 장타자 타석', v: powGap, rng: [-5, 25] },
  { k: 'sb', ko: '도루 위험', kind: 'risk', lv: oppFast.length ? lv(pOpp, 0.65, 0.8) : 0, them: oppFast.slice(0, 2).map((p) => [p, `주력 ${st(p, 'speed')}`]), us: [MYCAT, `어깨 ${st(MYCAT, 'defense', 85)}`], card: '상대 빠른 1루 주자', v: pOpp * 100, rng: [40, 100] },
  { k: 'tto', ko: '세 바퀴째 위험', kind: 'risk', lv: lv(ttoGap, -4, 2), them: [[null, `타선 ${Math.round(OP.batters.reduce((n, b) => n + bat(b), 0) / 9)}`]], us: [SPO, `체력 ${st(SPO, 'stamina', 90)}`], card: '지친 선발', v: ttoGap, rng: [-12, 10] },
  { k: 'my', ko: '도루 기회', kind: 'chance', lv: myFast.length ? lv(pMy, 0.65, 0.75) : 0, them: [[CAT, `어깨 ${st(CAT, 'defense', 85)}`]], us: myFast[0] ? [myFast[0], `주력 ${st(myFast[0], 'speed')}`] : null, card: '우리 1루 주자', v: pMy * 100, rng: [40, 100] },
];
const LV = { risk: ['낮음', '보통', '높음'], chance: ['작음', '보통', '큼'] };
const RED = '#f87171';
const colorOf = (a) => (a.kind === 'chance' ? [DIM, '#a7f3d0', MY][a.lv] : [DIM, GOLD, RED][a.lv]);
const Pill = ({ a, lg }) => <b className={`whitespace-nowrap rounded-full px-2.5 ${lg ? 'py-1 text-t3' : 'py-0.5 text-t4'}`} style={a.lv === 2 ? { color: '#0b0f1a', background: colorOf(a) } : { color: colorOf(a), boxShadow: `inset 0 0 0 1px ${colorOf(a)}66` }}>{LV[a.kind][a.lv]}</b>;
const People = ({ a }) => <span className="truncate text-t4 text-gray-400">{a.them.map(([p, t]) => (p ? `${p.name} ${t}` : t)).join(' · ')}</span>;
const Dots = ({ a }) => <span className="flex gap-1">{[0, 1, 2].map((i) => <i key={i} className="block h-2.5 w-2.5 rounded-full" style={{ background: i <= a.lv ? colorOf(a) : 'rgba(255,255,255,.1)', boxShadow: i <= a.lv && a.lv === 2 ? `0 0 6px ${colorOf(a)}` : undefined }} />)}</span>;
const risks = ALERTS.filter((a) => a.kind === 'risk'), chances = ALERTS.filter((a) => a.kind === 'chance');

const LOW = {
  1: ['경보 목록', () => (
    <div className="flex flex-col">
      {ALERTS.map((a, i) => (
        <div key={a.k} className="flex items-center gap-3 py-3" style={{ borderTop: i ? '1px solid rgba(255,255,255,.06)' : undefined }}>
          <i className="block h-9 w-1 shrink-0 rounded-full" style={{ background: colorOf(a) }} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5"><b className="text-t3 text-white">{a.ko}</b><People a={a} /></span>
          <Pill a={a} />
        </div>
      ))}
    </div>
  )],
  2: ['게이지', () => (
    <div className="flex flex-col gap-4">
      {ALERTS.map((a) => { const at = Math.max(3, Math.min(97, ((a.v - a.rng[0]) / (a.rng[1] - a.rng[0])) * 100)); return (
        <div key={a.k} className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between"><b className="text-t3 text-white">{a.ko}</b><b className="text-t4" style={{ color: colorOf(a) }}>{LV[a.kind][a.lv]}</b></span>
          <span className="relative block h-2 rounded-full" style={{ background: a.kind === 'chance' ? `linear-gradient(90deg, rgba(255,255,255,.08), ${MY}88)` : `linear-gradient(90deg, rgba(255,255,255,.08), ${GOLD}88 55%, ${RED})` }}>
            <i className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${at}%`, boxShadow: '0 0 0 2px #0b0f1a' }} />
          </span>
          <People a={a} />
        </div>
      ); })}
    </div>
  )],
  3: ['신호등', () => (
    <div className="flex flex-col gap-3">
      {ALERTS.map((a) => (
        <div key={a.k} className="flex items-center gap-3">
          <Dots a={a} />
          <span className="flex min-w-0 flex-1 flex-col"><b className="text-t3 text-white">{a.ko}</b><People a={a} /></span>
          <b className="text-t4" style={{ color: colorOf(a) }}>{LV[a.kind][a.lv]}</b>
        </div>
      ))}
    </div>
  )],
  4: ['2 × 2 카드', () => (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {ALERTS.map((a) => (
        <span key={a.k} className="flex flex-col gap-1 rounded-xl p-3" style={{ background: a.lv === 2 ? `${colorOf(a)}1a` : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${a.lv === 2 ? `${colorOf(a)}88` : 'rgba(255,255,255,.07)'}` }}>
          <span className="text-t4 text-gray-400">{a.ko}</span>
          <b className="text-t1 font-black leading-tight" style={{ color: a.lv ? colorOf(a) : '#94a3b8' }}>{LV[a.kind][a.lv]}</b>
          <span className="line-clamp-2 text-[11px] leading-4 text-gray-500">{a.them.map(([p, t]) => (p ? p.name : t)).join(' · ')}</span>
        </span>
      ))}
    </div>
  )],
  5: ['높음만 크게', () => {
    const hot = ALERTS.filter((a) => a.lv === 2), rest = ALERTS.filter((a) => a.lv < 2);
    return (
      <div className="flex flex-col gap-2.5">
        {hot.length ? hot.map((a) => (
          <div key={a.k} className="flex flex-col gap-2 rounded-xl p-3.5" style={{ background: `${colorOf(a)}16`, boxShadow: `inset 0 0 0 1px ${colorOf(a)}88` }}>
            <span className="flex items-center justify-between"><b className="text-t2 text-white">{a.kind === 'risk' ? '⚠ ' : ''}{a.ko}</b><Pill a={a} lg /></span>
            <span className="flex flex-wrap gap-1.5">{a.them.map(([p, t]) => p && <span key={p.id} className="flex items-center gap-1.5"><Portrait player={p} w={24} h={30} color={colorOf(a)} /><b className="text-t4 text-white">{p.name}</b><span className="text-t4 text-gray-400">{t}</span></span>)}</span>
          </div>
        )) : <span className="text-t4 text-gray-500">높음 없음</span>}
        {rest.map((a) => <span key={a.k} className="flex items-center justify-between text-t3"><span className="text-gray-300">{a.ko}</span><b className="text-t4" style={{ color: colorOf(a) }}>{LV[a.kind][a.lv]}</b></span>)}
      </div>
    );
  }],
  6: ['요약 띠', () => (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <span className="flex items-baseline justify-center gap-2 rounded-xl py-3" style={{ background: `${RED}14`, boxShadow: `inset 0 0 0 1px ${RED}55` }}><span className="text-t4 text-gray-300">주의</span><b className="font-display text-t1" style={{ color: RED }}>{risks.filter((a) => a.lv === 2).length}</b></span>
        <span className="flex items-baseline justify-center gap-2 rounded-xl py-3" style={{ background: `${MY}14`, boxShadow: `inset 0 0 0 1px ${MY}55` }}><span className="text-t4 text-gray-300">기회</span><b className="font-display text-t1" style={{ color: MY }}>{chances.filter((a) => a.lv === 2).length}</b></span>
      </div>
      {ALERTS.map((a) => <span key={a.k} className="flex items-center gap-2.5"><Dots a={a} /><b className="flex-1 text-t3 text-white">{a.ko}</b><span className="max-w-[9rem] truncate text-t4 text-gray-500">{a.them.map(([p, t]) => (p ? p.name : t)).join(' · ')}</span></span>)}
    </div>
  )],
  7: ['반원 눈금', () => (
    <div className="grid gap-x-2 gap-y-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {ALERTS.map((a) => { const t = Math.max(0.03, Math.min(1, (a.v - a.rng[0]) / (a.rng[1] - a.rng[0]))), L = Math.PI * 52; return (
        <span key={a.k} className="flex flex-col items-center">
          <span className="relative" style={{ width: 128, height: 70 }}>
            <svg width="128" height="70" className="absolute inset-0"><path d="M 12 64 A 52 52 0 0 1 116 64" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" strokeLinecap="round" /><path d="M 12 64 A 52 52 0 0 1 116 64" fill="none" stroke={colorOf(a)} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${t * L} ${L}`} /></svg>
            <b className="absolute inset-x-0 bottom-0 text-center text-t2" style={{ color: colorOf(a) }}>{LV[a.kind][a.lv]}</b>
          </span>
          <span className="mt-1.5 text-t4 text-gray-300">{a.ko}</span>
        </span>
      ); })}
    </div>
  )],
  8: ['맞대결', () => (
    <div className="flex flex-col gap-2">
      {ALERTS.map((a) => { const [tp, tt] = a.them[0]; return (
        <div key={a.k} className="flex flex-col gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,.03)', boxShadow: `inset 3px 0 0 ${colorOf(a)}` }}>
          <span className="flex items-center justify-between"><b className="text-t3 text-white">{a.ko}</b><Pill a={a} /></span>
          <span className="grid items-center gap-2 text-t4" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <span className="truncate" style={{ color: C }}>{tp ? tp.name : '상대'} {tt}</span><span className="text-gray-600">vs</span><span className="truncate text-right" style={{ color: MY }}>{a.us ? `${a.us[0].name} ${a.us[1]}` : '—'}</span>
          </span>
        </div>
      ); })}
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
        <div className="flex min-h-0 flex-1 flex-col gap-2" data-low={n}><Sub>경보</Sub><Body /></div>
      </aside>
    </div>
  );
}
function App() {
  React.useEffect(() => {
    document.querySelectorAll('[data-low]').forEach((el) => {
      const h = document.querySelector(`[data-h="${el.dataset.low}"]`);
      const used = [...el.children].reduce((n, c) => n + c.getBoundingClientRect().height, 0) + 8 * (el.children.length - 1);
      if (h) h.textContent = el.scrollHeight > el.clientHeight + 1 ? `넘침 ${el.scrollHeight - el.clientHeight}px` : `여유 ${Math.round(el.clientHeight - used)}px`;
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
