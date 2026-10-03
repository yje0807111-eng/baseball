/*
 * 정비 1단계 정돈안 (/mockups/prep-lineup3/?v=1~8, 1920 × 911) — 지금 게임 화면(LineupField)이 '정돈 안 된' 다섯 까닭을 고친 안들.
 *  ① 격자 맞춤: 두 칸 제목 줄 높이 · 아래 끝을 맞추고, 타순 9줄을 구장 높이에 고르게
 *  ② 색 두 가지 뜻만: 평소 흰 · 회색, 초록 = 고른 선수, 빨강 = 이탈 감점(자리별 색 · 금색 번호 없앰)
 *  ③ 타순을 표로: 열 제목(번호 · 선수 · 자리 · 컨 · 파 · 주), 능력치 열을 이름 가까이
 *  ④ 구장 이름표 한 덩어리: 번호를 이름표 안에, 너비 고정, 지명은 홈 옆 정해진 칸
 *  ⑤ 바닥 한 줄: 벤치는 타순 칸 아래, 시너지는 미리보기 띠 안
 *  1 기본 정돈 · 2 구장 넓게 · 3 이름표만 · 4 동그란 얼굴 · 5 능력 막대 · 6 종합만 · 7 벤치 = 표 끝 묶음 · 8 번호 구장
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const MYT = seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2));
const ME = engineTeam(MYT);
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const V = Number(new URLSearchParams(location.search).get('v') || 1);
const cut = (c) => ({ '--c': `${c}px` });
const US = '#10b981', RED = '#f87171', GOLD = '#fbbf24';
const POS_KO = { C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', LF: '좌익수', CF: '중견수', RF: '우익수', DH: '지명', OF: '외야수' };
let of = 0;
const LINE = ME.batters.map((b, i) => ({ b, slot: b.position === 'OF' ? ['LF', 'CF', 'RF'][of++] || 'DH' : b.position, n: i + 1 }));
const seen = new Set(); LINE.forEach((x) => { if (seen.has(x.slot)) x.slot = 'DH'; seen.add(x.slot); });
if (!seen.has('DH')) LINE[8].slot = 'DH';
const OFF = LINE.find((x) => x.slot === '3B');
const pen = (x) => (x === OFF ? 6 : 0);
const SEL = LINE[2];
const BENCH = ME.bench || [];
const SP = ME.pitchers[0];
/* 구장 그림 1번 좌표(게임과 같음) + 지명 칸은 홈 오른쪽 */
const B = { h: [50, 89], b1: [67.3, 65.8], b2: [50, 47.2], b3: [32.8, 65.8] };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const SPOT = { C: [50, 91], '1B': [B.b1[0] + 3, B.b1[1] - 1], '3B': [B.b3[0] - 3, B.b3[1] - 1], '2B': [lerp(B.b2, B.b1, 0.55)[0], lerp(B.b2, B.b1, 0.55)[1] - 15], SS: [lerp(B.b2, B.b3, 0.55)[0], lerp(B.b2, B.b3, 0.55)[1] - 15], LF: [B.b3[0] - 9, B.b2[1] - 24], CF: [50, B.b2[1] - 33], RF: [B.b1[0] + 9, B.b2[1] - 24], DH: [80, 91], P: [50, 66] };
const at = (k) => ({ left: `${SPOT[k][0]}%`, top: `${SPOT[k][1]}%` });
const W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280';

