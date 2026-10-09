/*
 * 정비 3단계 빈 자리 8안 (/mockups/prep-step3e/?v=1~8, 1920 × 911) — 2026-10-09 한 판 점검: 세 줄(타자 · 주자 · 투수) 아래 판 절반이 빔
 *  가운데 위는 실제 SitBoard(눌러 바꿔 보기 가능), 빈 자리에 넣을 것만 안마다 다르게
 *  근거: FC 온라인 개인 전술 · Football Manager 선수 지시 · OOTP 도루 설정 — 지시 옆에 '누구에게 걸리는지'(선수 얼굴 · 능력치)를 같이 보여 줌
 *  1 아래 3열 대상 선수 · 2 아래 타순 두 줄(얼굴 + 꼬리표) · 3 오른쪽 대상 열 · 4 리허설(300경기 득실)
 *  5 대상 둘 + 리허설 · 6 준비 카드 선반 · 7 세 줄 크게(판 높이에 맞춰 늘림) · 8 타순 한 줄 + 준비 카드 선반
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { seeded } from '../../src/engine/rng.js';
import SitBoard from '../../src/myteam/SitBoard.jsx';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const ME = engineTeam(seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)));
const OPP = engineTeam(seriesTeam(pick(/^1997-hyundai/) || SERIES[9], seeded(5)));
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const V = Number(new URLSearchParams(location.search).get('v') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa', ORG = '#f59e0b', SKY = '#38bdf8';
const CARDS = [['bo-meeting', '타선 미팅', '타자 전원 컨택 +3', 2], ['bo-mound', '마운드 미팅', '투수 전원 제구 +3', 1], ['bo-bullpen', '불펜 데이', '불펜 투수 전원 체력 +20', 0]];
const THR = { steal: 80, steal85: 85, steal90: 90 };

/* ───── 조각 ───── */
const Box = ({ children, className = '', style, pad = 'p-4' }) => (
  <div className={`mt-cut flex min-h-0 flex-col ${pad} ${className}`} style={{ ...cut(12), background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.012))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)', ...style }}>{children}</div>
);
const Head = ({ ko, right }) => <span className="flex shrink-0 items-center gap-2 pb-2"><b className="text-t3" style={{ color: W1 }}>{ko}</b><span className="ml-auto flex items-center gap-1.5">{right}</span></span>;
const Tag = ({ c, children, on = true }) => <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: on ? c : W3, background: on ? `${c}1a` : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>{children}</span>;
const Num = ({ v, c = W1 }) => <b className="w-8 text-right font-display text-t4" style={{ color: c }}>{v}</b>;

/* 지금 고른 값 → 대상 판정 */
const useCtx = (conds) => {
  const thr = THR[conds.find((c) => THR[c])] ?? null;
  const zone = conds.find((c) => c.startsWith('pitchZone'));
  const conOnly = zone?.includes('Con');
  const bat = conds.find((c) => c.startsWith('risp'));
  return { thr, zone, conOnly, bat };
};
const powTag = (p) => (st(p, 'power') >= 80 ? ['파워', RED] : ['교타', SPB]);

