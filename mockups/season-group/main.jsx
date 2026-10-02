/*
 * 영입 목록 — 같은 선수의 다른 시즌을 펼쳤을 때 '한 묶음'으로 읽히게 8안 (/mockups/season-group/?v=1~8)
 * 지금: 대표 줄 아래에 같은 높이 줄이 이어지고 왼쪽 초록 선 · 옅은 바탕만 다르다 → 다른 선수 줄과 구분이 약하다.
 * 참고: Material 펼침 판(부모 · 자식이 한 판) · 스레드 연결선(Discord · GitHub) · FC 온라인 시즌 배지 · Futbin 버전 칩 · 서랍(안으로 꺼진 판)
 *  1 한 판      — 묶음 전체를 구단 색 테두리 유리 판 하나로
 *  2 연결선     — 대표 얼굴에서 내려오는 선 + ㄴ자 가지, 시즌 얼굴은 작게
 *  3 연도 줄기  — 얼굴 칸 자리에 연도 + 점 줄기(시즌 흐름)
 *  4 시즌 칩    — 줄을 늘리지 않고 대표 줄 아래에 시즌 칩 한 줄(고르면 그 시즌으로)
 *  5 서랍       — 대표 줄 아래 안으로 꺼진 판에 시즌 줄
 *  6 구단 띠    — 왼쪽 구단 색 굵은 띠가 묶음 전체를 잇고 바탕도 구단 색으로
 *  7 압축 비교  — 시즌 줄은 낮게(얼굴 없이) · 능력치는 대표와 견준 ± 로
 *  8 겹친 카드  — 닫힌 줄 뒤에 카드 모서리가 겹쳐 보이고, 펼치면 한 판 + 뒤 그림자 층
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { statOf, statPct, teamNeon } from '../../src/myteam/teamColor.js';
import { priceOf } from '../../src/myteam/market.js';

const ALL = [...SERIES.filter((s) => s.kind !== 'national').sort((a, b) => (a.kind === 'team' ? 0 : 1) - (b.kind === 'team' ? 0 : 1))
  .flatMap((s) => s.players).reduce((m, p) => (m.has(`${p.personId}|${p.year}`) ? m : m.set(`${p.personId}|${p.year}`, p)), new Map()).values()];
const seasons = (name) => { const pid = ALL.find((p) => p.name === name)?.personId; return ALL.filter((p) => p.personId === pid).sort((a, b) => a.year - b.year); };
const groupOf = (name) => { const vs = seasons(name); const rep = vs.reduce((a, b) => (priceOf(b) > priceOf(a) ? b : a)); return { rep, rest: vs.filter((v) => v !== rep) }; };
const G = groupOf('이종범'), ABOVE = groupOf('양준혁'), BELOW = groupOf('이승엽');
const REST = G.rest.slice(0, 6);

const KEYS = [['파워', 'power'], ['컨택', 'contact'], ['주루', 'speed'], ['수비', 'defense']];
const POS = { C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', OF: '외야수', DH: '지명타자' };
const ROW_COLS = '56px 64px 230px repeat(4,minmax(0,1fr)) 84px 124px 92px';
const v = Number(new URLSearchParams(location.search).get('v') || 1);
const T = teamNeon(G.rep);
const hex = (c, a) => `${c}${Math.round(a * 255).toString(16).padStart(2, '0')}`;

const VARIANTS = {
  1: ['한 판', '묶음 전체를 구단 색 테두리 유리 판 하나로'],
  2: ['연결선', '대표 얼굴에서 내려오는 선 + 가지 · 시즌 얼굴 작게'],
  3: ['연도 줄기', '얼굴 칸에 연도 + 점 줄기'],
  4: ['시즌 칩', '줄을 늘리지 않고 시즌 칩 한 줄'],
  5: ['서랍', '대표 줄 아래 안으로 꺼진 판'],
  6: ['구단 띠', '왼쪽 구단 색 띠가 묶음 전체를 이음'],
  7: ['압축 비교', '시즌 줄 낮게 · 대표와 견준 ±'],
  8: ['겹친 카드', '닫히면 카드 모서리 · 펼치면 뒤 그림자 층'],
};

function Stat({ label, k, p, base, small }) {
  const val = p.stats?.[k] ?? 0, c = statOf(k, val), d = base ? val - (base.stats?.[k] ?? 0) : null;
  return (
    <span className={`flex min-w-0 flex-col gap-1 rounded-xl bg-white/[0.04] px-3 ${small ? 'py-1' : 'py-1.5'} shadow-[inset_0_1px_0_rgba(255,255,255,.05)]`}>
      <span className="flex items-baseline justify-between">
        <span className="text-t4 text-gray-400">{label}</span>
        <span className="flex items-baseline gap-1.5">
          {d != null && d !== 0 && <em className="font-display text-t4 not-italic" style={{ color: d > 0 ? '#34d399' : '#f87171' }}>{d > 0 ? `+${d}` : d}</em>}
          <b className="font-display text-t2 leading-none" style={{ color: c.num }}>{val}</b>
        </span>
      </span>
      {!small && <i className="relative block h-1 overflow-hidden rounded-full bg-white/[0.08]"><b className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${statPct(val)}%`, background: c.bar }} /></i>}
    </span>
  );
}

/** 지금 PlayerRow 와 같은 칸 — face 자리는 안마다 바꿔 끼운다 */
function Row({ p, on, more, face, h = 72, small, base, style, className = '' }) {
  return (
    <div className={`mt-row ${on ? 'on' : ''} ${className}`} style={{ gridTemplateColumns: ROW_COLS, gap: 14, padding: '0 14px 0 8px', height: h, ...style }}>
      {face ?? <Portrait player={p} w={52} h={52} round t={teamNeon(p)} />}
      <b className={`mt-ovr text-center font-display ${small ? 'text-t2' : 'text-t1'} font-extrabold leading-none`}>{p.overall}</b>
      <span className="min-w-0">
        <b className={`block truncate ${small ? 'text-t3' : 'text-t2'} font-black text-white`}>
          {small ? `${p.year} ${p.team}` : p.name}
          {more && <em className="ml-2 rounded-full px-2 py-px align-middle text-t4 font-bold not-italic" style={{ color: '#a7f3d0', background: 'rgba(52,211,153,.12)' }}>다른 시즌 {more.n} {more.open ? '▴' : '▾'}</em>}
        </b>
        {!small && <small className="mt-0.5 block truncate text-t4 text-gray-400">{POS[p.position] || p.position} · {p.year} {p.team}</small>}
      </span>
      {KEYS.map(([l, k]) => <Stat key={k} label={l} k={k} p={p} base={base} small={small} />)}
      <span className="justify-self-center rounded-full bg-amber-400/10 px-2.5 py-1 font-display text-t3 font-bold text-amber-300 shadow-[inset_0_0_0_1px_rgba(251,191,36,.35)]">{p.cost} CP</span>
      <b className="text-right font-display text-t2 text-amber-200">{priceOf(p).toLocaleString()}<small className="ml-0.5 text-t4 text-amber-300/70">G</small></b>
      <button type="button" className="mt-btn sm" style={{ height: small ? 34 : 40 }}>영입</button>
    </div>
  );
}

