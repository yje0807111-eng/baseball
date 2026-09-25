/* 감독 모드 스코어보드 — 팀 줄에 구단 깃발을 은은하게 깔고, 주자 판이 위로 붙지 않게 (A 8안 + 추천 B 8안) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { teamFlag } from '/src/myteam/teamArt.js';

const G = {
  away: { name: '2026 롯데 자이언츠', runs: 3 },
  home: { name: '나의 드림팀', runs: 2 },
  inning: 5, top: true, balls: 2, strikes: 1, outs: 1, bases: [true, false, true],
};
const clubName = (s = '') => s.replace(/^\d{4}\s*/, '');
const FLAG_MASK = 'linear-gradient(90deg,transparent 18%,#000 78%)';
const MY = { key: 'legend', color: '#10b981', src: 'ui/teams/flag-legend.webp' }; // 내 팀은 프로필 배너 자리
const flagOf = (name, mine) => (mine ? MY : teamFlag(name) || MY);
const MODES = ['보통', '자동', '스킵'];

const Diamond = ({ size = 96 }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
    <path d="M50 88 L86 52 L50 16 L14 52 Z" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
    {[[86, 52], [50, 16], [14, 52]].map(([x, y], i) => (
      <rect key={i} x={x - 8} y={y - 8} width="16" height="16" transform={`rotate(45 ${x} ${y})`}
        fill={G.bases[i] ? '#fde047' : 'rgba(255,255,255,.14)'} style={G.bases[i] ? { filter: 'drop-shadow(0 0 7px #fde047)' } : undefined} />
    ))}
    <rect x="45" y="83" width="10" height="10" transform="rotate(45 50 88)" fill="#fff" />
  </svg>
);
const Bso = ({ dot = 13, gap = 6 }) => (
  <div className="grid items-center font-display text-[13px] font-extrabold" style={{ gridTemplateColumns: `15px repeat(3, ${dot}px)`, gap }}>
    <span className="text-emerald-400">B</span>
    {[0, 1, 2].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.balls ? '#34d399' : 'rgba(255,255,255,.15)', boxShadow: i < G.balls ? '0 0 7px #34d399' : 'none' }} />)}
    <span className="text-yellow-300">S</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.strikes ? '#fde047' : 'rgba(255,255,255,.15)', boxShadow: i < G.strikes ? '0 0 7px #fde047' : 'none' }} />)}<span />
    <span className="text-red-400">O</span>
    {[0, 1].map((i) => <i key={i} className="rounded-full" style={{ width: dot, height: dot, background: i < G.outs ? '#ef4444' : 'rgba(255,255,255,.15)', boxShadow: i < G.outs ? '0 0 7px #ef4444' : 'none' }} />)}<span />
  </div>
);
const Chip = () => (
  <span className="mt-cut inline-block bg-[#fde047] px-2.5 py-0.5 font-display text-[13px] font-extrabold text-[#05080f]" style={{ '--c': '4px' }}>
    {G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i>
  </span>
);

/* 팀 한 줄 — 대진표 칸처럼 오른쪽에서 깃발이 은은하게 번진다 */
const Team = ({ t, mine, w = 210, h = 34, font = 14, big = 22, cut = '5px', opacity = 0.5, bar = true }) => {
  const f = flagOf(t.name, mine);
  return (
    <div className="ui-cut relative flex items-center gap-2.5 overflow-hidden px-2.5" style={{ '--c': cut, width: w, height: h, background: 'rgba(255,255,255,.045)', boxShadow: `inset 0 0 0 1px ${f.color}4d` }}>
      <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${f.src})`, opacity, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />
      {bar && <span className="relative block h-4 w-1 shrink-0" style={{ background: f.color }} />}
      <b className="relative min-w-0 flex-1 truncate font-extrabold text-white" style={{ fontSize: font, textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{clubName(t.name)}</b>
      <b className="relative font-display font-extrabold leading-none" style={{ fontSize: big, color: mine ? '#fde047' : '#fff', textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{t.runs}</b>
    </div>
  );
};
const Teams = (p) => (
  <div className="flex flex-col gap-1">
    <Team t={G.away} {...p} /><Team t={G.home} mine {...p} />
  </div>
);

const Head = () => (
  <header className="relative col-span-3 -mx-5 flex items-center gap-6 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
    <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#10b981] to-transparent" />
    <button type="button" className="mt-cut grid h-9 w-9 shrink-0 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]" style={{ '--c': '7px' }}>←</button>
    <div className="shrink-0 leading-none">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Manager Mode</p>
      <h1 className="mt-1 text-xl font-black leading-none text-white">감독 모드</h1>
    </div>
    <span className="mt-cut shrink-0 bg-red-500 px-2 py-0.5 font-display text-xs font-bold tracking-[0.2em] text-[#05080f]" style={{ '--c': '4px' }}>
      <i className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#05080f] align-middle" />LIVE
    </span>
    <div className="ml-auto flex items-center gap-6">
      <div className="mt-cut mt-glass flex gap-1 p-1" style={{ '--c': '8px' }}>
        {MODES.map((m, i) => <button key={m} type="button" className={`mt-cut px-3.5 py-1 font-display text-sm font-bold ${i === 0 ? 'bg-[#10b981] text-[#05080f]' : 'text-gray-400'}`} style={{ '--c': '5px' }}>{m}</button>)}
      </div>
      <button type="button" className="mt-btn sm">계속 ▶</button>
    </div>
  </header>
);
const Frame = ({ board }) => (
  <div className="relative overflow-hidden" style={{ width: 1880, height: 560, background: '#05080f' }}>
    <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/broadcast-field.webp)', opacity: 0.85 }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.9) 0,rgba(3,5,10,.2) 22%,rgba(3,5,10,.12) 78%,rgba(3,5,10,.9) 100%), linear-gradient(180deg,rgba(3,5,10,.86) 0,rgba(3,5,10,0) 24%)' }} />
    <div className="relative grid h-full gap-x-5 gap-y-3 px-5 pb-3.5" style={{ gridTemplateColumns: '272px 1fr 272px', gridTemplateRows: '63px auto 1fr' }}>
      <Head />
      <div className="col-start-1 row-start-2 self-start"><div className="inline-block">{board}</div></div>
    </div>
  </div>
);
/* 지금 판 그대로 — 유리판 + 노란 테두리 */
const Glass = ({ children, pad = 'p-3' }) => (
  <div className={`mt-cut mt-frame mt-glass ${pad}`} style={{ '--c': '12px', '--a': '#fde047' }}>{children}</div>
);

/* ───────── A. 깃발 배경 + 주자 판 자리 잡기 8안 ───────── */

/* A1. 주자 판을 줄이고 아래로 — 칩 줄과 겹치지 않는다 */
const A1 = () => (
  <Frame board={(
    <Glass>
      <Chip />
      <div className="mt-2 flex items-end gap-3.5">
        <Teams />
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <Diamond size={80} />
      </div>
    </Glass>
  )} />
);

/* A2. 카운트와 주자를 한 칸에 세로로 — 판이 낮아진다 */
const A2 = () => (
  <Frame board={(
    <Glass>
      <Chip />
      <div className="mt-2 flex items-center gap-3.5">
        <Teams />
        <span className="w-px self-stretch bg-white/12" />
        <div className="flex flex-col items-center gap-1.5"><Bso dot={11} gap={5} /><Diamond size={64} /></div>
      </div>
    </Glass>
  )} />
);

/* A3. 칩을 팀 줄 옆으로 — 위 여백이 사라진다 */
const A3 = () => (
  <Frame board={(
    <Glass>
      <div className="flex items-center gap-3.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2"><Chip /><b className="font-display text-[11px] tracking-[0.18em] text-gray-400">단판 · 1차전</b></div>
          <Teams w={196} />
        </div>
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <Diamond size={88} />
      </div>
    </Glass>
  )} />
);

/* A4. 주자 판을 가운데 높이에 맞춰 — 팀 줄과 같은 키 */
const A4 = () => (
  <Frame board={(
    <Glass>
      <Chip />
      <div className="mt-2 flex items-center gap-3.5">
        <Teams h={38} big={24} />
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <Diamond size={84} />
      </div>
    </Glass>
  )} />
);

/* A5. 깃발을 진하게, 팀 줄을 크게 */
const A5 = () => (
  <Frame board={(
    <Glass>
      <Chip />
      <div className="mt-2 flex items-center gap-3.5">
        <Teams h={42} font={15} big={26} opacity={0.72} />
        <span className="w-px self-stretch bg-white/12" />
        <div className="flex flex-col items-center gap-1.5"><Bso dot={11} gap={5} /><Diamond size={60} /></div>
      </div>
    </Glass>
  )} />
);

/* A6. 색 막대 없이 깃발만으로 — 줄이 깔끔해진다 */
const A6 = () => (
  <Frame board={(
    <Glass>
      <Chip />
      <div className="mt-2 flex items-end gap-3.5">
        <Teams bar={false} h={36} />
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <Diamond size={76} />
      </div>
    </Glass>
  )} />
);

/* A7. 주자 판을 오른쪽 아래로 내리고 카운트는 위로 */
const A7 = () => (
  <Frame board={(
    <Glass>
      <div className="flex items-start gap-3.5">
        <div><Chip /><div className="mt-2"><Teams w={196} /></div></div>
        <span className="w-px self-stretch bg-white/12" />
        <div className="flex flex-col items-center gap-2 pt-0.5"><Bso /><Diamond size={64} /></div>
      </div>
    </Glass>
  )} />
);

/* A8. 위 띠에 회와 경기 정보 — 아래는 팀 · 카운트 · 주자 */
const A8 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass overflow-hidden" style={{ '--c': '12px', '--a': '#fde047' }}>
      <p className="m-0 flex items-center gap-2 whitespace-nowrap bg-[#fde047] px-3 py-1 font-display text-[12px] font-extrabold text-[#05080f]">
        {G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i><span className="opacity-70">· 단판 1차전</span>
      </p>
      <div className="flex items-center gap-3.5 p-3">
        <Teams />
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <Diamond size={82} />
      </div>
    </div>
  )} />
);

/* ───────── B. 추천 8안 — 중계판처럼 다듬은 것들 ───────── */

/* B1. 깃발 줄 + 점수를 오른쪽 칸에 따로 (숫자가 또렷하다) */
const B1 = () => (
  <Frame board={(
    <Glass>
      <Chip />
      <div className="mt-2 flex items-center gap-3.5">
        <div className="flex flex-col gap-1">
          {[[G.away, false], [G.home, true]].map(([t, mine]) => {
            const f = flagOf(t.name, mine);
            return (
              <div key={t.name} className="flex items-stretch gap-1">
                <div className="ui-cut relative flex items-center gap-2 overflow-hidden px-2.5" style={{ '--c': '5px', width: 168, height: 36, background: 'rgba(255,255,255,.045)', boxShadow: `inset 0 0 0 1px ${f.color}4d` }}>
                  <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${f.src})`, opacity: 0.55, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />
                  <b className="relative truncate text-[14px] font-extrabold text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{clubName(t.name)}</b>
                </div>
                <span className="ui-cut grid w-11 place-items-center font-display text-[22px] font-extrabold" style={{ '--c': '5px', background: mine ? 'rgba(253,224,71,.16)' : 'rgba(255,255,255,.07)', color: mine ? '#fde047' : '#fff' }}>{t.runs}</span>
              </div>
            );
          })}
        </div>
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <Diamond size={82} />
      </div>
    </Glass>
  )} />
);

