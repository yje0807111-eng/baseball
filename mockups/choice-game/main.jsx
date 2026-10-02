/*
 * 선택 경기 목업 (/mockups/choice-game/?v=1~4&s=decide|expand · ?s=result · ?s=progress · ?s=end)
 * 경기는 빠르게 지나가다(진행) 결정 약 10번에서 멈춘다. 결정 = 3초 작전 카드 + 수싸움 판을 한 화면에:
 * 작전 15초 → 구종 · 코스가 필요한 작전이면 그 자리에서 펼쳐져 +10초 → 결과 카드(무슨 일 + 승률) → 다시 진행.
 * 정답 없음 — 카드마다 성공률 · 대가 · 이유 칩(선수 · 상대 · 날씨). 시간이 다 되면 정비 작전.
 * 결정 화면 4안:
 *  1 아래 카드 줄 — 위 상황 띠 · 가운데 구장 · 아래 카드 넷(3초 작전 카드를 키운 것)
 *  2 오른쪽 목록  — 왼쪽 큰 상황판(구장 · 대결 · 날씨) · 오른쪽 선택 줄 넷
 *  3 대결 무대    — 두 선수 카드가 마주 보고, 가운데 상황 · 아래 2×2 선택
 *  4 퀴즈         — 위에 상황 한 줄을 크게(문제), 아래 2×2 답 칸
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { SERIES } from '../../src/data/seriesPlayers.js';
import { UiStyle, GlassBg, Portrait } from '../../src/myteam/ui.jsx';
import { teamNeon } from '../../src/myteam/teamColor.js';
import { artId } from '../../src/data/artAlias.js';

const ALL = SERIES.flatMap((s) => s.players);
const find = (name, year) => ALL.find((p) => p.name === name && (!year || p.year === year)) || ALL.find((p) => p.name === name);
const BAT = find('박진만', 2000), PH = find('양준혁', 1998), PIT = find('최동원', 1984), R3 = find('이종범', 1994), R1 = find('홍성흔', 2001);
const q = new URLSearchParams(location.search), V = Number(q.get('v') || 1), S = q.get('s') || 'decide';
const MY = '#34d399', OPP = '#f87171', GOLD = '#fbbf24', MUTE = '#94a3b8', SKY = '#38bdf8';
const face = (p) => `url(cards/${encodeURIComponent(artId(p?.id || ''))}.webp), url(profiles/${encodeURIComponent(artId(p?.id || ''))}.webp), url(ui/mt/silhouette-player.webp)`;

/* 결정 6/10 — 7회말 1사 1 · 3루, 3 : 4 · 바람 외야로 */
const SIT = { n: 6, inn: '7회말', outs: 1, bases: [1, 0, 1], my: 3, opp: 4, wx: '바람 · 외야로', wp: 38, pens: 2 };
const OPTS = [
  { k: 'plan', ko: '정비 작전', sub: '강공 성향', odds: null, chips: [], cost: null, base: true },
  { k: 'sellout', ko: '노림수', sub: '한 방', odds: ['홈런', '18%'], chips: [['파워 95', MY], ['바람 · 외야로', SKY], ['구위 102', OPP]], cost: '삼진 31%', detail: true },
  { k: 'squeeze', ko: '스퀴즈', sub: '3루 주자 홈', odds: ['성공', '64%'], chips: [['3루 주자 주력 110', MY], ['번트 82', MY]], cost: '실패 시 2사 1루' },
  { k: 'ph', ko: '대타 양준혁', sub: '좌타 · 우투 상대', odds: ['안타', '+6%p'], chips: [['컨택 104', MY], ['좌우 상성', MY]], cost: '박진만 교체 · 복귀 없음', detail: true, who: PH },
];
const PICK = 3; // 펼침 상태에서 고른 카드

