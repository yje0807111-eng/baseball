/*
 * 정비 3단계(상황 대응) 가운데 — 목업 prep-step3d 3안 '레인'(2단계 마운드 · 공격 줄과 같은 결), 2026-10-04
 *  고르기는 sit-sim · sit2-sim(ROADMAP 13)에서 상대에 따라 득실이 갈린 것만:
 *   타자 · 득점권 기회 — 그대로 · 홈런 우선 · 안타 우선 · 출루 우선(rispPow · rispCon · rispPat) ↔ 상대 선발 구위 · 제구
 *   주자 · 빠른 1루 주자 — 그대로 · 도루 우선 + 누가 뛰나 주력 80+ · 85+ · 90+(steal · steal85 · steal90, 위험 다이얼) ↔ 상대 포수
 *   투수 · 경기 운영 — 기본 · 정면 승부 + 누구에게(모든 타자 · 교타자만) · 언제(경기 내내 · 초반만) → pitchZone[Con][E] ↔ 상대 파워 · 우리 선발 제구
 *     선발 무너질 때 자동 교체(tired, 늘 켬 — 고를 칸 아님)
 *  고르기 설명 = 득실 한 줄씩(이득 초록 · 손해 빨강) — 오늘 상대로 엔진이 잰 '이전 → 이후'(목업 prep-fx 2안 · sitFx.js, 2026-10-09)
 * 정도 · 걸리는 선수(2026-10-15, mockups/sit-tune 2판 · 정도 A안 '칸 막대') — 줄마다 ① 고르기 ② 정도 ③ 타순 표 → 오른쪽 아래 '다음'
 *  정도 = 다섯 칸(아주 약하게 ~ 아주 강하게, 보통 = 예전과 같음) — 고른 id 뒤에 '@n'(tactics SIT_AMP · sitLv). FM 팀 지시처럼 높이가 오르는 칸
 *   고른 칸의 득실 줄도 정도대로 바뀜(보통에서 잰 차이 × 배율, sitFx scale)
 *  타순 표 = 1~5 | 6~9 두 열(한 열 아홉이면 한 줄 27px), 빈 칸(오른쪽 아래)에 '다음' — 선수마다 이득 · 손해 막대 둘(보통에서 잰 그 선수 차이 × 배율)
 *   타자 = 우리 타순(고른 쪽 두 기록) / 주자 = 우리 타순 도루 성공 · 실패 아웃(문턱 위만) / 투수 = 상대 타순 볼넷 · 홈런(걸리는 타자만)
 *  차례 — 타자 → 주자 → 투수, 다음을 눌러야 다음 줄이 열림. 투수 '설정 완료'면 셋 다 접힘 · 아래 '경기 시작'이 켜짐(prog 는 ReadyLocker 가 들고 있어 단계를 오가도 그대로)
 *  지난 줄은 한 줄로 접혀 고른 값 · 정도만(누르면 다시 펼침), 아직 안 연 줄은 흐리게 잠김
 */
import React, { useEffect, useMemo, useState } from 'react';
import { sitOddsLater, batFx, zoneFx, stealFx, stealP } from './sitFx.js';
import { alertsOf, lvOf, LV } from './OppPanel.jsx';
import { Portrait } from './ui.jsx';
import { SIT_AMP, sitLv } from '../engine/tactics.js';