/* 1열 — 우리 타순(득점권 타자) */
function OurOrder({ ctx, rows = 9 }) {
  const key = ctx.bat === 'rispPow' ? 'power' : ctx.bat === 'rispCon' ? 'contact' : ctx.bat === 'rispPat' ? 'eye' : null;
  return (
    <Box className="flex-1">
      <Head ko="우리 타순" right={<><span className="text-[11px]" style={{ color: W3 }}>컨택</span><span className="w-6" /><span className="text-[11px]" style={{ color: W3 }}>파워</span></>} />
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        {ME.batters.slice(0, rows).map((p, i) => (
          <span key={p.id} className="flex items-center gap-2.5">
            <b className="w-4 font-display text-t4" style={{ color: W3 }}>{i + 1}</b>
            <Portrait player={p} w={24} h={30} />
            <b className="flex-1 truncate text-t4" style={{ color: W1 }}>{p.name}</b>
            <Num v={st(p, 'contact')} c={key === 'contact' && st(p, 'contact') >= 85 ? SKY : W1} />
            <Num v={st(p, 'power')} c={key === 'power' && st(p, 'power') >= 85 ? ORG : W1} />
          </span>
        ))}
      </div>
    </Box>
  );
}
/* 2열 — 1루 주자 후보(주력 순, 문턱 위는 초록) */
function Runners({ ctx, rows = 9 }) {
  const list = [...ME.batters].sort((a, b) => st(b, 'speed') - st(a, 'speed')).slice(0, rows);
  const n = ctx.thr ? ME.batters.filter((p) => st(p, 'speed') >= ctx.thr).length : 0;
  return (
    <Box className="flex-1">
      <Head ko="뛸 주자" right={ctx.thr ? <Tag c={US}>주력 {ctx.thr}+ · {n}명</Tag> : <Tag c={W3} on={false}>그대로</Tag>} />
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        {list.map((p) => {
          const on = ctx.thr && st(p, 'speed') >= ctx.thr;
          return (
            <span key={p.id} className="flex items-center gap-2.5" style={{ opacity: ctx.thr && !on ? 0.4 : 1 }}>
              <Portrait player={p} w={24} h={30} />
              <b className="w-20 truncate text-t4" style={{ color: W1 }}>{p.name}</b>
              <span className="relative block h-1.5 flex-1 rounded-full" style={{ background: 'rgba(255,255,255,.07)' }}>
                <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${Math.max(0, (st(p, 'speed') - 50) * 2)}%`, background: on ? US : 'rgba(255,255,255,.25)' }} />
                {ctx.thr && <i className="absolute -top-1 block h-3.5 w-px" style={{ left: `${(ctx.thr - 50) * 2}%`, background: GOLD }} />}
              </span>
              <Num v={st(p, 'speed')} c={on ? US : W2} />
            </span>
          );
        })}
      </div>
    </Box>
  );
}
/* 3열 — 상대 타순(맞혀 잡기 대상) */
function OppOrder({ ctx, rows = 9 }) {
  return (
    <Box className="flex-1">
      <Head ko="상대 타순" right={ctx.zone ? <Tag c={SPB}>맞혀 잡기 · {ctx.conOnly ? '교타자만' : '모든 타자'}</Tag> : <Tag c={W3} on={false}>기본</Tag>} />
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        {OPP.batters.slice(0, rows).map((p, i) => {
          const [t, c] = powTag(p), on = ctx.zone && (!ctx.conOnly || t === '교타');
          return (
            <span key={p.id} className="flex items-center gap-2.5" style={{ opacity: ctx.zone && !on ? 0.4 : 1 }}>
              <b className="w-4 font-display text-t4" style={{ color: W3 }}>{i + 1}</b>
              <Portrait player={p} w={24} h={30} />
              <b className="flex-1 truncate text-t4" style={{ color: W1 }}>{p.name}</b>
              <Tag c={c}>{t}</Tag>
              <Num v={st(p, 'power')} />
            </span>
          );
        })}
      </div>
    </Box>
  );
}
/* 타순 띠 — 얼굴 카드 9장 + 꼬리표 */
function Strip({ team, tags, label }) {
  return (
    <div className="grid min-h-0 flex-1 items-stretch gap-2" style={{ gridTemplateColumns: '5.5rem repeat(9,minmax(0,1fr))' }}>
      <span className="flex items-center"><b className="text-t3" style={{ color: W1 }}>{label}</b></span>
      {team.batters.slice(0, 9).map((p, i) => (
        <span key={p.id} className="mt-cut flex min-w-0 flex-col items-center gap-1.5 px-1 py-2" style={{ ...cut(8), background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
          <span className="relative flex shrink-0"><Portrait player={p} w={52} h={64} /><b className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full font-display text-[11px]" style={{ background: '#0b0f1a', color: W2, boxShadow: '0 0 0 1px rgba(255,255,255,.18)' }}>{i + 1}</b></span>
          <b className="w-full truncate text-center text-t4" style={{ color: W1 }}>{p.name}</b>
          <span className="flex flex-wrap justify-center gap-1">{tags(p).map(([t, c, on]) => <Tag key={t} c={c} on={on}>{t}</Tag>)}</span>
        </span>
      ))}
    </div>
  );
}
const ourTags = (ctx) => (p) => [
  ...(st(p, 'speed') >= 80 ? [[`주력 ${st(p, 'speed')}`, US, !!ctx.thr && st(p, 'speed') >= ctx.thr]] : []),
  ...(st(p, 'power') >= 85 ? [['파워', ORG, ctx.bat === 'rispPow']] : st(p, 'contact') >= 85 ? [['컨택', SKY, ctx.bat === 'rispCon']] : []),
];
const oppTags = (ctx) => (p) => { const [t, c] = powTag(p); return [[t, c, !!ctx.zone && (!ctx.conOnly || t === '교타')]]; };

/* 리허설 — 이 설정으로 300경기(목업 값) */
function Rehearsal() {
  const rows = [['타자 · 안타 우선', 0.6, SKY], ['주자 · 도루 85+', 0.4, US], ['투수 · 맞혀 잡기 · 교타자만', -0.3, SPB]];
  return (
    <Box className="flex-1">
      <Head ko="이 설정 · 300경기" right={<span className="text-[11px]" style={{ color: W3 }}>기본과 견줌</span>} />
      <div className="grid gap-3 pb-3" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        {[['승률', '52.4%', '+0.7%p', US], ['득점', '4.61', '+0.18', US], ['실점', '4.40', '+0.05', RED]].map(([k, v, d, c]) => (
          <span key={k} className="flex flex-col gap-1 rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
            <span className="text-[12px]" style={{ color: W3 }}>{k}</span>
            <span className="flex items-baseline gap-2"><b className="font-display text-t1" style={{ color: W1 }}>{v}</b><b className="font-display text-t4" style={{ color: c }}>{d}</b></span>
          </span>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-around gap-2">
        {rows.map(([ko, d, c]) => (
          <span key={ko} className="grid items-center gap-3" style={{ gridTemplateColumns: '13rem minmax(0,1fr) 4rem' }}>
            <b className="truncate text-t4" style={{ color: W2 }}>{ko}</b>
            <span className="relative block h-2 rounded-full" style={{ background: 'rgba(255,255,255,.06)' }}>
              <i className="absolute top-[-3px] block h-3.5 w-px" style={{ left: '50%', background: 'rgba(255,255,255,.3)' }} />
              <i className="absolute inset-y-0 block rounded-full" style={{ left: d >= 0 ? '50%' : `${50 + d * 40}%`, width: `${Math.abs(d) * 40}%`, background: d >= 0 ? c : RED }} />
            </span>
            <b className="text-right font-display text-t4" style={{ color: d >= 0 ? US : RED }}>{d > 0 ? '+' : ''}{d.toFixed(1)}%p</b>
          </span>
        ))}
      </div>
    </Box>
  );
}
/* 준비 카드 선반 */
function Shelf({ compact }) {
  const [on, setOn] = useState(0);
  return (
    <Box className={compact ? 'shrink-0' : 'flex-1'}>
      <Head ko="준비 카드" right={<span className="text-[11px]" style={{ color: W3 }}>경기마다 한 장</span>} />
      <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${CARDS.length + 1},minmax(0,1fr))` }}>
        {[...CARDS, [null, '안 씀', '', null]].map(([img, ko, fx, n], i) => {
          const sel = on === i, dim = n === 0;
          return (
            <button key={ko} type="button" disabled={dim} onClick={() => setOn(i)} className={`mt-cut flex ${compact ? 'flex-row items-center gap-3 p-2.5' : 'flex-col items-center justify-center gap-2 p-3'} text-left`}
              style={{ ...cut(10), opacity: dim ? 0.35 : 1, background: sel ? 'rgba(16,185,129,.1)' : 'rgba(255,255,255,.025)', boxShadow: `inset 0 0 0 ${sel ? 2 : 1}px ${sel ? US : 'rgba(255,255,255,.08)'}` }}>
              {img ? <span className="relative shrink-0"><img src={`/ui/shop/${img}.webp`} alt="" className="mt-cut block object-cover" style={{ ...cut(8), width: compact ? 48 : 112, height: compact ? 48 : 112, filter: sel ? 'none' : 'saturate(.6) brightness(.85)' }} /><b className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full font-display text-[11px]" style={{ background: '#0b0f1a', color: W1, boxShadow: '0 0 0 1px rgba(255,255,255,.2)' }}>{n}</b></span>
                : <span className="grid shrink-0 place-items-center rounded-lg text-t2" style={{ width: compact ? 48 : 112, height: compact ? 48 : 112, color: W3, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>—</span>}
              <span className={`flex min-w-0 flex-col ${compact ? '' : 'items-center text-center'}`}><b className="text-t3" style={{ color: sel ? '#fff' : W1 }}>{ko}</b>{fx && <span className="truncate text-[12px]" style={{ color: W2 }}>{fx}</span>}</span>
            </button>
          );
        })}
      </div>
    </Box>
  );
}

const VARIANTS = {
  1: ['아래 3열 대상 선수', (ctx) => <div className="flex min-h-0 flex-1 gap-4"><OurOrder ctx={ctx} /><Runners ctx={ctx} /><OppOrder ctx={ctx} /></div>],
  2: ['아래 타순 두 줄', (ctx) => <Box className="flex-1 gap-3"><Strip team={ME} label="우리" tags={ourTags(ctx)} /><i className="block h-px shrink-0 bg-white/[0.07]" /><Strip team={OPP} label="상대" tags={oppTags(ctx)} /></Box>],
  3: ['오른쪽 대상 열', null],
  4: ['리허설 300경기', () => <Rehearsal />],
  5: ['대상 둘 + 리허설', (ctx) => <div className="flex min-h-0 flex-1 gap-4"><Runners ctx={ctx} /><OppOrder ctx={ctx} /><div className="flex min-h-0 flex-[1.3]"><Rehearsal /></div></div>],
  6: ['준비 카드 선반', () => <Shelf />],
  7: ['세 줄 크게', null],
  8: ['타순 한 줄 + 준비 카드', (ctx) => <><Box className="flex-1"><Strip team={OPP} label="상대" tags={oppTags(ctx)} /></Box><Shelf compact /></>],
};

function Center() {
  const [conds, setConds] = useState(['rispCon', 'steal85', 'pitchZoneCon']);
  const ctx = useCtx(conds);
  const engine = { home: ME, away: OPP };
  const board = <SitBoard conds={conds} setConds={setConds} engine={engine} />;
  if (V === 3) return (
    <div className="grid h-full min-h-0 gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px' }}>
      <div className="min-h-0">{board}</div>
      <div className="flex min-h-0 flex-col gap-3"><Runners ctx={ctx} rows={5} /><OppOrder ctx={ctx} rows={9} /></div>
    </div>
  );
  if (V === 7) return (
    <div id="v7" className="h-full min-h-0">
      <style>{'#v7 > div { height: 100%; justify-content: space-between; } #v7 > div > div > span:last-child { min-height: 168px !important; padding-top: 20px; padding-bottom: 20px; } #v7 button { padding-top: 16px; padding-bottom: 16px; } #v7 button b { font-size: 18px; }'}</style>
      {board}
    </div>
  );
  return <div className="flex h-full min-h-0 flex-col gap-4">{board}{VARIANTS[V][1](ctx)}</div>;
}

function Left() {
  const G = [['선발', '제구', '구위', 72], ['선발', '일찍 지침', '길게 던짐', 40], ['타선', '교타', '장타', 70], ['포수', '어깨 약함', '어깨 강함', 22]];
  return (
    <aside className="mt-cut flex flex-col gap-3 p-5" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
      <span className="text-t4" style={{ color: W3 }}>오늘 상대 · 머리(그대로)</span>
      <span style={{ height: 150 }} />
      <b className="text-t3" style={{ color: W1 }}>상대 성향</b>
      {G.map(([who, l, r, at]) => (
        <div key={l} className="grid items-center gap-2 text-[11px]" style={{ gridTemplateColumns: '2.4rem 4.6rem 1fr 4.6rem' }}><span style={{ color: W3 }}>{who}</span><span className="text-right" style={{ color: at < 40 ? W1 : W3 }}>{l}</span><span className="relative block h-1 rounded-full" style={{ background: 'rgba(255,255,255,.08)' }}><i className="absolute block h-3 w-3 -translate-x-1/2 rounded-full bg-white" style={{ left: `${at}%`, top: -4 }} /></span><span style={{ color: at > 60 ? W1 : W3 }}>{r}</span></div>
      ))}
    </aside>
  );
}

function App() {
  const [t] = VARIANTS[V];
  const shelfUp = V === 6 || V === 8;
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex h-full flex-col gap-3 px-2.5 pb-2.5 pt-3">
        <div className="flex shrink-0 items-center gap-4 px-3" style={{ height: 70 }}><b className="text-t1 font-black text-white">경기 전 정비</b><span className="rounded-full px-3 py-1 text-t4 font-bold" style={{ color: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}66` }}>{V} · {t}</span></div>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
          <Left />
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(20), '--a': US }}>
            <div className="flex shrink-0 items-center gap-6" style={{ height: 40 }}>
              {['라인업', '경기 흐름', '상황 대응'].map((x, i) => (
                <React.Fragment key={x}>
                  <span className="flex items-center gap-2.5"><b className="grid h-8 w-8 place-items-center rounded-full font-display text-t3" style={{ background: i === 2 ? GOLD : 'rgba(52,211,153,.22)', color: i === 2 ? '#1c1203' : '#34d399' }}>{i < 2 ? '✓' : 3}</b><b className="text-t3" style={{ color: i === 2 ? '#fff' : W2 }}>{x}</b></span>
                  {i < 2 && <i className="block h-px w-8 bg-white/15" />}
                </React.Fragment>
              ))}
              <span className="ml-auto flex flex-col gap-1.5" style={{ width: 288 }}><span className="flex justify-between text-t4"><span style={{ color: W2 }}>예상 승률</span><b className="font-display text-t3" style={{ color: '#34d399' }}>52% : 48%</b></span><span className="flex h-1.5 overflow-hidden rounded-full"><i style={{ width: '52%', background: '#34d399' }} /><i className="flex-1" style={{ background: RED }} /></span></span>
            </div>
            <div className="min-h-0 flex-1"><Center /></div>
            <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.08] pt-3" style={{ height: 64 }}>
              <span className="flex-1" />
              {!shelfUp && <span className="flex items-center gap-2"><span className="mr-1 text-[11px] font-bold" style={{ color: W3 }}>준비 카드</span>{CARDS.map(([img, ko, , n], i) => <span key={ko} className="relative" style={{ opacity: n ? 1 : 0.3 }}><img src={`/ui/shop/${img}.webp`} alt="" className="mt-cut block object-cover" style={{ ...cut(8), width: 48, height: 48, boxShadow: `inset 0 0 0 ${i ? 1 : 2}px ${i ? 'rgba(255,255,255,.14)' : US}` }} /><b className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full font-display text-[10px]" style={{ background: '#0b0f1a', color: W1 }}>{n}</b></span>)}<i className="mx-2 block h-8 w-px bg-white/10" /></span>}
              <span className="flex h-12 items-center rounded-lg px-4 text-t3 font-bold" style={{ color: '#d1d5db', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>◀ 이전</span>
              <span className="mt-cut flex h-12 items-center gap-3 px-6" style={{ ...cut(12), minWidth: 288, justifyContent: 'center', background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}><b className="text-t2 font-black">경기 시작 ▶</b></span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
