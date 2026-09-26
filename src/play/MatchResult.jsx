/*
 * 경기 결과 — 드래프트 경기와 내 팀 경기(일반 대결 · 토너먼트 · 랭크전)가 함께 쓰는 한 화면.
 *
 * 다른 게임 결과 화면에서 공통으로 가져온 순서(FC 온라인 경기 결과 · MLB 더 쇼 게임 요약 · TFT 순위 결과):
 *  1) 결과 한 줄 — 승리 · 패배 · 무승부와 점수, 두 팀
 *  2) 무엇이 바뀌었나 — 받은 보상 · 전적 · 순위 · 과제 진행(tally, 부르는 곳이 채운다)
 *  3) 경기가 어떻게 흘렀나 — 라인 스코어(이닝 · 득점 · 안타) · 승률 흐름 · 결정적 장면 셋
 *  4) 누가 잘했나 — MVP 카드와 그 경기 기록 한 줄 · 선수 평점
 *  5) 다음 행동 — 오른쪽 아래 주 단추 하나, 나머지는 보조
 * 한 화면(1920×911)에 다 들어가게 — 설명 문장 없이 숫자와 짧은 이름표만.
 *
 * 등장 순서(INTRO, ms) — 눈이 가는 순서대로 한 번에 하나씩, 전체 1.9초 · 누르면 바로 끝 상태
 *  0.20 결과 도장(승리: 크게 찍힘 + 빛 가루 · 패배: 무겁게 내려앉음 · 무승부: 조용히)
 *  0.35 점수 0 → 최종(끝에서 톡)          0.50 라인 스코어 두 줄
 *  0.60 승률 흐름 선이 왼쪽 → 오른쪽        0.65 MVP 카드 뒤집힘
 *  0.90 보상 · 진행 줄 차례로(골드 세기 · 순위 화살표 톡) · 결정적 장면 · 평점
 *  1.35 단추 줄 · 주 단추 광택 한 번          1.90 끝 → onIntroEnd(기념 카드 창 등 다음 연출)
 */
import React, { useEffect, useState } from 'react';
import { PlayerCard } from '../KboAugmentDraft.jsx';
import { Count, Flip, Burst, reducedMotion } from '../ui/motion.jsx';

const INTRO = { word: 200, score: 350, line: 500, flow: 600, mvp: 650, list: 900, step: 90, actions: 1350, end: 1900 };
const at = (ms) => ({ '--d': `${ms}ms`, animationDelay: `${ms}ms` });

/** 보상 값 — 앞 숫자는 세어 올라가고(+300 G · 12승), ▲▼ 는 톡 튄다. 숫자가 없으면 그대로 */
function TallyValue({ v, delay }) {
  const m = String(v).match(/^([^\d−-]*)([+−-]?)([\d,]+)(.*)$/);
  if (!m) return v;
  const [, pre, sign, num, rest] = m;
  const n = Number(num.replace(/,/g, ''));
  const arrow = rest.match(/^(.*?)([▲▼]\d+)(.*)$/);
  return (
    <>
      {pre}{sign}<Count value={n} from={0} delay={delay} dur={500} />
      {arrow ? <>{arrow[1]}<span className="fx-bump" style={at(delay + 520)}>{arrow[2]}</span>{arrow[3]}</> : rest}
    </>
  );
}

const WIN = '#34d399', LOSE = '#f87171', DRAW = '#cbd5e1', GOLD = '#f5d27a';
/** 선수 평점 — 경기 기여 점수를 등급으로 */
export const gradeOf = (pts) => (pts >= 12 ? 'A+' : pts >= 8 ? 'A' : pts >= 5 ? 'B+' : pts >= 2.5 ? 'B' : pts >= 0 ? 'C' : 'D');
const GRADE_C = { 'A+': '#fde047', A: '#34d399', 'B+': '#7dd3fc', B: '#cbd5e1', C: '#94a3b8', D: '#f87171' };

