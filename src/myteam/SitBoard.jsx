/*
 * 정비 3단계(상황 대응) 가운데 — 목업 prep-step3d 3안 '레인'(2단계 마운드 · 공격 줄과 같은 결), 2026-10-04
 *  경기 계획표는 뺌(2단계와 겹침). 줄마다 왼쪽 이름 칸 + 유리 레인 안에 고르기 → 세부 → 경보 칩(왼쪽에서 오른쪽으로 읽힘)
 *  고르기는 sit-sim · sit2-sim(ROADMAP 13)에서 상대에 따라 득실이 갈린 것만:
 *   타자 · 득점권 기회 — 그대로 · 홈런 우선 · 안타 우선 · 출루 우선(rispPow · rispCon · rispPat) ↔ 상대 선발 구위 · 제구
 *     (아웃 · 점수로 나눠도 정답이 같아 하나로 둠)
 *   주자 · 빠른 1루 주자 — 그대로 · 도루 우선 + 누가 뛰나 주력 80+ · 85+ · 90+(steal · steal85 · steal90, 위험 다이얼) ↔ 상대 포수
 *   투수 · 경기 운영 — 기본 · 정면 승부(경기 중 결정 카드와 같은 이름, 2026-10-09 맞혀 잡기에서 바꿈) + 누구에게(모든 타자 · 교타자만) · 언제(경기 내내 · 초반만) → pitchZone[Con][E] ↔ 상대 파워 · 우리 선발 제구
 *     선발 무너질 때 자동 교체(tired, 늘 켬 — 고를 칸 아님)
 *  세부는 큰 고르기가 '그대로 · 기본'이면 흐리게(눌러도 안 바뀜) — 고른 세부는 기억해 두었다가 다시 켤 때 그대로
 *  오른쪽 칩 = 왼쪽 상대 판의 같은 값(경보 · 상대 선발) — 어디를 볼지만, 답은 주지 않음
 */
import React, { useState } from 'react';
import { alertsOf, lvOf, LV } from './OppPanel.jsx';

