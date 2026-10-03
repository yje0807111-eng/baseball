/*
 * 정비 3단계 왼쪽 상대 판 — 아래 '상대 분석' 게이지 8안 (/mockups/scout-gauge/?p=1 · ?p=2, 실제 크기 340 × 806)
 * 경보(맞대결 위험)만이 아니라 짤 때 볼 상대 성향(투수 견제 · 승부 · 타선 컨택 · 발 …)까지 게이지로. 답은 주지 않는다
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

import { styleOf } from '../../src/engine/pitchSim.js';
/*
 * ───── 아래 '상대 분석' 게이지 8안 — 위험만이 아니라 짤 때 볼 상대 성향 + 맞대결 경보 ─────
 * 성향(양끝 낱말, 모두 엔진에 닿는 값) — 눈금 양끝은 AI 시리즈 팀 10% · 90% 자리가 막대의 10% · 90%에 오게:
 *  선발 구위 · 제구(볼넷) · 승부(완급 많음 = 기교 ↔ 직구 고집 = 정면, styleOf) · 견제(안정 → 도루 성공률, 2026-10-03) · 체력(이닝)
 *  타선 장타(파워) · 컨택(삼진) · 발(주력) / 포수 어깨 / 불펜 뒷문(센 셋)
 * 경보(맞대결): 장타 위험 · 도루 위험(상대 주자 vs 우리 포수 · 우리 선발 견제) · 세 바퀴째 위험 · 도루 기회(우리 주자 vs 상대 포수 · 상대 선발 견제)
 */
const SPX = OP.pitchers[0], MSP = ME.pitchers[0], MYCAT = ME.catcher || ME.batters.find((b) => b.position === 'C');
const mean = (l, f) => l.reduce((n, x) => n + f(x), 0) / (l.length || 1);
const sty = styleOf(SPX).k;
const T = (who, l, r, v, lo, hi, show) => ({ who, l, r, at: Math.max(4, Math.min(96, ((v - lo) / (hi - lo)) * 100)), show: show ?? Math.round(v) });
const TRAITS = [
  T('선발', '구위 약함', '구위 강함', st(SPX, 'stuff', 80), 64, 96),
  T('선발', '볼넷 많음', '볼넷 적음', st(SPX, 'control', 75), 65, 98),
  { who: '선발', l: '기교', r: '정면', at: sty === 'tempo' ? 15 : sty === 'power' ? 85 : 50, show: sty === 'tempo' ? '완급' : sty === 'power' ? '직구' : '보통' },
  T('선발', '견제 느슨', '견제 날카로움', st(SPX, 'stability', 81), 68, 95),
  T('선발', '일찍 지침', '길게 던짐', st(SPX, 'stamina', 90), 78, 105),
  T('타선', '교타', '장타', mean(OP.batters, (b) => st(b, 'power')), 71, 88),
  T('타선', '삼진 많음', '삼진 적음', mean(OP.batters, (b) => st(b, 'contact')), 72, 90),
  T('타선', '발 느림', '발 빠름', mean(OP.batters, (b) => st(b, 'speed')), 74, 85),
  T('포수', '어깨 약함', '어깨 강함', st(CAT, 'defense', 85), 83, 94),
  T('불펜', '뒷문 약함', '뒷문 강함', mean(pen3(OP), arm), 71, 91),
];
const stealP = (runner, catcher, pitcher) => Math.max(0.08, Math.min(0.95, 0.52 + (st(runner, 'speed') - 75) * 0.02 - (st(catcher, 'defense', 85) - 85) * 0.025 - (st(pitcher, 'stability', 81) - 81) * 0.008));
const oppFast = [...OP.batters].filter((b) => st(b, 'speed') >= 85).sort((a, b) => st(b, 'speed') - st(a, 'speed'));
const myFast = [...ME.batters].filter((b) => st(b, 'speed') >= 80).sort((a, b) => st(b, 'speed') - st(a, 'speed'));
const R = (ko, kind, v, lo, hi, who) => ({ ko, kind, at: Math.max(4, Math.min(96, ((v - lo) / (hi - lo)) * 100)), who });
const ALERTS = [
  R('장타 위험', 'risk', mean(SLUG, (p) => st(p, 'power')) - st(MSP, 'stuff', 80), -5, 25, SLUG.map((p) => p.name).join(' · ')),
  R('도루 위험', 'risk', oppFast[0] ? stealP(oppFast[0], MYCAT, MSP) * 100 : 40, 40, 100, oppFast.slice(0, 2).map((p) => p.name).join(' · ') || '빠른 주자 없음'),
  R('세 바퀴째 위험', 'risk', mean(OP.batters, bat) - (arm(MSP) - 5), -12, 10, `우리 선발 ${MSP.name}`),
  R('도루 기회', 'chance', myFast[0] ? stealP(myFast[0], CAT, SPX) * 100 : 40, 40, 100, myFast[0] ? `우리 ${myFast[0].name}` : '빠른 주자 없음'),
];
const RED = '#f87171';
const lvOf = (a) => (a.at >= 66 ? 2 : a.at >= 40 ? 1 : 0);
const LVK = { risk: ['낮음', '보통', '높음'], chance: ['작음', '보통', '큼'] };
const aC = (a) => (a.kind === 'chance' ? [DIM, '#a7f3d0', MY][lvOf(a)] : [DIM, GOLD, RED][lvOf(a)]);
const vivid = (t) => t.at <= 25 || t.at >= 75;

