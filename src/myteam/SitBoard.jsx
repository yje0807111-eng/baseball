/*
 * 정비 3단계(상황 대응) 가운데 — 목업 prep-step3c 4안(위 경기 계획표 + 아래 구역 셋) + 3안(고르기 카드 · 결과 칩), 2026-10-04
 *  고르기는 sit-sim(ROADMAP 13)에서 상대에 따라 득실이 갈린 것만:
 *   타자 · 득점권 기회 — 그대로 · 홈런 우선 · 안타 우선 · 출루 우선(rispPow · rispCon · rispPat) ↔ 상대 선발 구위 · 제구
 *   주자 · 빠른 1루 주자 — 그대로 · 도루 우선(steal) ↔ 상대 포수(왼쪽 경보 '도루 기회')
 *   투수 · 경기 운영 — 기본 · 맞혀 잡기(pitchZone) ↔ 상대 파워(왼쪽 경보 '장타 위험') · 선발 무너질 때 자동 교체(tired, 늘 켬 — 고를 칸 아님)
 *  구역 머리 오른쪽 칩 = 왼쪽 상대 판의 같은 값(경보 · 상대 선발) — 어디를 볼지만, 답은 주지 않음
 *  경기 계획표 = 1 · 2단계에서 정한 것(마운드 · 공격 높이 · 타순)을 회 한 줄로 — 마지막 점검, 손대려면 위 단계로
 *   타순 줄 = 그 회 선두 타자 어림(한 회 타석 4.2 — ponytail: 고정 어림, 미리보기 타석 수를 받으면 그걸로)
 */
import React from 'react';
import { alertsOf, lvOf, LV } from './OppPanel.jsx';
import { moundPlan, exitOf } from './FlowBoard.jsx';

const cut = (c) => ({ '--c': `${c}px` });
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa';
const ORG = '#f59e0b', SKY = '#38bdf8', VIO = '#a78bfa';
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const SIT_IDS = ['rispPow', 'rispCon', 'rispPat', 'steal', 'pitchZone'];
const ZONES = [
  { id: 'bat', side: '공격', ko: '타자', sit: '득점권 기회', link: 'sp',
    opts: [[null, '그대로', null, '정비 계획대로'], ['rispPow', '홈런 우선', ORG, '장타 ↑ · 삼진 ↑'], ['rispCon', '안타 우선', SKY, '안타 ↑ · 장타 ↓'], ['rispPat', '출루 우선', VIO, '볼넷 ↑ · 루킹 ↑']] },
  { id: 'run', side: '공격', ko: '주자', sit: '빠른 1루 주자', link: '도루 기회',
    opts: [[null, '그대로', null, '뛰지 않음'], ['steal', '도루 우선', US, '진루 ↑ · 아웃 위험']] },
  { id: 'pit', side: '수비', ko: '투수', sit: '경기 운영', link: '장타 위험', auto: '선발 무너질 때 · 자동 교체',
    opts: [[null, '기본', null, '투수 배합대로'], ['pitchZone', '맞혀 잡기', SPB, '볼넷 ↓ · 장타 위험']] },
];
/* 타자 구역 칩 — 상대 선발 구위 · 제구 중 치우친 것 하나 */
const spChip = (sp) => {
  const s = st(sp, 'stuff', 80), c = st(sp, 'control', 75);
  if (s >= 86) return ['상대 선발', '구위 강함', RED];
  if (s <= 78) return ['상대 선발', '구위 약함', US];
  if (c <= 74) return ['상대 선발', '제구 약함', US];
  if (c >= 86) return ['상대 선발', '제구 강함', RED];
  return null;
};

const Side = ({ side }) => <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: side === '공격' ? US : SPB, boxShadow: `inset 0 0 0 1px ${side === '공격' ? US : SPB}66` }}>{side}</span>;
const Chip = ({ l }) => l && <span className="flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: l[2], background: `${l[2]}1a` }}><i className="block h-1.5 w-1.5 rounded-full" style={{ background: l[2] }} />{l[0]} {l[1]}</span>;