const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const US = '#10b981', GOLD = '#fbbf24', RED = '#f87171', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa', GRN = '#34d399';
const ORG = '#f59e0b', SKY = '#38bdf8', VIO = '#a78bfa';
const BAT = ['rispPow', 'rispCon', 'rispPat'];
const STEAL = ['steal', 'steal85', 'steal90'];
const ZONE = ['pitchZone', 'pitchZoneCon', 'pitchZoneE', 'pitchZoneConE'];
export const SIT_IDS = [...BAT, ...STEAL, ...ZONE];
const idOf = (c) => String(c).split('@')[0];
export const isSit = (c) => SIT_IDS.includes(idOf(c));
const LVK = ['아주 약하게', '약하게', '보통', '강하게', '아주 강하게'];
/* 도루 정도 = 언제 뛰나(tactics) — 1루에 나간 타석에서 뛰는 몫을 보통 대비로. ponytail: 4 · 5는 기회가 늘어나는 몫을 어림 */
const TRY = [0.4, 0.7, 1, 1.4, 1.8];
/* 설명 = [[글, 1 이득 · -1 손해 · 0 그대로]] */
const FX_C = { 1: GRN, '-1': RED, 0: W3 };
const pc = (x) => `${(x * 100).toFixed(1)}%`;
const WAIT = [['재는 중', 0]];
const num = (e, x) => (e.runs ? `${x.toFixed(2)}점` : pc(x));
const lines = (list) => (list ? (list.length ? list.map((e) => [e.abs != null ? `${e.ko} ${Math.round(e.abs * 100)}%` : <>{e.ko} <span style={{ color: W3 }}>{num(e, e.base)}</span> → {num(e, e.after)}</>, e.good ? 1 : -1]) : [['차이 작음', 0]]) : WAIT);
/* 한 번 잰 대진은 다시 재지 않음(2 ↔ 3단계 오가기) */
let memo = { key: '', odds: null };
const keyOf = (e) => [e.home.batters, e.away.batters].map((l) => l.map((p) => p.id).join(',')).concat(e.home.pitchers[0]?.id, e.away.pitchers[0]?.id).join('|');
/* 타자 줄 칩 — 상대 선발 구위 · 제구 중 치우친 것 하나 */
const spChip = (sp) => {
  const s = st(sp, 'stuff', 80), c = st(sp, 'control', 75);
  if (s >= 86) return ['상대 선발', '구위 강함', RED];
  if (s <= 78) return ['상대 선발', '구위 약함', US];
  if (c <= 74) return ['상대 선발', '제구 약함', US];
  if (c >= 86) return ['상대 선발', '제구 강함', RED];
  return null;
};
/* 타순 표 두 기록 — [키, 이름, 오르면 좋음 1 · 나쁨 -1] */
const BAT_COLS = { rispPow: [['hr', '홈런', 1], ['k', '삼진', -1]], rispCon: [['hit', '안타', 1], ['hr', '홈런', 1]], rispPat: [['bb', '볼넷', 1], ['hit', '안타', 1]] };
const PIT_COLS = [['bb', '볼넷', 1], ['hr', '홈런', 1]];