/* 성향 게이지 — 양끝 낱말, 기운 쪽 낱말만 밝게 */
const TraitG = ({ t, dim, big }) => (
  <div className="grid items-center gap-2" style={{ gridTemplateColumns: big ? '5.2rem 1fr 5.2rem' : '4.4rem 1fr 4.4rem', opacity: dim ? 0.45 : 1 }}>
    <span className={`truncate text-right ${big ? 'text-t3' : 'text-t4'}`} style={{ color: t.at < 40 ? '#fff' : '#6b7280', fontWeight: t.at < 40 ? 700 : 400 }}>{t.l}</span>
    <span className={`relative block ${big ? 'h-2' : 'h-1.5'} rounded-full bg-white/[0.08]`}><i className="absolute left-1/2 top-[-3px] bottom-[-3px] w-px bg-white/20" /><i className={`absolute top-1/2 ${big ? 'h-3.5 w-3.5' : 'h-3 w-3'} -translate-x-1/2 -translate-y-1/2 rounded-full`} style={{ left: `${t.at}%`, background: '#e5e7eb', boxShadow: `0 0 0 2px #0b0f1a, 0 0 8px ${C}` }} /></span>
    <span className={`truncate ${big ? 'text-t3' : 'text-t4'}`} style={{ color: t.at > 60 ? '#fff' : '#6b7280', fontWeight: t.at > 60 ? 700 : 400 }}>{t.r}</span>
  </div>
);
/* 경보 게이지 — 2안 결(낮음 → 높음 빛 띠) */
const AlertG = ({ a, compact }) => (
  <div className="flex flex-col gap-1.5">
    <span className="flex items-baseline justify-between"><b className={`${compact ? 'text-t4' : 'text-t3'} text-white`}>{a.ko}</b><b className="text-t4" style={{ color: aC(a) }}>{LVK[a.kind][lvOf(a)]}</b></span>
    <span className="relative block h-2 rounded-full" style={{ background: a.kind === 'chance' ? `linear-gradient(90deg, rgba(255,255,255,.08), ${MY}88)` : `linear-gradient(90deg, rgba(255,255,255,.08), ${GOLD}88 55%, ${RED})` }}>
      <i className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${a.at}%`, boxShadow: '0 0 0 2px #0b0f1a' }} />
    </span>
    {!compact && <span className="truncate text-t4 text-gray-500">{a.who}</span>}
  </div>
);
const Group = ({ who, children }) => <div className="flex flex-col gap-2"><span className="text-t4 font-bold text-gray-400">{who}</span>{children}</div>;
const byWho = (w) => TRAITS.filter((t) => t.who === w);

const LOW = {
  1: ['사람별 게이지', () => (
    <div className="flex flex-col gap-3">
      <Group who={`상대 선발 · ${SPX.name}`}>{byWho('선발').map((t) => <TraitG key={t.l} t={t} />)}</Group>
      <Group who="상대 타선">{byWho('타선').map((t) => <TraitG key={t.l} t={t} />)}</Group>
      <Group who="포수 · 불펜">{[...byWho('포수'), ...byWho('불펜')].map((t) => <TraitG key={t.l} t={t} />)}</Group>
    </div>
  )],
  2: ['성향 · 경보 두 묶음', () => (
    <div className="flex flex-col gap-3">
      <Sub>성향</Sub>
      <div className="flex flex-col gap-1.5">{TRAITS.map((t) => <TraitG key={t.l} t={t} />)}</div>
      <Rule />
      <Sub>경보</Sub>
      <div className="flex flex-col gap-2.5">{ALERTS.map((a) => <AlertG key={a.ko} a={a} compact />)}</div>
    </div>
  )],
  3: ['탭', () => (
    <div className="flex flex-col gap-3.5">
      <div className="grid rounded-lg bg-white/[0.04] p-1" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {['투수', '타선', '경보'].map((x, i) => <b key={x} className="rounded-md py-1.5 text-center text-t3" style={{ color: i ? '#6b7280' : '#fff', background: i ? 'transparent' : `${C}33` }}>{x}</b>)}
      </div>
      <span className="flex items-center gap-2"><Portrait player={SPX} w={30} h={38} color={C} /><b className="text-t2 text-white">{SPX.name}</b></span>
      {[...byWho('선발'), ...byWho('불펜')].map((t) => <TraitG key={t.l} t={t} big />)}
    </div>
  )],
  4: ['두 열 미니', () => (
    <div className="flex flex-col gap-3">
      <div className="grid gap-x-3 gap-y-2.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {TRAITS.map((t) => (
          <span key={t.l} className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-500">{t.who}</span>
            <b className="truncate text-t4" style={{ color: vivid(t) ? '#fff' : '#94a3b8' }}>{t.at < 50 ? t.l : t.r}</b>
            <span className="relative block h-1 rounded-full bg-white/[0.08]"><i className="absolute inset-y-0 rounded-full" style={{ left: t.at < 50 ? `${t.at}%` : '50%', right: t.at < 50 ? '50%' : `${100 - t.at}%`, background: vivid(t) ? C : `${C}66` }} /></span>
          </span>
        ))}
      </div>
      <Rule />
      <div className="grid gap-x-3 gap-y-2" style={{ gridTemplateColumns: '1fr 1fr' }}>{ALERTS.map((a) => <AlertG key={a.ko} a={a} compact />)}</div>
    </div>
  )],
  5: ['두드러진 것만 진하게', () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">{TRAITS.map((t) => <TraitG key={t.l} t={t} dim={!vivid(t)} />)}</div>
      <Rule />
      <div className="flex flex-col gap-2.5">{ALERTS.map((a) => <div key={a.ko} style={{ opacity: lvOf(a) === 2 ? 1 : 0.5 }}><AlertG a={a} compact /></div>)}</div>
    </div>
  )],
  6: ['얼굴 카드 + 게이지', () => (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="flex items-center gap-2"><Portrait player={SPX} w={30} h={38} color={C} /><span className="flex flex-col"><span className="text-[11px] text-gray-400">상대 선발</span><b className="text-t3 text-white">{SPX.name}</b></span></span>
        {byWho('선발').map((t) => <TraitG key={t.l} t={t} />)}
      </div>
      <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="text-[11px] text-gray-400">상대 타선 · 포수 · 불펜</span>
        {[...byWho('타선'), ...byWho('포수'), ...byWho('불펜')].map((t) => <TraitG key={t.l} t={t} />)}
      </div>
    </div>
  )],
  7: ['낱말만', () => (
    <div className="flex flex-col gap-3">
      {['선발', '타선', '포수', '불펜'].map((w) => (
        <div key={w} className="flex items-start gap-2.5">
          <b className="w-8 shrink-0 pt-1 text-t4 text-gray-400">{w}</b>
          <span className="flex flex-wrap gap-1">{byWho(w).map((t) => { const word = t.show === '보통' ? '승부 보통' : t.at < 40 ? t.l : t.at > 60 ? t.r : null; return word && <b key={t.l} className="rounded-full px-2.5 py-0.5 text-t4" style={{ color: vivid(t) ? '#fff' : '#cbd5e1', background: vivid(t) ? `${C}33` : 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${vivid(t) ? `${C}88` : 'rgba(255,255,255,.08)'}` }}>{word}</b>; })}</span>
        </div>
      ))}
      <Rule />
      <div className="flex flex-col gap-2.5">{ALERTS.map((a) => <AlertG key={a.ko} a={a} compact />)}</div>
    </div>
  )],
  8: ['경보 먼저', () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">{ALERTS.map((a) => <AlertG key={a.ko} a={a} />)}</div>
      <Rule />
      <Sub>성향</Sub>
      <div className="flex flex-col gap-1.5">{TRAITS.filter(vivid).map((t) => <TraitG key={t.l} t={t} />)}</div>
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
