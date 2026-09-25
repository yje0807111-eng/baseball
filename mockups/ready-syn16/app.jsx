/* 시너지 4종(드래프트 육각 아이콘 그대로) × 정비(TUNE UP) 판 4종 = 16안
   ?v=S1T1 처럼 부르면 실제 화면 안에서 본다 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Screen, partsOf, OPP, OPP_CLUB, A, cut } from '../ready-squad/screen.jsx';

const O = partsOf(OPP.roster);
/* 드래프트 시너지 도크와 같은 아이콘(public/ui/synergy/*.png)과 단계 색 */
const TIER = {
  1: { fr: 'linear-gradient(160deg,#d69a62,#8a5428)', bd: '#e7b184', gc: '#1a0f07' },
  2: { fr: 'linear-gradient(160deg,#eef2f6,#8d99a6)', bd: '#f8fafc', gc: '#0f172a' },
  3: { fr: 'linear-gradient(160deg,#fde68a,#c08a0e)', bd: '#fef3c7', gc: '#1c1402' },
  4: { fr: 'linear-gradient(135deg,#f0abfc,#7dd3fc 45%,#6ee7b7 70%,#fde68a)', bd: '#fff', gc: '#0b0f1a' },
  0: { fr: 'linear-gradient(160deg,#2b3445,#161c27)', bd: '#3a4556', gc: '#6b7280' },
};
const SYN = [
  { id: 'beijing', n: '베이징 9전 전승', e: '능력치 +1', c: '베이징 금메달 멤버', m: 3, need: 3, tier: 3, on: true },
  { id: 'lg23', n: 'LG 29년의 한', e: '컨택 +3', c: '오지환 · 김현수 · 박해민', m: 2, need: 2, tier: 2, on: true },
  { id: 'mercenary', n: '용병 트리오', e: '능력치 +3', c: '외국인 선수', m: 3, need: 3, tier: 4, on: true },
  { id: 'franchise', n: '프랜차이즈의 기억', e: '능력치 +1', c: '최다 구단 3명', m: 6, need: 6, tier: 1, on: true },
  { id: 'cleanup', n: '클린업 트리오', e: '파워 +2', c: '3 · 4 · 5번 장타 80+', m: 2, need: 3, tier: 0, on: false },
];
const ON = SYN.filter((s) => s.on);
const TOT = [['타자', 779, +6, A.bat, 9 * 99], ['수비', 697, +2, A.def, 8 * 99], ['투수', 474, 0, A.pit, 5 * 99]];
const grp = (en, ko, c) => (
  <div className="flex shrink-0 items-center gap-2 pb-1">
    <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: c }}>{en}</span>
    <b className="text-[12px] text-gray-300">{ko}</b>
    <span className="h-px flex-1 bg-white/10" />
  </div>
);

/* 육각 아이콘 — 드래프트 도크의 .sy-ico 와 같은 모양 */
const HEX = 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)';
const Ico = ({ s, w = 34 }) => {
  const t = TIER[s.tier] || TIER[0];
  const h = Math.round(w * 0.87);
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: w, height: h, background: t.bd, clipPath: HEX }}>
      <span className="absolute" style={{ inset: '2px 2.3px', background: t.fr, clipPath: HEX }} />
      <i className="relative block" style={{ width: '58%', height: '66%', background: t.gc, WebkitMaskImage: `url(ui/synergy/${s.id}.png)`, maskImage: `url(ui/synergy/${s.id}.png)`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
    </span>
  );
};

