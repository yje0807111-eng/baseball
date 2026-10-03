/*
 * 정비 3단계(상황 대응) 목업 (/mockups/prep-step3/?v=1~8, 1920 × 911)
 * flow3-sim(6,000경기) — 상대에 따라 답이 갈린 상황만 '상대를 보고' 칸에, 우리 사정으로 갈리는 둘은 작게, 늘 손해(거르기 · 노림수 · 히트앤런)는 뺀다:
 *  상대 장타자 타석 → 정상 수비 · 외야 후진       (장타자 파워 낮음 −1.1 → 높음 +1.1)
 *  상대 빠른 1루 주자 → 타자 집중 · 견제          (상대도 도루 — aiRunOrders, 빠른 주자 많으면 +0.7)
 *  우리 1루 주자 → 그대로 · 도루                 (상대 포수 수비 낮음 +1.9 → 높음 −1.4)
 *  우리 사정: 7회 이후 1~2점 리드 → 센 불펜(기본) · 지친 선발 → 교체
 * 카드 안엔 답 · 승률 변화를 적지 않는다(힌트 과다 — 2단계에서 정함). 고른 결과는 오른쪽 미리보기 승률로만.
 * 왼쪽 아래 = 상대 핵심 인물(장타자 · 빠른 주자 · 포수), 2단계 2안처럼 양끝 막대.
 *  1 카드 2열 · 2 줄 목록 · 3 인물 중심 · 4 다이아몬드 · 5 스위치 판 · 6 만약 → 그러면 · 7 수비 · 공격 두 칸 · 8 큰 카드 셋
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
const SITS = [
  { id: 'deep', ko: '상대 장타자 타석', side: '수비', who: SLUG, stat: 'power', opts: ['정상 수비', '외야 후진'], on: 0, opp: true },
  { id: 'hold', ko: '상대 빠른 1루 주자', side: '수비', who: FAST, stat: 'speed', opts: ['타자 집중', '견제'], on: 0, opp: true },
  { id: 'steal', ko: '우리 1루 주자', side: '공격', who: [CAT], stat: 'defense', opts: ['그대로', '도루'], on: 0, opp: true, ours: OURFAST },
  { id: 'close', ko: '7회 이후 1~2점 리드', side: '수비', opts: ['그대로', '센 불펜'], on: 1 },
  { id: 'tired', ko: '지친 선발 · 주자 있음', side: '수비', opts: ['맡기기', '교체'], on: 0 },
];
const STAT_KO = { power: '파워', speed: '주력', defense: '어깨' };

/* ───── 공통 조각 ───── */
const Rule = () => <span className="block h-px shrink-0 bg-white/[0.08]" />;
const Sub = ({ children, right }) => <span className="flex items-baseline justify-between"><span className="text-t3 font-bold text-gray-300">{children}</span>{right}</span>;
const Emb = ({ s = 32 }) => <span className="grid shrink-0 place-items-center rounded-full font-display font-extrabold" style={{ width: s, height: s, fontSize: s * 0.36, color: C, background: `${C}1a`, boxShadow: `inset 0 0 0 1px ${C}66` }}>{club || 'OB'}</span>;
const SideTag = ({ s }) => <b className="rounded px-1.5 text-t4" style={{ color: s === '공격' ? '#34d399' : '#7dd3fc', boxShadow: `inset 0 0 0 1px ${s === '공격' ? '#34d39966' : '#7dd3fc66'}` }}>{s}</b>;
const pickStyle = (on) => ({ ...cut(8), background: on ? 'rgba(16,185,129,.16)' : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1.5px ${on ? US : 'rgba(255,255,255,.08)'}`, color: on ? '#fff' : '#9ca3af' });
const Seg = ({ s, big }) => (
  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${s.opts.length},minmax(0,1fr))` }}>
    {s.opts.map((o, i) => <span key={o} className={`mt-cut grid place-items-center ${big ? 'h-14 text-t2' : 'h-11 text-t3'} font-bold`} style={pickStyle(i === s.on)}>{o}</span>)}
  </div>
);
const Who = ({ s, face = true }) => (
  <span className="flex flex-wrap gap-x-3 gap-y-1">
    {(s.who || []).map((p) => (
      <span key={p.id} className="flex items-center gap-1.5">
        {face && <Portrait player={p} w={22} h={28} color={C} />}
        <b className="text-t4 text-white">{p.name}</b><span className="font-display text-t4 text-gray-400">{STAT_KO[s.stat]} {st(p, s.stat)}</span>
      </span>
    ))}
  </span>
);

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
function KeyPeople() {
  const group = (title, list, k, lo, hi) => (
    <div className="flex flex-col gap-2">
      <Sub>{title}</Sub>
      {list.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5">
          <Portrait player={p} w={26} h={34} color={C} />
          <b className="w-[4.2rem] truncate text-t3 text-white">{p.name}</b>
          <Bar v={st(p, k)} lo={lo} hi={hi} />
          <b className="w-7 text-right font-display text-t3 text-gray-200">{st(p, k)}</b>
        </div>
      ))}
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      {group('장타자 · 파워', SLUG, 'power', 60, 110)}
      {group('빠른 주자 · 주력', FAST, 'speed', 60, 110)}
      {group('포수 · 어깨', [CAT], 'defense', 75, 100)}
    </div>
  );
}