const closed = (g, extra) => <Row p={g.rep} more={{ n: g.rest.length, open: false }} {...extra} />;
const repRow = (extra) => <Row p={G.rep} on more={{ n: G.rest.length, open: true }} {...extra} />;

function Group() {
  const sub = (fn) => REST.map((p, i) => <React.Fragment key={p.id}>{fn(p, i)}</React.Fragment>);
  if (v === 1) return (
    <div className="flex flex-col gap-1 rounded-[18px] p-1.5" style={{ background: `linear-gradient(180deg, ${hex(T, 0.1)}, ${hex(T, 0.03)})`, boxShadow: `inset 0 0 0 1.5px ${hex(T, 0.55)}, 0 18px 40px -18px ${hex(T, 0.6)}` }}>
      {repRow()}
      <i className="mx-3 block h-px bg-white/10" />
      {sub((p) => <Row p={p} />)}
    </div>
  );
  if (v === 2) return (
    <div className="relative flex flex-col gap-1">
      <i className="absolute block w-[2px] rounded" style={{ left: 33, top: 60, bottom: 36, background: hex(T, 0.6) }} />
      {repRow()}
      {sub((p) => (
        <Row p={p} face={(
          <span className="relative grid h-full place-items-center justify-items-end">
            <i className="absolute block h-[2px] rounded" style={{ left: 25, width: 14, top: '50%', background: hex(T, 0.6) }} />
            <Portrait player={p} w={38} h={38} round t={teamNeon(p)} />
          </span>
        )} />
      ))}
    </div>
  );
  if (v === 3) return (
    <div className="relative flex flex-col gap-1">
      <i className="absolute block w-[2px]" style={{ left: 33, top: 64, bottom: 34, background: `linear-gradient(${hex(T, 0.7)}, ${hex(T, 0.15)})` }} />
      {repRow()}
      {sub((p) => (
        <Row p={p} small h={60} face={(
          <span className="relative grid h-full place-items-center">
            <i className="absolute block h-3 w-3 rounded-full" style={{ left: 28, background: '#0b111d', boxShadow: `inset 0 0 0 2px ${T}` }} />
          </span>
        )} />
      ))}
    </div>
  );
  if (v === 4) return (
    <div className="flex flex-col rounded-[16px]" style={{ background: 'linear-gradient(90deg,rgba(16,185,129,.16),rgba(16,185,129,.03))', boxShadow: 'inset 0 0 0 1px rgba(16,185,129,.45)' }}>
      <Row p={G.rep} more={{ n: G.rest.length, open: true }} style={{ background: 'none', boxShadow: 'none' }} />
      <div className="flex gap-2 overflow-hidden px-4 pb-3" style={{ paddingLeft: 142 }}>
        {[G.rep, ...G.rest].sort((a, b) => a.year - b.year).slice(0, 11).map((p) => {
          const on = p === G.rep;
          return (
            <span key={p.id} className="flex shrink-0 flex-col items-center rounded-xl px-3 py-1.5" style={{ background: on ? 'rgba(251,191,36,.16)' : 'rgba(255,255,255,.05)', boxShadow: on ? 'inset 0 0 0 1.5px #fbbf24' : 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
              <b className="font-display text-t3 leading-none" style={{ color: on ? '#fde68a' : '#e2e8f0' }}>{p.year}</b>
              <span className="mt-1 flex items-baseline gap-1.5"><b className="mt-ovr font-display text-t3 leading-none">{p.overall}</b><small className="text-t4 text-gray-400">{p.team}</small></span>
            </span>
          );
        })}
      </div>
    </div>
  );
  if (v === 5) return (
    <div className="flex flex-col">
      {repRow({ style: { borderRadius: '14px 14px 0 0' } })}
      <div className="flex flex-col gap-1 p-1.5" style={{ borderRadius: '0 0 16px 16px', background: 'rgba(2,4,9,.55)', boxShadow: 'inset 0 10px 18px -8px rgba(0,0,0,.9), inset 0 0 0 1px rgba(255,255,255,.05)' }}>
        {sub((p) => <Row p={p} h={64} style={{ background: 'rgba(255,255,255,.025)' }} />)}
      </div>
    </div>
  );
  if (v === 6) return (
    <div className="relative flex flex-col gap-1 overflow-hidden rounded-[16px]" style={{ background: `linear-gradient(90deg, ${hex(T, 0.16)}, ${hex(T, 0.02)} 45%)` }}>
      <i className="absolute inset-y-0 left-0 block w-[6px]" style={{ background: `linear-gradient(${T}, ${hex(T, 0.35)})`, boxShadow: `0 0 16px ${T}` }} />
      {repRow({ style: { marginLeft: 6 } })}
      {sub((p) => <Row p={p} style={{ marginLeft: 6 }} />)}
    </div>
  );
  if (v === 7) return (
    <div className="flex flex-col gap-0.5 rounded-[18px] p-1.5" style={{ background: 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${hex(T, 0.4)}` }}>
      {repRow()}
      {sub((p) => <Row p={p} small h={48} base={G.rep} face={<span />} />)}
    </div>
  );
  return (
    <div className="relative mb-4">
      <i className="absolute block" style={{ inset: '24px 24px -14px 24px', borderRadius: 18, background: 'rgba(255,255,255,.035)', boxShadow: `inset 0 0 0 1px ${hex(T, 0.22)}` }} />
      <i className="absolute block" style={{ inset: '12px 12px -7px 12px', borderRadius: 18, background: 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${hex(T, 0.35)}` }} />
      <div className="relative flex flex-col gap-1 rounded-[18px] p-1.5" style={{ background: 'rgba(10,15,26,.92)', boxShadow: `inset 0 0 0 1.5px ${hex(T, 0.5)}, 0 16px 34px -14px rgba(0,0,0,.9)` }}>
        {repRow()}
        {sub((p) => <Row p={p} />)}
      </div>
    </div>
  );
}

/* 닫힌 줄 — 8안은 뒤에 카드 모서리 두 장 */
const Closed = ({ g }) => (v === 8 ? (
  <div className="relative mb-3">
    <i className="absolute block" style={{ inset: '20px 28px -10px 28px', borderRadius: 14, background: 'rgba(255,255,255,.035)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }} />
    <i className="absolute block" style={{ inset: '10px 14px -5px 14px', borderRadius: 14, background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.11)' }} />
    {closed(g, { style: { position: 'relative', background: 'rgba(12,17,28,.96)' } })}
  </div>
) : closed(g));

function App() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <GlassBg tint={T} />
      <div className="relative flex items-center gap-4 px-7 pt-5">
        {Object.entries(VARIANTS).map(([k, [name]]) => (
          <a key={k} href={`/mockups/season-group/?v=${k}`} className="rounded-full px-3 py-1 text-t3 font-bold" style={Number(k) === v ? { background: '#fbbf24', color: '#1c1203' } : { background: 'rgba(255,255,255,.06)', color: '#d1d5db' }}>{k} {name}</a>
        ))}
        <span className="ml-auto text-t3 text-gray-400">{VARIANTS[v][1]}</span>
      </div>
      <div className="relative grid min-h-0 flex-1 gap-5 px-7 pb-6 pt-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 460px' }}>
        <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ '--c': '22px' }}>
          <div className="mt-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-hidden pr-2">
            <Closed g={ABOVE} />
            <Group />
            <Closed g={BELOW} />
          </div>
        </section>
        <section className="mt-cut mt-glass grid place-items-center text-t3 text-gray-500" style={{ '--c': '22px' }}>상세 판</section>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
