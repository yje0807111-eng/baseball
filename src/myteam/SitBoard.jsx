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
 *  고르기 설명 = 득실 한 줄씩(이득 초록 · 손해 빨강, '장타 확률 증가'처럼 — 화살표 ↑ ↓ 는 좋은지 나쁜지 헷갈려서, 2026-10-09)
 *  아래 = 타순 두 줄(목업 prep-step3e 2안, 2026-10-09) — 우리 · 상대 9명 얼굴 + 꼬리표. 지금 고른 설정에 걸리는 꼬리표만 색이 켜짐
 *   우리: 주력 80+ → '주력 n'(도루 문턱 위면 켜짐) · 파워 85+ '파워'(홈런 우선) 또는 컨택 85+ '컨택'(안타 우선)
 *   상대: 파워 80+ '파워' · 아래 '교타'(정면 승부 — 교타자만이면 교타만 켜짐)
 *  (판 절반이 비던 자리 — FC 온라인 개인 전술 · FM 선수 지시처럼 지시 옆에 '누구에게 걸리는지')
 */
import React, { useState } from 'react';
import { alertsOf, lvOf, LV } from './OppPanel.jsx';
import { Portrait } from './ui.jsx';

const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa';
const ORG = '#f59e0b', SKY = '#38bdf8', VIO = '#a78bfa';
const STEAL = ['steal', 'steal85', 'steal90'];
const ZONE = ['pitchZone', 'pitchZoneCon', 'pitchZoneE', 'pitchZoneConE'];
export const SIT_IDS = ['rispPow', 'rispCon', 'rispPat', ...STEAL, ...ZONE];
/* 설명 = [[글, 1 이득 · -1 손해 · 0 그대로]] */
const BAT = [[null, '그대로', null, [['정비 계획대로', 0]]], ['rispPow', '홈런 우선', ORG, [['장타 확률 증가', 1], ['삼진 확률 증가', -1]]], ['rispCon', '안타 우선', SKY, [['안타 확률 증가', 1], ['장타 확률 감소', -1]]], ['rispPat', '출루 우선', VIO, [['볼넷 확률 증가', 1], ['루킹 삼진 증가', -1]]]];
const FX_C = { 1: '#34d399', '-1': RED, 0: W3 };
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
            <span className="flex flex-col">{fx.map(([t, d]) => <span key={t} className="truncate text-[12px] font-bold" style={{ color: FX_C[d], opacity: on ? 1 : 0.75 }}>{t}</span>)}</span>
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
/* 타순 줄 — 얼굴 카드 9장 + 꼬리표([글, 색, 켜짐]) */
function Strip({ team, label, tags }) {
  return (
    <div className="grid min-h-0 flex-1 items-stretch gap-2" style={{ gridTemplateColumns: '9rem repeat(9,minmax(0,1fr))' }}>
      <span className="flex items-center"><b className="text-t2" style={{ color: W1 }}>{label}</b></span>
      {team.batters.slice(0, 9).map((p, i) => (
        <span key={p.id} className="mt-cut flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-1.5" style={{ '--c': '8px', background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
          <span className="relative flex shrink-0"><Portrait player={p} w={46} h={56} /><b className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full font-display text-[11px]" style={{ background: '#0b0f1a', color: W2, boxShadow: '0 0 0 1px rgba(255,255,255,.18)' }}>{i + 1}</b></span>
          <b className="w-full shrink-0 truncate text-center text-t4 leading-5" style={{ color: W1 }}>{p.name}</b>
          <span className="flex min-h-[18px] shrink-0 flex-wrap justify-center gap-1">{tags(p).map(([t, c, on]) => <span key={t} className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: on ? c : W3, background: on ? `${c}1a` : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>{t}</span>)}</span>
        </span>
      ))}
    </div>
  );
}
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
  const thrN = { steal: 80, steal85: 85, steal90: 90 }[stealOn];
  const conOnly = zoneOn?.includes('Con');
  const ours = (p) => [
    ...(st(p, 'speed') >= 80 ? [[`주력 ${st(p, 'speed')}`, US, !!thrN && st(p, 'speed') >= thrN]] : []),
    ...(st(p, 'power') >= 85 ? [['파워', ORG, bat === 'rispPow']] : st(p, 'contact') >= 85 ? [['컨택', SKY, bat === 'rispCon']] : []),
  ];
  const theirs = (p) => (st(p, 'power') >= 80 ? [['파워', RED, !!zoneOn && !conOnly]] : [['교타', SPB, !!zoneOn]]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Row side="공격" ko="타자" sit="득점권 기회"
        main={<Opts opts={BAT} value={bat} onPick={(id) => swap(['rispPow', 'rispCon', 'rispPat'], id)} />}
        chips={<Chip l={spChip(engine.away.pitchers[0])} />} />
      <i className="block h-px shrink-0 bg-white/[0.07]" />
      <Row side="공격" ko="주자" sit="빠른 1루 주자"
        main={<Opts opts={[[null, '그대로', null, [['뛰지 않음', 0]]], ['run', '도루 우선', US, [['진루 확률 증가', 1], ['도루 실패 아웃', -1]]]]} value={stealOn ? 'run' : null} onPick={(id) => swap(STEAL, id ? thr : null)} />}
        sub={<Seg label="누가 뛰나" opts={[['steal', '주력 80+'], ['steal85', '주력 85+'], ['steal90', '주력 90+']]} on={thr} onPick={pickThr} dim={!stealOn} />}
        chips={<Chip l={alertChip('도루 기회')} />} />
      <i className="block h-px shrink-0 bg-white/[0.07]" />
      <Row side="수비" ko="투수" sit="경기 운영" h={96}
        main={<Opts opts={[[null, '기본', null, [['투수 배합대로', 0]]], ['pit', '정면 승부', SPB, [['볼넷 확률 감소', 1], ['장타 확률 증가', -1]]]]} value={zoneOn ? 'pit' : null} onPick={(id) => swap(ZONE, id ? zoneId() : null)} />}
        sub={<>
          <Seg label="누구에게" opts={[['', '모든 타자'], ['Con', '교타자만']]} on={who} onPick={pickWho} dim={!zoneOn} />
          <Seg label="언제" opts={[['', '경기 내내'], ['E', '초반만']]} on={when} onPick={pickWhen} dim={!zoneOn} />
        </>}
        chips={<><Chip l={alertChip('장타 위험')} /><Auto ko="선발 무너질 때 · 자동 교체" /></>} />
      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-3 rounded-lg px-3 py-3" style={{ background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
        <Strip team={engine.home} label="우리 타순" tags={ours} />
        <i className="block h-px shrink-0 bg-white/[0.07]" />
        <Strip team={engine.away} label="상대 타순" tags={theirs} />
      </div>
    </div>
  );
}
