/*
 * 상대 판 머리 목업 (/mockups/scout-head/) — 정비 3단계 왼쪽 판의 '세 화면 공통' 위 구역 8안.
 * 고정 구역 = 상대가 누구인가(구단 · 종합) + 오늘 상대 선발(좌우 · 구위 · 제구 · 체력 · 구종). 아래(점선)는 페이지마다 바뀌는 구역.
 * 비교 근거: MLB 9이닝스 · MLB The Show 경기 전 '선발 매치업'(얼굴 · 좌우 · 구종), Football Manager 상대 분석(위 요약 고정 + 탭별 본문),
 *            FC 온라인 상대 정보(구단 · 팀 OVR 한 줄). 높이가 낮을수록 아래 구역이 넓다 — 안마다 높이를 적어 둔다.
 * ?p=1 → 1~4안, ?p=2 → 5~8안(실제 크기 340 × 806, 1920 × 911 화면의 왼쪽 판과 같음)
 *  1 정리형      — 지금 판을 다듬음: 구단 줄 · 선발 줄 · 능력 한 줄 · 구종 막대
 *  2 매치업 카드 — 선발 얼굴 크게 + 좌우 배지 + 구위 · 제구 · 체력 세 칸
 *  3 구단 빛 머리 — 구단 색 빛 띠 위에 구단 · 종합, 아래 선발 한 줄
 *  4 선발 대 선발 — 우리 선발 · 상대 선발을 두 줄로 맞댐
 *  5 숫자 타일   — 상대 종합 · 타선 · 마운드 세 타일 + 선발 칩
 *  6 한 줄 압축  — 두 줄로 끝(가장 낮음)
 *  7 구종 원     — 선발 얼굴을 구종 비율 고리로 두름
 *  8 강점 칩     — 구단 아래 상대에서 가장 센 둘을 칩(타선 · 불펜 · 주력 가운데)
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { seriesTeam } from '../../src/myteam/aiTeam.js';
import { engineTeam } from '../../src/play/matchKit.jsx';
import { pitchMix, repertoireOf, PITCHES } from '../../src/engine/pitchSim.js';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { TEAM_NEON } from '../../src/myteam/teamColor.js';
import { seeded } from '../../src/engine/rng.js';

const pick = (re) => SERIES.find((s) => re.test(s.id));
const MYT = seriesTeam(pick(/^2010-sk/) || SERIES[5], seeded(2)), OPT = seriesTeam(pick(/^1997-ob/) || SERIES[9], seeded(3));
const ME = engineTeam(MYT), OP = engineTeam(OPT);
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => Math.round((st(p, 'stuff', 80) + st(p, 'control', 75)) / 2);
const avg = (l, f) => Math.round(l.reduce((n, x) => n + f(x), 0) / (l.length || 1));
const ovrOf = (t) => avg(t.roster || [], (p) => p.overall);
const sumsOf = (e) => ({ bat: avg(e.batters, (b) => (st(b, 'contact') + st(b, 'power')) / 2), pen: avg(e.pitchers.slice(1), arm), spd: avg(e.batters, (b) => st(b, 'speed')) });
const OS = sumsOf(OP), MS = sumsOf(ME);
const OSP = OP.pitchers[0], MSP = ME.pitchers[0];
const club = Object.keys(TEAM_NEON).find((k) => OPT.name.includes(k));
const C = TEAM_NEON[club] || '#a78bfa';
const MY = '#34d399', MUTE = '#94a3b8';
const PITCH_C = ['#f87171', '#a78bfa', '#2dd4bf', '#60a5fa', '#fbbf24'];
const HAND = (p) => (p?.hand === 'L' ? '좌투' : '우투');
const PAGE = Number(new URLSearchParams(location.search).get('p') || 1);
const cut = (c) => ({ '--c': `${c}px` });

/* ───── 조각 ───── */
const Rule = () => <span className="block h-px shrink-0 bg-white/[0.08]" />;
const Sub = ({ children }) => <span className="text-t3 font-bold text-gray-300">{children}</span>;
const Hand = ({ p }) => <b className="rounded px-1.5 text-t4" style={{ color: p?.hand === 'L' ? '#fbbf24' : '#7dd3fc', boxShadow: `inset 0 0 0 1px ${p?.hand === 'L' ? '#fbbf2466' : '#7dd3fc66'}` }}>{HAND(p)}</b>;
const Emb = ({ s = 44 }) => <span className="grid shrink-0 place-items-center rounded-full font-display font-extrabold" style={{ width: s, height: s, fontSize: s * 0.36, color: C, background: `${C}1a`, boxShadow: `inset 0 0 0 1px ${C}66` }}>{club || 'OB'}</span>;
function MixBar({ p, legend = true }) {
  const mix = pitchMix(p), rep = repertoireOf(p);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex h-2 overflow-hidden rounded-full">{rep.map((t, i) => <i key={t} className="block h-full" style={{ width: `${(mix[t] || 0) * 100}%`, background: PITCH_C[i % 5] }} />)}</span>
      {legend && <span className="flex flex-wrap gap-x-3 text-t4 text-gray-400">{rep.map((t, i) => <span key={t}><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: PITCH_C[i % 5] }} />{PITCHES[t].name} {Math.round((mix[t] || 0) * 100)}%</span>)}</span>}
    </div>
  );
}
const KV = ({ k, v, c = '#fff' }) => <span className="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.04] py-2"><span className="text-t4 text-gray-400">{k}</span><b className="font-display text-t1 leading-none" style={{ color: c }}>{v}</b></span>;
const TeamLine = ({ s = 44 }) => (
  <div className="flex shrink-0 items-center gap-3">
    <Emb s={s} /><b className="min-w-0 flex-1 truncate text-t2 font-black text-white">{OPT.name}</b>
    <b className="font-display text-t1 font-extrabold leading-none" style={{ color: C }}>{ovrOf(OPT)}</b>
  </div>
);

