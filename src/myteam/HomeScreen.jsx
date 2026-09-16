/* 홈 — 내 팀 요약과 갈 곳들 (팀 편성 · 경기 · 추가 모드) */
import React from 'react';
import { SQUAD_SIZE, SQUAD_CAP, FOREIGN_MAX, POS_RULES, squadCost, foreignCount, squadIssues, countBy, STAFF_SLOTS } from './rules.js';

const cut = (n = 12) => ({ clipPath: `polygon(${n}px 0,100% 0,100% calc(100% - ${n}px),calc(100% - ${n}px) 100%,0 100%,0 ${n}px)` });
const Panel = ({ title, children, className = '' }) => (
  <section className={`bg-[#070b14]/90 p-4 shadow-[inset_0_0_0_1px_rgba(125,211,252,.14)] ${className}`} style={cut()}>
    <p className="m-0 mb-3 font-display text-[11px] font-semibold tracking-[0.3em] text-emerald-300">◣ {title}</p>
    {children}
  </section>
);

export default function HomeScreen({ account, onEdit, onPlay, onModes, onSignOut }) {
  const team = account.team;
  const squad = team.squad || [];
  const cost = squadCost(squad, team.staff);
  const issues = squadIssues(squad, team.staff, team.cap || SQUAD_CAP);
  const ready = issues.length === 0;
  const top = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 5);
  const rec = team.record || { w: 0, l: 0, d: 0 };

  return (
    <div className="relative min-h-dvh bg-[#05080f] text-gray-200">
      <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: 'url(ui/broadcast-field.webp)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(3,5,10,.92),rgba(3,5,10,.75) 40%,rgba(3,5,10,.96))' }} />
      <div className="relative mx-auto max-w-[1400px] px-6 py-6">
        <header className="flex items-center gap-6 border-b border-emerald-500/25 pb-4">
          <div><p className="m-0 font-display text-[10px] font-semibold tracking-[0.4em] text-gray-500">LEGEND DRAFT</p>
            <h1 className="mt-1 text-2xl font-black text-white">{team.name}</h1></div>
          <p className="m-0 text-sm text-gray-400">감독 <b className="text-white">{account.nick}</b></p>
          <p className="ml-auto font-display text-lg text-gray-300">{rec.w}승 {rec.l}패 {rec.d}무</p>
          <button type="button" onClick={onSignOut} className="bg-white/[0.06] px-3 py-1.5 text-sm text-gray-400" style={cut(8)}>로그아웃</button>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            <Panel title="엔트리">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><b className="block font-display text-4xl font-extrabold text-white">{squad.length}<span className="text-xl text-gray-500">/{SQUAD_SIZE}</span></b><span className="text-xs text-gray-400">선수</span></div>
                <div><b className={`block font-display text-4xl font-extrabold ${cost > (team.cap || SQUAD_CAP) ? 'text-red-400' : 'text-emerald-400'}`}>{cost}</b><span className="text-xs text-gray-400">/ {team.cap || SQUAD_CAP} CP</span></div>
                <div><b className={`block font-display text-4xl font-extrabold ${foreignCount(squad) > FOREIGN_MAX ? 'text-red-400' : 'text-white'}`}>{foreignCount(squad)}<span className="text-xl text-gray-500">/{FOREIGN_MAX}</span></b><span className="text-xs text-gray-400">외국인</span></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {POS_RULES.map((r) => {
                  const n = countBy(squad, r.key);
                  return (
                    <div key={r.key} className={`px-2.5 py-2 text-center ${n < r.min ? 'bg-red-500/10 shadow-[inset_0_0_0_1px_rgba(248,113,113,.4)]' : 'bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]'}`} style={cut(7)}>
                      <b className="block font-display text-xl text-white">{n}<span className="text-xs text-gray-500">/{r.min}</span></b>
                      <span className="text-[11px] text-gray-400">{r.label}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="코치진">
              <div className="grid gap-2 sm:grid-cols-4">
                {STAFF_SLOTS.map((s) => {
                  const cur = team.staff?.[s.key];
                  return (
                    <div key={s.key} className="bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" style={cut(8)}>
                      <p className="m-0 font-display text-[10px] tracking-[0.25em] text-gray-500">{s.label}</p>
                      <b className={`text-base ${cur ? 'text-white' : 'text-gray-600'}`}>{cur?.name || '비어 있음'}</b>
                      {cur && <p className="m-0 text-[11px] text-gray-400">{cur.note}</p>}
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="핵심 전력">
              {top.length === 0 ? <p className="m-0 text-sm text-gray-500">아직 영입한 선수가 없습니다. 팀 편성에서 선수를 찾아 보세요.</p> : (
                <div className="grid gap-2 sm:grid-cols-5">
                  {top.map((p) => (
                    <div key={p.id} className="bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" style={cut(8)}>
                      <b className="block font-display text-2xl text-emerald-400">{p.overall}</b>
                      <b className="block truncate text-sm text-white">{p.name}</b>
                      <span className="text-[11px] text-gray-400">{p.year} {p.team} · {p.position}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid content-start gap-4">
            <Panel title="경기">
              {ready ? <p className="m-0 mb-3 text-sm text-emerald-300">엔트리가 준비됐습니다. 바로 경기에 들어갈 수 있습니다.</p> : (
                <ul className="m-0 mb-3 list-none p-0 text-sm text-amber-200">
                  {issues.map((t) => <li key={t} className="py-0.5">· {t}</li>)}
                </ul>
              )}
              <button type="button" onClick={onPlay} disabled={!ready}
                className={`w-full py-3 text-lg font-black ${ready ? 'bg-emerald-500 text-[#05080f]' : 'bg-white/[0.06] text-gray-600'}`} style={cut(10)}>경기 시작</button>
              <button type="button" onClick={onEdit} className="mt-2 w-full bg-white/[0.08] py-3 text-lg font-bold text-white" style={cut(10)}>팀 편성</button>
            </Panel>

            <Panel title="추가 모드">
              <p className="m-0 mb-3 text-sm text-gray-400">랜덤으로 뜬 시즌·대회에서 한 명씩 뽑아 한 판을 치르는 레전드 드래프트입니다. 내 팀과는 따로 굴러갑니다.</p>
              <button type="button" onClick={onModes} className="w-full bg-white/[0.08] py-3 font-bold text-white" style={cut(10)}>레전드 드래프트 열기</button>
            </Panel>

            <Panel title="최근 경기">
              {(account.history || []).length === 0 ? <p className="m-0 text-sm text-gray-500">기록이 없습니다.</p> : (
                <ul className="m-0 list-none p-0">
                  {account.history.slice(0, 5).map((h, i) => (
                    <li key={i} className="flex items-center justify-between border-b border-white/5 py-1.5 text-sm">
                      <span className="text-gray-400">{h.opp}</span>
                      <b className={h.winner === 'my' ? 'text-emerald-400' : h.winner === 'opp' ? 'text-red-400' : 'text-gray-300'}>{h.myRuns} : {h.oppRuns}</b>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