/* ═══ 시너지 4종 ═══ */
/* S1. 아이콘 줄 목록 */
const S1 = () => (
  <>
    {grp('SYNERGY', `시너지 ${ON.length}/13`, A.syn)}
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
      {ON.map((s) => {
        const t = TIER[s.tier];
        return (
          <div key={s.id} className="mt-cut flex flex-1 items-center gap-2 px-1.5" style={{ ...cut(6), background: `linear-gradient(90deg,color-mix(in srgb,${t.bd} 13%,transparent),rgba(255,255,255,.02))`, boxShadow: `inset 0 0 0 1px color-mix(in srgb,${t.bd} 40%,transparent)` }}>
            <Ico s={s} w={30} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[12.5px] text-white">{s.n}</b>
              <span className="block truncate font-display text-[11px] font-bold" style={{ color: t.bd }}>{s.e}</span>
            </span>
            <b className="font-display text-[12px] text-gray-400">{s.m}<small className="text-gray-600">/{s.need}</small></b>
          </div>
        );
      })}
    </div>
  </>
);
/* S2. 아이콘 도크 — 드래프트 도크처럼 한 줄, 아래 이름 */
const S2 = () => (
  <>
    {grp('SYNERGY', `시너지 ${ON.length}/13`, A.syn)}
    <div className="flex shrink-0 gap-1.5">
      {SYN.map((s) => (
        <span key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-0.5" style={{ opacity: s.on ? 1 : 0.5 }}>
          <Ico s={s} w={38} />
          <b className="w-full truncate text-center text-[10.5px] text-white">{s.n}</b>
          <span className="font-display text-[10px]" style={{ color: TIER[s.tier].bd }}>{s.m}/{s.need}</span>
        </span>
      ))}
    </div>
    <div className="mt-1.5 grid grid-cols-3 gap-1">
      {[['능력치', '+5', A.bat], ['컨택', '+3', '#fbbf24'], ['파워', '+0', '#6b7280']].map(([k, v, c]) => (
        <div key={k} className="mt-cut flex items-baseline justify-between px-2 py-1" style={{ ...cut(5), background: 'rgba(255,255,255,.04)' }}>
          <span className="text-[11px] text-gray-400">{k}</span><b className="font-display text-[14px]" style={{ color: c }}>{v}</b>
        </div>
      ))}
    </div>
  </>
);
/* S3. 두 열 아이콘 칩 */
const S3 = () => (
  <>
    {grp('SYNERGY', `시너지 ${ON.length}/13`, A.syn)}
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-1 overflow-hidden">
      {ON.map((s) => {
        const t = TIER[s.tier];
        return (
          <div key={s.id} className="mt-cut flex min-w-0 items-center gap-1.5 px-1.5" style={{ ...cut(6), background: `color-mix(in srgb,${t.bd} 12%,transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb,${t.bd} 38%,transparent)` }}>
            <Ico s={s} w={26} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[11.5px] text-white">{s.n}</b>
              <span className="block truncate font-display text-[10.5px] font-bold" style={{ color: t.bd }}>{s.e}</span>
            </span>
            <b className="font-display text-[11px] text-gray-400">{s.m}</b>
          </div>
        );
      })}
    </div>
  </>
);
/* S4. 큰 아이콘 타일 — 잠긴 것까지 */
const S4 = () => (
  <>
    {grp('SYNERGY', `시너지 ${ON.length}/13`, A.syn)}
    <div className="grid min-h-0 flex-1 grid-cols-5 gap-1 overflow-hidden">
      {SYN.map((s) => {
        const t = TIER[s.tier];
        return (
          <div key={s.id} className="mt-cut flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-1.5"
            style={{ ...cut(6), opacity: s.on ? 1 : 0.55, background: s.on ? `color-mix(in srgb,${t.bd} 12%,transparent)` : 'rgba(255,255,255,.03)' }}>
            <Ico s={s} w={34} />
            <b className="w-full truncate text-center text-[10px] text-white">{s.n}</b>
            <span className="font-display text-[10px] font-bold" style={{ color: s.on ? t.bd : '#64748b' }}>{s.on ? s.e : `${s.m}/${s.need}`}</span>
          </div>
        );
      })}
    </div>
  </>
);

/* ═══ 정비(TUNE UP) 4종 — 들어갈 만한 정보를 더 얹었다 ═══ */
const btn = (t, pri) => (
  <button type="button" className={`ui-btn mt-cut ${pri ? 'pri' : ''}`} style={{ ...cut(pri ? 12 : 10), minHeight: pri ? '3.2rem' : '2.3rem', fontSize: pri ? 16 : 13, '--a': A.main }}>{t}</button>
);
const btns = () => <div className="mt-auto flex flex-col gap-2">{btn('자동 라인업')}{btn('처음 배치로')}{btn('다시 드래프트')}{btn('시즌 시작 ▶', true)}</div>;
const aside = (children) => (
  <aside className="mt-cut mt-frame mt-glass flex min-h-0 flex-col gap-2.5 p-5" style={{ ...cut(20), '--a': A.main }}>{children}</aside>
);
const delta = (d) => <em className={`font-display text-[12px] not-italic ${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-rose-400' : 'text-gray-500'}`}>{d > 0 ? '+' : ''}{d}</em>;
const kv = (rows) => (
  <div className="mt-cut px-3 py-1.5" style={{ ...cut(10), background: 'rgba(255,255,255,.04)' }}>
    {rows.map(([k, v, c]) => (
      <div key={k} className="flex items-baseline justify-between border-b border-white/[0.07] py-1.5 text-[12.5px] text-gray-400 last:border-0">
        <span>{k}</span><b className="font-display text-[15px]" style={{ color: c || '#fff' }}>{v}</b>
      </div>
    ))}
  </div>
);
const REST = [['1선발', 0, '#34d399'], ['2선발', 2, '#fbbf24'], ['마무리', 1, '#a3e635']];