/** 그 경기 기록 한 줄 — 타자: 4타수 2안타 1홈런 3타점 · 투수: 18타자 7삼진 1실점 */
export function gameLine(result, p) {
  if (!p) return '';
  const b = result?.box?.bat?.[p.id];
  if (b) {
    const s = [`${b.ab}타수 ${b.h}안타`];
    if (b.hr) s.push(`${b.hr}홈런`);
    if (b.rbi) s.push(`${b.rbi}타점`);
    if (b.bb) s.push(`${b.bb}볼넷`);
    return s.join(' ');
  }
  const a = result?.box?.arm?.[p.id];
  if (a) return `${a.bf}타자 ${a.k}삼진 ${a.r}실점`;
  return '';
}

/** 결정적 장면 셋 — 점수가 난 타석을 점수 큰 순으로(같으면 늦은 이닝 먼저) */
function keyMoments(logs = []) {
  return logs.filter((l) => l.runs > 0).sort((a, b) => b.runs - a.runs || b.inning - a.inning).slice(0, 3);
}

/** 승률 흐름 — 가운데 선 위는 우리 쪽, 아래는 상대 쪽 */
function Flow({ flow }) {
  if (!flow?.length) return null;
  const W = 600, H = 120;
  const pts = flow.map((v, i) => [(i / Math.max(1, flow.length - 1)) * W, H - v * H]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[88px] w-full">
      <defs>
        <clipPath id="mr-up"><rect x="0" y="0" width={W} height={H / 2} /></clipPath>
        <clipPath id="mr-dn"><rect x="0" y={H / 2} width={W} height={H / 2} /></clipPath>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="rgba(255,255,255,.03)" />
      <path d={`${d} L${W},${H / 2} L0,${H / 2} Z`} fill={`${WIN}33`} clipPath="url(#mr-up)" />
      <path d={`${d} L${W},${H / 2} L0,${H / 2} Z`} fill={`${LOSE}33`} clipPath="url(#mr-dn)" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,.25)" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

const Lab = ({ c = GOLD, children, right = null }) => (
  <div className="flex items-baseline gap-2">
    <p className="ui-lab font-display" style={{ '--a': c }}>{children}</p>
    {right && <span className="ml-auto text-t4 text-gray-400">{right}</span>}
  </div>
);

/**
 * result  BroadcastGame buildResult 값
 * myName · oppName  두 팀 이름 · context  어떤 경기였나(모드 · 라운드)
 * tally  [{ k, v, c? }] — 받은 보상 · 전적 · 순위 · 과제 진행
 * actions  [{ label, onClick, pri? }] — pri 하나가 오른쪽 아래 주 단추
 * onLog  문자 중계 창 열기(있으면)
 */
export default function MatchResult({ result, myName = '내 팀', oppName = '상대', context = '', tally = [], actions = [], onLog = null, onIntroEnd = null }) {
  /* 등장 연출 — 끝나거나(1.9초) 화면을 누르면 끝 상태로 두고 다음 연출(기념 카드 등)에 알린다 */
  const [skip, setSkip] = useState(() => reducedMotion());
  useEffect(() => {
    if (skip) { onIntroEnd?.(); return undefined; }
    const t = setTimeout(() => { setSkip(true); }, INTRO.end);
    return () => clearTimeout(t);
  }, [skip]); // eslint-disable-line react-hooks/exhaustive-deps
  const dur = skip ? 0 : undefined; // 숫자 세기: 건너뛰면 바로 끝 값
  const { winner, score, board, hits = { my: 0, opp: 0 }, flow, logs = [], credits = [] } = result;
  const [ko, tone] = winner === 'my' ? ['승리', WIN] : winner === 'opp' ? ['패배', LOSE] : ['무승부', DRAW];
  const mvp = result.mvpPlayer;
  const innings = Math.max(9, board?.home?.length || 0, board?.away?.length || 0);
  const cols = Array.from({ length: innings }, (_, i) => i);
  const moments = keyMoments(logs);
  const rated = credits.filter((c) => c.player).slice(0, 5);
  const pri = actions.find((a) => a.pri);
  const rest = actions.filter((a) => !a.pri);
  return (
    <section className={`ui-cut ui-frame ui-glass2 fx-fade relative isolate grid min-h-0 flex-1 gap-4 p-6 ${skip ? 'fx-skip' : ''}`}
      style={{ '--c': '24px', '--a': tone, gridTemplateRows: 'auto minmax(0,1fr) auto' }}
      onPointerDown={() => { if (!skip) setSkip(true); }}>
      {/* 패배: 판 바탕만 조금 어둡게(글자 아래 층) */}
      {winner === 'opp' && <span className="fx-fade pointer-events-none absolute inset-0 -z-[1] bg-[#03050a]/40" style={at(INTRO.word)} aria-hidden="true" />}
      {/* 1) 결과 한 줄 */}
      <div className="grid items-center gap-6 border-b border-white/10 pb-4" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <div className="flex items-end gap-4">
          <b className={`relative font-display text-[84px] font-extrabold italic leading-[.8] ${winner === 'my' ? 'fx-stamp' : winner === 'opp' ? 'fx-drop' : 'fx-fade'}`}
            style={{ color: tone, textShadow: `0 0 36px ${tone}88`, ...at(INTRO.word) }}>
            {ko}
            {winner === 'my' && !skip && <Burst colors={[GOLD, WIN, '#fff']} spread={170} delay={INTRO.word + 220} />}
          </b>
          {context && <span className="fx-fade pb-1 text-t3 font-bold text-gray-300" style={at(INTRO.word + 150)}>{context}</span>}
        </div>
        <div className="flex items-center gap-6">
          <span className="text-right"><b className="block max-w-[16rem] truncate text-t2 font-black text-white">{myName}</b><small className="text-t4 text-gray-400">우리</small></span>
          <b className="font-display text-[64px] font-extrabold leading-none tabular-nums text-white">
            <Count value={score.my} from={0} delay={INTRO.score} dur={dur ?? 650} style={{ color: winner === 'my' ? WIN : '#fff' }} />
            <span className="mx-3 text-gray-500">:</span>
            <Count value={score.opp} from={0} delay={INTRO.score} dur={dur ?? 650} style={{ color: winner === 'opp' ? LOSE : '#fff' }} />
          </b>
          <span><b className="block max-w-[16rem] truncate text-t2 font-black text-white">{oppName}</b><small className="text-t4 text-gray-400">상대</small></span>
        </div>
        <span />
      </div>

      {/* 2~4) 본문 — MVP | 경기 흐름 | 보상 · 평점 */}
      <div className="grid min-h-0 gap-5" style={{ gridTemplateColumns: '17rem minmax(0,1fr) 23rem' }}>
        {/* MVP */}
        <div className="flex min-h-0 flex-col gap-3">
          <Lab c="#fbbf24">경기 MVP</Lab>
          {mvp && (
            <>
              <Flip delay={INTRO.mvp} className="relative mx-auto aspect-[2/3] w-[15rem] shrink-0">
                <PlayerCard player={mvp} reason={null} onSelect={() => {}} style={{ animation: 'none' }} />
              </Flip>
              <b className="fx-rise text-center text-t2 font-black text-white" style={at(INTRO.mvp + 380)}>{mvp.name}</b>
              <span className="fx-rise text-center font-display text-t3 font-bold text-amber-200" style={at(INTRO.mvp + 440)}>{gameLine(result, mvp) || '—'}</span>
            </>
          )}
        </div>

        {/* 경기 흐름 */}
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <Lab right={onLog && <button type="button" className="ui-btn ui-cut sm" onClick={onLog}>문자 중계</button>}>라인 스코어</Lab>
          <table className="w-full table-fixed border-collapse text-center tabular-nums">
            <thead>
              <tr className="text-t4 text-gray-400">
                <th className="w-40 pb-1 text-left font-bold">팀</th>
                {cols.map((i) => <th key={i} className="pb-1 font-bold">{i + 1}</th>)}
                <th className="w-12 pb-1 font-bold text-white">R</th><th className="w-12 pb-1 font-bold">H</th>
              </tr>
            </thead>
            <tbody className="font-display text-t2 font-bold">
              {[['opp', oppName, board?.away, score.opp, hits.opp, LOSE], ['my', myName, board?.home, score.my, hits.my, WIN]].map(([k, nm, line, r, h, c], ri) => (
                <tr key={k} className="fx-rise border-t border-white/10" style={at(INTRO.line + ri * 70)}>
                  <td className="truncate py-2 text-left font-sans text-t3 font-bold" style={{ color: k === 'my' ? c : '#e5e7eb' }}>{nm}</td>
                  {cols.map((i) => {
                    const v = line?.[i];
                    return <td key={i} className="py-2" style={{ color: v ? '#fff' : '#6b7280' }}>{v == null ? '-' : v}</td>;
                  })}
                  <td className="py-2 text-t1" style={{ color: winner === k ? c : '#fff' }}>{r}</td>
                  <td className="py-2 text-gray-300">{h}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {flow?.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Lab c="#7dd3fc" right={`마지막 승률 ${Math.round((flow[flow.length - 1] || 0) * 100)}%`}>승률 흐름</Lab>
              <div className="fx-wipe" style={at(INTRO.flow)}><Flow flow={flow} /></div>
            </div>
          )}
          <div className="flex min-h-0 flex-col gap-1.5">
            <Lab c="#fb923c">결정적 장면</Lab>
            {moments.length ? moments.map((m, mi) => (
              <div key={m.id} className="fx-rise ui-cut grid items-center gap-3 px-3 py-2" style={{ '--c': '8px', gridTemplateColumns: '4.5rem minmax(0,1fr) auto', background: 'rgba(255,255,255,.045)', boxShadow: `inset 3px 0 0 ${m.isTop ? LOSE : WIN}`, ...at(INTRO.list + 200 + mi * INTRO.step) }}>
                <span className="font-display text-t3 font-bold text-gray-300">{m.inning}회{m.isTop ? '초' : '말'}</span>
                <b className="truncate text-t3 text-white">{m.text}</b>
                <b className="font-display text-t2" style={{ color: m.isTop ? LOSE : WIN }}>+{m.runs}점</b>
              </div>
            )) : <p className="text-t3 text-gray-400">큰 장면 없이 끝난 경기</p>}
          </div>
        </div>

        {/* 보상 · 진행 / 선수 평점 */}
        <div className="flex min-h-0 flex-col gap-4">
          {tally.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Lab>보상 · 진행</Lab>
              {tally.map((t, ti) => (
                <div key={t.k} className="fx-rise flex items-baseline justify-between gap-3 border-b border-white/10 py-2" style={at(INTRO.list + ti * INTRO.step)}>
                  <span className="min-w-0 truncate text-t3 text-gray-300">{t.k}</span>
                  <b className="shrink-0 font-display text-t2" style={{ color: t.c || '#fff' }}>{skip ? t.v : <TallyValue v={t.v} delay={INTRO.list + ti * INTRO.step + 120} />}</b>
                </div>
              ))}
            </div>
          )}
          <div className="flex min-h-0 flex-col gap-1.5">
            <Lab c="#a78bfa">선수 평점</Lab>
            {rated.map((c, ci) => {
              const g = gradeOf(c.pts);
              return (
                <div key={c.player.id} className="fx-rise grid items-center gap-3 py-1" style={{ gridTemplateColumns: '2.6rem minmax(0,1fr)', ...at(INTRO.list + (tally.length + ci) * INTRO.step) }}>
                  <b className="ui-cut grid h-9 place-items-center font-display text-t2 font-extrabold" style={{ '--c': '6px', color: GRADE_C[g], background: `${GRADE_C[g]}1f`, boxShadow: `inset 0 0 0 1px ${GRADE_C[g]}66` }}>{g}</b>
                  <span className="min-w-0 leading-tight">
                    <b className="block truncate text-t3 text-white">{c.player.name}</b>
                    <small className="block truncate text-t4 text-gray-400">{gameLine(result, c.player) || c.player.position}</small>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5) 다음 행동 */}
      <div className="fx-fade flex items-center gap-2 border-t border-white/10 pt-4" style={at(INTRO.actions)}>
        {rest.map((a) => <button key={a.label} type="button" className="ui-btn ui-cut" onClick={a.onClick}>{a.label}</button>)}
        {pri && <button type="button" className="fx-sheen-once ui-btn ui-cut pri ml-auto min-h-[3.2rem] px-10 text-t2" style={at(INTRO.actions + 200)} onClick={pri.onClick}>{pri.label}</button>}
      </div>
    </section>
  );
}