const Side = ({ side }) => <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: side === '공격' ? US : SPB, boxShadow: `inset 0 0 0 1px ${side === '공격' ? US : SPB}66` }}>{side}</span>;
const Chip = ({ l }) => l && <span className="flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: l[2], background: `${l[2]}1a` }}><i className="block h-1.5 w-1.5 rounded-full" style={{ background: l[2] }} />{l[0]} {l[1]}</span>;
const Auto = ({ ko }) => <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: W2, background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}><i className="block h-1.5 w-1.5 rounded-full" style={{ background: US }} />{ko}</span>;
/* 큰 고르기 — 색 점 + 이름 + 득실 줄 */
function Opts({ opts, value, onPick }) {
  return (
    <span className="grid shrink-0 gap-1.5" style={{ gridTemplateColumns: `repeat(${opts.length},minmax(0,1fr))` }}>
      {opts.map(([id, ko, c, fx]) => {
        const on = value === id, col = c || '#cbd5e1';
        return (
          <button key={ko} type="button" aria-pressed={on} onClick={() => onPick(id)}
            className="flex min-w-0 flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
            style={{ background: on ? `${col}1f` : 'rgba(255,255,255,.025)', boxShadow: `inset 0 0 0 1px ${on ? col : 'rgba(255,255,255,.08)'}` }}>
            <span className="flex items-center gap-1.5"><i className="block h-2 w-2 rounded-full" style={{ background: c || 'rgba(255,255,255,.3)' }} /><b className="truncate text-t4" style={{ color: on ? '#fff' : W2 }}>{ko}</b></span>
            <span className="flex flex-col">{fx.map(([t, d], k) => <span key={k} className="truncate text-[12px] font-bold" style={{ color: FX_C[d], opacity: on ? 1 : 0.75 }}>{t}</span>)}</span>
          </button>
        );
      })}
    </span>
  );
}
/* 세부 — 2단계 '끊는 기준'과 같은 알약 칸 */
function Seg({ label, opts, on, onPick }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-[12px] font-bold" style={{ color: W3 }}>{label}</span>
      <span className="inline-flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
        {opts.map(([id, ko]) => <button key={ko} type="button" aria-pressed={id === on} onClick={() => onPick(id)} className="rounded-md px-2.5 py-1 text-[12px] font-bold" style={id === on ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : { color: W2 }}>{ko}</button>)}
      </span>
    </span>
  );
}
/* 정도 줄 — 칸 막대 다섯(높이 10 → 30, 고른 칸까지 고른 색) + 단계 이름 + 세부 · 오른쪽 칩. 그대로 · 기본이면 '조절 없음' */
function Tune({ on, c, lv, onLv, offKo, extra, chips }) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-4 rounded-lg px-3.5" style={{ background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.05)' }}>
      {on ? <>
        <span className="text-[12px] font-bold" style={{ color: W3 }}>정도</span>
        <span className="flex items-end gap-1">
          {LVK.map((t, i) => (
            <button key={t} type="button" aria-label={t} aria-pressed={i + 1 === lv} onClick={() => onLv(i + 1)} className="flex h-[30px] w-[26px] items-end">
              <i className="block w-full rounded-[3px] transition-colors duration-150" style={{ height: 10 + i * 5, background: i < lv ? c : 'rgba(255,255,255,.09)', boxShadow: i < lv ? `0 0 10px ${c}73` : 'none' }} />
            </button>
          ))}
        </span>
        <b className="w-[5.5rem] text-t4" style={{ color: '#fff' }}>{LVK[lv - 1]}</b>
        {extra}
      </> : <span className="text-[13px]" style={{ color: W3 }}>{offKo} — 조절 없음</span>}
      <span className="ml-auto flex items-center gap-2">{chips}</span>
    </div>
  );
}
/* 이득 · 손해 한 칸 — 막대(그 표 안 가장 큰 값 = 끝까지) + 값 */
const Delta = ({ v, good, max, txt }) => (
  <span className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: 'minmax(0,1fr) 3.6rem' }}>
    <span className="relative block h-1.5 rounded-full bg-white/[0.05]">{v != null && <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${max ? Math.min(100, (Math.abs(v) / max) * 100) : 0}%`, background: good ? GRN : RED }} />}</span>
    <b className="text-right font-display text-t4" style={{ color: v == null || !txt ? W3 : good ? GRN : RED }}>{v == null ? '—' : txt || '…'}</b>
  </span>
);
const COLS = '1.4rem 1.9rem minmax(0,1fr) 7.5rem minmax(0,1fr) minmax(0,1fr)';
/* 타순 표 — 1~5 | 6~9, 오른쪽 아래 빈 칸에 다음 단추. rows = [{ p, stats, on, a: [값, 좋음, 글], b }] */
function Table({ title, statKo, colKo, rows, next }) {
  const max = Math.max(0, ...rows.flatMap((r) => [r.a, r.b].map((x) => (x && x[0] != null ? Math.abs(x[0]) : 0))));
  const head = (k) => (
    <span key={k} className="grid items-center gap-2.5 px-2.5 text-[11px] font-bold" style={{ gridTemplateColumns: COLS, color: W3 }}>
      <span /><span /><span>{title}</span><span>{statKo}</span><span>{colKo[0]}</span><span>{colKo[1]}</span>
    </span>
  );
  const row = (r, i) => (
    <span key={r.p.id} className="grid min-h-0 items-center gap-2.5 rounded-lg px-2.5 transition-opacity" style={{ gridTemplateColumns: COLS, opacity: r.on ? 1 : 0.38, background: 'rgba(255,255,255,.025)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.05)' }}>
      <b className="text-center font-display text-t4" style={{ color: W3 }}>{i + 1}</b>
      <Portrait player={r.p} w={30} h={37} />
      <span className="truncate"><b className="text-t4" style={{ color: W1 }}>{r.p.name}</b> <small className="text-[11px]" style={{ color: W3 }}>{r.p.position}</small></span>
      <span className="whitespace-nowrap text-[12px]" style={{ color: W3 }}>{r.stats.map(([k, v], j) => <React.Fragment key={k}>{j ? ' · ' : ''}{k} <b className="font-display text-t4" style={{ color: '#cbd5e1' }}>{v}</b></React.Fragment>)}</span>
      <Delta v={r.on ? r.a[0] : null} good={r.a[1]} max={max} txt={r.a[2]} />
      <Delta v={r.on ? r.b[0] : null} good={r.b[1]} max={max} txt={r.b[2]} />
    </span>
  );
  return (
    <div className="grid min-h-0 flex-1 gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridTemplateRows: 'auto repeat(5,minmax(0,1fr))', gridAutoFlow: 'column' }}>
      {head(0)}{rows.slice(0, 5).map(row)}
      {head(1)}{rows.slice(5, 9).map((r, i) => row(r, i + 5))}
      <span className="flex items-end justify-end">{next}</span>
    </div>
  );
}
/* 줄 오른쪽 아래 단추 — 아래 띠 '다음'(GoBtn)과 같은 금빛, 작게 */
const Next = ({ label, onClick }) => (
  <button type="button" data-sfx="nav" onClick={onClick} className="mt-cut flex h-11 items-center px-6 text-t3 font-black transition-[filter] hover:brightness-110"
    style={{ '--c': '10px', background: 'linear-gradient(180deg,#fcd34d,#d97706)', color: '#1c1203', boxShadow: '0 6px 18px rgba(217,119,6,.25)' }}>{label}</button>
);
/* 접힌 줄 — 고른 값 한 줄(누르면 펼침) · 잠긴 줄은 흐리게 */
function Fold({ side, ko, sit, value, done, locked, onOpen }) {
  return (
    <button type="button" disabled={locked} onClick={onOpen} className="grid shrink-0 items-center text-left transition-opacity" style={{ gridTemplateColumns: '9rem minmax(0,1fr)', opacity: locked ? 0.35 : 1 }}>
      <span className="flex items-center gap-2 pr-3"><Side side={side} /><b className="text-t3" style={{ color: W1 }}>{ko}</b></span>
      <span className="flex h-11 items-center gap-3 rounded-lg px-3" style={{ background: 'rgba(255,255,255,.025)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
        <span className="text-[12px]" style={{ color: W3 }}>{sit}</span>
        {locked ? <span className="text-[12px]" style={{ color: W3 }}>앞 줄 고른 뒤</span> : <b className="text-t4" style={{ color: W1 }}>{value}</b>}
        {done && <b className="text-[13px]" style={{ color: GRN }}>✓</b>}
        {!locked && <span className="ml-auto text-[12px]" style={{ color: W2 }}>바꾸기 ▾</span>}
      </span>
    </button>
  );
}
/* 펼친 줄 — 왼쪽 이름 칸 + 유리 판(고르기 · 정도 · 타순 표) */
function Open({ side, ko, sit, children }) {
  return (
    <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: '9rem minmax(0,1fr)' }}>
      <span className="flex flex-col gap-1 pr-3 pt-1"><span className="flex items-center gap-2"><Side side={side} /><b className="text-t2" style={{ color: W1 }}>{ko}</b></span><span className="text-[12px]" style={{ color: W3 }}>{sit}</span></span>
      <div className="flex min-h-0 flex-col gap-2.5 rounded-lg p-3" style={{ background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>{children}</div>
    </div>
  );
}
const pp = (v) => (Math.abs(v) < 0.05 ? '±0' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%p`);