/* B2. 이긴 쪽에 불이 들어온다 — 앞선 팀 줄만 밝게 */
const B2 = () => {
  const lead = G.away.runs >= G.home.runs ? 0 : 1;
  return (
    <Frame board={(
      <Glass>
        <Chip />
        <div className="mt-2 flex items-center gap-3.5">
          <div className="flex flex-col gap-1">
            {[[G.away, false], [G.home, true]].map(([t, mine], i) => {
              const f = flagOf(t.name, mine);
              const on = i === lead;
              return (
                <div key={t.name} className="ui-cut relative flex items-center gap-2.5 overflow-hidden px-2.5" style={{ '--c': '5px', width: 214, height: 38, background: on ? `${f.color}26` : 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${f.color}${on ? '88' : '33'}`, opacity: on ? 1 : 0.72 }}>
                  <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${f.src})`, opacity: on ? 0.6 : 0.34, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />
                  <b className="relative min-w-0 flex-1 truncate text-[14px] font-extrabold text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{clubName(t.name)}</b>
                  <b className="relative font-display text-[23px] font-extrabold leading-none" style={{ color: on ? '#fde047' : '#e5e7eb' }}>{t.runs}</b>
                </div>
              );
            })}
          </div>
          <span className="w-px self-stretch bg-white/12" />
          <Bso />
          <Diamond size={82} />
        </div>
      </Glass>
    )} />
  );
};

/* B3. 깃발이 줄 전체에 — 마스크 없이 옅게 깔고 글만 띄운다 */
const B3 = () => (
  <Frame board={(
    <Glass>
      <Chip />
      <div className="mt-2 flex items-center gap-3.5">
        <div className="flex flex-col gap-1">
          {[[G.away, false], [G.home, true]].map(([t, mine]) => {
            const f = flagOf(t.name, mine);
            return (
              <div key={t.name} className="ui-cut relative flex items-center gap-2.5 overflow-hidden px-2.5" style={{ '--c': '5px', width: 214, height: 38, boxShadow: `inset 0 0 0 1px ${f.color}4d` }}>
                <i className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${f.src})`, opacity: 0.34 }} />
                <i className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(5,8,15,.86),rgba(5,8,15,.4))' }} />
                <b className="relative min-w-0 flex-1 truncate text-[14px] font-extrabold text-white">{clubName(t.name)}</b>
                <b className="relative font-display text-[23px] font-extrabold leading-none" style={{ color: mine ? '#fde047' : '#fff' }}>{t.runs}</b>
              </div>
            );
          })}
        </div>
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <Diamond size={82} />
      </div>
    </Glass>
  )} />
);

/* B4. 회 칩을 왼쪽 기둥으로 — 위 여백이 없다 */
const B4 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass flex items-stretch overflow-hidden" style={{ '--c': '12px', '--a': '#fde047' }}>
      <span className="grid w-11 shrink-0 place-items-center bg-[#fde047]/15">
        <b className="font-display text-[19px] font-extrabold text-yellow-300">{G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i></b>
      </span>
      <div className="flex items-center gap-3.5 p-3">
        <Teams />
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <Diamond size={82} />
      </div>
    </div>
  )} />
);

/* B5. 카운트를 팀 줄 아래 가로로 — 주자 판이 오른쪽에서 가운데 높이 */
const B5 = () => (
  <Frame board={(
    <Glass>
      <div className="flex items-center gap-3.5">
        <div>
          <div className="flex items-center gap-2"><Chip /><b className="font-display text-[11px] tracking-[0.18em] text-gray-400">단판 · 1차전</b></div>
          <div className="mt-2"><Teams w={196} /></div>
          <div className="mt-2 flex items-center gap-3 border-t border-white/10 pt-2">
            {[['B', G.balls, 3, '#34d399'], ['S', G.strikes, 2, '#fde047'], ['O', G.outs, 2, '#ef4444']].map(([k, v, n, c]) => (
              <span key={k} className="flex items-center gap-1.5 font-display text-[12px] font-extrabold" style={{ color: c }}>
                {k}{Array.from({ length: n }, (_, i) => <i key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: i < v ? c : 'rgba(255,255,255,.15)' }} />)}
              </span>
            ))}
          </div>
        </div>
        <span className="w-px self-stretch bg-white/12" />
        <Diamond size={104} />
      </div>
    </Glass>
  )} />
);

/* B6. 점수를 크게 — 이름 줄은 얇게, 숫자가 주인공 */
const B6 = () => (
  <Frame board={(
    <Glass>
      <Chip />
      <div className="mt-2 flex items-center gap-3.5">
        <Teams h={30} font={12.5} big={28} />
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <Diamond size={76} />
      </div>
    </Glass>
  )} />
);

/* B7. 주자 판 아래에 회 — 오른쪽 칸이 한 덩어리 */
const B7 = () => (
  <Frame board={(
    <Glass>
      <div className="flex items-center gap-3.5">
        <Teams />
        <span className="w-px self-stretch bg-white/12" />
        <Bso />
        <div className="flex flex-col items-center gap-1"><Diamond size={78} /><Chip /></div>
      </div>
    </Glass>
  )} />
);

/* B8. 위 띠에 회, 아래 띠에 카운트 — 가운데는 팀과 주자 */
const B8 = () => (
  <Frame board={(
    <div className="mt-cut mt-frame mt-glass overflow-hidden" style={{ '--c': '12px', '--a': '#fde047' }}>
      <p className="m-0 flex items-center gap-2 whitespace-nowrap bg-[#fde047] px-3 py-1 font-display text-[12px] font-extrabold text-[#05080f]">
        {G.inning}<i className="not-italic">{G.top ? '▲' : '▼'}</i><span className="opacity-70">· 단판 1차전</span>
      </p>
      <div className="flex items-center gap-3.5 px-3 pt-3">
        <Teams />
        <Diamond size={86} />
      </div>
      <div className="mt-2 flex items-center gap-3 border-t border-white/10 px-3 py-2">
        {[['B', G.balls, 3, '#34d399'], ['S', G.strikes, 2, '#fde047'], ['O', G.outs, 2, '#ef4444']].map(([k, v, n, c]) => (
          <span key={k} className="flex items-center gap-1.5 font-display text-[12px] font-extrabold" style={{ color: c }}>
            {k}{Array.from({ length: n }, (_, i) => <i key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: i < v ? c : 'rgba(255,255,255,.15)' }} />)}
          </span>
        ))}
      </div>
    </div>
  )} />
);

const V = [['a1', '주자 줄여 아래로', A1], ['a2', '카운트 · 주자 세로', A2], ['a3', '칩을 옆으로', A3], ['a4', '가운데 높이 맞춤', A4],
  ['a5', '깃발 진하게', A5], ['a6', '색 막대 없이', A6], ['a7', '오른쪽 아래로', A7], ['a8', '위 띠에 회', A8],
  ['b1', '점수 칸 분리 ★', B1], ['b2', '앞선 팀에 불 ★', B2], ['b3', '깃발 가득 ★', B3], ['b4', '회 기둥 ★', B4],
  ['b5', '카운트 아래 가로 ★', B5], ['b6', '숫자 크게 ★', B6], ['b7', '주자 아래 회 ★', B7], ['b8', '위아래 띠 ★', B8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v') || 'a1';
  const pick = V.find(([id]) => id === one) || V[0];
  const Cur = pick[2];
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-gray-400">
        <b className="mr-1 text-[15px] text-white">스코어보드 16안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? '#10b981' : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      <Cur />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