/* T1. 합계 막대 + 팀 요약 */
const T1 = () => aside(<>
  <p className="mt-lab">Tune Up</p>
  <h2 className="-mt-1 text-[26px] font-black text-white">정비</h2>
  {TOT.map(([t, v, d, a, max]) => (
    <div key={t} className="mt-cut relative px-3 pb-3 pt-2" style={{ ...cut(10), background: 'rgba(255,255,255,.04)' }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] text-gray-400">{t} OVR 합계</span>
        <span className="flex items-baseline gap-1.5"><b className="font-display text-[24px] leading-none" style={{ color: a }}>{v}</b>{delta(d)}</span>
      </div>
      <i className="absolute bottom-0 left-0 h-[3px]" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: a }} />
    </div>
  ))}
  {kv([['팀 종합', '84'], ['엔트리', '20 / 20명'], ['외국인', '3 / 3'], ['퓨처스 유망주', '4명', '#fcd34d']])}
  {btns()}
</>);

/* T2. 큰 숫자 + 팀 요약 + 투수 휴식 */
const T2 = () => aside(<>
  <p className="mt-lab">Tune Up</p>
  <h2 className="-mt-1 text-[26px] font-black text-white">정비</h2>
  <div className="grid grid-cols-3 gap-1.5">
    {TOT.map(([t, v, d, a]) => (
      <div key={t} className="mt-cut flex flex-col items-center gap-0.5 py-3" style={{ ...cut(8), background: `linear-gradient(180deg,color-mix(in srgb,${a} 14%,transparent),rgba(6,10,19,.4))` }}>
        <span className="font-display text-[10px] tracking-[0.18em] text-gray-400">{t}</span>
        <b className="font-display text-[26px] font-extrabold leading-none" style={{ color: a }}>{v}</b>
        {delta(d)}
      </div>
    ))}
  </div>
  {kv([['팀 종합', '84'], ['엔트리', '20 / 20명'], ['외국인', '3 / 3'], ['퓨처스 유망주', '4명', '#fcd34d']])}
  <div>
    <p className="mt-lab pb-1" style={{ '--a': A.pit, fontSize: 10 }}>Rest</p>
    <div className="flex gap-1.5">
      {REST.map(([k, r, c]) => (
        <div key={k} className="mt-cut flex flex-1 flex-col items-center py-1.5" style={{ ...cut(6), background: 'rgba(255,255,255,.04)' }}>
          <span className="text-[11px] text-gray-400">{k}</span>
          <b className="font-display text-[15px]" style={{ color: c }}>{r === 0 ? '준비됨' : `−${r}`}</b>
        </div>
      ))}
    </div>
  </div>
  {btns()}
</>);

/* T3. 내 팀 카드 + 막대 + 남은 캡 */
const T3 = () => aside(<>
  <p className="mt-lab">My Team</p>
  <div className="mt-cut relative shrink-0 overflow-hidden" style={{ height: 136, ...cut(12), background: '#0b1220' }}>
    <span className="absolute inset-0 bg-cover" style={{ backgroundPosition: 'center 30%', backgroundImage: 'url(ui/mt/tile-locker.webp)' }} />
    <span className="absolute inset-0" style={{ background: 'linear-gradient(rgba(5,8,15,.35),rgba(5,8,15,.1) 40%,#05080f)' }} />
    <span className="absolute left-3 top-3 block h-10 w-10 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(ui/clubs/dream.webp)' }} />
    <span className="absolute inset-x-3 bottom-2">
      <b className="block text-[22px] font-black text-white">나의 드림팀</b>
      <span className="font-display text-[11px] tracking-[0.2em]" style={{ color: A.main }}>팀 종합 84 · 엔트리 20/20</span>
    </span>
  </div>
  <div className="flex flex-col gap-2">
    {TOT.map(([t, v, d, a, max]) => (
      <div key={t} className="grid items-center gap-2" style={{ gridTemplateColumns: '54px minmax(0,1fr) 62px' }}>
        <span className="text-[12px] text-gray-400">{t} 합계</span>
        <span className="relative h-2.5 bg-white/[0.07]"><i className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: a }} /></span>
        <span className="flex items-baseline justify-end gap-1"><b className="font-display text-[16px]" style={{ color: a }}>{v}</b>{delta(d)}</span>
      </div>
    ))}
  </div>
  {kv([['샐러리 캡 잔여', '26 CP'], ['외국인', '3 / 3'], ['퓨처스 유망주', '4명', '#fcd34d']])}
  {btns()}
</>);