/* ───── 가운데 8안 ───── */
const ours = SITS.filter((s) => !s.opp), opps = SITS.filter((s) => s.opp);
const Card = ({ s, big }) => (
  <div className="mt-cut flex flex-col gap-3 p-4" style={{ ...cut(12), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
    <span className="flex items-center gap-2"><SideTag s={s.side} /><b className={`${big ? 'text-t1' : 'text-t2'} text-white`}>{s.ko}</b></span>
    {s.who && <Who s={s} />}
    <Seg s={s} big={big} />
  </div>
);
const SmallRow = ({ s }) => (
  <div className="grid items-center gap-3" style={{ gridTemplateColumns: '1fr 15rem' }}>
    <span className="flex items-center gap-2"><SideTag s={s.side} /><b className="text-t3 text-gray-200">{s.ko}</b></span>
    <Seg s={s} />
  </div>
);
const CENTER = {
  1: ['카드 2열', () => (
    <div className="flex flex-col gap-5">
      <Sub>상대를 보고</Sub>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>{opps.map((s) => <Card key={s.id} s={s} />)}</div>
      <Sub>우리 사정</Sub>
      <div className="flex flex-col gap-2.5">{ours.map((s) => <SmallRow key={s.id} s={s} />)}</div>
    </div>
  )],
  2: ['줄 목록', () => (
    <div className="flex flex-col">
      {SITS.map((s, i) => (
        <div key={s.id} className="grid items-center gap-4 py-4" style={{ gridTemplateColumns: '16rem 1fr 16rem', borderTop: i ? '1px solid rgba(255,255,255,.07)' : undefined, opacity: s.opp ? 1 : 0.8 }}>
          <span className="flex items-center gap-2"><SideTag s={s.side} /><b className="text-t2 text-white">{s.ko}</b></span>
          {s.who ? <Who s={s} /> : <span className="text-t4 text-gray-600">—</span>}
          <Seg s={s} />
        </div>
      ))}
    </div>
  )],
  3: ['인물 중심', () => (
    <div className="flex flex-col gap-3">
      {opps.flatMap((s) => (s.id === 'deep' ? s.who.slice(0, 2) : s.who.slice(0, 1)).map((p) => ({ s, p }))).map(({ s, p }) => (
        <div key={s.id + p.id} className="mt-cut grid items-center gap-4 px-4 py-3" style={{ ...cut(12), gridTemplateColumns: '3.2rem 1fr 15rem', background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
          <Portrait player={p} w={46} h={58} color={C} />
          <span className="flex flex-col gap-0.5"><b className="text-t2 text-white">{p.name}</b><span className="text-t4 text-gray-400">{s.ko} · {STAT_KO[s.stat]} {st(p, s.stat)}</span></span>
          <Seg s={s} />
        </div>
      ))}
      <Rule />
      {ours.map((s) => <SmallRow key={s.id} s={s} />)}
    </div>
  )],
  4: ['다이아몬드', () => {
    const P = { deep: [50, 12], hold: [82, 62], steal: [50, 40] };
    return (
      <div className="grid gap-5" style={{ gridTemplateColumns: '420px 1fr' }}>
        <div className="relative" style={{ height: 420 }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <path d="M50 92 L88 54 Q50 -6 12 54 Z" fill="rgba(52,211,153,.06)" stroke="rgba(255,255,255,.12)" strokeWidth=".5" />
            <path d="M50 92 L68 74 L50 56 L32 74 Z" fill="rgba(251,191,36,.06)" stroke="rgba(255,255,255,.25)" strokeWidth=".6" />
          </svg>
          {opps.map((s) => (
            <span key={s.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ left: `${P[s.id][0]}%`, top: `${P[s.id][1]}%` }}>
              <b className="rounded-full px-2.5 py-1 text-t4" style={{ color: '#0b0f1a', background: s.on ? US : '#e5e7eb' }}>{s.opts[s.on]}</b>
              <span className="text-[11px] text-gray-400">{s.ko}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3">{SITS.map((s) => <SmallRow key={s.id} s={s} />)}</div>
      </div>
    );
  }],
  5: ['스위치 판', () => (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
      {SITS.map((s) => (
        <div key={s.id} className="mt-cut flex items-center gap-3 px-4 py-4" style={{ ...cut(12), background: 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${s.on ? `${US}88` : 'rgba(255,255,255,.08)'}` }}>
          <span className="flex min-w-0 flex-1 flex-col gap-1"><span className="flex items-center gap-2"><SideTag s={s.side} /><b className="truncate text-t2 text-white">{s.ko}</b></span><span className="text-t3" style={{ color: s.on ? '#fff' : '#9ca3af' }}>{s.opts[1]}</span></span>
          <span className="relative h-7 w-12 shrink-0 rounded-full" style={{ background: s.on ? US : 'rgba(255,255,255,.12)' }}><i className="absolute top-1 h-5 w-5 rounded-full bg-white" style={{ left: s.on ? 24 : 4 }} /></span>
        </div>
      ))}
    </div>
  )],
  6: ['만약 → 그러면', () => (
    <div className="flex flex-col gap-2.5">
      {SITS.map((s) => (
        <div key={s.id} className="mt-cut grid items-center gap-3 px-4 py-3" style={{ ...cut(10), gridTemplateColumns: '2.6rem 1fr 2.6rem 15rem', background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
          <b className="text-t4 text-gray-500">만약</b>
          <span className="flex flex-col"><b className="text-t2 text-white">{s.ko}</b>{s.who && <span className="text-t4 text-gray-400">{s.who.map((p) => p.name).join(' · ')}</span>}</span>
          <b className="text-t4 text-gray-500">그러면</b>
          <Seg s={s} />
        </div>
      ))}
    </div>
  )],
  7: ['수비 · 공격 두 칸', () => {
    const col = (title, list, c) => (
      <div className="flex flex-col gap-3">
        <b className="text-t3" style={{ color: c }}>{title}</b>
        {list.map((s) => (
          <div key={s.id} className="mt-cut flex flex-col gap-2.5 p-4" style={{ ...cut(12), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
            <b className="text-t2 text-white">{s.ko}</b>{s.who && <Who s={s} face={false} />}<Seg s={s} />
          </div>
        ))}
      </div>
    );
    return <div className="grid gap-5" style={{ gridTemplateColumns: '1.4fr 1fr' }}>{col('수비', SITS.filter((s) => s.side === '수비'), '#7dd3fc')}{col('공격', SITS.filter((s) => s.side === '공격'), '#34d399')}</div>;
  }],
  8: ['큰 카드 셋', () => (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        {opps.map((s) => (
          <div key={s.id} className="mt-cut flex flex-col items-center gap-3 px-4 pb-4 pt-5" style={{ ...cut(14), background: `linear-gradient(180deg, ${C}1a, rgba(255,255,255,.02))`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.09)' }}>
            <Portrait player={s.who[0]} w={86} h={108} color={C} />
            <span className="flex flex-col items-center"><b className="text-t2 text-white">{s.who[0].name}</b><span className="text-t4 text-gray-400">{STAT_KO[s.stat]} {st(s.who[0], s.stat)}</span></span>
            <b className="text-t3 text-gray-200">{s.ko}</b>
            <div className="w-full"><Seg s={s} /></div>
          </div>
        ))}
      </div>
      <Rule />
      {ours.map((s) => <SmallRow key={s.id} s={s} />)}
    </div>
  )],
};

function App() {
  const [t, Center] = CENTER[V];
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex h-full flex-col gap-3 px-4 pb-4 pt-3">
        <div className="flex h-14 shrink-0 items-center gap-4"><b className="text-t1 font-black text-white">경기 전 정비</b><span className="ml-3 rounded-full px-3 py-1 text-t4 font-bold" style={{ color: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}66` }}>{V} · {t}</span></div>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr) 340px' }}>
          <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-3.5 overflow-hidden p-5" style={{ ...cut(20), '--a': C }}>
            <p className="mt-lab" style={{ '--a': C }}>오늘 상대</p>
            <Head />
            <Rule />
            <KeyPeople />
          </aside>
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-5 p-6" style={{ ...cut(20), '--a': US }}>
            <div className="flex items-center gap-3">
              {['라인업', '경기 흐름', '상황 대응'].map((x, i) => (
                <React.Fragment key={x}>
                  <span className="flex items-center gap-2.5"><b className="grid h-9 w-9 place-items-center rounded-full font-display text-t2" style={{ background: i === 2 ? GOLD : 'rgba(52,211,153,.22)', color: i === 2 ? '#1c1203' : '#34d399' }}>{i === 2 ? 3 : '✓'}</b><b className="text-t3" style={{ color: i === 2 ? '#fff' : '#9ca3af' }}>{x}</b></span>
                  {i < 2 && <i className="block h-px w-10 bg-white/15" />}
                </React.Fragment>
              ))}
            </div>
            <Center />
          </section>
          <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-5 p-5" style={{ ...cut(20), '--a': '#38bdf8' }}>
            <p className="mt-lab" style={{ '--a': '#38bdf8' }}>미리보기</p>
            <div className="flex flex-col gap-1.5"><span className="flex justify-between text-t3"><span className="text-gray-300">예상 승률</span><b className="font-display" style={{ color: MY }}>44% : 56%</b></span><span className="flex h-2 overflow-hidden rounded-full"><i style={{ width: '44%', background: MY }} /><i className="flex-1" style={{ background: '#f87171' }} /></span></div>
            <div className="flex flex-col gap-1.5 text-t3">
              <span className="flex justify-between"><span className="text-gray-400">증강</span><b style={{ color: '#a78bfa' }}>7회</b></span>
              <span className="flex justify-between"><span className="text-gray-400">상황 대응</span><b className="text-white">{SITS.filter((s) => s.on).length}</b></span>
            </div>
            <span className="mt-auto mt-cut grid h-16 place-items-center text-t2 font-black" style={{ ...cut(12), background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}>경기 시작 ▶</span>
          </aside>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