/* ───── 8안 ───── */
const V = {
  1: ['정리형', () => (
    <>
      <TeamLine />
      <Rule />
      <div className="flex flex-col gap-1.5">
        <Sub>상대 선발</Sub>
        <div className="flex items-center gap-2"><b className="text-t2 font-black text-white">{OSP.name}</b><Hand p={OSP} /><span className="flex-1" /><b className="font-display text-t2" style={{ color: C }}>{OSP.overall}</b></div>
        <span className="text-t4 text-gray-400">구위 {st(OSP, 'stuff')} · 제구 {st(OSP, 'control')} · 체력 {st(OSP, 'stamina')}</span>
        <MixBar p={OSP} />
      </div>
    </>
  )],
  2: ['매치업 카드', () => (
    <>
      <div className="flex items-center gap-2 text-t3"><Emb s={28} /><b className="truncate text-white">{OPT.name}</b><b className="ml-auto font-display text-t2" style={{ color: C }}>{ovrOf(OPT)}</b></div>
      <div className="flex gap-3 rounded-xl p-3" style={{ background: `linear-gradient(135deg, ${C}22, transparent 70%)`, boxShadow: `inset 0 0 0 1px ${C}33` }}>
        <Portrait player={OSP} w={72} h={92} color={C} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-t4 text-gray-400">상대 선발</span>
          <b className="truncate text-t1 font-black leading-tight text-white">{OSP.name}</b>
          <span className="flex items-center gap-2"><Hand p={OSP} /><b className="font-display text-t2" style={{ color: C }}>{OSP.overall}</b></span>
        </div>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}><KV k="구위" v={st(OSP, 'stuff')} /><KV k="제구" v={st(OSP, 'control')} /><KV k="체력" v={st(OSP, 'stamina')} /></div>
      <MixBar p={OSP} />
    </>
  )],
  3: ['구단 빛 머리', () => (
    <>
      <div className="relative -mx-5 -mt-5 overflow-hidden px-5 pb-4 pt-5" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${C}55, transparent 60%)` }}>
        <span className="text-t4 font-bold" style={{ color: C }}>오늘 상대</span>
        <div className="mt-1 flex items-end gap-3"><b className="min-w-0 flex-1 text-t1 font-black leading-tight text-white">{OPT.name}</b><b className="font-display text-[44px] font-extrabold leading-none" style={{ color: C }}>{ovrOf(OPT)}</b></div>
      </div>
      <div className="flex items-center gap-2.5">
        <Portrait player={OSP} w={40} h={52} color={C} />
        <span className="flex min-w-0 flex-1 flex-col"><span className="text-t4 text-gray-400">상대 선발</span><span className="flex items-center gap-2"><b className="truncate text-t2 font-black text-white">{OSP.name}</b><Hand p={OSP} /></span></span>
        <span className="text-right text-t4 text-gray-400">구위 <b className="text-white">{st(OSP, 'stuff')}</b><br />제구 <b className="text-white">{st(OSP, 'control')}</b></span>
      </div>
      <MixBar p={OSP} legend={false} />
    </>
  )],
  4: ['선발 대 선발', () => (
    <>
      <div className="grid items-center gap-2 text-center" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <span className="flex flex-col"><span className="text-t4 text-gray-400">우리</span><b className="font-display text-t1 leading-none" style={{ color: MY }}>{ovrOf(MYT)}</b></span>
        <b className="text-t4 text-gray-500">VS</b>
        <span className="flex flex-col"><span className="truncate text-t4 text-gray-400">{OPT.name}</span><b className="font-display text-t1 leading-none" style={{ color: C }}>{ovrOf(OPT)}</b></span>
      </div>
      <Rule />
      <Sub>선발 대결</Sub>
      {[[MSP, MY, '우리'], [OSP, C, '상대']].map(([p, c, who]) => (
        <div key={who} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2" style={{ background: `${c}12`, boxShadow: `inset 3px 0 0 ${c}` }}>
          <Portrait player={p} w={34} h={44} color={c} />
          <span className="flex min-w-0 flex-1 flex-col"><span className="text-t4" style={{ color: c }}>{who}</span><span className="flex items-center gap-1.5"><b className="truncate text-t3 font-black text-white">{p.name}</b><Hand p={p} /></span></span>
          <span className="font-display text-t3 text-gray-300">{st(p, 'stuff')}<span className="text-gray-500"> / </span>{st(p, 'control')}</span>
        </div>
      ))}
      <MixBar p={OSP} />
    </>
  )],
  5: ['숫자 타일', () => (
    <>
      <TeamLine s={36} />
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <KV k="타선" v={OS.bat} c={OS.bat > MS.bat ? C : '#fff'} /><KV k="불펜" v={OS.pen} c={OS.pen > MS.pen ? C : '#fff'} /><KV k="주력" v={OS.spd} c={OS.spd > MS.spd ? C : '#fff'} />
      </div>
      <Rule />
      <div className="flex items-center gap-2"><span className="text-t4 text-gray-400">상대 선발</span><b className="text-t2 font-black text-white">{OSP.name}</b><Hand p={OSP} /><b className="ml-auto font-display text-t3 text-gray-300">{st(OSP, 'stuff')} / {st(OSP, 'control')}</b></div>
      <MixBar p={OSP} />
    </>
  )],
  6: ['한 줄 압축', () => (
    <>
      <TeamLine s={32} />
      <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2.5">
        <span className="text-t4 text-gray-400">선발</span><b className="truncate text-t3 font-black text-white">{OSP.name}</b><Hand p={OSP} />
        <span className="ml-auto whitespace-nowrap font-display text-t3 text-gray-300">구 {st(OSP, 'stuff')} · 제 {st(OSP, 'control')}</span>
      </div>
      <MixBar p={OSP} legend={false} />
    </>
  )],
  7: ['구종 원', () => {
    const mix = pitchMix(OSP), rep = repertoireOf(OSP), R = 52, L = 2 * Math.PI * R;
    let acc = 0;
    return (
      <>
        <TeamLine s={32} />
        <Rule />
        <div className="flex items-center gap-4">
          <span className="relative grid shrink-0 place-items-center" style={{ width: 124, height: 124 }}>
            <svg width="124" height="124" className="absolute inset-0 -rotate-90">{rep.map((t, i) => { const f = mix[t] || 0, el = <circle key={t} cx="62" cy="62" r={R} fill="none" stroke={PITCH_C[i % 5]} strokeWidth="7" strokeDasharray={`${f * L - 3} ${L}`} strokeDashoffset={-acc * L} />; acc += f; return el; })}</svg>
            <Portrait player={OSP} w={78} h={78} round color={C} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-t4 text-gray-400">상대 선발</span>
            <b className="truncate text-t2 font-black text-white">{OSP.name}</b>
            <span className="flex items-center gap-2"><Hand p={OSP} /><span className="text-t4 text-gray-400">구위 <b className="text-white">{st(OSP, 'stuff')}</b> · 제구 <b className="text-white">{st(OSP, 'control')}</b></span></span>
            <span className="mt-1 flex flex-col text-t4 text-gray-400">{rep.map((t, i) => <span key={t}><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: PITCH_C[i % 5] }} />{PITCHES[t].name} {Math.round((mix[t] || 0) * 100)}%</span>)}</span>
          </span>
        </div>
      </>
    );
  }],
  8: ['강점 칩', () => {
    const chips = [['타선', OS.bat], ['불펜', OS.pen], ['주력', OS.spd]].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => [`${k} ${v}`]); // 상대에서 가장 센 둘
    return (
      <>
        <TeamLine />
        <span className="flex flex-wrap gap-1.5">{chips.map(([t]) => <span key={t} className="rounded-full px-2.5 py-0.5 text-t4 font-bold" style={{ color: C, background: `${C}1f`, boxShadow: `inset 0 0 0 1px ${C}55` }}>{t}</span>)}</span>
        <Rule />
        <div className="flex items-center gap-2.5">
          <Portrait player={OSP} w={40} h={52} color={C} />
          <span className="flex min-w-0 flex-1 flex-col"><span className="text-t4 text-gray-400">상대 선발</span><span className="flex items-center gap-2"><b className="truncate text-t2 font-black text-white">{OSP.name}</b><Hand p={OSP} /></span></span>
          <b className="font-display text-t2" style={{ color: C }}>{OSP.overall}</b>
        </div>
        <span className="text-t4 text-gray-400">구위 {st(OSP, 'stuff')} · 제구 {st(OSP, 'control')} · 체력 {st(OSP, 'stamina')}</span>
        <MixBar p={OSP} legend={false} />
      </>
    );
  }],
};

function Panel({ n }) {
  const [t, Body] = V[n];
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <b className="text-t3 text-white"><span className="mr-2 font-display" style={{ color: '#fbbf24' }}>{n}</span>{t}<span className="ml-2 text-t4 font-normal text-gray-500" data-h={n} /></b>
      <aside className="mt-cut mt-frame mt-glass flex flex-col gap-3.5 overflow-hidden p-5" style={{ ...cut(20), '--a': C, width: 340, height: 806 }}>
        <div className="flex shrink-0 flex-col gap-3.5" data-head={n}>{n !== 3 && <p className="mt-lab" style={{ '--a': C }}>오늘 상대</p>}<Body /></div>
        <div className="flex flex-1 items-center justify-center rounded-lg text-t4 text-gray-500" style={{ border: '1px dashed rgba(255,255,255,.15)' }} data-low={n}>페이지마다 바뀌는 구역</div>
      </aside>
    </div>
  );
}

function App() {
  React.useEffect(() => {
    document.querySelectorAll('[data-head]').forEach((el) => { const h = document.querySelector(`[data-h="${el.dataset.head}"]`); if (h) h.textContent = `머리 ${Math.round(el.getBoundingClientRect().height)}px`; const lo = document.querySelector(`[data-low="${el.dataset.head}"]`); if (lo) lo.textContent = `페이지마다 바뀌는 구역 · ${Math.round(lo.getBoundingClientRect().height)}px`; });
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