/* ───── 조각 ───── */
const Diamond = ({ bases, size = 120 }) => (
  <svg viewBox="0 0 120 92" width={size} height={size * 0.77}>
    {[[90, 50], [60, 20], [30, 50]].map(([x, y], i) => (
      <rect key={i} x={x - 15} y={y - 15} width="30" height="30" rx="4" transform={`rotate(45 ${x} ${y})`}
        fill={bases[i] ? '#f97316' : 'transparent'} stroke={bases[i] ? 'none' : 'rgba(255,255,255,.45)'} strokeWidth="2.5" style={bases[i] ? { filter: 'drop-shadow(0 0 8px #f97316)' } : null} />
    ))}
  </svg>
);
const Outs = ({ n }) => <span className="flex gap-1.5">{[0, 1].map((i) => <i key={i} className="block h-4 w-4 rounded-full" style={{ background: i < n ? '#ef4444' : 'transparent', boxShadow: i < n ? '0 0 10px #ef4444' : 'inset 0 0 0 2px rgba(255,255,255,.35)' }} />)}</span>;
const Chip = ({ t, c }) => <span className="rounded-full px-2.5 py-0.5 text-t4 font-bold" style={{ color: c, background: `${c}1f`, boxShadow: `inset 0 0 0 1px ${c}55` }}>{t}</span>;
const Timer = ({ left = 9.4, total = 15, extra = false, w = 360 }) => (
  <div className="flex items-center gap-3">
    <div className="relative h-2.5 overflow-hidden rounded-full bg-white/10" style={{ width: w }}>
      <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${(left / total) * 100}%`, background: left < 5 ? '#ef4444' : GOLD, boxShadow: `0 0 12px ${GOLD}` }} />
    </div>
    <b className="font-display text-t2 tabular-nums" style={{ color: left < 5 ? '#ef4444' : '#fde68a' }}>{left.toFixed(1)}</b>
    {extra && <b className="rounded-full bg-sky-400/15 px-2 py-0.5 font-display text-t3 text-sky-300">+10</b>}
  </div>
);
const Score = () => (
  <div className="mt-glass flex items-center gap-5 rounded-2xl px-5 py-3">
    <span className="flex flex-col items-center"><b className="font-display text-t1 leading-none" style={{ color: OPP }}>{SIT.opp}</b><small className="text-t4 text-gray-400">상대</small></span>
    <b className="font-display text-t2 text-gray-500">:</b>
    <span className="flex flex-col items-center"><b className="font-display text-t1 leading-none" style={{ color: MY }}>{SIT.my}</b><small className="text-t4 text-gray-400">우리</small></span>
    <i className="h-10 w-px bg-white/15" />
    <b className="font-display text-t2 text-white">{SIT.inn}</b>
    <Diamond bases={SIT.bases} size={70} />
    <Outs n={SIT.outs} />
  </div>
);
const Matchup = ({ big }) => (
  <div className="flex items-center gap-4">
    <span className="flex items-center gap-3"><Portrait player={BAT} w={big ? 64 : 48} h={big ? 64 : 48} round t={MY} /><span><small className="block text-t4" style={{ color: MY }}>타자 · {BAT.hand === 'L' ? '좌타' : '우타'}</small><b className="text-t2 text-white">{BAT.name}</b></span></span>
    <b className="font-display text-t3 text-gray-500">VS</b>
    <span className="flex items-center gap-3"><Portrait player={PIT} w={big ? 64 : 48} h={big ? 64 : 48} round t={OPP} /><span><small className="block text-t4" style={{ color: OPP }}>투수 · {PIT.hand === 'L' ? '좌투' : '우투'} · 체력 41</small><b className="text-t2 text-white">{PIT.name}</b></span></span>
  </div>
);
const Head = ({ extra }) => (
  <div className="flex items-center gap-4">
    <b className="rounded-full px-3 py-1 font-display text-t3" style={{ background: 'rgba(251,191,36,.14)', color: '#fde68a', boxShadow: 'inset 0 0 0 1px rgba(251,191,36,.4)' }}>결정 {SIT.n} / 10</b>
    <Chip t={SIT.wx} c={SKY} />
    <Chip t={`불펜 호출 ${SIT.pens}`} c={MUTE} />
    <span className="ml-auto"><Timer extra={extra} left={extra ? 8.2 : 9.4} total={extra ? 10 : 15} /></span>
  </div>
);

/** 선택 카드 — 이름 · 성공률 큰 숫자 · 이유 칩 · 대가(빨강). base = 정비 작전(시간이 다 되면 이것) */
function Card({ o, i, layout = 'col', on, dim, letter }) {
  return (
    <div className={`relative flex ${layout === 'row' ? 'flex-row items-center gap-5' : 'flex-col gap-3'} rounded-[20px] p-5 transition`}
      style={{ background: on ? 'linear-gradient(180deg,rgba(251,191,36,.16),rgba(251,191,36,.04))' : 'rgba(10,14,24,.78)', backdropFilter: 'blur(14px)',
        boxShadow: on ? `inset 0 0 0 2px ${GOLD}, 0 18px 40px -16px rgba(251,191,36,.6)` : 'inset 0 0 0 1px rgba(255,255,255,.1), 0 14px 34px -18px rgba(0,0,0,.9)', opacity: dim ? 0.35 : 1 }}>
      <div className="flex items-center gap-3">
        {letter && <b className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-t2" style={{ background: on ? GOLD : 'rgba(255,255,255,.08)', color: on ? '#1c1203' : '#e2e8f0' }}>{letter}</b>}
        {!letter && <b className="font-display text-t3 text-gray-500">{i + 1}</b>}
        {o.who && <Portrait player={o.who} w={40} h={40} round t={MY} />}
        <span className="min-w-0">
          <b className="block truncate text-t2 font-black text-white">{o.ko}</b>
          <small className="block text-t4 text-gray-400">{o.sub}</small>
        </span>
        {o.odds && layout !== 'row' && <span className="ml-auto text-right"><small className="block text-t4 text-gray-400">{o.odds[0]}</small><b className="font-display text-t1 leading-none" style={{ color: '#fde68a' }}>{o.odds[1]}</b></span>}
        {o.base && <small className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-t4 text-gray-400">시간 끝</small>}
      </div>
      {layout === 'row' && o.odds && <span className="ml-auto w-24 text-right"><small className="block text-t4 text-gray-400">{o.odds[0]}</small><b className="font-display text-t1 leading-none" style={{ color: '#fde68a' }}>{o.odds[1]}</b></span>}
      {(o.chips.length > 0 || o.cost) && (
        <div className={`flex flex-wrap gap-1.5 ${layout === 'row' ? 'w-[300px]' : ''}`}>
          {o.chips.map(([t, c]) => <Chip key={t} t={t} c={c} />)}
          {o.cost && <Chip t={o.cost} c={OPP} />}
        </div>
      )}
    </div>
  );
}

/** 펼침 — 구종 예측 · 노림 코스(수싸움 판을 줄인 것). 상대 투수 공 섞기 칸 색 · 노린 칸 금색 */
function Detail({ w = 520 }) {
  const heat = [0.1, 0.14, 0.08, 0.16, 0.22, 0.12, 0.3, 0.42, 0.26];
  const ko = ['몸쪽 높게', '높게', '바깥 높게', '몸쪽', '한가운데', '바깥', '몸쪽 낮게', '낮게', '바깥 낮게'];
  return (
    <div className="flex flex-col gap-4 rounded-[22px] p-5 fx-rise" style={{ width: w, background: 'rgba(8,12,22,.86)', backdropFilter: 'blur(16px)', boxShadow: `inset 0 0 0 1.5px ${SKY}88, 0 20px 50px -18px rgba(56,189,248,.5)` }}>
      <div className="flex items-center gap-3"><b className="text-t2 text-white">구종 예측 · 노림 코스</b><span className="ml-auto"><Timer extra left={8.2} total={10} w={150} /></span></div>
      <div className="flex gap-2">
        {[['직구', '#f87171', 41], ['포크', '#a78bfa', 33], ['슬라이더', '#34d399', 26], ['예측 안 함', '#94a3b8', null]].map(([t, c, pct], i) => (
          <span key={t} className="flex flex-1 flex-col items-center rounded-xl py-2" style={{ background: i === 1 ? 'rgba(251,191,36,.14)' : 'rgba(255,255,255,.05)', boxShadow: i === 1 ? `inset 0 0 0 2px ${GOLD}` : 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
            <b className="text-t3" style={{ color: i === 1 ? '#fde68a' : c }}>{t}</b>{pct && <small className="font-display text-t4 text-gray-400">{pct}%</small>}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-5">
        <div className="grid grid-cols-3 gap-1.5 rounded-xl p-1.5" style={{ width: 252, background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.55)' }}>
          {heat.map((h, i) => (
            <span key={i} className="grid h-[76px] place-items-center rounded-lg text-t4 font-bold text-gray-200"
              style={{ background: i === 7 ? 'rgba(251,191,36,.25)' : `rgba(249,115,22,${h})`, boxShadow: i === 7 ? `inset 0 0 0 2.5px ${GOLD}` : 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>{ko[i]}</span>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 text-t3 text-gray-300">
          <span className="flex justify-between"><span>상대 투수</span><b className="text-white">포크 · 낮게</b></span>
          <span className="flex justify-between"><span>2스트라이크</span><b className="text-white">맞히기</b></span>
          <span className="flex justify-between"><span>대타</span><b style={{ color: MY }}>양준혁</b></span>
          <button type="button" className="mt-btn pri mt-2" style={{ '--a': GOLD }}>이 작전으로</button>
        </div>
      </div>
    </div>
  );
}

/* ───── 결정 화면 4안 ───── */
function Decide() {
  const ex = S === 'expand';
  const cards = (layout, letters) => OPTS.map((o, i) => <Card key={o.k} o={o} i={i} layout={layout} on={ex && i === PICK} dim={ex && i !== PICK} letter={letters ? 'ABCD'[i] : null} />);
  if (V === 1) return (
    <div className="relative flex h-full flex-col px-10 pb-8 pt-6" style={{ background: 'url(ui/stadium.webp) center/cover' }}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#05080fcc] via-transparent to-[#05080fee]" />
      <div className="relative"><Head extra={ex} /></div>
      <div className="relative mt-6 flex flex-col items-center gap-4"><Score /><Matchup big /></div>
      <div className="relative mt-auto flex items-end gap-4">
        <div className={`grid flex-1 gap-4 ${ex ? 'grid-cols-2' : 'grid-cols-4'}`}>{ex ? [cards('col')[PICK], cards('col')[0]] : cards('col')}</div>
        {ex && <Detail />}
      </div>
    </div>
  );
  if (V === 2) return (
    <div className="relative grid h-full gap-6 px-10 pb-8 pt-6" style={{ gridTemplateColumns: '1fr 640px', background: 'url(ui/field-night.webp) center/cover' }}>
      <div className="absolute inset-0 bg-[#05080f]/60" />
      <div className="relative flex flex-col gap-6">
        <b className="font-display text-t1 text-white" style={{ fontSize: 44 }}>{SIT.inn} · 1사 1 · 3루</b>
        <div className="flex items-center gap-4"><Score /><Chip t={SIT.wx} c={SKY} /></div>
        <div className="mt-glass rounded-2xl p-5"><Matchup big /></div>
        <div className="mt-auto flex items-center gap-3"><small className="text-t3 text-gray-400">승률</small><b className="font-display text-t1" style={{ color: MY }}>{SIT.wp}%</b></div>
      </div>
      <div className="relative flex flex-col gap-3">
        <Head extra={ex} />
        {ex ? <>{cards('row')[PICK]}<Detail w={640} /></> : cards('row')}
      </div>
    </div>
  );
  if (V === 3) return (
    <div className="relative flex h-full flex-col items-center px-10 pb-8 pt-6" style={{ background: 'url(ui/plate-view.webp) center/cover' }}>
      <div className="absolute inset-0 bg-[#05080f]/70" />
      <div className="relative w-full"><Head extra={ex} /></div>
      <div className="relative mt-4 flex items-center gap-10">
        {[[BAT, MY, '타자'], null, [PIT, OPP, '투수']].map((x, i) => (x ? (
          <div key={i} className="relative h-[300px] w-[230px] overflow-hidden rounded-[22px]" style={{ backgroundImage: face(x[0]), backgroundSize: 'cover', backgroundPosition: 'center 22%', boxShadow: `inset 0 0 0 2px ${x[1]}, 0 0 40px -10px ${x[1]}` }}>
            <div className="absolute inset-x-0 bottom-0 p-4" style={{ background: 'linear-gradient(transparent, rgba(5,8,15,.95))' }}><small className="text-t4" style={{ color: x[1] }}>{x[2]}</small><b className="block text-t2 text-white">{x[0].name}</b></div>
          </div>
        ) : <div key={i} className="flex flex-col items-center gap-3"><Score /><b className="font-display text-t1 text-gray-400">VS</b></div>))}
      </div>
      <div className="relative mt-auto flex w-full items-end gap-4">
        <div className="grid flex-1 grid-cols-2 gap-3">{ex ? [cards('col')[PICK], cards('col')[0]] : cards('col')}</div>
        {ex && <Detail />}
      </div>
    </div>
  );
  return (
    <div className="relative flex h-full flex-col items-center px-14 pb-8 pt-6" style={{ background: 'url(ui/clutch-bat.webp) center/cover' }}>
      <div className="absolute inset-0 bg-[#05080f]/75" />
      <div className="relative w-full"><Head extra={ex} /></div>
      <div className="relative mt-8 flex flex-col items-center gap-3">
        <small className="text-t3 text-gray-400">{SIT.inn} · 1사 1 · 3루 · 1점 뒤짐</small>
        <b className="text-white" style={{ fontSize: 46, fontWeight: 900 }}>박진만 타석 · 어떻게 할까</b>
        <Matchup />
      </div>
      <div className="relative mt-auto flex w-full items-end gap-4">
        <div className="grid flex-1 grid-cols-2 gap-3">{ex ? [cards('col', true)[PICK], cards('col', true)[0]] : cards('col', true)}</div>
        {ex && <Detail />}
      </div>
    </div>
  );
}

/* ───── 결과 카드 ───── */
function Result() {
  return (
    <div className="relative grid h-full place-items-center" style={{ background: 'url(ui/stadium.webp) center/cover' }}>
      <div className="absolute inset-0 bg-[#05080f]/75" />
      <div className="relative flex w-[760px] flex-col items-center gap-5 rounded-[26px] p-8 fx-rise" style={{ background: 'rgba(8,12,22,.88)', backdropFilter: 'blur(18px)', boxShadow: `inset 0 0 0 2px ${GOLD}, 0 30px 80px -20px rgba(251,191,36,.45)` }}>
        <small className="text-t3 text-gray-400">결정 6 · 대타 양준혁 · 포크 · 낮게</small>
        <b className="text-white" style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-.02em' }}>역전 3점 홈런</b>
        <div className="flex items-center gap-3"><Chip t="노림 적중" c={GOLD} /><Chip t="좌우 상성" c={MY} /><Chip t="바람 · 외야로" c={SKY} /></div>
        <div className="flex w-full items-center gap-4">
          <b className="font-display text-t2 text-gray-400">{SIT.wp}%</b>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
            <i className="absolute inset-y-0 left-0 block rounded-full bg-white/30" style={{ width: `${SIT.wp}%` }} />
            <i className="absolute inset-y-0 block rounded-full" style={{ left: `${SIT.wp}%`, width: `${81 - SIT.wp}%`, background: MY, boxShadow: `0 0 14px ${MY}` }} />
          </div>
          <b className="font-display text-t1" style={{ color: MY }}>81%</b>
        </div>
        <div className="flex w-full items-center justify-between text-t3 text-gray-400"><span>우리 6 : 4 상대 · 7회말 1사</span><b className="font-display text-t2" style={{ color: MY }}>+43%p</b></div>
      </div>
    </div>
  );
}

/* ───── 진행 화면 — 선택 사이를 빠르게 ───── */
const LINE = { opp: [0, 1, 0, 2, 0, 1, 0, null, null], my: [1, 0, 0, 0, 2, 0, null, null, null] };
const FEED = [['6회초', '무득점', MUTE], ['6회말', '삼자범퇴', MUTE], ['7회초', '상대 솔로 홈런 · 3 : 4', OPP], ['7회초', '투수 교체 · 최동원 계속', MUTE], ['7회말', '이종범 3루타', MY], ['7회말', '홍성흔 볼넷 · 1사 1 · 3루', MY]];
function Progress() {
  return (
    <div className="relative grid h-full place-items-center" style={{ background: 'url(ui/field-night.webp) center/cover' }}>
      <div className="absolute inset-0 bg-[#05080f]/70" />
      <div className="relative flex w-[1100px] flex-col gap-6">
        <div className="flex items-center gap-4"><b className="rounded-full px-3 py-1 font-display text-t3" style={{ background: 'rgba(56,189,248,.14)', color: '#7dd3fc' }}>▶▶ 진행</b><Chip t={SIT.wx} c={SKY} /><span className="ml-auto text-t3 text-gray-400">다음 결정 6 / 10</span></div>
        <div className="mt-glass grid items-center gap-1 rounded-2xl p-5" style={{ gridTemplateColumns: '90px repeat(9,1fr) 70px' }}>
          <span />{Array.from({ length: 9 }, (_, i) => <b key={i} className="text-center font-display text-t3" style={{ color: i === 6 ? GOLD : '#64748b' }}>{i + 1}</b>)}<b className="text-center font-display text-t3 text-gray-400">R</b>
          {[['상대', 'opp', OPP, 4], ['우리', 'my', MY, 3]].map(([ko, k, c, r]) => (
            <React.Fragment key={k}>
              <b className="text-t2" style={{ color: c }}>{ko}</b>
              {LINE[k].map((v, i) => <b key={i} className="text-center font-display text-t1" style={{ color: v == null ? '#334155' : v ? '#fff' : '#64748b', boxShadow: i === 6 ? `inset 0 0 0 1.5px ${GOLD}` : undefined, borderRadius: 8 }}>{v ?? '·'}</b>)}
              <b className="text-center font-display text-t1" style={{ color: c }}>{r}</b>
            </React.Fragment>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {FEED.map(([inn, t, c], i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl px-5 py-3 fx-rise" style={{ '--i': i, background: i === FEED.length - 1 ? 'rgba(52,211,153,.1)' : 'rgba(255,255,255,.035)', opacity: 0.45 + (i / FEED.length) * 0.55 }}>
              <b className="w-16 font-display text-t3 text-gray-400">{inn}</b><b className="text-t2" style={{ color: c === MUTE ? '#e2e8f0' : c }}>{t}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───── 경기 끝 — 내 선택 10개 ───── */
const MINE = [
  ['2회말', '무사 2루', '희생번트', '1사 3루 · 득점', +4], ['3회초', '2사 만루', '정면 승부', '삼진', +7], ['4회말', '1사 1루', '도루', '도루 실패', -5],
  ['5회초', '무사 1 · 2루', '불펜 · 정우람', '병살', +9], ['6회초', '1사 2 · 3루', '고의사구', '만루 · 실점 2', -11], ['7회말', '1사 1 · 3루', '대타 양준혁', '역전 3점 홈런', +43],
  ['8회초', '2사 2루', '정비 작전', '뜬공', +3], ['8회말', '무사 1루', '밀어치기', '안타', +2], ['9회초', '1사 1루', '불펜 · 오승환', '병살 · 경기 끝', +8], ['9회초', '-', '-', '-', 0],
];
function End() {
  return (
    <div className="relative grid h-full place-items-center" style={{ background: 'url(ui/stadium.webp) center/cover' }}>
      <div className="absolute inset-0 bg-[#05080f]/80" />
      <div className="relative flex w-[1200px] flex-col gap-5">
        <div className="flex items-end gap-5"><b className="text-white" style={{ fontSize: 52, fontWeight: 900 }}>승리</b><b className="font-display text-t1 text-gray-300">우리 6 : 4 상대</b><span className="ml-auto text-t3 text-gray-400">내 선택 9 · 승률 기여 +60%p</span></div>
        <div className="mt-glass flex flex-col gap-1 rounded-2xl p-4">
          {MINE.slice(0, 9).map(([inn, sit, pick, res, d], i) => (
            <div key={i} className="grid items-center gap-4 rounded-xl px-4 py-2.5" style={{ gridTemplateColumns: '70px 140px 200px 1fr 320px', background: d >= 40 ? 'rgba(251,191,36,.1)' : undefined, boxShadow: d >= 40 ? `inset 0 0 0 1px ${GOLD}66` : undefined }}>
              <b className="font-display text-t3 text-gray-400">{inn}</b><span className="text-t3 text-gray-300">{sit}</span><b className="text-t2 text-white">{pick}</b><span className="text-t3 text-gray-300">{res}</span>
              <span className="flex items-center gap-3">
                <span className="relative h-2 flex-1 rounded-full bg-white/[0.07]"><i className="absolute inset-y-0 block rounded-full" style={{ left: d >= 0 ? '50%' : `${50 + d}%`, width: `${Math.abs(d)}%`, background: d >= 0 ? MY : OPP }} /><i className="absolute inset-y-[-3px] left-1/2 block w-px bg-white/30" /></span>
                <b className="w-14 text-right font-display text-t2" style={{ color: d >= 0 ? MY : OPP }}>{d > 0 ? `+${d}` : d}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const body = S === 'result' ? <Result /> : S === 'progress' ? <Progress /> : S === 'end' ? <End /> : <Decide />;
  return <div className="relative h-dvh overflow-hidden bg-[#05080f] text-gray-200"><UiStyle /><GlassBg tint={MY} /><div className="absolute inset-0">{body}</div></div>;
}
createRoot(document.getElementById('root')).render(<App />);
