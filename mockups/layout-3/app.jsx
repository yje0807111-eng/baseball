/* 경기 화면 배치 3안 — 구장을 화면 전체에 깔지 않고 칸 하나에 넣는다.
   나머지 칸(좌·우·아래)에 지금 떠 있던 판들을 옮겨 앉힌다. 1920×911. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';
import { teamFlag } from '/src/myteam/teamArt.js';
import PlayView from '/src/play/PlayView.jsx';
import { FIELD_BGS } from '/src/play/backgrounds.js';

/* ── 데이터 — 진짜 시리즈 둘을 꺼내 쓴다 ─────────────────────────── */
const pick = (id) => SERIES.find((s) => s.id === id) || SERIES[0];
const OFF = pick('2010-lotte');
const DEF = pick('2020-nc');
const bats = (s) => s.players.filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall);
const arms = (s) => s.players.filter((p) => p.type === 'pitcher').sort((a, b) => b.overall - a.overall);
const LINEUP = bats(OFF).slice(0, 9);
const PEN = arms(OFF).filter((p) => p.position === 'RP').slice(0, 3);
const DEF9 = (() => {
  const men = bats(DEF);
  const of = men.filter((p) => p.position === 'OF');
  const one = (k) => men.find((p) => p.position === k) || men[0];
  return {
    P: arms(DEF)[0], C: one('C'), '1B': one('1B'), '2B': one('2B'), '3B': one('3B'), SS: one('SS'),
    LF: of[0], CF: of[1], RF: of[2],
  };
})();
const OFF_C = teamFlag(OFF.title)?.color || '#f87171';
const DEF_C = teamFlag(DEF.title)?.color || '#34d399';
const face = (p) => (p ? `url(profiles/${encodeURIComponent(p.id)}.webp), url(cards/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)` : 'url(ui/mt/silhouette-player.webp)');

/* ── 공통 조각 ────────────────────────────────────────────────── */
const Panel = ({ title, right, children, className = '', style }) => (
  <section className={`mt-cut mt-frame mt-glass flex min-h-0 flex-col ${className}`} style={{ '--c': '14px', '--a': '#10b981', ...style }}>
    {title && (
      <header className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2">
        <b className="font-display text-[12px] font-extrabold tracking-[0.18em] text-emerald-300">{title}</b>
        {right && <span className="ml-auto font-display text-[11px] tracking-[0.14em] text-gray-500">{right}</span>}
      </header>
    )}
    <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
  </section>
);

const Bar = ({ v, tone = '#10b981' }) => (
  <i className="block h-1 w-full bg-white/10"><i className="block h-full" style={{ width: `${v}%`, background: tone }} /></i>
);

