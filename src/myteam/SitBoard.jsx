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
import { Portrait } from './ui.jsx';

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
 * 경기 계획표 — 2단계 판과 같은 조각으로(2026-10-04): 전광판(검은 칸 · 주황)은 1 · 2단계 유리 판 결에서 벗어나 되돌림
 *  회 머리 = 2단계와 같은 'n회' + 기회 회 초록 · 아래 '기회'(상대 마운드 평균 −2 아래)
 *  마운드 줄 = 2단계 마운드 줄과 같은 유리 레인(회 눈금 · 기회 기둥) · 선발 파란 막대 · 계투 유리 칸 · 마무리 금색 글자, 얼굴 사진
 *  타순 줄 = 같은 레인 안에 회마다 선두 타자(번호 + 얼굴 + 이름)
 */
const LEAD_W = '6.5rem';
function Lane({ label, h, low, children }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: `${LEAD_W} minmax(0,1fr)`, height: h }}>
      <span className="flex items-center pr-3"><b className="text-t3" style={{ color: W1 }}>{label}</b></span>
      <span className="relative block rounded-lg" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
          {INN.map((i) => <i key={i} style={{ borderLeft: i > 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: low[i - 1] ? 'rgba(16,185,129,.07)' : 'transparent' }} />)}
        </span>
        {children}
      </span>
    </div>
  );
}
function PlanTable({ starter, pens, rel, limit, batters = [], mound = [] }) {
  const exit = exitOf(limit), mp = moundPlan(rel, exit), byId = new Map(pens.map((p) => [p.id, p]));
  const segs = [[0, exit, starter, 'sp'], ...mp.spans.map((x) => [x.a / 3, x.b / 3, byId.get(x.id), x.slot === 'close' ? 'close' : 'mid'])];
  const known = mound.filter((v) => v != null), avg = known.length ? known.reduce((x, y) => x + y, 0) / known.length : 0;
  const low = INN.map((i) => mound[i - 1] != null && mound[i - 1] <= avg - 2);
  return (
    <div className="mt-cut flex shrink-0 flex-col gap-2 p-4" style={{ ...cut(12), background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.012))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      <b className="text-t3" style={{ color: W1 }}>경기 계획</b>
      <div className="grid" style={{ gridTemplateColumns: `${LEAD_W} minmax(0,1fr)` }}>
        <span />
        <span className="grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <span key={i} className="flex flex-col items-center"><b className="font-display text-t3" style={{ color: low[i - 1] ? US : W2 }}>{i}회</b><span className="text-[10px]" style={{ color: US, visibility: low[i - 1] ? 'visible' : 'hidden' }}>기회</span></span>)}</span>
      </div>
      <Lane label="마운드" h={50} low={low}>
        {segs.map(([a, b, p, role]) => b > a && (
          <span key={`${a}`} className="absolute flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-md px-2"
            style={{ top: 5, bottom: 5, left: `calc(${(a / 9) * 100}% + 4px)`, width: `calc(${((b - a) / 9) * 100}% - 8px)`, background: role === 'sp' ? `linear-gradient(90deg, ${SPB}66, ${SPB}22)` : 'rgba(255,255,255,.05)', boxShadow: role === 'sp' ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
            {p && <Portrait player={p} w={26} h={32} color="#334155" />}
            <b className="truncate text-t4" style={{ color: W1 }}>{p?.name}</b>
            {role === 'close' && <span className="text-[10px]" style={{ color: GOLD }}>마무리</span>}
          </span>
        ))}
      </Lane>
      <Lane label="타순" h={44} low={low}>
        <span className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
          {INN.map((i) => { const k = Math.floor((i - 1) * PA_INN) % 9, bt = batters[k]; return (
            <span key={i} className="flex min-w-0 items-center justify-center gap-1.5 px-1">
              <b className="font-display text-[11px]" style={{ color: W3 }}>{k + 1}</b>
              {bt && <Portrait player={bt} w={20} h={25} color="#334155" />}
              <span className="truncate text-[12px] font-bold" style={{ color: W1 }}>{bt?.name}</span>
            </span>
          ); })}
        </span>
      </Lane>
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