function Zone({ z, chip, value, onPick }) {
  return (
    <div className="mt-cut flex min-w-0 flex-col gap-3 p-4" style={{ ...cut(12), background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.012))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      <span className="flex items-center gap-2"><Side side={z.side} /><b className="text-t2" style={{ color: W1 }}>{z.ko}</b><span className="ml-auto"><Chip l={chip} /></span></span>
      <b className="text-t3" style={{ color: W2 }}>{z.sit}</b>
      <span className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${z.opts.length},minmax(0,1fr))` }}>
        {z.opts.map(([id, ko, c, fx]) => {
          const on = value === id, col = c || '#cbd5e1';
          return (
            <button key={ko} type="button" aria-pressed={on} onClick={() => onPick(id)}
              className="mt-cut flex min-w-0 flex-col items-start gap-1.5 px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
              style={{ ...cut(8), background: on ? `${col}1f` : 'rgba(255,255,255,.025)', boxShadow: `inset 0 0 0 1px ${on ? col : 'rgba(255,255,255,.08)'}` }}>
              <span className="flex items-center gap-1.5"><i className="block h-2 w-2 rounded-full" style={{ background: c || 'rgba(255,255,255,.3)' }} /><b className="truncate text-t3" style={{ color: on ? '#fff' : W2 }}>{ko}</b></span>
              <span className="truncate text-[11px]" style={{ color: on ? W2 : W3 }}>{fx}</span>
            </button>
          );
        })}
      </span>
      {z.auto && <span className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ color: W2, background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}><i className="block h-1.5 w-1.5 rounded-full" style={{ background: US }} />{z.auto}</span>}
    </div>
  );
}
/* 경기 계획표 — 마운드(선발 · 계투 · 마무리) · 공격 높이 점 */
const PA_INN = 4.2;
/*
 * 경기 계획표(목업 prep-plan 3안 전광판 + 5안 역할 표시, 2026-10-04) — 마운드 · 타순 두 줄(공격 줄은 2단계 그래프에 있어 뺌)
 *  회 머리 = 야구장 전광판(검은 칸 · 주황 '1회', 기회 회는 초록 — 2단계 그래프 기둥과 같은 셈: 상대 마운드 평균 −2 아래)
 *  마운드 막대에 선발 · 계투 · 마무리 표시, 타순 칸도 전광판 칸(주황 번호 + 이름)
 */
const BOARD = '#05070c';
function PlanTable({ starter, pens, rel, limit, batters = [], mound = [] }) {
  const exit = exitOf(limit), mp = moundPlan(rel, exit), byId = new Map(pens.map((p) => [p.id, p]));
  const segs = [[0, exit, starter, SPB, '선발'], ...mp.spans.map((x) => [x.a / 3, x.b / 3, byId.get(x.id), x.slot === 'close' ? GOLD : '#94a3b8', x.slot === 'close' ? '마무리' : '계투'])];
  const known = mound.filter((v) => v != null), avg = known.length ? known.reduce((x, y) => x + y, 0) / known.length : 0;
  const low = INN.map((i) => mound[i - 1] != null && mound[i - 1] <= avg - 2);
  return (
    <div className="mt-cut flex shrink-0 flex-col gap-3 p-4" style={{ ...cut(12), background: 'linear-gradient(180deg, rgba(8,10,16,.9), rgba(14,18,28,.85))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      <b className="text-t3" style={{ color: W1 }}>경기 계획</b>
      <div className="grid items-center" style={{ gridTemplateColumns: '5.5rem repeat(9,minmax(0,1fr))', rowGap: 8 }}>
        <span />
        {INN.map((i) => (
          <b key={i} className="mx-1 grid place-items-center rounded py-1 font-display text-t3"
            style={{ background: BOARD, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)', color: low[i - 1] ? '#34d399' : GOLD, textShadow: `0 0 8px ${low[i - 1] ? '#34d39966' : '#fbbf2466'}` }}>{i}회</b>
        ))}
        <span className="text-t4 font-bold" style={{ color: W2 }}>마운드</span>
        <span className="relative block" style={{ gridColumn: 'span 9', height: 28 }}>
          {segs.map(([a, b, p, c, role]) => b > a && (
            <span key={`${a}`} className="absolute flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-3 text-[12px] font-bold"
              style={{ left: `calc(${(a / 9) * 100}% + 4px)`, width: `calc(${((b - a) / 9) * 100}% - 8px)`, top: 0, bottom: 0, background: `linear-gradient(90deg, ${c}40, ${c}18)`, boxShadow: `inset 0 0 0 1px ${c}55`, color: W1 }}>
              <span className="text-[10px] font-bold" style={{ color: c }}>{role}</span>{p?.name}
            </span>
          ))}
        </span>
        <span className="text-t4 font-bold" style={{ color: W2 }}>타순</span>
        {INN.map((i) => { const k = Math.floor((i - 1) * PA_INN) % 9, bt = batters[k]; return (
          <span key={i} className="mx-1 flex min-w-0 items-center justify-center gap-1.5 rounded py-1" style={{ background: BOARD }}>
            <b className="font-display text-[11px]" style={{ color: GOLD }}>{k + 1}</b><span className="truncate text-[12px] font-bold" style={{ color: W1 }}>{bt?.name}</span>
          </span>
        ); })}
      </div>
    </div>
  );
}

export default function SitBoard({ conds, setConds, engine, starter, pens, rel, limit, mound }) {
  const alerts = alertsOf(engine.home, engine.away);
  const chipOf = (z) => {
    if (z.link === 'sp') return spChip(engine.away.pitchers[0]);
    const a = alerts.find((x) => x.ko === z.link);
    if (!a || lvOf(a) < 1) return null;
    return [a.ko, LV[a.kind][lvOf(a)], a.kind === 'chance' ? US : lvOf(a) === 2 ? RED : GOLD];
  };
  const pickIn = (z, id) => setConds([...conds.filter((c) => !z.opts.some(([k]) => k === c)), ...(id ? [id] : [])]);
  return (
    <div className="flex min-h-0 flex-col gap-4">
      <PlanTable starter={starter} pens={pens} rel={rel} limit={limit} batters={engine.home.batters} mound={mound} />
      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr) minmax(0,1fr)' }}>
        {ZONES.map((z) => <Zone key={z.id} z={z} chip={chipOf(z)} value={z.opts.find(([k]) => k && conds.includes(k))?.[0] ?? null} onPick={(id) => pickIn(z, id)} />)}
      </div>
    </div>
  );
}