/* ───── 구장 ───── */
function Field({ plate = 'face' }) {
  return (
    <div className="relative h-full w-full" style={{ containerType: 'size' }}>
      <div className="absolute inset-0 m-auto" style={{ width: 'min(100cqw, 133.94cqh)', height: 'min(100cqh, 74.66cqw)' }}>
        <img src="ui/field/field-1.webp" alt="" className="absolute inset-0 h-full w-full rounded-2xl object-cover" style={{ filter: 'brightness(.66) saturate(.85)' }} />
        <i className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse at 50% 60%, transparent 45%, rgba(5,8,15,.8) 100%)' }} />
        {/* 지명 칸 — 홈 오른쪽 정해진 자리 */}
        <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg" style={{ ...at('DH'), width: 120, height: plate === 'num' ? 40 : 76, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)', background: 'rgba(5,8,15,.35)' }} />
        <span className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={at('P')}>
          {plate !== 'num' && <Portrait player={SP} w={30} h={38} color="#334155" />}
          <span className="rounded-md px-1.5 text-[11px] font-bold" style={{ color: W1, background: 'rgba(5,8,15,.7)' }}>선발 {SP.name}</span>
        </span>
        {LINE.map((x) => {
          const on = x === SEL, p = pen(x), ring = on ? US : p ? RED : 'rgba(255,255,255,.14)';
          const Tag = (
            <span className="flex items-center gap-1.5 rounded-md px-1.5 py-[3px]" style={{ width: 120, background: on ? 'rgba(6,40,30,.85)' : 'rgba(8,11,20,.82)', boxShadow: `inset 0 0 0 1px ${ring}` }}>
              <b className="grid h-5 w-5 shrink-0 place-items-center rounded font-display text-[12px]" style={{ background: on ? US : 'rgba(255,255,255,.1)', color: on ? '#0b0f1a' : W1 }}>{x.n}</b>
              <b className="min-w-0 flex-1 truncate text-t4" style={{ color: W1 }}>{x.b.name}</b>
              <span className="shrink-0 text-[11px]" style={{ color: p ? RED : W3 }}>{p ? `−${p}` : POS_KO[x.slot]}</span>
            </span>
          );
          return (
            <span key={x.b.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={at(x.slot)}>
              {plate === 'face' && <Portrait player={x.b} w={36} h={46} color={on ? US : p ? RED : '#334155'} />}
              {plate === 'round' && <Portrait player={x.b} w={40} h={40} round t={on ? US : p ? RED : '#475569'} />}
              {plate === 'num' ? (
                <span className="flex flex-col items-center gap-1">
                  <b className="grid h-9 w-9 place-items-center rounded-full font-display text-t2" style={{ background: on ? US : 'rgba(8,11,20,.85)', color: on ? '#0b0f1a' : W1, boxShadow: `0 0 0 1.5px ${on ? US : p ? RED : 'rgba(255,255,255,.3)'}` }}>{x.n}</b>
                  <span className="whitespace-nowrap rounded px-1 text-[11px]" style={{ color: p ? RED : W2, background: 'rgba(5,8,15,.6)' }}>{x.b.name}</span>
                </span>
              ) : Tag}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ───── 타순 표 ───── */
const Bar = ({ v }) => <span className="relative block h-1.5 w-full rounded-full bg-white/[0.08]"><i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(6, Math.min(100, ((v - 55) / 55) * 100))}%`, background: v >= 90 ? W1 : W2 }} /></span>;
function Table({ cols = 'num', bench = 'strip' }) {
  const g = cols === 'ovr' ? '2rem 2.2rem minmax(0,1fr) 4.2rem 3rem' : cols === 'bar' ? '2rem 2.2rem minmax(0,1fr) 4.2rem repeat(3,4.2rem)' : '2rem 2.2rem minmax(0,1fr) 4.2rem repeat(3,2.8rem)';
  const head = cols === 'ovr' ? ['', '', '선수', '자리', '종합'] : ['', '', '선수', '자리', '컨', '파', '주'];
  const Row = ({ x, dim }) => {
    const on = x === SEL, p = x ? pen(x) : 0;
    return (
      <div className="grid min-h-0 flex-1 items-center gap-3 rounded-lg px-3" style={{ gridTemplateColumns: g, background: on ? 'rgba(16,185,129,.12)' : 'transparent', boxShadow: on ? `inset 0 0 0 1px ${US}` : p ? `inset 2px 0 0 ${RED}` : 'none', opacity: dim ? 0.7 : 1 }}>
        <b className="font-display text-t2" style={{ color: on ? US : dim ? W3 : W1 }}>{dim ? '−' : x.n}</b>
        <Portrait player={x.b} w={28} h={34} color="#334155" />
        <span className="flex min-w-0 items-center gap-2"><b className="truncate text-t3" style={{ color: W1 }}>{x.b.name}</b><span className="text-t4" style={{ color: W3 }}>{x.b.hand === 'L' ? '좌' : x.b.hand === 'S' ? '양' : '우'}</span></span>
        <span className="text-t4" style={{ color: p ? RED : W2 }}>{dim ? (POS_KO[x.b.position] || x.b.position) : p ? `${POS_KO[x.slot]} −${p}` : POS_KO[x.slot]}</span>
        {cols === 'ovr' ? <b className="text-right font-display text-t3" style={{ color: W1 }}>{x.b.overall}</b>
          : ['contact', 'power', 'speed'].map((k) => (cols === 'bar' ? <Bar key={k} v={st(x.b, k)} /> : <b key={k} className="text-right font-display text-t3" style={{ color: st(x.b, k) >= 90 ? W1 : W2 }}>{st(x.b, k)}</b>))}
      </div>
    );
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid h-7 shrink-0 items-center gap-3 border-b border-white/[0.08] px-3 text-t4" style={{ gridTemplateColumns: g, color: W3 }}>
        {head.map((h, i) => <span key={i} className={i > 3 ? 'text-right' : ''}>{h}</span>)}
      </div>
      <div className="flex min-h-0 flex-1 flex-col py-1">{LINE.map((x) => <Row key={x.b.id} x={x} />)}</div>
      {bench === 'rows' ? (
        <div className="flex shrink-0 flex-col border-t border-white/[0.08] pt-1" style={{ height: 34 * BENCH.length + 30 }}>
          <span className="px-3 text-t4" style={{ color: W3 }}>벤치</span>
          {BENCH.map((p) => <div key={p.id} className="flex" style={{ height: 34 }}><Row x={{ b: p, slot: p.position, n: 0 }} dim /></div>)}
        </div>
      ) : (
        <div className="flex h-14 shrink-0 items-center gap-2 border-t border-white/[0.08] px-3">
          <span className="mr-1 text-t4" style={{ color: W3 }}>벤치</span>
          {BENCH.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 rounded-md px-2 py-1" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
              <Portrait player={p} w={20} h={26} color="#334155" /><b className="text-t4" style={{ color: W1 }}>{p.name}</b><span className="text-[11px]" style={{ color: W3 }}>{POS_KO[p.position] || p.position}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const CFG = {
  1: ['기본 정돈', { cols: '1fr 1fr', plate: 'face', t: 'num' }],
  2: ['구장 넓게', { cols: '1.25fr 1fr', plate: 'face', t: 'num' }],
  3: ['이름표만', { cols: '1fr 1fr', plate: 'tag', t: 'num' }],
  4: ['동그란 얼굴', { cols: '1fr 1fr', plate: 'round', t: 'num' }],
  5: ['능력 막대', { cols: '1fr 1.1fr', plate: 'face', t: 'bar' }],
  6: ['종합만', { cols: '1.2fr 1fr', plate: 'face', t: 'ovr' }],
  7: ['벤치 = 표 끝', { cols: '1fr 1fr', plate: 'face', t: 'num', bench: 'rows' }],
  8: ['번호 구장', { cols: '1fr 1.1fr', plate: 'num', t: 'num' }],
};

function App() {
  const [t, c] = CFG[V];
  const Btn = ({ s }) => <span className="mt-cut px-3 py-1.5 text-t4 font-bold" style={{ ...cut(7), color: W1, background: 'rgba(255,255,255,.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>{s}</span>;
  return (
    <div className="relative overflow-hidden" style={{ width: 1920, height: 911 }}>
      <GlassBg />
      <UiStyle />
      <div className="relative flex h-full flex-col gap-3 px-2.5 pb-2.5 pt-3">
        <div className="flex h-[70px] shrink-0 items-center gap-4 px-3"><b className="text-t1 font-black text-white">경기 전 정비</b><span className="rounded-full px-3 py-1 text-t4 font-bold" style={{ color: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}66` }}>{V} · {t}</span></div>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
          <aside className="mt-cut grid place-items-center text-t4 text-gray-600" style={{ ...cut(20), background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>오늘 상대 판</aside>
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-4 p-5" style={{ ...cut(20), '--a': US }}>
            <div className="flex h-10 shrink-0 items-center gap-6">
              {['라인업', '경기 흐름', '상황 대응'].map((x, i) => (
                <React.Fragment key={x}>
                  <span className="flex items-center gap-2.5"><b className="grid h-8 w-8 place-items-center rounded-full font-display text-t3" style={{ background: i ? 'rgba(255,255,255,.06)' : GOLD, color: i ? W2 : '#1c1203' }}>{i + 1}</b><b className="text-t3" style={{ color: i ? W2 : '#fff' }}>{x}</b></span>
                  {i < 2 && <i className="block h-px w-8 bg-white/15" />}
                </React.Fragment>
              ))}
              <span className="ml-auto flex flex-col gap-1.5" style={{ width: 288 }}><span className="flex justify-between text-t4"><span style={{ color: W2 }}>예상 승률</span><b className="font-display text-t3" style={{ color: '#34d399' }}>44% : 56%</b></span><span className="flex h-1.5 overflow-hidden rounded-full"><i style={{ width: '44%', background: '#34d399' }} /><i className="flex-1" style={{ background: RED }} /></span></span>
            </div>
            {/* ① 두 칸 — 같은 제목 줄 높이(36) · 같은 아래 끝 */}
            <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: c.cols, gridTemplateRows: '36px minmax(0,1fr)' }}>
              <div className="flex items-center justify-between"><b className="text-t3" style={{ color: W1 }}>수비</b><span className="text-t4" style={{ color: W3 }}>끌어서 자리 바꾸기</span></div>
              <div className="flex items-center justify-between"><b className="text-t3" style={{ color: W1 }}>타순</b><span className="flex gap-1.5"><Btn s="투수진" /><Btn s="자동 배치" /></span></div>
              <div className="min-h-0"><Field plate={c.plate} /></div>
              <div className="min-h-0"><Table cols={c.t} bench={c.bench} /></div>
            </div>
            {/* ⑤ 바닥 한 줄 — 미리보기 띠에 시너지까지 */}
            <div className="flex h-16 shrink-0 items-center gap-6 border-t border-white/[0.08] pt-3">
              {[['우리 선발', '4.0회까지'], ['상대 선발', '4.9회까지'], ['증강', '7회'], ['필승조', '고효준 · 이승호 · 송은범']].map(([k, v]) => <span key={k} className="flex flex-col"><span className="text-t4" style={{ color: W3 }}>{k}</span><b className="text-t3" style={{ color: W1 }}>{v}</b></span>)}
              <i className="block h-8 w-px bg-white/10" />
              <span className="flex items-center gap-2"><span className="text-t4" style={{ color: W3 }}>시너지</span><b className="font-display text-t3" style={{ color: W1 }}>6</b>{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className="block h-6 w-6 rotate-45 rounded-[5px]" style={{ background: 'rgba(255,255,255,.08)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }} />)}</span>
              <span className="ml-auto mt-cut grid h-12 place-items-center text-t2 font-black" style={{ ...cut(12), width: 288, background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203' }}>다음 · 경기 흐름 ▶</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