/* 지금 타자 */
const BatterCard = () => {
  const p = LINEUP[0];
  return (
    <div className="flex gap-3 p-3.5">
      <span className="mt-cut h-[74px] w-[58px] shrink-0 bg-[#0b1220] bg-cover" style={{ '--c': '7px', backgroundImage: face(p), backgroundPosition: '50% 12%' }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <b className="truncate text-[19px] font-extrabold text-white">{p.name}</b>
          <em className="ml-auto font-display text-[20px] font-extrabold not-italic" style={{ color: OFF_C }}>{p.overall}</em>
        </div>
        <p className="mt-0.5 font-display text-[11px] tracking-[0.16em] text-gray-500">{p.position} · {p.hand}</p>
        <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1">
          {[['타율', '.293'], ['홈런', '9'], ['타점', '55']].map(([k, v]) => (
            <div key={k}>
              <dt className="font-display text-[10px] tracking-[0.12em] text-gray-500">{k}</dt>
              <dd className="font-display text-[15px] font-bold text-gray-100">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

/* 타순 아홉 줄 */
const Order = ({ dense }) => (
  <ol className="px-1.5 pb-1.5">
    {LINEUP.map((p, i) => (
      <li key={p.id} className={`flex items-center gap-2 px-2 ${dense ? 'py-[5px]' : 'py-1.5'} ${i === 0 ? 'mt-cut bg-white/[0.08]' : ''}`} style={{ '--c': '5px' }}>
        <em className="w-3.5 text-right font-display text-[12px] font-bold not-italic text-gray-500">{i + 1}</em>
        <b className="truncate text-[13px] font-semibold text-gray-100">{p.name}</b>
        {i === 0 && <span className="mt-cut bg-white/15 px-1.5 font-display text-[10px] font-bold text-white" style={{ '--c': '3px' }}>타석</span>}
        <span className="ml-auto font-display text-[11px] text-gray-500">{p.position}</span>
        <em className="w-9 text-right font-display text-[12px] font-bold not-italic text-gray-300">.{240 + i * 7}</em>
      </li>
    ))}
  </ol>
);

/* 불펜 */
const Pen = () => (
  <ul className="space-y-1.5 px-3.5 py-2.5">
    {PEN.map((p) => (
      <li key={p.id} className="flex items-center gap-2">
        <b className="w-16 truncate text-[13px] font-semibold text-gray-100">{p.name}</b>
        <span className="font-display text-[11px] text-gray-500">RP</span>
        <div className="ml-auto w-20"><Bar v={p.overall} /></div>
        <em className="w-7 text-right font-display text-[12px] font-bold not-italic text-emerald-300">{p.overall}</em>
      </li>
    ))}
  </ul>
);

/* 작전 버튼 한 줄 */
const ACTS = [['도루', '주자 없음'], ['번트', '내 공격 아님'], ['작전 지시', '5가지'], ['선수 교체', '벤치 4'], ['투수 교체', '불펜에서 고르기']];
const Acts = ({ wide }) => (
  <div className={`flex ${wide ? 'gap-3' : 'gap-2.5'} h-full`}>
    {ACTS.map(([n, s], i) => {
      const on = i === ACTS.length - 1;
      return (
        <button key={n} type="button"
          className={`mt-cut mt-frame flex flex-1 flex-col items-center justify-center gap-0.5 ${on ? 'bg-[#10b981] text-[#05080f]' : 'mt-glass text-gray-300'}`}
          style={{ '--c': '12px', '--a': on ? '#0b8f68' : '#10b981' }}>
          <b className="text-[15px] font-extrabold">{n}</b>
          <span className={`font-display text-[11px] ${on ? 'text-[#05080f]/70' : 'text-gray-500'}`}>{s}</span>
        </button>
      );
    })}
  </div>
);

/* 실시간 코멘트 */
const LINES = ['4회 말 · 장두성 선수 타석에 들어섭니다.', '3회 초 · 삼진 아웃! 2아웃입니다.', '2회 말 · 유격수 땅볼! 1아웃입니다.'];
const Talk = ({ rows = 3 }) => (
  <ul className="space-y-1 px-3.5 py-2">
    {LINES.slice(0, rows).map((l, i) => (
      <li key={l} className={`truncate ${i ? 'text-[13px] text-gray-500' : 'text-[15px] font-bold text-white'}`}>{l}</li>
    ))}
  </ul>
);

/* 오른쪽 전략 */
const Strat = () => (
  <dl className="space-y-2 px-3.5 py-2.5">
    {[['전체 전략', '공격적'], ['주루 전략', '적극적'], ['수비 시프트', '기본 수비'], ['불펜 운영', '승리조 우선']].map(([k, v]) => (
      <div key={k} className="flex items-center gap-2">
        <dt className="text-[13px] text-gray-400">{k}</dt>
        <dd className="mt-cut ml-auto bg-white/[0.07] px-2.5 py-1 font-display text-[12px] font-bold text-gray-100" style={{ '--c': '5px' }}>{v}</dd>
      </div>
    ))}
  </dl>
);

const Mine = () => (
  <div className="space-y-2 px-3.5 py-2.5">
    {[['선수 컨디션', 77, '#10b981'], ['팀 사기', 88, '#fde047'], ['체력', 95, '#38bdf8']].map(([k, v, c]) => (
      <div key={k}>
        <div className="flex items-baseline"><span className="text-[12px] text-gray-400">{k}</span>
          <em className="ml-auto font-display text-[12px] font-bold not-italic text-gray-200">{v} / 100</em></div>
        <div className="mt-1"><Bar v={v} tone={c} /></div>
      </div>
    ))}
  </div>
);

/* 머리칸 — 가운데 점수 */
const Head = () => (
  <header className="mt-frame flex items-center gap-5 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6" style={{ '--a': '#10b981' }}>
    <button type="button" className="mt-cut grid h-9 w-9 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]" style={{ '--c': '7px' }}>←</button>
    <div className="leading-none">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Manager Mode</p>
      <h1 className="mt-1 text-xl font-black leading-none text-white">감독 모드</h1>
    </div>
    <span className="mt-cut bg-red-500 px-2 py-0.5 font-display text-xs font-bold tracking-[0.2em] text-[#05080f]" style={{ '--c': '4px' }}>● LIVE</span>

    <div className="absolute left-1/2 top-2 -translate-x-1/2">
      <div className="mt-cut mt-glass flex items-center gap-5 px-6 py-1.5" style={{ '--c': '12px' }}>
        <b className="text-[20px] font-extrabold text-white" style={{ color: OFF_C }}>{OFF.title}</b>
        <em className="font-display text-[26px] font-black not-italic text-white">0 <span className="text-gray-600">–</span> 0</em>
        <b className="text-[20px] font-extrabold" style={{ color: DEF_C }}>드림팀</b>
      </div>
      <p className="mt-1 text-center font-display text-[11px] tracking-[0.2em] text-gray-500">4회 말 · 1사 · 2볼 1스트라이크</p>
    </div>

    <div className="mt-cut mt-glass ml-auto flex gap-1 p-1" style={{ '--c': '8px' }}>
      {['보통', '자동', '스킵'].map((n, i) => (
        <span key={n} className={`mt-cut px-3.5 py-1 font-display text-sm font-bold ${i === 0 ? 'bg-[#10b981] text-[#05080f]' : 'text-gray-400'}`} style={{ '--c': '5px' }}>{n}</span>
      ))}
    </div>
    <button type="button" className="mt-btn sm">일시정지</button>
  </header>
);

/* 구장 칸 */
/* 칸 안에서는 구장을 가운데 그대로 — 화면 전체일 때 쓰는 위아래 보정은 뺀다 */
const BG = { ...FIELD_BGS[0], stage: { dy: 0, zoom: 0.98 } };
const Ground = ({ children }) => (
  <div className="mt-cut relative min-h-0 overflow-hidden bg-[#060c16]" style={{ '--c': '16px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>
    <PlayView event={null} bases={[LINEUP[4], null, LINEUP[6]]} defense={DEF9} batter={LINEUP[0]} offColor={OFF_C} defColor={DEF_C} bg={BG} />
    {children}
  </div>
);

/* ── 1안 — 좌 정보 · 가운데 구장 · 우 전략, 아래는 가운데 칸 안 ──── */
const One = () => (
  <div className="grid h-full" style={{ gridTemplateRows: '72px 1fr' }}>
    <Head />
    <div className="grid min-h-0 gap-3 p-3" style={{ gridTemplateColumns: '300px 1fr 320px' }}>
      <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto 1fr auto' }}>
        <Panel title="타자 정보"><BatterCard /></Panel>
        <Panel title="타순" right={OFF.title}><Order /></Panel>
        <Panel title="불펜"><Pen /></Panel>
      </div>
      <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: '1fr 84px 76px' }}>
        <Ground />
        <Acts wide />
        <Panel title="실시간 경기 코멘트"><Talk rows={2} /></Panel>
      </div>
      <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto auto 1fr' }}>
        <Panel title="팀 전략"><Strat /></Panel>
        <Panel title="나의 팀"><Mine /></Panel>
        <Panel title="상대 불펜"><Pen /></Panel>
      </div>
    </div>
  </div>
);

/* ── 2안 — 구장을 최대한 크게, 작전은 구장 아래 띠 하나 ──────────── */
const Two = () => (
  <div className="grid h-full" style={{ gridTemplateRows: '72px 1fr' }}>
    <Head />
    <div className="grid min-h-0 gap-2.5 p-2.5" style={{ gridTemplateColumns: '252px 1fr 252px' }}>
      <div className="grid min-h-0 gap-2.5" style={{ gridTemplateRows: 'auto 1fr' }}>
        <Panel title="타자 정보"><BatterCard /></Panel>
        <Panel title="타순" right={OFF.title}><Order dense /></Panel>
      </div>
      <div className="grid min-h-0 gap-2.5" style={{ gridTemplateRows: '1fr 78px' }}>
        <Ground>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3">
            <div className="mt-cut mt-glass px-3.5 py-2" style={{ '--c': '10px' }}><Talk rows={2} /></div>
          </div>
        </Ground>
        <Acts />
      </div>
      <div className="grid min-h-0 gap-2.5" style={{ gridTemplateRows: 'auto auto 1fr' }}>
        <Panel title="팀 전략"><Strat /></Panel>
        <Panel title="나의 팀"><Mine /></Panel>
        <Panel title="불펜"><Pen /></Panel>
      </div>
    </div>
  </div>
);

/* ── 3안 — 아래 칸을 화면 전체 폭으로 ──────────────────────────── */
const Three = () => (
  <div className="grid h-full" style={{ gridTemplateRows: '72px 1fr 156px' }}>
    <Head />
    <div className="grid min-h-0 gap-3 px-3 pt-3" style={{ gridTemplateColumns: '288px 1fr 288px' }}>
      <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto 1fr' }}>
        <Panel title="타자 정보"><BatterCard /></Panel>
        <Panel title="타순" right={OFF.title}><Order /></Panel>
      </div>
      <Ground />
      <div className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'auto auto 1fr' }}>
        <Panel title="팀 전략"><Strat /></Panel>
        <Panel title="나의 팀"><Mine /></Panel>
        <Panel title="불펜"><Pen /></Panel>
      </div>
    </div>
    <div className="grid gap-3 p-3" style={{ gridTemplateColumns: '1fr 520px' }}>
      <Acts wide />
      <Panel title="실시간 경기 코멘트"><Talk /></Panel>
    </div>
  </div>
);

const PLANS = [['1안 · 세 칸 · 아래는 가운데', One], ['2안 · 구장 크게 · 코멘트는 구장 위', Two], ['3안 · 아래 칸 전체 폭', Three]];

const Z = Math.min(1, (window.innerWidth - 40) / 1920);

function App() {
  const [i, setI] = useState(0);
  const Now = PLANS[i][1];
  return (
    <div className="min-h-dvh bg-[#06080c] p-4 text-gray-200">
      <UiStyle />
      <style>{KEYFRAMES}</style>
      <div className="mb-3 flex items-center gap-2">
        {PLANS.map(([n], k) => (
          <button key={n} type="button" onClick={() => setI(k)}
            className={`mt-cut px-3 py-1.5 font-display text-[13px] font-bold ${k === i ? 'bg-emerald-400 text-[#05080f]' : 'bg-white/[0.07] text-gray-300'}`} style={{ '--c': '6px' }}>{n}</button>
        ))}
      </div>
      {/* 1920×911 을 창에 맞춰 줄여 본다 */}
      <div style={{ width: 1920 * Z, height: 911 * Z }}>
        <div className="relative select-none overflow-hidden bg-[#05080f] text-gray-200" style={{ width: 1920, height: 911, transform: `scale(${Z})`, transformOrigin: "top left" }}>
          <Now />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