/* T4. 상대와 견주기 + 예상 승률 + 투수 휴식 */
const T4 = () => aside(<>
  <p className="mt-lab">Tune Up</p>
  <h2 className="-mt-1 text-[26px] font-black text-white">정비</h2>
  <div className="grid gap-1 text-center font-display text-[10px] tracking-[0.2em] text-gray-500" style={{ gridTemplateColumns: '1fr 46px 1fr' }}>
    <span style={{ color: A.main }}>MINE</span><span /><span style={{ color: OPP_CLUB.color }}>OPP</span>
  </div>
  {[['타선', 779, Math.round(O.bat * 9), A.bat], ['수비', 697, Math.round(O.def * 8), A.def], ['투수', 474, Math.round(O.sp * 5), A.pit]].map(([k, me, them, a]) => {
    const win = me >= them;
    const w = (v) => `${Math.max(6, Math.min(100, (v / Math.max(me, them)) * 100))}%`;
    return (
      <div key={k} className="grid items-center gap-1.5" style={{ gridTemplateColumns: '1fr 46px 1fr' }}>
        <span className="flex items-center gap-1.5">
          <b className="w-9 text-right font-display text-[15px]" style={{ color: win ? A.bat : '#94a3b8' }}>{me}</b>
          <span className="relative h-2 flex-1 bg-white/[0.07]"><i className="absolute inset-y-0 right-0" style={{ width: w(me), background: win ? a : '#475569' }} /></span>
        </span>
        <span className="text-center text-[12px] text-gray-400">{k}</span>
        <span className="flex items-center gap-1.5">
          <span className="relative h-2 flex-1 bg-white/[0.07]"><i className="absolute inset-y-0 left-0" style={{ width: w(them), background: win ? '#475569' : OPP_CLUB.color }} /></span>
          <b className="w-9 font-display text-[15px]" style={{ color: win ? '#94a3b8' : OPP_CLUB.color }}>{them}</b>
        </span>
      </div>
    );
  })}
  <div className="grid grid-cols-2 gap-1.5">
    {[['예상 승률', '54%', A.bat], ['팀 종합', '84', '#fff'], ['외국인', '3 / 3', '#fff'], ['퓨처스', '4명', '#fcd34d']].map(([k, v, c]) => (
      <div key={k} className="mt-cut px-3 py-1.5" style={{ ...cut(8), background: 'rgba(255,255,255,.04)' }}>
        <span className="block text-[11px] text-gray-500">{k}</span><b className="font-display text-[18px]" style={{ color: c }}>{v}</b>
      </div>
    ))}
  </div>
  <div className="flex gap-1.5">
    {REST.map(([k, r, c]) => (
      <div key={k} className="mt-cut flex flex-1 flex-col items-center py-1.5" style={{ ...cut(6), background: 'rgba(255,255,255,.04)' }}>
        <span className="text-[11px] text-gray-400">{k}</span>
        <b className="font-display text-[15px]" style={{ color: c }}>{r === 0 ? '준비됨' : `−${r}`}</b>
      </div>
    ))}
  </div>
  {btns()}
</>);

const SYNS = [['S1', '아이콘 줄 목록', S1], ['S2', '아이콘 도크 + 합계', S2], ['S3', '두 열 아이콘 칩', S3], ['S4', '아이콘 타일(잠김까지)', S4]];
const TUNES = [['T1', '막대 + 팀 요약', T1], ['T2', '큰 숫자 + 투수 휴식', T2], ['T3', '팀 카드 + 캡', T3], ['T4', '상대 견주기 + 휴식', T4]];

function Gallery() {
  const v = new URLSearchParams(location.search).get('v');
  if (v) {
    const s = SYNS.find(([id]) => id === v.slice(0, 2));
    const t = TUNES.find(([id]) => id === v.slice(2));
    if (s && t) return <Screen synergy={s[2]()} tune={t[2]()} />;
  }
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <b className="text-[15px] text-white">시너지 4종(드래프트 아이콘) × 정비 4종 = 16안</b>
      <div className="mt-3 grid grid-cols-4 gap-4">
        {SYNS.map(([sid, sname, S]) => TUNES.map(([tid, tname, T]) => (
          <div key={sid + tid}>
            <h3 className="mb-1.5 text-[12.5px] text-white">
              <a className="text-inherit no-underline" href={`${location.pathname}?v=${sid}${tid}`}>{sid}+{tid} · {sname} / {tname}</a>
            </h3>
            <div className="flex gap-2">
              <div style={{ width: 300, height: 230, position: 'relative' }}>
                <div className="mt-cut mt-glass absolute inset-0 flex flex-col p-3" style={cut(12)}>{S()}</div>
              </div>
              <div style={{ width: 150, height: 230, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', width: 384, height: 807, transform: 'scale(.39)', transformOrigin: '0 0', display: 'flex' }}>{T()}</div>
              </div>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