export default function SitBoard({ conds, setConds, engine, prog, setProg }) {
  const key = keyOf(engine);
  const [odds, setOdds] = useState(() => (memo.key === key ? memo.odds : null));
  useEffect(() => {
    if (memo.key === key) { setOdds(memo.odds); return undefined; }
    setOdds(null);
    return sitOddsLater(engine.home, engine.away, (o) => { memo = { key, odds: o }; setOdds(o); });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const alerts = alertsOf(engine.home, engine.away);
  const alertChip = (ko) => { const a = alerts.find((x) => x.ko === ko); return a && lvOf(a) >= 1 ? [a.ko, LV[a.kind][lvOf(a)], a.kind === 'chance' ? US : lvOf(a) === 2 ? RED : GOLD] : null; };
  const has = (ids) => conds.find((c) => ids.includes(idOf(c))) ?? null;
  /* 정도 3(보통)은 접미사 없이 — 예전 계획과 같은 글 */
  const swap = (ids, id, lv = 3) => setConds([...conds.filter((c) => !ids.includes(idOf(c))), ...(id ? [lv === 3 ? id : `${id}@${lv}`] : [])]);
  /* 줄마다 정도 — 꺼져 있어도 기억 */
  const batC = has(BAT), runC = has(STEAL), pitC = has(ZONE);
  const [lvs, setLvs] = useState(() => ({ 1: batC ? sitLv(batC) : 3, 2: runC ? sitLv(runC) : 3, 3: pitC ? sitLv(pitC) : 3 }));
  const setLv = (k, ids, cur) => (lv) => { setLvs((o) => ({ ...o, [k]: lv })); if (cur) swap(ids, idOf(cur), lv); };
  /* 타자 */
  const bat = batC && idOf(batC);
  /* 주자 — 문턱은 꺼져 있어도 기억 */
  const stealOn = runC && idOf(runC);
  const [thr, setThr] = useState(stealOn || 'steal85');
  const pickThr = (id) => { setThr(id); if (stealOn) swap(STEAL, id, lvs[2]); };
  /* 투수 — 누구에게(Con) · 언제(E)도 기억 */
  const zoneOn = pitC && idOf(pitC);
  const [who, setWho] = useState(zoneOn?.includes('Con') ? 'Con' : '');
  const [when, setWhen] = useState(zoneOn?.endsWith('E') ? 'E' : '');
  const zoneId = (w = who, t = when) => `pitchZone${w}${t}`;
  const pickWho = (w) => { setWho(w); if (zoneOn) swap(ZONE, zoneId(w, when), lvs[3]); };
  const pickWhen = (t) => { setWhen(t); if (zoneOn) swap(ZONE, zoneId(who, t), lvs[3]); };
  const thrN = { steal: 80, steal85: 85, steal90: 90 }[stealOn || thr];
  const conOnly = zoneOn?.includes('Con');
  const amp = (k) => SIT_AMP[lvs[k] - 1];

  /* 차례 — prog = { act: 펼친 줄(0 = 다 접힘), done: 끝낸 줄 수 } */
  const { act, done } = prog;
  const next = (k) => setProg(done >= 3 ? { act: 0, done } : { act: k < 3 ? k + 1 : 0, done: Math.max(done, k) });
  const nextKo = (k) => (done >= 3 ? '확인 ✓' : k === 1 ? '다음 · 주자 ▶' : k === 2 ? '다음 · 투수 ▶' : '설정 완료 ✓');
  const lvKo = (k, on) => (on ? ` · ${LVK[lvs[k] - 1]}` : '');
  const batKo = ({ rispPow: '홈런 우선', rispCon: '안타 우선', rispPat: '출루 우선' }[bat] || '그대로') + lvKo(1, bat);
  const runKo = (stealOn ? `도루 우선 · 주력 ${thrN}+` : '그대로') + lvKo(2, stealOn);
  const pitKo = (zoneOn ? `정면 승부 · ${conOnly ? '교타자만' : '모든 타자'} · ${zoneOn.endsWith('E') ? '초반만' : '경기 내내'}` : '기본') + lvKo(3, zoneOn);

  /* 타순 표 줄 — 보통에서 잰 선수 차이 × 정도 */
  const home9 = engine.home.batters.slice(0, 9), away9 = engine.away.batters.slice(0, 9);
  const steals = useMemo(() => home9.map((p) => stealP(engine.home, engine.away, p)), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const oddRow = (o, id, [k, , up], a, mine) => { if (!o?.[id]) return [0, true, null]; const v = (o[id][k] - o.base[k]) * a * 100; return [v, v * up * (mine ? 1 : -1) >= 0, pp(v)]; };
  const batRows = home9.map((p, i) => {
    const cols = BAT_COLS[bat] || BAT_COLS.rispPow, o = odds?.bat[i];
    return { p, stats: [['파워', st(p, 'power')], ['컨택', st(p, 'contact')]], on: !!bat, a: oddRow(o, bat, cols[0], amp(1), true), b: oddRow(o, bat, cols[1], amp(1), true) };
  });
  const runRows = home9.map((p, i) => {
    const t = TRY[lvs[2] - 1], ok = steals[i] * t, out = (1 - steals[i]) * t;
    return { p, stats: [['주력', st(p, 'speed')]], on: !!stealOn && st(p, 'speed') >= thrN, a: [ok * 100, true, `${Math.round(ok * 100)}%`], b: [out * 100, false, `${Math.round(out * 100)}%`] };
  });
  const pitRows = away9.map((p, i) => {
    const o = odds?.pit[i];
    return { p, stats: [['파워', st(p, 'power')], ['컨택', st(p, 'contact')]], on: !!zoneOn && (!conOnly || st(p, 'power') < 80), a: oddRow(o, 'zone', PIT_COLS[0], amp(3), false), b: oddRow(o, 'zone', PIT_COLS[1], amp(3), false) };
  });
  const batCols = BAT_COLS[bat] || BAT_COLS.rispPow;
  const fold = (k) => ({ done: done >= k, locked: k > done + 1, onOpen: () => setProg({ act: k, done }) });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {act !== 1 ? <Fold side="공격" ko="타자" sit="득점권 기회" value={batKo} {...fold(1)} /> : (
        <Open side="공격" ko="타자" sit="득점권 기회">
          <Opts opts={[[null, '그대로', null, [['정비 계획대로', 0]]], ...[['rispPow', '홈런 우선', ORG], ['rispCon', '안타 우선', SKY], ['rispPat', '출루 우선', VIO]].map(([id, ko, c]) => [id, ko, c, lines(odds && batFx(odds, id, id === bat ? amp(1) : 1))])]}
            value={bat} onPick={(id) => swap(BAT, id, lvs[1])} />
          <Tune on={!!bat} c={{ rispPow: ORG, rispCon: SKY, rispPat: VIO }[bat]} lv={lvs[1]} onLv={setLv(1, BAT, batC)} offKo="그대로"
            chips={<Chip l={spChip(engine.away.pitchers[0])} />} />
          <Table title="우리 타순" statKo="파워 · 컨택" colKo={batCols.map((c) => c[1])} rows={batRows} next={<Next label={nextKo(1)} onClick={() => next(1)} />} />
        </Open>
      )}
      {act !== 2 ? <Fold side="공격" ko="주자" sit="빠른 1루 주자" value={runKo} {...fold(2)} /> : (
        <Open side="공격" ko="주자" sit="빠른 1루 주자">
          <Opts opts={[[null, '그대로', null, [['뛰지 않음', 0]]], ['run', '도루 우선', US, lines(stealFx(engine.home, engine.away, thrN))]]}
            value={stealOn ? 'run' : null} onPick={(id) => swap(STEAL, id ? thr : null, lvs[2])} />
          <Tune on={!!stealOn} c={US} lv={lvs[2]} onLv={setLv(2, STEAL, runC)} offKo="그대로"
            extra={<Seg label="누가 뛰나" opts={[['steal', '주력 80+'], ['steal85', '주력 85+'], ['steal90', '주력 90+']]} on={thr} onPick={pickThr} />}
            chips={<Chip l={alertChip('도루 기회')} />} />
          <Table title="우리 타순" statKo="주력" colKo={['도루 성공', '실패 아웃']} rows={runRows} next={<Next label={nextKo(2)} onClick={() => next(2)} />} />
        </Open>
      )}
      {act !== 3 ? <Fold side="수비" ko="투수" sit="경기 운영" value={pitKo} {...fold(3)} /> : (
        <Open side="수비" ko="투수" sit="경기 운영">
          <Opts opts={[[null, '기본', null, [['투수 배합대로', 0]]], ['pit', '정면 승부', SPB, lines(odds && zoneFx(odds, engine.away, who === 'Con', zoneOn ? amp(3) : 1))]]}
            value={zoneOn ? 'pit' : null} onPick={(id) => swap(ZONE, id ? zoneId() : null, lvs[3])} />
          <Tune on={!!zoneOn} c={SPB} lv={lvs[3]} onLv={setLv(3, ZONE, pitC)} offKo="기본"
            extra={<><Seg label="누구에게" opts={[['', '모든 타자'], ['Con', '교타자만']]} on={who} onPick={pickWho} /><Seg label="언제" opts={[['', '경기 내내'], ['E', '초반만']]} on={when} onPick={pickWhen} /></>}
            chips={<><Chip l={alertChip('장타 위험')} /><Auto ko="선발 무너질 때 · 자동 교체" /></>} />
          <Table title="상대 타순" statKo="파워 · 컨택" colKo={PIT_COLS.map((c) => c[1])} rows={pitRows} next={<Next label={nextKo(3)} onClick={() => next(3)} />} />
        </Open>
      )}
    </div>
  );
}