const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa';
const ORG = '#f59e0b', SKY = '#38bdf8', VIO = '#a78bfa';
const STEAL = ['steal', 'steal85', 'steal90'];
const ZONE = ['pitchZone', 'pitchZoneCon', 'pitchZoneE', 'pitchZoneConE'];
export const SIT_IDS = ['rispPow', 'rispCon', 'rispPat', ...STEAL, ...ZONE];
const BAT = [[null, '그대로', null, '정비 계획대로'], ['rispPow', '홈런 우선', ORG, '장타 ↑ · 삼진 ↑'], ['rispCon', '안타 우선', SKY, '안타 ↑ · 장타 ↓'], ['rispPat', '출루 우선', VIO, '볼넷 ↑ · 루킹 ↑']];
/* 타자 줄 칩 — 상대 선발 구위 · 제구 중 치우친 것 하나 */
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
const Auto = ({ ko }) => <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: W2, background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}><i className="block h-1.5 w-1.5 rounded-full" style={{ background: US }} />{ko}</span>;
/* 큰 고르기 — 색 점 + 이름 + 결과 한 줄 */
function Opts({ opts, value, onPick }) {
  return (
    <span className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${opts.length},minmax(0,1fr))` }}>
      {opts.map(([id, ko, c, fx]) => {
        const on = value === id, col = c || '#cbd5e1';
        return (
          <button key={ko} type="button" aria-pressed={on} onClick={() => onPick(id)}
            className="flex min-w-0 flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
            style={{ background: on ? `${col}1f` : 'rgba(255,255,255,.025)', boxShadow: `inset 0 0 0 1px ${on ? col : 'rgba(255,255,255,.08)'}` }}>
            <span className="flex items-center gap-1.5"><i className="block h-2 w-2 rounded-full" style={{ background: c || 'rgba(255,255,255,.3)' }} /><b className="truncate text-t4" style={{ color: on ? '#fff' : W2 }}>{ko}</b></span>
            <span className="truncate text-[11px]" style={{ color: on ? W2 : W3 }}>{fx}</span>
          </button>
        );
      })}
    </span>
  );
}
/* 세부 — 2단계 '끊는 기준'과 같은 알약 칸 */
function Seg({ label, opts, on, onPick, dim }) {
  return (
    <span className="flex items-center justify-end gap-2" style={{ opacity: dim ? 0.35 : 1 }}>
      <span className="text-[12px] font-bold" style={{ color: W3 }}>{label}</span>
      <span className="inline-flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
        {opts.map(([id, ko]) => <button key={ko} type="button" disabled={dim} aria-pressed={id === on} onClick={() => onPick(id)} className="rounded-md px-2.5 py-1 text-[12px] font-bold" style={id === on ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : { color: W2 }}>{ko}</button>)}
      </span>
    </span>
  );
}
/* 한 줄 — 왼쪽 이름 칸 + 유리 레인(고르기 · 세부 · 칩) */
function Row({ side, ko, sit, h = 80, main, sub, chips }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: '9rem minmax(0,1fr)' }}>
      <span className="flex flex-col justify-center gap-1 pr-3"><span className="flex items-center gap-2"><Side side={side} /><b className="text-t2" style={{ color: W1 }}>{ko}</b></span><span className="text-[12px]" style={{ color: W3 }}>{sit}</span></span>
      <span className="flex items-center gap-5 rounded-lg px-3 py-2.5" style={{ minHeight: h, background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="min-w-0 flex-1">{main}</span>
        {sub && <span className="flex shrink-0 flex-col gap-2">{sub}</span>}
        <span className="flex w-40 shrink-0 flex-col items-end gap-2">{chips}</span>
      </span>
    </div>
  );
}

export default function SitBoard({ conds, setConds, engine }) {
  const alerts = alertsOf(engine.home, engine.away);
  const alertChip = (ko) => { const a = alerts.find((x) => x.ko === ko); return a && lvOf(a) >= 1 ? [a.ko, LV[a.kind][lvOf(a)], a.kind === 'chance' ? US : lvOf(a) === 2 ? RED : GOLD] : null; };
  const has = (ids) => ids.find((c) => conds.includes(c)) ?? null;
  const swap = (ids, id) => setConds([...conds.filter((c) => !ids.includes(c)), ...(id ? [id] : [])]);
  /* 타자 */
  const bat = has(['rispPow', 'rispCon', 'rispPat']);
  /* 주자 — 문턱은 꺼져 있어도 기억 */
  const stealOn = has(STEAL);
  const [thr, setThr] = useState(stealOn || 'steal85');
  const pickThr = (id) => { setThr(id); if (stealOn) swap(STEAL, id); };
  /* 투수 — 누구에게(Con) · 언제(E)도 기억 */
  const zoneOn = has(ZONE);
  const [who, setWho] = useState(zoneOn?.includes('Con') ? 'Con' : '');
  const [when, setWhen] = useState(zoneOn?.endsWith('E') ? 'E' : '');
  const zoneId = (w = who, t = when) => `pitchZone${w}${t}`;
  const pickWho = (w) => { setWho(w); if (zoneOn) swap(ZONE, zoneId(w, when)); };
  const pickWhen = (t) => { setWhen(t); if (zoneOn) swap(ZONE, zoneId(who, t)); };
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Row side="공격" ko="타자" sit="득점권 기회"
        main={<Opts opts={BAT} value={bat} onPick={(id) => swap(['rispPow', 'rispCon', 'rispPat'], id)} />}
        chips={<Chip l={spChip(engine.away.pitchers[0])} />} />
      <i className="block h-px shrink-0 bg-white/[0.07]" />
      <Row side="공격" ko="주자" sit="빠른 1루 주자"
        main={<Opts opts={[[null, '그대로', null, '뛰지 않음'], ['run', '도루 우선', US, '진루 ↑ · 아웃 위험']]} value={stealOn ? 'run' : null} onPick={(id) => swap(STEAL, id ? thr : null)} />}
        sub={<Seg label="누가 뛰나" opts={[['steal', '주력 80+'], ['steal85', '주력 85+'], ['steal90', '주력 90+']]} on={thr} onPick={pickThr} dim={!stealOn} />}
        chips={<Chip l={alertChip('도루 기회')} />} />
      <i className="block h-px shrink-0 bg-white/[0.07]" />
      <Row side="수비" ko="투수" sit="경기 운영" h={96}
        main={<Opts opts={[[null, '기본', null, '투수 배합대로'], ['pit', '정면 승부', SPB, '존 안으로 · 볼넷 ↓ · 장타 위험']]} value={zoneOn ? 'pit' : null} onPick={(id) => swap(ZONE, id ? zoneId() : null)} />}
        sub={<>
          <Seg label="누구에게" opts={[['', '모든 타자'], ['Con', '교타자만']]} on={who} onPick={pickWho} dim={!zoneOn} />
          <Seg label="언제" opts={[['', '경기 내내'], ['E', '초반만']]} on={when} onPick={pickWhen} dim={!zoneOn} />
        </>}
        chips={<><Chip l={alertChip('장타 위험')} /><Auto ko="선발 무너질 때 · 자동 교체" /></>} />
    </div>
  );
}
